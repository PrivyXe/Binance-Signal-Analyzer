import { UserSettings, DEFAULT_SETTINGS } from '../types/settings';
import { Timeframe } from '../types/binance';
import { SoundService } from '../services/soundService';

async function loadOptions(): Promise<void> {
  const res = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
  const settings: UserSettings = res?.success && res.data ? res.data : DEFAULT_SETTINGS;

  // General
  const symbolEl = document.getElementById('cfg-symbol') as HTMLInputElement;
  const intervalEl = document.getElementById('cfg-interval') as HTMLSelectElement;
  const updateEl = document.getElementById('cfg-update-interval') as HTMLInputElement;
  const limitEl = document.getElementById('cfg-candle-limit') as HTMLInputElement;

  if (symbolEl) symbolEl.value = settings.symbol;
  if (intervalEl) intervalEl.value = settings.interval;
  if (updateEl) updateEl.value = String(settings.updateInterval);
  if (limitEl) limitEl.value = String(settings.candleLimit);

  // Screener
  setCheck('cfg-scanner-enable', settings.scanner.enabled);
  setVal('cfg-scanner-interval', settings.scanner.intervalMinutes);
  const watchlistEl = document.getElementById('cfg-watchlist') as HTMLTextAreaElement;
  if (watchlistEl) {
    watchlistEl.value = (settings.scanner.watchlist || []).join(', ');
  }

  // Sound
  setCheck('cfg-sound-master', settings.sound.enabled);
  setVal('cfg-sound-vol', settings.sound.volume);
  setCheck('cfg-sound-buy', settings.sound.playOnBuy);
  setCheck('cfg-sound-sell', settings.sound.playOnSell);
  setCheck('cfg-sound-tp', settings.sound.playOnTP);
  setCheck('cfg-sound-sl', settings.sound.playOnSL);

  // Indicators
  setCheck('ind-rsi', settings.indicators.rsi);
  setCheck('ind-ema', settings.indicators.ema);
  setCheck('ind-macd', settings.indicators.macd);
  setCheck('ind-bb', settings.indicators.bb);
  setCheck('ind-adx', settings.indicators.adx);
  setCheck('ind-stoch', settings.indicators.stoch);
  setCheck('ind-sar', settings.indicators.sar);
  setCheck('ind-volume', settings.indicators.volume);
  setCheck('ind-sr', settings.indicators.srLevels);
  setCheck('ind-fib', settings.indicators.fibonacci);

  // Params
  const p = settings.indicatorParams;
  setVal('param-rsi-period', p.rsi.period);
  setVal('param-rsi-os', p.rsi.oversold);
  setVal('param-rsi-ob', p.rsi.overbought);

  setVal('param-ema-fast', p.ema.fast);
  setVal('param-ema-slow', p.ema.slow);

  setVal('param-macd-fast', p.macd.fast);
  setVal('param-macd-slow', p.macd.slow);
  setVal('param-macd-signal', p.macd.signal);

  setVal('param-atr-period', p.atr.period);
  setVal('param-atr-sl', p.atr.multiplierSL);
  setVal('param-atr-tp', p.atr.multiplierTP);

  // Overlay
  setCheck('ov-sr', settings.overlay.showSRLines);
  setCheck('ov-tpsl', settings.overlay.showTPSLLines);
  setCheck('ov-markers', settings.overlay.showBuySellMarkers !== false);
  setCheck('ov-badge', settings.overlay.showSignalBadge);
}

async function saveOptions(): Promise<void> {
  const watchlistText = (document.getElementById('cfg-watchlist') as HTMLTextAreaElement)?.value || '';
  const parsedWatchlist = watchlistText
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s.length > 0);

  const updatedSettings: Partial<UserSettings> = {
    symbol: (document.getElementById('cfg-symbol') as HTMLInputElement)?.value.toUpperCase() || 'BTCUSDT',
    interval: ((document.getElementById('cfg-interval') as HTMLSelectElement)?.value || '4h') as Timeframe,
    updateInterval: Number((document.getElementById('cfg-update-interval') as HTMLInputElement)?.value || 5),
    candleLimit: Number((document.getElementById('cfg-candle-limit') as HTMLInputElement)?.value || 200),
    scanner: {
      enabled: getCheck('cfg-scanner-enable'),
      intervalMinutes: Number(getVal('cfg-scanner-interval', 3)),
      timeframe: '15m',
      minScoreThreshold: 25,
      watchlist: parsedWatchlist.length > 0 ? parsedWatchlist : DEFAULT_SETTINGS.scanner.watchlist
    },
    sound: {
      enabled: getCheck('cfg-sound-master'),
      volume: Number(getVal('cfg-sound-vol', 0.7)),
      playOnBuy: getCheck('cfg-sound-buy'),
      playOnSell: getCheck('cfg-sound-sell'),
      playOnTP: getCheck('cfg-sound-tp'),
      playOnSL: getCheck('cfg-sound-sl')
    },
    indicators: {
      rsi: getCheck('ind-rsi'),
      ema: getCheck('ind-ema'),
      sma: false,
      macd: getCheck('ind-macd'),
      bb: getCheck('ind-bb'),
      adx: getCheck('ind-adx'),
      stoch: getCheck('ind-stoch'),
      sar: getCheck('ind-sar'),
      volume: getCheck('ind-volume'),
      srLevels: getCheck('ind-sr'),
      fibonacci: getCheck('ind-fib'),
      atr: true
    },
    indicatorParams: {
      rsi: {
        period: Number(getVal('param-rsi-period', 14)),
        oversold: Number(getVal('param-rsi-os', 30)),
        overbought: Number(getVal('param-rsi-ob', 70))
      },
      ema: {
        fast: Number(getVal('param-ema-fast', 20)),
        slow: Number(getVal('param-ema-slow', 50))
      },
      sma: { fast: 20, slow: 50 },
      macd: {
        fast: Number(getVal('param-macd-fast', 12)),
        slow: Number(getVal('param-macd-slow', 26)),
        signal: Number(getVal('param-macd-signal', 9))
      },
      bb: { period: 20, stddev: 2 },
      stoch: { k: 14, d: 3, oversold: 20, overbought: 80 },
      adx: { period: 14, threshold: 25 },
      atr: {
        period: Number(getVal('param-atr-period', 14)),
        multiplierSL: Number(getVal('param-atr-sl', 1.5)),
        multiplierTP: Number(getVal('param-atr-tp', 2.5))
      },
      sar: { step: 0.02, max: 0.2 },
      volume: { period: 20 }
    },
    overlay: {
      showSRLines: getCheck('ov-sr'),
      showTPSLLines: getCheck('ov-tpsl'),
      showFibonacci: true,
      showBuySellMarkers: getCheck('ov-markers'),
      showSignalBadge: getCheck('ov-badge'),
      showVolumeProfile: true,
      opacity: 0.85
    }
  };

  const res = await chrome.runtime.sendMessage({
    type: 'SAVE_SETTINGS',
    payload: updatedSettings
  });

  if (res?.success) {
    showToast('Settings saved successfully!');
  }
}

async function resetOptions(): Promise<void> {
  if (confirm('Are you sure you want to reset all settings to factory defaults?')) {
    await chrome.runtime.sendMessage({ type: 'RESET_SETTINGS' });
    await loadOptions();
    showToast('Settings reset to default values.');
  }
}

function showToast(msg: string): void {
  const toast = document.getElementById('status-toast');
  if (toast) {
    toast.innerText = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }
}

function getCheck(id: string): boolean {
  return (document.getElementById(id) as HTMLInputElement)?.checked ?? false;
}

function setCheck(id: string, val: boolean): void {
  const el = document.getElementById(id) as HTMLInputElement;
  if (el) el.checked = val;
}

function getVal(id: string, fallback: number): number {
  const val = (document.getElementById(id) as HTMLInputElement)?.value;
  return val ? parseFloat(val) : fallback;
}

function setVal(id: string, val: number): void {
  const el = document.getElementById(id) as HTMLInputElement;
  if (el) el.value = String(val);
}

document.addEventListener('DOMContentLoaded', () => {
  loadOptions();

  document.getElementById('btn-save-top')?.addEventListener('click', saveOptions);
  document.getElementById('btn-save-bottom')?.addEventListener('click', saveOptions);
  document.getElementById('btn-reset')?.addEventListener('click', resetOptions);

  // Sound test triggers
  document.getElementById('test-sound-buy')?.addEventListener('click', () => {
    SoundService.play('BUY_CHIME', 0.8);
  });
  document.getElementById('test-sound-sell')?.addEventListener('click', () => {
    SoundService.play('SELL_CHIME', 0.8);
  });
  document.getElementById('test-sound-tp')?.addEventListener('click', () => {
    SoundService.play('TP_VICTORY', 0.8);
  });
  document.getElementById('test-sound-sl')?.addEventListener('click', () => {
    SoundService.play('SL_WARNING', 0.8);
  });
});
