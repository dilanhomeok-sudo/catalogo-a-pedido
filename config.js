// Configuración del sitio y lista de proveedores. Se edita a mano (no lo genera ningún script).
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

// Para sumar un proveedor: agregar una entrada acá, su catálogo en data/<id>.js y sus fotos en img/<id>/.
// plantilla: tipo de pantalla de producto ('muebles' = madera + lustre + tela + medida).
window.PROVEEDORES = [
  {
    id: 'dimadera',
    nombre: 'Muebles Dimadera',
    rubro: 'Muebles de madera',
    desc: 'Juegos de comedor, sillas, mesas y complementos en pino y paraíso. Elegís lustre, tela y medida.',
    plantilla: 'muebles',
    foto: 'img/dimadera/cb-07.jpg',
    plazo: 'Se fabrica a pedido; el plazo se confirma al tomar el pedido.',
    activo: true
  }
  // { id: 'kingkoil', nombre: 'King Koil', rubro: 'Colchones y sommiers', plantilla: 'colchones', activo: false },
  // { id: 'inducol',  nombre: 'Inducol',   rubro: 'Colchones y sommiers', plantilla: 'colchones', activo: false },
];
