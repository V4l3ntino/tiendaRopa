(() => {
  const DB_NAME = 'mode-demo-browser-db';
  const DB_VERSION = 1;
  const STORE = 'kv';
  const STATE_KEY = 'app-state';
  const SEED_VERSION = 1;

  const CATEGORIES = [
    { name: 'Chaquetas', image: '/assets/uploads/site/chaquetas.jpg' },
    { name: 'Zapatos', image: '/assets/uploads/site/zapatos.jpg' },
    { name: 'Pantalones', image: '/assets/uploads/site/pantalones.jpg' },
    { name: 'Camisetas', image: '/assets/uploads/site/camisetas.jpg' },
    { name: 'Accesorios', image: '/assets/uploads/site/accesorios.jpg' },
    { name: 'Vestidos', image: '/assets/uploads/site/vestidos.jpg' },
    { name: 'Sudaderas', image: '/assets/uploads/site/sudaderas.jpg' },
  ];

  const PRODUCT_DEFS = [
    { name: 'Chaqueta Aviator Premium', brand: 'Zara', category: 'Chaquetas', price: 89.95, compare_price: 129, image: '/assets/uploads/products/chaqueta-aviator-premium.jpg', sizes: ['S', 'M', 'L', 'XL'], colors: ['Negro', 'Marrón', 'Verde'], tags: ['nuevo', 'popular'], gender: 'hombre', stock: 25, featured: true, rating: 4.8 },
    { name: 'Chaqueta de Cuero Clásica', brand: 'Mango', category: 'Chaquetas', price: 149, compare_price: 199, image: '/assets/uploads/products/chaqueta-cuero-clasica.jpg', sizes: ['M', 'L', 'XL'], colors: ['Negro', 'Marrón'], tags: ['popular', 'recomendado'], gender: 'hombre', stock: 15, rating: 4.9 },
    { name: 'Parka Invernal Algodón', brand: 'H&M', category: 'Chaquetas', price: 69.99, compare_price: null, image: '/assets/uploads/products/parka-invernal.jpg', sizes: ['S', 'M', 'L', 'XL', 'XXL'], colors: ['Negro', 'Gris', 'Azul'], tags: ['oferta'], gender: 'unisex', stock: 40, on_sale: true, rating: 4.4 },
    { name: 'Zapatillas Urbanas White', brand: 'Adidas', category: 'Zapatos', price: 79.95, compare_price: 99.95, image: '/assets/uploads/products/zapatillas-urbanas-white.jpg', sizes: ['39', '40', '41', '42', '43', '44'], colors: ['Blanco', 'Negro'], tags: ['popular', 'nuevo'], gender: 'unisex', stock: 60, featured: true, rating: 4.7 },
    { name: 'Botas Trekking impermeables', brand: 'Columbia', category: 'Zapatos', price: 129, compare_price: 159, image: '/assets/uploads/products/botas-trekking.jpg', sizes: ['39', '40', '41', '42', '43'], colors: ['Gris', 'Verde', 'Negro'], tags: ['recomendado'], gender: 'unisex', stock: 20, rating: 4.6 },
    { name: 'Sneakers Retro Multicolor', brand: 'Nike', category: 'Zapatos', price: 99, compare_price: null, image: '/assets/uploads/products/sneakers-retro.jpg', sizes: ['38', '39', '40', '41', '42', '43', '44'], colors: ['Blanco/Rojo', 'Negro/Dorado', 'Azul'], tags: ['nuevo'], gender: 'unisex', stock: 35, rating: 4.5 },
    { name: 'Pantalón Chino Slim Fit', brand: 'Zara', category: 'Pantalones', price: 39.95, compare_price: 49.95, image: '/assets/uploads/products/pantalon-chino.jpg', sizes: ['30', '32', '34', '36', '38'], colors: ['Beige', 'Azul marino', 'Gris', 'Negro'], tags: ['popular'], gender: 'hombre', stock: 50, rating: 4.6 },
    { name: 'Jeans Skinny Mujer', brand: "Levi's", category: 'Pantalones', price: 49.95, compare_price: 59.95, image: '/assets/uploads/products/jeans-skinny.jpg', sizes: ['XS', 'S', 'M', 'L', 'XL'], colors: ['Azul claro', 'Azul oscuro', 'Negro'], tags: ['popular', 'recomendado'], gender: 'mujer', stock: 45, rating: 4.7 },
    { name: 'Pantalón Cargo Holgado', brand: 'H&M', category: 'Pantalones', price: 34.99, compare_price: null, image: '/assets/uploads/products/pantalon-cargo.jpg', sizes: ['S', 'M', 'L', 'XL', 'XXL'], colors: ['Verde oliva', 'Negro', 'Gris'], tags: ['nuevo', 'oferta'], gender: 'hombre', stock: 30, on_sale: true, rating: 4.4 },
    { name: 'Camiseta Algodón Premium', brand: 'H&M', category: 'Camisetas', price: 19.95, compare_price: 24.95, image: '/assets/uploads/products/camiseta-algodon.jpg', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], colors: ['Blanco', 'Negro', 'Gris', 'Azul', 'Rojo'], tags: ['popular', 'recomendado'], gender: 'unisex', stock: 100, rating: 4.6 },
    { name: 'Camiseta Estampada Vintage', brand: 'Mango', category: 'Camisetas', price: 24.99, compare_price: 29.99, image: '/assets/uploads/products/camiseta-vintage.jpg', sizes: ['S', 'M', 'L', 'XL'], colors: ['Negro', 'Blanco', 'Verde'], tags: ['nuevo'], gender: 'unisex', stock: 55, rating: 4.5 },
    { name: 'Polo Clásico Lisa', brand: 'Nike', category: 'Camisetas', price: 34.95, compare_price: 44.95, image: '/assets/uploads/products/polo-clasico.jpg', sizes: ['S', 'M', 'L', 'XL', 'XXL'], colors: ['Blanco', 'Negro', 'Azul marino', 'Rojo'], tags: ['popular'], gender: 'hombre', stock: 70, rating: 4.6 },
    { name: 'Mochila Urbana 25L', brand: 'Nike', category: 'Accesorios', price: 44.95, compare_price: 54.95, image: '/assets/uploads/products/mochila-urbana.jpg', sizes: ['Única'], colors: ['Negro', 'Gris', 'Azul'], tags: ['popular', 'recomendado'], gender: 'unisex', stock: 40, rating: 4.7 },
    { name: 'Gorra Trucker Premium', brand: 'Adidas', category: 'Accesorios', price: 24.99, compare_price: 29.99, image: '/assets/uploads/products/gorra-trucker.jpg', sizes: ['Única'], colors: ['Negro', 'Blanco', 'Rojo', 'Azul'], tags: ['nuevo', 'popular'], gender: 'unisex', stock: 80, rating: 4.5 },
    { name: 'Bufanda de Lana Merino', brand: 'Mango', category: 'Accesorios', price: 29.95, compare_price: 39.95, image: '/assets/uploads/products/bufanda-lana.jpg', sizes: ['Única'], colors: ['Gris', 'Negro', 'Burdeos', 'Verde'], tags: ['oferta'], gender: 'unisex', stock: 35, on_sale: true, rating: 4.4 },
    { name: 'Cinturón Piel Vegana', brand: 'Zara', category: 'Accesorios', price: 19.99, compare_price: null, image: '/assets/uploads/products/cinturon-piel.jpg', sizes: ['80', '85', '90', '95', '100', '105'], colors: ['Negro', 'Marrón'], tags: ['recomendado'], gender: 'hombre', stock: 60, rating: 4.5 },
    { name: 'Vestido Floral Midaxi', brand: 'Mango', category: 'Vestidos', price: 44.95, compare_price: 54.95, image: '/assets/uploads/products/vestido-floral.jpg', sizes: ['XS', 'S', 'M', 'L', 'XL'], colors: ['Azul', 'Rojo', 'Negro'], tags: ['nuevo', 'popular'], gender: 'mujer', stock: 30, rating: 4.8 },
    { name: 'Sudadera Oversize Capucha', brand: 'H&M', category: 'Sudaderas', price: 39.95, compare_price: 49.95, image: '/assets/uploads/products/sudadera-oversize.jpg', sizes: ['S', 'M', 'L', 'XL', 'XXL'], colors: ['Gris', 'Negro', 'Verde', 'Rosa'], tags: ['popular', 'recomendado'], gender: 'unisex', stock: 45, rating: 4.7 },
    { name: 'Jersey Cuello Redondo', brand: 'Zara', category: 'Sudaderas', price: 34.99, compare_price: null, image: '/assets/uploads/products/jersey-cuello-redondo.jpg', sizes: ['S', 'M', 'L', 'XL'], colors: ['Gris', 'Negro', 'Azul marino', 'Beige'], tags: ['oferta'], gender: 'unisex', stock: 50, on_sale: true, rating: 4.4 },
    { name: 'Chaqueta Denim Clásica', brand: "Levi's", category: 'Chaquetas', price: 69.95, compare_price: 85, image: '/assets/uploads/products/chaqueta-denim.jpg', sizes: ['S', 'M', 'L', 'XL', 'XXL'], colors: ['Azul claro', 'Azul oscuro', 'Negro'], tags: ['popular'], gender: 'unisex', stock: 25, rating: 4.8 },
  ];

  const USER_DEFS = [
    { name: 'Admin', email: 'admin@mode.com', phone: '', role: 'admin', password: 'admin123' },
    { name: 'Ana Torres', email: 'ana@example.com', phone: '600111222', role: 'user', password: 'demo123' },
    { name: 'Bruno Pérez', email: 'bruno@example.com', phone: '600222333', role: 'user', password: 'demo123' },
    { name: 'Carla Gómez', email: 'carla@example.com', phone: '600333444', role: 'user', password: 'demo123' },
    { name: 'Diego Martín', email: 'diego@example.com', phone: '600444555', role: 'user', password: 'demo123' },
    { name: 'Sofía Gómez', email: 'sofia@example.com', phone: '600555666', role: 'user', password: 'demo123' },
  ];

  const ORDER_DEFS = [
    { email: 'ana@example.com', status: 'delivered', items: [{ name: 'Chaqueta Aviator Premium', quantity: 1 }, { name: 'Polo Clásico Lisa', quantity: 2 }], daysAgo: 18, city: 'Madrid', totalHint: 0 },
    { email: 'bruno@example.com', status: 'paid', items: [{ name: 'Mochila Urbana 25L', quantity: 1 }, { name: 'Gorra Trucker Premium', quantity: 2 }], daysAgo: 10, city: 'Valencia', totalHint: 0 },
    { email: 'carla@example.com', status: 'shipped', items: [{ name: 'Vestido Floral Midaxi', quantity: 1 }, { name: 'Bufanda de Lana Merino', quantity: 1 }], daysAgo: 6, city: 'Sevilla', totalHint: 0 },
    { email: 'diego@example.com', status: 'cancelled', items: [{ name: 'Pantalón Chino Slim Fit', quantity: 1 }], daysAgo: 3, city: 'Bilbao', totalHint: 0 },
    { email: 'ana@example.com', status: 'pending', items: [{ name: 'Chaqueta Denim Clásica', quantity: 1 }], daysAgo: 1, city: 'Madrid', totalHint: 0 },
    { email: 'sofia@example.com', status: 'delivered', items: [{ name: 'Chaqueta de Cuero Clásica', quantity: 1 }, { name: 'Camiseta Algodón Premium', quantity: 2 }], daysAgo: 14, city: 'Barcelona', totalHint: 0 },
    { email: 'sofia@example.com', status: 'paid', items: [{ name: 'Mochila Urbana 25L', quantity: 1 }], daysAgo: 8, city: 'Barcelona', totalHint: 0 },
    { email: 'sofia@example.com', status: 'pending', items: [{ name: 'Zapatillas Urbanas White', quantity: 1 }, { name: 'Cinturón Piel Vegana', quantity: 1 }], daysAgo: 2, city: 'Barcelona', totalHint: 0 },
  ];

  const CART_DEFS = [
    { email: 'bruno@example.com', items: [{ name: 'Pantalón Cargo Holgado', quantity: 1 }, { name: 'Sneakers Retro Multicolor', quantity: 1 }] },
    { email: 'carla@example.com', items: [{ name: 'Chaqueta de Cuero Clásica', quantity: 1 }, { name: 'Cinturón Piel Vegana', quantity: 1 }] },
    { email: 'sofia@example.com', items: [{ name: 'Botas Trekking impermeables', quantity: 1 }] },
  ];

  const REVIEW_DEFS = [
    { email: 'ana@example.com', product: 'Chaqueta Aviator Premium', rating: 5, comment: 'Muy cómoda y queda genial.' },
    { email: 'bruno@example.com', product: 'Mochila Urbana 25L', rating: 4, comment: 'Buena capacidad y muy ligera.' },
    { email: 'carla@example.com', product: 'Vestido Floral Midaxi', rating: 5, comment: 'Perfecto para eventos.' },
    { email: 'sofia@example.com', product: 'Chaqueta de Cuero Clásica', rating: 5, comment: 'Acabado excelente y muy buena calidad.' },
  ];

  const SIZE_TEMPLATE_DEFS = [
    { name: 'Ropa estándar', items: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
    { name: 'Calzado EU', items: ['38', '39', '40', '41', '42', '43', '44'] },
    { name: 'Accesorio único', items: ['Única'] },
  ];

  const COLOR_TEMPLATE_DEFS = [
    { name: 'Básicos', items: [{ name: 'Negro', hex: '#171717' }, { name: 'Blanco', hex: '#f5f5f5' }, { name: 'Gris', hex: '#77777d' }] },
    { name: 'Primarios', items: [{ name: 'Rojo', hex: '#b12b2f' }, { name: 'Azul', hex: '#1a56db' }, { name: 'Verde', hex: '#1d7f55' }] },
    { name: 'Tierra', items: [{ name: 'Marrón', hex: '#8B6914' }, { name: 'Beige', hex: '#e8dcc8' }, { name: 'Caqui', hex: '#C3B091' }] },
  ];

  function clone(value) {
    return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  }

  function listValue(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : String(value).split(',').map(s => s.trim()).filter(Boolean);
      } catch {
        return String(value).split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    return [];
  }

  function colorLabel(value) {
    if (value && typeof value === 'object') return String(value.name || '').trim();
    return String(value || '').trim();
  }

  function slugify(text) {
    return String(text || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function nowIso(daysAgo = 0) {
    return new Date(Date.now() - daysAgo * 86400000).toISOString();
  }

  function buildProduct(def, id, categoryMap) {
    const category = categoryMap.get(def.category) || CATEGORIES[0];
    const sizes = listValue(def.sizes);
    const colors = listValue(def.colors);
    const tags = listValue(def.tags);
    return {
      id,
      name: def.name,
      brand: def.brand,
      category_id: category.id,
      category_name: category.name,
      category_slug: category.slug,
      description: def.description || `${def.name} de ${def.brand}, pensada para el día a día con estilo y comodidad.`,
      characteristics: `Marca: ${def.brand}\nCategoría: ${category.name}\nGénero: ${def.gender}\nPrecio: ${Number(def.price).toFixed(2)} €`,
      composition_care: 'Tejido de alta calidad. Consulta la etiqueta para instrucciones de lavado y cuidado.',
      price: def.price,
      compare_price: def.compare_price,
      image: def.image,
      images: '[]',
      sizes: JSON.stringify(sizes),
      colors: JSON.stringify(colors),
      tags: JSON.stringify(tags),
      gender: def.gender || 'unisex',
      stock: def.stock ?? 0,
      active: def.active !== false,
      featured: !!def.featured,
      on_sale: !!def.on_sale,
      rating: def.rating ?? 4.5,
      created_at: nowIso(30 - id),
    };
  }

  function findUser(users, email) {
    return users.find(u => u.email === email);
  }

  function productByName(products, name) {
    return products.find(p => p.name === name);
  }

  function inferCatalogCategory(query) {
    const q = String(query || '').toLowerCase();
    const aliases = [
      ['chaqueta', ['chaqueta', 'chaquetas', 'abrigo', 'abrigos', 'cazadora', 'cazadoras']],
      ['zapatos', ['zapato', 'zapatos', 'zapatilla', 'zapatillas', 'bota', 'botas', 'sneaker', 'sneakers']],
      ['pantalones', ['pantalon', 'pantalones', 'jeans', 'cargo', 'chino', 'chinos']],
      ['camisetas', ['camiseta', 'camisetas', 'polo', 'polos']],
      ['accesorios', ['accesorio', 'accesorios', 'gorra', 'gorras', 'mochila', 'mochilas', 'bufanda', 'bufandas', 'cinturon', 'cinturones']],
      ['vestidos', ['vestido', 'vestidos']],
      ['sudaderas', ['sudadera', 'sudaderas', 'jersey', 'jerséis', 'jerseys']],
    ];
    for (const [category, words] of aliases) {
      if (words.some(word => q.includes(word))) return category;
    }
    return '';
  }

  function buildSeedState() {
    const categories = CATEGORIES.map((c, idx) => ({ id: idx + 1, name: c.name, slug: slugify(c.name), image: c.image }));
    const categoryMap = new Map(categories.map(c => [c.name, c]));
    const products = PRODUCT_DEFS.map((def, idx) => buildProduct(def, idx + 1, categoryMap));
    const users = USER_DEFS.map((u, idx) => ({
      id: idx + 1,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      password: u.password,
      token: '',
      created_at: nowIso(60 - idx),
    }));

    let nextOrderId = 1;
    let nextOrderItemId = 1;
    let nextCartId = 1;
    let nextReviewId = 1;
    const orders = [];
    const order_items = [];

    ORDER_DEFS.forEach((orderDef, idx) => {
      const user = findUser(users, orderDef.email);
      const items = orderDef.items.map(item => {
        const product = productByName(products, item.name);
        return { product, quantity: item.quantity };
      }).filter(Boolean);
      const subtotal = items.reduce((sum, item) => sum + Number(item.product.price) * Number(item.quantity), 0);
      const shipping = subtotal >= 50 ? 0 : 4.99;
      const tax = Number((subtotal * 0.21).toFixed(2));
      const total = Number((subtotal + shipping + tax).toFixed(2));
      const orderId = nextOrderId++;
      orders.push({
        id: orderId,
        user_id: user.id,
        status: orderDef.status,
        total,
        subtotal: Number(subtotal.toFixed(2)),
        tax,
        shipping,
        discount: 0,
        address: `${orderDef.city} Street 123`,
        city: orderDef.city,
        state: '',
        zip_code: '28000',
        country: 'ES',
        phone: user.phone,
        notes: '',
        shipping_method: 'standard',
        payment_method: 'stripe',
        payment_id: `demo_${orderId}`,
        created_at: nowIso(orderDef.daysAgo),
        updated_at: nowIso(orderDef.daysAgo),
      });
      items.forEach(item => {
        order_items.push({
          id: nextOrderItemId++,
          order_id: orderId,
          product_id: item.product.id,
          product_name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          size: Array.isArray(item.product.sizes) ? item.product.sizes[0] : '',
          color: Array.isArray(item.product.colors) ? item.product.colors[0] : '',
        });
      });
    });

    const cart_items = [];
    CART_DEFS.forEach((cartDef, idx) => {
      const user = findUser(users, cartDef.email);
      cartDef.items.forEach(item => {
        const product = productByName(products, item.name);
        if (!product) return;
        cart_items.push({
          id: nextCartId++,
          user_id: user.id,
          product_id: product.id,
          quantity: item.quantity,
          size: Array.isArray(product.sizes) ? product.sizes[0] : '',
          color: Array.isArray(product.colors) ? product.colors[0] : '',
        });
      });
    });

    const reviews = REVIEW_DEFS.map((r, idx) => {
      const user = findUser(users, r.email);
      const product = productByName(products, r.product);
      return {
        id: nextReviewId++,
        user_id: user.id,
        product_id: product.id,
        rating: r.rating,
        comment: r.comment,
        created_at: nowIso(8 - idx),
      };
    });
    const size_templates = SIZE_TEMPLATE_DEFS.map((tpl, idx) => ({ id: idx + 1, name: tpl.name, items: [...tpl.items] }));
    const color_templates = COLOR_TEMPLATE_DEFS.map((tpl, idx) => ({ id: idx + 1, name: tpl.name, items: tpl.items.map(c => ({ name: c.name, hex: c.hex })) }));

    return {
      meta: { seedVersion: SEED_VERSION },
      sessionToken: '',
      chatHistory: [],
      users,
      categories,
      products,
      cart_items,
      orders,
      order_items,
      reviews,
      size_templates,
      color_templates,
      nextIds: {
        user: users.length + 1,
        category: categories.length + 1,
        product: products.length + 1,
        cart_item: nextCartId,
        order: nextOrderId,
        order_item: nextOrderItemId,
        review: nextReviewId,
        size_template: size_templates.length + 1,
        color_template: color_templates.length + 1,
      },
    };
  }

  let dbPromise = null;
  let state = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'key' });
      };
      req.onerror = () => reject(req.error || new Error('No se pudo abrir IndexedDB'));
      req.onsuccess = () => resolve(req.result);
    });
    return dbPromise;
  }

  async function readState() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(STATE_KEY);
      req.onerror = () => reject(req.error || new Error('No se pudo leer el estado'));
      req.onsuccess = () => resolve(req.result?.value || null);
    });
  }

  async function writeState(nextState) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ key: STATE_KEY, value: nextState });
      tx.onerror = () => reject(tx.error || new Error('No se pudo guardar el estado'));
      tx.oncomplete = () => resolve();
    });
  }

  function normalizeState(data) {
    if (!data || data.meta?.seedVersion !== SEED_VERSION) return buildSeedState();
    const next = clone(data);
    next.meta = next.meta || { seedVersion: SEED_VERSION };
    next.chatHistory = Array.isArray(next.chatHistory) ? next.chatHistory.slice(-20) : [];
    next.sessionToken = next.sessionToken || '';
    next.nextIds = next.nextIds || {
      user: (next.users?.length || 0) + 1,
      category: (next.categories?.length || 0) + 1,
      product: (next.products?.length || 0) + 1,
      cart_item: (next.cart_items?.length || 0) + 1,
      order: (next.orders?.length || 0) + 1,
      order_item: (next.order_items?.length || 0) + 1,
      review: (next.reviews?.length || 0) + 1,
      size_template: (next.size_templates?.length || 0) + 1,
      color_template: (next.color_templates?.length || 0) + 1,
    };
    next.users = Array.isArray(next.users) ? next.users : [];
    next.categories = Array.isArray(next.categories) ? next.categories : [];
    next.products = Array.isArray(next.products) ? next.products : [];
    next.cart_items = Array.isArray(next.cart_items) ? next.cart_items : [];
    next.orders = Array.isArray(next.orders) ? next.orders : [];
    next.order_items = Array.isArray(next.order_items) ? next.order_items : [];
    next.reviews = Array.isArray(next.reviews) ? next.reviews : [];
    next.size_templates = Array.isArray(next.size_templates) ? next.size_templates : SIZE_TEMPLATE_DEFS.map((tpl, idx) => ({ id: idx + 1, name: tpl.name, items: [...tpl.items] }));
    next.color_templates = Array.isArray(next.color_templates) ? next.color_templates : COLOR_TEMPLATE_DEFS.map((tpl, idx) => ({ id: idx + 1, name: tpl.name, items: tpl.items.map(c => ({ name: c.name, hex: c.hex })) }));
    next.nextIds.size_template = next.nextIds.size_template || Math.max(0, ...next.size_templates.map(t => Number(t.id) || 0)) + 1;
    next.nextIds.color_template = next.nextIds.color_template || Math.max(0, ...next.color_templates.map(t => Number(t.id) || 0)) + 1;
    return next;
  }

  function businessSnapshot(source) {
    const stateData = source || {};
    return {
      users: (stateData.users || []).map(({ id, name, email, phone, role, password }) => ({ id, name, email, phone, role, password })),
      categories: (stateData.categories || []).map(({ id, name, slug, image }) => ({ id, name, slug, image })),
      products: (stateData.products || []).map(({ id, name, brand, category_id, description, characteristics, composition_care, price, compare_price, image, images, sizes, colors, tags, gender, stock, active, featured, on_sale, rating }) => ({
        id, name, brand, category_id, description, characteristics, composition_care, price, compare_price, image, images, sizes, colors, tags, gender, stock, active, featured, on_sale, rating,
      })),
      cart_items: (stateData.cart_items || []).map(({ id, user_id, product_id, quantity, size, color }) => ({ id, user_id, product_id, quantity, size, color })),
      orders: (stateData.orders || []).map(({ id, user_id, status, total, subtotal, tax, shipping, discount, address, city, state, zip_code, country, phone, notes, shipping_method, payment_method, payment_id }) => ({
        id, user_id, status, total, subtotal, tax, shipping, discount, address, city, state, zip_code, country, phone, notes, shipping_method, payment_method, payment_id,
      })),
      order_items: (stateData.order_items || []).map(({ id, order_id, product_id, product_name, price, quantity, size, color }) => ({ id, order_id, product_id, product_name, price, quantity, size, color })),
      reviews: (stateData.reviews || []).map(({ id, user_id, product_id, rating, comment }) => ({ id, user_id, product_id, rating, comment })),
      nextIds: clone(stateData.nextIds || {}),
    };
  }

  function businessFingerprint(source) {
    return JSON.stringify(businessSnapshot(source));
  }

  async function ensureState() {
    if (state) return state;
    const loaded = await readState().catch(() => null);
    state = normalizeState(loaded);
    if (!loaded) await writeState(state);
    return state;
  }

  async function save() {
    await writeState(state);
  }

  function parseBody(body) {
    if (!body) return {};
    if (typeof body === 'string') {
      try { return JSON.parse(body); } catch { return {}; }
    }
    return body;
  }

  function getCategoryById(id) {
    return state.categories.find(c => Number(c.id) === Number(id));
  }

  function getProductById(id) {
    return state.products.find(p => Number(p.id) === Number(id));
  }

  function getUserByToken(token) {
    if (!token) return null;
    return state.users.find(u => u.token === token) || null;
  }

  function requireUser(token) {
    const user = getUserByToken(token);
    if (!user) throw new Error('No autenticado');
    return user;
  }

  function requireAdmin(token) {
    const user = requireUser(token);
    if (user.role !== 'admin') throw new Error('Acceso denegado');
    return user;
  }

  function enrichProduct(p) {
    const category = getCategoryById(p.category_id) || state.categories[0];
    return {
      ...clone(p),
      category_name: category?.name || 'General',
      category_slug: category?.slug || 'general',
    };
  }

  function cartRows(userId) {
    return state.cart_items
      .filter(ci => Number(ci.user_id) === Number(userId))
      .map(ci => {
        const p = getProductById(ci.product_id);
        return p ? { ...clone(ci), name: p.name, price: p.price, compare_price: p.compare_price, image: p.image, stock: p.stock, sizes: p.sizes, colors: p.colors } : null;
      })
      .filter(Boolean);
  }

  function orderItemsFor(orderId) {
    return state.order_items.filter(i => Number(i.order_id) === Number(orderId)).map(clone);
  }

  function orderWithMeta(order) {
    const user = state.users.find(u => Number(u.id) === Number(order.user_id));
    return { ...clone(order), customer: user ? { name: user.name, email: user.email } : null, items: orderItemsFor(order.id) };
  }

  function computeDashboard() {
    const ordersByStatus = {};
    const revenueByStatus = {};
    state.orders.forEach(o => {
      ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1;
      revenueByStatus[o.status] = Number((revenueByStatus[o.status] || 0) + Number(o.total));
    });
    const paidRevenue = state.orders.filter(o => ['paid', 'shipped', 'delivered'].includes(o.status)).reduce((sum, o) => sum + Number(o.total), 0);
    const cartValue = state.cart_items.reduce((sum, ci) => {
      const p = getProductById(ci.product_id);
      return sum + (p ? Number(p.price) * Number(ci.quantity) : 0);
    }, 0);
    const topSold = Object.values(state.order_items.reduce((acc, item) => {
      const p = getProductById(item.product_id);
      if (!p) return acc;
      if (!acc[p.id]) acc[p.id] = { product_id: p.id, product_name: p.name, total_qty: 0, total_rev: 0 };
      acc[p.id].total_qty += Number(item.quantity);
      acc[p.id].total_rev += Number(item.quantity) * Number(item.price);
      return acc;
    }, {})).sort((a, b) => b.total_qty - a.total_qty).slice(0, 5);
    const mostCarted = Object.values(state.cart_items.reduce((acc, item) => {
      const p = getProductById(item.product_id);
      if (!p) return acc;
      if (!acc[p.id]) acc[p.id] = { product_id: p.id, name: p.name, total_qty: 0, cart_value: 0 };
      acc[p.id].total_qty += Number(item.quantity);
      acc[p.id].cart_value += Number(item.quantity) * Number(p.price);
      return acc;
    }, {})).sort((a, b) => b.cart_value - a.cart_value).slice(0, 5);
    return {
      total_revenue: Number(paidRevenue.toFixed(2)),
      revenue_by_status: revenueByStatus,
      orders_count_by_status: ordersByStatus,
      total_orders: state.orders.length,
      total_customers: state.users.filter(u => u.role === 'user').length,
      active_products: state.products.filter(p => p.active).length,
      inactive_products: state.products.filter(p => !p.active).length,
      low_stock_products: state.products.filter(p => p.active && Number(p.stock) <= 5).sort((a, b) => a.stock - b.stock).slice(0, 10).map(({ id, name, stock }) => ({ id, name, stock })),
      cart_value: Number(cartValue.toFixed(2)),
      cart_item_count: state.cart_items.length,
      customers_with_carts: new Set(state.cart_items.map(ci => ci.user_id)).size,
      recent_orders: state.orders.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5).map(orderWithMeta),
      top_sold_products: topSold,
      most_carted_products: mostCarted,
    };
  }

  function applyProductFilters(params) {
    const q = String(params.get('q') || params.get('search') || '').trim().toLowerCase();
    const category = String(params.get('category') || params.get('categoria') || '').trim();
    const onSale = String(params.get('on_sale') || params.get('sale') || '').toLowerCase() === 'true';
    const page = Math.max(1, Number(params.get('page') || 1));
    const perPage = Math.max(1, Number(params.get('per_page') || 100));
    const sort = String(params.get('sort') || params.get('orden') || 'newest');
    let items = state.products.filter(p => p.active);
    if (q) items = items.filter(p => [p.name, p.brand, p.description, p.tags].join(' ').toLowerCase().includes(q));
    if (category) items = items.filter(p => {
      const cat = getCategoryById(p.category_id);
      return cat && (cat.slug === category || String(cat.id) === category || cat.name.toLowerCase() === category.toLowerCase());
    });
    if (onSale) items = items.filter(p => p.on_sale || (p.compare_price && Number(p.compare_price) > Number(p.price)));
    if (sort === 'price_asc') items.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') items.sort((a, b) => b.price - a.price);
    else if (sort === 'rating') items.sort((a, b) => b.rating - a.rating);
    else if (sort === 'popular') {
      const sold = state.order_items.reduce((acc, item) => ((acc[item.product_id] = (acc[item.product_id] || 0) + Number(item.quantity)), acc), {});
      items.sort((a, b) => (sold[b.id] || 0) - (sold[a.id] || 0) || b.rating - a.rating);
    } else items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const total = items.length;
    const sliced = items.slice((page - 1) * perPage, page * perPage).map(enrichProduct);
    return { items: sliced, total, page, per_page: perPage };
  }

  function updateProduct(productId, patch) {
    const idx = state.products.findIndex(p => Number(p.id) === Number(productId));
    if (idx === -1) throw new Error('Producto no encontrado');
    const category = getCategoryById(Number(patch.category_id)) || getCategoryById(state.products[idx].category_id);
    const next = {
      ...state.products[idx],
      name: String(patch.name || '').trim(),
      brand: String(patch.brand || '').trim(),
      category_id: Number(patch.category_id),
      category_name: category?.name || 'General',
      category_slug: category?.slug || 'general',
      description: String(patch.description || '').trim(),
      characteristics: String(patch.characteristics || '').trim(),
      composition_care: String(patch.composition_care || '').trim(),
      price: Number(patch.price),
      compare_price: patch.compare_price == null || patch.compare_price === '' ? null : Number(patch.compare_price),
      image: String(patch.image || ''),
      images: patch.images || '[]',
      sizes: patch.sizes || '[]',
      colors: patch.colors || '[]',
      tags: patch.tags || '[]',
      gender: String(patch.gender || 'unisex'),
      stock: Number(patch.stock || 0),
      active: !!patch.active,
      featured: !!patch.featured,
      on_sale: !!patch.on_sale,
      rating: Number(patch.rating || 4.5),
    };
    state.products[idx] = next;
    return enrichProduct(next);
  }

  async function uploadProductImage(file) {
    if (!file) throw new Error('No se recibió ningún archivo');
    if (!String(file.type || '').startsWith('image/')) throw new Error('Solo se permiten imágenes');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
      reader.onload = async () => {
        const url = String(reader.result || '');
        resolve({ url });
      };
      reader.readAsDataURL(file);
    });
  }

  async function exportBackup() {
    await ensureState();
    return JSON.stringify(state, null, 2);
  }

  async function importBackup(text) {
    const next = normalizeState(typeof text === 'string' ? JSON.parse(text) : text);
    state = next;
    await save();
    return clone(state);
  }

  async function reset() {
    state = buildSeedState();
    await save();
    return clone(state);
  }

  async function hasUserChanges() {
    await ensureState();
    return businessFingerprint(state) !== businessFingerprint(buildSeedState());
  }

  function normalizeColorItem(item) {
    if (item && typeof item === 'object') return { name: String(item.name || '').trim(), hex: String(item.hex || '#777777') };
    return { name: String(item || '').trim(), hex: '#777777' };
  }

  async function listOptionTemplates(type) {
    await ensureState();
    return clone(type === 'colors' ? state.color_templates : state.size_templates);
  }

  async function saveOptionTemplate(type, payload) {
    await ensureState();
    const key = type === 'colors' ? 'color_templates' : 'size_templates';
    const idKey = type === 'colors' ? 'color_template' : 'size_template';
    const list = state[key];
    const id = Number(payload.id || 0);
    const name = String(payload.name || '').trim();
    if (!name) throw new Error('La plantilla necesita un nombre');
    const items = type === 'colors'
      ? (payload.items || []).map(normalizeColorItem).filter(i => i.name)
      : (payload.items || []).map(i => String(i || '').trim()).filter(Boolean);
    if (!items.length) throw new Error('La plantilla necesita al menos un elemento');
    if (id) {
      const current = list.find(t => Number(t.id) === id);
      if (!current) throw new Error('Plantilla no encontrada');
      current.name = name;
      current.items = items;
      await save();
      return clone(current);
    }
    const template = { id: state.nextIds[idKey]++, name, items };
    list.push(template);
    await save();
    return clone(template);
  }

  async function deleteOptionTemplate(type, id) {
    await ensureState();
    const key = type === 'colors' ? 'color_templates' : 'size_templates';
    state[key] = state[key].filter(t => Number(t.id) !== Number(id));
    await save();
    return true;
  }

  async function setChatHistory(history) {
    await ensureState();
    state.chatHistory = Array.isArray(history) ? history.slice(-20) : [];
    await save();
  }

  async function appendChatHistory(role, content) {
    await ensureState();
    state.chatHistory.push({ role, content });
    state.chatHistory = state.chatHistory.slice(-20);
    await save();
  }

  function getChatHistory() {
    return clone(state?.chatHistory || []);
  }

  async function getAiContext(query = '', options = {}) {
    await ensureState();
    const privateContext = !!options.privateContext;
    const dashboard = computeDashboard();
    const q = String(query || '').toLowerCase().trim();
    const categoryFilter = privateContext ? '' : inferCatalogCategory(q);
    const budgetMatch = q.match(/(\d+(?:[.,]\d+)?)/);
    const budget = budgetMatch ? Number(budgetMatch[1].replace(',', '.')) : null;
    const customerStats = state.users
      .filter(u => u.role === 'user')
      .map(u => {
        const orders = state.orders.filter(o => Number(o.user_id) === Number(u.id));
        const totalSpent = orders.reduce((sum, o) => sum + Number(o.total), 0);
        const cartValue = cartRows(u.id).reduce((sum, i) => sum + Number(i.price) * Number(i.quantity), 0);
        return { name: u.name, email: u.email, order_count: orders.length, total_spent: totalSpent, cart_value: cartValue };
      })
      .sort((a, b) => b.order_count - a.order_count || b.total_spent - a.total_spent);
    const topCustomer = customerStats[0];
    const topCustomersText = customerStats.slice(0, 4).map(c => `${c.name}|${c.order_count}|${c.total_spent.toFixed(2)}|${c.cart_value.toFixed(2)}`).join(';') || 'none';
    const topSoldText = (dashboard.top_sold_products || []).slice(0, 4).map(p => `${p.product_name}|${p.total_qty}|${Number(p.total_rev || 0).toFixed(2)}`).join(';') || 'none';
    const cartedText = (dashboard.most_carted_products || []).slice(0, 4).map(p => `${p.name}|${p.total_qty}|${Number(p.cart_value || 0).toFixed(2)}`).join(';') || 'none';
    const lowStockText = (dashboard.low_stock_products || []).slice(0, 5).map(p => `${p.name}|${p.stock}`).join(';') || 'none';
    const activeProducts = state.products.filter(p => p.active);
    const catalogProducts = activeProducts.filter(p => {
      if (!categoryFilter) return true;
      return String(p.category_slug || '').toLowerCase() === categoryFilter || String(p.category_name || '').toLowerCase() === categoryFilter || String(p.category_name || '').toLowerCase().includes(categoryFilter);
    });
    const matchedProducts = q
      ? catalogProducts.filter(p => [p.name, p.brand, p.description, p.tags, p.category_name, p.category_slug].join(' ').toLowerCase().includes(q)).slice(0, 5)
      : [];
    const budgetProducts = budget
      ? catalogProducts
        .filter(p => Number(p.price) <= budget)
        .sort((a, b) => a.price - b.price)
        .slice(0, 5)
      : [];
    const productsText = matchedProducts.length
      ? matchedProducts.map(p => `${p.name}|${p.brand}|current_price=${Number(p.price).toFixed(2)}|old_price=${p.compare_price == null ? 'none' : Number(p.compare_price).toFixed(2)}|stock=${p.stock}|category=${String(p.category_name || '').replace(/\|/g, ' ')}`).join(';')
      : catalogProducts.map(p => `${p.name}|${p.brand}|current_price=${Number(p.price).toFixed(2)}|old_price=${p.compare_price == null ? 'none' : Number(p.compare_price).toFixed(2)}|stock=${p.stock}|category=${String(p.category_name || '').replace(/\|/g, ' ')}`).join(';') || 'none';
    const budgetText = budgetProducts.length
      ? budgetProducts.map(p => `${p.name}|${p.brand}|current_price=${Number(p.price).toFixed(2)}|old_price=${p.compare_price == null ? 'none' : Number(p.compare_price).toFixed(2)}|stock=${p.stock}`).join(';')
      : 'none';
    if (!privateContext) {
      return [
        `CATALOG_FILTER|${categoryFilter || 'none'}`,
        `BUDGET_REQUEST|${budget ? `budget=${budget.toFixed(2)}|currency=EUR` : 'none'}`,
        `BUDGET_MATCHES|${budgetText}`,
        `PRODUCT_MATCHES|${productsText}`,
      ].join('\n');
    }
    return [
      `CATALOG_FILTER|${categoryFilter || 'none'}`,
      `BUSINESS|orders=${dashboard.total_orders}|customers=${dashboard.total_customers}|active_products=${dashboard.active_products}|revenue=${Number(dashboard.total_revenue).toFixed(2)}|cart_value=${Number(dashboard.cart_value).toFixed(2)}`,
      `TOP_CUSTOMER|${topCustomer ? `${topCustomer.name}|${topCustomer.order_count}` : 'none'}`,
      `TOP_CUSTOMERS|${topCustomersText}`,
      `TOP_SOLD|${topSoldText}`,
      `TOP_CARTED|${cartedText}`,
      `LOW_STOCK|${lowStockText}`,
      `BUDGET_REQUEST|${budget ? `budget=${budget.toFixed(2)}|currency=EUR` : 'none'}`,
      `BUDGET_MATCHES|${budgetText}`,
      `PRODUCT_MATCHES|${productsText}`,
    ].join('\n');
  }

  async function listOrdersForUser(userId) {
    return state.orders.filter(o => Number(o.user_id) === Number(userId)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(orderWithMeta);
  }

  async function checkout(payload, user) {
    const items = cartRows(user.id);
    if (!items.length) throw new Error('El carrito está vacío');
    const subtotal = items.reduce((sum, i) => sum + Number(i.price) * Number(i.quantity), 0);
    const shipping = subtotal >= 50 || subtotal === 0 ? 0 : 4.99;
    const tax = Number((subtotal * 0.21).toFixed(2));
    const total = Number((subtotal + shipping + tax).toFixed(2));
    const now = new Date().toISOString();
    const orderId = state.nextIds.order++;
    state.orders.push({
      id: orderId,
      user_id: user.id,
      status: 'pending',
      total,
      subtotal: Number(subtotal.toFixed(2)),
      tax,
      shipping,
      discount: 0,
      address: String(payload.address || ''),
      city: String(payload.city || ''),
      state: String(payload.state || ''),
      zip_code: String(payload.zip_code || ''),
      country: String(payload.country || 'ES'),
      phone: String(payload.phone || ''),
      notes: String(payload.notes || ''),
      shipping_method: String(payload.shipping_method || 'standard'),
      payment_method: String(payload.payment_method || 'stripe'),
      payment_id: `demo_${orderId}`,
      created_at: now,
      updated_at: now,
    });
    items.forEach(item => {
      state.order_items.push({
        id: state.nextIds.order_item++,
        order_id: orderId,
        product_id: item.product_id,
        product_name: item.name,
        price: item.price,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
      });
      const p = getProductById(item.product_id);
      if (p) p.stock = Math.max(0, Number(p.stock) - Number(item.quantity));
    });
    state.cart_items = state.cart_items.filter(ci => Number(ci.user_id) !== Number(user.id));
    await save();
    return { order_id: orderId, status: 'pending', total };
  }

  async function request(url, options = {}) {
    await ensureState();
    const u = new URL(url, location.origin);
    const path = u.pathname;
    const method = String(options.method || 'GET').toUpperCase();
    const body = parseBody(options.body);
    const token = u.searchParams.get('token') || body.token || '';

    if (path === '/api/ai/chat' || path === '/api/admin/products/ai-copy') {
      const res = await fetch(path + (u.search || ''), {
        method,
        headers: options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
        body: options.body,
        signal: options.signal,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Error inesperado' }));
        throw new Error(err.detail || 'Error inesperado');
      }
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let response = '';
        let model = 'deepinfra';
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
              if (payload === '[DONE]') return { response, model };
              let parsed;
              try {
                parsed = JSON.parse(payload);
              } catch {
                continue;
              }
              if (parsed?.error) throw new Error(parsed.error);
              model = parsed?.model || model;
              const piece = parsed?.choices?.[0]?.delta?.content || parsed?.delta?.content || parsed?.content || '';
              if (piece && piece !== '</s>') response += piece;
            }
          }
        }
        return { response, model };
      }
      return res.json();
    }

    if (path === '/api/auth/register' && method === 'POST') {
      if (state.users.some(u => u.email.toLowerCase() === String(body.email || '').toLowerCase())) throw new Error('El email ya está registrado');
      const user = { id: state.nextIds.user++, name: body.name, email: body.email, phone: body.phone || '', role: 'user', password: body.password, token: `tok_${crypto.randomUUID().replace(/-/g, '')}`, created_at: new Date().toISOString() };
      state.users.push(user);
      state.sessionToken = user.token;
      await save();
      return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, token: user.token };
    }
    if (path === '/api/auth/login' && method === 'POST') {
      const user = state.users.find(u => u.email.toLowerCase() === String(body.email || '').toLowerCase() && u.password === body.password);
      if (!user) throw new Error('Credenciales incorrectas');
      user.token = `tok_${crypto.randomUUID().replace(/-/g, '')}`;
      state.sessionToken = user.token;
      await save();
      return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, token: user.token };
    }
    if (path === '/api/auth/me' && method === 'GET') {
      const user = getUserByToken(token);
      if (!user) throw new Error('No autenticado');
      return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, token: user.token };
    }
    if (path === '/api/categories' && method === 'GET') return clone(state.categories);
    if (path === '/api/filters' && method === 'GET') {
      const brands = [...new Set(state.products.filter(p => p.active).map(p => p.brand).filter(Boolean))].sort();
      const sizes = [...new Set(state.products.filter(p => p.active).flatMap(p => JSON.parse(p.sizes || '[]')))].sort();
      const colors = [...new Set(state.products.filter(p => p.active).flatMap(p => JSON.parse(p.colors || '[]').map(colorLabel).filter(Boolean)))].sort();
      return { brands, categories: clone(state.categories), sizes, colors };
    }
    if (path === '/api/products' && method === 'GET') return applyProductFilters(u.searchParams);
    if (path.startsWith('/api/products/') && method === 'GET' && !path.endsWith('/reviews')) {
      const id = Number(path.split('/').pop());
      const p = state.products.find(x => Number(x.id) === Number(id) && x.active);
      if (!p) throw new Error('Producto no encontrado');
      const enriched = enrichProduct(p);
      enriched.reviews = state.reviews.filter(r => Number(r.product_id) === Number(id)).map(r => {
        const user = state.users.find(u => Number(u.id) === Number(r.user_id));
        return { ...clone(r), user_name: user?.name || 'Usuario' };
      });
      return enriched;
    }
    if (path === '/api/products' && method === 'POST') {
      requireAdmin(token);
      const category = getCategoryById(Number(body.category_id));
      const product = buildProduct({ ...body, category: category?.name || 'General' }, state.nextIds.product++, new Map(state.categories.map(c => [c.name, c])));
      product.characteristics = String(body.characteristics || product.characteristics);
      product.composition_care = String(body.composition_care || product.composition_care);
      state.products.push(product);
      await save();
      return enrichProduct(product);
    }
    if (path.startsWith('/api/products/') && method === 'PATCH') {
      requireAdmin(token);
      const id = Number(path.split('/')[3]);
      const product = updateProduct(id, body);
      await save();
      return product;
    }
    if (path.startsWith('/api/products/') && method === 'DELETE') {
      requireAdmin(token);
      const id = Number(path.split('/').pop());
      const hasHistory = state.order_items.some(i => Number(i.product_id) === Number(id));
      if (hasHistory) {
        const p = getProductById(id);
        if (!p) throw new Error('Producto no encontrado');
        p.active = false;
        await save();
        return { ok: true, deactivated: true };
      }
      state.products = state.products.filter(p => Number(p.id) !== Number(id));
      state.cart_items = state.cart_items.filter(ci => Number(ci.product_id) !== Number(id));
      await save();
      return { ok: true, deleted: true };
    }
    if (path === '/api/cart' && method === 'GET') {
      const user = getUserByToken(token);
      return user ? cartRows(user.id) : [];
    }
    if (path === '/api/cart' && method === 'POST') {
      const user = requireUser(token);
      const existing = state.cart_items.find(ci => Number(ci.user_id) === Number(user.id) && Number(ci.product_id) === Number(body.product_id) && String(ci.size || '') === String(body.size || '') && String(ci.color || '') === String(body.color || ''));
      if (existing) existing.quantity += Number(body.quantity || 1);
      else state.cart_items.push({ id: state.nextIds.cart_item++, user_id: user.id, product_id: Number(body.product_id), quantity: Number(body.quantity || 1), size: String(body.size || ''), color: String(body.color || '') });
      await save();
      return cartRows(user.id);
    }
    if (path.startsWith('/api/cart/') && method === 'PATCH') {
      const user = requireUser(token);
      const id = Number(path.split('/').pop());
      const item = state.cart_items.find(ci => Number(ci.id) === Number(id) && Number(ci.user_id) === Number(user.id));
      if (!item) throw new Error('Carrito no encontrado');
      if (body.quantity != null) item.quantity = Number(body.quantity);
      if (body.size != null) item.size = String(body.size);
      if (body.color != null) item.color = String(body.color);
      await save();
      return cartRows(user.id);
    }
    if (path.startsWith('/api/cart/') && method === 'DELETE') {
      const user = requireUser(token);
      const id = Number(path.split('/').pop());
      state.cart_items = state.cart_items.filter(ci => !(Number(ci.id) === Number(id) && Number(ci.user_id) === Number(user.id)));
      await save();
      return cartRows(user.id);
    }
    if (path === '/api/cart' && method === 'DELETE') {
      const user = requireUser(token);
      state.cart_items = state.cart_items.filter(ci => Number(ci.user_id) !== Number(user.id));
      await save();
      return cartRows(user.id);
    }
    if (path === '/api/checkout' && method === 'POST') {
      const user = requireUser(token);
      return checkout(body, user);
    }
    if (path === '/api/orders' && method === 'GET') return listOrdersForUser(requireUser(token).id);
    if (path.startsWith('/api/orders/') && method === 'GET') {
      const user = requireUser(token);
      const id = Number(path.split('/').pop());
      const order = state.orders.find(o => Number(o.id) === Number(id) && Number(o.user_id) === Number(user.id));
      if (!order) throw new Error('Pedido no encontrado');
      return { ...clone(order), items: orderItemsFor(order.id) };
    }
    if (path === '/api/admin/products' && method === 'GET') {
      requireAdmin(token);
      return state.products.slice().sort((a, b) => b.id - a.id).map(enrichProduct);
    }
    if (path.startsWith('/api/admin/product/') && method === 'GET') {
      requireAdmin(token);
      const id = Number(path.split('/').pop());
      const p = getProductById(id);
      if (!p) throw new Error('Producto no encontrado');
      return enrichProduct(p);
    }
    if (path.startsWith('/api/admin/products/') && path.endsWith('/quick') && method === 'PATCH') {
      requireAdmin(token);
      const id = Number(path.split('/')[4]);
      const p = getProductById(id);
      if (!p) throw new Error('Producto no encontrado');
      if (body.active != null) p.active = !!body.active;
      if (body.on_sale != null) p.on_sale = !!body.on_sale;
      if (body.stock != null) p.stock = Number(body.stock);
      if (body.price != null) p.price = Number(body.price);
      await save();
      return enrichProduct(p);
    }
    if (path === '/api/admin/orders' && method === 'GET') {
      requireAdmin(token);
      const status = String(u.searchParams.get('status') || '').trim();
      return state.orders.filter(o => !status || o.status === status).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(orderWithMeta);
    }
    if (path.startsWith('/api/admin/orders/') && path.endsWith('/status') && method === 'PATCH') {
      requireAdmin(token);
      const id = Number(path.split('/')[4]);
      const order = state.orders.find(o => Number(o.id) === Number(id));
      if (!order) throw new Error('Pedido no encontrado');
      order.status = String(u.searchParams.get('status') || body.status || order.status);
      order.updated_at = new Date().toISOString();
      await save();
      return clone(order);
    }
    if (path === '/api/admin/dashboard' && method === 'GET') {
      requireAdmin(token);
      return computeDashboard();
    }
    if (path === '/api/admin/customers' && method === 'GET') {
      requireAdmin(token);
      return state.users.filter(u => u.role === 'user').map(u => {
        const orders = state.orders.filter(o => Number(o.user_id) === Number(u.id));
        const totalSpent = orders.reduce((s, o) => s + Number(o.total), 0);
        const cartValue = cartRows(u.id).reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0);
        return { id: u.id, name: u.name, email: u.email, order_count: orders.length, total_spent: Number(totalSpent.toFixed(2)), cart_value: Number(cartValue.toFixed(2)) };
      }).sort((a, b) => b.total_spent - a.total_spent);
    }
    if (path === '/api/admin/carts' && method === 'GET') {
      requireAdmin(token);
      const userIds = [...new Set(state.cart_items.map(ci => ci.user_id))];
      return userIds.map(uid => {
        const user = state.users.find(u => Number(u.id) === Number(uid));
        const items = cartRows(uid);
        const cart_value = items.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0);
        return { id: uid, name: user?.name || '', email: user?.email || '', cart_value: Number(cart_value.toFixed(2)), items };
      }).sort((a, b) => b.cart_value - a.cart_value);
    }
    if (path === '/api/admin/uploads/product-image' && method === 'POST') {
      requireAdmin(token);
      const form = options.body;
      const file = form?.get ? form.get('file') : null;
      return uploadProductImage(file);
    }
    if (path === '/api/products' && method === 'GET') return applyProductFilters(u.searchParams);

    throw new Error(`Ruta no soportada: ${path}`);
  }

  async function init() {
    await ensureState();
    return clone(state);
  }

  async function setSessionToken(token) {
    await ensureState();
    state.sessionToken = token || '';
    await save();
  }

  function getSessionToken() {
    return state?.sessionToken || '';
  }

  async function clearSessionToken() {
    await ensureState();
    state.sessionToken = '';
    await save();
  }

  window.DemoStore = {
    init,
    request,
    reset,
    exportBackup,
    importBackup,
    uploadProductImage,
    getSessionToken,
    setSessionToken,
    clearSessionToken,
    getChatHistory,
    setChatHistory,
    appendChatHistory,
    getAiContext,
    hasUserChanges,
    listOptionTemplates,
    saveOptionTemplate,
    deleteOptionTemplate,
    getState: () => clone(state),
  };
})();
