// routes/products.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken, requireRole, verifyAdmin, verifyAdminOrManager } = require('./auth');

const { convertGoogleDriveLink, mirrorExternalImage } = require('../utils/imageHandler');


// Helper to validate URL format
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// Helper to safely get user ID for foreign key constraint in history logs
async function getValidUserId(connection, userId) {
  if (!userId) return null;
  try {
    const [rows] = await connection.execute('SELECT id FROM tai_khoan_admin WHERE id = ?', [userId]);
    return rows.length > 0 ? userId : null;
  } catch (e) {
    return null;
  }
}


// Multer configuration for product images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/products');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, uniqueName);
  }
});

const upload = multer({ storage: storage });

// Helper to delete local product image files
function deleteLocalImage(imagePath) {
  if (!imagePath) return;
  // If it's a URL, don't delete
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return;

  try {
    const fullPath = path.resolve(__dirname, '..', '..', imagePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`Deleted local file: ${fullPath}`);
    }
  } catch (err) {
    console.error(`Failed to delete local file: ${imagePath}`, err.message);
  }
}

// GET all products (Supports category, brand, tag filters and search query)
router.get('/', async (req, res) => {
  try {
    const { category, brand, search, tag } = req.query;
    let sql = `
      SELECT sp.*, dm.ten_danh_muc,
             (SELECT duong_dan FROM anh_san_pham WHERE id_san_pham = sp.id ORDER BY anh_chinh DESC, id ASC LIMIT 1) AS duong_dan_anh
      FROM san_pham sp
      LEFT JOIN danh_muc dm ON sp.id_danh_muc = dm.id
      WHERE sp.is_deleted = 0
    `;
    const params = [];

    if (category && category !== 'All') {
      sql += ' AND (dm.ten_danh_muc = ? OR sp.id_danh_muc = ?)';
      params.push(category, category);
    }

    if (brand && brand !== 'All') {
      sql += ' AND sp.hang_san_xuat = ?';
      params.push(brand);
    }

    if (tag) {
      if (tag === 'noi_bat') sql += ' AND sp.is_noi_bat = 1';
      else if (tag === 'ban_chay') sql += ' AND sp.is_ban_chay = 1';
      else if (tag === 'flash_sale' || tag === 'quoc_khanh_2_9' || tag === 'km_29') sql += ' AND sp.is_flash_sale = 1';
    }

    const { campaign } = req.query;
    if (campaign === 'quoc-khanh-2-9' || campaign === '2-9') {
      sql += ' AND sp.is_flash_sale = 1';
    }

    if (search) {
      sql += ' AND sp.ten_san_pham LIKE ?';
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY sp.id DESC';

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET product edit history logs
router.get('/history', verifyToken, requireRole('Admin', 'Manager'), async (req, res) => {
  try {
    const sql = `
      SELECT ls.*, sp.ten_san_pham, COALESCE(tk.ten_dang_nhap, tk.ho_ten, 'admin') AS nguoi_thuc_hien, tk.ten_dang_nhap
      FROM lich_su_chinh_sua_san_pham ls
      LEFT JOIN san_pham sp ON ls.id_san_pham = sp.id
      LEFT JOIN tai_khoan_admin tk ON ls.id_tai_khoan = tk.id
      ORDER BY ls.id DESC
    `;
    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET recent notifications/history (for Admin Notification Bell)
router.get('/history/recent', verifyToken, requireRole('Admin', 'Manager'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 15;
    const sql = `
      SELECT ls.*, sp.ten_san_pham, COALESCE(tk.ten_dang_nhap, tk.ho_ten, 'admin') AS nguoi_thuc_hien, tk.vai_tro AS vai_tro_nguoi_dung
      FROM lich_su_chinh_sua_san_pham ls
      LEFT JOIN san_pham sp ON ls.id_san_pham = sp.id
      LEFT JOIN tai_khoan_admin tk ON ls.id_tai_khoan = tk.id
      ORDER BY ls.id DESC
      LIMIT ?
    `;
    const [rows] = await db.query(sql, [limit]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});



// DELETE all product edit history logs
router.delete('/history', verifyToken, verifyAdmin, async (req, res) => {
  try {
    await db.execute('DELETE FROM lich_su_chinh_sua_san_pham');
    res.json({ message: 'Đã xóa toàn bộ lịch sử' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE single product edit history log
router.delete('/history/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [result] = await db.execute('DELETE FROM lich_su_chinh_sua_san_pham WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Không tìm thấy nhật ký lịch sử' });
    }
    res.json({ message: 'Xóa lịch sử thành công' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// BATCH DELETE product edit history logs
router.post('/history/batch-delete', verifyToken, verifyAdmin, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Vui lòng chọn ít nhất một mục lịch sử để xóa' });
  }
  try {
    const placeholders = ids.map(() => '?').join(',');
    await db.execute(`DELETE FROM lich_su_chinh_sua_san_pham WHERE id IN (${placeholders})`, ids);
    res.json({ message: `Đã xóa ${ids.length} mục lịch sử thành công` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});



// GET one product (includes dynamic specifications and images)
router.get('/:id', async (req, res) => {
  try {
    const [productRows] = await db.execute(
      `SELECT sp.*, dm.ten_danh_muc 
       FROM san_pham sp 
       LEFT JOIN danh_muc dm ON sp.id_danh_muc = dm.id 
       WHERE sp.id = ? AND sp.is_deleted = 0`,
      [req.params.id]
    );
    if (productRows.length === 0) return res.status(404).json({ error: 'Product not found' });
    const product = productRows[0];

    // Fetch images
    const [imageRows] = await db.execute(
      'SELECT duong_dan, anh_chinh FROM anh_san_pham WHERE id_san_pham = ? ORDER BY anh_chinh DESC, id ASC',
      [req.params.id]
    );
    product.images = imageRows.map(r => r.duong_dan);
    product.image_objects = imageRows; // full details

    // Fetch specs
    const [specRows] = await db.execute(
      'SELECT ten_thong_so, gia_tri FROM thong_so_san_pham WHERE id_san_pham = ?',
      [req.params.id]
    );
    const specsObj = {};
    specRows.forEach(r => {
      specsObj[r.ten_thong_so] = r.gia_tri;
    });
    product.thong_so = specsObj;

    // Backward compatibility fields for frontend product-card.js
    const compatSpecs = ['cpu', 'ram', 'vga', 'man_hinh', 'bao_hanh'];
    compatSpecs.forEach(f => {
      product[f] = specsObj[f] || specsObj[f.toUpperCase()] || null;
    });

    res.json(product);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Helper for input validation
function validateProductInput(body) {
  const { ten_san_pham, gia, id_danh_muc } = body;
  if (!ten_san_pham || ten_san_pham.trim() === '') {
    return 'Tên sản phẩm không được để trống.';
  }
  if (!gia || isNaN(gia) || Number(gia) <= 0) {
    return 'Giá sản phẩm phải là một số dương.';
  }
  if (!id_danh_muc || isNaN(id_danh_muc)) {
    return 'Vui lòng chọn danh mục hợp lệ.';
  }
  return null;
}

// CREATE product (Supports Google Drive URLs & other web URLs, no file upload)
router.post(
  '/',
  verifyToken,
  verifyAdminOrManager,
  async (req, res) => {
    const validationError = validateProductInput(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const {
      id_danh_muc,
      ten_san_pham,
      hang_san_xuat,
      mo_ta,
      gia,
      gia_khuyen_mai,
      so_luong,
      trang_thai,
      is_noi_bat,
      is_ban_chay,
      is_flash_sale,
      thong_so, // JSON string
      anh_url    // JSON string array of URLs, or raw text list
    } = req.body;

    // Parse/extract image URLs
    let urls = [];
    if (anh_url) {
      try {
        if (typeof anh_url === 'string') {
          if (anh_url.trim().startsWith('[')) {
            urls = JSON.parse(anh_url);
          } else {
            urls = anh_url.split(/[\r\n,;]+/).map(u => u.trim()).filter(Boolean);
          }
        } else if (Array.isArray(anh_url)) {
          urls = anh_url;
        }
      } catch (e) {
        console.error('Failed to parse anh_url', e);
      }
    }

    // Convert and validate URLs (Preserves Google Drive thumbnail links directly)
    const formattedUrls = [];
    for (const rawUrl of urls) {
      const trimmed = rawUrl.trim();
      if (!trimmed) continue;
      const isLocal = trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/');
      if (!isValidUrl(trimmed) && !isLocal) {
        return res.status(400).json({ error: `Đường dẫn hình ảnh không hợp lệ: ${trimmed}` });
      }
      const converted = convertGoogleDriveLink(trimmed);
      formattedUrls.push(converted);
      // Background mirror for local backup
      mirrorExternalImage(trimmed, 'products').catch(() => {});
    }

    if (formattedUrls.length === 0) {
      return res.status(400).json({ error: 'Vui lòng cung cấp ít nhất một đường dẫn ảnh sản phẩm.' });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Insert product basic info
      const [result] = await connection.execute(
        `INSERT INTO san_pham 
          (id_danh_muc, ten_san_pham, hang_san_xuat, mo_ta, gia, gia_khuyen_mai, so_luong, trang_thai, is_noi_bat, is_ban_chay, is_flash_sale) 
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [
          id_danh_muc,
          ten_san_pham.trim(),
          hang_san_xuat ? hang_san_xuat.trim() : null,
          mo_ta ? mo_ta.trim() : null,
          gia,
          gia_khuyen_mai && gia_khuyen_mai.toString().trim() !== '' ? gia_khuyen_mai : null,
          so_luong !== undefined && so_luong.toString().trim() !== '' ? so_luong : 0,
          trang_thai !== undefined ? (trang_thai === 'true' || trang_thai === '1' || trang_thai === 1 ? 1 : 0) : 1,
          (is_noi_bat === 1 || is_noi_bat === '1' || is_noi_bat === true || is_noi_bat === 'true') ? 1 : 0,
          (is_ban_chay === 1 || is_ban_chay === '1' || is_ban_chay === true || is_ban_chay === 'true') ? 1 : 0,
          (is_flash_sale === 1 || is_flash_sale === '1' || is_flash_sale === true || is_flash_sale === 'true') ? 1 : 0
        ]
      );
      const productId = result.insertId;

      // 2. Process Specifications
      if (thong_so) {
        const specsObj = typeof thong_so === 'string' ? JSON.parse(thong_so) : thong_so;
        for (const [key, value] of Object.entries(specsObj)) {
          if (value !== undefined && value !== null && value.toString().trim() !== '') {
            await connection.execute(
              'INSERT INTO thong_so_san_pham (id_san_pham, ten_thong_so, gia_tri) VALUES (?, ?, ?)',
              [productId, key.trim(), value.toString().trim()]
            );
          }
        }
      }

      // 3. Process Images (Main + Sub)
      for (let i = 0; i < formattedUrls.length; i++) {
        const isMain = i === 0 ? 1 : 0;
        await connection.execute(
          'INSERT INTO anh_san_pham (id_san_pham, duong_dan, anh_chinh) VALUES (?, ?, ?)',
          [productId, formattedUrls[i], isMain]
        );
      }

      // 4. Log history
      const logUserId = await getValidUserId(connection, req.user ? req.user.id : null);
      const logDetails = `Thêm mới sản phẩm "${ten_san_pham.trim()}" với giá ${Number(gia).toLocaleString('vi-VN')}₫, hãng ${hang_san_xuat || 'N/A'}, tồn kho ${so_luong || 0}.`;
      await connection.execute(
        'INSERT INTO lich_su_chinh_sua_san_pham (id_san_pham, id_tai_khoan, hanh_dong, chi_tiet_thay_doi) VALUES (?, ?, ?, ?)',
        [productId, logUserId, 'Tạo mới', logDetails]
      );

      await connection.commit();
      res.status(201).json({ id: productId, message: 'Product created successfully' });
    } catch (e) {
      await connection.rollback();
      res.status(500).json({ error: e.message });
    } finally {
      connection.release();
    }
  }
);

// UPDATE product (Supports Google Drive URLs & other web URLs, no file upload)
router.put(
  '/:id',
  verifyToken,
  verifyAdminOrManager,
  async (req, res) => {
    const productId = req.params.id;
    const validationError = validateProductInput(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const {
      id_danh_muc,
      ten_san_pham,
      hang_san_xuat,
      mo_ta,
      gia,
      gia_khuyen_mai,
      so_luong,
      trang_thai,
      is_noi_bat,
      is_ban_chay,
      is_flash_sale,
      thong_so,      // JSON string
      anh_url        // JSON string array of URLs, or raw text list
    } = req.body;

    // Parse/extract image URLs
    let urls = [];
    if (anh_url) {
      try {
        if (typeof anh_url === 'string') {
          if (anh_url.trim().startsWith('[')) {
            urls = JSON.parse(anh_url);
          } else {
            urls = anh_url.split(/[\r\n,;]+/).map(u => u.trim()).filter(Boolean);
          }
        } else if (Array.isArray(anh_url)) {
          urls = anh_url;
        }
      } catch (e) {
        console.error('Failed to parse anh_url', e);
      }
    }

    // Convert and validate URLs (Preserves Google Drive thumbnail links directly)
    const formattedUrls = [];
    for (const rawUrl of urls) {
      const trimmed = rawUrl.trim();
      if (!trimmed) continue;
      const isLocal = trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/');
      if (!isValidUrl(trimmed) && !isLocal) {
        return res.status(400).json({ error: `Đường dẫn hình ảnh không hợp lệ: ${trimmed}` });
      }
      const converted = convertGoogleDriveLink(trimmed);
      formattedUrls.push(converted);
      // Background mirror for local backup
      mirrorExternalImage(trimmed, 'products').catch(() => {});
    }

    if (formattedUrls.length === 0) {
      return res.status(400).json({ error: 'Vui lòng cung cấp ít nhất một đường dẫn ảnh sản phẩm.' });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 0. Fetch old product state for comparison
      const [oldRows] = await connection.execute(
        'SELECT * FROM san_pham WHERE id = ? AND is_deleted = 0',
        [productId]
      );
      if (oldRows.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ error: 'Product not found or already deleted' });
      }
      const oldProd = oldRows[0];

      const changes = [];
      if (oldProd.ten_san_pham !== ten_san_pham.trim()) {
        changes.push(`Tên: "${oldProd.ten_san_pham}" -> "${ten_san_pham.trim()}"`);
      }
      if (Number(oldProd.id_danh_muc) !== Number(id_danh_muc)) {
        changes.push(`Mã danh mục: ${oldProd.id_danh_muc} -> ${id_danh_muc}`);
      }
      const oldBrand = oldProd.hang_san_xuat || '';
      const newBrand = hang_san_xuat ? hang_san_xuat.trim() : '';
      if (oldBrand !== newBrand) {
        changes.push(`Hãng: "${oldBrand || 'N/A'}" -> "${newBrand || 'N/A'}"`);
      }
      if (Number(oldProd.gia) !== Number(gia)) {
        changes.push(`Giá: ${Number(oldProd.gia).toLocaleString('vi-VN')}₫ -> ${Number(gia).toLocaleString('vi-VN')}₫`);
      }
      const oldSale = oldProd.gia_khuyen_mai !== null ? Number(oldProd.gia_khuyen_mai) : null;
      const newSale = gia_khuyen_mai && gia_khuyen_mai.toString().trim() !== '' ? Number(gia_khuyen_mai) : null;
      if (oldSale !== newSale) {
        changes.push(`Giá KM: ${oldSale !== null ? oldSale.toLocaleString('vi-VN') + '₫' : 'N/A'} -> ${newSale !== null ? newSale.toLocaleString('vi-VN') + '₫' : 'N/A'}`);
      }
      if (Number(oldProd.so_luong) !== Number(so_luong)) {
        changes.push(`Tồn kho: ${oldProd.so_luong} -> ${so_luong}`);
      }
      const oldStatus = Number(oldProd.trang_thai);
      const newStatus = trang_thai !== undefined ? (trang_thai === 'true' || trang_thai === '1' || trang_thai === 1 ? 1 : 0) : 1;
      if (oldStatus !== newStatus) {
        changes.push(`Trạng thái: ${oldStatus === 1 ? 'Hiển thị' : 'Ẩn'} -> ${newStatus === 1 ? 'Hiển thị' : 'Ẩn'}`);
      }
      const oldDesc = oldProd.mo_ta || '';
      const newDesc = mo_ta ? mo_ta.trim() : '';
      if (oldDesc !== newDesc) {
        changes.push(`Mô tả thay đổi`);
      }

      // Specs comparison
      const [oldSpecs] = await connection.execute('SELECT ten_thong_so, gia_tri FROM thong_so_san_pham WHERE id_san_pham = ?', [productId]);
      const oldSpecsObj = {};
      oldSpecs.forEach(r => oldSpecsObj[r.ten_thong_so] = r.gia_tri);
      
      const newSpecsObj = thong_so ? (typeof thong_so === 'string' ? JSON.parse(thong_so) : thong_so) : {};
      let specsChanged = false;
      const allKeys = new Set([...Object.keys(oldSpecsObj), ...Object.keys(newSpecsObj)]);
      for (const k of allKeys) {
        const oldVal = (oldSpecsObj[k] || '').toString().trim();
        const newVal = (newSpecsObj[k] || '').toString().trim();
        if (oldVal !== newVal) {
          specsChanged = true;
          break;
        }
      }
      if (specsChanged) {
        changes.push('Cập nhật thông số kỹ thuật');
      }

      // Images comparison
      const [oldImages] = await connection.execute('SELECT duong_dan FROM anh_san_pham WHERE id_san_pham = ? ORDER BY anh_chinh DESC, id ASC', [productId]);
      const oldImgUrls = oldImages.map(img => img.duong_dan);
      let imagesChanged = false;
      if (oldImgUrls.length !== formattedUrls.length) {
        imagesChanged = true;
      } else {
        for (let i = 0; i < formattedUrls.length; i++) {
          if (oldImgUrls[i] !== formattedUrls[i]) {
            imagesChanged = true;
            break;
          }
        }
      }
      if (imagesChanged) {
        changes.push('Cập nhật hình ảnh');
      }

      // 1. Update basic info
      const [updateRes] = await connection.execute(
        `UPDATE san_pham SET 
          id_danh_muc = ?, ten_san_pham = ?, hang_san_xuat = ?, mo_ta = ?, 
          gia = ?, gia_khuyen_mai = ?, so_luong = ?, trang_thai = ?,
          is_noi_bat = ?, is_ban_chay = ?, is_flash_sale = ?
         WHERE id = ? AND is_deleted = 0`,
        [
          id_danh_muc,
          ten_san_pham.trim(),
          hang_san_xuat ? hang_san_xuat.trim() : null,
          mo_ta ? mo_ta.trim() : null,
          gia,
          gia_khuyen_mai && gia_khuyen_mai.toString().trim() !== '' ? gia_khuyen_mai : null,
          so_luong !== undefined && so_luong.toString().trim() !== '' ? so_luong : 0,
          trang_thai !== undefined ? (trang_thai === 'true' || trang_thai === '1' || trang_thai === 1 ? 1 : 0) : 1,
          (is_noi_bat === 1 || is_noi_bat === '1' || is_noi_bat === true || is_noi_bat === 'true') ? 1 : 0,
          (is_ban_chay === 1 || is_ban_chay === '1' || is_ban_chay === true || is_ban_chay === 'true') ? 1 : 0,
          (is_flash_sale === 1 || is_flash_sale === '1' || is_flash_sale === true || is_flash_sale === 'true') ? 1 : 0,
          productId
        ]
      );

      // 2. Update Specifications (clear and recreate)
      await connection.execute('DELETE FROM thong_so_san_pham WHERE id_san_pham = ?', [productId]);
      if (thong_so) {
        const specsObj = typeof thong_so === 'string' ? JSON.parse(thong_so) : thong_so;
        for (const [key, value] of Object.entries(specsObj)) {
          if (value !== undefined && value !== null && value.toString().trim() !== '') {
            await connection.execute(
              'INSERT INTO thong_so_san_pham (id_san_pham, ten_thong_so, gia_tri) VALUES (?, ?, ?)',
              [productId, key.trim(), value.toString().trim()]
            );
          }
        }
      }

      // 3. Update Images (clear and recreate)
      await connection.execute('DELETE FROM anh_san_pham WHERE id_san_pham = ?', [productId]);
      for (let i = 0; i < formattedUrls.length; i++) {
        const isMain = i === 0 ? 1 : 0;
        await connection.execute(
          'INSERT INTO anh_san_pham (id_san_pham, duong_dan, anh_chinh) VALUES (?, ?, ?)',
          [productId, formattedUrls[i], isMain]
        );
      }

      // 4. Log history
      const logUserId = await getValidUserId(connection, req.user ? req.user.id : null);
      const logDetails = changes.length > 0 ? changes.join('; ') : 'Không có thay đổi về giá trị thuộc tính.';
      await connection.execute(
        'INSERT INTO lich_su_chinh_sua_san_pham (id_san_pham, id_tai_khoan, hanh_dong, chi_tiet_thay_doi) VALUES (?, ?, ?, ?)',
        [productId, logUserId, 'Cập nhật', `Sản phẩm "${ten_san_pham.trim()}": ` + logDetails]
      );

      await connection.commit();
      res.json({ message: 'Product updated successfully' });
    } catch (e) {
      await connection.rollback();
      res.status(500).json({ error: e.message });
    } finally {
      connection.release();
    }
  }
);

// DELETE product (Soft Delete)
// DELETE single product (Soft Delete)
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const productId = req.params.id;

    // Get product name
    const [prodRows] = await connection.execute(
      'SELECT ten_san_pham FROM san_pham WHERE id = ? AND is_deleted = 0',
      [productId]
    );
    if (prodRows.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Product not found' });
    }
    const productName = prodRows[0].ten_san_pham;

    // Set is_deleted = 1
    const [result] = await connection.execute(
      'UPDATE san_pham SET is_deleted = 1 WHERE id = ?',
      [productId]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ error: 'Product not found' });
    }

    // Log history
    await connection.execute(
      'INSERT INTO lich_su_chinh_sua_san_pham (id_san_pham, id_tai_khoan, hanh_dong, chi_tiet_thay_doi) VALUES (?, ?, ?, ?)',
      [productId, req.user.id, 'Xóa', `Đã xóa (ẩn) sản phẩm "${productName}".`]
    );

    await connection.commit();
    res.json({ message: 'Product soft deleted successfully' });
  } catch (e) {
    await connection.rollback();
    res.status(500).json({ error: e.message });
  } finally {
    connection.release();
  }
});

// BATCH DELETE products (Soft Delete multiple)
router.post('/batch-delete', verifyToken, verifyAdmin, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Vui lòng chọn ít nhất một sản phẩm để xóa' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const placeholders = ids.map(() => '?').join(',');

    // Fetch product names for logging
    const [prodRows] = await connection.execute(
      `SELECT id, ten_san_pham FROM san_pham WHERE id IN (${placeholders}) AND is_deleted = 0`,
      ids
    );

    if (prodRows.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm nào phù hợp để xóa' });
    }

    // Soft delete products
    await connection.execute(
      `UPDATE san_pham SET is_deleted = 1 WHERE id IN (${placeholders})`,
      ids
    );

    // Audit logs for each product
    for (const p of prodRows) {
      await connection.execute(
        'INSERT INTO lich_su_chinh_sua_san_pham (id_san_pham, id_tai_khoan, hanh_dong, chi_tiet_thay_doi) VALUES (?, ?, ?, ?)',
        [p.id, req.user.id, 'Xóa', `Đã xóa (ẩn) hàng loạt sản phẩm "${p.ten_san_pham}".`]
      );
    }

    await connection.commit();
    res.json({ message: `Đã xóa ${prodRows.length} sản phẩm thành công` });
  } catch (e) {
    await connection.rollback();
    res.status(500).json({ error: e.message });
  } finally {
    connection.release();
  }
});

module.exports = router;

