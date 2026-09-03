/**
 * AUTHENTICATION & BCRYPT SECURITY UI MODULE
 * Handles Sign In, Sign Up with password complexity analysis, and session state.
 */

// Calculate password complexity for max security sign up
function calculatePasswordStrength(password) {
  let score = 0;
  if (!password) return { score: 0, label: 'None', color: '#64748b' };

  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 15;
  if (/[A-Z]/.test(password)) score += 20;
  if (/[0-9]/.test(password)) score += 20;
  if (/[^A-Za-z0-9]/.test(password)) score += 20;

  if (score < 40) return { score, label: 'Weak (Bcrypt Salt 12 will hash)', color: '#ff3366' };
  if (score < 75) return { score, label: 'Moderate Security', color: '#ffaa00' };
  return { score, label: 'Maximum Security (High Entropy)', color: '#00ffaa' };
}

// Update UI Navigation based on current user session
function updateNavAuthUI() {
  const user = window.api.user;
  const userContainer = document.getElementById('nav-user-container');
  if (!userContainer) return;

  if (user) {
    userContainer.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <div style="display: flex; flex-direction: column; align-items: flex-end;">
          <span style="font-size: 0.88rem; font-weight: 600; color: var(--text-primary);">${escapeHtml(user.fullName || user.email)}</span>
          <span style="font-size: 0.7rem; font-family: var(--font-mono); color: ${user.role === 'admin' ? 'var(--accent-purple)' : 'var(--accent-cyan)'}; text-transform: uppercase;">
            ${user.role === 'admin' ? '👑 Admin' : '👤 Customer'}
          </span>
        </div>
        ${user.role === 'admin' ? `
          <a href="admin.html" class="btn btn-purple btn-sm" id="nav-btn-admin">
            Admin Panel
          </a>
        ` : ''}
        <button class="btn btn-secondary btn-sm" id="btn-logout" title="Sign Out">
          Sign Out
        </button>
      </div>
    `;

    document.getElementById('btn-logout')?.addEventListener('click', () => {
      window.api.logout();
      window.showToast('You have been signed out.', 'info');
    });
  } else {
    userContainer.innerHTML = `
      <button class="btn btn-secondary btn-sm" id="btn-open-login">
        Sign In
      </button>
      <button class="btn btn-primary btn-sm" id="btn-open-register">
        Sign Up
      </button>
    `;

    document.getElementById('btn-open-login')?.addEventListener('click', () => openAuthModal('login'));
    document.getElementById('btn-open-register')?.addEventListener('click', () => openAuthModal('register'));
  }
}

function openAuthModal(mode = 'login') {
  const modal = document.getElementById('auth-modal');
  if (!modal) {
    window.location.href = `auth.html?mode=${mode}`;
    return;
  }

  const loginTab = document.getElementById('auth-tab-login');
  const regTab = document.getElementById('auth-tab-register');
  const loginForm = document.getElementById('login-form');
  const regForm = document.getElementById('register-form');

  if (mode === 'login') {
    loginTab?.classList.add('active');
    regTab?.classList.remove('active');
    loginForm?.style.setProperty('display', 'block');
    regForm?.style.setProperty('display', 'none');
  } else {
    regTab?.classList.add('active');
    loginTab?.classList.remove('active');
    regForm?.style.setProperty('display', 'block');
    loginForm?.style.setProperty('display', 'none');
  }

  modal.showModal();
}

function setupAuthForms() {
  // Login Form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      const submitBtn = loginForm.querySelector('button[type="submit"]');

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying Bcrypt Hash...';

        const res = await window.api.login(email, password);
        window.showToast(`Welcome back, ${res.user.fullName || res.user.email}!`, 'success');
        
        const modal = document.getElementById('auth-modal');
        if (modal) modal.close();

        updateNavAuthUI();
        if (window.refreshStoreData) window.refreshStoreData();
      } catch (err) {
        window.showToast(err.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In to Account';
      }
    });
  }

  // Register Form with Password Strength
  const regForm = document.getElementById('register-form');
  const regPass = document.getElementById('reg-password');
  const strengthFill = document.getElementById('pass-strength-fill');
  const strengthText = document.getElementById('pass-strength-text');

  if (regPass && strengthFill && strengthText) {
    regPass.addEventListener('input', () => {
      const val = regPass.value;
      const { score, label, color } = calculatePasswordStrength(val);
      strengthFill.style.width = `${score}%`;
      strengthFill.style.backgroundColor = color;
      strengthText.textContent = `Strength: ${label}`;
      strengthText.style.color = color;
    });
  }

  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fullName = document.getElementById('reg-name').value;
      const email = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;
      const submitBtn = regForm.querySelector('button[type="submit"]');

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Hashing Password (Bcrypt 12)...';

        const res = await window.api.register(fullName, email, password);
        window.showToast('Account created with maximum security! Signed in.', 'success');

        const modal = document.getElementById('auth-modal');
        if (modal) modal.close();

        updateNavAuthUI();
        if (window.refreshStoreData) window.refreshStoreData();
      } catch (err) {
        window.showToast(err.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Protected Account';
      }
    });
  }

  // Demo Fast-Login buttons
  document.querySelectorAll('[data-demo-login]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const role = btn.dataset.demoLogin;
      const creds = role === 'admin'
        ? { email: 'admin@softwarestore.com', pass: 'Admin@123456' }
        : { email: 'customer@example.com', pass: 'Customer@123456' };

      const emailInput = document.getElementById('login-email');
      const passInput = document.getElementById('login-password');
      if (emailInput && passInput) {
        emailInput.value = creds.email;
        passInput.value = creds.pass;
      }

      try {
        btn.textContent = 'Logging in...';
        const res = await window.api.login(creds.email, creds.pass);
        window.showToast(`Logged in as ${role === 'admin' ? 'Admin' : 'Customer'}!`, 'success');
        const modal = document.getElementById('auth-modal');
        if (modal) modal.close();
        updateNavAuthUI();
        if (role === 'admin' && window.location.pathname.includes('auth.html')) {
          window.location.href = 'admin.html';
        } else if (window.refreshStoreData) {
          window.refreshStoreData();
        }
      } catch (err) {
        window.showToast(err.message, 'error');
      } finally {
        btn.textContent = role === 'admin' ? 'Demo Admin' : 'Demo Customer';
      }
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', () => {
  updateNavAuthUI();
  setupAuthForms();
});
