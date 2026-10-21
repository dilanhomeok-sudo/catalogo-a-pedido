(function () {
  // ---- Configuración ----
  var WHATSAPP = '5493751604665'; // número con código de país, sin + ni espacios (ej: 5493764123456). Vacío = WhatsApp pide elegir contacto.
  var STORE = 'Dilan Home';

  var LUSTRES = [
    { n: 'Natural', c: '#c98a4b', s: 0 }, { n: 'Miel', c: '#b8741f', s: 0 },
    { n: 'Cedro', c: '#6b2e1a', s: 0 }, { n: 'Nogal', c: '#3b2416', s: 0 },
    { n: 'Wengue', c: '#2a1a14', s: 0.10 }, { n: 'Blanco', c: '#f4f1ea', s: 0.15 },
    { n: 'Negro', c: '#111', s: 0.15 }
  ];
  var CAT_ORDER = ['Juegos de comedor', 'Sillas', 'Mesas', 'Complementos'];
  var LISTA = CATALOGO.recargoLista;
  var items = CATALOGO.items;

  var $ = function (id) { return document.getElementById(id); };
  var money = function (n) { return '$' + Math.round(n).toLocaleString('es-AR'); };
  var round100 = function (n) { return Math.round(n / 100) * 100; };
  var el = function (tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

  var state = { wood: 'Pino', cat: 'Todo', sub: 'Todo', q: '' };
  var cart = [];
  try { cart = JSON.parse(localStorage.getItem('dimadera-cart') || '[]'); } catch (e) {}
  function saveCart() { try { localStorage.setItem('dimadera-cart', JSON.stringify(cart)); } catch (e) {} }

  // ---- Precios ----
  function surcharge(name) { var l = LUSTRES.filter(function (x) { return x.n === name; })[0]; return l ? l.s : 0; }
  function priceEf(base, lus) { return round100(base * (1 + surcharge(lus))); }
  function priceLista(ef) { return Math.round(ef * LISTA); }
  function byId(id) { return items.filter(function (i) { return i.id === id; })[0]; }

  // ---- Filtros ----
  function visible() {
    var q = state.q.trim().toLowerCase();
    return items.filter(function (i) {
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
      var b = el('button', '', name); b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(state.wood === name));
      b.onclick = function () { state.wood = name; state.cat = 'Todo'; state.sub = 'Todo'; render(); };
      w.appendChild(b);
    });
  }

  function chip(parent, label, pressed, fn) {
    var b = el('button', '', label); b.setAttribute('aria-pressed', String(pressed)); b.onclick = fn; parent.appendChild(b);
  }

  function renderChips() {
    var ofWood = items.filter(function (i) { return i.wood === state.wood; });
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
      var c = el('button', 'card'); c.type = 'button';
      c.appendChild(photo(i));
      var b = el('div', 'b');
      b.appendChild(el('span', 'tag', i.sub));
      b.appendChild(el('h3', '', i.name));
      b.appendChild(el('span', 'meta', i.model + (i.variants.length > 1 ? ' · ' + i.variants.length + ' medidas' : '')));
      var p = el('div', 'prices');
      var a = el('div'); a.appendChild(el('small', '', (i.variants.length > 1 ? 'Desde ' : '') + 'lista')); a.appendChild(el('b', '', money(priceLista(min))));
      var e = el('div', 'ef'); e.appendChild(el('small', '', 'Efectivo')); e.appendChild(el('b', '', money(min)));
      p.appendChild(a); p.appendChild(e); b.appendChild(p); c.appendChild(b);
      c.onclick = function () { openModal(i); };
      g.appendChild(c);
    });
  }

  function render() { renderWoods(); renderChips(); renderGrid(); }

  // ---- Modal de producto ----
  var cur = null, sel = { v: 0, lus: 'Natural', qty: 1, tap: 'Tela' };

  function openModal(i) {
    cur = i; sel = { v: 0, lus: 'Natural', qty: 1, tap: 'Tela' };
    $('mImg').replaceWith(Object.assign(photo(i, 'm-img'), { id: 'mImg' }));
    $('mTag').textContent = i.wood + ' · ' + i.sub;
    $('mName').textContent = i.name + ' (' + i.model + ')';
    $('mDesc').textContent = i.desc;
    var vs = $('mVar'); vs.textContent = '';
    i.variants.forEach(function (v, k) { var o = el('option', '', v.l); o.value = k; vs.appendChild(o); });
    $('fVar').hidden = i.variants.length === 1 && i.variants[0].l === 'Unidad';
    $('fTap').hidden = !i.tap;
    $('mTapSel').value = 'Tela';
    renderLustres(); updatePrice();
    $('modalWrap').hidden = false; document.body.style.overflow = 'hidden';
    $('mClose').focus();
  }
  function closeModal() { $('modalWrap').hidden = true; document.body.style.overflow = ''; }

  function renderLustres() {
    var box = $('mLus'); box.textContent = '';
    LUSTRES.forEach(function (l) {
      var b = el('button'); b.type = 'button'; b.setAttribute('aria-pressed', String(sel.lus === l.n));
      var dot = el('i'); dot.style.background = l.c; b.appendChild(dot);
      b.appendChild(document.createTextNode(l.n + (l.s ? ' +' + Math.round(l.s * 100) + '%' : '')));
      b.onclick = function () { sel.lus = l.n; renderLustres(); updatePrice(); };
      box.appendChild(b);
    });
    $('mLusNote').textContent = 'Wengue, blanco y negro son lustres especiales con recargo.';
  }

  function updatePrice() {
    var ef = priceEf(cur.variants[sel.v].p, sel.lus);
    $('mEf').textContent = money(ef * sel.qty);
    $('mLista').textContent = money(priceLista(ef) * sel.qty);
    $('mQty').textContent = sel.qty;
  }

  $('mVar').onchange = function () { sel.v = +this.value; updatePrice(); };
  $('mTapSel').onchange = function () { sel.tap = this.value; };
  $('mMinus').onclick = function () { sel.qty = Math.max(1, sel.qty - 1); updatePrice(); };
  $('mPlus').onclick = function () { sel.qty = Math.min(99, sel.qty + 1); updatePrice(); };
  $('mClose').onclick = closeModal;
  $('modalWrap').addEventListener('click', function (e) { if (e.target === this) closeModal(); });

  $('mAdd').onclick = function () {
    var key = [cur.id, sel.v, sel.lus, cur.tap ? sel.tap : ''].join('|');
    var ex = cart.filter(function (l) { return l.key === key; })[0];
    if (ex) ex.qty = Math.min(99, ex.qty + sel.qty);
    else cart.push({ key: key, id: cur.id, v: sel.v, lus: sel.lus, tap: cur.tap ? sel.tap : '', qty: sel.qty });
    saveCart(); renderCart(); closeModal(); toast('Agregado a tu pedido');
  };

  // ---- Carrito ----
  function lineData(l) {
    var i = byId(l.id); if (!i || !i.variants[l.v]) return null;
    var ef = priceEf(i.variants[l.v].p, l.lus);
    return { i: i, v: i.variants[l.v], ef: ef, lista: priceLista(ef) };
  }

  function renderCart() {
    cart = cart.filter(lineData);
    var n = cart.reduce(function (s, l) { return s + l.qty; }, 0);
    $('cartCount').textContent = n;
    var list = $('cList'); list.textContent = '';
    $('cFoot').hidden = cart.length === 0;
    if (!cart.length) { list.appendChild(el('p', 'cart-empty', 'Todavía no agregaste productos.')); return; }
    var tEf = 0, tLi = 0;
    cart.forEach(function (l) {
      var d = lineData(l); tEf += d.ef * l.qty; tLi += d.lista * l.qty;
      var row = el('div', 'line');
      row.appendChild(photo(d.i));
      var mid = el('div');
      mid.appendChild(el('h4', '', d.i.name + ' · ' + d.i.wood));
      var det = [d.v.l === 'Unidad' ? null : d.v.l, 'Lustre ' + l.lus, l.tap ? 'Tapizado ' + l.tap.toLowerCase() : null].filter(Boolean).join(' · ');
      mid.appendChild(el('p', '', det));
      var q = el('div', 'qty');
      var m = el('button', '', '−'), c = el('b', '', l.qty), p = el('button', '', '+');
      m.type = p.type = 'button';
      m.onclick = function () { if (l.qty > 1) l.qty--; saveCart(); renderCart(); };
      p.onclick = function () { if (l.qty < 99) l.qty++; saveCart(); renderCart(); };
      q.appendChild(m); q.appendChild(c); q.appendChild(p); mid.appendChild(q);
      var rm = el('button', 'rm', 'Quitar'); rm.onclick = function () { cart.splice(cart.indexOf(l), 1); saveCart(); renderCart(); };
      mid.appendChild(rm);
      var pr = el('div', 'pr');
      pr.appendChild(el('small', '', 'Lista')); pr.appendChild(el('div', '', money(d.lista * l.qty)));
      pr.appendChild(el('small', '', 'Efectivo')); pr.appendChild(el('b', '', money(d.ef * l.qty)));
      row.appendChild(mid); row.appendChild(pr); list.appendChild(row);
    });
    $('cLista').textContent = money(tLi); $('cEf').textContent = money(tEf);
  }

  function orderText() {
    var t = 'Hola ' + STORE + '! Quiero hacer este pedido de muebles Dimadera (fabricación a pedido):\n\n';
    var tEf = 0, tLi = 0;
    cart.forEach(function (l, k) {
      var d = lineData(l); tEf += d.ef * l.qty; tLi += d.lista * l.qty;
      t += (k + 1) + '. ' + d.i.name + ' (' + d.i.model + ') · ' + d.i.wood + '\n';
      if (d.v.l !== 'Unidad') t += '   ' + d.v.l + '\n';
      t += '   Lustre ' + l.lus + (l.tap ? ' · Tapizado ' + l.tap.toLowerCase() : '') + '\n';
      t += '   ' + l.qty + ' x ' + money(d.ef) + ' efectivo (' + money(d.lista) + ' lista) = ' + money(d.ef * l.qty) + '\n';
    });
    t += '\nTotal efectivo/transferencia: ' + money(tEf) + '\nTotal precio de lista: ' + money(tLi);
    var nm = $('cName').value.trim(), nt = $('cNote').value.trim();
    if (nm) t += '\n\nNombre: ' + nm;
    if (nt) t += '\nNotas: ' + nt;
    return t;
  }

  $('cSend').onclick = function () {
    if (!cart.length) return;
    var url = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(orderText());
    window.open(url, '_blank', 'noopener');
  };
  $('cCopy').onclick = function () {
    var t = orderText();
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { toast('Pedido copiado'); }, function () { toast('No se pudo copiar'); });
    else toast('No se pudo copiar');
  };
  $('cClear').onclick = function () { if (confirm('¿Vaciar el pedido?')) { cart = []; saveCart(); renderCart(); } };
  $('openCart').onclick = function () { $('cartWrap').hidden = false; document.body.style.overflow = 'hidden'; };
  function closeCart() { $('cartWrap').hidden = true; document.body.style.overflow = ''; }
  $('cClose').onclick = closeCart;
  $('cartWrap').addEventListener('click', function (e) { if (e.target === this) closeCart(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeModal(); closeCart(); } });

  var tt;
  function toast(m) { var t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(tt); tt = setTimeout(function () { t.hidden = true; }, 1800); }

  $('q').oninput = function () { state.q = this.value; renderGrid(); };

  render(); renderCart();
})();
