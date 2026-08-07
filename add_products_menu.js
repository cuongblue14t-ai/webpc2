const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'frontend');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  if (file === 'categories.html' || file === 'products.html') return; // already updated

  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace <li><a href="categories.html">Danh mục</a></li>
  // with <li><a href="categories.html">Danh mục</a></li>\n        <li><a href="products.html">Sản phẩm</a></li>

  if (content.includes('<a href="categories.html"') && !content.includes('href="products.html"')) {
    content = content.replace(
      /(<li><a href="categories\.html"[^>]*>Danh mục<\/a><\/li>)/i,
      '$1\n        <li><a href="products.html">Sản phẩm</a></li>'
    );
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Added Sản phẩm menu item to:', file);
  } else {
    console.log('Skipped or already updated:', file);
  }
});
