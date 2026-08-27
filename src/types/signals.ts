import { AllIndicatorsResult, SRLevel, FibonacciLevels } from './indicators';
import { OrderBookData } from './binance';

export type SignalType = 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';

export type TrendDirection = 'BULLISH' | 'BEARISH' | 'SIDEWAYS';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ChartSignalMarker {
  index: number;
  time: number;
  price: number;
  type: 'BUY' | 'SELL' | 'STRONG_BUY' | 'STRONG_SELL';
  reason: string;
}

export interface TradingRecommendation {
  type: 'LONG' | 'SHORT' | 'HOLD';
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  riskRewardRatio: number;
  suggestedLeverage: number; // e.g. 2x, 3x, 5x
  confidence: ConfidenceLevel;
  reasons: string[];
}

export interface AnalysisSummary {
  symbol: string;
  timeframe: string;
  currentPrice: number;
  priceChange24h?: number;
  timestamp: number;
  trend: TrendDirection;
  signal: SignalType;
  compositeScore: number; // -100 to +100
  confidence: ConfidenceLevel;
  indicators: AllIndicatorsResult;
  recommendation: TradingRecommendation;
  orderBook: OrderBookData | null;
  srLevels: SRLevel[];
  fibonacci: FibonacciLevels | null;
  signalMarkers?: ChartSignalMarker[];
}
