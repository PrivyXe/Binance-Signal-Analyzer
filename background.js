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
  
  // ATR
  if (enabled.atr) {
    indicators.atr = calculateATR(candles, params.atr.period);
  }
  
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
  
  return {
    symbol: settings.symbol,
    interval: settings.interval,
    timestamp: Date.now(),
    currentPrice: closes[closes.length - 1],
    indicators: formattedIndicators,
    trend: trend,
    signal: signal,
    signals: signals,
    candles: candles.slice(-100)
  };
}

// Main fetch and analyze loop
async function updateAnalysis() {
  console.log('[Background] Fetching and analyzing market data...');
  
  await loadSettings();
  
  const candles = await fetchKlineData(
    currentSettings.symbol,
    currentSettings.interval,
    currentSettings.candleLimit
  );
  
  if (!candles) {
    console.error('[Background] Failed to fetch candles');
    return;
  }
  
  const analysis = analyzeMarket(candles, currentSettings);
  if (!analysis) {
    console.error('[Background] Failed to analyze market');
    return;
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
