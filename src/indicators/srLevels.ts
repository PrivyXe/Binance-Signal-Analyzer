import { SRLevel } from '../types/indicators';
import { KlineCandle } from '../types/binance';

/**
 * Calculate dynamic Support and Resistance levels from Swing Highs and Lows
 */
export function calculateSRLevels(
  candles: KlineCandle[],
  leftBars: number = 5,
  rightBars: number = 5,
  clusterThresholdPercent: number = 0.5
): SRLevel[] {
  if (!candles || candles.length < leftBars + rightBars + 1) {
    return [];
  }

  const swingHighs: number[] = [];
  const swingLows: number[] = [];

  for (let i = leftBars; i < candles.length - rightBars; i++) {
    const currentHigh = candles[i].high;
    const currentLow = candles[i].low;

    let isHigh = true;
    let isLow = true;

    for (let j = i - leftBars; j <= i + rightBars; j++) {
      if (j === i) continue;
      if (candles[j].high >= currentHigh) isHigh = false;
      if (candles[j].low <= currentLow) isLow = false;
    }

    if (isHigh) swingHighs.push(currentHigh);
    if (isLow) swingLows.push(currentLow);
  }

  const currentPrice = candles[candles.length - 1].close;

  // Cluster nearby levels
  const clusterLevels = (
    rawLevels: number[]
  ): { price: number; touches: number }[] => {
    if (rawLevels.length === 0) return [];

    const sorted = [...rawLevels].sort((a, b) => a - b);
    const clusters: { sum: number; count: number }[] = [];

    for (const lvl of sorted) {
      let merged = false;
      for (const cluster of clusters) {
        const avg = cluster.sum / cluster.count;
        const diffPercent = (Math.abs(lvl - avg) / avg) * 100;
        if (diffPercent <= clusterThresholdPercent) {
          cluster.sum += lvl;
          cluster.count += 1;
          merged = true;
          break;
        }
      }
      if (!merged) {
        clusters.push({ sum: lvl, count: 1 });
      }
    }

    return clusters.map((c) => ({
      price: Math.round((c.sum / c.count) * 100) / 100,
      touches: c.count
    }));
  };

  const resistanceClusters = clusterLevels(
    swingHighs.filter((p) => p > currentPrice)
  ).sort((a, b) => a.price - b.price); // nearest above current first

  const supportClusters = clusterLevels(
    swingLows.filter((p) => p < currentPrice)
  ).sort((a, b) => b.price - a.price); // nearest below current first

  const results: SRLevel[] = [];

  // Top 2 Resistance
  resistanceClusters.slice(0, 2).forEach((r, idx) => {
    results.push({
      price: r.price,
      type: 'RESISTANCE',
      strength: Math.min(5, r.touches + 1),
      touches: r.touches,
      label: `R${idx + 1}`
    });
  });

  // Top 2 Support
  supportClusters.slice(0, 2).forEach((s, idx) => {
    results.push({
      price: s.price,
      type: 'SUPPORT',
      strength: Math.min(5, s.touches + 1),
      touches: s.touches,
      label: `S${idx + 1}`
    });
  });

  return results;
}
