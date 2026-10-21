(function () {
  'use strict';
  var CFG = window.APP_CONFIG, PROVS = window.PROVEEDORES.filter(function (p) { return p.activo; });
  var SIN_TELA = 'Sin tela / sin espuma';
  var CAT_ORDER = ['Juegos de comedor', 'Sillas', 'Mesas', 'Complementos'];

  var $ = function (id) { return document.getElementById(id); };
  var money = function (n) { return '$' + Math.round(n).toLocaleString('es-AR'); };
  var round100 = function (n) { return Math.round(n / 100) * 100; };
  var el = function (tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  var prov = function (id) { return window.PROVEEDORES.filter(function (p) { return p.id === id; })[0]; };

  // ---------- Catálogos (se cargan al entrar a cada proveedor) ----------
  window.CATALOGOS = window.CATALOGOS || {};
  var loading = {};
  function loadCatalog(id) {
    if (CATALOGOS[id]) return Promise.resolve(CATALOGOS[id]);
    if (loading[id]) return loading[id];
    loading[id] = new Promise(function (ok, fail) {
      var s = document.createElement('script'); s.src = 'data/' + id + '.js';
      s.onload = function () { if (CATALOGOS[id]) { CATALOGOS[id].items.forEach(function (i) { i.prov = id; }); ok(CATALOGOS[id]); } else fail(); };
      s.onerror = function () { delete loading[id]; fail(); }; document.head.appendChild(s);
    });
    return loading[id];
  }
  function byId(p, id) { var c = CATALOGOS[p]; return c && c.items.filter(function (i) { return i.id === id; })[0]; }

  // ---------- Estado ----------
  var state = { prov: null, wood: 'Pino', cat: 'Todo', sub: 'Todo', q: '' };
  var cart = [];
  try { cart = JSON.parse(localStorage.getItem('pedidos-cart') || '[]'); } catch (e) {}
  function saveCart() { try { localStorage.setItem('pedidos-cart', JSON.stringify(cart)); } catch (e) {} }

  // ---------- Precios (plantilla muebles) ----------
  function surcharge(p, name) {
    var all = CATALOGOS[p].lustres, k, l;
    for (k in all) { l = all[k].filter(function (x) { return x.n === name; })[0]; if (l) return l.s; }
    return 0;
  }
  // v = variante; tap = tela elegida (SIN_TELA usa el precio sin tapizar si el modelo lo tiene)
  function priceEf(p, v, lus, tap) {
    var base = (tap === SIN_TELA && v.ps) ? v.ps : v.p;
    return round100(base * (1 + surcharge(p, lus)));
  }
  function priceLista(p, ef) { return Math.round(ef * CATALOGOS[p].recargoLista); }

  // ---------- Rutas ----------
  function route() {
    var m = (location.hash || '').match(/^#\/([\w-]+)/), id = m && m[1];
    var multi = PROVS.length > 1;
    $('shopLink').href = CFG.tiendaUrl;
    if (!id && !multi) id = PROVS[0].id;           // un solo proveedor: se entra directo
    if (id && PROVS.some(function (p) { return p.id === id; })) return openProv(id);
    showHub();
  }
  function showHub() {
    state.prov = null; $('cat').hidden = true; $('hub').hidden = false; $('lineName').textContent = 'Pedidos a fábrica';
    var g = $('provGrid'); g.textContent = '';
    PROVS.forEach(function (p) {
      var a = el('a', 'prov-card'); a.href = '#/' + p.id;
      var ph = el('div', 'ph'); if (p.foto) { var im = el('img'); im.src = p.foto; im.alt = ''; ph.appendChild(im); } a.appendChild(ph);
      var b = el('div', 'b'); b.appendChild(el('span', 'tag', p.rubro)); b.appendChild(el('h3', '', p.nombre));
      b.appendChild(el('p', 'meta', p.desc)); b.appendChild(el('span', 'go', 'Ver catálogo →')); a.appendChild(b); g.appendChild(a);
    });
    document.title = 'Pedidos a fábrica · Dilan Home';
  }
  function openProv(id) {
    var p = prov(id); state = { prov: id, wood: 'Pino', cat: 'Todo', sub: 'Todo', q: '' };
    $('hub').hidden = true; $('cat').hidden = false; $('q').value = '';
    $('catTitle').textContent = p.nombre; $('catDesc').textContent = p.desc; $('backHub').hidden = PROVS.length < 2;
    $('lineName').textContent = p.nombre; document.title = p.nombre + ' · Pedidos a fábrica · Dilan Home';
    $('grid').textContent = ''; $('count').textContent = 'Cargando catálogo…';
    loadCatalog(id).then(function () { if (state.prov === id) render(); }, function () { $('count').textContent = 'No pudimos cargar el catálogo. Probá recargar la página.'; });
  }

  // ---------- Catálogo (plantilla muebles) ----------
  function items() { return CATALOGOS[state.prov].items; }
  function visible() {
    var q = state.q.trim().toLowerCase();
    return items().filter(function (i) {
      if (i.wood !== state.wood) return false;
      if (state.cat !== 'Todo' && i.cat !== state.cat) return false;
      if (state.sub !== 'Todo' && i.sub !== state.sub) return false;
      if (q && (i.name + ' ' + i.model + ' ' + i.sub + ' ' + i.cat + ' ' + i.desc).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }
  function renderWoods() {
    var w = $('woods'); w.textContent = '';
    ['Pino', 'Paraíso'].forEach(function (name) {
      var b = el('button', '', name); b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(state.wood === name));
      b.onclick = function () { state.wood = name; state.cat = 'Todo'; state.sub = 'Todo'; render(); };
      w.appendChild(b);
    });
  }
  function chip(parent, label, pressed, fn) { var b = el('button', '', label); b.setAttribute('aria-pressed', String(pressed)); b.onclick = fn; parent.appendChild(b); }
  function renderChips() {
    var ofWood = items().filter(function (i) { return i.wood === state.wood; });
    var cats = CAT_ORDER.filter(function (c) { return ofWood.some(function (i) { return i.cat === c; }); }); // oculta menús vacíos
    var box = $('cats'); box.textContent = '';
    chip(box, 'Todo', state.cat === 'Todo', function () { state.cat = 'Todo'; state.sub = 'Todo'; render(); });
    cats.forEach(function (c) { chip(box, c, state.cat === c, function () { state.cat = c; state.sub = 'Todo'; render(); }); });
    var sb = $('subs'); sb.textContent = '';
    if (state.cat !== 'Todo') {
      var subs = []; ofWood.forEach(function (i) { if (i.cat === state.cat && subs.indexOf(i.sub) < 0) subs.push(i.sub); });
      if (subs.length > 1) {
        chip(sb, 'Todas', state.sub === 'Todo', function () { state.sub = 'Todo'; render(); });
        subs.forEach(function (s) { chip(sb, s, state.sub === s, function () { state.sub = s; render(); }); });
      }
    }
  }
  function photo(i, cls) {
    var d = el('div', cls || 'ph');
    if (i.img) { var im = el('img'); im.src = i.img; im.alt = i.cat === 'Juegos de comedor' ? i.name : i.sub + ' ' + i.name; im.loading = 'lazy'; d.appendChild(im); }
    else { d.classList.add('none'); d.textContent = 'Foto próximamente'; }
    return d;
  }
  function renderGrid() {
    var list = visible(), g = $('grid'); g.textContent = '';
    $('empty').hidden = list.length > 0;
    $('count').textContent = list.length + (list.length === 1 ? ' producto' : ' productos') + ' en ' + state.wood;
    list.forEach(function (i) {
      var min = Math.min.apply(null, i.variants.map(function (v) { return v.p; }));
      var c = el('button', 'card'); c.type = 'button'; c.appendChild(photo(i));
      var b = el('div', 'b');
      b.appendChild(el('span', 'tag', i.sub)); b.appendChild(el('h3', '', i.name));
      b.appendChild(el('span', 'meta', i.model + (i.variants.length > 1 ? ' · ' + i.variants.length + ' medidas' : '')));
      var p = el('div', 'prices');
      var a = el('div'); a.appendChild(el('small', '', (i.variants.length > 1 ? 'Desde ' : '') + 'lista')); a.appendChild(el('b', '', money(priceLista(i.prov, min))));
      var e = el('div', 'ef'); e.appendChild(el('small', '', 'Efectivo')); e.appendChild(el('b', '', money(min)));
      p.appendChild(a); p.appendChild(e); b.appendChild(p); c.appendChild(b);
      c.onclick = function () { openModal(i); };
      g.appendChild(c);
    });
  }
  function render() { renderWoods(); renderChips(); renderGrid(); }

  // ---------- Detalle de producto ----------
  var cur = null, sel = { v: 0, lus: 'Natural', qty: 1, tap: '' };
  function openModal(i) {
    cur = i; sel = { v: 0, lus: 'Natural', qty: 1, tap: '' };
    $('mImg').replaceWith(Object.assign(photo(i, 'm-img'), { id: 'mImg' }));
    $('mTag').textContent = i.wood + ' · ' + i.sub;
    $('mName').textContent = i.name + ' (' + i.model + ')';
    $('mDesc').textContent = i.desc;
    var vs = $('mVar'); vs.textContent = '';
    i.variants.forEach(function (v, k) { var o = el('option', '', v.l); o.value = k; vs.appendChild(o); });
    $('fVar').hidden = i.variants.length === 1 && i.variants[0].l === 'Unidad';
    $('fTap').hidden = !i.tap;
    renderTelas(); renderLustres(); updatePrice();
    $('modalWrap').hidden = false; document.body.style.overflow = 'hidden';
    try { history.pushState({ panel: 'modal' }, ''); } catch (e) {}
    $('mClose').focus();
  }
  // Cierra el panel; si el usuario toca "atrás" en el celular, también se cierra (ver popstate)
  function hidePanel(id) { $(id).hidden = true; document.body.style.overflow = ''; }
  function closePanel(id) {
    if ($(id).hidden) return;
    hidePanel(id);
    if (history.state && history.state.panel) { try { history.back(); } catch (e) {} }
  }
  function closeModal() { closePanel('modalWrap'); }
  window.addEventListener('popstate', function () { hidePanel('modalWrap'); hidePanel('cartWrap'); });
  window.addEventListener('hashchange', function () { hidePanel('modalWrap'); hidePanel('cartWrap'); route(); });

  // Muestra con foto (o color) + nombre, como en la web del proveedor
  function sw(parent, o, pressed, fn) {
    var b = el('button', 'sw'); b.type = 'button'; b.setAttribute('aria-pressed', String(pressed));
    var f = el('span', 'sw-f');
    if (o.img) { var im = el('img'); im.src = o.img; im.alt = ''; im.loading = 'lazy'; f.appendChild(im); } else f.style.background = o.c || '#eee';
    b.appendChild(f); b.appendChild(el('span', 'sw-n', o.n));
    if (o.sub) b.appendChild(el('small', '', o.sub));
    b.onclick = fn; parent.appendChild(b);
  }
  function renderTelas() {
    var box = $('mTela'); box.textContent = ''; var v = cur.variants[sel.v];
    if (v.ps) {
      var off = Math.round((1 - v.ps / v.p) * 100);
      sw(box, { n: SIN_TELA, c: '#f1e9dd', sub: off + '% menos' }, sel.tap === SIN_TELA, function () { sel.tap = SIN_TELA; renderTelas(); updatePrice(); });
    }
    CATALOGOS[cur.prov].telas.forEach(function (t) { sw(box, t, sel.tap === t.n, function () { sel.tap = t.n; renderTelas(); updatePrice(); }); });
    $('mTelaSel').textContent = sel.tap || 'A definir';
  }
  function renderLustres() {
    var box = $('mLus'); box.textContent = '';
    CATALOGOS[cur.prov].lustres[cur.wood].forEach(function (l) {
      sw(box, { n: l.n, img: l.img, c: l.c, sub: l.s ? '+' + Math.round(l.s * 100) + '%' : '' }, sel.lus === l.n, function () { sel.lus = l.n; renderLustres(); updatePrice(); });
    });
    $('mLusSel').textContent = sel.lus;
    $('mLusNote').textContent = 'Wengue, blanco y negro son lustres especiales con recargo sobre el precio de lista.';
  }
  function updatePrice() {
    var ef = priceEf(cur.prov, cur.variants[sel.v], sel.lus, sel.tap);
    $('mEf').textContent = money(ef * sel.qty); $('mLista').textContent = money(priceLista(cur.prov, ef) * sel.qty); $('mQty').textContent = sel.qty;
  }
  $('mVar').onchange = function () { sel.v = +this.value; renderTelas(); updatePrice(); };
  $('mMinus').onclick = function () { sel.qty = Math.max(1, sel.qty - 1); updatePrice(); };
  $('mPlus').onclick = function () { sel.qty = Math.min(99, sel.qty + 1); updatePrice(); };
  $('mClose').onclick = closeModal;
  $('modalWrap').addEventListener('click', function (e) { if (e.target === this) closeModal(); });
  $('mAdd').onclick = function () {
    var tap = cur.tap ? sel.tap : '', key = [cur.prov, cur.id, sel.v, sel.lus, tap].join('|');
    var ex = cart.filter(function (l) { return l.key === key; })[0];
    if (ex) ex.qty = Math.min(99, ex.qty + sel.qty);
    else cart.push({ key: key, prov: cur.prov, id: cur.id, v: sel.v, lus: sel.lus, tap: tap, qty: sel.qty });
    saveCart(); renderCart(); closeModal(); toast('Agregado a tu pedido');
  };

  // ---------- Pedido ----------
  function lineData(l) {
    var i = byId(l.prov, l.id); if (!i || !i.variants[l.v]) return null;
    var ef = priceEf(l.prov, i.variants[l.v], l.lus, l.tap);
    return { i: i, v: i.variants[l.v], ef: ef, lista: priceLista(l.prov, ef) };
  }
  function detail(l, d) {
    return [d.v.l === 'Unidad' ? null : d.v.l, 'Lustre ' + l.lus, d.i.tap ? 'Tela: ' + (l.tap || 'a definir') : null].filter(Boolean).join(' · ');
  }
  // Los catálogos cargan de a uno: las líneas de un proveedor aún no cargado se muestran cuando llega.
  function ensureCartCatalogs() {
    var ids = []; cart.forEach(function (l) { if (!CATALOGOS[l.prov] && ids.indexOf(l.prov) < 0) ids.push(l.prov); });
    return Promise.all(ids.map(function (id) { return loadCatalog(id).catch(function () {}); }));
  }
  function renderCart() {
    var n = cart.reduce(function (s, l) { return s + l.qty; }, 0);
    $('cartCount').textContent = n;
    var list = $('cList'); list.textContent = '';
    $('cFoot').hidden = cart.length === 0 || !$('cThanks').hidden;
    if (!cart.length) { list.appendChild(el('p', 'cart-empty', 'Todavía no agregaste productos.')); return; }
    var pending = cart.some(function (l) { return !CATALOGOS[l.prov]; });
    if (pending) { list.appendChild(el('p', 'cart-empty', 'Cargando tu pedido…')); ensureCartCatalogs().then(renderCart); return; }
    cart = cart.filter(lineData);
    var tEf = 0, tLi = 0, last = null;
    cart.slice().sort(function (a, b) { return a.prov < b.prov ? -1 : a.prov > b.prov ? 1 : 0; }).forEach(function (l) {
      var d = lineData(l); tEf += d.ef * l.qty; tLi += d.lista * l.qty;
      if (PROVS.length > 1 && l.prov !== last) { list.appendChild(el('h3', 'grp', prov(l.prov).nombre)); last = l.prov; }
      var row = el('div', 'line'); row.appendChild(photo(d.i));
      var mid = el('div'); mid.appendChild(el('h4', '', d.i.name + ' · ' + d.i.wood)); mid.appendChild(el('p', '', detail(l, d)));
      var q = el('div', 'qty'), m = el('button', '', '−'), c = el('b', '', l.qty), p = el('button', '', '+');
      m.type = p.type = 'button';
      m.onclick = function () { if (l.qty > 1) l.qty--; saveCart(); renderCart(); };
      p.onclick = function () { if (l.qty < 99) l.qty++; saveCart(); renderCart(); };
      q.appendChild(m); q.appendChild(c); q.appendChild(p); mid.appendChild(q);
      var rm = el('button', 'rm', 'Quitar'); rm.type = 'button'; rm.onclick = function () { cart.splice(cart.indexOf(l), 1); saveCart(); renderCart(); };
      mid.appendChild(rm);
      var pr = el('div', 'pr'); pr.appendChild(el('small', '', 'Lista')); pr.appendChild(el('div', '', money(d.lista * l.qty)));
      pr.appendChild(el('small', '', 'Efectivo')); pr.appendChild(el('b', '', money(d.ef * l.qty)));
      row.appendChild(mid); row.appendChild(pr); list.appendChild(row);
    });
    $('cLista').textContent = money(tLi); $('cEf').textContent = money(tEf);
  }

  // Pedido estructurado: se parte en un sub-pedido por proveedor (una fábrica = una hoja de compra)
  function buildOrder() {
    var d = new Date(), pad = function (x) { return (x < 10 ? '0' : '') + x; };
    var id = 'P' + String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    var subs = {}, order = {
      id: id, fecha: d.toISOString(), token: CFG.token || '', web: $('cWeb').value,
      cliente: { nombre: $('cName').value.trim(), tel: $('cTel').value.trim(), notas: $('cNote').value.trim() },
      origen: location.href.split('#')[0] + (document.referrer ? ' < ' + document.referrer : ''),
      subpedidos: [], totalEf: 0, totalLista: 0
    };
    cart.forEach(function (l) {
      var dl = lineData(l), s = subs[l.prov];
      if (!s) { s = subs[l.prov] = { prov: l.prov, provNombre: prov(l.prov).nombre, lineas: [], totalEf: 0, totalLista: 0 }; order.subpedidos.push(s); }
      s.lineas.push({ modelo: dl.i.model, nombre: dl.i.name, madera: dl.i.wood, tipo: dl.i.sub, medida: dl.v.l === 'Unidad' ? '' : dl.v.l,
        lustre: l.lus, tela: dl.i.tap ? (l.tap || 'a definir') : '', cant: l.qty, ef: dl.ef, lista: dl.lista });
      s.totalEf += dl.ef * l.qty; s.totalLista += dl.lista * l.qty; order.totalEf += dl.ef * l.qty; order.totalLista += dl.lista * l.qty;
    });
    return order;
  }
  function orderText(o) {
    var t = 'Hola ' + CFG.tienda + '! Quiero hacer este pedido de fabricación (Nº ' + o.id + '):\n';
    o.subpedidos.forEach(function (s) {
      t += '\n*' + s.provNombre + '*\n';
      s.lineas.forEach(function (l, k) {
        t += (k + 1) + '. ' + l.nombre + ' (' + l.modelo + ')' + (l.madera ? ' · ' + l.madera : '') + '\n';
        if (l.medida) t += '   ' + l.medida + '\n';
        t += '   Lustre ' + l.lustre + (l.tela ? ' · Tela: ' + l.tela : '') + '\n';
        t += '   ' + l.cant + ' x ' + money(l.ef) + ' efectivo (' + money(l.lista) + ' lista) = ' + money(l.ef * l.cant) + '\n';
      });
    });
    t += '\nTotal efectivo/transferencia: ' + money(o.totalEf) + '\nTotal precio de lista: ' + money(o.totalLista);
    t += '\n\nNombre: ' + o.cliente.nombre + '\nTel: ' + o.cliente.tel;
    if (o.cliente.notas) t += '\nNotas: ' + o.cliente.notas;
    return t;
  }

  // Cola de envíos: si no hay conexión, el pedido queda guardado y se reintenta al volver a abrir la página
  function queue() { try { return JSON.parse(localStorage.getItem('pedidos-queue') || '[]'); } catch (e) { return []; } }
  function saveQueue(q) { try { localStorage.setItem('pedidos-queue', JSON.stringify(q)); } catch (e) {} }
  function postOrder(o) {
    if (!CFG.pedidosUrl) return Promise.resolve(false);
    return fetch(CFG.pedidosUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(o) })
      .then(function (r) { return r.json(); }).then(function (j) { return !!(j && j.ok); }).catch(function () { return false; });
  }
  function flushQueue() {
    queue().forEach(function (o) { postOrder(o).then(function (ok) { if (ok) saveQueue(queue().filter(function (x) { return x.id !== o.id; })); }); });
  }

  var lastWa = '';
  $('cFoot').addEventListener('submit', function (e) {
    e.preventDefault(); if (!cart.length) return;
    var err = $('cErr'), name = $('cName').value.trim(), tel = $('cTel').value.replace(/\D/g, '');
    if (!name) { err.textContent = 'Escribí tu nombre.'; err.hidden = false; $('cName').focus(); return; }
    if (tel.length < 8) { err.textContent = 'Escribí un WhatsApp o teléfono válido, para confirmar tu pedido.'; err.hidden = false; $('cTel').focus(); return; }
    err.hidden = true;
    var o = buildOrder(); lastWa = 'https://wa.me/' + CFG.whatsapp + '?text=' + encodeURIComponent(orderText(o));
    window.open(lastWa, '_blank', 'noopener');           // primero WhatsApp (requiere el gesto del usuario)
    if (!o.web) {                                          // campo trampa: un bot lo completa, una persona no
      var q = queue(); q.push(o); saveQueue(q);
      postOrder(o).then(function (ok) { if (ok) saveQueue(queue().filter(function (x) { return x.id !== o.id; })); });
    }
    $('tId').textContent = o.id; $('cFoot').hidden = true; $('cThanks').hidden = false;
    try { localStorage.setItem('pedidos-contacto', JSON.stringify({ n: name, t: $('cTel').value.trim() })); } catch (x) {}
  });
  $('tWa').onclick = function () { window.open(lastWa, '_blank', 'noopener'); };
  $('tNew').onclick = function () { cart = []; saveCart(); $('cThanks').hidden = true; renderCart(); closePanel('cartWrap'); };
  $('cCopy').onclick = function () {
    if (!cart.length) return; var t = orderText(buildOrder());
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { toast('Pedido copiado'); }, function () { toast('No se pudo copiar'); });
    else toast('No se pudo copiar');
  };
  $('cClear').onclick = function () { if (confirm('¿Vaciar el pedido?')) { cart = []; saveCart(); renderCart(); } };
  $('openCart').onclick = function () {
    $('cartWrap').hidden = false; document.body.style.overflow = 'hidden';
    try { history.pushState({ panel: 'cart' }, ''); } catch (e) {}
    try { var c = JSON.parse(localStorage.getItem('pedidos-contacto') || 'null'); if (c) { if (!$('cName').value) $('cName').value = c.n; if (!$('cTel').value) $('cTel').value = c.t; } } catch (e) {}
    renderCart();
  };
  function closeCart() { closePanel('cartWrap'); }
  $('cClose').onclick = closeCart;
  $('cartWrap').addEventListener('click', function (e) { if (e.target === this) closeCart(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeModal(); closeCart(); } });

  var tt;
  function toast(m) { var t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(tt); tt = setTimeout(function () { t.hidden = true; }, 1800); }
  $('q').oninput = function () { state.q = this.value; renderGrid(); };

  route(); renderCart(); flushQueue();
})();
