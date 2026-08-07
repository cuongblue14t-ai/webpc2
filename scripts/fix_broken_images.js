// scripts/fix_broken_images.js
const db = require('../backend/db');
const https = require('https');
const http = require('http');

const CATEGORY_DEFAULTS = {
  'CPU SEVER': '/uploads/products/cpu_server.png',
  'CPU PC': '/uploads/products/cpu_pc.png',
  'MAINBOARD PC': '/uploads/products/mainboard_pc.png',
  'MAINBOARD SEVER': '/uploads/products/mainboard_server.png',
  'RAM PC': '/uploads/products/ram_pc.png',
  'RAM SEVER': '/uploads/products/ram_server.png',
  'Ổ CỨNG SSD': '/uploads/products/ssd.png',
  'MÀN HÌNH MÁY TÍNH': '/uploads/products/monitor.jpg',
  'CARD ĐỒ HỌA': '/uploads/products/gpu.png',
  'NGUỒN MÁY TÍNH': '/uploads/products/psu.png',
  'TẢN NHIỆT CPU': '/uploads/products/cpu_cooler.png',
  'VỎ MÁY TÍNH': '/uploads/products/pc_case.png'
};

function checkUrl(targetUrl, redirects = 0) {
  if (!targetUrl || !targetUrl.startsWith('http')) return Promise.resolve(true); // local path is valid
  if (redirects > 4) return Promise.resolve(false);

  return new Promise((resolve) => {
    try {
      const client = targetUrl.startsWith('https') ? https : http;
      const req = client.get(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let redirectUrl = res.headers.location;
          if (!redirectUrl.startsWith('http')) {
            const parsed = new URL(targetUrl);
            redirectUrl = `${parsed.protocol}//${parsed.host}${redirectUrl}`;
          }
          if (redirectUrl.includes('accounts.google.com/ServiceLogin') || redirectUrl.includes('ServiceLogin')) {
            return resolve(false); // Requires Google login
          }
          return checkUrl(redirectUrl, redirects + 1).then(resolve);
        }
        if (res.statusCode === 200) {
          const contentType = res.headers['content-type'] || '';
          if (contentType.includes('text/html')) {
            return resolve(false); // Got HTML sign-in page
          }
          return resolve(true);
        }
        resolve(false);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(1500, () => {
        req.destroy();
        resolve(false);
      });
    } catch (e) {
      resolve(false);
    }
  });
}

(async () => {
  try {
    console.log('Testing image URLs in database...');
    const [rows] = await db.query(`
      SELECT a.id, a.duong_dan, dm.ten_danh_muc, sp.ten_san_pham 
      FROM anh_san_pham a
      JOIN san_pham sp ON a.id_san_pham = sp.id
      LEFT JOIN danh_muc dm ON sp.id_danh_muc = dm.id
    `);

    console.log(`Found ${rows.length} total image records.`);

    let validCount = 0;
    let fixedCount = 0;

    // Process in batches of 25
    const BATCH_SIZE = 25;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (row) => {
          const ok = await checkUrl(row.duong_dan);
          return { row, ok };
        })
      );

      for (const { row, ok } of results) {
        if (ok) {
          validCount++;
        } else {
          const fallback = CATEGORY_DEFAULTS[row.ten_danh_muc] || '/uploads/products/cpu_pc.png';
          await db.execute('UPDATE anh_san_pham SET duong_dan = ? WHERE id = ?', [fallback, row.id]);
          console.log(`[Fixed ID ${row.id}] "${row.ten_san_pham}" -> fallback: ${fallback}`);
          fixedCount++;
        }
      }
    }

    console.log('\n================ FIX SUMMARY ================');
    console.log(`Valid Image Links Kept: ${validCount}`);
    console.log(`Broken Images Fixed with Category Defaults: ${fixedCount}`);
    console.log('=============================================\n');

  } catch (err) {
    console.error('Error fixing broken images:', err);
  } finally {
    await db.end();
  }
})();
