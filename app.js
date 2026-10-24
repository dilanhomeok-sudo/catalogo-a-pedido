(function () {
  'use strict';
  var CFG = window.APP_CONFIG, RUBROS = window.RUBROS;
  var PROVS = window.PROVEEDORES.filter(function (p) { return p.activo; });
  var PAGE = 24;

  var $ = function (id) { return document.getElementById(id); };
  var money = function (n) { return '$' + Math.round(n).toLocaleString('es-AR'); };
  var round100 = function (n) { return Math.round(n / 100) * 100; };
  var el = function (tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  var prov = function (id) { return window.PROVEEDORES.filter(function (p) { return p.id === id; })[0]; };
  var norm = function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };

  // ---------- Catálogos: se cargan todos al inicio (permite buscar y comparar entre proveedores) ----------
  window.CATALOGOS = window.CATALOGOS || {};
  var ITEMS = [], INDEX = {};
  function loadCatalog(id) {
    return new Promise(function (ok) {
      if (CATALOGOS[id]) return ok(true);
      var s = document.createElement('script'); s.src = 'data/' + id + '.js';
      s.onload = function () { ok(!!CATALOGOS[id]); }; s.onerror = function () { ok(false); };
      document.head.appendChild(s);
    });
  }
  function indexar() {
    ITEMS = []; INDEX = {};
    PROVS.forEach(function (p) {
      var c = CATALOGOS[p.id]; if (!c) return;
      c.items.forEach(function (i) {
        i.prov = p.id; i.marca = p.nombre; i._q = norm([i.nombre, i.modelo, i.sub, i.rubro, i.desc, p.nombre, Object.keys(i.attrs || {}).map(function (k) { return i.attrs[k]; }).join(' ')].join(' '));
        i._min = Math.min.apply(null, i.variantes.map(function (v) { return v.p; }));
        ITEMS.push(i); INDEX[p.id + ':' + i.id] = i;
      });
    });
  }
  var itemOf = function (p, id) { return INDEX[p + ':' + id]; };

  // ---------- Estado ----------
  var state = { rubro: 'todo', marca: '', mat: '', sub: '', q: '', ord: 'rel', n: PAGE };
  var cart = [];
  try { cart = JSON.parse(localStorage.getItem('pedidos-cart2') || '[]'); } catch (e) {}
  function saveCart() { try { localStorage.setItem('pedidos-cart2', JSON.stringify(cart)); } catch (e) {} }

  // ---------- Precios y opciones (todo configurado por datos) ----------
  var grupoDe = function (i, gid) { return (i.grupos && i.grupos[gid]) || CATALOGOS[i.prov].grupos[gid]; };   // grupos propios del producto o del catálogo
  var valorDe = function (i, gid, nombre) { var g = grupoDe(i, gid); return g && g.valores.filter(function (v) { return v.n === nombre; })[0]; };
  // precio base de la variante; una opción con "alt" usa el precio alternativo de la variante (ej: sin tela);
  // una opción con "s" suma un recargo porcentual (ej: lustre especial)
  function priceEf(i, v, opts) {
    var base = v.p, s = 0;
    (i.opciones || []).forEach(function (gid) {
      var val = valorDe(i, gid, opts[gid]); if (!val) return;
      if (val.alt && v[val.alt]) base = v[val.alt];
      s += val.s || 0;
    });
    return round100(base * (1 + s));
  }
  var priceLista = function (i, ef) { return Math.round(ef * CATALOGOS[i.prov].recargoLista); };
  function optsText(i, opts) {
    return (i.opciones || []).map(function (gid) { var g = grupoDe(i, gid); return g.label + ': ' + (opts[gid] || 'a definir'); }).join(' · ');
  }
  var atribText = function (i) { return Object.keys(i.attrs || {}).map(function (k) { return i.attrs[k]; }).join(' · '); };

  // ---------- Rutas: #/  (rubros)   #/r/<rubro|todo>?marca=&mat=&sub=&q=&ord= ----------
  function parseHash() {
    var h = (location.hash || '#/').slice(1), qs = {}, i = h.indexOf('?');
    if (i >= 0) { h.slice(i + 1).split('&').forEach(function (p) { var kv = p.split('='); if (kv[0]) qs[kv[0]] = decodeURIComponent((kv[1] || '').replace(/\+/g, ' ')); }); h = h.slice(0, i); }
    return { path: h, qs: qs };
  }
  function buildHash() {
    var qs = [], add = function (k, v) { if (v) qs.push(k + '=' + encodeURIComponent(v)); };
    add('marca', state.marca); add('mat', state.mat); add('sub', state.sub); add('q', state.q); add('ord', state.ord === 'rel' ? '' : state.ord);
    return '#/r/' + state.rubro + (qs.length ? '?' + qs.join('&') : '');
  }
  function sync() { try { history.replaceState(history.state, '', buildHash()); } catch (e) {} }

  function route() {
    var r = parseHash(), m = r.path.match(/^\/r\/([\w-]+)/), legacy = r.path.match(/^\/(\w+)$/);
    $('shopLink').href = CFG.tiendaUrl;
    if (m) {
      state = { rubro: m[1], marca: r.qs.marca || '', mat: r.qs.mat || '', sub: r.qs.sub || '', q: r.qs.q || '', ord: r.qs.ord || 'rel', n: PAGE };
      return showList();
    }
    if (legacy && prov(legacy[1])) { location.replace('#/r/todo?marca=' + legacy[1]); return; }   // enlaces viejos: #/dimadera
    showHome();
  }

  // ---------- Inicio ----------
  function showHome() {
    $('cat').hidden = true; $('hub').hidden = false; $('lineName').textContent = 'Pedidos a fábrica';
    document.title = 'Pedidos a fábrica · Dilan Home';
    var g = $('rubroGrid'); g.textContent = '';
    RUBROS.forEach(function (r) {
      var its = ITEMS.filter(function (i) { return i.rubro === r.nombre; }); if (!its.length) return;
      var con = its.filter(function (i) { return i.img; })[0];
      var a = el('a', 'rubro-card'); a.href = '#/r/' + r.id;
      var ph = el('div', 'ph'); if (con) { var im = el('img'); im.src = con.img; im.alt = ''; im.loading = 'lazy'; ph.appendChild(im); } a.appendChild(ph);
      var b = el('div', 'b'); b.appendChild(el('h3', '', r.nombre)); b.appendChild(el('span', 'meta', its.length + (its.length === 1 ? ' producto' : ' productos'))); a.appendChild(b); g.appendChild(a);
    });
    var m = $('marcas'); m.textContent = '';
    PROVS.forEach(function (p) {
      if (!CATALOGOS[p.id]) return;
      var a = el('a', 'marca-card'); a.href = '#/r/todo?marca=' + p.id;
      a.appendChild(el('b', '', p.nombre)); a.appendChild(el('span', '', p.desc || '')); a.appendChild(el('small', '', p.plazo || '')); m.appendChild(a);
    });
  }
  $('heroSearch').addEventListener('submit', function (e) { e.preventDefault(); var q = $('hq').value.trim(); location.hash = '#/r/todo' + (q ? '?q=' + encodeURIComponent(q) : ''); });

  // ---------- Listado ----------
  var rubroNombre = function (id) { var r = RUBROS.filter(function (x) { return x.id === id; })[0]; return r && r.nombre; };
  function base() {                       // productos del rubro (sin otros filtros)
    var rn = rubroNombre(state.rubro);
    return ITEMS.filter(function (i) { return state.rubro === 'todo' || i.rubro === rn; });
  }
  function visible() {
    var words = norm(state.q).split(/\s+/).filter(Boolean);
    var list = base().filter(function (i) {
      if (state.marca && i.prov !== state.marca) return false;
      if (state.mat && (i.attrs || {}).madera !== state.mat) return false;
      if (state.sub && i.sub !== state.sub) return false;
      return words.every(function (w) { return i._q.indexOf(w) >= 0; });
    });
    if (state.ord === 'min') list.sort(function (a, b) { return a._min - b._min; });
    else if (state.ord === 'max') list.sort(function (a, b) { return b._min - a._min; });
    else if (state.ord === 'az') list.sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); });
    return list;
  }
  function showList() {
    $('hub').hidden = true; $('cat').hidden = false;
    var rn = state.rubro === 'todo' ? (state.marca && prov(state.marca) ? prov(state.marca).nombre : 'Todos los productos') : (rubroNombre(state.rubro) || 'Productos');
    $('catTitle').textContent = rn; $('lineName').textContent = rn; document.title = rn + ' · Pedidos a fábrica · Dilan Home';
    $('q').value = state.q; $('ord').value = state.ord;
    render(); window.scrollTo(0, 0);
  }
  function chip(parent, label, pressed, fn, count) {
    var b = el('button', '', label); b.type = 'button'; b.setAttribute('aria-pressed', String(pressed)); b.onclick = fn;
    if (count != null) b.appendChild(el('small', '', ' ' + count)); parent.appendChild(b);
  }
  function renderFiltros() {
    var b0 = base(), box = $('filtros'); box.textContent = '';
    var cnt = function (key, val) { return b0.filter(function (i) { return key === 'prov' ? i.prov === val : (i.attrs || {}).madera === val; }).length; };
    var marcas = []; b0.forEach(function (i) { if (marcas.indexOf(i.prov) < 0) marcas.push(i.prov); });
    var n = 0;
    if (marcas.length > 1 || state.marca) {
      var g = el('div', 'fgrp'); g.appendChild(el('span', 'flab', 'Marca'));
      var r = el('div', 'chips'); chip(r, 'Todas', !state.marca, function () { state.marca = ''; state.n = PAGE; render(); });
      marcas.forEach(function (m) { chip(r, prov(m).nombre, state.marca === m, function () { state.marca = m; state.n = PAGE; render(); }, cnt('prov', m)); });
      g.appendChild(r); box.appendChild(g); if (state.marca) n++;
    }
    var mats = []; b0.forEach(function (i) { var m = (i.attrs || {}).madera; if (m && mats.indexOf(m) < 0) mats.push(m); });
    if (mats.length) {
      var g2 = el('div', 'fgrp'); g2.appendChild(el('span', 'flab', 'Madera'));
      var r2 = el('div', 'chips'); chip(r2, 'Todas', !state.mat, function () { state.mat = ''; state.n = PAGE; render(); });
      mats.forEach(function (m) { chip(r2, m, state.mat === m, function () { state.mat = m; state.n = PAGE; render(); }, cnt('mat', m)); });
      g2.appendChild(r2); box.appendChild(g2); if (state.mat) n++;
    }
    var fb = $('filtN'); fb.textContent = n; fb.hidden = !n;
    box.classList.toggle('vacio', !box.children.length); $('filtBtn').hidden = !box.children.length;
    // tipos de producto (subcategoría) dentro del rubro
    var sb = $('subs'); sb.textContent = '';
    if (state.rubro !== 'todo') {
      var subs = []; b0.forEach(function (i) { if ((!state.marca || i.prov === state.marca) && (!state.mat || (i.attrs || {}).madera === state.mat) && subs.indexOf(i.sub) < 0) subs.push(i.sub); });
      if (subs.length > 1) {
        chip(sb, 'Todos', !state.sub, function () { state.sub = ''; state.n = PAGE; render(); });
        subs.forEach(function (s) { chip(sb, s, state.sub === s, function () { state.sub = s; state.n = PAGE; render(); }); });
      }
    }
  }
  function photo(i, cls) {
    var d = el('div', cls || 'ph');
    if (i.img) { var im = el('img'); im.src = i.img; im.alt = i.nombre + (i.sub ? ' (' + i.sub + ')' : ''); im.loading = 'lazy'; d.appendChild(im); }
    else { d.classList.add('none'); d.textContent = 'Foto próximamente'; }
    return d;
  }
  function renderGrid() {
    var list = visible(), g = $('grid'); g.textContent = '';
    $('empty').hidden = list.length > 0;
    $('count').textContent = list.length + (list.length === 1 ? ' producto' : ' productos');
    list.slice(0, state.n).forEach(function (i) {
      var c = el('button', 'card'); c.type = 'button'; c.appendChild(photo(i));
      var b = el('div', 'b');
      b.appendChild(el('span', 'tag', i.marca + ' · ' + i.sub)); b.appendChild(el('h3', '', i.nombre));
      b.appendChild(el('span', 'meta', [i.modelo, atribText(i), i.variantes.length > 1 ? i.variantes.length + ' opciones' : (i.variantes[0].u > 1 ? 'Caja de ' + i.variantes[0].u : '')].filter(Boolean).join(' · ')));
      var p = el('div', 'prices');
      var a = el('div'); a.appendChild(el('small', '', (i.variantes.length > 1 ? 'Desde ' : '') + 'lista')); a.appendChild(el('b', '', money(priceLista(i, i._min))));
      var e = el('div', 'ef'); e.appendChild(el('small', '', 'Efectivo')); e.appendChild(el('b', '', money(i._min)));
      p.appendChild(a); p.appendChild(e); b.appendChild(p); c.appendChild(b);
      c.onclick = function () { openModal(i); };
      g.appendChild(c);
    });
    var rest = list.length - state.n, mb = $('more');
    mb.hidden = rest <= 0; mb.textContent = 'Ver más productos (' + Math.max(rest, 0) + ' más)';
  }
  function render() { renderFiltros(); renderGrid(); sync(); }
  $('more').onclick = function () { state.n += PAGE; renderGrid(); };
  $('q').oninput = function () { state.q = this.value; state.n = PAGE; renderGrid(); sync(); };
  $('ord').onchange = function () { state.ord = this.value; state.n = PAGE; renderGrid(); sync(); };
  $('clearF').onclick = function () { state.marca = state.mat = state.sub = state.q = ''; $('q').value = ''; state.n = PAGE; render(); };
  $('filtBtn').onclick = function () { var o = $('filtros').classList.toggle('open'); this.setAttribute('aria-expanded', String(o)); };

  // ---------- Detalle de producto ----------
  var cur = null, sel = { v: 0, opts: {}, qty: 1 };
  function openModal(i) {
    cur = i; sel = { v: 0, opts: {}, qty: 1 };
    (i.opciones || []).forEach(function (gid) { var d = grupoDe(i, gid).def; if (d) sel.opts[gid] = d; });
    $('mImg').replaceWith(Object.assign(photo(i, 'm-img'), { id: 'mImg' }));
    $('mTag').textContent = i.marca + ' · ' + i.sub + (atribText(i) ? ' · ' + atribText(i) : '');
    $('mName').textContent = i.nombre + (i.modelo ? ' (' + i.modelo + ')' : '');
    $('mDesc').textContent = i.desc || '';
    var vs = $('mVar'); vs.textContent = '';
    i.variantes.forEach(function (v, k) { var o = el('option', '', v.l); o.value = k; vs.appendChild(o); });
    $('fVar').hidden = i.variantes.length === 1 && (!i.variantes[0].l || i.variantes[0].l === 'Unidad' || i.variantes[0].l === 'Único');
    var pv = prov(i.prov); $('mPlazo').textContent = pv && pv.plazo ? 'Plazo: ' + pv.plazo : ''; $('mPlazo').hidden = !(pv && pv.plazo);
    renderGrupos(); updatePrice();
    $('modalWrap').hidden = false; document.body.style.overflow = 'hidden';
    try { history.pushState({ panel: 'modal' }, ''); } catch (e) {}
    $('mClose').focus();
  }
  function hidePanel(id) { $(id).hidden = true; document.body.style.overflow = ''; }
  function closePanel(id) {      // el botón "atrás" del celular también cierra los paneles (popstate)
    if ($(id).hidden) return;
    hidePanel(id);
    if (history.state && history.state.panel) { try { history.back(); } catch (e) {} }
  }
  function closeModal() { closePanel('modalWrap'); }
  window.addEventListener('popstate', function () { hidePanel('modalWrap'); hidePanel('cartWrap'); });
  window.addEventListener('hashchange', function () { hidePanel('modalWrap'); hidePanel('cartWrap'); route(); });

  function sw(parent, o, pressed, fn) {      // muestra con foto (o color) + nombre
    var b = el('button', 'sw'); b.type = 'button'; b.setAttribute('aria-pressed', String(pressed));
    var f = el('span', 'sw-f');
    if (o.img) { var im = el('img'); im.src = o.img; im.alt = ''; im.loading = 'lazy'; f.appendChild(im); } else f.style.background = o.c || '#eee';
    b.appendChild(f); b.appendChild(el('span', 'sw-n', o.n));
    if (o.sub) b.appendChild(el('small', '', o.sub));
    b.onclick = fn; parent.appendChild(b);
  }
  function renderGrupos() {
    var box = $('mGrupos'); box.textContent = ''; var v = cur.variantes[sel.v];
    (cur.opciones || []).forEach(function (gid) {
      var g = grupoDe(cur, gid), valores = g.valores.filter(function (x) { return !x.alt || v[x.alt]; });
      if (sel.opts[gid] && !valores.some(function (x) { return x.n === sel.opts[gid]; })) delete sel.opts[gid];
      var f = el('div', 'fld'), lab = el('span', '', g.label + ': '); lab.appendChild(el('b', '', sel.opts[gid] || 'a definir')); f.appendChild(lab);
      if (g.tipo === 'lista') {
        var s = el('select'); s.setAttribute('aria-label', g.label);
        var o0 = el('option', '', 'A definir'); o0.value = ''; s.appendChild(o0);
        valores.forEach(function (x) { var o = el('option', '', x.n + (x.s ? ' (+' + Math.round(x.s * 100) + '%)' : '')); o.value = x.n; s.appendChild(o); });
        s.value = sel.opts[gid] || ''; s.onchange = function () { if (s.value) sel.opts[gid] = s.value; else delete sel.opts[gid]; renderGrupos(); updatePrice(); };
        f.appendChild(s);
      } else {
        var w = el('div', 'swatches'); if (valores.length > 8) w.classList.add('scroll');
        valores.forEach(function (x) {
          var sub = x.alt ? Math.round((1 - v[x.alt] / v.p) * 100) + '% menos' : (x.s ? '+' + Math.round(x.s * 100) + '%' : '');
          sw(w, { n: x.n, img: x.img, c: x.c, sub: sub }, sel.opts[gid] === x.n, function () { sel.opts[gid] = x.n; renderGrupos(); updatePrice(); });
        });
        f.appendChild(w);
      }
      if (g.nota) f.appendChild(el('small', '', g.nota));
      box.appendChild(f);
    });
  }
  function updatePrice() {
    var ef = priceEf(cur, cur.variantes[sel.v], sel.opts);
    $('mEf').textContent = money(ef * sel.qty); $('mLista').textContent = money(priceLista(cur, ef) * sel.qty); $('mQty').textContent = sel.qty;
    var u = cur.variantes[sel.v].u;           // se vende por caja: se aclara el precio por unidad
    $('mCu').hidden = !(u > 1); if (u > 1) $('mCu').textContent = 'Se vende por caja de ' + u + ' unidades · ' + money(ef / u) + ' efectivo / ' + money(priceLista(cur, ef) / u) + ' lista c/u';
  }
  $('mVar').onchange = function () { sel.v = +this.value; renderGrupos(); updatePrice(); };
  $('mMinus').onclick = function () { sel.qty = Math.max(1, sel.qty - 1); updatePrice(); };
  $('mPlus').onclick = function () { sel.qty = Math.min(99, sel.qty + 1); updatePrice(); };
  $('mClose').onclick = closeModal;
  $('modalWrap').addEventListener('click', function (e) { if (e.target === this) closeModal(); });
  $('mAdd').onclick = function () {
    var falta = (cur.opciones || []).filter(function (gid) { return grupoDe(cur, gid).oblig && !sel.opts[gid]; })[0];
    if (falta) { toast('Elegí ' + grupoDe(cur, falta).label.toLowerCase()); return; }
    var opts = {}; Object.keys(sel.opts).sort().forEach(function (k) { opts[k] = sel.opts[k]; });
    var key = [cur.prov, cur.id, sel.v, JSON.stringify(opts)].join('|');
    var ex = cart.filter(function (l) { return l.key === key; })[0];
    if (ex) ex.qty = Math.min(99, ex.qty + sel.qty);
    else cart.push({ key: key, prov: cur.prov, id: cur.id, v: sel.v, opts: opts, qty: sel.qty });
    saveCart(); renderCart(); closeModal(); toast('Agregado a tu pedido');
  };

  // ---------- Pedido ----------
  function lineData(l) {
    var i = itemOf(l.prov, l.id); if (!i || !i.variantes[l.v]) return null;
    var ef = priceEf(i, i.variantes[l.v], l.opts);
    return { i: i, v: i.variantes[l.v], ef: ef, lista: priceLista(i, ef) };
  }
  var vLabel = function (d) { return d.v.l && d.v.l !== 'Unidad' && d.v.l !== 'Único' ? d.v.l : ''; };
  function renderCart() {
    cart = cart.filter(lineData);
    $('cartCount').textContent = cart.reduce(function (s, l) { return s + l.qty; }, 0);
    var list = $('cList'); list.textContent = '';
    $('cFoot').hidden = cart.length === 0 || !$('cThanks').hidden;
    if (!cart.length) { list.appendChild(el('p', 'cart-empty', 'Todavía no agregaste productos.')); return; }
    var tEf = 0, tLi = 0, last = null, multi = cart.some(function (l) { return l.prov !== cart[0].prov; });
    cart.slice().sort(function (a, b) { return a.prov < b.prov ? -1 : a.prov > b.prov ? 1 : 0; }).forEach(function (l) {
      var d = lineData(l); tEf += d.ef * l.qty; tLi += d.lista * l.qty;
      if (multi && l.prov !== last) { list.appendChild(el('h3', 'grp', d.i.marca)); last = l.prov; }
      var row = el('div', 'line'); row.appendChild(photo(d.i));
      var mid = el('div'); mid.appendChild(el('h4', '', d.i.nombre + (atribText(d.i) ? ' · ' + atribText(d.i) : '')));
      mid.appendChild(el('p', '', [vLabel(d), optsText(d.i, l.opts)].filter(Boolean).join(' · ')));
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

  // Pedido estructurado: un sub-pedido por proveedor al que se le compra ("pedidoA"); una fábrica = una hoja de compra
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
      var dl = lineData(l), pv = prov(l.prov), nombre = pv.pedidoA || pv.nombre, s = subs[nombre];
      if (!s) { s = subs[nombre] = { prov: nombre, provNombre: nombre, lineas: [], totalEf: 0, totalLista: 0 }; order.subpedidos.push(s); }
      s.lineas.push({ marca: dl.i.marca, modelo: dl.i.modelo || '', nombre: dl.i.nombre, atrib: atribText(dl.i), tipo: dl.i.sub, medida: vLabel(dl),
        opc: optsText(dl.i, l.opts), cod: dl.v.k || '', cant: l.qty, ef: dl.ef, lista: dl.lista });
      s.totalEf += dl.ef * l.qty; s.totalLista += dl.lista * l.qty; order.totalEf += dl.ef * l.qty; order.totalLista += dl.lista * l.qty;
    });
    return order;
  }
  function orderText(o) {
    var t = 'Hola ' + CFG.tienda + '! Quiero hacer este pedido (Nº ' + o.id + '):\n';
    o.subpedidos.forEach(function (s) {
      if (o.subpedidos.length > 1) t += '\n*' + s.provNombre + '*\n'; else t += '\n';
      s.lineas.forEach(function (l, k) {
        t += (k + 1) + '. ' + l.nombre + (l.modelo ? ' (' + l.modelo + ')' : '') + ' · ' + l.marca + (l.atrib ? ' · ' + l.atrib : '') + '\n';
        if (l.medida) t += '   ' + l.medida + '\n';
        if (l.opc) t += '   ' + l.opc + '\n';
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

  // ---------- Inicio de la app ----------
  $('count').textContent = ''; $('hub').hidden = false;
  Promise.all(PROVS.map(function (p) { return loadCatalog(p.id); })).then(function (res) {
    indexar();
    if (!ITEMS.length) { $('rubroGrid').textContent = 'No pudimos cargar el catálogo. Probá recargar la página.'; return; }
    route(); renderCart(); flushQueue();
  });
})();
