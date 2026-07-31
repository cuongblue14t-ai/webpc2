const db = require('./db');

const productsData = [];

// Sample Banners
const bannersData = [
  {
    tieu_de: 'Nam Nguyễn PC & Workstation - Giới Thiệu Doanh Nghiệp & Giải Pháp Công Nghệ',
    hinh_anh: 'banner_nam_nguyen_1.png',
    lien_ket: 'about.html',
    vi_tri: 1,
    trang_thai: 1
  },
  {
    tieu_de: 'Nam Nguyễn PC & Workstation - Trải Nghiệm Đỉnh Cao',
    hinh_anh: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=1920&h=600&fit=crop',
    lien_ket: 'products.html',
    vi_tri: 2,
    trang_thai: 1
  },
  {
    tieu_de: 'Siêu Ưu Đãi Cấu Hình Gaming & Workstation AI 2026',
    hinh_anh: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1920&h=600&fit=crop',
    lien_ket: 'promotions.html?campaign=quoc-khanh-2-9',
    vi_tri: 3,
    trang_thai: 1
  }
];

async function seed() {
  const conn = await db.getConnection();
  try {
    console.log('🚀 Starting Data Synchronization & Seeding...');
    await conn.beginTransaction();

    // 1. Seed Banners
    console.log('📦 Seeding Banners...');
    for (const b of bannersData) {
      const [existing] = await conn.query('SELECT id FROM banner WHERE tieu_de = ?', [b.tieu_de]);
      if (existing.length === 0) {
        await conn.query(
          'INSERT INTO banner (tieu_de, hinh_anh, lien_ket, vi_tri, trang_thai) VALUES (?,?,?,?,?)',
          [b.tieu_de, b.hinh_anh, b.lien_ket, b.vi_tri, b.trang_thai]
        );
      }
    }

    // 2. Update Product 21 tags
    await conn.query('UPDATE san_pham SET is_noi_bat = 1, is_ban_chay = 1, is_flash_sale = 1 WHERE id = 21');

    // 3. Seed Products
    console.log('🛒 Seeding Products & Specifications...');
    for (const p of productsData) {
      // Check duplicate
      const [dup] = await conn.query('SELECT id FROM san_pham WHERE ten_san_pham = ? AND is_deleted = 0', [p.ten_san_pham]);
      let productId = null;
      if (dup.length > 0) {
        productId = dup[0].id;
        // Update tags
        await conn.query(
          `UPDATE san_pham SET 
             id_danh_muc = ?, hang_san_xuat = ?, mo_ta = ?, gia = ?, gia_khuyen_mai = ?,
             so_luong = ?, is_noi_bat = ?, is_ban_chay = ?, is_flash_sale = ?
           WHERE id = ?`,
          [
            p.id_danh_muc, p.hang_san_xuat, p.mo_ta, p.gia, p.gia_khuyen_mai,
            p.so_luong, p.is_noi_bat, p.is_ban_chay, p.is_flash_sale, productId
          ]
        );
      } else {
        const [res] = await conn.query(
          `INSERT INTO san_pham 
             (id_danh_muc, ten_san_pham, hang_san_xuat, mo_ta, gia, gia_khuyen_mai, so_luong, trang_thai, is_noi_bat, is_ban_chay, is_flash_sale)
           VALUES (?,?,?,?,?,?,?,1,?,?,?)`,
          [
            p.id_danh_muc, p.ten_san_pham, p.hang_san_xuat, p.mo_ta, p.gia, p.gia_khuyen_mai,
            p.so_luong, p.is_noi_bat, p.is_ban_chay, p.is_flash_sale
          ]
        );
        productId = res.insertId;
      }

      // Re-seed Images
      await conn.query('DELETE FROM anh_san_pham WHERE id_san_pham = ?', [productId]);
      for (let i = 0; i < p.images.length; i++) {
        await conn.query(
          'INSERT INTO anh_san_pham (id_san_pham, duong_dan, anh_chinh) VALUES (?, ?, ?)',
          [productId, p.images[i], i === 0 ? 1 : 0]
        );
      }

      // Re-seed Specs
      await conn.query('DELETE FROM thong_so_san_pham WHERE id_san_pham = ?', [productId]);
      for (const [key, val] of Object.entries(p.specs)) {
        await conn.query(
          'INSERT INTO thong_so_san_pham (id_san_pham, ten_thong_so, gia_tri) VALUES (?, ?, ?)',
          [productId, key, val]
        );
      }
    }

    await conn.commit();
    console.log('✅ SEEDING COMPLETE! All categories & products successfully synchronized.');
  } catch (err) {
    await conn.rollback();
    console.error('❌ Seeding failed:', err);
  } finally {
    conn.release();
    process.exit();
  }
}

seed();
