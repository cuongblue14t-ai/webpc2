/**
 * User Management Router (Quản lý Tài khoản)
 * WebPC - Nam Nguyễn PC & Workstation
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { verifyToken, requireAdminSiteAccess, preventManagerMutations, verifyAdmin } = require('./auth');

// Apply base authentication and authorization middlewares
router.use(verifyToken, requireAdminSiteAccess, preventManagerMutations);

/**
 * 1. GET /api/users - List users with Search, Role Filter, Status Filter & Pagination
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const search = req.query.search ? req.query.search.trim() : '';
    const role = req.query.role || 'All';
    const status = req.query.status || 'All';

    let conditions = ['1=1'];
    let params = [];

    if (search) {
      conditions.push('(ho_ten LIKE ? OR email LIKE ? OR so_dien_thoai LIKE ? OR ten_dang_nhap LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (role && role !== 'All') {
      conditions.push('vai_tro = ?');
      params.push(role);
    }

    if (status && status !== 'All') {
      conditions.push('trang_thai = ?');
      params.push(status);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const [countResult] = await db.query(
      `SELECT COUNT(*) AS total FROM tai_khoan_admin WHERE ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get paginated users (excl password)
    const selectQuery = `
      SELECT id, ten_dang_nhap, ho_ten, email, 
             COALESCE(so_dien_thoai, '') AS so_dien_thoai, 
             COALESCE(dia_chi, '') AS dia_chi, 
             COALESCE(vai_tro, 'Customer') AS vai_tro, 
             COALESCE(trang_thai, 'Active') AS trang_thai, 
             ngay_tao 
      FROM tai_khoan_admin 
      WHERE ${whereClause} 
      ORDER BY id DESC 
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, limit, offset];
    const [users] = await db.query(selectQuery, queryParams);

    const totalPages = Math.ceil(total / limit) || 1;

    res.json({
      users: users.map(u => ({
        id: u.id,
        username: u.ten_dang_nhap,
        fullName: u.ho_ten,
        email: u.email,
        phone: u.so_dien_thoai,
        address: u.dia_chi,
        role: u.vai_tro,
        status: u.trang_thai,
        createdAt: u.ngay_tao
      })),
      total,
      page,
      totalPages,
      limit
    });
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ khi lấy danh sách tài khoản' });
  }
});

/**
 * 2. POST /api/users - Create Internal Account (Manager / Admin) - ADMIN ONLY
 */
router.post(
  '/',
  verifyAdmin,
  [
    body('fullName').notEmpty().withMessage('Họ và tên không được để trống'),
    body('email').isEmail().withMessage('Email không hợp lệ'),
    body('password').isLength({ min: 6 }).withMessage('Mật khẩu phải từ 6 ký tự trở lên'),
    body('role').isIn(['Manager', 'Admin', 'Customer']).withMessage('Vai trò không hợp lệ')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { fullName, email, phone, username, password, role, address } = req.body;
    const finalUsername = username || email;
    const finalRole = role || 'Manager';

    try {
      const [existing] = await db.query(
        'SELECT id FROM tai_khoan_admin WHERE email = ? OR ten_dang_nhap = ?',
        [email, finalUsername]
      );
      if (existing.length > 0) {
        return res.status(409).json({ error: 'Email hoặc Tên đăng nhập đã được sử dụng' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const [result] = await db.query(
        `INSERT INTO tai_khoan_admin (ten_dang_nhap, mat_khau, ho_ten, email, so_dien_thoai, dia_chi, vai_tro, trang_thai) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Active')`,
        [finalUsername, passwordHash, fullName, email, phone || null, address || null, finalRole]
      );

      res.status(201).json({
        message: `Tạo tài khoản ${finalRole} thành công!`,
        userId: result.insertId
      });
    } catch (err) {
      console.error('Create user error:', err);
      res.status(500).json({ error: 'Lỗi khi tạo tài khoản mới' });
    }
  }
);

/**
 * 3. PUT /api/users/:id/role - Assign / Change Role - ADMIN ONLY
 */
router.put('/:id/role', verifyAdmin, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const { role } = req.body;

    const validRoles = ['Customer', 'Manager', 'Admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Vai trò không hợp lệ' });
    }

    // SELF-PROTECTION GUARDRAIL: Admin cannot demote self
    if (req.user.id == targetUserId && role !== 'Admin') {
      return res.status(400).json({ error: '⚠️ Bạn không thể tự hạ vai trò Admin của chính mình!' });
    }

    const [result] = await db.query(
      'UPDATE tai_khoan_admin SET vai_tro = ? WHERE id = ?',
      [role, targetUserId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
    }

    res.json({ message: 'Cập nhật vai trò tài khoản thành công!', role });
  } catch (err) {
    console.error('Change role error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ khi thay đổi vai trò tài khoản' });
  }
});

/**
 * 4. PUT /api/users/:id/status - Toggle Active / Blocked Status - ADMIN ONLY
 */
router.put('/:id/status', verifyAdmin, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const { status } = req.body;

    if (!['Active', 'Blocked'].includes(status)) {
      return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
    }

    // SELF-PROTECTION GUARDRAIL: Admin cannot lock self
    if (req.user.id == targetUserId && status === 'Blocked') {
      return res.status(400).json({ error: '⚠️ Bạn không thể tự khóa tài khoản của chính mình!' });
    }

    const [result] = await db.query(
      'UPDATE tai_khoan_admin SET trang_thai = ? WHERE id = ?',
      [status, targetUserId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
    }

    const actionText = status === 'Blocked' ? 'Khóa' : 'Kích hoạt';
    res.json({ message: `${actionText} tài khoản thành công!`, status });
  } catch (err) {
    console.error('Toggle status error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ khi cập nhật trạng thái tài khoản' });
  }
});

/**
 * 5. PUT /api/users/:id/reset-password - Reset User Password - ADMIN ONLY
 */
router.put('/:id/reset-password', verifyAdmin, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const [result] = await db.query(
      'UPDATE tai_khoan_admin SET mat_khau = ? WHERE id = ?',
      [passwordHash, targetUserId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
    }

    res.json({ message: 'Đặt lại mật khẩu tài khoản thành công!' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ khi đặt lại mật khẩu' });
  }
});

/**
 * 6. PUT /api/users/:id - Edit User Details - ADMIN ONLY
 */
router.put('/:id', verifyAdmin, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const { fullName, phone, address } = req.body;

    if (!fullName) {
      return res.status(400).json({ error: 'Họ và tên không được để trống' });
    }

    const [result] = await db.query(
      'UPDATE tai_khoan_admin SET ho_ten = ?, so_dien_thoai = ?, dia_chi = ? WHERE id = ?',
      [fullName, phone || null, address || null, targetUserId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
    }

    res.json({ message: 'Cập nhật thông tin tài khoản thành công!' });
  } catch (err) {
    console.error('Edit user error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ khi chỉnh sửa tài khoản' });
  }
});

/**
 * 7. DELETE /api/users/:id - Delete User - ADMIN ONLY
 */
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const targetUserId = req.params.id;

    // SELF-PROTECTION GUARDRAIL: Admin cannot delete self
    if (req.user.id == targetUserId) {
      return res.status(400).json({ error: '⚠️ Bạn không thể tự xóa tài khoản của chính mình!' });
    }

    const [result] = await db.query('DELETE FROM tai_khoan_admin WHERE id = ?', [targetUserId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
    }

    res.json({ message: 'Xóa tài khoản thành công!' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ khi xóa tài khoản' });
  }
});

module.exports = router;
