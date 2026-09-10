# PFI — Planificador Familiar Inteligente

Versión 0.9.26.

La v0.9.26 conecta **Eroski** y **Carrefour** al editor del comparador: se
busca en su catálogo, se elige una vez el producto exacto y PFI puede renovar
su precio conservando el último valor válido si la fuente no responde. Eroski
utiliza un índice completo de sus categorías públicas, versionado y renovado a
diario para no depender de una consulta en vivo desde Vercel. Lidl y los
comercios del barrio siguen disponibles como respaldo manual.

En **Menú**, el botón **Niños fuera este finde** aplica la excepción a sábado y
domingo de una vez. El menú no cambia, pero las raciones, la compra y el
presupuesto descuentan a los dos niños. Además, las cenas evitan arroz, pasta,
fideuá, cuscús y equivalentes; se conserva la pizza familiar del viernes.

La v0.9.25 incorpora en **Compra** un comparador para Mercadona, Lidl,
Carrefour, Eroski y comercios del barrio. Iguala formatos, descuenta el stock,
distingue envases cerrados de venta al peso y propone la combinación más barata
sin superar el número de paradas elegido.

La v0.9.24 amplía el plan a seis semanas sin repetir preparaciones principales,
añade vainas, menestra y más cenas de verduras, y conserva todos los platos con
pimiento rojo o tricolor.

En la v0.9.20 vuelve **Cuenta y sincronización**. La pestaña Cuenta permite
iniciar sesión, ver las cuentas de la familia y elegir de forma explícita entre
guardar este móvil en la nube o traer la copia familiar. PFI protege antes el
estado local, no mezcla dos copias a escondidas y excluye las credenciales de
los JSON de seguridad.

PFI conecta el menú familiar con recetas, productos reales de Mercadona, compra semanal, despensa e inventario.

En la v0.9.19, cada producto de la compra explica cómo se obtiene su cantidad: necesidad del menú, equivalencia con el formato comercial, stock disponible, envases que se compran y sobrante posterior. La compra semanal muestra además el arrastre de sobrantes entre semanas, incluidos los productos que ya quedan cubiertos sin volver a comprarlos.

En la v0.9.13, los postres proceden únicamente del recetario: las recetas con fruta rotan en las comidas y las recetas con yogur rotan en las cenas. Los domingos siguen sin postre por defecto y pueden editarse de forma puntual. La compra reconoce correctamente Carne, Pollo, Pescado y Marisco, y las asociaciones cuentan con copia y recuperación automática desde la despensa.

## Puesta en marcha

```bash
npm install
npm run dev
```

## Comprobaciones

```bash
npm run typecheck
npm run build
npm run test:conversiones
npm run test:aprendizaje
npm run test:menu-mensual
npm run test:presupuesto
npm run test:v0913
npm run test:rescate-json
npm run test:copias
npm run test:v0925
npm run test:v0926
```

## Datos y copias

La sección **Perfil → Datos y copias** muestra el estado del recetario, las asociaciones,
la despensa y el plan mensual. PFI conserva hasta ocho estados automáticos distintos en
el propio dispositivo. También permite descargar una copia completa para cambiar de móvil.

Antes de restaurar, PFI revisa el archivo y enseña cuántas recetas, asociaciones, productos
y semanas contiene. La restauración conserva las claves locales más nuevas y crea primero
una copia automática del estado actual. Las copias completas antiguas de formato 2 siguen
siendo compatibles.


## Catálogo y precios de Mercadona por zona

PFI está configurado para el código postal **48950** en `scripts/config-mercadona.json`. Al ejecutar `npm run dev` o `npm run build`, PFI comprueba automáticamente la antigüedad del catálogo. Si han pasado 24 horas, intenta descargar los productos disponibles y sus precios antes de arrancar. Si Mercadona no responde o no hay conexión, la aplicación se abre con el último catálogo guardado.

También puedes forzar la actualización manualmente:

```bash
npm run actualizar-mercadona
```

Mientras PFI está abierto con `npm run dev`, la pestaña **Catálogo** incluye el botón **Actualizar todos los precios ahora**. Ese botón ejecuta el actualizador local y vuelve a cargar el catálogo sin borrar asociaciones, favoritos ni despensa. La futura aplicación instalable necesitará incluir este pequeño servicio local o un backend para conservar la misma función fuera de Vite.

En Windows también puedes hacer doble clic en `ACTUALIZAR_MERCADONA.cmd`. Al terminar, recarga PFI con `Ctrl+F5`. El catálogo guarda la fecha, el código postal y el almacén que Mercadona haya asignado. La actualización sustituye los precios y la disponibilidad del archivo local; no borra asociaciones, favoritos ni datos de despensa guardados en el navegador.

## Comparador de precios

El comparador parte del código postal **48950** y mantiene activas Mercadona,
Carrefour, Eroski y Lidl. Mercadona usa las asociaciones del catálogo completo
de PFI. En Eroski y Carrefour se busca desde el propio comparador y se vincula
el producto exacto; PFI renueva las vinculaciones como máximo una vez al día.
El catálogo de Eroski se genera desde la paginación pública de sus categorías y
se actualiza diariamente mediante una tarea automática. Sus precios corresponden
a la tienda online de referencia y pueden variar al elegir la entrega. Lidl y
los comercios locales aceptan precios comprobados por la familia. Si Carrefour
bloquea temporalmente una consulta, el editor mantiene la entrada manual y el
último precio válido. PFI nunca rellena huecos con cifras estimadas.

Para regenerar el índice de Eroski manualmente:

```bash
npm run actualizar-eroski
```

Los precios dejan de intervenir cuando superan la vigencia configurada sin
poder renovarse.
El resultado ofrece tres criterios: una sola tienda, ahorro absoluto producto a
producto y compra práctica con un máximo de establecimientos y un ahorro mínimo
para justificar otra parada. La configuración y los precios forman parte de la
sincronización familiar y de las copias JSON, pero las credenciales de sesión no.

## Flujo principal

1. En **Recetas** o **Compra**, pulsa **Asociar** para elegir el producto exacto sin salir de la pantalla. También puedes gestionar asociaciones desde **Catálogo**.
2. En **Despensa**, configura el stock objetivo, la frecuencia y el tipo de producto.
3. En **Compra**, alterna entre la compra semanal y la mensual desde cualquier semana del menú.
4. Marca los productos comprados y pulsa **Guardar en inventario** para registrar las entradas.
5. El panel **Inicio** muestra el menú del día, lo que hay que preparar, las próximas reposiciones y los presupuestos correspondientes a la semana activa. Sus tarjetas abren directamente la pestaña correspondiente.

Consulta `CHANGELOG.md` para ver todos los cambios de la v0.9.9.


## Plan automático de postres

Los postres del menú se obtienen exclusivamente de las recetas marcadas como **Postre**. PFI detecta las recetas de fruta para las comidas y las recetas con yogur para las cenas, rotándolas durante la semana. Los postres de otro tipo siguen disponibles para seleccionarlos manualmente. Los domingos quedan sin postre por defecto, aunque cada domingo se puede editar de manera independiente.


## Edición de recetas

En la pestaña **Recetas** puedes crear recetas y editar nombre, categoría, ingredientes, cantidades, unidades y secciones. Los cambios se guardan en el navegador y se aplican automáticamente al menú y a Compra.


## Recetas combinables

Las recetas compuestas se han separado en platos independientes. En **Menú** puedes añadir varios platos a la misma comida o cena y crear combinaciones como **Lomo + Patatas**, **Salmón + Ensalada** o **Pizza BBQ + Pizza 4 quesos**. La lista de la compra suma automáticamente los ingredientes de toda la combinación.


## Cantidades reales de compra

La pestaña **Compra** mantiene visibles las cantidades de las recetas y calcula después cuántas piezas o envases hacen falta. Por ejemplo, 2,5 tomates se muestran como necesidad real y se redondean a 3 piezas para comprar. En productos vendidos por peso, el coste se marca como aproximado.

## Reposición más clara

**Despensa** distingue entre productos controlados, productos que faltan en reposición automática y perecederos o productos manuales que se calculan desde el menú.


## Conversiones aproximadas

Cuando una receta indica piezas pero el producto se vende en una bolsa por peso, PFI usa un peso medio aproximado. Por ejemplo, una zanahoria equivale inicialmente a unos 100 g. Para el arroz, un vaso estándar equivale a unos 180 g, un vaso pequeño a 150 g y uno grande a 200 g. Estos valores son una base inicial y se podrán ajustar más adelante.


## Cantidades para la familia

PFI usa el perfil familiar para estimar las raciones principales de cada receta. Los niños se ponderan según su edad y el bebé queda fuera hasta que se active su inclusión. Las cantidades automáticas aparecen identificadas en **Recetas**, se pueden editar manualmente y se recalculan al guardar cambios en el perfil.

Como referencia inicial, con 2 adultos y niños de 12 y 6 años se calculan 3,4 raciones adultas equivalentes; el filete de ternera queda aproximadamente en 650 g. Estas cifras son una base ajustable, no una recomendación nutricional exacta.




## Plan mensual inteligente

PFI incluye desde el primer arranque cuatro semanas distintas. Cada semana mantiene las reglas familiares acordadas —hamburguesa, perritos o kebab el viernes y comida fuera el domingo— y reparte legumbres, pescado, pollo o pavo, huevos, cremas, pasta y carne para evitar repetir siempre el mismo patrón.

En **Menú** puedes cambiar de semana, consultar un indicador práctico de equilibrio y generar un mes nuevo. Este indicador comprueba variedad y frecuencias del plan; no sustituye una valoración nutricional profesional. El generador conserva la estructura equilibrada y, cuando ya dispone de valoraciones suficientes, prioriza alternativas del mismo grupo que hayan funcionado bien en la familia. **Compra**, **Inicio** y el presupuesto utilizan siempre la semana que esté activa.

## Menú diario inteligente

La pantalla **Menú** muestra un día cada vez para evitar el aspecto recargado de la cuadrícula anterior. El selector superior permite cambiar de día y la vista rápida inferior conserva el resumen completo de la semana. Cada comida diferencia el plato principal de los complementos, mantiene la edición múltiple y propone combinaciones aprendidas.

Después de comer puedes indicar **Gustó**, **Sobró**, **Faltó** o **No gustó**. Estas valoraciones mejoran las recomendaciones, evitan insistir con combinaciones rechazadas y ajustan gradualmente las cantidades automáticas de las recetas cuando sobra o falta comida. PFI también propone complementos por uso anterior y, mientras todavía tiene pocos datos, mediante reglas contextuales sencillas.

## Diseño renovado

La v0.9.2 refuerza la identidad visual con fondos crema y arena, encabezados en verde profundo, tarjetas con más contraste y una navegación activa más visible. Inicio conserva solo la información esencial, mientras que el menú semanal destaca cada día con una cabecera propia, bloques diferenciados de comida y cena, chips más claros y mejor adaptación móvil. Las pantallas de Compra, Despensa, Recetas, Catálogo y Perfil comparten ahora la misma jerarquía visual.

## Aprendizaje inicial

PFI empieza a aprender de dos tipos de decisiones:

- Las combinaciones que repites en **Menú**, para mostrarlas después como sugerencias rápidas.
- Las cantidades que corriges manualmente en **Recetas**, para afinar los próximos cálculos automáticos de ese ingrediente y esa receta.

El aprendizaje se guarda localmente en el navegador. Desde **Perfil** puedes consultar cuántas elecciones y ajustes ha observado y reiniciarlo sin borrar menús, recetas ni despensa.

## Presupuestos

La Semana 1 muestra presupuesto semanal, presupuesto mensual de despensa y total acumulado. Las semanas siguientes muestran el presupuesto semanal y el total acumulado del mes.


## Novedades de la v0.9.8

- Comprobación automática de catálogo y precios al iniciar PFI, como máximo una vez cada 24 horas.
- La app conserva el último catálogo si Mercadona no responde o no hay conexión.
- Fruta y yogures editables: tipo, variedad concreta y cantidad por persona.
- Compra agrupa las variedades elegidas y calcula las unidades para toda la familia.
- Inicio y el resumen semanal muestran el postre concreto.
- Editor de postres adaptado a móvil.

## Novedades de la v0.9.6

- Postres alternos para comida y cena.
- Producto editable pulsando su fotografía.
- Acceso directo a Mercadona.
- Listas filtradas desde los resúmenes de Despensa.
- Recomendaciones de inventario basadas en consumo real.
- Resumen semanal completo y adaptación móvil reforzada.


## Novedades de la v0.9.9

- Plan mensual automático de postres con rotación configurable.
- Media sandía calculada como cuatro postres familiares.
- Eliminación completa de recetas y retirada automática del menú.
- Coste proporcional por ingrediente y coste aproximado total de cada receta.
- Preparación del domingo conectada con el lunes de la semana siguiente.
- Igual visibilidad para plato principal, segundo plato y acompañamientos.
- Botón de actualización completa del catálogo y los precios.
