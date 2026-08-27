import { AnalysisSummary } from './signals';
import { UserSettings } from './settings';
import { Timeframe } from './binance';
import { PriceAlert, TradePosition, SoundType } from './alerts';

export type ExtensionAction =
  | { type: 'FETCH_ANALYSIS'; payload?: { symbol?: string; interval?: Timeframe } }
  | { type: 'GET_SETTINGS' }
  | { type: 'SAVE_SETTINGS'; payload: Partial<UserSettings> }
  | { type: 'RESET_SETTINGS' }
  | { type: 'ANALYSIS_UPDATED'; payload: AnalysisSummary }
  | { type: 'TRIGGER_SCAN' }
  | { type: 'GET_SCREENER_RESULTS' }
  | { type: 'GET_ALERTS' }
  | { type: 'ADD_PRICE_ALERT'; payload: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered'> }
  | { type: 'DELETE_PRICE_ALERT'; payload: { id: string } }
  | { type: 'CREATE_TRADE_POSITION'; payload: Omit<TradePosition, 'id' | 'createdAt' | 'status'> }
  | { type: 'DELETE_TRADE_POSITION'; payload: { id: string } }
  | { type: 'PLAY_SOUND'; payload: { soundType: SoundType } };

export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
