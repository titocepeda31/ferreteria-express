# Ferretería Express v3

- `index.html`: catálogo público con columnas independientes PC/móvil, fichas de producto, contacto, ubicación, horarios y redes sociales.
- `admin.html`: importador CSV y personalizador de tienda (local, NO publicar).
- `data/config.json`: configuración de tienda. `columnasPC` admite 2–5; `columnasMobile`, 1–2.
- `data/productos.json`: productos públicos.

## Probar

En la carpeta del proyecto: `python -m http.server 8000`. Abre `http://localhost:8000/admin.html`. Configura y guarda vista previa; abre `index.html?preview=1` para ver cambios. Para publicar, descarga `config.json` y `productos.json`, reemplaza los archivos en `data/` y sube **solo** `index.html` y `data/` (más las imágenes locales que uses). GitHub Pages no permite guardar cambios directamente desde un administrador estático.
