import { EMAResult } from '../types/indicators';

/**
 * Calculate Exponential Moving Average (EMA) series
 */
export function calculateEMASeries(data: number[], period: number): number[] {
  if (!data || data.length < period) return [];

  const k = 2 / (period + 1);
  const result: number[] = [];

  // Seed with SMA
  let initialSma = 0;
  for (let i = 0; i < period; i++) {
    initialSma += data[i];
  }
  let currentEma = initialSma / period;
  result.push(currentEma);

  for (let i = period; i < data.length; i++) {
    currentEma = data[i] * k + currentEma * (1 - k);
    result.push(currentEma);
  }

  return result;
}

/**
 * Calculate EMA Fast/Slow and crossover/trend analysis
 */
export function calculateEMA(
  closes: number[],
  fastPeriod: number = 20,
  slowPeriod: number = 50
): EMAResult {
  if (!closes || closes.length < slowPeriod + 2) {
    return {
      fast: null,
      slow: null,
      trend: 'NEUTRAL',
      crossover: 'NONE',
      score: 0
    };
  }

  const fastSeries = calculateEMASeries(closes, fastPeriod);
  const slowSeries = calculateEMASeries(closes, slowPeriod);

  if (fastSeries.length < 2 || slowSeries.length < 2) {
    return {
      fast: null,
      slow: null,
      trend: 'NEUTRAL',
      crossover: 'NONE',
      score: 0
    };
  }

  const currentFast = fastSeries[fastSeries.length - 1];
  const prevFast = fastSeries[fastSeries.length - 2];

  const currentSlow = slowSeries[slowSeries.length - 1];
  const prevSlow = slowSeries[slowSeries.length - 2];

  let crossover: EMAResult['crossover'] = 'NONE';
  if (prevFast <= prevSlow && currentFast > currentSlow) {
    crossover = 'BULLISH_CROSS';
  } else if (prevFast >= prevSlow && currentFast < currentSlow) {
    crossover = 'BEARISH_CROSS';
  }

  const lastPrice = closes[closes.length - 1];
  let trend: EMAResult['trend'] = 'NEUTRAL';
  let score = 0;

  if (currentFast > currentSlow && lastPrice > currentFast) {
    trend = 'UPTREND';
    score = 45;
  } else if (currentFast < currentSlow && lastPrice < currentFast) {
    trend = 'DOWNTREND';
    score = -45;
  } else if (currentFast > currentSlow) {
    trend = 'UPTREND';
    score = 25;
  } else if (currentFast < currentSlow) {
    trend = 'DOWNTREND';
    score = -25;
  }

  if (crossover === 'BULLISH_CROSS') score += 40;
  if (crossover === 'BEARISH_CROSS') score -= 40;

  return {
    fast: Math.round(currentFast * 100) / 100,
    slow: Math.round(currentSlow * 100) / 100,
    trend,
    crossover,
    score: Math.max(-100, Math.min(100, score))
  };
}
