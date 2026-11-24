# Fern

Abre `index.html` para usar el frontend. Usa el selector superior para cambiar entre tailandés e inglés. `catalogo.html` abre el catálogo del diseñador.

## Archivos del frontend

- `index.html` reúne las pantallas y la navegación.
- `fern.css` define la interfaz, la barra inferior y el diseño adaptable.
- `fern-ui.js` conecta las pantallas con el temario y el progreso. La fecha del examen se elige en Plan con el control nativo del navegador.
- `app.js` conserva la lógica de Fern para rachas, XP, corazones, repaso, ejercicios especiales, simulacros y guía.
- `data.js` conserva el banco de preguntas original, con seis materias y 150 preguntas.
- `web/mascot.css` y `web/mascot-states.json` ofrecen los movimientos y el mapa de poses para el diseñador.

Sirve la carpeta como un sitio estático. Desde la carpeta también puedes ejecutar `python3 -m http.server 8000` para previsualizarla en el navegador. Conserva el origen actual al desplegar la actualización de Fern para que sus claves existentes de progreso sigan disponibles en el mismo navegador.

## Mascota y pantalla de carga

- `assets/png/` contiene las poses en PNG transparente de 768 px. `source/mascot-master.png` contiene la imagen base.
- `assets/webp/` contiene los archivos optimizados de 384 y 768 px. `assets/hero/` contiene una versión de 1200 px.
- `assets/icons/` contiene el favicon, el icono de app y una variante para recorte circular.
- `assets/loading/` contiene el GIF, WebP animado y PNG fijo. La animación dura 2,8 segundos, se repite y tiene fondo transparente.

El osito aparece en la entrada, la ruta, los encabezados de estudio, la corrección de respuestas y los resultados. La pantalla de carga usa WebP cuando es compatible y GIF como alternativa. Con movimiento reducido, muestra la imagen fija.

El catálogo permite probar las poses sobre fondo claro u oscuro y descargar cada recurso por separado. Los textos del catálogo son ejemplos para diseño. La interfaz y las lecciones ofrecen tailandés e inglés. El banco conserva el idioma original de cada pregunta.
