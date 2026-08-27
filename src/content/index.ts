import { ChartDetector } from './chartDetector';
import { OverlayRenderer } from './overlayRenderer';
import { FloatingPanel } from './floatingPanel';
import { AnalysisSummary } from '../types/signals';
import { UserSettings, DEFAULT_SETTINGS } from '../types/settings';
import { Timeframe } from '../types/binance';
import '../styles/content.css';

console.log('[Binance Signal Analyzer] Content script loaded.');

class ContentController {
  private overlay = new OverlayRenderer();
  private panel = new FloatingPanel();
  private currentSettings: UserSettings = DEFAULT_SETTINGS;
  private activeSymbol: string = 'BTCUSDT';
  private activeTimeframe: Timeframe = '4h';
  private updateTimer: number | null = null;

  public async start(): Promise<void> {
    // 1. Initial settings load
    await this.loadSettings();

    // 2. Detect initial symbol
    this.activeSymbol = ChartDetector.extractSymbol();
    this.activeTimeframe = this.currentSettings.interval || '4h';

    // 3. Initialize floating panel
    this.panel.init(
      (newInterval) => this.handleTimeframeChange(newInterval),
      () => this.fetchAndRefresh()
    );

    // 4. Initialize chart overlay with retry
    this.initOverlayWithRetry();

    // 5. Watch for URL / symbol change
    ChartDetector.onSymbolChange((newSymbol) => {
      console.log('[Content] Symbol changed to:', newSymbol);
      this.activeSymbol = newSymbol;
      this.fetchAndRefresh();
    });

    // 6. Start polling cycle
    this.startPolling();
  }

  private async loadSettings(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (response && response.success && response.data) {
        this.currentSettings = response.data;
        this.activeTimeframe = this.currentSettings.interval || '4h';
      }
    } catch (err) {
      console.warn('[Content] Could not load settings, using defaults:', err);
    }
  }

  private initOverlayWithRetry(): void {
    let attempts = 0;
    const maxAttempts = 15;

    const interval = setInterval(() => {
      attempts++;
      const success = this.overlay.init();
      if (success || attempts >= maxAttempts) {
        clearInterval(interval);
        if (success) {
          console.log('[Content] Overlay attached successfully.');
        }
      }
    }, 1000);
  }

  private async fetchAndRefresh(): Promise<void> {
    try {
      const res = await chrome.runtime.sendMessage({
        type: 'FETCH_ANALYSIS',
        payload: {
          symbol: this.activeSymbol,
          interval: this.activeTimeframe
        }
      });

      if (res && res.success && res.data) {
        const analysis: AnalysisSummary = res.data;
        this.panel.update(analysis, this.currentSettings);
        this.overlay.updateData(analysis, this.currentSettings);
      }
    } catch (err) {
      console.error('[Content] Analysis fetch failed:', err);
    }
  }

  private handleTimeframeChange(interval: Timeframe): void {
    this.activeTimeframe = interval;
    this.fetchAndRefresh();
  }

  private startPolling(): void {
    if (this.updateTimer) clearInterval(this.updateTimer);

    // Initial immediate fetch
    this.fetchAndRefresh();

    const intervalSec = this.currentSettings.updateInterval || 5;
    this.updateTimer = window.setInterval(() => {
      this.fetchAndRefresh();
    }, intervalSec * 1000);
  }
}

// Start once DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ContentController().start();
  });
} else {
  new ContentController().start();
}
