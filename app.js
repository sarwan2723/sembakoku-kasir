const products = [
  { id: 'beras', name: 'Beras Premium', description: 'Beras pulen pilihan', unit: '1 kg', price: 15000, emoji: '🍚', tint: '#f4f0e5' },
  { id: 'minyak', name: 'Minyak Goreng', description: 'Minyak sawit kemasan', unit: '1 liter', price: 18500, emoji: '🫗', tint: '#fbf1dc' },
  { id: 'gula', name: 'Gula Pasir', description: 'Gula putih bersih', unit: '1 kg', price: 17000, emoji: '🍬', tint: '#f4eef1' },
  { id: 'telur', name: 'Telur Ayam', description: 'Telur ayam negeri', unit: '1 kg', price: 29500, emoji: '🥚', tint: '#f8efe4' },
  { id: 'tepung', name: 'Tepung Terigu', description: 'Tepung serbaguna', unit: '1 kg', price: 12000, emoji: '🌾', tint: '#f0f3e8' },
  { id: 'garam', name: 'Garam Dapur', description: 'Garam beryodium', unit: '500 g', price: 4000, emoji: '🧂', tint: '#edf2f4' },
  { id: 'susu', name: 'Susu UHT', description: 'Susu segar kemasan', unit: '1 liter', price: 19500, emoji: '🥛', tint: '#edf2f8' },
  { id: 'ayam', name: 'Daging Ayam', description: 'Ayam potong segar', unit: '1 kg', price: 38000, emoji: '🍗', tint: '#f7ece7' },
  { id: 'mie', name: 'Mi Instan', description: 'Mi instan rasa ayam', unit: '1 bungkus', price: 3500, emoji: '🍜', tint: '#fbf0de' },
];

const cart = new Map();
const productGrid = document.querySelector('#product-grid');
const searchInput = document.querySelector('#product-search');
const cartItems = document.querySelector('#cart-items');
const cashInput = document.querySelector('#cash-received');
const checkoutButton = document.querySelector('#checkout-button');
const clearButton = document.querySelector('#clear-cart');
const receiptDialog = document.querySelector('#receipt-dialog');
const toastElement = document.querySelector('#toast');
let toastTimeout;

const rupiah = (amount) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
}).format(amount);

function renderProducts(query = '') {
  const normalizedQuery = query.trim().toLocaleLowerCase('id-ID');
  const visibleProducts = products.filter((product) => product.name.toLocaleLowerCase('id-ID').includes(normalizedQuery));

  document.querySelector('#product-count').textContent = String(visibleProducts.length);
  if (visibleProducts.length === 0) {
    productGrid.innerHTML = '<div class="no-results">Produk tidak ditemukan. Coba kata pencarian lain.</div>';
    return;
  }

  productGrid.innerHTML = visibleProducts.map((product) => `
    <article class="product-card">
      <div class="product-top">
        <span class="product-emoji" style="--tint: ${product.tint}" aria-hidden="true">${product.emoji}</span>
        <span class="product-unit">${product.unit}</span>
      </div>
      <h3>${product.name}</h3>
      <p class="product-description">${product.description}</p>
      <div class="product-bottom">
        <span class="product-price">${rupiah(product.price)}</span>
        <button class="add-button" type="button" data-add="${product.id}" aria-label="Tambah ${product.name} ke keranjang">+</button>
      </div>
    </article>
  `).join('');
}

function renderCart() {
  const items = [...cart.values()];
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cashReceived = Number(cashInput.value) || 0;
  const change = Math.max(0, cashReceived - subtotal);

  document.querySelector('#cart-count').textContent = `${quantity} barang`;
  document.querySelector('#subtotal').textContent = rupiah(subtotal);
  document.querySelector('#total').textContent = rupiah(subtotal);
  document.querySelector('#change').textContent = rupiah(change);
  clearButton.disabled = items.length === 0;
  checkoutButton.disabled = items.length === 0 || cashReceived < subtotal;

  if (items.length === 0) {
    cartItems.innerHTML = `
      <div class="empty-cart">
        <span class="empty-icon" aria-hidden="true">🧺</span>
        <strong>Keranjang masih kosong</strong>
        <span>Pilih produk di sebelah kiri untuk mulai.</span>
      </div>
    `;
    return;
  }

  cartItems.innerHTML = items.map((item) => `
    <div class="cart-item">
      <span class="cart-item-icon" style="--tint: ${item.tint}" aria-hidden="true">${item.emoji}</span>
      <div class="cart-item-info">
        <strong>${item.name}</strong>
        <span>${rupiah(item.price)} / ${item.unit}</span>
        <div class="quantity-control" aria-label="Jumlah ${item.name}">
          <button type="button" data-action="decrease" data-id="${item.id}" aria-label="Kurangi jumlah ${item.name}">−</button>
          <span>${item.quantity}</span>
          <button type="button" data-action="increase" data-id="${item.id}" aria-label="Tambah jumlah ${item.name}">+</button>
        </div>
      </div>
      <span class="item-total">${rupiah(item.price * item.quantity)}</span>
    </div>
  `).join('');
}

function showToast(message) {
  toastElement.textContent = message;
  toastElement.classList.add('visible');
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toastElement.classList.remove('visible'), 2200);
}

function addToCart(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;

  const existing = cart.get(productId);
  cart.set(productId, { ...product, quantity: (existing?.quantity ?? 0) + 1 });
  renderCart();
  showToast(`${product.name} ditambahkan`);
}

function updateQuantity(productId, change) {
  const item = cart.get(productId);
  if (!item) return;

  const nextQuantity = item.quantity + change;
  if (nextQuantity < 1) {
    cart.delete(productId);
  } else {
    cart.set(productId, { ...item, quantity: nextQuantity });
  }
  renderCart();
}

function createReceipt(items, total, received, change) {
  const receiptNumber = `SB-${Date.now().toString().slice(-8)}`;
  const date = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  document.querySelector('#receipt-content').innerHTML = `
    <h2 class="receipt-title" id="receipt-heading">SembakoKu</h2>
    <p class="receipt-subtitle">Terima kasih telah berbelanja</p>
    <div class="receipt-meta">No. transaksi: ${receiptNumber}<br>${date}</div>
    <div class="receipt-lines">
      ${items.map((item) => `
        <div class="receipt-line">
          <span>${item.name} × ${item.quantity}</span>
          <span>${rupiah(item.price * item.quantity)}</span>
        </div>
      `).join('')}
    </div>
    <div class="receipt-summary">
      <div><span>Total</span><strong>${rupiah(total)}</strong></div>
      <div><span>Tunai</span><strong>${rupiah(received)}</strong></div>
      <div class="receipt-grand-total"><span>Kembalian</span><strong>${rupiah(change)}</strong></div>
    </div>
    <p class="receipt-thanks">Simpan struk ini sebagai bukti pembayaran.</p>
  `;
  receiptDialog.showModal();
}

productGrid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-add]');
  if (button) addToCart(button.dataset.add);
});

cartItems.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  updateQuantity(button.dataset.id, button.dataset.action === 'increase' ? 1 : -1);
});

searchInput.addEventListener('input', () => renderProducts(searchInput.value));
cashInput.addEventListener('input', renderCart);

clearButton.addEventListener('click', () => {
  cart.clear();
  cashInput.value = '';
  renderCart();
});

checkoutButton.addEventListener('click', () => {
  const items = [...cart.values()].map((item) => ({ ...item }));
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const received = Number(cashInput.value) || 0;
  if (items.length === 0 || received < total) return;

  createReceipt(items, total, received, received - total);
  cart.clear();
  cashInput.value = '';
  renderCart();
});

document.querySelector('#close-receipt').addEventListener('click', () => receiptDialog.close());
document.querySelector('#print-receipt').addEventListener('click', () => window.print());
document.querySelector('#today-date').textContent = new Intl.DateTimeFormat('id-ID', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
}).format(new Date());

document.addEventListener('keydown', (event) => {
  if (event.key === '/' && document.activeElement !== searchInput && !event.ctrlKey && !event.metaKey) {
    event.preventDefault();
    searchInput.focus();
  }
});

renderProducts();
renderCart();
