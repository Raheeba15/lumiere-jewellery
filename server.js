require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const compression = require('compression');

const { db, initDb } = require('./backend/database');

const app = express();
const PORT = process.env.PORT || 3000;
const SITE_URL = process.env.SITE_URL || `http://localhost:${PORT}`;

const uploadsDir = path.join(__dirname, 'frontend/public/images/uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Gzip compression for all responses
app.use(compression());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cache static assets aggressively, HTML never cached
app.use(express.static(path.join(__dirname, 'frontend/public'), {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (/\.(css|js|woff2?|ttf|eot)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (/\.(jpe?g|png|gif|webp|svg|ico)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=2592000');
    }
  }
}));

app.use(session({
  secret: 'lumiere-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

app.use((req, res, next) => { res.locals.user = req.session.user || null; next(); });

// robots.txt
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /
Allow: /shop
Allow: /product/
Allow: /blog
Allow: /blog/

Disallow: /admin
Disallow: /cart
Disallow: /checkout
Disallow: /order-success
Disallow: /account
Disallow: /api/

Sitemap: ${SITE_URL}/sitemap.xml`);
});

// Dynamic sitemap.xml
app.get('/sitemap.xml', (req, res) => {
  try {
    const staticUrls = [
      { loc: `${SITE_URL}/`, priority: '1.0', changefreq: 'daily' },
      { loc: `${SITE_URL}/shop`, priority: '0.9', changefreq: 'daily' },
      { loc: `${SITE_URL}/shop?category=bracelets`, priority: '0.7', changefreq: 'weekly' },
      { loc: `${SITE_URL}/shop?category=rings`, priority: '0.7', changefreq: 'weekly' },
      { loc: `${SITE_URL}/shop?category=bangles`, priority: '0.7', changefreq: 'weekly' },
      { loc: `${SITE_URL}/shop?category=necklaces`, priority: '0.7', changefreq: 'weekly' },
      { loc: `${SITE_URL}/blog`, priority: '0.8', changefreq: 'weekly' },
    ];

    let productUrls = [];
    try {
      const rows = db.exec('SELECT id, updated_at FROM products WHERE is_active = 1');
      if (rows[0]) {
        productUrls = rows[0].values.map(([id, updated]) => ({
          loc: `${SITE_URL}/product/${id}`,
          priority: '0.8',
          changefreq: 'weekly',
          lastmod: updated ? new Date(updated).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        }));
      }
    } catch (_) {}

    const today = new Date().toISOString().split('T')[0];
    const allUrls = [...staticUrls, ...productUrls];
    const urlNodes = allUrls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod || today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n');

    res.type('application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlNodes}
</urlset>`);
  } catch (err) {
    res.status(500).send('Sitemap generation error');
  }
});

// Routes (loaded after db init)
function loadRoutes() {
  const authRoutes = require('./backend/routes/auth');
  const productRoutes = require('./backend/routes/products');
  const orderRoutes = require('./backend/routes/orders');
  const adminRoutes = require('./backend/routes/admin');
  const chatbotRoutes = require('./backend/routes/chatbot');
  const seoRoutes = require('./backend/routes/seo');

  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/admin', adminRoutes);
  app.use('/api/chat', chatbotRoutes);
  app.use('/api/seo', seoRoutes);

  const pages = ['/', '/shop', '/cart', '/checkout', '/account', '/product/:id', '/order-success', '/blog', '/blog/:slug'];
  const files = ['index', 'shop', 'cart', 'checkout', 'account', 'product', 'order-success', 'blog', 'blog-post'];
  pages.forEach((p, i) => {
    app.get(p, (req, res) => {
      res.sendFile(path.join(__dirname, `frontend/public/${files[i]}.html`));
    });
  });
}


initDb().then(() => {
  loadRoutes();
  app.listen(PORT, () => {
    console.log(`\n✦ Lumière Store → http://localhost:${PORT}`);
    console.log(`✦ Admin Panel  → http://localhost:${PORT}/admin`);
    console.log(`✦ Admin login  → yamna@gmail.com / 123456\n`);
  });
}).catch(err => { console.error('DB init failed:', err); process.exit(1); });
