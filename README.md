# Digital Coupon Marketplace

A full-stack digital coupon marketplace with an admin dashboard, a customer storefront, and a reseller API. Built with Node.js, Express, MongoDB, and vanilla JavaScript — fully containerized with Docker Compose.

---

## Table of Contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Accessing the Application](#accessing-the-application)
- [Default Credentials](#default-credentials)
- [Seeding Sample Data](#seeding-sample-data)
- [API Reference](#api-reference)
  - [Admin Endpoints](#admin-endpoints)
  - [Customer Store Endpoints](#customer-store-endpoints)
  - [Reseller Endpoints](#reseller-endpoints)
- [Business Rules](#business-rules)
- [Error Format](#error-format)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [Stopping the Application](#stopping-the-application)

---

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   API        │────▶│   MongoDB    │
│  (Nginx)     │     │  (Express)   │     │              │
│  Port 8080   │     │  Port 3000   │     │  Port 27018  │
└──────────────┘     └──────────────┘     └──────────────┘
  Static HTML/JS      Node.js 20           Mongo 7
  Proxies /api/*      Mongoose ODM         coupon_marketplace DB
```

| Service    | Container         | Port  | Description                         |
|------------|-------------------|-------|-------------------------------------|
| Frontend   | `coupon_frontend` | 8080  | Nginx serving static HTML/JS/CSS    |
| API        | `coupon_api`      | 3000  | Express REST API                    |
| MongoDB    | `coupon_mongo`    | 27018 | Persistent data store (Mongo 7)     |

Nginx reverse-proxies all `/api/*` requests to the API container, so the frontend can talk to the backend on the same origin.

---

## Prerequisites

- **Docker** (v20+) and **Docker Compose** (v2+)
- That's it — everything else runs inside containers.

Verify installation:

```bash
docker --version
docker compose version
```

---

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/nadavyigal/digital_coupon_marketplace.git
cd digital_coupon_marketplace
```

### 2. Start all services

```bash
docker compose up -d
```

This will:
- Pull the MongoDB 7 and Nginx Alpine images
- Build the Node.js API image
- Start all three containers
- Wait for MongoDB to be healthy before starting the API
- Automatically seed the database with a default admin user and sample coupons on first run

### 3. Verify everything is running

```bash
docker compose ps
```

You should see three containers — `coupon_mongo` (healthy), `coupon_api` (running), and `coupon_frontend` (running).

Quick health check:

```bash
curl http://localhost:3000/api/health
# → {"status":"ok","timestamp":"..."}
```

---

## Accessing the Application

| Page             | URL                              | Description                        |
|------------------|----------------------------------|------------------------------------|
| Home             | http://localhost:8080/            | Landing page                       |
| Admin Dashboard  | http://localhost:8080/admin.html  | Login, create/manage coupons       |
| Customer Store   | http://localhost:8080/customer.html | Browse and purchase coupons      |
| API (direct)     | http://localhost:3000/api/health  | API health check                   |


---

## Default Credentials

### Admin Login

| Field    | Value      |
|----------|------------|
| Username | `admin`    |
| Password | `admin123` |

> **Note**: Change these in `api/.env` for production deployments.

---

## Seeding Sample Data

On first startup, the API automatically seeds:
- **1 admin user** (`admin` / `admin123`)
- **3 sample coupons** (Amazon $50, Netflix 1-Month, Spotify 3-Month)

To re-seed manually (e.g., after wiping the database):

```bash
docker exec coupon_api npm run seed
```

---

## API Reference

### Admin Endpoints

All admin endpoints (except login) require a JWT token in the `Authorization: Bearer <token>` header.

#### Login

```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
# → {"token":"eyJhbG..."}
```

#### Create Coupon

```bash
curl -X POST http://localhost:3000/api/admin/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Steam $25 Card",
    "description": "Steam wallet code",
    "image_url": "https://example.com/steam.png",
    "cost_price": 20,
    "margin_percentage": 25,
    "value_type": "STRING",
    "value": "STEAM-25-WXYZ-9999"
  }'
# → 201: minimum_sell_price auto-computed as 25.00
```

#### List Products (paginated, filterable)

```bash
curl "http://localhost:3000/api/admin/products?page=1&limit=20&is_sold=false&is_deleted=false" \
  -H "Authorization: Bearer $TOKEN"
```

#### Get / Update / Delete Product

```bash
# Get
curl http://localhost:3000/api/admin/products/$ID -H "Authorization: Bearer $TOKEN"

# Update (recalculates minimum_sell_price if cost/margin change)
curl -X PUT http://localhost:3000/api/admin/products/$ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"cost_price": 30, "margin_percentage": 20}'

# Soft-delete
curl -X DELETE http://localhost:3000/api/admin/products/$ID \
  -H "Authorization: Bearer $TOKEN"
```

#### Reseller Management

```bash
# Create reseller (returns one-time API token)
curl -X POST http://localhost:3000/api/admin/resellers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"My Reseller Inc."}'
# → {"id":"...","token":"save-this-token","message":"Save this token — it will not be shown again"}

# List resellers
curl http://localhost:3000/api/admin/resellers -H "Authorization: Bearer $TOKEN"
```

---

### Customer Store Endpoints

No authentication required.

```bash
# List available (unsold) coupons
curl http://localhost:3000/api/store/products

# Get product details
curl http://localhost:3000/api/store/products/$ID

# Purchase coupon (reveals the coupon value)
curl -X POST http://localhost:3000/api/store/products/$ID/purchase
# → {"product_id":"...","final_price":15.60,"value_type":"STRING","value":"NFLX-1MO-EFGH-5678"}
```

---

### Reseller Endpoints

Requires a reseller bearer token in the `Authorization: Bearer <token>` header.

```bash
# List available products
curl http://localhost:3000/api/v1/products \
  -H "Authorization: Bearer $RESELLER_TOKEN"

# Get product by ID
curl http://localhost:3000/api/v1/products/$ID \
  -H "Authorization: Bearer $RESELLER_TOKEN"

# Purchase (reseller sets their own price, must be >= minimum_sell_price)
curl -X POST http://localhost:3000/api/v1/products/$ID/purchase \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $RESELLER_TOKEN" \
  -d '{"reseller_price": 35}'
```

---

## Business Rules

| Rule | Description |
|------|-------------|
| **Server-computed pricing** | `minimum_sell_price = cost_price × (1 + margin_percentage / 100)` — always computed server-side, never accepted from client input |
| **Direct customer pricing** | Customers pay `minimum_sell_price` (fixed, non-negotiable) |
| **Reseller pricing** | Resellers submit `reseller_price` which must be ≥ `minimum_sell_price` |
| **Coupon value hidden** | The actual coupon value is only revealed after purchase |
| **Atomic sell** | `findOneAndUpdate({ is_sold: false })` prevents double-sell race conditions |
| **Sold = immutable** | Sold coupons cannot be updated (409) or deleted (409) |
| **Field protection** | `minimum_sell_price` and `is_sold` are rejected if submitted in create/update requests |
| **Soft-delete** | Deleted coupons are hidden from store/reseller queries but retained in the database |

---

## Error Format

All API errors return a consistent JSON structure:

```json
{
  "error_code": "ERROR_NAME",
  "message": "Human-readable description"
}
```

| Code                     | HTTP | When                                       |
|--------------------------|------|--------------------------------------------|
| `UNAUTHORIZED`           | 401  | Missing / invalid token                    |
| `PRODUCT_NOT_FOUND`      | 404  | Product doesn't exist or is deleted        |
| `PRODUCT_ALREADY_SOLD`   | 409  | Purchase / delete / update a sold coupon   |
| `RESELLER_PRICE_TOO_LOW` | 400  | `reseller_price` < `minimum_sell_price`    |
| `VALIDATION_ERROR`       | 422  | Invalid input fields                       |
| `INVALID_ID`             | 422  | Malformed UUID                             |
| `INTERNAL_ERROR`         | 500  | Unexpected server error                    |

---

## Project Structure

```
digital_coupon_marketplace/
├── docker-compose.yml          # Orchestrates all 3 services
├── README.md
├── api/
│   ├── Dockerfile              # Node.js 20 Alpine image
│   ├── .env                    # Environment variables
│   ├── package.json
│   ├── server.js               # Express app entry point
│   ├── config/
│   │   └── db.js               # MongoDB connection
│   ├── middleware/
│   │   ├── adminAuth.js        # JWT verification
│   │   ├── resellerAuth.js     # Bearer token → SHA256 lookup
│   │   ├── validators.js       # express-validator chains
│   │   ├── validate.js         # Validation result checker
│   │   └── errorHandler.js     # AppError class + global handler
│   ├── models/
│   │   ├── Product.js          # Base schema (discriminator pattern)
│   │   ├── Coupon.js           # Extends Product, pre-validate pricing hook
│   │   ├── Admin.js            # bcrypt pre-save hook
│   │   ├── Reseller.js
│   │   └── Order.js
│   ├── services/
│   │   └── pricing.js          # Pricing engine
│   ├── routes/
│   │   ├── admin.js            # Admin login + CRUD + reseller mgmt
│   │   ├── store.js            # Customer browsing + purchase
│   │   └── reseller.js         # Reseller API
│   └── scripts/
│       └── seed.js             # Default admin + sample coupons
└── frontend/
    ├── nginx.conf              # Reverse proxy config
    ├── index.html              # Landing page
    ├── admin.html              # Admin dashboard
    ├── admin.js                # Admin frontend logic
    ├── customer.html           # Customer storefront
    ├── customer.js             # Customer frontend logic
    └── style.css               # Shared styles
```

---

## Environment Variables

Located in `api/.env`:

| Variable                 | Default                                          | Description                    |
|--------------------------|--------------------------------------------------|--------------------------------|
| `NODE_ENV`               | `development`                                    | Environment mode               |
| `PORT`                   | `3000`                                           | API server port                |
| `MONGO_URI`              | `mongodb://mongo:27017/coupon_marketplace`       | MongoDB connection string      |
| `JWT_SECRET`             | `super-secret-jwt-key-change-in-production`      | JWT signing secret             |
| `JWT_EXPIRES_IN`         | `30m`                                            | Token expiration time          |
| `ADMIN_DEFAULT_USERNAME` | `admin`                                          | Default admin username (seed)  |
| `ADMIN_DEFAULT_PASSWORD` | `admin123`                                       | Default admin password (seed)  |

> **Important**: Change `JWT_SECRET`, `ADMIN_DEFAULT_USERNAME`, and `ADMIN_DEFAULT_PASSWORD` before deploying to production.

---

## Development

### View API logs

```bash
docker compose logs -f api
```

### Access MongoDB shell

```bash
docker exec -it coupon_mongo mongosh coupon_marketplace
```

Useful queries:

```javascript
db.products.find().pretty()          // All products
db.products.countDocuments()         // Count
db.orders.find().pretty()           // All orders
db.admins.find().pretty()           // Admin users
db.resellers.find().pretty()        // Resellers
```

### Rebuild after code changes

The API container mounts the local `./api` directory, so most code changes are reflected immediately (Node.js restarts). If you change dependencies or the Dockerfile:

```bash
docker compose up -d --build
```

---

## Stopping the Application

```bash
# Stop all containers
docker compose down

# Stop and remove all data (including database)
docker compose down -v
```
