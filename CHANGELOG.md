# v0.9.16 — Calendario, excepciones y cantidades reales

- La compra mensual cuenta únicamente los días que pertenecen realmente al mes, también en las semanas parciales.
- La compra mensual aparece solo en la primera semana y reúne los productos no frescos de todo el mes.
- La compra semanal queda reservada a fruta y verdura, carne y pescado.
- Los envases sobrantes se proyectan entre semanas para no volver a comprar mientras quede cantidad suficiente.
- Las excepciones quedan conectadas al menú, a Inicio y a la compra semanal y mensual.
- Se puede excluir una comida, una cena, un día completo o una semana completa.
- La compra vuelve a mostrar la cantidad total necesaria de cada ingrediente y cuántos envases hay que comprar.
- El inventario admite cantidades decimales y permite marcarlas como aproximadas.
- Las cantidades fijadas en cabezas y dientes de ajo se conservan y se suman con una conversión común.
- Nueva prueba de regresión para calendario, excepciones y ajo.

# v0.9.15 — Mejora de fluidez y rendimiento

- Las pantallas secundarias se cargan solo al abrirlas, reduciendo el peso inicial.
- La sincronización de asociaciones y despensa se ejecuta cuando el navegador está libre.
- El catálogo de Mercadona deja de descargarse varias veces a la vez y aprovecha la caché.
- Las asociaciones se mantienen en memoria para evitar lecturas repetidas de localStorage.
- El cálculo de compra resuelve los productos asociados en una única operación.
- En móvil se eliminan desenfoques y fondos fijos costosos que provocaban tirones al desplazarse.
- Se reducen transformaciones y efectos hover innecesarios en pantallas táctiles.

# v0.9.14 — PWA instalable

- Añadido manifiesto PWA e iconos 192/512 px.
- Añadido service worker para instalación y uso básico sin conexión.
- Añadidas etiquetas móviles y compatibilidad con “Añadir a pantalla de inicio”.
- No se modifica el actualizador local de Mercadona.

# PFI v0.9.13

- Recuperación de asociaciones desde copia local y desde productos ya presentes en la despensa, sin elegir automáticamente cuando existen varias coincidencias posibles.
- Copia de seguridad automática de las asociaciones cada vez que se modifican.
- Eliminación de las opciones de postre base en Menú: el selector muestra únicamente «Sin postre» y recetas del recetario.
- Regla automática estricta: recetas de fruta en la comida y recetas con yogur en la cena.
- Domingos sin postre por defecto, manteniendo las excepciones manuales puntuales.
- Clasificación de compra corregida para ingredientes con sección Carne, Pollo, Pescado o Marisco, incluso cuando todavía no tienen producto asociado.
- Nueva sección de Aperitivos y mapa completo de las secciones actuales del catálogo de Mercadona.

# PFI v0.9.12

- Corregido el contraste del total acumulado en Inicio: mantiene su fondo oscuro aunque sea la segunda tarjeta y la cifra aparece destacada sobre una superficie clara.
- Encabezados de Menú y Recetas mucho más compactos, especialmente en móvil.
- Los postres de tipo `postre` se toman automáticamente del recetario, sin configurar una lista separada.
- Nueva alternancia por huecos: fruta en las comidas y yogur en las cenas se intercalan con los postres del recetario, evitando dos postres de receta seguidos el mismo día.
- Las ediciones puntuales de postre quedan marcadas como manuales y se conservan cuando cambia el recetario; los domingos siguen sin postre por defecto.
- La lista de compra se agrupa usando la sección real del producto de Mercadona y se ordena por Fruta y Verdura, Charcutería y Quesos, Carnicería, Pescadería, Lácteos y Huevos, Panadería y el resto de secciones.
- Los productos dentro de cada categoría aparecen ordenados alfabéticamente.
- Migración automática desde v0.9.11 para aplicar la nueva alternancia sin perder excepciones manuales posteriores.

# PFI v0.9.11

- El selector de ingredientes vuelve a mostrar el catálogo completo, sin priorizar visualmente la despensa.
- Todos los productos del catálogo asociados a ingredientes de recetas se incorporan automáticamente a la despensa.
- Las acciones del recetario, incluida «Nueva receta», quedan fijas al desplazarse.
- El selector de semana se sitúa justo encima del selector de días y ambos quedan fijos durante la navegación del menú.
- «¿Cómo salió?» aparece debajo del postre correspondiente de comida o cena.
- Los postres alternan por días: fruta en la comida y yogur en la cena, seguidos al día siguiente por postres del recetario.
- Los domingos quedan sin postre por defecto, manteniendo la edición manual para excepciones puntuales.
- Migración única del plan guardado a la nueva alternancia, sin sobrescribir posteriores ediciones manuales.

# PFI v0.9.10

- Los postres pasan a ser recetas reales de tipo `postre`.
- El menú permite elegir y rotar postres desde el recetario.
- La compra suma los ingredientes de los postres igual que los de cualquier plato.
- Al crear o editar una receta, el selector muestra primero los productos de la despensa.
- Los productos elegidos desde el catálogo al crear una receta se añaden automáticamente a la despensa.
- Migración automática desde la configuración de postres de v0.9.9.

# PFI v0.9.9

- Nuevo plan mensual automático de postres: fruta y yogur alternos sin rellenar cada día.
- Rotación configurable de frutas y yogur habitual, aplicable a las cuatro semanas con un botón.
- La sandía se trata como producto de rendimiento familiar: media sandía cubre aproximadamente cuatro postres para toda la familia.
- Los postres diarios siguen pudiéndose modificar como excepción, pero el editor queda plegado para no recargar la pantalla.
- Las recetas se pueden eliminar desde la tarjeta o desde el editor; al borrarlas también desaparecen del menú mensual.
- Recetas muestra el coste proporcional realmente usado de cada producto y el total aproximado de la receta, no solo el precio del envase completo.
- “Preparar para mañana” se recalcula entre semanas: el domingo usa correctamente el lunes de la semana siguiente.
- El segundo plato y los acompañamientos tienen ahora la misma presencia visual que el plato principal.
- Nuevo botón “Actualizar todos los precios ahora” en Catálogo, conectado al actualizador local de Mercadona.
- Mejoras responsive en el plan de postres, las tarjetas de platos y los controles de edición.

# PFI v0.9.8

- Actualización automática del catálogo y los precios de Mercadona al iniciar PFI, con una comprobación máxima cada 24 horas.
- Si la actualización falla, la aplicación arranca con el último catálogo local sin bloquearse.
- Se mantiene el comando manual `npm run actualizar-mercadona` y el acceso `ACTUALIZAR_MERCADONA.cmd`.
- Fruta y yogures totalmente editables en cada comida y cena.
- Permite elegir el tipo de postre, escribir la variedad concreta y ajustar la cantidad por persona.
- La lista de compra agrupa las variedades elegidas y calcula sus unidades según los comensales.
- Inicio y el resumen semanal muestran el nombre concreto del postre.
- Diseño responsive específico para el editor de postres.
- Corregida una declaración duplicada en Catálogo que podía impedir la compilación.

# PFI v0.9.7

- Configuración del catálogo de Mercadona para el código postal 48950.
- Resolución automática del almacén asignado por Mercadona antes de descargar datos.
- Productos, disponibilidad y precios se descargan con la misma zona local.
- Nuevo comando `npm run actualizar-mercadona` y acceso de Windows `ACTUALIZAR_MERCADONA.cmd`.
- Catálogo muestra código postal, almacén y fecha de la última actualización.
- Aviso «Ingrediente asociado al producto» corregido con contraste alto.
- Eliminada la sección «Reglas activas» del Perfil.

# PFI v0.9.6

- Postres separados para comida y cena, alternando fruta y yogur y editables desde Menú.
- Los postres se incorporan automáticamente a la lista de compra según los comensales.
- Resumen semanal corregido: muestra comida, cena y sus postres también en móvil.
- Las tarjetas resumen de Despensa son accesos a listas filtradas.
- Eliminada la pestaña Configuración de Despensa: ahora se edita pulsando la foto del producto.
- Ficha de producto reutilizable desde Despensa, Compra y Recetas.
- Acceso directo a la ficha del producto en la web de Mercadona.
- Recomendaciones inteligentes de stock objetivo y frecuencia basadas en el consumo de los últimos 30 días.
- Previsión aproximada de días de stock y mejoras específicas de diseño móvil.

# PFI v0.9.5

## Presupuesto mensual y acumulado

- El presupuesto mensual de despensa se muestra únicamente en la Semana 1.
- El Inicio mantiene el presupuesto semanal de la semana seleccionada.
- El total acumulado permanece visible durante todo el mes.
- El acumulado suma la compra semanal de las semanas transcurridas y la reposición mensual una sola vez.
- Las tarjetas siguen funcionando como acceso directo a Compra.

## Menú familiar

- Los viernes rotan entre Hamburguesas, Perritos calientes y Kebab.
- Las pizzas pasan al sábado para evitar repetir hamburguesa dos noches seguidas.
- La generación inteligente de nuevos meses respeta siempre la rotación de los viernes.
- Se añade la receta Kebab, sin lechuga ni cebolla, con cantidades adaptadas al perfil familiar.
- Migración automática del plan mensual y de las recetas guardadas de versiones anteriores.

# PFI v0.9.4

## Plan mensual variado y equilibrado

- El primer arranque incluye cuatro semanas completas y diferentes, no una única semana repetida.
- Selector mensual para cambiar entre Semana 1, 2, 3 y 4 sin perder las ediciones.
- Compra, Inicio y presupuestos trabajan con la semana seleccionada.
- Migración automática: el menú semanal de la v0.9.3 se conserva como primera semana.
- Indicador de equilibrio por semana con recuento de legumbres, pescado, pollo o pavo y variedad de platos.
- Reglas familiares mantenidas: pizza los viernes, hamburguesas los sábados y comida fuera los domingos.
- Botón “Generar nuevo mes” con rotación de plantillas y preferencias aprendidas de confianza media o alta.
- La inteligencia solo sustituye platos por alternativas del mismo grupo, evitando romper el equilibrio.
- Las recetas renombradas desde la app se actualizan en las cuatro semanas.
- Preparar para mañana se recalcula automáticamente dentro de cada semana.

---

# PFI v0.9.3

## Menú más claro y aprendizaje ampliado

- El menú deja de mostrar siete editores completos a la vez: ahora se trabaja sobre un día seleccionado, con acceso rápido a toda la semana.
- Nueva vista del plato principal y los complementos, con edición desplegable solo cuando se necesita.
- Selector semanal superior y resumen compacto inferior, ambos navegables.
- Sugerencias PFI con nivel de confianza y explicación de por qué se recomienda una combinación.
- Propuestas de complementos aprendidas por uso anterior y reglas contextuales iniciales.
- Valoración real de cada comida: Gustó, Sobró, Faltó o No gustó.
- Las valoraciones positivas y negativas modifican la prioridad de futuras sugerencias.
- Sobró y Faltó ajustan gradualmente las cantidades automáticas de las recetas implicadas.
- El aprendizaje anterior se migra sin perder combinaciones ni correcciones manuales.
- Perfil muestra también las valoraciones registradas y los ajustes por resultado real.
- Diseño responsive específico para móvil, con días abreviados y tarjetas de comida apiladas.

---

# PFI v0.9.2

## Pulido visual y jerarquía

- Fondos generales más cálidos en crema, arena y verde salvia; se reduce el uso de blanco puro.
- Encabezados de Menú, Compra, Despensa, Recetas, Catálogo y Perfil con mayor contraste y presencia.
- Inicio con tarjetas diferenciadas por función y un bloque de menú del día más destacado.
- Tarjetas del menú semanal con cabeceras de color completas para identificar cada día rápidamente.
- Comida y cena usan superficies distintas, chips más claros y selectores con más profundidad.
- Viernes y domingo mantienen una identidad visual propia sin romper la paleta general.
- Navegación inferior con pestaña activa de alto contraste.
- Mejoras de interacción: estados hover, enfoque de teclado y reducción de movimiento según preferencias del sistema.
- La lógica de menús, compra, despensa y aprendizaje se mantiene sin cambios.
- La prueba de aprendizaje usa una ruta relativa y funciona fuera del entorno de desarrollo original.

---

# PFI v0.9.1

## Rediseño visual

- Nueva identidad visual en verde salvia, crema y arena.
- Cabecera más compacta y navegación inferior con estado activo más claro.
- Inicio rediseñado manteniendo únicamente menú del día, preparación, reposiciones y presupuestos.
- Menú semanal renovado con tarjetas de día, bloques diferenciados de comida y cena, chips y mejor diseño móvil.
- Las tarjetas de Inicio siguen funcionando como accesos directos a Menú, Compra y Despensa.

## Aprendizaje inicial

- Registro local de las combinaciones elegidas en comida y cena.
- Sugerencias rápidas en Menú basadas en combinaciones repetidas.
- Aprendizaje de correcciones manuales de cantidades en Recetas.
- Los recálculos automáticos aplican el factor aprendido por receta e ingrediente.
- Nueva sección de aprendizaje en Perfil con resumen y opción de reinicio.
- El aprendizaje no borra ni modifica automáticamente menús, recetas o despensa sin una acción del usuario.

# PFI v0.9.0

## Cantidades familiares e inicio simplificado

- Cálculo automático de cantidades principales según adultos, edades de los niños y bebés incluidos en el menú.
- Perfil familiar ampliado con edades y raciones adultas equivalentes.
- Estimaciones iniciales para carne, pescado, pasta, arroz, legumbres, huevos, patatas, pizzas y otros ingredientes habituales.
- Para la familia configurada por defecto (2 adultos, niños de 12 y 6 años), el filete de ternera se estima en unos 650 g.
- Cada ingrediente compatible puede mantener el cálculo automático o pasar a edición manual.
- Botón para recalcular todas las recetas con el perfil actual.
- Las cantidades recalculadas se usan directamente en Compra y en el presupuesto.
- Inicio reducido a menú del día, preparar para mañana, próximas reposiciones y presupuestos semanal, despensa y total.
- Todas las tarjetas de Inicio funcionan como accesos directos a Menú, Despensa o Compra.

---

# PFI v0.8.6

## Conversiones aproximadas de compra

- Las verduras vendidas en bolsas por peso ya no cuentan cada pieza como una bolsa completa.
- Conversión aproximada de zanahorias y otras frutas y verduras habituales de piezas a gramos cuando el producto asociado se vende por kilos.
- El arroz admite vaso estándar, vaso pequeño, vaso grande y taza: 180 g, 150 g, 200 g y 180 g respectivamente.
- La reposición automática ya no suma dos veces el stock objetivo y la necesidad del menú: compra lo necesario para cubrir el mayor de ambos.
- Los cálculos que usan pesos medios aparecen marcados como aproximados.

---

# PFI v0.8.5

## Cantidades reales y reposición clara

- Compra conserva y muestra la cantidad real necesaria de cada ingrediente.
- Los productos por piezas redondean solo al calcular la compra: 2,5 tomates se convierten en 3 piezas.
- Se suman correctamente fracciones del mismo producto antes de redondear.
- Uso del peso total y las unidades reales del catálogo para calcular paquetes, litros, gramos y packs.
- Los productos vendidos por peso muestran el coste con el símbolo aproximado.
- Las líneas combinadas indican todas las necesidades que cubre el producto asociado.
- Despensa diferencia productos controlados, faltantes de reposición automática y productos según menú o manuales.
- Los perecederos con objetivo 0 ya no aparecen como «stock correcto»; se indica que se compran según el menú.
- La pestaña pasa a llamarse «Reposición automática» e informa de qué productos quedan fuera y por qué.

---

# PFI v0.8.4

## Recetas separadas y menús combinables

- Separación automática de todas las recetas que contenían varios platos.
- Nuevas recetas independientes para platos principales, guarniciones y acompañamientos.
- Selector múltiple en **Menú** para combinar libremente dos o más recetas.
- Se mantiene el patrón original del menú semanal mediante combinaciones equivalentes.
- Ejemplos disponibles: Lomo + Patatas, Salmón + Ensalada y Pizza BBQ + Pizza 4 quesos.
- La lista de la compra suma los ingredientes de todos los platos seleccionados.
- Migración automática del menú y las recetas guardadas en versiones anteriores.
- Las asociaciones de productos y las cantidades editadas se conservan durante la migración.
- Al renombrar una receta se actualiza dentro de cualquier combinación del menú.

---

# PFI v0.8.3

## Editor de recetas

- Edición completa de recetas desde la aplicación.
- Cambio de nombre y categoría.
- Edición de cantidad, unidad y sección de cada ingrediente.
- Alta y eliminación de ingredientes dentro de una receta.
- Creación de recetas nuevas.
- Persistencia de cambios en el navegador.
- Actualización automática del menú al renombrar una receta.
- Compra, presupuesto, catálogo e inicio usan las recetas editadas.
- Conservación de la asociación Mercadona cuando se renombra un ingrediente.
- Botón para restaurar las recetas originales.

---

# PFI v0.8.2

## Asociaciones rápidas desde Compra y Recetas

- Nuevo selector de productos reutilizable sin salir de la pestaña actual.
- En **Recetas**, cada ingrediente incluye los botones «Asociar» o «Cambiar».
- En **Compra**, los ingredientes pendientes incluyen «Asociar ahora».
- Botón **Asociar pendientes** para recorrer automáticamente todos los ingredientes sin producto.
- La búsqueda se abre ya preparada con el nombre del ingrediente y muestra hasta 40 coincidencias con imagen, formato y precio.
- Las asociaciones se actualizan inmediatamente en Compra, Recetas y el resto de la aplicación.
- Se puede cerrar el selector pulsando fuera, con el botón × o con la tecla Escape.

# PFI v0.8.1

## Corrección de compra y reposición

- Marcar un producto de reposición como comprado actualiza su inventario inmediatamente.
- Al alcanzar el stock objetivo, el producto desaparece de «Reposición de despensa» sin tener que pulsar otro botón.
- Se mantiene «Guardar en inventario» como acción de respaldo para listas marcadas con la versión anterior.

# PFI v0.8.0

## Cambios principales

- Integración real entre Catálogo, Recetas, Despensa y Compra.
- Nueva pantalla de Despensa accesible desde la navegación principal.
- Inventario calculado por movimientos: compras, consumos y ajustes.
- Historial de movimientos con opción de eliminar registros erróneos.
- Reposición automática a partir del stock actual y el stock objetivo.
- Compra separada en compra semanal y reposición de despensa.
- Registro de los productos comprados dentro del inventario.
- Asociaciones exactas entre ingredientes y productos de Mercadona.
- Un mismo producto puede asociarse a varios ingredientes.
- Alta directa de productos en la despensa desde el catálogo.
- Nuevo panel de inicio con resumen de compra, despensa y asociaciones.
- Eliminada la lógica antigua de precios estáticos y catálogo duplicado.
- Migración automática del stock guardado en versiones anteriores.

## Conservación de datos

La aplicación mantiene las claves de `localStorage` ya utilizadas para:

- menú semanal;
- productos favoritos;
- asociaciones de ingredientes;
- despensa;
- movimientos de inventario.

El stock antiguo se convierte automáticamente en un movimiento inicial cuando es necesario.
