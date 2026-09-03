/**
 * CENTRALIZED API CLIENT & LIVE INSPECTOR HOOK
 * Every button in the application invokes this client, which queries the SSMS 2022 database
 * while keeping all database connection strings and server code hidden.
 * Includes intelligent offline / demo mode fallback when deployed to cloud hosts (e.g. Vercel).
 */

const API_BASE_URL = (function() {
  if (typeof window === 'undefined') return '';
  if (window.API_BASE_URL) return window.API_BASE_URL;
  const customUrl = localStorage.getItem('NEXUS_API_URL');
  if (customUrl) return customUrl.replace(/\/$/, '');

  // Local server on port 5000
  if (window.location.port === '5000') {
    return '';
  }

  // Local development via Live Server or custom port
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  }

  // Cloud/Production (e.g. Vercel)
  return '';
})();

// Demo seed data for cloud preview / offline resiliency
const DEMO_CATEGORIES = [
  { category_id: 1, name: 'Cybersecurity & Protection', slug: 'cybersecurity', icon: 'shield-lock', product_count: 2 },
  { category_id: 2, name: 'Developer & Coding Tools', slug: 'developer-tools', icon: 'code-square', product_count: 2 },
  { category_id: 3, name: 'Cloud, Server & DevOps', slug: 'devops-cloud', icon: 'cloud-arrow-up', product_count: 1 },
  { category_id: 4, name: 'Creative & UI/UX Design', slug: 'creative-design', icon: 'palette', product_count: 1 },
  { category_id: 5, name: 'System Utilities & Performance', slug: 'system-utilities', icon: 'cpu', product_count: 1 }
];

const DEMO_PRODUCTS = [
  {
    product_id: 1,
    category_id: 1,
    category_slug: 'cybersecurity',
    category_name: 'Cybersecurity & Protection',
    name: 'CyberShield Endpoint Enterprise',
    tagline: 'Military-Grade Zero Trust Threat Defense & Ransomware Shield',
    version: 'v5.4.2',
    platform: 'Windows 10/11, macOS, Linux x64',
    license_type: 'Annual Enterprise Subscription',
    price: 149.99,
    original_price: 199.99,
    description: 'Comprehensive AI-driven endpoint protection with real-time heuristic scanning, automated zero-day quarantine, integrated firewall, and encrypted cloud telemetry backup.',
    image_url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop&q=80',
    download_url: '/downloads/cybershield-enterprise-v5.4.2.zip',
    file_size: '412 MB',
    features: JSON.stringify([
      'Heuristic Behavioral AI Engine',
      'Kernel-Level Ransomware Blocker',
      'Zero-Day Vulnerability Patch Assistant',
      'Centralized Fleet Management Console',
      '24/7 Priority Emergency Support'
    ]),
    system_reqs: JSON.stringify({ os: 'Windows 10/11 / macOS 13+ / Ubuntu 22.04+', ram: '8 GB RAM', cpu: 'Quad-Core 2.0 GHz', storage: '2 GB free disk space' }),
    rating: 4.95,
    review_count: 142,
    is_featured: 1
  },
  {
    product_id: 2,
    category_id: 2,
    category_slug: 'developer-tools',
    category_name: 'Developer & Coding Tools',
    name: 'Quantum Code Studio IDE',
    tagline: 'Ultra-Fast Polyglot Code Editor with Local AI Copilot',
    version: 'v2026.2.0',
    platform: 'Windows, macOS, Linux',
    license_type: 'Perpetual Commercial License',
    price: 89.00,
    original_price: 120.00,
    description: 'The premier code editor tailored for modern software architects. Sub-millisecond syntax highlighting, built-in offline neural completion, graphical Git visualizer, and AST refactoring toolkit.',
    image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
    download_url: '/downloads/quantum-code-studio-2026.2.exe',
    file_size: '278 MB',
    features: JSON.stringify([
      'Sub-millisecond Typing Latency',
      'Offline Local Neural Code Completion',
      'Integrated Interactive Regex & AST Visualizer',
      'Built-in Docker & Remote SSH Workspaces',
      'Commercial License with Lifetime Minor Updates'
    ]),
    system_reqs: JSON.stringify({ os: '64-bit OS', ram: '4 GB RAM', cpu: 'Dual-Core 1.8 GHz', storage: '1 GB' }),
    rating: 4.92,
    review_count: 310,
    is_featured: 1
  },
  {
    product_id: 3,
    category_id: 3,
    category_slug: 'devops-cloud',
    category_name: 'Cloud, Server & DevOps',
    name: 'CloudScale K8s Manager Pro',
    tagline: 'Unified Multi-Cluster Kubernetes Dashboard & Cost Optimizer',
    version: 'v3.1.4',
    platform: 'Cross-Platform Web GUI & CLI',
    license_type: 'Annual Team License',
    price: 219.00,
    original_price: 289.00,
    description: 'Monitor, orchestrate, and optimize cloud spend across AWS, Azure, and GCP clusters with instant visual topology, automatic pod right-sizing, and one-click blue/green rollback.',
    image_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
    download_url: '/downloads/cloudscale-k8s-v3.1.4.tar.gz',
    file_size: '185 MB',
    features: JSON.stringify([
      'Real-time Cluster Resource Heatmaps',
      'Automatic Idle Resource Pruning (saves ~35% bill)',
      'Zero-Downtime Deployment Canary Controller',
      'RBAC & Audit Trail Compliance Export',
      'Helm 3 & Kustomize Direct Sync'
    ]),
    system_reqs: JSON.stringify({ os: 'Linux / macOS / Windows WSL2', ram: '8 GB RAM', cpu: 'Intel/AMD 4 Cores', storage: '500 MB' }),
    rating: 4.88,
    review_count: 96,
    is_featured: 1
  },
  {
    product_id: 4,
    category_id: 4,
    category_slug: 'creative-design',
    category_name: 'Creative & UI/UX Design',
    name: 'VectorMaster Studio 8',
    tagline: 'Infinite Canvas Vector Graphics & Design System Generator',
    version: 'v8.0.5',
    platform: 'Windows 11, macOS Sequoia',
    license_type: 'Perpetual Commercial License',
    price: 129.99,
    original_price: 179.99,
    description: 'Precision vector illustration software for UI designers, game artists, and brand creators. Non-destructive booleans, CMYK + Pantone print engine, and instant SVG/WebP exporter.',
    image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    download_url: '/downloads/vectormaster-studio-8.msi',
    file_size: '650 MB',
    features: JSON.stringify([
      'GPU-Accelerated 1,000,000% Zoom Engine',
      'Live Responsive Layout Constraints',
      'Direct Code Export (HTML5 Canvas, React, SVG)',
      'Pantone Matching System Certified',
      'Supports Wacom & Apple Pencil Pressure Curves'
    ]),
    system_reqs: JSON.stringify({ os: 'Windows 10/11 64-bit / macOS 12+', ram: '8 GB RAM', cpu: 'Dedicated GPU 2GB VRAM', storage: '3 GB' }),
    rating: 4.94,
    review_count: 184,
    is_featured: 0
  },
  {
    product_id: 5,
    category_id: 5,
    category_slug: 'system-utilities',
    category_name: 'System Utilities & Performance',
    name: 'SysOptima 2026 Ultra',
    tagline: 'Deep Hardware Tuning, RAM Cache Accelerator & SSD Lifespan Guard',
    version: 'v4.2.1',
    platform: 'Windows 10 / Windows 11',
    license_type: 'Lifetime 3-PC License',
    price: 49.95,
    original_price: 69.95,
    description: 'Unlock maximum gaming FPS and workstation snappiness. Eliminates telemetry bloatware, reorganizes disk paging buffers, and lowers background CPU jitter.',
    image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
    download_url: '/downloads/sysoptima-2026-ultra.exe',
    file_size: '35 MB',
    features: JSON.stringify([
      'Intelligent Gaming Mode Process Priority Boost',
      'Windows 11 Privacy & Telemetry Hardener',
      'NVMe / SSD TRIM Optimization & Health Telemetry',
      'Duplicate File Finder & Clean Uninstaller',
      'One-Click System Restore Point Guard'
    ]),
    system_reqs: JSON.stringify({ os: 'Windows 10 / 11 (32/64 bit)', ram: '2 GB RAM', cpu: '1.0 GHz', storage: '100 MB' }),
    rating: 4.85,
    review_count: 520,
    is_featured: 0
  },
  {
    product_id: 6,
    category_id: 1,
    category_slug: 'cybersecurity',
    category_name: 'Cybersecurity & Protection',
    name: 'NetSentry Deep Packet Sniffer',
    tagline: 'Hardware-Level Traffic Inspection, Protocol Analyzer & Intrusion Hunter',
    version: 'v2.9.0',
    platform: 'Windows / Linux',
    license_type: 'Enterprise Commercial License',
    price: 185.00,
    original_price: 240.00,
    description: 'Capture, dissect, and inspect raw 10G/40G network frames in real time with hardware timestamping, TLS decryption proxying, and automated MITRE ATT&CK mapping.',
    image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80',
    download_url: '/downloads/netsentry-sniffer-v2.9.zip',
    file_size: '120 MB',
    features: JSON.stringify([
      'PCAPng Multi-Gigabit Ingestion Stream',
      'Deep TLS 1.3 Handshake Decoder',
      'Automated Rogue DNS / DHCP Alert Engine',
      'Wireshark Filter Syntax Compatibility',
      'Enterprise PDF Executive Compliance Reports'
    ]),
    system_reqs: JSON.stringify({ os: 'Windows 10/11 / Linux Kernel 5.4+', ram: '8 GB RAM', cpu: 'Intel Core i5 or better', storage: '2 GB' }),
    rating: 4.90,
    review_count: 77,
    is_featured: 0
  },
  {
    product_id: 7,
    category_id: 2,
    category_slug: 'developer-tools',
    category_name: 'Developer & Coding Tools',
    name: 'DataPulse API Mock & Testing Suite',
    tagline: 'High-Throughput Synthetic API Mocking, Chaos Injection & Contract Tests',
    version: 'v1.8.4',
    platform: 'Cross-Platform Windows/Mac/Linux',
    license_type: 'Professional License',
    price: 69.00,
    original_price: 99.00,
    description: 'Spin up simulated microservice fleets with dynamic latency spikes, error injection, OpenAPI 3.1 validation, and integrated load stress testing.',
    image_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
    download_url: '/downloads/datapulse-api-suite-v1.8.4.zip',
    file_size: '95 MB',
    features: JSON.stringify([
      'Zero-Code Dynamic Mock Schema Engines',
      'Chaos Engineering Latency & Dropped Connection Sim',
      'GraphQL, gRPC, and REST Full Protocol Support',
      'CI/CD Headless CLI Runner included',
      'Automatic OpenAPI Spec Auto-Generation'
    ]),
    system_reqs: JSON.stringify({ os: 'All Platforms', ram: '4 GB RAM', cpu: 'Dual Core', storage: '500 MB' }),
    rating: 4.87,
    review_count: 115,
    is_featured: 0
  }
];

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('soft_auth_token') || null;
    this.user = JSON.parse(localStorage.getItem('soft_auth_user') || 'null');
    this.listeners = [];
    this.requestCount = 0;
    this.isDemoMode = false;
    this.demoNoticeShown = false;
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

  _showDemoNoticeOnce() {
    if (this.demoNoticeShown) return;
    this.demoNoticeShown = true;
    this.isDemoMode = true;

    // Check if banner already added
    if (!document.getElementById('demo-mode-banner')) {
      const banner = document.createElement('div');
      banner.id = 'demo-mode-banner';
      banner.style.cssText = `
        background: linear-gradient(90deg, rgba(0, 240, 255, 0.15), rgba(157, 78, 221, 0.15));
        border-bottom: 1px solid rgba(0, 240, 255, 0.3);
        color: #f0f4fc;
        font-family: var(--font-mono, monospace);
        font-size: 0.78rem;
        padding: 0.45rem 1rem;
        text-align: center;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        position: relative;
        z-index: 10000;
      `;
      banner.innerHTML = `
        <span>⚡ <strong>Interactive Cloud Demo Mode:</strong> Database endpoints simulated. To query live SSMS 2022 instance, run backend locally on port 5000.</span>
        <button style="background:none; border:none; color: var(--text-muted, #888); cursor:pointer; font-size: 1rem; margin-left: 0.5rem;" onclick="this.parentElement.remove()" title="Dismiss">✕</button>
      `;
      document.body.prepend(banner);
    }
  }

  // Handle fallback mock operations for cloud preview
  _handleDemoFallback(method, endpoint, body) {
    const urlObj = new URL('http://dummy.test' + endpoint);
    const path = urlObj.pathname;
    const params = urlObj.searchParams;

    // Categories
    if (path === '/api/categories') {
      return { success: true, categories: DEMO_CATEGORIES };
    }

    // Product Catalog
    if (path === '/api/products') {
      let filtered = [...DEMO_PRODUCTS];
      const cat = params.get('category');
      const search = params.get('search');
      const sort = params.get('sort');

      if (cat && cat !== 'all') {
        filtered = filtered.filter(p => p.category_slug === cat);
      }
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.tagline.toLowerCase().includes(q));
      }
      if (sort === 'price-low') {
        filtered.sort((a, b) => a.price - b.price);
      } else if (sort === 'price-high') {
        filtered.sort((a, b) => b.price - a.price);
      } else if (sort === 'rating') {
        filtered.sort((a, b) => b.rating - a.rating);
      }

      return { success: true, products: filtered, total: filtered.length };
    }

    // Product Details
    if (path.startsWith('/api/products/')) {
      const id = parseInt(path.split('/')[3], 10);
      const product = DEMO_PRODUCTS.find(p => p.product_id === id) || DEMO_PRODUCTS[0];
      return { success: true, product };
    }

    // Cart Operations
    if (path === '/api/cart') {
      const cart = JSON.parse(localStorage.getItem('demo_cart') || '[]');
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      return {
        success: true,
        items: cart,
        summary: {
          subtotal,
          tax: subtotal * 0.08,
          total: subtotal * 1.08,
          itemCount: cart.reduce((sum, item) => sum + item.quantity, 0)
        }
      };
    }

    if (path === '/api/cart/add' && method === 'POST') {
      const { productId, quantity = 1 } = body || {};
      const product = DEMO_PRODUCTS.find(p => p.product_id === Number(productId)) || DEMO_PRODUCTS[0];
      let cart = JSON.parse(localStorage.getItem('demo_cart') || '[]');
      const existing = cart.find(i => i.product_id === product.product_id);
      if (existing) {
        existing.quantity += Number(quantity);
      } else {
        cart.push({
          cart_item_id: Date.now(),
          product_id: product.product_id,
          name: product.name,
          price: product.price,
          image_url: product.image_url,
          quantity: Number(quantity),
          license_type: product.license_type
        });
      }
      localStorage.setItem('demo_cart', JSON.stringify(cart));
      return { success: true, message: `${product.name} added to cart!`, cartCount: cart.reduce((s, i) => s + i.quantity, 0) };
    }

    if (path === '/api/cart/update' && method === 'PUT') {
      const { productId, quantity } = body || {};
      let cart = JSON.parse(localStorage.getItem('demo_cart') || '[]');
      cart = cart.map(i => i.product_id === Number(productId) ? { ...i, quantity: Number(quantity) } : i).filter(i => i.quantity > 0);
      localStorage.setItem('demo_cart', JSON.stringify(cart));
      return { success: true, message: 'Cart updated.' };
    }

    if (path.startsWith('/api/cart/remove/') && method === 'DELETE') {
      const productId = Number(path.split('/')[4]);
      let cart = JSON.parse(localStorage.getItem('demo_cart') || '[]');
      cart = cart.filter(i => i.product_id !== productId);
      localStorage.setItem('demo_cart', JSON.stringify(cart));
      return { success: true, message: 'Item removed from cart.' };
    }

    if (path === '/api/cart/clear' && method === 'DELETE') {
      localStorage.setItem('demo_cart', JSON.stringify([]));
      return { success: true, message: 'Cart cleared.' };
    }

    // Checkout & Orders
    if (path === '/api/orders/checkout' && method === 'POST') {
      const cart = JSON.parse(localStorage.getItem('demo_cart') || '[]');
      if (cart.length === 0) {
        return { success: false, message: 'Cart is empty.' };
      }
      const orderNum = 'ORD-2026-' + Math.floor(1000 + Math.random() * 9000);
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const order = {
        order_id: Date.now(),
        order_number: orderNum,
        total_amount: subtotal * 1.08,
        payment_status: 'Paid',
        delivery_status: 'Delivered',
        created_at: new Date().toISOString(),
        delivered_at: new Date().toISOString(),
        items: cart.map(item => ({
          product_id: item.product_id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          license_key: 'NXUS-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-K9L1',
          download_url: '/downloads/' + item.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.zip'
        }))
      };

      let myOrders = JSON.parse(localStorage.getItem('demo_orders') || '[]');
      myOrders.unshift(order);
      localStorage.setItem('demo_orders', JSON.stringify(myOrders));
      localStorage.setItem('demo_cart', JSON.stringify([]));

      return { success: true, message: 'Payment verified! Software licenses delivered to your locker.', order };
    }

    if (path === '/api/orders/my-orders') {
      let myOrders = JSON.parse(localStorage.getItem('demo_orders') || '[]');
      if (myOrders.length === 0) {
        // Seed default sample order
        myOrders = [{
          order_id: 101,
          order_number: 'ORD-2026-9041',
          total_amount: 89.00,
          payment_status: 'Paid',
          delivery_status: 'Delivered',
          created_at: new Date().toISOString(),
          items: [{
            product_id: 2,
            name: 'Quantum Code Studio IDE',
            price: 89.00,
            quantity: 1,
            license_key: 'QNTM-8842-9912-K7X1',
            download_url: '/downloads/quantum-code-studio-2026.2.exe'
          }]
        }];
        localStorage.setItem('demo_orders', JSON.stringify(myOrders));
      }
      return { success: true, orders: myOrders };
    }

    // Auth
    if (path === '/api/auth/login' && method === 'POST') {
      const { email } = body || {};
      const isAdmin = email && email.toLowerCase().includes('admin');
      return {
        success: true,
        user: {
          user_id: isAdmin ? 1 : 2,
          fullName: isAdmin ? 'Chief Administrator' : 'Alex Developer',
          email: email || 'user@example.com',
          role: isAdmin ? 'admin' : 'customer'
        },
        token: 'demo-jwt-token-verified-signature'
      };
    }

    if (path === '/api/auth/register' && method === 'POST') {
      const { fullName, email } = body || {};
      return {
        success: true,
        user: {
          user_id: Date.now(),
          fullName: fullName || 'New Customer',
          email: email || 'customer@example.com',
          role: 'customer'
        },
        token: 'demo-jwt-token-verified-signature'
      };
    }

    if (path === '/api/auth/me') {
      const user = JSON.parse(localStorage.getItem('soft_auth_user') || 'null');
      return { success: true, user: user || { user_id: 2, fullName: 'Alex Developer', role: 'customer' } };
    }

    // System Endpoints
    if (path === '/api/system/endpoints') {
      return {
        success: true,
        architecture: 'Microsoft SQL Server 2022 RESTful API with Helmet & Bcrypt Security',
        endpoints: [
          { method: 'GET', path: '/api/products', desc: 'Queries SQL Server catalog with parameterized filters' },
          { method: 'GET', path: '/api/categories', desc: 'Lists software categories with aggregated item counts' },
          { method: 'POST', path: '/api/auth/login', desc: 'Validates 12-round bcrypt password hash against Users table' },
          { method: 'POST', path: '/api/orders/checkout', desc: 'Atomically creates order and issues cryptographic licenses' },
          { method: 'GET', path: '/api/orders/my-orders', desc: 'Retrieves user software locker and binary download URLs' },
          { method: 'GET', path: '/api/admin/stats', desc: 'Aggregates live financial and delivery metrics' }
        ]
      };
    }

    // Admin APIs
    if (path === '/api/admin/stats') {
      return {
        success: true,
        stats: {
          totalRevenue: 24890.50,
          totalOrders: 142,
          totalUsers: 98,
          activeLicenses: 215,
          pendingDeliveries: 1
        }
      };
    }

    if (path === '/api/admin/orders') {
      return {
        success: true,
        orders: [
          { order_id: 1, order_number: 'ORD-2026-9041', customer_name: 'Alex Developer', customer_email: 'customer@example.com', total_amount: 89.00, payment_status: 'Paid', delivery_status: 'Delivered', created_at: new Date().toISOString() },
          { order_id: 2, order_number: 'ORD-2026-9042', customer_name: 'Sarah Connor', customer_email: 'sconnor@defense.org', total_amount: 149.99, payment_status: 'Paid', delivery_status: 'Pending', created_at: new Date().toISOString() }
        ]
      };
    }

    if (path.includes('/deliver') && method === 'POST') {
      return { success: true, message: 'Software licenses generated and order marked Delivered!' };
    }

    if (path === '/api/admin/licenses') {
      return {
        success: true,
        licenses: [
          { license_id: 1, license_key: 'QNTM-8842-9912-K7X1', product_name: 'Quantum Code Studio IDE', user_name: 'Alex Developer', status: 'Active', created_at: new Date().toISOString() },
          { license_id: 2, license_key: 'SHLD-3312-9011-B5R8', product_name: 'CyberShield Endpoint Enterprise', user_name: 'Sarah Connor', status: 'Active', created_at: new Date().toISOString() }
        ]
      };
    }

    if (path === '/api/admin/users') {
      return {
        success: true,
        users: [
          { user_id: 1, full_name: 'Chief Software Administrator', email: 'admin@softwarestore.com', role: 'admin', created_at: new Date().toISOString() },
          { user_id: 2, full_name: 'Alex Developer', email: 'customer@example.com', role: 'customer', created_at: new Date().toISOString() }
        ]
      };
    }

    if (path === '/api/admin/logs') {
      return {
        success: true,
        logs: [
          { log_id: 1, action: 'ORDER_DELIVERED', details: 'Order ORD-2026-9041 software keys issued.', created_at: new Date().toISOString() },
          { log_id: 2, action: 'USER_LOGIN', details: 'Admin session authenticated via bcrypt.', created_at: new Date().toISOString() }
        ]
      };
    }

    return null;
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

    // If fetch failed due to offline/cloud preview without local SSMS, gracefully fall back to demo simulation
    if (isError && (response.status === 0 || response.status === 404 || response.statusText === 'NETWORK_ERROR')) {
      const fallbackData = this._handleDemoFallback(method, endpoint, body);
      if (fallbackData) {
        data = fallbackData;
        isError = false;
        response = { status: 200, statusText: 'OK (Demo Mode)' };
        this._showDemoNoticeOnce();
      }
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
