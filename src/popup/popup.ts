import { AnalysisSummary } from '../types/signals';
import { Timeframe } from '../types/binance';
import { PriceAlert, ScreenerCoinResult } from '../types/alerts';
import { SoundService } from '../services/soundService';

let currentAnalysisData: AnalysisSummary | null = null;

// Tab management
function setupTabs(): void {
  const tabBtns = document.querySelectorAll<HTMLButtonElement>('.tab-btn');
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      if (targetId) {
        document.getElementById(targetId)?.classList.add('active');
      }

      if (targetId === 'tab-screener') {
        loadScreener();
      } else if (targetId === 'tab-alerts') {
        loadAlerts();
      }
    });
  });
}

// Fetch single symbol analysis
async function fetchPopupAnalysis(): Promise<void> {
  const symbolInput = document.getElementById('symbol-input') as HTMLInputElement;
  const tfSelect = document.getElementById('timeframe-select') as HTMLSelectElement;

  const symbol = (symbolInput?.value || 'BTCUSDT').trim().toUpperCase();
  const interval = (tfSelect?.value || '4h') as Timeframe;

  const signalStatus = document.getElementById('signal-status');
  if (signalStatus) {
    signalStatus.innerText = 'FETCHING...';
    signalStatus.style.borderColor = '#94a3b8';
    signalStatus.style.color = '#cbd5e1';
  }

  try {
    const res = await chrome.runtime.sendMessage({
      type: 'FETCH_ANALYSIS',
      payload: { symbol, interval }
    });

    if (res && res.success && res.data) {
      currentAnalysisData = res.data;
      renderAnalysis(res.data);
    } else {
      if (signalStatus) signalStatus.innerText = 'ANALYSIS ERROR';
    }
  } catch (err) {
    console.error('Popup fetch error:', err);
    if (signalStatus) signalStatus.innerText = 'OFFLINE / ERROR';
  }
}

function renderAnalysis(data: AnalysisSummary): void {
  const priceDisplay = document.getElementById('price-display');
  const change24h = document.getElementById('change-24h');
  const signalStatus = document.getElementById('signal-status');
  const scoreIndicator = document.getElementById('score-indicator');
  const trendVal = document.getElementById('trend-val');
  const confVal = document.getElementById('confidence-val');

  if (priceDisplay) priceDisplay.innerText = `$${data.currentPrice.toLocaleString()}`;
  if (change24h && data.priceChange24h !== undefined) {
    const isUp = data.priceChange24h >= 0;
    change24h.innerText = `${isUp ? '+' : ''}${data.priceChange24h.toFixed(2)}%`;
    change24h.className = `change-tag ${isUp ? 'text-success' : 'text-danger'}`;
  }

  if (signalStatus) {
    signalStatus.innerText = data.signal.replace('_', ' ');
    const isBull = data.signal === 'STRONG_BUY' || data.signal === 'BUY';
    const isBear = data.signal === 'STRONG_SELL' || data.signal === 'SELL';

    signalStatus.style.color = isBull ? '#10b981' : isBear ? '#ef4444' : '#cbd5e1';
    signalStatus.style.borderColor = isBull ? '#10b981' : isBear ? '#ef4444' : '#94a3b8';
    signalStatus.style.background = isBull
      ? 'rgba(16,185,129,0.15)'
      : isBear
      ? 'rgba(239,68,68,0.15)'
      : 'rgba(148,163,184,0.15)';
  }

  if (scoreIndicator) {
    const normalized = (data.compositeScore + 100) / 2;
    scoreIndicator.style.width = `${normalized}%`;
    scoreIndicator.style.backgroundColor =
      data.compositeScore > 0 ? '#10b981' : data.compositeScore < 0 ? '#ef4444' : '#6b7280';
  }

  if (trendVal) trendVal.innerText = `Trend: ${data.trend}`;
  if (confVal) confVal.innerText = `Confidence: ${data.confidence}`;

  // Recommendations
  const rec = data.recommendation;
  const entry = document.getElementById('rec-entry');
  const sl = document.getElementById('rec-sl');
  const tp1 = document.getElementById('rec-tp1');
  const lev = document.getElementById('rec-lev');

  if (entry) entry.innerText = `$${rec.entryPrice.toLocaleString()}`;
  if (sl) sl.innerText = `$${rec.stopLoss.toLocaleString()}`;
  if (tp1) tp1.innerText = `$${rec.takeProfit1.toLocaleString()}`;
  if (lev) lev.innerText = `${rec.suggestedLeverage}x`;

  // Indicators
  const bRsi = document.getElementById('badge-rsi');
  const bEma = document.getElementById('badge-ema');
  const bMacd = document.getElementById('badge-macd');
  const bBb = document.getElementById('badge-bb');

  if (bRsi) bRsi.innerText = `RSI: ${data.indicators.rsi?.value ?? '--'}`;
  if (bEma) bEma.innerText = `EMA: ${data.indicators.ema?.trend ?? '--'}`;
  if (bMacd) bMacd.innerText = `MACD: ${data.indicators.macd?.trend ?? '--'}`;
  if (bBb) bBb.innerText = `BB: ${data.indicators.bb?.position ?? '--'}`;
}

// Screener Tab Logic
async function loadScreener(): Promise<void> {
  const tbody = document.getElementById('screener-tbody');
  if (!tbody) return;

  try {
    const res = await chrome.runtime.sendMessage({ type: 'GET_SCREENER_RESULTS' });
    const results: ScreenerCoinResult[] = res?.success && res.data ? res.data : [];

    if (results.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 16px;">Scanning coins in background... Click "Scan Now" to force.</td></tr>`;
      return;
    }

    tbody.innerHTML = results
      .map((r) => {
        const isBuy = r.signal === 'STRONG_BUY' || r.signal === 'BUY';
        const isSell = r.signal === 'STRONG_SELL' || r.signal === 'SELL';
        const pillClass = isBuy ? 'buy' : isSell ? 'sell' : 'neutral';
        const isUp = r.priceChange24h >= 0;

        return `
          <tr data-symbol="${r.symbol}">
            <td style="font-weight: 700;">${r.symbol}</td>
            <td>$${r.price.toLocaleString()}</td>
            <td class="${isUp ? 'text-success' : 'text-danger'}">${isUp ? '+' : ''}${r.priceChange24h.toFixed(2)}%</td>
            <td><span class="pill-sm ${pillClass}">${r.signal.replace('_', ' ')}</span></td>
            <td style="font-weight: 700; color: ${r.compositeScore > 0 ? '#10b981' : r.compositeScore < 0 ? '#ef4444' : '#94a3b8'}">${r.compositeScore > 0 ? '+' : ''}${r.compositeScore}</td>
          </tr>
        `;
      })
      .join('');

    // Row click loads coin in analysis tab
    tbody.querySelectorAll('tr').forEach((row) => {
      row.addEventListener('click', () => {
        const sym = row.getAttribute('data-symbol');
        if (sym) {
          const symInput = document.getElementById('symbol-input') as HTMLInputElement;
          if (symInput) symInput.value = sym;
          document.querySelector<HTMLButtonElement>('[data-tab="tab-analysis"]')?.click();
          fetchPopupAnalysis();
        }
      });
    });
  } catch (err) {
    console.error('Failed to load screener:', err);
  }
}

// Alerts Tab Logic
async function loadAlerts(): Promise<void> {
  const container = document.getElementById('alerts-list');
  if (!container) return;

  try {
    const res = await chrome.runtime.sendMessage({ type: 'GET_ALERTS' });
    const alerts: PriceAlert[] = res?.success && res.data?.priceAlerts ? res.data.priceAlerts : [];

    if (alerts.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 12px; font-size: 11px;">No active price alerts.</div>`;
      return;
    }

    container.innerHTML = alerts
      .map(
        (a) => `
        <div class="alert-item-card ${a.triggered ? 'triggered' : ''}">
          <div>
            <strong>${a.symbol}</strong> ${a.condition === 'ABOVE' ? '≥' : '≤'} $${a.targetPrice.toLocaleString()}
            <div style="font-size: 9px; color: #94a3b8;">${a.note || a.alertType} ${a.triggered ? '(Triggered ✅)' : '(Active ⏳)'}</div>
          </div>
          <button class="btn-del" data-id="${a.id}">×</button>
        </div>
      `
      )
      .join('');

    container.querySelectorAll('.btn-del').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = (e.target as HTMLElement).getAttribute('data-id');
        if (id) {
          await chrome.runtime.sendMessage({
            type: 'DELETE_PRICE_ALERT',
            payload: { id }
          });
          loadAlerts();
        }
      });
    });
  } catch (err) {
    console.error('Failed to load alerts:', err);
  }
}

// Event Listeners Initialization
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();

  const refreshBtn = document.getElementById('btn-refresh');
  const optionsBtn = document.getElementById('btn-open-options');
  const testSoundBtn = document.getElementById('btn-test-sound');
  const symbolInput = document.getElementById('symbol-input');
  const tfSelect = document.getElementById('timeframe-select');
  const scanNowBtn = document.getElementById('btn-run-scan');
  const addAlertBtn = document.getElementById('btn-add-alert');
  const quickAlertBtn = document.getElementById('btn-quick-alert');

  refreshBtn?.addEventListener('click', () => fetchPopupAnalysis());
  optionsBtn?.addEventListener('click', () => {
    if (chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
  });

  testSoundBtn?.addEventListener('click', () => {
    SoundService.play('BUY_CHIME', 0.8);
  });

  symbolInput?.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') fetchPopupAnalysis();
  });

  tfSelect?.addEventListener('change', () => fetchPopupAnalysis());

  scanNowBtn?.addEventListener('click', async () => {
    scanNowBtn.innerText = '⏳ Scanning...';
    await chrome.runtime.sendMessage({ type: 'TRIGGER_SCAN' });
    await loadScreener();
    scanNowBtn.innerText = '🔄 Scan Now';
  });

  addAlertBtn?.addEventListener('click', async () => {
    const symEl = document.getElementById('alert-symbol') as HTMLInputElement;
    const priceEl = document.getElementById('alert-price') as HTMLInputElement;
    const condEl = document.getElementById('alert-condition') as HTMLSelectElement;
    const noteEl = document.getElementById('alert-note') as HTMLInputElement;

    const symbol = (symEl?.value || 'BTCUSDT').trim().toUpperCase();
    const targetPrice = parseFloat(priceEl?.value || '0');
    const condition = (condEl?.value || 'ABOVE') as 'ABOVE' | 'BELOW';
    const note = noteEl?.value.trim() || undefined;

    if (!targetPrice || targetPrice <= 0) {
      alert('Please enter a valid target price.');
      return;
    }

    await chrome.runtime.sendMessage({
      type: 'ADD_PRICE_ALERT',
      payload: { symbol, targetPrice, condition, alertType: 'CUSTOM', note }
    });

    if (priceEl) priceEl.value = '';
    if (noteEl) noteEl.value = '';
    loadAlerts();
  });

  quickAlertBtn?.addEventListener('click', async () => {
    if (!currentAnalysisData) return;
    const { symbol, recommendation, currentPrice } = currentAnalysisData;

    await chrome.runtime.sendMessage({
      type: 'CREATE_TRADE_POSITION',
      payload: {
        symbol,
        side: recommendation.type === 'LONG' ? 'LONG' : 'SHORT',
        entryPrice: recommendation.entryPrice || currentPrice,
        takeProfit: recommendation.takeProfit1,
        stopLoss: recommendation.stopLoss
      }
    });

    quickAlertBtn.innerText = '✅ Alert Created!';
    quickAlertBtn.style.background = '#10b981';
    setTimeout(() => {
      quickAlertBtn.innerText = '🔔 Set TP/SL Alert';
      quickAlertBtn.style.background = '';
    }, 2500);
  });

  fetchPopupAnalysis();
});
