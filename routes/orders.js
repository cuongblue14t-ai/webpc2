const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, requireRole, verifyAdmin, verifyAdminOrManager, preventManagerMutations } = require('./auth');

// Helper function to calculate total from DB directly for security
async function calculateOrderTotal(items) {
  let total = 0;
  for (const item of items) {
    const [rows] = await db.query('SELECT gia, gia_khuyen_mai FROM san_pham WHERE id = ? AND is_deleted = 0', [item.id]);
    if (rows.length > 0) {
      const product = rows[0];
      const price = (product.gia_khuyen_mai && product.gia_khuyen_mai < product.gia) ? product.gia_khuyen_mai : product.gia;
      total += price * item.quantity;
    } else {
      throw new Error(`Sản phẩm với ID ${item.id} không tồn tại.`);
    }
  }
  return total;
}

// GET my orders (Logged-in Customer)
router.get('/my-orders', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [users] = await db.query('SELECT email, so_dien_thoai FROM tai_khoan_admin WHERE id = ?', [userId]);
    const user = users[0] || {};

    let query = 'SELECT * FROM don_hang WHERE 1=0';
    let params = [];

    const conditions = ['id_tai_khoan = ?'];
    params.push(userId);

    if (user.so_dien_thoai) {
      conditions.push('so_dien_thoai = ?');
      params.push(user.so_dien_thoai);
    }
    if (user.email) {
      conditions.push('email = ?');
      params.push(user.email);
    }

    query = `SELECT * FROM don_hang WHERE ${conditions.join(' OR ')} ORDER BY ngay_dat DESC`;

    const [orders] = await db.query(query, params);

    // Fetch items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const [items] = await db.query(
          `SELECT ct.*, sp.ten_san_pham, 
                  COALESCE((SELECT duong_dan FROM anh_san_pham WHERE id_san_pham = sp.id ORDER BY anh_chinh DESC, id ASC LIMIT 1), '') AS duong_dan_anh 
           FROM chi_tiet_don_hang ct 
           LEFT JOIN san_pham sp ON ct.id_san_pham = sp.id 
           WHERE ct.id_don_hang = ?`,
          [order.id]
        );
        return {
          id: order.id,
          ho_ten: order.ten_khach_hang,
          email: order.email,
          so_dien_thoai: order.so_dien_thoai,
          dia_chi: order.dia_chi,
          tong_tien: order.tong_tien,
          trang_thai: order.trang_thai_don_hang || 'Mới',
          phuong_thuc_thanh_toan: order.phuong_thuc_thanh_toan,
          phuong_thuc_nhan_hang: order.phuong_thuc_nhan_hang,
          ngay_dat: order.ngay_dat,
          ghi_chu: order.ghi_chu,
          items
        };
      })
    );

    res.json(ordersWithItems);
  } catch (error) {
    console.error('Fetch my-orders error:', error);
    res.status(500).json({ error: 'Lỗi máy chủ khi lấy danh sách đơn hàng' });
  }
});

// CREATE a new order (Checkout)
router.post('/', async (req, res) => {
  const connection = await db.getConnection();
  try {
    let { ho_ten, email, so_dien_thoai, dia_chi, ghi_chu, phuong_thuc_nhan_hang, phuong_thuc_thanh_toan, items, userId } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Giỏ hàng trống.' });
    }

    if (!ho_ten || !so_dien_thoai || !dia_chi) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ Họ tên, Số điện thoại và Địa chỉ giao hàng.' });
    }

    let finalUserId = userId || null;
    let finalEmail = email || null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_jwt_key_2026');
        if (decoded && decoded.id) {
          finalUserId = decoded.id;
          if (!finalEmail && decoded.email) finalEmail = decoded.email;
        }
      } catch (e) {
        // ignore token decode errors for guest checkout
      }
    }

    if (finalUserId) {
      const [uRows] = await connection.query('SELECT email, so_dien_thoai FROM tai_khoan_admin WHERE id = ?', [finalUserId]);
      if (uRows.length > 0) {
        if (!finalEmail) finalEmail = uRows[0].email;
        // Update user phone number if missing in user profile
        if (so_dien_thoai && !uRows[0].so_dien_thoai) {
          await connection.query('UPDATE tai_khoan_admin SET so_dien_thoai = ? WHERE id = ?', [so_dien_thoai, finalUserId]);
        }
      }
    }

    await connection.beginTransaction();

    // Check stock for all items first
    for (const item of items) {
      const [pRows] = await connection.query('SELECT so_luong, ten_san_pham FROM san_pham WHERE id = ? AND is_deleted = 0', [item.id]);
      if (!pRows || pRows.length === 0) {
        throw new Error(`Sản phẩm với ID ${item.id} không tồn tại hoặc đã bị xóa.`);
      }
      const p = pRows[0];
      if (p.so_luong < item.quantity) {
        throw new Error(`Sản phẩm "${p.ten_san_pham}" chỉ còn ${p.so_luong} món trong kho (bạn đặt ${item.quantity} món).`);
      }
    }

    // 1. Calculate total securely
    const totalAmount = await calculateOrderTotal(items);

    // 2. Insert into don_hang
    const [orderResult] = await connection.query(
      `INSERT INTO don_hang (id_tai_khoan, ten_khach_hang, email, so_dien_thoai, dia_chi, ghi_chu, phuong_thuc_nhan_hang, phuong_thuc_thanh_toan, trang_thai_don_hang, tong_tien, ngay_dat) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Mới', ?, NOW())`,
      [
        finalUserId, 
        ho_ten, 
        finalEmail, 
        so_dien_thoai, 
        dia_chi, 
        ghi_chu || '', 
        phuong_thuc_nhan_hang || 'Giao hàng tận nơi', 
        phuong_thuc_thanh_toan || 'COD', 
        totalAmount
      ]
    );
    
    const orderId = orderResult.insertId;

    // 3. Insert into chi_tiet_don_hang & deduct stock
    for (const item of items) {
      const [pRows] = await connection.query('SELECT gia, gia_khuyen_mai FROM san_pham WHERE id = ? AND is_deleted = 0', [item.id]);
      const p = pRows[0];
      const price = (p && p.gia_khuyen_mai && p.gia_khuyen_mai < p.gia) ? p.gia_khuyen_mai : (p ? p.gia : 0);
      
      await connection.query(
        `INSERT INTO chi_tiet_don_hang (id_don_hang, id_san_pham, so_luong, don_gia) VALUES (?, ?, ?, ?)`,
        [orderId, item.id, item.quantity, price]
      );

      // Trừ số lượng tồn kho sản phẩm trong bảng san_pham
      await connection.query(
        `UPDATE san_pham SET so_luong = GREATEST(0, so_luong - ?) WHERE id = ?`,
        [item.quantity, item.id]
      );
    }

    // 4. Log customer purchase activity to history for Admin Notification Bell
    let historyUserId = null;
    if (finalUserId) {
      const [uRows] = await connection.query('SELECT id FROM tai_khoan_admin WHERE id = ?', [finalUserId]);
      if (uRows.length > 0) historyUserId = finalUserId;
    }

    const formattedTotal = Number(totalAmount).toLocaleString('vi-VN');
    const customerInfo = ho_ten ? ho_ten : (so_dien_thoai || 'Khách hàng');
    const actionName = 'Đặt hàng mới';
    const detailMsg = `Khách hàng ${customerInfo} vừa đặt thành công đơn hàng #${orderId} (${items.length} sản phẩm - Tổng: ${formattedTotal}đ).`;

    await connection.query(
      'INSERT INTO lich_su_chinh_sua_san_pham (id_san_pham, id_tai_khoan, hanh_dong, chi_tiet_thay_doi, ngay_tao) VALUES (NULL, ?, ?, ?, NOW())',
      [historyUserId, actionName, detailMsg]
    );

    await connection.commit();
    res.status(201).json({ message: 'Đặt hàng thành công!', orderId: orderId });
  } catch (error) {
    await connection.rollback();
    console.error('Order Checkout Error:', error);
    res.status(500).json({ error: 'Có lỗi xảy ra khi xử lý đơn hàng: ' + error.message });
  } finally {
    connection.release();
  }
});

// GET sold products stats from completed orders (Admin & Manager)
router.get('/stats/sold-products', verifyToken, requireRole('Admin', 'Manager'), async (req, res) => {
  try {
    let whereClause = "WHERE dh.trang_thai_don_hang = 'Hoàn thành'";
    let params = [];

    if (req.query.startDate) {
      let start = req.query.startDate;
      if (!start.includes(' ')) start += ' 00:00:00';
      whereClause += " AND dh.ngay_dat >= ?";
      params.push(start);
    }
    if (req.query.endDate) {
      let end = req.query.endDate;
      if (!end.includes(' ')) end += ' 23:59:59';
      whereClause += " AND dh.ngay_dat <= ?";
      params.push(end);
    }

    const [rows] = await db.query(`
      SELECT 
        sp.id AS id_san_pham,
        sp.ten_san_pham,
        dm.ten_danh_muc,
        sp.gia,
        SUM(ct.so_luong) AS tong_so_luong_ban,
        SUM(ct.so_luong * ct.don_gia) AS tong_doanh_thu_mang_lai,
        COALESCE((SELECT duong_dan FROM anh_san_pham WHERE id_san_pham = sp.id ORDER BY anh_chinh DESC, id ASC LIMIT 1), '') AS duong_dan_anh
      FROM chi_tiet_don_hang ct
      JOIN don_hang dh ON ct.id_don_hang = dh.id
      JOIN san_pham sp ON ct.id_san_pham = sp.id
      LEFT JOIN danh_muc dm ON sp.id_danh_muc = dm.id
      ${whereClause}
      GROUP BY sp.id, sp.ten_san_pham, dm.ten_danh_muc, sp.gia
      ORDER BY tong_so_luong_ban DESC
    `, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching sold products stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET all orders (Admin & Manager)
router.get('/', verifyToken, requireRole('Admin', 'Manager'), async (req, res) => {
  try {
    const [orders] = await db.query('SELECT * FROM don_hang ORDER BY ngay_dat DESC');
    res.json(orders.map(o => ({
      id: o.id,
      ho_ten: o.ten_khach_hang,
      email: o.email,
      so_dien_thoai: o.so_dien_thoai,
      dia_chi: o.dia_chi,
      tong_tien: o.tong_tien,
      trang_thai: o.trang_thai_don_hang || 'Mới',
      phuong_thuc_thanh_toan: o.phuong_thuc_thanh_toan,
      phuong_thuc_nhan_hang: o.phuong_thuc_nhan_hang,
      ngay_dat: o.ngay_dat,
      ghi_chu: o.ghi_chu,
      id_tai_khoan: o.id_tai_khoan
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET order details by ID (Admin & Manager)
router.get('/:id', verifyToken, requireRole('Admin', 'Manager'), async (req, res) => {
  try {
    const [orders] = await db.query('SELECT * FROM don_hang WHERE id = ?', [req.params.id]);
    if (orders.length === 0) return res.status(404).json({ error: 'Order not found' });
    
    const [items] = await db.query(
      `SELECT ct.*, sp.ten_san_pham, 
              COALESCE((SELECT duong_dan FROM anh_san_pham WHERE id_san_pham = sp.id ORDER BY anh_chinh DESC, id ASC LIMIT 1), '') AS duong_dan_anh 
       FROM chi_tiet_don_hang ct 
       LEFT JOIN san_pham sp ON ct.id_san_pham = sp.id 
       WHERE ct.id_don_hang = ?`, 
      [req.params.id]
    );
    
    const o = orders[0];
    res.json({
      order: {
        id: o.id,
        ho_ten: o.ten_khach_hang,
        email: o.email,
        so_dien_thoai: o.so_dien_thoai,
        dia_chi: o.dia_chi,
        tong_tien: o.tong_tien,
        trang_thai: o.trang_thai_don_hang || 'Mới',
        phuong_thuc_thanh_toan: o.phuong_thuc_thanh_toan,
        phuong_thuc_nhan_hang: o.phuong_thuc_nhan_hang,
        ngay_dat: o.ngay_dat,
        ghi_chu: o.ghi_chu
      },
      items: items
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE order status (Admin & Manager write blocked by middleware)
router.put('/:id/status', verifyToken, verifyAdminOrManager, async (req, res) => {
  try {
    const { trang_thai } = req.body;
    const validStatuses = ['Mới', 'Đang xử lý', 'Hoàn thành', 'Hủy'];
    if (!validStatuses.includes(trang_thai)) {
      return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
    }

    const [oldOrders] = await db.query('SELECT trang_thai_don_hang FROM don_hang WHERE id = ?', [req.params.id]);
    if (oldOrders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const oldStatus = oldOrders[0].trang_thai_don_hang || 'Mới';

    // Hoàn kho nếu đơn bị hủy, hoặc trừ lại kho nếu khôi phục đơn từ trạng thái Hủy
    if (oldStatus !== 'Hủy' && trang_thai === 'Hủy') {
      const [items] = await db.query('SELECT id_san_pham, so_luong FROM chi_tiet_don_hang WHERE id_don_hang = ?', [req.params.id]);
      for (const item of items) {
        await db.query('UPDATE san_pham SET so_luong = so_luong + ? WHERE id = ?', [item.so_luong, item.id_san_pham]);
      }
    } else if (oldStatus === 'Hủy' && trang_thai !== 'Hủy') {
      const [items] = await db.query('SELECT id_san_pham, so_luong FROM chi_tiet_don_hang WHERE id_don_hang = ?', [req.params.id]);
      for (const item of items) {
        await db.query('UPDATE san_pham SET so_luong = GREATEST(0, so_luong - ?) WHERE id = ?', [item.so_luong, item.id_san_pham]);
      }
    }

    const [result] = await db.query(
      'UPDATE don_hang SET trang_thai_don_hang = ? WHERE id = ?',
      [trang_thai, req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Log to history
    await db.execute(
      'INSERT INTO lich_su_chinh_sua_san_pham (id_san_pham, id_tai_khoan, hanh_dong, chi_tiet_thay_doi) VALUES (NULL, ?, ?, ?)',
      [req.user.id, 'Cập nhật đơn hàng', `Cập nhật trạng thái đơn hàng #${req.params.id} từ "${oldStatus}" thành "${trang_thai}".`]
    );

    res.json({ message: 'Cập nhật trạng thái thành công', trang_thai });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// BULK DELETE orders (ADMIN ONLY)
router.delete('/bulk-delete', verifyToken, verifyAdmin, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Danh sách ID đơn hàng cần xóa không hợp lệ.' });
    }

    await connection.beginTransaction();

    // Hoàn lại tồn kho cho các đơn hàng chưa bị hủy trước khi xóa
    const [itemsToRestore] = await connection.query(
      `SELECT ct.id_san_pham, ct.so_luong 
       FROM chi_tiet_don_hang ct 
       JOIN don_hang dh ON ct.id_don_hang = dh.id 
       WHERE ct.id_don_hang IN (?) AND dh.trang_thai_don_hang != 'Hủy'`,
      [ids]
    );
    for (const item of itemsToRestore) {
      await connection.query('UPDATE san_pham SET so_luong = so_luong + ? WHERE id = ?', [item.so_luong, item.id_san_pham]);
    }

    // Delete items in chi_tiet_don_hang first
    await connection.query('DELETE FROM chi_tiet_don_hang WHERE id_don_hang IN (?)', [ids]);
    // Delete orders from don_hang
    const [result] = await connection.query('DELETE FROM don_hang WHERE id IN (?)', [ids]);
    await connection.commit();

    // Log action
    try {
      await db.execute(
        'INSERT INTO lich_su_chinh_sua_san_pham (id_san_pham, id_tai_khoan, hanh_dong, chi_tiet_thay_doi) VALUES (NULL, ?, ?, ?)',
        [req.user.id, 'Xóa hàng loạt đơn hàng', `Đã xóa ${result.affectedRows} đơn hàng (ID: ${ids.join(', ')}).`]
      );
    } catch (e) {}

    res.json({ message: `Đã xóa thành công ${result.affectedRows} đơn hàng!`, affectedRows: result.affectedRows });
  } catch (error) {
    await connection.rollback();
    console.error('Bulk delete orders error:', error);
    res.status(500).json({ error: 'Có lỗi xảy ra khi xóa đơn hàng: ' + error.message });
  } finally {
    connection.release();
  }
});

// DELETE single order by ID (ADMIN ONLY)
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const orderId = req.params.id;
    await connection.beginTransaction();

    // Hoàn lại tồn kho cho đơn hàng chưa bị hủy trước khi xóa
    const [itemsToRestore] = await connection.query(
      `SELECT ct.id_san_pham, ct.so_luong 
       FROM chi_tiet_don_hang ct 
       JOIN don_hang dh ON ct.id_don_hang = dh.id 
       WHERE ct.id_don_hang = ? AND dh.trang_thai_don_hang != 'Hủy'`,
      [orderId]
    );
    for (const item of itemsToRestore) {
      await connection.query('UPDATE san_pham SET so_luong = so_luong + ? WHERE id = ?', [item.so_luong, item.id_san_pham]);
    }

    await connection.query('DELETE FROM chi_tiet_don_hang WHERE id_don_hang = ?', [orderId]);
    const [result] = await connection.query('DELETE FROM don_hang WHERE id = ?', [orderId]);
    await connection.commit();

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng cần xóa' });
    }

    // Log action
    try {
      await db.execute(
        'INSERT INTO lich_su_chinh_sua_san_pham (id_san_pham, id_tai_khoan, hanh_dong, chi_tiet_thay_doi) VALUES (NULL, ?, ?, ?)',
        [req.user.id, 'Xóa đơn hàng', `Đã xóa đơn hàng #${orderId}.`]
      );
    } catch (e) {}

    res.json({ message: `Đã xóa thành công đơn hàng #${orderId}!` });
  } catch (error) {
    await connection.rollback();
    console.error('Delete order error:', error);
    res.status(500).json({ error: 'Có lỗi xảy ra khi xóa đơn hàng: ' + error.message });
  } finally {
    connection.release();
  }
});

// MANUAL SYNC EXISTING ORDERS TO HISTORY NOTIFICATIONS (ADMIN ONLY)
router.post('/sync-history', verifyToken, verifyAdmin, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [orders] = await connection.query('SELECT * FROM don_hang');
    let syncedCount = 0;
    for (const order of orders) {
      const detailMsgPart = `đơn hàng #${order.id}`;
      const [existingLogs] = await connection.query(
        'SELECT id FROM lich_su_chinh_sua_san_pham WHERE chi_tiet_thay_doi LIKE ? AND hanh_dong = "Đặt hàng mới"',
        [`%${detailMsgPart}%`]
      );

      if (existingLogs.length === 0) {
        let historyUserId = null;
        if (order.id_tai_khoan) {
          const [uRows] = await connection.query('SELECT id FROM tai_khoan_admin WHERE id = ?', [order.id_tai_khoan]);
          if (uRows.length > 0) historyUserId = order.id_tai_khoan;
        }

        const formattedTotal = Number(order.tong_tien || 0).toLocaleString('vi-VN');
        const customerInfo = order.ten_khach_hang ? order.ten_khach_hang : (order.so_dien_thoai || 'Khách hàng');
        const actionName = 'Đặt hàng mới';
        const detailMsg = `Khách hàng ${customerInfo} vừa đặt thành công đơn hàng #${order.id} (Tổng: ${formattedTotal}đ).`;

        await connection.query(
          'INSERT INTO lich_su_chinh_sua_san_pham (id_san_pham, id_tai_khoan, hanh_dong, chi_tiet_thay_doi, ngay_tao) VALUES (NULL, ?, ?, ?, ?)',
          [historyUserId, actionName, detailMsg, order.ngay_dat || new Date()]
        );
        syncedCount++;
      }
    }
    res.json({ message: `Đã đồng bộ ${syncedCount} đơn hàng cũ vào thông báo hoạt động!`, syncedCount });
  } catch (error) {
    console.error('Sync history error:', error);
    res.status(500).json({ error: 'Lỗi khi đồng bộ đơn hàng: ' + error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
