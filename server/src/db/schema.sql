-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Company Info Table (Singleton pattern enforced by application logic or single row constraint)
CREATE TABLE IF NOT EXISTS company_info (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  logo VARCHAR, -- Base64 or URL
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users Table
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL, -- Should be hashed in production
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Global Permissions Table (for 'user' role configuration)
DROP TABLE IF EXISTS user_permissions;
CREATE TABLE IF NOT EXISTS global_permissions (
  id SERIAL PRIMARY KEY,
  permissions JSONB NOT NULL DEFAULT '{}'
);

-- Clients Table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  contact VARCHAR(50),
  cpf VARCHAR(20),
  zip_code VARCHAR(20),
  street VARCHAR(255),
  number VARCHAR(20),
  neighborhood VARCHAR(100),
  city VARCHAR(100),
  state VARCHAR(2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  cost_price DECIMAL(10, 2),
  stock INTEGER DEFAULT 0,
  image_url VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Raw Materials Table
CREATE TABLE IF NOT EXISTS raw_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit VARCHAR(50) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
    cost_per_unit DECIMAL(10, 2) NOT NULL DEFAULT 0,
    supplier VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(20) CHECK (type IN ('sale', 'service-order', 'budget')),
  client_name VARCHAR(255),
  client_contact VARCHAR(50),
  client_cpf VARCHAR(20),
  client_zip_code VARCHAR(20),
  client_street VARCHAR(255),
  client_number VARCHAR(20),
  client_neighborhood VARCHAR(100),
  client_city VARCHAR(100),
  client_state VARCHAR(2),
  total DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order Items (for sales/budgets - links products to orders)
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id), -- Nullable if item is custom (not in product DB)
  product_name VARCHAR(255) NOT NULL, -- Store name snapshot
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL -- Store price snapshot
);

-- Production Items (for service orders - raw materials used)
CREATE TABLE IF NOT EXISTS production_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) CHECK (type IN ('raw_material', 'labor')),
  unit VARCHAR(50),
  quantity_used DECIMAL(10, 2),
  cost_per_unit DECIMAL(10, 2),
  notes TEXT
);
