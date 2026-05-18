const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = new Database('database.db');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Database Setup ───────────────────────────────────────────────────────────
const db = new Database('database.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    image TEXT DEFAULT 'default.jpg',
    description TEXT,
    category TEXT DEFAULT 'Classic',
    stock INTEGER DEFAULT 50,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    customer_name TEXT NOT NULL,
    address TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    note TEXT,
    total INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    price INTEGER NOT NULL,
    quantity INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );
`);

// Seed admin
const adminExists = db.prepare('SELECT id FROM admin WHERE username = ?').get('nomona');
if (!adminExists) {
  const hashed = bcrypt.hashSync('nomona123', 10);
  db.prepare('INSERT INTO admin (username, password) VALUES (?, ?)').run('nomona', hashed);
}

// Seed sample products
const productCount = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
if (productCount === 0) {
  const products = [
    { name: 'Nastar Classic', price: 35000, image: 'nastar.jpeg', description: 'Nastar lembut isi selai nanas asli pilihan, dibuat dengan tepung premium dan mentega segar. Tekstur lumer di mulut dengan rasa manis segar nanas yang sempurna.', category: 'Classic', stock: 50 },
    { name: 'Palm Sugar Cookies', price: 30000, image: 'palm.jpeg', description: 'Cookies unik dengan gula aren asli pilihan, memberikan aroma karamel alami yang khas. Renyah di luar, lembut di dalam dengan cita rasa tradisional premium.', category: 'Special', stock: 40 },
    { name: 'Choco Crinkle', price: 30000, image: 'choco.jpeg', description: 'Cookies coklat premium dengan tekstur crispy di luar dan fudgy di dalam. Menggunakan dark chocolate Belgian berkualitas tinggi untuk rasa coklat yang intens.', category: 'Chocolate', stock: 35 },
    { name: 'Sago Cheese', price: 30000, image: 'sago.jpeg', description: 'Cookies sagu dengan taburan keju cheddar premium, renyah dan gurih dengan aroma keju yang menggoda. Perpaduan sempurna antara tekstur sagu dan keju.', category: 'Cheese', stock: 45 },
    { name: 'Putri Salju', price: 30000, image: 'salju.jpeg', description: 'Cookies klasik berlumur gula halus seperti salju, dengan isian kacang mete pilihan yang renyah. Lembut, manis, dan elegan untuk semua momen spesial.', category: 'Classic', stock: 60 },
    { name: 'Pandan Snowball', price: 30000, image: 'pandan.jpeg', description: 'Pandan Snowball dengan aroma pandan alami yang wangi dan khas, dibalut taburan gula halus lembut. Teksturnya lumer di mulut dengan rasa manis yang pas, cocok untuk teman santai atau hampers spesial.', category: 'Special', stock: 30 },
  ];
  const insert = db.prepare('INSERT INTO products (name, price, image, description, category, stock) VALUES (?, ?, ?, ?, ?, ?)');
  products.forEach(p => insert.run(p.name, p.price, p.image, p.description, p.category, p.stock));
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(session({
  secret: 'nomona-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Multer for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'public', 'images');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'));
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ─── Auth Middleware ──────────────────────────────────────────────────────────
const requireUser = (req, res, next) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  next();
};
const requireAdmin = (req, res, next) => {
  if (!req.session.adminId) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────
app.post('/register', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.json({ error: 'Semua field wajib diisi' });
  if (password.length < 6) return res.json({ error: 'Password minimal 6 karakter' });

  const existUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existUser) return res.json({ error: 'Username atau email sudah terdaftar' });

  const hashed = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)').run(username, email, hashed);
  req.session.userId = result.lastInsertRowid;
  req.session.username = username;
  res.json({ success: true, username });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ error: 'Username dan password wajib diisi' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.json({ error: 'Username tidak ditemukan' });
  if (!bcrypt.compareSync(password, user.password)) return res.json({ error: 'Password salah' });

  req.session.userId = user.id;
  req.session.username = user.username;
  res.json({ success: true, username: user.username });
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  const admin = db.prepare('SELECT * FROM admin WHERE username = ?').get(username);
  if (!admin || !bcrypt.compareSync(password, admin.password)) {
    return res.json({ error: 'Username atau password admin salah' });
  }
  req.session.adminId = admin.id;
  req.session.adminUsername = admin.username;
  res.json({ success: true });
});

app.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/me', (req, res) => {
  if (req.session.userId) {
    const user = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?').get(req.session.userId);
    return res.json({ loggedIn: true, user, isAdmin: false });
  }
  if (req.session.adminId) {
    return res.json({ loggedIn: true, user: { username: req.session.adminUsername }, isAdmin: true });
  }
  res.json({ loggedIn: false });
});

// ─── PRODUCT ROUTES ───────────────────────────────────────────────────────────
app.get('/products', (req, res) => {
  const { category, search, sort } = req.query;
  let query = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (category && category !== 'all') { query += ' AND category = ?'; params.push(category); }
  if (search) { query += ' AND (name LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (sort === 'asc') query += ' ORDER BY price ASC';
  else if (sort === 'desc') query += ' ORDER BY price DESC';
  else query += ' ORDER BY id ASC';

  const products = db.prepare(query).all(...params);
  res.json(products);
});

app.get('/product/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Produk tidak ditemukan' });
  const related = db.prepare('SELECT * FROM products WHERE category = ? AND id != ? LIMIT 4').all(product.category, product.id);
  res.json({ product, related });
});

app.post('/add-product', requireAdmin, upload.single('image'), (req, res) => {
  const { name, price, description, category, stock } = req.body;
  if (!name || !price) return res.json({ error: 'Nama dan harga wajib diisi' });
  const image = req.file ? req.file.filename : 'default.jpg';
  const result = db.prepare('INSERT INTO products (name, price, image, description, category, stock) VALUES (?, ?, ?, ?, ?, ?)').run(name, parseInt(price), image, description || '', category || 'Classic', parseInt(stock) || 50);
  res.json({ success: true, id: result.lastInsertRowid });
});

app.put('/edit-product/:id', requireAdmin, upload.single('image'), (req, res) => {
  const { name, price, description, category, stock } = req.body;
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.json({ error: 'Produk tidak ditemukan' });
  const image = req.file ? req.file.filename : existing.image;
  db.prepare('UPDATE products SET name=?, price=?, image=?, description=?, category=?, stock=? WHERE id=?').run(name, parseInt(price), image, description, category, parseInt(stock), req.params.id);
  res.json({ success: true });
});

app.delete('/delete-product/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── ORDER ROUTES ─────────────────────────────────────────────────────────────
app.post('/checkout', (req, res) => {
  const { customer_name, address, whatsapp, note, items } = req.body;
  if (!customer_name || !address || !whatsapp || !items || items.length === 0) {
    return res.json({ error: 'Data checkout tidak lengkap' });
  }
  const total = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const userId = req.session.userId || null;
  const order = db.prepare('INSERT INTO orders (user_id, customer_name, address, whatsapp, note, total, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run(userId, customer_name, address, whatsapp, note || '', total, 'pending');
  const insertItem = db.prepare('INSERT INTO order_items (order_id, product_name, price, quantity) VALUES (?, ?, ?, ?)');
  items.forEach(item => insertItem.run(order.lastInsertRowid, item.product_name, item.price, item.quantity));
  res.json({ success: true, orderId: order.lastInsertRowid });
});

app.get('/orders', requireAdmin, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  const ordersWithItems = orders.map(o => {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id);
    return { ...o, items };
  });
  res.json(ordersWithItems);
});

app.get('/my-orders', (req, res) => {
  if (!req.session.userId) return res.json([]);
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.session.userId);
  const ordersWithItems = orders.map(o => {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id);
    return { ...o, items };
  });
  res.json(ordersWithItems);
});

app.put('/finish-order/:id', requireAdmin, (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'diproses', 'selesai'];
  if (!validStatuses.includes(status)) return res.json({ error: 'Status tidak valid' });
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

// ─── ADMIN STATS ──────────────────────────────────────────────────────────────
app.get('/admin/stats', requireAdmin, (req, res) => {
  const totalProducts = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
  const totalOrders = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;
  const totalRevenue = db.prepare("SELECT COALESCE(SUM(total), 0) as s FROM orders WHERE status = 'selesai'").get().s;
  const pendingOrders = db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'pending'").get().c;
  const recentOrders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5').all();
  const salesByDay = db.prepare(`
    SELECT DATE(created_at) as date, SUM(total) as total
    FROM orders WHERE status != 'pending'
    GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 7
  `).all();
  res.json({ totalProducts, totalOrders, totalRevenue, pendingOrders, recentOrders, salesByDay });
});

// ─── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🍪 Nomona Cookies Server running at http://localhost:${PORT}`);
  console.log(`📦 Admin: http://localhost:${PORT}/admin.html`);
  console.log(`🛍️  Shop: http://localhost:${PORT}/index.html\n`);
});