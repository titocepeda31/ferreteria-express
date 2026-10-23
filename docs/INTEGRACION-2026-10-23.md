# Integración de Vitriniapps — 23 de octubre de 2026

## Alcance

Integración autorizada del catálogo público, cotizaciones y administración de reservas. Mercado Pago permanece excluido; no se fusiona su rama ni se modifican sus funciones o secretos.

Bases revisadas:
- Catálogo: `2f8f809b4dfd26b3761b57c7e08446598148454d`, rama `feature/solicitudes-cotizacion-pedidos`.
- Administrador: `b33ccf8b18942245461a020c37f3bb8bb7e0abc6`, rama `feature/solicitudes-reservas-experimental`.

## Resultado funcional

- Buscador de estadías compartido entre inicio y catálogo completo, calendario sincronizado con fechas, selección por huéspedes y adicionales.
- Solicitudes públicas con contacto, importes persistidos e idempotencia mediante el contrato V2 existente.
- Recuperación de comprobante por ID y clave guardados, sin una nueva escritura, incluso después de recargar la misma pestaña. Conserva el contacto original.
- Reservas del administrador exclusivas del titular, confirmación/rechazo mediante RPC existente, comprobantes y preparación manual de mensajes WhatsApp.
- Listado de reservas de diez en diez con filtros por llegada, estado, nombre y código; calendario mensual y resumen anual de doce meses con noches reservadas y bloqueadas.
- Cotizaciones comerciales recuperadas de la otra rama e integradas en Mi catálogo. Lectura de diez en diez, filtro por negocio, control de titular, exclusión de decisiones simultáneas y errores explícitos. Compartir abre el selector de conversación de WhatsApp.
- Editor de productos con galería de imágenes por enlaces y separación entre oferta principal y adicionales.
- Se conservan administración móvil, invitaciones, categorías por voz, importaciones, apariencia, QR y métricas existentes.

## Verificación ejecutada

- Catálogo: 46 pruebas aprobadas, incluidas 12 de recuperación simulada. Se actualizaron fixtures antiguos para las APIs del navegador, el timeout de inicialización y la preparación de WhatsApp previa al registro. No se eliminaron pruebas.
- Administrador: 86 pruebas de modelo/contrato/transporte aprobadas, sin omisiones. Incluye tres pruebas nuevas de cotizaciones usando el SDK real con HTTP simulado y exclusión de operaciones.
- Componentes React de reservas: 15 pruebas aprobadas más navegación SSR para comercio/alojamiento.
- Compilación Vite revisada también con configuración de Supabase presente (valores de validación), para evitar validar únicamente la pantalla sin configurar.
- Inspección SQL de lectura en `catalogo_digital`: solicitudes con SELECT de authenticated solamente; ocupación con SELECT/INSERT/DELETE y políticas de escritura limitadas a bloqueos; sin TRUNCATE/UPDATE directo. RPC de confirmación limitada a authenticated y valida propietario. Exclusión GiST por producto e intervalo `[llegada,salida)` presente. V2 rechaza cantidad nula y disponibilidad rechaza fechas nulas. Comprobante público requiere ID y clave.
- No se modificaron datos de clientes, precios, esquema, permisos ni funciones de Supabase durante esta integración.

## Límites y seguimiento

Integración de código no equivale a certificar el piloto comercial. Siguen pendientes: Android físico y gestos/teclado, dos sesiones de propietarios reales por HTTP, confirmaciones simultáneas con conexiones independientes y fallos reales de red/sesión. Las pruebas simuladas no sustituyen esas evidencias.

La recuperación de comprobantes usa sessionStorage y cubre la misma pestaña; no se promete recuperación desde otro dispositivo. El RPC heredado `booking_public_request` sigue accesible; revisar consumidores externos antes de retirarlo. Los documentos anteriores de auditoría son evidencia histórica y no describen por sí solos el estado vigente.

No se incorpora el antiguo calendario que inserta/elimina reservas directamente. Se conserva la interfaz revisada que confirma mediante RPC y presenta ocupación de solo lectura. Tampoco se incorpora el interruptor antiguo de rotación en el mismo día: el contrato actual ocupa noches con salida exclusiva y no implementa esa política alternativa.

Pendiente de completar con enlaces de PR y verificación de despliegue al publicar.
