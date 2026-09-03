const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { sql, getPool } = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All admin endpoints require authentication and admin role
router.use(authenticateToken, requireAdmin);

// Helper to generate a realistic product license key (e.g. CYBR-8F42-99B1-A7X4)
function generateLicenseKey(productName = 'SOFT') {
  const prefix = (productName.replace(/[^A-Za-z]/g, '').slice(0, 4) || 'SOFT').toUpperCase();
  const chunk1 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const chunk2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const chunk3 = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${chunk1}-${chunk2}-${chunk3}`;
}

// GET /api/admin/stats - High-level metrics from SQL Server
router.get('/stats', async (req, res) => {
  try {
    const pool = await getPool();

    const statsRes = await pool.request().query(`
      SELECT 
        (SELECT ISNULL(SUM(total_amount), 0) FROM dbo.Orders WHERE payment_status = 'Paid') AS total_revenue,
        (SELECT COUNT(*) FROM dbo.Orders) AS total_orders,
        (SELECT COUNT(*) FROM dbo.Orders WHERE delivery_status = 'Pending') AS pending_deliveries,
        (SELECT COUNT(*) FROM dbo.Orders WHERE delivery_status = 'Delivered') AS delivered_orders,
        (SELECT COUNT(*) FROM dbo.Products WHERE is_active = 1) AS active_products,
        (SELECT COUNT(*) FROM dbo.Users WHERE role = 'customer') AS total_customers,
        (SELECT COUNT(*) FROM dbo.SoftwareLicenses WHERE status = 'Active') AS issued_licenses
    `);

    const stats = statsRes.recordset[0];
    return res.json({
      success: true,
      stats: {
        totalRevenue: Number(stats.total_revenue),
        totalOrders: stats.total_orders,
        pendingDeliveries: stats.pending_deliveries,
        deliveredOrders: stats.delivered_orders,
        activeProducts: stats.active_products,
        totalCustomers: stats.total_customers,
        issuedLicenses: stats.issued_licenses
      }
    });

  } catch (err) {
    console.error('Admin stats error:', err);
    return res.status(500).json({ success: false, message: 'Failed to query database statistics.' });
  }
});

// GET /api/admin/orders - All customer orders for admin review & delivery
router.get('/orders', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        o.order_id,
        o.order_number,
        o.total_amount,
        o.payment_status,
        o.delivery_status,
        o.created_at,
        o.delivered_at,
        u.user_id,
        u.full_name AS customer_name,
        u.email AS customer_email
      FROM dbo.Orders o
      JOIN dbo.Users u ON o.user_id = u.user_id
      ORDER BY 
        CASE WHEN o.delivery_status = 'Pending' THEN 0 ELSE 1 END,
        o.order_id DESC
    `);

    const orders = result.recordset;

    // Attach items and licenses for each order
    for (const ord of orders) {
      const itemsRes = await pool.request()
        .input('orderId', sql.Int, ord.order_id)
        .query(`
          SELECT 
            oi.order_item_id,
            oi.product_id,
            oi.price_at_purchase,
            oi.quantity,
            p.name AS product_name,
            p.version,
            p.platform,
            p.download_url
          FROM dbo.OrderItems oi
          JOIN dbo.Products p ON oi.product_id = p.product_id
          WHERE oi.order_id = @orderId
        `);

      const licRes = await pool.request()
        .input('orderId', sql.Int, ord.order_id)
        .query(`
          SELECT 
            sl.license_id,
            sl.product_id,
            sl.license_key,
            sl.status,
            sl.issued_at
          FROM dbo.SoftwareLicenses sl
          WHERE sl.order_id = @orderId
        `);

      ord.items = itemsRes.recordset;
      ord.licenses = licRes.recordset;
    }

    return res.json({
      success: true,
      count: orders.length,
      orders
    });

  } catch (err) {
    console.error('Admin orders error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve orders list.' });
  }
});

// POST /api/admin/orders/:id/deliver - THE SOFTWARE DELIVERY API
// Delivers the software product: generates cryptographic license keys and sets status to 'Delivered'
router.post('/orders/:id/deliver', async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  if (isNaN(orderId)) {
    return res.status(400).json({ success: false, message: 'Invalid order ID.' });
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    // 1. Verify order exists
    const checkRes = await pool.request()
      .input('orderId', sql.Int, orderId)
      .query(`
        SELECT o.order_id, o.order_number, o.delivery_status, u.full_name, u.email
        FROM dbo.Orders o
        JOIN dbo.Users u ON o.user_id = u.user_id
        WHERE o.order_id = @orderId
      `);

    if (checkRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found in database.' });
    }

    const order = checkRes.recordset[0];

    // 2. Fetch order items needing license keys
    const itemsRes = await pool.request()
      .input('orderId', sql.Int, orderId)
      .query(`
        SELECT oi.product_id, p.name AS product_name
        FROM dbo.OrderItems oi
        JOIN dbo.Products p ON oi.product_id = p.product_id
        WHERE oi.order_id = @orderId
      `);

    const items = itemsRes.recordset;

    await transaction.begin();

    // 3. Mark order as Delivered in SQL Server
    await new sql.Request(transaction)
      .input('orderId', sql.Int, orderId)
      .query(`
        UPDATE dbo.Orders
        SET delivery_status = 'Delivered', delivered_at = GETUTCDATE()
        WHERE order_id = @orderId
      `);

    // 4. Generate and insert cryptographic software licenses for each product
    const generatedLicenses = [];

    for (const item of items) {
      // Check if license already generated
      const existingLic = await new sql.Request(transaction)
        .input('orderId', sql.Int, orderId)
        .input('pId', sql.Int, item.product_id)
        .query('SELECT license_key FROM dbo.SoftwareLicenses WHERE order_id = @orderId AND product_id = @pId');

      if (existingLic.recordset.length > 0) {
        generatedLicenses.push({
          productId: item.product_id,
          productName: item.product_name,
          licenseKey: existingLic.recordset[0].license_key,
          alreadyIssued: true
        });
      } else {
        const newKey = generateLicenseKey(item.product_name);
        await new sql.Request(transaction)
          .input('orderId', sql.Int, orderId)
          .input('pId', sql.Int, item.product_id)
          .input('key', sql.NVarChar(100), newKey)
          .input('stat', sql.NVarChar(50), 'Active')
          .query(`
            INSERT INTO dbo.SoftwareLicenses (order_id, product_id, license_key, status)
            VALUES (@orderId, @pId, @key, @stat);
          `);

        generatedLicenses.push({
          productId: item.product_id,
          productName: item.product_name,
          licenseKey: newKey,
          alreadyIssued: false
        });
      }
    }

    // 5. Log delivery in AuditLogs
    await new sql.Request(transaction)
      .input('action', sql.NVarChar(100), 'PRODUCT_DELIVERY')
      .input('endpoint', sql.NVarChar(200), `/api/admin/orders/${orderId}/deliver`)
      .input('adminId', sql.Int, req.user.user_id)
      .input('details', sql.NVarChar(sql.MAX), JSON.stringify({
        orderNumber: order.order_number,
        customerEmail: order.email,
        licensesCount: generatedLicenses.length
      }))
      .query(`
        INSERT INTO dbo.AuditLogs (action_type, endpoint, user_id, details)
        VALUES (@action, @endpoint, @adminId, @details)
      `);

    await transaction.commit();

    return res.json({
      success: true,
      message: `Software products for Order #${order.order_number} successfully delivered!`,
      orderId,
      orderNumber: order.order_number,
      customer: {
        name: order.full_name,
        email: order.email
      },
      deliveryStatus: 'Delivered',
      licenses: generatedLicenses
    });

  } catch (err) {
    if (transaction) {
      try { await transaction.rollback(); } catch (rbErr) {}
    }
    console.error('Order delivery error:', err);
    return res.status(500).json({
      success: false,
      message: 'Database error during software delivery execution.'
    });
  }
});

// POST /api/admin/products - Add new software product
router.post('/products', async (req, res) => {
  try {
    const {
      categoryId,
      name,
      tagline,
      version,
      platform,
      licenseType,
      price,
      originalPrice,
      description,
      imageUrl,
      downloadUrl,
      fileSize,
      features,
      systemReqs,
      isFeatured = 0
    } = req.body;

    if (!categoryId || !name || !version || !platform || !licenseType || !price || !description) {
      return res.status(400).json({
        success: false,
        message: 'Missing required product fields: categoryId, name, version, platform, licenseType, price, description.'
      });
    }

    const pool = await getPool();
    const insertRes = await pool.request()
      .input('catId', sql.Int, parseInt(categoryId, 10))
      .input('name', sql.NVarChar(200), name)
      .input('tagline', sql.NVarChar(255), tagline || '')
      .input('version', sql.NVarChar(50), version)
      .input('platform', sql.NVarChar(150), platform)
      .input('licType', sql.NVarChar(100), licenseType)
      .input('price', sql.Decimal(10, 2), parseFloat(price))
      .input('origPrice', sql.Decimal(10, 2), originalPrice ? parseFloat(originalPrice) : null)
      .input('desc', sql.NVarChar(sql.MAX), description)
      .input('img', sql.NVarChar(500), imageUrl || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600')
      .input('downUrl', sql.NVarChar(500), downloadUrl || `/downloads/${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.zip`)
      .input('fileSize', sql.NVarChar(50), fileSize || '150 MB')
      .input('feats', sql.NVarChar(sql.MAX), typeof features === 'string' ? features : JSON.stringify(features || []))
      .input('sysReqs', sql.NVarChar(sql.MAX), typeof systemReqs === 'string' ? systemReqs : JSON.stringify(systemReqs || {}))
      .input('feat', sql.Bit, isFeatured ? 1 : 0)
      .query(`
        INSERT INTO dbo.Products (
          category_id, name, tagline, version, platform, license_type,
          price, original_price, description, image_url, download_url,
          file_size, features, system_reqs, is_featured
        )
        OUTPUT INSERTED.product_id
        VALUES (
          @catId, @name, @tagline, @version, @platform, @licType,
          @price, @origPrice, @desc, @img, @downUrl,
          @fileSize, @feats, @sysReqs, @feat
        );
      `);

    return res.status(201).json({
      success: true,
      message: 'New software product registered in database.',
      productId: insertRes.recordset[0].product_id
    });

  } catch (err) {
    console.error('Create product error:', err);
    return res.status(500).json({ success: false, message: 'Database error adding software product.' });
  }
});

// PUT /api/admin/products/:id - Update product
router.put('/products/:id', async (req, res) => {
  try {
    const pId = parseInt(req.params.id, 10);
    if (isNaN(pId)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID.' });
    }

    const {
      categoryId,
      name,
      tagline,
      version,
      platform,
      licenseType,
      price,
      originalPrice,
      description,
      imageUrl,
      downloadUrl,
      fileSize,
      isFeatured,
      isActive
    } = req.body;

    const pool = await getPool();
    await pool.request()
      .input('pId', sql.Int, pId)
      .input('catId', sql.Int, parseInt(categoryId, 10))
      .input('name', sql.NVarChar(200), name)
      .input('tagline', sql.NVarChar(255), tagline)
      .input('version', sql.NVarChar(50), version)
      .input('platform', sql.NVarChar(150), platform)
      .input('licType', sql.NVarChar(100), licenseType)
      .input('price', sql.Decimal(10, 2), parseFloat(price))
      .input('origPrice', sql.Decimal(10, 2), originalPrice ? parseFloat(originalPrice) : null)
      .input('desc', sql.NVarChar(sql.MAX), description)
      .input('img', sql.NVarChar(500), imageUrl)
      .input('downUrl', sql.NVarChar(500), downloadUrl)
      .input('fileSize', sql.NVarChar(50), fileSize)
      .input('feat', sql.Bit, isFeatured ? 1 : 0)
      .input('active', sql.Bit, isActive !== undefined ? (isActive ? 1 : 0) : 1)
      .query(`
        UPDATE dbo.Products
        SET 
          category_id = ISNULL(@catId, category_id),
          name = ISNULL(@name, name),
          tagline = ISNULL(@tagline, tagline),
          version = ISNULL(@version, version),
          platform = ISNULL(@platform, platform),
          license_type = ISNULL(@licType, license_type),
          price = ISNULL(@price, price),
          original_price = @origPrice,
          description = ISNULL(@desc, description),
          image_url = ISNULL(@img, image_url),
          download_url = ISNULL(@downUrl, download_url),
          file_size = ISNULL(@fileSize, file_size),
          is_featured = ISNULL(@feat, is_featured),
          is_active = ISNULL(@active, is_active)
        WHERE product_id = @pId
      `);

    return res.json({
      success: true,
      message: 'Software product updated in database.'
    });

  } catch (err) {
    console.error('Update product error:', err);
    return res.status(500).json({ success: false, message: 'Database error updating product.' });
  }
});

// DELETE /api/admin/products/:id - Soft delete
router.delete('/products/:id', async (req, res) => {
  try {
    const pId = parseInt(req.params.id, 10);
    const pool = await getPool();
    await pool.request()
      .input('pId', sql.Int, pId)
      .query('UPDATE dbo.Products SET is_active = 0 WHERE product_id = @pId');

    return res.json({ success: true, message: 'Software product deactivated.' });
  } catch (err) {
    console.error('Delete product error:', err);
    return res.status(500).json({ success: false, message: 'Database error removing product.' });
  }
});

// GET /api/admin/licenses - All software licenses issued across database
router.get('/licenses', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        sl.license_id,
        sl.license_key,
        sl.status,
        sl.issued_at,
        sl.download_count,
        o.order_number,
        u.full_name AS customer_name,
        u.email AS customer_email,
        p.name AS product_name,
        p.version,
        p.platform
      FROM dbo.SoftwareLicenses sl
      JOIN dbo.Orders o ON sl.order_id = o.order_id
      JOIN dbo.Users u ON o.user_id = u.user_id
      JOIN dbo.Products p ON sl.product_id = p.product_id
      ORDER BY sl.license_id DESC
    `);

    return res.json({
      success: true,
      licenses: result.recordset
    });
  } catch (err) {
    console.error('Error fetching licenses:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve licenses.' });
  }
});

// GET /api/admin/users - User directory
router.get('/users', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        u.user_id,
        u.full_name,
        u.email,
        u.role,
        u.created_at,
        (SELECT COUNT(*) FROM dbo.Orders WHERE user_id = u.user_id) AS orders_count
      FROM dbo.Users u
      ORDER BY u.user_id ASC
    `);

    return res.json({
      success: true,
      users: result.recordset
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve users.' });
  }
});

// GET /api/admin/logs - Live database audit logs
router.get('/logs', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT TOP 50
        l.log_id,
        l.action_type,
        l.endpoint,
        l.user_id,
        u.email AS user_email,
        l.details,
        l.ip_address,
        l.created_at
      FROM dbo.AuditLogs l
      LEFT JOIN dbo.Users u ON l.user_id = u.user_id
      ORDER BY l.log_id DESC
    `);

    return res.json({
      success: true,
      logs: result.recordset
    });
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve logs.' });
  }
});

module.exports = router;
