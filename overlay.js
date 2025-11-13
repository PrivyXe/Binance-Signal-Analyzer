// Overlay module for drawing signals on the chart
// This creates a transparent canvas layer above the TradingView chart

const ChartOverlay = {
  canvas: null,
  ctx: null,
  chartContainer: null,
  lastAnalysis: null,
  isInitialized: false,

  /**
   * Initialize the overlay canvas
   */
  init() {
    console.log('[Overlay] Initializing chart overlay...');
    
    // Find the chart container
    this.findChartContainer();
    
    if (!this.chartContainer) {
      console.warn('[Overlay] Chart container not found, will retry...');
      return false;
    }
    
    // Create canvas element
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'binance-signal-overlay';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'none'; // Don't block interactions
    this.canvas.style.zIndex = '9999';
    
    // Set canvas size to match container
    this.updateCanvasSize();
    
    // Get context
    this.ctx = this.canvas.getContext('2d');
    
    // Append to chart container
    this.chartContainer.style.position = 'relative';
    this.chartContainer.appendChild(this.canvas);
    
    // Listen for window resize
    window.addEventListener('resize', () => this.updateCanvasSize());
    
    // Start update loop
    this.startUpdateLoop();
    
    this.isInitialized = true;
    console.log('[Overlay] Chart overlay initialized successfully');
    return true;
  },

  /**
   * Find the TradingView chart container
   */
  findChartContainer() {
    // Try multiple selectors for Binance chart container
    const selectors = [
      '#chart-container',
      '.chart-container',
      '[class*="chart-container"]',
      '[class*="ChartContainer"]',
      '[id*="tradingview"]',
      '[class*="tradingview"]'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log('[Overlay] Found chart container:', selector);
        this.chartContainer = element;
        return;
      }
    }
    
    // Fallback: find largest div
    const allDivs = document.querySelectorAll('div');
    let largestDiv = null;
    let largestArea = 0;
    
    allDivs.forEach(div => {
      const rect = div.getBoundingClientRect();
      const area = rect.width * rect.height;
      if (area > largestArea && rect.width > 500 && rect.height > 300) {
        largestArea = area;
        largestDiv = div;
      }
    });
    
    if (largestDiv) {
      console.log('[Overlay] Using largest div as chart container');
      this.chartContainer = largestDiv;
    }
  },

  /**
   * Update canvas size to match container
   */
  updateCanvasSize() {
    if (!this.chartContainer || !this.canvas) return;
    
    const rect = this.chartContainer.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    
    // Redraw after resize
    this.draw();
  },

  /**
   * Start the update loop
   */
  startUpdateLoop() {
    setInterval(() => {
      this.fetchAnalysisAndDraw();
    }, 1000); // Update every second
  },

  /**
   * Fetch analysis from storage and draw
   */
  async fetchAnalysisAndDraw() {
    try {
      const result = await chrome.storage.local.get(['latestAnalysis']);
      if (result.latestAnalysis) {
        this.lastAnalysis = result.latestAnalysis;
        this.draw();
      }
    } catch (error) {
      console.error('[Overlay] Error fetching analysis:', error);
    }
  },

  /**
   * Clear canvas
   */
  clear() {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  },

  /**
   * Draw signals on canvas
   */
  draw() {
    if (!this.isInitialized || !this.ctx || !this.lastAnalysis) return;
    
    this.clear();
    
    const analysis = this.lastAnalysis;
    
    // Always draw trend indicator
    this.drawTrendIndicator(analysis.trend, analysis.signal);
    
    // Draw info box with current data
    this.drawInfoBox(analysis);
    
    // Draw signals
    if (analysis.signals && analysis.signals.length > 0) {
      analysis.signals.forEach(signal => {
        this.drawSignalArrow(signal);
      });
    } else if (analysis.signal && analysis.signal !== 'HOLD') {
      // Draw main signal even if no weak signals
      this.drawMainSignal(analysis.signal, analysis.currentPrice);
    }
  },

  /**
   * Draw buy/sell signal arrow
   * @param {Object} signal - Signal object {type, price, time, index}
   * @param {number} customX - Optional custom X position
   * @param {number} customY - Optional custom Y position
   */
  drawSignalArrow(signal, customX = null, customY = null) {
    if (!this.canvas) return;
    
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Position calculation
    const x = customX !== null ? customX : width * 0.85;
    const y = customY !== null ? customY : height * 0.7;
    
    const isBuy = signal.type === 'BUY';
    const color = isBuy ? '#00ff88' : '#ff4444';
    const arrowSize = 30;
    
    this.ctx.save();
    
    // Glow effect
    this.ctx.shadowBlur = 20;
    this.ctx.shadowColor = color;
    
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 3;
    
    // Draw arrow
    this.ctx.beginPath();
    if (isBuy) {
      // Up arrow for BUY
      this.ctx.moveTo(x, y - arrowSize);
      this.ctx.lineTo(x - arrowSize / 2, y);
      this.ctx.lineTo(x - arrowSize / 4, y);
      this.ctx.lineTo(x - arrowSize / 4, y + arrowSize);
      this.ctx.lineTo(x + arrowSize / 4, y + arrowSize);
      this.ctx.lineTo(x + arrowSize / 4, y);
      this.ctx.lineTo(x + arrowSize / 2, y);
    } else {
      // Down arrow for SELL
      this.ctx.moveTo(x, y + arrowSize);
      this.ctx.lineTo(x - arrowSize / 2, y);
      this.ctx.lineTo(x - arrowSize / 4, y);
      this.ctx.lineTo(x - arrowSize / 4, y - arrowSize);
      this.ctx.lineTo(x + arrowSize / 4, y - arrowSize);
      this.ctx.lineTo(x + arrowSize / 4, y);
      this.ctx.lineTo(x + arrowSize / 2, y);
    }
    this.ctx.closePath();
    this.ctx.fill();
    
    // Reset shadow for text
    this.ctx.shadowBlur = 0;
    
    // Draw label with background
    this.ctx.font = 'bold 16px Arial';
    const text = signal.type;
    const textWidth = this.ctx.measureText(text).width;
    const textX = x - textWidth / 2;
    const textY = isBuy ? y + arrowSize + 25 : y - arrowSize - 10;
    
    // Text background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(textX - 5, textY - 15, textWidth + 10, 20);
    
    // Text
    this.ctx.fillStyle = '#ffffff';
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.strokeText(text, textX, textY);
    this.ctx.fillText(text, textX, textY);
    
    // Draw price if available
    if (signal.price) {
      this.ctx.font = '11px Arial';
      const priceText = `$${signal.price.toFixed(2)}`;
      const priceX = x - this.ctx.measureText(priceText).width / 2;
      const priceY = textY + 15;
      this.ctx.fillStyle = '#a0a0c0';
      this.ctx.fillText(priceText, priceX, priceY);
    }
    
    this.ctx.restore();
  },

  /**
   * Draw trend indicator in top-right corner
   * @param {string} trend - 'bullish', 'bearish', or 'neutral'
   * @param {string} signal - 'BUY', 'SELL', or 'HOLD'
   */
  drawTrendIndicator(trend, signal) {
    if (!this.canvas) return;
    
    const padding = 12;
    const x = this.canvas.width - 140;
    const y = 30;
    
    let trendColor, trendText, signalColor;
    switch (trend) {
      case 'bullish':
        trendColor = '#00ff88';
        trendText = '↑ BULLISH';
        break;
      case 'bearish':
        trendColor = '#ff4444';
        trendText = '↓ BEARISH';
        break;
      default:
        trendColor = '#ffcc00';
        trendText = '→ NEUTRAL';
    }
    
    switch (signal) {
      case 'BUY':
        signalColor = '#00ff88';
        break;
      case 'SELL':
        signalColor = '#ff4444';
        break;
      default:
        signalColor = '#888888';
    }
    
    this.ctx.save();
    
    // Draw background with border
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    this.ctx.strokeStyle = trendColor;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.roundRect(x - padding, y - 20, 130, 50, 8);
    this.ctx.fill();
    this.ctx.stroke();
    
    // Draw trend text
    this.ctx.font = 'bold 14px Arial';
    this.ctx.fillStyle = trendColor;
    this.ctx.fillText(trendText, x, y);
    
    // Draw signal text
    this.ctx.font = 'bold 16px Arial';
    this.ctx.fillStyle = signalColor;
    this.ctx.fillText(signal || 'HOLD', x, y + 20);
    
    this.ctx.restore();
  },

  /**
   * Draw info box with key indicators
   * @param {Object} analysis - Analysis data
   */
  drawInfoBox(analysis) {
    if (!this.canvas) return;
    
    const padding = 10;
    const x = 20;
    const y = 30;
    const lineHeight = 18;
    
    this.ctx.save();
    
    // Draw background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    this.ctx.beginPath();
    this.ctx.roundRect(x - padding, y - 15, 160, 80, 8);
    this.ctx.fill();
    
    // Draw text
    this.ctx.font = '12px Arial';
    this.ctx.fillStyle = '#ffffff';
    
    let currentY = y;
    
    // Symbol and Price
    this.ctx.fillStyle = '#60a5fa';
    this.ctx.font = 'bold 13px Arial';
    this.ctx.fillText(`${analysis.symbol} ${analysis.interval}`, x, currentY);
    currentY += lineHeight;
    
    this.ctx.font = '12px Arial';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(`$${analysis.currentPrice?.toFixed(2) || 'N/A'}`, x, currentY);
    currentY += lineHeight;
    
    // RSI
    if (analysis.indicators?.rsi) {
      const rsi = parseFloat(analysis.indicators.rsi);
      this.ctx.fillStyle = rsi < 30 ? '#00ff88' : rsi > 70 ? '#ff4444' : '#ffffff';
      this.ctx.fillText(`RSI: ${rsi.toFixed(1)}`, x, currentY);
      currentY += lineHeight;
    }
    
    // Volume indicator if available
    if (analysis.indicators?.volumeSMA) {
      this.ctx.fillStyle = '#a0a0c0';
      this.ctx.fillText(`Vol: ${parseFloat(analysis.indicators.volumeSMA).toFixed(0)}`, x, currentY);
    }
    
    this.ctx.restore();
  },

  /**
   * Draw main signal (when no detailed signals but main signal exists)
   * @param {string} signal - 'BUY' or 'SELL'
   * @param {number} price - Current price
   */
  drawMainSignal(signal, price) {
    if (!this.canvas) return;
    
    const x = this.canvas.width / 2;
    const y = this.canvas.height - 100;
    
    this.drawSignalArrow({ type: signal, price: price }, x, y);
  },

  /**
   * Destroy overlay
   */
  destroy() {
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.canvas = null;
    this.ctx = null;
    this.isInitialized = false;
  }
};

// Make it available globally
if (typeof window !== 'undefined') {
  window.ChartOverlay = ChartOverlay;
}

