const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { sql, getPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Helper to generate a unique human-friendly order number
function generateOrderNumber() {
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `ORD-2026-${timestamp}-${randomHex}`;
}

// POST /api/orders/checkout - Convert cart into a paid pending order
router.post('/checkout', async (req, res) => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    const userId = req.user.user_id;

    // Get current cart items
    const cartRes = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT 
          ci.product_id, 
          ci.quantity, 
          p.name, 
          p.price,
          (ci.quantity * p.price) AS line_total
        FROM dbo.CartItems ci
        JOIN dbo.Products p ON ci.product_id = p.product_id
        WHERE ci.user_id = @userId AND p.is_active = 1
      `);

    const cartItems = cartRes.recordset;

    if (cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot checkout: Your cart is empty.'
      });
    }

    const totalAmount = cartItems.reduce((acc, item) => acc + Number(item.line_total), 0);
    const orderNumber = generateOrderNumber();

    await transaction.begin();

    // 1. Insert into Orders table
    const orderInsertRes = await new sql.Request(transaction)
      .input('userId', sql.Int, userId)
      .input('orderNumber', sql.NVarChar(50), orderNumber)
      .input('totalAmount', sql.Decimal(10, 2), totalAmount)
      .input('payStat', sql.NVarChar(50), 'Paid')
      .input('delStat', sql.NVarChar(50), 'Pending') // Waits for admin delivery
      .query(`
        INSERT INTO dbo.Orders (user_id, order_number, total_amount, payment_status, delivery_status)
        OUTPUT INSERTED.order_id, INSERTED.order_number, INSERTED.total_amount, INSERTED.delivery_status, INSERTED.created_at
        VALUES (@userId, @orderNumber, @totalAmount, @payStat, @delStat);
      `);

    const createdOrder = orderInsertRes.recordset[0];
    const orderId = createdOrder.order_id;

    // 2. Insert OrderItems
    for (const item of cartItems) {
      await new sql.Request(transaction)
        .input('orderId', sql.Int, orderId)
        .input('productId', sql.Int, item.product_id)
        .input('price', sql.Decimal(10, 2), item.price)
        .input('quantity', sql.Int, item.quantity)
        .query(`
          INSERT INTO dbo.OrderItems (order_id, product_id, price_at_purchase, quantity)
          VALUES (@orderId, @productId, @price, @quantity);
        `);
    }

    // 3. Clear user's CartItems
    await new sql.Request(transaction)
      .input('userId', sql.Int, userId)
      .query('DELETE FROM dbo.CartItems WHERE user_id = @userId');

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: 'Order created successfully! The admin team will deliver your software license shortly.',
      order: {
        orderId,
        orderNumber: createdOrder.order_number,
        totalAmount: createdOrder.total_amount,
        deliveryStatus: createdOrder.delivery_status,
        createdAt: createdOrder.created_at,
        itemsCount: cartItems.length
      }
    });

  } catch (err) {
    if (transaction) {
      try { await transaction.rollback(); } catch (rbErr) {}
    }
    console.error('Checkout error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to process checkout in database.'
    });
  }
});

// GET /api/orders/my-orders - Retrieve all user orders + delivered software licenses
router.get('/my-orders', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const pool = await getPool();

    // Query orders for user
    const ordersRes = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT 
          o.order_id,
          o.order_number,
          o.total_amount,
          o.payment_status,
          o.delivery_status,
          o.created_at,
          o.delivered_at
        FROM dbo.Orders o
        WHERE o.user_id = @userId
        ORDER BY o.order_id DESC
      `);

    const orders = ordersRes.recordset;

    // For each order, fetch items and licenses
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
            p.license_type,
            p.image_url,
            p.download_url,
            p.file_size
          FROM dbo.OrderItems oi
          JOIN dbo.Products p ON oi.product_id = p.product_id
          WHERE oi.order_id = @orderId
        `);

      const licensesRes = await pool.request()
        .input('orderId', sql.Int, ord.order_id)
        .query(`
          SELECT 
            sl.license_id,
            sl.product_id,
            sl.license_key,
            sl.status,
            sl.issued_at,
            sl.download_count,
            p.name AS product_name,
            p.version,
            p.download_url,
            p.file_size
          FROM dbo.SoftwareLicenses sl
          JOIN dbo.Products p ON sl.product_id = p.product_id
          WHERE sl.order_id = @orderId
        `);

      ord.items = itemsRes.recordset;
      ord.licenses = licensesRes.recordset;
    }

    return res.json({
      success: true,
      count: orders.length,
      orders
    });

  } catch (err) {
    console.error('Fetch my-orders error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve orders from database.'
    });
  }
});

// GET /api/orders/:id - Single order details
router.get('/:id', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const userId = req.user.user_id;

    if (isNaN(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID.' });
    }

    const pool = await getPool();
    const orderRes = await pool.request()
      .input('orderId', sql.Int, orderId)
      .input('userId', sql.Int, userId)
      .input('role', sql.NVarChar(20), req.user.role)
      .query(`
        SELECT 
          o.order_id,
          o.order_number,
          o.total_amount,
          o.payment_status,
          o.delivery_status,
          o.created_at,
          o.delivered_at
        FROM dbo.Orders o
        WHERE o.order_id = @orderId AND (o.user_id = @userId OR @role = 'admin')
      `);

    if (orderRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const order = orderRes.recordset[0];

    const itemsRes = await pool.request()
      .input('orderId', sql.Int, orderId)
      .query(`
        SELECT 
          oi.order_item_id,
          oi.product_id,
          oi.price_at_purchase,
          oi.quantity,
          p.name AS product_name,
          p.version,
          p.platform,
          p.license_type,
          p.image_url,
          p.download_url,
          p.file_size
        FROM dbo.OrderItems oi
        JOIN dbo.Products p ON oi.product_id = p.product_id
        WHERE oi.order_id = @orderId
      `);

    const licensesRes = await pool.request()
      .input('orderId', sql.Int, orderId)
      .query(`
        SELECT 
          sl.license_id,
          sl.product_id,
          sl.license_key,
          sl.status,
          sl.issued_at,
          sl.download_count,
          p.name AS product_name,
          p.download_url
        FROM dbo.SoftwareLicenses sl
        JOIN dbo.Products p ON sl.product_id = p.product_id
        WHERE sl.order_id = @orderId
      `);

    order.items = itemsRes.recordset;
    order.licenses = licensesRes.recordset;

    return res.json({
      success: true,
      order
    });

  } catch (err) {
    console.error('Error fetching single order:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve order from database.'
    });
  }
});

module.exports = router;
