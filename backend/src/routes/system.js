const express = require('express');
const router = express.Router();

// GET /api/system/endpoints - Public API directory mapping UI buttons to their backend APIs
// NOTE: SQL operation details intentionally hidden for security
router.get('/endpoints', (req, res) => {
  res.json({
    success: true,
    platform: 'Software Commerce REST API',
    databaseEngine: 'Microsoft SQL Server 2022 / SSMS 2022',
    security: {
      passwordHashing: 'bcrypt (12 salt rounds)',
      tokenStandard: 'JSON Web Token (JWT)',
      transport: 'REST over HTTP/JSON',
      headers: 'Helmet.js Security Headers',
      rateLimiting: 'Active on all endpoints'
    },
    endpoints: [
      {
        buttonTrigger: 'Sign In Button',
        method: 'POST',
        url: '/api/auth/login',
        description: 'Authenticates user credentials against securely stored bcrypt hash',
        authRequired: 'None'
      },
      {
        buttonTrigger: 'Sign Up Button',
        method: 'POST',
        url: '/api/auth/register',
        description: 'Creates a new user account with 12-round bcrypt password hashing',
        authRequired: 'None'
      },
      {
        buttonTrigger: 'Catalog Search & Filter Pills',
        method: 'GET',
        url: '/api/products?category=:slug&search=:query&sort=:sort',
        description: 'Queries software catalog with full-text search and category filtering',
        authRequired: 'None'
      },
      {
        buttonTrigger: 'Software Quick View Button',
        method: 'GET',
        url: '/api/products/:id',
        description: 'Retrieves full software product specifications and details',
        authRequired: 'None'
      },
      {
        buttonTrigger: 'Add to Cart Button',
        method: 'POST',
        url: '/api/cart/add',
        description: 'Adds or increments a product in the user\'s persistent cart',
        authRequired: 'Bearer JWT'
      },
      {
        buttonTrigger: 'Cart Quantity (+ / -) Buttons',
        method: 'PUT',
        url: '/api/cart/update',
        description: 'Updates item quantity in the shopping cart',
        authRequired: 'Bearer JWT'
      },
      {
        buttonTrigger: 'Remove from Cart Button',
        method: 'DELETE',
        url: '/api/cart/remove/:productId',
        description: 'Removes a specific item from the cart',
        authRequired: 'Bearer JWT'
      },
      {
        buttonTrigger: 'Checkout / Buy Now Button',
        method: 'POST',
        url: '/api/orders/checkout',
        description: 'Converts cart into a paid order within a database transaction',
        authRequired: 'Bearer JWT'
      },
      {
        buttonTrigger: 'My Software Locker Tab',
        method: 'GET',
        url: '/api/orders/my-orders',
        description: 'Retrieves all user orders with delivered license keys and downloads',
        authRequired: 'Bearer JWT'
      },
      {
        buttonTrigger: 'Admin Deliver Software Button',
        method: 'POST',
        url: '/api/admin/orders/:id/deliver',
        description: 'Generates cryptographic license keys and marks order as delivered',
        authRequired: 'Admin JWT'
      },
      {
        buttonTrigger: 'Admin Add Software Button',
        method: 'POST',
        url: '/api/admin/products',
        description: 'Registers a new software product in the catalog',
        authRequired: 'Admin JWT'
      },
      {
        buttonTrigger: 'Admin Delete Software Button',
        method: 'DELETE',
        url: '/api/admin/products/:id',
        description: 'Soft-deletes a software product (deactivation)',
        authRequired: 'Admin JWT'
      },
      {
        buttonTrigger: 'Admin Refresh Stats Button',
        method: 'GET',
        url: '/api/admin/stats',
        description: 'Retrieves aggregated business metrics and KPIs',
        authRequired: 'Admin JWT'
      }
    ]
  });
});

module.exports = router;
