// ═══════════════════════════════════════════════════════
// NOMONA COOKIES — app.js
// Shared utilities, navbar, toast notifications
// ═══════════════════════════════════════════════════════

// ─── Toast Notifications ──────────────────────────────
function showToast(msg, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || '🍪'}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3200);
}

// ─── Format Currency ─────────────────────────────────
function formatRupiah(num) {
  return 'Rp ' + Number(num).toLocaleString('id-ID');
}

// ─── Navbar Scroll Effect ─────────────────────────────
window.addEventListener('scroll', () => {
  const nav = document.querySelector('.navbar');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
});

// ─── Hamburger Menu ───────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove('open');
      }
    });
  }

  // Update active nav link
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // Update cart badge
  updateCartBadge();
  // Update auth buttons
  updateNavAuth();
});

// ─── Cart Badge ───────────────────────────────────────
function updateCartBadge() {
  const cart = getCart();
  const count = cart.reduce((sum, i) => sum + i.quantity, 0);
  document.querySelectorAll('.cart-badge').forEach(b => {
    b.textContent = count;
    b.style.display = count > 0 ? 'flex' : 'none';
  });
}

// ─── Skeleton Loader ──────────────────────────────────
function createSkeleton(count = 3) {
  return Array(count).fill(0).map(() => `
    <div class="product-card">
      <div class="skeleton" style="height:220px;"></div>
      <div class="product-card-body">
        <div class="skeleton" style="height:12px;width:60%;margin-bottom:8px;"></div>
        <div class="skeleton" style="height:20px;margin-bottom:8px;"></div>
        <div class="skeleton" style="height:12px;margin-bottom:6px;"></div>
        <div class="skeleton" style="height:12px;width:80%;margin-bottom:16px;"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div class="skeleton" style="height:24px;width:90px;"></div>
          <div class="skeleton" style="height:36px;width:100px;border-radius:8px;"></div>
        </div>
      </div>
    </div>
  `).join('');
}

// ─── Render Product Card ──────────────────────────────
function renderProductCard(p) {
  const imgSrc = `/images/${p.image}`;
  return `
    <div class="product-card" data-id="${p.id}">
      <div class="product-card-img-wrap">
        <img src="${imgSrc}" alt="${p.name}" class="product-card-img" onerror="this.src='/images/placeholder.svg'">
        <span class="product-card-badge">${p.category}</span>
      </div>
      <div class="product-card-body">
        <div class="product-card-category">${p.category}</div>
        <h3 class="product-card-name">${p.name}</h3>
        <p class="product-card-desc">${p.description || ''}</p>
        <div class="product-card-footer">
          <div class="product-card-price">${formatRupiah(p.price)}</div>
          <div style="display:flex;gap:0.5rem;">
            <a href="detail.html?id=${p.id}" class="btn btn-ghost btn-sm">Detail</a>
            <button class="btn-add-cart" onclick="addToCartById(${p.id}, '${p.name.replace(/'/g,"\\'")}', ${p.price}, '${p.image}')">
              🛒 Tambah
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ─── Auth State ───────────────────────────────────────
async function updateNavAuth() {
  try {
    const res = await fetch('/me');
    const data = await res.json();
    const loginBtn = document.getElementById('navLoginBtn');
    const userMenu = document.getElementById('navUserMenu');
    const userNameEl = document.getElementById('navUsername');
    if (data.loggedIn && loginBtn && userMenu) {
      loginBtn.style.display = 'none';
      userMenu.style.display = 'flex';
      if (userNameEl) userNameEl.textContent = data.isAdmin ? '👑 Admin' : `👤 ${data.user.username}`;
    }
  } catch (e) {}
}

async function logout() {
  await fetch('/logout', { method: 'POST' });
  window.location.href = 'index.html';
}

// ─── Quick Add to Cart By ID ──────────────────────────
async function addToCartById(id, name, price, image) {
  addToCart({ id, name, price, image, quantity: 1 });
  showToast(`🍪 ${name} ditambahkan ke keranjang!`);
}