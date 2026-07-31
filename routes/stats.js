const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, requireRole } = require('./auth');

// Protect all stats endpoints to Admin and Manager only
router.use(verifyToken, requireRole('Admin', 'Manager'));

// Helper to extract date filters
function getDateRange(req) {
  let start = req.query.startDate;
  let end = req.query.endDate;
  
  if (!start) {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    start = d.toISOString().split('T')[0] + ' 00:00:00';
  } else {
    if (!start.includes(' ')) {
      start = start + ' 00:00:00';
    }
  }
  
  if (!end) {
    end = new Date().toISOString().split('T')[0] + ' 23:59:59';
  } else {
    if (!end.includes(' ')) {
      end = end + ' 23:59:59';
    }
  }
  
  return [start, end];
}

// 1. Overview KPIs
router.get('/overview', async (req, res) => {
  try {
    const [start, end] = getDateRange(req);
    
    // Total Orders
    const [ordersCount] = await db.query(
      'SELECT COUNT(*) AS total_orders FROM don_hang WHERE ngay_dat BETWEEN ? AND ?',
      [start, end]
    );
    
    // Total Revenue
    const [revenueSum] = await db.query(
      "SELECT SUM(tong_tien) AS total_revenue FROM don_hang WHERE trang_thai_don_hang = 'Hoàn thành' AND ngay_dat BETWEEN ? AND ?",
      [start, end]
    );
    
    // Completed Orders
    const [completedCount] = await db.query(
      "SELECT COUNT(*) AS completed_orders FROM don_hang WHERE trang_thai_don_hang = 'Hoàn thành' AND ngay_dat BETWEEN ? AND ?",
      [start, end]
    );
    
    // Cancelled Orders
    const [cancelledCount] = await db.query(
      "SELECT COUNT(*) AS cancelled_orders FROM don_hang WHERE trang_thai_don_hang = 'Hủy' AND ngay_dat BETWEEN ? AND ?",
      [start, end]
    );
    
    // Total Products Sold
    const [productsSoldSum] = await db.query(
      `SELECT SUM(ct.so_luong) AS products_sold 
       FROM chi_tiet_don_hang ct
       JOIN don_hang dh ON ct.id_don_hang = dh.id
       WHERE dh.trang_thai_don_hang = 'Hoàn thành' AND dh.ngay_dat BETWEEN ? AND ?`,
      [start, end]
    );

    const totalOrdersNum = ordersCount[0].total_orders || 0;
    const totalRevenueNum = Number(revenueSum[0].total_revenue) || 0;
    const completedOrdersNum = completedCount[0].completed_orders || 0;
    const cancelledOrdersNum = cancelledCount[0].cancelled_orders || 0;
    const productsSoldNum = Number(productsSoldSum[0].products_sold) || 0;

    // Calculate AOV & Completion Rate
    const averageOrderValue = completedOrdersNum > 0 ? Math.round(totalRevenueNum / completedOrdersNum) : 0;
    const completionRate = totalOrdersNum > 0 ? Math.round((completedOrdersNum / totalOrdersNum) * 100) : 0;
    
    res.json({
      totalOrders: totalOrdersNum,
      totalRevenue: totalRevenueNum,
      completedOrders: completedOrdersNum,
      cancelledOrders: cancelledOrdersNum,
      productsSold: productsSoldNum,
      averageOrderValue,
      completionRate
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Revenue By Date (for line chart)
router.get('/revenue-by-date', async (req, res) => {
  try {
    const [startStr, endStr] = getDateRange(req);
    const [rows] = await db.query(
      `SELECT DATE(ngay_dat) AS date, SUM(tong_tien) AS revenue
       FROM don_hang
       WHERE trang_thai_don_hang = 'Hoàn thành' AND ngay_dat BETWEEN ? AND ?
       GROUP BY DATE(ngay_dat)
       ORDER BY date ASC`,
      [startStr, endStr]
    );

    const revenueMap = {};
    rows.forEach(r => {
      let d = r.date;
      if (d instanceof Date) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        d = `${year}-${month}-${day}`;
      }
      revenueMap[d] = Number(r.revenue) || 0;
    });

    // Build continuous date array from start date to end date
    const result = [];
    const startDateObj = new Date(startStr.split(' ')[0]);
    const endDateObj = new Date(endStr.split(' ')[0]);

    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return res.json(Object.keys(revenueMap).map(d => ({ date: d, revenue: revenueMap[d] })));
    }

    const curr = new Date(startDateObj);
    while (curr <= endDateObj) {
      const year = curr.getFullYear();
      const month = String(curr.getMonth() + 1).padStart(2, '0');
      const day = String(curr.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      result.push({
        date: dateKey,
        revenue: revenueMap[dateKey] || 0
      });

      curr.setDate(curr.getDate() + 1);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Top Selling Products
router.get('/top-products', async (req, res) => {
  try {
    const [start, end] = getDateRange(req);
    const limit = parseInt(req.query.limit) || 10;
    
    const [rows] = await db.query(
      `SELECT sp.id, sp.ten_san_pham, sp.so_luong AS ton_kho, dm.ten_danh_muc,
              SUM(ct.so_luong) AS total_sold, SUM(ct.so_luong * ct.don_gia) AS total_revenue
       FROM chi_tiet_don_hang ct
       JOIN don_hang dh ON ct.id_don_hang = dh.id
       JOIN san_pham sp ON ct.id_san_pham = sp.id
       LEFT JOIN danh_muc dm ON sp.id_danh_muc = dm.id
       WHERE dh.trang_thai_don_hang = 'Hoàn thành' AND dh.ngay_dat BETWEEN ? AND ?
       GROUP BY sp.id, sp.ten_san_pham, sp.so_luong, dm.ten_danh_muc
       ORDER BY total_sold DESC
       LIMIT ?`,
      [start, end, limit]
    );
    
    res.json(rows.map(r => ({
      id: r.id,
      name: r.ten_san_pham,
      category: r.ten_danh_muc || 'N/A',
      stock: r.ton_kho,
      totalSold: Number(r.total_sold) || 0,
      totalRevenue: Number(r.total_revenue) || 0
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Order Status Distribution
router.get('/order-status-distribution', async (req, res) => {
  try {
    const [start, end] = getDateRange(req);
    const [rows] = await db.query(
      `SELECT trang_thai_don_hang AS status, COUNT(*) AS count
       FROM don_hang
       WHERE ngay_dat BETWEEN ? AND ?
       GROUP BY trang_thai_don_hang`,
      [start, end]
    );
    
    res.json(rows.map(r => ({
      status: r.status || 'Mới',
      count: Number(r.count) || 0
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Category Revenue Distribution (Donut Chart)
router.get('/category-revenue', async (req, res) => {
  try {
    const [start, end] = getDateRange(req);
    const [rows] = await db.query(
      `SELECT COALESCE(dm.ten_danh_muc, 'Khác') AS category,
              SUM(ct.so_luong * ct.don_gia) AS revenue,
              SUM(ct.so_luong) AS total_sold
       FROM chi_tiet_don_hang ct
       JOIN don_hang dh ON ct.id_don_hang = dh.id
       JOIN san_pham sp ON ct.id_san_pham = sp.id
       LEFT JOIN danh_muc dm ON sp.id_danh_muc = dm.id
       WHERE dh.trang_thai_don_hang = 'Hoàn thành' AND dh.ngay_dat BETWEEN ? AND ?
       GROUP BY dm.id, dm.ten_danh_muc
       ORDER BY revenue DESC`,
      [start, end]
    );

    res.json(rows.map(r => ({
      category: r.category,
      revenue: Number(r.revenue) || 0,
      totalSold: Number(r.total_sold) || 0
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Low Stock Alert Products (stock <= threshold)
router.get('/low-stock', async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 5;
    const [rows] = await db.query(
      `SELECT sp.id, sp.ten_san_pham, sp.so_luong, sp.gia, dm.ten_danh_muc
       FROM san_pham sp
       LEFT JOIN danh_muc dm ON sp.id_danh_muc = dm.id
       WHERE sp.is_deleted = 0 AND sp.so_luong <= ?
       ORDER BY sp.so_luong ASC`,
      [threshold]
    );

    res.json(rows.map(r => ({
      id: r.id,
      name: r.ten_san_pham,
      category: r.ten_danh_muc || 'N/A',
      price: r.gia,
      stock: r.so_luong
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Export Sales Statistics CSV
router.get('/export', async (req, res) => {
  try {
    const [start, end] = getDateRange(req);
    const [orders] = await db.query(
      `SELECT dh.id, COALESCE(dh.ten_khach_hang, '') AS ho_ten, dh.so_dien_thoai, dh.email, dh.tong_tien, dh.phuong_thuc_thanh_toan, dh.trang_thai_don_hang, dh.ngay_dat
       FROM don_hang dh
       WHERE dh.ngay_dat BETWEEN ? AND ?
       ORDER BY dh.ngay_dat DESC`,
      [start, end]
    );

    let csv = '\uFEFFMã đơn,Khách hàng,Số điện thoại,Email,Tổng tiền (VNĐ),Phương thức thanh toán,Trạng thái,Ngày đặt\n';
    orders.forEach(o => {
      const dateStr = new Date(o.ngay_dat).toLocaleString('vi-VN').replace(/,/g, '');
      csv += `"${o.id}","${o.ho_ten.replace(/"/g, '""')}","${o.so_dien_thoai || ''}","${o.email || ''}","${o.tong_tien}","${o.phuong_thuc_thanh_toan || ''}","${o.trang_thai_don_hang}","${dateStr}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=bao_cao_ban_hang_${Date.now()}.csv`);
    res.status(200).send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
