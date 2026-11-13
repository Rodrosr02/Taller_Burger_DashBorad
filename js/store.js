const KEYS = { users: 'burger_users', products: 'burger_products', orders: 'burger_orders', clients: 'burger_clients', session: 'burger_session' };
// Eliminar = baja lógica (campo deleted): desaparece de listados pero conserva el historial de pedidos.
const live = x => !x.deleted;
const SHIPPING_FEE = 5000;
const SESSION_MS = 24 * 60 * 60 * 1000;
const ROLES = ['admin', 'seller', 'customer'];

// ---------- Acceso a localStorage ----------
function read(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { fail('No hay espacio en el navegador. Usa una imagen más pequeña o borra datos antiguos.'); }
}
function fail(message) { throw new Error(message); }
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

// ---------- Contraseñas (hash con sal; PBKDF2 si el navegador lo permite) ----------
async function hashPassword(password, salt = uid().replace(/-/g, '')) {
  if (globalThis.crypto?.subtle) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256);
    return salt + ':' + [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Respaldo para contextos sin crypto.subtle (p. ej. http en una IP de red local)
  let h = 5381; for (const c of salt + password) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0;
  return salt + ':fb' + h.toString(16);
}
async function verifyPassword(password, stored) {
  const salt = stored.split(':')[0];
  return (await hashPassword(password, salt)) === stored;
}

// ---------- Validaciones ----------
function text(v, label, max = 120, min = 1) {
  if (typeof v !== 'string' || v.trim().length < min || v.trim().length > max) fail(`${label}: revisa el valor.`);
  return v.trim();
}
function integer(v, label, min, max) {
  if (!Number.isSafeInteger(v) || v < min || v > max) fail(`${label}: número inválido.`);
  return v;
}
function email(v) {
  v = text(v, 'Correo', 160).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) fail('Correo inválido.');
  return v;
}
function password(v) {
  if (typeof v !== 'string' || v.length < 10 || v.length > 128) fail('Usa una contraseña de 10 a 128 caracteres.');
  return v;
}
function productData(b) {
  const image = text(b.image || 'images/b1.png', 'Imagen', 700000);
  const ok = /^(\/)?images\/[a-zA-Z0-9_.-]+\.(png|jpg|jpeg|webp)$/i.test(image)
    || /^https:\/\/[^\s<>"']+$/i.test(image) || /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/.test(image);
  if (!ok) fail('Usa una imagen local images/archivo.png, una URL HTTPS o sube un archivo.');
  return {
    name: text(b.name, 'Nombre', 90), description: text(b.description, 'Descripción', 400),
    category: text(b.category, 'Categoría', 60), price: integer(b.price, 'Precio COP', 1, 10000000),
    stock: integer(b.stock, 'Existencias', 0, 100000), image: image.replace(/^\//, ''), active: b.active ? 1 : 0,
  };
}

// ---------- Datos iniciales ----------
const SEED_PRODUCTS = [
  ['classic', 'Clásica de la casa', 'Carne de res, queso cheddar, lechuga y nuestra salsa especial.', 'Hamburguesas', 18900, 40, 'b1.png'],
  ['double', 'Doble smash', 'Doble carne, doble cheddar y cebolla caramelizada.', 'Hamburguesas', 27900, 30, 'b2.png'],
  ['bacon', 'Bacon lovers', 'Carne a la parrilla, tocineta crocante y queso fundido.', 'Hamburguesas', 24900, 25, 'b3.png'],
  ['chicken', 'Chicken crispy', 'Pollo crocante, ensalada fresca y salsa de ajo.', 'Hamburguesas', 22900, 30, 'b4.png'],
  ['fries', 'Papas doradas', 'Papas crujientes con sal de la casa.', 'Acompañamientos', 8900, 60, 'topcard2.png'],
  ['pizza', 'Pizza de la casa', 'Queso mozzarella, pepperoni y salsa artesanal.', 'Pizzas', 29900, 20, 'p1.png'],
  ['veggie', 'Verde y deliciosa', 'Hamburguesa vegetal con verduras frescas.', 'Hamburguesas', 21900, 20, 'b6.png'],
  ['combo', 'Combo para compartir', 'Dos hamburguesas de la casa con papas.', 'Combos', 42900, 20, 'banner.png'],
].map(([id, name, description, category, price, stock, img]) => ({ id, name, description, category, price, stock, image: 'images/' + img, active: 1 }));

// Cuentas de demostración, una por perfil. Cámbialas o elimínalas desde Usuarios / Mi cuenta.
export const DEMO_ACCOUNTS = [
  { name: 'Admin Burger', email: 'admin@burger.com', password: 'Admin12345', role: 'admin' },
  { name: 'Vendedor Burger', email: 'vendedor@burger.com', password: 'Vendedor123', role: 'seller' },
  { name: 'Cliente Demo', email: 'cliente@burger.com', password: 'Cliente123', role: 'customer' },
];

async function seed() {
  if (!read(KEYS.users, null)) {
    const users = [];
    for (const a of DEMO_ACCOUNTS) users.push({ id: uid(), name: a.name, email: a.email, password: await hashPassword(a.password), role: a.role, active: 1, created: new Date().toISOString() });
    write(KEYS.users, users);
  }
  if (!read(KEYS.products, null)) write(KEYS.products, SEED_PRODUCTS);
  if (!read(KEYS.orders, null)) write(KEYS.orders, []);
  if (!read(KEYS.clients, null)) write(KEYS.clients, []);
}
const ready = seed();

export async function resetData() {
  await ready;
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  Object.keys(localStorage).filter(k => k.startsWith('burger_v2_cart_')).forEach(k => localStorage.removeItem(k));
  await seed();
}

// ---------- Sesión y permisos ----------
const clean = u => u && ({ id: u.id, name: u.name, email: u.email, role: u.role, active: !!u.active });
function currentUser() {
  const s = read(KEYS.session, null);
  if (!s || s.expires < Date.now()) { localStorage.removeItem(KEYS.session); return null; }
  const u = read(KEYS.users, []).find(x => x.id === s.userId);
  return u && u.active && live(u) ? u : null;
}
function authorize(user, roles) {
  if (!user) fail('Inicia sesión para continuar.');
  if (roles && !roles.includes(user.role)) fail('No tienes permisos para esta acción.');
  return user;
}
const isStaff = u => ['admin', 'seller'].includes(u?.role);

// ---------- Utilidades de pedidos ----------
function ownedOrder(orders, id, user) {
  const o = orders.find(x => x.id === id && live(x));
  if (!o) fail('Pedido no encontrado.');
  if (user.role === 'customer' && o.user_id !== user.id) fail('Este pedido no te pertenece.');
  return o;
}
function restock(products, items) {
  for (const it of items) { const p = products.find(x => x.id === it.id); if (p) p.stock += it.quantity; }
}
// Los usuarios con perfil "customer" se reflejan automáticamente como clientes (contactos).
function syncClients() {
  const clients = read(KEYS.clients, []);
  let changed = false;
  for (const u of read(KEYS.users, []).filter(x => x.role === 'customer' && live(x))) {
    if (clients.some(c => c.user_id === u.id)) continue;
    const byEmail = clients.find(c => c.email === u.email && !c.user_id);
    if (byEmail) { byEmail.user_id = u.id; changed = true; continue; }
    if (clients.some(c => c.email === u.email)) continue;
    clients.push({ id: u.id, user_id: u.id, name: u.name, email: u.email, phone: '', address: '', city: '', active: 1, created: u.created });
    changed = true;
  }
  if (changed) write(KEYS.clients, clients);
  return clients;
}
function clientFields(b) {
  const phone = text(b.phone, 'Teléfono', 20, 7);
  if (!/^[+\d\s()-]{7,20}$/.test(phone)) fail('Teléfono inválido.');
  return { name: text(b.name, 'Nombre', 100), email: email(b.email), phone, address: text(b.address, 'Dirección', 200, 5), city: text(b.city, 'Ciudad', 80) };
}
const publicOrder = o => { const { idempotency, ...rest } = o; return rest; };

// ---------- Enrutador ----------
export async function api(path, method = 'GET', body = {}) {
  await ready;
  const user = currentUser();
  const m = (re) => path.match(re);
  let r;

  if (path === '/config' && method === 'GET')
    return { wompi: false, wompiEnvironment: 'test', demoPayments: true, shipping: SHIPPING_FEE, currency: 'COP' };
  if (path === '/me' && method === 'GET') return { user: clean(user) };

  // --- Cuenta ---
  if (path === '/register' && method === 'POST') {
    const name = text(body.name, 'Nombre', 100), mail = email(body.email), pass = password(body.password);
    const users = read(KEYS.users, []);
    if (users.some(u => u.email === mail)) fail('Este correo ya está registrado.');
    // El registro público siempre crea usuarios con perfil "customer".
    users.push({ id: uid(), name, email: mail, password: await hashPassword(pass), role: 'customer', active: 1, created: new Date().toISOString() });
    write(KEYS.users, users);
    syncClients();
    return { ok: true };
  }
  if (path === '/login' && method === 'POST') {
    const mail = email(body.email);
    if (typeof body.password !== 'string' || body.password.length > 128) fail('Contraseña inválida.');
    const u = read(KEYS.users, []).find(x => x.email === mail);
    if (!u || !u.active || u.deleted || !(await verifyPassword(body.password, u.password))) fail('Correo o contraseña incorrectos.');
    write(KEYS.session, { userId: u.id, expires: Date.now() + SESSION_MS });
    return { user: clean(u) };
  }
  if (path === '/logout' && method === 'POST') { localStorage.removeItem(KEYS.session); return { ok: true }; }
  if (path === '/password' && method === 'PATCH') {
    authorize(user);
    if (typeof body.current !== 'string' || !(await verifyPassword(body.current, user.password))) fail('Contraseña actual incorrecta.');
    const users = read(KEYS.users, []);
    users.find(x => x.id === user.id).password = await hashPassword(password(body.password));
    write(KEYS.users, users);
    localStorage.removeItem(KEYS.session);
    return { ok: true };
  }

  // --- Menú / productos ---
  if (path === '/products' && method === 'GET') {
    const all = read(KEYS.products, []).filter(live);
    return isStaff(user) ? all : all.filter(p => p.active);
  }
  if ((r = m(/^\/products\/([\w-]+)$/)) && method === 'GET') {
    authorize(user, ['admin', 'seller']);
    const p = read(KEYS.products, []).find(x => x.id === r[1] && live(x));
    if (!p) fail('Producto no encontrado.');
    return p;
  }
  if (path === '/products' && method === 'POST') {
    authorize(user, ['admin', 'seller']);
    const products = read(KEYS.products, []), id = uid();
    products.push({ id, ...productData(body) });
    write(KEYS.products, products);
    return { id };
  }
  if ((r = m(/^\/products\/([\w-]+)$/)) && method === 'PATCH') {
    authorize(user, ['admin', 'seller']);
    const products = read(KEYS.products, []), p = products.find(x => x.id === r[1] && live(x));
    if (!p) fail('Producto no encontrado.');
    Object.assign(p, productData(body));
    write(KEYS.products, products);
    return { ok: true };
  }
  if ((r = m(/^\/products\/([\w-]+)$/)) && method === 'DELETE') {
    authorize(user, ['admin']);
    const products = read(KEYS.products, []), p = products.find(x => x.id === r[1] && live(x));
    if (!p) fail('Producto no encontrado.');
    p.active = 0; p.deleted = 1; // baja lógica: no se puede reactivar editando
    write(KEYS.products, products);
    return { ok: true };
  }

  // --- Usuarios y perfiles ---
  // Administrador: todo. Vendedor: crear vendedores y editar nombre/correo de vendedores.
  if (path === '/users' || m(/^\/users\/([\w-]+)$/)) {
    authorize(user, ['admin', 'seller']);
    const id = m(/^\/users\/([\w-]+)$/)?.[1];
    const users = read(KEYS.users, []);
    const conflict = (mail, exceptId) => { if (users.some(u => u.email === mail && u.id !== exceptId)) fail('Este correo ya está registrado.'); };
    if (!id && method === 'GET') {
      return users.filter(u => live(u) && (user.role !== 'seller' || ['admin', 'seller'].includes(u.role)))
        .map(({ password, deleted, ...u }) => u).sort((a, b) => b.created.localeCompare(a.created));
    }
    if (!id && method === 'POST') {
      if (!ROLES.includes(body.role)) fail('Rol inválido.');
      if (user.role === 'seller' && body.role !== 'seller') fail('Un vendedor solo puede crear otros vendedores.');
      const name = text(body.name, 'Nombre', 100), mail = email(body.email), pass = password(body.password);
      conflict(mail);
      const newId = uid();
      users.push({ id: newId, name, email: mail, password: await hashPassword(pass), role: body.role, active: 1, created: new Date().toISOString() });
      write(KEYS.users, users); syncClients();
      return { id: newId };
    }
    if (id) {
      const target = users.find(u => u.id === id && live(u));
      if (!target) fail('Usuario no encontrado.');
      if (method === 'GET') return clean(target);
      if (method === 'DELETE') {
        authorize(user, ['admin']);
        if (id === user.id) fail('No puedes eliminar tu propia cuenta.');
        target.active = 0; target.deleted = 1;
        write(KEYS.users, users);
        return { ok: true };
      }
      if (method === 'PATCH') {
        const role = body.role ?? target.role, active = body.active ?? !!target.active;
        if (!ROLES.includes(role) || typeof active !== 'boolean') fail('Rol o estado inválidos.');
        if (user.role === 'seller' && (target.role !== 'seller' || role !== 'seller' || active !== !!target.active || body.password))
          fail('Solo puedes editar los datos de vendedores; los permisos los administra el administrador.');
        if (id === user.id && (role !== target.role || active !== !!target.active)) fail('No puedes cambiar tu propio rol o estado.');
        const name = body.name === undefined ? target.name : text(body.name, 'Nombre', 100);
        const mail = body.email === undefined ? target.email : email(body.email);
        conflict(mail, id);
        const clients = read(KEYS.clients, []);
        if (clients.some(c => c.email === mail && (!c.user_id || c.user_id !== id))) fail('Correo ya utilizado por otro cliente.');
        const hash = body.password ? await hashPassword(password(body.password)) : target.password;
        Object.assign(target, { name, email: mail, password: hash, role, active: active ? 1 : 0 });
        clients.filter(c => c.user_id === id).forEach(c => { c.name = name; c.email = mail; });
        write(KEYS.users, users); write(KEYS.clients, clients);
        if (id === user.id && (body.password)) localStorage.removeItem(KEYS.session);
        syncClients();
        return { ok: true };
      }
    }
    fail('Método no permitido.');
  }

  // --- Clientes (contactos) ---
  if (path === '/clients' || m(/^\/clients\/([\w-]+)$/)) {
    authorize(user, ['admin', 'seller']);
    const id = m(/^\/clients\/([\w-]+)$/)?.[1];
    const clients = syncClients();
    if (!id && method === 'GET') return clients.filter(c => c.active).sort((a, b) => b.created.localeCompare(a.created));
    if (!id && method === 'POST') {
      const data = clientFields(body);
      if (clients.some(c => c.email === data.email)) fail('Ya existe un cliente con ese correo.');
      const newId = uid();
      clients.push({ id: newId, user_id: null, ...data, active: 1, created: new Date().toISOString() });
      write(KEYS.clients, clients);
      return { id: newId };
    }
    const c = clients.find(x => x.id === id && x.active);
    if (!c) fail('Cliente no encontrado.');
    if (method === 'GET') return c;
    if (method === 'PATCH') {
      const data = clientFields(body);
      if (clients.some(x => x.email === data.email && x.id !== id)) fail('Ya existe un cliente con ese correo.');
      // El correo de acceso se administra en Usuarios / Mi cuenta, independiente del contacto.
      Object.assign(c, data);
      write(KEYS.clients, clients);
      return { ok: true };
    }
    if (method === 'DELETE') {
      authorize(user, ['admin']);
      c.active = 0;
      write(KEYS.clients, clients);
      return { ok: true };
    }
    fail('Método no permitido.');
  }

  // --- Pedidos ---
  if (path === '/orders' && method === 'GET') {
    authorize(user);
    const orders = read(KEYS.orders, []).filter(o => live(o) && (user.role !== 'customer' || o.user_id === user.id));
    return orders.sort((a, b) => b.created.localeCompare(a.created)).map(publicOrder);
  }
  if (path === '/orders' && method === 'POST') {
    authorize(user);
    if (body.client_id) {
      authorize(user, ['admin', 'seller']);
      if (!syncClients().some(c => c.id === body.client_id && c.active)) fail('Cliente inválido.');
    }
    const key = text(body.idempotency, 'Identificador de compra', 100);
    if (!/^[\w-]{8,100}$/.test(key)) fail('Identificador inválido.');
    const orders = read(KEYS.orders, []);
    const existing = orders.find(o => o.idempotency === user.id + ':' + key);
    if (existing) return publicOrder(existing);
    if (!['cash', 'demo'].includes(body.method)) fail('Método de pago no disponible.');
    const d = body.delivery || {};
    const delivery = {
      name: text(d.name, 'Nombre', 100), phone: text(d.phone, 'Teléfono', 20, 7), address: text(d.address, 'Dirección', 200, 5),
      city: text(d.city, 'Ciudad', 80), notes: typeof d.notes === 'string' ? d.notes.slice(0, 500) : '',
      fulfillment: d.fulfillment === 'pickup' ? 'pickup' : 'delivery',
    };
    if (!/^[+\d\s()-]{7,20}$/.test(delivery.phone)) fail('Teléfono inválido.');
    if (!Array.isArray(body.items) || !body.items.length || body.items.length > 100) fail('El carrito está vacío o es demasiado grande.');
    const requested = new Map();
    for (const p of body.items) {
      const id = text(p.id, 'Producto', 100);
      if (requested.has(id)) fail('Producto duplicado.');
      requested.set(id, integer(p.quantity, 'Cantidad', 1, 100));
    }
    // Los importes se calculan aquí con los precios guardados, nunca con los del carrito.
    const products = read(KEYS.products, []), items = [];
    for (const [id, quantity] of requested) {
      const p = products.find(x => x.id === id && x.active);
      if (!p) fail('Un producto ya no está disponible.');
      if (p.stock < quantity) fail(`Existencias insuficientes de ${p.name}.`);
      items.push({ id, name: p.name, price: p.price, quantity, image: p.image });
    }
    const shipping = delivery.fulfillment === 'pickup' ? 0 : SHIPPING_FEE;
    const order = {
      id: 'BG-' + uid(), user_id: user.id, items, total: items.reduce((s, p) => s + p.price * p.quantity, 0) + shipping,
      shipping, delivery, method: body.method, payment: 'pending', status: 'nuevo', created: new Date().toISOString(),
      idempotency: user.id + ':' + key, paid_at: null,
    };
    for (const it of items) products.find(x => x.id === it.id).stock -= it.quantity;
    // Vínculo cliente-pedido: el personal elige el cliente; un usuario compra con su propio contacto.
    const clients = syncClients();
    let client = null;
    if (isStaff(user) && body.client_id) client = clients.find(c => c.id === body.client_id && c.active);
    else if (user.role === 'customer') {
      client = clients.find(c => c.user_id === user.id);
      if (client) { client.active = 1; Object.assign(client, { phone: delivery.phone, address: delivery.address, city: delivery.city }); }
    }
    if (client) {
      order.client_id = client.id;
      if (isStaff(user)) order.user_id = client.user_id || user.id; // pedido a nombre del cliente si tiene cuenta
      write(KEYS.clients, clients);
    }
    orders.push(order);
    write(KEYS.products, products); write(KEYS.orders, orders);
    return publicOrder(order);
  }
  if ((r = m(/^\/orders\/([\w-]+)\/demo-payment$/)) && method === 'POST') {
    authorize(user);
    if (!['approved', 'declined'].includes(body.result)) fail('Resultado de demostración inválido.');
    const orders = read(KEYS.orders, []), o = ownedOrder(orders, r[1], user);
    if (o.method !== 'demo') fail('Solo se pueden simular pagos de pedidos académicos.');
    if (o.payment !== 'pending') return { order: publicOrder(o) };
    if (body.result === 'approved') { o.payment = 'demo_approved'; o.paid_at = new Date().toISOString(); }
    else {
      const products = read(KEYS.products, []);
      restock(products, o.items); write(KEYS.products, products);
      o.payment = 'failed'; o.status = 'cancelado';
    }
    write(KEYS.orders, orders);
    return { order: publicOrder(o) };
  }
  if ((r = m(/^\/orders\/([\w-]+)\/delivery$/)) && method === 'PATCH') {
    authorize(user, ['admin', 'seller']);
    const orders = read(KEYS.orders, []), o = orders.find(x => x.id === r[1] && live(x));
    if (!o) fail('Pedido no encontrado.');
    if (['cancelado', 'entregado'].includes(o.status)) fail('No se puede editar un pedido cerrado.');
    const phone = text(body.phone, 'Teléfono', 20, 7);
    if (!/^[+\d\s()-]{7,20}$/.test(phone)) fail('Teléfono inválido.');
    Object.assign(o.delivery, { name: text(body.name, 'Nombre', 100), phone, address: text(body.address, 'Dirección', 200, 5), city: text(body.city, 'Ciudad', 80), notes: typeof body.notes === 'string' ? body.notes.slice(0, 500) : '' });
    write(KEYS.orders, orders);
    return { ok: true };
  }
  if ((r = m(/^\/orders\/([\w-]+)$/)) && method === 'GET') {
    authorize(user);
    return publicOrder(ownedOrder(read(KEYS.orders, []), r[1], user));
  }
  if ((r = m(/^\/orders\/([\w-]+)$/)) && method === 'DELETE') {
    authorize(user, ['admin']);
    const orders = read(KEYS.orders, []), o = orders.find(x => x.id === r[1] && live(x));
    if (!o) fail('Pedido no encontrado.');
    if (!['cancelado', 'entregado'].includes(o.status)) fail('Cancela o entrega el pedido antes de eliminarlo.');
    if (o.status === 'entregado' && o.payment === 'pending') fail('Registra el cobro antes de eliminar el pedido.');
    o.deleted = 1; // baja lógica: no devuelve existencias ni representa un reembolso
    write(KEYS.orders, orders);
    return { ok: true };
  }
  if ((r = m(/^\/orders\/([\w-]+)$/)) && method === 'PATCH') {
    authorize(user);
    const orders = read(KEYS.orders, []), o = ownedOrder(orders, r[1], user), staff = isStaff(user);
    if (body.action === 'collect') {
      if (!staff) fail('Acción no permitida.');
      if (o.method !== 'cash' || o.status !== 'entregado' || o.payment !== 'pending') fail('Solo se puede cobrar contraentrega al entregar el pedido.');
      o.payment = 'paid'; o.paid_at = new Date().toISOString();
      write(KEYS.orders, orders);
      return { ok: true };
    }
    const target = body.status, transitions = { nuevo: ['preparando', 'cancelado'], preparando: ['en_camino'], en_camino: ['entregado'] };
    if (!transitions[o.status]?.includes(target)) fail('Cambio de estado no permitido.');
    if (!staff && !(o.status === 'nuevo' && target === 'cancelado' && o.user_id === user.id && o.method === 'cash')) fail('Acción no permitida.');
    if (o.method === 'demo' && !['paid', 'demo_approved'].includes(o.payment)) fail('Espera la confirmación del pago.');
    if (target === 'cancelado') {
      if (o.payment !== 'pending') fail('No se puede cancelar un pedido cobrado.');
      const products = read(KEYS.products, []);
      restock(products, o.items); write(KEYS.products, products);
      o.status = 'cancelado'; o.payment = 'cancelled';
    } else o.status = target;
    write(KEYS.orders, orders);
    return { ok: true };
  }

  fail('Ruta no encontrada.');
}
