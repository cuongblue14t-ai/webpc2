const express = require('express');
const router = express.Router();
const db = require('../db');
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

// GET all active banners (For Frontend)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM banner WHERE trang_thai = 1 ORDER BY vi_tri ASC');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET all banners (For Admin)
router.get('/all', verifyToken, requireRole('Admin', 'Manager'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM banner ORDER BY vi_tri ASC');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// CREATE banner(s) (Admin) - Supports multiple image URLs (Google Drive or direct web URLs)
router.post('/', verifyToken, verifyAdminOrManager, async (req, res) => {
  try {
    const { tieu_de, lien_ket, vi_tri, trang_thai, hinh_anh_url, hinh_anh } = req.body;
    const inputUrl = hinh_anh_url || hinh_anh;

    let rawUrls = [];
    if (inputUrl) {
      if (typeof inputUrl === 'string') {
        if (inputUrl.trim().startsWith('[')) {
          try { rawUrls = JSON.parse(inputUrl); } catch (e) {}
        } else {
          rawUrls = inputUrl.split(/[\n,]+/).map(u => u.trim()).filter(Boolean);
        }
      } else if (Array.isArray(inputUrl)) {
        rawUrls = inputUrl;
      }
    }

    const formattedUrls = [];
    for (const rawUrl of rawUrls) {
      const trimmed = rawUrl.trim();
      if (!trimmed) continue;
      if (isValidUrl(trimmed) || trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')) {
        const converted = convertGoogleDriveLink(trimmed);
        formattedUrls.push(converted);
        mirrorExternalImage(trimmed, 'banners').catch(() => {});
      } else {
        return res.status(400).json({ error: `Đường dẫn hình ảnh không hợp lệ: ${trimmed}` });
      }
    }

    if (formattedUrls.length === 0) {
      return res.status(400).json({ error: 'Vui lòng nhập ít nhất một đường dẫn ảnh banner (URL hoặc Google Drive).' });
    }

    const basePosition = parseInt(vi_tri) || 0;
    const statusVal = trang_thai !== undefined ? parseInt(trang_thai) : 1;
    const linkVal = lien_ket || '#';
    const titleVal = tieu_de || null;

    const createdIds = [];
    for (let i = 0; i < formattedUrls.length; i++) {
      const imgUrl = formattedUrls[i];
      const pos = basePosition + i;
      const [result] = await db.execute(
        'INSERT INTO banner (tieu_de, hinh_anh, lien_ket, vi_tri, trang_thai) VALUES (?, ?, ?, ?, ?)',
        [titleVal, imgUrl, linkVal, pos, statusVal]
      );
      createdIds.push(result.insertId);

      // Log to history
      await db.execute(
        'INSERT INTO lich_su_chinh_sua_san_pham (id_san_pham, id_tai_khoan, hanh_dong, chi_tiet_thay_doi) VALUES (NULL, ?, ?, ?)',
        [req.user.id, 'Tạo banner', `Thêm mới banner "${titleVal || 'Không tiêu đề'}" (ID: ${result.insertId}) tại vị trí ${pos}, link: ${linkVal}.`]
      );
    }

    res.status(201).json({ message: `Đã tạo thành công ${createdIds.length} banner.`, ids: createdIds });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// UPDATE banner (Admin)
router.put('/:id', verifyToken, verifyAdminOrManager, async (req, res) => {
  try {
    const { tieu_de, lien_ket, vi_tri, trang_thai, hinh_anh_url, hinh_anh } = req.body;
    const bannerId = req.params.id;
    const inputUrl = hinh_anh_url || hinh_anh;

    let imgUrl = null;
    if (inputUrl) {
      let raw = typeof inputUrl === 'string' ? inputUrl.trim() : '';
      if (raw.startsWith('[')) {
        try { const arr = JSON.parse(raw); raw = arr[0] || ''; } catch (e) {}
      } else if (raw) {
        raw = raw.split(/[\n,]+/)[0].trim();
      }
      if (raw) {
        imgUrl = convertGoogleDriveLink(raw);
        mirrorExternalImage(raw, 'banners').catch(() => {});
      }
    }

    // Fetch old banner state for comparison
    const [oldBanners] = await db.query('SELECT * FROM banner WHERE id = ?', [bannerId]);
    const oldB = oldBanners[0] || {};

    const changes = [];
    if (oldB.tieu_de !== (tieu_de || null)) {
      changes.push(`Tiêu đề: "${oldB.tieu_de || 'N/A'}" -> "${tieu_de || 'N/A'}"`);
    }
    if (oldB.lien_ket !== (lien_ket || '#')) {
      changes.push(`Liên kết: "${oldB.lien_ket || 'N/A'}" -> "${lien_ket || '#'}"`);
    }
    if (parseInt(oldB.vi_tri) !== (parseInt(vi_tri) || 0)) {
      changes.push(`Vị trí: ${oldB.vi_tri} -> ${parseInt(vi_tri) || 0}`);
    }
    const newTrangThai = parseInt(trang_thai) !== undefined ? parseInt(trang_thai) : 1;
    if (parseInt(oldB.trang_thai) !== newTrangThai) {
      const oldSt = oldB.trang_thai ? 'Hiển thị' : 'Ẩn';
      const newSt = newTrangThai ? 'Hiển thị' : 'Ẩn';
      changes.push(`Trạng thái: ${oldSt} -> ${newSt}`);
    }
    if (imgUrl && oldB.hinh_anh !== imgUrl) {
      changes.push('Hình ảnh thay đổi');
    }

    if (imgUrl) {
      await db.execute(
        'UPDATE banner SET tieu_de = ?, hinh_anh = ?, lien_ket = ?, vi_tri = ?, trang_thai = ? WHERE id = ?',
        [tieu_de || null, imgUrl, lien_ket || '#', parseInt(vi_tri) || 0, parseInt(trang_thai) !== undefined ? parseInt(trang_thai) : 1, bannerId]
      );
    } else {
      await db.execute(
        'UPDATE banner SET tieu_de = ?, lien_ket = ?, vi_tri = ?, trang_thai = ? WHERE id = ?',
        [tieu_de || null, lien_ket || '#', parseInt(vi_tri) || 0, parseInt(trang_thai) !== undefined ? parseInt(trang_thai) : 1, bannerId]
      );
    }

    // Log to history
    const logDetails = changes.length > 0 ? changes.join('; ') : 'Không có thay đổi về giá trị thuộc tính.';
    await db.execute(
      'INSERT INTO lich_su_chinh_sua_san_pham (id_san_pham, id_tai_khoan, hanh_dong, chi_tiet_thay_doi) VALUES (NULL, ?, ?, ?)',
      [req.user.id, 'Cập nhật banner', `Cập nhật banner "${tieu_de || 'Không tiêu đề'}" (ID: ${bannerId}): ` + logDetails]
    );

    res.json({ message: 'Cập nhật banner thành công.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE banner (Admin)
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [result] = await db.execute('DELETE FROM banner WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Banner not found' });
    res.json({ message: 'Banner deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
