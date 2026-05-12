// public/js/checkout-pack.js — страница оформления пакета после входа
(function () {
  'use strict';

  var PACKS = {
    p1b: { title: '1 час — Basic', unit: 6.99 },
    p1p: { title: '1 час — Pro', unit: 8.99 },
    p1u: { title: '1 час — Ultimate', unit: 11.99 },
    p20b: { title: '20 часов — Basic', unit: 99.99 },
    p20p: { title: '20 часов — Pro', unit: 149.99 },
    p20u: { title: '20 часов — Ultimate', unit: 199.99 }
  };

  function clampQty(n) {
    var q = parseInt(String(n), 10);
    if (!Number.isFinite(q) || q < 1) return 1;
    return Math.min(99, q);
  }

  function money(n) {
    return '$' + n.toFixed(2);
  }

  async function requireAuth() {
    try {
      var r = await fetch('/api/auth/me', { credentials: 'include' });
      if (!r.ok) {
        var next = '/login.html?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
        window.location.replace(next);
        return false;
      }
    } catch (e) {
      window.location.replace('/login.html?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
      return false;
    }
    return true;
  }

  function initCheckout() {
    var sp = new URLSearchParams(window.location.search);
    var pack = sp.get('pack') || '';
    var qty = clampQty(sp.get('qty'));
    var meta = PACKS[pack];
    if (!meta) {
      window.location.replace('/pricing.html');
      return;
    }
    var total = Math.round(meta.unit * qty * 100) / 100;
    var stripeVal = Math.max(1, total);

    var titleEl = document.getElementById('checkoutPackTitle');
    var qtyEl = document.getElementById('checkoutOrderQty');
    var unitEl = document.getElementById('checkoutUnitPrice');
    var totalEl = document.getElementById('checkoutOrderTotal');
    if (titleEl) titleEl.textContent = meta.title;
    if (qtyEl) qtyEl.textContent = String(qty);
    if (unitEl) unitEl.textContent = money(meta.unit);
    if (totalEl) totalEl.textContent = money(total);

    var stripeInput = document.getElementById('stripeAmount');
    if (stripeInput) stripeInput.value = String(stripeVal);

    var cryptoInput = document.getElementById('cryptoAmount');
    if (cryptoInput) cryptoInput.value = String(Math.round(Math.max(5, total) * 100) / 100);

    document.title = 'Оформление: ' + meta.title + ' — VoiceFlow';
  }

  async function boot() {
    var ok = await requireAuth();
    if (!ok) return;
    initCheckout();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
