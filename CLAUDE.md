# Catálogo "Pedidos a fábrica" – Dilan Home

Sitio estático (GitHub Pages): https://dilanhomeok-sudo.github.io/catalogo-a-pedido/

## Regla fija: nueva lista de precios de King Koil o Inducol (Limansky)

Cuando llega una lista nueva, los precios se actualizan en **dos lugares**:

1. **Contabilium** (skill `actualizar-costos-proveedor`). Sincroniza solo a Tiendanube.
2. **Este catálogo.** No se sincroniza solo: hay que actualizarlo acá también.

Si Dilan pasa una lista nueva y solo se hizo el paso 1, avisarle que falta este catálogo.

## Cómo actualizar los precios

- Datos: `data/kingkoil.js` y `data/inducol.js` (JSON en una sola línea). Cada variante es `{"l":medida,"p":precio,"k":código}`.
- `p` = columna **CONTADO** de la lista Limansky (no el "Importe neto"). "Desde lista" en la app = `p` × `recargoLista` (1,2).
- Cruzar por **código rápido** (columna "Código rápido"). Algún EAN viene incompleto (ej. Colchoneta Yoga 95702), así que no filtrar por EAN de 13 dígitos.
- Las listas llegan como .xlsx en Drive (Resistencia = Inducol y King Koil; Reserve Luxury = Lexington, Virginia, Grand Pillow). Si dos listas comparten un código, deben coincidir; si no, avisar.
- Hacer una tabla de diferencias (código, producto, precio anterior, nuevo, % de suba) y mostrársela a Dilan antes de publicar.

## Productos nuevos y discontinuados

- Código de la lista que no está en la app → crear el ítem. Descripción y foto de https://www.kingkoil.com.ar/ (los productos se cargan por POST a `/get-content` con token antiforgery) o de la ficha de Inducol. Foto JPG 900x900 con fondo blanco en `img/kingkoil/` o `img/inducol/`. Los conjuntos reutilizan la foto del colchón.
- Código de la app que no está en la lista → **preguntar a Dilan** si se discontinuó antes de quitarlo.

## Publicar

- `git push origin main` cambia el catálogo en vivo. **Pedir OK a Dilan antes.**
- GitHub Pages tarda 1–2 minutos. Verificar después comparando los datos publicados (`data/*.js` en el sitio) con lo esperado.
