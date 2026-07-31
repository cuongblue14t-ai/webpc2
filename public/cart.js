// frontend/cart.js

// Lấy giỏ hàng từ localStorage
function getCart() {
  const cart = localStorage.getItem('webpc_cart');
  return cart ? JSON.parse(cart) : [];
}

// Lưu giỏ hàng vào localStorage
function saveCart(cart) {
  localStorage.setItem('webpc_cart', JSON.stringify(cart));
  updateCartIcon();
}

// Thêm sản phẩm vào giỏ
function addToCart(product) {
  const cart = getCart();
  const existingIndex = cart.findIndex(item => item.id === product.id);

  if (existingIndex > -1) {
    cart[existingIndex].quantity += 1;
  } else {
    // Chỉ lưu các thông tin cần thiết
    cart.push({
      id: product.id,
      ten_san_pham: product.ten_san_pham,
      gia: product.gia_khuyen_mai && product.gia_khuyen_mai < product.gia ? product.gia_khuyen_mai : product.gia,
      duong_dan_anh: product.duong_dan_anh || (product.images && product.images[0]) || 'placeholder.png',
      quantity: 1
    });
  }
  saveCart(cart);
  alert(`Đã thêm "${product.ten_san_pham}" vào giỏ hàng!`);
}

// Cập nhật số lượng
function updateQuantity(id, quantity) {
  let cart = getCart();
  if (quantity <= 0) {
    cart = cart.filter(item => item.id !== id);
  } else {
    const item = cart.find(i => i.id === id);
    if (item) {
      item.quantity = quantity;
    }
  }
  saveCart(cart);
}

// Xóa sản phẩm khỏi giỏ
function removeFromCart(id) {
  let cart = getCart();
  cart = cart.filter(item => item.id !== id);
  saveCart(cart);
}

// Xóa toàn bộ giỏ hàng
function clearCart() {
  localStorage.removeItem('webpc_cart');
  updateCartIcon();
}

// Tính tổng tiền
function getCartTotal() {
  const cart = getCart();
  return cart.reduce((total, item) => total + (item.gia * item.quantity), 0);
}

// Tính tổng số lượng (để hiển thị trên icon header nếu có)
function getCartCount() {
  const cart = getCart();
  return cart.reduce((count, item) => count + item.quantity, 0);
}

// Cập nhật giao diện số lượng trên header (tìm element có id 'cart-count')
function updateCartIcon() {
  const countEl = document.getElementById('cart-count');
  if (countEl) {
    countEl.textContent = getCartCount();
  }
}

// Export for module usage or attach to window for script tags
window.Cart = {
  getCart,
  saveCart,
  addToCart,
  updateQuantity,
  removeFromCart,
  clearCart,
  getCartTotal,
  getCartCount,
  updateCartIcon
};

// Mobile Hamburger Menu initialization
function initMobileMenu() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  let toggleBtn = document.getElementById('menu-toggle');
  const nav = document.querySelector('.main-nav');
  if (!nav) return;

  // Auto-inject toggle button if not present in HTML markup
  if (!toggleBtn) {
    toggleBtn = document.createElement('button');
    toggleBtn.className = 'menu-toggle';
    toggleBtn.id = 'menu-toggle';
    toggleBtn.setAttribute('aria-label', 'Toggle navigation');
    toggleBtn.innerHTML = '☰';
    header.appendChild(toggleBtn);
  }

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isActive = nav.classList.toggle('active');
    toggleBtn.innerHTML = isActive ? '✕' : '☰';
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (nav.classList.contains('active') && !nav.contains(e.target) && !toggleBtn.contains(e.target)) {
      nav.classList.remove('active');
      toggleBtn.innerHTML = '☰';
    }
  });

  // Close menu when clicking any nav link
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('active');
      toggleBtn.innerHTML = '☰';
    });
  });
}

// Cập nhật icon và mobile menu khi load script
document.addEventListener('DOMContentLoaded', () => {
  updateCartIcon();
  initMobileMenu();
});


