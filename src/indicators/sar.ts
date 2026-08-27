import { SARResult } from '../types/indicators';
import { KlineCandle } from '../types/binance';

/**
 * Calculate Parabolic SAR (Stop and Reverse)
 */
export function calculateParabolicSAR(
  candles: KlineCandle[],
  step: number = 0.02,
  maxStep: number = 0.2
): SARResult {
  if (!candles || candles.length < 5) {
    return {
      sar: null,
      trend: 'BULLISH',
      reversal: false,
      score: 0
    };
  }

  let isBull = candles[1].close >= candles[0].close;
  let ep = isBull ? candles[1].high : candles[1].low;
  let af = step;
  let sar = isBull ? candles[0].low : candles[0].high;
  let reversal = false;

  for (let i = 2; i < candles.length; i++) {
    const current = candles[i];
    const prev = candles[i - 1];
    const prevPrev = candles[i - 2];

    sar = sar + af * (ep - sar);

    if (isBull) {
      // SAR can't be above the low of prior two bars
      sar = Math.min(sar, prev.low, prevPrev.low);

      if (current.low < sar) {
        // Switch to bear
        isBull = false;
        sar = ep;
        ep = current.low;
        af = step;
        if (i === candles.length - 1) reversal = true;
      } else {
        if (current.high > ep) {
          ep = current.high;
          af = Math.min(af + step, maxStep);
        }
      }
    } else {
      // SAR can't be below the high of prior two bars
      sar = Math.max(sar, prev.high, prevPrev.high);

      if (current.high > sar) {
        // Switch to bull
        isBull = true;
        sar = ep;
        ep = current.high;
        af = step;
        if (i === candles.length - 1) reversal = true;
      } else {
        if (current.low < ep) {
          ep = current.low;
          af = Math.min(af + step, maxStep);
        }
      }
    }
  }

  const score = isBull ? (reversal ? 50 : 30) : reversal ? -50 : -30;

  return {
    sar: Math.round(sar * 100) / 100,
    trend: isBull ? 'BULLISH' : 'BEARISH',
    reversal,
    score
  };
}
