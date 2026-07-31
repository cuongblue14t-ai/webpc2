const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, requireRole } = require('./auth');

// CREATE contact entry (Public User)
router.post('/', async (req, res) => {
  const { ho_ten, email, so_dien_thoai, noi_dung } = req.body;

  if (!ho_ten || !ho_ten.trim() || !email || !email.trim() || !noi_dung || !noi_dung.trim()) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ Họ và tên, Email và Nội dung liên hệ!' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO lien_he (ho_ten, email, so_dien_thoai, noi_dung, trang_thai, ngay_gui) 
       VALUES (?, ?, ?, ?, 'Chưa xử lý', NOW())`,
      [ho_ten.trim(), email.trim(), so_dien_thoai ? so_dien_thoai.trim() : null, noi_dung.trim()]
    );

    res.status(201).json({ 
      id: result.insertId, 
      message: '🎉 Gửi liên hệ thành công! Cảm ơn bạn đã liên hệ với Nam Nguyễn PC & Workstation. Chúng tôi sẽ phản hồi trong thời gian sớm nhất.' 
    });
  } catch (e) {
    console.error('Contact submit error:', e);
    res.status(500).json({ error: 'Có lỗi xảy ra khi gửi tin nhắn liên hệ: ' + e.message });
  }
});

// GET all contact entries (for Admin & Manager)
router.get('/', verifyToken, requireRole('Admin', 'Manager'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM lien_he ORDER BY ngay_gui DESC');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
