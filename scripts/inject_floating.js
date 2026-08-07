const fs = require('fs');
const path = require('path');

const dirs = [path.resolve(__dirname, '../public'), path.resolve(__dirname, '../frontend')];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  files.forEach(f => {
    if (f.endsWith('.html') && !f.includes('admin')) {
      const p = path.join(dir, f);
      let content = fs.readFileSync(p, 'utf8');
      if (!content.includes('floating-contact.js')) {
        const tag = '<script src="floating-contact.js"></script>';
        if (content.includes('zalo-qr-modal.js')) {
          content = content.replace('<script src="zalo-qr-modal.js"></script>', '<script src="zalo-qr-modal.js"></script>\n  ' + tag);
        } else if (content.includes('</body>')) {
          content = content.replace('</body>', '  ' + tag + '\n</body>');
        } else {
          content += '\n' + tag;
        }
        fs.writeFileSync(p, content, 'utf8');
        console.log('Injected floating-contact.js into:', p);
      }
    }
  });
});
