const fs = require('fs');
const path = require('path');
const files = ['index.html', 'categories.html', 'search.html', 'about.html', 'contact.html', 'cart.html', 'checkout.html', 'product_detail.html'];
const dir = 'c:/Users/admin/webpc/frontend';
files.forEach(f => {
  const p = path.join(dir, f);
  if(fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    c = c.replace(/<li class="nav-dropdown-wrap">[\s\S]*?<\/ul>\s*<\/li>/g, '<li><a href="categories.html">Danh mục</a></li>');
    fs.writeFileSync(p, c, 'utf8');
  }
});
console.log('Removed dropdown again');
