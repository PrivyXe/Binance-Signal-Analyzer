export interface RSIResult {
  value: number | null;
  state: 'OVERSOLD' | 'OVERBOUGHT' | 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  score: number; // -100 to +100
}

export interface EMAResult {
  fast: number | null;
  slow: number | null;
  trend: 'UPTREND' | 'DOWNTREND' | 'NEUTRAL';
  crossover: 'BULLISH_CROSS' | 'BEARISH_CROSS' | 'NONE';
  score: number;
}

export interface SMAResult {
  fast: number | null;
  slow: number | null;
  trend: 'UPTREND' | 'DOWNTREND' | 'NEUTRAL';
  score: number;
}

export interface MACDResult {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
  crossover: 'BULLISH_CROSS' | 'BEARISH_CROSS' | 'NONE';
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  score: number;
}

export interface BollingerBandsResult {
  upper: number | null;
  middle: number | null;
  lower: number | null;
  bandwidth: number | null;
  percentB: number | null;
  position: 'ABOVE_UPPER' | 'UPPER_HALF' | 'LOWER_HALF' | 'BELOW_LOWER' | 'NEUTRAL';
  isSqueezed: boolean;
  score: number;
}

export interface StochasticResult {
  k: number | null;
  d: number | null;
  state: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL';
  crossover: 'BULLISH_CROSS' | 'BEARISH_CROSS' | 'NONE';
  score: number;
}

export interface ADXResult {
  adx: number | null;
  plusDI: number | null;
  minusDI: number | null;
  trendStrength: 'VERY_STRONG' | 'STRONG' | 'MODERATE' | 'WEAK';
  trendDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  score: number;
}

export interface ATRResult {
  atr: number | null;
  volatility: 'HIGH' | 'MODERATE' | 'LOW';
  atrPercent: number | null;
}

export interface SARResult {
  sar: number | null;
  trend: 'BULLISH' | 'BEARISH';
  reversal: boolean;
  score: number;
}

export interface VolumeResult {
  current: number;
  sma: number | null;
  ratio: number | null;
  state: 'VERY_HIGH' | 'HIGH' | 'NORMAL' | 'LOW';
  score: number;
}

export interface SRLevel {
  price: number;
  type: 'SUPPORT' | 'RESISTANCE';
  strength: number; // 1 to 5
  touches: number;
  label: string; // e.g., 'R1', 'R2', 'S1', 'S2'
}

export interface FibonacciLevels {
  high: number;
  low: number;
  trend: 'UP' | 'DOWN';
  levels: {
    ratio: number;
    price: number;
    label: string;
  }[];
}

export interface AllIndicatorsResult {
  rsi?: RSIResult | null;
  ema?: EMAResult | null;
  sma?: SMAResult | null;
  macd?: MACDResult | null;
  bb?: BollingerBandsResult | null;
  stoch?: StochasticResult | null;
  adx?: ADXResult | null;
  atr?: ATRResult | null;
  sar?: SARResult | null;
  volume?: VolumeResult | null;
  srLevels?: SRLevel[];
  fibonacci?: FibonacciLevels | null;
}
