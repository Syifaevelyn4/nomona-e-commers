// ═══════════════════════════════════════════════════════
// NOMONA COOKIES — auth.js
// Login / Register logic
// ═══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // ─── Register Form ──────────────────────────────────
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = registerForm.querySelector('button[type="submit"]');
      const username = document.getElementById('username').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const confirm = document.getElementById('confirmPassword').value;

      if (!username || !email || !password) { showToast('Semua field wajib diisi', 'error'); return; }
      if (password !== confirm) { showToast('Password tidak cocok', 'error'); return; }
      if (password.length < 6) { showToast('Password minimal 6 karakter', 'error'); return; }

      btn.disabled = true; btn.textContent = 'Mendaftar...';
      try {
        const res = await fetch('/register', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        if (data.error) { showToast(data.error, 'error'); }
        else { showToast('Registrasi berhasil! Selamat datang 🎉'); setTimeout(() => window.location.href = 'index.html', 1000); }
      } catch { showToast('Terjadi kesalahan', 'error'); }
      finally { btn.disabled = false; btn.textContent = 'Daftar Sekarang'; }
    });
  }

  // ─── Login Form ─────────────────────────────────────
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = loginForm.querySelector('button[type="submit"]');
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;
      if (!username || !password) { showToast('Isi semua field', 'error'); return; }

      btn.disabled = true; btn.textContent = 'Masuk...';
      try {
        const res = await fetch('/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.error) { showToast(data.error, 'error'); }
        else { showToast(`Selamat datang, ${data.username}! 🍪`); setTimeout(() => window.location.href = 'index.html', 900); }
      } catch { showToast('Terjadi kesalahan', 'error'); }
      finally { btn.disabled = false; btn.textContent = 'Masuk'; }
    });
  }

  // ─── Admin Login ─────────────────────────────────────
  const adminForm = document.getElementById('adminLoginForm');
  if (adminForm) {
    adminForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = adminForm.querySelector('button[type="submit"]');
      const username = document.getElementById('adminUsername').value.trim();
      const password = document.getElementById('adminPassword').value;

      btn.disabled = true; btn.textContent = 'Masuk...';
      try {
        const res = await fetch('/admin/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.error) { showToast(data.error, 'error'); }
        else { showToast('Login admin berhasil!'); setTimeout(() => window.location.href = 'dashboard.html', 800); }
      } catch { showToast('Terjadi kesalahan', 'error'); }
      finally { btn.disabled = false; btn.textContent = 'Masuk ke Admin'; }
    });
  }
});

// ─── Password Toggle ─────────────────────────────────
function togglePassword(id, btn) {
  const input = document.getElementById(id);
  if (input.type === 'password') { input.type = 'text'; btn.textContent = '🙈'; }
  else { input.type = 'password'; btn.textContent = '👁️'; }
}