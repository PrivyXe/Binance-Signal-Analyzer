import { AnalysisSummary } from '../types/signals';
import { UserSettings } from '../types/settings';
import { ChartDetector } from './chartDetector';

export class OverlayRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private container: HTMLElement | null = null;
  private currentAnalysis: AnalysisSummary | null = null;
  private settings: UserSettings | null = null;
  private animationFrameId: number | null = null;

  public init(): boolean {
    this.container = ChartDetector.findContainer();
    if (!this.container) return false;

    // Remove existing overlay
    const oldCanvas = document.getElementById('bsa-chart-overlay');
    if (oldCanvas) oldCanvas.remove();

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'bsa-chart-overlay';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '20';

    this.ctx = this.canvas.getContext('2d');

    const containerStyle = window.getComputedStyle(this.container);
    if (containerStyle.position === 'static') {
      this.container.style.position = 'relative';
    }

    this.container.appendChild(this.canvas);
    this.handleResize();

    window.addEventListener('resize', () => this.handleResize());
    return true;
  }

  public updateData(analysis: AnalysisSummary, settings: UserSettings): void {
    this.currentAnalysis = analysis;
    this.settings = settings;
    this.render();
  }

  private handleResize(): void {
    if (!this.canvas || !this.container) return;
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    if (this.ctx) {
      this.ctx.resetTransform();
      this.ctx.scale(dpr, dpr);
    }

    this.render();
  }

  public render(): void {
    if (!this.canvas || !this.ctx || !this.container || !this.currentAnalysis) return;
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);

    this.animationFrameId = requestAnimationFrame(() => {
      if (!this.ctx || !this.canvas || !this.container || !this.currentAnalysis) return;

      const rect = this.container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      this.ctx.clearRect(0, 0, width, height);

      const overlayConfig = this.settings?.overlay;
      if (!overlayConfig) return;

      const { currentPrice, recommendation, srLevels, signal } = this.currentAnalysis;

      // Extract price scale from SR levels + current price + TP/SL
      const keyPrices = [
        currentPrice,
        recommendation.stopLoss,
        recommendation.takeProfit1,
        recommendation.takeProfit2,
        ...srLevels.map((s) => s.price)
      ].filter((p) => p && p > 0);

      if (keyPrices.length === 0) return;

      // Calculate realistic price range with padding
      const minVal = Math.min(...keyPrices);
      const maxVal = Math.max(...keyPrices);
      const spread = maxVal - minVal;
      const margin = spread > 0 ? spread * 0.25 : currentPrice * 0.05;

      const scaleMin = minVal - margin;
      const scaleMax = maxVal + margin;
      const priceRange = scaleMax - scaleMin;

      if (priceRange <= 0) return;

      // Price chart area: Top 15% is Binance toolbar, Bottom 25% is Volume pane
      const topOffset = height * 0.12;
      const bottomOffset = height * 0.28;
      const usableHeight = height - topOffset - bottomOffset;

      const priceToY = (price: number) => {
        const normalized = (price - scaleMin) / priceRange;
        return topOffset + usableHeight * (1 - normalized);
      };

      // 1. Draw Support & Resistance Lines with clean right tags
      if (overlayConfig.showSRLines && srLevels.length > 0) {
        srLevels.forEach((level) => {
          const y = priceToY(level.price);
          if (y < topOffset || y > height - bottomOffset) return; // Keep inside chart area

          const isSupport = level.type === 'SUPPORT';
          const color = isSupport ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)';

          this.drawLineWithTag(
            y,
            width,
            color,
            `${level.label} $${level.price.toLocaleString()}`,
            isSupport ? '#065f46' : '#991b1b',
            [3, 3]
          );
        });
      }

      // 2. Draw TP/SL Lines with distinct dash
      if (overlayConfig.showTPSLLines && recommendation.type !== 'HOLD') {
        // Stop Loss
        if (recommendation.stopLoss > 0) {
          const slY = priceToY(recommendation.stopLoss);
          if (slY >= topOffset && slY <= height - bottomOffset) {
            this.drawLineWithTag(
              slY,
              width,
              'rgba(239, 68, 68, 0.85)',
              `🛑 SL $${recommendation.stopLoss.toLocaleString()}`,
              '#ef4444',
              [5, 4]
            );
          }
        }

        // Take Profit 1
        if (recommendation.takeProfit1 > 0) {
          const tp1Y = priceToY(recommendation.takeProfit1);
          if (tp1Y >= topOffset && tp1Y <= height - bottomOffset) {
            this.drawLineWithTag(
              tp1Y,
              width,
              'rgba(16, 185, 129, 0.85)',
              `🎯 TP1 $${recommendation.takeProfit1.toLocaleString()}`,
              '#10b981',
              [5, 4]
            );
          }
        }
      }

      // 3. Draw Top-Left Mini HUD Signal Badge (Does NOT block Binance OHLC toolbar)
      if (overlayConfig.showSignalBadge) {
        this.drawCleanSignalHUD(signal, currentPrice, topOffset);
      }
    });
  }

  private drawLineWithTag(
    y: number,
    width: number,
    color: string,
    label: string,
    badgeBg: string,
    lineDash: number[] = []
  ): void {
    if (!this.ctx) return;

    this.ctx.save();
    this.ctx.setLineDash(lineDash);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1.2;

    // Draw line across chart up to the right axis
    this.ctx.beginPath();
    this.ctx.moveTo(30, y);
    this.ctx.lineTo(width - 85, y);
    this.ctx.stroke();

    // Right-edge pill
    this.ctx.setLineDash([]);
    this.ctx.fillStyle = badgeBg;
    const tagW = 95;
    const tagH = 16;
    const tagX = width - tagW - 8;
    const tagY = y - tagH / 2;

    this.ctx.beginPath();
    this.ctx.roundRect(tagX, tagY, tagW, tagH, 3);
    this.ctx.fill();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 9px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(label, tagX + tagW / 2, y);

    this.ctx.restore();
  }

  /**
   * Draw sleek, non-intrusive HUD badge on the top-left area under the toolbar
   */
  private drawCleanSignalHUD(signal: string, _price: number, topOffset: number): void {
    if (!this.ctx) return;

    this.ctx.save();
    const isBull = signal === 'STRONG_BUY' || signal === 'BUY';
    const isBear = signal === 'STRONG_SELL' || signal === 'SELL';

    const bg = isBull
      ? 'rgba(6, 78, 59, 0.85)'
      : isBear
      ? 'rgba(127, 29, 29, 0.85)'
      : 'rgba(30, 41, 59, 0.85)';
    const borderColor = isBull ? '#10b981' : isBear ? '#ef4444' : '#64748b';
    const text = isBull ? `🚀 SIGNAL: ${signal}` : isBear ? `🔻 SIGNAL: ${signal}` : `⚖️ SIGNAL: ${signal}`;

    const hudW = 140;
    const hudH = 24;
    const hudX = 14;
    const hudY = topOffset + 8; // positioned cleanly below Binance OHLC row

    // Glass backdrop
    this.ctx.fillStyle = bg;
    this.ctx.strokeStyle = borderColor;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.roundRect(hudX, hudY, hudW, hudH, 6);
    this.ctx.fill();
    this.ctx.stroke();

    // Text
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 10px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, hudX + hudW / 2, hudY + hudH / 2);

    this.ctx.restore();
  }
}
