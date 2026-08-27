import { ADXResult } from '../types/indicators';
import { KlineCandle } from '../types/binance';

/**
 * Calculate Average Directional Index (ADX) along with +DI and -DI
 */
export function calculateADX(
  candles: KlineCandle[],
  period: number = 14,
  threshold: number = 25
): ADXResult {
  if (!candles || candles.length < period * 2 + 2) {
    return {
      adx: null,
      plusDI: null,
      minusDI: null,
      trendStrength: 'WEAK',
      trendDirection: 'NEUTRAL',
      score: 0
    };
  }

  const trSeries: number[] = [];
  const plusDMSeries: number[] = [];
  const minusDMSeries: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const prev = candles[i - 1];

    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - prev.close),
      Math.abs(current.low - prev.close)
    );
    trSeries.push(tr);

    const upMove = current.high - prev.high;
    const downMove = prev.low - current.low;

    if (upMove > downMove && upMove > 0) {
      plusDMSeries.push(upMove);
    } else {
      plusDMSeries.push(0);
    }

    if (downMove > upMove && downMove > 0) {
      minusDMSeries.push(downMove);
    } else {
      minusDMSeries.push(0);
    }
  }

  // Smooth TR, +DM, -DM with Wilder's method
  let smoothedTR = trSeries.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothedPlusDM = plusDMSeries.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothedMinusDM = minusDMSeries.slice(0, period).reduce((a, b) => a + b, 0);

  const dxSeries: number[] = [];
  let plusDI = 0;
  let minusDI = 0;

  for (let i = period; i < trSeries.length; i++) {
    smoothedTR = smoothedTR - smoothedTR / period + trSeries[i];
    smoothedPlusDM = smoothedPlusDM - smoothedPlusDM / period + plusDMSeries[i];
    smoothedMinusDM = smoothedMinusDM - smoothedMinusDM / period + minusDMSeries[i];

    plusDI = smoothedTR > 0 ? (smoothedPlusDM / smoothedTR) * 100 : 0;
    minusDI = smoothedTR > 0 ? (smoothedMinusDM / smoothedTR) * 100 : 0;

    const diSum = plusDI + minusDI;
    const dx = diSum > 0 ? (Math.abs(plusDI - minusDI) / diSum) * 100 : 0;
    dxSeries.push(dx);
  }

  if (dxSeries.length < period) {
    return {
      adx: null,
      plusDI: Math.round(plusDI * 100) / 100,
      minusDI: Math.round(minusDI * 100) / 100,
      trendStrength: 'WEAK',
      trendDirection: plusDI > minusDI ? 'BULLISH' : 'BEARISH',
      score: 0
    };
  }

  let adx = dxSeries.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < dxSeries.length; i++) {
    adx = (adx * (period - 1) + dxSeries[i]) / period;
  }

  let trendStrength: ADXResult['trendStrength'] = 'WEAK';
  if (adx >= 50) trendStrength = 'VERY_STRONG';
  else if (adx >= threshold) trendStrength = 'STRONG';
  else if (adx >= 20) trendStrength = 'MODERATE';

  const isBullish = plusDI > minusDI;
  const trendDirection: ADXResult['trendDirection'] = isBullish ? 'BULLISH' : 'BEARISH';

  // ADX acts as trend amplifier
  let score = 0;
  if (adx >= threshold) {
    score = isBullish ? Math.min(100, (adx / 50) * 60) : -Math.min(100, (adx / 50) * 60);
  }

  return {
    adx: Math.round(adx * 100) / 100,
    plusDI: Math.round(plusDI * 100) / 100,
    minusDI: Math.round(minusDI * 100) / 100,
    trendStrength,
    trendDirection,
    score: Math.round(score)
  };
}
