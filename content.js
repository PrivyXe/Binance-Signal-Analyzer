// Content script - Injected into Binance pages
console.log('[Binance Signal Analyzer] Content script loaded');

// Global state
let floatingPanel = null;
let updateInterval = null;

/**
 * Initialize the extension on the page
 */
function initialize() {
  console.log('[Content] Initializing extension...');
  
  // Wait for page to be fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
    return;
  }
  
  // Create floating panel
  createFloatingPanel();
  
  // Initialize chart overlay with retry mechanism
  let retryCount = 0;
  const maxRetries = 10;
  
  const tryInitOverlay = () => {
    if (window.ChartOverlay && window.ChartOverlay.init()) {
      console.log('[Content] Chart overlay initialized');
      clearInterval(retryInterval);
    } else {
      retryCount++;
      if (retryCount >= maxRetries) {
        console.error('[Content] Failed to initialize overlay after', maxRetries, 'attempts');
        clearInterval(retryInterval);
      }
    }
  };
  
  const retryInterval = setInterval(tryInitOverlay, 1000);
  tryInitOverlay();
  
  // Start update loop for floating panel
  startUpdateLoop();
  
  // Observe DOM changes for chart reloads
  observeChartChanges();
}

/**
 * Create floating panel UI
 */
function createFloatingPanel() {
  if (floatingPanel) return;
  
  floatingPanel = document.createElement('div');
  floatingPanel.id = 'binance-signal-panel';
  floatingPanel.className = 'signal-panel';
  
  floatingPanel.innerHTML = `
    <div class="panel-header">
      <span class="panel-title">📊 Signal Analyzer</span>
      <button class="panel-minimize" title="Minimize">−</button>
      <button class="panel-close" title="Close">×</button>
    </div>
    <div class="panel-content">
      <div class="panel-section">
        <div class="panel-label">Symbol:</div>
        <div class="panel-value" id="panel-symbol">Loading...</div>
      </div>
      <div class="panel-section">
        <div class="panel-label">Timeframe:</div>
        <select class="panel-select" id="panel-timeframe">
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
          <option value="1d">1d</option>
          <option value="1w">1w</option>
        </select>
      </div>
      <div class="panel-section">
        <div class="panel-label">Price:</div>
        <div class="panel-value" id="panel-price">-</div>
      </div>
      <div class="panel-section">
        <div class="panel-label">Trend:</div>
        <div class="panel-value" id="panel-trend">-</div>
      </div>
      
      <!-- Dynamic indicators container -->
      <div id="indicators-container"></div>
      
      <div class="panel-section signal-section">
        <div class="panel-label">Signal:</div>
        <div class="panel-value signal-value" id="panel-signal">HOLD</div>
      </div>
      
      <!-- Trading Recommendations -->
      <div id="recommendations-container"></div>
      
      <!-- Order Book Info -->
      <div id="orderbook-container"></div>
      
      <div class="panel-footer">
        <button class="refresh-btn" id="refresh-btn">🔄 Refresh</button>
        <button class="settings-btn" id="settings-btn">⚙️ Settings</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(floatingPanel);
  
  // Add event listeners
  setupPanelEvents();
  
  console.log('[Content] Floating panel created');
}

/**
 * Setup event listeners for panel
 */
function setupPanelEvents() {
  // Minimize button
  const minimizeBtn = floatingPanel.querySelector('.panel-minimize');
  const content = floatingPanel.querySelector('.panel-content');
  
  minimizeBtn.addEventListener('click', () => {
    content.style.display = content.style.display === 'none' ? 'block' : 'none';
    minimizeBtn.textContent = content.style.display === 'none' ? '+' : '−';
  });
  
  // Close button
  const closeBtn = floatingPanel.querySelector('.panel-close');
  closeBtn.addEventListener('click', () => {
    floatingPanel.style.display = 'none';
  });
  
  // Refresh button
  const refreshBtn = floatingPanel.querySelector('#refresh-btn');
  refreshBtn.addEventListener('click', () => {
    refreshBtn.textContent = '⏳';
    refreshBtn.disabled = true;
    
    chrome.runtime.sendMessage({ action: 'forceUpdate' }, (response) => {
      if (response) {
        updatePanelData(response);
      }
      refreshBtn.textContent = '🔄 Refresh';
      refreshBtn.disabled = false;
    });
  });
  
  // Settings button
  const settingsBtn = floatingPanel.querySelector('#settings-btn');
  settingsBtn.addEventListener('click', () => {
    // Content script can't use openOptionsPage directly
    // Send message to background to open it
    chrome.runtime.sendMessage({ action: 'openOptions' });
  });
  
  // Timeframe selector
  const timeframeSelect = floatingPanel.querySelector('#panel-timeframe');
  timeframeSelect.addEventListener('change', async () => {
    const newInterval = timeframeSelect.value;
    
    // Update settings
    const result = await chrome.storage.local.get(['settings']);
    const settings = result.settings || {};
    settings.interval = newInterval;
    
    await chrome.storage.local.set({ settings: settings });
    
    // Notify background to update
    chrome.runtime.sendMessage({ action: 'settingsUpdated' });
    
    // Visual feedback
    timeframeSelect.style.background = 'rgba(16, 185, 129, 0.3)';
    setTimeout(() => {
      timeframeSelect.style.background = '';
    }, 500);
  });
  
  // Make panel draggable
  makeDraggable(floatingPanel);
}

/**
 * Make element draggable
 */
function makeDraggable(element) {
  const header = element.querySelector('.panel-header');
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = 0;
  let yOffset = 0;
  
  header.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);
  
  function dragStart(e) {
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;
    
    if (e.target === header || e.target.classList.contains('panel-title')) {
      isDragging = true;
    }
  }
  
  function drag(e) {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      xOffset = currentX;
      yOffset = currentY;
      
      element.style.transform = `translate(${currentX}px, ${currentY}px)`;
    }
  }
  
  function dragEnd() {
    isDragging = false;
  }
}

/**
 * Start update loop for panel data
 */
function startUpdateLoop() {
  // Update immediately
  updatePanel();
  
  // Update every 2 seconds
  updateInterval = setInterval(updatePanel, 2000);
}

/**
 * Update panel with latest analysis
 */
async function updatePanel() {
  try {
    const result = await chrome.storage.local.get(['latestAnalysis']);
    if (result.latestAnalysis) {
      updatePanelData(result.latestAnalysis);
    }
  } catch (error) {
    console.error('[Content] Error updating panel:', error);
  }
}

/**
 * Update panel DOM with analysis data
 */
function updatePanelData(analysis) {
  if (!analysis) return;
  
  // Update symbol
  document.getElementById('panel-symbol').textContent = analysis.symbol || 'N/A';
  
  // Update timeframe selector
  const timeframeSelect = document.getElementById('panel-timeframe');
  if (timeframeSelect && analysis.interval) {
    timeframeSelect.value = analysis.interval;
  }
  
  // Update price
  const priceEl = document.getElementById('panel-price');
  priceEl.textContent = analysis.currentPrice ? `$${analysis.currentPrice.toFixed(2)}` : 'N/A';
  
  // Update trend
  const trendEl = document.getElementById('panel-trend');
  trendEl.textContent = analysis.trend ? analysis.trend.toUpperCase() : 'N/A';
  trendEl.className = 'panel-value trend-' + (analysis.trend || 'neutral');
  
  // Update dynamic indicators
  const indicatorsContainer = document.getElementById('indicators-container');
  indicatorsContainer.innerHTML = '';
  
  const indicators = analysis.indicators || {};
  
  // RSI
  if (indicators.rsi !== undefined) {
    const rsiValue = parseFloat(indicators.rsi);
    let rsiClass = 'panel-value';
    if (rsiValue < 30) rsiClass += ' rsi-oversold';
    else if (rsiValue > 70) rsiClass += ' rsi-overbought';
    
    indicatorsContainer.innerHTML += `
      <div class="panel-section">
        <div class="panel-label">RSI:</div>
        <div class="${rsiClass}">${rsiValue.toFixed(2)}</div>
      </div>
    `;
  }
  
  // EMA
  if (indicators.ema20 !== undefined) {
    indicatorsContainer.innerHTML += `
      <div class="panel-section">
        <div class="panel-label">EMA20:</div>
        <div class="panel-value">$${parseFloat(indicators.ema20).toFixed(2)}</div>
      </div>
    `;
  }
  
  if (indicators.ema50 !== undefined) {
    indicatorsContainer.innerHTML += `
      <div class="panel-section">
        <div class="panel-label">EMA50:</div>
        <div class="panel-value">$${parseFloat(indicators.ema50).toFixed(2)}</div>
      </div>
    `;
  }
  
  // SMA
  if (indicators.sma20 !== undefined) {
    indicatorsContainer.innerHTML += `
      <div class="panel-section">
        <div class="panel-label">SMA20:</div>
        <div class="panel-value">$${parseFloat(indicators.sma20).toFixed(2)}</div>
      </div>
    `;
  }
  
  if (indicators.sma50 !== undefined) {
    indicatorsContainer.innerHTML += `
      <div class="panel-section">
        <div class="panel-label">SMA50:</div>
        <div class="panel-value">$${parseFloat(indicators.sma50).toFixed(2)}</div>
      </div>
    `;
  }
  
  // MACD
  if (indicators.macd) {
    const macdValue = indicators.macd.macd;
    const signalValue = indicators.macd.signal;
    
    // Check for valid signal value (not null, not undefined, not NaN)
    const hasValidSignal = signalValue !== null && 
                          signalValue !== undefined && 
                          signalValue !== 'null' && 
                          !isNaN(parseFloat(signalValue));
    
    const displayText = hasValidSignal 
      ? `${macdValue} / ${signalValue}` 
      : `${macdValue} <span style="color: #fbbf24;">(loading...)</span>`;
    
    indicatorsContainer.innerHTML += `
      <div class="panel-section">
        <div class="panel-label">MACD:</div>
        <div class="panel-value">${displayText}</div>
      </div>
    `;
  }
  
  // Bollinger Bands
  if (indicators.bb) {
    indicatorsContainer.innerHTML += `
      <div class="panel-section">
        <div class="panel-label">BB Upper:</div>
        <div class="panel-value">$${parseFloat(indicators.bb.upper).toFixed(2)}</div>
      </div>
      <div class="panel-section">
        <div class="panel-label">BB Lower:</div>
        <div class="panel-value">$${parseFloat(indicators.bb.lower).toFixed(2)}</div>
      </div>
    `;
  }
  
  // Stochastic
  if (indicators.stoch) {
    indicatorsContainer.innerHTML += `
      <div class="panel-section">
        <div class="panel-label">Stochastic K:</div>
        <div class="panel-value">${parseFloat(indicators.stoch.k).toFixed(2)}</div>
      </div>
    `;
  }
  
  // ADX
  if (indicators.adx) {
    indicatorsContainer.innerHTML += `
      <div class="panel-section">
        <div class="panel-label">ADX:</div>
        <div class="panel-value">${parseFloat(indicators.adx.adx).toFixed(2)}</div>
      </div>
    `;
  }
  
  // ATR
  if (indicators.atr !== undefined) {
    indicatorsContainer.innerHTML += `
      <div class="panel-section">
        <div class="panel-label">ATR:</div>
        <div class="panel-value">${parseFloat(indicators.atr).toFixed(2)}</div>
      </div>
    `;
  }
  
  // Parabolic SAR
  if (indicators.sar !== undefined) {
    indicatorsContainer.innerHTML += `
      <div class="panel-section">
        <div class="panel-label">SAR:</div>
        <div class="panel-value">$${parseFloat(indicators.sar).toFixed(2)}</div>
      </div>
    `;
  }
  
  // Volume SMA
  if (indicators.volumeSMA !== undefined) {
    indicatorsContainer.innerHTML += `
      <div class="panel-section">
        <div class="panel-label">Vol SMA:</div>
        <div class="panel-value">${parseFloat(indicators.volumeSMA).toFixed(0)}</div>
      </div>
    `;
  }
  
  // Update signal
  const signalEl = document.getElementById('panel-signal');
  signalEl.textContent = analysis.signal || 'HOLD';
  signalEl.className = 'panel-value signal-value signal-' + (analysis.signal || 'hold').toLowerCase();
  
  // Update recommendations
  const recommendationsContainer = document.getElementById('recommendations-container');
  if (analysis.recommendations) {
    const rec = analysis.recommendations;
    let recHTML = '<div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid rgba(100, 100, 200, 0.2);">';
    recHTML += '<div style="font-size: 11px; color: #fbbf24; font-weight: 600; margin-bottom: 8px; text-transform: uppercase;">📈 Trade Recommendations</div>';
    
    // Action
    if (rec.action && rec.action !== 'HOLD') {
      let actionColor = rec.action === 'LONG' ? '#00ff88' : rec.action === 'SHORT' ? '#ff4444' : '#fbbf24';
      recHTML += `
        <div class="panel-section">
          <div class="panel-label">Action:</div>
          <div class="panel-value" style="color: ${actionColor}; font-weight: bold;">${rec.action}</div>
        </div>
      `;
      
      // Take Profit
      if (rec.takeProfit) {
        recHTML += `
          <div class="panel-section">
            <div class="panel-label">Take Profit:</div>
            <div class="panel-value" style="color: #00ff88;">$${rec.takeProfit.toFixed(2)}</div>
          </div>
        `;
      }
      
      // Stop Loss
      if (rec.stopLoss) {
        recHTML += `
          <div class="panel-section">
            <div class="panel-label">Stop Loss:</div>
            <div class="panel-value" style="color: #ff4444;">$${rec.stopLoss.toFixed(2)}</div>
          </div>
        `;
      }
      
      // Leverage
      if (rec.leverage > 1) {
        recHTML += `
          <div class="panel-section">
            <div class="panel-label">Leverage:</div>
            <div class="panel-value" style="color: #60a5fa; font-weight: bold;">${rec.leverage}x</div>
          </div>
        `;
      }
      
      // Risk/Reward Ratio
      if (rec.riskRewardRatio) {
        recHTML += `
          <div class="panel-section">
            <div class="panel-label">R/R Ratio:</div>
            <div class="panel-value" style="color: #a0a0c0;">1:${rec.riskRewardRatio}</div>
          </div>
        `;
      }
      
      // Confidence
      if (rec.confidence) {
        let confColor = rec.confidence === 'HIGH' ? '#00ff88' : rec.confidence === 'LOW' ? '#ff4444' : '#fbbf24';
        recHTML += `
          <div class="panel-section">
            <div class="panel-label">Confidence:</div>
            <div class="panel-value" style="color: ${confColor};">${rec.confidence}</div>
          </div>
        `;
      }
    } else {
      recHTML += `
        <div class="panel-section">
          <div class="panel-label">Action:</div>
          <div class="panel-value" style="color: #888888;">HOLD</div>
        </div>
      `;
    }
    
    recHTML += '</div>';
    recommendationsContainer.innerHTML = recHTML;
  } else {
    recommendationsContainer.innerHTML = '';
  }
  
  // Update order book
  const orderbookContainer = document.getElementById('orderbook-container');
  if (analysis.orderBook) {
    const ob = analysis.orderBook;
    let obHTML = '<div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid rgba(100, 100, 200, 0.2);">';
    obHTML += '<div style="font-size: 11px; color: #fbbf24; font-weight: 600; margin-bottom: 8px; text-transform: uppercase;">📊 OrderBook</div>';
    
    // Bid/Ask Ratio
    obHTML += `
      <div class="panel-section">
        <div class="panel-label">Bid/Ask Ratio:</div>
        <div class="panel-value">${ob.bidAskRatio}</div>
      </div>
    `;
    
    // Pressure
    let pressureColor = ob.pressure === 'BUY_PRESSURE' ? '#00ff88' : ob.pressure === 'SELL_PRESSURE' ? '#ff4444' : '#888888';
    let pressureText = ob.pressure === 'BUY_PRESSURE' ? '🟢 BUY' : ob.pressure === 'SELL_PRESSURE' ? '🔴 SELL' : '⚪ NEUTRAL';
    obHTML += `
      <div class="panel-section">
        <div class="panel-label">Pressure:</div>
        <div class="panel-value" style="color: ${pressureColor}; font-weight: bold;">${pressureText}</div>
      </div>
    `;
    
    // Spread
    if (ob.spread) {
      obHTML += `
        <div class="panel-section">
          <div class="panel-label">Spread:</div>
          <div class="panel-value">$${ob.spread} (${ob.spreadPercent}%)</div>
        </div>
      `;
    }
    
    obHTML += '</div>';
    orderbookContainer.innerHTML = obHTML;
  } else {
    orderbookContainer.innerHTML = '';
  }
  
  // Update support/resistance info
  if (analysis.supportResistance) {
    const sr = analysis.supportResistance;
    
    // Add to indicators container if there are levels
    if ((sr.support && sr.support.length > 0) || (sr.resistance && sr.resistance.length > 0)) {
      let srHTML = '<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(100, 100, 200, 0.2);">';
      srHTML += '<div style="font-size: 11px; color: #fbbf24; font-weight: 600; margin-bottom: 8px; text-transform: uppercase;">📍 Key Levels</div>';
      
      // Nearest resistance
      if (sr.resistance && sr.resistance.length > 0) {
        const nearestR = sr.resistance[0];
        srHTML += `
          <div class="panel-section">
            <div class="panel-label">Resistance:</div>
            <div class="panel-value" style="color: #ff4444;">$${nearestR.price.toFixed(2)}</div>
          </div>
        `;
      }
      
      // Nearest support
      if (sr.support && sr.support.length > 0) {
        const nearestS = sr.support[0];
        srHTML += `
          <div class="panel-section">
            <div class="panel-label">Support:</div>
            <div class="panel-value" style="color: #00ff88;">$${nearestS.price.toFixed(2)}</div>
          </div>
        `;
      }
      
      srHTML += '</div>';
      indicatorsContainer.innerHTML += srHTML;
    }
  }
  
  // Update volume profile info
  if (analysis.volumeProfile) {
    const vp = analysis.volumeProfile;
    let vpHTML = '<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(100, 100, 200, 0.2);">';
    vpHTML += '<div style="font-size: 11px; color: #fbbf24; font-weight: 600; margin-bottom: 8px; text-transform: uppercase;">📊 Volume Profile</div>';
    
    // POC
    if (vp.poc) {
      vpHTML += `
        <div class="panel-section">
          <div class="panel-label">POC:</div>
          <div class="panel-value" style="color: #ffcc00;">$${vp.poc.toFixed(2)}</div>
        </div>
      `;
    }
    
    // VAH
    if (vp.vah) {
      vpHTML += `
        <div class="panel-section">
          <div class="panel-label">VAH:</div>
          <div class="panel-value" style="color: #60a5fa;">$${vp.vah.toFixed(2)}</div>
        </div>
      `;
    }
    
    // VAL
    if (vp.val) {
      vpHTML += `
        <div class="panel-section">
          <div class="panel-label">VAL:</div>
          <div class="panel-value" style="color: #60a5fa;">$${vp.val.toFixed(2)}</div>
        </div>
      `;
    }
    
    vpHTML += '</div>';
    indicatorsContainer.innerHTML += vpHTML;
  }
  
  // Update Fibonacci levels
  if (analysis.fibonacci) {
    const fib = analysis.fibonacci;
    let fibHTML = '<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(100, 100, 200, 0.2);">';
    fibHTML += '<div style="font-size: 11px; color: #fbbf24; font-weight: 600; margin-bottom: 8px; text-transform: uppercase;">📐 Fibonacci</div>';
    
    // Show key retracement levels
    const keyLevels = [
      { name: '38.2%', value: fib.retracement.level_382, color: '#ffc800' },
      { name: '50%', value: fib.retracement.level_500, color: '#00ff88' },
      { name: '61.8%', value: fib.retracement.level_618, color: '#00c8ff' }
    ];
    
    keyLevels.forEach(level => {
      fibHTML += `
        <div class="panel-section">
          <div class="panel-label">${level.name}:</div>
          <div class="panel-value" style="color: ${level.color};">$${level.value.toFixed(2)}</div>
        </div>
      `;
    });
    
    // Show trend direction
    const trendText = fib.isUptrend ? '📈 Uptrend' : '📉 Downtrend';
    const trendColor = fib.isUptrend ? '#00ff88' : '#ff4444';
    fibHTML += `
      <div class="panel-section">
        <div class="panel-label">Trend:</div>
        <div class="panel-value" style="color: ${trendColor}; font-weight: bold;">${trendText}</div>
      </div>
    `;
    
    fibHTML += '</div>';
    indicatorsContainer.innerHTML += fibHTML;
  }
}

/**
 * Observe DOM changes to detect chart reloads
 */
function observeChartChanges() {
  const observer = new MutationObserver((mutations) => {
    // Check if chart was reloaded
    const chartExists = document.querySelector('#binance-signal-overlay');
    if (!chartExists && window.ChartOverlay) {
      console.log('[Content] Chart reloaded, reinitializing overlay...');
      window.ChartOverlay.destroy();
      setTimeout(() => window.ChartOverlay.init(), 1000);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

/**
 * Cleanup on unload
 */
window.addEventListener('beforeunload', () => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  if (window.ChartOverlay) {
    window.ChartOverlay.destroy();
  }
});

// Initialize
initialize();

