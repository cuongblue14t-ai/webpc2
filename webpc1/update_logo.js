const fs = require('fs');
const path = require('path');
const files = ['index.html', 'categories.html', 'search.html', 'about.html', 'contact.html', 'cart.html', 'checkout.html', 'product_detail.html'];
const dir = 'c:/Users/admin/webpc/frontend';
files.forEach(f => {
  const p = path.join(dir, f);
  if(fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    
    // Replace logo
    c = c.replace(/<div class="logo">WebPC<\/div>/g, '<div class="logo"><a href="index.html" style="display:flex; align-items:center;"><img src="logo.png" alt="Máy Tính MT Logo" style="max-height: 50px; width: auto; object-fit: contain;"></a></div>');
    
    // Replace title WebPC
    c = c.replace(/<title>WebPC/g, '<title>Máy Tính MT');
    c = c.replace(/<title>Web PC/g, '<title>Máy Tính MT');
    
    // Replace footer WebPC
    c = c.replace(/© 2026 WebPC\./g, '© 2026 MÁY TÍNH & LINH KIỆN MÁY TÍNH MT.');
    
    // Replace about text
    c = c.replace(/Về WebPC/g, 'Về Máy Tính MT');
    c = c.replace(/WebPC cung cấp/g, 'Chúng tôi cung cấp');
    
    fs.writeFileSync(p, c, 'utf8');
  }
});
console.log('Updated logo and name');
