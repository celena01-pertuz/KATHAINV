# KathaInv · Criterios de aceptación

Ejecutar cada criterio manualmente en **https://kathainv.vercel.app**. Usar una cuenta autorizada y datos de prueba identificables; no eliminar ni modificar información real. La columna **Resultado** queda vacía para que la estudiante documente lo observado. Ningún criterio se marca aquí como aprobado.

| Criterio | Cómo probarlo en kathainv.vercel.app | Resultado esperado | Resultado |
|---|---|---|---|
| A-01 | Abrir una ventana privada/sin sesión e intentar entrar a `/products`. | Redirección a `/login`; no se muestran datos del inventario. | |
| A-02 | Iniciar sesión con una cuenta autorizada. | Acceso al inicio de KathaInv. | |
| A-03 | En `/products`, registrar una Blusa, categoría Ropa, talla M, color Rojo, precio $45.000 y stock 10, con un código de prueba único. | El producto queda en el inventario como disponible, con el código, precio y stock ingresados. | |
| A-04 | Intentar registrar otra referencia con el mismo nombre Blusa, talla M y color Rojo. | La aplicación rechaza la referencia duplicada y no crea otra fila. La migración RN-02 está aplicada y verificada en Supabase; realizar la prueba funcional de todas formas. | |
| A-05 | Registrar Blusa, talla L y color Rojo, con un código único. | Se permite como otra referencia y mantiene existencias independientes. | |
| A-06 | En `/scan`, escanear o escribir el código de la Blusa M. | Se muestran nombre, talla, color, precio y stock correctos. | |
| A-07 | En `/scan`, escribir un código de prueba que no exista. | Se indica que no está registrado y se ofrece iniciar su registro; no se consulta ni vende como producto existente. | |
| A-08 | En `/purchases`, registrar una entrada de 5 unidades a la Blusa M. Si no hay proveedor de prueba, crear uno identificado como prueba. | La compra se registra y el stock pasa de 10 a 15. | |
| A-09 | En `/sales`, intentar vender 20 unidades de la Blusa M. | La venta se rechaza por stock insuficiente y el stock permanece en 15. | |
| A-10 | Registrar una venta de las 15 unidades de la Blusa M. | La venta se registra; el stock queda en cero y la interfaz avisa que la referencia está agotada. | |
| A-11 | Intentar vender una unidad adicional de la Blusa M. | La venta se rechaza por stock insuficiente. | |
| A-12 | En `/products`, activar el filtro de productos disponibles. | La Blusa M agotada no aparece entre los disponibles. | |
| A-13 | Abrir el historial de ventas en `/sales`. | Aparece la venta recién registrada, con su total correcto. | |
| A-14 | Salir y volver a entrar en otra sesión del navegador, luego consultar el producto y la venta de prueba. | Los registros persisten en Supabase y muestran los datos guardados. | |

**Preparación:** los códigos y proveedores deben ser exclusivos para esta prueba. Al terminar, conservar los movimientos y productos para mantener el historial; la limpieza de datos no forma parte de estos criterios. Las métricas opcionales F6 se registran como P09/A-15 y no se incluyen en A-01 a A-14.
