/**
 * ADMIN DASHBOARD & SOFTWARE DELIVERY CONTROLLER
 * Delivers customer software orders, manages products, and inspects database analytics.
 */

// Check admin authentication on boot
async function checkAdminAuth() {
  if (!window.api.token || !window.api.user || window.api.user.role !== 'admin') {
    // Show modal or prompt to login
    window.showToast('Administrator privileges required. Please sign in as Admin.', 'error');
    setTimeout(() => {
      window.location.href = 'auth.html?mode=login&admin=1';
    }, 1500);
    return false;
  }
  return true;
}

async function initAdmin() {
  const isAuthed = await checkAdminAuth();
  if (!isAuthed) return;

  // Set admin name in header
  const adminNameEl = document.getElementById('admin-user-name');
  if (adminNameEl) {
    adminNameEl.textContent = window.api.user.fullName || window.api.user.email;
  }

  // Load Initial View Data
  await loadAdminStats();
  await loadAdminOrders();

  // Tab switching
  document.querySelectorAll('.admin-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      const targetTab = item.dataset.tab;
      switchAdminTab(targetTab);
    });
  });

  // Modal setup
  const addProdModal = document.getElementById('add-product-modal');
  if (addProdModal && !('closedBy' in HTMLDialogElement.prototype)) {
    addProdModal.addEventListener('click', (e) => {
      if (e.target === addProdModal) {
        const rect = addProdModal.getBoundingClientRect();
        const inside = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height && rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
        if (!inside) addProdModal.close();
      }
    });
  }

  // Add product form listener
  document.getElementById('btn-open-add-product')?.addEventListener('click', () => {
    document.getElementById('add-product-modal')?.showModal();
  });

  document.getElementById('add-product-form')?.addEventListener('submit', handleCreateProduct);

  // Refresh buttons
  document.getElementById('btn-refresh-stats')?.addEventListener('click', async () => {
    await loadAdminStats();
    await loadAdminOrders();
    window.showToast('Admin data refreshed from SSMS 2022.', 'info');
  });
}

function switchAdminTab(tabName) {
  const sections = ['orders', 'products', 'licenses', 'users', 'logs'];
  sections.forEach(s => {
    const el = document.getElementById(`tab-content-${s}`);
    if (el) el.style.display = s === tabName ? 'block' : 'none';
  });

  if (tabName === 'orders') loadAdminOrders();
  if (tabName === 'products') loadAdminProducts();
  if (tabName === 'licenses') loadAdminLicenses();
  if (tabName === 'users') loadAdminUsers();
  if (tabName === 'logs') loadAdminLogs();
}

// Animated counter for stat values
function animateCounter(element, targetValue, prefix = '', suffix = '', duration = 800) {
  const isFloat = String(targetValue).includes('.');
  const startTime = performance.now();
  const startValue = 0;

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const currentValue = startValue + (targetValue - startValue) * eased;

    if (isFloat) {
      element.textContent = `${prefix}${currentValue.toFixed(2)}${suffix}`;
    } else {
      element.textContent = `${prefix}${Math.round(currentValue)}${suffix}`;
    }

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

// 1. Load Stats
async function loadAdminStats() {
  try {
    const res = await window.api.getAdminStats();
    const stats = res.stats;

    animateCounter(document.getElementById('stat-revenue'), stats.totalRevenue, '$');
    animateCounter(document.getElementById('stat-orders'), stats.totalOrders);
    animateCounter(document.getElementById('stat-pending'), stats.pendingDeliveries);
    animateCounter(document.getElementById('stat-delivered'), stats.deliveredOrders);
    animateCounter(document.getElementById('stat-products'), stats.activeProducts);
    animateCounter(document.getElementById('stat-customers'), stats.totalCustomers);
    animateCounter(document.getElementById('stat-licenses'), stats.issuedLicenses);
  } catch (err) {
    console.error('Failed to load admin stats:', err);
  }
}

// 2. Load Orders Table (with Software Delivery Action Button)
async function loadAdminOrders() {
  const tbody = document.getElementById('orders-table-body');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">Loading orders from database...</td></tr>';

  try {
    const res = await window.api.getAdminOrders();
    if (!res.orders || res.orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No orders registered in database yet.</td></tr>';
      return;
    }

    tbody.innerHTML = res.orders.map(ord => {
      const isDelivered = ord.delivery_status === 'Delivered';
      const itemsSummary = ord.items.map(i => `${escapeHtml(i.product_name)} (${escapeHtml(i.version)})`).join(', ');

      return `
        <tr>
          <td>
            <strong style="font-family: var(--font-mono); color: var(--accent-cyan);">${escapeHtml(ord.order_number)}</strong>
          </td>
          <td>
            <div>${escapeHtml(ord.customer_name)}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(ord.customer_email)}</div>
          </td>
          <td>
            <div style="font-size: 0.85rem; max-width: 240px;">${itemsSummary}</div>
          </td>
          <td>
            <span style="font-family: var(--font-mono); font-weight: 700;">$${Number(ord.total_amount).toFixed(2)}</span>
          </td>
          <td>
            <span class="status-badge ${isDelivered ? 'status-delivered' : 'status-pending'}">
              ${isDelivered ? '✓ Delivered' : '⏳ Pending Delivery'}
            </span>
          </td>
          <td style="font-size: 0.8rem; color: var(--text-muted);">
            ${new Date(ord.created_at).toLocaleDateString()}
          </td>
          <td>
            ${!isDelivered ? `
              <button class="btn btn-primary btn-sm btn-deliver" data-id="${ord.order_id}" data-num="${escapeHtml(ord.order_number)}" title="Dispatch Software & Issue Cryptographic License Key">
                ⚡ Deliver Software
              </button>
            ` : `
              <span style="color: var(--accent-emerald); font-size: 0.8rem; font-family: var(--font-mono);">
                Keys Dispatched
              </span>
            `}
          </td>
        </tr>
      `;
    }).join('');

    // Attach delivery action buttons
    tbody.querySelectorAll('.btn-deliver').forEach(btn => {
      btn.addEventListener('click', () => handleDeliverOrder(btn.dataset.id, btn.dataset.num, btn));
    });

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color: var(--accent-rose); padding: 2rem;">Error: ${err.message}</td></tr>`;
  }
}

// 3. Deliver Software API Execution
async function handleDeliverOrder(orderId, orderNum, btnElement) {
  try {
    if (btnElement) {
      btnElement.disabled = true;
      btnElement.textContent = 'Generating Keys in SSMS...';
    }

    const res = await window.api.deliverOrder(orderId);

    const keysStr = res.licenses.map(l => `${l.productName}: ${l.licenseKey}`).join('\n');
    window.showToast(`Software for Order #${orderNum} Delivered! Cryptographic keys generated in database.`, 'success');

    await loadAdminStats();
    await loadAdminOrders();
  } catch (err) {
    window.showToast(err.message, 'error');
    if (btnElement) {
      btnElement.disabled = false;
      btnElement.textContent = '⚡ Deliver Software';
    }
  }
}

// 4. Products Management
async function loadAdminProducts() {
  const tbody = document.getElementById('products-table-body');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">Loading products from SQL Server...</td></tr>';

  try {
    const res = await window.api.getProducts();
    if (!res.products || res.products.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No products found.</td></tr>';
      return;
    }

    tbody.innerHTML = res.products.map(p => `
      <tr>
        <td>
          <strong>${escapeHtml(p.name)}</strong>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(p.tagline || '')}</div>
        </td>
        <td>
          <span class="badge badge-version">${escapeHtml(p.version)}</span>
        </td>
        <td>${escapeHtml(p.category_name)}</td>
        <td style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-cyan);">$${Number(p.price).toFixed(2)}</td>
        <td style="font-size: 0.85rem;">${escapeHtml(p.platform)}</td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="handleDeleteProduct(${p.product_id})" style="color: var(--accent-rose);">
            Deactivate
          </button>
        </td>
      </tr>
    `).join('');

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color: var(--accent-rose);">${err.message}</td></tr>`;
  }
}

// 5. Create Software Product
async function handleCreateProduct(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');

  const newProduct = {
    categoryId: document.getElementById('new-prod-cat').value,
    name: document.getElementById('new-prod-name').value,
    tagline: document.getElementById('new-prod-tagline').value,
    version: document.getElementById('new-prod-version').value,
    platform: document.getElementById('new-prod-platform').value,
    licenseType: document.getElementById('new-prod-lic').value,
    price: document.getElementById('new-prod-price').value,
    originalPrice: document.getElementById('new-prod-orig-price').value || null,
    fileSize: document.getElementById('new-prod-size').value,
    description: document.getElementById('new-prod-desc').value,
    imageUrl: document.getElementById('new-prod-img').value || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600',
    isFeatured: document.getElementById('new-prod-featured').checked ? 1 : 0
  };

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving to SSMS 2022...';

    await window.api.createProduct(newProduct);
    window.showToast(`Software "${newProduct.name}" registered in database!`, 'success');

    document.getElementById('add-product-modal')?.close();
    form.reset();
    await loadAdminProducts();
    await loadAdminStats();
  } catch (err) {
    window.showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Register Software Product';
  }
}

window.handleDeleteProduct = async function(productId) {
  if (!confirm('Are you sure you want to deactivate this software product in the database?')) return;
  try {
    await window.api.deleteProduct(productId);
    window.showToast('Product deactivated in database.', 'info');
    await loadAdminProducts();
    await loadAdminStats();
  } catch (err) {
    window.showToast(err.message, 'error');
  }
};

// 6. Issued Licenses Registry
async function loadAdminLicenses() {
  const tbody = document.getElementById('licenses-table-body');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">Loading cryptographic licenses from database...</td></tr>';

  try {
    const res = await window.api.getAdminLicenses();
    if (!res.licenses || res.licenses.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No licenses generated yet.</td></tr>';
      return;
    }

    tbody.innerHTML = res.licenses.map(lic => `
      <tr>
        <td>
          <code style="background: #040711; padding: 0.3rem 0.6rem; border-radius: 4px; border: 1px solid var(--border-accent); color: var(--accent-cyan); font-weight: bold;">
            ${escapeHtml(lic.license_key)}
          </code>
        </td>
        <td>
          <strong>${escapeHtml(lic.product_name)}</strong>
          <span style="font-size: 0.75rem; color: var(--text-muted);">(${escapeHtml(lic.version)})</span>
        </td>
        <td>${escapeHtml(lic.customer_email)}</td>
        <td style="font-family: var(--font-mono); font-size: 0.85rem;">${escapeHtml(lic.order_number)}</td>
        <td>
          <span class="badge" style="background: rgba(0, 255, 170, 0.15); color: var(--accent-emerald); border: 1px solid var(--accent-emerald);">
            ${escapeHtml(lic.status)}
          </span>
        </td>
        <td style="font-size: 0.8rem; color: var(--text-muted);">${new Date(lic.issued_at).toLocaleString()}</td>
      </tr>
    `).join('');

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color: var(--accent-rose);">${err.message}</td></tr>`;
  }
}

// 7. Users Directory
async function loadAdminUsers() {
  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">Loading users from Users table...</td></tr>';

  try {
    const res = await window.api.getAdminUsers();
    tbody.innerHTML = res.users.map(u => `
      <tr>
        <td>#${u.user_id}</td>
        <td><strong>${escapeHtml(u.full_name)}</strong></td>
        <td>${escapeHtml(u.email)}</td>
        <td>
          <span class="badge" style="${u.role === 'admin' ? 'background: rgba(157, 78, 221, 0.2); color: var(--accent-purple); border: 1px solid var(--accent-purple);' : 'background: rgba(0, 240, 255, 0.1); color: var(--accent-cyan); border: 1px solid var(--accent-cyan);'}">
            ${u.role}
          </span>
        </td>
        <td style="font-size: 0.8rem; color: var(--text-muted);">${new Date(u.created_at).toLocaleDateString()}</td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="color: var(--accent-rose);">${err.message}</td></tr>`;
  }
}

// 8. Database Audit Logs
async function loadAdminLogs() {
  const tbody = document.getElementById('logs-table-body');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">Querying AuditLogs table...</td></tr>';

  try {
    const res = await window.api.getAdminLogs();
    tbody.innerHTML = res.logs.map(log => `
      <tr>
        <td style="font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-muted);">${new Date(log.created_at).toLocaleTimeString()}</td>
        <td><strong style="color: var(--accent-cyan);">${escapeHtml(log.action_type)}</strong></td>
        <td style="font-family: var(--font-mono); font-size: 0.82rem;">${escapeHtml(log.endpoint)}</td>
        <td style="font-size: 0.8rem;">${escapeHtml(log.user_email || 'System/Public')}</td>
        <td style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-secondary); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${escapeHtml(log.details || '')}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="color: var(--accent-rose);">${err.message}</td></tr>`;
  }
}

document.addEventListener('DOMContentLoaded', initAdmin);
