// Background service worker for fetching Binance kline data
console.log('[Binance Signal Analyzer] Background service worker started');

// Import indicators (will be available through content script injection)
// Default settings
let currentSettings = {
  symbol: 'BTCUSDT',
  interval: '1m',
  candleLimit: 200,
  updateInterval: 5,
  indicators: {
    rsi: true,
    ema: true,
    sma: false,
    macd: true,
    adx: false,
    stoch: false,
    bb: false,
    atr: false,
    sar: false,
    volume: false
  },
  indicatorParams: {
    rsi: { period: 14, oversold: 30, overbought: 70 },
    ema: { fast: 20, slow: 50 },
    sma: { fast: 20, slow: 50 },
    macd: { fast: 12, slow: 26, signal: 9 },
    bb: { period: 20, stddev: 2 },
    stoch: { k: 14, d: 3 },
    adx: { period: 14 },
    atr: { period: 14 },
    sar: { step: 0.02, max: 0.2 },
    volume: { period: 20 }
  }
};

let updateIntervalId = null;

// Load settings from storage
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['settings'], (result) => {
      if (result.settings) {
        currentSettings = { ...currentSettings, ...result.settings };
        console.log('[Background] Settings loaded:', currentSettings);
      }
      resolve(currentSettings);
    });
  });
}

// Fetch kline data from Binance API
async function fetchKlineData(symbol, interval, limit) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Parse kline data
    const candles = data.map(kline => ({
      openTime: kline[0],
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5]),
      closeTime: kline[6]
    }));
    
    return candles;
  } catch (error) {
    console.error('[Background] Error fetching kline data:', error);
    return null;
  }
}

// Fetch order book (market depth) data from Binance API
async function fetchOrderBook(symbol, limit = 100) {
  const url = `https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=${limit}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Parse order book
    const bids = data.bids.map(bid => ({
      price: parseFloat(bid[0]),
      quantity: parseFloat(bid[1])
    }));
    
    const asks = data.asks.map(ask => ({
      price: parseFloat(ask[0]),
      quantity: parseFloat(ask[1])
    }));
    
    // Calculate order book metrics with better accuracy
    const totalBidVolume = bids.reduce((sum, bid) => sum + bid.quantity, 0);
    const totalAskVolume = asks.reduce((sum, ask) => sum + ask.quantity, 0);
    
    // Calculate total value (price * quantity) for better pressure indicator
    const totalBidValue = bids.reduce((sum, bid) => sum + (bid.price * bid.quantity), 0);
    const totalAskValue = asks.reduce((sum, ask) => sum + (ask.price * ask.quantity), 0);
    
    // Use both volume and value for more accurate ratio
    const volumeRatio = totalAskVolume > 0 ? (totalBidVolume / totalAskVolume) : 1;
    const valueRatio = totalAskValue > 0 ? (totalBidValue / totalAskValue) : 1;
    const bidAskRatio = ((volumeRatio + valueRatio) / 2).toFixed(2); // Average of both
    
    // Calculate weighted average prices
    const weightedBidPrice = totalBidVolume > 0 ? totalBidValue / totalBidVolume : 0;
    const weightedAskPrice = totalAskVolume > 0 ? totalAskValue / totalAskVolume : 0;
    
    // More sophisticated pressure calculation with thresholds
    let pressure = 'NEUTRAL';
    const ratio = parseFloat(bidAskRatio);
    if (ratio > 1.15) { // 15% more bids = strong buy pressure
      pressure = 'BUY_PRESSURE';
    } else if (ratio < 0.85) { // 15% more asks = strong sell pressure
      pressure = 'SELL_PRESSURE';
    }
    
    return {
      bids: bids.slice(0, 5), // Top 5 bids
      asks: asks.slice(0, 5), // Top 5 asks
      bidAskRatio: parseFloat(bidAskRatio),
      pressure: pressure,
      totalBidVolume: totalBidVolume.toFixed(2),
      totalAskVolume: totalAskVolume.toFixed(2),
      spread: asks.length > 0 && bids.length > 0 ? (asks[0].price - bids[0].price).toFixed(2) : 0,
      spreadPercent: asks.length > 0 && bids.length > 0 ? 
        (((asks[0].price - bids[0].price) / bids[0].price) * 100).toFixed(3) : 0
    };
  } catch (error) {
    console.error('[Background] Error fetching order book data:', error);
    return null;
  }
}

// Calculate RSI
function calculateRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - change) / period;
    }
  }
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Calculate EMA
function calculateEMA(data, period) {
  if (data.length < period) return null;
  
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
  
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  
  return ema;
}

// Calculate SMA
function calculateSMA(data, period) {
  if (data.length < period) return null;
  const slice = data.slice(-period);
  return slice.reduce((sum, val) => sum + val, 0) / period;
}

// Calculate MACD
function calculateMACD(closes, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (closes.length < slowPeriod + signalPeriod) return null;
  
  const kFast = 2 / (fastPeriod + 1);
  const kSlow = 2 / (slowPeriod + 1);
  
  let emaFast = closes.slice(0, fastPeriod).reduce((sum, val) => sum + val, 0) / fastPeriod;
  let emaSlow = closes.slice(0, slowPeriod).reduce((sum, val) => sum + val, 0) / slowPeriod;
  
  const emaFastArray = [];
  const emaSlowArray = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i >= fastPeriod) {
      emaFast = closes[i] * kFast + emaFast * (1 - kFast);
      emaFastArray.push(emaFast);
    }
    
    if (i >= slowPeriod) {
      emaSlow = closes[i] * kSlow + emaSlow * (1 - kSlow);
      emaSlowArray.push(emaSlow);
    }
  }
  
  // Calculate MACD line
  const macdLine = [];
  const offset = fastPeriod - slowPeriod;
  
  for (let i = 0; i < emaSlowArray.length; i++) {
    const fastValue = emaFastArray[i + offset];
    const slowValue = emaSlowArray[i];
    
    // Safety check for valid values
    if (fastValue !== undefined && slowValue !== undefined && 
        !isNaN(fastValue) && !isNaN(slowValue)) {
      macdLine.push(fastValue - slowValue);
    }
  }
  
  // Check if we have enough data for signal line
  if (macdLine.length < signalPeriod) {
    return {
      macd: macdLine[macdLine.length - 1],
      signal: null,
      histogram: null
    };
  }
  
  // Calculate signal line (EMA of MACD line)
  const kSignal = 2 / (signalPeriod + 1);
  const signalSlice = macdLine.slice(0, signalPeriod);
  
  // Calculate initial SMA for signal line
  let signal = signalSlice.reduce((sum, val) => sum + val, 0) / signalPeriod;
  
  // Check if initial signal is valid
  if (isNaN(signal)) {
    const currentMACD = macdLine[macdLine.length - 1];
    return {
      macd: currentMACD,
      signal: null,
      histogram: null
    };
  }
  
  // Calculate EMA for remaining values
  for (let i = signalPeriod; i < macdLine.length; i++) {
    signal = macdLine[i] * kSignal + signal * (1 - kSignal);
  }
  
  const currentMACD = macdLine[macdLine.length - 1];
  const histogram = currentMACD - signal;
  
  return {
    macd: !isNaN(currentMACD) ? currentMACD : null,
    signal: !isNaN(signal) ? signal : null,
    histogram: !isNaN(histogram) ? histogram : null
  };
}

// Calculate Bollinger Bands
function calculateBB(data, period = 20, stdDev = 2) {
  if (data.length < period) return null;
  
  const middle = calculateSMA(data, period);
  if (!middle) return null;
  
  const slice = data.slice(-period);
  const squaredDiffs = slice.map(val => Math.pow(val - middle, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / period;
  const sd = Math.sqrt(variance);
  
  return {
    upper: middle + (sd * stdDev),
    middle: middle,
    lower: middle - (sd * stdDev)
  };
}

// Calculate Stochastic
function calculateStochastic(candles, kPeriod = 14) {
  if (candles.length < kPeriod) return null;
  
  const recentCandles = candles.slice(-kPeriod);
  const currentClose = candles[candles.length - 1].close;
  
  const highestHigh = Math.max(...recentCandles.map(c => c.high));
  const lowestLow = Math.min(...recentCandles.map(c => c.low));
  
  const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
  
  return { k: k, d: k };
}

// Calculate ADX
function calculateADX(candles, period = 14) {
  if (candles.length < period + 1) return null;
  
  let plusDM = 0, minusDM = 0, tr = 0;
  
  for (let i = candles.length - period; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];
    
    const highDiff = current.high - previous.high;
    const lowDiff = previous.low - current.low;
    
    plusDM += (highDiff > lowDiff && highDiff > 0) ? highDiff : 0;
    minusDM += (lowDiff > highDiff && lowDiff > 0) ? lowDiff : 0;
    
    const trueRange = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );
    tr += trueRange;
  }
  
  const plusDI = (plusDM / tr) * 100;
  const minusDI = (minusDM / tr) * 100;
  const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
  
  return { adx: dx, plusDI: plusDI, minusDI: minusDI };
}

// Calculate ATR
function calculateATR(candles, period = 14) {
  if (candles.length < period + 1) return null;
  
  let atr = 0;
  
  for (let i = candles.length - period; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];
    
    const trueRange = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );
    
    atr += trueRange;
  }
  
  return atr / period;
}

// Calculate Parabolic SAR
function calculateSAR(candles, step = 0.02) {
  if (candles.length < 2) return null;
  
  const current = candles[candles.length - 1];
  const previous = candles[candles.length - 2];
  
  const isUptrend = current.close > previous.close;
  
  if (isUptrend) {
    return previous.low - (previous.high - previous.low) * step;
  } else {
    return previous.high + (previous.high - previous.low) * step;
  }
}

// Calculate all indicators based on settings
function calculateIndicators(candles, settings) {
  const closes = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume);
  const indicators = {};
  const params = settings.indicatorParams;
  const enabled = settings.indicators;
  
  // RSI
  if (enabled.rsi) {
    indicators.rsi = calculateRSI(closes, params.rsi.period);
  }
  
  // EMA
  if (enabled.ema) {
    indicators.ema20 = calculateEMA(closes, params.ema.fast);
    indicators.ema50 = calculateEMA(closes, params.ema.slow);
  }
  
  // SMA
  if (enabled.sma) {
    indicators.sma20 = calculateSMA(closes, params.sma.fast);
    indicators.sma50 = calculateSMA(closes, params.sma.slow);
  }
  
  // MACD
  if (enabled.macd) {
    indicators.macd = calculateMACD(closes, params.macd.fast, params.macd.slow, params.macd.signal);
  }
  
  // Bollinger Bands
  if (enabled.bb) {
    indicators.bb = calculateBB(closes, params.bb.period, params.bb.stddev);
  }
  
  // Stochastic
  if (enabled.stoch) {
    indicators.stoch = calculateStochastic(candles, params.stoch.k);
  }
  
  // ADX
  if (enabled.adx) {
    indicators.adx = calculateADX(candles, params.adx.period);
  }
  
  // ATR - Always calculate for TP/SL recommendations
  indicators.atr = calculateATR(candles, params.atr?.period || 14);
  
  // Parabolic SAR
  if (enabled.sar) {
    indicators.sar = calculateSAR(candles, params.sar.step);
  }
  
  // Volume
  if (enabled.volume) {
    indicators.volumeSMA = calculateSMA(volumes, params.volume.period);
  }
  
  return indicators;
}

// Find support and resistance levels using swing high/low algorithm
function findSupportResistance(candles, lookback = 10, minTouches = 2) {
  if (candles.length < lookback * 2) return { support: [], resistance: [] };
  
  const swingHighs = [];
  const swingLows = [];
  
  // Find swing highs and lows
  for (let i = lookback; i < candles.length - lookback; i++) {
    const candle = candles[i];
    let isSwingHigh = true;
    let isSwingLow = true;
    
    // Check if this is a swing high (higher than surrounding candles)
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && candles[j].high >= candle.high) {
        isSwingHigh = false;
      }
      if (j !== i && candles[j].low <= candle.low) {
        isSwingLow = false;
      }
    }
    
    if (isSwingHigh) {
      swingHighs.push({ price: candle.high, index: i, time: candle.closeTime });
    }
    if (isSwingLow) {
      swingLows.push({ price: candle.low, index: i, time: candle.closeTime });
    }
  }
  
  // Cluster nearby levels (within 0.5% of each other)
  const clusterLevels = (levels, tolerance = 0.005) => {
    if (levels.length === 0) return [];
    
    const clusters = [];
    const sorted = [...levels].sort((a, b) => a.price - b.price);
    
    let currentCluster = [sorted[0]];
    
    for (let i = 1; i < sorted.length; i++) {
      const priceDiff = Math.abs(sorted[i].price - currentCluster[0].price) / currentCluster[0].price;
      
      if (priceDiff <= tolerance) {
        currentCluster.push(sorted[i]);
      } else {
        if (currentCluster.length >= minTouches) {
          const avgPrice = currentCluster.reduce((sum, l) => sum + l.price, 0) / currentCluster.length;
          clusters.push({
            price: avgPrice,
            touches: currentCluster.length,
            strength: currentCluster.length
          });
        }
        currentCluster = [sorted[i]];
      }
    }
    
    // Don't forget the last cluster
    if (currentCluster.length >= minTouches) {
      const avgPrice = currentCluster.reduce((sum, l) => sum + l.price, 0) / currentCluster.length;
      clusters.push({
        price: avgPrice,
        touches: currentCluster.length,
        strength: currentCluster.length
      });
    }
    
    return clusters.sort((a, b) => b.strength - a.strength).slice(0, 5); // Top 5 levels
  };
  
  const resistance = clusterLevels(swingHighs);
  const support = clusterLevels(swingLows);
  
  return { support, resistance };
}

// Calculate Fibonacci retracement and extension levels
function calculateFibonacci(candles) {
  if (candles.length < 20) return null;
  
  // Find swing high and swing low in recent candles
  const lookback = Math.min(50, candles.length);
  const recentCandles = candles.slice(-lookback);
  
  // Find the highest high and lowest low
  let swingHigh = recentCandles[0].high;
  let swingLow = recentCandles[0].low;
  let highIndex = 0;
  let lowIndex = 0;
  
  recentCandles.forEach((candle, index) => {
    if (candle.high > swingHigh) {
      swingHigh = candle.high;
      highIndex = index;
    }
    if (candle.low < swingLow) {
      swingLow = candle.low;
      lowIndex = index;
    }
  });
  
  const range = swingHigh - swingLow;
  const isUptrend = highIndex > lowIndex; // High came after low = uptrend
  
  // Fibonacci retracement levels (from high to low)
  const retracement = {
    level_0: swingHigh,
    level_236: swingHigh - (range * 0.236),
    level_382: swingHigh - (range * 0.382),
    level_500: swingHigh - (range * 0.500),
    level_618: swingHigh - (range * 0.618),
    level_786: swingHigh - (range * 0.786),
    level_100: swingLow
  };
  
  // Fibonacci extension levels (beyond the range)
  const extension = {
    level_1272: isUptrend ? swingHigh + (range * 0.272) : swingLow - (range * 0.272),
    level_1618: isUptrend ? swingHigh + (range * 0.618) : swingLow - (range * 0.618),
    level_2000: isUptrend ? swingHigh + (range * 1.000) : swingLow - (range * 1.000),
    level_2618: isUptrend ? swingHigh + (range * 1.618) : swingLow - (range * 1.618)
  };
  
  return {
    swingHigh: swingHigh,
    swingLow: swingLow,
    range: range,
    isUptrend: isUptrend,
    retracement: retracement,
    extension: extension
  };
}

// Calculate volume profile (price levels with most volume)
function calculateVolumeProfile(candles, bins = 20) {
  if (candles.length === 0) return null;
  
  // Find price range
  const prices = candles.flatMap(c => [c.high, c.low]);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  const binSize = priceRange / bins;
  
  // Initialize bins
  const volumeBins = Array(bins).fill(0).map((_, i) => ({
    priceLevel: minPrice + (i * binSize) + (binSize / 2),
    volume: 0,
    minPrice: minPrice + (i * binSize),
    maxPrice: minPrice + ((i + 1) * binSize)
  }));
  
  // Distribute volume across bins
  candles.forEach(candle => {
    const candlePrice = (candle.high + candle.low) / 2;
    const binIndex = Math.min(Math.floor((candlePrice - minPrice) / binSize), bins - 1);
    
    if (binIndex >= 0 && binIndex < bins) {
      volumeBins[binIndex].volume += candle.volume;
    }
  });
  
  // Find POC (Point of Control - highest volume)
  const poc = volumeBins.reduce((max, bin) => 
    bin.volume > max.volume ? bin : max, volumeBins[0]);
  
  // Find Value Area (70% of volume)
  const totalVolume = volumeBins.reduce((sum, bin) => sum + bin.volume, 0);
  const targetVolume = totalVolume * 0.7;
  
  // Sort by volume to find value area
  const sortedBins = [...volumeBins].sort((a, b) => b.volume - a.volume);
  let valueAreaVolume = 0;
  const valueAreaBins = [];
  
  for (const bin of sortedBins) {
    if (valueAreaVolume < targetVolume) {
      valueAreaVolume += bin.volume;
      valueAreaBins.push(bin);
    } else {
      break;
    }
  }
  
  // Calculate VAH (Value Area High) and VAL (Value Area Low)
  const valueAreaPrices = valueAreaBins.map(b => b.priceLevel);
  const vah = Math.max(...valueAreaPrices);
  const val = Math.min(...valueAreaPrices);
  
  return {
    poc: poc.priceLevel,
    vah: vah,
    val: val,
    profile: volumeBins.slice().sort((a, b) => b.volume - a.volume).slice(0, 10), // Top 10 levels
    totalVolume: totalVolume
  };
}

// Calculate risk/reward and position recommendations
function calculateTradeRecommendations(currentPrice, atr, trend, rsi, indicators) {
  const recommendations = {
    action: 'HOLD',
    takeProfit: null,
    stopLoss: null,
    leverage: 1,
    riskLevel: 'MEDIUM'
  };
  
  if (!atr || !currentPrice) return recommendations;
  
  // Calculate ATR-based TP and SL
  const atrMultiplierTP = 2.5; // Take profit at 2.5x ATR
  const atrMultiplierSL = 1.5; // Stop loss at 1.5x ATR
  
  // Determine action based on trend and indicators
  if (trend === 'bullish' && rsi && rsi < 45) {
    recommendations.action = 'LONG';
    recommendations.takeProfit = currentPrice + (atr * atrMultiplierTP);
    recommendations.stopLoss = currentPrice - (atr * atrMultiplierSL);
    
    // Leverage based on signal strength
    if (rsi < 30) {
      recommendations.leverage = 5; // Strong signal
      recommendations.riskLevel = 'MEDIUM';
    } else if (rsi < 35) {
      recommendations.leverage = 4; // Good signal
      recommendations.riskLevel = 'MEDIUM';
    } else {
      recommendations.leverage = 3; // Moderate signal
      recommendations.riskLevel = 'LOW';
    }
  } else if (trend === 'bearish' && rsi && rsi > 55) {
    // Bearish trend - more aggressive short recommendations
    recommendations.action = 'SHORT';
    recommendations.takeProfit = currentPrice - (atr * atrMultiplierTP);
    recommendations.stopLoss = currentPrice + (atr * atrMultiplierSL);
    
    // Leverage based on signal strength
    if (rsi > 70) {
      recommendations.leverage = 5; // Strong signal
      recommendations.riskLevel = 'MEDIUM';
    } else if (rsi > 65) {
      recommendations.leverage = 4; // Good signal
      recommendations.riskLevel = 'MEDIUM';
    } else {
      recommendations.leverage = 3; // Moderate signal
      recommendations.riskLevel = 'LOW';
    }
  } else if (trend === 'bearish') {
    // Bearish trend - even without strong RSI, suggest SELL/SHORT
    if (rsi && rsi >= 45) {
      // RSI above 45 in bearish = good short opportunity
      recommendations.action = 'SHORT';
      recommendations.takeProfit = currentPrice - (atr * atrMultiplierTP);
      recommendations.stopLoss = currentPrice + (atr * atrMultiplierSL);
      recommendations.leverage = 2; // Conservative leverage
      recommendations.riskLevel = 'LOW';
    } else {
      // RSI below 45 in bearish = already oversold, spot sell recommended
      recommendations.action = 'SELL';
      recommendations.takeProfit = null;
      recommendations.stopLoss = currentPrice - (atr * atrMultiplierSL);
    }
  } else if (trend === 'bullish' && rsi && rsi >= 45 && rsi <= 55) {
    // Bullish but not oversold - conservative long or hold
    recommendations.action = 'HOLD';
  }
  
  // Calculate risk/reward ratio
  if (recommendations.takeProfit && recommendations.stopLoss) {
    const profit = Math.abs(recommendations.takeProfit - currentPrice);
    const loss = Math.abs(currentPrice - recommendations.stopLoss);
    recommendations.riskRewardRatio = (profit / loss).toFixed(2);
  }
  
  return recommendations;
}

// Analyze market data
function analyzeMarket(candles, settings) {
  if (!candles || candles.length < 50) {
    return null;
  }
  
  const closes = candles.map(c => c.close);
  const indicators = calculateIndicators(candles, settings);
  
  // Determine trend
  let trend = 'neutral';
  if (settings.indicators.ema && indicators.ema20 && indicators.ema50) {
    if (indicators.ema20 > indicators.ema50) {
      trend = 'bullish';
    } else if (indicators.ema20 < indicators.ema50) {
      trend = 'bearish';
    }
  } else if (settings.indicators.sma && indicators.sma20 && indicators.sma50) {
    if (indicators.sma20 > indicators.sma50) {
      trend = 'bullish';
    } else if (indicators.sma20 < indicators.sma50) {
      trend = 'bearish';
    }
  }
  
  // Detect EMA/SMA crosses
  const closes_prev = closes.slice(0, -1);
  let emaCross = 'none';
  
  if (settings.indicators.ema && indicators.ema20 && indicators.ema50) {
    const ema20_prev = calculateEMA(closes_prev, settings.indicatorParams.ema.fast);
    const ema50_prev = calculateEMA(closes_prev, settings.indicatorParams.ema.slow);
    
    if (ema20_prev && ema50_prev) {
      if (ema20_prev <= ema50_prev && indicators.ema20 > indicators.ema50) {
        emaCross = 'golden';
      } else if (ema20_prev >= ema50_prev && indicators.ema20 < indicators.ema50) {
        emaCross = 'death';
      }
    }
  }
  
  // Generate signals based on enabled indicators
  let signal = 'HOLD';
  const signals = [];
  
  // Strategy using RSI and EMA/SMA crosses
  if (settings.indicators.rsi && indicators.rsi) {
    const rsiOversold = settings.indicatorParams.rsi.oversold;
    const rsiOverbought = settings.indicatorParams.rsi.overbought;
    
    // BUY signal
    if (indicators.rsi < rsiOversold && emaCross === 'golden') {
      signal = 'BUY';
      signals.push({
        type: 'BUY',
        price: closes[closes.length - 1],
        time: candles[candles.length - 1].closeTime,
        index: candles.length - 1,
        reason: `RSI(${indicators.rsi.toFixed(2)}) < ${rsiOversold} + Golden Cross`
      });
    }
    // SELL signal
    else if (indicators.rsi > rsiOverbought && emaCross === 'death') {
      signal = 'SELL';
      signals.push({
        type: 'SELL',
        price: closes[closes.length - 1],
        time: candles[candles.length - 1].closeTime,
        index: candles.length - 1,
        reason: `RSI(${indicators.rsi.toFixed(2)}) > ${rsiOverbought} + Death Cross`
      });
    }
    // Weak signals
    else if (indicators.rsi < rsiOversold + 5 && trend === 'bullish') {
      signals.push({
        type: 'BUY',
        price: closes[closes.length - 1],
        time: candles[candles.length - 1].closeTime,
        index: candles.length - 1,
        strength: 'weak',
        reason: `RSI(${indicators.rsi.toFixed(2)}) oversold in bullish trend`
      });
    } else if (indicators.rsi > rsiOverbought - 5 && trend === 'bearish') {
      signals.push({
        type: 'SELL',
        price: closes[closes.length - 1],
        time: candles[candles.length - 1].closeTime,
        index: candles.length - 1,
        strength: 'weak',
        reason: `RSI(${indicators.rsi.toFixed(2)}) overbought in bearish trend`
      });
    }
  }
  
  // Additional signals from Bollinger Bands
  if (settings.indicators.bb && indicators.bb) {
    const currentPrice = closes[closes.length - 1];
    if (currentPrice < indicators.bb.lower && trend === 'bullish') {
      signals.push({
        type: 'BUY',
        price: currentPrice,
        time: candles[candles.length - 1].closeTime,
        index: candles.length - 1,
        strength: 'weak',
        reason: 'Price below lower Bollinger Band'
      });
    } else if (currentPrice > indicators.bb.upper && trend === 'bearish') {
      signals.push({
        type: 'SELL',
        price: currentPrice,
        time: candles[candles.length - 1].closeTime,
        index: candles.length - 1,
        strength: 'weak',
        reason: 'Price above upper Bollinger Band'
      });
    }
  }
  
  // Format indicators for display
  const formattedIndicators = {};
  
  if (indicators.rsi !== undefined && indicators.rsi !== null) {
    formattedIndicators.rsi = indicators.rsi.toFixed(2);
  }
  
  if (indicators.ema20 !== undefined && indicators.ema20 !== null) {
    formattedIndicators.ema20 = indicators.ema20.toFixed(2);
  }
  
  if (indicators.ema50 !== undefined && indicators.ema50 !== null) {
    formattedIndicators.ema50 = indicators.ema50.toFixed(2);
  }
  
  if (indicators.sma20 !== undefined && indicators.sma20 !== null) {
    formattedIndicators.sma20 = indicators.sma20.toFixed(2);
  }
  
  if (indicators.sma50 !== undefined && indicators.sma50 !== null) {
    formattedIndicators.sma50 = indicators.sma50.toFixed(2);
  }
  
  if (indicators.macd) {
    const macdValue = indicators.macd.macd;
    const signalValue = indicators.macd.signal;
    const histogramValue = indicators.macd.histogram;
    
    formattedIndicators.macd = {
      macd: macdValue !== null && !isNaN(macdValue) ? macdValue.toFixed(2) : null,
      signal: signalValue !== null && !isNaN(signalValue) ? signalValue.toFixed(2) : null,
      histogram: histogramValue !== null && !isNaN(histogramValue) ? histogramValue.toFixed(2) : null
    };
  }
  
  if (indicators.bb) {
    formattedIndicators.bb = {
      upper: indicators.bb.upper.toFixed(2),
      middle: indicators.bb.middle.toFixed(2),
      lower: indicators.bb.lower.toFixed(2)
    };
  }
  
  if (indicators.stoch) {
    formattedIndicators.stoch = {
      k: indicators.stoch.k.toFixed(2),
      d: indicators.stoch.d.toFixed(2)
    };
  }
  
  if (indicators.adx) {
    formattedIndicators.adx = {
      adx: indicators.adx.adx.toFixed(2),
      plusDI: indicators.adx.plusDI.toFixed(2),
      minusDI: indicators.adx.minusDI.toFixed(2)
    };
  }
  
  if (indicators.atr !== undefined && indicators.atr !== null) {
    formattedIndicators.atr = indicators.atr.toFixed(2);
  }
  
  if (indicators.sar !== undefined && indicators.sar !== null) {
    formattedIndicators.sar = indicators.sar.toFixed(2);
  }
  
  if (indicators.volumeSMA !== undefined && indicators.volumeSMA !== null) {
    formattedIndicators.volumeSMA = indicators.volumeSMA.toFixed(2);
  }
  
  // Calculate trade recommendations
  const currentPrice = closes[closes.length - 1];
  const rsiValue = indicators.rsi;
  const tradeRecommendations = calculateTradeRecommendations(
    currentPrice,
    indicators.atr,
    trend,
    rsiValue,
    indicators
  );
  
  // Find support and resistance levels
  const supportResistance = findSupportResistance(candles, 10, 2);
  
  // Calculate volume profile
  const volumeProfile = calculateVolumeProfile(candles, 20);
  
  // Calculate Fibonacci levels
  const fibonacci = calculateFibonacci(candles);
  
  return {
    symbol: settings.symbol,
    interval: settings.interval,
    timestamp: Date.now(),
    currentPrice: currentPrice,
    indicators: formattedIndicators,
    trend: trend,
    signal: signal,
    signals: signals,
    recommendations: tradeRecommendations,
    supportResistance: supportResistance,
    volumeProfile: volumeProfile,
    fibonacci: fibonacci,
    candles: candles.slice(-100)
  };
}

// Main fetch and analyze loop
async function updateAnalysis() {
  console.log('[Background] Fetching and analyzing market data...');
  
  await loadSettings();
  
  // Fetch candles and order book in parallel
  const [candles, orderBook] = await Promise.all([
    fetchKlineData(
      currentSettings.symbol,
      currentSettings.interval,
      currentSettings.candleLimit
    ),
    fetchOrderBook(currentSettings.symbol, 100)
  ]);
  
  if (!candles) {
    console.error('[Background] Failed to fetch candles');
    return;
  }
  
  const analysis = analyzeMarket(candles, currentSettings);
  if (!analysis) {
    console.error('[Background] Failed to analyze market');
    return;
  }
  
  // Add order book data to analysis
  if (orderBook) {
    analysis.orderBook = orderBook;
    
    // Adjust recommendations based on order book pressure
    if (analysis.recommendations && orderBook.pressure) {
      if (orderBook.pressure === 'BUY_PRESSURE' && analysis.recommendations.action === 'LONG') {
        // Increase confidence for longs with buy pressure
        analysis.recommendations.confidence = 'HIGH';
      } else if (orderBook.pressure === 'SELL_PRESSURE' && analysis.recommendations.action === 'SHORT') {
        // Increase confidence for shorts with sell pressure
        analysis.recommendations.confidence = 'HIGH';
      } else if (
        (orderBook.pressure === 'SELL_PRESSURE' && analysis.recommendations.action === 'LONG') ||
        (orderBook.pressure === 'BUY_PRESSURE' && analysis.recommendations.action === 'SHORT')
      ) {
        // Decrease confidence if order book contradicts signal
        analysis.recommendations.confidence = 'LOW';
      } else {
        analysis.recommendations.confidence = 'MEDIUM';
      }
    }
  }
  
  await chrome.storage.local.set({ latestAnalysis: analysis });
  console.log('[Background] Analysis updated:', analysis.signal, 'Trend:', analysis.trend);
}

// Restart update interval with new settings
function restartUpdateInterval() {
  if (updateIntervalId) {
    clearInterval(updateIntervalId);
  }
  
  const intervalMs = (currentSettings.updateInterval || 5) * 1000;
  console.log('[Background] Setting update interval to', intervalMs, 'ms');
  
  updateIntervalId = setInterval(updateAnalysis, intervalMs);
  
  // Do immediate update
  updateAnalysis();
}

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Background] Extension installed');
  loadSettings().then(() => {
    restartUpdateInterval();
  });
});

// Listen for startup
chrome.runtime.onStartup.addListener(() => {
  console.log('[Background] Service worker started');
  loadSettings().then(() => {
    restartUpdateInterval();
  });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getAnalysis') {
    chrome.storage.local.get(['latestAnalysis'], (result) => {
      sendResponse(result.latestAnalysis || null);
    });
    return true;
  }
  
  if (request.action === 'forceUpdate') {
    updateAnalysis().then(() => {
      chrome.storage.local.get(['latestAnalysis'], (result) => {
        sendResponse(result.latestAnalysis || null);
      });
    });
    return true;
  }
  
  if (request.action === 'settingsUpdated') {
    console.log('[Background] Settings updated, reloading...');
    loadSettings().then(() => {
      restartUpdateInterval();
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'openOptions') {
    // Open options page
    chrome.runtime.openOptionsPage();
    sendResponse({ success: true });
    return true;
  }
});

// Initial load and start
loadSettings().then(() => {
  restartUpdateInterval();
});
