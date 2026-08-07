require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const categoriesRouter = require('./routes/categories');
const productsRouter = require('./routes/products');
const bannersRouter = require('./routes/banners');
const contactsRouter = require('./routes/contacts');
const ordersRouter = require('./routes/orders');
const usersRouter = require('./routes/users');
const statsRouter = require('./routes/stats');

const { router: authRouter } = require('./routes/auth');
const db = require('./db');
const { autoMigrateExistingImages } = require('./utils/imageHandler');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable GZIP compression for all HTTP responses
app.use(compression());

// Enable CORS for all origins, protocols and preflight requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve static frontend files and uploads with browser caching
const staticOptions = { maxAge: '1d', etag: true };
app.use(express.static(path.join(__dirname, 'public'), staticOptions));
app.use(express.static(path.join(__dirname, 'frontend'), staticOptions));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), staticOptions));

// Explicit root route serving index.html
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.send('Server is running');
});



app.use(bodyParser.json());
app.use('/api/categories', categoriesRouter);
app.use('/api/products', productsRouter);
app.use('/api/banners', bannersRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/stats', statsRouter);

// Test DB connection & auto-add classification/user columns
async function initDb() {
  let conn;
  try {
    conn = await db.getConnection();
    console.log('✅ Connected to MySQL (ban_hang_db)');
    
    // Check and add classification columns to san_pham table if missing
    const columnsToAdd = [
      { name: 'is_noi_bat', type: 'TINYINT DEFAULT 0' },
      { name: 'is_ban_chay', type: 'TINYINT DEFAULT 0' },
      { name: 'is_flash_sale', type: 'TINYINT DEFAULT 0' }
    ];

    const [existingCols] = await conn.query("SHOW COLUMNS FROM san_pham");
    const existingColNames = existingCols.map(c => c.Field);

    for (const col of columnsToAdd) {
      if (!existingColNames.includes(col.name)) {
        await conn.query(`ALTER TABLE san_pham ADD COLUMN ${col.name} ${col.type}`);
        console.log(`➕ Added column '${col.name}' to san_pham table`);
      }
    }

    // Normalize NULL values for products
    await conn.query("UPDATE san_pham SET is_noi_bat = 0 WHERE is_noi_bat IS NULL");
    await conn.query("UPDATE san_pham SET is_ban_chay = 0 WHERE is_ban_chay IS NULL");
    await conn.query("UPDATE san_pham SET is_flash_sale = 0 WHERE is_flash_sale IS NULL");

    // Check and add columns to tai_khoan_admin table if missing
    const userColsToAdd = [
      { name: 'so_dien_thoai', type: 'VARCHAR(30)' },
      { name: 'dia_chi', type: 'VARCHAR(255)' },
      { name: 'vai_tro', type: "ENUM('Customer','Manager','Admin') DEFAULT 'Customer'" },
      { name: 'trang_thai', type: "ENUM('Active','Blocked') DEFAULT 'Active'" },
      { name: 'ngay_tao', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
    ];

    const [userCols] = await conn.query("SHOW COLUMNS FROM tai_khoan_admin");
    const userColNames = userCols.map(c => c.Field);

    for (const col of userColsToAdd) {
      if (!userColNames.includes(col.name)) {
        try {
          await conn.query(`ALTER TABLE tai_khoan_admin ADD COLUMN ${col.name} ${col.type}`);
          console.log(`➕ Added column '${col.name}' to tai_khoan_admin table`);
        } catch (e) {
          console.warn(`Column migration notice: ${e.message}`);
        }
      }
    }

    try {
      await conn.query("UPDATE tai_khoan_admin SET vai_tro = 'Customer' WHERE vai_tro = 'Guest'");
      await conn.query("ALTER TABLE tai_khoan_admin MODIFY COLUMN vai_tro ENUM('Customer','Manager','Admin') DEFAULT 'Customer'");
    } catch (e) {}

    // Normalize NULL values for users
    await conn.query("UPDATE tai_khoan_admin SET trang_thai = 'Active' WHERE trang_thai IS NULL");
    await conn.query("UPDATE tai_khoan_admin SET vai_tro = 'Customer' WHERE vai_tro IS NULL");

    // Auto-sync existing orders into activity history logs if missing
    try {
      const [orders] = await conn.query('SELECT * FROM don_hang');
      let syncedCount = 0;
      for (const order of orders) {
        const detailMsgPart = `đơn hàng #${order.id}`;
        const [existingLogs] = await conn.query(
          'SELECT id FROM lich_su_chinh_sua_san_pham WHERE chi_tiet_thay_doi LIKE ? AND hanh_dong = "Đặt hàng mới"',
          [`%${detailMsgPart}%`]
        );

        if (existingLogs.length === 0) {
          let historyUserId = null;
          if (order.id_tai_khoan) {
            const [uRows] = await conn.query('SELECT id FROM tai_khoan_admin WHERE id = ?', [order.id_tai_khoan]);
            if (uRows.length > 0) historyUserId = order.id_tai_khoan;
          }

          const formattedTotal = Number(order.tong_tien || 0).toLocaleString('vi-VN');
          const customerInfo = order.ten_khach_hang ? order.ten_khach_hang : (order.so_dien_thoai || 'Khách hàng');
          const actionName = 'Đặt hàng mới';
          const detailMsg = `Khách hàng ${customerInfo} vừa đặt thành công đơn hàng #${order.id} (Tổng: ${formattedTotal}đ).`;

          await conn.query(
            'INSERT INTO lich_su_chinh_sua_san_pham (id_san_pham, id_tai_khoan, hanh_dong, chi_tiet_thay_doi, ngay_tao) VALUES (NULL, ?, ?, ?, ?)',
            [historyUserId, actionName, detailMsg, order.ngay_dat || new Date()]
          );
          syncedCount++;
        }
      }
      if (syncedCount > 0) {
        console.log(`🛒 Synced ${syncedCount} existing orders to activity notifications history.`);
      }

      // Deduplicate any repeated history entries for the same order
      await conn.query(`
        DELETE t1 FROM lich_su_chinh_sua_san_pham t1
        INNER JOIN lich_su_chinh_sua_san_pham t2 
        WHERE t1.id > t2.id 
          AND t1.hanh_dong = 'Đặt hàng mới' 
          AND t2.hanh_dong = 'Đặt hàng mới' 
          AND t1.chi_tiet_thay_doi = t2.chi_tiet_thay_doi
      `);
    } catch (e) {
      console.warn('Order history sync notice:', e.message);
    }

    // Background non-blocking migration of external images
    autoMigrateExistingImages(db).catch(() => {});

  } catch (err) {
    console.error('⚠️ MySQL connection/migration notice:', err.message);
  } finally {
    if (conn) conn.release();
  }
}

initDb();

// Always start the server (listening on 0.0.0.0 for Cloud platforms like Render)
const HOST = '0.0.0.0';

function startServer(portToUse) {
  const server = app.listen(portToUse, HOST, () => console.log(`🚀 Server listening on http://${HOST}:${portToUse}`))
    .on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`⚠️ Port ${portToUse} in use, trying port ${portToUse + 1}...`);
        startServer(portToUse + 1);
      } else {
        console.error('Server error:', err);
      }
    });
}

startServer(Number(PORT));
