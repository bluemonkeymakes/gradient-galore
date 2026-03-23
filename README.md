# Gradient Galore

A visual gradient maker with 6 gradient types, a palette system, and a community gallery. Built with React Router, Tailwind CSS v4, shadcn/ui, Jotai, and Drizzle ORM.

## Features

### Gradient Types

| Type | Description | Rendering |
|------|-------------|-----------|
| **Linear** | Classic directional gradient | CSS `linear-gradient` |
| **Radial** | Circular/elliptical from a center point | CSS `radial-gradient` |
| **Conic** | Angular sweep from a center point | CSS `conic-gradient` |
| **Aura** | Soft glowing color blobs layered together | CSS radial layers or rotated `<div>` blobs |
| **Marble** | Blurred organic shapes with blend modes | Inline SVG with `feGaussianBlur` |
| **Mesh** | Multi-point color blending | CSS radial layers or rotated `<div>` blobs |

### Controls Per Type

**Linear / Radial / Conic**
- Color stops with position sliders
- Angle (linear, conic)
- Center X/Y position (radial, conic)
- Shape & size mode (radial)
- Repeating toggle

**Aura / Mesh** (per-point controls)
- Color, X/Y position, Size/Spread, Opacity
- Stretch (circle to ellipse blob shaping)
- Rotation (per-blob rotation)
- Z-index reordering (move up/down in list)
- Background color picker

**Marble**
- Shape Size, Blur, Rotation, Variation (seed)
- Blend Mode (overlay, soft-light, multiply, screen, color-dodge, color-burn)
- Color layers (each color becomes a blurred SVG shape)

All sliders have hover tooltips explaining what they do.

### Palette System

- **Import** — paste palette text in `═══ NAME ═══` / `shade #hex` format (or simpler formats)
- **Quick Colors** — palette swatches appear inline in the gradient controls; select a color stop then click a swatch to apply
- **Persistence** — palettes persist in localStorage across sessions
- **Management** — full palette page at `/palettes` for browsing, importing, and removing palettes

### Gallery

- **Publish** — name and tag your gradient, publish it to the gallery
- **Browse** — view all published gradients at `/gallery`
- **Filter** — by gradient type (linear, radial, conic, aura, marble, mesh)
- **Preview cards** — live CSS gradient thumbnails

### Other Features

- **Presets** — 6 built-in presets (one per gradient type)
- **Randomize** — randomize all colors, angle, and seed
- **CSS Output** — live generated CSS with copy button (SVG markup for marble)
- **State persistence** — gradient state saved to localStorage, survives refresh
- **Hex validation** — color text inputs validate hex format with visual feedback

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Router v7 (Remix successor) |
| Styling | Tailwind CSS v4, shadcn/ui (New York style) |
| State | Jotai (atomWithStorage for persistence) |
| UI Components | Radix primitives (Slider, Switch) via shadcn |
| Database | SQLite (better-sqlite3) for local dev |
| ORM | Drizzle ORM (portable to Postgres for production) |
| Build | Vite |

## Project Structure

```
app/
├── components/
│   ├── ui/                  # shadcn components (button, slider, switch)
│   ├── gradient-preview.tsx # Live gradient canvas
│   ├── gradient-controls.tsx# All controls (type selector, sliders, color editors)
│   ├── marble-canvas.tsx    # SVG renderer for marble gradients
│   ├── code-output.tsx      # CSS output with copy button
│   ├── publish-dialog.tsx   # Publish to gallery dialog
│   ├── palette-strip.tsx    # Quick-pick palette swatches
│   ├── presets.tsx           # Built-in gradient presets
│   └── nav.tsx              # App navigation
├── db/
│   ├── schema.ts            # Drizzle schema (gradients table)
│   ├── index.ts             # Database connection
│   └── migrate.ts           # Migration script
├── lib/
│   ├── gradient-engine.ts   # Core: types, CSS generation, defaults
│   ├── atoms.ts             # Jotai atoms (gradient, palettes, active target)
│   ├── palette.ts           # Palette parser
│   └── utils.ts             # cn() utility
├── routes/
│   ├── home.tsx             # Gradient editor (/)
│   ├── gallery.tsx          # Published gradients (/gallery)
│   ├── palettes.tsx         # Palette manager (/palettes)
│   └── api.publish.tsx      # Publish action (POST /api/publish)
├── app.css                  # Global styles, theme tokens
├── root.tsx                 # App shell
└── routes.ts                # Route config
```

## Getting Started

```bash
# Install dependencies
npm install

# Create the database
npm run db:migrate

# Start dev server
npm run dev
```

The app runs at `http://localhost:5173`.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run db:migrate` | Create/update database tables |
| `npm run typecheck` | Run TypeScript type checking |

## Database

Local development uses SQLite (`gradient-galore.db` file). The schema is designed to be portable to Postgres via Drizzle ORM for production deployment.

**Gradients table:**
- `id` — auto-increment primary key
- `name` — gradient name
- `type` — gradient type (linear, radial, conic, aura, marble, mesh)
- `state` — full GradientState as JSON
- `tags` — comma-separated tags
- `preview_css` — pre-rendered CSS for thumbnail display
- `created_at` — timestamp

## Docker

```bash
docker build -t gradient-galore .
docker run -p 3000:3000 -v gradient-data:/data gradient-galore
```

## Roadmap

- [ ] Postgres support for production
- [ ] Export to PNG/SVG
- [ ] Gallery likes and saves
- [ ] User accounts
- [ ] Drag points directly on preview canvas
- [ ] Undo/redo
- [ ] Custom preset saving
- [ ] Share links for gradients
