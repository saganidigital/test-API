/**
 * STOREFRONT CLIENT LOGIC
 * Manages Catalog Browsing, Search, Filters, Cart Drawer, Checkout, and Software Locker.
 */

let currentCategory = 'all';
let currentSearch = '';
let currentSort = 'featured';

// Dialog light-dismiss polyfill fallback (Modern Web Guidance)
function attachDialogFallback(dialog) {
  if (!dialog) return;
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isInside = (
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      );
      if (!isInside) dialog.close();
    });
  }
}

// ─── Scroll Reveal Observer ─────────────────────────────────────────────────
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.08,
  rootMargin: '0px 0px -50px 0px'
});

// ─── Skeleton Loader Generator ──────────────────────────────────────────────
function renderSkeletonCards(count = 6) {
  return Array.from({ length: count }, () => `
    <div class="skeleton-card">
      <div class="skeleton-img"></div>
      <div class="skeleton-body">
        <div class="skeleton-line short"></div>
        <div class="skeleton-line long"></div>
        <div class="skeleton-line medium"></div>
        <div class="skeleton-line short"></div>
        <div class="skeleton-line price"></div>
      </div>
    </div>
  `).join('');
}

// 1. Initialize Storefront
async function initStorefront() {
  await loadCategories();
  await loadProducts();
  await updateCartBadge();

  // Attach modal listeners
  const prodModal = document.getElementById('product-modal');
  const endpointsModal = document.getElementById('endpoints-modal');
  attachDialogFallback(prodModal);
  attachDialogFallback(endpointsModal);

  // Search input with debounce
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    let timer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        currentSearch = e.target.value;
        loadProducts();
      }, 250);
    });
  }

  // Sort dropdown
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      loadProducts();
    });
  }

  // Cart Drawer open/close
  document.getElementById('btn-open-cart')?.addEventListener('click', openCartDrawer);
  document.getElementById('btn-close-cart')?.addEventListener('click', closeCartDrawer);
  document.getElementById('cart-overlay')?.addEventListener('click', closeCartDrawer);

  // Checkout button
  document.getElementById('btn-checkout')?.addEventListener('click', handleCheckout);

  // Locker Tab Nav
  document.getElementById('nav-link-locker')?.addEventListener('click', (e) => {
    e.preventDefault();
    showLockerSection();
  });

  document.getElementById('nav-link-catalog')?.addEventListener('click', (e) => {
    e.preventDefault();
    showCatalogSection();
  });

  // Footer locker link
  document.getElementById('footer-locker-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    showLockerSection();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // System API Endpoints button
  document.getElementById('btn-view-api-specs')?.addEventListener('click', openEndpointsModal);

  // Mobile hamburger toggle
  const hamburgerBtn = document.getElementById('hamburger-toggle');
  const navLinksList = document.getElementById('nav-links-list');
  if (hamburgerBtn && navLinksList) {
    hamburgerBtn.addEventListener('click', () => {
      hamburgerBtn.classList.toggle('active');
      navLinksList.classList.toggle('mobile-open');
    });

    // Close on nav link click
    navLinksList.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        hamburgerBtn.classList.remove('active');
        navLinksList.classList.remove('mobile-open');
      });
    });
  }
}

// 2. Load Categories
async function loadCategories() {
  const pillsContainer = document.getElementById('category-pills');
  if (!pillsContainer) return;

  try {
    const res = await window.api.getCategories();
    if (res.success && res.categories) {
      let html = `<button class="cat-pill active" data-cat="all">All Software</button>`;
      res.categories.forEach(cat => {
        html += `
          <button class="cat-pill" data-cat="${cat.slug}">
            ${cat.name} (${cat.product_count})
          </button>
        `;
      });
      pillsContainer.innerHTML = html;

      pillsContainer.querySelectorAll('.cat-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          pillsContainer.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentCategory = btn.dataset.cat;
          loadProducts();
        });
      });
    }
  } catch (err) {
    console.error('Failed to load categories:', err);
  }
}

// 3. Load Products Grid
async function loadProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  // Show skeleton loading
  grid.innerHTML = renderSkeletonCards(6);

  try {
    const res = await window.api.getProducts({
      category: currentCategory,
      search: currentSearch,
      sort: currentSort
    });

    if (!res.products || res.products.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem; background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
          <h3 style="margin-bottom: 0.5rem;">No software products found</h3>
          <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Try adjusting your search terms or category filter.</p>
          <button class="btn btn-outline btn-sm" onclick="resetFilters()">Reset Filters</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = res.products.map(p => `
      <article class="product-card reveal ${p.is_featured ? 'featured-card' : ''}" data-id="${p.product_id}">
        <div class="product-card-img-wrapper">
          <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" class="product-card-img" loading="lazy">
          <div class="product-badge-stack">
            ${p.is_featured ? `<span class="badge badge-featured">★ Featured</span>` : ''}
            <span class="badge badge-version">${escapeHtml(p.version)}</span>
          </div>
        </div>

        <div class="product-card-body">
          <span class="product-category-tag">${escapeHtml(p.category_name)}</span>
          <h3 class="product-title">${escapeHtml(p.name)}</h3>
          <p class="product-tagline">${escapeHtml(p.tagline || p.description)}</p>

          <div class="product-meta-row">
            <span class="product-platform">💻 ${escapeHtml(p.platform)}</span>
            <span title="File size">📦 ${escapeHtml(p.file_size || 'Digital')}</span>
          </div>

          <div class="product-card-footer">
            <div class="price-box">
              <span class="price-current">$${Number(p.price).toFixed(2)}</span>
              ${p.original_price ? `<span class="price-original">$${Number(p.original_price).toFixed(2)}</span>` : ''}
            </div>

            <div class="card-actions">
              <button class="btn btn-secondary btn-sm btn-quickview" data-id="${p.product_id}" title="View Software Specs">
                Specs
              </button>
              <button class="btn btn-primary btn-sm btn-add-cart" data-id="${p.product_id}" data-name="${escapeHtml(p.name)}">
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </article>
    `).join('');

    // Attach card event listeners
    grid.querySelectorAll('.btn-quickview').forEach(btn => {
      btn.addEventListener('click', () => openProductModal(btn.dataset.id));
    });

    grid.querySelectorAll('.btn-add-cart').forEach(btn => {
      btn.addEventListener('click', () => handleAddToCart(btn.dataset.id, btn.dataset.name));
    });

    // Activate scroll-reveal on new cards
    grid.querySelectorAll('.reveal').forEach(el => {
      revealObserver.observe(el);
    });

  } catch (err) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--accent-rose);">
        Failed to load software from database: ${err.message}
      </div>
    `;
  }
}

// 4. Quick View Modal
async function openProductModal(productId) {
  const modal = document.getElementById('product-modal');
  if (!modal) return;

  try {
    const res = await window.api.getProductById(productId);
    const p = res.product;

    const modalBody = document.getElementById('product-modal-body');
    modalBody.innerHTML = `
      <div style="display: flex; gap: 1.5rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
        <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" style="width: 140px; height: 140px; object-fit: cover; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
        <div style="flex: 1;">
          <div style="color: var(--accent-cyan); font-family: var(--font-mono); font-size: 0.8rem; text-transform: uppercase;">${escapeHtml(p.category_name)} • ${escapeHtml(p.version)}</div>
          <h2 style="font-size: 1.6rem; font-weight: 800; margin: 0.25rem 0;">${escapeHtml(p.name)}</h2>
          <p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 0.75rem;">${escapeHtml(p.tagline || '')}</p>
          <div style="display: flex; align-items: center; gap: 1rem;">
            <span style="font-family: var(--font-mono); font-size: 1.5rem; font-weight: 800; color: var(--accent-cyan);">$${Number(p.price).toFixed(2)}</span>
            <span style="color: var(--text-muted); font-size: 0.85rem; background: var(--bg-tertiary); padding: 0.2rem 0.6rem; border-radius: 4px;">${escapeHtml(p.license_type)}</span>
          </div>
        </div>
      </div>

      <div style="margin-bottom: 1.5rem;">
        <h4 style="font-size: 1rem; margin-bottom: 0.5rem; color: var(--text-primary);">Description</h4>
        <p style="color: var(--text-secondary); font-size: 0.92rem; line-height: 1.6;">${escapeHtml(p.description)}</p>
      </div>

      ${p.features && p.features.length > 0 ? `
        <div style="margin-bottom: 1.5rem;">
          <h4 style="font-size: 1rem; margin-bottom: 0.5rem; color: var(--text-primary);">Key Architectural Features</h4>
          <ul style="padding-left: 1.25rem; color: var(--text-secondary); font-size: 0.9rem; display: flex; flex-direction: column; gap: 0.35rem;">
            ${p.features.map(f => `<li>${escapeHtml(f)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border-subtle);">
        <button class="btn btn-secondary" onclick="document.getElementById('product-modal').close()">Close</button>
        <button class="btn btn-primary" onclick="handleAddToCart(${p.product_id}, '${escapeHtml(p.name)}'); document.getElementById('product-modal').close();">
          Add to Cart ($${Number(p.price).toFixed(2)})
        </button>
      </div>
    `;

    modal.showModal();
  } catch (err) {
    window.showToast(err.message, 'error');
  }
}

// 5. Cart Management
async function handleAddToCart(productId, productName) {
  if (!window.api.token) {
    window.showToast('Please sign in or create an account to purchase software.', 'info');
    openAuthModal('login');
    return;
  }

  try {
    await window.api.addToCart(productId, 1);
    window.showToast(`"${productName || 'Software'}" added to cart!`, 'success');
    await updateCartBadge();
  } catch (err) {
    window.showToast(err.message, 'error');
  }
}

async function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;

  if (!window.api.token) {
    badge.textContent = '0';
    return;
  }

  try {
    const res = await window.api.getCart();
    badge.textContent = res.count || '0';
  } catch (e) {
    badge.textContent = '0';
  }
}

async function openCartDrawer() {
  if (!window.api.token) {
    window.showToast('Please sign in to view your shopping cart.', 'info');
    openAuthModal('login');
    return;
  }

  const drawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  drawer?.classList.add('open');
  overlay?.classList.add('open');

  await renderCartDrawerItems();
}

function closeCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  drawer?.classList.remove('open');
  overlay?.classList.remove('open');
}

async function renderCartDrawerItems() {
  const container = document.getElementById('cart-items-container');
  const subtotalEl = document.getElementById('cart-subtotal');
  const totalEl = document.getElementById('cart-total');
  if (!container) return;

  container.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 2rem;">Loading cart from database...</div>';

  try {
    const res = await window.api.getCart();
    if (!res.items || res.items.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🛒</div>
          <p>Your cart is empty.</p>
        </div>
      `;
      if (subtotalEl) subtotalEl.textContent = '$0.00';
      if (totalEl) totalEl.textContent = '$0.00';
      document.getElementById('btn-checkout').disabled = true;
      return;
    }

    document.getElementById('btn-checkout').disabled = false;
    if (subtotalEl) subtotalEl.textContent = `$${res.subtotal.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${res.total.toFixed(2)}`;

    container.innerHTML = res.items.map(item => `
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-title">${escapeHtml(item.name)}</div>
          <div class="cart-item-price">$${Number(item.price).toFixed(2)} each</div>
        </div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="updateCartItemQty(${item.product_id}, ${item.quantity - 1})">-</button>
          <span style="font-family: var(--font-mono); font-weight: 600; min-width: 20px; text-align: center;">${item.quantity}</span>
          <button class="qty-btn" onclick="updateCartItemQty(${item.product_id}, ${item.quantity + 1})">+</button>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="removeCartItem(${item.product_id})" title="Remove item" style="color: var(--accent-rose);">
          ✕
        </button>
      </div>
    `).join('');

  } catch (err) {
    container.innerHTML = `<div style="color: var(--accent-rose); padding: 1rem;">${err.message}</div>`;
  }
}

window.updateCartItemQty = async function(productId, qty) {
  try {
    await window.api.updateCartQty(productId, qty);
    await renderCartDrawerItems();
    await updateCartBadge();
  } catch (err) {
    window.showToast(err.message, 'error');
  }
};

window.removeCartItem = async function(productId) {
  try {
    await window.api.removeCartItem(productId);
    await renderCartDrawerItems();
    await updateCartBadge();
    window.showToast('Item removed from cart.', 'info');
  } catch (err) {
    window.showToast(err.message, 'error');
  }
};

// 6. Checkout Flow
async function handleCheckout() {
  const checkoutBtn = document.getElementById('btn-checkout');
  try {
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = 'Processing Order...';

    const res = await window.api.checkout();
    window.showToast(`Order #${res.order.orderNumber} placed! Waiting for Admin delivery dispatch.`, 'success');

    closeCartDrawer();
    await updateCartBadge();

    // Show Customer Locker
    showLockerSection();
  } catch (err) {
    window.showToast(err.message, 'error');
  } finally {
    checkoutBtn.disabled = false;
    checkoutBtn.textContent = 'Complete Order via API';
  }
}

// 7. Customer Software Locker (Purchases, Keys, Downloads)
function showLockerSection() {
  if (!window.api.token) {
    window.showToast('Please sign in to view your software locker.', 'info');
    openAuthModal('login');
    return;
  }

  document.getElementById('catalog-section')?.style.setProperty('display', 'none');
  document.getElementById('locker-section')?.style.setProperty('display', 'block');
  document.getElementById('nav-link-catalog')?.classList.remove('active');
  document.getElementById('nav-link-locker')?.classList.add('active');

  loadCustomerLocker();
}

function showCatalogSection() {
  document.getElementById('locker-section')?.style.setProperty('display', 'none');
  document.getElementById('catalog-section')?.style.setProperty('display', 'block');
  document.getElementById('nav-link-locker')?.classList.remove('active');
  document.getElementById('nav-link-catalog')?.classList.add('active');
}

async function loadCustomerLocker() {
  const container = document.getElementById('locker-orders-container');
  if (!container) return;

  container.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 3rem;">Loading software licenses from database...</div>';

  try {
    const res = await window.api.getMyOrders();

    if (!res.orders || res.orders.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 4rem 1rem; background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🔐</div>
          <h3>Your Software Locker is Empty</h3>
          <p style="color: var(--text-muted); margin: 0.5rem 0 1.5rem;">You have not purchased any software products yet.</p>
          <button class="btn btn-primary" onclick="showCatalogSection()">Explore Software Catalog</button>
        </div>
      `;
      return;
    }

    container.innerHTML = res.orders.map(ord => {
      const isDelivered = ord.delivery_status === 'Delivered';
      return `
        <div class="locker-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
            <div>
              <div style="font-size: 0.8rem; font-family: var(--font-mono); color: var(--text-muted);">ORDER IDENTIFIER</div>
              <h3 style="font-family: var(--font-mono); font-size: 1.25rem; color: var(--text-primary);">${escapeHtml(ord.order_number)}</h3>
              <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">Placed on: ${new Date(ord.created_at).toLocaleString()}</div>
            </div>

            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.4rem;">
              <span class="status-badge ${isDelivered ? 'status-delivered' : 'status-pending'}">
                ${isDelivered ? '✓ Delivered & Activated' : '⏳ Awaiting Admin Delivery'}
              </span>
              <span style="font-family: var(--font-mono); font-size: 1.1rem; font-weight: 700;">$${Number(ord.total_amount).toFixed(2)}</span>
            </div>
          </div>

          <!-- Software Items in Order -->
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            ${ord.items.map(item => {
              // Find matching license if delivered
              const license = ord.licenses ? ord.licenses.find(l => l.product_id === item.product_id) : null;

              return `
                <div style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                  <div>
                    <h4 style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem;">
                      ${escapeHtml(item.product_name)} <span style="font-size: 0.8rem; color: var(--accent-cyan); font-family: var(--font-mono);">${escapeHtml(item.version)}</span>
                    </h4>
                    <div style="font-size: 0.85rem; color: var(--text-muted);">
                      Platform: ${escapeHtml(item.platform)} • License: ${escapeHtml(item.license_type)}
                    </div>
                  </div>

                  ${isDelivered && license ? `
                    <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
                      <div class="license-key-display">
                        <span>🔑</span>
                        <span id="key-${license.license_id}">${escapeHtml(license.license_key)}</span>
                        <button class="btn btn-ghost btn-sm" onclick="copyLicenseKey('${escapeHtml(license.license_key)}')" title="Copy License Key">
                          📋 Copy
                        </button>
                      </div>

                      <a href="${item.download_url || '/downloads/software-payload.zip'}" download class="btn btn-primary btn-sm" style="text-decoration: none;">
                        ⬇ Download Binary
                      </a>
                    </div>
                  ` : `
                    <div style="background: rgba(255, 170, 0, 0.1); border: 1px solid rgba(255, 170, 0, 0.3); border-radius: var(--radius-sm); padding: 0.6rem 1rem; color: var(--accent-amber); font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem;">
                      <span>⏳</span>
                      <span>Order received! Admin is verifying to issue your license key.</span>
                    </div>
                  `}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    container.innerHTML = `<div style="color: var(--accent-rose); padding: 2rem;">Failed to load locker: ${err.message}</div>`;
  }
}

window.copyLicenseKey = function(key) {
  navigator.clipboard.writeText(key).then(() => {
    window.showToast(`License Key copied to clipboard!`, 'success');
  }).catch(() => {
    window.showToast(`Key: ${key}`, 'info');
  });
};

// 8. System Endpoints Directory Modal (Button to API mapper)
async function openEndpointsModal() {
  const modal = document.getElementById('endpoints-modal');
  const body = document.getElementById('endpoints-modal-body');
  if (!modal || !body) return;

  body.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 2rem;">Loading API specifications from server...</div>';
  modal.showModal();

  try {
    const res = await window.api.getSystemEndpoints();
    body.innerHTML = `
      <div style="margin-bottom: 1.25rem;">
        <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem;">
          Database: <span style="color: var(--accent-cyan); font-family: var(--font-mono); font-weight: 700;">${escapeHtml(res.databaseEngine)}</span> • 
          Hashing: <span style="color: var(--accent-emerald); font-family: var(--font-mono); font-weight: 700;">${escapeHtml(res.security.passwordHashing)}</span>
        </div>
        <p style="font-size: 0.9rem; color: var(--text-secondary);">
          Every button on this website executes a dedicated REST API call directly against Microsoft SQL Server 2022. All database connection strings, credentials, and SQL logic remain hidden safely on the server.
        </p>
      </div>

      <div style="max-height: 400px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.75rem;">
        ${res.endpoints.map(ep => `
          <div style="background: var(--bg-primary); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 0.85rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
              <span style="font-weight: 700; color: var(--text-primary); font-size: 0.95rem;">🔘 ${escapeHtml(ep.buttonTrigger)}</span>
              <span style="font-family: var(--font-mono); font-size: 0.72rem; padding: 0.15rem 0.5rem; border-radius: 4px; background: rgba(0, 240, 255, 0.1); color: var(--accent-cyan);">
                ${escapeHtml(ep.authRequired)}
              </span>
            </div>
            <div style="font-family: var(--font-mono); font-size: 0.82rem; color: var(--accent-emerald); margin-bottom: 0.35rem;">
              [${escapeHtml(ep.method)}] ${escapeHtml(ep.url)}
            </div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">
              ${escapeHtml(ep.description)}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    body.innerHTML = `<div style="color: var(--accent-rose);">${err.message}</div>`;
  }
}

window.resetFilters = function() {
  currentCategory = 'all';
  currentSearch = '';
  currentSort = 'featured';
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';
  loadCategories();
  loadProducts();
};

window.refreshStoreData = function() {
  loadProducts();
  updateCartBadge();
  if (document.getElementById('locker-section')?.style.display === 'block') {
    loadCustomerLocker();
  }
};

document.addEventListener('DOMContentLoaded', initStorefront);
