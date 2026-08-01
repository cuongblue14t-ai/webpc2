const fs = require('fs');
const path = require('path');
const files = ['index.html', 'categories.html', 'search.html', 'about.html', 'contact.html', 'cart.html', 'checkout.html', 'product_detail.html'];
const dir = 'c:/Users/admin/webpc/frontend';
files.forEach(f => {
  const p = path.join(dir, f);
  if(fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    // Remove existing if any
    c = c.replace(/<nav class="category-subnav">[\s\S]*?<\/nav>/g, '');
    // Insert after </header>
    c = c.replace('</header>', '</header>\n  <!-- Category Subnav -->\n  <nav class="category-subnav">\n    <ul id="dynamic-category-subnav">\n      <!-- Injected via JS -->\n    </ul>\n  </nav>');
    fs.writeFileSync(p, c, 'utf8');
  }
});
console.log('Added subnav HTML');
