function renderProductCard(p) {
  const imgSrc = `images/${p.image}`;

  return `
    <div class="product-card" data-id="${p.id}">
      <div class="product-card-img-wrap">
        <img 
          src="${imgSrc}" 
          alt="${p.name}" 
          class="product-card-img"
          onerror="this.src='images/placeholder.svg'"
        >
        <span class="product-card-badge">${p.category}</span>
      </div>

      <div class="product-card-body">
        <div class="product-card-category">${p.category}</div>

        <h3 class="product-card-name">
          ${p.name}
        </h3>

        <p class="product-card-desc">
          ${p.description || ''}
        </p>

        <div class="product-card-footer">
          <div class="product-card-price">
            ${formatRupiah(p.price)}
          </div>

          <div style="display:flex;gap:0.5rem;">
            <a href="detail.html?id=${p.id}" class="btn btn-ghost btn-sm">
              Detail
            </a>

            <button 
              class="btn-add-cart" 
              onclick="addToCartById(${p.id}, '${p.name.replace(/'/g,"\\'")}', ${p.price}, '${p.image}')"
            >
              🛒 Tambah
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}