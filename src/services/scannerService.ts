import { StorageService } from './storage';
import { BinanceApiService } from './binanceApi';
import { SignalEngine } from './signalEngine';
import { SoundService } from './soundService';
import { ScreenerCoinResult, SoundType } from '../types/alerts';

export class ScannerService {
  private static latestResults: ScreenerCoinResult[] = [];
  private static lastAlertedSignals: Map<string, { signal: string; timestamp: number }> = new Map();
  private static isScanning: boolean = false;

  /**
   * Run full market scan across watchlist coins
   */
  public static async scanMarket(): Promise<ScreenerCoinResult[]> {
    if (this.isScanning) return this.latestResults;
    this.isScanning = true;

    try {
      const settings = await StorageService.getSettings();
      if (!settings.scanner.enabled) return this.latestResults;

      const watchlist = settings.scanner.watchlist && settings.scanner.watchlist.length > 0
        ? settings.scanner.watchlist
        : ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT'];

      const timeframe = settings.scanner.timeframe || '15m';
      const results: ScreenerCoinResult[] = [];

      // Scan coins with batch limit of 4 to prevent rate limiting
      const batchSize = 4;
      for (let i = 0; i < watchlist.length; i += batchSize) {
        const batch = watchlist.slice(i, i + batchSize);
        const batchPromises = batch.map(async (symbol) => {
          try {
            const cleanSymbol = symbol.trim().toUpperCase();
            const [candles, orderBook, ticker24h] = await Promise.all([
              BinanceApiService.fetchKlines(cleanSymbol, timeframe, 120),
              BinanceApiService.fetchOrderBook(cleanSymbol, 50),
              BinanceApiService.fetch24hrTicker(cleanSymbol)
            ]);

            if (!candles || candles.length < 30) return null;

            const analysis = SignalEngine.analyze(
              cleanSymbol,
              timeframe,
              candles,
              orderBook,
              settings,
              ticker24h?.priceChangePercent
            );

            return {
              symbol: cleanSymbol,
              timeframe,
              price: analysis.currentPrice,
              priceChange24h: ticker24h?.priceChangePercent || 0,
              signal: analysis.signal,
              compositeScore: analysis.compositeScore,
              rsiValue: analysis.indicators.rsi?.value ?? null,
              macdTrend: analysis.indicators.macd?.trend ?? 'NEUTRAL',
              timestamp: Date.now()
            } as ScreenerCoinResult;
          } catch (err) {
            console.warn(`[Scanner] Error scanning ${symbol}:`, err);
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach((res) => {
          if (res) results.push(res);
        });
      }

      this.latestResults = results;

      // Evaluate new signals for alerts
      await this.evaluateSignals(results, settings);

      return results;
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Get latest cached screener results
   */
  public static getLatestResults(): ScreenerCoinResult[] {
    return this.latestResults;
  }

  /**
   * Evaluate detected signals and fire notifications/sounds
   */
  private static async evaluateSignals(
    results: ScreenerCoinResult[],
    settings: any
  ): Promise<void> {
    const now = Date.now();
    const cooldownMs = 15 * 60 * 1000; // 15 min cooldown per coin signal

    for (const item of results) {
      const isBuy = item.signal === 'STRONG_BUY' || item.signal === 'BUY';
      const isSell = item.signal === 'STRONG_SELL' || item.signal === 'SELL';

      if (!isBuy && !isSell) continue;

      const lastAlert = this.lastAlertedSignals.get(item.symbol);
      if (lastAlert && lastAlert.signal === item.signal && now - lastAlert.timestamp < cooldownMs) {
        continue; // Already alerted recently
      }

      // Check user sound & score thresholds
      if (Math.abs(item.compositeScore) < (settings.scanner.minScoreThreshold || 20)) {
        continue;
      }

      this.lastAlertedSignals.set(item.symbol, { signal: item.signal, timestamp: now });

      const title = isBuy ? `🚀 BUY Signal Detected: ${item.symbol}` : `🔻 SELL Signal Detected: ${item.symbol}`;
      const message = `${item.symbol} (${item.timeframe}) Score: ${item.compositeScore > 0 ? '+' : ''}${item.compositeScore} | RSI: ${item.rsiValue ?? 'N/A'} | Price: $${item.price.toLocaleString()}`;
      const soundType: SoundType = isBuy ? 'BUY_CHIME' : 'SELL_CHIME';

      if (isBuy && !settings.sound.playOnBuy) continue;
      if (isSell && !settings.sound.playOnSell) continue;

      // 1. Chrome Notification
      if (chrome.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title,
          message,
          priority: 2
        });
      }

      // 2. Play Audio Chime
      SoundService.play(soundType, settings.sound.volume);
    }
  }
}
