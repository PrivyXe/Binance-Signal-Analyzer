import { AnalysisSummary } from '../types/signals';
import { UserSettings } from '../types/settings';
import { Timeframe } from '../types/binance';

export class FloatingPanel {
  private panelElement: HTMLElement | null = null;
  private isMinimized = false;
  private onTimeframeChangeCallback?: (interval: Timeframe) => void;
  private onRefreshCallback?: () => void;
  private lastAnalysis: AnalysisSummary | null = null;

  public init(
    onTimeframeChange: (interval: Timeframe) => void,
    onRefresh: () => void
  ): void {
    this.onTimeframeChangeCallback = onTimeframeChange;
    this.onRefreshCallback = onRefresh;

    if (document.getElementById('bsa-floating-panel')) return;

    this.panelElement = document.createElement('div');
    this.panelElement.id = 'bsa-floating-panel';
    this.panelElement.className = 'bsa-panel';

    this.panelElement.innerHTML = `
      <div class="bsa-header" id="bsa-header">
        <div class="bsa-header-title">
          <span class="bsa-logo-icon">📊</span>
          <span class="bsa-title-text">Signal Analyzer</span>
          <span class="bsa-badge-pro">PRO</span>
        </div>
        <div class="bsa-header-actions">
          <button class="bsa-btn-icon" id="bsa-btn-min" title="Minimize / Expand">−</button>
          <button class="bsa-btn-icon" id="bsa-btn-close" title="Close">×</button>
        </div>
      </div>

      <div class="bsa-body" id="bsa-body">
        <!-- Top Market Bar -->
        <div class="bsa-market-bar">
          <div class="bsa-market-info">
            <span class="bsa-symbol-text" id="bsa-symbol">BTCUSDT</span>
            <span class="bsa-price-text" id="bsa-price">$0.00</span>
          </div>
          <div class="bsa-timeframe-wrap">
            <select class="bsa-select-timeframe" id="bsa-timeframe">
              <option value="1m">1m</option>
              <option value="3m">3m</option>
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="30m">30m</option>
              <option value="1h">1h</option>
              <option value="2h">2h</option>
              <option value="4h" selected>4h</option>
              <option value="6h">6h</option>
              <option value="12h">12h</option>
              <option value="1d">1D</option>
              <option value="1w">1W</option>
            </select>
          </div>
        </div>

        <!-- Signal Summary Hero -->
        <div class="bsa-signal-hero" id="bsa-signal-hero">
          <div class="bsa-signal-label">COMPOSITE SIGNAL & TREND</div>
          <div class="bsa-signal-pill bsa-neutral" id="bsa-signal-pill">LOADING...</div>
          <div class="bsa-score-bar-wrap">
            <div class="bsa-score-bar" id="bsa-score-bar" style="width: 50%;"></div>
          </div>
          <div class="bsa-score-info">
            <span id="bsa-trend-text">Trend: --</span>
            <span id="bsa-confidence-text">Confidence: --</span>
          </div>
        </div>

        <!-- Trade Recommendation Box -->
        <div class="bsa-card" id="bsa-rec-card">
          <div class="bsa-card-title-row">
            <span class="bsa-card-title">🎯 TRADE & RISK PLAN</span>
            <button class="bsa-btn-mini" id="bsa-btn-set-alert" title="Set TP/SL Audio & Desktop Alerts">🔔 Set Alert</button>
          </div>
          <div class="bsa-grid-2">
            <div class="bsa-stat-box">
              <span class="bsa-stat-name">Entry</span>
              <span class="bsa-stat-val" id="bsa-rec-entry">-</span>
            </div>
            <div class="bsa-stat-box">
              <span class="bsa-stat-name">Stop Loss (SL)</span>
              <span class="bsa-stat-val text-red" id="bsa-rec-sl">-</span>
            </div>
            <div class="bsa-stat-box">
              <span class="bsa-stat-name">Target 1 (TP1)</span>
              <span class="bsa-stat-val text-green" id="bsa-rec-tp1">-</span>
            </div>
            <div class="bsa-stat-box">
              <span class="bsa-stat-name">Target 2 (TP2)</span>
              <span class="bsa-stat-val text-green" id="bsa-rec-tp2">-</span>
            </div>
          </div>
          <div class="bsa-stat-row">
            <span>Suggested Leverage: <strong id="bsa-rec-lev">1x</strong></span>
            <span>R:R Ratio: <strong id="bsa-rec-rr">1:1</strong></span>
          </div>
        </div>

        <!-- Indicators Overview -->
        <div class="bsa-card">
          <div class="bsa-card-title">📈 TECHNICAL INDICATORS</div>
          <div class="bsa-indicators-list" id="bsa-indicators-list">
            <!-- Populated dynamically -->
          </div>
        </div>

        <!-- Orderbook Depth & Pressure -->
        <div class="bsa-card" id="bsa-orderbook-card">
          <div class="bsa-card-title">📖 ORDER BOOK DEPTH PRESSURE</div>
          <div class="bsa-depth-meter">
            <div class="bsa-depth-bid" id="bsa-depth-bid" style="width: 50%;">Bids</div>
            <div class="bsa-depth-ask" id="bsa-depth-ask" style="width: 50%;">Asks</div>
          </div>
          <div class="bsa-depth-details">
            <span id="bsa-bidask-ratio">B/A Ratio: 1.0</span>
            <span id="bsa-depth-pressure">Neutral</span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="bsa-footer">
          <button class="bsa-btn bsa-btn-primary" id="bsa-btn-refresh">🔄 Refresh</button>
          <button class="bsa-btn bsa-btn-secondary" id="bsa-btn-options">⚙️ Settings</button>
        </div>

        <div class="bsa-author-tag">
          <span>By <strong>PrivyXe</strong> (𝕏 @PrivyXe)</span>
        </div>
      </div>
    `;

    document.body.appendChild(this.panelElement);
    this.setupEvents();
    this.makeDraggable();
  }

  private setupEvents(): void {
    const minBtn = document.getElementById('bsa-btn-min');
    const closeBtn = document.getElementById('bsa-btn-close');
    const tfSelect = document.getElementById('bsa-timeframe') as HTMLSelectElement;
    const refreshBtn = document.getElementById('bsa-btn-refresh');
    const optionsBtn = document.getElementById('bsa-btn-options');
    const setAlertBtn = document.getElementById('bsa-btn-set-alert');
    const body = document.getElementById('bsa-body');

    minBtn?.addEventListener('click', () => {
      this.isMinimized = !this.isMinimized;
      if (body) body.style.display = this.isMinimized ? 'none' : 'block';
      if (minBtn) minBtn.innerText = this.isMinimized ? '+' : '−';
    });

    closeBtn?.addEventListener('click', () => {
      if (this.panelElement) this.panelElement.style.display = 'none';
    });

    tfSelect?.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value as Timeframe;
      if (this.onTimeframeChangeCallback) this.onTimeframeChangeCallback(val);
    });

    refreshBtn?.addEventListener('click', () => {
      if (this.onRefreshCallback) this.onRefreshCallback();
    });

    optionsBtn?.addEventListener('click', () => {
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      }
    });

    setAlertBtn?.addEventListener('click', async () => {
      if (!this.lastAnalysis) return;
      const { symbol, recommendation, currentPrice } = this.lastAnalysis;

      const isLong = recommendation.type === 'LONG';
      const side = isLong ? 'LONG' : 'SHORT';

      try {
        await chrome.runtime.sendMessage({
          type: 'CREATE_TRADE_POSITION',
          payload: {
            symbol,
            side,
            entryPrice: recommendation.entryPrice || currentPrice,
            takeProfit: recommendation.takeProfit1,
            stopLoss: recommendation.stopLoss
          }
        });

        if (setAlertBtn) {
          setAlertBtn.innerText = '✅ Alert Active';
          setAlertBtn.style.background = '#10b981';
          setTimeout(() => {
            if (setAlertBtn) {
              setAlertBtn.innerText = '🔔 Set Alert';
              setAlertBtn.style.background = '';
            }
          }, 3000);
        }
      } catch (err) {
        console.error('Failed to set alert:', err);
      }
    });
  }

  private makeDraggable(): void {
    const header = document.getElementById('bsa-header');
    if (!header || !this.panelElement) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    header.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).tagName === 'BUTTON') return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = this.panelElement!.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      document.body.style.userSelect = 'none';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging || !this.panelElement) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      this.panelElement.style.left = `${Math.max(10, initialLeft + dx)}px`;
      this.panelElement.style.top = `${Math.max(10, initialTop + dy)}px`;
      this.panelElement.style.right = 'auto';
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
      document.body.style.userSelect = 'auto';
    });
  }

  public update(analysis: AnalysisSummary, _settings: UserSettings): void {
    this.lastAnalysis = analysis;
    if (!this.panelElement) return;

    // Header values
    const symbolEl = document.getElementById('bsa-symbol');
    const priceEl = document.getElementById('bsa-price');
    if (symbolEl) symbolEl.innerText = analysis.symbol;
    if (priceEl) {
      priceEl.innerText = `$${analysis.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    }

    // Timeframe select sync
    const tfSelect = document.getElementById('bsa-timeframe') as HTMLSelectElement;
    if (tfSelect && tfSelect.value !== analysis.timeframe) {
      tfSelect.value = analysis.timeframe;
    }

    // Signal pill
    const pill = document.getElementById('bsa-signal-pill');
    if (pill) {
      pill.className = `bsa-signal-pill bsa-signal-${analysis.signal.toLowerCase().replace('_', '-')}`;
      pill.innerText = analysis.signal.replace('_', ' ');
    }

    // Score bar & info
    const scoreBar = document.getElementById('bsa-score-bar');
    if (scoreBar) {
      const normalized = (analysis.compositeScore + 100) / 2; // 0 to 100%
      scoreBar.style.width = `${normalized}%`;
      scoreBar.style.backgroundColor =
        analysis.compositeScore > 0 ? '#10b981' : analysis.compositeScore < 0 ? '#ef4444' : '#6b7280';
    }

    const trendText = document.getElementById('bsa-trend-text');
    if (trendText) trendText.innerText = `Trend: ${analysis.trend}`;

    const confText = document.getElementById('bsa-confidence-text');
    if (confText) confText.innerText = `Confidence: ${analysis.confidence}`;

    // Recommendations
    const rec = analysis.recommendation;
    const entryEl = document.getElementById('bsa-rec-entry');
    const slEl = document.getElementById('bsa-rec-sl');
    const tp1El = document.getElementById('bsa-rec-tp1');
    const tp2El = document.getElementById('bsa-rec-tp2');
    const levEl = document.getElementById('bsa-rec-lev');
    const rrEl = document.getElementById('bsa-rec-rr');

    if (entryEl) entryEl.innerText = `$${rec.entryPrice.toLocaleString()}`;
    if (slEl) slEl.innerText = `$${rec.stopLoss.toLocaleString()}`;
    if (tp1El) tp1El.innerText = `$${rec.takeProfit1.toLocaleString()}`;
    if (tp2El) tp2El.innerText = `$${rec.takeProfit2.toLocaleString()}`;
    if (levEl) levEl.innerText = `${rec.suggestedLeverage}x`;
    if (rrEl) rrEl.innerText = `1:${rec.riskRewardRatio}`;

    // Indicators list
    const listEl = document.getElementById('bsa-indicators-list');
    if (listEl) {
      const items: string[] = [];
      const inds = analysis.indicators;

      if (inds.rsi && inds.rsi.value !== null) {
        items.push(`
          <div class="bsa-ind-item">
            <span>RSI (14): <strong>${inds.rsi.value}</strong></span>
            <span class="bsa-pill-mini bsa-pill-${inds.rsi.state.toLowerCase()}">${inds.rsi.state}</span>
          </div>
        `);
      }

      if (inds.ema && inds.ema.fast !== null) {
        items.push(`
          <div class="bsa-ind-item">
            <span>EMA (${inds.ema.fast}/${inds.ema.slow}): <strong>${inds.ema.trend}</strong></span>
            <span class="bsa-pill-mini ${inds.ema.crossover !== 'NONE' ? 'bsa-pill-gold' : ''}">${inds.ema.crossover}</span>
          </div>
        `);
      }

      if (inds.macd && inds.macd.macd !== null) {
        items.push(`
          <div class="bsa-ind-item">
            <span>MACD Hist: <strong>${inds.macd.histogram}</strong></span>
            <span class="bsa-pill-mini bsa-pill-${inds.macd.trend.toLowerCase()}">${inds.macd.trend}</span>
          </div>
        `);
      }

      if (inds.bb && inds.bb.middle !== null) {
        items.push(`
          <div class="bsa-ind-item">
            <span>Bollinger %B: <strong>${inds.bb.percentB}</strong></span>
            <span class="bsa-pill-mini ${inds.bb.isSqueezed ? 'bsa-pill-squeeze' : ''}">${inds.bb.isSqueezed ? 'SQUEEZE' : inds.bb.position}</span>
          </div>
        `);
      }

      if (inds.adx && inds.adx.adx !== null) {
        items.push(`
          <div class="bsa-ind-item">
            <span>ADX: <strong>${inds.adx.adx}</strong> (${inds.adx.trendStrength})</span>
            <span class="bsa-pill-mini">${inds.adx.trendDirection}</span>
          </div>
        `);
      }

      listEl.innerHTML = items.join('');
    }

    // Orderbook depth
    const ob = analysis.orderBook;
    if (ob) {
      const bidEl = document.getElementById('bsa-depth-bid');
      const askEl = document.getElementById('bsa-depth-ask');
      const ratioEl = document.getElementById('bsa-bidask-ratio');
      const pressureEl = document.getElementById('bsa-depth-pressure');

      const totalVol = ob.totalBidVolume + ob.totalAskVolume;
      const bidPercent = totalVol > 0 ? (ob.totalBidVolume / totalVol) * 100 : 50;

      if (bidEl) bidEl.style.width = `${bidPercent}%`;
      if (askEl) askEl.style.width = `${100 - bidPercent}%`;
      if (ratioEl) ratioEl.innerText = `B/A Ratio: ${ob.bidAskRatio}`;
      if (pressureEl) {
        pressureEl.innerText = ob.pressure.replace('_', ' ');
        pressureEl.className =
          ob.pressure === 'BUY_PRESSURE' ? 'text-green' : ob.pressure === 'SELL_PRESSURE' ? 'text-red' : '';
      }
    }
  }
}
