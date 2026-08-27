import { Timeframe } from './binance';
import { PriceAlert, TradePosition } from './alerts';

export interface IndicatorToggles {
  rsi: boolean;
  ema: boolean;
  sma: boolean;
  macd: boolean;
  bb: boolean;
  stoch: boolean;
  adx: boolean;
  atr: boolean;
  sar: boolean;
  volume: boolean;
  srLevels: boolean;
  fibonacci: boolean;
}

export interface IndicatorParameters {
  rsi: {
    period: number;
    oversold: number;
    overbought: number;
  };
  ema: {
    fast: number;
    slow: number;
  };
  sma: {
    fast: number;
    slow: number;
  };
  macd: {
    fast: number;
    slow: number;
    signal: number;
  };
  bb: {
    period: number;
    stddev: number;
  };
  stoch: {
    k: number;
    d: number;
    oversold: number;
    overbought: number;
  };
  adx: {
    period: number;
    threshold: number;
  };
  atr: {
    period: number;
    multiplierSL: number;
    multiplierTP: number;
  };
  sar: {
    step: number;
    max: number;
  };
  volume: {
    period: number;
  };
}

export interface OverlaySettings {
  showSRLines: boolean;
  showTPSLLines: boolean;
  showFibonacci: boolean;
  showSignalBadge: boolean;
  showBuySellMarkers: boolean;
  showVolumeProfile: boolean;
  opacity: number;
}

export interface SoundSettings {
  enabled: boolean;
  volume: number; // 0.1 to 1.0
  playOnBuy: boolean;
  playOnSell: boolean;
  playOnTP: boolean;
  playOnSL: boolean;
}

export interface ScannerSettings {
  enabled: boolean;
  intervalMinutes: number; // e.g. 2, 5, 15
  timeframe: Timeframe;
  minScoreThreshold: number; // e.g. 25
  watchlist: string[];
}

export interface UserSettings {
  apiKey?: string;
  apiSecret?: string;
  symbol: string;
  interval: Timeframe;
  candleLimit: number;
  updateInterval: number; // in seconds
  sound: SoundSettings;
  scanner: ScannerSettings;
  indicators: IndicatorToggles;
  indicatorParams: IndicatorParameters;
  overlay: OverlaySettings;
  priceAlerts: PriceAlert[];
  positions: TradePosition[];
}

export const DEFAULT_WATCHLIST = [
  'BTCUSDT',
  'ETHUSDT',
  'SOLUSDT',
  'BNBUSDT',
  'XRPUSDT',
  'DOGEUSDT',
  'ADAUSDT',
  'AVAXUSDT',
  'LINKUSDT',
  'NEARUSDT'
];

export const DEFAULT_SETTINGS: UserSettings = {
  apiKey: '',
  apiSecret: '',
  symbol: 'BTCUSDT',
  interval: '4h',
  candleLimit: 200,
  updateInterval: 5,
  sound: {
    enabled: true,
    volume: 0.7,
    playOnBuy: true,
    playOnSell: true,
    playOnTP: true,
    playOnSL: true
  },
  scanner: {
    enabled: true,
    intervalMinutes: 3,
    timeframe: '15m',
    minScoreThreshold: 25,
    watchlist: DEFAULT_WATCHLIST
  },
  indicators: {
    rsi: true,
    ema: true,
    sma: false,
    macd: true,
    bb: true,
    stoch: false,
    adx: true,
    atr: true,
    sar: false,
    volume: true,
    srLevels: true,
    fibonacci: true
  },
  indicatorParams: {
    rsi: { period: 14, oversold: 30, overbought: 70 },
    ema: { fast: 20, slow: 50 },
    sma: { fast: 20, slow: 50 },
    macd: { fast: 12, slow: 26, signal: 9 },
    bb: { period: 20, stddev: 2 },
    stoch: { k: 14, d: 3, oversold: 20, overbought: 80 },
    adx: { period: 14, threshold: 25 },
    atr: { period: 14, multiplierSL: 1.5, multiplierTP: 2.5 },
    sar: { step: 0.02, max: 0.2 },
    volume: { period: 20 }
  },
  overlay: {
    showSRLines: true,
    showTPSLLines: true,
    showFibonacci: true,
    showSignalBadge: true,
    showBuySellMarkers: true,
    showVolumeProfile: true,
    opacity: 0.85
  },
  priceAlerts: [],
  positions: []
};
