# ✦ Lumière Fine Jewellery — Full-Stack E-Commerce

A complete jewellery e-commerce store built with Node.js, Express, and SQLite.

## 🗂 Project Structure

```
lumiere-jewellery/
├── server.js                  ← Main entry point
├── package.json
├── backend/
│   ├── database.js            ← SQLite setup & schema
│   ├── seed.js                ← Seed products & users
│   ├── middleware/
│   │   └── auth.js            ← Auth middleware
│   └── routes/
│       ├── auth.js            ← Login, register, profile
│       ├── products.js        ← Product listing & wishlist
│       ├── orders.js          ← Place & view orders
│       └── admin.js           ← Admin panel APIs
├── frontend/public/
│   ├── index.html             ← Homepage
│   ├── shop.html              ← Shop with filters
│   ├── product.html           ← Product detail page
│   ├── cart.html              ← Cart page
│   ├── checkout.html          ← Checkout with COD
│   ├── order-success.html     ← Order confirmation
│   ├── account.html           ← Login / Register / Profile
│   ├── admin.html             ← Admin dashboard
│   ├── admin-login.html       ← Admin login
│   ├── css/style.css          ← Shared styles
│   └── js/app.js              ← Shared JS (Cart, Auth, API)
└── data/
    └── lumiere.db             ← SQLite database (auto-created)
```

---

## 🚀 Quick Setup (5 Minutes)

### Step 1 — Install Node.js
Download from https://nodejs.org (choose "LTS" version)
Verify: `node --version` should show v18 or above

### Step 2 — Install dependencies
```bash
cd lumiere-jewellery
npm install
```

### Step 3 — Seed the database
```bash
npm run seed
```
This creates the database and loads all 22 products + admin user.

### Step 4 — Start the server
```bash
npm start
```

### Step 5 — Open in browser
- **Store:** http://localhost:3000
- **Admin:** http://localhost:3000/admin

---

## 🔑 Login Credentials

| Role     | Email                  | Password  |
|----------|------------------------|-----------|
| Admin    | admin@lumiere.com      | admin123  |
| Customer | fatima@example.com     | demo123   |

---

## ✦ Features

### Customer Facing
- 🏠 **Homepage** — Hero, featured products, categories, newsletter
- 🛍 **Shop Page** — Filter by category, sort, search, price range
- 💎 **Product Pages** — Full details, add to cart, wishlist, related items
- 🛒 **Cart** — Add/remove/update quantities, shipping calculator
- 📦 **Checkout** — COD, Bank Transfer, EasyPaisa payment options
- ✅ **Order Success** — Full order confirmation with items
- 👤 **Account** — Register, login, order history, wishlist, profile editor

### Admin Panel (`/admin`)
- 📊 **Dashboard** — Revenue, orders, customers, low stock alerts
- 💎 **Products** — Add / Edit / Delete products, manage stock & visibility
- 📦 **Orders** — View all orders, update status (pending → shipped → delivered)
- 👥 **Customers** — Customer list with order count & total spend

---

## 🛠 Development Mode (auto-reload on save)
```bash
npm run dev
```
Requires nodemon (installed automatically via devDependencies).

---

## 📁 Database
SQLite database is stored at `data/lumiere.db`.
To reset everything: delete that file, then run `npm run seed` again.

---

## 🌐 Deploying to the Internet
To make your store accessible online, you can use:
- **Railway** (free tier): https://railway.app
- **Render** (free tier): https://render.com
- **VPS** (DigitalOcean, Vultr): Upload files, run `npm start`

For production, change the session secret in `server.js`:
```js
secret: 'your-very-long-random-secret-here'
```

---

## ➕ Adding More Products
Either:
1. Use the Admin Panel at `/admin` → Products → Add Product
2. Edit `backend/seed.js` and add to the products array, then re-run `npm run seed`

---

Built with ❤️ in Lahore · Lumière Fine Jewellery 2025
