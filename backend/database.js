const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '../data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
const dbPath = path.join(dbDir, 'lumiere.db');

let _sqlDb = null;

function saveDb() {
  if (_sqlDb) {
    try { fs.writeFileSync(dbPath, Buffer.from(_sqlDb.export())); } catch(e) {}
  }
}
setInterval(saveDb, 4000);
process.on('exit', saveDb);
process.on('SIGINT', () => { saveDb(); process.exit(0); });

// Sync-style wrapper matching better-sqlite3 API
class DB {
  prepare(sql) {
    const self = this;
    return {
      run(...params) {
        const s = _sqlDb.prepare(sql);
        s.run(params);
        s.free();
        // last_insert_rowid() must be read BEFORE saveDb(): export() resets it to 0 in sql.js
        const r = _sqlDb.exec('SELECT last_insert_rowid() as id');
        const lastInsertRowid = r[0] ? r[0].values[0][0] : null;
        saveDb();
        return { lastInsertRowid };
      },
      get(...params) {
        const s = _sqlDb.prepare(sql); s.bind(params);
        const row = s.step() ? s.getAsObject() : undefined;
        s.free(); return row;
      },
      all(...params) {
        const rows = []; const s = _sqlDb.prepare(sql); s.bind(params);
        while (s.step()) rows.push(s.getAsObject());
        s.free(); return rows;
      }
    };
  }
  exec(sql) { _sqlDb.run(sql); saveDb(); return this; }
  pragma() { return this; }
}

const db = new DB();

async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    _sqlDb = new SQL.Database(fs.readFileSync(dbPath));
  } else {
    _sqlDb = new SQL.Database();
  }

  _sqlDb.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
      role TEXT DEFAULT 'customer', phone TEXT, address TEXT,
      created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL, description TEXT, emoji TEXT DEFAULT '💎'
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
      description TEXT, price REAL NOT NULL, old_price REAL,
      category_id INTEGER, emoji TEXT DEFAULT '💎', material TEXT,
      stone TEXT, sku TEXT UNIQUE, stock INTEGER DEFAULT 10,
      badge TEXT DEFAULT '', featured INTEGER DEFAULT 0, active INTEGER DEFAULT 1,
      image_url TEXT,
      created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER,
      guest_email TEXT, guest_name TEXT, total REAL NOT NULL,
      status TEXT DEFAULT 'pending', shipping_address TEXT NOT NULL,
      phone TEXT, payment_method TEXT DEFAULT 'cod', notes TEXT,
      created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL, quantity INTEGER NOT NULL, price REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS wishlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL, created_at DATETIME DEFAULT (datetime('now'))
    );
  `);
  try {
    const info = _sqlDb.exec('PRAGMA table_info(products)');
    const cols = (info[0]?.values || []).map((row) => row[1]);
    if (cols.length && !cols.includes('image_url')) {
      _sqlDb.run('ALTER TABLE products ADD COLUMN image_url TEXT');
    }
  } catch (e) { /* no products table yet */ }

  _sqlDb.run(`
  INSERT OR IGNORE INTO categories (name, slug, description, emoji)
  VALUES ('Anklets', 'anklets', 'Elegant ankle jewellery', '✨')
`);
  saveDb();
  console.log('✦ Database ready');

  // Ensure hardcoded admin account exists
  try {
    const bcrypt = require('bcryptjs');
    const ADMIN_EMAIL = 'yamna@gmail.com';
    const existing = _sqlDb.exec(`SELECT id, role FROM users WHERE email='${ADMIN_EMAIL}'`);
    if (!existing[0]) {
      const hashed = bcrypt.hashSync('123456', 10);
      _sqlDb.run(`INSERT INTO users (name, email, password, role) VALUES ('Yamna', '${ADMIN_EMAIL}', '${hashed}', 'admin')`);
      saveDb();
    } else {
      const role = existing[0].values[0][1];
      if (role !== 'admin') {
        _sqlDb.run(`UPDATE users SET role='admin' WHERE email='${ADMIN_EMAIL}'`);
        saveDb();
      }
    }
  } catch(e) { /* silently ignore if bcryptjs not available yet */ }
}

module.exports = { db, initDb };
