const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

/**
 * Helper to convert Google Drive sharing links to direct embed URLs
 * Converts all Google Drive formats (/file/d/, open?id=, uc?id=, thumbnail?id=, lh3)
 * into standardized thumbnail embed URL (https://drive.google.com/thumbnail?id=...&sz=w1600)
 */
function convertGoogleDriveLink(url) {
  if (!url) return '';
  let trimmed = url.trim();
  // Strip leading numbering or bullet points like "1. ", "1 - ", "* ", "- "
  trimmed = trimmed.replace(/^[\d\s*•\-\.\)\:]+/, '').trim();
  // Strip outer quotes if any
  trimmed = trimmed.replace(/^["']|["']$/g, '').trim();

  if (trimmed.startsWith('uploads/')) trimmed = '/' + trimmed;

  const fileIdMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]{20,})/i) ||
                      trimmed.match(/[?&]id=([a-zA-Z0-9_-]{20,})/i) ||
                      trimmed.match(/\/d\/([a-zA-Z0-9_-]{20,})/i);

  if (fileIdMatch && (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com') || trimmed.includes('googleusercontent.com'))) {
    return `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}&sz=w1600`;
  }
  return trimmed;
}

/**
 * Download external image (Google Drive or Web URL) to local uploads directory
 * Returns local relative path (e.g. '/uploads/products/img_123_456.jpg') or normalized URL as fallback
 */
async function mirrorExternalImage(url, subfolder = 'products') {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // If already a local upload path, return as is
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')) {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }

  const normalizedUrl = convertGoogleDriveLink(trimmed);

  try {
    const uploadDir = path.join(__dirname, '..', '..', 'uploads', subfolder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const tempFilename = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
    const tempDestPath = path.join(uploadDir, tempFilename);

    // Download file helper supporting redirects (for Google Drive thumbnails)
    const download = (targetUrl, redirects = 0) => {
      if (redirects > 5) return Promise.reject(new Error('Too many redirects'));
      return new Promise((resolve, reject) => {
        const client = targetUrl.startsWith('https') ? https : http;
        const request = client.get(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
          }
        }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            let redirectUrl = res.headers.location;
            if (!redirectUrl.startsWith('http')) {
              const parsed = new URL(targetUrl);
              redirectUrl = `${parsed.protocol}//${parsed.host}${redirectUrl}`;
            }
            return download(redirectUrl, redirects + 1).then(resolve).catch(reject);
          }
          if (res.statusCode !== 200) {
            return reject(new Error(`HTTP status ${res.statusCode}`));
          }
          const fileStream = fs.createWriteStream(tempDestPath);
          res.pipe(fileStream);
          fileStream.on('finish', () => {
            fileStream.close(() => resolve(tempDestPath));
          });
          fileStream.on('error', (err) => {
            fs.unlink(tempDestPath, () => {});
            reject(err);
          });
        });
        request.on('error', (err) => reject(err));
        request.setTimeout(10000, () => {
          request.destroy();
          reject(new Error('Request timeout'));
        });
      });
    };

    await download(normalizedUrl);
    
    // Check file size
    const stats = fs.statSync(tempDestPath);
    if (stats.size < 100) {
      fs.unlinkSync(tempDestPath);
      return normalizedUrl;
    }

    // Compute SHA-256 hash of downloaded temp file
    const crypto = require('crypto');
    const getHash = (filePath) => {
      const buffer = fs.readFileSync(filePath);
      return crypto.createHash('sha256').update(buffer).digest('hex');
    };

    const newHash = getHash(tempDestPath);

    // Check if an existing file in uploadDir has the same hash
    const existingFiles = fs.readdirSync(uploadDir).filter(f => !fs.statSync(path.join(uploadDir, f)).isDirectory() && f !== tempFilename);
    for (const file of existingFiles) {
      const existingPath = path.join(uploadDir, file);
      try {
        if (getHash(existingPath) === newHash) {
          // File already exists! Delete temp and return existing relative path
          fs.unlinkSync(tempDestPath);
          return `/uploads/${subfolder}/${file}`;
        }
      } catch (e) {}
    }

    // No match found, rename temp file to permanent file name
    const finalFilename = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
    const finalPath = path.join(uploadDir, finalFilename);
    fs.renameSync(tempDestPath, finalPath);

    return `/uploads/${subfolder}/${finalFilename}`;
  } catch (err) {
    console.warn(`Failed to mirror image ${url}: ${err.message}. Using normalized URL fallback.`);
    return normalizedUrl;
  }
}

/**
 * Auto-scan database for old external images (Drive/Web URLs) and normalize Google Drive URLs
 */
async function autoMigrateExistingImages(db) {
  try {
    const conn = await db.getConnection();
    try {
      // 1. Normalize product images in DB to standard Google Drive thumbnail links
      const [prodImgs] = await conn.query("SELECT id, duong_dan FROM anh_san_pham WHERE duong_dan LIKE '%drive.google.com%' OR duong_dan LIKE '%googleusercontent.com%'");
      for (const img of prodImgs) {
        const converted = convertGoogleDriveLink(img.duong_dan);
        if (converted && converted !== img.duong_dan) {
          await conn.execute("UPDATE anh_san_pham SET duong_dan = ? WHERE id = ?", [converted, img.id]);
        }
        mirrorExternalImage(img.duong_dan, 'products').catch(() => {});
      }

      // 2. Normalize banner images in DB
      const [banners] = await conn.query("SELECT id, hinh_anh FROM banner WHERE hinh_anh LIKE '%drive.google.com%' OR hinh_anh LIKE '%googleusercontent.com%'");
      for (const b of banners) {
        const converted = convertGoogleDriveLink(b.hinh_anh);
        if (converted && converted !== b.hinh_anh) {
          await conn.execute("UPDATE banner SET hinh_anh = ? WHERE id = ?", [converted, b.id]);
        }
        mirrorExternalImage(b.hinh_anh, 'banners').catch(() => {});
      }
    } finally {
      conn.release();
    }
  } catch (err) {
    console.warn(`Auto image migration notice: ${err.message}`);
  }
}

module.exports = {
  convertGoogleDriveLink,
  mirrorExternalImage,
  autoMigrateExistingImages
};
