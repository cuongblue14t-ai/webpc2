// routes/categories.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, verifyAdmin } = require('./auth');

// CREATE category
router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  const { ten_danh_muc, mo_ta, trang_thai } = req.body;
  try {
    const [result] = await db.execute(
      'INSERT INTO danh_muc (ten_danh_muc, mo_ta, trang_thai) VALUES (?,?,?)',
      [ten_danh_muc, mo_ta || null, trang_thai ?? true]
    );
    res.status(201).json({ id: result.insertId, message: 'Category created' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// READ all categories (with product counts and fallback representative product image)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT dm.id, dm.ten_danh_muc, dm.mo_ta, dm.trang_thai,
             COUNT(sp.id) AS so_luong_san_pham,
             COALESCE(
               CASE 
                 WHEN dm.hinh_anh LIKE 'http%' THEN dm.hinh_anh
                 ELSE NULL
               END,
               (SELECT asp.duong_dan 
                FROM anh_san_pham asp 
                JOIN san_pham sp_sub ON asp.id_san_pham = sp_sub.id 
                WHERE sp_sub.id_danh_muc = dm.id AND sp_sub.is_deleted = 0 AND asp.duong_dan IS NOT NULL AND asp.duong_dan != ''
                ORDER BY asp.anh_chinh DESC, asp.id ASC LIMIT 1)
             ) AS hinh_anh
      FROM danh_muc dm
      LEFT JOIN san_pham sp ON sp.id_danh_muc = dm.id AND sp.is_deleted = 0
      GROUP BY dm.id
      ORDER BY dm.id ASC
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// READ one category
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM danh_muc WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Category not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// UPDATE category
router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { ten_danh_muc, mo_ta, trang_thai } = req.body;
  try {
    const [result] = await db.execute(
      'UPDATE danh_muc SET ten_danh_muc = ?, mo_ta = ?, trang_thai = ? WHERE id = ?',
      [ten_danh_muc, mo_ta, trang_thai, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Category not found' });
    res.json({ message: 'Category updated' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE category
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [result] = await db.execute('DELETE FROM danh_muc WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Category not found' });
    res.json({ message: 'Category deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
