# Revisión visual y UX del catálogo público

Fecha: 15 de octubre de 2026. Base: `9ddb78bda5f45cd3264fb6b36640f50ec17e5127`.

## Alcance y arquitectura

El administrador `catalogo-admin` enlaza al frontend público de este repositorio.
El público es HTML, CSS y JavaScript sin compilador ni package.json. Se modifica
solo su interfaz; no hay cambios en el administrador, API, autenticación, tablas,
datos de productos, precios ni generación del mensaje de WhatsApp.

## Problemas y correcciones

| Problema | Corrección |
| --- | --- |
| Nombres limitados a dos líneas, con posibilidad de ocultar medidas | Nombre completo, salto de línea y protección contra palabras extensas; conserva dos columnas móviles |
| Foto cuadrada y separación de 38 px en ficha móvil | Contenedor de imagen proporcional, entre 180 y 300 px, `contain` y separación de 20 px; imagen completa |
| Categorías cortadas, precios de oferta y acciones con distintas alturas | Categorías multilínea, precios flexibles y acciones alineadas abajo; objetivos de 44 px |
| Barra móvil de 78 px más zona segura | 64 px más zona segura; espacio inferior medido con ResizeObserver y reserva al final del documento |
| Header de altura variable y anclas | Espacio de desplazamiento vinculado a la altura real del header; nombre visible también junto a un logo |
| Contacto general ambiguo | Texto «Contactar», nombre accesible «Contactar a la tienda por WhatsApp»; conserva destino |
| Modal con todo el contenido desplazable y controles de 32/36 px | Solo la lista desplaza; cierre y acciones permanecen fuera de la lista; controles de 44 px |
| Foco perdido al cambiar cantidades o eliminar filas | Foco restaurado a la acción equivalente o a una acción disponible |
| Navegación por teclado fuera del modal | Fondo inert conservando su estado previo, ciclo Tab/Shift+Tab, Escape y retorno al botón de apertura |
| Inicio/contacto con espacio vertical mejorable | Reducción moderada de padding móvil; footer y «Volver arriba» separados de la barra |

Estilos en `catalog-ux.css`, cargados después del tema existente. Sin dependencias,
animaciones ni librerías nuevas. Se conserva la lógica de cantidades y precios.
La cotización actual enumera productos y cantidades; **no calcula subtotal ni total**.

## Validación

- Sintaxis del JavaScript inline: correcta mediante `vm.Script` de Node.
- `node --test catalog-ux.test.cjs`: 4/4. Cantidades enteras/fraccionarias y mensaje,
  apertura/cierre/foco/fondo, cotización vacía/registros inválidos, restauración de foco.
  Estas pruebas usan un DOM simulado; la comprobación visual se hizo aparte.
- `node --test catalog-analytics.test.cjs`: 5/5. Regresión dirigida porque se tocaron
  los textos del contacto y la interacción del modal, conservando sus identificadores.
- `git diff --check`: correcto.
- No existe comando de build en este frontend estático.

### Navegador real

Chrome remoto. Comparaciones mediante iframes con viewports de 320, 375 y 430 px
de ancho y 760 px de alto. El scrollbar clásico de escritorio reserva 15 px,
por lo que la zona de contenido es aún más estrecha (305/360/415 px).
No es una prueba sobre teléfonos físicos ni una emulación del navegador Safari.

| Vista/recorrido | Resultado |
| --- | --- |
| Ficha 1034, antes/después en 320, 375 y 430 px | Nombre completo e imagen sin recortar, menos espacio vertical; sin overflow horizontal |
| Catálogo de dos columnas a 320 px | Nombres/medidas legibles, precio normal/oferta/consultar y botones alineados |
| Inicio y destacados a 430 px | Diseño conservado y dos columnas legibles |
| Final de inicio a 430 px | Contacto, horarios y footer legibles; «Volver arriba» separado de la barra |
| Cotización a 375 px | Agregar, aumentar, disminuir; Tab/Shift+Tab y Escape con retorno al botón original |
| Cotización a 320 px, ocho productos | Lista con 1098 px de contenido en área de 433 px; cierre y botones inferiores visibles; sin overflow horizontal |
| Quitar y vaciar a 320 px | Siete filas tras quitar; estado vacío y botones de envío/vaciado ocultos al vaciar |
| Ficha y modal en escritorio, ancho de ventana 1363 px | Dos columnas y acciones utilizables; sin overflow horizontal |
| Enlace de WhatsApp de la cotización | Número y texto con productos/cantidades correctos, sin enviar mensajes reales |

Las capturas están en [screenshots](screenshots/): comparativas 320/375/430,
modal largo a 320 y ficha de escritorio. La pareja antes/después usa la misma
versión de código y datos del catálogo; las cantidades pueden variar por las
interacciones de prueba y el almacenamiento local compartido de la comparación.

Vista aislada de pruebas: proyecto Vercel `catalogo-publico-ux-review`, sin variables
privadas ni conexión Git a producción. La primera carga creó el proyecto y Vercel
la clasificó como producción **de ese proyecto de revisión nuevo**; la segunda es
un preview (`target: null`). No se modificó GitHub Pages ni el despliegue del catálogo
real. Los archivos de comparación existen solo en esa vista de pruebas.

## Datos que necesitan decisión

Estos nueve registros presentan discordancias en `data/productos.json`, el respaldo
local versionado. Los identificadores son públicos de catálogo, no UUID de la BD.
No se modificó ningún texto. La ficha conectada del **1034** también se observó en
navegador y conserva «Viga 2 x 6» y la referencia a Muena. Los otros ocho deben
contrastarse con sus registros conectados antes de corregirlos.

| ID | Nombre resumido | Descripción comienza con |
| --- | --- | --- |
| 1033 | Pino dimensionado 1 x 8, 3.20 mts | Viga 2 x 4 |
| 1034 | Pino dimensionado 1 x 10, 3.20 mts | Viga 2 x 6 |
| 1035 | Pino dimensionado 1 x 2, 3.20 mts | Viga 2 x 5 |
| 1038 | Pino dimensionado 1 x 6, 3.20 mts | Viga 2 x 8 |
| 1045 | viga cepillada largas 4, 4.88, 6 mts | Cielo Cepillado 2, 44 mts |
| 1055 | Pino dimensionado 1 x 5, 3.20 mts | Pino Viga 2 x 5 |
| 1056 | Pino dimensionado 2 x 8, 3.20 mts | Pino Viga 2 x 6 |
| 1057 | Pino dimensionado 2 x 10, 3.20 mts | Pino Viga 2 x 7 |
| 1058 | Pino dimensionado 1 x 4, 3.20 mts | Pino Viga 2 x 8 |

Además, 144 de las 145 descripciones del respaldo mencionan «Maderas y Ferreterías
Muena»; el ID 1410 no tiene descripción. Confirmar si esa atribución es intencional
en Demox y proporcionar los textos correctos. El título comercial también conserva
«contruccion», y el respaldo contiene Instagram con prefijo `htttps://`: se informan
como datos comerciales sin corregirlos automáticamente.

## Límites y pendientes

- Validar zona segura en dispositivos físicos iOS/Android y alturas extremas/teclado virtual.
- No se hizo una auditoría exhaustiva de lectores de pantalla ni de imágenes de los 145 productos.
- No se agregaron cálculos de importes: requieren definir cómo tratar ofertas,
  productos sin precio, precios «desde», unidades y alcance del total.
- Revisar y aprobar el PR antes de fusionarlo: `main` publica en GitHub Pages.
