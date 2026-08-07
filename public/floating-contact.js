/**
 * floating-contact.js – Widget 2 nút liên hệ nổi góc phải màn hình (Zalo & Điện thoại)
 */
(function() {
  function injectFloatingContact() {
    if (document.getElementById('floating-contact-container')) return;

    // Create container
    const container = document.createElement('div');
    container.id = 'floating-contact-container';

    container.innerHTML = `
      <style>
        #floating-contact-container {
          position: fixed;
          right: 22px;
          bottom: 75px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        .floating-btn {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
          position: relative;
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease;
          cursor: pointer;
          border: none;
          outline: none;
        }

        .floating-btn:hover {
          transform: scale(1.12);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
        }

        /* Zalo Button (Blue) */
        .btn-zalo-float {
          background: linear-gradient(135deg, #0084ff, #0056b3);
          font-weight: 800;
          font-size: 15px;
          letter-spacing: -0.2px;
          border: 2px solid rgba(255, 255, 255, 0.4);
        }

        .btn-zalo-float span {
          color: #ffffff;
          font-weight: 900;
        }

        /* Phone Button (Red with Wave Pulse) */
        .btn-phone-float {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          border: 2px solid rgba(255, 255, 255, 0.4);
        }

        .btn-phone-float svg {
          width: 24px;
          height: 24px;
          fill: #ffffff;
          animation: phoneHandsetRing 2s infinite ease-in-out;
        }

        /* Pulse wave animation background */
        .btn-phone-float::before {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.6);
          z-index: -1;
          animation: phonePulseWave 1.8s infinite ease-out;
        }

        @keyframes phonePulseWave {
          0% {
            transform: scale(1);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.65);
            opacity: 0;
          }
        }

        @keyframes phoneHandsetRing {
          0%, 100% { transform: rotate(0deg); }
          10%, 30%, 50% { transform: rotate(14deg); }
          20%, 40% { transform: rotate(-14deg); }
          60% { transform: rotate(0deg); }
        }

        /* Tooltip hint on hover */
        .floating-btn .floating-tooltip {
          position: absolute;
          right: 66px;
          background: rgba(17, 24, 39, 0.9);
          color: #ffffff;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.2s ease, transform 0.2s ease;
          transform: translateX(6px);
          pointer-events: none;
          box-shadow: 0 4px 10px rgba(0,0,0,0.2);
        }

        .floating-btn:hover .floating-tooltip {
          opacity: 1;
          visibility: visible;
          transform: translateX(0);
        }

        @media (max-width: 768px) {
          #floating-contact-container {
            right: 14px;
            bottom: 60px;
            gap: 10px;
          }
          .floating-btn {
            width: 48px;
            height: 48px;
          }
          .btn-zalo-float {
            font-size: 13px;
          }
          .btn-phone-float svg {
            width: 20px;
            height: 20px;
          }
        }
      </style>

      <!-- Zalo Quote Button -->
      <button class="floating-btn btn-zalo-float" onclick="handleZaloClick()" aria-label="Zalo liên hệ báo giá">
        <span>Zalo</span>
        <span class="floating-tooltip">Zalo Báo giá / Tư vấn</span>
      </button>

      <!-- Phone Hotline Button -->
      <a href="tel:0383158080" class="floating-btn btn-phone-float" aria-label="Gọi điện liên hệ công ty">
        <svg viewBox="0 0 24 24">
          <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z"/>
        </svg>
        <span class="floating-tooltip">Hotline: 0383.158.080</span>
      </a>
    `;

    document.body.appendChild(container);
  }

  window.handleZaloClick = function() {
    if (typeof window.showZaloQR === 'function') {
      window.showZaloQR();
    } else {
      window.open('https://zalo.me/0383158080', '_blank');
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectFloatingContact);
  } else {
    injectFloatingContact();
  }
})();
