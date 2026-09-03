const swaggerUi = require('swagger-ui-express');

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Nexus Software Store REST API',
    version: '1.0.0',
    description: `
Interactive REST API Documentation & Testing Console for the Software E-Commerce Marketplace.
Connected to **Microsoft SQL Server 2022 / SSMS (SoftwareCommerceDB)** with 12-round **bcrypt** password hashing and cryptographic digital software license issuance.

**Security Stack:** Helmet.js headers, JWT authentication, bcrypt hashing, rate limiting, parameterized SQL queries.

### 🎓 Educational Demo Accounts:
> These accounts are pre-seeded for testing purposes in this educational project.
* **Customer:** \`customer@example.com\` / \`Customer@123456\`
* **Admin:** \`admin@softwarestore.com\` / \`Admin@123456\`

*Click **Authorize** (top-right) and enter your JWT token as \`Bearer <your_token>\` to test protected routes.*
    `,
    contact: {
      name: 'Nexus Software Support',
      email: 'support@softwarestore.com'
    }
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Development Server'
    }
  ],
  tags: [
    { name: 'Authentication', description: 'User registration, bcrypt login, and JWT session handling' },
    { name: 'Catalog & Categories', description: 'Browse software products, categories, search, and specs' },
    { name: 'Shopping Cart', description: 'Database-persisted cart management and item modifications' },
    { name: 'Orders & Software Locker', description: 'Order checkout, license locker, and download access' },
    { name: 'Admin Control Center', description: 'Fulfillment delivery, product management, user accounts, and audit logs (Requires Admin Role)' },
    { name: 'System & Downloads', description: 'Database health check, system routes, and software binary downloads' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide your JWT token obtained from POST /api/auth/login or POST /api/auth/register.'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          userId: { type: 'integer', example: 1 },
          fullName: { type: 'string', example: 'Alex Developer' },
          email: { type: 'string', format: 'email', example: 'customer@example.com' },
          role: { type: 'string', enum: ['customer', 'admin'], example: 'customer' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      Category: {
        type: 'object',
        properties: {
          category_id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Cybersecurity & Protection' },
          slug: { type: 'string', example: 'cybersecurity' },
          description: { type: 'string', example: 'Endpoint protection, encryption, and threat analysis.' },
          icon: { type: 'string', example: 'shield-lock' },
          product_count: { type: 'integer', example: 2 }
        }
      },
      Product: {
        type: 'object',
        properties: {
          product_id: { type: 'integer', example: 1 },
          category_id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'CyberShield Endpoint Enterprise' },
          tagline: { type: 'string', example: 'Real-time kernel-level zero-trust threat mitigation.' },
          version: { type: 'string', example: 'v4.2.1' },
          platform: { type: 'string', example: 'Windows / Linux / macOS' },
          license_type: { type: 'string', example: 'Perpetual Commercial License' },
          price: { type: 'number', format: 'float', example: 149.99 },
          original_price: { type: 'number', format: 'float', example: 199.99 },
          description: { type: 'string', example: 'Comprehensive endpoint defense system...' },
          file_size: { type: 'string', example: '342 MB' },
          rating: { type: 'number', format: 'float', example: 4.9 },
          review_count: { type: 'integer', example: 128 },
          is_featured: { type: 'boolean', example: true },
          is_active: { type: 'boolean', example: true }
        }
      },
      CartItem: {
        type: 'object',
        properties: {
          cart_item_id: { type: 'integer', example: 1 },
          product_id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'CyberShield Endpoint Enterprise' },
          price: { type: 'number', example: 149.99 },
          quantity: { type: 'integer', example: 1 },
          item_total: { type: 'number', example: 149.99 }
        }
      },
      Order: {
        type: 'object',
        properties: {
          order_id: { type: 'integer', example: 1 },
          order_number: { type: 'string', example: 'ORD-2026-X9Z1-A42B' },
          total_amount: { type: 'number', example: 149.99 },
          payment_status: { type: 'string', example: 'Paid' },
          delivery_status: { type: 'string', enum: ['Pending', 'Delivered'], example: 'Delivered' },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      License: {
        type: 'object',
        properties: {
          license_id: { type: 'integer', example: 1 },
          order_id: { type: 'integer', example: 1 },
          product_id: { type: 'integer', example: 1 },
          product_name: { type: 'string', example: 'CyberShield Endpoint Enterprise' },
          license_key: { type: 'string', example: 'CYBE-A84F-92C1-30D8' },
          status: { type: 'string', example: 'Active' },
          issued_at: { type: 'string', format: 'date-time' }
        }
      },
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully.' }
        }
      }
    }
  },
  paths: {
    // --- AUTHENTICATION ---
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new customer account',
        description: 'Creates a user in SSMS 2022 with a password hashed using 12-round bcrypt.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fullName', 'email', 'password'],
                properties: {
                  fullName: { type: 'string', example: 'Jane Developer' },
                  email: { type: 'string', format: 'email', example: 'jane.dev@example.com' },
                  password: { type: 'string', format: 'password', example: 'SecurePassword@123' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Account created with JWT token returned.' },
          400: { description: 'Missing required fields or invalid password length.' },
          409: { description: 'Email address is already registered.' }
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Authenticate and receive JWT token',
        description: 'Verifies email & password against stored bcrypt hash in SQL Server.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'customer@example.com' },
                  password: { type: 'string', format: 'password', example: 'Customer@123456' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Authentication successful with JWT token and user info.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    user: { $ref: '#/components/schemas/User' },
                    token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsIn...' }
                  }
                }
              }
            }
          },
          401: { description: 'Invalid email or password.' }
        }
      }
    },
    '/api/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get current authenticated user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Profile information from SSMS 2022.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    user: { $ref: '#/components/schemas/User' }
                  }
                }
              }
            }
          },
          401: { description: 'Unauthorized or missing/expired JWT token.' }
        }
      }
    },

    // --- CATALOG & CATEGORIES ---
    '/api/categories': {
      get: {
        tags: ['Catalog & Categories'],
        summary: 'Get all software categories',
        description: 'Returns all categories along with active product counts.',
        responses: {
          200: {
            description: 'List of categories.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    categories: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Category' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/products': {
      get: {
        tags: ['Catalog & Categories'],
        summary: 'Browse software products',
        description: 'Retrieve active software catalog with optional category filter, keyword search, and sorting.',
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Category slug (e.g. cybersecurity, developer-tools)' },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search term for name, description, or platform' },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['featured', 'rating', 'price_asc', 'price_desc', 'name'] }, description: 'Sort criteria' },
          { name: 'featured', in: 'query', schema: { type: 'string', enum: ['1', '0', 'true'] }, description: 'Filter featured products only' }
        ],
        responses: {
          200: {
            description: 'Catalog products list.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    count: { type: 'integer', example: 7 },
                    products: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Product' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/products/{id}': {
      get: {
        tags: ['Catalog & Categories'],
        summary: 'Get product details by ID',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'Product ID' }
        ],
        responses: {
          200: {
            description: 'Full product details with specifications and system requirements.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    product: { $ref: '#/components/schemas/Product' }
                  }
                }
              }
            }
          },
          404: { description: 'Software product not found.' }
        }
      }
    },

    // --- SHOPPING CART ---
    '/api/cart': {
      get: {
        tags: ['Shopping Cart'],
        summary: 'Get user shopping cart',
        description: 'Retrieves current user items stored in SSMS CartItems table.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Cart contents with subtotal and items.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    items: { type: 'array', items: { $ref: '#/components/schemas/CartItem' } },
                    count: { type: 'integer', example: 1 },
                    subtotal: { type: 'number', example: 149.99 },
                    total: { type: 'number', example: 149.99 }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/cart/add': {
      post: {
        tags: ['Shopping Cart'],
        summary: 'Add software product to cart',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['productId'],
                properties: {
                  productId: { type: 'integer', example: 1 },
                  quantity: { type: 'integer', default: 1, example: 1 }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Item added or quantity incremented in database cart.' },
          404: { description: 'Software product not found.' }
        }
      }
    },
    '/api/cart/update': {
      put: {
        tags: ['Shopping Cart'],
        summary: 'Update item quantity in cart',
        description: 'Updates quantity in SQL Server. If quantity <= 0, removes the item.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['productId', 'quantity'],
                properties: {
                  productId: { type: 'integer', example: 1 },
                  quantity: { type: 'integer', example: 2 }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Cart updated successfully.' }
        }
      }
    },
    '/api/cart/remove/{productId}': {
      delete: {
        tags: ['Shopping Cart'],
        summary: 'Remove specific item from cart',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'productId', in: 'path', required: true, schema: { type: 'integer' }, description: 'Product ID' }
        ],
        responses: {
          200: { description: 'Item removed from database cart.' }
        }
      }
    },
    '/api/cart/clear': {
      delete: {
        tags: ['Shopping Cart'],
        summary: 'Clear all items from user cart',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Cart cleared in database.' }
        }
      }
    },

    // --- ORDERS & SOFTWARE LOCKER ---
    '/api/orders/checkout': {
      post: {
        tags: ['Orders & Software Locker'],
        summary: 'Checkout and create order',
        description: 'Atomically creates an order with status "Pending" in SQL Server and clears user cart.',
        security: [{ bearerAuth: [] }],
        responses: {
          201: {
            description: 'Order created successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string' },
                    order: {
                      type: 'object',
                      properties: {
                        orderId: { type: 'integer', example: 3 },
                        orderNumber: { type: 'string', example: 'ORD-2026-1TV5-50C6' },
                        totalAmount: { type: 'number', example: 149.99 },
                        deliveryStatus: { type: 'string', example: 'Pending' }
                      }
                    }
                  }
                }
              }
            }
          },
          400: { description: 'Cart is empty.' }
        }
      }
    },
    '/api/orders/my-orders': {
      get: {
        tags: ['Orders & Software Locker'],
        summary: 'Get Customer Software Locker',
        description: 'Returns all orders placed by current user along with issued license keys and software binaries.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'List of customer orders with licenses and download links.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    orders: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          order_id: { type: 'integer', example: 1 },
                          order_number: { type: 'string', example: 'ORD-2026-0001-A1B2' },
                          total_amount: { type: 'number', example: 89.00 },
                          delivery_status: { type: 'string', example: 'Delivered' },
                          items: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                product_name: { type: 'string', example: 'CodeWeave IDE Pro' },
                                license_key: { type: 'string', example: 'CODE-9F2B-4A1C-8E7D' },
                                download_url: { type: 'string', example: '/downloads/codeweave-pro-v2.1.zip' }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/orders/{id}': {
      get: {
        tags: ['Orders & Software Locker'],
        summary: 'Get specific order by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
        ],
        responses: {
          200: { description: 'Order details.' },
          404: { description: 'Order not found.' }
        }
      }
    },

    // --- ADMIN CONTROL CENTER ---
    '/api/admin/stats': {
      get: {
        tags: ['Admin Control Center'],
        summary: 'Get real-time database KPI metrics',
        description: 'Requires Admin role. Aggregates revenue, pending deliveries, products, and customer counts from SSMS.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'KPI summary.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    stats: {
                      type: 'object',
                      properties: {
                        totalRevenue: { type: 'number', example: 388.98 },
                        totalOrders: { type: 'integer', example: 3 },
                        pendingDeliveries: { type: 'integer', example: 0 },
                        deliveredOrders: { type: 'integer', example: 3 },
                        activeProducts: { type: 'integer', example: 7 },
                        totalCustomers: { type: 'integer', example: 1 },
                        issuedLicenses: { type: 'integer', example: 3 }
                      }
                    }
                  }
                }
              }
            }
          },
          403: { description: 'Access denied: Requires administrator privilege.' }
        }
      }
    },
    '/api/admin/orders': {
      get: {
        tags: ['Admin Control Center'],
        summary: 'List all store orders',
        description: 'Requires Admin role. Returns all customer orders with fulfillment status.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Full orders list.' }
        }
      }
    },
    '/api/admin/orders/{id}/deliver': {
      post: {
        tags: ['Admin Control Center'],
        summary: 'Fulfill & deliver software order',
        description: 'Generates unique cryptographic software license keys in SSMS 2022 and updates delivery_status to "Delivered".',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'Order ID to deliver' }
        ],
        responses: {
          200: {
            description: 'Order fulfilled and software license keys generated.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    orderNumber: { type: 'string', example: 'ORD-2026-1TV5-50C6' },
                    deliveryStatus: { type: 'string', example: 'Delivered' },
                    licenses: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          productId: { type: 'integer', example: 1 },
                          productName: { type: 'string', example: 'CyberShield Endpoint Enterprise' },
                          licenseKey: { type: 'string', example: 'CYBE-2A73-E345-B5B9' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/admin/products': {
      get: {
        tags: ['Admin Control Center'],
        summary: 'List all products (including inactive)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'All products for management.' }
        }
      },
      post: {
        tags: ['Admin Control Center'],
        summary: 'Create a new software product in catalog',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'category_id', 'price'],
                properties: {
                  name: { type: 'string', example: 'NetworkPulse Pro' },
                  category_id: { type: 'integer', example: 1 },
                  tagline: { type: 'string', example: 'Ultra-fast packet sniffer & telemetry.' },
                  version: { type: 'string', example: 'v1.0.0' },
                  platform: { type: 'string', example: 'Windows / Linux' },
                  license_type: { type: 'string', example: 'Commercial Node' },
                  price: { type: 'number', example: 79.99 },
                  original_price: { type: 'number', example: 99.99 },
                  description: { type: 'string', example: 'Low-latency network inspection utility.' },
                  file_size: { type: 'string', example: '45 MB' },
                  download_url: { type: 'string', example: '/downloads/networkpulse-v1.0.zip' },
                  icon: { type: 'string', example: 'cpu' },
                  is_featured: { type: 'boolean', example: false }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Software product created in SSMS database.' }
        }
      }
    },
    '/api/admin/products/{id}/toggle': {
      put: {
        tags: ['Admin Control Center'],
        summary: 'Toggle product active/inactive visibility',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
        ],
        responses: {
          200: { description: 'Product visibility toggled.' }
        }
      }
    },
    '/api/admin/licenses': {
      get: {
        tags: ['Admin Control Center'],
        summary: 'View all issued software license keys in database',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'All issued cryptographic licenses.' }
        }
      }
    },
    '/api/admin/users': {
      get: {
        tags: ['Admin Control Center'],
        summary: 'View all registered user accounts',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'List of registered customer and admin accounts.' }
        }
      }
    },
    '/api/admin/logs': {
      get: {
        tags: ['Admin Control Center'],
        summary: 'View SQL Server audit trail logs',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Audit trail log records.' }
        }
      }
    },

    // --- SYSTEM & DOWNLOADS ---
    '/api/health': {
      get: {
        tags: ['System & Downloads'],
        summary: 'Health check and SQL Server connection status',
        responses: {
          200: {
            description: 'Server and database connection healthy.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'healthy' },
                    service: { type: 'string', example: 'Software Commerce REST API' },
                    database: { type: 'string', example: 'SoftwareCommerceDB' },
                    serverTime: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          },
          500: { description: 'Database connection failed.' }
        }
      }
    },
    '/api/system/endpoints': {
      get: {
        tags: ['System & Downloads'],
        summary: 'List system API endpoints and database operations',
        responses: {
          200: { description: 'Directory of system endpoints.' }
        }
      }
    },
    '/downloads/{filename}': {
      get: {
        tags: ['System & Downloads'],
        summary: 'Download digital software binary',
        description: 'Simulates dispatching signed software binary payload.',
        parameters: [
          { name: 'filename', in: 'path', required: true, schema: { type: 'string' }, example: 'cybershield-enterprise-v4.2.1.exe' }
        ],
        responses: {
          200: {
            description: 'Binary stream download.',
            content: {
              'application/octet-stream': {
                schema: { type: 'string', format: 'binary' }
              }
            }
          }
        }
      }
    }
  }
};

// Custom Cyber Dark CSS for Swagger UI
const customCss = `
  body {
    background-color: #040810 !important;
    color: #e6edf3 !important;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif !important;
  }
  .swagger-ui .topbar {
    background-color: #080f1d !important;
    border-bottom: 1px solid rgba(0, 240, 255, 0.25) !important;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5) !important;
  }
  .swagger-ui .topbar .download-url-wrapper { display: none !important; }
  .swagger-ui .info .title {
    color: #00f0ff !important;
    font-weight: 800 !important;
    text-shadow: 0 0 10px rgba(0, 240, 255, 0.3) !important;
  }
  .swagger-ui .info p, .swagger-ui .info li {
    color: #94a3b8 !important;
  }
  .swagger-ui .scheme-container {
    background-color: #080f1d !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
  }
  .swagger-ui .opblock {
    background: #0b1325 !important;
    border-radius: 8px !important;
    box-shadow: 0 2px 10px rgba(0,0,0,0.4) !important;
  }
  .swagger-ui .opblock .opblock-summary {
    border-bottom-color: rgba(255, 255, 255, 0.05) !important;
  }
  .swagger-ui .opblock.opblock-get { border-color: #00f0ff !important; background: rgba(0, 240, 255, 0.05) !important; }
  .swagger-ui .opblock.opblock-get .opblock-summary-method { background: #00f0ff !important; color: #040810 !important; font-weight: 700 !important; }
  .swagger-ui .opblock.opblock-post { border-color: #00ffaa !important; background: rgba(0, 255, 170, 0.05) !important; }
  .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #00ffaa !important; color: #040810 !important; font-weight: 700 !important; }
  .swagger-ui .opblock.opblock-put { border-color: #ffaa00 !important; background: rgba(255, 170, 0, 0.05) !important; }
  .swagger-ui .opblock.opblock-put .opblock-summary-method { background: #ffaa00 !important; color: #040810 !important; font-weight: 700 !important; }
  .swagger-ui .opblock.opblock-delete { border-color: #ff3366 !important; background: rgba(255, 51, 102, 0.05) !important; }
  .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: #ff3366 !important; color: #ffffff !important; font-weight: 700 !important; }
  .swagger-ui .opblock-body { background: #06090e !important; }
  .swagger-ui table thead tr td, .swagger-ui table thead tr th { color: #00f0ff !important; border-bottom: 1px solid rgba(0, 240, 255, 0.2) !important; }
  .swagger-ui .parameters-col_name, .swagger-ui .parameter__name { color: #ffffff !important; }
  .swagger-ui input[type=text], .swagger-ui textarea, .swagger-ui select {
    background: #080f1d !important;
    color: #00f0ff !important;
    border: 1px solid rgba(0, 240, 255, 0.3) !important;
    border-radius: 4px !important;
  }
  .swagger-ui .btn.authorize {
    color: #00ffaa !important;
    border-color: #00ffaa !important;
    background: rgba(0, 255, 170, 0.1) !important;
  }
  .swagger-ui .btn.authorize svg { fill: #00ffaa !important; }
  .swagger-ui .btn.execute {
    background-color: #00f0ff !important;
    color: #040810 !important;
    border-color: #00f0ff !important;
    font-weight: 700 !important;
  }
  .swagger-ui section.models {
    background: #080f1d !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: 8px !important;
  }
  .swagger-ui section.models h4 { color: #00f0ff !important; }
  .swagger-ui .model-box { background: #06090e !important; }
`;

function setupSwagger(app) {
  // Serve raw JSON spec
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Mount Swagger UI
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss,
      customSiteTitle: 'Nexus Software Store - Swagger API Testing Console'
    })
  );

  // Alias /docs to /api/docs
  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss,
      customSiteTitle: 'Nexus Software Store - Swagger API Testing Console'
    })
  );
}

module.exports = {
  swaggerSpec,
  setupSwagger
};
