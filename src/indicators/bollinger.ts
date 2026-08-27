import { BollingerBandsResult } from '../types/indicators';

/**
 * Calculate Bollinger Bands (%B, Bandwidth, Squeeze, Upper/Middle/Lower)
 */
export function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): BollingerBandsResult {
  if (!closes || closes.length < period) {
    return {
      upper: null,
      middle: null,
      lower: null,
      bandwidth: null,
      percentB: null,
      position: 'NEUTRAL',
      isSqueezed: false,
      score: 0
    };
  }

  const slice = closes.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / period;

  const variance = slice.reduce((sum, val) => sum + Math.pow(val - middle, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  const upper = middle + stdDevMultiplier * stdDev;
  const lower = middle - stdDevMultiplier * stdDev;
  const lastClose = closes[closes.length - 1];

  const bandwidth = middle > 0 ? ((upper - lower) / middle) * 100 : 0;
  const percentB = upper !== lower ? (lastClose - lower) / (upper - lower) : 0.5;

  let position: BollingerBandsResult['position'] = 'NEUTRAL';
  let score = 0;

  if (lastClose >= upper) {
    position = 'ABOVE_UPPER';
    score = -50; // Overextended / mean reversion sell risk
  } else if (lastClose <= lower) {
    position = 'BELOW_LOWER';
    score = 50; // Oversold / mean reversion buy potential
  } else if (lastClose > middle) {
    position = 'UPPER_HALF';
    score = 15;
  } else {
    position = 'LOWER_HALF';
    score = -15;
  }

  // Squeeze condition (bandwidth below historical threshold ~4%)
  const isSqueezed = bandwidth < 4.0;

  return {
    upper: Math.round(upper * 100) / 100,
    middle: Math.round(middle * 100) / 100,
    lower: Math.round(lower * 100) / 100,
    bandwidth: Math.round(bandwidth * 100) / 100,
    percentB: Math.round(percentB * 1000) / 1000,
    position,
    isSqueezed,
    score
  };
}
