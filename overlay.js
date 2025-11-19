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
    
    // Draw Fibonacci levels (bottom layer)
    this.drawFibonacci(analysis);
    
    // Draw support and resistance levels
    this.drawSupportResistance(analysis);
    
    // Draw volume profile (right side)
    this.drawVolumeProfile(analysis);
    
    // Draw TP/SL lines
    this.drawTPSLLines(analysis);
    
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
    
    // Calculate box height based on content
    let boxHeight = 80;
    if (analysis.recommendations?.action && analysis.recommendations.action !== 'HOLD') {
      boxHeight += 40;
    }
    
    // Draw background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    this.ctx.beginPath();
    this.ctx.roundRect(x - padding, y - 15, 180, boxHeight, 8);
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
    
    // Recommendations
    if (analysis.recommendations?.action && analysis.recommendations.action !== 'HOLD') {
      const rec = analysis.recommendations;
      const actionColor = rec.action === 'LONG' ? '#00ff88' : rec.action === 'SHORT' ? '#ff4444' : '#fbbf24';
      
      this.ctx.fillStyle = actionColor;
      this.ctx.font = 'bold 12px Arial';
      this.ctx.fillText(`${rec.action} ${rec.leverage}x`, x, currentY);
      currentY += lineHeight;
      
      if (rec.takeProfit && rec.stopLoss) {
        this.ctx.font = '11px Arial';
        this.ctx.fillStyle = '#00ff88';
        this.ctx.fillText(`TP: $${rec.takeProfit.toFixed(2)}`, x, currentY);
        currentY += lineHeight;
        
        this.ctx.fillStyle = '#ff4444';
        this.ctx.fillText(`SL: $${rec.stopLoss.toFixed(2)}`, x, currentY);
      }
    }
    
    this.ctx.restore();
  },
  
  /**
   * Draw Fibonacci retracement and extension levels
   * @param {Object} analysis - Analysis data
   */
  drawFibonacci(analysis) {
    if (!this.canvas || !analysis.fibonacci) return;
    
    const fib = analysis.fibonacci;
    if (!fib.retracement) return;
    
    const width = this.canvas.width;
    const height = this.canvas.height;
    const currentPrice = analysis.currentPrice;
    
    // Price to Y mapping
    const priceRange = currentPrice * 0.15;
    const highPrice = currentPrice + priceRange / 2;
    const lowPrice = currentPrice - priceRange / 2;
    const priceToY = (price) => {
      const ratio = (highPrice - price) / (highPrice - lowPrice);
      return height * 0.15 + (height * 0.7) * ratio;
    };
    
    this.ctx.save();
    
    // Fibonacci retracement levels
    const retracementLevels = [
      { level: '0%', price: fib.retracement.level_0, color: 'rgba(255, 0, 0, 0.5)' },
      { level: '23.6%', price: fib.retracement.level_236, color: 'rgba(255, 100, 0, 0.4)' },
      { level: '38.2%', price: fib.retracement.level_382, color: 'rgba(255, 200, 0, 0.4)' },
      { level: '50%', price: fib.retracement.level_500, color: 'rgba(0, 255, 0, 0.5)' },
      { level: '61.8%', price: fib.retracement.level_618, color: 'rgba(0, 200, 255, 0.4)' },
      { level: '78.6%', price: fib.retracement.level_786, color: 'rgba(100, 0, 255, 0.4)' },
      { level: '100%', price: fib.retracement.level_100, color: 'rgba(0, 0, 255, 0.5)' }
    ];
    
    // Draw retracement levels
    retracementLevels.forEach(levelData => {
      const y = priceToY(levelData.price);
      if (y > height * 0.1 && y < height * 0.9) {
        this.ctx.strokeStyle = levelData.color;
        this.ctx.lineWidth = 1.5;
        this.ctx.setLineDash([8, 4]);
        
        this.ctx.beginPath();
        this.ctx.moveTo(width * 0.05, y);
        this.ctx.lineTo(width * 0.75, y);
        this.ctx.stroke();
        
        // Label
        this.ctx.setLineDash([]);
        this.ctx.font = 'bold 10px Arial';
        this.ctx.fillStyle = levelData.color.replace('0.4', '0.9').replace('0.5', '0.9');
        this.ctx.fillText(`Fib ${levelData.level}: $${levelData.price.toFixed(2)}`, width * 0.76, y + 4);
      }
    });
    
    // Draw extension levels if in trend
    if (fib.extension) {
      const extensionLevels = [
        { level: '127.2%', price: fib.extension.level_1272, color: 'rgba(255, 165, 0, 0.4)' },
        { level: '161.8%', price: fib.extension.level_1618, color: 'rgba(255, 215, 0, 0.5)' },
        { level: '200%', price: fib.extension.level_2000, color: 'rgba(255, 255, 0, 0.4)' },
        { level: '261.8%', price: fib.extension.level_2618, color: 'rgba(144, 238, 144, 0.4)' }
      ];
      
      extensionLevels.forEach(levelData => {
        const y = priceToY(levelData.price);
        if (y > height * 0.1 && y < height * 0.9) {
          this.ctx.strokeStyle = levelData.color;
          this.ctx.lineWidth = 1;
          this.ctx.setLineDash([4, 4]);
          
          this.ctx.beginPath();
          this.ctx.moveTo(width * 0.05, y);
          this.ctx.lineTo(width * 0.75, y);
          this.ctx.stroke();
          
          // Label
          this.ctx.setLineDash([]);
          this.ctx.font = '9px Arial';
          this.ctx.fillStyle = levelData.color.replace('0.4', '0.9').replace('0.5', '0.9');
          this.ctx.fillText(`Ext ${levelData.level}: $${levelData.price.toFixed(2)}`, width * 0.76, y + 3);
        }
      });
    }
    
    this.ctx.restore();
  },

  /**
   * Draw support and resistance levels
   * @param {Object} analysis - Analysis data
   */
  drawSupportResistance(analysis) {
    if (!this.canvas || !analysis.supportResistance) return;
    
    const { support, resistance } = analysis.supportResistance;
    if (!support && !resistance) return;
    
    const currentPrice = analysis.currentPrice;
    if (!currentPrice) return;
    
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Calculate price to Y mapping
    const priceRange = currentPrice * 0.15; // 15% range
    const highPrice = currentPrice + priceRange / 2;
    const lowPrice = currentPrice - priceRange / 2;
    const priceToY = (price) => {
      const ratio = (highPrice - price) / (highPrice - lowPrice);
      return height * 0.15 + (height * 0.7) * ratio;
    };
    
    this.ctx.save();
    
    // Draw resistance levels (red)
    if (resistance && resistance.length > 0) {
      resistance.forEach((level, index) => {
        const y = priceToY(level.price);
        if (y > 0 && y < height) {
          // Line thickness based on strength
          const lineWidth = Math.min(1 + level.strength * 0.5, 4);
          const alpha = Math.min(0.3 + level.strength * 0.1, 0.8);
          
          this.ctx.strokeStyle = `rgba(255, 68, 68, ${alpha})`;
          this.ctx.lineWidth = lineWidth;
          this.ctx.setLineDash([10, 5]);
          
          this.ctx.beginPath();
          this.ctx.moveTo(width * 0.1, y);
          this.ctx.lineTo(width * 0.9, y);
          this.ctx.stroke();
          
          // Label
          this.ctx.setLineDash([]);
          this.ctx.font = '10px Arial';
          this.ctx.fillStyle = '#ff4444';
          this.ctx.fillText(`R${index + 1}: $${level.price.toFixed(2)} (${level.touches})`, width * 0.91, y + 4);
        }
      });
    }
    
    // Draw support levels (green)
    if (support && support.length > 0) {
      support.forEach((level, index) => {
        const y = priceToY(level.price);
        if (y > 0 && y < height) {
          const lineWidth = Math.min(1 + level.strength * 0.5, 4);
          const alpha = Math.min(0.3 + level.strength * 0.1, 0.8);
          
          this.ctx.strokeStyle = `rgba(0, 255, 136, ${alpha})`;
          this.ctx.lineWidth = lineWidth;
          this.ctx.setLineDash([10, 5]);
          
          this.ctx.beginPath();
          this.ctx.moveTo(width * 0.1, y);
          this.ctx.lineTo(width * 0.9, y);
          this.ctx.stroke();
          
          // Label
          this.ctx.setLineDash([]);
          this.ctx.font = '10px Arial';
          this.ctx.fillStyle = '#00ff88';
          this.ctx.fillText(`S${index + 1}: $${level.price.toFixed(2)} (${level.touches})`, width * 0.91, y + 4);
        }
      });
    }
    
    this.ctx.restore();
  },
  
  /**
   * Draw volume profile on the right side
   * @param {Object} analysis - Analysis data
   */
  drawVolumeProfile(analysis) {
    if (!this.canvas || !analysis.volumeProfile) return;
    
    const vp = analysis.volumeProfile;
    if (!vp.profile || vp.profile.length === 0) return;
    
    const currentPrice = analysis.currentPrice;
    if (!currentPrice) return;
    
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Volume profile area (right side)
    const vpX = width * 0.88;
    const vpWidth = width * 0.1;
    
    // Price range
    const priceRange = currentPrice * 0.15;
    const highPrice = currentPrice + priceRange / 2;
    const lowPrice = currentPrice - priceRange / 2;
    const priceToY = (price) => {
      const ratio = (highPrice - price) / (highPrice - lowPrice);
      return height * 0.15 + (height * 0.7) * ratio;
    };
    
    this.ctx.save();
    
    // Find max volume for scaling
    const maxVolume = Math.max(...vp.profile.map(p => p.volume));
    
    // Draw volume bars
    vp.profile.forEach(bin => {
      const y = priceToY(bin.priceLevel);
      if (y > height * 0.15 && y < height * 0.85) {
        const barWidth = (bin.volume / maxVolume) * vpWidth;
        
        // Color based on if it's POC or value area
        let color = 'rgba(100, 100, 200, 0.3)';
        if (Math.abs(bin.priceLevel - vp.poc) < (priceRange * 0.01)) {
          color = 'rgba(255, 204, 0, 0.6)'; // POC in yellow
        } else if (bin.priceLevel >= vp.val && bin.priceLevel <= vp.vah) {
          color = 'rgba(100, 150, 255, 0.4)'; // Value area in blue
        }
        
        this.ctx.fillStyle = color;
        this.ctx.fillRect(vpX, y - 2, barWidth, 4);
      }
    });
    
    // Draw POC line (Point of Control)
    const pocY = priceToY(vp.poc);
    if (pocY > 0 && pocY < height) {
      this.ctx.strokeStyle = '#ffcc00';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 3]);
      
      this.ctx.beginPath();
      this.ctx.moveTo(width * 0.1, pocY);
      this.ctx.lineTo(width * 0.87, pocY);
      this.ctx.stroke();
      
      // POC Label
      this.ctx.setLineDash([]);
      this.ctx.font = 'bold 10px Arial';
      this.ctx.fillStyle = '#ffcc00';
      this.ctx.fillText(`POC: $${vp.poc.toFixed(2)}`, width * 0.02, pocY - 5);
    }
    
    // Draw VAH and VAL lines
    if (vp.vah && vp.val) {
      this.ctx.strokeStyle = 'rgba(100, 150, 255, 0.5)';
      this.ctx.lineWidth = 1;
      this.ctx.setLineDash([3, 3]);
      
      const vahY = priceToY(vp.vah);
      const valY = priceToY(vp.val);
      
      if (vahY > 0 && vahY < height) {
        this.ctx.beginPath();
        this.ctx.moveTo(width * 0.1, vahY);
        this.ctx.lineTo(width * 0.87, vahY);
        this.ctx.stroke();
        
        this.ctx.font = '9px Arial';
        this.ctx.fillStyle = '#60a5fa';
        this.ctx.fillText(`VAH: $${vp.vah.toFixed(2)}`, width * 0.02, vahY - 5);
      }
      
      if (valY > 0 && valY < height) {
        this.ctx.beginPath();
        this.ctx.moveTo(width * 0.1, valY);
        this.ctx.lineTo(width * 0.87, valY);
        this.ctx.stroke();
        
        this.ctx.font = '9px Arial';
        this.ctx.fillStyle = '#60a5fa';
        this.ctx.fillText(`VAL: $${vp.val.toFixed(2)}`, width * 0.02, valY + 12);
      }
    }
    
    this.ctx.restore();
  },

  /**
   * Draw TP and SL lines on chart
   * @param {Object} analysis - Analysis data
   */
  drawTPSLLines(analysis) {
    if (!this.canvas || !analysis.recommendations) return;
    
    const rec = analysis.recommendations;
    if (!rec.takeProfit && !rec.stopLoss) return;
    
    const currentPrice = analysis.currentPrice;
    if (!currentPrice) return;
    
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Calculate approximate price to pixel mapping
    // This is a simple approximation - in a real chart, you'd need the actual price scale
    const priceRange = currentPrice * 0.1; // Assume 10% range visible
    const highPrice = currentPrice + priceRange / 2;
    const lowPrice = currentPrice - priceRange / 2;
    const priceToY = (price) => {
      const ratio = (highPrice - price) / (highPrice - lowPrice);
      return height * 0.2 + (height * 0.6) * ratio;
    };
    
    this.ctx.save();
    this.ctx.setLineDash([5, 5]);
    this.ctx.lineWidth = 2;
    
    // Draw Take Profit line
    if (rec.takeProfit) {
      const tpY = priceToY(rec.takeProfit);
      if (tpY > 0 && tpY < height) {
        this.ctx.strokeStyle = '#00ff88';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#00ff88';
        
        this.ctx.beginPath();
        this.ctx.moveTo(width * 0.15, tpY);
        this.ctx.lineTo(width * 0.85, tpY);
        this.ctx.stroke();
        
        // Label
        this.ctx.shadowBlur = 0;
        this.ctx.font = 'bold 11px Arial';
        this.ctx.fillStyle = '#00ff88';
        this.ctx.fillText(`TP: $${rec.takeProfit.toFixed(2)}`, width * 0.86, tpY + 4);
      }
    }
    
    // Draw Stop Loss line
    if (rec.stopLoss) {
      const slY = priceToY(rec.stopLoss);
      if (slY > 0 && slY < height) {
        this.ctx.strokeStyle = '#ff4444';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#ff4444';
        
        this.ctx.beginPath();
        this.ctx.moveTo(width * 0.15, slY);
        this.ctx.lineTo(width * 0.85, slY);
        this.ctx.stroke();
        
        // Label
        this.ctx.shadowBlur = 0;
        this.ctx.font = 'bold 11px Arial';
        this.ctx.fillStyle = '#ff4444';
        this.ctx.fillText(`SL: $${rec.stopLoss.toFixed(2)}`, width * 0.86, slY + 4);
      }
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

