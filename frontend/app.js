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

function markdownInline(text) {
  const safeLinks = [];
  let out = escapeHtml(String(text || ''));
  out = out.replace(/```([^`]+)```/g, (_, code) => `<code>${code}</code>`);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g, (_, label, href) => {
    const id = safeLinks.push({ label, href }) - 1;
    return `__LINK_${id}__`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  out = out.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
  out = out.replace(/(?<!_)_([^_\n]+)_(?!_)/g, '<em>$1</em>');
  out = out.replace(/__LINK_(\d+)__/g, (_, n) => {
    const link = safeLinks[Number(n)];
    return link ? `<a href="${escapeHtml(link.href)}" target="_blank" rel="noopener">${escapeHtml(link.label)}</a>` : '';
  });
  return out;
}

function markdownToHtml(md) {
  const lines = String(md || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;

  const pushParagraph = (buffer) => {
    const text = buffer.map(line => line.trim()).filter(Boolean).join(' ');
    if (text) blocks.push(`<p>${markdownInline(text)}</p>`);
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith('```')) {
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      blocks.push(`<h${level}>${markdownInline(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^\|/.test(trimmed) && i + 1 < lines.length && /^\|?\s*:?[-]{3,}:?/.test(lines[i + 1].trim())) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i].trim())) {
        rows.push(lines[i].trim());
        i += 1;
      }
      const headCells = rows[0].split('|').map(c => c.trim()).filter(Boolean);
      const bodyRows = rows.slice(2).map(row => row.split('|').map(c => c.trim()).filter(Boolean));
      blocks.push(`<table><thead><tr>${headCells.map(cell => `<th>${markdownInline(cell)}</th>`).join('')}</tr></thead><tbody>${bodyRows.map(row => `<tr>${row.map(cell => `<td>${markdownInline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
      continue;
    }

    if (/^[-*+]\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*+]\s+/, ''));
        i += 1;
      }
      blocks.push(`<ul>${items.map(item => `<li>${markdownInline(item)}</li>`).join('')}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i += 1;
      }
      blocks.push(`<ol>${items.map(item => `<li>${markdownInline(item)}</li>`).join('')}</ol>`);
      continue;
    }

    const paragraph = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6})\s+/.test(lines[i].trim()) && !/^```/.test(lines[i].trim()) && !/^\|/.test(lines[i].trim()) && !/^[-*+]\s+/.test(lines[i].trim()) && !/^\d+\.\s+/.test(lines[i].trim())) {
      paragraph.push(lines[i]);
      i += 1;
    }
    pushParagraph(paragraph);
  }

  return blocks.join('') || `<p>${escapeHtml(String(md || ''))}</p>`;
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
  const color = parseList(p.colors)[0] || '';
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
function adminProductsTable(products) {
  window._adminProducts = products;
   return `<div class="tableWrap"><table class="adminTable"><thead><tr><th>ID</th><th>Imagen</th><th>Producto</th><th>Marca</th><th>Precio</th><th>Stock</th><th>Activo</th><th>Acciones</th></tr></thead><tbody>${products.map(p => `<tr data-product-id="${p.id}" data-active="${p.active ? 1 : 0}" data-text="${escapeHtml(`${p.name} ${p.brand}`.toLowerCase())}"><td>${p.id}</td><td><img class="adminThumb" src="${escapeHtml(p.image || '')}" alt=""></td><td><strong>${escapeHtml(p.name)}</strong><br><small>${escapeHtml(p.category_name || '')}</small></td><td>${escapeHtml(p.brand)}</td><td>${Number(p.price).toFixed(2)} €</td><td>${p.stock}</td><td>${p.active ? 'Sí' : 'No'}</td><td><button class="btnTiny" onclick="adminEditProduct(${p.id})">Editar</button><button class="btnTiny" onclick="adminToggleProduct(${p.id}, ${p.active ? 0 : 1})">${p.active ? 'Ocultar' : 'Activar'}</button><button class="btnTiny danger" onclick="adminDeleteProduct(${p.id})">Eliminar</button></td></tr>`).join('')}</tbody></table></div>`;
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
    <div class="formGroup"><label>Nombre *</label><input id="pf-name" value="${escapeHtml(product?.name || '')}" oninput="adminUpdateAiHint()"></div>
    <div class="formGroup"><label>Marca</label><input id="pf-brand" value="${escapeHtml(product?.brand || '')}" oninput="adminUpdateAiHint()"></div>
    <div class="formGroup"><label>Precio *</label><input id="pf-price" type="number" step="0.01" value="${product?.price || ''}"></div>
    <div class="formGroup"><label>Precio anterior</label><input id="pf-compare" type="number" step="0.01" value="${product?.compare_price || ''}"></div>
    <div class="formGroup"><label>Stock</label><input id="pf-stock" type="number" value="${product?.stock ?? 0}"></div>
    <div class="formGroup"><label>Categoría</label><select id="pf-category" onchange="adminUpdateAiHint()">${state.categories.map(c => `<option value="${c.id}" ${product?.category_id === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}</select></div>
  </div>
  <div class="formGroup"><label>Descripción</label><textarea id="pf-desc">${escapeHtml(product?.description || '')}</textarea></div>
  <div class="adminAiActions"><button class="btn btnSecondary" type="button" onclick="adminGenerateProductAi(${product?.id || 0})">Crear con IA</button><small id="pf-ai-hint">Rellena primero nombre, marca y categoría.</small></div>
  <div class="formGroup"><label>Características</label><textarea id="pf-characteristics" placeholder="Marca:...\nCategoría:...\nGénero:...\nTags:...">${escapeHtml(product?.characteristics || '')}</textarea></div>
  <div class="formGroup"><label>Composición y cuidados</label><textarea id="pf-composition" placeholder="Tejido...\nCuidado...">${escapeHtml(product?.composition_care || '')}</textarea></div>
  <div class="formGroup"><label>Imagen local del producto</label><div class="imageUploadBox">${product?.image ? `<img id="pf-image-preview" src="${escapeHtml(product.image)}" alt="Preview">` : '<img id="pf-image-preview" style="display:none" alt="Preview">'}<div><input id="pf-image-file" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" onchange="adminPreviewImage(this)"><small>JPG, PNG, WebP, AVIF o GIF. Se guarda en local.</small><div id="pf-image-status"></div></div></div><input type="hidden" id="pf-image" value="${escapeHtml(product?.image || '')}"></div>
  <div class="adminFormGrid"><div class="formGroup"><label>Tallas</label><input id="pf-sizes" value="${escapeHtml(sizes)}"></div><div class="formGroup"><label>Colores</label><input id="pf-colors" value="${escapeHtml(colors)}"></div><div class="formGroup"><label>Tags</label><input id="pf-tags" value="${escapeHtml(tags)}"></div><div class="formGroup"><label>Género</label><select id="pf-gender">${['unisex','hombre','mujer'].map(g => `<option ${product?.gender === g ? 'selected' : ''}>${g}</option>`).join('')}</select></div></div>
  <div class="checkRow"><label><input id="pf-active" type="checkbox" ${!product || product.active ? 'checked' : ''}> Activo</label><label><input id="pf-featured" type="checkbox" ${product?.featured ? 'checked' : ''}> Destacado</label><label><input id="pf-sale" type="checkbox" ${product?.on_sale ? 'checked' : ''}> Oferta</label></div>
  <div class="modalActions"><button class="btn btnSecondary" onclick="adminCloseProductModal()">Cancelar</button><button class="btn btnPrimary" onclick="adminSaveProduct(${product?.id || 0})">${product ? 'Guardar cambios' : 'Crear producto'}</button></div>`;
  adminUpdateAiHint();
}
function adminCloseProductModal() { document.getElementById('adminProductModal').style.display = 'none'; }
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
  const actionBtn = row?.querySelectorAll('button.btnTiny')?.[1];
  const product = window._adminProducts?.find(p => Number(p.id) === Number(id));
  const prevActive = product?.active;

  if (row) row.dataset.active = nextActive ? '1' : '0';
  if (activeCell) activeCell.textContent = nextActive ? 'Sí' : 'No';
  if (actionBtn) {
    actionBtn.textContent = nextActive ? 'Ocultar' : 'Activar';
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
  state.chatTypingEl?.remove();
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
  const context = await DemoStore?.getAiContext?.(msg, { privateContext: state.user?.role === 'admin' }) || '';
  return sendChatMessageWithContext(msg, context, { showUserMessage: true, loadingText: 'Pensando...' });
}

async function sendChatMessageWithContext(msg, context, options = {}) {
  const { showUserMessage = true, loadingText = 'Pensando...', displayMessage = msg } = options;
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
    }
    const data = await api('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message: msg, context }),
      signal: controller.signal,
    });
    if (controller.signal.aborted) return;
    const response = data.response || '';
    const isStructuredResponse = data.model === 'local-table' || /^\|.+\|$/m.test(response) || response.includes('\n|---|');
    if (showUserMessage) {
      const typingEl = state.chatTypingEl;
      if (typingEl) {
        typingEl.classList.remove('typing');
        if (isStructuredResponse) {
          typingEl.innerHTML = markdownToHtml(response);
          typingEl.closest('.chatMessages')?.scrollTo({ top: typingEl.closest('.chatMessages').scrollHeight, behavior: 'smooth' });
        } else {
          await revealChatResponse(typingEl, response, controller.signal);
        }
        box.scrollTop = box.scrollHeight;
        await pushChatHistory('user', msg);
        await pushChatHistory('assistant', response);
      }
    } else {
      setChatStatus('');
      box.innerHTML += `<div class="chatMsg bot typing"></div>`;
      state.chatTypingEl = box.querySelector('.chatMsg.bot.typing');
      const typingEl = state.chatTypingEl;
      if (typingEl) {
        typingEl.classList.remove('typing');
        if (isStructuredResponse) {
          typingEl.innerHTML = markdownToHtml(response);
        } else {
          await revealChatResponse(typingEl, response, controller.signal);
        }
        box.scrollTop = box.scrollHeight;
        await pushChatHistory('user', msg);
        await pushChatHistory('assistant', response);
      }
    }
  } catch (err) {
    if (err?.name === 'AbortError') return;
    setChatStatus('');
    state.chatTypingEl?.remove();
    state.chatTypingEl = null;
    box.innerHTML += `<div class="chatMsg bot">Ahora mismo no puedo responder. Prueba de nuevo.</div>`;
    box.scrollTop = box.scrollHeight;
  } finally {
    if (state.chatAbortController === controller) state.chatAbortController = null;
    if (state.chatTypingEl && !state.chatTypingEl.isConnected) state.chatTypingEl = null;
    setChatStatus('');
    setChatBusy(false);
  }
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
      el.innerHTML = markdownToHtml(raw);
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
      }
      await pushChatHistory('user', 'Analisis con IA');
      await pushChatHistory('assistant', response);
      return;
    }
    const context = await DemoStore?.getAiContext?.('', { privateContext: true }) || '';
    await sendChatMessageWithContext(
      'Haz un análisis ejecutivo de la tienda MODE con foco en clientes, ingresos, productos más vendidos, carritos y stock. Incluye 2 o 3 oportunidades de mejora claras.',
      context,
      { showUserMessage: true, loadingText: 'Analizando la tienda...', displayMessage: 'Analisis con IA' },
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
