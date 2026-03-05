/* ─── Admin Frontend Logic ────────────────────────── */
(() => {
  'use strict';

  const API = '/api/admin';
  let token = sessionStorage.getItem('admin_token') || null;

  // ─── DOM Refs ──────────────────────────────────────
  const $  = id => document.getElementById(id);
  const loginSection     = $('loginSection');
  const dashboardSection = $('dashboardSection');
  const loginForm        = $('loginForm');
  const loginError       = $('loginError');
  const logoutBtn        = $('logoutBtn');
  const createForm       = $('createForm');
  const createBtn        = $('createBtn');
  const couponList       = $('couponList');
  const refreshBtn       = $('refreshBtn');
  const filterSold       = $('filterSold');
  const filterDeleted    = $('filterDeleted');
  const computedPrice    = $('computedPrice');
  const toasts           = $('toasts');

  // ─── Helpers ───────────────────────────────────────
  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

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

  // ─── Auth State ────────────────────────────────────
  function showDashboard() {
    loginSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
    loadCoupons();
  }

  function showLogin() {
    loginSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
    logoutBtn.classList.add('hidden');
  }

  if (token) {
    showDashboard();
  }

  // ─── Login ─────────────────────────────────────────
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');

    try {
      const res = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: $('username').value.trim(),
          password: $('password').value
        })
      });
      const data = await res.json();

      if (!res.ok) {
        loginError.textContent = data.message || 'Login failed';
        loginError.classList.remove('hidden');
        return;
      }

      token = data.token;
      sessionStorage.setItem('admin_token', token);
      showDashboard();
      toast('Logged in successfully');

    } catch (err) {
      loginError.textContent = 'Network error';
      loginError.classList.remove('hidden');
    }
  });

  // ─── Logout ────────────────────────────────────────
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    token = null;
    sessionStorage.removeItem('admin_token');
    showLogin();
  });

  // ─── Live Price Preview ────────────────────────────
  function updatePricePreview() {
    const cost   = parseFloat($('cCost').value);
    const margin = parseFloat($('cMargin').value);
    if (!isNaN(cost) && !isNaN(margin) && cost >= 0 && margin >= 0) {
      const price = cost * (1 + margin / 100);
      computedPrice.textContent = `Computed sell price: ${formatPrice(price)}`;
    } else {
      computedPrice.textContent = '';
    }
  }

  $('cCost').addEventListener('input', updatePricePreview);
  $('cMargin').addEventListener('input', updatePricePreview);

  // ─── Create Coupon ─────────────────────────────────
  createForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    createBtn.disabled = true;
    createBtn.textContent = 'Creating...';

    const body = {
      name: $('cName').value.trim(),
      description: $('cDesc').value.trim(),
      image_url: $('cImage').value.trim(),
      cost_price: parseFloat($('cCost').value),
      margin_percentage: parseFloat($('cMargin').value),
      value_type: $('cValueType').value,
      value: $('cValue').value.trim()
    };

    try {
      const res = await fetch(`${API}/products`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) {
        toast(data.message || 'Failed to create coupon', 'error');
        return;
      }

      toast(`Coupon "${data.name}" created — sell price ${formatPrice(data.minimum_sell_price)}`);
      createForm.reset();
      computedPrice.textContent = '';
      loadCoupons();

    } catch (err) {
      toast('Network error', 'error');
    } finally {
      createBtn.disabled = false;
      createBtn.textContent = 'Create Coupon';
    }
  });

  // ─── Load Coupons ──────────────────────────────────
  async function loadCoupons() {
    const params = new URLSearchParams();
    if (filterSold.value)    params.set('is_sold', filterSold.value);
    if (filterDeleted.value) params.set('is_deleted', filterDeleted.value);

    couponList.innerHTML = '<div class="text-center text-muted mt-2"><span class="loading-spinner"></span></div>';

    try {
      const res = await fetch(`${API}/products?${params}`, {
        headers: authHeaders()
      });

      if (res.status === 401) {
        toast('Session expired — please login again', 'error');
        token = null;
        sessionStorage.removeItem('admin_token');
        showLogin();
        return;
      }

      const data = await res.json();
      const products = data.products || [];

      if (products.length === 0) {
        couponList.innerHTML = `
          <div class="empty-state">
            <p>No coupons found</p>
          </div>`;
        return;
      }

      couponList.innerHTML = `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Cost</th>
                <th>Margin</th>
                <th>Sell Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${products.map(p => `
                <tr>
                  <td>
                    <strong>${esc(p.name)}</strong><br>
                    <span class="text-muted" style="font-size:0.8rem">${esc(p.description || '').substring(0, 60)}</span>
                  </td>
                  <td>${formatPrice(p.cost_price)}</td>
                  <td>${p.margin_percentage}%</td>
                  <td><strong>${formatPrice(p.minimum_sell_price)}</strong></td>
                  <td>
                    ${p.is_sold   ? '<span class="status sold">Sold</span>' : '<span class="status available">Available</span>'}
                    ${p.is_deleted ? '<span class="status deleted">Deleted</span>' : ''}
                  </td>
                  <td>
                    ${!p.is_sold && !p.is_deleted
                      ? `<button class="btn btn-danger btn-sm" onclick="adminApp.deleteCoupon('${p._id}', '${esc(p.name)}')">Delete</button>`
                      : '<span class="text-muted">—</span>'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="text-muted mt-1" style="font-size:0.8rem">
          Showing ${products.length} of ${data.pagination?.total || products.length} coupons
        </div>`;

    } catch (err) {
      couponList.innerHTML = '<div class="alert alert-error">Failed to load coupons</div>';
    }
  }

  // ─── Delete Coupon ─────────────────────────────────
  async function deleteCoupon(id, name) {
    if (!confirm(`Delete coupon "${name}"? This action is irreversible.`)) return;

    try {
      const res = await fetch(`${API}/products/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
      });

      const data = await res.json();

      if (!res.ok) {
        toast(data.message || 'Failed to delete', 'error');
        return;
      }

      toast(`"${name}" deleted`);
      loadCoupons();

    } catch (err) {
      toast('Network error', 'error');
    }
  }

  // ─── Filter Change ─────────────────────────────────
  filterSold.addEventListener('change', loadCoupons);
  filterDeleted.addEventListener('change', loadCoupons);
  refreshBtn.addEventListener('click', loadCoupons);

  // ─── Escape HTML ───────────────────────────────────
  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // Expose for onclick handlers in table
  window.adminApp = { deleteCoupon };

})();
