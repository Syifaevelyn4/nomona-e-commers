// ═══════════════════════════════════════════════════════
// NOMONA COOKIES — cart.js
// Cart management with localStorage
// ═══════════════════════════════════════════════════════

const CART_KEY = 'nomona_cart';

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(item) {
  const cart = getCart();
  const existing = cart.find(i => i.id === item.id);
  if (existing) {
    existing.quantity = (existing.quantity || 1) + (item.quantity || 1);
  } else {
    cart.push({ ...item, quantity: item.quantity || 1 });
  }
  saveCart(cart);
}

function removeFromCart(id) {
  const cart = getCart().filter(i => i.id !== id);
  saveCart(cart);
}

function updateCartQuantity(id, qty) {
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (item) {
    item.quantity = Math.max(1, qty);
    saveCart(cart);
  }
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartBadge();
}

function getCartTotal() {
  return getCart().reduce((sum, i) => sum + (i.price * i.quantity), 0);
}

function getCartCount() {
  return getCart().reduce((sum, i) => sum + i.quantity, 0);
}