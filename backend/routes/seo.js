const express = require('express');
const router = express.Router();
const { db } = require('../database');

// ─── Helper to run db.exec safely ───
function query(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  } catch (e) {
    return [];
  }
}

function run(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    stmt.run(params);
    stmt.free();
    return true;
  } catch (e) {
    return false;
  }
}

// Ensure SEO tables exist
function ensureTables() {
  db.run(`CREATE TABLE IF NOT EXISTS seo_competitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    keywords TEXT,
    notes TEXT,
    da_score INTEGER DEFAULT 0,
    monthly_traffic TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS seo_backlinks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_url TEXT NOT NULL,
    source_domain TEXT,
    target_url TEXT NOT NULL,
    anchor_text TEXT,
    link_type TEXT DEFAULT 'dofollow',
    da_score INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    notes TEXT,
    discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS seo_keywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL,
    volume INTEGER DEFAULT 0,
    difficulty INTEGER DEFAULT 0,
    our_position INTEGER,
    target_url TEXT,
    competitor TEXT,
    cpc REAL DEFAULT 0,
    category TEXT DEFAULT 'organic',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS blog_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    excerpt TEXT,
    content TEXT,
    meta_title TEXT,
    meta_description TEXT,
    focus_keyword TEXT,
    author TEXT DEFAULT 'Lumière Team',
    published INTEGER DEFAULT 1,
    featured_image TEXT,
    read_time INTEGER DEFAULT 5,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
}

try { ensureTables(); } catch (_) {}

// Seed sample data on first run
function seedIfEmpty() {
  const comp = query('SELECT COUNT(*) as c FROM seo_competitors');
  if (comp[0] && comp[0].c === 0) {
    [
      ['Khazana Jewels', 'khazanajewels.com', 'gold jewellery pakistan,silver rings lahore', 'Local competitor in Lahore', 45, '12K/mo'],
      ['Johari Bazaar', 'joharibazaar.pk', 'bangles online pakistan,necklaces lahore', 'Online first brand', 38, '8K/mo'],
      ['Regalia Jewels', 'regaliajewels.com', 'fine jewellery pakistan,luxury rings', 'Premium segment', 55, '25K/mo'],
    ].forEach(([name, domain, keywords, notes, da, traffic]) => {
      run('INSERT INTO seo_competitors (name,domain,keywords,notes,da_score,monthly_traffic) VALUES (?,?,?,?,?,?)',
        [name, domain, keywords, notes, da, traffic]);
    });
  }

  const kw = query('SELECT COUNT(*) as c FROM seo_keywords');
  if (kw[0] && kw[0].c === 0) {
    [
      ['fine jewellery pakistan', 2400, 62, 8, '/', 'Regalia Jewels', 1.20, 'organic'],
      ['gold bangles lahore', 1900, 45, 5, '/shop?category=bangles', 'Khazana Jewels', 0.85, 'organic'],
      ['925 sterling silver rings', 3200, 55, 12, '/shop?category=rings', 'Johari Bazaar', 1.45, 'organic'],
      ['handcrafted necklaces pakistan', 880, 38, 3, '/shop?category=necklaces', null, 0.60, 'organic'],
      ['luxury jewellery gift box', 1100, 42, 7, '/', null, 0.95, 'organic'],
      ['buy bracelets online lahore', 1650, 50, 6, '/shop?category=bracelets', 'Khazana Jewels', 0.78, 'sem'],
      ['gold jewellery sale pakistan', 4100, 70, 15, '/shop', 'Regalia Jewels', 1.80, 'sem'],
    ].forEach(([kword, vol, diff, pos, url, comp, cpc, cat]) => {
      run('INSERT INTO seo_keywords (keyword,volume,difficulty,our_position,target_url,competitor,cpc,category) VALUES (?,?,?,?,?,?,?,?)',
        [kword, vol, diff, pos, url, comp, cpc, cat]);
    });
  }

  const bl = query('SELECT COUNT(*) as c FROM seo_backlinks');
  if (bl[0] && bl[0].c === 0) {
    [
      ['https://fashionpk.com/jewellery-guide', 'fashionpk.com', 'https://lumierejewellery.pk/', 'fine jewellery Pakistan', 'dofollow', 42, 'active'],
      ['https://weddingwire.pk/vendors/jewellery', 'weddingwire.pk', 'https://lumierejewellery.pk/shop', 'wedding jewellery', 'dofollow', 58, 'active'],
      ['https://blog.styleistan.com/top-jewellers', 'styleistan.com', 'https://lumierejewellery.pk/', 'Lumière', 'nofollow', 35, 'active'],
      ['https://arynews.tv/sponsored/jewellery', 'arynews.tv', 'https://lumierejewellery.pk/', 'luxury jewellery', 'dofollow', 72, 'active'],
    ].forEach(([src, dom, tgt, anchor, type, da, status]) => {
      run('INSERT INTO seo_backlinks (source_url,source_domain,target_url,anchor_text,link_type,da_score,status) VALUES (?,?,?,?,?,?,?)',
        [src, dom, tgt, anchor, type, da, status]);
    });
  }
}

try { seedIfEmpty(); } catch (_) {}

// ── COMPETITORS ──
router.get('/competitors', (req, res) => {
  res.json(query('SELECT * FROM seo_competitors ORDER BY da_score DESC'));
});
router.post('/competitors', (req, res) => {
  const { name, domain, keywords, notes, da_score, monthly_traffic } = req.body;
  if (!name || !domain) return res.status(400).json({ error: 'name and domain required' });
  run('INSERT INTO seo_competitors (name,domain,keywords,notes,da_score,monthly_traffic) VALUES (?,?,?,?,?,?)',
    [name, domain, keywords || '', notes || '', da_score || 0, monthly_traffic || '']);
  res.json({ ok: true });
});
router.delete('/competitors/:id', (req, res) => {
  run('DELETE FROM seo_competitors WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ── BACKLINKS ──
router.get('/backlinks', (req, res) => {
  res.json(query('SELECT * FROM seo_backlinks ORDER BY da_score DESC'));
});
router.post('/backlinks', (req, res) => {
  const { source_url, source_domain, target_url, anchor_text, link_type, da_score, notes } = req.body;
  if (!source_url || !target_url) return res.status(400).json({ error: 'source_url and target_url required' });
  const domain = source_domain || (source_url.match(/https?:\/\/([^/]+)/)||[])[1] || '';
  run('INSERT INTO seo_backlinks (source_url,source_domain,target_url,anchor_text,link_type,da_score,status,notes) VALUES (?,?,?,?,?,?,?,?)',
    [source_url, domain, target_url, anchor_text || '', link_type || 'dofollow', da_score || 0, 'active', notes || '']);
  res.json({ ok: true });
});
router.put('/backlinks/:id/status', (req, res) => {
  run('UPDATE seo_backlinks SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
  res.json({ ok: true });
});
router.delete('/backlinks/:id', (req, res) => {
  run('DELETE FROM seo_backlinks WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ── KEYWORDS ──
router.get('/keywords', (req, res) => {
  res.json(query('SELECT * FROM seo_keywords ORDER BY volume DESC'));
});
router.post('/keywords', (req, res) => {
  const { keyword, volume, difficulty, our_position, target_url, competitor, cpc, category } = req.body;
  if (!keyword) return res.status(400).json({ error: 'keyword required' });
  run('INSERT INTO seo_keywords (keyword,volume,difficulty,our_position,target_url,competitor,cpc,category) VALUES (?,?,?,?,?,?,?,?)',
    [keyword, volume || 0, difficulty || 0, our_position || null, target_url || '', competitor || '', cpc || 0, category || 'organic']);
  res.json({ ok: true });
});
router.delete('/keywords/:id', (req, res) => {
  run('DELETE FROM seo_keywords WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ── BLOG POSTS ──
router.get('/blog', (req, res) => {
  res.json(query('SELECT id,slug,title,excerpt,meta_title,meta_description,focus_keyword,author,published,read_time,created_at FROM blog_posts ORDER BY created_at DESC'));
});
router.get('/blog/:slug', (req, res) => {
  const rows = query('SELECT * FROM blog_posts WHERE slug = ? AND published = 1', [req.params.slug]);
  if (!rows[0]) return res.status(404).json({ error: 'Post not found' });
  res.json(rows[0]);
});
router.post('/blog', (req, res) => {
  const { slug, title, excerpt, content, meta_title, meta_description, focus_keyword, author, published, read_time } = req.body;
  if (!slug || !title) return res.status(400).json({ error: 'slug and title required' });
  run('INSERT INTO blog_posts (slug,title,excerpt,content,meta_title,meta_description,focus_keyword,author,published,read_time) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [slug, title, excerpt || '', content || '', meta_title || title, meta_description || excerpt || '', focus_keyword || '', author || 'Lumière Team', published !== false ? 1 : 0, read_time || 5]);
  res.json({ ok: true });
});
router.put('/blog/:id', (req, res) => {
  const { title, excerpt, content, meta_title, meta_description, focus_keyword, published } = req.body;
  run('UPDATE blog_posts SET title=?,excerpt=?,content=?,meta_title=?,meta_description=?,focus_keyword=?,published=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',
    [title, excerpt, content, meta_title, meta_description, focus_keyword, published ? 1 : 0, req.params.id]);
  res.json({ ok: true });
});
router.delete('/blog/:id', (req, res) => {
  run('DELETE FROM blog_posts WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ── SEO SUMMARY (for dashboard widget) ──
router.get('/summary', (req, res) => {
  const competitors = query('SELECT COUNT(*) as c FROM seo_competitors')[0]?.c || 0;
  const backlinks = query('SELECT COUNT(*) as c FROM seo_backlinks WHERE status = "active"')[0]?.c || 0;
  const keywords = query('SELECT COUNT(*) as c FROM seo_keywords')[0]?.c || 0;
  const avgPos = query('SELECT AVG(our_position) as avg FROM seo_keywords WHERE our_position IS NOT NULL')[0]?.avg;
  const blogPosts = query('SELECT COUNT(*) as c FROM blog_posts WHERE published = 1')[0]?.c || 0;
  const topKw = query('SELECT keyword, our_position FROM seo_keywords WHERE our_position IS NOT NULL ORDER BY our_position ASC LIMIT 3');
  res.json({ competitors, backlinks, keywords, avgPosition: avgPos ? Math.round(avgPos) : null, blogPosts, topKeywords: topKw });
});

module.exports = router;
