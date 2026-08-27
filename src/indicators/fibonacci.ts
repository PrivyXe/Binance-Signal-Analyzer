import { FibonacciLevels } from '../types/indicators';
import { KlineCandle } from '../types/binance';

/**
 * Calculate Fibonacci Retracement and Extension levels from recent major swing
 */
export function calculateFibonacci(candles: KlineCandle[], lookback: number = 100): FibonacciLevels | null {
  if (!candles || candles.length < 20) return null;

  const slice = candles.slice(-Math.min(lookback, candles.length));
  let high = slice[0].high;
  let low = slice[0].low;
  let highIdx = 0;
  let lowIdx = 0;

  slice.forEach((c, idx) => {
    if (c.high > high) {
      high = c.high;
      highIdx = idx;
    }
    if (c.low < low) {
      low = c.low;
      lowIdx = idx;
    }
  });

  const diff = high - low;
  if (diff <= 0) return null;

  // Trend determination based on which peak/trough is more recent
  const trend: 'UP' | 'DOWN' = highIdx > lowIdx ? 'UP' : 'DOWN';

  const ratios = [
    { ratio: 0, label: '0.0% (High)' },
    { ratio: 0.236, label: '23.6%' },
    { ratio: 0.382, label: '38.2%' },
    { ratio: 0.5, label: '50.0%' },
    { ratio: 0.618, label: '61.8% (Golden)' },
    { ratio: 0.786, label: '78.6%' },
    { ratio: 1.0, label: '100.0% (Low)' },
    { ratio: 1.618, label: '161.8% (Extension)' }
  ];

  const levels = ratios.map((r) => {
    let price: number;
    if (trend === 'UP') {
      // In uptrend, retracement is down from high
      price = high - diff * r.ratio;
    } else {
      // In downtrend, retracement is up from low
      price = low + diff * r.ratio;
    }
    return {
      ratio: r.ratio,
      price: Math.round(price * 100) / 100,
      label: r.label
    };
  });

  return {
    high: Math.round(high * 100) / 100,
    low: Math.round(low * 100) / 100,
    trend,
    levels
  };
}
