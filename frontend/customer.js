/* ─── Customer Frontend Logic ─────────────────────── */
(() => {
  'use strict';

  const API = '/api/store';

  // ─── DOM Refs ──────────────────────────────────────
  const $ = id => document.getElementById(id);
  const productGrid   = $('productGrid');
  const modalOverlay  = $('modalOverlay');
  const modalTitle    = $('modalTitle');
  const modalValue    = $('modalValue');
  const modalValueType = $('modalValueType');
  const modalPrice    = $('modalPrice');
  const toasts        = $('toasts');

  // ─── Helpers ───────────────────────────────────────
  function toast(msg, type = 'success') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    toasts.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  function formatPrice(n) {
    return '$' + Number(n).toFixed(2);
  }

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ─── Load Products ─────────────────────────────────
  async function loadProducts() {
    productGrid.innerHTML = `
      <div class="text-center text-muted" style="grid-column:1/-1; padding:60px 0;">
        <span class="loading-spinner"></span>
        <p class="mt-1">Loading products...</p>
      </div>`;

    try {
      const res = await fetch(`${API}/products`);
      const products = await res.json();

      if (!Array.isArray(products) || products.length === 0) {
        productGrid.innerHTML = `
          <div class="empty-state" style="grid-column:1/-1;">
            <p style="font-size:1.1rem;">No coupons available right now</p>
            <p class="text-muted mt-1">Check back later for new deals!</p>
          </div>`;
        return;
      }

      productGrid.innerHTML = products.map(p => `
        <div class="card" id="card-${p.id}">
          <img src="${esc(p.image_url)}" alt="${esc(p.name)}"
               onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22180%22><rect fill=%22%23e9ecef%22 width=%22300%22 height=%22180%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%239ca3af%22 font-family=%22sans-serif%22 font-size=%2216%22>No Image</text></svg>'">
          <div class="card-body">
            <h3>${esc(p.name)}</h3>
            <p>${esc(p.description || '')}</p>
            <div style="display:flex; align-items:center; justify-content:space-between; margin-top:12px;">
              <span class="price">${formatPrice(p.price)}</span>
              <button class="btn btn-success btn-sm" onclick="customerApp.purchase('${p.id}', '${esc(p.name)}', ${p.price})">
                Buy Now
              </button>
            </div>
          </div>
        </div>
      `).join('');

    } catch (err) {
      productGrid.innerHTML = '<div class="alert alert-error" style="grid-column:1/-1;">Failed to load products. Please try again.</div>';
    }
  }

  // ─── Purchase ──────────────────────────────────────
  async function purchase(productId, name, price) {
    // Find the button in the card and disable it
    const card = document.getElementById(`card-${productId}`);
    const btn = card?.querySelector('button');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Purchasing...';
    }

    try {
      const res = await fetch(`${API}/products/${productId}/purchase`, {
        method: 'POST'
      });

      const data = await res.json();

      if (!res.ok) {
        toast(data.message || 'Purchase failed', 'error');
        // Re-enable button on non-sold errors
        if (btn && data.error_code !== 'PRODUCT_ALREADY_SOLD') {
          btn.disabled = false;
          btn.textContent = 'Buy Now';
        } else if (btn) {
          btn.textContent = 'Sold Out';
          btn.classList.remove('btn-success');
          btn.classList.add('btn-secondary');
        }
        return;
      }

      // Show value in modal
      modalTitle.textContent = `${name} — Purchased!`;
      modalValue.textContent = data.value;
      modalValueType.textContent = data.value_type;
      modalPrice.textContent = formatPrice(data.final_price);
      modalOverlay.classList.remove('hidden');

      // Update the card to show sold
      if (btn) {
        btn.textContent = 'Sold';
        btn.disabled = true;
        btn.classList.remove('btn-success');
        btn.classList.add('btn-secondary');
      }

      toast(`Successfully purchased "${name}"!`);

    } catch (err) {
      toast('Network error — please try again', 'error');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Buy Now';
      }
    }
  }

  // ─── Modal ─────────────────────────────────────────
  function closeModal(e) {
    if (e && e.target !== modalOverlay) return;
    modalOverlay.classList.add('hidden');
  }

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // ─── Init ──────────────────────────────────────────
  loadProducts();

  // Expose for onclick handlers
  window.customerApp = { purchase, closeModal };

})();
