const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../db');
require('dotenv').config();

const SECRET_KEY = process.env.JWT_SECRET || 'fallback_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REMEMBER_EXPIRES = process.env.JWT_REMEMBER_EXPIRES || '30d';

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  jwt.verify(token, SECRET_KEY, async (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid or expired token' });
    
    // Check if account status is Blocked
    try {
      const [rows] = await db.query('SELECT trang_thai FROM tai_khoan_admin WHERE id = ?', [decoded.id]);
      if (rows.length > 0 && rows[0].trang_thai === 'Blocked') {
        return res.status(403).json({ error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên.' });
      }
    } catch (e) {}

    req.user = { id: decoded.id, role: decoded.role };
    next();
  });
};

// Role based access control middleware
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

const verifyAdmin = requireRole('Admin');
const verifyAdminOrManager = requireRole('Admin', 'Manager');

// Middleware to block Customer accounts from accessing Admin routes
const requireAdminSiteAccess = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
  if (req.user.role === 'Customer') {
    return res.status(403).json({ error: 'Tài khoản Khách hàng không có quyền truy cập Trang quản trị (Admin Portal).' });
  }
  next();
};

// Middleware to check Manager permissions (Manager is allowed to create & edit products, banners, and orders)
const preventManagerMutations = (req, res, next) => {
  next();
};

// ---------- Registration ----------
router.post(
  '/register',
  [
    body('fullName').notEmpty().withMessage('Họ và tên không được để trống'),
    body('email').isEmail().withMessage('Email không hợp lệ'),
    body('password').isLength({ min: 6 }).withMessage('Mật khẩu phải ít nhất 6 ký tự'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fullName, email, phone, password, role } = req.body;
    const username = req.body.username || email;
    const userRole = role || 'Customer';

    try {
      // Check duplicate email or username
      const [existing] = await db.query(
        'SELECT id FROM tai_khoan_admin WHERE email = ? OR ten_dang_nhap = ?',
        [email, username]
      );
      if (existing.length > 0) {
        return res.status(409).json({ error: 'Email hoặc tên đăng nhập đã được đăng ký' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      
      // Check if so_dien_thoai column exists in table
      let hasPhoneCol = false;
      try {
        const [cols] = await db.query("SHOW COLUMNS FROM tai_khoan_admin LIKE 'so_dien_thoai'");
        hasPhoneCol = cols.length > 0;
      } catch (e) {}

      if (hasPhoneCol) {
        await db.query(
          'INSERT INTO tai_khoan_admin (ten_dang_nhap, mat_khau, ho_ten, email, so_dien_thoai, vai_tro) VALUES (?,?,?,?,?,?)',
          [username, passwordHash, fullName, email, phone || null, userRole]
        );
      } else {
        await db.query(
          'INSERT INTO tai_khoan_admin (ten_dang_nhap, mat_khau, ho_ten, email, vai_tro) VALUES (?,?,?,?,?)',
          [username, passwordHash, fullName, email, userRole]
        );
      }

      res.status(201).json({ message: 'Đăng ký tài khoản thành công! Vui lòng đăng nhập.' });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Lỗi hệ thống khi đăng ký. Vui lòng thử lại sau.' });
    }
  }
);

// ---------- Login ----------
router.post(
  '/login',
  [
    body('password').notEmpty().withMessage('Mật khẩu không được để trống'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const usernameOrEmail = req.body.usernameOrEmail || req.body.username || req.body.email;
    if (!usernameOrEmail) {
      return res.status(400).json({ error: 'Email hoặc số điện thoại không được để trống' });
    }

    const { password, rememberMe, clientType } = req.body;
    try {
      let query = 'SELECT * FROM tai_khoan_admin WHERE ten_dang_nhap = ? OR email = ?';
      let params = [usernameOrEmail, usernameOrEmail];
      
      // Check if so_dien_thoai column exists for searching by phone
      try {
        const [cols] = await db.query("SHOW COLUMNS FROM tai_khoan_admin LIKE 'so_dien_thoai'");
        if (cols.length > 0) {
          query = 'SELECT * FROM tai_khoan_admin WHERE ten_dang_nhap = ? OR email = ? OR so_dien_thoai = ?';
          params = [usernameOrEmail, usernameOrEmail, usernameOrEmail];
        }
      } catch (e) {}

      const [rows] = await db.query(query, params);
      if (rows.length === 0) {
        return res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không chính xác' });
      }
      const user = rows[0];

      // Blocked account check
      if (user.trang_thai === 'Blocked') {
        return res.status(403).json({ error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên.' });
      }

      // Admin check for client-side customer portal login request
      if (clientType === 'Customer' && (user.vai_tro === 'Admin' || user.vai_tro === 'Manager')) {
        return res.status(403).json({ error: 'Tài khoản Admin không thể đăng nhập ở đây. Vui lòng truy cập Trang quản trị (Admin Portal).' });
      }

      // Customer check for admin portal login request
      if ((clientType === 'Admin' || clientType !== 'Customer') && user.vai_tro === 'Customer') {
        return res.status(403).json({ error: 'Tài khoản Khách hàng không có quyền truy cập Trang quản trị (Admin Portal). Vui lòng đăng nhập tại Trang chủ.' });
      }

      let passwordMatch = false;
      try {
        passwordMatch = await bcrypt.compare(password, user.mat_khau);
      } catch (err) {}

      if (!passwordMatch && password === user.mat_khau) {
        passwordMatch = true;
      }

      if (!passwordMatch) {
        return res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không chính xác' });
      }

      const expiresIn = rememberMe ? JWT_REMEMBER_EXPIRES : JWT_EXPIRES_IN;
      const token = jwt.sign({ id: user.id, role: user.vai_tro }, SECRET_KEY, { expiresIn });

      res.json({
        message: 'Đăng nhập thành công',
        token,
        user: {
          id: user.id,
          fullName: user.ho_ten,
          username: user.ten_dang_nhap,
          email: user.email,
          phone: user.so_dien_thoai || '',
          role: user.vai_tro
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Lỗi máy chủ trong quá trình xử lý đăng nhập' });
    }
  }
);

// Protected route to get current user info
router.get('/me', verifyToken, async (req, res) => {
  try {
    let query = 'SELECT id, ten_dang_nhap, ho_ten, email, vai_tro FROM tai_khoan_admin WHERE id = ?';
    
    // Check if so_dien_thoai and dia_chi columns exist
    try {
      const [cols] = await db.query("SHOW COLUMNS FROM tai_khoan_admin");
      const colNames = cols.map(c => c.Field);
      let fields = ['id', 'ten_dang_nhap', 'ho_ten', 'email', 'vai_tro'];
      if (colNames.includes('so_dien_thoai')) fields.push('so_dien_thoai');
      if (colNames.includes('dia_chi')) fields.push('dia_chi');
      query = `SELECT ${fields.join(', ')} FROM tai_khoan_admin WHERE id = ?`;
    } catch (e) {}

    const [rows] = await db.query(query, [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = rows[0];
    res.json({
      id: user.id,
      fullName: user.ho_ten,
      username: user.ten_dang_nhap,
      email: user.email,
      phone: user.so_dien_thoai || '',
      address: user.dia_chi || '',
      role: user.vai_tro
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { fullName, phone, address } = req.body;
    if (!fullName) {
      return res.status(400).json({ error: 'Họ và tên không được để trống' });
    }

    // Auto-add so_dien_thoai & dia_chi columns if missing
    try {
      const [cols] = await db.query("SHOW COLUMNS FROM tai_khoan_admin");
      const colNames = cols.map(c => c.Field);
      if (!colNames.includes('so_dien_thoai')) {
        await db.query("ALTER TABLE tai_khoan_admin ADD COLUMN so_dien_thoai VARCHAR(30)");
      }
      if (!colNames.includes('dia_chi')) {
        await db.query("ALTER TABLE tai_khoan_admin ADD COLUMN dia_chi VARCHAR(255)");
      }
    } catch (e) {}

    await db.query(
      'UPDATE tai_khoan_admin SET ho_ten = ?, so_dien_thoai = ?, dia_chi = ? WHERE id = ?',
      [fullName, phone || null, address || null, req.user.id]
    );

    // Fetch updated user profile
    const [rows] = await db.query(
      'SELECT id, ten_dang_nhap, ho_ten, email, so_dien_thoai, dia_chi, vai_tro FROM tai_khoan_admin WHERE id = ?',
      [req.user.id]
    );
    const updated = rows[0];

    res.json({
      message: 'Cập nhật thông tin cá nhân thành công!',
      user: {
        id: updated.id,
        fullName: updated.ho_ten,
        username: updated.ten_dang_nhap,
        email: updated.email,
        phone: updated.so_dien_thoai || '',
        address: updated.dia_chi || '',
        role: updated.vai_tro
      }
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Lỗi khi cập nhật thông tin cá nhân' });
  }
});

// Change Password
router.put('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }

    const [rows] = await db.query('SELECT mat_khau FROM tai_khoan_admin WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
    
    const user = rows[0];
    let passwordMatch = false;
    try {
      passwordMatch = await bcrypt.compare(currentPassword, user.mat_khau);
    } catch (e) {}

    if (!passwordMatch && currentPassword === user.mat_khau) {
      passwordMatch = true;
    }

    if (!passwordMatch) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại không chính xác' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE tai_khoan_admin SET mat_khau = ? WHERE id = ?', [newHash, req.user.id]);

    res.json({ message: 'Đổi mật khẩu thành công!' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ khi đổi mật khẩu' });
  }
});

module.exports = { 
  router, 
  verifyToken, 
  requireRole, 
  verifyAdmin, 
  verifyAdminOrManager, 
  requireAdminSiteAccess, 
  preventManagerMutations 
};
