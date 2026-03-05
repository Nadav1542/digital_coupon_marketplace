# Digital Coupon Marketplace

A full-stack digital coupon marketplace — fully containerized with Docker Compose.

---

## Prerequisites

- **Docker** (v20+) and **Docker Compose** (v2+)

Verify installation:

```bash
docker --version
docker compose version
```

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Nadav1542/digital_coupon_marketplace.git
cd digital_coupon_marketplace
```

### 2. Configure environment variables

Copy the example env file and adjust values if needed:

```bash
cp api/.env.example api/.env
```

### 3. Start all services

```bash
docker compose up -d
```

This will:
- Pull the MongoDB 7 and Nginx Alpine images
- Build the Node.js API image
- Start all three containers (MongoDB, API, Frontend)
- Wait for MongoDB to be healthy before starting the API
- Automatically seed the database with a default admin user and sample coupons on first run

### 4. Verify everything is running

```bash
docker compose ps
```

You should see three containers — `coupon_mongo` (healthy), `coupon_api` (running), and `coupon_frontend` (running).

---

## Accessing the Application

| Page             | URL                                |
|------------------|------------------------------------|
| Home             | http://localhost:8080/              |
| Admin Dashboard  | http://localhost:8080/admin.html    |
| Customer Store   | http://localhost:8080/customer.html |

### Default Admin Credentials

| Field    | Value      |
|----------|------------|
| Username | `admin`    |
| Password | `admin123` |

---

## Stopping the Application

```bash
# Stop all containers
docker compose down

# Stop and remove all data (including database)
docker compose down -v
```

---

## Rebuilding After Code Changes

```bash
docker compose up -d --build
```
