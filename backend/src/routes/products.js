const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../config/db');

// Helper to safely parse JSON strings
function safeJsonParse(str, fallback) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch (e) {
    return fallback;
  }
}

// GET /api/categories - List all software categories with item count
router.get('/categories', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        c.category_id, 
        c.name, 
        c.slug, 
        c.description, 
        c.icon,
        COUNT(p.product_id) AS product_count
      FROM dbo.Categories c
      LEFT JOIN dbo.Products p ON c.category_id = p.category_id AND p.is_active = 1
      GROUP BY c.category_id, c.name, c.slug, c.description, c.icon
      ORDER BY c.category_id ASC
    `);

    return res.json({
      success: true,
      categories: result.recordset
    });
  } catch (err) {
    console.error('Error fetching categories:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve software categories from database.'
    });
  }
});

// GET /api/products - Browse catalog with search, category filtering & sorting
router.get('/', async (req, res) => {
  try {
    const { category, search, sort, featured } = req.query;
    const pool = await getPool();
    const request = pool.request();

    let query = `
      SELECT 
        p.product_id,
        p.category_id,
        c.name AS category_name,
        c.slug AS category_slug,
        p.name,
        p.tagline,
        p.version,
        p.platform,
        p.license_type,
        p.price,
        p.original_price,
        p.description,
        p.image_url,
        p.download_url,
        p.file_size,
        p.features,
        p.system_reqs,
        p.rating,
        p.review_count,
        p.is_featured,
        p.is_active,
        p.created_at
      FROM dbo.Products p
      JOIN dbo.Categories c ON p.category_id = c.category_id
      WHERE p.is_active = 1
    `;

    if (category && category !== 'all') {
      request.input('catSlug', sql.NVarChar(100), category);
      query += ` AND c.slug = @catSlug`;
    }

    if (search && search.trim() !== '') {
      request.input('searchTerm', sql.NVarChar(200), `%${search.trim()}%`);
      query += ` AND (p.name LIKE @searchTerm OR p.tagline LIKE @searchTerm OR p.description LIKE @searchTerm OR p.platform LIKE @searchTerm)`;
    }

    if (featured === 'true' || featured === '1') {
      query += ` AND p.is_featured = 1`;
    }

    // Sorting
    switch (sort) {
      case 'price_asc':
        query += ` ORDER BY p.price ASC`;
        break;
      case 'price_desc':
        query += ` ORDER BY p.price DESC`;
        break;
      case 'rating':
        query += ` ORDER BY p.rating DESC, p.review_count DESC`;
        break;
      case 'name':
        query += ` ORDER BY p.name ASC`;
        break;
      case 'newest':
      default:
        query += ` ORDER BY p.is_featured DESC, p.product_id ASC`;
        break;
    }

    const result = await request.query(query);

    const products = result.recordset.map(item => ({
      ...item,
      features: safeJsonParse(item.features, []),
      system_reqs: safeJsonParse(item.system_reqs, {})
    }));

    return res.json({
      success: true,
      count: products.length,
      products
    });

  } catch (err) {
    console.error('Error fetching products:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve products from database.'
    });
  }
});

// GET /api/products/:id - Single software detail view
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID.' });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          p.*,
          c.name AS category_name,
          c.slug AS category_slug
        FROM dbo.Products p
        JOIN dbo.Categories c ON p.category_id = c.category_id
        WHERE p.product_id = @id AND p.is_active = 1
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Software product not found.' });
    }

    const item = result.recordset[0];
    const product = {
      ...item,
      features: safeJsonParse(item.features, []),
      system_reqs: safeJsonParse(item.system_reqs, {})
    };

    return res.json({
      success: true,
      product
    });

  } catch (err) {
    console.error('Error fetching single product:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve product details from database.'
    });
  }
});

module.exports = router;
