# Mejoras visuales con temas por tienda

15 de octubre de 2026. Base: `4e5c8fc4639a318057b14ba87352a5ad642fd700`.
Rama: `fix/store-theme-ui`. Sin fusionar ni desplegar.

## Cambios

- «+ Agregar»: 44 px de alto, tipografía de 14 px/600, padding vertical de 6 px.
  Mantiene el redondeado existente y el área táctil de 44 px.
- Redes: tarjeta independiente con título «Síguenos en redes», radio de 16 px y
  pills con iconos SVG y nombres. Flex-wrap y separación de 8 px. Conserva los
  enlaces configurados y el filtro HTTP/HTTPS existente; no muestra redes vacías
  o inválidas. La tarjeta completa se oculta si no hay redes válidas. El frontend
  actual configura Instagram, Facebook y TikTok; no se añaden campos al backend.
- Footer: superficie derivada del tema, padding de 22 px, nombre, descripción
  funcional del catálogo y contacto discreto solo si está configurado. Reutiliza
  el destino actual de WhatsApp; si no existe, usa teléfono o correo configurados.
  No duplica redes. Reserva espacio lateral para «Volver arriba».
- «Mi cotización»: se mantiene visible, inicialmente con contador 0 y estado
  discreto `is-empty`. Con productos usa la variante principal y destaca el
  contador. Ambos estados comparten altura de 50 px, padding y borde de 1 px;
  no se cambia su posición ni el mecanismo de reserva de espacio inferior.
- «Volver arriba»: círculo de 46 px y colores/sombra derivados del tema. Mantiene
  separación respecto al dock móvil y su posición existente en escritorio.

No se cambian el administrador, la frase ni los estilos de Productos destacados,
los cálculos, el texto de WhatsApp, los datos o las configuraciones de negocios.
Sin dependencias, tokens nuevos ni sistema de temas paralelo.

Los nuevos estilos usan exclusivamente los tokens existentes `--primary`,
`--primary-hover`, `--primary-contrast`, `--primary-soft`, `--background`, `--ink`
y `--border`. No introducen colores hexadecimales ni RGB/HSL fijos. Los valores
de la tabla siguiente son configuraciones públicas observadas, no valores
añadidos a los componentes.

## Validación dirigida

Configuraciones públicas consultadas en modo solo lectura mediante la misma API
del catálogo; no se hicieron escrituras. Copias temporales fuera del repositorio.

| Tienda | Slug | Tema existente | Redes válidas | Contraste principal | Contraste hover |
| --- | --- | --- | --- | --- | --- |
| EEDO | eedo | #17733a | 3 | 5,92:1 | 7,47:1 |
| Plantas Bortega Demo | plantas-bortega | #287a4b | 0 | 5,28:1 | 6,75:1 |

El contraste texto/superficie suave es 13,14:1 y 13,26:1, respectivamente; el de
texto/fondo existente es 14,22:1. Cálculo sRGB a partir de los tokens reales,
incluyendo la mezcla actual de `--primary-soft` y `--primary-hover`; no es una
medición de píxeles ni una auditoría de todos los temas posibles.

- `catalog-ux.test.cjs`: 11/11, incluida la transición vacío/con productos/vacío
  manteniendo visible el acceso y conservando contador/cálculos/mensaje.
- `tests/store-theme-ui.test.cjs`: 5/5 con dos snapshots públicos de tiendas
  distintas. Renderizado de enlaces/nombres/iconos, redes inválidas/ausentes,
  contacto condicional y ausencia de cambios en configuraciones; contraste de
  ambos temas y comprobación de que los nuevos estilos no tienen colores fijos.
  Sin snapshots, quedan disponibles las cuatro comprobaciones genéricas.
- JavaScript inline compilado con `vm.Script`: correcto.
- `git diff --check`: correcto.
- Comparación con la base: funciones de cálculo y bloque generador de WhatsApp
  idénticos. No se instala ni se ejecuta un compilador: frontend estático.

### Límite de la revisión visual

Se revisaron las reglas responsive y los tamaños declarados en el código. Las
pruebas de DOM son simuladas: no equivalen a comprobar layout, hover, foco o
desbordamientos en un navegador real. El navegador remoto disponible rechaza
abrir la copia local por su política de URL. No se intentó eludir esa política
ni desplegar un preview sin autorización. Por ello **queda pendiente la revisión
visual de estos cambios en móvil y escritorio**; no hay capturas nuevas.

Antes de publicar, comprobar 320/375/430 px y escritorio en ambas tiendas:
pills y nombres largos sin overflow; botones Agregar y estados del dock con
dimensiones constantes; contacto/footer y Volver arriba sin superposición;
foco visible y enlaces accesibles con teclado.
