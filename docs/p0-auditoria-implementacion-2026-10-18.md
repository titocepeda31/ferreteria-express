# P0 — Estado de implementación y contrato pendiente (18-10-2026)

Rama experimental únicamente. No se ejecutaron migraciones ni escrituras de prueba en Supabase.

## Verificación contra auditoría
- C1: booking_public_request(p_product,p_start,p_end) no recibe huéspedes, contacto, tarifa ni extras. Confirmado en controlador actual. **Bloqueante**: la UI permite consultar disponibilidad, pero no registrar reservas incompletas.
- C2: la llamada no acepta idempotency_key. **Pendiente de migración aprobada**; no es seguro habilitar escritura con doble clic/reintento.
- O4/C9: el demo carece de WhatsApp. Se evita crear cotización sin destinatario; compartir reserva no genera enlace sin número.
- C3: se añade timeout de 15 s y se invalida verificación al cambiar campos. Falta cancelación explícita de consultas concurrentes.
- C4: exclusión GiST y transacción de confirmación existentes; no modificadas ni sometidas a prueba de concurrencia.
- C8: falta inventariar y versionar definiciones activas de RPC en migraciones; sin ejecutar DDL.
- P0.5: falta recuperar el fixture y correr suite en entorno reproducible. No se declara QA aprobado.

## Contrato propuesto (NO aplicado)
1. Solicitud con idempotency_key único por negocio, producto y borrador; retorno de misma solicitud ante reintentos.
2. Capturar y validar en servidor huéspedes enteros <= capacidad, fechas, máximo noches, negocio/producto activos, nombre/contacto mínimo, tarifa referencial y snapshot de precio.
3. Persistir extras con producto, cantidad, unidad, precio y vínculo a la estadía; un alojamiento por solicitud en MVP.
4. Estado pendiente, timestamps, código opaco; revalidar disponibilidad al confirmar con exclusión transaccional.
5. Recuperar por clave ante timeout sin crear una segunda solicitud; compartir WhatsApp solo tras registro y con destinatario válido, o permitir copiar resumen.
6. RLS por negocio y roles, nunca exponer datos personales en disponibilidad pública.

## Pruebas bloqueadas por falta de entorno de datos aislado y migración aprobada
- Reintento/recarga/doble clic de reservas; capacidad excedida del lado servidor; persistencia y recuperación de extras y contacto.
- Confirmaciones concurrentes, aislamiento de negocios y roles.
- Regresión real de UI móvil con navegador y pruebas automatizadas.

## No promocionar reservas todavía
El registro de reservas permanece intencionalmente pausado en el frontend experimental. El agregado rápido de productos cuantificables y el carrito original permanecen sin cambios. La unificación completa de estadía y adicionales necesita el contrato servidor antes de habilitar la escritura.
