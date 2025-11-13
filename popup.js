// Popup script for quick settings

// Default settings
const DEFAULT_SETTINGS = {
    symbol: 'BTCUSDT',
    interval: '1m',
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
    }
};

// Load current settings
function loadSettings() {
    chrome.storage.local.get(['settings'], (result) => {
        const settings = result.settings || DEFAULT_SETTINGS;
        
        // Populate form
        document.getElementById('symbol').value = settings.symbol || 'BTCUSDT';
        document.getElementById('interval').value = settings.interval || '1m';
        
        // Set checkboxes
        document.getElementById('ind_rsi').checked = settings.indicators?.rsi !== false;
        document.getElementById('ind_ema').checked = settings.indicators?.ema !== false;
        document.getElementById('ind_macd').checked = settings.indicators?.macd !== false;
        document.getElementById('ind_bb').checked = settings.indicators?.bb === true;
        document.getElementById('ind_stoch').checked = settings.indicators?.stoch === true;
    });
}

// Save settings
function saveSettings() {
    const settings = {
        symbol: document.getElementById('symbol').value.toUpperCase() || 'BTCUSDT',
        interval: document.getElementById('interval').value,
        indicators: {
            rsi: document.getElementById('ind_rsi').checked,
            ema: document.getElementById('ind_ema').checked,
            macd: document.getElementById('ind_macd').checked,
            bb: document.getElementById('ind_bb').checked,
            stoch: document.getElementById('ind_stoch').checked,
            // Keep other settings from advanced options
            sma: false,
            adx: false,
            atr: false,
            sar: false,
            volume: false
        }
    };
    
    // Get existing settings to preserve advanced options
    chrome.storage.local.get(['settings'], (result) => {
        const existingSettings = result.settings || {};
        const mergedSettings = {
            ...existingSettings,
            ...settings,
            indicators: {
                ...existingSettings.indicators,
                ...settings.indicators
            }
        };
        
        chrome.storage.local.set({ settings: mergedSettings }, () => {
            showStatus('Settings saved successfully!', 'success');
            
            // Notify background to update
            chrome.runtime.sendMessage({ action: 'settingsUpdated' });
        });
    });
}

// Reset to defaults
function resetSettings() {
    if (confirm('Reset to default settings?')) {
        chrome.storage.local.set({ settings: DEFAULT_SETTINGS }, () => {
            loadSettings();
            showStatus('Settings reset to defaults', 'success');
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
    }, 3000);
}

// Open advanced settings
function openOptions() {
    chrome.runtime.openOptionsPage();
}

// Event listeners
document.getElementById('saveBtn').addEventListener('click', saveSettings);
document.getElementById('resetBtn').addEventListener('click', resetSettings);
document.getElementById('optionsBtn').addEventListener('click', openOptions);

// Load settings on popup open
document.addEventListener('DOMContentLoaded', loadSettings);

