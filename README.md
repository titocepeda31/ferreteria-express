# Catálogo público

Frontend público de catálogos multinegocio.

## Funcionamiento actual

El catálogo consulta Supabase usando:

- URL pública del proyecto.
- Publishable key o anon key.
- El slug de la tienda.

La tienda predeterminada es:

```
ferreteria-demo
```

También se puede seleccionar otra tienda mediante:

```
?catalogo=otro-slug
```

Ejemplo:

```
https://titocepeda31.github.io/ferreteria-express/?catalogo=ferreteria-demo
```

El catálogo obtiene desde Supabase únicamente campos públicos de:

- `businesses`
- `categories`
- `products`

Los productos se filtran por `business_id` y `is_active`.

## Publicación

GitHub Pages publica el contenido de este repositorio. Los datos de la tienda no se editan directamente en GitHub: se administran desde `catalogo-admin` y se leen desde Supabase.

Los archivos `data/config.json` y `data/productos.json` se mantienen como respaldo compatible y fallback local.

## Seguridad

Es normal que la Publishable key aparezca en este frontend público. La protección depende de RLS y de las políticas públicas de lectura.

Nunca publicar:

- `service_role`
- claves secretas
- contraseñas
- tokens de GitHub o Vercel
- tokens de invitación
- JWT de usuarios

## Identificación de la tienda

El UUID de `businesses` es interno. El `slug` es público y debe mantenerse estable si se utiliza en un QR.

Los cambios de productos, precios, imágenes o diseño no modifican la URL. Cambiar el dominio o el slug sí puede afectar enlaces impresos.

## Limitaciones actuales

Este frontend no incluye todavía:

- Inventario automático.
- Reservas.
- Pagos online.
- Generación de QR desde el administrador.
- Asociación automática de dominios propios.

Para la documentación de migración, seguridad y operación, revisar el archivo [OPERACION-Y-MIGRACION.md](https://github.com/titocepeda31/catalogo-admin/blob/main/docs/OPERACION-Y-MIGRACION.md).
