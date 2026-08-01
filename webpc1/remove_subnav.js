const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'frontend');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove comment + nav element
  content = content.replace(/\s*<!--\s*Category Subnav\s*-->\s*<nav class="category-subnav">[\s\S]*?<\/nav>/gi, '');
  content = content.replace(/\s*<nav class="category-subnav">[\s\S]*?<\/nav>/gi, '');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Removed subnav from:', file);
});
