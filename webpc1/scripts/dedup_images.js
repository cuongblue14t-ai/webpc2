// dedup_images.js - Move duplicate product images to a backup folder
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PRODUCTS_DIR = path.resolve('C:/Users/admin/webpc1/uploads/products');
const DUP_DIR = path.join(PRODUCTS_DIR, 'duplicates');
if (!fs.existsSync(DUP_DIR)) fs.mkdirSync(DUP_DIR);

function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

(async () => {
  const files = fs.readdirSync(PRODUCTS_DIR).filter(f => {
    const full = path.join(PRODUCTS_DIR, f);
    return fs.statSync(full).isFile();
  });
  const seen = new Map(); // hash => filename

  for (const file of files) {
    const fullPath = path.join(PRODUCTS_DIR, file);
    const fileHash = await hashFile(fullPath);
    if (seen.has(fileHash)) {
      const dupPath = path.join(DUP_DIR, file);
      fs.renameSync(fullPath, dupPath);
      console.log(`Duplicate moved: ${file} (hash ${fileHash})`);
    } else {
      seen.set(fileHash, file);
      console.log(`Unique: ${file}`);
    }
  }

  console.log('\nDeduplication complete.');
  console.log(`Unique files kept: ${seen.size}`);
  console.log(`Duplicates moved to: ${DUP_DIR}`);
})();
