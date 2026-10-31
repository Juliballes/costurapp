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
Hola [nombre]👋🏻 soy Mariana de Mhome

Tu prenda ya está lista para retirar.

¡Muchas gracias! 🥰.
```

El envío lo confirma la persona desde WhatsApp.
