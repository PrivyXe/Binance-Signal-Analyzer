// Technical indicators calculation module
// This file contains pure calculation functions for technical analysis

const Indicators = {
  /**
   * Calculate RSI (Relative Strength Index)
   * @param {Array<number>} closes - Array of closing prices
   * @param {number} period - RSI period (default: 14)
   * @returns {number|null} RSI value or null if insufficient data
   */
  calculateRSI(closes, period = 14) {
    if (closes.length < period + 1) return null;
    
    let gains = 0;
    let losses = 0;
    
    // Calculate initial average gain/loss
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
    
    // Smooth subsequent values
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
  },

  /**
   * Calculate EMA (Exponential Moving Average)
   * @param {Array<number>} data - Array of values
   * @param {number} period - EMA period
   * @returns {number|null} EMA value or null if insufficient data
   */
  calculateEMA(data, period) {
    if (data.length < period) return null;
    
    const k = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
    
    for (let i = period; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
    }
    
    return ema;
  },

  /**
   * Calculate EMA array (all values)
   * @param {Array<number>} data - Array of values
   * @param {number} period - EMA period
   * @returns {Array<number>} Array of EMA values
   */
  calculateEMAArray(data, period) {
    if (data.length < period) return [];
    
    const k = 2 / (period + 1);
    const emaArray = [];
    let ema = data.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
    
    emaArray.push(ema);
    
    for (let i = period; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
      emaArray.push(ema);
    }
    
    return emaArray;
  },

  /**
   * Calculate SMA (Simple Moving Average)
   * @param {Array<number>} data - Array of values
   * @param {number} period - SMA period
   * @returns {number|null} SMA value or null if insufficient data
   */
  calculateSMA(data, period) {
    if (data.length < period) return null;
    
    const slice = data.slice(-period);
    return slice.reduce((sum, val) => sum + val, 0) / period;
  },

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   * @param {Array<number>} closes - Array of closing prices
   * @param {number} fastPeriod - Fast EMA period (default: 12)
   * @param {number} slowPeriod - Slow EMA period (default: 26)
   * @param {number} signalPeriod - Signal line period (default: 9)
   * @returns {Object|null} MACD object {macd, signal, histogram} or null
   */
  calculateMACD(closes, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (closes.length < slowPeriod + signalPeriod) return null;
    
    const kFast = 2 / (fastPeriod + 1);
    const kSlow = 2 / (slowPeriod + 1);
    
    // Calculate fast and slow EMA arrays
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
  },

  /**
   * Detect EMA cross
   * @param {number} ema1Current - Current value of first EMA
   * @param {number} ema2Current - Current value of second EMA
   * @param {number} ema1Previous - Previous value of first EMA
   * @param {number} ema2Previous - Previous value of second EMA
   * @returns {string} 'golden' (bullish), 'death' (bearish), or 'none'
   */
  detectCross(ema1Current, ema2Current, ema1Previous, ema2Previous) {
    if (ema1Previous <= ema2Previous && ema1Current > ema2Current) {
      return 'golden'; // Bullish cross
    } else if (ema1Previous >= ema2Previous && ema1Current < ema2Current) {
      return 'death'; // Bearish cross
    }
    return 'none';
  },

  /**
   * Determine market trend based on EMAs
   * @param {number} ema20 - EMA 20 value
   * @param {number} ema50 - EMA 50 value
   * @returns {string} 'bullish', 'bearish', or 'neutral'
   */
  determineTrend(ema20, ema50) {
    if (!ema20 || !ema50) return 'neutral';
    
    if (ema20 > ema50) {
      return 'bullish';
    } else if (ema20 < ema50) {
      return 'bearish';
    }
    return 'neutral';
  },

  /**
   * Calculate Bollinger Bands
   * @param {Array<number>} data - Array of values (typically closing prices)
   * @param {number} period - BB period (default: 20)
   * @param {number} stdDev - Standard deviation multiplier (default: 2)
   * @returns {Object|null} {upper, middle, lower} or null
   */
  calculateBollingerBands(data, period = 20, stdDev = 2) {
    if (data.length < period) return null;
    
    const middle = this.calculateSMA(data, period);
    if (!middle) return null;
    
    // Calculate standard deviation
    const slice = data.slice(-period);
    const squaredDiffs = slice.map(val => Math.pow(val - middle, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / period;
    const sd = Math.sqrt(variance);
    
    return {
      upper: middle + (sd * stdDev),
      middle: middle,
      lower: middle - (sd * stdDev)
    };
  },

  /**
   * Calculate Stochastic Oscillator
   * @param {Array<Object>} candles - Array of candle objects {high, low, close}
   * @param {number} kPeriod - K period (default: 14)
   * @param {number} dPeriod - D period (default: 3)
   * @returns {Object|null} {k, d} or null
   */
  calculateStochastic(candles, kPeriod = 14, dPeriod = 3) {
    if (candles.length < kPeriod) return null;
    
    const recentCandles = candles.slice(-kPeriod);
    const currentClose = candles[candles.length - 1].close;
    
    const highestHigh = Math.max(...recentCandles.map(c => c.high));
    const lowestLow = Math.min(...recentCandles.map(c => c.low));
    
    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    
    // Calculate %D (SMA of %K)
    // For simplicity, we'll just return the current K value
    // In a full implementation, you'd track multiple K values
    
    return {
      k: k,
      d: k // Simplified - should be SMA of K values
    };
  },

  /**
   * Calculate ADX (Average Directional Index)
   * @param {Array<Object>} candles - Array of candle objects {high, low, close}
   * @param {number} period - ADX period (default: 14)
   * @returns {Object|null} {adx, plusDI, minusDI} or null
   */
  calculateADX(candles, period = 14) {
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
    
    return {
      adx: dx, // Simplified - should be smoothed
      plusDI: plusDI,
      minusDI: minusDI
    };
  },

  /**
   * Calculate ATR (Average True Range)
   * @param {Array<Object>} candles - Array of candle objects {high, low, close}
   * @param {number} period - ATR period (default: 14)
   * @returns {number|null} ATR value or null
   */
  calculateATR(candles, period = 14) {
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
  },

  /**
   * Calculate Parabolic SAR
   * @param {Array<Object>} candles - Array of candle objects {high, low}
   * @param {number} step - Acceleration factor step (default: 0.02)
   * @param {number} max - Maximum acceleration factor (default: 0.2)
   * @returns {number|null} SAR value or null
   */
  calculateParabolicSAR(candles, step = 0.02, max = 0.2) {
    if (candles.length < 2) return null;
    
    // Simplified SAR calculation
    const current = candles[candles.length - 1];
    const previous = candles[candles.length - 2];
    
    // Determine if uptrend or downtrend
    const isUptrend = current.close > previous.close;
    
    if (isUptrend) {
      return previous.low - (previous.high - previous.low) * step;
    } else {
      return previous.high + (previous.high - previous.low) * step;
    }
  },

  /**
   * Calculate Volume SMA
   * @param {Array<number>} volumes - Array of volume values
   * @param {number} period - SMA period (default: 20)
   * @returns {number|null} Volume SMA or null
   */
  calculateVolumeSMA(volumes, period = 20) {
    return this.calculateSMA(volumes, period);
  },

  /**
   * Calculate all indicators for given data
   * @param {Array<Object>} candles - Array of candle data
   * @param {Object} settings - Settings object with indicator configs
   * @returns {Object} Object containing all calculated indicators
   */
  calculateAll(candles, settings) {
    if (!candles || candles.length === 0) return {};
    
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume);
    
    const indicators = {};
    const params = settings?.indicatorParams || {};
    const enabled = settings?.indicators || {};
    
    // RSI
    if (enabled.rsi) {
      const rsiParams = params.rsi || { period: 14 };
      indicators.rsi = this.calculateRSI(closes, rsiParams.period);
    }
    
    // EMA
    if (enabled.ema) {
      const emaParams = params.ema || { fast: 20, slow: 50 };
      indicators.ema20 = this.calculateEMA(closes, emaParams.fast);
      indicators.ema50 = this.calculateEMA(closes, emaParams.slow);
    }
    
    // SMA
    if (enabled.sma) {
      const smaParams = params.sma || { fast: 20, slow: 50 };
      indicators.sma20 = this.calculateSMA(closes, smaParams.fast);
      indicators.sma50 = this.calculateSMA(closes, smaParams.slow);
    }
    
    // MACD
    if (enabled.macd) {
      const macdParams = params.macd || { fast: 12, slow: 26, signal: 9 };
      indicators.macd = this.calculateMACD(closes, macdParams.fast, macdParams.slow, macdParams.signal);
    }
    
    // Bollinger Bands
    if (enabled.bb) {
      const bbParams = params.bb || { period: 20, stddev: 2 };
      indicators.bb = this.calculateBollingerBands(closes, bbParams.period, bbParams.stddev);
    }
    
    // Stochastic
    if (enabled.stoch) {
      const stochParams = params.stoch || { k: 14, d: 3 };
      indicators.stoch = this.calculateStochastic(candles, stochParams.k, stochParams.d);
    }
    
    // ADX
    if (enabled.adx) {
      const adxParams = params.adx || { period: 14 };
      indicators.adx = this.calculateADX(candles, adxParams.period);
    }
    
    // ATR
    if (enabled.atr) {
      const atrParams = params.atr || { period: 14 };
      indicators.atr = this.calculateATR(candles, atrParams.period);
    }
    
    // Parabolic SAR
    if (enabled.sar) {
      const sarParams = params.sar || { step: 0.02, max: 0.2 };
      indicators.sar = this.calculateParabolicSAR(candles, sarParams.step, sarParams.max);
    }
    
    // Volume
    if (enabled.volume) {
      const volumeParams = params.volume || { period: 20 };
      indicators.volumeSMA = this.calculateVolumeSMA(volumes, volumeParams.period);
    }
    
    return indicators;
  }
};

// Make it available globally for content scripts
if (typeof window !== 'undefined') {
  window.Indicators = Indicators;
}

