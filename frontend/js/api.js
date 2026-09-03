/**
 * CENTRALIZED API CLIENT & LIVE INSPECTOR HOOK
 * Every button in the application invokes this client, which queries the SSMS 2022 database
 * while keeping all database connection strings and server code hidden.
 */

const API_BASE_URL = window.location.origin.includes(':5000') 
  ? '' 
  : 'http://localhost:5000';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('soft_auth_token') || null;
    this.user = JSON.parse(localStorage.getItem('soft_auth_user') || 'null');
    this.listeners = [];
    this.requestCount = 0;
  }

  setSession(user, token) {
    this.user = user;
    this.token = token;
    if (token) {
      localStorage.setItem('soft_auth_token', token);
      localStorage.setItem('soft_auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('soft_auth_token');
      localStorage.removeItem('soft_auth_user');
    }
    window.dispatchEvent(new CustomEvent('auth-changed', { detail: { user, token } }));
  }

  logout() {
    this.setSession(null, null);
    window.location.reload();
  }

  onApiActivity(callback) {
    this.listeners.push(callback);
  }

  async request(method, endpoint, body = null, customHeaders = {}) {
    const startTime = performance.now();
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...customHeaders
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config = {
      method,
      headers
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      config.body = JSON.stringify(body);
    }

    let response;
    let data;
    let isError = false;

    try {
      response = await fetch(url, config);
      const text = await response.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        data = { raw: text };
      }

      if (!response.ok) {
        isError = true;
      }
    } catch (err) {
      isError = true;
      data = { success: false, message: err.message || 'Network communication error.' };
      response = { status: 0, statusText: 'NETWORK_ERROR' };
    }

    const duration = Math.round(performance.now() - startTime);
    this.requestCount++;

    // Notify HUD and listeners
    const logEvent = {
      timestamp: new Date().toLocaleTimeString(),
      method,
      endpoint,
      status: response.status,
      duration,
      isError,
      requestBody: body,
      responseData: data
    };

    this.listeners.forEach(fn => fn(logEvent));
    window.dispatchEvent(new CustomEvent('api-log', { detail: logEvent }));

    // Update live ticker
    this._updateTicker(logEvent);

    if (isError) {
      const errorMsg = (data && data.message) ? data.message : `HTTP ${response.status}: Request failed`;
      const error = new Error(errorMsg);
      error.data = data;
      error.status = response.status;
      throw error;
    }

    return data;
  }

  // Live API Ticker in hero section
  _updateTicker(event) {
    const tickerBody = document.getElementById('api-ticker-body');
    const tickerCount = document.getElementById('api-ticker-count');
    if (!tickerBody) return;

    // Update counter
    if (tickerCount) {
      tickerCount.textContent = `${this.requestCount} request${this.requestCount !== 1 ? 's' : ''}`;
    }

    // Clear placeholder
    if (this.requestCount === 1) {
      tickerBody.innerHTML = '';
    }

    const methodClass = event.method.toLowerCase();
    const statusClass = event.isError ? 'err' : 'ok';
    const statusText = event.isError ? `${event.status} ERR` : `${event.status} OK`;

    const entry = document.createElement('div');
    entry.className = 'api-ticker-entry';
    entry.innerHTML = `
      <span style="font-size: 0.65rem; color: var(--text-muted);">${event.timestamp}</span>
      <span class="method-tag ${methodClass}">${event.method}</span>
      <span class="endpoint-text">${event.endpoint.length > 35 ? event.endpoint.substring(0, 35) + '…' : event.endpoint}</span>
      <span class="status-text ${statusClass}">${statusText}</span>
      <span class="duration-text">${event.duration}ms</span>
    `;

    tickerBody.insertBefore(entry, tickerBody.firstChild);

    // Keep max 20 entries
    while (tickerBody.children.length > 20) {
      tickerBody.removeChild(tickerBody.lastChild);
    }
  }

  // --- AUTH APIs ---
  async register(fullName, email, password) {
    const res = await this.request('POST', '/api/auth/register', { fullName, email, password });
    if (res.token && res.user) {
      this.setSession(res.user, res.token);
    }
    return res;
  }

  async login(email, password) {
    const res = await this.request('POST', '/api/auth/login', { email, password });
    if (res.token && res.user) {
      this.setSession(res.user, res.token);
    }
    return res;
  }

  async getMe() {
    return await this.request('GET', '/api/auth/me');
  }

  // --- PRODUCT CATALOG APIs ---
  async getProducts(params = {}) {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'all') query.set('category', params.category);
    if (params.search) query.set('search', params.search);
    if (params.sort) query.set('sort', params.sort);
    if (params.featured) query.set('featured', '1');

    const qs = query.toString() ? `?${query.toString()}` : '';
    return await this.request('GET', `/api/products${qs}`);
  }

  async getProductById(id) {
    return await this.request('GET', `/api/products/${id}`);
  }

  async getCategories() {
    return await this.request('GET', '/api/categories');
  }

  // --- CART APIs ---
  async getCart() {
    return await this.request('GET', '/api/cart');
  }

  async addToCart(productId, quantity = 1) {
    return await this.request('POST', '/api/cart/add', { productId, quantity });
  }

  async updateCartQty(productId, quantity) {
    return await this.request('PUT', '/api/cart/update', { productId, quantity });
  }

  async removeCartItem(productId) {
    return await this.request('DELETE', `/api/cart/remove/${productId}`);
  }

  async clearCart() {
    return await this.request('DELETE', '/api/cart/clear');
  }

  // --- ORDER & DELIVERY APIs ---
  async checkout() {
    return await this.request('POST', '/api/orders/checkout');
  }

  async getMyOrders() {
    return await this.request('GET', '/api/orders/my-orders');
  }

  async getOrderById(id) {
    return await this.request('GET', `/api/orders/${id}`);
  }

  // --- ADMIN APIs ---
  async getAdminStats() {
    return await this.request('GET', '/api/admin/stats');
  }

  async getAdminOrders() {
    return await this.request('GET', '/api/admin/orders');
  }

  async deliverOrder(orderId) {
    return await this.request('POST', `/api/admin/orders/${orderId}/deliver`);
  }

  async createProduct(data) {
    return await this.request('POST', '/api/admin/products', data);
  }

  async updateProduct(id, data) {
    return await this.request('PUT', `/api/admin/products/${id}`, data);
  }

  async deleteProduct(id) {
    return await this.request('DELETE', `/api/admin/products/${id}`);
  }

  async getAdminLicenses() {
    return await this.request('GET', '/api/admin/licenses');
  }

  async getAdminUsers() {
    return await this.request('GET', '/api/admin/users');
  }

  async getAdminLogs() {
    return await this.request('GET', '/api/admin/logs');
  }

  // --- SYSTEM METADATA API ---
  async getSystemEndpoints() {
    return await this.request('GET', '/api/system/endpoints');
  }
}

// Global API instance
window.api = new ApiClient();

// Toast helper
window.showToast = function(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? '✓' : type === 'error' ? '⚠' : 'ℹ';
  toast.innerHTML = `
    <span style="font-weight: bold; color: ${type === 'success' ? 'var(--accent-emerald)' : type === 'error' ? 'var(--accent-rose)' : 'var(--accent-cyan)'};">${icon}</span>
    <div style="flex: 1;">${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};


