(function(){"use strict";class T{static SELECTORS=["#chart-container",".chart-container",'[class*="chart-container"]','[class*="ChartContainer"]','[id*="tradingview"]','[class*="tradingview"]',"#tv_chart_container",".tv-lightweight-charts"];static findContainer(){for(const e of this.SELECTORS){const n=document.querySelector(e);if(n&&n.getBoundingClientRect().width>300)return n}const t=Array.from(document.querySelectorAll("canvas"));for(const e of t){const n=e.getBoundingClientRect();if(n.width>400&&n.height>250)return e.parentElement||e}return null}static extractSymbol(){const t=window.location.pathname,e=t.match(/\/trade\/([A-Za-z0-9_]+)/);if(e&&e[1])return e[1].replace("_","").toUpperCase();const n=t.match(/\/futures\/([A-Za-z0-9_]+)/);if(n&&n[1])return n[1].replace("_","").toUpperCase();const a=document.querySelector("title");if(a&&a.innerText){const o=a.innerText.match(/([A-Z0-9]{3,10}\/[A-Z0-9]{3,10}|[A-Z0-9]{5,12})/);if(o&&o[1])return o[1].replace("/","").replace("_","").toUpperCase()}return"BTCUSDT"}static onSymbolChange(t){let e=this.extractSymbol();const n=setInterval(()=>{const a=this.extractSymbol();a&&a!==e&&(e=a,t(a))},1500);return()=>clearInterval(n)}}class C{canvas=null;ctx=null;container=null;currentAnalysis=null;settings=null;animationFrameId=null;init(){if(this.container=T.findContainer(),!this.container)return!1;const t=document.getElementById("bsa-chart-overlay");return t&&t.remove(),this.canvas=document.createElement("canvas"),this.canvas.id="bsa-chart-overlay",this.canvas.style.position="absolute",this.canvas.style.top="0",this.canvas.style.left="0",this.canvas.style.width="100%",this.canvas.style.height="100%",this.canvas.style.pointerEvents="none",this.canvas.style.zIndex="20",this.ctx=this.canvas.getContext("2d"),window.getComputedStyle(this.container).position==="static"&&(this.container.style.position="relative"),this.container.appendChild(this.canvas),this.handleResize(),window.addEventListener("resize",()=>this.handleResize()),!0}updateData(t,e){this.currentAnalysis=t,this.settings=e,this.render()}handleResize(){if(!this.canvas||!this.container)return;const t=this.container.getBoundingClientRect(),e=window.devicePixelRatio||1;this.canvas.width=t.width*e,this.canvas.height=t.height*e,this.ctx&&(this.ctx.resetTransform(),this.ctx.scale(e,e)),this.render()}render(){!this.canvas||!this.ctx||!this.container||!this.currentAnalysis||(this.animationFrameId&&cancelAnimationFrame(this.animationFrameId),this.animationFrameId=requestAnimationFrame(()=>{if(!this.ctx||!this.canvas||!this.container||!this.currentAnalysis)return;const t=this.container.getBoundingClientRect(),e=t.width,n=t.height;this.ctx.clearRect(0,0,e,n);const a=this.settings?.overlay;if(!a)return;const{currentPrice:o,recommendation:i,srLevels:r,signal:d}=this.currentAnalysis,c=[o,i.stopLoss,i.takeProfit1,i.takeProfit2,...r.map(l=>l.price)].filter(l=>l&&l>0);if(c.length===0)return;const h=Math.min(...c),u=Math.max(...c),b=u-h,g=b>0?b*.25:o*.05,y=h-g,S=u+g-y;if(S<=0)return;const f=n*.12,m=n*.28,p=n-f-m,s=l=>{const v=(l-y)/S;return f+p*(1-v)};if(a.showSRLines&&r.length>0&&r.forEach(l=>{const v=s(l.price);if(v<f||v>n-m)return;const x=l.type==="SUPPORT",E=x?"rgba(16, 185, 129, 0.45)":"rgba(239, 68, 68, 0.45)";this.drawLineWithTag(v,e,E,`${l.label} $${l.price.toLocaleString()}`,x?"#065f46":"#991b1b",[3,3])}),a.showTPSLLines&&i.type!=="HOLD"){if(i.stopLoss>0){const l=s(i.stopLoss);l>=f&&l<=n-m&&this.drawLineWithTag(l,e,"rgba(239, 68, 68, 0.85)",`🛑 SL $${i.stopLoss.toLocaleString()}`,"#ef4444",[5,4])}if(i.takeProfit1>0){const l=s(i.takeProfit1);l>=f&&l<=n-m&&this.drawLineWithTag(l,e,"rgba(16, 185, 129, 0.85)",`🎯 TP1 $${i.takeProfit1.toLocaleString()}`,"#10b981",[5,4])}}a.showSignalBadge&&this.drawCleanSignalHUD(d,o,f)}))}drawLineWithTag(t,e,n,a,o,i=[]){if(!this.ctx)return;this.ctx.save(),this.ctx.setLineDash(i),this.ctx.strokeStyle=n,this.ctx.lineWidth=1.2,this.ctx.beginPath(),this.ctx.moveTo(30,t),this.ctx.lineTo(e-85,t),this.ctx.stroke(),this.ctx.setLineDash([]),this.ctx.fillStyle=o;const r=95,d=16,c=e-r-8,h=t-d/2;this.ctx.beginPath(),this.ctx.roundRect(c,h,r,d,3),this.ctx.fill(),this.ctx.fillStyle="#ffffff",this.ctx.font="bold 9px sans-serif",this.ctx.textAlign="center",this.ctx.textBaseline="middle",this.ctx.fillText(a,c+r/2,t),this.ctx.restore()}drawCleanSignalHUD(t,e,n){if(!this.ctx)return;this.ctx.save();const a=t==="STRONG_BUY"||t==="BUY",o=t==="STRONG_SELL"||t==="SELL",i=a?"rgba(6, 78, 59, 0.85)":o?"rgba(127, 29, 29, 0.85)":"rgba(30, 41, 59, 0.85)",r=a?"#10b981":o?"#ef4444":"#64748b",d=a?`🚀 SIGNAL: ${t}`:o?`🔻 SIGNAL: ${t}`:`⚖️ SIGNAL: ${t}`,c=140,h=24,u=14,b=n+8;this.ctx.fillStyle=i,this.ctx.strokeStyle=r,this.ctx.lineWidth=1,this.ctx.beginPath(),this.ctx.roundRect(u,b,c,h,6),this.ctx.fill(),this.ctx.stroke(),this.ctx.fillStyle="#ffffff",this.ctx.font="bold 10px sans-serif",this.ctx.textAlign="center",this.ctx.textBaseline="middle",this.ctx.fillText(d,u+c/2,b+h/2),this.ctx.restore()}}class w{panelElement=null;isMinimized=!1;onTimeframeChangeCallback;onRefreshCallback;lastAnalysis=null;init(t,e){this.onTimeframeChangeCallback=t,this.onRefreshCallback=e,!document.getElementById("bsa-floating-panel")&&(this.panelElement=document.createElement("div"),this.panelElement.id="bsa-floating-panel",this.panelElement.className="bsa-panel",this.panelElement.innerHTML=`
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
    `,document.body.appendChild(this.panelElement),this.setupEvents(),this.makeDraggable())}setupEvents(){const t=document.getElementById("bsa-btn-min"),e=document.getElementById("bsa-btn-close"),n=document.getElementById("bsa-timeframe"),a=document.getElementById("bsa-btn-refresh"),o=document.getElementById("bsa-btn-options"),i=document.getElementById("bsa-btn-set-alert"),r=document.getElementById("bsa-body");t?.addEventListener("click",()=>{this.isMinimized=!this.isMinimized,r&&(r.style.display=this.isMinimized?"none":"block"),t&&(t.innerText=this.isMinimized?"+":"−")}),e?.addEventListener("click",()=>{this.panelElement&&(this.panelElement.style.display="none")}),n?.addEventListener("change",d=>{const c=d.target.value;this.onTimeframeChangeCallback&&this.onTimeframeChangeCallback(c)}),a?.addEventListener("click",()=>{this.onRefreshCallback&&this.onRefreshCallback()}),o?.addEventListener("click",()=>{chrome.runtime.openOptionsPage&&chrome.runtime.openOptionsPage()}),i?.addEventListener("click",async()=>{if(!this.lastAnalysis)return;const{symbol:d,recommendation:c,currentPrice:h}=this.lastAnalysis,b=c.type==="LONG"?"LONG":"SHORT";try{await chrome.runtime.sendMessage({type:"CREATE_TRADE_POSITION",payload:{symbol:d,side:b,entryPrice:c.entryPrice||h,takeProfit:c.takeProfit1,stopLoss:c.stopLoss}}),i&&(i.innerText="✅ Alert Active",i.style.background="#10b981",setTimeout(()=>{i&&(i.innerText="🔔 Set Alert",i.style.background="")},3e3))}catch(g){console.error("Failed to set alert:",g)}})}makeDraggable(){const t=document.getElementById("bsa-header");if(!t||!this.panelElement)return;let e=!1,n=0,a=0,o=0,i=0;t.addEventListener("mousedown",r=>{if(r.target.tagName==="BUTTON")return;e=!0,n=r.clientX,a=r.clientY;const d=this.panelElement.getBoundingClientRect();o=d.left,i=d.top,document.body.style.userSelect="none"}),window.addEventListener("mousemove",r=>{if(!e||!this.panelElement)return;const d=r.clientX-n,c=r.clientY-a;this.panelElement.style.left=`${Math.max(10,o+d)}px`,this.panelElement.style.top=`${Math.max(10,i+c)}px`,this.panelElement.style.right="auto"}),window.addEventListener("mouseup",()=>{e=!1,document.body.style.userSelect="auto"})}update(t,e){if(this.lastAnalysis=t,!this.panelElement)return;const n=document.getElementById("bsa-symbol"),a=document.getElementById("bsa-price");n&&(n.innerText=t.symbol),a&&(a.innerText=`$${t.currentPrice.toLocaleString(void 0,{minimumFractionDigits:2})}`);const o=document.getElementById("bsa-timeframe");o&&o.value!==t.timeframe&&(o.value=t.timeframe);const i=document.getElementById("bsa-signal-pill");i&&(i.className=`bsa-signal-pill bsa-signal-${t.signal.toLowerCase().replace("_","-")}`,i.innerText=t.signal.replace("_"," "));const r=document.getElementById("bsa-score-bar");if(r){const p=(t.compositeScore+100)/2;r.style.width=`${p}%`,r.style.backgroundColor=t.compositeScore>0?"#10b981":t.compositeScore<0?"#ef4444":"#6b7280"}const d=document.getElementById("bsa-trend-text");d&&(d.innerText=`Trend: ${t.trend}`);const c=document.getElementById("bsa-confidence-text");c&&(c.innerText=`Confidence: ${t.confidence}`);const h=t.recommendation,u=document.getElementById("bsa-rec-entry"),b=document.getElementById("bsa-rec-sl"),g=document.getElementById("bsa-rec-tp1"),y=document.getElementById("bsa-rec-tp2"),B=document.getElementById("bsa-rec-lev"),S=document.getElementById("bsa-rec-rr");u&&(u.innerText=`$${h.entryPrice.toLocaleString()}`),b&&(b.innerText=`$${h.stopLoss.toLocaleString()}`),g&&(g.innerText=`$${h.takeProfit1.toLocaleString()}`),y&&(y.innerText=`$${h.takeProfit2.toLocaleString()}`),B&&(B.innerText=`${h.suggestedLeverage}x`),S&&(S.innerText=`1:${h.riskRewardRatio}`);const f=document.getElementById("bsa-indicators-list");if(f){const p=[],s=t.indicators;s.rsi&&s.rsi.value!==null&&p.push(`
          <div class="bsa-ind-item">
            <span>RSI (14): <strong>${s.rsi.value}</strong></span>
            <span class="bsa-pill-mini bsa-pill-${s.rsi.state.toLowerCase()}">${s.rsi.state}</span>
          </div>
        `),s.ema&&s.ema.fast!==null&&p.push(`
          <div class="bsa-ind-item">
            <span>EMA (${s.ema.fast}/${s.ema.slow}): <strong>${s.ema.trend}</strong></span>
            <span class="bsa-pill-mini ${s.ema.crossover!=="NONE"?"bsa-pill-gold":""}">${s.ema.crossover}</span>
          </div>
        `),s.macd&&s.macd.macd!==null&&p.push(`
          <div class="bsa-ind-item">
            <span>MACD Hist: <strong>${s.macd.histogram}</strong></span>
            <span class="bsa-pill-mini bsa-pill-${s.macd.trend.toLowerCase()}">${s.macd.trend}</span>
          </div>
        `),s.bb&&s.bb.middle!==null&&p.push(`
          <div class="bsa-ind-item">
            <span>Bollinger %B: <strong>${s.bb.percentB}</strong></span>
            <span class="bsa-pill-mini ${s.bb.isSqueezed?"bsa-pill-squeeze":""}">${s.bb.isSqueezed?"SQUEEZE":s.bb.position}</span>
          </div>
        `),s.adx&&s.adx.adx!==null&&p.push(`
          <div class="bsa-ind-item">
            <span>ADX: <strong>${s.adx.adx}</strong> (${s.adx.trendStrength})</span>
            <span class="bsa-pill-mini">${s.adx.trendDirection}</span>
          </div>
        `),f.innerHTML=p.join("")}const m=t.orderBook;if(m){const p=document.getElementById("bsa-depth-bid"),s=document.getElementById("bsa-depth-ask"),l=document.getElementById("bsa-bidask-ratio"),v=document.getElementById("bsa-depth-pressure"),x=m.totalBidVolume+m.totalAskVolume,E=x>0?m.totalBidVolume/x*100:50;p&&(p.style.width=`${E}%`),s&&(s.style.width=`${100-E}%`),l&&(l.innerText=`B/A Ratio: ${m.bidAskRatio}`),v&&(v.innerText=m.pressure.replace("_"," "),v.className=m.pressure==="BUY_PRESSURE"?"text-green":m.pressure==="SELL_PRESSURE"?"text-red":"")}}}const R={apiKey:"",apiSecret:"",symbol:"BTCUSDT",interval:"4h",candleLimit:200,updateInterval:5,sound:{enabled:!0,volume:.7,playOnBuy:!0,playOnSell:!0,playOnTP:!0,playOnSL:!0},scanner:{enabled:!0,intervalMinutes:3,timeframe:"15m",minScoreThreshold:25,watchlist:["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT","DOGEUSDT","ADAUSDT","AVAXUSDT","LINKUSDT","NEARUSDT"]},indicators:{rsi:!0,ema:!0,sma:!1,macd:!0,bb:!0,stoch:!1,adx:!0,atr:!0,sar:!1,volume:!0,srLevels:!0,fibonacci:!0},indicatorParams:{rsi:{period:14,oversold:30,overbought:70},ema:{fast:20,slow:50},sma:{fast:20,slow:50},macd:{fast:12,slow:26,signal:9},bb:{period:20,stddev:2},stoch:{k:14,d:3,oversold:20,overbought:80},adx:{period:14,threshold:25},atr:{period:14,multiplierSL:1.5,multiplierTP:2.5},sar:{step:.02,max:.2},volume:{period:20}},overlay:{showSRLines:!0,showTPSLLines:!0,showFibonacci:!0,showSignalBadge:!0,showBuySellMarkers:!0,showVolumeProfile:!0,opacity:.85},priceAlerts:[],positions:[]};console.log("[Binance Signal Analyzer] Content script loaded.");class A{overlay=new C;panel=new w;currentSettings=R;activeSymbol="BTCUSDT";activeTimeframe="4h";updateTimer=null;async start(){await this.loadSettings(),this.activeSymbol=T.extractSymbol(),this.activeTimeframe=this.currentSettings.interval||"4h",this.panel.init(t=>this.handleTimeframeChange(t),()=>this.fetchAndRefresh()),this.initOverlayWithRetry(),T.onSymbolChange(t=>{console.log("[Content] Symbol changed to:",t),this.activeSymbol=t,this.fetchAndRefresh()}),this.startPolling()}async loadSettings(){try{const t=await chrome.runtime.sendMessage({type:"GET_SETTINGS"});t&&t.success&&t.data&&(this.currentSettings=t.data,this.activeTimeframe=this.currentSettings.interval||"4h")}catch(t){console.warn("[Content] Could not load settings, using defaults:",t)}}initOverlayWithRetry(){let t=0;const e=15,n=setInterval(()=>{t++;const a=this.overlay.init();(a||t>=e)&&(clearInterval(n),a&&console.log("[Content] Overlay attached successfully."))},1e3)}async fetchAndRefresh(){try{const t=await chrome.runtime.sendMessage({type:"FETCH_ANALYSIS",payload:{symbol:this.activeSymbol,interval:this.activeTimeframe}});if(t&&t.success&&t.data){const e=t.data;this.panel.update(e,this.currentSettings),this.overlay.updateData(e,this.currentSettings)}}catch(t){console.error("[Content] Analysis fetch failed:",t)}}handleTimeframeChange(t){this.activeTimeframe=t,this.fetchAndRefresh()}startPolling(){this.updateTimer&&clearInterval(this.updateTimer),this.fetchAndRefresh();const t=this.currentSettings.updateInterval||5;this.updateTimer=window.setInterval(()=>{this.fetchAndRefresh()},t*1e3)}}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>{new A().start()}):new A().start()})();
