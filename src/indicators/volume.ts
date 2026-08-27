import { VolumeResult } from '../types/indicators';
import { KlineCandle } from '../types/binance';

/**
 * Calculate Volume SMA and Volume surge analysis
 */
export function calculateVolume(
  candles: KlineCandle[],
  period: number = 20
): VolumeResult {
  if (!candles || candles.length < period) {
    const current = candles && candles.length > 0 ? candles[candles.length - 1].volume : 0;
    return {
      current,
      sma: null,
      ratio: null,
      state: 'NORMAL',
      score: 0
    };
  }

  const volumes = candles.map((c) => c.volume);
  const currentVolume = volumes[volumes.length - 1];
  const lastClose = candles[candles.length - 1].close;
  const prevClose = candles[candles.length - 2].close;
  const isUp = lastClose >= prevClose;

  const slice = volumes.slice(-period);
  const sma = slice.reduce((a, b) => a + b, 0) / period;
  const ratio = sma > 0 ? currentVolume / sma : 1;

  let state: VolumeResult['state'] = 'NORMAL';
  let score = 0;

  if (ratio >= 2.5) {
    state = 'VERY_HIGH';
    score = isUp ? 40 : -40;
  } else if (ratio >= 1.5) {
    state = 'HIGH';
    score = isUp ? 25 : -25;
  } else if (ratio < 0.6) {
    state = 'LOW';
    score = 0;
  }

  return {
    current: Math.round(currentVolume * 100) / 100,
    sma: Math.round(sma * 100) / 100,
    ratio: Math.round(ratio * 100) / 100,
    state,
    score
  };
}
