import { money, esc, pasos } from './comun.js';
export function normalizarCarrito(value) {
  if (!Array.isArray(value)) return [];
  const items = new Map();
  for (const item of value) {
    if (!item || typeof item.id !== 'string' || !item.id || !Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > 100) continue;
    items.set(item.id, Math.min(100, (items.get(item.id) || 0) + item.quantity));
  }
  return [...items].map(([id, quantity]) => ({ id, quantity }));
}
export function contarUnidades(items) {
  return items.reduce((total, item) => total + item.quantity, 0);
}
export function agregarProducto(items, product) {
  if (!product?.active) throw Error('Este producto ya no está disponible.');
  const current = items.find(item => item.id === product.id);
  if ((current?.quantity || 0) >= Math.min(product.stock, 100)) throw Error('Ya tienes el máximo disponible de este producto.');
  return current ? items.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
    : [...items, { id: product.id, quantity: 1 }];
}
export function cambiarCantidad(items, id, delta, available) {
  if (![1, -1].includes(delta)) throw Error('Cambio de cantidad inválido.');
  const current = items.find(item => item.id === id);
  if (!current) return items;
  const quantity = current.quantity + delta;
  // Se permite reducir incluso si el stock cambió en otra sesión.
  if (delta > 0 && quantity > Math.min(available || 0, 100)) throw Error('No hay más existencias disponibles.');
  return items.map(item => item.id === id ? { ...item, quantity } : item).filter(item => item.quantity > 0);
}
export function quitarProducto(items, id) {
  return items.filter(item => item.id !== id);
}

export function productCard(p){return `<article class="product"><div class="product-photo"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy"><span class="product-tag">${esc(p.category).toUpperCase()}</span></div><div class="product-info"><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p><div class="product-bottom"><span class="price">${money(p.price)}</span><button class="add-button" data-action="add" data-id="${esc(p.id)}" ${p.stock<1?'disabled':''}>${p.stock<1?'Agotado':'+ Añadir'}</button></div><span class="stock">${p.stock>0?`${p.stock} disponibles`:'Volveremos pronto'}</span></div></article>`}

export function vistaCatalogo({products,category,query,filtered}){const categories=['Todos',...new Set(products.filter(p=>p.active).map(p=>p.category))];return `<div class="journey">${pasos(1)}</div><section class="hero"><div class="hero-copy"><span class="eyebrow">EL ANTOJO TIENE UN NUEVO FAVORITO</span><h1>Buenos ingredientes.<br><em>Grandes momentos.</em></h1><p>Hamburguesas hechas al momento, sabores que se quedan. Elige tu favorita y nosotros ponemos el resto.</p><a class="primary" href="#carta">Explorar el menú <span aria-hidden="true">↗</span></a><span class="mini">Domicilio o recogida en tienda</span></div><div class="hero-visual"><img src="images/burger.png" alt="Hamburguesa con carne, queso y vegetales frescos"><div class="hero-label"><small>DE LA CASA</small>con amor.</div></div></section><div class="benefits"><span><b>01</b> · Ingredientes frescos</span><span><b>02</b> · Preparación al momento</span><span><b>03</b> · Tu pedido, a tu manera</span></div><section class="page" id="carta"><div class="section-head"><div><span class="eyebrow">ELIGE. COMBINA. DISFRUTA.</span><h2>Nuestro menú</h2><p>Algo delicioso para cada antojo.</p></div><div class="search-wrap"><label class="small" for="search">Encuentra tu favorito</label><input class="search" id="search" type="search" placeholder="Buscar en el menú…" value="${esc(query)}"></div></div><div class="filters" aria-label="Categorías">${categories.map(c=>`<button class="filter ${category===c?'active':''}" data-action="category" data-category="${esc(c)}">${esc(c)}</button>`).join('')}</div><div class="products" id="product-grid">${filtered.map(productCard).join('')||'<div class="empty">No encontramos productos. Prueba otra búsqueda.</div>'}</div></section>`}

export function vistaCarrito({cart,products}){const rows=cart.map(entry=>({entry,product:products.find(p=>p.id===entry.id)})),subtotal=rows.reduce((s,{entry,product})=>s+(product?.price||0)*entry.quantity,0);return rows.length?`${rows.map(({entry:p,product:x})=>`<div class="cart-item"><img src="${esc(x?.image||'images/b1.png')}" alt=""><div class="item-info"><h3>${esc(x?.name||'Producto no disponible')}</h3><span class="small">${money(x?.price||0)}${!x?.active?' · No disponible':''}</span><div><div class="quantity"><button data-action="quantity" data-id="${esc(p.id)}" data-delta="-1" aria-label="Reducir cantidad">−</button><span>${p.quantity}</span><button data-action="quantity" data-id="${esc(p.id)}" data-delta="1" aria-label="Aumentar cantidad">+</button></div></div></div><div><b class="small">${money((x?.price||0)*p.quantity)}</b><p><button class="remove" data-action="remove" data-id="${esc(p.id)}">Quitar</button></p></div></div>`).join('')}<div class="totals"><div><span>Subtotal</span><b>${money(subtotal)}</b></div><div><span>Domicilio</span><span>Se calcula al confirmar</span></div><div class="grand"><span>Subtotal</span><span>${money(subtotal)}</span></div></div><button class="primary full" data-action="detail">Ver detalle del carrito</button><button class="secondary full continue-link" data-action="clear-cart">Vaciar carrito</button><p class="muted small">Los precios y las existencias se confirman al crear el pedido.</p>`:'<div class="empty"><h3>Un antojo por resolver.</h3><p>Tu carrito está vacío.<br>Encuentra tu favorito en nuestro menú.</p><button class="primary" data-action="close-cart">Explorar el menú</button></div>'}
