# MODE — Tienda de Moda Online Premium

Demo profesional de tienda de moda online con diseño moderno, catálogo completo, carrito, checkout, panel de administración y asistente IA.

## Stack

- **Backend**: FastAPI + SQLite
- **Frontend**: HTML, CSS y JavaScript vanilla (sin build step)
- **IA local opcional**: Ollama (llama3.1:8b)
- **Despliegue**: Docker / Docker Compose

## Ejecutar en local sin Docker

```bash
cd ~/Escritorio/Demo_1
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8011
```

Abre `http://localhost:8011`.

### Usuario admin

- Email: `admin@mode.com`
- Contraseña: `admin123`

### IA (opcional)

```bash
ollama pull llama3.1:8b
```

## Ejecutar con Docker

```bash
cd ~/Escritorio/Demo_1
cp .env.example .env
docker compose up --build
```

### Imágenes locales

El admin de productos permite **subir imágenes locales** en lugar de usar URLs externas.
- Las imágenes se guardan en `frontend/uploads/products/`.
- Formatos aceptados: JPG, PNG, WebP, AVIF, GIF (máx. 5 MB).
- Al crear/editar un producto, el administrador puede arrastrar o seleccionar un archivo local.
- La imagen se sube automáticamente al servidor y se almacena con nombre seguro (UUID).
- El campo `image` del producto se actualiza con la ruta local `/assets/uploads/products/...`.
- Si no se selecciona una imagen nueva al editar, se conserva la imagen actual.

Todas las imágenes de semilla (productos, categorías y hero) han sido migradas a rutas locales en `frontend/uploads/products/` y `frontend/uploads/site/`.

## Funcionalidades

- Catálogo con búsqueda, filtros (categoría, marca, género, talla, color, precio, ofertas, stock) y ordenación (popularidad, novedad, precio, valoración)
- Fichas de producto con tallas, colores, cantidad y opiniones
- Carrito de compra con resumen y barra de envío gratis
- Checkout con validación de formularios
- Historial de pedidos
- Panel de administración completo con:
  - **Dashboard** con KPIs (ingresos, pedidos, clientes, productos, stock bajo, valor en carritos) y gráficos de barras (ventas por estado, más vendidos, más guardados en carrito)
  - **Gestión de productos** con tabla filtrable (búsqueda, categoría, stock, activos/inactivos), modal de creación/edición, toggle rápido de activo/oferta, eliminación
  - **Pedidos** con cambio de estado en línea
  - **Clientes** con historial de pedidos, gasto total, carrito actual
  - **Carritos abandonados** con detalle de productos, tallas, colores y valor
  - **Importación/exportación Excel** con plantilla descargable, upload y resumen de resultados
- Asistente IA con conocimiento del catálogo
- SEO: sitemap.xml, robots.txt, schema.org, lazy loading
- Diseño responsive premium

## Endpoints principales

- `GET /api/health`
- `POST /api/auth/login` / `POST /api/auth/register`
- `GET /api/products?...` — Listado con filtros y paginación
- `GET /api/products/:id` — Detalle con opiniones
- `GET /api/filters` — Marcas, categorías, tallas, colores disponibles
- `GET/POST/PATCH/DELETE /api/cart` — CRUD carrito
- `POST /api/checkout` — Crear pedido
- `GET /api/orders` / `GET /api/orders/:id` — Pedidos

### Admin

- `GET /api/admin/dashboard` — Métricas del dashboard
- `GET /api/admin/customers` — Clientes con pedidos y carritos
- `GET /api/admin/carts` — Carritos guardados por cliente
- `GET /api/admin/orders` / `PATCH /api/admin/orders/:id/status` — Gestión pedidos
- `GET /api/admin/products` — Todos los productos (incluyendo inactivos)
- `PATCH /api/admin/products/:id/quick` — Actualización rápida (precio, stock, activo, oferta)
- `POST /api/admin/uploads/product-image` — Subir imagen de producto local
- `POST /api/admin/products/import-excel` — Importar productos desde Excel
- `GET /api/admin/products/import-template` — Descargar plantilla Excel
- `GET /api/admin/products/export-excel` — Exportar catálogo a Excel

### Otros

- `POST /api/ai/chat` — Chat con asistente IA
- `POST /api/products/:id/reviews` — Añadir opinión

## Variables de entorno

| Variable | Descripción | Defecto |
|---|---|---|
| `PORT` | Puerto del servidor | `8011` |
| `OLLAMA_URL` | URL de Ollama | `http://127.0.0.1:11434` |
| `OLLAMA_MODEL` | Modelo de Ollama | `llama3.1:8b` |
| `STRIPE_API_KEY` | API key de Stripe | `""` |
| `STRIPE_PUBLISHABLE_KEY` | Publishable key de Stripe | `pk_test_placeholder` |
| `CORS_ORIGINS` | Orígenes CORS | `*` |

## Producción en VPS

1. Copiar el proyecto a la VPS.
2. Crear `.env` desde `.env.example`.
3. Ejecutar `docker compose up -d --build`.
4. Publicar detrás de Nginx/Caddy con HTTPS.
5. Programar backup del volumen `demo1_data`.
