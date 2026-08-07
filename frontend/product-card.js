/**
 * buildProductCard(p) – Tạo thẻ sản phẩm chuẩn
 * @param {Object} p – product object from API
 * @returns {HTMLElement} – .product-card element
 */
function getCategoryFallbackImg(categoryName) {
  const cat = (categoryName || '').toUpperCase();
  if (cat.includes('CPU SEVER') || cat.includes('SERVER CPU')) return '/uploads/products/cpu_server.png';
  if (cat.includes('CPU')) return '/uploads/products/cpu_pc.png';
  if (cat.includes('MAINBOARD SEVER')) return '/uploads/products/mainboard_server.png';
  if (cat.includes('MAINBOARD') || cat.includes('MAIN')) return '/uploads/products/mainboard_pc.png';
  if (cat.includes('RAM SEVER')) return '/uploads/products/ram_server.png';
  if (cat.includes('RAM')) return '/uploads/products/ram_pc.png';
  if (cat.includes('SSD') || cat.includes('CỨNG')) return '/uploads/products/ssd.png';
  if (cat.includes('MÀN HÌNH') || cat.includes('MONITOR')) return '/uploads/products/monitor.jpg';
  if (cat.includes('CARD') || cat.includes('VGA') || cat.includes('GPU')) return '/uploads/products/gpu.png';
  if (cat.includes('NGUỒN') || cat.includes('PSU')) return '/uploads/products/psu.png';
  if (cat.includes('TẢN NHIỆT') || cat.includes('COOLER')) return '/uploads/products/cpu_cooler.png';
  if (cat.includes('VỎ') || cat.includes('CASE')) return '/uploads/products/pc_case.png';
  return '/uploads/products/cpu_pc.png';
}

function resolveProductImg(url, categoryName) {
  const fallback = getCategoryFallbackImg(categoryName);
  if (!url || typeof url !== 'string') return fallback;
  let trimmed = url.trim();
  if (trimmed.startsWith('uploads/')) trimmed = '/' + trimmed;
  if (window.location.protocol === 'file:' && trimmed.startsWith('/uploads/')) {
    return 'http://localhost:3000' + trimmed;
  }
  return trimmed;
}

function buildProductCard(p) {
  const card = document.createElement('div');
  card.className = 'product-card';

  const category = p.ten_danh_muc || '';
  const fallbackImg = getCategoryFallbackImg(category);
  const rawImg = p.duong_dan_anh || (p.images && p.images[0]);
  const img = resolveProductImg(rawImg, category);
  const name = p.ten_san_pham || 'Sản phẩm';
  const price = p.gia ? Number(p.gia) : 0;
  const salePrice = p.gia_khuyen_mai ? Number(p.gia_khuyen_mai) : 0;
  const desc = p.mo_ta || '';
  const stock = p.so_luong !== undefined ? Number(p.so_luong) : 1;

  // Sale badge
  let badgeHTML = '';
  if (salePrice && salePrice < price) {
    const percent = Math.round((1 - salePrice / price) * 100);
    badgeHTML = `<span class="badge-sale">-${percent}%</span>`;
  }

  // Price display
  const displayPrice = salePrice && salePrice < price ? salePrice : price;

  card.innerHTML = `
    ${badgeHTML}
    <div class="card-img">
      <a href="product_detail.html?id=${p.id}">
        <img src="${img}" alt="${name}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null; this.src='${fallbackImg}';" />
      </a>
    </div>
    <div class="card-body">
      <div class="card-category">${category}</div>
      <h3 class="card-name">${name}</h3>
      
      <div class="card-actions-row card-price-row">
        <button class="btn-price-tag" onclick="window.location='product_detail.html?id=${p.id}'">
          <span class="btn-price-label">Giá Ưu Đãi</span>
          <span class="btn-price-value">${displayPrice.toLocaleString('vi-VN')}<u>đ</u></span>
        </button>
      </div>
      
      <div class="card-actions-row card-actions-bottom">
        <button class="btn-add-cart">
          <span class="btn-cart-icon">🛒</span>
          <span class="btn-cart-label">THÊM VÀO<br>GIỎ HÀNG</span>
        </button>
        <button class="btn-buy-now">
          <span class="btn-buynow-icon">⚡</span>
          <span class="btn-buynow-label">MUA<br>NGAY</span>
        </button>
      </div>
    </div>
  `;

  // Add to cart button – yêu cầu đăng nhập (Guest Guard)
  const addCartBtn = card.querySelector('.btn-add-cart');
  addCartBtn.addEventListener('click', () => {
    window.requireLogin(() => {
      if (window.Cart) {
        window.Cart.addToCart(p);
      } else {
        alert('Chưa tải module giỏ hàng!');
      }
    });
  });

  // Buy now button – yêu cầu đăng nhập (Guest Guard)
  const buyNowBtn = card.querySelector('.btn-buy-now');
  buyNowBtn.addEventListener('click', () => {
    window.requireLogin(() => {
      if (window.Cart) {
        window.Cart.addToCart(p);
      }
      window.location.href = 'checkout.html';
    });
  });

  return card;
}
