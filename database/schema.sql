-- ==========================================================
-- SOFTWARE E-COMMERCE PLATFORM - SSMS 2022 DATABASE SCHEMA
-- Database: SoftwareCommerceDB
-- Target: Microsoft SQL Server 2022 / SSMS 2022
-- ==========================================================

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'SoftwareCommerceDB')
BEGIN
    CREATE DATABASE SoftwareCommerceDB;
END
GO

USE SoftwareCommerceDB;
GO

-- 1. USERS TABLE
IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users (
        user_id INT IDENTITY(1,1) PRIMARY KEY,
        full_name NVARCHAR(100) NOT NULL,
        email NVARCHAR(150) NOT NULL UNIQUE,
        password_hash NVARCHAR(255) NOT NULL,
        role NVARCHAR(20) NOT NULL DEFAULT 'customer', -- 'customer' | 'admin'
        created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
    );
    CREATE INDEX IX_Users_Email ON dbo.Users(email);
END
GO

-- 2. CATEGORIES TABLE
IF OBJECT_ID(N'dbo.Categories', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Categories (
        category_id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL UNIQUE,
        slug NVARCHAR(100) NOT NULL UNIQUE,
        description NVARCHAR(500) NULL,
        icon NVARCHAR(50) NULL
    );
END
GO

-- 3. PRODUCTS TABLE (Digital Software Products)
IF OBJECT_ID(N'dbo.Products', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Products (
        product_id INT IDENTITY(1,1) PRIMARY KEY,
        category_id INT NOT NULL,
        name NVARCHAR(200) NOT NULL,
        tagline NVARCHAR(255) NULL,
        version NVARCHAR(50) NOT NULL,
        platform NVARCHAR(150) NOT NULL, -- e.g. 'Windows 10/11, macOS, Linux'
        license_type NVARCHAR(100) NOT NULL, -- 'Perpetual Commercial', 'Annual Subscription', 'Enterprise Site'
        price DECIMAL(10, 2) NOT NULL,
        original_price DECIMAL(10, 2) NULL,
        description NVARCHAR(MAX) NOT NULL,
        image_url NVARCHAR(500) NULL,
        download_url NVARCHAR(500) NULL,
        file_size NVARCHAR(50) NULL,
        features NVARCHAR(MAX) NULL, -- JSON array of feature bullets
        system_reqs NVARCHAR(MAX) NULL,
        rating DECIMAL(3, 2) NOT NULL DEFAULT 4.9,
        review_count INT NOT NULL DEFAULT 48,
        is_featured BIT NOT NULL DEFAULT 0,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_Products_Categories FOREIGN KEY (category_id) REFERENCES dbo.Categories(category_id)
    );
    CREATE INDEX IX_Products_Category ON dbo.Products(category_id);
    CREATE INDEX IX_Products_Active ON dbo.Products(is_active);
END
GO

-- 4. CART ITEMS TABLE (Persistent User Shopping Cart)
IF OBJECT_ID(N'dbo.CartItems', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CartItems (
        cart_item_id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_CartItems_Users FOREIGN KEY (user_id) REFERENCES dbo.Users(user_id) ON DELETE CASCADE,
        CONSTRAINT FK_CartItems_Products FOREIGN KEY (product_id) REFERENCES dbo.Products(product_id) ON DELETE CASCADE,
        CONSTRAINT UQ_Cart_User_Product UNIQUE (user_id, product_id)
    );
    CREATE INDEX IX_CartItems_User ON dbo.CartItems(user_id);
END
GO

-- 5. ORDERS TABLE
IF OBJECT_ID(N'dbo.Orders', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Orders (
        order_id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        order_number NVARCHAR(50) NOT NULL UNIQUE,
        total_amount DECIMAL(10, 2) NOT NULL,
        payment_status NVARCHAR(50) NOT NULL DEFAULT 'Paid',
        delivery_status NVARCHAR(50) NOT NULL DEFAULT 'Pending', -- 'Pending' | 'Delivered'
        created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        delivered_at DATETIME2 NULL,
        CONSTRAINT FK_Orders_Users FOREIGN KEY (user_id) REFERENCES dbo.Users(user_id)
    );
    CREATE INDEX IX_Orders_User ON dbo.Orders(user_id);
    CREATE INDEX IX_Orders_DeliveryStatus ON dbo.Orders(delivery_status);
END
GO

-- 6. ORDER ITEMS TABLE
IF OBJECT_ID(N'dbo.OrderItems', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OrderItems (
        order_item_id INT IDENTITY(1,1) PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        price_at_purchase DECIMAL(10, 2) NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        CONSTRAINT FK_OrderItems_Orders FOREIGN KEY (order_id) REFERENCES dbo.Orders(order_id) ON DELETE CASCADE,
        CONSTRAINT FK_OrderItems_Products FOREIGN KEY (product_id) REFERENCES dbo.Products(product_id)
    );
    CREATE INDEX IX_OrderItems_Order ON dbo.OrderItems(order_id);
END
GO

-- 7. SOFTWARE LICENSES TABLE (Cryptographic Keys & Delivery Artifacts)
IF OBJECT_ID(N'dbo.SoftwareLicenses', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SoftwareLicenses (
        license_id INT IDENTITY(1,1) PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        license_key NVARCHAR(100) NOT NULL UNIQUE,
        status NVARCHAR(50) NOT NULL DEFAULT 'Active', -- 'Active' | 'Revoked'
        issued_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        download_count INT NOT NULL DEFAULT 0,
        CONSTRAINT FK_SoftwareLicenses_Orders FOREIGN KEY (order_id) REFERENCES dbo.Orders(order_id),
        CONSTRAINT FK_SoftwareLicenses_Products FOREIGN KEY (product_id) REFERENCES dbo.Products(product_id)
    );
    CREATE INDEX IX_SoftwareLicenses_Order ON dbo.SoftwareLicenses(order_id);
END
GO

-- 8. AUDIT / API LOGS TABLE
IF OBJECT_ID(N'dbo.AuditLogs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AuditLogs (
        log_id INT IDENTITY(1,1) PRIMARY KEY,
        action_type NVARCHAR(100) NOT NULL,
        endpoint NVARCHAR(200) NOT NULL,
        user_id INT NULL,
        details NVARCHAR(MAX) NULL,
        ip_address NVARCHAR(50) NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
    );
    CREATE INDEX IX_AuditLogs_CreatedAt ON dbo.AuditLogs(created_at DESC);
END
GO
