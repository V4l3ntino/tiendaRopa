const state = {
  token: '',
  user: null,
  cart: [],
  categories: [],
  filters: {},
  chatOpen: false,
  catalogRequestId: 0,
  chatAbortController: null,
  chatTypingTimer: null,
  chatTypingEl: null,
  chatStatusEl: null,
  chatBusy: false,
  adminDashboard: null,
  adminOptionDraft: null,
  chatHistory: [],
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

function splitMultiline(value) {
  return String(value || '')
    .split(/\n+/)
    .map(s => s.trim())
    .filter(Boolean);
}

async function pushChatHistory(role, content) {
  state.chatHistory.push({ role, content });
  state.chatHistory = state.chatHistory.slice(-20);
  await DemoStore?.setChatHistory?.(state.chatHistory);
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

function colorName(value) {
  if (value && typeof value === 'object') return String(value.name || '').trim();
  return String(value || '').trim();
}

function colorHex(value) {
  if (value && typeof value === 'object' && /^#[0-9a-f]{6}$/i.test(String(value.hex || ''))) return String(value.hex);
  return '';
}

function normalizeColorOption(value) {
  const name = colorName(value);
  return { name, hex: colorHex(value) || getColorHexByName(name) };
}

function getColorHexByName(color) {
  const c = String(color || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const map = {
    'negro': '#171717', 'black': '#171717',
    'blanco': '#f5f5f5', 'white': '#f5f5f5',
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
  return map[c] || '#d8d2c8';
}

function getColorSwatchStyle(color) {
  return 'background:' + (colorHex(color) || getColorHexByName(colorName(color)));
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

function getSafeNextPath() {
  const next = new URLSearchParams(location.search).get('next') || '';
  const path = sameOriginPath(next);
  if (!path || path === '/login' || path.startsWith('/login?')) return '';
  return isAppRoute(new URL(path, location.href).pathname) ? path : '';
}

async function api(url, options = {}) {
  const headers = options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' };
  const sep = url.includes('?') ? '&' : '?';
  if (state.token && !url.includes('token=')) url += `${sep}token=${encodeURIComponent(state.token)}`;
  if (window.DemoStore) return DemoStore.request(url, { ...options, headers: { ...headers, ...(options.headers || {}) } });
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

function inline(text) {
  let out = escapeHtml(String(text || ''));
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  return out;
}

function renderMarkdown(value) {
  const lines = String(value || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let paragraph = [];
  let inList = false;
  let listTag = '';
  let tableRows = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const text = paragraph.map(line => line.trim()).filter(Boolean).join(' ');
    if (text) blocks.push(`<p>${inline(text)}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!inList) return;
    blocks.push(`</${listTag}>`);
    inList = false;
    listTag = '';
  };

  const splitTableCell = cell => cell.trim();
  const isTableRow = line => /^\|.*\|$/.test(line.trim());
  const isDividerRow = line => /^\|?(\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?$/.test(line.trim());

  const flushTable = () => {
    if (!tableRows.length) return;
    const rows = tableRows.slice();
    tableRows = [];
    const header = rows[0] || '';
    const separatorIndex = rows.findIndex((row, idx) => idx > 0 && isDividerRow(row));
    const bodyStart = separatorIndex >= 0 ? separatorIndex + 1 : 1;
    const headCells = header.split('|').map(splitTableCell).filter(Boolean);
    const bodyRows = rows.slice(bodyStart).filter(isTableRow).map(row => row.split('|').map(splitTableCell).filter(Boolean));
    blocks.push(`<table><thead><tr>${headCells.map(cell => `<th>${inline(cell)}</th>`).join('')}</tr></thead><tbody>${bodyRows.map(row => `<tr>${row.map(cell => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
  };

  const startList = type => {
    if (inList && listTag !== type) flushList();
    if (!inList) {
      listTag = type;
      blocks.push(`<${listTag}>`);
      inList = true;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const bullet = line.match(/^[-*]\s+(.*)$/);
    const ordered = line.match(/^\d+\.\s+(.*)$/);

    if (!line) {
      flushParagraph();
      flushList();
      flushTable();
      continue;
    }

    if (isTableRow(line)) {
      flushParagraph();
      flushList();
      tableRows.push(line);
      continue;
    }

    if (tableRows.length) flushTable();

    if (bullet || ordered) {
      flushParagraph();
      startList(ordered ? 'ol' : 'ul');
      blocks.push(`<li>${inline((bullet || ordered)[1])}</li>`);
      continue;
    }

    flushList();
    paragraph.push(rawLine);
  }

  flushParagraph();
  flushList();
  flushTable();
  return blocks.join('') || `<p>${inline(String(value || ''))}</p>`;
}

function markdownToHtml(md) {
  return renderMarkdown(md);
}

function appendMarkdownChunk(el, chunk) {
  if (!el) return '';
  const raw = `${el.dataset.raw || ''}${String(chunk || '')}`;
  el.dataset.raw = raw;
  const html = renderMarkdown(raw);
  el.innerHTML = html;
  return raw;
}

async function loadUser() {
  if (!state.token) return;
  try {
    state.user = await api('/api/auth/me');
  } catch {
    state.token = '';
    state.user = null;
    await DemoStore?.clearSessionToken?.();
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
  const route = getRoute();
  document.querySelectorAll('.nav a[data-nav]').forEach(a => {
    const href = a.getAttribute('href') || '';
    const linkRoute = href === '/' ? 'home' : href.startsWith('/catalogo') ? 'catalog' : href === '/carrito' ? 'cart' : href === '/checkout' ? 'checkout' : href === '/login' ? 'login' : href === '/perfil' ? 'profile' : href === '/pedidos' ? 'orders' : href === '/admin' ? 'admin' : '';
    const active = linkRoute === route || (route === 'product' && linkRoute === 'catalog');
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
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
  <button class="btn btnSmall btnPrimary addToCartBtn" data-product-id="${p.id}" onclick="quickAdd(${p.id}, this)">Añadir</button>
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
        <input class="searchInput" id="catalogSearch" placeholder="Buscar producto, marca..." value="${escapeHtml(qs.get('q') || '')}" oninput="scheduleCatalogFilters()">
        <select id="catalogCategory" onchange="scheduleCatalogFilters()"><option value="">Todas las categorías</option>${state.categories.map(c => `<option value="${c.slug}" ${qs.get('categoria') === c.slug ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}</select>
        <select id="catalogSort" onchange="scheduleCatalogFilters()"><option value="newest">Novedades</option><option value="price_asc">Precio menor</option><option value="price_desc">Precio mayor</option><option value="rating">Mejor valorados</option></select>
        <button class="btn btnSecondary" onclick="updateCatalogResults()">Filtrar</button>
      </div>
      <div class="productGrid" id="catalogGrid">${data.items.map(productCard).join('')}</div>
      <div class="emptyState" id="catalogEmpty" style="${data.items.length ? 'display:none' : ''}"><strong>Sin productos</strong><p>Prueba otros filtros.</p></div>
  </section>`;
  document.getElementById('catalogSort').value = qs.get('orden') || 'newest';
}

async function updateCatalogResults() {
  const searchEl = document.getElementById('catalogSearch');
  const categoryEl = document.getElementById('catalogCategory');
  const sortEl = document.getElementById('catalogSort');
  if (!searchEl || !categoryEl || !sortEl) return;
  const q = searchEl.value.trim();
  const categoria = categoryEl.value;
  const orden = sortEl.value;
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (categoria) params.set('categoria', categoria);
  if (orden) params.set('orden', orden);
  const path = `/catalogo${params.toString() ? `?${params.toString()}` : ''}`;
  history.replaceState({}, '', path);
  const reqId = ++state.catalogRequestId;
  const apiParams = new URLSearchParams({ sort: orden || 'newest', per_page: '100' });
  if (q) apiParams.set('q', q);
  if (categoria) apiParams.set('category', categoria);
  const data = await api(`/api/products?${apiParams.toString()}`).catch(() => ({ items: [] }));
  if (reqId !== state.catalogRequestId) return;
  const grid = document.getElementById('catalogGrid');
  const empty = document.getElementById('catalogEmpty');
  if (grid) grid.innerHTML = data.items.map(productCard).join('');
  if (empty) empty.style.display = data.items.length ? 'none' : '';
}

function applyCatalogFilters() {
  updateCatalogResults();
}

let catalogSearchTimer = null;
function scheduleCatalogFilters() {
  clearTimeout(catalogSearchTimer);
  catalogSearchTimer = setTimeout(updateCatalogResults, 250);
}

async function renderProduct() {
  const id = location.pathname.split('/').pop();
  const p = await api(`/api/products/${id}`);
  const sizes = parseList(p.sizes);
  const colors = parseList(p.colors);
  const colorOptions = colors.map(normalizeColorOption).filter(c => c.name);
  const tags = parseList(p.tags);
  const extraImages = parseList(p.images);
  const characteristics = splitMultiline(p.characteristics);
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
        ${colorOptions.length ? `<div class="pdOptionLabel">Color: <span id="pdSelectedColor">${escapeHtml(colorOptions[0].name)}</span></div>
        <div class="pdColors" id="pdColors">${colorOptions.map((c, i) => `<button class="colorSwatch ${i === 0 ? 'selected' : ''}" data-color="${escapeHtml(c.name)}" onclick="selectPdColor(this)" title="${escapeHtml(c.name)}" style="${getColorSwatchStyle(c)}"><span>${escapeHtml(c.name)}</span></button>`).join('')}</div>` : ''}
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
            <div class="pdCollapsibleBody"><p>${escapeHtml(p.composition_care || 'Tejido de alta calidad. Consulta la etiqueta del producto para instrucciones detalladas de lavado y cuidado.')}</p></div>
          </div>
          <div class="pdCollapsible">
            <button class="pdCollapsibleBtn" onclick="toggleCollapsible(this)">Características <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button>
            <div class="pdCollapsibleBody">
              <ul>
                ${(characteristics.length ? characteristics : [
                  `Marca: ${p.brand || 'MODE'}`,
                  `Categoría: ${p.category_name || 'General'}`,
                  ...(p.gender ? [`Género: ${p.gender}`] : []),
                  ...(tags.length ? [`Tags: ${tags.join(', ')}`] : []),
                ]).map(item => `<li>${escapeHtml(item)}</li>`).join('')}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

async function quickAdd(id, btn) {
  if (!state.token) return navigate('/login');
  const p = await api(`/api/products/${id}`);
  const size = parseList(p.sizes)[0] || '';
  const color = colorName(parseList(p.colors)[0] || '');
  state.cart = await api('/api/cart', { method: 'POST', body: JSON.stringify({ product_id: id, quantity: 1, size, color }) });
  updateNav();
  showToast('Producto añadido al carrito');
  if (btn) {
    btn.classList.remove('addedConfirm', 'addedPulse');
    void btn.offsetWidth;
    btn.classList.add('addedConfirm', 'addedPulse');
    btn.disabled = true;
    const originalHtml = btn.dataset.originalHtml || btn.innerHTML;
    btn.dataset.originalHtml = originalHtml;
    btn.innerHTML = `<svg class="addToCartTick" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>`;
    setTimeout(() => {
      btn.classList.remove('addedConfirm', 'addedPulse');
      btn.disabled = false;
      btn.innerHTML = btn.dataset.originalHtml || 'Añadir';
    }, 1200);
  }
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
    await DemoStore?.setSessionToken?.(user.token);
    showToast('Sesión iniciada');
    const next = getSafeNextPath();
    navigate(next && (next !== '/admin' || user.role === 'admin') ? next : user.role === 'admin' ? '/admin' : '/catalogo');
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
  if (state.user?.role !== 'admin') return navigate('/login?next=/admin');
  const dashboard = await api('/api/admin/dashboard');
  state.adminDashboard = dashboard;
  appEl.innerHTML = `<section class="adminPage"><h1 class="pageTitle">Panel de administración</h1>
    <div class="adminTabs">
      ${['dashboard', 'products', 'orders', 'customers', 'carts', 'import'].map((tab, i) => `<button class="adminTab ${i === 0 ? 'active' : ''}" onclick="switchAdminTab(this,'${tab}')">${({ dashboard: 'Dashboard', products: 'Productos', orders: 'Pedidos', customers: 'Clientes', carts: 'Carritos', import: 'Datos demo' })[tab]}</button>`).join('')}
      <button class="btn btnSecondary adminStatsBtn" onclick="openStatsModal()"><span>📊</span> Estadisticas</button>
      <button class="btn btnSecondary adminAiBtn" onclick="openAdminAiAnalysis()">Analisis con IA</button>
    </div><div id="adminContent">${renderDashboardHTML(dashboard)}</div>${renderStatsModalHTML(dashboard)}</section>`;
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

function renderStatsModalHTML(d) {
  return `<div class="adminModalOverlay statsModalOverlay" id="statsModal" style="display:none" onclick="if(event.target.id==='statsModal') closeStatsModal()">
    <div class="adminModal statsModal" onclick="event.stopPropagation()">
      <div class="adminModalHeader statsModalHeader">
        <div><h3>Estadisticas</h3><p>Vista rápida de pedidos, ingresos y catálogo.</p></div>
        <button onclick="closeStatsModal()">×</button>
      </div>
      <div class="statsGrid">
        <section class="statsCard"><h4>Barra</h4>${renderBarsSvg(d)}</section>
        <section class="statsCard"><h4>Circular</h4>${renderPieSvg(d)}</section>
        <section class="statsCard"><h4>Lineal</h4>${renderLineSvg(d)}</section>
      </div>
      <div class="statsLegend">
        <div><strong>Ingresos</strong><span>${Number(d.total_revenue).toFixed(2)} €</span></div>
        <div><strong>Pedidos</strong><span>${d.total_orders}</span></div>
        <div><strong>Clientes</strong><span>${d.total_customers}</span></div>
        <div><strong>Productos activos</strong><span>${d.active_products}</span></div>
      </div>
    </div>
  </div>`;
}

function openStatsModal() { const el = document.getElementById('statsModal'); if (el) el.style.display = 'flex'; }
function closeStatsModal() { const el = document.getElementById('statsModal'); if (el) el.style.display = 'none'; }

function renderBarsSvg(d) {
  const items = Object.entries(d.orders_count_by_status || {}).map(([k, v]) => ({ label: statusLabel(k), value: Number(v) }));
  const max = Math.max(...items.map(i => i.value), 1);
  const barW = 52;
  const gap = 18;
  const width = Math.max(320, items.length * (barW + gap) + 50);
  const height = 240;
  const baseY = 185;
  const bars = items.map((item, i) => {
    const h = Math.max(8, (item.value / max) * 120);
    const x = 30 + i * (barW + gap);
    const y = baseY - h;
    return `<g><rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="10" fill="#b12b2f" opacity="${0.55 + (item.value / max) * 0.45}"></rect><text x="${x + barW / 2}" y="${y - 8}" text-anchor="middle" font-size="12" font-weight="700" fill="#171717">${item.value}</text><text x="${x + barW / 2}" y="210" text-anchor="middle" font-size="11" fill="#4b4b4f">${escapeHtml(item.label)}</text></g>`;
  }).join('');
  return `<svg viewBox="0 0 ${width} ${height}" class="statsSvg">${bars}<line x1="20" y1="185" x2="${width - 20}" y2="185" stroke="#d9d0c5" stroke-width="2"/></svg>`;
}

function renderPieSvg(d) {
  const entries = Object.entries(d.revenue_by_status || {});
  const total = entries.reduce((s, [, v]) => s + Number(v || 0), 0) || 1;
  const colors = ['#b12b2f', '#1a56db', '#1d7f55', '#b88a44', '#77777d'];
  let acc = 0;
  const cx = 120, cy = 120, r = 78;
  const parts = entries.map(([k, v], i) => {
    const value = Number(v || 0);
    const angle = (value / total) * Math.PI * 2;
    const start = acc;
    const end = acc + angle;
    acc = end;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const large = angle > Math.PI ? 1 : 0;
    return `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z" fill="${colors[i % colors.length]}"></path>`;
  }).join('');
  const legend = entries.map(([k, v], i) => `<div class="pieLegendItem"><span style="background:${colors[i % colors.length]}"></span>${escapeHtml(statusLabel(k))}: ${Number(v).toFixed(0)} €</div>`).join('');
  return `<div class="pieWrap"><svg viewBox="0 0 240 240" class="statsSvg pieSvg">${parts}<circle cx="120" cy="120" r="38" fill="white"></circle><text x="120" y="118" text-anchor="middle" font-size="16" font-weight="900" fill="#171717">${Number(d.total_revenue).toFixed(0)}€</text><text x="120" y="136" text-anchor="middle" font-size="11" fill="#77777d">Ingresos</text></svg><div class="pieLegend">${legend || '<p>Sin datos</p>'}</div></div>`;
}

function renderLineSvg(d) {
  const points = [
    ['Pedidos', Number(d.total_orders || 0)],
    ['Clientes', Number(d.total_customers || 0)],
    ['Productos', Number(d.active_products || 0)],
    ['Carritos', Number(d.cart_item_count || 0)],
    ['Ingresos', Number(d.total_revenue || 0) / 10],
  ];
  const max = Math.max(...points.map(([, v]) => v), 1);
  const w = 460, h = 230, padX = 30, padY = 25;
  const innerW = w - padX * 2, innerH = h - padY * 2;
  const coords = points.map(([, v], i) => ({ x: padX + (innerW / (points.length - 1)) * i, y: padY + (1 - v / max) * innerH, label: points[i][0], value: v }));
  const path = coords.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
  const area = `${path} L ${padX + innerW} ${h - padY} L ${padX} ${h - padY} Z`;
  return `<svg viewBox="0 0 ${w} ${h}" class="statsSvg"><path d="${area}" fill="rgba(177,43,47,.08)"></path><path d="${path}" fill="none" stroke="#b12b2f" stroke-width="3"></path>${coords.map(p => `<circle cx="${p.x}" cy="${p.y}" r="5" fill="#fff" stroke="#b12b2f" stroke-width="3"></circle><text x="${p.x}" y="${h - 8}" text-anchor="middle" font-size="11" fill="#4b4b4f">${escapeHtml(p.label)}</text>`).join('')}</svg>`;
}

function renderAdminProductsHTML(products) {
  return `<div class="adminToolbar"><input class="adminSearchInput" id="adminProdSearch" placeholder="Buscar..." oninput="filterAdminProducts()"><button class="btn btnPrimary" onclick="adminShowProductModal()">+ Añadir producto</button></div><div id="adminProductsTable">${adminProductsTable(products)}</div><div class="adminModalOverlay" id="adminProductModal" style="display:none"><div class="adminModal"><div class="adminModalHeader"><h3 id="adminModalTitle">Producto</h3><button onclick="adminCloseProductModal()">×</button></div><div class="adminModalBody" id="adminProductForm"></div></div></div>`;
}
function adminActionIcon(type) {
  const icons = {
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 20h4l12-12-4-4L4 16v4Z"></path><path d="M13 7l4 4"></path></svg>',
    view: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.66 0l2.12-2.12a4 4 0 0 0-5.66-5.66L11 7.34"></path><path d="M14 10a4 4 0 0 0-5.66 0L6.22 12.12a4 4 0 0 0 5.66 5.66L13 16.66"></path></svg>',
    hide: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 3l18 18"></path><path d="M10.6 10.6A3 3 0 0012 16a3 3 0 002.6-4.4"></path><path d="M4.8 7.2C3.2 8.7 2.5 12 2.5 12s3.5 6 9.5 6c1 0 1.9-.1 2.8-.4"></path><path d="M14.8 5.2C14 5 13.1 4.9 12 4.9c-6 0-9.5 7.1-9.5 7.1s.6 1.1 1.7 2.6"></path></svg>',
    show: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path><circle cx="12" cy="12" r="3"></circle><path d="M12 7v2"></path></svg>',
    delete: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M6 6l1 14h10l1-14"></path><path d="M10 10v6"></path><path d="M14 10v6"></path></svg>',
  };
  return icons[type] || icons.view;
}
function adminProductsTable(products) {
  window._adminProducts = products;
    return `<div class="tableWrap"><table class="adminTable"><thead><tr><th>ID</th><th>Imagen</th><th>Producto</th><th>Marca</th><th>Precio</th><th>Stock</th><th>Activo</th><th>Acciones</th></tr></thead><tbody>${products.map(p => `<tr data-product-id="${p.id}" data-active="${p.active ? 1 : 0}" data-text="${escapeHtml(`${p.name} ${p.brand}`.toLowerCase())}"><td>${p.id}</td><td><img class="adminThumb" src="${escapeHtml(p.image || '')}" alt=""></td><td><strong>${escapeHtml(p.name)}</strong><br><small>${escapeHtml(p.category_name || '')}</small></td><td>${escapeHtml(p.brand)}</td><td>${Number(p.price).toFixed(2)} €</td><td>${p.stock}</td><td>${p.active ? 'Sí' : 'No'}</td><td><div class="adminActionsCell"><button class="btnTiny adminActionBtn" type="button" aria-label="Editar producto" title="Editar producto" onclick="adminEditProduct(${p.id})">${adminActionIcon('edit')}</button><button class="btnTiny adminActionBtn" type="button" aria-label="Abrir ficha del producto" title="Abrir ficha del producto" onclick="adminOpenProductPreview(${p.id})">${adminActionIcon('view')}</button><button class="btnTiny adminActionBtn adminToggleBtn" type="button" aria-label="${p.active ? 'Ocultar producto' : 'Activar producto'}" title="${p.active ? 'Ocultar producto' : 'Activar producto'}" onclick="adminToggleProduct(${p.id}, ${p.active ? 0 : 1})">${adminActionIcon(p.active ? 'hide' : 'show')}</button><button class="btnTiny danger adminActionBtn" type="button" aria-label="Eliminar producto" title="Eliminar producto" onclick="adminDeleteProduct(${p.id})">${adminActionIcon('delete')}</button></div></td></tr>`).join('')}</tbody></table></div>`;
}
function adminOpenProductPreview(id) { window.open(`/producto/${id}`, '_blank', 'noopener,noreferrer'); }
function filterAdminProducts() {
  const q = document.getElementById('adminProdSearch').value.toLowerCase();
  document.querySelectorAll('#adminProductsTable tbody tr').forEach(tr => tr.style.display = tr.dataset.text.includes(q) ? '' : 'none');
}

function adminShowProductModal(product = null) {
  document.getElementById('adminProductModal').style.display = 'flex';
  document.getElementById('adminModalTitle').textContent = product ? 'Editar producto' : 'Añadir producto';
  const tags = product ? parseList(product.tags).join(', ') : '';
  const categoryName = product?.category_name || state.categories.find(c => Number(c.id) === Number(product?.category_id))?.name || 'Categoría';
  const productName = product?.name || 'Nuevo producto';
  const productBrand = product?.brand || 'MODE';
  const productPrice = Number(product?.price || 0);
  const comparePrice = Number(product?.compare_price || 0);
  const discount = comparePrice && productPrice ? Math.max(0, Math.round((1 - productPrice / comparePrice) * 100)) : 0;
  document.getElementById('adminProductForm').innerHTML = `<div class="productEditorLayout">
    <aside class="productEditorPreview">
      <div class="editorPreviewHeader">
        <span>Vista catálogo</span>
        <strong>${escapeHtml(product ? 'Editando' : 'Nuevo')}</strong>
      </div>
      <div class="editorProductMock">
        <div class="editorProductImage">
          ${product?.image ? `<img id="pf-image-preview" src="${escapeHtml(product.image)}" alt="Preview">` : '<img id="pf-image-preview" style="display:none" alt="Preview">'}
          <div class="editorImageEmpty" id="pf-image-empty" ${product?.image ? 'style="display:none"' : ''}>Añade una imagen</div>
          ${discount ? `<span class="editorSaleBadge">-${discount}%</span>` : ''}
        </div>
        <div class="editorProductInfo">
          <span id="editor-preview-brand">${escapeHtml(productBrand)}</span>
          <strong id="editor-preview-name">${escapeHtml(productName)}</strong>
          <small id="editor-preview-category">${escapeHtml(categoryName)}</small>
          <div class="editorPriceRow"><b id="editor-preview-price">${productPrice ? productPrice.toFixed(2) : '0.00'} €</b><em id="editor-preview-compare" ${comparePrice ? '' : 'style="display:none"'}>${comparePrice ? `${comparePrice.toFixed(2)} €` : ''}</em></div>
        </div>
      </div>
      <label class="imageUploadBox" for="pf-image-file">
        <input id="pf-image-file" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" onchange="adminPreviewImage(this)">
        <span class="uploadIcon">+</span>
        <strong>${product?.image ? 'Cambiar imagen' : 'Subir imagen'}</strong>
        <small>JPG, PNG, WebP, AVIF o GIF. Se guarda en local.</small>
        <span id="pf-image-status">${product?.image ? 'Imagen actual del producto' : 'Ninguna imagen seleccionada'}</span>
      </label>
      <input type="hidden" id="pf-image" value="${escapeHtml(product?.image || '')}">
    </aside>
    <div class="productEditorFields">
      <section class="editorSection">
        <div class="editorSectionHead"><span>01</span><h4>Información básica</h4></div>
        <div class="adminFormGrid">
          <div class="formGroup"><label>Nombre *</label><input id="pf-name" value="${escapeHtml(product?.name || '')}" oninput="adminUpdateAiHint(); adminUpdateProductPreview()"></div>
          <div class="formGroup"><label>Marca</label><input id="pf-brand" value="${escapeHtml(product?.brand || '')}" oninput="adminUpdateAiHint(); adminUpdateProductPreview()"></div>
          <div class="formGroup"><label>Categoría</label><select id="pf-category" onchange="adminUpdateAiHint(); adminUpdateProductPreview()">${state.categories.map(c => `<option value="${c.id}" ${product?.category_id === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}</select></div>
          <div class="formGroup"><label>Género</label><select id="pf-gender">${['unisex','hombre','mujer'].map(g => `<option ${product?.gender === g ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
        </div>
      </section>
      <section class="editorSection">
        <div class="editorSectionHead"><span>02</span><h4>Precio y stock</h4></div>
        <div class="adminFormGrid compact">
          <div class="formGroup"><label>Precio *</label><input id="pf-price" type="number" step="0.01" value="${product?.price || ''}" oninput="adminUpdateProductPreview()"></div>
          <div class="formGroup"><label>Precio anterior</label><input id="pf-compare" type="number" step="0.01" value="${product?.compare_price || ''}" oninput="adminUpdateProductPreview()"></div>
          <div class="formGroup"><label>Stock</label><input id="pf-stock" type="number" value="${product?.stock ?? 0}"></div>
          <div class="formGroup"><label>Tags</label><input id="pf-tags" value="${escapeHtml(tags)}" placeholder="nuevo, popular, oferta"></div>
        </div>
      </section>
      <section class="editorSection">
        <div class="editorSectionHead"><span>03</span><h4>Contenido comercial</h4></div>
        <div class="formGroup"><label>Descripción</label><textarea id="pf-desc">${escapeHtml(product?.description || '')}</textarea></div>
        <div class="adminAiActions"><button class="btn btnSecondary" type="button" onclick="adminGenerateProductAi(${product?.id || 0})">Crear con IA</button><small id="pf-ai-hint">Rellena primero nombre, marca y categoría.</small></div>
        <div class="formGroup"><label>Características</label><textarea id="pf-characteristics" placeholder="Marca:...\nCategoría:...\nGénero:...\nTags:...">${escapeHtml(product?.characteristics || '')}</textarea></div>
        <div class="formGroup"><label>Composición y cuidados</label><textarea id="pf-composition" placeholder="Tejido...\nCuidado...">${escapeHtml(product?.composition_care || '')}</textarea></div>
      </section>
      <section class="editorSection">
        <div class="editorSectionHead"><span>04</span><h4>Variantes</h4></div>
        <div class="optionEditorGrid">
          <section class="optionEditor"><div class="optionEditorHeader"><div><label>Tallas disponibles</label><small>Añade varias separadas por coma.</small></div><button class="btnTiny" type="button" onclick="adminOpenOptionTemplates('sizes')">Plantilla</button></div><div class="optionInputRow"><input id="pf-size-name" placeholder="Ej: S, M, L, XL" onkeydown="if(event.key==='Enter'){event.preventDefault();adminAddSizeOption()}"><button class="btn btnSecondary" id="pf-size-add" type="button" onclick="adminAddSizeOption()">Añadir tallas</button></div><div class="optionChipList sizeChipList" id="pf-size-list"></div><input type="hidden" id="pf-sizes"></section>
          <section class="optionEditor"><div class="optionEditorHeader"><div><label>Colores disponibles</label><small>Nombre y muestra visual.</small></div><button class="btnTiny" type="button" onclick="adminOpenOptionTemplates('colors')">Plantilla</button></div><div class="optionInputRow colorRow"><input id="pf-color-name" placeholder="Ej: Negro" onkeydown="if(event.key==='Enter'){event.preventDefault();adminAddColorOption()}"><input id="pf-color-hex" type="color" value="#171717" aria-label="Color"><button class="btn btnSecondary" id="pf-color-add" type="button" onclick="adminAddColorOption()">Añadir color</button></div><div class="optionColorList" id="pf-color-list"></div><input type="hidden" id="pf-colors"></section>
        </div>
      </section>
      <section class="editorSection">
        <div class="editorSectionHead"><span>05</span><h4>Visibilidad</h4></div>
        <div class="checkRow productStatusRow"><label><input id="pf-active" type="checkbox" ${!product || product.active ? 'checked' : ''}> <span>Activo</span></label><label><input id="pf-featured" type="checkbox" ${product?.featured ? 'checked' : ''}> <span>Destacado</span></label><label><input id="pf-sale" type="checkbox" ${product?.on_sale ? 'checked' : ''}> <span>Oferta</span></label></div>
      </section>
    </div>
  </div>
  <div class="templatePopupOverlay" id="optionTemplatePopup" style="display:none" onclick="if(event.target.id==='optionTemplatePopup') adminCloseOptionTemplates()"><div class="templatePopup" onclick="event.stopPropagation()" id="optionTemplatePanel"></div></div>
  <div class="modalActions editorActions"><span>${product ? 'Revisa los cambios antes de guardar.' : 'Completa los campos obligatorios para publicar.'}</span><div><button class="btn btnSecondary" onclick="adminCloseProductModal()">Cancelar</button><button class="btn btnPrimary" onclick="adminSaveProduct(${product?.id || 0})">${product ? 'Guardar cambios' : 'Crear producto'}</button></div></div>`;
  adminInitOptionEditors(product);
  adminUpdateAiHint();
}
function adminCloseProductModal() { document.getElementById('adminProductModal').style.display = 'none'; }
function adminInitOptionEditors(product = null) {
  const sizes = product ? parseList(product.sizes).map(s => String(s || '').trim()).filter(Boolean) : [];
  const colors = product ? parseList(product.colors).map(normalizeColorOption).filter(c => c.name) : [];
  state.adminOptionDraft = { sizes, colors, templateType: '', editingTemplateId: 0, templateName: '', templateItems: [], templateItemsLoaded: false, applyMode: 'append' };
  adminRenderOptionEditors();
}
function adminRenderOptionEditors() {
  const draft = state.adminOptionDraft;
  if (!draft) return;
  const sizeHidden = document.getElementById('pf-sizes');
  const colorHidden = document.getElementById('pf-colors');
  if (sizeHidden) sizeHidden.value = JSON.stringify(draft.sizes);
  if (colorHidden) colorHidden.value = JSON.stringify(draft.colors);
  const sizeList = document.getElementById('pf-size-list');
  if (sizeList) sizeList.innerHTML = draft.sizes.length ? draft.sizes.map((size, i) => `<span class="optionChip"><strong>${escapeHtml(size)}</strong><button class="optionRemoveBtn" type="button" aria-label="Eliminar talla ${escapeHtml(size)}" title="Eliminar" onclick="adminDeleteSizeOption(${i})">×</button></span>`).join('') : '<small>Sin tallas añadidas.</small>';
  const colorList = document.getElementById('pf-color-list');
  if (colorList) colorList.innerHTML = draft.colors.length ? draft.colors.map((color, i) => `<div class="optionColorItem"><span class="miniSwatch" style="background:${escapeHtml(color.hex)}"></span><strong>${escapeHtml(color.name)}</strong><small>${escapeHtml(color.hex)}</small><button class="optionRemoveBtn" type="button" aria-label="Eliminar color ${escapeHtml(color.name)}" title="Eliminar" onclick="adminDeleteColorOption(${i})">×</button></div>`).join('') : '<small>Sin colores añadidos.</small>';
}
function adminAddSizeOption() {
  const draft = state.adminOptionDraft;
  const input = document.getElementById('pf-size-name');
  const values = String(input?.value || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!draft || !values.length) return showToast('Escribe una o varias tallas', 'error');
  values.forEach(value => {
    if (!draft.sizes.some(s => s.toLowerCase() === value.toLowerCase())) draft.sizes.push(value);
  });
  if (input) input.value = '';
  adminRenderOptionEditors();
}
function adminDeleteSizeOption(index) {
  const draft = state.adminOptionDraft;
  if (!draft) return;
  draft.sizes.splice(index, 1);
  adminRenderOptionEditors();
}
function adminAddColorOption() {
  const draft = state.adminOptionDraft;
  const nameInput = document.getElementById('pf-color-name');
  const hexInput = document.getElementById('pf-color-hex');
  const name = nameInput?.value.trim();
  const hex = hexInput?.value || '#777777';
  if (!draft || !name) return showToast('Escribe el nombre del color', 'error');
  const color = { name, hex };
  const existing = draft.colors.findIndex(c => c.name.toLowerCase() === name.toLowerCase());
  if (existing >= 0) draft.colors[existing] = color;
  else draft.colors.push(color);
  if (nameInput) nameInput.value = '';
  if (hexInput) hexInput.value = '#171717';
  adminRenderOptionEditors();
}
function adminDeleteColorOption(index) {
  const draft = state.adminOptionDraft;
  if (!draft) return;
  draft.colors.splice(index, 1);
  adminRenderOptionEditors();
}
async function adminOpenOptionTemplates(type) {
  if (!state.adminOptionDraft) return;
  state.adminOptionDraft.templateType = type;
  state.adminOptionDraft.editingTemplateId = 0;
  state.adminOptionDraft.templateName = '';
  state.adminOptionDraft.templateItems = [];
  state.adminOptionDraft.templateItemsLoaded = false;
  state.adminOptionDraft.applyMode = 'append';
  await adminRenderOptionTemplates();
}
function adminCloseOptionTemplates() {
  const popup = document.getElementById('optionTemplatePopup');
  if (popup) popup.style.display = 'none';
}
async function adminRenderOptionTemplates() {
  const draft = state.adminOptionDraft;
  const popup = document.getElementById('optionTemplatePopup');
  const panel = document.getElementById('optionTemplatePanel');
  if (!draft || !popup || !panel) return;
  const type = draft.templateType || 'sizes';
  const allTemplates = await DemoStore.listOptionTemplates(type);
  const editingTemplate = draft.editingTemplateId > 0 ? allTemplates.find(t => Number(t.id) === Number(draft.editingTemplateId)) : null;
  if (editingTemplate && !draft.templateItemsLoaded) {
    draft.templateName = editingTemplate.name || '';
    draft.templateItems = type === 'colors' ? editingTemplate.items.map(normalizeColorOption).filter(c => c.name) : editingTemplate.items.map(s => String(s || '').trim()).filter(Boolean);
    draft.templateItemsLoaded = true;
  }
  const isEditing = Boolean(draft.editingTemplateId);
  const label = type === 'colors' ? 'colores' : 'tallas';
  const tab = name => `<button class="templateTab ${type === name ? 'active' : ''}" type="button" onclick="adminSwitchOptionTemplateType('${name}')">${name === 'colors' ? 'Colores' : 'Tallas'}</button>`;
  const renderTemplateItems = items => type === 'colors'
    ? items.map(item => `<span class="templateColorPill"><span class="miniSwatch" style="background:${escapeHtml(colorHex(item) || getColorHexByName(colorName(item)))}"></span><strong>${escapeHtml(colorName(item))}</strong><small>${escapeHtml(colorHex(item) || getColorHexByName(colorName(item)))}</small></span>`).join('')
    : `<small>${escapeHtml(items.join(', '))}</small>`;
  const editorTitle = draft.editingTemplateId > 0 ? 'Editar plantilla' : 'Nueva plantilla';
  const editorSaveLabel = draft.editingTemplateId > 0 ? 'Guardar cambios' : 'Crear plantilla';
  const editorHtml = isEditing ? `<div class="templateEditor"><div class="templateEditorHeader"><div><strong>${editorTitle}</strong><small>${type === 'colors' ? 'Guarda una paleta reutilizable.' : 'Escribe las tallas separadas por comas.'}</small></div><button type="button" class="btnTiny" onclick="adminCancelTemplateEdit()">Cancelar</button></div><div class="templateSaveRow"><input id="optionTemplateName" placeholder="Nombre de plantilla" value="${escapeHtml(draft.templateName || '')}"><button class="btn btnPrimary" type="button" onclick="adminSaveCurrentOptionTemplate('${type}')">${editorSaveLabel}</button></div><div class="templateSubEditor">${type === 'colors' ? `<div class="optionInputRow colorRow"><input id="template-color-name" placeholder="Nombre del color" onkeydown="if(event.key==='Enter'){event.preventDefault();adminAddTemplateItem('${type}')}"><input id="template-color-hex" type="color" value="#171717"><button class="btn btnSecondary" type="button" onclick="adminAddTemplateItem('${type}')">Añadir color</button></div><div class="optionColorList" id="templateItemList">${(draft.templateItems || []).length ? (draft.templateItems || []).map((item, i) => `<div class="optionColorItem"><span class="miniSwatch" style="background:${escapeHtml(item.hex)}"></span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.hex)}</small><button class="optionRemoveBtn" type="button" aria-label="Eliminar color ${escapeHtml(item.name)}" title="Eliminar" onclick="adminDeleteTemplateItem(${i})">×</button></div>`).join('') : '<small>Sin colores añadidos.</small>'}</div>` : `<textarea id="template-size-values" placeholder="XS, S, M, L, XL, XXL">${escapeHtml((draft.templateItems || []).join(', '))}</textarea>`}</div></div>` : '';
  const listHtml = allTemplates.length ? allTemplates.map(t => `<div class="templateItem"><div><strong>${escapeHtml(t.name)}</strong><div class="templateItemValues">${renderTemplateItems(t.items)}</div></div><div class="templateItemActions"><div class="templateApplyChoice"><label><input type="radio" name="template-apply-${t.id}" value="append" checked> Añadir</label><label><input type="radio" name="template-apply-${t.id}" value="replace"> Reemplazar</label></div><button class="btnTiny templateApplyBtn" type="button" onclick="adminApplyOptionTemplate('${type}', ${t.id})">Aplicar</button><button class="btnIcon" type="button" aria-label="Editar plantilla ${escapeHtml(t.name)}" title="Editar" onclick="adminEditOptionTemplate('${type}', ${t.id})">✎</button><button class="btnIcon danger" type="button" aria-label="Eliminar plantilla ${escapeHtml(t.name)}" title="Eliminar" onclick="adminDeleteOptionTemplate('${type}', ${t.id})">×</button></div></div>`).join('') : '<div class="emptyState"><strong>Sin plantillas</strong><p>Crea una plantilla nueva para reutilizarla en otros productos.</p></div>';
  popup.style.display = 'flex';
  panel.innerHTML = `<div class="templatePanelHeader"><div><strong>Plantillas de variantes</strong><small>Trabajando con ${label}.</small></div><button type="button" onclick="adminCloseOptionTemplates()">×</button></div><div class="templateTabs">${tab('sizes')}${tab('colors')}</div><div class="templateToolbar"><button class="btn btnSecondary" type="button" onclick="adminNewOptionTemplate('${type}')">+ Nueva plantilla</button></div>${editorHtml}<div class="templateList">${listHtml}</div>`;
}
function adminSwitchOptionTemplateType(type) {
  if (!state.adminOptionDraft) return;
  state.adminOptionDraft.templateType = type;
  state.adminOptionDraft.editingTemplateId = 0;
  state.adminOptionDraft.templateName = '';
  state.adminOptionDraft.templateItems = [];
  state.adminOptionDraft.templateItemsLoaded = false;
  adminRenderOptionTemplates();
}
function adminNewOptionTemplate(type) {
  if (!state.adminOptionDraft) return;
  state.adminOptionDraft.templateType = type;
  state.adminOptionDraft.editingTemplateId = -1;
  state.adminOptionDraft.templateName = '';
  state.adminOptionDraft.templateItems = [];
  state.adminOptionDraft.templateItemsLoaded = true;
  adminRenderOptionTemplates();
}
function currentOptionItems(type) {
  const draft = state.adminOptionDraft;
  if (!draft?.editingTemplateId) return [];
  if (type === 'colors') return draft.templateItems || [];
  const values = document.getElementById('template-size-values')?.value || '';
  return values.split(',').map(s => s.trim()).filter(Boolean);
}
async function adminSaveCurrentOptionTemplate(type) {
  const name = document.getElementById('optionTemplateName')?.value.trim();
  const items = currentOptionItems(type);
  try {
    await DemoStore.saveOptionTemplate(type, { id: state.adminOptionDraft?.editingTemplateId > 0 ? state.adminOptionDraft.editingTemplateId : 0, name, items });
  if (state.adminOptionDraft) {
      state.adminOptionDraft.editingTemplateId = 0;
      state.adminOptionDraft.templateName = '';
      state.adminOptionDraft.templateItems = [];
      state.adminOptionDraft.templateItemsLoaded = false;
    }
    showToast('Plantilla guardada');
    await adminRenderOptionTemplates();
  } catch (e) { showToast(e.message || 'No se pudo guardar la plantilla', 'error'); }
}
async function adminApplyOptionTemplate(type, id) {
  const template = (await DemoStore.listOptionTemplates(type)).find(t => Number(t.id) === Number(id));
  if (!template || !state.adminOptionDraft) return;
  const selectedMode = document.querySelector(`input[name="template-apply-${id}"]:checked`)?.value || 'append';
  if (type === 'colors') {
    const nextColors = template.items.map(normalizeColorOption).filter(c => c.name);
    state.adminOptionDraft.colors = selectedMode === 'replace' ? nextColors : mergeColorOptions(state.adminOptionDraft.colors, nextColors);
  } else {
    const nextSizes = template.items.map(s => String(s || '').trim()).filter(Boolean);
    state.adminOptionDraft.sizes = selectedMode === 'replace' ? nextSizes : mergeTextOptions(state.adminOptionDraft.sizes, nextSizes);
  }
  adminRenderOptionEditors();
  adminCloseOptionTemplates();
  showToast('Plantilla aplicada');
}
function adminEditOptionTemplate(type, id) {
  if (!state.adminOptionDraft) return;
  state.adminOptionDraft.templateType = type;
  state.adminOptionDraft.editingTemplateId = Number(id);
  state.adminOptionDraft.templateName = '';
  state.adminOptionDraft.templateItems = [];
  state.adminOptionDraft.templateItemsLoaded = false;
  adminRenderOptionTemplates();
}
async function adminCancelTemplateEdit() {
  if (!state.adminOptionDraft) return;
  state.adminOptionDraft.editingTemplateId = 0;
  state.adminOptionDraft.templateName = '';
  state.adminOptionDraft.templateItems = [];
  state.adminOptionDraft.templateItemsLoaded = false;
  await adminRenderOptionTemplates();
}
async function adminDeleteOptionTemplate(type, id) {
  if (!confirm('¿Eliminar plantilla?')) return;
  await DemoStore.deleteOptionTemplate(type, id);
  if (state.adminOptionDraft?.editingTemplateId === Number(id)) {
    state.adminOptionDraft.editingTemplateId = 0;
    state.adminOptionDraft.templateName = '';
    state.adminOptionDraft.templateItems = [];
    state.adminOptionDraft.templateItemsLoaded = false;
  }
  await adminRenderOptionTemplates();
}

function mergeTextOptions(current, incoming) {
  const merged = [...(current || [])];
  incoming.forEach(item => {
    if (!merged.some(existing => String(existing).toLowerCase() === String(item).toLowerCase())) merged.push(item);
  });
  return merged;
}

function mergeColorOptions(current, incoming) {
  const merged = [...(current || [])];
  incoming.forEach(item => {
    const existing = merged.findIndex(color => color.name.toLowerCase() === item.name.toLowerCase());
    if (existing >= 0) merged[existing] = item;
    else merged.push(item);
  });
  return merged;
}

function adminAddTemplateItem(type) {
  const draft = state.adminOptionDraft;
  if (!draft) return;
  if (type === 'colors') {
    const name = document.getElementById('template-color-name')?.value.trim();
    const hex = document.getElementById('template-color-hex')?.value || '#171717';
    if (!name) return showToast('Escribe el nombre del color', 'error');
    draft.templateItems = draft.templateItems || [];
    draft.templateItems.push({ name, hex });
    const nameEl = document.getElementById('template-color-name'); if (nameEl) nameEl.value = '';
    const hexEl = document.getElementById('template-color-hex'); if (hexEl) hexEl.value = '#171717';
  } else {
    const name = document.getElementById('template-size-name')?.value.trim();
    if (!name) return showToast('Escribe la talla', 'error');
    draft.templateItems = draft.templateItems || [];
    draft.templateItems.push(name);
    const nameEl = document.getElementById('template-size-name'); if (nameEl) nameEl.value = '';
  }
  adminRenderOptionTemplates();
}

function adminDeleteTemplateItem(index) {
  const draft = state.adminOptionDraft;
  if (!draft) return;
  draft.templateItems.splice(index, 1);
  adminRenderOptionTemplates();
}
function adminUpdateAiHint() {
  const hint = document.getElementById('pf-ai-hint');
  if (!hint) return;
  const name = document.getElementById('pf-name')?.value.trim();
  const brand = document.getElementById('pf-brand')?.value.trim();
  const category_id = Number(document.getElementById('pf-category')?.value);
  if (!name || !brand || !category_id) {
    hint.textContent = 'Rellena primero nombre, marca y categoría.';
  } else if (hint.textContent === 'Rellena primero nombre, marca y categoría.') {
    hint.textContent = '';
  }
}
function adminUpdateProductPreview() {
  const nameEl = document.getElementById('editor-preview-name');
  const brandEl = document.getElementById('editor-preview-brand');
  const categoryEl = document.getElementById('editor-preview-category');
  const priceEl = document.getElementById('editor-preview-price');
  const compareEl = document.getElementById('editor-preview-compare');
  if (nameEl) nameEl.textContent = document.getElementById('pf-name')?.value.trim() || 'Nuevo producto';
  if (brandEl) brandEl.textContent = document.getElementById('pf-brand')?.value.trim() || 'MODE';
  if (categoryEl) categoryEl.textContent = document.getElementById('pf-category')?.selectedOptions?.[0]?.textContent || 'Categoría';
  const price = Number(document.getElementById('pf-price')?.value || 0);
  const compare = Number(document.getElementById('pf-compare')?.value || 0);
  if (priceEl) priceEl.textContent = `${price ? price.toFixed(2) : '0.00'} €`;
  if (compareEl) {
    compareEl.textContent = compare ? `${compare.toFixed(2)} €` : '';
    compareEl.style.display = compare ? '' : 'none';
  }
}
function adminPreviewImage(input) {
  const preview = document.getElementById('pf-image-preview');
  const empty = document.getElementById('pf-image-empty');
  if (!input.files?.length) return;
  preview.src = URL.createObjectURL(input.files[0]);
  preview.style.display = 'block';
  if (empty) empty.style.display = 'none';
  document.getElementById('pf-image-status').textContent = `${input.files[0].name} pendiente de guardar`;
}
async function adminUploadImage(file) {
  const form = new FormData();
  form.append('file', file);
  return api('/api/admin/uploads/product-image', { method: 'POST', body: form });
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
    characteristics: document.getElementById('pf-characteristics').value.trim(),
    composition_care: document.getElementById('pf-composition').value.trim(),
    price: Number(document.getElementById('pf-price').value),
    compare_price: Number(document.getElementById('pf-compare').value) || null,
    image,
    sizes: document.getElementById('pf-sizes').value || '[]',
    colors: document.getElementById('pf-colors').value || '[]',
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
async function adminGenerateProductAi(id) {
  const name = document.getElementById('pf-name').value.trim();
  const brand = document.getElementById('pf-brand').value.trim();
  const category_id = Number(document.getElementById('pf-category').value);
  const category_name = document.getElementById('pf-category').selectedOptions?.[0]?.textContent || '';
  const price = Number(document.getElementById('pf-price').value);
  const description = document.getElementById('pf-desc').value.trim();
  const tags = document.getElementById('pf-tags').value.trim();
  const gender = document.getElementById('pf-gender').value;
  const hint = document.getElementById('pf-ai-hint');
  if (!name || !brand || !category_id) {
    if (hint) hint.textContent = 'Rellena primero nombre, marca y categoría.';
    return showToast('Rellena nombre, marca y categoría antes de usar IA', 'error');
  }
  if (hint) hint.textContent = 'Generando descripción con IA';
  const btn = document.querySelector('.adminAiActions button');
  if (btn) btn.disabled = true;
  try {
    const data = generateProductCopyLocal({ name, brand, category_name, price, description, tags, gender });
    await animateProductAiFields({
      description: data.description || '',
      characteristics: data.characteristics || '',
      composition_care: data.composition_care || '',
    });
    showToast('Texto generado con IA');
  } catch (e) {
    showToast(e.message || 'No se pudo generar el texto', 'error');
  } finally {
    if (btn) btn.disabled = false;
    if (hint) {
      const currentName = document.getElementById('pf-name')?.value.trim();
      const currentBrand = document.getElementById('pf-brand')?.value.trim();
      const currentCategory = Number(document.getElementById('pf-category')?.value);
      hint.textContent = (currentName && currentBrand && currentCategory) ? '' : 'Rellena primero nombre, marca y categoría.';
    }
  }
}

function generateProductCopyLocal({ name, brand, category_name, price, description, tags, gender }) {
  const tagList = String(tags || '').split(',').map(s => s.trim()).filter(Boolean);
  const isPremium = Number(price) >= 80;
  const moodByCategory = {
    'Chaquetas': ['protección ligera', 'versatilidad urbana', 'estilo premium'],
    'Zapatos': ['comodidad diaria', 'agarre seguro', 'acabado limpio'],
    'Pantalones': ['ajuste favorecedor', 'comodidad continua', 'libertad de movimiento'],
    'Camisetas': ['suavidad', 'uso diario', 'fondo de armario'],
    'Accesorios': ['toque final', 'uso diario', 'detalle funcional'],
    'Vestidos': ['caída fluida', 'silencio visual', 'aire sofisticado'],
    'Sudaderas': ['calidez', 'confort', 'look relajado'],
  };
  const moods = moodByCategory[category_name] || ['estilo actual', 'comodidad', 'uso versátil'];
  const opener = isPremium ? 'Una pieza pensada para elevar cualquier look' : 'Una propuesta fácil de combinar para el día a día';
  const styleHint = tagList.includes('nuevo') ? 'con un acabado actual y fresco' : tagList.includes('oferta') ? 'con una excelente relación entre estilo y precio' : 'con una presencia equilibrada';
  const baseDescription = `${opener}, ${name.toLowerCase()} de ${brand} aporta ${moods[0]}, ${moods[1]} y ${styleHint}. Ideal para ${gender === 'mujer' ? 'looks femeninos' : gender === 'hombre' ? 'looks masculinos' : 'cualquier armario'} que buscan funcionalidad y estilo.`;
  const characteristics = [
    `Marca: ${brand}`,
    `Categoría: ${category_name}`,
    `Género: ${gender}`,
    `Precio: ${Number(price).toFixed(2)} €`,
    `Uso: ${moods[2]}`,
    tagList.length ? `Tags: ${tagList.join(', ')}` : 'Tags: selección del catálogo',
  ].join('\n');
  const composition = category_name === 'Zapatos'
    ? `Materiales seleccionados para ofrecer una pisada estable y un uso cómodo durante todo el día. Consulta la etiqueta del producto para recomendaciones de limpieza y conservación.`
    : category_name === 'Chaquetas'
      ? `Tejido pensado para ofrecer abrigo ligero y buen tacto. Se recomienda lavar siguiendo las indicaciones de la etiqueta para mantener su forma y acabado.`
      : category_name === 'Vestidos'
        ? `Tejido fluido y agradable al contacto con la piel. Para conservar el color y la caída, sigue las instrucciones de lavado de la etiqueta.`
        : `Tejido cómodo y resistente para acompañar el uso diario. Consulta la etiqueta del producto para instrucciones de lavado y cuidado.`;
  return {
    description: description || baseDescription,
    characteristics,
    composition_care: composition,
  };
}

async function animateProductAiFields(copy) {
  const descEl = document.getElementById('pf-desc');
  const charEl = document.getElementById('pf-characteristics');
  const compEl = document.getElementById('pf-composition');
  if (!descEl || !charEl || !compEl) return;
  await typeTextareaWords(descEl, copy.description);
  await pause(120);
  await typeTextareaWords(charEl, copy.characteristics);
  await pause(120);
  await typeTextareaWords(compEl, copy.composition_care);
}

function pause(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function typeTextareaWords(el, text) {
  return new Promise(resolve => {
    const tokens = String(text || '').match(/\s+|\S+/g) || [];
    el.value = '';
    if (!tokens.length) return resolve();
    let raw = '';
    let i = 0;
    const timer = setInterval(() => {
      raw += tokens[i];
      el.value = raw;
      el.scrollTop = el.scrollHeight;
      i += 1;
      if (i >= tokens.length) {
        clearInterval(timer);
        resolve();
      }
    }, 18);
  });
}
async function adminToggleProduct(id, active) {
  const nextActive = !!active;
  const row = document.querySelector(`#adminProductsTable tbody tr[data-product-id="${id}"]`);
  const activeCell = row?.children?.[6];
  const actionBtn = row?.querySelector('.adminToggleBtn');
  const product = window._adminProducts?.find(p => Number(p.id) === Number(id));
  const prevActive = product?.active;

  if (row) row.dataset.active = nextActive ? '1' : '0';
  if (activeCell) activeCell.textContent = nextActive ? 'Sí' : 'No';
  if (actionBtn) {
    actionBtn.innerHTML = adminActionIcon(nextActive ? 'hide' : 'show');
    actionBtn.setAttribute('aria-label', nextActive ? 'Ocultar producto' : 'Activar producto');
    actionBtn.setAttribute('title', nextActive ? 'Ocultar producto' : 'Activar producto');
    actionBtn.setAttribute('onclick', `adminToggleProduct(${id}, ${nextActive ? 0 : 1})`);
  }
  if (product) product.active = nextActive;

  try {
    await api(`/api/admin/products/${id}/quick`, { method: 'PATCH', body: JSON.stringify({ active: nextActive }) });
    showToast(nextActive ? 'Producto activado' : 'Producto ocultado');
  } catch (e) {
    if (product) product.active = prevActive;
    if (row) row.dataset.active = prevActive ? '1' : '0';
    if (activeCell) activeCell.textContent = prevActive ? 'Sí' : 'No';
    if (actionBtn) {
      actionBtn.textContent = prevActive ? 'Ocultar' : 'Activar';
      actionBtn.setAttribute('onclick', `adminToggleProduct(${id}, ${prevActive ? 0 : 1})`);
    }
    showToast(e.message || 'Error al actualizar producto', 'error');
  }
}
async function adminDeleteProduct(id) { if (!confirm('¿Eliminar producto? Si tiene histórico se desactivará.')) return; const r = await api(`/api/products/${id}`, { method: 'DELETE' }); showToast(r.deactivated ? 'Producto desactivado por tener histórico' : 'Producto eliminado'); switchAdminTab(document.querySelector('.adminTab:nth-child(2)'), 'products'); }

function renderAdminOrdersHTML(orders) {
  return `<div class="tableWrap"><table class="adminTable"><thead><tr><th>#</th><th>Cliente</th><th>Productos</th><th>Total</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>${orders.map(o => `<tr><td>${o.id}</td><td>${escapeHtml(o.customer?.name || '')}<br><small>${escapeHtml(o.customer?.email || '')}</small></td><td>${(o.items || []).map(i => `${escapeHtml(i.product_name)} x${i.quantity}`).join(', ')}</td><td>${Number(o.total).toFixed(2)} €</td><td><select onchange="adminUpdateOrderStatus(${o.id},this.value)">${['pending','paid','shipped','delivered','cancelled'].map(s => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${statusLabel(s)}</option>`).join('')}</select></td><td>${new Date(o.created_at).toLocaleDateString('es-ES')}</td></tr>`).join('')}</tbody></table></div>`;
}
async function adminUpdateOrderStatus(id, status) { await api(`/api/admin/orders/${id}/status?status=${status}`, { method: 'PATCH' }); showToast('Pedido actualizado'); }
function renderCustomersHTML(rows) { return `<div class="tableWrap"><table class="adminTable"><thead><tr><th>Cliente</th><th>Email</th><th>Pedidos</th><th>Gastado</th><th>Carrito</th></tr></thead><tbody>${rows.map(c => `<tr><td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.email)}</td><td>${c.order_count}</td><td>${Number(c.total_spent).toFixed(2)} €</td><td>${Number(c.cart_value).toFixed(2)} €</td></tr>`).join('')}</tbody></table></div>`; }
function renderCartsHTML(rows) { return rows.length ? `<div class="tableWrap"><table class="adminTable"><thead><tr><th>Cliente</th><th>Email</th><th>Valor</th><th>Productos</th></tr></thead><tbody>${rows.map(c => `<tr><td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.email)}</td><td>${Number(c.cart_value).toFixed(2)} €</td><td>${c.items.map(i => `${escapeHtml(i.name)} x${i.quantity}`).join(', ')}</td></tr>`).join('')}</tbody></table></div>` : '<div class="emptyState"><strong>Sin carritos guardados</strong></div>'; }
function renderImportHTML() { return `<div class="importPanel"><div class="importHeader"><div><span class="importKicker">Demo local</span><h3>Respaldo y reinicio de datos</h3><p>Todo el catálogo, clientes, pedidos, carrito y métricas se guardan en este navegador. Puedes exportar una copia, restaurarla o volver al seed inicial.</p></div><div class="importPill">IndexedDB</div></div><div class="importActions"><button class="btn btnSecondary" onclick="exportDemoBackup()">Exportar backup</button><button class="btn btnSecondary" onclick="document.getElementById('demoBackupFile').click()">Restaurar backup</button><button class="btn btnSecondary danger" onclick="resetDemoData()">Reset demo</button></div><label class="importDropzone" for="demoBackupFile"><input id="demoBackupFile" type="file" accept="application/json" onchange="importDemoBackup(this)"><div class="importDropIcon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg></div><strong>Arrastra tu backup JSON o haz clic para examinar</strong><span id="demoBackupName">No se ha seleccionado ningún archivo</span><small>Sirve para guardar o restaurar la demo de este navegador sin depender del servidor.</small></label><div class="importFooter"><div id="importResult"></div></div></div>`; }
function adminExcelPicked(input) { return importDemoBackup(input); }
async function exportDemoBackup() { const json = await DemoStore.exportBackup(); const blob = new Blob([json], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `mode-demo-backup-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url); showToast('Backup exportado'); }
async function importDemoBackup(input) { const f = input.files?.[0]; const nameEl = document.getElementById('demoBackupName'); if (nameEl) nameEl.textContent = f?.name || 'No se ha seleccionado ningún archivo'; if (!f) return; const text = await f.text(); try { const data = await DemoStore.importBackup(text); document.getElementById('importResult').innerHTML = `<p>Backup restaurado. Productos: ${data.products.length}, pedidos: ${data.orders.length}, clientes: ${data.users.filter(u => u.role === 'user').length}</p>`; showToast('Backup restaurado'); state.categories = data.categories || []; state.cart = []; state.token = data.sessionToken || ''; state.chatHistory = data.chatHistory || []; state.user = state.token ? await api('/api/auth/me').catch(() => null) : null; await render(); } catch (e) { document.getElementById('importResult').innerHTML = `<p>${escapeHtml(e.message || 'No se pudo restaurar')}</p>`; showToast(e.message || 'No se pudo restaurar', 'error'); } finally { input.value = ''; }
}
async function resetDemoData() { if (!confirm('¿Reiniciar la demo? Se perderán los datos actuales de este navegador.')) return; const data = await DemoStore.reset(); state.token = ''; state.user = null; state.cart = []; state.chatHistory = []; await DemoStore.clearSessionToken(); await DemoStore.setChatHistory([]); state.categories = data.categories || []; showToast('Demo reiniciada'); await render(); }

function toggleMenu() { document.querySelector('.nav').classList.toggle('open'); }
function cancelChatRequest() {
  state.chatAbortController?.abort();
  state.chatAbortController = null;
  clearInterval(state.chatTypingTimer);
  state.chatTypingTimer = null;
  if (state.chatTypingEl?.classList.contains('typing')) state.chatTypingEl.remove();
  state.chatTypingEl = null;
  if (state.chatStatusEl) state.chatStatusEl.style.display = 'none';
  setChatBusy(false);
}

function setChatBusy(isBusy) {
  state.chatBusy = !!isBusy;
  const input = document.getElementById('chatInput');
  const button = document.getElementById('chatSendBtn');
  const form = document.getElementById('chatForm');
  if (input) input.disabled = state.chatBusy;
  if (button) button.disabled = state.chatBusy;
  if (form) form.setAttribute('aria-busy', state.chatBusy ? 'true' : 'false');
}
function setChatStatus(text = '') {
  const el = document.getElementById('chatStatus');
  state.chatStatusEl = el;
  if (!el) return;
  el.textContent = text;
  el.style.display = text ? 'block' : 'none';
}
function closeAll() { if (state.chatOpen) toggleChat(); }
function toggleChat() {
  const closing = state.chatOpen;
  state.chatOpen = !state.chatOpen;
  if (closing) cancelChatRequest();
  document.getElementById('chatBox').style.display = state.chatOpen ? 'flex' : 'none';
  document.getElementById('overlay').style.display = state.chatOpen ? 'block' : 'none';
}
async function sendChat(e) {
  e.preventDefault();
  if (state.chatBusy) return;
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  await sendChatMessage(msg);
}

async function sendChatMessage(msg) {
  const privateContext = state.user?.role === 'admin';
  const context = await DemoStore?.getAiContext?.(msg, { privateContext }) || '';
  return sendChatMessageWithContext(msg, context, { showUserMessage: true, loadingText: 'Pensando...', mode: privateContext ? 'admin' : 'public' });
}

async function sendChatMessageWithContext(msg, context, options = {}) {
  const { showUserMessage = true, loadingText = 'Pensando...', displayMessage = msg, mode = 'public' } = options;
  const box = document.getElementById('chatMessages');
  cancelChatRequest();
  setChatBusy(true);
  const controller = new AbortController();
  state.chatAbortController = controller;
  try {
    if (showUserMessage) {
      box.innerHTML += `<div class="chatMsg user">${escapeHtml(displayMessage)}</div><div class="chatMsg bot typing">Pensando...</div>`;
      state.chatTypingEl = box.querySelector('.chatMsg.bot.typing');
    } else {
      setChatStatus(loadingText);
      box.innerHTML += `<div class="chatMsg bot typing"></div>`;
      state.chatTypingEl = box.querySelector('.chatMsg.bot.typing');
    }
    const response = await streamAiChatResponse(msg, context, mode, chunk => {
      const typingEl = state.chatTypingEl;
      if (!typingEl) return;
      typingEl.classList.remove('typing');
      appendMarkdownChunk(typingEl, chunk);
      typingEl.closest('.chatMessages')?.scrollTo({ top: typingEl.closest('.chatMessages').scrollHeight, behavior: 'smooth' });
    }, controller.signal);
    if (controller.signal.aborted) return;
    if (showUserMessage) {
      const typingEl = state.chatTypingEl;
      if (typingEl) {
        typingEl.classList.remove('typing');
        typingEl.innerHTML = markdownToHtml(response);
        box.scrollTop = box.scrollHeight;
        await pushChatHistory('user', msg);
        await pushChatHistory('assistant', response);
        state.chatTypingEl = null;
      }
    } else {
      setChatStatus('');
      const typingEl = state.chatTypingEl;
      if (typingEl) {
        typingEl.classList.remove('typing');
        typingEl.innerHTML = markdownToHtml(response);
        box.scrollTop = box.scrollHeight;
        await pushChatHistory('user', msg);
        await pushChatHistory('assistant', response);
        state.chatTypingEl = null;
      }
    }
  } catch (err) {
    if (err?.name === 'AbortError') return;
    setChatStatus('');
    state.chatTypingEl?.remove();
    state.chatTypingEl = null;
    box.innerHTML += `<div class="chatMsg bot">${escapeHtml(err?.message || 'Ahora mismo no puedo responder. Prueba de nuevo.')}</div>`;
    box.scrollTop = box.scrollHeight;
  } finally {
    if (state.chatAbortController === controller) state.chatAbortController = null;
    if (state.chatTypingEl && !state.chatTypingEl.isConnected) state.chatTypingEl = null;
    setChatStatus('');
    setChatBusy(false);
  }
}

async function streamAiChatResponse(msg, context, mode, onDelta, signal) {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: msg, context, mode }),
    signal,
  });
  if (!res.ok) {
    const err = await res.json().catch(async () => ({ detail: await res.text().catch(() => 'Error inesperado') }));
    throw new Error(err.detail || err.error || 'Error inesperado');
  }
  if (!res.body) throw new Error('No se pudo iniciar el streaming de IA.');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let raw = '';
  let pendingRender = false;
  let renderTimer = 0;
  let pendingChunk = '';
  const flushRender = () => {
    pendingRender = false;
    renderTimer = 0;
    if (pendingChunk) {
      onDelta?.(pendingChunk, raw);
      pendingChunk = '';
    }
  };
  const scheduleRender = () => {
    if (pendingRender) return;
    pendingRender = true;
    renderTimer = window.setTimeout(flushRender, 80);
  };
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let splitIndex;
    while ((splitIndex = buffer.indexOf('\n\n')) >= 0) {
      const frame = buffer.slice(0, splitIndex);
      buffer = buffer.slice(splitIndex + 2);
      for (const line of frame.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trimStart();
        if (payload === '[DONE]') return raw;
        let parsed;
        try {
          parsed = JSON.parse(payload);
        } catch {
          continue;
        }
        if (parsed?.error) throw new Error(parsed.error);
        const piece = parsed?.choices?.[0]?.delta?.content || parsed?.delta?.content || parsed?.content || '';
        if (piece === '</s>' || !piece) continue;
        raw += piece;
        pendingChunk += piece;
        scheduleRender();
      }
    }
  }
  if (renderTimer) clearTimeout(renderTimer);
  if (pendingChunk) onDelta?.(pendingChunk, raw);
  return raw;
}

function revealChatResponse(el, text, signal) {
  return new Promise(resolve => {
    const tokens = String(text || '').match(/\s+|\S+/g) || [];
    if (!tokens.length) {
      el.textContent = '';
      state.chatTypingEl = null;
      resolve();
      return;
    }
    el.textContent = '';
    el.dataset.raw = '';
    let raw = '';
    let i = 0;
    const tick = () => {
      if (signal?.aborted) {
        clearInterval(state.chatTypingTimer);
        state.chatTypingTimer = null;
        state.chatTypingEl = null;
        resolve();
        return;
      }
      raw += tokens[i];
      appendMarkdownChunk(el, tokens[i]);
      el.closest('.chatMessages')?.scrollTo({ top: el.closest('.chatMessages').scrollHeight, behavior: 'smooth' });
      i += 1;
      if (i >= tokens.length) {
        clearInterval(state.chatTypingTimer);
        state.chatTypingTimer = null;
        state.chatTypingEl = null;
        resolve();
      }
  };
    tick();
    state.chatTypingTimer = setInterval(tick, 35);
  });
}

async function openAdminAiAnalysis() {
  if (!state.user || state.user.role !== 'admin') return navigate('/login');
  if (!state.chatOpen) toggleChat();
  const box = document.getElementById('chatMessages');
  if (box) box.innerHTML = '';
  document.getElementById('chatInput').value = '';
  cancelChatRequest();
  state.chatTypingEl?.remove();
  state.chatTypingEl = null;
  try {
    const hasChanges = await DemoStore?.hasUserChanges?.();
    if (!hasChanges) {
      setChatBusy(true);
      setChatStatus('');
      const presets = [
        `Análisis ejecutivo de MODE:

- La tienda mantiene una base sana de clientes y actividad, con margen claro para seguir creciendo en recurrencia.
- Los ingresos actuales apuntan a que los productos estrella están concentrando la demanda.
- Los carritos activos muestran intención de compra real y son la mejor oportunidad de conversión inmediata.
- El stock está razonable en general, pero conviene vigilar los artículos con menor disponibilidad.

Oportunidades de mejora:

1. Potenciar los productos más vendidos con campañas y destacarlos en portada.
2. Recuperar carritos con mensajes o incentivos suaves.
3. Revisar stock y reposición de los artículos con más rotación.`,
        `Resumen rápido de la tienda MODE:

- Hay una buena actividad de clientes y ventas en curso, con señales de interés sostenido.
- Los productos más comprados y los más guardados en carrito marcan claramente qué categorías están tirando del negocio.
- El stock sigue siendo un punto a vigilar para no perder ventas por rotura.

Mejoras recomendadas:

1. Empujar los best sellers con más visibilidad.
2. Trabajar la conversión de carritos pendientes.
3. Ajustar inventario en función de la demanda real.`,
        `Diagnóstico ejecutivo MODE:

- La tienda muestra tracción, pero todavía hay recorrido para subir conversión y ticket medio.
- Los carritos guardados indican intención de compra que aún no se ha cerrado.
- El catálogo activo permite hacer más segmentación por producto y campaña.

Acciones sugeridas:

1. Promocionar lo que ya funciona.
2. Automatizar recordatorios para carritos.
3. Priorizar reposición de productos con más salida.`,
      ];
      const response = presets[Math.floor(Math.random() * presets.length)];
      if (box) box.innerHTML += `<div class="chatMsg user">Analisis con IA</div><div class="chatMsg bot typing"></div>`;
      state.chatTypingEl = box?.querySelector('.chatMsg.bot.typing') || null;
      if (state.chatTypingEl) {
        state.chatTypingEl.classList.remove('typing');
        await revealChatResponse(state.chatTypingEl, response, null);
        box?.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
        state.chatTypingEl = null;
      }
      await pushChatHistory('user', 'Analisis con IA');
      await pushChatHistory('assistant', response);
      return;
    }
    const context = await DemoStore?.getAiContext?.('', { privateContext: true }) || '';
    await sendChatMessageWithContext(
      'Haz un análisis ejecutivo de la tienda MODE con foco en clientes, ingresos, productos más vendidos, carritos y stock. Incluye 2 o 3 oportunidades de mejora claras.',
      context,
      { showUserMessage: true, loadingText: 'Analizando la tienda...', displayMessage: 'Analisis con IA', mode: 'admin' },
    );
  } finally {
    setChatBusy(false);
  }
}
async function logout() { cancelChatRequest(); await DemoStore?.clearSessionToken?.(); await DemoStore?.setChatHistory?.([]); state.token = ''; state.user = null; state.cart = []; state.chatHistory = []; navigate('/'); return false; }

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
  if (e.key === 'Escape') {
    closeStatsModal();
    return;
  }
  if (e.key !== 'Enter' || e.target?.id !== 'catalogSearch') return;
  e.preventDefault();
  updateCatalogResults();
});
document.addEventListener('DOMContentLoaded', async () => {
  if (window.DemoStore) {
    await DemoStore.init();
    state.token = DemoStore.getSessionToken?.() || '';
    state.chatHistory = DemoStore.getChatHistory?.() || [];
  }
  await loadUser();
  await render();
});
window.addEventListener('pagehide', cancelChatRequest);
