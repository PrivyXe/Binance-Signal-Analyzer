export class ChartDetector {
  private static readonly SELECTORS = [
    '#chart-container',
    '.chart-container',
    '[class*="chart-container"]',
    '[class*="ChartContainer"]',
    '[id*="tradingview"]',
    '[class*="tradingview"]',
    '#tv_chart_container',
    '.tv-lightweight-charts'
  ];

  /**
   * Find TradingView / Binance chart container
   */
  public static findContainer(): HTMLElement | null {
    for (const selector of this.SELECTORS) {
      const el = document.querySelector<HTMLElement>(selector);
      if (el && el.getBoundingClientRect().width > 300) {
        return el;
      }
    }

    // Fallback: Find largest suitable canvas or container div
    const canvases = Array.from(document.querySelectorAll('canvas'));
    for (const canvas of canvases) {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 400 && rect.height > 250) {
        return (canvas.parentElement as HTMLElement) || canvas;
      }
    }

    return null;
  }

  /**
   * Extract current trading symbol from URL or Binance DOM
   */
  public static extractSymbol(): string {
    const path = window.location.pathname;

    // e.g. /en/trade/BTC_USDT or /en/futures/BTCUSDT
    const tradeMatch = path.match(/\/trade\/([A-Za-z0-9_]+)/);
    if (tradeMatch && tradeMatch[1]) {
      return tradeMatch[1].replace('_', '').toUpperCase();
    }

    const futuresMatch = path.match(/\/futures\/([A-Za-z0-9_]+)/);
    if (futuresMatch && futuresMatch[1]) {
      return futuresMatch[1].replace('_', '').toUpperCase();
    }

    // DOM Fallback
    const titleEl = document.querySelector('title');
    if (titleEl && titleEl.innerText) {
      const titleMatch = titleEl.innerText.match(/([A-Z0-9]{3,10}\/[A-Z0-9]{3,10}|[A-Z0-9]{5,12})/);
      if (titleMatch && titleMatch[1]) {
        return titleMatch[1].replace('/', '').replace('_', '').toUpperCase();
      }
    }

    return 'BTCUSDT';
  }

  /**
   * Observe DOM for route/symbol navigation
   */
  public static onSymbolChange(callback: (newSymbol: string) => void): () => void {
    let current = this.extractSymbol();

    const interval = setInterval(() => {
      const next = this.extractSymbol();
      if (next && next !== current) {
        current = next;
        callback(next);
      }
    }, 1500);

    return () => clearInterval(interval);
  }
}
