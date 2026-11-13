# Burger · Tienda + Dashboard (Parte 2) · versión localStorage

Tienda y Dashboard de gestión 100 % en el navegador: **sin servidor ni base de datos**. Todo se guarda en `localStorage` y la tienda y el Dashboard comparten los mismos datos y la misma sesión.

## Cómo abrirlo
Los módulos JS no cargan con doble clic. Usa **Live Server** (VS Code) sobre `index.html`, o en una terminal dentro de la carpeta: `npx serve` / `python -m http.server 8000`.

- Tienda: `index.html`
- Dashboard: `dashboard/index.html` (enlace "Panel de gestión" para el personal, o "Dashboard" para invitados)

## Perfiles de demostración
| Perfil | Correo | Contraseña |
| --- | --- | --- |
| Administrador | admin@burger.com | Admin12345 |
| Vendedor | vendedor@burger.com | Vendedor123 |
| Usuario | cliente@burger.com | Cliente123 |

El registro público siempre crea **Usuarios**. Solo el personal (admin/vendedor) entra al Dashboard.

## Permisos
| Operación | Vendedor | Administrador |
| --- | --- | --- |
| Crear, consultar, exportar CSV y editar productos, clientes y pedidos | Sí | Sí |
| Cambiar estados de pedidos, editar entrega, registrar cobro contraentrega | Sí | Sí |
| Consultar usuarios del equipo (admin y vendedores) | Sí | Sí |
| Crear vendedores y editar nombre/correo de vendedores | Sí | Sí |
| Crear administradores, cambiar roles, estado o contraseña de otros | No | Sí |
| Eliminar productos, clientes, pedidos y usuarios | No | Sí |
| Eliminarse o degradarse a sí mismo | No | No |

Un **Usuario** (cliente) solo compra y consulta sus pedidos.

## Módulos del Dashboard
Productos (`listado-pro` / `crear-pro`), Clientes (`listado-clientes` / `crear-cliente`), Pedidos (`listado-pedidos` / `crear-pedido`) y Usuarios (`listado-usuarios` / `crear-usuario`). Cada listado tiene **búsqueda, filtro, Ver, Editar, Eliminar (admin) y Exportar CSV** (exporta las filas visibles según búsqueda/filtro).

**Fusión tienda ↔ Dashboard:** el catálogo e inventario son los mismos; las compras de la tienda aparecen en Pedidos; los usuarios que se registran aparecen en Clientes y su compra actualiza su contacto. Un pedido manual desde el Dashboard (contraentrega) descuenta stock y toma los datos del cliente elegido.

**Eliminar = baja lógica:** el registro desaparece de listados y operaciones, pero se conserva el historial. Un producto eliminado no se puede reactivar editando (ocultarlo desde el formulario sí es reversible). Un pedido solo se elimina si está cancelado, o entregado y cobrado.

## Archivos
| Archivo | Propósito |
| --- | --- |
| `js/store.js` | "Backend" en localStorage: sesión, usuarios, clientes, productos, pedidos, stock y todos los permisos |
| `app.js`, `js/carrito.js`, `detalleCarrito.js`, `pago.js`, `comun.js` | Tienda y los tres procesos (carrito, detalle, pago) |
| `dashboard/dashboard.js` + `dashboard.css` | Dashboard (listados, formularios, detalle, filtros, CSV) |
| `dashboard/*.html` | Una página por pantalla (mismos nombres de la carpeta de referencia) |

## localStorage
Claves: `burger_users`, `burger_clients`, `burger_products`, `burger_orders`, `burger_session`, `burger_v2_cart_<id>`.
Empezar de cero: Administrador → Panel de gestión de la tienda → **Restablecer datos**, o borra esas claves en DevTools → Application → Local Storage.

## Límites
- Datos **por navegador**: no se comparten entre dispositivos.
- ~5 MB de espacio; las fotos subidas (se reducen a 640 px) consumen parte.
- Los permisos se validan en `store.js`, pero cualquiera puede editar el localStorage desde DevTools: sirve para un proyecto académico o demo, no para producción.
- Pagos: contraentrega y pago académico simulado. Wompi y SQLite se retiraron porque requieren servidor.
