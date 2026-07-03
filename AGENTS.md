# AGENTS.md — MODE Clothing Store

Single-module FastAPI app (`app/main.py`) + vanilla JS frontend (`frontend/`). No build step, no tests, no lint/typecheck config.

## Run locally

```bash
cp .env.example .env
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8011
```

## Key facts

- **Port**: 8011 (configurable via `PORT` in `.env`)
- **DB**: Demo state lives in browser IndexedDB via `frontend/demoStore.js`; SQLite backend support is legacy and disabled by default
- **Frontend**: SPA served by FastAPI — `GET /` returns `frontend/index.html`, static assets at `/assets`
- **Auth**: Token-based (stored in localStorage), admin user: `admin@mode.com` / `admin123`
- **Ollama**: Uses `llama3.1:8b` for AI assistant chat. Model must be pulled: `ollama pull llama3.1:8b`
- **SEO**: sitemap.xml + robots.txt served at root, schema.org structured data in HTML, lazy loading on images

## API endpoints

### Auth
- `POST /api/auth/register` — Register user
- `POST /api/auth/login` — Login
- `GET /api/auth/me?token=` — Get current user

### Products
- `GET /api/products?...` — List with search, filter (category/brand/gender/size/price/sale/stock), sort (newest/price/rating), pagination
- `GET /api/products/:id` — Product detail with reviews
- `POST /api/products` — Create (admin)
- `PATCH /api/products/:id` — Update (admin)
- `DELETE /api/products/:id` — Delete (admin)

### Filters
- `GET /api/filters` — Available brands, categories, sizes, colors

### Cart (requires auth)
- `GET /api/cart` — List items
- `POST /api/cart` — Add item
- `PATCH /api/cart/:id` — Update quantity/size/color
- `DELETE /api/cart/:id` — Remove item
- `DELETE /api/cart` — Clear cart

### Checkout & Orders
- `POST /api/checkout` — Create order from cart
- `GET /api/orders` — User's orders
- `GET /api/orders/:id` — Order detail

### Admin
- `GET /api/admin/orders` — All orders (with optional `?status=`)
- `PATCH /api/admin/orders/:id/status?status=` — Update order status
- `GET /api/admin/products` — All products (including inactive)

### AI Assistant
- `POST /api/ai/chat` — Chat with Ollama-powered assistant that knows the catalog

### Reviews
- `POST /api/products/:id/reviews?rating=&comment=&token=` — Add review

## DB schema (auto-created)

- **users** — id, name, email, password (hashed), phone, role (user/admin), token, created_at
- **categories** — id, name, slug, image
- **products** — id, name, brand, category_id, description, price, compare_price, image, images, sizes, colors, tags, gender, stock, active, featured, on_sale, rating, created_at
- **cart_items** — id, user_id, product_id, quantity, size, color
- **orders** — id, user_id, status (pending/paid/shipped/delivered/cancelled), total, subtotal, tax, shipping, discount, address, city, state, zip_code, country, phone, notes, shipping_method, payment_method, payment_id, created_at, updated_at
- **order_items** — id, order_id, product_id, product_name, price, quantity, size, color
- **reviews** — id, user_id, product_id, rating, comment, created_at
