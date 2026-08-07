/**
 * fake-order-notification.js – Widget Thông báo mua hàng ảo nổi ở góc dưới bên trái màn hình
 * Thiết kế chuẩn 100% theo mẫu với thẻ tối màu, tên khách + tỉnh thành, tên sản phẩm màu vàng nổi bật.
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

  const fakeProducts = [
    { id: 1, name: 'CPU Intel Core i9-13900K Tray', image: '/uploads/products/cpu_pc.png', price: '13.500.000' },
    { id: 2, name: 'VGA ASUS ROG Strix GeForce RTX 4090 24GB', image: '/uploads/products/gpu.png', price: '52.900.000' },
    { id: 3, name: 'Mainboard ASUS ROG MAXIMUS Z790 HERO', image: '/uploads/products/mainboard_pc.png', price: '16.800.000' },
    { id: 4, name: 'RAM G.Skill Trident Z5 RGB 32GB (2x16GB) DDR5', image: '/uploads/products/ram_pc.png', price: '3.950.000' },
    { id: 5, name: 'SSD Samsung 990 Pro 1TB M.2 NVMe PCIe Gen4', image: '/uploads/products/ssd.png', price: '2.890.000' },
    { id: 6, name: 'Màn hình Dell UltraSharp U2723QE 27 inch 4K', image: '/uploads/products/monitor.jpg', price: '12.490.000' },
    { id: 7, name: 'Bộ Nguồn Corsair RM1000x 1000W 80 Plus Gold', image: '/uploads/products/psu.png', price: '4.650.000' },
    { id: 8, name: 'Tản nhiệt nước AIO NZXT Kraken Elite 360 RGB', image: '/uploads/products/cpu_cooler.png', price: '7.390.000' },
    { id: 9, name: 'Vỏ Case Lian Li O11 Dynamic EVO Black', image: '/uploads/products/pc_case.png', price: '4.200.000' },
    { id: 10, name: 'CPU AMD Ryzen 9 7950X3D Box Chính Hãng', image: '/uploads/products/cpu_pc.png', price: '15.990.000' }
  ];

  const timeAgoList = ['1 phút trước', '2 phút trước', '3 phút trước', '5 phút trước', '7 phút trước', '10 phút trước'];

  let notificationElement = null;
  let activeTimer = null;
  let cycleTimer = null;

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
        width: 44px;
        height: 44px;
        min-width: 44px;
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
        width: 28px;
        height: 28px;
        object-fit: contain;
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
        <img id="fake-order-img" src="/uploads/products/cpu_pc.png" alt="Product">
      </div>
      <div class="fake-order-content">
        <p class="fake-order-title">
          <strong id="fake-order-customer">Anh Nam (Hà Nội)</strong> vừa đặt mua thành công!
        </p>
        <div id="fake-order-product" class="fake-order-product-name">CPU Intel Core i9-13900K Tray</div>
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

    // Event listener to navigate to product detail on click
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
    const product = fakeProducts[Math.floor(Math.random() * fakeProducts.length)];
    const timeAgo = timeAgoList[Math.floor(Math.random() * timeAgoList.length)];

    // Populate data
    document.getElementById('fake-order-customer').textContent = `${customer.name} (${customer.city})`;
    document.getElementById('fake-order-product').textContent = product.name;
    document.getElementById('fake-order-time').textContent = timeAgo;
    document.getElementById('fake-order-img').src = product.image;
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

  function startNotificationCycle() {
    injectCSS();

    // First popup appears after 3.5 seconds
    setTimeout(() => {
      showRandomNotification();
    }, 3500);

    // Cycle popup every 12 to 18 seconds
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
