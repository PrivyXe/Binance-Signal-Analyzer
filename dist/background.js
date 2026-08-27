const x = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "BNBUSDT",
  "XRPUSDT",
  "DOGEUSDT",
  "ADAUSDT",
  "AVAXUSDT",
  "LINKUSDT",
  "NEARUSDT"
], v = {
  apiKey: "",
  apiSecret: "",
  symbol: "BTCUSDT",
  interval: "4h",
  candleLimit: 200,
  updateInterval: 5,
  sound: {
    enabled: !0,
    volume: 0.7,
    playOnBuy: !0,
    playOnSell: !0,
    playOnTP: !0,
    playOnSL: !0
  },
  scanner: {
    enabled: !0,
    intervalMinutes: 3,
    timeframe: "15m",
    minScoreThreshold: 25,
    watchlist: x
  },
  indicators: {
    rsi: !0,
    ema: !0,
    sma: !1,
    macd: !0,
    bb: !0,
    stoch: !1,
    adx: !0,
    atr: !0,
    sar: !1,
    volume: !0,
    srLevels: !0,
    fibonacci: !0
  },
  indicatorParams: {
    rsi: { period: 14, oversold: 30, overbought: 70 },
    ema: { fast: 20, slow: 50 },
    sma: { fast: 20, slow: 50 },
    macd: { fast: 12, slow: 26, signal: 9 },
    bb: { period: 20, stddev: 2 },
    stoch: { k: 14, d: 3, oversold: 20, overbought: 80 },
    adx: { period: 14, threshold: 25 },
    atr: { period: 14, multiplierSL: 1.5, multiplierTP: 2.5 },
    sar: { step: 0.02, max: 0.2 },
    volume: { period: 20 }
  },
  overlay: {
    showSRLines: !0,
    showTPSLLines: !0,
    showFibonacci: !0,
    showSignalBadge: !0,
    showBuySellMarkers: !0,
    showVolumeProfile: !0,
    opacity: 0.85
  },
  priceAlerts: [],
  positions: []
}, C = "binance_signal_analyzer_settings";
class y {
  /**
   * Load user settings with fallback to defaults
   */
  static async getSettings() {
    return new Promise((t) => {
      chrome.storage.local.get([C, "settings"], (n) => {
        const e = n[C] || n.settings;
        if (!e) {
          t({ ...v });
          return;
        }
        const o = {
          ...v,
          ...e,
          indicators: {
            ...v.indicators,
            ...e.indicators || {}
          },
          indicatorParams: {
            ...v.indicatorParams,
            ...e.indicatorParams || {}
          },
          overlay: {
            ...v.overlay,
            ...e.overlay || {}
          }
        };
        t(o);
      });
    });
  }
  /**
   * Save user settings partially or fully
   */
  static async saveSettings(t) {
    const n = await this.getSettings(), e = {
      ...n,
      ...t,
      indicators: {
        ...n.indicators,
        ...t.indicators || {}
      },
      indicatorParams: {
        ...n.indicatorParams,
        ...t.indicatorParams || {}
      },
      overlay: {
        ...n.overlay,
        ...t.overlay || {}
      }
    };
    return new Promise((o) => {
      chrome.storage.local.set({ [C]: e }, () => {
        o(e);
      });
    });
  }
  /**
   * Reset settings to factory defaults
   */
  static async resetSettings() {
    return new Promise((t) => {
      chrome.storage.local.set({ [C]: v }, () => {
        t({ ...v });
      });
    });
  }
}
class b {
  static SPOT_BASE_URL = "https://api.binance.com/api/v3";
  static FUTURES_BASE_URL = "https://fapi.binance.com/fapi/v1";
  /**
   * Fetch Klines (Candlestick data)
   */
  static async fetchKlines(t, n = "4h", e = 200, o = !1) {
    const r = o ? this.FUTURES_BASE_URL : this.SPOT_BASE_URL, f = t.replace(/[^a-zA-Z0-9]/g, "").toUpperCase(), i = `${r}/klines?symbol=${f}&interval=${n}&limit=${e}`;
    try {
      const h = await fetch(i);
      if (!h.ok) {
        if (o)
          return this.fetchKlines(t, n, e, !1);
        throw new Error(`Binance API Error: ${h.status} ${h.statusText}`);
      }
      return (await h.json()).map((c) => ({
        openTime: c[0],
        open: parseFloat(c[1]),
        high: parseFloat(c[2]),
        low: parseFloat(c[3]),
        close: parseFloat(c[4]),
        volume: parseFloat(c[5]),
        closeTime: c[6]
      }));
    } catch (h) {
      return console.error("[BinanceApiService] Failed to fetch klines:", h), [];
    }
  }
  /**
   * Fetch 24hr Ticker Price Change Statistics
   */
  static async fetch24hrTicker(t, n = !1) {
    const e = n ? this.FUTURES_BASE_URL : this.SPOT_BASE_URL, o = t.replace(/[^a-zA-Z0-9]/g, "").toUpperCase(), r = `${e}/ticker/24hr?symbol=${o}`;
    try {
      const f = await fetch(r);
      if (!f.ok) return null;
      const i = await f.json();
      return {
        priceChangePercent: parseFloat(i.priceChangePercent),
        lastPrice: parseFloat(i.lastPrice)
      };
    } catch {
      return null;
    }
  }
  /**
   * Fetch Order Book Depth data
   */
  static async fetchOrderBook(t, n = 100, e = !1) {
    const o = e ? this.FUTURES_BASE_URL : this.SPOT_BASE_URL, r = t.replace(/[^a-zA-Z0-9]/g, "").toUpperCase(), f = `${o}/depth?symbol=${r}&limit=${n}`;
    try {
      const i = await fetch(f);
      if (!i.ok) return null;
      const h = await i.json(), l = (h.bids || []).map((L) => ({
        price: parseFloat(L[0]),
        quantity: parseFloat(L[1])
      })), c = (h.asks || []).map((L) => ({
        price: parseFloat(L[0]),
        quantity: parseFloat(L[1])
      }));
      if (l.length === 0 || c.length === 0) return null;
      const s = l.reduce((L, A) => L + A.quantity, 0), u = c.reduce((L, A) => L + A.quantity, 0), S = l.reduce((L, A) => L + A.price * A.quantity, 0), g = c.reduce((L, A) => L + A.price * A.quantity, 0), p = u > 0 ? s / u : 1, T = g > 0 ? S / g : 1, m = Math.round((p + T) / 2 * 100) / 100;
      let d = "NEUTRAL";
      m >= 1.2 ? d = "BUY_PRESSURE" : m <= 0.8 && (d = "SELL_PRESSURE");
      const R = c[0].price - l[0].price, w = l[0].price > 0 ? R / l[0].price * 100 : 0;
      return {
        bids: l.slice(0, 10),
        asks: c.slice(0, 10),
        bidAskRatio: m,
        pressure: d,
        totalBidVolume: Math.round(s * 100) / 100,
        totalAskVolume: Math.round(u * 100) / 100,
        totalBidValue: Math.round(S),
        totalAskValue: Math.round(g),
        spread: Math.round(R * 100) / 100,
        spreadPercent: Math.round(w * 1e3) / 1e3
      };
    } catch (i) {
      return console.error("[BinanceApiService] Failed to fetch depth:", i), null;
    }
  }
}
function I(a, t = 14, n = 30, e = 70) {
  if (!a || a.length < t + 1)
    return { value: null, state: "NEUTRAL", score: 0 };
  let o = 0, r = 0;
  for (let S = 1; S <= t; S++) {
    const g = a[S] - a[S - 1];
    g >= 0 ? o += g : r += Math.abs(g);
  }
  let f = o / t, i = r / t;
  for (let S = t + 1; S < a.length; S++) {
    const g = a[S] - a[S - 1], p = g >= 0 ? g : 0, T = g < 0 ? Math.abs(g) : 0;
    f = (f * (t - 1) + p) / t, i = (i * (t - 1) + T) / t;
  }
  if (i === 0)
    return { value: 100, state: "OVERBOUGHT", score: -100 };
  const l = 100 - 100 / (1 + f / i), c = Math.round(l * 100) / 100;
  let s = "NEUTRAL", u = 0;
  return c <= n ? (s = "OVERSOLD", u = Math.min(100, (n - c) * 3 + 40)) : c >= e ? (s = "OVERBOUGHT", u = -Math.min(100, (c - e) * 3 + 40)) : c > 50 ? (s = "BULLISH", u = (c - 50) / (e - 50) * 35) : (s = "BEARISH", u = -((50 - c) / (50 - n)) * 35), {
    value: c,
    state: s,
    score: Math.round(u)
  };
}
function O(a, t) {
  if (!a || a.length < t) return [];
  const n = 2 / (t + 1), e = [];
  let o = 0;
  for (let f = 0; f < t; f++)
    o += a[f];
  let r = o / t;
  e.push(r);
  for (let f = t; f < a.length; f++)
    r = a[f] * n + r * (1 - n), e.push(r);
  return e;
}
function $(a, t = 20, n = 50) {
  if (!a || a.length < n + 2)
    return {
      fast: null,
      slow: null,
      trend: "NEUTRAL",
      crossover: "NONE",
      score: 0
    };
  const e = O(a, t), o = O(a, n);
  if (e.length < 2 || o.length < 2)
    return {
      fast: null,
      slow: null,
      trend: "NEUTRAL",
      crossover: "NONE",
      score: 0
    };
  const r = e[e.length - 1], f = e[e.length - 2], i = o[o.length - 1], h = o[o.length - 2];
  let l = "NONE";
  f <= h && r > i ? l = "BULLISH_CROSS" : f >= h && r < i && (l = "BEARISH_CROSS");
  const c = a[a.length - 1];
  let s = "NEUTRAL", u = 0;
  return r > i && c > r ? (s = "UPTREND", u = 45) : r < i && c < r ? (s = "DOWNTREND", u = -45) : r > i ? (s = "UPTREND", u = 25) : r < i && (s = "DOWNTREND", u = -25), l === "BULLISH_CROSS" && (u += 40), l === "BEARISH_CROSS" && (u -= 40), {
    fast: Math.round(r * 100) / 100,
    slow: Math.round(i * 100) / 100,
    trend: s,
    crossover: l,
    score: Math.max(-100, Math.min(100, u))
  };
}
function F(a, t = 20, n = 50) {
  if (!a || a.length < n)
    return {
      fast: null,
      slow: null,
      trend: "NEUTRAL",
      score: 0
    };
  const e = a.slice(-t), o = a.slice(-n), r = e.reduce((l, c) => l + c, 0) / t, f = o.reduce((l, c) => l + c, 0) / n;
  let i = "NEUTRAL", h = 0;
  return r > f ? (i = "UPTREND", h = 30) : r < f && (i = "DOWNTREND", h = -30), {
    fast: Math.round(r * 100) / 100,
    slow: Math.round(f * 100) / 100,
    trend: i,
    score: h
  };
}
function Y(a, t = 12, n = 26, e = 9) {
  if (!a || a.length < n + e + 2)
    return {
      macd: null,
      signal: null,
      histogram: null,
      crossover: "NONE",
      trend: "NEUTRAL",
      score: 0
    };
  const o = O(a, t), r = O(a, n), f = n - t, i = [];
  for (let d = 0; d < r.length; d++) {
    const R = o[d + f], w = r[d];
    R !== void 0 && w !== void 0 && i.push(R - w);
  }
  if (i.length < e + 2)
    return {
      macd: null,
      signal: null,
      histogram: null,
      crossover: "NONE",
      trend: "NEUTRAL",
      score: 0
    };
  const h = O(i, e);
  if (h.length < 2)
    return {
      macd: null,
      signal: null,
      histogram: null,
      crossover: "NONE",
      trend: "NEUTRAL",
      score: 0
    };
  const l = i[i.length - 1], c = i[i.length - 2], s = h[h.length - 1], u = h[h.length - 2], S = l - s, g = c - u;
  let p = "NONE";
  c <= u && l > s ? p = "BULLISH_CROSS" : c >= u && l < s && (p = "BEARISH_CROSS");
  let T = "NEUTRAL", m = 0;
  return l > s && S > 0 ? (T = "BULLISH", m = 35, S > g && (m += 15)) : l < s && S < 0 && (T = "BEARISH", m = -35, S < g && (m -= 15)), p === "BULLISH_CROSS" && (m += 40), p === "BEARISH_CROSS" && (m -= 40), {
    macd: Math.round(l * 1e3) / 1e3,
    signal: Math.round(s * 1e3) / 1e3,
    histogram: Math.round(S * 1e3) / 1e3,
    crossover: p,
    trend: T,
    score: Math.max(-100, Math.min(100, m))
  };
}
function W(a, t = 20, n = 2) {
  if (!a || a.length < t)
    return {
      upper: null,
      middle: null,
      lower: null,
      bandwidth: null,
      percentB: null,
      position: "NEUTRAL",
      isSqueezed: !1,
      score: 0
    };
  const e = a.slice(-t), o = e.reduce((p, T) => p + T, 0) / t, r = e.reduce((p, T) => p + Math.pow(T - o, 2), 0) / t, f = Math.sqrt(r), i = o + n * f, h = o - n * f, l = a[a.length - 1], c = o > 0 ? (i - h) / o * 100 : 0, s = i !== h ? (l - h) / (i - h) : 0.5;
  let u = "NEUTRAL", S = 0;
  l >= i ? (u = "ABOVE_UPPER", S = -50) : l <= h ? (u = "BELOW_LOWER", S = 50) : l > o ? (u = "UPPER_HALF", S = 15) : (u = "LOWER_HALF", S = -15);
  const g = c < 4;
  return {
    upper: Math.round(i * 100) / 100,
    middle: Math.round(o * 100) / 100,
    lower: Math.round(h * 100) / 100,
    bandwidth: Math.round(c * 100) / 100,
    percentB: Math.round(s * 1e3) / 1e3,
    position: u,
    isSqueezed: g,
    score: S
  };
}
function q(a, t = 14, n = 3, e = 20, o = 80) {
  if (!a || a.length < t + n + 2)
    return {
      k: null,
      d: null,
      state: "NEUTRAL",
      crossover: "NONE",
      score: 0
    };
  const r = [];
  for (let g = t - 1; g < a.length; g++) {
    const p = a.slice(g - t + 1, g + 1), T = Math.max(...p.map((R) => R.high)), m = Math.min(...p.map((R) => R.low)), d = a[g].close;
    if (T === m)
      r.push(50);
    else {
      const R = (d - m) / (T - m) * 100;
      r.push(R);
    }
  }
  const f = [];
  for (let g = n - 1; g < r.length; g++) {
    const T = r.slice(g - n + 1, g + 1).reduce((m, d) => m + d, 0) / n;
    f.push(T);
  }
  if (f.length < 2)
    return {
      k: null,
      d: null,
      state: "NEUTRAL",
      crossover: "NONE",
      score: 0
    };
  const i = r[r.length - 1], h = r[r.length - 2], l = f[f.length - 1], c = f[f.length - 2];
  let s = "NONE";
  h <= c && i > l ? s = "BULLISH_CROSS" : h >= c && i < l && (s = "BEARISH_CROSS");
  let u = "NEUTRAL", S = 0;
  return i <= e && l <= e ? (u = "OVERSOLD", S = 45) : i >= o && l >= o ? (u = "OVERBOUGHT", S = -45) : i > l ? S = 15 : S = -15, s === "BULLISH_CROSS" && i <= e + 10 && (S += 35), s === "BEARISH_CROSS" && i >= o - 10 && (S -= 35), {
    k: Math.round(i * 100) / 100,
    d: Math.round(l * 100) / 100,
    state: u,
    crossover: s,
    score: Math.max(-100, Math.min(100, S))
  };
}
function z(a, t = 14, n = 25) {
  if (!a || a.length < t * 2 + 2)
    return {
      adx: null,
      plusDI: null,
      minusDI: null,
      trendStrength: "WEAK",
      trendDirection: "NEUTRAL",
      score: 0
    };
  const e = [], o = [], r = [];
  for (let m = 1; m < a.length; m++) {
    const d = a[m], R = a[m - 1], w = Math.max(
      d.high - d.low,
      Math.abs(d.high - R.close),
      Math.abs(d.low - R.close)
    );
    e.push(w);
    const L = d.high - R.high, A = R.low - d.low;
    L > A && L > 0 ? o.push(L) : o.push(0), A > L && A > 0 ? r.push(A) : r.push(0);
  }
  let f = e.slice(0, t).reduce((m, d) => m + d, 0), i = o.slice(0, t).reduce((m, d) => m + d, 0), h = r.slice(0, t).reduce((m, d) => m + d, 0);
  const l = [];
  let c = 0, s = 0;
  for (let m = t; m < e.length; m++) {
    f = f - f / t + e[m], i = i - i / t + o[m], h = h - h / t + r[m], c = f > 0 ? i / f * 100 : 0, s = f > 0 ? h / f * 100 : 0;
    const d = c + s, R = d > 0 ? Math.abs(c - s) / d * 100 : 0;
    l.push(R);
  }
  if (l.length < t)
    return {
      adx: null,
      plusDI: Math.round(c * 100) / 100,
      minusDI: Math.round(s * 100) / 100,
      trendStrength: "WEAK",
      trendDirection: c > s ? "BULLISH" : "BEARISH",
      score: 0
    };
  let u = l.slice(0, t).reduce((m, d) => m + d, 0) / t;
  for (let m = t; m < l.length; m++)
    u = (u * (t - 1) + l[m]) / t;
  let S = "WEAK";
  u >= 50 ? S = "VERY_STRONG" : u >= n ? S = "STRONG" : u >= 20 && (S = "MODERATE");
  const g = c > s, p = g ? "BULLISH" : "BEARISH";
  let T = 0;
  return u >= n && (T = g ? Math.min(100, u / 50 * 60) : -Math.min(100, u / 50 * 60)), {
    adx: Math.round(u * 100) / 100,
    plusDI: Math.round(c * 100) / 100,
    minusDI: Math.round(s * 100) / 100,
    trendStrength: S,
    trendDirection: p,
    score: Math.round(T)
  };
}
function K(a, t = 14) {
  if (!a || a.length < t + 1)
    return {
      atr: null,
      volatility: "MODERATE",
      atrPercent: null
    };
  const n = [];
  for (let i = 1; i < a.length; i++) {
    const h = a[i], l = a[i - 1], c = Math.max(
      h.high - h.low,
      Math.abs(h.high - l.close),
      Math.abs(h.low - l.close)
    );
    n.push(c);
  }
  let e = n.slice(0, t).reduce((i, h) => i + h, 0) / t;
  for (let i = t; i < n.length; i++)
    e = (e * (t - 1) + n[i]) / t;
  const o = a[a.length - 1].close, r = o > 0 ? e / o * 100 : 0;
  let f = "MODERATE";
  return r > 3 ? f = "HIGH" : r < 1 && (f = "LOW"), {
    atr: Math.round(e * 1e3) / 1e3,
    volatility: f,
    atrPercent: Math.round(r * 100) / 100
  };
}
function X(a, t = 0.02, n = 0.2) {
  if (!a || a.length < 5)
    return {
      sar: null,
      trend: "BULLISH",
      reversal: !1,
      score: 0
    };
  let e = a[1].close >= a[0].close, o = e ? a[1].high : a[1].low, r = t, f = e ? a[0].low : a[0].high, i = !1;
  for (let l = 2; l < a.length; l++) {
    const c = a[l], s = a[l - 1], u = a[l - 2];
    f = f + r * (o - f), e ? (f = Math.min(f, s.low, u.low), c.low < f ? (e = !1, f = o, o = c.low, r = t, l === a.length - 1 && (i = !0)) : c.high > o && (o = c.high, r = Math.min(r + t, n))) : (f = Math.max(f, s.high, u.high), c.high > f ? (e = !0, f = o, o = c.high, r = t, l === a.length - 1 && (i = !0)) : c.low < o && (o = c.low, r = Math.min(r + t, n)));
  }
  const h = e ? i ? 50 : 30 : i ? -50 : -30;
  return {
    sar: Math.round(f * 100) / 100,
    trend: e ? "BULLISH" : "BEARISH",
    reversal: i,
    score: h
  };
}
function j(a, t = 20) {
  if (!a || a.length < t)
    return {
      current: a && a.length > 0 ? a[a.length - 1].volume : 0,
      sma: null,
      ratio: null,
      state: "NORMAL",
      score: 0
    };
  const n = a.map((u) => u.volume), e = n[n.length - 1], o = a[a.length - 1].close, r = a[a.length - 2].close, f = o >= r, h = n.slice(-t).reduce((u, S) => u + S, 0) / t, l = h > 0 ? e / h : 1;
  let c = "NORMAL", s = 0;
  return l >= 2.5 ? (c = "VERY_HIGH", s = f ? 40 : -40) : l >= 1.5 ? (c = "HIGH", s = f ? 25 : -25) : l < 0.6 && (c = "LOW", s = 0), {
    current: Math.round(e * 100) / 100,
    sma: Math.round(h * 100) / 100,
    ratio: Math.round(l * 100) / 100,
    state: c,
    score: s
  };
}
function Z(a, t = 5, n = 5, e = 0.5) {
  if (!a || a.length < t + n + 1)
    return [];
  const o = [], r = [];
  for (let s = t; s < a.length - n; s++) {
    const u = a[s].high, S = a[s].low;
    let g = !0, p = !0;
    for (let T = s - t; T <= s + n; T++)
      T !== s && (a[T].high >= u && (g = !1), a[T].low <= S && (p = !1));
    g && o.push(u), p && r.push(S);
  }
  const f = a[a.length - 1].close, i = (s) => {
    if (s.length === 0) return [];
    const u = [...s].sort((g, p) => g - p), S = [];
    for (const g of u) {
      let p = !1;
      for (const T of S) {
        const m = T.sum / T.count;
        if (Math.abs(g - m) / m * 100 <= e) {
          T.sum += g, T.count += 1, p = !0;
          break;
        }
      }
      p || S.push({ sum: g, count: 1 });
    }
    return S.map((g) => ({
      price: Math.round(g.sum / g.count * 100) / 100,
      touches: g.count
    }));
  }, h = i(
    o.filter((s) => s > f)
  ).sort((s, u) => s.price - u.price), l = i(
    r.filter((s) => s < f)
  ).sort((s, u) => u.price - s.price), c = [];
  return h.slice(0, 2).forEach((s, u) => {
    c.push({
      price: s.price,
      type: "RESISTANCE",
      strength: Math.min(5, s.touches + 1),
      touches: s.touches,
      label: `R${u + 1}`
    });
  }), l.slice(0, 2).forEach((s, u) => {
    c.push({
      price: s.price,
      type: "SUPPORT",
      strength: Math.min(5, s.touches + 1),
      touches: s.touches,
      label: `S${u + 1}`
    });
  }), c;
}
function J(a, t = 100) {
  if (!a || a.length < 20) return null;
  const n = a.slice(-Math.min(t, a.length));
  let e = n[0].high, o = n[0].low, r = 0, f = 0;
  n.forEach((s, u) => {
    s.high > e && (e = s.high, r = u), s.low < o && (o = s.low, f = u);
  });
  const i = e - o;
  if (i <= 0) return null;
  const h = r > f ? "UP" : "DOWN", c = [
    { ratio: 0, label: "0.0% (High)" },
    { ratio: 0.236, label: "23.6%" },
    { ratio: 0.382, label: "38.2%" },
    { ratio: 0.5, label: "50.0%" },
    { ratio: 0.618, label: "61.8% (Golden)" },
    { ratio: 0.786, label: "78.6%" },
    { ratio: 1, label: "100.0% (Low)" },
    { ratio: 1.618, label: "161.8% (Extension)" }
  ].map((s) => {
    let u;
    return h === "UP" ? u = e - i * s.ratio : u = o + i * s.ratio, {
      ratio: s.ratio,
      price: Math.round(u * 100) / 100,
      label: s.label
    };
  });
  return {
    high: Math.round(e * 100) / 100,
    low: Math.round(o * 100) / 100,
    trend: h,
    levels: c
  };
}
class G {
  /**
   * Run full technical analysis pipeline on candlestick and order book data
   */
  static analyze(t, n, e, o, r, f) {
    if (!e || e.length === 0)
      throw new Error("Candles data is empty");
    const i = e[e.length - 1].close, h = e.map((E) => E.close), l = r.indicatorParams, c = r.indicators, s = {}, u = [];
    if (c.rsi) {
      const E = I(
        h,
        l.rsi.period,
        l.rsi.oversold,
        l.rsi.overbought
      );
      s.rsi = E, u.push({ score: E.score, weight: 1.2 });
    }
    if (c.ema) {
      const E = $(h, l.ema.fast, l.ema.slow);
      s.ema = E, u.push({ score: E.score, weight: 1.5 });
    }
    if (c.sma) {
      const E = F(h, l.sma.fast, l.sma.slow);
      s.sma = E, u.push({ score: E.score, weight: 0.8 });
    }
    if (c.macd) {
      const E = Y(
        h,
        l.macd.fast,
        l.macd.slow,
        l.macd.signal
      );
      s.macd = E, u.push({ score: E.score, weight: 1.4 });
    }
    if (c.bb) {
      const E = W(h, l.bb.period, l.bb.stddev);
      s.bb = E, u.push({ score: E.score, weight: 1 });
    }
    if (c.stoch) {
      const E = q(
        e,
        l.stoch.k,
        l.stoch.d,
        l.stoch.oversold,
        l.stoch.overbought
      );
      s.stoch = E, u.push({ score: E.score, weight: 1 });
    }
    if (c.adx) {
      const E = z(e, l.adx.period, l.adx.threshold);
      s.adx = E, u.push({ score: E.score, weight: 1.3 });
    }
    if (c.atr) {
      const E = K(e, l.atr.period);
      s.atr = E;
    }
    if (c.sar) {
      const E = X(e, l.sar.step, l.sar.max);
      s.sar = E, u.push({ score: E.score, weight: 1.1 });
    }
    if (c.volume) {
      const E = j(e, l.volume.period);
      s.volume = E, u.push({ score: E.score, weight: 1 });
    }
    let S = [];
    c.srLevels && (S = Z(e), s.srLevels = S);
    let g = null;
    c.fibonacci && (g = J(e), s.fibonacci = g), o && (o.pressure === "BUY_PRESSURE" ? u.push({ score: 30, weight: 0.8 }) : o.pressure === "SELL_PRESSURE" && u.push({ score: -30, weight: 0.8 }));
    let p = 0, T = 0;
    for (const E of u)
      p += E.score * E.weight, T += E.weight;
    const m = T > 0 ? Math.round(p / T * 10) / 10 : 0;
    let d = "NEUTRAL";
    m >= 45 ? d = "STRONG_BUY" : m >= 20 ? d = "BUY" : m <= -45 ? d = "STRONG_SELL" : m <= -20 && (d = "SELL");
    let R = "SIDEWAYS";
    s.ema && s.ema.trend !== "NEUTRAL" ? R = s.ema.trend === "UPTREND" ? "BULLISH" : "BEARISH" : s.adx && s.adx.trendDirection !== "NEUTRAL" ? R = s.adx.trendDirection : m > 15 ? R = "BULLISH" : m < -15 && (R = "BEARISH");
    let w = "MEDIUM";
    const L = u.filter(
      (E) => m > 0 ? E.score > 10 : E.score < -10
    ).length, A = u.length > 0 ? L / u.length : 0;
    A >= 0.7 && Math.abs(m) >= 40 ? w = "HIGH" : (A < 0.4 || Math.abs(m) < 20) && (w = "LOW");
    const B = this.generateRecommendation(
      i,
      d,
      w,
      s,
      S,
      r
    ), U = this.generateHistoricalMarkers(e, r);
    return {
      symbol: t,
      timeframe: n,
      currentPrice: i,
      priceChange24h: f,
      timestamp: Date.now(),
      trend: R,
      signal: d,
      compositeScore: m,
      confidence: w,
      indicators: s,
      recommendation: B,
      orderBook: o,
      srLevels: S,
      fibonacci: g,
      signalMarkers: U
    };
  }
  /**
   * Build smart Take Profit / Stop Loss and Leverage plan
   */
  static generateRecommendation(t, n, e, o, r, f) {
    const i = n === "STRONG_BUY" || n === "BUY", h = n === "STRONG_SELL" || n === "SELL", l = i ? "LONG" : h ? "SHORT" : "HOLD", c = [];
    o.rsi && (o.rsi.state === "OVERSOLD" && c.push(`RSI Oversold Territory (${o.rsi.value})`), o.rsi.state === "OVERBOUGHT" && c.push(`RSI Overbought Territory (${o.rsi.value})`)), o.ema && o.ema.crossover !== "NONE" && c.push(
      o.ema.crossover === "BULLISH_CROSS" ? "EMA Golden Cross (Bullish Crossover)" : "EMA Death Cross (Bearish Crossover)"
    ), o.macd && o.macd.crossover !== "NONE" && c.push(
      o.macd.crossover === "BULLISH_CROSS" ? "MACD Bullish Histogram Crossover" : "MACD Bearish Histogram Crossover"
    ), o.bb?.isSqueezed && c.push("Bollinger Bands Volatility Squeeze Detected"), o.sar?.reversal && c.push(`Parabolic SAR Trend Reversal (${o.sar.trend})`), c.length === 0 && c.push("Consolidation / Neutral Market Conditions");
    const s = o.atr?.atr || t * 0.015, u = f.indicatorParams.atr.multiplierSL || 1.5, S = f.indicatorParams.atr.multiplierTP || 2.5, g = s * u, p = s * S;
    let T = 0, m = 0, d = 0, R = 0, w = 1;
    if (i) {
      const U = r.find((M) => M.type === "SUPPORT" && M.price < t);
      T = U ? Math.min(U.price * 0.995, t - g) : t - g;
      const E = r.find((M) => M.type === "RESISTANCE" && M.price > t);
      m = E ? E.price : t + p * 0.7, d = t + p * 1.3, R = t + p * 2, w = e === "HIGH" ? 5 : e === "MEDIUM" ? 3 : 2;
    } else if (h) {
      const U = r.find((M) => M.type === "RESISTANCE" && M.price > t);
      T = U ? Math.max(U.price * 1.005, t + g) : t + g;
      const E = r.find((M) => M.type === "SUPPORT" && M.price < t);
      m = E ? E.price : t - p * 0.7, d = t - p * 1.3, R = t - p * 2, w = e === "HIGH" ? 5 : e === "MEDIUM" ? 3 : 2;
    } else
      T = t - g, m = t + p, d = t + p * 1.5, R = t + p * 2, w = 1;
    const L = Math.abs(t - T), A = Math.abs(m - t), B = L > 0 ? Math.round(A / L * 100) / 100 : 1;
    return {
      type: l,
      entryPrice: Math.round(t * 100) / 100,
      stopLoss: Math.round(T * 100) / 100,
      takeProfit1: Math.round(m * 100) / 100,
      takeProfit2: Math.round(d * 100) / 100,
      takeProfit3: Math.round(R * 100) / 100,
      riskRewardRatio: B,
      suggestedLeverage: w,
      confidence: e,
      reasons: c
    };
  }
  /**
   * Scan candle history to detect precise Buy & Sell pivot markers for chart visualization
   */
  static generateHistoricalMarkers(t, n) {
    if (!t || t.length < 30) return [];
    const e = [], o = t.map((u) => u.close), r = n.indicatorParams.ema.fast || 20, f = n.indicatorParams.ema.slow || 50, i = O(o, r), h = O(o, f), l = f - r;
    let c = -10;
    const s = 6;
    for (let u = 30; u < t.length; u++) {
      if (u - c < s) continue;
      const S = t[u], g = t[u - 1], p = u - (f - 1), T = p - 1;
      let m = !1, d = !1;
      if (p >= 1 && p < h.length) {
        const M = i[p + l], k = i[T + l], H = h[p], V = h[T];
        k <= V && M > H && (m = !0), k >= V && M < H && (d = !0);
      }
      const R = o.slice(0, u + 1), w = I(R, 14), L = I(o.slice(0, u), 14), A = (L.value ?? 50) <= 30 && (w.value ?? 50) > 30, B = (L.value ?? 50) >= 70 && (w.value ?? 50) < 70, U = S.close > S.open && S.close > g.high, E = S.close < S.open && S.close < g.low;
      (m || A) && U ? (e.push({
        index: u,
        time: S.openTime,
        price: S.low,
        type: m && A ? "STRONG_BUY" : "BUY",
        reason: m ? "EMA Bullish Cross" : "RSI Oversold Bounce"
      }), c = u) : (d || B) && E && (e.push({
        index: u,
        time: S.openTime,
        price: S.high,
        type: d && B ? "STRONG_SELL" : "SELL",
        reason: d ? "EMA Bearish Cross" : "RSI Overbought Drop"
      }), c = u);
    }
    return e;
  }
}
class P {
  static audioCtx = null;
  static getContext() {
    if (!this.audioCtx) {
      const t = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new t();
    }
    return this.audioCtx.state === "suspended" && this.audioCtx.resume(), this.audioCtx;
  }
  /**
   * Play distinct synthesized alert tone
   */
  static play(t, n = 0.7) {
    try {
      const e = this.getContext(), o = e.currentTime, r = e.createGain();
      switch (r.gain.setValueAtTime(Math.max(0.05, Math.min(1, n)), o), r.connect(e.destination), t) {
        case "BUY_CHIME":
          this.playBuyChime(e, r, o);
          break;
        case "SELL_CHIME":
          this.playSellChime(e, r, o);
          break;
        case "TP_VICTORY":
          this.playTPVictory(e, r, o);
          break;
        case "SL_WARNING":
          this.playSLWarning(e, r, o);
          break;
      }
    } catch (e) {
      console.warn("[SoundService] Audio playback skipped:", e);
    }
  }
  /**
   * Ascending melodic arpeggio for BUY signal (C5 -> E5 -> G5 -> C6)
   */
  static playBuyChime(t, n, e) {
    [523.25, 659.25, 783.99, 1046.5].forEach((r, f) => {
      const i = t.createOscillator(), h = t.createGain(), l = e + f * 0.09, c = 0.28;
      i.type = "sine", i.frequency.setValueAtTime(r, l), h.gain.setValueAtTime(0, l), h.gain.linearRampToValueAtTime(0.35, l + 0.03), h.gain.exponentialRampToValueAtTime(1e-3, l + c), i.connect(h), h.connect(n), i.start(l), i.stop(l + c);
    });
  }
  /**
   * Descending warning tone for SELL signal (A5 -> F5 -> D5 -> B4)
   */
  static playSellChime(t, n, e) {
    [880, 698.46, 587.33, 493.88].forEach((r, f) => {
      const i = t.createOscillator(), h = t.createGain(), l = e + f * 0.09, c = 0.26;
      i.type = "triangle", i.frequency.setValueAtTime(r, l), h.gain.setValueAtTime(0, l), h.gain.linearRampToValueAtTime(0.4, l + 0.03), h.gain.exponentialRampToValueAtTime(1e-3, l + c), i.connect(h), h.connect(n), i.start(l), i.stop(l + c);
    });
  }
  /**
   * Bright celebration fanfare when TP is hit (G5 -> C6 -> E6 -> G6)
   */
  static playTPVictory(t, n, e) {
    const o = [783.99, 1046.5, 1318.51, 1567.98];
    o.forEach((r, f) => {
      const i = t.createOscillator(), h = t.createGain(), l = e + f * 0.12, c = f === o.length - 1 ? 0.6 : 0.22;
      i.type = "triangle", i.frequency.setValueAtTime(r, l), h.gain.setValueAtTime(0, l), h.gain.linearRampToValueAtTime(0.45, l + 0.03), h.gain.exponentialRampToValueAtTime(1e-3, l + c), i.connect(h), h.connect(n), i.start(l), i.stop(l + c);
    });
  }
  /**
   * Rapid warning alarm buzzer for SL hit
   */
  static playSLWarning(t, n, e) {
    [0, 0.18, 0.36].forEach((o) => {
      const r = t.createOscillator(), f = t.createGain(), i = e + o, h = 0.12;
      r.type = "sawtooth", r.frequency.setValueAtTime(440, i), r.frequency.exponentialRampToValueAtTime(220, i + h), f.gain.setValueAtTime(0.4, i), f.gain.exponentialRampToValueAtTime(1e-3, i + h), r.connect(f), f.connect(n), r.start(i), r.stop(i + h);
    });
  }
}
class _ {
  /**
   * Check all active price alerts and trade positions against live market prices
   */
  static async checkAlerts() {
    const t = await y.getSettings(), n = t.priceAlerts || [], e = t.positions || [], o = n.filter((h) => !h.triggered), r = e.filter((h) => h.status === "ACTIVE");
    if (o.length === 0 && r.length === 0) return;
    const f = Array.from(
      /* @__PURE__ */ new Set([
        ...o.map((h) => h.symbol.toUpperCase()),
        ...r.map((h) => h.symbol.toUpperCase())
      ])
    );
    let i = !1;
    for (const h of f) {
      const l = await b.fetch24hrTicker(h);
      if (!l || !l.lastPrice) continue;
      const c = l.lastPrice;
      for (const s of o.filter((u) => u.symbol.toUpperCase() === h)) {
        let u = !1;
        if ((s.condition === "ABOVE" && c >= s.targetPrice || s.condition === "BELOW" && c <= s.targetPrice) && (u = !0), u) {
          s.triggered = !0, i = !0;
          const S = `🚨 Price Alert: ${s.symbol}`, g = `${s.symbol} reached $${c.toLocaleString()} (Target: $${s.targetPrice.toLocaleString()})${s.note ? ` - ${s.note}` : ""}`, p = s.alertType === "TP" ? "TP_VICTORY" : s.alertType === "SL" ? "SL_WARNING" : "BUY_CHIME";
          this.triggerNotificationAndSound(S, g, p, t.sound.volume);
        }
      }
      for (const s of r.filter((u) => u.symbol.toUpperCase() === h)) {
        const u = s.side === "LONG";
        if (s.takeProfit > 0 && (u ? c >= s.takeProfit : c <= s.takeProfit)) {
          s.status = "CLOSED_TP", i = !0;
          const g = `🎯 Take Profit Reached: ${s.symbol}`, p = `Target TP $${s.takeProfit.toLocaleString()} hit at current price $${c.toLocaleString()}!`;
          this.triggerNotificationAndSound(g, p, "TP_VICTORY", t.sound.volume);
          continue;
        }
        if (s.stopLoss > 0 && (u ? c <= s.stopLoss : c >= s.stopLoss)) {
          s.status = "CLOSED_SL", i = !0;
          const g = `🛑 Stop Loss Hit: ${s.symbol}`, p = `Stop Loss $${s.stopLoss.toLocaleString()} triggered at current price $${c.toLocaleString()}!`;
          this.triggerNotificationAndSound(g, p, "SL_WARNING", t.sound.volume);
        }
      }
    }
    i && await y.saveSettings({ priceAlerts: n, positions: e });
  }
  /**
   * Add new custom price alert
   */
  static async addPriceAlert(t) {
    const n = await y.getSettings(), e = {
      ...t,
      id: "alert_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
      createdAt: Date.now(),
      triggered: !1
    }, o = [...n.priceAlerts || [], e];
    return await y.saveSettings({ priceAlerts: o }), e;
  }
  /**
   * Delete price alert
   */
  static async deletePriceAlert(t) {
    const e = ((await y.getSettings()).priceAlerts || []).filter((o) => o.id !== t);
    await y.saveSettings({ priceAlerts: e });
  }
  /**
   * Create new Trade Position (Entry, TP, SL)
   */
  static async createTradePosition(t) {
    const n = await y.getSettings(), e = {
      ...t,
      id: "pos_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
      createdAt: Date.now(),
      status: "ACTIVE"
    }, o = [...n.positions || [], e];
    return await y.saveSettings({ positions: o }), e;
  }
  /**
   * Delete trade position
   */
  static async deleteTradePosition(t) {
    const e = ((await y.getSettings()).positions || []).filter((o) => o.id !== t);
    await y.saveSettings({ positions: e });
  }
  /**
   * Dispatch notification and audio alert
   */
  static triggerNotificationAndSound(t, n, e, o) {
    chrome.notifications && chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: t,
      message: n,
      priority: 2
    }), P.play(e, o);
  }
}
class N {
  static latestResults = [];
  static lastAlertedSignals = /* @__PURE__ */ new Map();
  static isScanning = !1;
  /**
   * Run full market scan across watchlist coins
   */
  static async scanMarket() {
    if (this.isScanning) return this.latestResults;
    this.isScanning = !0;
    try {
      const t = await y.getSettings();
      if (!t.scanner.enabled) return this.latestResults;
      const n = t.scanner.watchlist && t.scanner.watchlist.length > 0 ? t.scanner.watchlist : ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT", "ADAUSDT", "AVAXUSDT"], e = t.scanner.timeframe || "15m", o = [], r = 4;
      for (let f = 0; f < n.length; f += r) {
        const h = n.slice(f, f + r).map(async (c) => {
          try {
            const s = c.trim().toUpperCase(), [u, S, g] = await Promise.all([
              b.fetchKlines(s, e, 120),
              b.fetchOrderBook(s, 50),
              b.fetch24hrTicker(s)
            ]);
            if (!u || u.length < 30) return null;
            const p = G.analyze(
              s,
              e,
              u,
              S,
              t,
              g?.priceChangePercent
            );
            return {
              symbol: s,
              timeframe: e,
              price: p.currentPrice,
              priceChange24h: g?.priceChangePercent || 0,
              signal: p.signal,
              compositeScore: p.compositeScore,
              rsiValue: p.indicators.rsi?.value ?? null,
              macdTrend: p.indicators.macd?.trend ?? "NEUTRAL",
              timestamp: Date.now()
            };
          } catch (s) {
            return console.warn(`[Scanner] Error scanning ${c}:`, s), null;
          }
        });
        (await Promise.all(h)).forEach((c) => {
          c && o.push(c);
        });
      }
      return this.latestResults = o, await this.evaluateSignals(o, t), o;
    } finally {
      this.isScanning = !1;
    }
  }
  /**
   * Get latest cached screener results
   */
  static getLatestResults() {
    return this.latestResults;
  }
  /**
   * Evaluate detected signals and fire notifications/sounds
   */
  static async evaluateSignals(t, n) {
    const e = Date.now(), o = 900 * 1e3;
    for (const r of t) {
      const f = r.signal === "STRONG_BUY" || r.signal === "BUY", i = r.signal === "STRONG_SELL" || r.signal === "SELL";
      if (!f && !i) continue;
      const h = this.lastAlertedSignals.get(r.symbol);
      if (h && h.signal === r.signal && e - h.timestamp < o || Math.abs(r.compositeScore) < (n.scanner.minScoreThreshold || 20))
        continue;
      this.lastAlertedSignals.set(r.symbol, { signal: r.signal, timestamp: e });
      const l = f ? `🚀 BUY Signal Detected: ${r.symbol}` : `🔻 SELL Signal Detected: ${r.symbol}`, c = `${r.symbol} (${r.timeframe}) Score: ${r.compositeScore > 0 ? "+" : ""}${r.compositeScore} | RSI: ${r.rsiValue ?? "N/A"} | Price: $${r.price.toLocaleString()}`, s = f ? "BUY_CHIME" : "SELL_CHIME";
      f && !n.sound.playOnBuy || i && !n.sound.playOnSell || (chrome.notifications && chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon128.png",
        title: l,
        message: c,
        priority: 2
      }), P.play(s, n.sound.volume));
    }
  }
}
console.log("[Binance Signal Analyzer Pro] Background service worker initialized.");
const D = /* @__PURE__ */ new Map(), Q = 4e3;
async function tt(a, t) {
  const n = await y.getSettings(), e = a || n.symbol || "BTCUSDT", o = t || n.interval || "4h", r = `${e}_${o}`, f = D.get(r);
  if (f && f.expiry > Date.now())
    return f.data;
  const i = e.includes("_") || e.endsWith("PERP"), [h, l, c] = await Promise.all([
    b.fetchKlines(
      e,
      o,
      n.candleLimit || 200,
      i
    ),
    b.fetchOrderBook(e, 100, i),
    b.fetch24hrTicker(e, i)
  ]);
  if (!h || h.length === 0)
    throw new Error(`Failed to fetch candle data for ${e}`);
  const s = G.analyze(
    e,
    o,
    h,
    l,
    n,
    c?.priceChangePercent
  );
  return et(s.signal), D.set(r, {
    data: s,
    expiry: Date.now() + Q
  }), s;
}
function et(a) {
  let t = "", n = "#6b7280";
  a === "STRONG_BUY" || a === "BUY" ? (t = a === "STRONG_BUY" ? "BUY+" : "BUY", n = "#10b981") : a === "STRONG_SELL" || a === "SELL" ? (t = a === "STRONG_SELL" ? "SELL+" : "SELL", n = "#ef4444") : (t = "HOLD", n = "#6b7280"), chrome.action.setBadgeText({ text: t }), chrome.action.setBadgeBackgroundColor({ color: n });
}
chrome.runtime.onMessage.addListener(
  (a, t, n) => ((async () => {
    try {
      switch (a.type) {
        case "FETCH_ANALYSIS": {
          const e = await tt(
            a.payload?.symbol,
            a.payload?.interval
          );
          n({ success: !0, data: e });
          break;
        }
        case "GET_SETTINGS": {
          const e = await y.getSettings();
          n({ success: !0, data: e });
          break;
        }
        case "SAVE_SETTINGS": {
          const e = await y.saveSettings(a.payload);
          n({ success: !0, data: e });
          break;
        }
        case "RESET_SETTINGS": {
          const e = await y.resetSettings();
          n({ success: !0, data: e });
          break;
        }
        case "GET_SCREENER_RESULTS": {
          const e = N.getLatestResults();
          n({ success: !0, data: e });
          break;
        }
        case "TRIGGER_SCAN": {
          const e = await N.scanMarket();
          n({ success: !0, data: e });
          break;
        }
        case "GET_ALERTS": {
          const e = await y.getSettings();
          n({
            success: !0,
            data: {
              priceAlerts: e.priceAlerts || [],
              positions: e.positions || []
            }
          });
          break;
        }
        case "ADD_PRICE_ALERT": {
          const e = await _.addPriceAlert(a.payload);
          n({ success: !0, data: e });
          break;
        }
        case "DELETE_PRICE_ALERT": {
          await _.deletePriceAlert(a.payload.id), n({ success: !0 });
          break;
        }
        case "CREATE_TRADE_POSITION": {
          const e = await _.createTradePosition(a.payload);
          n({ success: !0, data: e });
          break;
        }
        case "DELETE_TRADE_POSITION": {
          await _.deleteTradePosition(a.payload.id), n({ success: !0 });
          break;
        }
        case "PLAY_SOUND": {
          const e = await y.getSettings();
          P.play(a.payload.soundType, e.sound.volume), n({ success: !0 });
          break;
        }
        default:
          n({ success: !1, error: "Unknown message action" });
          break;
      }
    } catch (e) {
      console.error("[Background Error]", e), n({ success: !1, error: e.message || "Internal error" });
    }
  })(), !0)
);
chrome.alarms.create("check_price_alerts", { periodInMinutes: 0.5 });
chrome.alarms.create("scan_market_coins", { periodInMinutes: 3 });
chrome.alarms.create("cleanup_cache", { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener(async (a) => {
  if (a.name === "check_price_alerts")
    await _.checkAlerts();
  else if (a.name === "scan_market_coins")
    await N.scanMarket();
  else if (a.name === "cleanup_cache") {
    const t = Date.now();
    for (const [n, e] of D.entries())
      e.expiry < t && D.delete(n);
  }
});
setTimeout(() => {
  N.scanMarket().catch((a) => console.warn("Initial scan warning:", a)), _.checkAlerts().catch((a) => console.warn("Initial alert check warning:", a));
}, 3e3);
