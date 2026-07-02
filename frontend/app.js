const state = {
  token: localStorage.getItem('mode_token') || '',
  user: null,
  cart: [],
  categories: [],
  filters: {},
  chatOpen: false,
};

const appEl = document.getElementById('app');

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function parseList(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || '[]');
    if (typeof parsed === 'string') return parseList(parsed);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(value || '').split(',').map(s => s.trim()).filter(Boolean);
  }
}

function renderStars(rating) {
  const full = Math.round(rating);
  const stars = [];
  for (let i = 0; i < 5; i++) {
    if (i < full) stars.push('<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>');
    else stars.push('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>');
  }
  return '<span class="stars">' + stars.join('') + '</span>';
}

function getColorSwatchStyle(color) {
  const c = color.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const map = {
    'negro': '#171717', 'black': '#171717',
    'blanco': '#fff', 'white': '#f5f5f5',
    'rojo': '#b12b2f', 'red': '#b12b2f',
    'azul': '#1a56db', 'blue': '#1a56db',
    'verde': '#1d7f55', 'green': '#1d7f55',
    'gris': '#77777d', 'gray': '#77777d', 'grey': '#77777d',
    'beige': '#e8dcc8',
    'marron': '#8B6914', 'brown': '#8B6914',
    'navy': '#1e3a5f',
    'caqui': '#C3B091', 'khaki': '#C3B091',
    'violeta': '#7c3aed', 'purple': '#7c3aed',
    'rosa': '#ec4899', 'pink': '#ec4899',
    'naranja': '#ea580c', 'orange': '#ea580c',
    'amarillo': '#eab308', 'yellow': '#eab308',
    'plateado': '#c0c0c0', 'silver': '#c0c0c0',
    'dorado': '#b88a44', 'gold': '#b88a44',
  };
  const hex = map[c];
  if (hex) return 'background:' + hex;
  return 'background:#d8d2c8';
}

function sameOriginPath(href) {
  try {
    const url = new URL(href, location.href);
    if (url.origin !== location.origin) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

function isAppRoute(path) {
  return path === '/'
    || path.startsWith('/catalogo')
    || path.startsWith('/producto/')
    || path === '/carrito'
    || path === '/checkout'
    || path === '/login'
    || path === '/perfil'
    || path === '/pedidos'
    || path === '/admin';
}

async function api(url, options = {}) {
  const headers = options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' };
  const sep = url.includes('?') ? '&' : '?';
  if (state.token && !url.includes('token=')) url += `${sep}token=${encodeURIComponent(state.token)}`;
  const res = await fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error inesperado' }));
    throw new Error(err.detail || 'Error inesperado');
  }
  return res.json();
}

function navigate(path) {
  if (`${location.pathname}${location.search}${location.hash}` === path) return;
  history.pushState({}, '', path);
  render();
  document.querySelector('.nav')?.classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getRoute() {
  const path = location.pathname;
  if (path.startsWith('/catalogo')) return 'catalog';
  if (path.startsWith('/producto/')) return 'product';
  if (path === '/carrito') return 'cart';
  if (path === '/checkout') return 'checkout';
  if (path === '/login') return 'login';
  if (path === '/perfil') return 'profile';
  if (path === '/pedidos') return 'orders';
  if (path === '/admin') return 'admin';
  return 'home';
}

function showToast(message, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

async function loadUser() {
  if (!state.token) return;
  try {
    state.user = await api('/api/auth/me');
  } catch {
    state.token = '';
    state.user = null;
    localStorage.removeItem('mode_token');
  }
}

async function loadBasics() {
  const jobs = [api('/api/categories').then(d => state.categories = d), api('/api/filters').then(d => state.filters = d)];
  if (state.token) jobs.push(api('/api/cart').then(d => state.cart = d).catch(() => state.cart = []));
  await Promise.all(jobs);
  updateNav();
}

function updateNav() {
  const logged = !!state.user;
  document.getElementById('navLogin').style.display = logged ? 'none' : '';
  document.getElementById('navLogout').style.display = logged ? '' : 'none';
  document.getElementById('navProfile').style.display = logged ? '' : 'none';
  document.getElementById('navOrders').style.display = logged ? '' : 'none';
  document.getElementById('navAdmin').style.display = state.user?.role === 'admin' ? '' : 'none';
  const badge = document.getElementById('cartBadge');
  const count = state.cart.reduce((sum, i) => sum + Number(i.quantity || 0), 0);
  badge.style.display = count ? '' : 'none';
  badge.textContent = count;
}

async function render() {
  appEl.innerHTML = '<div class="loader"><div class="spinner"></div></div>';
  await loadBasics();
  try {
    const route = getRoute();
    if (route === 'home') return await renderHome();
    if (route === 'catalog') return await renderCatalog();
    if (route === 'product') return await renderProduct();
    if (route === 'cart') return await renderCart();
    if (route === 'checkout') return await renderCheckout();
    if (route === 'login') return await renderLogin();
    if (route === 'profile') return await renderProfile();
    if (route === 'orders') return await renderOrders();
    if (route === 'admin') return await renderAdmin();
  } catch (e) {
    appEl.innerHTML = `<div class="emptyState"><strong>Error</strong><p>${escapeHtml(e.message)}</p></div>`;
  }
}

async function renderHome() {
  const [popular, sale] = await Promise.all([
    api('/api/products?per_page=4&sort=popular'),
    api('/api/products?per_page=4&on_sale=true'),
  ]);
  appEl.innerHTML = `
    <section class="hero">
      <div class="heroContent">
        <span class="eyebrow">Nueva temporada 2026</span>
        <h1>Moda urbana con gestión e-commerce real</h1>
        <p>Catálogo, carrito, checkout, panel admin, stock, Excel e imágenes locales para una demo lista para enseñar.</p>
        <div class="heroActions">
          <a class="btn btnPrimary" href="/catalogo" data-nav>Ver catálogo</a>
          <a class="btn btnSecondary" href="/admin" data-nav>Panel admin</a>
        </div>
      </div>
    </section>
    <section class="trustStrip"><span>Envío gratis +50€</span><span>Devolución 30 días</span><span>Pago seguro</span><span>IA de estilo</span></section>
    ${renderCategoryStrip()}
    <section class="section"><div class="sectionHead"><h2>Más populares</h2><a href="/catalogo" data-nav>Ver todo</a></div><div class="productGrid">${popular.items.map(productCard).join('')}</div></section>
    <section class="section"><div class="sectionHead"><h2>Ofertas activas</h2><a href="/catalogo?oferta=1" data-nav>Comprar ofertas</a></div><div class="productGrid">${sale.items.map(productCard).join('')}</div></section>`;
}

function renderCategoryStrip() {
  const images = {
    chaquetas: '/assets/uploads/site/chaquetas.jpg',
    zapatos: '/assets/uploads/site/zapatos.jpg',
    pantalones: '/assets/uploads/site/pantalones.jpg',
    camisetas: '/assets/uploads/site/camisetas.jpg',
    accesorios: '/assets/uploads/site/accesorios.jpg',
    vestidos: '/assets/uploads/site/vestidos.jpg',
    sudaderas: '/assets/uploads/site/sudaderas.jpg',
  };
  return `<section class="categoryStrip">${state.categories.map(c => `
    <a class="categoryTile" href="/catalogo?categoria=${encodeURIComponent(c.slug)}" data-nav>
      <img src="${images[c.slug] || '/assets/uploads/site/hero.jpg'}" alt="${escapeHtml(c.name)}" loading="lazy">
      <strong>${escapeHtml(c.name)}</strong>
    </a>`).join('')}</section>`;
}

function productCard(p) {
  const tags = parseList(p.tags);
  return `<article class="productCard">
    <a href="/producto/${p.id}" data-nav class="productImage">
      <img src="${escapeHtml(p.image || '/assets/uploads/site/hero.jpg')}" alt="${escapeHtml(p.name)}" loading="lazy">
      ${p.on_sale ? '<span class="productBadge">Oferta</span>' : tags.includes('nuevo') ? '<span class="productBadge">Nuevo</span>' : ''}
    </a>
    <div class="productInfo">
      <span class="brand">${escapeHtml(p.brand || '')}</span>
      <a href="/producto/${p.id}" data-nav class="productName">${escapeHtml(p.name)}</a>
      <div class="priceRow"><strong>${Number(p.price).toFixed(2)} €</strong>${p.compare_price ? `<span>${Number(p.compare_price).toFixed(2)} €</span>` : ''}</div>
      <button class="btn btnSmall btnPrimary" onclick="quickAdd(${p.id})">Añadir</button>
    </div>
  </article>`;
}

async function renderCatalog() {
  const qs = new URLSearchParams(location.search);
  const params = new URLSearchParams({ sort: qs.get('orden') || 'newest', per_page: '100' });
  if (qs.get('q')) params.set('q', qs.get('q'));
  if (qs.get('categoria')) params.set('category', qs.get('categoria'));
  if (qs.get('oferta')) params.set('on_sale', 'true');
  const data = await api(`/api/products?${params.toString()}`);
  appEl.innerHTML = `
    <section class="section pageSection">
      <h1 class="pageTitle">Catálogo MODE</h1>
      <div class="filtersBar">
        <input class="searchInput" id="catalogSearch" placeholder="Buscar producto, marca..." value="${escapeHtml(qs.get('q') || '')}">
        <select id="catalogCategory"><option value="">Todas las categorías</option>${state.categories.map(c => `<option value="${c.slug}" ${qs.get('categoria') === c.slug ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}</select>
        <select id="catalogSort"><option value="newest">Novedades</option><option value="price_asc">Precio menor</option><option value="price_desc">Precio mayor</option><option value="rating">Mejor valorados</option></select>
        <button class="btn btnSecondary" onclick="applyCatalogFilters()">Filtrar</button>
      </div>
      <div class="productGrid">${data.items.map(productCard).join('')}</div>
      ${!data.items.length ? '<div class="emptyState"><strong>Sin productos</strong><p>Prueba otros filtros.</p></div>' : ''}
  </section>`;
  document.getElementById('catalogSort').value = qs.get('orden') || 'newest';
}

function applyCatalogFilters() {
  const q = document.getElementById('catalogSearch').value.trim();
  const categoria = document.getElementById('catalogCategory').value;
  const orden = document.getElementById('catalogSort').value;
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (categoria) params.set('categoria', categoria);
  if (orden) params.set('orden', orden);
  navigate(`/catalogo?${params.toString()}`);
}

async function renderProduct() {
  const id = location.pathname.split('/').pop();
  const p = await api(`/api/products/${id}`);
  const sizes = parseList(p.sizes);
  const colors = parseList(p.colors);
  const tags = parseList(p.tags);
  const extraImages = parseList(p.images);
  const allImages = [p.image || '/assets/uploads/site/hero.jpg', ...extraImages].filter(Boolean).filter((img, i, arr) => arr.indexOf(img) === i);
  const showRail = allImages.length > 1;
  const hasDiscount = p.compare_price && Number(p.compare_price) > Number(p.price);
  const discountPct = hasDiscount ? Math.round((1 - Number(p.price) / Number(p.compare_price)) * 100) : 0;
  const isNew = tags.includes('nuevo');
  window._pdImages = allImages;
  const catSlug = p.category_slug || (p.category_name ? p.category_name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-') : '');
  appEl.innerHTML = `<section class="section pageSection">
    <div class="pdBreadcrumb">
      <a href="/catalogo" data-nav>← Catálogo</a>
      ${p.category_name ? `<span>/</span><a href="/catalogo?categoria=${encodeURIComponent(catSlug)}" data-nav>${escapeHtml(p.category_name)}</a>` : ''}
      <span>/</span><span>${escapeHtml(p.name)}</span>
    </div>
    <div class="pdLayout">
      <div class="pdGallery">
        ${showRail ? `<div class="pdThumbRail" id="pdThumbRail">${allImages.map((img, i) => `<button class="pdThumb ${i === 0 ? 'active' : ''}" onclick="selectPdImage(${i})"><img src="${escapeHtml(img)}" alt=""></button>`).join('')}</div>` : ''}
        <div class="pdMainImageWrap">
          <div class="pdMainImage" id="pdMainImage">
            <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" id="pdMainImg" onerror="this.src='/assets/uploads/site/hero.jpg'">
          </div>
          ${p.on_sale ? '<span class="pdBadge pdBadgeSale">-' + discountPct + '%</span>' : ''}
          ${isNew && !p.on_sale ? '<span class="pdBadge pdBadgeNew">Nuevo</span>' : ''}
        </div>
      </div>
      <div class="pdInfo">
        <span class="pdBrand">${escapeHtml(p.brand || '')}</span>
        <h1 class="pdTitle">${escapeHtml(p.name)}</h1>
        <div class="pdPriceRow">
          <span class="pdPrice">${Number(p.price).toFixed(2)} €</span>
          ${hasDiscount ? `<span class="pdOldPrice">${Number(p.compare_price).toFixed(2)} €</span><span class="pdDiscountBadge">-${discountPct}%</span>` : ''}
        </div>
        <div class="pdIva">Impuestos incluidos (IVA 21%)</div>
        <div class="pdRating">
          ${renderStars(p.rating)}
          <span>${Number(p.rating).toFixed(1)}</span>
          <span class="pdStock ${p.stock > 5 ? 'inStock' : p.stock > 0 ? 'lowStock' : 'outStock'}">${p.stock > 5 ? 'En stock' : p.stock > 0 ? 'Últimas unidades' : 'Agotado'}</span>
        </div>
        ${colors.length ? `<div class="pdOptionLabel">Color: <span id="pdSelectedColor">${escapeHtml(colors[0])}</span></div>
        <div class="pdColors" id="pdColors">${colors.map(c => `<button class="colorSwatch ${c === colors[0] ? 'selected' : ''}" data-color="${escapeHtml(c)}" onclick="selectPdColor(this)" title="${escapeHtml(c)}" style="${getColorSwatchStyle(c)}"><span>${escapeHtml(c)}</span></button>`).join('')}</div>` : ''}
        ${sizes.length ? `<div class="pdOptionLabel">Talla: <span id="pdSelectedSize">${escapeHtml(sizes[0])}</span></div>
        <div class="pdSizes" id="pdSizes">${sizes.map(s => `<button class="sizeBtn ${s === sizes[0] ? 'selected' : ''}" data-size="${escapeHtml(s)}" onclick="selectPdSize(this)">${escapeHtml(s)}</button>`).join('')}</div>` : ''}
        <div class="pdActions">
          <button class="btn btnPrimary pdAddBtn" id="pdAddBtn" onclick="addProduct(${p.id})" ${p.stock <= 0 ? 'disabled' : ''}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/></svg>
            ${p.stock > 0 ? 'Añadir al carrito' : 'Agotado'}
          </button>
          <button class="wishlistBtn" onclick="showToast('Lista de deseos próximamente')" aria-label="Guardar producto">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          </button>
        </div>
        <div class="pdInfoPanel">
          <div class="pdInfoItem">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            <span><strong>Envío rápido</strong> — Gratis desde 50 €</span>
          </div>
          <div class="pdInfoItem">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2M7 10l5 5 5-5M12 15V3"/></svg>
            <span><strong>Devoluciones</strong> — 30 días gratuitas</span>
          </div>
          <div class="pdInfoItem">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
            <span><strong>Revende</strong> — Programa de segunda mano</span>
          </div>
        </div>
        <div class="pdCollapsibles">
          <div class="pdCollapsible">
            <button class="pdCollapsibleBtn open" onclick="toggleCollapsible(this)">Descripción <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button>
            <div class="pdCollapsibleBody open"><p>${escapeHtml(p.description || 'Sin descripción disponible.')}</p></div>
          </div>
          <div class="pdCollapsible">
            <button class="pdCollapsibleBtn" onclick="toggleCollapsible(this)">Composición y cuidados <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button>
            <div class="pdCollapsibleBody"><p>Tejido de alta calidad. Consulta la etiqueta del producto para instrucciones detalladas de lavado y cuidado.</p></div>
          </div>
          <div class="pdCollapsible">
            <button class="pdCollapsibleBtn" onclick="toggleCollapsible(this)">Características <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button>
            <div class="pdCollapsibleBody">
              <ul>
                <li>Marca: ${escapeHtml(p.brand || 'MODE')}</li>
                <li>Categoría: ${escapeHtml(p.category_name || 'General')}</li>
                ${p.gender ? '<li>Género: ' + escapeHtml(p.gender) + '</li>' : ''}
                ${tags.length ? '<li>Tags: ' + tags.map(t => escapeHtml(t)).join(', ') + '</li>' : ''}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

async function quickAdd(id) {
  if (!state.token) return navigate('/login');
  const p = await api(`/api/products/${id}`);
  const size = parseList(p.sizes)[0] || '';
  const color = parseList(p.colors)[0] || '';
  state.cart = await api('/api/cart', { method: 'POST', body: JSON.stringify({ product_id: id, quantity: 1, size, color }) });
  updateNav();
  showToast('Producto añadido al carrito');
}

async function addProduct(id) {
  if (!state.token) return navigate('/login');
  const sizeEl = document.querySelector('.sizeBtn.selected');
  const colorEl = document.querySelector('.colorSwatch.selected');
  const needsSize = !!document.getElementById('pdSizes');
  const needsColor = !!document.getElementById('pdColors');
  const size = sizeEl ? sizeEl.dataset.size : '';
  const color = colorEl ? colorEl.dataset.color : '';
  if (needsSize && !size) return showToast('Selecciona una talla', 'error');
  if (needsColor && !color) return showToast('Selecciona un color', 'error');
  state.cart = await api('/api/cart', {
    method: 'POST',
    body: JSON.stringify({ product_id: id, quantity: 1, size, color }),
  });
  updateNav();
  showToast('Producto añadido al carrito');
}

function selectPdColor(el) {
  document.querySelectorAll('.colorSwatch').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  const label = document.getElementById('pdSelectedColor');
  if (label) label.textContent = el.dataset.color;
}

function selectPdSize(el) {
  document.querySelectorAll('.sizeBtn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  const label = document.getElementById('pdSelectedSize');
  if (label) label.textContent = el.dataset.size;
}

function selectPdImage(index) {
  const rail = document.getElementById('pdThumbRail');
  if (rail) {
    rail.querySelectorAll('.pdThumb').forEach((t, i) => t.classList.toggle('active', i === index));
  }
  const img = document.getElementById('pdMainImg');
  if (window._pdImages && window._pdImages[index] && img) {
    img.src = window._pdImages[index];
  }
}

function toggleCollapsible(btn) {
  btn.classList.toggle('open');
  const body = btn.nextElementSibling;
  if (body) body.classList.toggle('open');
}

function totals() {
  const subtotal = state.cart.reduce((sum, i) => sum + Number(i.price) * Number(i.quantity), 0);
  const shipping = subtotal >= 50 || subtotal === 0 ? 0 : 4.99;
  const tax = subtotal * 0.21;
  return { subtotal, shipping, tax, total: subtotal + shipping + tax };
}

function renderCart() {
  const t = totals();
  appEl.innerHTML = `<section class="section pageSection">
    <h1 class="pageTitle">Carrito</h1>
    ${state.cart.length ? `<div class="cartLayout"><div class="cartItems">${state.cart.map(item => `
      <div class="cartItem">
        <div class="cartItemImg"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}"></div>
        <div class="cartItemInfo"><strong>${escapeHtml(item.name)}</strong><div class="meta">${escapeHtml(item.size)} · ${escapeHtml(item.color)}</div><div>${Number(item.price).toFixed(2)} €</div></div>
        <div class="cartItemActions"><button onclick="updateCart(${item.id}, ${item.quantity - 1})">-</button><span>${item.quantity}</span><button onclick="updateCart(${item.id}, ${item.quantity + 1})">+</button><button onclick="removeCart(${item.id})">Eliminar</button></div>
      </div>`).join('')}</div>${summaryBox(t, true)}</div>` : `<div class="emptyState"><strong>Tu carrito está vacío</strong><p>Añade productos desde el catálogo.</p><a class="btn btnPrimary" href="/catalogo" data-nav>Ver catálogo</a></div>`}
  </section>`;
}

function summaryBox(t, checkoutBtn) {
  return `<aside class="cartSummary"><h3>Resumen</h3><div><span>Subtotal</span><strong>${t.subtotal.toFixed(2)} €</strong></div><div><span>IVA</span><strong>${t.tax.toFixed(2)} €</strong></div><div><span>Envío</span><strong>${t.shipping ? t.shipping.toFixed(2) + ' €' : 'Gratis'}</strong></div><div class="total"><span>Total</span><strong>${t.total.toFixed(2)} €</strong></div>${checkoutBtn ? '<a class="btn btnPrimary" href="/checkout" data-nav>Finalizar compra</a>' : ''}</aside>`;
}

async function updateCart(id, qty) {
  if (qty <= 0) return removeCart(id);
  state.cart = await api(`/api/cart/${id}`, { method: 'PATCH', body: JSON.stringify({ quantity: qty }) });
  updateNav();
  renderCart();
}

async function removeCart(id) {
  state.cart = await api(`/api/cart/${id}`, { method: 'DELETE' });
  updateNav();
  renderCart();
}

function renderCheckout() {
  if (!state.token) return navigate('/login');
  if (!state.cart.length) return navigate('/carrito');
  appEl.innerHTML = `<section class="section pageSection"><h1 class="pageTitle">Checkout</h1>
    <div class="checkoutLayout"><form class="checkoutForm" id="checkoutForm">
      <div class="formRow"><div class="formGroup"><label>Dirección</label><input name="address" required></div><div class="formGroup"><label>Ciudad</label><input name="city" required></div></div>
      <div class="formRow"><div class="formGroup"><label>Provincia</label><input name="state"></div><div class="formGroup"><label>CP</label><input name="zip_code"></div></div>
      <div class="formGroup"><label>Teléfono</label><input name="phone"></div><div class="formGroup"><label>Notas</label><textarea name="notes"></textarea></div>
      <button class="btn btnPrimary">Confirmar pedido</button>
    </form>${summaryBox(totals(), false)}</div></section>`;
  document.getElementById('checkoutForm').onsubmit = async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    data.country = 'ES';
    data.shipping_method = 'standard';
    data.payment_method = 'stripe';
    const order = await api('/api/checkout', { method: 'POST', body: JSON.stringify(data) });
    state.cart = [];
    updateNav();
    showToast(`Pedido #${order.order_id} creado`);
    navigate('/pedidos');
  };
}

function renderLogin() {
  appEl.innerHTML = `<section class="section authPage"><h1 class="pageTitle">Entrar</h1>
    <form class="authCard" id="loginForm"><div class="formGroup"><label>Email</label><input name="email" type="email" required value="admin@mode.com"></div><div class="formGroup"><label>Contraseña</label><input name="password" type="password" required value="admin123"></div><button class="btn btnPrimary">Entrar</button></form></section>`;
  document.getElementById('loginForm').onsubmit = async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const user = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(data) });
    state.token = user.token;
    state.user = user;
    localStorage.setItem('mode_token', user.token);
    showToast('Sesión iniciada');
    navigate(user.role === 'admin' ? '/admin' : '/catalogo');
  };
}

function renderProfile() {
  if (!state.user) return navigate('/login');
  appEl.innerHTML = `<section class="section pageSection"><h1 class="pageTitle">Perfil</h1><div class="authCard"><strong>${escapeHtml(state.user.name)}</strong><p>${escapeHtml(state.user.email)}</p><p>Rol: ${escapeHtml(state.user.role)}</p></div></section>`;
}

async function renderOrders() {
  if (!state.user) return navigate('/login');
  const orders = await api('/api/orders');
  appEl.innerHTML = `<section class="section pageSection"><h1 class="pageTitle">Mis pedidos</h1>${orders.length ? orders.map(o => `<div class="orderCard"><div class="orderHeader"><strong>#${o.id}</strong><span class="orderStatus status${cap(o.status)}">${statusLabel(o.status)}</span></div><p>${Number(o.total).toFixed(2)} € · ${new Date(o.created_at).toLocaleDateString('es-ES')}</p><small>${(o.items || []).map(i => `${escapeHtml(i.product_name)} x${i.quantity}`).join(', ')}</small></div>`).join('') : '<div class="emptyState"><strong>Sin pedidos</strong></div>'}</section>`;
}

function cap(s) { return String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1); }
function statusLabel(s) { return ({ pending: 'Pendiente', paid: 'Pagado', shipped: 'Enviado', delivered: 'Entregado', cancelled: 'Cancelado' })[s] || s; }

async function renderAdmin() {
  if (state.user?.role !== 'admin') return navigate('/');
  const dashboard = await api('/api/admin/dashboard');
  appEl.innerHTML = `<section class="adminPage"><h1 class="pageTitle">Panel de administración</h1>
    <div class="adminTabs">
      ${['dashboard', 'products', 'orders', 'customers', 'carts', 'import'].map((tab, i) => `<button class="adminTab ${i === 0 ? 'active' : ''}" onclick="switchAdminTab(this,'${tab}')">${({ dashboard: 'Dashboard', products: 'Productos', orders: 'Pedidos', customers: 'Clientes', carts: 'Carritos', import: 'Importar Excel' })[tab]}</button>`).join('')}
    </div><div id="adminContent">${renderDashboardHTML(dashboard)}</div></section>`;
}

function switchAdminTab(el, tab) {
  document.querySelectorAll('.adminTab').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  const content = document.getElementById('adminContent');
  content.innerHTML = '<div class="loader"><div class="spinner"></div></div>';
  if (tab === 'dashboard') api('/api/admin/dashboard').then(d => content.innerHTML = renderDashboardHTML(d));
  if (tab === 'products') api('/api/admin/products').then(d => content.innerHTML = renderAdminProductsHTML(d));
  if (tab === 'orders') api('/api/admin/orders').then(d => content.innerHTML = renderAdminOrdersHTML(d));
  if (tab === 'customers') api('/api/admin/customers').then(d => content.innerHTML = renderCustomersHTML(d));
  if (tab === 'carts') api('/api/admin/carts').then(d => content.innerHTML = renderCartsHTML(d));
  if (tab === 'import') content.innerHTML = renderImportHTML();
}

function renderDashboardHTML(d) {
  const bars = Object.entries(d.orders_count_by_status || {});
  return `<div class="kpiGrid">
    ${kpi('Ingresos', `${Number(d.total_revenue).toFixed(2)} €`)}${kpi('Pedidos', d.total_orders)}${kpi('Clientes', d.total_customers)}${kpi('Productos activos', d.active_products)}${kpi('Stock bajo', d.low_stock_products.length)}${kpi('Valor carritos', `${Number(d.cart_value).toFixed(2)} €`)}
  </div><div class="chartGrid"><div class="chartCard"><h3>Pedidos por estado</h3>${bars.map(([s, v]) => bar(statusLabel(s), v, Math.max(...bars.map(b => b[1]), 1))).join('')}</div><div class="chartCard"><h3>Más vendidos</h3>${(d.top_sold_products || []).map(p => bar(p.product_name, p.total_qty, Math.max(...d.top_sold_products.map(x => x.total_qty), 1))).join('') || '<p>Sin ventas</p>'}</div><div class="chartCard"><h3>Más guardados en carrito</h3>${(d.most_carted_products || []).map(p => bar(p.name, Number(p.cart_value).toFixed(0) + ' €', Math.max(...d.most_carted_products.map(x => x.cart_value), 1), p.cart_value)).join('') || '<p>Sin carritos</p>'}</div><div class="chartCard"><h3>Stock bajo</h3>${(d.low_stock_products || []).map(p => `<div class="miniRow"><span>${escapeHtml(p.name)}</span><strong>${p.stock}</strong></div>`).join('') || '<p>Sin alertas</p>'}</div></div>`;
}
function kpi(label, value) { return `<div class="kpiCard"><div class="kpiValue">${value}</div><div class="kpiLabel">${label}</div></div>`; }
function bar(label, value, max, raw = value) { return `<div class="chartBarRow"><span class="chartBarLabel">${escapeHtml(label)}</span><div class="chartBarTrack"><div class="chartBarFill" style="width:${Math.max(6, Number(raw) / max * 100)}%"></div></div><span class="chartBarValue">${value}</span></div>`; }

function renderAdminProductsHTML(products) {
  return `<div class="adminToolbar"><input class="adminSearchInput" id="adminProdSearch" placeholder="Buscar..." oninput="filterAdminProducts()"><button class="btn btnPrimary" onclick="adminShowProductModal()">+ Añadir producto</button></div><div id="adminProductsTable">${adminProductsTable(products)}</div><div class="adminModalOverlay" id="adminProductModal" style="display:none"><div class="adminModal"><div class="adminModalHeader"><h3 id="adminModalTitle">Producto</h3><button onclick="adminCloseProductModal()">×</button></div><div class="adminModalBody" id="adminProductForm"></div></div></div>`;
}
function adminProductsTable(products) {
  window._adminProducts = products;
  return `<div class="tableWrap"><table class="adminTable"><thead><tr><th>ID</th><th>Imagen</th><th>Producto</th><th>Marca</th><th>Precio</th><th>Stock</th><th>Activo</th><th>Acciones</th></tr></thead><tbody>${products.map(p => `<tr data-text="${escapeHtml(`${p.name} ${p.brand}`.toLowerCase())}"><td>${p.id}</td><td><img class="adminThumb" src="${escapeHtml(p.image || '')}" alt=""></td><td><strong>${escapeHtml(p.name)}</strong><br><small>${escapeHtml(p.category_name || '')}</small></td><td>${escapeHtml(p.brand)}</td><td>${Number(p.price).toFixed(2)} €</td><td>${p.stock}</td><td>${p.active ? 'Sí' : 'No'}</td><td><button class="btnTiny" onclick="adminEditProduct(${p.id})">Editar</button><button class="btnTiny" onclick="adminToggleProduct(${p.id}, ${p.active ? 0 : 1})">${p.active ? 'Ocultar' : 'Activar'}</button><button class="btnTiny danger" onclick="adminDeleteProduct(${p.id})">Eliminar</button></td></tr>`).join('')}</tbody></table></div>`;
}
function filterAdminProducts() {
  const q = document.getElementById('adminProdSearch').value.toLowerCase();
  document.querySelectorAll('#adminProductsTable tbody tr').forEach(tr => tr.style.display = tr.dataset.text.includes(q) ? '' : 'none');
}

function adminShowProductModal(product = null) {
  document.getElementById('adminProductModal').style.display = 'flex';
  document.getElementById('adminModalTitle').textContent = product ? 'Editar producto' : 'Añadir producto';
  const sizes = product ? parseList(product.sizes).join(', ') : '';
  const colors = product ? parseList(product.colors).join(', ') : '';
  const tags = product ? parseList(product.tags).join(', ') : '';
  document.getElementById('adminProductForm').innerHTML = `<div class="adminFormGrid">
    <div class="formGroup"><label>Nombre *</label><input id="pf-name" value="${escapeHtml(product?.name || '')}"></div>
    <div class="formGroup"><label>Marca</label><input id="pf-brand" value="${escapeHtml(product?.brand || '')}"></div>
    <div class="formGroup"><label>Precio *</label><input id="pf-price" type="number" step="0.01" value="${product?.price || ''}"></div>
    <div class="formGroup"><label>Precio anterior</label><input id="pf-compare" type="number" step="0.01" value="${product?.compare_price || ''}"></div>
    <div class="formGroup"><label>Stock</label><input id="pf-stock" type="number" value="${product?.stock ?? 0}"></div>
    <div class="formGroup"><label>Categoría</label><select id="pf-category">${state.categories.map(c => `<option value="${c.id}" ${product?.category_id === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}</select></div>
  </div>
  <div class="formGroup"><label>Descripción</label><textarea id="pf-desc">${escapeHtml(product?.description || '')}</textarea></div>
  <div class="formGroup"><label>Imagen local del producto</label><div class="imageUploadBox">${product?.image ? `<img id="pf-image-preview" src="${escapeHtml(product.image)}" alt="Preview">` : '<img id="pf-image-preview" style="display:none" alt="Preview">'}<div><input id="pf-image-file" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" onchange="adminPreviewImage(this)"><small>JPG, PNG, WebP, AVIF o GIF. Se guarda en local.</small><div id="pf-image-status"></div></div></div><input type="hidden" id="pf-image" value="${escapeHtml(product?.image || '')}"></div>
  <div class="adminFormGrid"><div class="formGroup"><label>Tallas</label><input id="pf-sizes" value="${escapeHtml(sizes)}"></div><div class="formGroup"><label>Colores</label><input id="pf-colors" value="${escapeHtml(colors)}"></div><div class="formGroup"><label>Tags</label><input id="pf-tags" value="${escapeHtml(tags)}"></div><div class="formGroup"><label>Género</label><select id="pf-gender">${['unisex','hombre','mujer'].map(g => `<option ${product?.gender === g ? 'selected' : ''}>${g}</option>`).join('')}</select></div></div>
  <div class="checkRow"><label><input id="pf-active" type="checkbox" ${!product || product.active ? 'checked' : ''}> Activo</label><label><input id="pf-featured" type="checkbox" ${product?.featured ? 'checked' : ''}> Destacado</label><label><input id="pf-sale" type="checkbox" ${product?.on_sale ? 'checked' : ''}> Oferta</label></div>
  <div class="modalActions"><button class="btn btnSecondary" onclick="adminCloseProductModal()">Cancelar</button><button class="btn btnPrimary" onclick="adminSaveProduct(${product?.id || 0})">${product ? 'Guardar cambios' : 'Crear producto'}</button></div>`;
}
function adminCloseProductModal() { document.getElementById('adminProductModal').style.display = 'none'; }
function adminPreviewImage(input) {
  const preview = document.getElementById('pf-image-preview');
  if (!input.files?.length) return;
  preview.src = URL.createObjectURL(input.files[0]);
  preview.style.display = 'block';
  document.getElementById('pf-image-status').textContent = `${input.files[0].name} pendiente de guardar`;
}
async function adminUploadImage(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`/api/admin/uploads/product-image?token=${state.token}`, { method: 'POST', body: form });
  if (!res.ok) throw new Error((await res.json()).detail || 'Error al subir imagen');
  return res.json();
}
async function adminSaveProduct(id) {
  let image = document.getElementById('pf-image').value;
  const file = document.getElementById('pf-image-file').files[0];
  if (file) {
    document.getElementById('pf-image-status').textContent = 'Subiendo imagen...';
    image = (await adminUploadImage(file)).url;
  }
  const data = {
    name: document.getElementById('pf-name').value.trim(),
    brand: document.getElementById('pf-brand').value.trim(),
    category_id: Number(document.getElementById('pf-category').value),
    description: document.getElementById('pf-desc').value.trim(),
    price: Number(document.getElementById('pf-price').value),
    compare_price: Number(document.getElementById('pf-compare').value) || null,
    image,
    sizes: JSON.stringify(document.getElementById('pf-sizes').value.split(',').map(s => s.trim()).filter(Boolean)),
    colors: JSON.stringify(document.getElementById('pf-colors').value.split(',').map(s => s.trim()).filter(Boolean)),
    tags: JSON.stringify(document.getElementById('pf-tags').value.split(',').map(s => s.trim()).filter(Boolean)),
    gender: document.getElementById('pf-gender').value,
    stock: Number(document.getElementById('pf-stock').value),
    active: document.getElementById('pf-active').checked,
    featured: document.getElementById('pf-featured').checked,
    on_sale: document.getElementById('pf-sale').checked,
    rating: 4.5,
  };
  if (!data.name || !data.price) return showToast('Nombre y precio son obligatorios', 'error');
  await api(id ? `/api/products/${id}` : '/api/products', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(data) });
  showToast(id ? 'Producto actualizado' : 'Producto creado');
  adminCloseProductModal();
  switchAdminTab(document.querySelector('.adminTab:nth-child(2)'), 'products');
}
async function adminEditProduct(id) { adminShowProductModal(await api(`/api/admin/product/${id}`)); }
async function adminToggleProduct(id, active) { await api(`/api/admin/products/${id}/quick`, { method: 'PATCH', body: JSON.stringify({ active: !!active }) }); switchAdminTab(document.querySelector('.adminTab:nth-child(2)'), 'products'); }
async function adminDeleteProduct(id) { if (!confirm('¿Eliminar producto? Si tiene histórico se desactivará.')) return; const r = await api(`/api/products/${id}`, { method: 'DELETE' }); showToast(r.deactivated ? 'Producto desactivado por tener histórico' : 'Producto eliminado'); switchAdminTab(document.querySelector('.adminTab:nth-child(2)'), 'products'); }

function renderAdminOrdersHTML(orders) {
  return `<div class="tableWrap"><table class="adminTable"><thead><tr><th>#</th><th>Cliente</th><th>Productos</th><th>Total</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>${orders.map(o => `<tr><td>${o.id}</td><td>${escapeHtml(o.customer?.name || '')}<br><small>${escapeHtml(o.customer?.email || '')}</small></td><td>${(o.items || []).map(i => `${escapeHtml(i.product_name)} x${i.quantity}`).join(', ')}</td><td>${Number(o.total).toFixed(2)} €</td><td><select onchange="adminUpdateOrderStatus(${o.id},this.value)">${['pending','paid','shipped','delivered','cancelled'].map(s => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${statusLabel(s)}</option>`).join('')}</select></td><td>${new Date(o.created_at).toLocaleDateString('es-ES')}</td></tr>`).join('')}</tbody></table></div>`;
}
async function adminUpdateOrderStatus(id, status) { await api(`/api/admin/orders/${id}/status?status=${status}`, { method: 'PATCH' }); showToast('Pedido actualizado'); }
function renderCustomersHTML(rows) { return `<div class="tableWrap"><table class="adminTable"><thead><tr><th>Cliente</th><th>Email</th><th>Pedidos</th><th>Gastado</th><th>Carrito</th></tr></thead><tbody>${rows.map(c => `<tr><td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.email)}</td><td>${c.order_count}</td><td>${Number(c.total_spent).toFixed(2)} €</td><td>${Number(c.cart_value).toFixed(2)} €</td></tr>`).join('')}</tbody></table></div>`; }
function renderCartsHTML(rows) { return rows.length ? `<div class="tableWrap"><table class="adminTable"><thead><tr><th>Cliente</th><th>Email</th><th>Valor</th><th>Productos</th></tr></thead><tbody>${rows.map(c => `<tr><td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.email)}</td><td>${Number(c.cart_value).toFixed(2)} €</td><td>${c.items.map(i => `${escapeHtml(i.name)} x${i.quantity}`).join(', ')}</td></tr>`).join('')}</tbody></table></div>` : '<div class="emptyState"><strong>Sin carritos guardados</strong></div>'; }
function renderImportHTML() { return `<div class="importPanel"><h3>Importar productos desde Excel</h3><p>La columna image puede dejarse vacía; las imágenes se cargan desde el editor de producto.</p><div class="importActions"><a class="btn btnSecondary" href="/api/admin/products/import-template?token=${state.token}" download>Descargar plantilla</a><a class="btn btnSecondary" href="/api/admin/products/export-excel?token=${state.token}" download>Exportar catálogo</a></div><input id="excelFile" type="file" accept=".xlsx"><button class="btn btnPrimary" onclick="adminImportExcel()">Importar</button><div id="importResult"></div></div>`; }
async function adminImportExcel() { const f = document.getElementById('excelFile').files[0]; if (!f) return showToast('Selecciona un Excel', 'error'); const form = new FormData(); form.append('file', f); const res = await fetch(`/api/admin/products/import-excel?token=${state.token}`, { method: 'POST', body: form }); const data = await res.json(); document.getElementById('importResult').innerHTML = res.ok ? `<p>Creados: ${data.created}, actualizados: ${data.updated}, errores: ${data.errors.length}</p>` : `<p>${escapeHtml(data.detail || 'Error')}</p>`; }

function toggleMenu() { document.querySelector('.nav').classList.toggle('open'); }
function closeAll() { if (state.chatOpen) toggleChat(); }
function toggleChat() { state.chatOpen = !state.chatOpen; document.getElementById('chatBox').style.display = state.chatOpen ? 'flex' : 'none'; document.getElementById('overlay').style.display = state.chatOpen ? 'block' : 'none'; }
async function sendChat(e) {
  e.preventDefault();
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  const box = document.getElementById('chatMessages');
  box.innerHTML += `<div class="chatMsg user">${escapeHtml(msg)}</div><div class="chatMsg bot typing">Pensando...</div>`;
  const data = await api('/api/ai/chat', { method: 'POST', body: JSON.stringify({ message: msg, history: [] }) }).catch(() => ({ response: 'Ahora mismo no puedo responder. Prueba de nuevo.' }));
  box.querySelector('.typing')?.remove();
  box.innerHTML += `<div class="chatMsg bot">${escapeHtml(data.response)}</div>`;
  box.scrollTop = box.scrollHeight;
}
function logout() { localStorage.removeItem('mode_token'); state.token = ''; state.user = null; state.cart = []; navigate('/'); }

window.addEventListener('popstate', render);
document.addEventListener('click', e => {
  const a = e.target.closest('a[href]');
  if (!a) return;
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const href = a.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || a.target || a.hasAttribute('download')) return;
  const path = sameOriginPath(href);
  if (!path || path.startsWith('/api/') || !isAppRoute(new URL(path, location.href).pathname)) return;
  e.preventDefault();
  navigate(path);
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.target?.id !== 'catalogSearch') return;
  e.preventDefault();
  applyCatalogFilters();
});
document.addEventListener('DOMContentLoaded', async () => { await loadUser(); await render(); });
