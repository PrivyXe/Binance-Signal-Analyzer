import { ATRResult } from '../types/indicators';
import { KlineCandle } from '../types/binance';

/**
 * Calculate Average True Range (ATR)
 */
export function calculateATR(candles: KlineCandle[], period: number = 14): ATRResult {
  if (!candles || candles.length < period + 1) {
    return {
      atr: null,
      volatility: 'MODERATE',
      atrPercent: null
    };
  }

  const trSeries: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const prev = candles[i - 1];

    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - prev.close),
      Math.abs(current.low - prev.close)
    );
    trSeries.push(tr);
  }

  let atr = trSeries.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < trSeries.length; i++) {
    atr = (atr * (period - 1) + trSeries[i]) / period;
  }

  const lastClose = candles[candles.length - 1].close;
  const atrPercent = lastClose > 0 ? (atr / lastClose) * 100 : 0;

  let volatility: ATRResult['volatility'] = 'MODERATE';
  if (atrPercent > 3.0) volatility = 'HIGH';
  else if (atrPercent < 1.0) volatility = 'LOW';

  return {
    atr: Math.round(atr * 1000) / 1000,
    volatility,
    atrPercent: Math.round(atrPercent * 100) / 100
  };
}
