# CLAUDE.md — Donegal Airport Web
## Guía viva de diseño y preferencias · Jose Manuel

> Este documento se actualiza con cada sesión. Recoge lo que funciona,
> lo que no funciona, y cómo Jose Manuel quiere que se construyan sus webs.
> Leerlo antes de tocar cualquier cosa.

---

## Stack técnico

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Framework | Astro 6.3.7 | Sin React. Componentes `.astro` puros |
| CSS | Tailwind v4 | CSS-first config en `global.css` vía `@theme` |
| Animaciones | GSAP + ScrollTrigger | `animations.ts` centraliza todo |
| Scroll suave | Lenis | `duration: 1.1` — no tocar sin razón |
| Imágenes | Sharp (Node) | `.trim({threshold:1})` + `.webp({quality:84})` |
| Deploy | Vercel | Push a `origin/master` → auto-deploy |
| i18n | EN default, GA prefijado | `/ga/` para irlandés |

---

## Paleta de color

```css
--color-ink:          #181d16   /* texto principal */
--color-mute:         #56605a   /* texto secundario */
--color-sand:         #a07840   /* acento dorado/arena */
--color-surface:      #f3f2ee   /* fondo crema */
--color-atlantic:     #1a4a6e   /* azul atlántico navy — CONFIRMADO */
--color-atlantic-bright: #235f8e
--color-ocean:        #08162a   /* azul noche profunda */
```

**Dark overlays (hero/footer):** `#090f1c` / `#0d1a2e` / `#060b16` (navy, sustituyen al verde oscuro anterior)

---

## Tipografía

- **Display/serif (page):** Bricolage Grotesque Variable
- **Display/bold (hero H1):** Bricolage Grotesque Variable 800 — solo en el hero
- **Sans:** Switzer (Fontshare) — cuerpo, lede, UI
- **Mono:** Space Mono 400 (Google Fonts) — eyebrows, datos, labels, captions, nav
  - Era `ui-monospace`; cambiado a Space Mono jun-2026 para look "airport terminal"

**Jerarquía tipo:**
1. Eyebrow mono uppercase tracking-[0.26em] color soft/muted
2. Hero H1: Bricolage Grotesque 800, clamp(2.6rem,5.3vw,76px), leading-[0.96]
3. Page headings: Bricolage Grotesque, font-weight 300–400, line-height 0.95–1.05
4. Body sans 0.94–0.97rem, line-height 1.72, color `--color-mute`
5. Caption mono 0.6rem uppercase tracking-[0.2em]

---

## Filosofía de diseño

### Lo que José Manuel quiere
- **Editorial, no corporativo.** Referentes: Wallpaper\*, Kinfolk, aeropuertos
  escandinavos (Vágar, Tromsø). Cada elemento gana su lugar.
- **Fotos orgánicas.** Las fotos históricas se recortan a mano con borde
  irregular (PNG con transparencia). No SVG masks, no CSS clips forzados.
  El borde natural de la foto es parte del diseño.
- **Textura sutil.** Paper grain vía `background-blend-mode: multiply`
  (NO `mix-blend-mode` — causa jank en scroll).
- **Números y años grandes.** Watermarks de año en serif, opacity 0.18,
  como elemento decorativo de fondo.
- **Cero "AI slop".** Sin gradientes púrpuras, sin Inter genérico,
  sin cards con border-radius grande, sin sombras exageradas.

### Lo que NO quiere
- Cursor personalizado (se quitó el círculo — no le gustó)
- SVG `feTurbulence` en fotos (causaba jank de scroll)
- Bordes orgánicos generados por CSS (probado y rechazado — los hace él a mano)
- El color verde atlántico en la sección de operadoras (lo llamó "muy feo")
- Textura de papel demasiado exagerada (opacidad alta = rechazado)
- Frases defensivas/explicativas en el copy ("It wasn't about being the nearest...")

---

## Workflow con Jose Manuel

### Cómo trabaja
- **Editor visual en dev:** `StoryEditor.astro` — sliders en el navegador para
  ajustar posición de fotos, textos y captions. Solo existe en dev (`import.meta.env.DEV`).
- **Pega valores del editor** en el chat para aplicarlos al código fuente.
- **Fotos:** las prepara y recorta él. Las rutas suelen ser:
  `C:\Users\jjgar\Desktop\Fotos\Donegal Airport\Airport old photos\Web\`
- **Procesar fotos:** Sharp desde el directorio del proyecto
  (`cd` a la carpeta Web antes de ejecutar node).

### Comunicación
- Respuestas **cortas**. Si pregunta algo técnico, responder directo.
- Preguntar antes de cambios estructurales grandes.
- **No mencionar ENAIRE** en ningún proyecto de FlyVector.
- Idioma del chat: español. Código y copy de la web: inglés.

### Git
- Commit frecuente. Jose Manuel pide "haz save" como señal.
- No commitear ficheros temporales (`*-raw.md`, etc.).
- Mensaje de commit descriptivo en inglés.

---

## Procesado de fotos

```js
// Foto con transparencia (hand-cut PNG)
sharp(src)
  .trim({ threshold: 1 })          // recorta bordes transparentes
  .webp({ quality: 84, alphaQuality: 90 })
  .toFile(dst)

// Foto normal (sin transparencia — drone, paisaje)
sharp(src)
  .resize({ width: 2000, withoutEnlargement: true })
  .webp({ quality: 84 })
  .toFile(dst)
  // NO usar .trim() en fotos sin canal alpha
```

**Tamaños de referencia aceptables:**
- Fotos de story: ~150–400 KB
- Fondos (operators-bg, etc.): hasta 200 KB
- Si supera 400 KB → resize a 2000px max

---

## Patrones CSS importantes

### Paper texture (scroll-safe)
```css
/* background-blend-mode en la sección, NO mix-blend-mode en overlay */
[data-story-section] {
  background-color: var(--color-surface);
  background-image:
    linear-gradient(rgba(243,242,238,0.86), rgba(243,242,238,0.86)),
    url("data:image/svg+xml,...fine-grain..."),
    url("data:image/svg+xml,...coarse-mottle...");
  background-blend-mode: normal, multiply, multiply;
}
```

### Sistema de posicionamiento del story
```css
/* Variables CSS por capítulo */
--photo-shift   /* mueve foto + card juntos (vertical) */
--card-shift    /* ajuste fino solo del card de texto */
--photo-w       /* ancho foto panorámica (ej: "45%") */
--photo-h       /* alto foto portrait (ej: "78vh") */
--year-shift    /* posición vertical del watermark de año */
--year-size     /* tamaño del watermark */
--cap-shift-y   /* caption vertical */
--cap-shift-x   /* caption horizontal */
```

### Animaciones (no jank)
```ts
// Lenis — no bajar de 1.0 duration
new Lenis({ duration: 1.1, smoothWheel: true })

// Story path scrub
scrub: 1.2

// Fotos: slide direccional sin filtros
data-animate="fade-right"  // foto en lado derecho
data-animate="fade-left"   // foto en lado izquierdo
```

---

## Estructura del story (`/story`)

6 capítulos alternando izquierda/derecha:

| # | Año | Foto | Descripción |
|---|-----|------|-------------|
| 1 | 1978 | `story-ch01.webp` | Edificio muy antiguo, pista asfaltada |
| 2 | 1985 | `story-ch02.webp` | Malinair, Islander, £85 |
| 3 | 1988 | `story-ch03.webp` | Ryanair + Loganair + heli Tory Island |
| 4 | 1996 | `story-ch04.webp` | Ireland Airways + Aer Arann |
| 5 | 2001 | `story-ch05.webp` | Helicópteros offshore Corrib |
| 6 | 2025 | `story-ch06.webp` | Drone ATR Emerald Airlines |

**Regla del Corrib (ch05):** NO mencionar Dooish ni Rockall Trough
(no verificado). Solo Corrib, elegido por facilidades/posición, no por ser
el aeropuerto más cercano (Sligo sería más cercano).

**Anthony Gillespie** — Secretario del aeropuerto, sale en RTÉ 1989
explicando la extensión de pista. Pendiente añadirlo como "tira de cita"
entre capítulos. Jose Manuel tiene fotos de él.

---

## Sección de operadoras (airlines)

- Glass cards oscuras con cola de avión SVG estilizada (diseño propio, NO logos reales)
- Fondo: foto drone `operators-bg.webp` con velo azul
- IATA codes en esquina superior derecha
- Ruta truncada con `text-overflow: ellipsis` en `.pass-route`
- Emerald: ruta = "Dublin · 2×/day" (cortada para evitar `...`)

**Logos reales de aerolíneas:** pendiente para cuando Jose Manuel
tenga los archivos oficiales. Campo `logo` en el array de airlines.

---

## Estado homepage (`/`)

### Secciones implementadas
| Sección | Estado | Notas |
|---------|--------|-------|
| Hero scrub — "Live Ops" | ✅ | Diseño Distribution A, ops panel derecha |
| Editorial intro | ⚠️ | Gradiente placeholder — falta foto portrait |
| Flights table | ✅ | Mock data, diseño mono editorial |
| Destinations H-scroll | ✅ | Dublin + Glasgow con fotos reales |
| Awards | ✅ | Editorial list, sin cards |
| News | ✅ | DD.MM.YYYY list |
| CTA | ✅ | Wild Atlantic Way |

### Hero layout — "Live Ops" Distribution A (jun 2026)
```
<section h-[300vh] relative data-scrub-trigger data-hero-scroll>
  <!-- Layer 1: sticky background -->
  <div sticky top-0 h-screen overflow-hidden aria-hidden>
    <img data-ken-burns />             ← fallback mobile, fades out en desktop
    <video data-scrub-video />         ← hero.mp4 5s, scrub 0→200vh
    <div scrim-top h-[220px] />        ← protege nav + headline
    <div scrim-left w-[65%] />         ← protege columna de texto
    <div scrim-bottom h-[160px] />     ← ancla la imagen
  </div>
  <!-- Layer 2: contenido h-screen, scrolls con la página -->
  <div cfn-hero-content absolute top-0 h-screen flex flex-col
       style="padding: calc(var(--header-h)+3rem) 3.5rem 2.5rem">
    <!-- SPLIT ROW: lead (izquierda) + ops panel (derecha) -->
    <div flex flex-1 items-center justify-between gap-[60px]>
      <div hero-lead>  eyebrow → H1 → lede → CTAs  </div>
      <aside ops-panel hidden lg:flex>
        reloj · tiempo · tablero salidas
      </aside>
    </div>
    <div scroll-hint>Scroll to reveal ↓</div>
  </div>
</section>
```

### Hero copy
- **Eyebrow:** "Donegal Airport · Co. Donegal · CFN" — Space Mono 13px, color soft
- **H1:** "Aerfort / Dhún na nGall" — Bricolage Grotesque 800, dos líneas, `md:whitespace-nowrap`
- **Lede:** "Dublin daily. Glasgow at weekends — and select summer weekdays. The Atlantic on both sides of the runway." — 21px, color soft
- **CTA primary:** "Today's flights →" — amber + underline
- **CTA secondary:** "Parking & getting here →" — white/ink

### Ops panel (frosted glass, desktop only)
- Datos en `index.astro` frontmatter: `heroDepartures[]` y `heroWeather{}`
- **Reloj:** JS inline, `setInterval(tick, 60_000)`, formato "Mon 2 Jun · 09:41"
- **Tiempo:** Open-Meteo fetch, coordenadas CFN (55.0441°N, 8.3411°W)
  - Mismo sistema que dashboard Bunbeg Coast Guard
  - Campos: `temperature_2m`, `weather_code`→texto, `wind_speed_10m`→kt, `visibility`→km
  - Refresco cada 10 min. IDs: `wx-temp`, `wx-cond`, `wx-wind`, `wx-vis`
  - Error → fallback a valores estáticos silenciosamente
- **Vuelos:** estáticos en `heroDepartures[]` — pendiente conectar al panel FIDS de Jose Manuel
- **Live dot:** pulsing ring CSS, `prefers-reduced-motion` safe
- **CSS custom properties dentro de `.cfn-hero-content`:**
  `--hi`, `--hi-soft`, `--hi-faint`, `--hi-amber`, `--hi-green`, `--hi-panel`, `--hi-line`

### Header transparente (homepage only)
- `data-cinematic-hero` en `<html>` via `<script>` en index.astro
- CSS: `:root[data-cinematic-hero] [data-header]:not(.is-scrolled)` → transparent
  - `--color-ink: #ffffff` (antes cream — ahora puro blanco)
  - `--color-atlantic: #c49a50` (remapeado a sand-gold para que hover sea visible sobre vídeo)
- **Header reveal:** espera hasta que la sección hero (300vh) termine de pasar
  - `setupHeaderReveal()` en animations.ts — threshold = `heroSection.offsetTop + offsetHeight - window.innerHeight`
  - Antes era 60px fijo, ahora espera hasta que el vídeo acabe
- Se limpia en `astro:before-swap`

### Fotos homepage
| Archivo | Uso | Estado |
|---------|-----|--------|
| `public/photos/hero-poster.webp` | Hero fallback (Ken Burns, se apaga en desktop) | ✅ |
| `public/photos/dest-dub.webp` | Dublin panel | ⚠️ personas pendientes quitar |
| `public/photos/dest-gla.webp` | Glasgow panel | ✅ |
| `public/video/hero.mp4` | Hero scrub 5s 1080p Kling puro | ✅ |
| `public/video/clouds-start.png` | Referencia nubes para Kling | ✅ guardado |

### Hero video workflow (Higgsfield CLI)
```bash
# Generar Kling 3.0 — clouds-start.png → drone-frame real
higgsfield upload create clouds-start.png   # → UUID_clouds
higgsfield upload create drone-frame.jpg    # → UUID_drone (extraído a t=1:30)
higgsfield generate create kling3_0 \
  --prompt "clouds parting left and right to reveal airport below, cinematic aerial" \
  --start-image UUID_clouds --end-image UUID_drone \
  --duration 5 --mode 4k --aspect_ratio 16:9 --sound off
# Job guardado: 9e666a25 (CDN URL válida al menos días)
# CDN: https://d8j0ntlcm91z4.cloudfront.net/user_3E8EfpZzNi3mpnf43wrkOYrByhZ/hf_20260601_165735_9e666a25-78cb-4747-87df-88ecf22b03fe.mp4

# Encode para scrub (un único pase — CRÍTICO para evitar corrupción)
ffmpeg -i kling-src.mp4 \
  -vf "scale=1920:1080,format=yuv420p,setsar=1/1,fps=24" \
  -c:v libx264 -crf 22 -g 1 -keyint_min 1 -sc_threshold 0 \
  -movflags +faststart -preset slow -an \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  hero.mp4
```

**REGLA CRÍTICA — encode en un solo pase:** Nunca hacer `-c copy` en concat de clips de distinta fuente.
Los metadatos SAR/colorspace no se propagan y el browser corrompe la mitad inferior del vídeo.
Si hay dos segmentos, usar `filter_complex` con `concat=n=2:v=1:a=0` y reencoder todo junto.

**Regla del start frame (nubes):** Nubes esponjosas blancas sobre cielo azul.
Kling usa el drone-frame como end-keyframe → el aeropuerto que aparece es el REAL.

## Pendientes conocidos

- [ ] **Vuelos en vivo ops panel** — Jose Manuel terminando el FIDS. Cuando tenga URL+formato JSON → conectar con `fetch()` poll 60s en `index.astro`
- [ ] Homepage intro editorial — foto portrait del aeropuerto (desde tierra/terminal)
- [ ] Dublin dest foto — quitar personas con cleanup.pictures
- [ ] Anthony Gillespie — tira de cita entre ch1 y ch2 (fotos pendientes de Jose Manuel)
- [ ] Logos reales aerolíneas (cuando Jose Manuel los tenga)
- [ ] `/discover` — Fanad Head + Poisoned Glen cards
- [ ] `/flights`, `/plan`, `/pilots`, `/contact` — páginas stub
- [ ] 21st.dev MCP — pendiente de instalar (API key)
- [ ] Playwright MCP — pendiente de instalar
- [ ] **Story page redesign** — handoff entregado al designer en `Downloads/Aerofot/design_handoff_story/`. Esperar nuevo HTML reference antes de implementar

### De la auditoría "20 errores de una web con IA" (2026-09-01)

- [ ] **Formulario de contacto no funciona** — `WEB3FORMS_KEY` en `contact.astro`/`ga/contact.astro` sigue en `"REPLACE_WITH_REAL_ACCESS_KEY"`. Conectar cuando el aeropuerto confirme el buzón de destino (ya estaba anotado como TODO en el propio código)
- [ ] **Analíticas (GA4) sin configurar** — `GA4_MEASUREMENT_ID` en `BaseLayout.astro` sigue en `"REPLACE_WITH_REAL_GA4_ID"`. Google Consent Mode v2 + banner de cookies ya están montados y esperando; solo falta el ID real
- [x] ~~Imagen de Open Graph no existe~~ — resuelto 2026-09-01: `public/og-default.png` creado (logo del aeropuerto sobre `--color-surface`, 1200×630)
- [ ] **Quitar el `noindex` antes del lanzamiento real** — `<meta name="robots" content="noindex, nofollow">` en `BaseLayout.astro` + `Disallow: /` en `public/robots.txt`, a propósito mientras vive en vercel.app. Recordatorio para el día que se mueva al dominio real (donegalairport.ie)
- [ ] `.env.example` incompleto — no documenta `MAILCHIMP_API_KEY`/`MAILCHIMP_AUDIENCE_ID` que usa `api/newsletter-subscribe.ts` (las claves en sí están bien — solo en variables de entorno, no hardcodeadas)
- [ ] Favicon solo tiene un PNG — sin `apple-touch-icon` ni `manifest.json`. Menor, no urgente
- [ ] Limpieza opcional: `public/proto/` (~15 MB — coches y tazas de prototipo, no referenciados en ningún sitio), `discover-map-bg.png` (7,2 MB), `video/clouds-start.png` (4,4 MB), `plan/cafe-flatwhite.png` (1 MB) y `plan-aircraft-*.jpg`/`plan-cafe-*.jpg`/`plan-landscape-*.jpg` — todos huérfanos, no los sirve ninguna página, pero siguen desplegándose
- [ ] Probar en Safari real — el sitio usa `color-mix()` (21 veces) y `backdrop-filter` (10 veces); bien soportados en navegadores modernos pero no verificado en un Safari real
- [ ] Link-check completo — solo se auditaron los `href` literales del nav/footer (sin roturas). Un crawl completo de todas las páginas queda pendiente

## Design handoff workflow

Proceso establecido en jun-2026:
1. Claude crea `design_handoff_<sección>/` con HTML standalone + README de specs
2. Designer abre en browser, rediseña, entrega nuevo HTML reference
3. Claude implementa el nuevo diseño en el codebase Astro
4. Archivos de handoff: `Downloads/Aerofot/`
   - `design_handoff_hero_live_ops/` — Hero Distribution A ✅ implementado (commit f8155c3)
   - `design_handoff_story/` — Story page ⏳ esperando diseño del designer

---

## Skills instaladas (globales)

| Skill | Repo | Uso |
|-------|------|-----|
| `astro` | astrolicious/agent-skills | Framework principal |
| `tailwindcss` | blencorp/claude-code-kit | CSS v4 |
| `gsap-core` | greensock/gsap-skills (oficial) | Animaciones base |
| `gsap-scrolltrigger` | greensock/gsap-skills (oficial) | Scroll + pin |
| `gsap-timeline` | greensock/gsap-skills (oficial) | Secuencias |
| `gsap-performance` | greensock/gsap-skills (oficial) | Optimización |
| `frontend-design` | anthropics/claude-code | Anti-AI-slop |
| `ux-designer` | szilu/ux-designer-skill | UX/accesibilidad |
| `ui-ux-pro-max` | nextlevelbuilder | Paletas/tipografías |

---

## Lecciones aprendidas

1. **Las fotos las hace él.** No intentar generar bordes orgánicos con CSS ni SVG.
   Darle instrucciones claras de qué necesito y él recorta.

2. **Preguntar antes de cambiar la estructura.** Ha rechazado cambios de fondo,
   de posición de secciones y de estilos sin consultar. Mejor mostrar opciones.

3. **Mock ups primero para decisiones visuales.** Crear HTML standalone en
   `mockups/` antes de tocar el código de producción.

4. **El editor visual es oro.** El `StoryEditor.astro` le permite ajustar él
   mismo sin tocar código. Extender siempre que haya nuevos parámetros de posición.

5. **Scroll performance es crítica.** Cualquier `filter`, `mix-blend-mode` o
   `backdrop-filter` en elementos que se mueven → revisar si causa jank primero.

6. **Copy editorial, no corporativo.** Frases cortas, directas, con personalidad.
   Evitar explicaciones defensivas. Contar la historia, no justificarla.

7. **Verificar datos históricos.** Antes de publicar una afirmación histórica
   concreta (año, distancia, cifra), buscarla. El error del Dooish/Rockall
   es el ejemplo — lo puse sin fuente y tuvo que corregirse.

8. **Higgsfield CLI para vídeos.** `higgsfield` está instalado globalmente.
   Kling 3.0 necesita AMBOS `--start-image` y `--end-image` si usas keyframes
   (no funciona con solo uno). Parámetros con underscore: `--aspect_ratio` no `--aspect-ratio`.
   `mode: 4k` da calidad notablemente mejor que `pro`. Coste: ~20 créditos/generación.

9. **Flux Kontext es conservador.** Diseñado para edición sutil, no para añadir
   cobertura masiva (nubes, objetos grandes). Para composiciones agresivas,
   mejor generar el elemento standalone con Nano Banana Pro y compositar con Sharp.

10. **Vídeo hero = Kling transition + drone real.** El drone clip real de Jose Manuel
    siempre gana en autenticidad frente al vídeo 100% generado. El flujo óptimo:
    Kling para la intro cinematográfica (nubes→reveal) + clip real para el movimiento.
