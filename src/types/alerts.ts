import { SignalType } from './signals';
import { Timeframe } from './binance';

export type AlertType = 'BUY_SIGNAL' | 'SELL_SIGNAL' | 'TP_HIT' | 'SL_HIT' | 'PRICE_ALERT';

export type SoundType = 'BUY_CHIME' | 'SELL_CHIME' | 'TP_VICTORY' | 'SL_WARNING';

export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: 'ABOVE' | 'BELOW';
  alertType: 'CUSTOM' | 'TP' | 'SL';
  createdAt: number;
  triggered: boolean;
  note?: string;
}

export interface TradePosition {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  takeProfit: number;
  stopLoss: number;
  createdAt: number;
  status: 'ACTIVE' | 'CLOSED_TP' | 'CLOSED_SL';
}

export interface ScreenerCoinResult {
  symbol: string;
  timeframe: Timeframe;
  price: number;
  priceChange24h: number;
  signal: SignalType;
  compositeScore: number;
  rsiValue: number | null;
  macdTrend: string;
  timestamp: number;
}
