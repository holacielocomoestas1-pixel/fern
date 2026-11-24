# Fern — app de estudio para el examen de policía tailandesa (สายอำนวยการ อก.1)

En vivo: https://fern-kevin-7f56.vercel.app (proyecto Vercel `fern`, team kevin-7f56).

## v3 (2026-11-24) — diseño completo del paquete Fern-Frontend
- Mascota osito (17 poses PNG/WebP + héroe 1200px), pantalla de carga animada (WebP/GIF 2,8 s, PNG fijo con movimiento reducido).
- Frontend: `index.html` + `fern.css` + `fern-ui.js` + `app.js` + `data.js` + `web/mascot.*` + `assets/` + `catalogo.html` (catálogo del diseñador) + `preview/`.
- `source/` y `Fern-Guia-Mascota.pdf`: material de origen de la mascota (no se despliega).
- **Banco de preguntas intacto**: `data.js` es byte-idéntico al de producción v2 (150 preguntas 20/20/40/30/25/15, 25 tarjetas, 8 entrevistas).

## Despliegue
Vercel NO ve los repos de holacielocomoestas1-pixel (su integración Git solo ve onelittlechangecol): los deploys son por subida de archivos con `~/workspace/deploy-b1/deploy_api.py <dir> prj_YGijgQZI4plolCwLuDHJLBLNdrbw fern` (token por env `VTOKEN`). El MCP `create_deployment` no sirve para este frontend (15 MB de assets superan su límite de argumento).
