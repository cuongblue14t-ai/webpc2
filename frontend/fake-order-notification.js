/**
 * fake-order-notification.js – Widget Thông báo mua hàng ảo góc dưới bên trái
 * Tự động lấy dữ liệu từ các SẢN PHẨM THẬT trong cơ sở dữ liệu để bấm vào xem chi tiết trực tiếp.
 */
(function () {
  const fakeCustomers = [
    { name: 'Anh Nam', city: 'Hà Nội' },
    { name: 'Chị Hương', city: 'TP. Hồ Chí Minh' },
    { name: 'Anh Tuấn', city: 'Đà Nẵng' },
    { name: 'Anh Minh', city: 'Hải Phòng' },
    { name: 'Anh Hoàng', city: 'Cần Thơ' },
    { name: 'Chị Thảo', city: 'Đồng Nai' },
    { name: 'Anh Dũng', city: 'Bình Dương' },
    { name: 'Chị Mai', city: 'Quảng Ninh' },
    { name: 'Anh Đức', city: 'Bắc Ninh' },
    { name: 'Anh Khánh', city: 'Thái Nguyên' },
    { name: 'Chị Trang', city: 'Vũng Tàu' },
    { name: 'Anh Hùng', city: 'Thanh Hóa' }
  ];

  // Danh sách sản phẩm thực tế trong DB làm dự phòng
  let realProductsList = [
    { id: 51, name: 'CPU Intel Core i5-13400F', category: 'CPU PC', image: '/uploads/products/cpu_pc.png' },
    { id: 53, name: 'Mainboard MSI PRO B760M-E DDR4', category: 'MAINBOARD PC', image: '/uploads/products/mainboard_pc.png' },
    { id: 55, name: 'Màn Hình MSI 27" MAG 275QF 2k IPS 180Hz', category: 'MÀN HÌNH MÁY TÍNH', image: '/uploads/products/monitor.jpg' },
    { id: 56, name: 'Cpu Intel Core i7 6700', category: 'CPU PC', image: '/uploads/products/cpu_pc.png' },
    { id: 61, name: 'Mainboard X99 OEM ZX-DU D3 (Dual CPU)', category: 'MAINBOARD SEVER', image: '/uploads/products/mainboard_server.png' },
    { id: 62, name: 'RAM Corsair Vengeance LPX Black 8GB DDR4', category: 'RAM PC', image: '/uploads/products/ram_pc.png' },
    { id: 63, name: 'Ổ Cứng SSD Samsung 980 500GB M.2 PCIe Gen3', category: 'Ổ CỨNG SSD', image: '/uploads/products/ssd.png' },
    { id: 64, name: 'Nguồn Máy Tính VSP Delta P550W ATX', category: 'NGUỒN MÁY TÍNH', image: '/uploads/products/psu.png' },
    { id: 65, name: 'Vỏ Case XIGMATEK DUO X 3F eATX Black', category: 'VỎ MÁY TÍNH', image: '/uploads/products/pc_case.png' },
    { id: 52, name: 'CPU Intel Core i5-4570', category: 'CPU PC', image: '/uploads/products/cpu_pc.png' }
  ];

  const timeAgoList = ['1 phút trước', '2 phút trước', '3 phút trước', '5 phút trước', '7 phút trước', '10 phút trước'];

  let notificationElement = null;
  let activeTimer = null;
  let cycleTimer = null;

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

  // Tự động tải sản phẩm thật từ API backend
  async function fetchRealProductsFromAPI() {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map(p => {
            const rawImg = p.duong_dan_anh || (p.images && p.images[0]);
            const fallback = getCategoryFallbackImg(p.ten_danh_muc);
            let img = fallback;
            if (rawImg && typeof rawImg === 'string' && rawImg.trim()) {
              let trimmed = rawImg.trim();
              if (trimmed.startsWith('uploads/')) trimmed = '/' + trimmed;
              img = trimmed;
            }
            return {
              id: p.id,
              name: p.ten_san_pham || 'Sản phẩm',
              category: p.ten_danh_muc || '',
              image: img,
              fallback: fallback
            };
          });
          if (mapped.length > 0) {
            realProductsList = mapped;
          }
        }
      }
    } catch (e) {
      // Dùng danh sách fallback nếu có lỗi mạng
    }
  }

  function injectCSS() {
    if (document.getElementById('fake-order-notification-style')) return;
    const style = document.createElement('style');
    style.id = 'fake-order-notification-style';
    style.innerHTML = `
      #fake-order-popup {
        position: fixed;
        left: 20px;
        bottom: 22px;
        z-index: 9998;
        background: #17202e;
        color: #ffffff;
        padding: 14px 16px;
        border-radius: 14px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.1);
        display: flex;
        align-items: flex-start;
        gap: 12px;
        max-width: 380px;
        width: calc(100vw - 40px);
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        cursor: pointer;
        user-select: none;
        opacity: 0;
        transform: translateX(-120%);
        transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease;
        backdrop-filter: blur(8px);
      }

      #fake-order-popup.show {
        opacity: 1;
        transform: translateX(0);
      }

      #fake-order-popup.hide {
        opacity: 0;
        transform: translateX(-120%);
      }

      .fake-order-icon-box {
        width: 46px;
        height: 46px;
        min-width: 46px;
        border-radius: 50%;
        background: radial-gradient(circle at center, #2a374a, #1a2332);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(255, 255, 255, 0.15);
        overflow: hidden;
        margin-top: 2px;
      }

      .fake-order-icon-box img {
        width: 32px;
        height: 32px;
        object-fit: cover;
        border-radius: 4px;
      }

      .fake-order-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding-right: 14px;
      }

      .fake-order-title {
        font-size: 13px;
        line-height: 1.35;
        color: #e2e8f0;
        margin: 0;
      }

      .fake-order-title strong {
        color: #ffffff;
        font-weight: 700;
      }

      .fake-order-product-name {
        font-size: 13.5px;
        font-weight: 700;
        color: #fbbf24;
        margin-top: 2px;
        line-height: 1.3;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .fake-order-footer {
        font-size: 11.5px;
        color: #94a3b8;
        margin-top: 3px;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .fake-order-footer em {
        font-style: italic;
        color: #cbd5e1;
      }

      .fake-order-close-btn {
        position: absolute;
        top: 10px;
        right: 12px;
        background: transparent;
        border: none;
        color: #94a3b8;
        font-size: 16px;
        font-weight: bold;
        line-height: 1;
        cursor: pointer;
        padding: 4px;
        transition: color 0.2s;
      }

      .fake-order-close-btn:hover {
        color: #ffffff;
      }

      @media (max-width: 640px) {
        #fake-order-popup {
          left: 12px;
          bottom: 14px;
          max-width: 320px;
          padding: 12px 14px;
        }
        .fake-order-product-name {
          font-size: 12.5px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function createNotificationElement() {
    if (notificationElement) return notificationElement;

    notificationElement = document.createElement('div');
    notificationElement.id = 'fake-order-popup';

    notificationElement.innerHTML = `
      <div class="fake-order-icon-box">
        <img id="fake-order-img" src="/uploads/products/cpu_pc.png" alt="Product" referrerpolicy="no-referrer">
      </div>
      <div class="fake-order-content">
        <p class="fake-order-title">
          <strong id="fake-order-customer">Anh Nam (Hà Nội)</strong> vừa đặt mua thành công!
        </p>
        <div id="fake-order-product" class="fake-order-product-name">CPU Intel Core i5-13400F</div>
        <div class="fake-order-footer">
          🕒 <span id="fake-order-time">3 phút trước</span> • <em>Đã xác nhận đơn hàng</em>
        </div>
      </div>
      <button class="fake-order-close-btn" id="btn-close-fake-order" aria-label="Đóng">&times;</button>
    `;

    document.body.appendChild(notificationElement);

    // Event listener to close notification
    const closeBtn = document.getElementById('btn-close-fake-order');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hideNotification();
      });
    }

    // Event listener to navigate to exact real product detail page on click
    notificationElement.addEventListener('click', () => {
      const productId = notificationElement.getAttribute('data-product-id');
      if (productId) {
        window.location.href = `product_detail.html?id=${productId}`;
      } else {
        window.location.href = 'products.html';
      }
    });

    return notificationElement;
  }

  function showRandomNotification() {
    const popup = createNotificationElement();
    if (!popup) return;

    // Pick random items
    const customer = fakeCustomers[Math.floor(Math.random() * fakeCustomers.length)];
    const product = realProductsList[Math.floor(Math.random() * realProductsList.length)];
    const timeAgo = timeAgoList[Math.floor(Math.random() * timeAgoList.length)];

    // Populate data
    document.getElementById('fake-order-customer').textContent = `${customer.name} (${customer.city})`;
    document.getElementById('fake-order-product').textContent = product.name;
    document.getElementById('fake-order-time').textContent = timeAgo;

    const imgEl = document.getElementById('fake-order-img');
    const fallbackSrc = product.fallback || getCategoryFallbackImg(product.category);
    imgEl.onerror = () => { imgEl.onerror = null; imgEl.src = fallbackSrc; };
    imgEl.src = product.image || fallbackSrc;

    // Store actual product ID on element
    popup.setAttribute('data-product-id', product.id);

    // Show popup
    popup.classList.remove('hide');
    popup.classList.add('show');

    // Hide after 5.5 seconds
    if (activeTimer) clearTimeout(activeTimer);
    activeTimer = setTimeout(() => {
      hideNotification();
    }, 5500);
  }

  function hideNotification() {
    if (!notificationElement) return;
    notificationElement.classList.remove('show');
    notificationElement.classList.add('hide');
  }

  async function startNotificationCycle() {
    injectCSS();
    await fetchRealProductsFromAPI();

    // First popup appears after 3 seconds
    setTimeout(() => {
      showRandomNotification();
    }, 3000);

    // Cycle popup every 14 seconds
    cycleTimer = setInterval(() => {
      showRandomNotification();
    }, 14000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startNotificationCycle);
  } else {
    startNotificationCycle();
  }
})();
