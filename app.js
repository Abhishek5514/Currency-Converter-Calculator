'use strict';

// ============================================================
// 1. CURRENCY META
// ============================================================

const CurrencyMeta = {
  USD: { name: 'US Dollar',          symbol: '$'  },
  EUR: { name: 'Euro',               symbol: '€'  },
  GBP: { name: 'British Pound',      symbol: '£'  },
  INR: { name: 'Indian Rupee',       symbol: '₹'  },
  JPY: { name: 'Japanese Yen',       symbol: '¥'  },
  AUD: { name: 'Australian Dollar',  symbol: 'A$' },
  CAD: { name: 'Canadian Dollar',    symbol: 'C$' },
  CHF: { name: 'Swiss Franc',        symbol: 'Fr' },
  CNY: { name: 'Chinese Yuan',       symbol: '¥'  },
  SGD: { name: 'Singapore Dollar',   symbol: 'S$' },
  AED: { name: 'UAE Dirham',         symbol: 'د.إ'},
  SAR: { name: 'Saudi Riyal',        symbol: '﷼'  },
  HKD: { name: 'Hong Kong Dollar',   symbol: 'HK$'},
  SEK: { name: 'Swedish Krona',      symbol: 'kr' },
  NOK: { name: 'Norwegian Krone',    symbol: 'kr' },
  DKK: { name: 'Danish Krone',       symbol: 'kr' },
  NZD: { name: 'New Zealand Dollar', symbol: 'NZ$'},
  MXN: { name: 'Mexican Peso',       symbol: '$'  },
  BRL: { name: 'Brazilian Real',     symbol: 'R$' },
  ZAR: { name: 'South African Rand', symbol: 'R'  },
  KRW: { name: 'South Korean Won',   symbol: '₩'  },
  TRY: { name: 'Turkish Lira',       symbol: '₺'  },
  RUB: { name: 'Russian Ruble',      symbol: '₽'  },
  PKR: { name: 'Pakistani Rupee',    symbol: '₨'  },
  BDT: { name: 'Bangladeshi Taka',   symbol: '৳'  },
  IDR: { name: 'Indonesian Rupiah',  symbol: 'Rp' },
  MYR: { name: 'Malaysian Ringgit',  symbol: 'RM' },
  THB: { name: 'Thai Baht',          symbol: '฿'  },
  PHP: { name: 'Philippine Peso',    symbol: '₱'  },
  LKR: { name: 'Sri Lankan Rupee',   symbol: 'Rs' },
  NPR: { name: 'Nepali Rupee',       symbol: 'Rs' },
  QAR: { name: 'Qatari Riyal',       symbol: 'QR' },
  KWD: { name: 'Kuwaiti Dinar',      symbol: 'KD' },
  EGP: { name: 'Egyptian Pound',     symbol: 'E£' },
  NGN: { name: 'Nigerian Naira',     symbol: '₦'  },
  ILS: { name: 'Israeli Shekel',     symbol: '₪'  },
  CZK: { name: 'Czech Koruna',       symbol: 'Kč' },
  PLN: { name: 'Polish Złoty',       symbol: 'zł' },
  HUF: { name: 'Hungarian Forint',   symbol: 'Ft' },
  RON: { name: 'Romanian Leu',       symbol: 'lei'},
  BGN: { name: 'Bulgarian Lev',      symbol: 'лв' },
  HRK: { name: 'Croatian Kuna',      symbol: 'kn' },
  ISK: { name: 'Icelandic Króna',    symbol: 'kr' },
};

function getCurrencyName(code)   { return CurrencyMeta[code]?.name   || code; }
function getCurrencySymbol(code) { return CurrencyMeta[code]?.symbol || code; }

// Reliable flag CDN (handles many simultaneous requests far better than flagsapi.com)
function getFlagUrl(currCode) {
  const cc = countryList[currCode];
  return cc ? `https://flagcdn.com/w40/${cc.toLowerCase()}.png` : '';
}

// ============================================================
// 2. STORAGE
// ============================================================

const Storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch {}
  },
};

// ============================================================
// 3. TOAST
// ============================================================

const Toast = (() => {
  const el = document.getElementById('toast');
  let timer = null;
  return {
    show(msg, duration = 2800) {
      el.textContent = msg;
      el.classList.add('show');
      clearTimeout(timer);
      timer = setTimeout(() => el.classList.remove('show'), duration);
    },
  };
})();

// ============================================================
// 4. CURRENCY API
// ============================================================

const CurrencyAPI = {
  BASE_URL: 'https://open.er-api.com/v6/latest/',

  async getLatest(base) {
    const res = await fetch(`${this.BASE_URL}${base}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.result !== 'success') throw new Error('API error');
    return data;
  },
};

// ============================================================
// 5. ALERT MANAGER
// ============================================================

class AlertManager {
  constructor(onTriggered) {
    this.onTriggered = onTriggered;
    this.alerts      = Storage.get('cp_alerts', []);
    this._poll       = null;
  }

  add(from, to, condition, target) {
    const alert = {
      id: Date.now(),
      from, to, condition,
      target: parseFloat(target),
      triggered: false,
      createdAt: new Date().toLocaleString(),
    };
    this.alerts.push(alert);
    this._save();
    this._startPolling();
    return alert;
  }

  remove(id) {
    this.alerts = this.alerts.filter((a) => a.id !== id);
    this._save();
    if (this.alerts.length === 0) this._stopPolling();
  }

  async checkNow() {
    const pending = this.alerts.filter((a) => !a.triggered);
    if (pending.length === 0) return;
    for (const alert of pending) {
      try {
        const data = await CurrencyAPI.getLatest(alert.from);
        const rate = data.rates[alert.to];
        if (!rate) continue;
        const triggered =
          (alert.condition === 'above' && rate >= alert.target) ||
          (alert.condition === 'below' && rate <= alert.target);
        if (triggered) {
          alert.triggered = true;
          this._save();
          this.onTriggered(alert, rate);
        }
      } catch {}
    }
  }

  _save() { Storage.set('cp_alerts', this.alerts); }

  _startPolling() {
    if (this._poll) return;
    this._poll = setInterval(() => this.checkNow(), 30000);
    this.checkNow();
  }

  _stopPolling() {
    clearInterval(this._poll);
    this._poll = null;
  }
}

// ============================================================
// 6. MAIN APP
// ============================================================

class App {
  constructor() {
    this.fromSelect  = document.getElementById('fromSelect');
    this.toSelect    = document.getElementById('toSelect');
    this.amountInput = document.getElementById('amount');
    this.fromFlag    = document.getElementById('fromFlag');
    this.toFlag      = document.getElementById('toFlag');
    this.fromName    = document.getElementById('fromName');
    this.toName      = document.getElementById('toName');
    this.fromSymbol  = document.getElementById('fromSymbol');

    this.convertBtn  = document.getElementById('convertBtn');
    this.swapBtn     = document.getElementById('swapBtn');
    this.themeBtn    = document.getElementById('themeBtn');
    this.copyBtn     = document.getElementById('copyBtn');
    this.favoriteBtn = document.getElementById('favoriteBtn');
    this.exportBtn   = document.getElementById('exportBtn');

    this.loader      = document.getElementById('loader');
    this.resultEl    = document.getElementById('result');
    this.reverseEl   = document.getElementById('reverseResult');
    this.lastUpdated = document.getElementById('lastUpdated');
    this.rateChange  = document.getElementById('rateChange');

    this.favoriteList = document.getElementById('favoriteList');
    this.historyList  = document.getElementById('historyList');

    this.clearHistoryBtn  = document.getElementById('clearHistoryBtn');
    this.exportHistoryBtn = document.getElementById('exportHistoryBtn');

    this.compareFromSelect = document.getElementById('compareFromSelect');
    this.comparefromFlag   = document.getElementById('comparefromFlag');
    this.refreshCompare    = document.getElementById('refreshCompare');
    this.compareFromLabel  = document.getElementById('compareFrom');
    this.compareGrid       = document.getElementById('compareGrid');

    this.alertFromSelect = document.getElementById('alertFromSelect');
    this.alertToSelect   = document.getElementById('alertToSelect');
    this.alertFromFlag   = document.getElementById('alertFromFlag');
    this.alertToFlag     = document.getElementById('alertToFlag');
    this.alertCondition  = document.getElementById('alertCondition');
    this.alertTarget     = document.getElementById('alertTarget');
    this.addAlertBtn     = document.getElementById('addAlertBtn');
    this.alertsList      = document.getElementById('alertsList');

    this.favorites      = Storage.get('cp_favorites', []);
    this.history         = Storage.get('cp_history', []);
    this.lastRate        = null;
    this.prevRate        = null;
    this.lastConversion  = null;
    this.isDark          = Storage.get('cp_theme', 'dark') === 'dark';

    this.alertMgr = new AlertManager((alert, rate) => {
      Toast.show(`🔔 Alert! ${alert.from}→${alert.to} is now ${rate.toFixed(4)}`, 5000);
      this.renderAlerts();
    });

    this.applyTheme();
    this.populateAllDropdowns();
    this.bindEvents();
    this.renderFavorites();
    this.renderHistory();
    this.renderAlerts();
    this.getExchangeRate();
  }

  populateAllDropdowns() {
    const codes = Object.keys(countryList).sort();
    const selects = [
      this.fromSelect, this.toSelect,
      this.compareFromSelect,
      this.alertFromSelect, this.alertToSelect,
    ];

    for (const select of selects) {
      for (const code of codes) {
        const opt = document.createElement('option');
        opt.value = code;
        opt.textContent = `${code} — ${getCurrencyName(code)}`;
        select.append(opt);
      }
    }

    this.fromSelect.value        = 'USD';
    this.toSelect.value          = 'INR';
    this.compareFromSelect.value = 'USD';
    this.alertFromSelect.value   = 'USD';
    this.alertToSelect.value     = 'INR';

    this._refreshFlagsAndNames();
    this._refreshAlertFlags();
    this._updateFromSymbol();
  }

  _refreshFlagsAndNames() {
    const fromCode = this.fromSelect.value;
    const toCode   = this.toSelect.value;
    this.fromFlag.src = getFlagUrl(fromCode);
    this.toFlag.src   = getFlagUrl(toCode);
    this.fromName.textContent = getCurrencyName(fromCode);
    this.toName.textContent   = getCurrencyName(toCode);
  }

  _refreshAlertFlags() {
    const f = this.alertFromSelect.value;
    const t = this.alertToSelect.value;
    if (countryList[f]) this.alertFromFlag.src = getFlagUrl(f);
    if (countryList[t]) this.alertToFlag.src   = getFlagUrl(t);
  }

  _updateFromSymbol() {
    this.fromSymbol.textContent = getCurrencySymbol(this.fromSelect.value);
  }

  bindEvents() {
    this.convertBtn.addEventListener('click', () => this.getExchangeRate());
    this.amountInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.getExchangeRate();
    });
    this.fromSelect.addEventListener('change', () => {
      this._refreshFlagsAndNames();
      this._updateFromSymbol();
    });
    this.toSelect.addEventListener('change', () => this._refreshFlagsAndNames());
    this.swapBtn.addEventListener('click', () => this._swap());
    this.themeBtn.addEventListener('click', () => this._toggleTheme());
    this.copyBtn.addEventListener('click', () => this._copyResult());
    this.favoriteBtn.addEventListener('click', () => this._addFavorite());
    this.exportBtn.addEventListener('click', () => this._exportSingle());
    this.clearHistoryBtn.addEventListener('click', () => this._clearHistory());
    this.exportHistoryBtn.addEventListener('click', () => this._exportCSV());

    document.querySelectorAll('.tab').forEach((btn) => {
      btn.addEventListener('click', () => this._switchTab(btn.dataset.tab));
    });

    this.compareFromSelect.addEventListener('change', () => {
      const code = this.compareFromSelect.value;
      if (countryList[code]) {
        this.comparefromFlag.src = getFlagUrl(code);
      }
      this.compareFromLabel.textContent = code;
    });

    this.refreshCompare.addEventListener('click', () => this._loadCompare());
    this.alertFromSelect.addEventListener('change', () => this._refreshAlertFlags());
    this.alertToSelect.addEventListener('change',   () => this._refreshAlertFlags());
    this.addAlertBtn.addEventListener('click', () => this._addAlert());

    this.favoriteList.addEventListener('click', (e) => {
      const li = e.target.closest('li[data-from]');
      if (!li) return;
      if (e.target.classList.contains('remove-pill')) {
        this._removeFavorite(li.dataset.from, li.dataset.to);
        return;
      }
      this.fromSelect.value = li.dataset.from;
      this.toSelect.value   = li.dataset.to;
      this._refreshFlagsAndNames();
      this._updateFromSymbol();
      this.getExchangeRate();
    });

    this.alertsList.addEventListener('click', (e) => {
      const btn = e.target.closest('.remove-alert');
      if (!btn) return;
      this.alertMgr.remove(parseInt(btn.dataset.id, 10));
      this.renderAlerts();
    });
  }

  async getExchangeRate() {
    let amount = parseFloat(this.amountInput.value);
    if (!amount || amount <= 0) { amount = 1; this.amountInput.value = '1'; }

    const from = this.fromSelect.value;
    const to   = this.toSelect.value;

    this._showLoader(true);
    this.convertBtn.disabled = true;

    try {
      const data = await CurrencyAPI.getLatest(from);
      const rate = data.rates[to];

      if (!rate) {
        this.resultEl.textContent = `No live rate for ${to}`;
        this.reverseEl.textContent = 'Try a different pair';
        return;
      }

      if (this.lastRate !== null) this.prevRate = this.lastRate;
      this.lastRate = rate;

      const converted     = (amount * rate).toFixed(2);
      const reverseAmount = (1 / rate).toFixed(4);

      this.resultEl.textContent  = `${amount} ${from} = ${converted} ${to}`;
      this.reverseEl.textContent = `1 ${to} = ${reverseAmount} ${from}`;
      this.lastUpdated.textContent = `Updated: ${new Date().toLocaleTimeString()}`;

      if (this.prevRate !== null) {
        const diff = ((rate - this.prevRate) / this.prevRate * 100).toFixed(3);
        const up   = rate >= this.prevRate;
        this.rateChange.textContent = `${up ? '▲' : '▼'} ${Math.abs(diff)}%`;
        this.rateChange.className   = `rate-change ${up ? 'up' : 'down'}`;
      }

      this.lastConversion = { amount, from, to, converted, rate };
      this._addToHistory(amount, from, converted, to);

    } catch (err) {
      console.error(err);
      this.resultEl.textContent  = 'Unable to fetch rate. Check your connection.';
      this.reverseEl.textContent = '';
    } finally {
      this._showLoader(false);
      this.convertBtn.disabled = false;
    }
  }

  _swap() {
    [this.fromSelect.value, this.toSelect.value] =
      [this.toSelect.value, this.fromSelect.value];
    this._refreshFlagsAndNames();
    this._updateFromSymbol();
    this.getExchangeRate();
  }

  applyTheme() {
    if (this.isDark) {
      document.body.classList.remove('light-mode');
      this.themeBtn && (this.themeBtn.textContent = '🌙');
    } else {
      document.body.classList.add('light-mode');
      this.themeBtn && (this.themeBtn.textContent = '☀️');
    }
  }

  _toggleTheme() {
    this.isDark = !this.isDark;
    Storage.set('cp_theme', this.isDark ? 'dark' : 'light');
    this.applyTheme();
  }

  async _copyResult() {
    if (!this.lastConversion) return;
    try {
      await navigator.clipboard.writeText(this.resultEl.textContent);
      Toast.show('✅ Copied to clipboard!');
    } catch {
      Toast.show('❌ Copy failed');
    }
  }

  _addFavorite() {
    const from = this.fromSelect.value;
    const to   = this.toSelect.value;
    if (this.favorites.some((f) => f.from === from && f.to === to)) {
      Toast.show('Already in favorites!');
      return;
    }
    this.favorites.push({ from, to });
    Storage.set('cp_favorites', this.favorites);
    this.renderFavorites();
    Toast.show(`⭐ ${from} → ${to} added to favorites`);
  }

  _removeFavorite(from, to) {
    this.favorites = this.favorites.filter(
      (f) => !(f.from === from && f.to === to)
    );
    Storage.set('cp_favorites', this.favorites);
    this.renderFavorites();
  }

  renderFavorites() {
    this.favoriteList.innerHTML = '';
    if (this.favorites.length === 0) {
      const li = document.createElement('li');
      li.className   = 'empty-msg';
      li.textContent = 'No favorites yet. Add one!';
      this.favoriteList.append(li);
      return;
    }
    for (const fav of this.favorites) {
      const li  = document.createElement('li');
      li.dataset.from = fav.from;
      li.dataset.to   = fav.to;
      li.innerHTML = `
        <img src="${getFlagUrl(fav.from)}"
             style="width:20px;height:15px;border-radius:2px;object-fit:cover" alt="" />
        ${fav.from} → ${fav.to}
        <button class="remove-pill" aria-label="Remove favorite">✕</button>
      `;
      this.favoriteList.append(li);
    }
  }

  _addToHistory(amount, from, converted, to) {
    const entry = { amount, from, converted, to, time: new Date().toLocaleString() };
    this.history.unshift(entry);
    if (this.history.length > 20) this.history.pop();
    Storage.set('cp_history', this.history);
    this.renderHistory();
  }

  renderHistory() {
    this.historyList.innerHTML = '';
    if (this.history.length === 0) {
      const li = document.createElement('li');
      li.innerHTML = '<span class="empty-msg">No conversions yet.</span>';
      this.historyList.append(li);
      return;
    }
    for (const e of this.history) {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="h-pair">${e.amount} ${e.from} = ${e.converted} ${e.to}</span>
        <span class="h-time">${e.time}</span>
      `;
      this.historyList.append(li);
    }
  }

  _clearHistory() {
    this.history = [];
    Storage.remove('cp_history');
    this.renderHistory();
    Toast.show('🗑️ History cleared');
  }

  _exportSingle() {
    if (!this.lastConversion) { Toast.show('Convert first!'); return; }
    const { amount, from, converted, to } = this.lastConversion;
    const text = `${amount} ${from} = ${converted} ${to}\nDate: ${new Date().toLocaleString()}`;
    this._downloadFile('conversion.txt', text, 'text/plain');
    Toast.show('📥 Downloaded!');
  }

  _exportCSV() {
    if (this.history.length === 0) { Toast.show('No history to export.'); return; }
    const rows = ['Amount,From,Converted,To,Time'];
    for (const e of this.history) {
      rows.push(`${e.amount},${e.from},${e.converted},${e.to},"${e.time}"`);
    }
    this._downloadFile('history.csv', rows.join('\n'), 'text/csv');
    Toast.show('📥 CSV downloaded!');
  }

  _downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async _loadCompare() {
    const base = this.compareFromSelect.value;
    this.compareFromLabel.textContent = base;
    this.compareGrid.innerHTML = '<p style="color:var(--text-muted)">Loading…</p>';

    const TOP_CURRENCIES = [
      'USD','EUR','GBP','JPY','INR','AUD','CAD','CHF','CNY','SGD',
      'AED','SAR','HKD','MXN','BRL','ZAR','KRW','TRY','SEK','NOK',
    ].filter((c) => c !== base);

    try {
      const data = await CurrencyAPI.getLatest(base);
      this.compareGrid.innerHTML = '';

      for (const code of TOP_CURRENCIES) {
        const rate = data.rates[code];
        if (!rate) continue;

        const card = document.createElement('div');
        card.className = 'compare-card';
        card.title     = `Click to convert ${base} → ${code}`;

        card.innerHTML = `
          <img src="${getFlagUrl(code)}" alt="${code}" />
          <div class="cc-code">${code}</div>
          <div class="cc-rate">${rate.toFixed(4)}</div>
          <div class="cc-change" style="color:var(--text-muted)">${getCurrencyName(code)}</div>
        `;

        card.addEventListener('click', () => {
          this.fromSelect.value = base;
          this.toSelect.value   = code;
          this._refreshFlagsAndNames();
          this._updateFromSymbol();
          this._switchTab('converter');
          this.getExchangeRate();
        });

        this.compareGrid.append(card);
      }
    } catch {
      this.compareGrid.innerHTML =
        '<p style="color:var(--danger)">Failed to load rates. Please try again.</p>';
    }
  }

  _addAlert() {
    const from      = this.alertFromSelect.value;
    const to        = this.alertToSelect.value;
    const condition = this.alertCondition.value;
    const target    = parseFloat(this.alertTarget.value);

    if (!target || target <= 0) {
      Toast.show('Please enter a valid target rate.');
      return;
    }

    this.alertMgr.add(from, to, condition, target);
    this.alertTarget.value = '';
    this.renderAlerts();
    Toast.show(`🔔 Alert set: ${from}→${to} ${condition} ${target}`);
  }

  renderAlerts() {
    this.alertsList.innerHTML = '';
    if (this.alertMgr.alerts.length === 0) {
      this.alertsList.innerHTML = '<p class="empty-msg">No alerts set yet.</p>';
      return;
    }
    for (const alert of this.alertMgr.alerts) {
      const div = document.createElement('div');
      div.className = `alert-item ${alert.triggered ? 'triggered' : ''}`;
      div.innerHTML = `
        <div>
          <div class="alert-desc">
            ${alert.from} → ${alert.to} &nbsp;·&nbsp;
            Rate ${alert.condition} ${alert.target}
          </div>
          <div class="alert-status">
            ${alert.triggered ? '✅ Triggered!' : '⏳ Watching…'}
            &nbsp;|&nbsp; Set ${alert.createdAt}
          </div>
        </div>
        <button class="remove-alert" data-id="${alert.id}" aria-label="Remove alert">✕</button>
      `;
      this.alertsList.append(div);
    }
  }

  _switchTab(name) {
    document.querySelectorAll('.tab').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === name);
      btn.setAttribute('aria-selected', btn.dataset.tab === name);
    });
    document.querySelectorAll('.tab-panel').forEach((panel) => {
      panel.classList.toggle('active', panel.id === `tab-${name}`);
    });
    if (name === 'compare' && this.compareGrid.innerHTML === '') {
      this._loadCompare();
    }
  }

  _showLoader(show) {
    this.loader.classList.toggle('visible', show);
  }
}

// ============================================================
// 7. BOOT
// ============================================================

window.addEventListener('DOMContentLoaded', () => {
  window._app = new App();
});