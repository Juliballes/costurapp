# CosturApp · Mhome

Aplicación para organizar pedidos del taller, entregas, pagos y avisos de retiro por WhatsApp.

## Ejecutar localmente

Requiere Node.js 22.12 o superior y la base de Supabase que ya utiliza el taller.

1. Ejecutar `npm ci`.
2. Crear `.env.local` con las variables del proyecto:

   ```env
   VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICABLE
   ```

3. Ejecutar `npm run dev` y abrir la dirección que indica Vite.

Se utilizan las tablas existentes `clientes`, `pedidos` y `pedido_prendas`. Este cambio no requiere migraciones ni modifica datos automáticamente.

## Verificar cambios

- `npm test`: pruebas de cantidades, centavos, señas, pedidos pagados, compatibilidad con pedidos antiguos y mensaje de retiro.
- `npm run lint`: revisión estática.
- `npm run build`: compilación para producción.

Para probar el recorrido: crear un pedido con 3 pantalones a $1.500 por unidad; el subtotal y el total deben ser $4.500. Con una seña de $1.000, el saldo debe ser $3.500. Al marcarlo como pagado, la seña debe acompañar el total incluso si se cambia la cantidad o se agrega o elimina otro trabajo. Guardar, abrir el detalle y comprobar los mismos importes. Al marcar el pedido como listo, revisar la vista previa y el enlace de WhatsApp antes de enviar.

## Importes y mensaje

`pedido_prendas.precio` contiene el **precio unitario**. El total se calcula como la suma de `cantidad × precio` de todos los trabajos, con cálculos en centavos. Se usa el mismo cálculo en alta, edición, lista, detalle y Ganancias. Los pedidos antiguos que no tienen detalle conservan `pedidos.precio`. Si un pedido con detalle tiene un total guardado desactualizado, la app muestra el total calculado y lo guarda en `pedidos.precio` al editar ese pedido.

Los pedidos pagados tienen saldo cero y su seña representa el total. El campo `pagado` se carga junto con los demás datos para conservar el estado al recargar.

El aviso usa el nombre del cliente automáticamente, conserva los saltos de línea y abre WhatsApp con este texto preparado:

```text
Hola [nombre], soy Mariana de Mhome

Tu prenda ya está lista para retirar.

¡Muchas gracias!
```

El envío lo confirma la persona desde WhatsApp.

## Edición, clientes y búsqueda

Alta y edición comparten el mismo formulario. Se pueden agregar o quitar trabajos y corregir tipo, cantidad, descripción y precio unitario. Un pedido antiguo sin detalle se transforma en una prenda editable al guardarlo. Los errores aparecen junto al campo y el formulario conserva el borrador si falla el guardado. Al navegar, cancelar, cerrar o recargar con cambios pendientes, se solicita confirmación; durante el guardado se bloquea la navegación interna.

Nombre y teléfono pueden corregirse desde Editar pedido. Como el cliente es compartido, la corrección se refleja en todos sus pedidos. Los teléfonos se guardan en formato internacional y se comparan también con los formatos anteriores (espacios, guiones, `011 15`, `+54 9`); se pide código de área para números locales. No se fusionan ni borran clientes antiguos automáticamente. Si el número ya pertenece a otro cliente o hay duplicados anteriores, se muestra el conflicto. La comprobación recorre las páginas de clientes y no se limita a las primeras 1000 filas. Esta validación en la app no reemplaza una restricción de unicidad en la base frente a altas simultáneas desde varios dispositivos.

La búsqueda incluye todas las prendas y sus descripciones, cliente, teléfono, número de pedido y notas, sin distinguir mayúsculas ni acentos.

## Configuración y WhatsApp

Configuración está disponible también en celular (Ajustes). Permite cambiar taller, remitente y plantilla de retiro. Los campos `{nombre}`, `{remitente}` y `{taller}` se reemplazan automáticamente, con vista previa. Se mantienen los valores iniciales de Mhome y Mariana hasta que se guarde otra configuración.

Se guarda **en ese navegador** y se conserva al recargar; no se sincroniza con otros dispositivos. Si el navegador no permite guardar, se informa el error y se conserva lo escrito. Si los datos guardados están dañados, se usan los valores iniciales. Los pedidos listos permiten reabrir el aviso de WhatsApp, aunque se haya cerrado el diálogo anterior. El enlace solo se habilita con un teléfono válido y el envío sigue siendo manual.

## Conexión y persistencia

Un fallo al cargar no se presenta como una lista vacía: se muestra el error con Reintentar y se conservan los últimos datos disponibles. Las respuestas de cargas anteriores no reemplazan una respuesta más reciente.

El guardado reutiliza las tablas y políticas existentes de Supabase. Además de lectura e inserción, la edición requiere que las políticas permitan actualizar `clientes` y `pedido_prendas`, y eliminar prendas del pedido. No se modifican políticas ni estructura desde la app.

Las prendas existentes conservan sus IDs. Las bajas se realizan al final. Si una escritura falla, se intenta revertir en orden inverso lo que ya se confirmó y se informa si alguna reversión también falla. Esto utiliza varias solicitudes y **no equivale a una transacción de base de datos**: ante un corte que impida confirmar una respuesta, debe revisarse el pedido antes de reintentar. Si falla un pedido nuevo después de crear al cliente, el cliente queda disponible para un próximo intento.

## Prueba manual del pulido

1. Editar un pedido con varias prendas: cambiar cantidades, precios y descripción; agregar un trabajo y quitar otro. Guardar y comprobar lista, detalle y Ganancias.
2. Corregir el cliente; comprobar que otros pedidos del mismo cliente muestran la corrección. Crear un pedido con el mismo teléfono escrito de otra forma y comprobar que se reutiliza.
3. Buscar por una prenda secundaria, una palabra sin acento y el teléfono sin separadores.
4. En un pedido listo, cerrar el aviso y volver a abrirlo con Avisar por WhatsApp.
5. Modificar un formulario y navegar a otra sección: cancelar la confirmación conserva el borrador y aceptar lo descarta. Probar también volver a Pedidos estando en Editar.
6. Personalizar Configuración, guardar y recargar. Revisar que el enlace real de WhatsApp use el mensaje personalizado.
7. Simular un error de carga y reintentar; no debe desaparecer la información anterior. Simular errores de guardado con un entorno de prueba y comprobar el borrador y las reversiones.

La validación automatizada cubre reglas de negocio y persistencia con una base simulada. Las pruebas de interfaz se realizaron con respuestas simuladas de Supabase, sin modificar pedidos reales.


## Edición del aviso de retiro

Los mensajes se preparan sin emojis, incluyendo las plantillas guardadas con el formato anterior. Se conservan el nombre del taller, el remitente, el texto personalizado y los saltos de línea. También se eliminan los caracteres de reemplazo `�` de plantillas antiguas.

La vista previa es un campo editable: al escribir, el enlace de WhatsApp se actualiza con ese texto exacto. La edición corresponde solo al aviso abierto y no cambia la plantilla de Configuración. Cerrar el diálogo y volver a abrirlo recupera la plantilla. Un mensaje vacío deja deshabilitada la apertura de WhatsApp. El enlace usa la dirección directa de WhatsApp y codifica el texto una sola vez.

## Pedidos activos e historial

Pedidos tiene dos solapas:

- **Activos**: Pendiente, En proceso y Listo. Un trabajo pagado sigue activo hasta que se entregue.
- **Antiguos**: únicamente los pedidos con estado Entregado. Conservan cliente, prendas, importes, notas y saldo.

**Cambiar estado**, disponible en cada tarjeta de Activos y Antiguos, abre Pendiente, En proceso, Listo para retirar y Entregado. Se destaca el estado actual y se guarda con confirmación; cancelar no cambia nada. Elegir Listo prepara el aviso editable de WhatsApp. Entregado pide confirmar que la prenda ya fue retirada y mueve el pedido a Antiguos. Cualquier otro estado lo devuelve a Activos. Ninguna de estas acciones cobra, marca como pagado ni modifica la seña. Los pedidos entregados con saldo continúan mostrando esa deuda y siguen incluidos en Ganancias según su fecha prevista.

La vista diaria prioriza atrasados, entregas de hoy y urgentes; también permite ordenar por fecha prevista o cliente. El historial muestra primero las fechas previstas recientes: no representa una fecha real de retiro, que la base actual no registra.

Búsqueda, estado, prioridad, pago y fecha se pueden combinar. Al cambiar de solapa se reinician los filtros de estado, fecha y pago; se conserva la búsqueda escrita para consultar el historial de un cliente. Limpiar filtros también borra esa búsqueda. En celular, Filtros y orden permite desplegar las opciones adicionales.

La lista muestra 10 pedidos por página. Buscar o cambiar filtros vuelve a la primera página. La carga consulta todas las páginas de Supabase para que un historial largo no oculte trabajos activos después de las primeras 1000 filas. Si falla una página, se conserva la última carga completa.

Las tarjetas muestran cliente y estado, trabajos, entrega prevista e importes antes de las acciones. Eliminar queda dentro de Más opciones y mantiene su confirmación; no es necesario borrar un pedido para sacarlo de Activos. Los accesos de Inicio a Urgentes, En proceso, Listos, Hoy y Atrasados abren sus filtros correspondientes.

Para verificar: abrir un pedido Listo con seña parcial, confirmar la entrega y comprobar que pasa a Antiguos con el mismo saldo. Cambiarlo a En proceso y comprobar que vuelve a Activos. Repetir cambiando el estado desde Editar, buscar en ambas solapas, filtrar por saldo y probar la paginación. Los diálogos admiten Escape para cancelar y las solapas se recorren con las flechas del teclado.


## Ganancias por semana

La pantalla reúne un saldo por cobrar destacado, el porcentaje del valor cubierto por pagos, el valor total de los trabajos, los pagos registrados y la cantidad de pedidos. Se puede recorrer semanas con Anterior/Siguiente, volver a Hoy o elegir cualquier fecha; siempre se consulta de lunes a domingo.

El detalle muestra cliente, número, entrega prevista, estado, valor, pagos y saldo. Se ordena por mayor saldo y permite filtrar Todos, Con saldo y Sin saldo. Cambiar de semana restablece Todos. Se conservan los pedidos Entregados con deuda. Las cantidades y los precios unitarios se calculan con las mismas reglas que en Pedidos.

Se agrupa por **fecha prevista de entrega**, no por fecha del cobro: la base no registra cada movimiento de dinero ni gastos. Pagos registrados incluye señas y pedidos marcados como pagados; no representa ganancia neta ni ingresos recibidos durante esa semana.

Para verificar: cambiar un pedido de Pendiente a En proceso desde su tarjeta; cancelar otro cambio; marcarlo Listo y revisar el WhatsApp editable; confirmar Entregado y comprobar que solo cambia el estado y pasa a Antiguos. Cambiarlo nuevamente a Pendiente y comprobar que vuelve a Activos. En Ganancias, elegir una semana con pagos parciales, completos y pedidos antiguos, filtrar saldos, recorrer semanas y volver a Hoy. Probar también una semana vacía y pantallas de 320 px.
