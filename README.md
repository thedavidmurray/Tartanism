# Tartanism

**The best plaid maker on the internet.**

Create mathematically valid tartans following Scottish Register conventions. Design, customize, and export your own patterns.

[Live Demo](https://thedavidmurray.github.io/Tartanism) | [Report Bug](https://github.com/thedavidmurray/Tartanism/issues)

## Features

### Generator
- **Batch Generation** - Roll up to 50 unique tartans at once
- **Constraint Controls** - Configure colors, stripes, thread counts
- **Deduplication** - Structural signatures prevent duplicate patterns
- **Seeded Randomness** - Reproducible generation with seeds

### Pattern Builder
- **Visual Editor** - Add, remove, reorder stripes
- **Live Preview** - See changes in real-time
- **Full Color Palette** - 48 traditional tartan colors
- **Export** - Save to collection or download

### Tiled Preview
- **Scale Visualization** - See pattern at different sizes
- **Size Presets** - Swatch, Pocket Square, Tie, Scarf, Kilt, Blanket
- **Physical Dimensions** - Calculated based on thread gauge

### Optical Illusions
Apply 3D shape masks to create embedded geometry:
- Isometric cubes
- Hexagonal honeycomb
- Spheres/bubbles
- Wave ripples
- Diamond facets
- Penrose tiles
- Escher-style stairs

### Weave Patterns
6 authentic weave structures:
- Plain Weave (1/1)
- 2/2 Twill (traditional tartan)
- 3/1 Twill
- Herringbone
- Houndstooth
- Basket Weave

### Export
- **SVG** - Vector files for each pattern
- **CSV** - Full metadata for batch exports
- **Copy Threadcount** - Click to copy notation

## Technical Details

### Color System
48-color traditional tartan palette with:
- RGB and LAB color space support
- Delta E 2000 perceptual difference calculations
- Automatic contrast checking

### Threadcount Notation
Supports Scottish Register conventions:
- Symmetric setts with pivot notation: `B/24 W4 B24 R2 K24 G24 W/2`
- Asymmetric repeating patterns

### Mathematical Validity
Tartans are constrained by:
- Even thread counts (standard for weaving)
- No adjacent identical colors
- Configurable total thread range (kilt scale ~200-280)
- Minimum color contrast enforcement

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Roadmap

- [ ] WIF export for loom software
- [ ] Yarn calculator for production
- [ ] Scottish Register comparison
- [ ] Parametric exploration
- [ ] Production ordering system

## License

MIT

---

*Built for the love of plaid.*
