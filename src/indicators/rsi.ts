import { RSIResult } from '../types/indicators';

/**
 * Calculate Relative Strength Index (RSI) using Wilder's Smoothing
 */
export function calculateRSI(
  closes: number[],
  period: number = 14,
  oversold: number = 30,
  overbought: number = 70
): RSIResult {
  if (!closes || closes.length < period + 1) {
    return { value: null, state: 'NEUTRAL', score: 0 };
  }

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change >= 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) {
    return { value: 100, state: 'OVERBOUGHT', score: -100 };
  }

  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);
  const roundedRSI = Math.round(rsi * 100) / 100;

  let state: RSIResult['state'] = 'NEUTRAL';
  let score = 0;

  if (roundedRSI <= oversold) {
    state = 'OVERSOLD';
    // Deeply oversold = strong buy score
    score = Math.min(100, (oversold - roundedRSI) * 3 + 40);
  } else if (roundedRSI >= overbought) {
    state = 'OVERBOUGHT';
    // Deeply overbought = strong sell score
    score = -Math.min(100, (roundedRSI - overbought) * 3 + 40);
  } else if (roundedRSI > 50) {
    state = 'BULLISH';
    score = ((roundedRSI - 50) / (overbought - 50)) * 35;
  } else {
    state = 'BEARISH';
    score = -((50 - roundedRSI) / (50 - oversold)) * 35;
  }

  return {
    value: roundedRSI,
    state,
    score: Math.round(score)
  };
}
