const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'frontend');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  const activeClass = file === 'categories.html' ? ' active' : '';

  const targetRegex = /<li(?: class="[^"]*")*>\s*<a href="categories\.html"[^>]*>Danh mục<\/a>\s*<\/li>/gi;

  const replacement = `<li class="nav-dropdown-wrap">
          <a href="categories.html" class="nav-dropdown-toggle${activeClass}">Danh mục <span style="font-size:0.75rem;">▾</span></a>
          <ul class="nav-dropdown-list" id="nav-category-dropdown">
            <!-- 12 categories populated dynamically -->
          </ul>
        </li>`;

  if (targetRegex.test(content)) {
    content = content.replace(targetRegex, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated dropdown in:', file);
  } else {
    console.log('Target not found in:', file);
  }
});
