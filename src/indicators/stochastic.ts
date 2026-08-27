import { StochasticResult } from '../types/indicators';
import { KlineCandle } from '../types/binance';

/**
 * Calculate Stochastic Oscillator (%K and %D)
 */
export function calculateStochastic(
  candles: KlineCandle[],
  kPeriod: number = 14,
  dPeriod: number = 3,
  oversold: number = 20,
  overbought: number = 80
): StochasticResult {
  if (!candles || candles.length < kPeriod + dPeriod + 2) {
    return {
      k: null,
      d: null,
      state: 'NEUTRAL',
      crossover: 'NONE',
      score: 0
    };
  }

  // Calculate raw %K series
  const rawKSeries: number[] = [];

  for (let i = kPeriod - 1; i < candles.length; i++) {
    const window = candles.slice(i - kPeriod + 1, i + 1);
    const highestHigh = Math.max(...window.map((c) => c.high));
    const lowestLow = Math.min(...window.map((c) => c.low));
    const currentClose = candles[i].close;

    if (highestHigh === lowestLow) {
      rawKSeries.push(50);
    } else {
      const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
      rawKSeries.push(k);
    }
  }

  // %D is SMA of %K
  const dSeries: number[] = [];
  for (let i = dPeriod - 1; i < rawKSeries.length; i++) {
    const slice = rawKSeries.slice(i - dPeriod + 1, i + 1);
    const d = slice.reduce((a, b) => a + b, 0) / dPeriod;
    dSeries.push(d);
  }

  if (dSeries.length < 2) {
    return {
      k: null,
      d: null,
      state: 'NEUTRAL',
      crossover: 'NONE',
      score: 0
    };
  }

  const currentK = rawKSeries[rawKSeries.length - 1];
  const prevK = rawKSeries[rawKSeries.length - 2];
  const currentD = dSeries[dSeries.length - 1];
  const prevD = dSeries[dSeries.length - 2];

  let crossover: StochasticResult['crossover'] = 'NONE';
  if (prevK <= prevD && currentK > currentD) {
    crossover = 'BULLISH_CROSS';
  } else if (prevK >= prevD && currentK < currentD) {
    crossover = 'BEARISH_CROSS';
  }

  let state: StochasticResult['state'] = 'NEUTRAL';
  let score = 0;

  if (currentK <= oversold && currentD <= oversold) {
    state = 'OVERSOLD';
    score = 45;
  } else if (currentK >= overbought && currentD >= overbought) {
    state = 'OVERBOUGHT';
    score = -45;
  } else if (currentK > currentD) {
    score = 15;
  } else {
    score = -15;
  }

  if (crossover === 'BULLISH_CROSS' && currentK <= oversold + 10) score += 35;
  if (crossover === 'BEARISH_CROSS' && currentK >= overbought - 10) score -= 35;

  return {
    k: Math.round(currentK * 100) / 100,
    d: Math.round(currentD * 100) / 100,
    state,
    crossover,
    score: Math.max(-100, Math.min(100, score))
  };
}
