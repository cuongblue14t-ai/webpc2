const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'frontend');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Remove <li><a href="search.html"...>...</a></li>
  const searchLiRegex = /<li[^>]*>\s*<a href="search\.html"[^>]*>[\s\S]*?<\/a>\s*<\/li>/gi;
  content = content.replace(searchLiRegex, '');

  // 2. Change search redirect from search.html?q= to products.html?search=
  content = content.replace(/['"]search\.html\?q=['"]/gi, "'products.html?search='");
  content = content.replace(/['"]search\.html\?q=['"]\s*\+/gi, "'products.html?search=' +");

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Processed search menu removal in:', file);
});
