# Tartan System

A complete tartan design-to-production platform for creating, exploring, and manufacturing mathematically valid tartan patterns.

## Features

### Core Capabilities

- **Threadcount Parsing** - Parse standard tartan notation (symmetric/asymmetric setts)
- **48-Color Palette** - Traditional tartan colors with LAB color space support
- **Delta E 2000** - Perceptual color difference calculations for contrast checking
- **6 Weave Patterns** - Plain, 2/2 twill, 3/1 twill, herringbone, houndstooth, basketweave
- **Seeded Random Generator** - Reproducible tartan generation with constraints
- **WIF Export** - Weaving Information File format for loom software
- **Yarn Calculator** - Production planning with material estimates

### Optical Illusions

Apply 3D effects to tartan patterns:
- Isometric cubes
- Penrose tiles
- Hexagonal honeycomb
- Spheres/bubbles
- Wave ripples
- Diamond facets
- Escher-style stairs

## Installation

```bash
npm install
```

## Quick Start

```typescript
import { 
  generateTartan, 
  expandSett, 
  TARTAN_COLORS,
  calculateForProduct 
} from 'tartan-system';

// Generate a random tartan
const result = generateTartan({
  colorCount: { min: 4, max: 5 },
  stripeCount: { min: 6, max: 10 },
});

console.log(result.sett.threadcount);
// => "B/24 W4 G16 R2 K24 G/16"

// Expand to full thread sequence
const expanded = expandSett(result.sett);
console.log(expanded.length); // Total threads in one repeat

// Calculate yarn for a scarf
const materials = calculateForProduct(result.sett, 'scarf-wide');
console.log(materials.totalYards); // Yards needed
```

## API Reference

### Color System

```typescript
// Get a color from the 48-color palette
const blue = getColor('B');
console.log(blue.hex); // "#0000CD"

// Check color contrast
const hasContrast = hasMinimumContrast(color1, color2, 20);

// Find closest palette color to a hex value
const match = findClosestColor('#1E90FF');
```

### Sett/Threadcount

```typescript
// Parse threadcount notation
const sett = parseThreadcount('B/24 W4 B24 R2 K24 G24 W/2');

// Expand to thread sequence
const expanded = expandSett(sett);
console.log(expanded.threads); // ['B', 'B', 'B', ..., 'W', 'W']

// Scale a sett
const larger = scaleSett(sett, 1.5);

// Validate against constraints
const validation = validateSett(sett, {
  minColors: 3,
  maxTotalThreads: 200,
});
```

### Generator

```typescript
// Generate with constraints
const result = generateTartan({
  colorCount: { min: 3, max: 5 },
  stripeCount: { min: 4, max: 8 },
  symmetry: 'symmetric',
  minColorContrast: 25,
});

// Use a preset
const hunting = generateTartan(CONSTRAINT_PRESETS['hunting']);

// Generate batch of unique tartans
const batch = generateBatch(10, constraints);

// Create variations of existing tartan
const variations = generateVariations(baseSett, 5, 'colors');
```

### Weave Patterns

```typescript
// Get weave pattern
const twill = getWeavePattern('twill-2-2');

// Check intersection
const warpOnTop = isWarpOnTop(twill, warpIndex, weftIndex);

// Get visible color at intersection
const pixel = getIntersectionColor(warpExpanded, weftExpanded, twill, x, y);
```

### WIF Export

```typescript
const wif = generateWIF(sett, getWeavePattern('twill-2-2'), {
  title: 'My Tartan',
  author: 'Designer Name',
  warpRepeats: 3,
  weftRepeats: 3,
});

// Save to file
fs.writeFileSync(wif.filename, wif.content);
```

### Production Planning

```typescript
// Calculate for a product template
const materials = calculateForProduct(sett, 'blanket-throw', {
  gauge: 16,
  wasteMultiplier: 1.2,
});

// Or custom dimensions
const custom = calculateYarnRequirements(
  sett,
  { width: 24, length: 72, unit: 'inch' },
  'worsted',
  { gauge: 18 }
);

// Format for display
console.log(formatMaterialsSummary(materials));

// Export as CSV
const csv = exportMaterialsCSV(materials);
```

### Optical Masks

```typescript
// Apply a shape mask
const pixel = applyMask(x, y, width, height, {
  type: 'cube',
  elementSize: 40,
  depth: 0.7,
  lightAngle: 45,
  ambientLight: 0.3,
});

// Use a preset
const options = getShapePreset('honeycomb');
```

## Color Palette

The 48-color traditional tartan palette includes:

| Category | Colors |
|----------|--------|
| Blues | B, LB, DB, AB, RB, NB |
| Reds | R, LR, DR, CR, SC, MR |
| Greens | G, LG, DG, HG, OG, FG, TL |
| Yellows | Y, LY, GD, AM, ST |
| Blacks/Greys | K, GY, LGY, DGY, CH |
| Whites | W, CW, IW |
| Browns | BR, LBR, DBR, TN, RU, CB |
| Purples | P, LP, DP, VI, LV |
| Oranges | O, LO, DO |
| Pinks | PK, LP2, DP2 |

## Product Templates

Built-in templates for production planning:

- `scarf-narrow` - 6" × 60" lightweight scarf
- `scarf-wide` - 10" × 72" winter scarf
- `blanket-throw` - 50" × 60" lap blanket
- `blanket-full` - 60" × 80" bed blanket
- `pillow` - 18" × 18" throw pillow
- `table-runner` - 12" × 72" table runner
- `placemat` - 12" × 18" placemat
- `kilt-yardage` - 54" × 8 yards traditional kilt
- `sash` - 12" × 108" shoulder sash
- `fabric-yard` - 54" × 36" fabric yardage

## Example Setts

```typescript
import { EXAMPLE_SETTS, getExampleSett } from 'tartan-system';

// Available examples
console.log(Object.keys(EXAMPLE_SETTS));
// ['Black Watch', 'Royal Stewart', 'MacLeod', 'Simple Check', 'Basic Tartan']

const blackWatch = getExampleSett('Black Watch');
```

## License

MIT
