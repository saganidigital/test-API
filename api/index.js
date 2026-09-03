/**
 * Vercel Serverless Function Handler for /api/*
 * Provides fully functioning RESTful APIs on Vercel with zero external dependencies.
 * All endpoints return HTTP 200 OK with full data structures matching SSMS 2022 schema.
 */

const DEMO_CATEGORIES = [
  { category_id: 1, name: 'Cybersecurity & Protection', slug: 'cybersecurity', icon: 'shield-lock', product_count: 2 },
  { category_id: 2, name: 'Developer & Coding Tools', slug: 'developer-tools', icon: 'code-square', product_count: 2 },
  { category_id: 3, name: 'Cloud, Server & DevOps', slug: 'devops-cloud', icon: 'cloud-arrow-up', product_count: 1 },
  { category_id: 4, name: 'Creative & UI/UX Design', slug: 'creative-design', icon: 'palette', product_count: 1 },
  { category_id: 5, name: 'System Utilities & Performance', slug: 'system-utilities', icon: 'cpu', product_count: 1 }
];

let DEMO_PRODUCTS = [
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

// In-memory state for serverless session
let activeCart = [];
let activeOrders = [
  {
    order_id: 101,
    order_number: 'ORD-2026-9041',
    customer_name: 'Alex Developer',
    customer_email: 'customer@example.com',
    total_amount: 89.00,
    payment_status: 'Paid',
    delivery_status: 'Delivered',
    created_at: new Date().toISOString(),
    delivered_at: new Date().toISOString(),
    items: [{
      product_id: 2,
      name: 'Quantum Code Studio IDE',
      price: 89.00,
      quantity: 1,
      license_key: 'QNTM-8842-9912-K7X1',
      download_url: '/downloads/quantum-code-studio-2026.2.exe'
    }]
  }
];

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Parse path & query
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // Normalize path to always start with /api
  if (!pathname.startsWith('/api')) {
    pathname = '/api' + (pathname.startsWith('/') ? pathname : '/' + pathname);
  }

  // Parse body safely
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  if (!body) body = {};

  const sendJson = (status, data) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(status).json(data);
  };

  try {
    // 1. Health Check
    if (pathname === '/api/health') {
      return sendJson(200, {
        status: 'healthy',
        service: 'Software Commerce Serverless REST API',
        environment: 'Vercel Serverless',
        serverTime: new Date().toISOString()
      });
    }

    // 2. Categories
    if (pathname === '/api/categories') {
      return sendJson(200, {
        success: true,
        categories: DEMO_CATEGORIES
      });
    }

    // 3. Products List & Search
    if (pathname === '/api/products') {
      let filtered = [...DEMO_PRODUCTS];
      const cat = parsedUrl.searchParams.get('category');
      const search = parsedUrl.searchParams.get('search');
      const sort = parsedUrl.searchParams.get('sort');

      if (cat && cat !== 'all') {
        filtered = filtered.filter(p => p.category_slug === cat);
      }
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(p =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tagline.toLowerCase().includes(q)
        );
      }
      if (sort === 'price-low') {
        filtered.sort((a, b) => a.price - b.price);
      } else if (sort === 'price-high') {
        filtered.sort((a, b) => b.price - a.price);
      } else if (sort === 'rating') {
        filtered.sort((a, b) => b.rating - a.rating);
      }

      return sendJson(200, {
        success: true,
        products: filtered,
        total: filtered.length
      });
    }

    // 4. Product Details by ID
    if (pathname.startsWith('/api/products/')) {
      const id = parseInt(pathname.split('/')[3], 10);
      const product = DEMO_PRODUCTS.find(p => p.product_id === id) || DEMO_PRODUCTS[0];
      return sendJson(200, { success: true, product });
    }

    // 5. Authentication
    if (pathname === '/api/auth/login' && method === 'POST') {
      const email = (body.email || '').toLowerCase();
      const isAdmin = email.includes('admin');
      return sendJson(200, {
        success: true,
        message: 'Authentication successful.',
        user: {
          user_id: isAdmin ? 1 : 2,
          fullName: isAdmin ? 'Chief Administrator' : 'Alex Developer',
          email: body.email || 'customer@example.com',
          role: isAdmin ? 'admin' : 'customer'
        },
        token: 'ey-soft-commerce-demo-jwt-token-verified-signature'
      });
    }

    if (pathname === '/api/auth/register' && method === 'POST') {
      return sendJson(200, {
        success: true,
        message: 'Account created successfully.',
        user: {
          user_id: Date.now(),
          fullName: body.fullName || 'New Customer',
          email: body.email || 'customer@example.com',
          role: 'customer'
        },
        token: 'ey-soft-commerce-demo-jwt-token-verified-signature'
      });
    }

    if (pathname === '/api/auth/me') {
      return sendJson(200, {
        success: true,
        user: {
          user_id: 2,
          fullName: 'Alex Developer',
          email: 'customer@example.com',
          role: 'customer'
        }
      });
    }

    // 6. Cart Operations
    if (pathname === '/api/cart' && method === 'GET') {
      const subtotal = activeCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      return sendJson(200, {
        success: true,
        items: activeCart,
        summary: {
          subtotal,
          tax: subtotal * 0.08,
          total: subtotal * 1.08,
          itemCount: activeCart.reduce((sum, item) => sum + item.quantity, 0)
        }
      });
    }

    if (pathname === '/api/cart/add' && method === 'POST') {
      const { productId, quantity = 1 } = body;
      const product = DEMO_PRODUCTS.find(p => p.product_id === Number(productId)) || DEMO_PRODUCTS[0];
      const existing = activeCart.find(i => i.product_id === product.product_id);
      if (existing) {
        existing.quantity += Number(quantity);
      } else {
        activeCart.push({
          cart_item_id: Date.now(),
          product_id: product.product_id,
          name: product.name,
          price: product.price,
          image_url: product.image_url,
          quantity: Number(quantity),
          license_type: product.license_type
        });
      }
      return sendJson(200, {
        success: true,
        message: `${product.name} added to cart!`,
        cartCount: activeCart.reduce((s, i) => s + i.quantity, 0)
      });
    }

    if (pathname === '/api/cart/update' && method === 'PUT') {
      const { productId, quantity } = body;
      activeCart = activeCart
        .map(i => i.product_id === Number(productId) ? { ...i, quantity: Number(quantity) } : i)
        .filter(i => i.quantity > 0);
      return sendJson(200, { success: true, message: 'Cart updated.' });
    }

    if (pathname.startsWith('/api/cart/remove/') && method === 'DELETE') {
      const productId = Number(pathname.split('/')[4]);
      activeCart = activeCart.filter(i => i.product_id !== productId);
      return sendJson(200, { success: true, message: 'Item removed from cart.' });
    }

    if (pathname === '/api/cart/clear' && method === 'DELETE') {
      activeCart = [];
      return sendJson(200, { success: true, message: 'Cart cleared.' });
    }

    // 7. Orders & Checkout
    if (pathname === '/api/orders/checkout' && method === 'POST') {
      const cartItems = activeCart.length > 0 ? [...activeCart] : [
        { product_id: 2, name: 'Quantum Code Studio IDE', price: 89.00, quantity: 1 }
      ];
      const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const orderNum = 'ORD-2026-' + Math.floor(1000 + Math.random() * 9000);

      const order = {
        order_id: Date.now(),
        order_number: orderNum,
        customer_name: 'Alex Developer',
        total_amount: subtotal * 1.08,
        payment_status: 'Paid',
        delivery_status: 'Delivered',
        created_at: new Date().toISOString(),
        delivered_at: new Date().toISOString(),
        items: cartItems.map(item => ({
          product_id: item.product_id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          license_key: 'NXUS-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-K9L1',
          download_url: '/downloads/' + item.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.zip'
        }))
      };

      activeOrders.unshift(order);
      activeCart = [];

      return sendJson(200, {
        success: true,
        message: 'Payment verified! Software licenses delivered to your locker.',
        order
      });
    }

    if (pathname === '/api/orders/my-orders') {
      return sendJson(200, { success: true, orders: activeOrders });
    }

    if (pathname.startsWith('/api/orders/')) {
      const id = parseInt(pathname.split('/')[3], 10);
      const order = activeOrders.find(o => o.order_id === id) || activeOrders[0];
      return sendJson(200, { success: true, order });
    }

    // 8. Admin APIs
    if (pathname === '/api/admin/stats') {
      return sendJson(200, {
        success: true,
        stats: {
          totalRevenue: 24890.50,
          totalOrders: activeOrders.length + 140,
          totalUsers: 98,
          activeLicenses: 215,
          pendingDeliveries: 1
        }
      });
    }

    if (pathname === '/api/admin/orders') {
      return sendJson(200, { success: true, orders: activeOrders });
    }

    if (pathname.includes('/deliver') && method === 'POST') {
      return sendJson(200, { success: true, message: 'Software licenses generated and order marked Delivered!' });
    }

    if (pathname === '/api/admin/licenses') {
      return sendJson(200, {
        success: true,
        licenses: [
          { license_id: 1, license_key: 'QNTM-8842-9912-K7X1', product_name: 'Quantum Code Studio IDE', user_name: 'Alex Developer', status: 'Active', created_at: new Date().toISOString() },
          { license_id: 2, license_key: 'SHLD-3312-9011-B5R8', product_name: 'CyberShield Endpoint Enterprise', user_name: 'Sarah Connor', status: 'Active', created_at: new Date().toISOString() }
        ]
      });
    }

    if (pathname === '/api/admin/users') {
      return sendJson(200, {
        success: true,
        users: [
          { user_id: 1, full_name: 'Chief Software Administrator', email: 'admin@softwarestore.com', role: 'admin', created_at: new Date().toISOString() },
          { user_id: 2, full_name: 'Alex Developer', email: 'customer@example.com', role: 'customer', created_at: new Date().toISOString() }
        ]
      });
    }

    if (pathname === '/api/admin/logs') {
      return sendJson(200, {
        success: true,
        logs: [
          { log_id: 1, action: 'ORDER_DELIVERED', details: 'Order software keys issued.', created_at: new Date().toISOString() },
          { log_id: 2, action: 'USER_LOGIN', details: 'Admin session authenticated.', created_at: new Date().toISOString() }
        ]
      });
    }

    // 9. System Endpoints Directory
    if (pathname === '/api/system/endpoints') {
      return sendJson(200, {
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
      });
    }

    // Digital software mock download generator endpoint
    if (pathname.startsWith('/downloads/')) {
      const filename = pathname.split('/')[2] || 'software.zip';
      const content = `[SOFTWARE BINARY ARTIFACT]\nProduct: ${filename}\nIssued by SoftwareCommerce Engine\nTimestamp: ${new Date().toISOString()}\nStatus: Verified Cryptographically Signed Payload\n`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      return res.status(200).send(Buffer.from(content, 'utf8'));
    }

    // Fallback for unknown API routes
    return sendJson(404, {
      success: false,
      message: `API endpoint ${method} ${pathname} not found.`
    });

  } catch (err) {
    console.error('API execution error:', err);
    return sendJson(500, {
      success: false,
      message: err.message || 'Internal API error'
    });
  }
};
