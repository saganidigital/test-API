# Nexus Software Store | SSMS 2022 API-Driven E-Commerce

A full-stack software e-commerce platform demonstrating secure REST API architecture with Microsoft SQL Server 2022 (SSMS).

## 🚀 Features

- **Software Catalog**: Interactive catalog with real-time category filtering, search, and software details.
- **Secure Authentication**: JWT token authentication with 12-round bcrypt password hashing.
- **Software Locker**: Instant cryptographic license keys and activation records delivered upon checkout.
- **Admin Dashboard**: Comprehensive order, customer, license key, and software management.
- **RESTful API**: Documented endpoints with Swagger UI at `/api/docs`.
- **Enterprise Security**: Helmet.js HTTP headers, rate limiting, and parameterized SQL queries.

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, mssql / tedious, JWT, bcryptjs, Helmet, Morgan, Swagger UI
- **Database**: Microsoft SQL Server 2022 (SSMS)
- **Frontend**: Modern Vanilla HTML5, CSS3 (Custom Glassmorphism Design System), JavaScript ES6+

## 📁 Project Structure

```
├── backend/
│   ├── src/
│   │   ├── config/      # DB and server configurations
│   │   ├── middleware/  # Auth, validation, error handling
│   │   └── routes/      # API route handlers
│   ├── server.js        # Express server entry point
│   ├── .env.example     # Environment template
│   └── package.json     # Backend dependencies
├── database/
│   ├── schema.sql       # SQL Server schema definition
│   └── setup-db.js      # Automated database initialization script
└── frontend/
    ├── css/style.css    # Responsive styles and design system
    ├── js/              # Frontend API client and application logic
    ├── index.html       # Storefront & software locker
    ├── auth.html        # Authentication portal
    └── admin.html       # Administrator dashboard
```

## ⚙️ Getting Started

### 1. Database Setup
Ensure Microsoft SQL Server is running locally, then execute `schema.sql` in SQL Server Management Studio (SSMS) or run:
```bash
node database/setup-db.js
```

### 2. Backend Configuration
Navigate to the `backend` directory:
```bash
cd backend
cp .env.example .env
npm install
npm start
```

### 3. Access Application
- Storefront: `http://localhost:5000`
- API Documentation: `http://localhost:5000/api/docs`
- Health Check: `http://localhost:5000/api/health`
