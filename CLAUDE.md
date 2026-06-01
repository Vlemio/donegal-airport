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
--color-atlantic:     #2c5430   /* verde atlántico (puede cambiar) */
--color-ocean:        #08162a   /* azul noche profunda */
```

**Nota:** El verde `--color-atlantic` está en revisión — Jose Manuel quiere
cambiarlo a azul. Pendiente decisión.

---

## Tipografía

- **Display/serif:** Georgia (headings editoriales, años watermark)
- **Sans:** Switzer (cuerpo de texto, UI)
- **Mono:** `ui-monospace` / IBM Plex Mono (eyebrows, datos, labels, captions)

**Jerarquía tipo:**
1. Eyebrow mono uppercase tracking-[0.2em+] en `--color-sand`
2. Heading serif grande, font-weight 400, line-height 0.9–1.05
3. Body sans 0.94–0.97rem, line-height 1.72, color `--color-mute`
4. Caption mono 0.6rem uppercase tracking-[0.2em]

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

## Pendientes conocidos

- [ ] Homepage — en progreso (siguiente sesión)
- [ ] Anthony Gillespie — tira de cita entre ch1 y ch2 (fotos pendientes)
- [ ] Logos reales aerolíneas (cuando Jose Manuel los tenga)
- [ ] `--color-atlantic` → cambiar de verde a azul
- [ ] Video hero (`/public/video/hero.mp4`) — generar con Higgsfield/Kling 3.0
- [ ] `/discover` — Fanad Head + Poisoned Glen cards
- [ ] `/flights`, `/plan`, `/pilots`, `/contact` — páginas stub
- [ ] 21st.dev MCP — pendiente de instalar (API key)
- [ ] Playwright MCP — pendiente de instalar

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
