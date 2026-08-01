/**
 * zalo-qr-modal.js – Popup hiển thị QR Zalo khi bấm "Liên hệ nhận báo giá"
 */
(function () {
  // Create modal HTML once
  const modalHTML = `
    <div id="zalo-qr-modal" class="zalo-modal-overlay">
      <div class="zalo-modal-card">
        <button class="zalo-modal-close" onclick="hideZaloQR()">&times;</button>
        <div class="zalo-modal-header">
          <img src="/zalo_qr.png" alt="QR Zalo - Mạnh Cường" class="zalo-qr-img">
        </div>
        <div class="zalo-modal-footer">
          <p class="zalo-modal-name">Mạnh Cườngg</p>
          <p class="zalo-modal-hint">Mở Zalo bấm nút quét QR để quét kết bạn</p>
        </div>
      </div>
    </div>
  `;

  // Create style
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    /* Zalo QR Modal */
    .zalo-modal-overlay {
      display: none;
      position: fixed;
      z-index: 9999;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(6px);
      align-items: center;
      justify-content: center;
      animation: zaloFadeIn 0.25s ease;
    }
    .zalo-modal-overlay.active {
      display: flex;
    }
    @keyframes zaloFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .zalo-modal-card {
      background: #fff;
      border-radius: 20px;
      padding: 2rem 2rem 1.5rem;
      max-width: 380px;
      width: 90%;
      text-align: center;
      position: relative;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: zaloSlideUp 0.3s ease;
    }
    @keyframes zaloSlideUp {
      from { transform: translateY(30px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .zalo-modal-close {
      position: absolute;
      top: 12px; right: 16px;
      font-size: 1.8rem;
      background: none;
      border: none;
      color: #999;
      cursor: pointer;
      line-height: 1;
      transition: color 0.2s;
    }
    .zalo-modal-close:hover {
      color: #333;
    }
    .zalo-qr-img {
      width: 100%;
      max-width: 300px;
      border-radius: 12px;
      margin: 0 auto;
      display: block;
    }
    .zalo-modal-footer {
      margin-top: 1rem;
    }
    .zalo-modal-name {
      font-size: 1.2rem;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 0.25rem;
    }
    .zalo-modal-hint {
      font-size: 0.85rem;
      color: #888;
    }
  `;
  document.head.appendChild(styleEl);

  // Inject modal into body
  const wrapper = document.createElement('div');
  wrapper.innerHTML = modalHTML;
  document.body.appendChild(wrapper.firstElementChild);

  // Global functions
  window.showZaloQR = function () {
    document.getElementById('zalo-qr-modal').classList.add('active');
  };

  window.hideZaloQR = function () {
    document.getElementById('zalo-qr-modal').classList.remove('active');
  };

  // Close on overlay click
  document.getElementById('zalo-qr-modal').addEventListener('click', function (e) {
    if (e.target === this) hideZaloQR();
  });

  // Close on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') hideZaloQR();
  });
})();
