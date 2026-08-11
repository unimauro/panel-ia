# 🖥️ Panel IA — dashboard personal

Dashboard personal 100% estático, pensado para pantallas secundarias y táctiles
(tipo Stream Deck con pantalla, tablet vieja, o un monitor pequeño al costado).
Corre gratis en GitHub Pages, sin backend y sin cuentas.

**Demo:** https://unimauro.github.io/panel-ia

## Widgets

- 🕐 **Reloj y calendario** del mes, con el día resaltado.
- 🍅 **Pomodoro** con tiempos de focus/descanso configurables y **Modo Focus**
  a pantalla completa para eliminar distracciones.
- 🎵 **Reproductor de música** con visualizaciones retro noventeras: barras
  estilo Winamp y onda estilo Windows Media Player. Carga tus propios archivos
  de audio (nunca salen de tu navegador).
- 📰 **Últimas noticias de IA**: titulares en español (Google News) y de
  Hacker News, actualizados cada 6 horas por un GitHub Action que escribe
  `data/news.json`. Sin API keys.
- 📋 **Kanban** con título, descripción y *Definition of Done*; edición inline
  y botones grandes pensados para pantallas táctiles.

Tus tareas, configuración del pomodoro y preferencias se guardan solo en
`localStorage` de tu navegador: nada viaja a ningún servidor.

## Cómo usarlo tú

1. Haz fork de este repo.
2. En *Settings → Pages*, elige la rama `main` como fuente.
3. (Opcional) Edita las consultas de noticias en `scripts/fetch_news.py`.
4. Abre `https://<tu-usuario>.github.io/panel-ia` en la pantalla que quieras.

## Stack

HTML + CSS + JavaScript vanilla, Web Audio API para el visualizador, y un
script Python (solo biblioteca estándar) que corre en GitHub Actions como
pipeline de datos. Construido con asistencia de IA en una tarde — la gracia
no es el resultado, es lo corta que se ha vuelto la distancia entre
"estaría bien tener esto" y "ya lo tengo".

## Licencia

MIT
