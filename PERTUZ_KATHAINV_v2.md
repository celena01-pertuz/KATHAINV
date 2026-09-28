# Proyecto KATHAINV - Sistema de Control de Inventario y Ventas
**Documento del Proyecto - Segunda Versión (Corregida y Ampliada)**  
**Estudiante:** Celena Charith Pertuz Bustamante  
**Proyecto:** KATHAINV  
**Estado:** Desplegado en producción  
**Fecha:** Septiembre 2026  

---

## 1. Diagnóstico y Contexto Actual

El sistema está diseñado para un almacén de ropa, accesorios, calzado y bolsos para mujer. El negocio es gestionado de manera individual por la propietaria, quien se encarga de realizar la compra de mercancía, la recepción, la venta directa y la toma de decisiones sobre reabastecimiento.

Actualmente, el almacén no cuenta con ningún registro sistematizado ni físico (no se utilizan cuadernos ni hojas de cálculo en Excel). El control del inventario disponible y la identificación de los artículos de mayor rotación se basan exclusivamente en la memoria de la administradora. Las compras a proveedores se realizan por percepción visual de agotamiento, sin fechas fijas de pedido, y el pago a proveedores se efectúa siempre de contado.

---

## 2. Definición del Problema

La ausencia de registros genera las siguientes problemáticas operativas:
1. **Falta de visibilidad sobre existencias:** No existe certeza sobre las tallas y colores disponibles de cada referencia.
2. **Agotamiento de stock no detectado:** Los productos se agotan sin previo aviso, identificándose la falencia únicamente cuando el cliente final solicita el artículo.
3. **Falta de métricas de ventas:** No se identifican con precisión los productos de alta y baja rotación, lo que dificulta la toma de decisiones en el reabastecimiento.
4. **Ineficiencia en la atención:** La consulta de precios y el registro de ventas se realizan identificando los productos de forma manual y visual, incrementando el tiempo de atención y la probabilidad de error humano.

---

## 3. Alcance del Producto Mínimo Viable (MVP Actual)

El alcance funcional de la versión actual de KATHAINV comprende:

1. **Gestión de Productos:**
   - Registro de productos vinculando atributos: Nombre, Categoría (Ropa, Calzado, Bolso, Accesorio), Talla, Color, Precio y Cantidad Disponible.
   - Asociación a un código de barras o QR leído mediante la cámara del dispositivo móvil.

2. **Registro de Entradas (Compras a Proveedores):**
   - Ingreso de unidades recibidas aumentando de manera automática el inventario disponible.

3. **Consulta Rápida por Escaneo:**
   - Lectura del código para mostrar de forma inmediata nombre, talla, color, precio y stock actual.

4. **Registro de Salidas (Ventas):**
   - Descuento automático de inventario al escanear el producto vendido.
   - Generación de alertas en pantalla cuando el stock de un producto llega a cero (Agotado).

5. **Módulo de Autenticación (`/login`):**
   - Control de acceso para la administradora del sistema mediante credenciales de usuario.

---

## 4. Decisiones Técnicas y Justificación

El stack tecnológico fue seleccionado garantizando escalabilidad, velocidad de respuesta y despliegue continuo:

* **Next.js 15 (App Router):** Seleccionado como framework principal por su arquitectura basada en componentes, renderizado híbrido y facilidad para estructurar rutas de API y vistas en un solo proyecto.
* **TypeScript:** Garantiza tipado estático, reduciendo errores en tiempo de desarrollo al manejar las estructuras de datos de productos, ventas e inventario.
* **Tailwind CSS:** Permite el desarrollo de una interfaz limpia, moderna y completamente adaptada a dispositivos móviles (Mobile-First) para facilitar el escaneo desde celulares.
* **Vitest & React Testing Library:** Framework de pruebas para verificar el correcto funcionamiento de componentes críticos como el formulario de inicio de sesión (`LoginForm.test.tsx`).
* **Vercel:** Plataforma de alojamiento integrada nativamente con GitHub para realizar despliegues automáticos (CI/CD) tras cada actualización en la rama principal (`main`).

---

## 5. Reglas de Negocio

1. **Restricción de Venta:** No se permite registrar ventas por cantidades superiores al stock disponible en el sistema.
2. **Unicidad de Referencia:** Cada combinación única de Producto + Talla + Color posee su propio código y su propio contador de inventario.
3. **Control de Nuevos Productos:** Si se escanea un código no registrado, el sistema exige completar el registro inicial del producto antes de habilitar ventas o consultas.
4. **Alerta de Agotado:** Al llegar a cero (0) unidades, el sistema cambia automáticamente el estado de la referencia a **Agotado**.

---

## 6. Módulos Implementados y Pruebas de Funcionamiento

### Autenticación y Login
- Se implementó la vista `/login` para el acceso al sistema.
- **Credenciales de prueba (Demo):**
  - **Usuario:** `demo@kathainv.com`
  - **Contraseña:** `demo1234`
- **Pruebas realizadas:**
  - Validación de credenciales incorrectas con rechazo y mensaje de error.
  - Validación de credenciales correctas con redirección exitosa al panel principal.
  - Ejecución de pruebas unitarias locales mediante el comando `npm test`.

---

## 7. Estado del Despliegue en Producción

El proyecto se encuentra totalmente sincronizado con el repositorio en GitHub y desplegado en producción en **Vercel**:

* **Repositorio GitHub:** `celena01-pertuz/KATHAINV`
* **URL de Producción (Vercel):** `https://kathainv.vercel.app/login`
* **Estado:** Producción Activa (Verde)

---

## 8. Delimitación del MVP y Visión de Escalabilidad (Roadmap Futuro)

Para garantizar la entrega en los tiempos académicos exigidos, la **Versión 1.0 (MVP)** se delimitó a un único almacén y un usuario. Sin embargo, el sistema fue diseñado con una arquitectura modular para integrar en **siguientes versiones**:

1. **Gestión de Múltiples Sucursales:** Capacidad de administrar inventario y ventas de diferentes puntos de venta de forma centralizada.
2. **Usuarios Concurrentes y Roles:** Soporte para múltiples usuarios (administradores, cajeros, personal de bodega) con diferentes niveles de permisos.
3. **Generación e Impresión Integrada de Etiquetas:** Módulo dentro de la propia aplicación que genere un código único automático por producto y permita su exportación/impresión directa en formato de etiqueta QR o código de barras.
4. **Tienda Virtual (E-commerce):** Catálogo en línea sincronizado en tiempo real con el inventario del almacén para ventas por internet.
