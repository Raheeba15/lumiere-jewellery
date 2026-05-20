const { db, initDb } = require('./database');
const bcrypt = require('bcryptjs');

async function seed() {
  await initDb();
  console.log('🌱 Seeding Lumière database...');

  const cats = [
    { name: 'Bracelet', slug: 'bracelets', description: 'Elegant wrist adornments', emoji: '💜' },
    { name: 'Ring',     slug: 'rings',     description: 'Timeless finger jewellery', emoji: '💍' },
    { name: 'Bangle',   slug: 'bangles',   description: 'Traditional & modern bangles', emoji: '🟡' },
    { name: 'Necklace', slug: 'necklaces', description: 'Statement neck pieces', emoji: '✨' },
  ];
  cats.forEach(c => {
    try { db.prepare('INSERT INTO categories (name,slug,description,emoji) VALUES (?,?,?,?)').run(c.name,c.slug,c.description,c.emoji); } catch(e) {}
  });
  console.log('✓ Categories seeded');

  const getCat = (n) => db.prepare('SELECT id FROM categories WHERE name=?').get(n);

  // One real jewellery photo per product, indexed to match products array
  const stockPhotos = [
    // BR-001 Celestial Charm Bracelet
    'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80&auto=format&fit=crop',
    // BR-002 Rose Gold Wrap Bracelet
    'https://images.unsplash.com/photo-1602751584552-8dba73a91a59?w=800&q=80&auto=format&fit=crop',
    // BR-003 Sapphire Stacking Bracelet
    'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80&auto=format&fit=crop',
    // BR-004 Pearl Tennis Bracelet
    'https://images.unsplash.com/photo-1630937429261-8e2b4ec11cf3?w=800&q=80&auto=format&fit=crop',
    // BR-005 Boho Charm Bracelet
    'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80&auto=format&fit=crop',
    // BR-006 Diamond Infinity Bracelet
    'https://images.unsplash.com/photo-1617038260897-41a88a6b7843?w=800&q=80&auto=format&fit=crop',
    // RG-001 Solitaire Diamond Ring
    'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80&auto=format&fit=crop',
    // RG-002 Emerald Halo Ring
    'https://images.unsplash.com/photo-1515562141207-7a88e7f3386d?w=800&q=80&auto=format&fit=crop',
    // RG-003 Moonstone Band Ring
    'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&q=80&auto=format&fit=crop',
    // RG-004 Ruby Cluster Ring
    'https://images.unsplash.com/photo-1589128777073-263566ae5e4d?w=800&q=80&auto=format&fit=crop',
    // RG-005 Twisted Gold Band
    'https://images.unsplash.com/photo-1585236905878-8c97fce79547?w=800&q=80&auto=format&fit=crop',
    // RG-006 Aquamarine Statement Ring
    'https://images.unsplash.com/photo-1619119069152-a2b331eb392a?w=800&q=80&auto=format&fit=crop',
    // BG-001 Kundan Gold Bangle
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80&auto=format&fit=crop',
    // BG-002 Filigree Silver Bangle
    'https://images.unsplash.com/photo-1561828995-aa79a2db86dd?w=800&q=80&auto=format&fit=crop',
    // BG-003 Antique Meenakari Bangle
    'https://images.unsplash.com/photo-1573408301185-9519bf4e6b4d?w=800&q=80&auto=format&fit=crop',
    // BG-004 Diamond Cut Bangle
    'https://images.unsplash.com/photo-1568944177239-38c15af9c04f?w=800&q=80&auto=format&fit=crop',
    // BG-005 Oxidised Tribal Bangle
    'https://images.unsplash.com/photo-1576022162208-86acb0b4d6be?w=800&q=80&auto=format&fit=crop',
    // NK-001 Layered Pearl Necklace
    'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80&auto=format&fit=crop',
    // NK-002 Amethyst Pendant Necklace
    'https://images.unsplash.com/photo-1608042314453-ae338d80c427?w=800&q=80&auto=format&fit=crop',
    // NK-003 Gold Choker Necklace
    'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=800&q=80&auto=format&fit=crop',
    // NK-004 Evil Eye Diamond Necklace
    'https://images.unsplash.com/photo-1569397288884-4d43d6738fbd?w=800&q=80&auto=format&fit=crop',
    // NK-005 Vintage Locket Necklace
    'https://images.unsplash.com/photo-1631513203753-b0d40e7be0de?w=800&q=80&auto=format&fit=crop',
  ];

  const products = [
    { name:'Celestial Charm Bracelet',  desc:'Delicately linked silver charms with sparkling cubic zirconia stones.',  price:3800,  op:null,  cat:'Bracelet', emoji:'🌟', mat:'925 Sterling Silver',    stone:'Cubic Zirconia',  sku:'BR-001', badge:'New',        feat:1 },
    { name:'Rose Gold Wrap Bracelet',   desc:'Elegant wrap bracelet in warm rose gold with adjustable clasp.',         price:5200,  op:6500,  cat:'Bracelet', emoji:'🌸', mat:'18K Rose Gold Plated',   stone:'None',            sku:'BR-002', badge:'Sale',       feat:1 },
    { name:'Sapphire Stacking Bracelet',desc:'Gorgeous sapphire-set bracelet, perfect for stacking.',                  price:4900,  op:null,  cat:'Bracelet', emoji:'💎', mat:'Sterling Silver',        stone:'Blue Sapphire',   sku:'BR-003', badge:'',           feat:0 },
    { name:'Pearl Tennis Bracelet',     desc:'Luxurious freshwater pearls in a classic tennis style.',                 price:7800,  op:null,  cat:'Bracelet', emoji:'🤍', mat:'14K White Gold',         stone:'Freshwater Pearl',sku:'BR-004', badge:'',           feat:1 },
    { name:'Boho Charm Bracelet',       desc:'Free-spirited charm bracelet with turquoise and silver accents.',        price:2200,  op:null,  cat:'Bracelet', emoji:'🌿', mat:'Silver Plated',          stone:'Turquoise',       sku:'BR-005', badge:'New',        feat:0 },
    { name:'Diamond Infinity Bracelet', desc:'Infinity motif set with brilliant cut diamonds in solid gold.',          price:12500, op:null,  cat:'Bracelet', emoji:'♾️', mat:'18K Gold',               stone:'Diamond',         sku:'BR-006', badge:'',           feat:1 },
    { name:'Solitaire Diamond Ring',    desc:'Classic brilliant-cut diamond in a timeless prong setting.',             price:15000, op:null,  cat:'Ring',     emoji:'💍', mat:'18K White Gold',         stone:'Diamond Solitaire',sku:'RG-001',badge:'Bestseller', feat:1 },
    { name:'Emerald Halo Ring',         desc:'Vibrant emerald surrounded by a dazzling halo of pavé diamonds.',        price:9800,  op:null,  cat:'Ring',     emoji:'💚', mat:'18K Yellow Gold',        stone:'Emerald & Diamond',sku:'RG-002',badge:'',          feat:1 },
    { name:'Moonstone Band Ring',       desc:'Ethereal moonstone in a delicate silver band.',                          price:3400,  op:null,  cat:'Ring',     emoji:'🌙', mat:'925 Sterling Silver',    stone:'Moonstone',       sku:'RG-003', badge:'New',        feat:0 },
    { name:'Ruby Cluster Ring',         desc:'Deep red rubies in a bold dramatic setting with white zircon.',          price:7600,  op:9000,  cat:'Ring',     emoji:'❤️', mat:'Gold Vermeil',           stone:'Ruby & Zircon',   sku:'RG-004', badge:'Sale',       feat:0 },
    { name:'Twisted Gold Band',         desc:'Minimalist twisted gold band with handcrafted texture.',                 price:4100,  op:null,  cat:'Ring',     emoji:'🔄', mat:'22K Gold',               stone:'None',            sku:'RG-005', badge:'',           feat:0 },
    { name:'Aquamarine Statement Ring', desc:'Oversized aquamarine stone in a bold silver setting.',                   price:6200,  op:null,  cat:'Ring',     emoji:'🌊', mat:'Sterling Silver',        stone:'Aquamarine',      sku:'RG-006', badge:'New',        feat:1 },
    { name:'Kundan Gold Bangle',        desc:'Exquisitely crafted Kundan bangle with intricate gold work.',            price:8900,  op:null,  cat:'Bangle',   emoji:'🟡', mat:'22K Gold',               stone:'Kundan',          sku:'BG-001', badge:'Bestseller', feat:1 },
    { name:'Filigree Silver Bangle',    desc:'Lacy filigree work in sterling silver, beautiful when stacked.',         price:4500,  op:null,  cat:'Bangle',   emoji:'🔆', mat:'925 Sterling Silver',    stone:'None',            sku:'BG-002', badge:'',           feat:0 },
    { name:'Antique Meenakari Bangle',  desc:'Vibrant meenakari enamel on antique gold.',                              price:6700,  op:null,  cat:'Bangle',   emoji:'🦚', mat:'Antique Gold Plated',    stone:'Meenakari Enamel',sku:'BG-003', badge:'New',        feat:1 },
    { name:'Diamond Cut Bangle',        desc:'Diamond-cut facets scatter light brilliantly in solid gold.',            price:11000, op:13500, cat:'Bangle',   emoji:'✴️', mat:'18K Gold',               stone:'Diamond Cut',     sku:'BG-004', badge:'Sale',       feat:0 },
    { name:'Oxidised Tribal Bangle',    desc:'Bold tribal patterns in dark oxidised silver with coral accents.',       price:1800,  op:null,  cat:'Bangle',   emoji:'🖤', mat:'Oxidised Silver',        stone:'Coral',           sku:'BG-005', badge:'',           feat:0 },
    { name:'Layered Pearl Necklace',    desc:'Three tiers of lustrous freshwater pearls on fine gold chains.',         price:6400,  op:null,  cat:'Necklace', emoji:'🦢', mat:'14K Gold',               stone:'Freshwater Pearl',sku:'NK-001', badge:'New',        feat:1 },
    { name:'Amethyst Pendant Necklace', desc:'Deep purple amethyst pendant on a dainty silver chain.',                 price:4200,  op:null,  cat:'Necklace', emoji:'💜', mat:'925 Sterling Silver',    stone:'Amethyst',        sku:'NK-002', badge:'',           feat:0 },
    { name:'Gold Choker Necklace',      desc:'Sleek modern gold choker with geometric woven texture.',                 price:9500,  op:null,  cat:'Necklace', emoji:'🌼', mat:'22K Gold',               stone:'None',            sku:'NK-003', badge:'Bestseller', feat:1 },
    { name:'Evil Eye Diamond Necklace', desc:'Evil eye pendant encrusted with sapphires and diamonds.',                price:7300,  op:8800,  cat:'Necklace', emoji:'🔵', mat:'18K White Gold',         stone:'Sapphire & Diamond',sku:'NK-004',badge:'Sale',      feat:0 },
    { name:'Vintage Locket Necklace',   desc:'Romantic oval locket with garnet detailing in antique gold finish.',     price:3600,  op:null,  cat:'Necklace', emoji:'🗝️', mat:'Antique Gold Plated',    stone:'Garnet',          sku:'NK-005', badge:'',           feat:0 },
  ];

  const ins = db.prepare('INSERT INTO products (name,description,price,old_price,category_id,emoji,material,stone,sku,badge,featured,image_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
  products.forEach((p, idx) => {
    const cat = getCat(p.cat);
    const img = stockPhotos[idx] || stockPhotos[idx % stockPhotos.length];
    if (cat) try { ins.run(p.name, p.desc, p.price, p.op, cat.id, p.emoji, p.mat, p.stone, p.sku, p.badge, p.feat, img); } catch (e) {}
  });
  console.log('✓ Products seeded');

  const adminPwd = bcrypt.hashSync('admin123', 10);
  const yamnaPwd = bcrypt.hashSync('123456', 10);
  const custPwd  = bcrypt.hashSync('demo123', 10);
  try { db.prepare('INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)').run('Admin','admin@lumiere.com',adminPwd,'admin'); } catch(e) {}
  try { db.prepare('INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)').run('Yamna','yamna@gmail.com',yamnaPwd,'admin'); } catch(e) {}
  try { db.prepare('INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)').run('Fatima Khan','fatima@example.com',custPwd,'customer'); } catch(e) {}
  console.log('✓ Users seeded');

  console.log('\n✦ Seeding complete!');
  console.log('✦ Admin:    yamna@gmail.com / 123456');
  console.log('✦ Customer: fatima@example.com / demo123\n');
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
