<div align="center">

# 📊 Binance Signal Analyzer

### Advanced Technical Analysis Chrome Extension for Binance Trading

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/yourusername/binance-signal-analyzer)
[![Manifest](https://img.shields.io/badge/manifest-v3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License](https://img.shields.io/badge/license-MIT-purple.svg)](LICENSE)
[![Chrome](https://img.shields.io/badge/chrome-88%2B-brightgreen.svg)](https://www.google.com/chrome/)

[English](#english) | [Türkçe](#turkish)

---

</div>

<a name="english"></a>

## 🚀 Overview

A powerful Chrome Extension (Manifest V3) that provides real-time technical analysis for Binance trading. Analyzes market data using 10+ technical indicators and displays buy/sell signals directly on TradingView charts with a beautiful, non-intrusive overlay.

### ✨ Key Features

- 📈 **10 Technical Indicators** - RSI, EMA, SMA, MACD, Bollinger Bands, Stochastic, ADX, ATR, Parabolic SAR, Volume SMA
- ⚡ **Real-time Analysis** - Updates every 5 seconds with live market data
- 🎯 **Smart Signal Generation** - Multi-indicator confluence for accurate buy/sell signals
- 🎨 **Visual Chart Overlay** - Beautiful canvas-based signal arrows and trend indicators
- 📱 **Floating Control Panel** - Draggable, minimizable panel with all key metrics
- ⚙️ **Fully Customizable** - Configure every indicator parameter via advanced settings
- 🔄 **Dynamic Timeframes** - Seamlessly switch between 1m to 1w timeframes
- 🌓 **Modern Dark UI** - Glassmorphism design with smooth animations
- 🔐 **Secure & Private** - All data stored locally, optional API key support
- 🚫 **Non-intrusive** - Doesn't modify Binance or TradingView functionality

## 📸 Screenshots

### Main Panel & Chart Overlay
*Beautiful floating panel with real-time indicators and visual signal overlay*

### Advanced Settings Page
*Configure all 10 indicators with custom parameters*

### Signal Detection
*Clear buy/sell arrows with trend indicators on the chart*

## 🛠️ Installation

### Quick Install (5 minutes)

1. **Clone or Download**
   ```bash
   git clone https://github.com/PrivyXe/binance-signal-analyzer.git
   cd binance-signal-analyzer
   ```

2. **Generate Icons** (Optional)
   - Open `extension/icons/convert-svg-to-png.html` in browser
   - Click "Download All Icons"
   - Save the 3 PNG files to `extension/icons/` folder
   - *Or skip this step - extension will work with default Chrome icon*

3. **Load Extension**
   - Open Chrome and go to `chrome://extensions/`
   - Enable **Developer mode** (toggle in top right)
   - Click **Load unpacked**
   - Select the `extension` folder

4. **Start Trading**
   - Navigate to [Binance Trading](https://www.binance.com/en/trade/BTC_USDT)
   - Panel appears automatically in top-right corner
   - Signals appear on the chart! 🎉

## 🎯 Usage

### Quick Start

1. **Open Binance** - Go to any Binance trading pair
2. **View Signals** - Floating panel shows real-time analysis
3. **Change Timeframe** - Select from dropdown (1m, 5m, 15m, 1h, 4h, etc.)
4. **Configure Settings** - Click ⚙️ Settings button for advanced options

### Understanding Signals

| Signal | Meaning | Visual |
|--------|---------|--------|
| 🟢 **BUY** | Strong bullish signal - Consider entering long | Green arrow up on chart |
| 🔴 **SELL** | Strong bearish signal - Consider entering short | Red arrow down on chart |
| ⚪ **HOLD** | No clear signal - Wait for better opportunity | No arrow, just trend indicator |

### Panel Controls

- **🔄 Refresh** - Force update analysis immediately
- **⚙️ Settings** - Open advanced settings page
- **− Minimize** - Hide/show panel content
- **× Close** - Hide panel (refresh page to show again)
- **Drag** - Click header to move panel anywhere

## 📊 Technical Indicators

### Supported Indicators (10 Total)

| Indicator | Default Parameters | Purpose |
|-----------|-------------------|---------|
| **RSI** | Period: 14, Oversold: 30, Overbought: 70 | Momentum & overbought/oversold |
| **EMA** | Fast: 20, Slow: 50 | Trend direction & crossovers |
| **SMA** | Fast: 20, Slow: 50 | Alternative trend indicator |
| **MACD** | Fast: 12, Slow: 26, Signal: 9 | Momentum & trend strength |
| **Bollinger Bands** | Period: 20, StdDev: 2 | Volatility & price extremes |
| **Stochastic** | K: 14, D: 3 | Momentum oscillator |
| **ADX** | Period: 14 | Trend strength measurement |
| **ATR** | Period: 14 | Volatility for stop-loss |
| **Parabolic SAR** | Step: 0.02, Max: 0.2 | Trend reversal points |
| **Volume SMA** | Period: 20 | Volume trend analysis |

### Signal Strategy

**BUY Conditions:**
- RSI drops below oversold threshold (default: 30)
- AND EMA20 crosses above EMA50 (golden cross)
- Optional: Price bounces off lower Bollinger Band

**SELL Conditions:**
- RSI rises above overbought threshold (default: 70)
- AND EMA20 crosses below EMA50 (death cross)
- Optional: Price touches upper Bollinger Band

**Signal Strength:**
- **Strong**: Multiple indicators confirm
- **Weak**: Single indicator signal
- **Confluence**: 3+ indicators agree

## ⚙️ Configuration

### Quick Settings (Popup)

Click extension icon in toolbar:
- Change symbol (BTCUSDT, ETHUSDT, etc.)
- Select timeframe (1m - 1w)
- Toggle common indicators
- Quick save & apply

### Advanced Settings

Click ⚙️ button in panel or right-click extension → Options:

- **API Configuration** - Optional Binance API keys
- **Indicator Parameters** - Fine-tune every indicator
- **Trading Config** - Symbol, interval, update frequency
- **Custom Strategy** - Modify signal generation logic

### Example Configurations

#### Scalping (1m - 5m)
```javascript
Timeframe: 1m or 3m
Indicators: RSI, EMA, Stochastic
RSI: 25/75 (more sensitive)
EMA: 9/21 (faster)
Update: 5 seconds
```

#### Day Trading (15m - 1h)
```javascript
Timeframe: 15m
Indicators: RSI, EMA, MACD, BB
Default parameters
Update: 10 seconds
```

#### Swing Trading (4h - 1d)
```javascript
Timeframe: 4h or 1d
Indicators: SMA, MACD, ADX, ATR
SMA: 50/200 (long-term)
Update: 30 seconds
```

## 📁 Project Structure

```
extension/
├── manifest.json           # Extension configuration (Manifest V3)
├── background.js          # Service worker - data fetching & analysis
├── content.js            # Content script - UI injection & panel
├── overlay.js            # Chart overlay - signal visualization
├── indicators.js         # Technical indicator calculations
├── popup.html/js         # Quick settings popup
├── options.html/js       # Advanced settings page
├── styles.css           # Modern UI styling
└── icons/               # Extension icons
```

## 🔧 Development

### Prerequisites

- Chrome 88+ or any Chromium-based browser
- Basic understanding of Chrome Extensions
- JavaScript ES6+ knowledge

### Local Development

```bash
# Clone repository
git clone https://github.com/PrivyXe/binance-signal-analyzer.git

# Make changes to extension files
cd extension

# Reload extension in chrome://extensions/
# Test on Binance trading page
```

### Adding New Indicators

1. Add calculation function to `indicators.js`
2. Add UI controls to `options.html`
3. Update settings schema in `options.js`
4. Add calculation call in `background.js`
5. Update panel display in `content.js`

## 🎨 Customization

### UI Themes

Modify `styles.css` to change colors, layout, or animations:

```css
/* Change panel colors */
.signal-panel {
  background: linear-gradient(135deg, your-color-1, your-color-2);
}

/* Modify signal colors */
.signal-buy { color: #00ff88; }
.signal-sell { color: #ff4444; }
```

### Strategy Logic

Edit `background.js` → `analyzeMarket()` function:

```javascript
// Custom BUY signal
if (rsi < 35 && ema20 > ema50 && indicators.bb.lower > currentPrice) {
  signal = 'BUY';
}
```

## 📈 Performance

- **CPU Usage**: <1% average
- **Memory**: 10-25MB (depends on active indicators)
- **Network**: ~5-10KB per update
- **Battery Impact**: Minimal

## 🌐 Browser Compatibility

| Browser | Minimum Version | Status |
|---------|----------------|--------|
| Chrome | 88+ | ✅ Fully Supported |
| Edge | 88+ | ✅ Fully Supported |
| Brave | 1.20+ | ✅ Fully Supported |
| Opera | 74+ | ✅ Fully Supported |
| Firefox | ❌ | Not Supported (Manifest V3 differences) |

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

### Contribution Ideas

- [ ] Add more technical indicators
- [ ] Multiple symbol tracking
- [ ] Alert/notification system
- [ ] Signal history & backtesting
- [ ] Export data to CSV
- [ ] Mobile app integration
- [ ] Custom strategy builder
- [ ] Dark/light theme toggle

## 📋 Roadmap

### Version 1.1 (Planned)
- [ ] Alert system (browser notifications)
- [ ] Signal history log
- [ ] Multiple watchlist support
- [ ] Export signals to CSV

### Version 2.0 (Future)
- [ ] Backtesting engine
- [ ] Custom strategy builder
- [ ] AI-powered signal optimization
- [ ] Mobile companion app

## ⚠️ Disclaimer

**IMPORTANT LEGAL NOTICE:**

This extension is provided for **EDUCATIONAL and INFORMATIONAL purposes ONLY**. It is NOT financial advice, investment advice, trading advice, or any other sort of advice.

- ❌ This is NOT a guarantee of profits
- ❌ Past performance does NOT indicate future results
- ❌ Crypto trading involves SIGNIFICANT RISK
- ❌ You may lose ALL invested capital

**Always:**
- ✅ Do your own research (DYOR)
- ✅ Never invest more than you can afford to lose
- ✅ Use proper risk management
- ✅ Consult with licensed financial advisors
- ✅ Trade responsibly

The developers assume NO responsibility for any financial losses incurred through the use of this extension.

## 📄 License

MIT License - Copyright (c) 2024

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software.

See [LICENSE](LICENSE) file for full text.

## 💬 Support

- 🐛 **Bug Reports**: [Open an issue](https://github.com/PrivyXe/binance-signal-analyzer/issues)
- 💡 **Feature Requests**: [Request a feature](https://github.com/PrivyXe/binance-signal-analyzer/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/PrivyXe/binance-signal-analyzer/discussions)

## 🙏 Acknowledgments

- [Binance API](https://binance-docs.github.io/apidocs/) - Market data provider
- [TradingView](https://www.tradingview.com/) - Chart platform
- Chrome Extension Documentation
- Open source community

---

<div align="center">

### ⭐ Star this repo if you find it helpful!

Made with ❤️ by passionate traders

**Happy Trading! 📈🚀**

*(But remember: Trade responsibly and never risk more than you can afford to lose!)*

</div>

---

<a name="turkish"></a>

# 📊 Binance Sinyal Analiz Aracı

### Binance Trading için Gelişmiş Teknik Analiz Chrome Eklentisi

## 🚀 Genel Bakış

Binance'de gerçek zamanlı teknik analiz sağlayan güçlü bir Chrome eklentisi. 10'dan fazla teknik gösterge kullanarak piyasa verilerini analiz eder ve TradingView grafikleri üzerinde al/sat sinyallerini güzel, işlevselliği bozmayan bir overlay ile gösterir.

### ✨ Temel Özellikler

- 📈 **10 Teknik Gösterge** - RSI, EMA, SMA, MACD, Bollinger Bantları, Stokastik, ADX, ATR, Parabolik SAR, Hacim SMA
- ⚡ **Gerçek Zamanlı Analiz** - Canlı piyasa verileriyle her 5 saniyede güncelleme
- 🎯 **Akıllı Sinyal Üretimi** - Doğru al/sat sinyalleri için çoklu gösterge uyumu
- 🎨 **Görsel Grafik Overlay** - Canvas tabanlı güzel sinyal okları ve trend göstergeleri
- 📱 **Yüzen Kontrol Paneli** - Sürüklenebilir, küçültülebilir panel
- ⚙️ **Tamamen Özelleştirilebilir** - Gelişmiş ayarlarla her gösterge parametresini yapılandırın
- 🔄 **Dinamik Zaman Dilimleri** - 1d'den 1h'ye sorunsuz geçiş
- 🌓 **Modern Karanlık UI** - Glassmorphism tasarım ve düzgün animasyonlar
- 🔐 **Güvenli ve Özel** - Tüm veriler yerel olarak saklanır
- 🚫 **İşlevselliği Bozmayan** - Binance veya TradingView'ı değiştirmez

## 🛠️ Kurulum

### Hızlı Kurulum (5 dakika)

1. **İndir veya Klonla**
   ```bash
   git clone https://github.com/PrivyXe/binance-signal-analyzer.git
   cd binance-signal-analyzer
   ```

2. **İkonları Oluştur** (Opsiyonel)
   - `extension/icons/convert-svg-to-png.html` dosyasını tarayıcıda aç
   - "Download All Icons" butonuna tıkla
   - 3 PNG dosyasını `extension/icons/` klasörüne kaydet

3. **Eklentiyi Yükle**
   - Chrome'u aç ve `chrome://extensions/` adresine git
   - **Geliştirici modu**'nu etkinleştir (sağ üst köşe)
   - **Paketlenmemiş uzantı yükle** tıkla
   - `extension` klasörünü seç

4. **Trading'e Başla**
   - [Binance Trading](https://www.binance.com/tr/trade/BTC_USDT) sayfasına git
   - Panel otomatik olarak sağ üst köşede görünür
   - Sinyaller grafikte belirir! 🎉

## 📊 Teknik Göstergeler

Tüm göstergeler tamamen özelleştirilebilir parametrelerle gelir. Varsayılan değerler en yaygın trading stratejileri için optimize edilmiştir.

## ⚙️ Yapılandırma

### Hızlı Ayarlar
- Eklenti simgesine tıklayarak sembol ve zaman dilimi değiştirin
- Yaygın göstergeleri açıp kapatın

### Gelişmiş Ayarlar
- Panel'deki ⚙️ butonuna tıklayın
- Her göstergenin parametrelerini detaylı yapılandırın
- API anahtarlarını ekleyin (opsiyonel)
- Özel strateji oluşturun

## 📈 Performans

- **CPU Kullanımı**: Ortalama %1'den az
- **Bellek**: 10-25MB (aktif göstergelere bağlı)
- **Ağ**: Güncelleme başına ~5-10KB
- **Batarya Etkisi**: Minimal

## ⚠️ Sorumluluk Reddi

**ÖNEMLİ YASAL BİLDİRİM:**

Bu eklenti **YALNIZCA EĞİTİM ve BİLGİLENDİRME amaçlıdır**. Finansal tavsiye, yatırım tavsiyesi veya trading tavsiyesi DEĞİLDİR.

- ❌ Bu kar garantisi DEĞILDIR
- ❌ Geçmiş performans gelecek sonuçları göstermez
- ❌ Kripto trading YÜKSEK RİSK içerir
- ❌ Tüm yatırımınızı kaybedebilirsiniz

**Her zaman:**
- ✅ Kendi araştırmanızı yapın
- ✅ Kaybedebileceğinizden fazlasını yatırmayın
- ✅ Uygun risk yönetimi kullanın
- ✅ Lisanslı finansal danışmanlarla görüşün
- ✅ Sorumlu trading yapın

## 📄 Lisans

MIT License - Değiştirme ve dağıtma konusunda özgürsünüz.

## 💬 Destek

- 🐛 **Hata Raporları**: [Issue aç](https://github.com/PrivyXe/binance-signal-analyzer/issues)
- 💡 **Özellik İstekleri**: [Özellik talep et](https://github.com/PrivyXe/binance-signal-analyzer/issues)

---

<div align="center">

### ⭐ Faydalı bulduysanız yıldız verin!

Tutkulu traderlar tarafından ❤️ ile yapıldı

**İyi Trading'ler! 📈🚀**

*(Ama unutmayın: Sorumlu trading yapın ve kaybedebileceğinizden fazlasını riske atmayın!)*

</div>


