import { StorageService } from '../services/storage';
import { BinanceApiService } from '../services/binanceApi';
import { SignalEngine } from '../services/signalEngine';
import { AlertManager } from '../services/alertManager';
import { ScannerService } from '../services/scannerService';
import { SoundService } from '../services/soundService';
import { ExtensionAction, MessageResponse } from '../types/messages';
import { AnalysisSummary } from '../types/signals';

console.log('[Binance Signal Analyzer Pro] Background service worker initialized.');

// Cache for recent analyses
const analysisCache = new Map<string, { data: AnalysisSummary; expiry: number }>();
const CACHE_TTL_MS = 4000; // 4 seconds

/**
 * Handle analysis request
 */
async function handleFetchAnalysis(
  symbol?: string,
  interval?: any
): Promise<AnalysisSummary> {
  const settings = await StorageService.getSettings();
  const targetSymbol = symbol || settings.symbol || 'BTCUSDT';
  const targetInterval = interval || settings.interval || '4h';
  const cacheKey = `${targetSymbol}_${targetInterval}`;

  const cached = analysisCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const isFutures = targetSymbol.includes('_') || targetSymbol.endsWith('PERP');

  // Concurrent data fetching
  const [candles, orderBook, ticker24h] = await Promise.all([
    BinanceApiService.fetchKlines(
      targetSymbol,
      targetInterval,
      settings.candleLimit || 200,
      isFutures
    ),
    BinanceApiService.fetchOrderBook(targetSymbol, 100, isFutures),
    BinanceApiService.fetch24hrTicker(targetSymbol, isFutures)
  ]);

  if (!candles || candles.length === 0) {
    throw new Error(`Failed to fetch candle data for ${targetSymbol}`);
  }

  const analysis = SignalEngine.analyze(
    targetSymbol,
    targetInterval,
    candles,
    orderBook,
    settings,
    ticker24h?.priceChangePercent
  );

  updateBadge(analysis.signal);

  analysisCache.set(cacheKey, {
    data: analysis,
    expiry: Date.now() + CACHE_TTL_MS
  });

  return analysis;
}

/**
 * Update Chrome extension badge with signal status
 */
function updateBadge(signal: string) {
  let text = '';
  let color = '#6b7280';

  if (signal === 'STRONG_BUY' || signal === 'BUY') {
    text = signal === 'STRONG_BUY' ? 'BUY+' : 'BUY';
    color = '#10b981';
  } else if (signal === 'STRONG_SELL' || signal === 'SELL') {
    text = signal === 'STRONG_SELL' ? 'SELL+' : 'SELL';
    color = '#ef4444';
  } else {
    text = 'HOLD';
    color = '#6b7280';
  }

  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

// Runtime message listener
chrome.runtime.onMessage.addListener(
  (
    message: ExtensionAction,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse<any>) => void
  ) => {
    (async () => {
      try {
        switch (message.type) {
          case 'FETCH_ANALYSIS': {
            const data = await handleFetchAnalysis(
              message.payload?.symbol,
              message.payload?.interval
            );
            sendResponse({ success: true, data });
            break;
          }

          case 'GET_SETTINGS': {
            const settings = await StorageService.getSettings();
            sendResponse({ success: true, data: settings });
            break;
          }

          case 'SAVE_SETTINGS': {
            const updated = await StorageService.saveSettings(message.payload);
            sendResponse({ success: true, data: updated });
            break;
          }

          case 'RESET_SETTINGS': {
            const reset = await StorageService.resetSettings();
            sendResponse({ success: true, data: reset });
            break;
          }

          case 'GET_SCREENER_RESULTS': {
            const results = ScannerService.getLatestResults();
            sendResponse({ success: true, data: results });
            break;
          }

          case 'TRIGGER_SCAN': {
            const results = await ScannerService.scanMarket();
            sendResponse({ success: true, data: results });
            break;
          }

          case 'GET_ALERTS': {
            const settings = await StorageService.getSettings();
            sendResponse({
              success: true,
              data: {
                priceAlerts: settings.priceAlerts || [],
                positions: settings.positions || []
              }
            });
            break;
          }

          case 'ADD_PRICE_ALERT': {
            const alert = await AlertManager.addPriceAlert(message.payload);
            sendResponse({ success: true, data: alert });
            break;
          }

          case 'DELETE_PRICE_ALERT': {
            await AlertManager.deletePriceAlert(message.payload.id);
            sendResponse({ success: true });
            break;
          }

          case 'CREATE_TRADE_POSITION': {
            const position = await AlertManager.createTradePosition(message.payload);
            sendResponse({ success: true, data: position });
            break;
          }

          case 'DELETE_TRADE_POSITION': {
            await AlertManager.deleteTradePosition(message.payload.id);
            sendResponse({ success: true });
            break;
          }

          case 'PLAY_SOUND': {
            const settings = await StorageService.getSettings();
            SoundService.play(message.payload.soundType, settings.sound.volume);
            sendResponse({ success: true });
            break;
          }

          default:
            sendResponse({ success: false, error: 'Unknown message action' });
            break;
        }
      } catch (err: any) {
        console.error('[Background Error]', err);
        sendResponse({ success: false, error: err.message || 'Internal error' });
      }
    })();

    return true;
  }
);

// Setup background alarms for Screener & Price Alerts
chrome.alarms.create('check_price_alerts', { periodInMinutes: 0.5 }); // every 30s
chrome.alarms.create('scan_market_coins', { periodInMinutes: 3 }); // every 3 mins
chrome.alarms.create('cleanup_cache', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'check_price_alerts') {
    await AlertManager.checkAlerts();
  } else if (alarm.name === 'scan_market_coins') {
    await ScannerService.scanMarket();
  } else if (alarm.name === 'cleanup_cache') {
    const now = Date.now();
    for (const [key, item] of analysisCache.entries()) {
      if (item.expiry < now) {
        analysisCache.delete(key);
      }
    }
  }
});

// Run initial scan & alert check on startup
setTimeout(() => {
  ScannerService.scanMarket().catch((e) => console.warn('Initial scan warning:', e));
  AlertManager.checkAlerts().catch((e) => console.warn('Initial alert check warning:', e));
}, 3000);
