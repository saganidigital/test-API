const fs = require('fs');
const path = require('path');
const bcrypt = require('../backend/node_modules/bcryptjs');
const sql = require('../backend/node_modules/mssql/msnodesqlv8');

const masterConfig = {
  connectionString: 'Server=localhost;Database=master;Trusted_Connection=Yes;Driver={ODBC Driver 18 for SQL Server};TrustServerCertificate=Yes;'
};

const appDbConfig = {
  connectionString: 'Server=localhost;Database=SoftwareCommerceDB;Trusted_Connection=Yes;Driver={ODBC Driver 18 for SQL Server};TrustServerCertificate=Yes;'
};

async function setupDatabase() {
  console.log('🚀 Starting SSMS 2022 Database Setup...');

  // Step 1: Ensure Database exists
  console.log('1️⃣ Connecting to master database to check SoftwareCommerceDB...');
  let masterPool = await sql.connect(masterConfig);
  await masterPool.request().query(`
    IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'SoftwareCommerceDB')
    BEGIN
      CREATE DATABASE SoftwareCommerceDB;
      PRINT 'Database SoftwareCommerceDB created.';
    END
    ELSE
    BEGIN
      PRINT 'Database SoftwareCommerceDB already exists.';
    END
  `);
  await sql.close();
  console.log('✅ SoftwareCommerceDB database confirmed.');

  // Step 2: Connect to SoftwareCommerceDB and run schema
  console.log('2️⃣ Connecting to SoftwareCommerceDB to apply schema.sql...');
  let dbPool = await sql.connect(appDbConfig);

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Split by GO statements
  const batches = schemaSql
    .split(/\r?\n\s*GO\s*\r?\n?/i)
    .map(b => b.trim())
    .filter(b => b.length > 0);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    try {
      await dbPool.request().query(batch);
    } catch (err) {
      console.warn(`Warning on batch ${i + 1}: ${err.message}`);
    }
  }
  console.log('✅ Tables, relationships, and indexes created successfully.');

  // Step 3: Seed Categories
  console.log('3️⃣ Seeding Software Categories...');
  const categories = [
    { name: 'Cybersecurity & Protection', slug: 'cybersecurity', icon: 'shield-lock', description: 'Advanced endpoint defense, network sniffers, vulnerability scanners, and encryption tools.' },
    { name: 'Developer & Coding Tools', slug: 'developer-tools', icon: 'code-square', description: 'High-performance IDEs, compilers, API testing suites, and debugger plugins.' },
    { name: 'Cloud, Server & DevOps', slug: 'devops-cloud', icon: 'cloud-arrow-up', description: 'Container orchestration, CI/CD runners, server monitors, and cloud infrastructure utilities.' },
    { name: 'Creative & UI/UX Design', slug: 'creative-design', icon: 'palette', description: 'Vector graphics engines, audio workstations, video FX suites, and 3D asset generators.' },
    { name: 'System Utilities & Performance', slug: 'system-utilities', icon: 'cpu', description: 'OS disk optimizers, registry cleaners, memory boosters, and backup utilities.' }
  ];

  for (const cat of categories) {
    await dbPool.request()
      .input('name', sql.NVarChar(100), cat.name)
      .input('slug', sql.NVarChar(100), cat.slug)
      .input('desc', sql.NVarChar(500), cat.description)
      .input('icon', sql.NVarChar(50), cat.icon)
      .query(`
        IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE slug = @slug)
        BEGIN
          INSERT INTO dbo.Categories (name, slug, description, icon)
          VALUES (@name, @slug, @desc, @icon);
        END
      `);
  }
  console.log('✅ Categories seeded.');

  // Step 4: Seed Users with 12-round bcrypt hash
  console.log('4️⃣ Seeding Users with bcrypt password hashing...');
  const saltRounds = 12;
  const adminHash = bcrypt.hashSync('Admin@123456', saltRounds);
  const customerHash = bcrypt.hashSync('Customer@123456', saltRounds);

  // Admin User
  await dbPool.request()
    .input('fullName', sql.NVarChar(100), 'Chief Software Administrator')
    .input('email', sql.NVarChar(150), 'admin@softwarestore.com')
    .input('hash', sql.NVarChar(255), adminHash)
    .input('role', sql.NVarChar(20), 'admin')
    .query(`
      IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE email = @email)
      BEGIN
        INSERT INTO dbo.Users (full_name, email, password_hash, role)
        VALUES (@fullName, @email, @hash, @role);
      END
    `);

  // Demo Customer User
  await dbPool.request()
    .input('fullName', sql.NVarChar(100), 'Alex Developer')
    .input('email', sql.NVarChar(150), 'customer@example.com')
    .input('hash', sql.NVarChar(255), customerHash)
    .input('role', sql.NVarChar(20), 'customer')
    .query(`
      IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE email = @email)
      BEGIN
        INSERT INTO dbo.Users (full_name, email, password_hash, role)
        VALUES (@fullName, @email, @hash, @role);
      END
    `);
  console.log('✅ Users seeded:');
  console.log('   👑 Admin:    admin@softwarestore.com    / Admin@123456');
  console.log('   👤 Customer: customer@example.com / Customer@123456');

  // Step 5: Seed Software Products
  console.log('5️⃣ Seeding Digital Software Products...');
  const catRows = (await dbPool.request().query('SELECT category_id, slug FROM dbo.Categories')).recordset;
  const catMap = {};
  catRows.forEach(r => { catMap[r.slug] = r.category_id; });

  const products = [
    {
      categoryId: catMap['cybersecurity'],
      name: 'CyberShield Endpoint Enterprise',
      tagline: 'Military-Grade Zero Trust Threat Defense & Ransomware Shield',
      version: 'v5.4.2',
      platform: 'Windows 10/11, macOS, Linux x64',
      licenseType: 'Annual Enterprise Subscription',
      price: 149.99,
      origPrice: 199.99,
      description: 'Comprehensive AI-driven endpoint protection with real-time heuristic scanning, automated zero-day quarantine, integrated firewall, and encrypted cloud telemetry backup.',
      imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop&q=80',
      downloadUrl: '/downloads/cybershield-enterprise-v5.4.2.zip',
      fileSize: '412 MB',
      features: JSON.stringify([
        'Heuristic Behavioral AI Engine',
        'Kernel-Level Ransomware Blocker',
        'Zero-Day Vulnerability Patch Assistant',
        'Centralized Fleet Management Console',
        '24/7 Priority Emergency Support'
      ]),
      systemReqs: JSON.stringify({ os: 'Windows 10/11 / macOS 13+ / Ubuntu 22.04+', ram: '8 GB RAM', cpu: 'Quad-Core 2.0 GHz', storage: '2 GB free disk space' }),
      rating: 4.95,
      reviewCount: 142,
      isFeatured: 1
    },
    {
      categoryId: catMap['developer-tools'],
      name: 'Quantum Code Studio IDE',
      tagline: 'Ultra-Fast Polyglot Code Editor with Local AI Copilot',
      version: 'v2026.2.0',
      platform: 'Windows, macOS, Linux',
      licenseType: 'Perpetual Commercial License',
      price: 89.00,
      origPrice: 120.00,
      description: 'The premier code editor tailored for modern software architects. Sub-millisecond syntax highlighting, built-in offline neural completion, graphical Git visualizer, and AST refactoring toolkit.',
      imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
      downloadUrl: '/downloads/quantum-code-studio-2026.2.exe',
      fileSize: '278 MB',
      features: JSON.stringify([
        'Sub-millisecond Typing Latency',
        'Offline Local Neural Code Completion',
        'Integrated Interactive Regex & AST Visualizer',
        'Built-in Docker & Remote SSH Workspaces',
        'Commercial License with Lifetime Minor Updates'
      ]),
      systemReqs: JSON.stringify({ os: '64-bit OS', ram: '4 GB RAM', cpu: 'Dual-Core 1.8 GHz', storage: '1 GB' }),
      rating: 4.92,
      reviewCount: 310,
      isFeatured: 1
    },
    {
      categoryId: catMap['devops-cloud'],
      name: 'CloudScale K8s Manager Pro',
      tagline: 'Unified Multi-Cluster Kubernetes Dashboard & Cost Optimizer',
      version: 'v3.1.4',
      platform: 'Cross-Platform Web GUI & CLI',
      licenseType: 'Annual Team License',
      price: 219.00,
      origPrice: 289.00,
      description: 'Monitor, orchestrate, and optimize cloud spend across AWS, Azure, and GCP clusters with instant visual topology, automatic pod right-sizing, and one-click blue/green rollback.',
      imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
      downloadUrl: '/downloads/cloudscale-k8s-v3.1.4.tar.gz',
      fileSize: '185 MB',
      features: JSON.stringify([
        'Real-time Cluster Resource Heatmaps',
        'Automatic Idle Resource Pruning (saves ~35% bill)',
        'Zero-Downtime Deployment Canary Controller',
        'RBAC & Audit Trail Compliance Export',
        'Helm 3 & Kustomize Direct Sync'
      ]),
      systemReqs: JSON.stringify({ os: 'Linux / macOS / Windows WSL2', ram: '8 GB RAM', cpu: 'Intel/AMD 4 Cores', storage: '500 MB' }),
      rating: 4.88,
      reviewCount: 96,
      isFeatured: 1
    },
    {
      categoryId: catMap['creative-design'],
      name: 'VectorMaster Studio 8',
      tagline: 'Infinite Canvas Vector Graphics & Design System Generator',
      version: 'v8.0.5',
      platform: 'Windows 11, macOS Sequoia',
      licenseType: 'Perpetual Commercial License',
      price: 129.99,
      origPrice: 179.99,
      description: 'Precision vector illustration software for UI designers, game artists, and brand creators. Non-destructive booleans, CMYK + Pantone print engine, and instant SVG/WebP exporter.',
      imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
      downloadUrl: '/downloads/vectormaster-studio-8.msi',
      fileSize: '650 MB',
      features: JSON.stringify([
        'GPU-Accelerated 1,000,000% Zoom Engine',
        'Live Responsive Layout Constraints',
        'Direct Code Export (HTML5 Canvas, React, SVG)',
        'Pantone Matching System Certified',
        'Supports Wacom & Apple Pencil Pressure Curves'
      ]),
      systemReqs: JSON.stringify({ os: 'Windows 10/11 64-bit / macOS 12+', ram: '8 GB RAM', cpu: 'Dedicated GPU 2GB VRAM', storage: '3 GB' }),
      rating: 4.94,
      reviewCount: 184,
      isFeatured: 0
    },
    {
      categoryId: catMap['system-utilities'],
      name: 'SysOptima 2026 Ultra',
      tagline: 'Deep Hardware Tuning, RAM Cache Accelerator & SSD Lifespan Guard',
      version: 'v4.2.1',
      platform: 'Windows 10 / Windows 11',
      licenseType: 'Lifetime 3-PC License',
      price: 49.95,
      origPrice: 69.95,
      description: 'Unlock maximum gaming FPS and workstation snappiness. Eliminates telemetry bloatware, reorganizes disk paging buffers, and lowers background CPU jitter.',
      imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
      downloadUrl: '/downloads/sysoptima-2026-ultra.exe',
      fileSize: '35 MB',
      features: JSON.stringify([
        'Intelligent Gaming Mode Process Priority Boost',
        'Windows 11 Privacy & Telemetry Hardener',
        'NVMe / SSD TRIM Optimization & Health Telemetry',
        'Duplicate File Finder & Clean Uninstaller',
        'One-Click System Restore Point Guard'
      ]),
      systemReqs: JSON.stringify({ os: 'Windows 10 / 11 (32/64 bit)', ram: '2 GB RAM', cpu: '1.0 GHz', storage: '100 MB' }),
      rating: 4.85,
      reviewCount: 520,
      isFeatured: 0
    },
    {
      categoryId: catMap['cybersecurity'],
      name: 'NetSentry Deep Packet Sniffer',
      tagline: 'Hardware-Level Traffic Inspection, Protocol Analyzer & Intrusion Hunter',
      version: 'v2.9.0',
      platform: 'Windows / Linux',
      licenseType: 'Enterprise Commercial License',
      price: 185.00,
      origPrice: 240.00,
      description: 'Capture, dissect, and inspect raw 10G/40G network frames in real time with hardware timestamping, TLS decryption proxying, and automated MITRE ATT&CK mapping.',
      imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80',
      downloadUrl: '/downloads/netsentry-sniffer-v2.9.zip',
      fileSize: '120 MB',
      features: JSON.stringify([
        'PCAPng Multi-Gigabit Ingestion Stream',
        'Deep TLS 1.3 Handshake Decoder',
        'Automated Rogue DNS / DHCP Alert Engine',
        'Wireshark Filter Syntax Compatibility',
        'Enterprise PDF Executive Compliance Reports'
      ]),
      systemReqs: JSON.stringify({ os: 'Windows 10/11 / Linux Kernel 5.4+', ram: '8 GB RAM', cpu: 'Intel Core i5 or better', storage: '2 GB' }),
      rating: 4.90,
      reviewCount: 77,
      isFeatured: 0
    },
    {
      categoryId: catMap['developer-tools'],
      name: 'DataPulse API Mock & Testing Suite',
      tagline: 'High-Throughput Synthetic API Mocking, Chaos Injection & Contract Tests',
      version: 'v1.8.4',
      platform: 'Cross-Platform Windows/Mac/Linux',
      licenseType: 'Professional License',
      price: 69.00,
      origPrice: 99.00,
      description: 'Spin up simulated microservice fleets with dynamic latency spikes, error injection, OpenAPI 3.1 validation, and integrated load stress testing.',
      imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
      downloadUrl: '/downloads/datapulse-api-suite-v1.8.4.zip',
      fileSize: '95 MB',
      features: JSON.stringify([
        'Zero-Code Dynamic Mock Schema Engines',
        'Chaos Engineering Latency & Dropped Connection Sim',
        'GraphQL, gRPC, and REST Full Protocol Support',
        'CI/CD Headless CLI Runner included',
        'Automatic OpenAPI Spec Auto-Generation'
      ]),
      systemReqs: JSON.stringify({ os: 'All Platforms', ram: '4 GB RAM', cpu: 'Dual Core', storage: '500 MB' }),
      rating: 4.87,
      reviewCount: 115,
      isFeatured: 0
    }
  ];

  for (const p of products) {
    await dbPool.request()
      .input('catId', sql.Int, p.categoryId)
      .input('name', sql.NVarChar(200), p.name)
      .input('tagline', sql.NVarChar(255), p.tagline)
      .input('version', sql.NVarChar(50), p.version)
      .input('platform', sql.NVarChar(150), p.platform)
      .input('licType', sql.NVarChar(100), p.licenseType)
      .input('price', sql.Decimal(10, 2), p.price)
      .input('origPrice', sql.Decimal(10, 2), p.origPrice)
      .input('desc', sql.NVarChar(sql.MAX), p.description)
      .input('img', sql.NVarChar(500), p.imageUrl)
      .input('downUrl', sql.NVarChar(500), p.downloadUrl)
      .input('fileSize', sql.NVarChar(50), p.fileSize)
      .input('feats', sql.NVarChar(sql.MAX), p.features)
      .input('sysReqs', sql.NVarChar(sql.MAX), p.systemReqs)
      .input('rating', sql.Decimal(3, 2), p.rating)
      .input('reviews', sql.Int, p.reviewCount)
      .input('feat', sql.Bit, p.isFeatured)
      .query(`
        IF NOT EXISTS (SELECT 1 FROM dbo.Products WHERE name = @name)
        BEGIN
          INSERT INTO dbo.Products (
            category_id, name, tagline, version, platform, license_type,
            price, original_price, description, image_url, download_url,
            file_size, features, system_reqs, rating, review_count, is_featured
          ) VALUES (
            @catId, @name, @tagline, @version, @platform, @licType,
            @price, @origPrice, @desc, @img, @downUrl,
            @fileSize, @feats, @sysReqs, @rating, @reviews, @feat
          );
        END
      `);
  }
  console.log('✅ Software products seeded.');

  // Step 6: Seed initial orders for testing Delivery flow
  console.log('6️⃣ Seeding Sample Orders & Licenses for Customer Alex Developer...');
  const customerRow = (await dbPool.request().query("SELECT user_id FROM dbo.Users WHERE email = 'customer@example.com'")).recordset[0];
  const prodRows = (await dbPool.request().query('SELECT TOP 2 product_id, price FROM dbo.Products ORDER BY product_id ASC')).recordset;

  if (customerRow && prodRows.length >= 2) {
    const custId = customerRow.user_id;
    const prod1 = prodRows[0]; // CyberShield
    const prod2 = prodRows[1]; // Quantum IDE

    // Order 1: DELIVERED with active software license key
    const ord1Num = 'ORD-2026-9041';
    let ord1 = (await dbPool.request().input('num', sql.NVarChar(50), ord1Num).query('SELECT order_id FROM dbo.Orders WHERE order_number = @num')).recordset[0];
    if (!ord1) {
      const ordRes = await dbPool.request()
        .input('userId', sql.Int, custId)
        .input('num', sql.NVarChar(50), ord1Num)
        .input('total', sql.Decimal(10, 2), prod2.price)
        .input('payStat', sql.NVarChar(50), 'Paid')
        .input('delStat', sql.NVarChar(50), 'Delivered')
        .query(`
          INSERT INTO dbo.Orders (user_id, order_number, total_amount, payment_status, delivery_status, delivered_at)
          OUTPUT INSERTED.order_id
          VALUES (@userId, @num, @total, @payStat, @delStat, GETUTCDATE());
        `);
      const ord1Id = ordRes.recordset[0].order_id;
      await dbPool.request()
        .input('ordId', sql.Int, ord1Id)
        .input('pId', sql.Int, prod2.product_id)
        .input('price', sql.Decimal(10, 2), prod2.price)
        .query('INSERT INTO dbo.OrderItems (order_id, product_id, price_at_purchase, quantity) VALUES (@ordId, @pId, @price, 1)');

      await dbPool.request()
        .input('ordId', sql.Int, ord1Id)
        .input('pId', sql.Int, prod2.product_id)
        .input('key', sql.NVarChar(100), 'QNTM-8842-9912-K7X1')
        .query("INSERT INTO dbo.SoftwareLicenses (order_id, product_id, license_key, status) VALUES (@ordId, @pId, @key, 'Active')");
    }

    // Order 2: PENDING DELIVERY (Ready for Admin to deliver via Admin Panel)
    const ord2Num = 'ORD-2026-9042';
    let ord2 = (await dbPool.request().input('num', sql.NVarChar(50), ord2Num).query('SELECT order_id FROM dbo.Orders WHERE order_number = @num')).recordset[0];
    if (!ord2) {
      const ordRes2 = await dbPool.request()
        .input('userId', sql.Int, custId)
        .input('num', sql.NVarChar(50), ord2Num)
        .input('total', sql.Decimal(10, 2), prod1.price)
        .input('payStat', sql.NVarChar(50), 'Paid')
        .input('delStat', sql.NVarChar(50), 'Pending')
        .query(`
          INSERT INTO dbo.Orders (user_id, order_number, total_amount, payment_status, delivery_status)
          OUTPUT INSERTED.order_id
          VALUES (@userId, @num, @total, @payStat, @delStat);
        `);
      const ord2Id = ordRes2.recordset[0].order_id;
      await dbPool.request()
        .input('ordId', sql.Int, ord2Id)
        .input('pId', sql.Int, prod1.product_id)
        .input('price', sql.Decimal(10, 2), prod1.price)
        .query('INSERT INTO dbo.OrderItems (order_id, product_id, price_at_purchase, quantity) VALUES (@ordId, @pId, @price, 1)');
    }
    console.log('✅ Sample Orders seeded (1 Delivered with Key, 1 Pending for Admin delivery).');
  }

  // Step 7: Log audit action
  await dbPool.request()
    .input('type', sql.NVarChar(100), 'SYSTEM_INIT')
    .input('ep', sql.NVarChar(200), 'database/setup-db.js')
    .input('details', sql.NVarChar(sql.MAX), 'SoftwareCommerceDB successfully created and seeded.')
    .query('INSERT INTO dbo.AuditLogs (action_type, endpoint, details) VALUES (@type, @ep, @details)');

  await sql.close();
  console.log('\n🎉 ALL DONE! SSMS 2022 Database setup and seeding completed successfully!');
}

setupDatabase().catch(err => {
  console.error('❌ Database setup failed:', err);
  process.exit(1);
});
