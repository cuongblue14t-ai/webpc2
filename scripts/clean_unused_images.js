// scripts/clean_unused_images.js
const fs = require('fs');
const path = require('path');
const db = require('../backend/db');

const PRODUCTS_DIR = path.resolve(__dirname, '../uploads/products');

// Protection list for default system images in uploads/products
const SYSTEM_DEFAULTS = new Set([
  'cpu_cooler.png',
  'cpu_pc.png',
  'cpu_server.png',
  'gpu.png',
  'mainboard_pc.png',
  'mainboard_server.png',
  'monitor.jpg',
  'pc_case.png',
  'psu.png',
  'ram_pc.png',
  'ram_server.png',
  'ssd.png'
]);

function getAllFilesRecursively(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFilesRecursively(fullPath));
    } else {
      results.push(fullPath);
    }
  });
  return results;
}

(async () => {
  try {
    console.log('Fetching image references from database...');
    // Query product images
    const [productImages] = await db.query('SELECT duong_dan FROM anh_san_pham');
    // Query category images
    let categoryImages = [];
    try {
      const [cats] = await db.query('SELECT hinh_anh FROM danh_muc');
      categoryImages = cats;
    } catch (e) {}
    // Query banner images (in case any stored in products/banners)
    let bannerImages = [];
    try {
      const [banners] = await db.query('SELECT hinh_anh FROM banner');
      bannerImages = banners;
    } catch (e) {
      // Banner table might be optional
    }

    const referencedFiles = new Set();

    const addReference = (url) => {
      if (!url || typeof url !== 'string') return;
      const clean = url.trim();
      // Normalize slashes
      const basename = path.basename(clean.split('?')[0]);
      if (basename) {
        referencedFiles.add(basename.toLowerCase());
      }
    };

    productImages.forEach(row => addReference(row.duong_dan));
    categoryImages.forEach(row => addReference(row.hinh_anh));
    bannerImages.forEach(row => addReference(row.hinh_anh));

    console.log(`Database references found: ${referencedFiles.size} unique filenames.`);

    const allFiles = getAllFilesRecursively(PRODUCTS_DIR);
    console.log(`Total files found in ${PRODUCTS_DIR}: ${allFiles.length}`);

    let deletedCount = 0;
    let deletedBytes = 0;
    let keptCount = 0;
    let keptBytes = 0;

    for (const filePath of allFiles) {
      const filename = path.basename(filePath);
      const filenameLower = filename.toLowerCase();

      const isSystemDefault = SYSTEM_DEFAULTS.has(filenameLower);
      const isReferenced = referencedFiles.has(filenameLower);

      if (!isReferenced && !isSystemDefault) {
        try {
          const stat = fs.statSync(filePath);
          deletedBytes += stat.size;
          fs.unlinkSync(filePath);
          deletedCount++;
        } catch (err) {
          console.error(`Failed to delete ${filePath}: ${err.message}`);
        }
      } else {
        try {
          const stat = fs.statSync(filePath);
          keptBytes += stat.size;
          keptCount++;
        } catch (err) {
          // ignore
        }
      }
    }

    // Clean up empty directories like 'duplicates' if empty
    const cleanEmptyDirs = (dir) => {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir);
      files.forEach(f => {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) {
          cleanEmptyDirs(full);
        }
      });
      if (fs.readdirSync(dir).length === 0 && dir !== PRODUCTS_DIR) {
        fs.rmdirSync(dir);
        console.log(`Removed empty directory: ${dir}`);
      }
    };
    cleanEmptyDirs(PRODUCTS_DIR);

    const formatSize = (bytes) => (bytes / (1024 * 1024)).toFixed(2) + ' MB';

    console.log('\n================ CLEANUP SUMMARY ================');
    console.log(`Files Deleted: ${deletedCount} (${formatSize(deletedBytes)})`);
    console.log(`Files Retained: ${keptCount} (${formatSize(keptBytes)})`);
    console.log('=================================================\n');

  } catch (err) {
    console.error('Error during cleanup execution:', err);
  } finally {
    await db.end();
  }
})();
