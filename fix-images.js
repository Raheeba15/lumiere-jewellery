const { db, initDb } = require('./backend/database');

// These use the Unsplash direct photo format which works in browsers
const images = [
  { sku: 'BR-001', url: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80&auto=format&fit=crop' },
  { sku: 'BR-002', url: 'https://images.unsplash.com/photo-1573408301185-9519bf4e6b4d?w=800&q=80&auto=format&fit=crop' },
  { sku: 'BR-003', url: 'https://images.unsplash.com/photo-1602751584552-8dba73a91a59?w=800&q=80&auto=format&fit=crop' },
  { sku: 'BR-004', url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80&auto=format&fit=crop' },
  { sku: 'BR-005', url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80&auto=format&fit=crop' },
  { sku: 'BR-006', url: 'https://images.unsplash.com/photo-1617038260897-41a88a6b7843?w=800&q=80&auto=format&fit=crop' },
  { sku: 'RG-001', url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80&auto=format&fit=crop' },
  { sku: 'RG-002', url: 'https://images.unsplash.com/photo-1515562141207-7a88e7f3386d?w=800&q=80&auto=format&fit=crop' },
  { sku: 'RG-003', url: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&q=80&auto=format&fit=crop' },
  { sku: 'RG-004', url: 'https://images.unsplash.com/photo-1589128777073-263566ae5e4d?w=800&q=80&auto=format&fit=crop' },
  { sku: 'RG-005', url: 'https://images.unsplash.com/photo-1585236905878-8c97fce79547?w=800&q=80&auto=format&fit=crop' },
  { sku: 'RG-006', url: 'https://images.unsplash.com/photo-1619119069152-a2b331eb392a?w=800&q=80&auto=format&fit=crop' },
  { sku: 'BG-001', url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80&auto=format&fit=crop' },
  { sku: 'BG-002', url: 'https://images.unsplash.com/photo-1561828995-aa79a2db86dd?w=800&q=80&auto=format&fit=crop' },
  { sku: 'BG-003', url: 'https://images.unsplash.com/photo-1573408301185-9519bf4e6b4d?w=800&q=80&auto=format&fit=crop' },
  { sku: 'BG-004', url: 'https://images.unsplash.com/photo-1568944177239-38c15af9c04f?w=800&q=80&auto=format&fit=crop' },
  { sku: 'BG-005', url: 'https://images.unsplash.com/photo-1576022162208-86acb0b4d6be?w=800&q=80&auto=format&fit=crop' },
  { sku: 'NK-001', url: 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80&auto=format&fit=crop' },
  { sku: 'NK-002', url: 'https://images.unsplash.com/photo-1608042314453-ae338d80c427?w=800&q=80&auto=format&fit=crop' },
  { sku: 'NK-003', url: 'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=800&q=80&auto=format&fit=crop' },
  { sku: 'NK-004', url: 'https://images.unsplash.com/photo-1569397288884-4d43d6738fbd?w=800&q=80&auto=format&fit=crop' },
  { sku: 'NK-005', url: 'https://images.unsplash.com/photo-1631513203753-b0d40e7be0de?w=800&q=80&auto=format&fit=crop' },
];

initDb().then(() => {
  images.forEach(({ sku, url }) => {
    db.prepare('UPDATE products SET image_url=? WHERE sku=?').run(url, sku);
    const row = db.prepare('SELECT image_url FROM products WHERE sku=?').get(sku);
    console.log(`✓ ${sku}: ${row?.image_url ? 'SAVED' : 'FAILED'}`);
  });
  console.log('\n✦ All images updated! Visit http://localhost:3000/debug-images.html to verify');
  process.exit(0);
});
