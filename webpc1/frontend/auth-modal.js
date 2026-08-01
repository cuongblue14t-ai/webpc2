/**
 * AuthModal & Customer Authentication Handler
 * Nam Nguyễn PC & Workstation Client Site
 */

document.addEventListener('DOMContentLoaded', () => {
  initAuthModal();
});

function initAuthModal() {
  injectAuthModalHTML();
  injectProfileModalHTML();
  injectOrdersModalHTML();
  injectAuthHeaderUI();
  setupAuthEventListeners();
  checkAuthState();
}

/**
 * 1. Inject Login/Register Modal HTML structure into <body>
 */
function injectAuthModalHTML() {
  if (document.getElementById('auth-modal-overlay')) return;

  const modalHTML = `
    <div id="auth-modal-overlay" class="auth-modal-overlay" aria-hidden="true">
      <div class="auth-modal-card" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
        <button type="button" class="auth-modal-close" id="auth-modal-close-btn" aria-label="Đóng modal">&times;</button>
        
        <!-- Header / Logo -->
        <div class="auth-modal-header">
          <div class="auth-brand">
            <span class="brand-icon">⚡</span>
            <span class="brand-name">Nam Nguyễn PC</span>
          </div>
          <p class="auth-subtitle">Trải nghiệm mua sắm PC & Workstation chuyên nghiệp</p>
        </div>

        <!-- Navigation Tabs -->
        <div class="auth-tabs-nav" role="tablist">
          <button type="button" class="auth-tab-btn active" id="tab-btn-login" role="tab" data-tab="login">
            🔑 Đăng nhập
          </button>
          <button type="button" class="auth-tab-btn" id="tab-btn-register" role="tab" data-tab="register">
            📝 Đăng ký
          </button>
        </div>

        <!-- Global Alert Box -->
        <div id="auth-global-alert" class="auth-alert" style="display: none;"></div>

        <!-- TAB 1: FORM ĐĂNG NHẬP -->
        <div id="auth-tab-login" class="auth-tab-content active">
          <form id="form-login" novalidate>
            <div class="form-group">
              <label for="login-account">Email hoặc Số điện thoại <span class="required">*</span></label>
              <div class="input-wrap">
                <span class="input-icon">👤</span>
                <input type="text" id="login-account" placeholder="ví dụ: customer@gmail.com hoặc 0912345678" autocomplete="username">
              </div>
              <div class="error-message" id="err-login-account"></div>
            </div>

            <div class="form-group">
              <label for="login-password">Mật khẩu <span class="required">*</span></label>
              <div class="input-wrap">
                <span class="input-icon">🔒</span>
                <input type="password" id="login-password" placeholder="Nhập mật khẩu của bạn" autocomplete="current-password">
                <button type="button" class="toggle-password-btn" data-target="login-password">👁️</button>
              </div>
              <div class="error-message" id="err-login-password"></div>
            </div>

            <div class="form-row-between">
              <label class="checkbox-container">
                <input type="checkbox" id="login-remember" checked>
                <span class="checkmark"></span>
                Ghi nhớ đăng nhập
              </label>
              <a href="#" class="forgot-pass-link" onclick="alert('Tính năng khôi phục mật khẩu qua Email/SĐT đang được cập nhật!'); return false;">Quên mật khẩu?</a>
            </div>

            <button type="submit" class="auth-btn-primary" id="btn-submit-login">
              <span class="btn-text">Đăng nhập ngay</span>
              <span class="btn-spinner" style="display:none;">⏳</span>
            </button>

            <div class="auth-switch-footer">
              Chưa có tài khoản? <a href="#" id="link-to-register">Đăng ký ngay</a>
            </div>
          </form>
        </div>

        <!-- TAB 2: FORM ĐĂNG KÝ -->
        <div id="auth-tab-register" class="auth-tab-content">
          <form id="form-register" novalidate>
            <div class="form-group">
              <label for="reg-fullname">Họ và tên <span class="required">*</span></label>
              <div class="input-wrap">
                <span class="input-icon">📛</span>
                <input type="text" id="reg-fullname" placeholder="ví dụ: Nguyễn Văn A">
              </div>
              <div class="error-message" id="err-reg-fullname"></div>
            </div>

            <div class="form-group">
              <label for="reg-email">Địa chỉ Email <span class="required">*</span></label>
              <div class="input-wrap">
                <span class="input-icon">✉️</span>
                <input type="email" id="reg-email" placeholder="khachhang@gmail.com">
              </div>
              <div class="error-message" id="err-reg-email"></div>
            </div>

            <div class="form-group">
              <label for="reg-phone">Số điện thoại <span class="required">*</span></label>
              <div class="input-wrap">
                <span class="input-icon">📞</span>
                <input type="tel" id="reg-phone" placeholder="0987654321">
              </div>
              <div class="error-message" id="err-reg-phone"></div>
            </div>

            <div class="form-group">
              <label for="reg-password">Mật khẩu <span class="required">*</span></label>
              <div class="input-wrap">
                <span class="input-icon">🔒</span>
                <input type="password" id="reg-password" placeholder="Tối thiểu 6 ký tự">
                <button type="button" class="toggle-password-btn" data-target="reg-password">👁️</button>
              </div>
              <div class="error-message" id="err-reg-password"></div>
            </div>

            <div class="form-group">
              <label for="reg-confirm-password">Xác nhận mật khẩu <span class="required">*</span></label>
              <div class="input-wrap">
                <span class="input-icon">🛡️</span>
                <input type="password" id="reg-confirm-password" placeholder="Nhập lại mật khẩu">
                <button type="button" class="toggle-password-btn" data-target="reg-confirm-password">👁️</button>
              </div>
              <div class="error-message" id="err-reg-confirm-password"></div>
            </div>

            <div class="form-group">
              <label class="checkbox-container">
                <input type="checkbox" id="reg-terms" checked>
                <span class="checkmark"></span>
                Tôi đồng ý với <a href="#" style="color:var(--orange, #F97316);">Điều khoản & Chính sách</a> của Nam Nguyễn PC
              </label>
              <div class="error-message" id="err-reg-terms"></div>
            </div>

            <button type="submit" class="auth-btn-primary" id="btn-submit-register">
              <span class="btn-text">Đăng ký tài khoản</span>
              <span class="btn-spinner" style="display:none;">⏳</span>
            </button>

            <div class="auth-switch-footer">
              Đã có tài khoản? <a href="#" id="link-to-login">Đăng nhập ngay</a>
            </div>
          </form>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

/**
 * 2. Inject Profile Modal HTML structure into <body>
 */
function injectProfileModalHTML() {
  if (document.getElementById('profile-modal-overlay')) return;

  const profileHTML = `
    <div id="profile-modal-overlay" class="auth-modal-overlay" aria-hidden="true">
      <div class="auth-modal-card profile-modal-card">
        <button type="button" class="auth-modal-close" id="profile-modal-close-btn">&times;</button>

        <div class="auth-modal-header">
          <div class="auth-brand">
            <span class="brand-icon">👤</span>
            <span class="brand-name">Hồ Sơ Cá Nhân</span>
          </div>
          <p class="auth-subtitle">Quản lý thông tin tài khoản và bảo mật</p>
        </div>

        <div class="auth-tabs-nav">
          <button type="button" class="auth-tab-btn active" id="tab-profile-info" data-ptab="info">
            📝 Thông tin cá nhân
          </button>
          <button type="button" class="auth-tab-btn" id="tab-profile-pwd" data-ptab="pwd">
            🔐 Đổi mật khẩu
          </button>
        </div>

        <div id="profile-alert" class="auth-alert" style="display:none;"></div>

        <!-- TAB INFO -->
        <div id="ptab-info" class="auth-tab-content active">
          <form id="form-profile-info">
            <div class="form-group">
              <label for="prof-fullname">Họ và tên <span class="required">*</span></label>
              <div class="input-wrap">
                <span class="input-icon">📛</span>
                <input type="text" id="prof-fullname" placeholder="Nguyễn Văn A">
              </div>
            </div>

            <div class="form-group">
              <label for="prof-email">Địa chỉ Email</label>
              <div class="input-wrap">
                <span class="input-icon">✉️</span>
                <input type="email" id="prof-email" disabled style="background:#f3f4f6; cursor:not-allowed;">
              </div>
            </div>

            <div class="form-group">
              <label for="prof-phone">Số điện thoại</label>
              <div class="input-wrap">
                <span class="input-icon">📞</span>
                <input type="tel" id="prof-phone" placeholder="0987654321">
              </div>
            </div>

            <div class="form-group">
              <label for="prof-address">Địa chỉ giao hàng</label>
              <div class="input-wrap">
                <span class="input-icon">🏠</span>
                <input type="text" id="prof-address" placeholder="Nhập địa chỉ nhận hàng của bạn">
              </div>
            </div>

            <button type="submit" class="auth-btn-primary" id="btn-save-profile">
              <span class="btn-text">💾 Cập nhật thông tin</span>
              <span class="btn-spinner" style="display:none;">⏳</span>
            </button>
          </form>
        </div>

        <!-- TAB PASSWORD -->
        <div id="ptab-pwd" class="auth-tab-content">
          <form id="form-profile-pwd">
            <div class="form-group">
              <label for="pwd-current">Mật khẩu hiện tại <span class="required">*</span></label>
              <div class="input-wrap">
                <span class="input-icon">🔒</span>
                <input type="password" id="pwd-current" placeholder="Nhập mật khẩu hiện tại">
                <button type="button" class="toggle-password-btn" data-target="pwd-current">👁️</button>
              </div>
            </div>

            <div class="form-group">
              <label for="pwd-new">Mật khẩu mới <span class="required">*</span></label>
              <div class="input-wrap">
                <span class="input-icon">🔑</span>
                <input type="password" id="pwd-new" placeholder="Tối thiểu 6 ký tự">
                <button type="button" class="toggle-password-btn" data-target="pwd-new">👁️</button>
              </div>
            </div>

            <div class="form-group">
              <label for="pwd-confirm">Xác nhận mật khẩu mới <span class="required">*</span></label>
              <div class="input-wrap">
                <span class="input-icon">🛡️</span>
                <input type="password" id="pwd-confirm" placeholder="Nhập lại mật khẩu mới">
                <button type="button" class="toggle-password-btn" data-target="pwd-confirm">👁️</button>
              </div>
            </div>

            <button type="submit" class="auth-btn-primary" id="btn-save-pwd">
              <span class="btn-text">🔑 Đổi mật khẩu</span>
              <span class="btn-spinner" style="display:none;">⏳</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', profileHTML);
}

/**
 * 3. Inject Orders Modal HTML structure into <body>
 */
function injectOrdersModalHTML() {
  if (document.getElementById('orders-modal-overlay')) return;

  const ordersHTML = `
    <div id="orders-modal-overlay" class="auth-modal-overlay" aria-hidden="true">
      <div class="auth-modal-card orders-modal-card">
        <button type="button" class="auth-modal-close" id="orders-modal-close-btn">&times;</button>

        <div class="auth-modal-header">
          <div class="auth-brand">
            <span class="brand-icon">📦</span>
            <span class="brand-name">Đơn Hàng Của Tôi</span>
          </div>
          <p class="auth-subtitle">Theo dõi lịch sử và trạng thái đơn hàng</p>
        </div>

        <div class="orders-filter-bar">
          <button class="order-filter-btn active" data-filter="All">Tất cả</button>
          <button class="order-filter-btn" data-filter="Mới">Mới</button>
          <button class="order-filter-btn" data-filter="Đang xử lý">Đang xử lý</button>
          <button class="order-filter-btn" data-filter="Hoàn thành">Hoàn thành</button>
          <button class="order-filter-btn" data-filter="Hủy">Đã hủy</button>
        </div>

        <div id="my-orders-list-container" class="my-orders-list">
          <div class="orders-loading">⏳ Đang tải danh sách đơn hàng...</div>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', ordersHTML);
}

/**
 * 4. Inject Header buttons or Auth Container into Header if not existing
 */
function injectAuthHeaderUI() {
  const headerNavUl = document.querySelector('.site-header .main-nav ul');
  if (!headerNavUl) return;

  const oldItem = document.getElementById('header-auth-item');
  if (oldItem) oldItem.remove();

  const authLi = document.createElement('li');
  authLi.id = 'header-auth-item';
  authLi.className = 'header-auth-container';
  headerNavUl.appendChild(authLi);
}

/**
 * 5. Render Header state based on localStorage login state
 */
function checkAuthState() {
  const token = getToken();
  const userStr = localStorage.getItem('customer_user') || sessionStorage.getItem('customer_user');
  const authContainer = document.getElementById('header-auth-item');

  if (!authContainer) return;

  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);

      if (user.role === 'Admin' || user.role === 'Manager') {
        logoutCustomer();
        return;
      }

      const initials = (user.fullName || 'User').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

      authContainer.innerHTML = `
        <div class="user-profile-dropdown-wrap">
          <button type="button" class="user-profile-btn" id="user-profile-trigger">
            <span class="user-avatar">${initials}</span>
            <span class="user-name">${user.fullName || 'Khách hàng'}</span>
            <span class="dropdown-arrow">▼</span>
          </button>
          <div class="user-dropdown-menu" id="user-dropdown-menu">
            <div class="dropdown-header">
              <strong>${user.fullName}</strong>
              <small>${user.email || user.phone || ''}</small>
            </div>
            <hr>
            <button type="button" class="dropdown-item" id="btn-open-profile-dropdown">
              👤 Hồ sơ cá nhân
            </button>
            <button type="button" class="dropdown-item" id="btn-open-orders-dropdown">
              📦 Đơn hàng của tôi
            </button>
            <hr>
            <button type="button" class="dropdown-item logout-btn" id="btn-logout-customer">
              🚪 Đăng xuất
            </button>
          </div>
        </div>
      `;

      // Setup profile dropdown click toggle
      const trigger = document.getElementById('user-profile-trigger');
      const menu = document.getElementById('user-dropdown-menu');
      if (trigger && menu) {
        trigger.addEventListener('click', (e) => {
          e.stopPropagation();
          menu.classList.toggle('show');
        });
        document.addEventListener('click', (e) => {
          if (!menu.contains(e.target) && !trigger.contains(e.target)) {
            menu.classList.remove('show');
          }
        });
      }

      // Dropdown menu actions
      const btnProfile = document.getElementById('btn-open-profile-dropdown');
      const btnOrders = document.getElementById('btn-open-orders-dropdown');
      const logoutBtn = document.getElementById('btn-logout-customer');

      if (btnProfile) btnProfile.addEventListener('click', () => {
        if (menu) menu.classList.remove('show');
        openProfileModal();
      });

      if (btnOrders) btnOrders.addEventListener('click', () => {
        if (menu) menu.classList.remove('show');
        openMyOrdersModal();
      });

      if (logoutBtn) logoutBtn.addEventListener('click', logoutCustomer);

      return;
    } catch (e) {
      console.error('Invalid user state stored', e);
      logoutCustomer();
      return;
    }
  }

  // Render Logged-out state
  authContainer.innerHTML = `
    <div class="auth-header-buttons">
      <button type="button" class="btn-header-login" id="btn-header-login">🔑 Đăng nhập</button>
      <button type="button" class="btn-header-register" id="btn-header-register">📝 Đăng ký</button>
    </div>
  `;

  const btnLogin = document.getElementById('btn-header-login');
  const btnRegister = document.getElementById('btn-header-register');

  if (btnLogin) btnLogin.addEventListener('click', () => openAuthModal('login'));
  if (btnRegister) btnRegister.addEventListener('click', () => openAuthModal('register'));
}

/**
 * Get stored token helper
 */
function getToken() {
  return localStorage.getItem('customer_token') || sessionStorage.getItem('customer_token');
}

/**
 * 6. Setup Event Listeners
 */
function setupAuthEventListeners() {
  // Login/Reg Modal Close
  const modalOverlay = document.getElementById('auth-modal-overlay');
  const closeBtn = document.getElementById('auth-modal-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', closeAuthModal);
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeAuthModal();
    });
  }

  // Profile Modal Close & Tabs
  const profileOverlay = document.getElementById('profile-modal-overlay');
  const profCloseBtn = document.getElementById('profile-modal-close-btn');
  if (profCloseBtn) profCloseBtn.addEventListener('click', closeProfileModal);
  if (profileOverlay) {
    profileOverlay.addEventListener('click', (e) => {
      if (e.target === profileOverlay) closeProfileModal();
    });
  }

  const ptabBtns = document.querySelectorAll('[data-ptab]');
  ptabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      ptabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.ptab;
      document.getElementById('ptab-info').classList.toggle('active', target === 'info');
      document.getElementById('ptab-pwd').classList.toggle('active', target === 'pwd');
    });
  });

  // Profile Form Submits
  const formProfInfo = document.getElementById('form-profile-info');
  const formProfPwd = document.getElementById('form-profile-pwd');
  if (formProfInfo) formProfInfo.addEventListener('submit', handleProfileInfoSubmit);
  if (formProfPwd) formProfPwd.addEventListener('submit', handleProfilePwdSubmit);

  // Orders Modal Close & Filter Tabs
  const ordersOverlay = document.getElementById('orders-modal-overlay');
  const ordCloseBtn = document.getElementById('orders-modal-close-btn');
  if (ordCloseBtn) ordCloseBtn.addEventListener('click', closeOrdersModal);
  if (ordersOverlay) {
    ordersOverlay.addEventListener('click', (e) => {
      if (e.target === ordersOverlay) closeOrdersModal();
    });
  }

  // Escape key closes open modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAuthModal();
      closeProfileModal();
      closeOrdersModal();
    }
  });

  // Tab switching inside Auth Modal
  const tabBtns = document.querySelectorAll('.auth-tab-btn[data-tab]');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchAuthTab(btn.dataset.tab));
  });

  const linkToRegister = document.getElementById('link-to-register');
  const linkToLogin = document.getElementById('link-to-login');
  if (linkToRegister) linkToRegister.addEventListener('click', (e) => { e.preventDefault(); switchAuthTab('register'); });
  if (linkToLogin) linkToLogin.addEventListener('click', (e) => { e.preventDefault(); switchAuthTab('login'); });

  // Toggle password visibility
  const toggleBtns = document.querySelectorAll('.toggle-password-btn');
  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      if (input) {
        if (input.type === 'password') {
          input.type = 'text';
          btn.textContent = '🙈';
        } else {
          input.type = 'password';
          btn.textContent = '👁️';
        }
      }
    });
  });

  setupRealtimeValidation();

  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  if (formLogin) formLogin.addEventListener('submit', handleLoginSubmit);
  if (formRegister) formRegister.addEventListener('submit', handleRegisterSubmit);
}

function setupRealtimeValidation() {
  const loginAccount = document.getElementById('login-account');
  const loginPass = document.getElementById('login-password');
  if (loginAccount) loginAccount.addEventListener('input', () => clearFieldError('login-account'));
  if (loginPass) loginPass.addEventListener('input', () => clearFieldError('login-password'));

  const regName = document.getElementById('reg-fullname');
  const regEmail = document.getElementById('reg-email');
  const regPhone = document.getElementById('reg-phone');
  const regPass = document.getElementById('reg-password');
  const regConfirmPass = document.getElementById('reg-confirm-password');

  if (regName) regName.addEventListener('input', () => clearFieldError('reg-fullname'));
  if (regEmail) regEmail.addEventListener('input', () => clearFieldError('reg-email'));
  if (regPhone) regPhone.addEventListener('input', () => clearFieldError('reg-phone'));
  if (regPass) regPass.addEventListener('input', () => {
    clearFieldError('reg-password');
    if (regConfirmPass && regConfirmPass.value) validateConfirmPasswordMatch();
  });
  if (regConfirmPass) regConfirmPass.addEventListener('input', () => {
    clearFieldError('reg-confirm-password');
    validateConfirmPasswordMatch();
  });
}

function validateConfirmPasswordMatch() {
  const p1 = document.getElementById('reg-password').value;
  const p2 = document.getElementById('reg-confirm-password').value;
  if (p2 && p1 !== p2) {
    showFieldError('reg-confirm-password', 'Mật khẩu xác nhận không trùng khớp');
    return false;
  } else if (p2 && p1 === p2) {
    clearFieldError('reg-confirm-password');
  }
  return true;
}

/**
 * Open/Close Modals
 */
function openAuthModal(tab = 'login') {
  const modalOverlay = document.getElementById('auth-modal-overlay');
  if (modalOverlay) {
    hideGlobalAlert();
    switchAuthTab(tab);
    modalOverlay.classList.add('show');
    modalOverlay.setAttribute('aria-hidden', 'false');
  }
}

function closeAuthModal() {
  const modalOverlay = document.getElementById('auth-modal-overlay');
  if (modalOverlay) {
    modalOverlay.classList.remove('show');
    modalOverlay.setAttribute('aria-hidden', 'true');
  }
}

function switchAuthTab(tabName) {
  hideGlobalAlert();
  const tabBtns = document.querySelectorAll('.auth-tab-btn[data-tab]');
  const tabContents = document.querySelectorAll('.auth-tab-content');

  tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  tabContents.forEach(content => {
    if (content.id === `auth-tab-${tabName}`) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });
}

/**
 * PROFILE MODAL LOGIC
 */
async function openProfileModal() {
  const token = getToken();
  if (!token) {
    openAuthModal('login');
    return;
  }

  const overlay = document.getElementById('profile-modal-overlay');
  if (!overlay) return;

  hideProfileAlert();
  overlay.classList.add('show');

  // Fetch latest profile
  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      document.getElementById('prof-fullname').value = data.fullName || '';
      document.getElementById('prof-email').value = data.email || '';
      document.getElementById('prof-phone').value = data.phone || '';
      document.getElementById('prof-address').value = data.address || '';
    }
  } catch (e) {
    console.error('Error loading profile info:', e);
  }
}

function closeProfileModal() {
  const overlay = document.getElementById('profile-modal-overlay');
  if (overlay) overlay.classList.remove('show');
}

function showProfileAlert(message, type = 'error') {
  const alertDiv = document.getElementById('profile-alert');
  if (!alertDiv) return;
  alertDiv.className = `auth-alert alert-${type}`;
  alertDiv.innerHTML = message;
  alertDiv.style.display = 'block';
}

function hideProfileAlert() {
  const alertDiv = document.getElementById('profile-alert');
  if (alertDiv) alertDiv.style.display = 'none';
}

async function handleProfileInfoSubmit(e) {
  e.preventDefault();
  hideProfileAlert();

  const fullName = document.getElementById('prof-fullname').value.trim();
  const phone = document.getElementById('prof-phone').value.trim();
  const address = document.getElementById('prof-address').value.trim();
  const token = getToken();

  if (!fullName) {
    showProfileAlert('Vui lòng nhập Họ và tên');
    return;
  }

  const btn = document.getElementById('btn-save-profile');
  setButtonLoading(btn, true);

  try {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ fullName, phone, address })
    });

    const data = await res.json();
    if (res.ok) {
      // Update local storage
      const userStr = localStorage.getItem('customer_user') || sessionStorage.getItem('customer_user');
      if (userStr) {
        const u = JSON.parse(userStr);
        u.fullName = data.user.fullName;
        u.phone = data.user.phone;
        u.address = data.user.address;
        const storage = localStorage.getItem('customer_token') ? localStorage : sessionStorage;
        storage.setItem('customer_user', JSON.stringify(u));
      }

      showProfileAlert('🎉 ' + data.message, 'success');
      checkAuthState();
    } else {
      showProfileAlert(data.error || 'Cập nhật thất bại');
    }
  } catch (err) {
    showProfileAlert('Lỗi kết nối máy chủ');
  } finally {
    setButtonLoading(btn, false);
  }
}

async function handleProfilePwdSubmit(e) {
  e.preventDefault();
  hideProfileAlert();

  const currentPassword = document.getElementById('pwd-current').value;
  const newPassword = document.getElementById('pwd-new').value;
  const confirmPassword = document.getElementById('pwd-confirm').value;
  const token = getToken();

  if (!currentPassword || !newPassword || !confirmPassword) {
    showProfileAlert('Vui lòng điền đầy đủ thông tin mật khẩu');
    return;
  }

  if (newPassword.length < 6) {
    showProfileAlert('Mật khẩu mới phải từ 6 ký tự trở lên');
    return;
  }

  if (newPassword !== confirmPassword) {
    showProfileAlert('Mật khẩu mới không trùng khớp');
    return;
  }

  const btn = document.getElementById('btn-save-pwd');
  setButtonLoading(btn, true);

  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    const data = await res.json();
    if (res.ok) {
      showProfileAlert('🎉 ' + data.message, 'success');
      document.getElementById('form-profile-pwd').reset();
    } else {
      showProfileAlert(data.error || 'Đổi mật khẩu thất bại');
    }
  } catch (err) {
    showProfileAlert('Lỗi kết nối máy chủ');
  } finally {
    setButtonLoading(btn, false);
  }
}

/**
 * MY ORDERS MODAL LOGIC
 */
let allMyOrders = [];

async function openMyOrdersModal() {
  const token = getToken();
  if (!token) {
    openAuthModal('login');
    return;
  }

  const overlay = document.getElementById('orders-modal-overlay');
  if (!overlay) return;

  overlay.classList.add('show');
  const container = document.getElementById('my-orders-list-container');
  container.innerHTML = '<div class="orders-loading">⏳ Đang tải danh sách đơn hàng...</div>';

  try {
    const res = await fetch('/api/orders/my-orders', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      container.innerHTML = '<div class="orders-error">❌ Không thể nạp đơn hàng. Vui lòng thử lại sau!</div>';
      return;
    }

    allMyOrders = await res.json();
    renderMyOrdersList('All');
    setupOrdersFilterTabs();

  } catch (e) {
    console.error('Error fetching my orders:', e);
    container.innerHTML = '<div class="orders-error">❌ Lỗi kết nối mạng khi tải đơn hàng.</div>';
  }
}

function closeOrdersModal() {
  const overlay = document.getElementById('orders-modal-overlay');
  if (overlay) overlay.classList.remove('show');
}

function setupOrdersFilterTabs() {
  const btns = document.querySelectorAll('.order-filter-btn');
  btns.forEach(btn => {
    btn.onclick = () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderMyOrdersList(btn.dataset.filter);
    };
  });
}

function renderMyOrdersList(filterStatus) {
  const container = document.getElementById('my-orders-list-container');
  if (!container) return;

  let filtered = allMyOrders;
  if (filterStatus !== 'All') {
    filtered = allMyOrders.filter(o => o.trang_thai === filterStatus);
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-orders">
        <span class="empty-icon">📦</span>
        <p>Bạn chưa có đơn hàng nào ${filterStatus !== 'All' ? `ở trạng thái "${filterStatus}"` : ''}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(order => {
    const orderDate = new Date(order.ngay_dat || Date.now()).toLocaleString('vi-VN');
    const statusClass = getOrderStatusClass(order.trang_thai);
    const totalMoney = (Number(order.tong_tien) || 0).toLocaleString('vi-VN') + ' đ';

    const itemsHTML = (order.items || []).map(item => {
      const imgPath = item.duong_dan_anh || item.hinh_anh || '';
      const img = imgPath ? (imgPath.startsWith('http') ? imgPath : (imgPath.startsWith('/') ? imgPath : `/${imgPath}`)) : 'logo.png';
      const unitPrice = Number(item.don_gia || item.gia_luc_mua || 0);
      const itemTotal = (unitPrice * (item.so_luong || 1)).toLocaleString('vi-VN') + ' đ';

      return `
        <div class="order-item-row">
          <img src="${img}" alt="${item.ten_san_pham || 'Sản phẩm'}" class="order-item-img" onerror="this.src='logo.png'">
          <div class="order-item-info">
            <h4 class="order-item-name">${item.ten_san_pham || 'Sản phẩm'}</h4>
            <div class="order-item-qty">Số lượng: <strong>x${item.so_luong || 1}</strong> (${unitPrice.toLocaleString('vi-VN')} đ/SP)</div>
          </div>
          <div class="order-item-price">${itemTotal}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="order-card">
        <div class="order-card-header">
          <div class="order-meta">
            <span class="order-id">Đơn hàng #${order.id}</span>
            <span class="order-date">📅 ${order.ngay_dat ? orderDate : 'Mới đặt'}</span>
          </div>
          <span class="order-status-badge ${statusClass}">${order.trang_thai || 'Mới'}</span>
        </div>

        <div class="order-card-items">
          ${itemsHTML}
        </div>

        <div class="order-card-footer">
          <div class="order-address">
            📍 <strong>Người nhận:</strong> ${order.ho_ten || ''} (${order.so_dien_thoai || ''}) - ${order.dia_chi || ''}
          </div>
          <div class="order-total">
            Tổng cộng: <span class="total-price">${totalMoney}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function getOrderStatusClass(status) {
  switch (status) {
    case 'Mới': return 'status-new';
    case 'Đang xử lý': return 'status-processing';
    case 'Hoàn thành': return 'status-completed';
    case 'Hủy': return 'status-cancelled';
    default: return 'status-new';
  }
}

/**
 * Form Helper: Show/Clear Field Error
 */
function showFieldError(fieldId, message) {
  const errDiv = document.getElementById(`err-${fieldId}`);
  const inputEl = document.getElementById(fieldId);
  if (errDiv) {
    errDiv.textContent = message;
    errDiv.style.display = 'block';
  }
  if (inputEl) {
    inputEl.classList.add('has-error');
  }
}

function clearFieldError(fieldId) {
  const errDiv = document.getElementById(`err-${fieldId}`);
  const inputEl = document.getElementById(fieldId);
  if (errDiv) {
    errDiv.textContent = '';
    errDiv.style.display = 'none';
  }
  if (inputEl) {
    inputEl.classList.remove('has-error');
  }
}

function clearAllErrors(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  const errDivs = form.querySelectorAll('.error-message');
  errDivs.forEach(d => { d.textContent = ''; d.style.display = 'none'; });
  const inputs = form.querySelectorAll('.has-error');
  inputs.forEach(i => i.classList.remove('has-error'));
}

function showGlobalAlert(message, type = 'error') {
  const alertDiv = document.getElementById('auth-global-alert');
  if (!alertDiv) return;
  alertDiv.className = `auth-alert alert-${type}`;
  alertDiv.innerHTML = message;
  alertDiv.style.display = 'block';
}

function hideGlobalAlert() {
  const alertDiv = document.getElementById('auth-global-alert');
  if (alertDiv) {
    alertDiv.style.display = 'none';
    alertDiv.innerHTML = '';
  }
}

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

function isValidPhone(phone) {
  const re = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
  return re.test(phone.trim());
}

/**
 * Handle Login Form Submit
 */
async function handleLoginSubmit(e) {
  e.preventDefault();
  hideGlobalAlert();
  clearAllErrors('form-login');

  const accountInput = document.getElementById('login-account').value.trim();
  const passwordInput = document.getElementById('login-password').value;
  const rememberMe = document.getElementById('login-remember').checked;

  let hasError = false;

  if (!accountInput) {
    showFieldError('login-account', 'Vui lòng nhập Email hoặc Số điện thoại');
    hasError = true;
  }

  if (!passwordInput) {
    showFieldError('login-password', 'Vui lòng nhập Mật khẩu');
    hasError = true;
  } else if (passwordInput.length < 6) {
    showFieldError('login-password', 'Mật khẩu phải từ 6 ký tự trở lên');
    hasError = true;
  }

  if (hasError) return;

  const btnSubmit = document.getElementById('btn-submit-login');
  setButtonLoading(btnSubmit, true);

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usernameOrEmail: accountInput,
        password: passwordInput,
        rememberMe: rememberMe,
        clientType: 'Customer'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      showGlobalAlert(data.error || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin!');
      setButtonLoading(btnSubmit, false);
      return;
    }

    if (data.user && (data.user.role === 'Admin' || data.user.role === 'Manager')) {
      showGlobalAlert('⚠️ <strong>Tài khoản Admin không được phép đăng nhập ở đây!</strong><br>Vui lòng đăng nhập tại Trang Quản trị (Admin Portal).');
      setButtonLoading(btnSubmit, false);
      return;
    }

    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('customer_token', data.token);
    storage.setItem('customer_user', JSON.stringify(data.user));

    showGlobalAlert('🎉 Đăng nhập thành công! Đang chuyển trạng thái...', 'success');

    setTimeout(() => {
      closeAuthModal();
      checkAuthState();
      setButtonLoading(btnSubmit, false);
    }, 800);

  } catch (err) {
    console.error('Login request error:', err);
    showGlobalAlert('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.');
    setButtonLoading(btnSubmit, false);
  }
}

/**
 * Handle Register Form Submit
 */
async function handleRegisterSubmit(e) {
  e.preventDefault();
  hideGlobalAlert();
  clearAllErrors('form-register');

  const fullName = document.getElementById('reg-fullname').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirmPassword = document.getElementById('reg-confirm-password').value;
  const terms = document.getElementById('reg-terms').checked;

  let hasError = false;

  if (!fullName || fullName.length < 2) {
    showFieldError('reg-fullname', 'Họ và tên phải có ít nhất 2 ký tự');
    hasError = true;
  }

  if (!email) {
    showFieldError('reg-email', 'Vui lòng nhập địa chỉ Email');
    hasError = true;
  } else if (!isValidEmail(email)) {
    showFieldError('reg-email', 'Định dạng Email không hợp lệ (ví dụ: name@gmail.com)');
    hasError = true;
  }

  if (!phone) {
    showFieldError('reg-phone', 'Vui lòng nhập Số điện thoại');
    hasError = true;
  } else if (!isValidPhone(phone)) {
    showFieldError('reg-phone', 'Số điện thoại không hợp lệ (gồm 10 chữ số, VD: 0987654321)');
    hasError = true;
  }

  if (!password) {
    showFieldError('reg-password', 'Vui lòng tạo mật khẩu');
    hasError = true;
  } else if (password.length < 6) {
    showFieldError('reg-password', 'Mật khẩu phải chứa ít nhất 6 ký tự');
    hasError = true;
  }

  if (!confirmPassword) {
    showFieldError('reg-confirm-password', 'Vui lòng xác nhận mật khẩu');
    hasError = true;
  } else if (password !== confirmPassword) {
    showFieldError('reg-confirm-password', 'Mật khẩu xác nhận không trùng khớp');
    hasError = true;
  }

  if (!terms) {
    showFieldError('reg-terms', 'Bạn cần đồng ý với Điều khoản dịch vụ để tiếp tục');
    hasError = true;
  }

  if (hasError) return;

  const btnSubmit = document.getElementById('btn-submit-register');
  setButtonLoading(btnSubmit, true);

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: fullName,
        email: email,
        phone: phone,
        password: password,
        role: 'Customer'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      showGlobalAlert(data.error || 'Đăng ký không thành công. Vui lòng thử lại!');
      setButtonLoading(btnSubmit, false);
      return;
    }

    showGlobalAlert('🎉 ' + (data.message || 'Đăng ký tài khoản thành công!'), 'success');

    setTimeout(() => {
      document.getElementById('login-account').value = email;
      switchAuthTab('login');
      showGlobalAlert('Vui lòng nhập lại mật khẩu vừa đăng ký để đăng nhập!', 'info');
      setButtonLoading(btnSubmit, false);
    }, 1200);

  } catch (err) {
    console.error('Register request error:', err);
    showGlobalAlert('Lỗi kết nối máy chủ. Vui lòng thử lại sau!');
    setButtonLoading(btnSubmit, false);
  }
}

/**
 * Logout Customer
 */
function logoutCustomer() {
  localStorage.removeItem('customer_token');
  localStorage.removeItem('customer_user');
  sessionStorage.removeItem('customer_token');
  sessionStorage.removeItem('customer_user');

  checkAuthState();
  alert('Đã đăng xuất khỏi tài khoản!');
}

/**
 * Guest Guard – Yêu cầu đăng nhập trước khi thực hiện hành động mua hàng.
 * Dùng cho tất cả các nút: Thêm vào giỏ, Mua ngay, Thanh toán.
 *
 * @param {Function} action - Hàm sẽ được gọi nếu đã đăng nhập
 * @param {string} [message] - Thông báo tuỳ chọn khi chặn Guest
 */
function requireLogin(action, message) {
  const token = getToken();
  if (token) {
    if (typeof action === 'function') action();
  } else {
    const msg = message || '🔐 Vui lòng <strong>đăng nhập</strong> để mua hàng và sử dụng giỏ hàng!';
    openAuthModal('login');
    // Hiển thị alert sau khi modal mở (delay nhỏ để modal render xong)
    setTimeout(() => {
      showGlobalAlert(msg, 'info');
    }, 50);
  }
}

// Expose globally so product-card.js, product_detail.html, cart.html can use it
window.requireLogin = requireLogin;

function setButtonLoading(btnEl, isLoading) {
  if (!btnEl) return;
  const textEl = btnEl.querySelector('.btn-text');
  const spinnerEl = btnEl.querySelector('.btn-spinner');

  if (isLoading) {
    btnEl.disabled = true;
    if (textEl) textEl.style.opacity = '0.5';
    if (spinnerEl) spinnerEl.style.display = 'inline-block';
  } else {
    btnEl.disabled = false;
    if (textEl) textEl.style.opacity = '1';
    if (spinnerEl) spinnerEl.style.display = 'none';
  }
}
