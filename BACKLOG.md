# Backlog — Panel IA

## Hecho
- [x] Estructura estática (HTML/CSS/JS vanilla, mobile-first, botones táctiles ≥44px)
- [x] Reloj + calendario mensual con día resaltado
- [x] Pomodoro configurable + Modo Focus a pantalla completa + beep al cambiar de fase
- [x] Reproductor de música con playlist local y visualizador retro (barras Winamp / onda WMP)
- [x] Kanban (título, descripción, DoD) con edición inline y persistencia en localStorage
- [x] Widget de noticias IA con filtros (español / Hacker News)
- [x] Pipeline de noticias: `scripts/fetch_news.py` (stdlib) + GitHub Action cada 6 h → `data/news.json`
- [x] Deploy en GitHub Pages

## Pendiente
- [ ] V2: fondos dinámicos según hora del día y meteorología (Open-Meteo, sin API key)
- [ ] Widget de gasto/uso de suscripciones IA (registro manual en localStorage; no hay API pública)
- [ ] Drag & drop táctil en el kanban (además de los botones ◀▶)
- [ ] Más fuentes de noticias (Reddit r/artificial vía RSS, blogs de labs de IA) y CSV junto al JSON
- [ ] Modo claro opcional
- [ ] PWA (manifest + service worker) para instalarlo a pantalla completa en tablets
- [ ] i18n EN/ES
