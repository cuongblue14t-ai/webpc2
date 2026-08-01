const fs = require('fs');
const path = require('path');
const files = ['index.html', 'categories.html', 'search.html', 'about.html', 'contact.html', 'cart.html', 'checkout.html', 'product_detail.html'];
const dir = 'c:/Users/admin/webpc/frontend';
files.forEach(f => {
  const p = path.join(dir, f);
  if(fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    c = c.replace(/<li><a href="categories\.html">Danh mục<\/a><\/li>/g, '<li class="nav-dropdown-wrap"><a href="categories.html">Danh mục ▾</a><ul class="nav-dropdown-list" id="nav-categories-dropdown"></ul></li>');
    c = c.replace(/<li><a href="categories\.html" class="active">Danh mục<\/a><\/li>/g, '<li class="nav-dropdown-wrap"><a href="categories.html" class="active">Danh mục ▾</a><ul class="nav-dropdown-list" id="nav-categories-dropdown"></ul></li>');
    fs.writeFileSync(p, c, 'utf8');
  }
});
console.log('Done');
