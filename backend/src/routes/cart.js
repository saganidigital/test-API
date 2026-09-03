const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// All cart endpoints require user authentication
router.use(authenticateToken);

// GET /api/cart - Get user's cart from database
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, req.user.user_id)
      .query(`
        SELECT 
          ci.cart_item_id,
          ci.quantity,
          ci.created_at AS added_at,
          p.product_id,
          p.name,
          p.tagline,
          p.version,
          p.platform,
          p.license_type,
          p.price,
          p.image_url,
          p.file_size,
          (ci.quantity * p.price) AS item_total
        FROM dbo.CartItems ci
        JOIN dbo.Products p ON ci.product_id = p.product_id
        WHERE ci.user_id = @userId AND p.is_active = 1
        ORDER BY ci.cart_item_id DESC
      `);

    const items = result.recordset;
    const subtotal = items.reduce((acc, item) => acc + Number(item.item_total), 0);

    return res.json({
      success: true,
      items,
      count: items.reduce((acc, item) => acc + item.quantity, 0),
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: 0.00, // Digital software export
      total: parseFloat(subtotal.toFixed(2))
    });

  } catch (err) {
    console.error('Cart fetch error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve cart from database.'
    });
  }
});

// POST /api/cart/add - Add or increment product in database cart
router.post('/add', async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const pId = parseInt(productId, 10);
    const qty = Math.max(1, parseInt(quantity, 10) || 1);

    if (isNaN(pId)) {
      return res.status(400).json({ success: false, message: 'Valid product ID is required.' });
    }

    const pool = await getPool();

    // Verify product exists
    const prodCheck = await pool.request()
      .input('pId', sql.Int, pId)
      .query('SELECT product_id, name, price FROM dbo.Products WHERE product_id = @pId AND is_active = 1');

    if (prodCheck.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Software product not found.' });
    }

    // Upsert into CartItems
    await pool.request()
      .input('userId', sql.Int, req.user.user_id)
      .input('productId', sql.Int, pId)
      .input('qty', sql.Int, qty)
      .query(`
        IF EXISTS (SELECT 1 FROM dbo.CartItems WHERE user_id = @userId AND product_id = @productId)
        BEGIN
          UPDATE dbo.CartItems
          SET quantity = quantity + @qty
          WHERE user_id = @userId AND product_id = @productId;
        END
        ELSE
        BEGIN
          INSERT INTO dbo.CartItems (user_id, product_id, quantity)
          VALUES (@userId, @productId, @qty);
        END
      `);

    return res.status(200).json({
      success: true,
      message: `"${prodCheck.recordset[0].name}" added to cart in database.`
    });

  } catch (err) {
    console.error('Add to cart error:', err);
    return res.status(500).json({
      success: false,
      message: 'Database error adding software to cart.'
    });
  }
});

// PUT /api/cart/update - Modify quantity
router.put('/update', async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const pId = parseInt(productId, 10);
    const qty = parseInt(quantity, 10);

    if (isNaN(pId) || isNaN(qty)) {
      return res.status(400).json({ success: false, message: 'Product ID and quantity are required.' });
    }

    const pool = await getPool();

    if (qty <= 0) {
      // Remove item
      await pool.request()
        .input('userId', sql.Int, req.user.user_id)
        .input('productId', sql.Int, pId)
        .query('DELETE FROM dbo.CartItems WHERE user_id = @userId AND product_id = @productId');

      return res.json({ success: true, message: 'Item removed from database cart.' });
    } else {
      await pool.request()
        .input('userId', sql.Int, req.user.user_id)
        .input('productId', sql.Int, pId)
        .input('qty', sql.Int, qty)
        .query('UPDATE dbo.CartItems SET quantity = @qty WHERE user_id = @userId AND product_id = @productId');

      return res.json({ success: true, message: 'Cart updated successfully.' });
    }

  } catch (err) {
    console.error('Update cart error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update cart in database.'
    });
  }
});

// DELETE /api/cart/remove/:productId - Remove specific item
router.delete('/remove/:productId', async (req, res) => {
  try {
    const pId = parseInt(req.params.productId, 10);
    if (isNaN(pId)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID.' });
    }

    const pool = await getPool();
    await pool.request()
      .input('userId', sql.Int, req.user.user_id)
      .input('productId', sql.Int, pId)
      .query('DELETE FROM dbo.CartItems WHERE user_id = @userId AND product_id = @productId');

    return res.json({
      success: true,
      message: 'Item removed from database cart.'
    });

  } catch (err) {
    console.error('Delete cart item error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete item from database cart.'
    });
  }
});

// DELETE /api/cart/clear - Empty the entire cart
router.delete('/clear', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('userId', sql.Int, req.user.user_id)
      .query('DELETE FROM dbo.CartItems WHERE user_id = @userId');

    return res.json({
      success: true,
      message: 'Cart cleared successfully in database.'
    });

  } catch (err) {
    console.error('Clear cart error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear cart in database.'
    });
  }
});

module.exports = router;
