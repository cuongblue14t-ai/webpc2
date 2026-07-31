/**
 * buildProductCard(p) – Tạo thẻ sản phẩm chuẩn
 * @param {Object} p – product object from API
 * @returns {HTMLElement} – .product-card element
 */
function resolveProductImg(url) {
  if (!url || typeof url !== 'string') return 'placeholder.png';
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

  const rawImg = p.duong_dan_anh || (p.images && p.images[0]) || 'placeholder.png';
  const img = resolveProductImg(rawImg);
  const name = p.ten_san_pham || 'Sản phẩm';
  const category = p.ten_danh_muc || '';
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
        <img src="${img}" alt="${name}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null; this.src='placeholder.png';" />
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
