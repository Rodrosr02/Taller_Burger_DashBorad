export const money = value => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0,
}).format(value);
export const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));
export function pasos(actual) {
  const pasos = [
    ['index.html#menu', '1', 'Carrito'],
    ['cart.html', '2', 'Detalle del carrito'],
    ['checkout.html', '3', 'Pagar'],
  ];
  return `<ol class="purchase-steps" aria-label="Pasos de la compra">${pasos.map(([href, n, title]) =>
    `<li class="${Number(n) === actual ? 'current' : ''}"><a href="${href}" ${Number(n) === actual ? 'aria-current="step"' : ''}><span>${n}</span>${title}</a></li>`
  ).join('')}</ol>`;
}
export function imageToDataUrl(file, max = 640) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(Error('No se pudo leer la imagen.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(Error('El archivo no es una imagen válida.'));
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.8));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
