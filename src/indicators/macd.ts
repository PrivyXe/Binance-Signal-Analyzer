import { MACDResult } from '../types/indicators';
import { calculateEMASeries } from './ema';

/**
 * Calculate Moving Average Convergence Divergence (MACD)
 */
export function calculateMACD(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult {
  if (!closes || closes.length < slowPeriod + signalPeriod + 2) {
    return {
      macd: null,
      signal: null,
      histogram: null,
      crossover: 'NONE',
      trend: 'NEUTRAL',
      score: 0
    };
  }

  const fastEMA = calculateEMASeries(closes, fastPeriod);
  const slowEMA = calculateEMASeries(closes, slowPeriod);

  // Align fastEMA and slowEMA: fastEMA starts at index (fastPeriod-1), slowEMA at (slowPeriod-1)
  const offset = slowPeriod - fastPeriod;
  const macdLine: number[] = [];

  for (let i = 0; i < slowEMA.length; i++) {
    const fastVal = fastEMA[i + offset];
    const slowVal = slowEMA[i];
    if (fastVal !== undefined && slowVal !== undefined) {
      macdLine.push(fastVal - slowVal);
    }
  }

  if (macdLine.length < signalPeriod + 2) {
    return {
      macd: null,
      signal: null,
      histogram: null,
      crossover: 'NONE',
      trend: 'NEUTRAL',
      score: 0
    };
  }

  const signalLine = calculateEMASeries(macdLine, signalPeriod);
  if (signalLine.length < 2) {
    return {
      macd: null,
      signal: null,
      histogram: null,
      crossover: 'NONE',
      trend: 'NEUTRAL',
      score: 0
    };
  }

  const currentMACD = macdLine[macdLine.length - 1];
  const prevMACD = macdLine[macdLine.length - 2];

  const currentSignal = signalLine[signalLine.length - 1];
  const prevSignal = signalLine[signalLine.length - 2];

  const currentHist = currentMACD - currentSignal;
  const prevHist = prevMACD - prevSignal;

  let crossover: MACDResult['crossover'] = 'NONE';
  if (prevMACD <= prevSignal && currentMACD > currentSignal) {
    crossover = 'BULLISH_CROSS';
  } else if (prevMACD >= prevSignal && currentMACD < currentSignal) {
    crossover = 'BEARISH_CROSS';
  }

  let trend: MACDResult['trend'] = 'NEUTRAL';
  let score = 0;

  if (currentMACD > currentSignal && currentHist > 0) {
    trend = 'BULLISH';
    score = 35;
    if (currentHist > prevHist) score += 15; // expanding momentum
  } else if (currentMACD < currentSignal && currentHist < 0) {
    trend = 'BEARISH';
    score = -35;
    if (currentHist < prevHist) score -= 15; // expanding bearish momentum
  }

  if (crossover === 'BULLISH_CROSS') score += 40;
  if (crossover === 'BEARISH_CROSS') score -= 40;

  return {
    macd: Math.round(currentMACD * 1000) / 1000,
    signal: Math.round(currentSignal * 1000) / 1000,
    histogram: Math.round(currentHist * 1000) / 1000,
    crossover,
    trend,
    score: Math.max(-100, Math.min(100, score))
  };
}
