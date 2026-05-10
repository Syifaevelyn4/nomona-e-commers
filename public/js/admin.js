// ═══════════════════════════════════════════════════════
// NOMONA COOKIES — admin.js
// Admin dashboard, products & orders management
// ═══════════════════════════════════════════════════════

// ─── Auth Check ────────────────────────────────────────
async function checkAdminAuth() {
  const res = await fetch('/me');
  const data = await res.json();
  if (!data.loggedIn || !data.isAdmin) {
    window.location.href = 'admin.html';
    return false;
  }
  return true;
}

// ─── Dashboard ─────────────────────────────────────────
async function loadDashboard() {
  if (!await checkAdminAuth()) return;
  try {
    const res = await fetch('/admin/stats');
    const stats = await res.json();
    document.getElementById('statProducts').textContent = stats.totalProducts;
    document.getElementById('statOrders').textContent = stats.totalOrders;
    document.getElementById('statRevenue').textContent = formatRupiah(stats.totalRevenue);
    document.getElementById('statPending').textContent = stats.pendingOrders;

    const tbody = document.getElementById('recentOrdersBody');
    if (tbody) {
      if (stats.recentOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-light);padding:2rem">Belum ada pesanan</td></tr>';
        return;
      }
      tbody.innerHTML = stats.recentOrders.map(o => `
        <tr>
          <td>#${o.id}</td>
          <td>${o.customer_name}</td>
          <td>${formatRupiah(o.total)}</td>
          <td><span class="badge badge-${o.status}">${o.status}</span></td>
          <td>${formatDate(o.created_at)}</td>
        </tr>
      `).join('');
    }

    // Chart
    if (stats.salesByDay.length > 0) renderSalesChart(stats.salesByDay);
  } catch (e) { console.error(e); }
}

// ─── Simple Bar Chart ──────────────────────────────────
function renderSalesChart(data) {
  const chartEl = document.getElementById('salesChart');
  if (!chartEl) return;
  const max = Math.max(...data.map(d => d.total), 1);
  const reversed = [...data].reverse().slice(0, 7);
  chartEl.innerHTML = `
    <div style="display:flex;align-items:flex-end;gap:8px;height:140px;padding:0 8px;">
      ${reversed.map(d => {
        const h = Math.max(4, Math.round((d.total / max) * 130));
        const label = d.date ? d.date.slice(5) : '';
        return `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
            <div style="font-size:0.65rem;color:var(--text-light)">${formatRupiah(d.total).replace('Rp ','')}k</div>
            <div style="width:100%;height:${h}px;background:linear-gradient(180deg,var(--primary) 0%,var(--primary-light) 100%);border-radius:6px 6px 0 0;transition:height 0.5s ease;"></div>
            <div style="font-size:0.65rem;color:var(--text-light)">${label}</div>
          </div>`;
      }).join('')}
    </div>
  `;
}

// ─── Products Admin ────────────────────────────────────
async function loadAdminProducts() {
  if (!await checkAdminAuth()) return;
  const res = await fetch('/products');
  const products = await res.json();
  const tbody = document.getElementById('productsTableBody');
  if (!tbody) return;
  if (products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-light);padding:2rem">Belum ada produk</td></tr>';
    return;
  }
  tbody.innerHTML = products.map(p => `
    <tr>
      <td><img src="/images/${p.image}" alt="${p.name}" style="width:48px;height:48px;object-fit:cover;border-radius:10px;" onerror="this.src='/images/placeholder.svg'"></td>
      <td><strong>${p.name}</strong></td>
      <td><span class="badge" style="background:var(--secondary);color:var(--primary)">${p.category}</span></td>
      <td>${formatRupiah(p.price)}</td>
      <td>${p.stock}</td>
      <td>
        <div style="display:flex;gap:0.5rem;">
          <button class="btn btn-ghost btn-sm" onclick="openEditProduct(${p.id})">✏️ Edit</button>
          <button class="btn btn-sm" style="background:#fee2e2;color:#ef4444" onclick="deleteProduct(${p.id}, '${p.name.replace(/'/g,"\\'")}')">🗑️ Hapus</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ─── Add Product ───────────────────────────────────────
function openAddProduct() {
  document.getElementById('productModalTitle').textContent = 'Tambah Produk Baru';
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
  document.getElementById('productImgPreview').style.display = 'none';
  openModal('productModal');
}

async function openEditProduct(id) {
  const res = await fetch(`/product/${id}`);
  const data = await res.json();
  const p = data.product;
  document.getElementById('productModalTitle').textContent = 'Edit Produk';
  document.getElementById('productId').value = p.id;
  document.getElementById('productName').value = p.name;
  document.getElementById('productPrice').value = p.price;
  document.getElementById('productCategory').value = p.category;
  document.getElementById('productStock').value = p.stock;
  document.getElementById('productDesc').value = p.description;
  const imgPreview = document.getElementById('productImgPreview');
  imgPreview.src = `/images/${p.image}`;
  imgPreview.style.display = 'block';
  openModal('productModal');
}

async function saveProduct() {
  const id = document.getElementById('productId').value;
  const formData = new FormData();
  formData.append('name', document.getElementById('productName').value);
  formData.append('price', document.getElementById('productPrice').value);
  formData.append('category', document.getElementById('productCategory').value);
  formData.append('stock', document.getElementById('productStock').value);
  formData.append('description', document.getElementById('productDesc').value);
  const imageFile = document.getElementById('productImage').files[0];
  if (imageFile) formData.append('image', imageFile);

  const url = id ? `/edit-product/${id}` : '/add-product';
  const method = id ? 'PUT' : 'POST';
  const res = await fetch(url, { method, body: formData });
  const data = await res.json();
  if (data.error) { showToast(data.error, 'error'); return; }
  showToast(id ? 'Produk berhasil diperbarui!' : 'Produk berhasil ditambahkan!');
  closeModal('productModal');
  loadAdminProducts();
}

async function deleteProduct(id, name) {
  if (!confirm(`Hapus produk "${name}"?`)) return;
  const res = await fetch(`/delete-product/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (data.error) { showToast(data.error, 'error'); return; }
  showToast('Produk berhasil dihapus!');
  loadAdminProducts();
}

// ─── Orders Admin ──────────────────────────────────────
async function loadAdminOrders() {
  if (!await checkAdminAuth()) return;
  const res = await fetch('/orders');
  const orders = await res.json();
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;
  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-light);padding:2rem">Belum ada pesanan</td></tr>';
    return;
  }
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td><strong>#${o.id}</strong></td>
      <td>${o.customer_name}</td>
      <td style="max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${o.address}">${o.address}</td>
      <td>${o.whatsapp}</td>
      <td>${formatRupiah(o.total)}</td>
      <td><span class="badge badge-${o.status}">${o.status}</span></td>
      <td>
        <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
          <button class="btn btn-sm" style="background:#fef3c7;color:#d97706" onclick="changeOrderStatus(${o.id},'diproses')">🔄 Proses</button>
          <button class="btn btn-sm" style="background:#dcfce7;color:#16a34a" onclick="changeOrderStatus(${o.id},'selesai')">✅ Selesai</button>
          <button class="btn btn-ghost btn-sm" onclick="viewOrderDetail(${o.id})">👁️ Detail</button>
        </div>
      </td>
    </tr>
  `).join('');
  window._orders = orders;
}

async function changeOrderStatus(id, status) {
  const res = await fetch(`/finish-order/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  const data = await res.json();
  if (data.error) { showToast(data.error, 'error'); return; }
  showToast(`Status order #${id} diubah ke "${status}"`);
  loadAdminOrders();
}

function viewOrderDetail(id) {
  const order = (window._orders || []).find(o => o.id === id);
  if (!order) return;
  document.getElementById('orderDetailContent').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
      <div><div style="font-size:0.75rem;color:var(--text-light);margin-bottom:4px">NAMA CUSTOMER</div><strong>${order.customer_name}</strong></div>
      <div><div style="font-size:0.75rem;color:var(--text-light);margin-bottom:4px">WHATSAPP</div><a href="https://wa.me/${order.whatsapp.replace(/[^0-9]/g,'')}62" target="_blank" style="color:var(--primary)">📱 ${order.whatsapp}</a></div>
      <div style="grid-column:1/-1"><div style="font-size:0.75rem;color:var(--text-light);margin-bottom:4px">ALAMAT</div><span>${order.address}</span></div>
      ${order.note ? `<div style="grid-column:1/-1"><div style="font-size:0.75rem;color:var(--text-light);margin-bottom:4px">CATATAN</div><span>${order.note}</span></div>` : ''}
    </div>
    <div style="border-top:1px solid var(--border);padding-top:1rem;">
      <h4 style="font-family:var(--font-display);margin-bottom:0.75rem">Item Pesanan</h4>
      ${(order.items || []).map(item => `
        <div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid var(--border);">
          <span>${item.product_name} × ${item.quantity}</span>
          <strong>${formatRupiah(item.price * item.quantity)}</strong>
        </div>
      `).join('')}
      <div style="display:flex;justify-content:space-between;padding:0.75rem 0;font-size:1.1rem;">
        <strong>Total</strong>
        <strong style="color:var(--primary)">${formatRupiah(order.total)}</strong>
      </div>
    </div>
  `;
  openModal('orderDetailModal');
}

// ─── Modal Helpers ─────────────────────────────────────
function openModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.add('open'); document.body.style.overflow = 'hidden'; }
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.remove('open'); document.body.style.overflow = ''; }
}
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
    document.body.style.overflow = '';
  }
});

// ─── Image Preview ─────────────────────────────────────
function previewImage(input) {
  const preview = document.getElementById('productImgPreview');
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => { preview.src = e.target.result; preview.style.display = 'block'; };
    reader.readAsDataURL(input.files[0]);
  }
}

// ─── Date Format ───────────────────────────────────────
function formatDate(str) {
  const d = new Date(str);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Admin Logout ──────────────────────────────────────
async function adminLogout() {
  await fetch('/logout', { method: 'POST' });
  window.location.href = 'admin.html';
}