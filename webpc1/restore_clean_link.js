const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'frontend');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  const activeClass = file === 'categories.html' ? ' class="active"' : '';

  // Regex to match the dropdown wrap li block
  const dropdownRegex = /<li class="nav-dropdown-wrap">[\s\S]*?<\/li>/gi;
  const simpleLink = `<li><a href="categories.html"${activeClass}>Danh mục</a></li>`;

  if (dropdownRegex.test(content)) {
    content = content.replace(dropdownRegex, simpleLink);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Restored simple link in:', file);
  } else {
    console.log('Dropdown regex not matched in:', file);
  }
});
