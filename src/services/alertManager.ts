import { StorageService } from './storage';
import { BinanceApiService } from './binanceApi';
import { SoundService } from './soundService';
import { PriceAlert, TradePosition, SoundType } from '../types/alerts';

export class AlertManager {
  /**
   * Check all active price alerts and trade positions against live market prices
   */
  public static async checkAlerts(): Promise<void> {
    const settings = await StorageService.getSettings();
    const alerts = settings.priceAlerts || [];
    const positions = settings.positions || [];

    const activeAlerts = alerts.filter((a) => !a.triggered);
    const activePositions = positions.filter((p) => p.status === 'ACTIVE');

    if (activeAlerts.length === 0 && activePositions.length === 0) return;

    // Collect all symbols that need price check
    const symbols = Array.from(
      new Set([
        ...activeAlerts.map((a) => a.symbol.toUpperCase()),
        ...activePositions.map((p) => p.symbol.toUpperCase())
      ])
    );

    let hasChanges = false;

    for (const symbol of symbols) {
      const ticker = await BinanceApiService.fetch24hrTicker(symbol);
      if (!ticker || !ticker.lastPrice) continue;
      const currentPrice = ticker.lastPrice;

      // 1. Evaluate Price Alerts
      for (const alert of activeAlerts.filter((a) => a.symbol.toUpperCase() === symbol)) {
        let isTriggered = false;
        if (alert.condition === 'ABOVE' && currentPrice >= alert.targetPrice) {
          isTriggered = true;
        } else if (alert.condition === 'BELOW' && currentPrice <= alert.targetPrice) {
          isTriggered = true;
        }

        if (isTriggered) {
          alert.triggered = true;
          hasChanges = true;

          const title = `🚨 Price Alert: ${alert.symbol}`;
          const message = `${alert.symbol} reached $${currentPrice.toLocaleString()} (Target: $${alert.targetPrice.toLocaleString()})${alert.note ? ` - ${alert.note}` : ''}`;
          const soundType: SoundType = alert.alertType === 'TP' ? 'TP_VICTORY' : alert.alertType === 'SL' ? 'SL_WARNING' : 'BUY_CHIME';

          this.triggerNotificationAndSound(title, message, soundType, settings.sound.volume);
        }
      }

      // 2. Evaluate Trade Positions (TP / SL)
      for (const pos of activePositions.filter((p) => p.symbol.toUpperCase() === symbol)) {
        const isLong = pos.side === 'LONG';

        // Check TP
        if (pos.takeProfit > 0) {
          const tpHit = isLong ? currentPrice >= pos.takeProfit : currentPrice <= pos.takeProfit;
          if (tpHit) {
            pos.status = 'CLOSED_TP';
            hasChanges = true;
            const title = `🎯 Take Profit Reached: ${pos.symbol}`;
            const message = `Target TP $${pos.takeProfit.toLocaleString()} hit at current price $${currentPrice.toLocaleString()}!`;
            this.triggerNotificationAndSound(title, message, 'TP_VICTORY', settings.sound.volume);
            continue;
          }
        }

        // Check SL
        if (pos.stopLoss > 0) {
          const slHit = isLong ? currentPrice <= pos.stopLoss : currentPrice >= pos.stopLoss;
          if (slHit) {
            pos.status = 'CLOSED_SL';
            hasChanges = true;
            const title = `🛑 Stop Loss Hit: ${pos.symbol}`;
            const message = `Stop Loss $${pos.stopLoss.toLocaleString()} triggered at current price $${currentPrice.toLocaleString()}!`;
            this.triggerNotificationAndSound(title, message, 'SL_WARNING', settings.sound.volume);
          }
        }
      }
    }

    if (hasChanges) {
      await StorageService.saveSettings({ priceAlerts: alerts, positions });
    }
  }

  /**
   * Add new custom price alert
   */
  public static async addPriceAlert(
    alertData: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered'>
  ): Promise<PriceAlert> {
    const settings = await StorageService.getSettings();
    const newAlert: PriceAlert = {
      ...alertData,
      id: 'alert_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      createdAt: Date.now(),
      triggered: false
    };

    const updatedAlerts = [...(settings.priceAlerts || []), newAlert];
    await StorageService.saveSettings({ priceAlerts: updatedAlerts });
    return newAlert;
  }

  /**
   * Delete price alert
   */
  public static async deletePriceAlert(id: string): Promise<void> {
    const settings = await StorageService.getSettings();
    const updated = (settings.priceAlerts || []).filter((a) => a.id !== id);
    await StorageService.saveSettings({ priceAlerts: updated });
  }

  /**
   * Create new Trade Position (Entry, TP, SL)
   */
  public static async createTradePosition(
    posData: Omit<TradePosition, 'id' | 'createdAt' | 'status'>
  ): Promise<TradePosition> {
    const settings = await StorageService.getSettings();
    const newPos: TradePosition = {
      ...posData,
      id: 'pos_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      createdAt: Date.now(),
      status: 'ACTIVE'
    };

    const updated = [...(settings.positions || []), newPos];
    await StorageService.saveSettings({ positions: updated });
    return newPos;
  }

  /**
   * Delete trade position
   */
  public static async deleteTradePosition(id: string): Promise<void> {
    const settings = await StorageService.getSettings();
    const updated = (settings.positions || []).filter((p) => p.id !== id);
    await StorageService.saveSettings({ positions: updated });
  }

  /**
   * Dispatch notification and audio alert
   */
  private static triggerNotificationAndSound(
    title: string,
    message: string,
    soundType: SoundType,
    volume: number
  ): void {
    // 1. Chrome Desktop Notification
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
    SoundService.play(soundType, volume);
  }
}
