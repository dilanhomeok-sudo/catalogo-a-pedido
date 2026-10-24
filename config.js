// Configuración del sitio, rubros y proveedores. Se edita a mano (no lo genera ningún script).
window.APP_CONFIG = {
  tienda: 'Dilan Home',
  tiendaUrl: 'https://www.dilan.com.ar/',
  // WhatsApp que recibe los pedidos: código de país + número, sin + ni espacios
  whatsapp: '5493751604665',
  // Dirección de la bandeja de pedidos (Google Apps Script, ver apps-script/LEEME.md). Vacío = solo WhatsApp.
  pedidosUrl: '',
  // Clave pública simple que el script exige para guardar pedidos (evita envíos de bots). Debe coincidir con la del script.
  token: ''
};

// Rubros: lo que busca el cliente (se agrupan productos de todos los proveedores). Los productos usan estos nombres en "rubro".
window.RUBROS = [
  { id: 'comedor',    nombre: 'Juegos de comedor' },
  { id: 'mesas',      nombre: 'Mesas' },
  { id: 'sillas',     nombre: 'Sillas y banquetas' },
  { id: 'sofas',      nombre: 'Sofás y sillones' },
  { id: 'living',     nombre: 'Living y almacenaje' },
  { id: 'dormitorio', nombre: 'Dormitorio' },
  { id: 'bano',       nombre: 'Baño' },
  { id: 'colchones',  nombre: 'Colchones y sommiers' },
  { id: 'almohadas',  nombre: 'Almohadas y accesorios' }
];

// Para sumar un proveedor: agregar una entrada acá, su catálogo en data/<id>.js y sus fotos en img/<id>/ (ver skill pedidos-fabrica, Modo D).
//  nombre: marca que ve el cliente · pedidoA: a quién se le compra (agrupa la hoja de compra; por defecto = nombre)
//  plazo: texto que se muestra en la ficha del producto
window.PROVEEDORES = [
  {
    id: 'dimadera', nombre: 'Dimadera', pedidoA: 'Muebles Dimadera',
    desc: 'Fábrica misionera de muebles de madera (pino y paraíso).',
    plazo: 'Se fabrica a pedido. El plazo se confirma al tomar el pedido.',
    activo: true
  },
  {
    id: 'mundo', nombre: 'Grupo Mundo', pedidoA: 'Grupo Mundo',
    desc: 'Muebles importados de Brasil: mesas, sillas, sillones, racks, roperos y más.',
    plazo: 'Importado de Brasil: llega a Eldorado en unas 2 semanas desde que se confirma el pedido.',
    activo: true
  },
  {
    id: 'kingkoil', nombre: 'King Koil', pedidoA: 'Limansky',
    desc: 'Colchones, sommiers y almohadas King Koil.',
    plazo: 'Se pide a Limansky (fábrica): el plazo de entrega se confirma al tomar el pedido.',
    activo: true
  },
  {
    id: 'inducol', nombre: 'Inducol', pedidoA: 'Limansky',
    desc: 'Colchones, sommiers y almohadas Inducol.',
    plazo: 'Se pide a Limansky (fábrica): el plazo de entrega se confirma al tomar el pedido.',
    activo: true
  }
];
