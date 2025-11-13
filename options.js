// Options page script for advanced settings

// Default settings
const DEFAULT_SETTINGS = {
    apiKey: '',
    apiSecret: '',
    symbol: 'BTCUSDT',
    interval: '1m',
    candleLimit: 200,
    updateInterval: 5,
    indicators: {
        rsi: true,
        ema: true,
        sma: false,
        macd: true,
        adx: false,
        stoch: false,
        bb: false,
        atr: false,
        sar: false,
        volume: false
    },
    indicatorParams: {
        rsi: { period: 14, oversold: 30, overbought: 70 },
        ema: { fast: 20, slow: 50 },
        sma: { fast: 20, slow: 50 },
        macd: { fast: 12, slow: 26, signal: 9 },
        bb: { period: 20, stddev: 2 },
        stoch: { k: 14, d: 3 },
        adx: { period: 14 },
        atr: { period: 14 },
        sar: { step: 0.02, max: 0.2 },
        volume: { period: 20 }
    }
};

// Load all settings
function loadSettings() {
    chrome.storage.local.get(['settings'], (result) => {
        const settings = result.settings || DEFAULT_SETTINGS;
        
        // API Settings
        document.getElementById('apiKey').value = settings.apiKey || '';
        document.getElementById('apiSecret').value = settings.apiSecret || '';
        
        // Trading Configuration
        document.getElementById('symbol').value = settings.symbol || 'BTCUSDT';
        document.getElementById('interval').value = settings.interval || '1m';
        document.getElementById('candleLimit').value = settings.candleLimit || 200;
        document.getElementById('updateInterval').value = settings.updateInterval || 5;
        
        // Indicators checkboxes
        const indicators = settings.indicators || DEFAULT_SETTINGS.indicators;
        Object.keys(indicators).forEach(key => {
            const checkbox = document.getElementById(`ind_${key}`);
            if (checkbox) {
                checkbox.checked = indicators[key];
            }
        });
        
        // Indicator Parameters
        const params = settings.indicatorParams || DEFAULT_SETTINGS.indicatorParams;
        
        // RSI
        if (params.rsi) {
            document.getElementById('rsi_period').value = params.rsi.period || 14;
            document.getElementById('rsi_oversold').value = params.rsi.oversold || 30;
            document.getElementById('rsi_overbought').value = params.rsi.overbought || 70;
        }
        
        // EMA
        if (params.ema) {
            document.getElementById('ema_fast').value = params.ema.fast || 20;
            document.getElementById('ema_slow').value = params.ema.slow || 50;
        }
        
        // SMA
        if (params.sma) {
            document.getElementById('sma_fast').value = params.sma.fast || 20;
            document.getElementById('sma_slow').value = params.sma.slow || 50;
        }
        
        // MACD
        if (params.macd) {
            document.getElementById('macd_fast').value = params.macd.fast || 12;
            document.getElementById('macd_slow').value = params.macd.slow || 26;
            document.getElementById('macd_signal').value = params.macd.signal || 9;
        }
        
        // Bollinger Bands
        if (params.bb) {
            document.getElementById('bb_period').value = params.bb.period || 20;
            document.getElementById('bb_stddev').value = params.bb.stddev || 2;
        }
        
        // Stochastic
        if (params.stoch) {
            document.getElementById('stoch_k').value = params.stoch.k || 14;
            document.getElementById('stoch_d').value = params.stoch.d || 3;
        }
        
        // ADX
        if (params.adx) {
            document.getElementById('adx_period').value = params.adx.period || 14;
        }
        
        // ATR
        if (params.atr) {
            document.getElementById('atr_period').value = params.atr.period || 14;
        }
        
        // Parabolic SAR
        if (params.sar) {
            document.getElementById('sar_step').value = params.sar.step || 0.02;
            document.getElementById('sar_max').value = params.sar.max || 0.2;
        }
        
        // Volume
        if (params.volume) {
            document.getElementById('volume_period').value = params.volume.period || 20;
        }
    });
}

// Save all settings
function saveSettings() {
    const settings = {
        apiKey: document.getElementById('apiKey').value.trim(),
        apiSecret: document.getElementById('apiSecret').value.trim(),
        symbol: document.getElementById('symbol').value.toUpperCase().trim() || 'BTCUSDT',
        interval: document.getElementById('interval').value,
        candleLimit: parseInt(document.getElementById('candleLimit').value) || 200,
        updateInterval: parseInt(document.getElementById('updateInterval').value) || 5,
        indicators: {
            rsi: document.getElementById('ind_rsi').checked,
            ema: document.getElementById('ind_ema').checked,
            sma: document.getElementById('ind_sma').checked,
            macd: document.getElementById('ind_macd').checked,
            adx: document.getElementById('ind_adx').checked,
            stoch: document.getElementById('ind_stoch').checked,
            bb: document.getElementById('ind_bb').checked,
            atr: document.getElementById('ind_atr').checked,
            sar: document.getElementById('ind_sar').checked,
            volume: document.getElementById('ind_volume').checked
        },
        indicatorParams: {
            rsi: {
                period: parseInt(document.getElementById('rsi_period').value) || 14,
                oversold: parseInt(document.getElementById('rsi_oversold').value) || 30,
                overbought: parseInt(document.getElementById('rsi_overbought').value) || 70
            },
            ema: {
                fast: parseInt(document.getElementById('ema_fast').value) || 20,
                slow: parseInt(document.getElementById('ema_slow').value) || 50
            },
            sma: {
                fast: parseInt(document.getElementById('sma_fast').value) || 20,
                slow: parseInt(document.getElementById('sma_slow').value) || 50
            },
            macd: {
                fast: parseInt(document.getElementById('macd_fast').value) || 12,
                slow: parseInt(document.getElementById('macd_slow').value) || 26,
                signal: parseInt(document.getElementById('macd_signal').value) || 9
            },
            bb: {
                period: parseInt(document.getElementById('bb_period').value) || 20,
                stddev: parseFloat(document.getElementById('bb_stddev').value) || 2
            },
            stoch: {
                k: parseInt(document.getElementById('stoch_k').value) || 14,
                d: parseInt(document.getElementById('stoch_d').value) || 3
            },
            adx: {
                period: parseInt(document.getElementById('adx_period').value) || 14
            },
            atr: {
                period: parseInt(document.getElementById('atr_period').value) || 14
            },
            sar: {
                step: parseFloat(document.getElementById('sar_step').value) || 0.02,
                max: parseFloat(document.getElementById('sar_max').value) || 0.2
            },
            volume: {
                period: parseInt(document.getElementById('volume_period').value) || 20
            }
        }
    };
    
    chrome.storage.local.set({ settings: settings }, () => {
        showStatus('✓ All settings saved successfully!', 'success');
        
        // Notify background to reload settings and update
        chrome.runtime.sendMessage({ action: 'settingsUpdated' });
    });
}

// Reset to defaults
function resetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
        chrome.storage.local.set({ settings: DEFAULT_SETTINGS }, () => {
            loadSettings();
            showStatus('✓ Settings reset to defaults', 'success');
            chrome.runtime.sendMessage({ action: 'settingsUpdated' });
        });
    }
}

// Show status message
function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';
    
    setTimeout(() => {
        status.style.display = 'none';
    }, 4000);
}

// Event listeners
document.getElementById('saveBtn').addEventListener('click', saveSettings);
document.getElementById('resetBtn').addEventListener('click', resetSettings);

// Load settings on page load
document.addEventListener('DOMContentLoaded', loadSettings);

// Auto-save on Enter key
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveSettings();
    }
});

