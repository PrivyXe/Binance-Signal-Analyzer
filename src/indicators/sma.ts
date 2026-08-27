import { SMAResult } from '../types/indicators';

/**
 * Calculate Simple Moving Average (SMA)
 */
export function calculateSMA(
  data: number[],
  fastPeriod: number = 20,
  slowPeriod: number = 50
): SMAResult {
  if (!data || data.length < slowPeriod) {
    return {
      fast: null,
      slow: null,
      trend: 'NEUTRAL',
      score: 0
    };
  }

  const fastSlice = data.slice(-fastPeriod);
  const slowSlice = data.slice(-slowPeriod);

  const fast = fastSlice.reduce((a, b) => a + b, 0) / fastPeriod;
  const slow = slowSlice.reduce((a, b) => a + b, 0) / slowPeriod;

  let trend: SMAResult['trend'] = 'NEUTRAL';
  let score = 0;

  if (fast > slow) {
    trend = 'UPTREND';
    score = 30;
  } else if (fast < slow) {
    trend = 'DOWNTREND';
    score = -30;
  }

  return {
    fast: Math.round(fast * 100) / 100,
    slow: Math.round(slow * 100) / 100,
    trend,
    score
  };
}
