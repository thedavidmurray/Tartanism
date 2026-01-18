/**
 * Tartan System - Core Type Definitions
 * Complete TypeScript interfaces for tartan design and production
 */

// ============================================================================
// COLOR TYPES
// ============================================================================

export interface RGB {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

export interface LAB {
  L: number; // 0-100 (lightness)
  a: number; // -128 to 127 (green-red)
  b: number; // -128 to 127 (blue-yellow)
}

export interface HSL {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

export interface TartanColor {
  code: string;        // Single letter code (B, R, G, W, K, etc.)
  name: string;        // Full name (Azure Blue, Hunting Green)
  hex: string;         // Hex color (#1E90FF)
  rgb: RGB;
  lab?: LAB;           // For Delta E calculations
  category: ColorCategory;
}

export type ColorCategory =
  | 'blue'
  | 'red'
  | 'green'
  | 'yellow'
  | 'black'
  | 'white'
  | 'grey'
  | 'brown'
  | 'purple'
  | 'orange'
  | 'pink'
  | 'teal'
  | 'neon';

export interface ColorPalette {
  name: string;
  colors: TartanColor[];
}

// ============================================================================
// SETT / THREADCOUNT TYPES
// ============================================================================

export interface ThreadStripe {
  color: string;       // Color code
  count: number;       // Thread count for this stripe
  isPivot?: boolean;   // Is this a pivot point in symmetric setts?
}

export interface Sett {
  id?: string;
  name?: string;
  threadcount: string;           // Original notation: "B/24 W4 B24 R2 K24 G24 W/2"
  stripes: ThreadStripe[];       // Parsed stripes
  symmetry: 'symmetric' | 'asymmetric';
  totalThreads: number;          // Total threads in one repeat
  colors: string[];              // Unique color codes used
}

export interface ExpandedSett {
  /** Full thread sequence for one complete repeat */
  threads: string[];
  /** Total thread count */
  length: number;
  /** Color distribution (code -> count) */
  distribution: Record<string, number>;
}

export interface SettSignature {
  /** Normalized signature for comparison */
  signature: string;
  /** Color-blind signature (structure only) */
  structureSignature: string;
  /** Proportional signature (ratios) */
  proportionSignature: string;
}

// ============================================================================
// WEAVE TYPES
// ============================================================================

export type WeaveType = 
  | 'plain'           // 1/1 - basic tartan weave
  | 'twill-2-2'       // 2/2 twill - traditional tartan
  | 'twill-3-1'       // 3/1 twill
  | 'herringbone'     // Reversing twill
  | 'houndstooth'     // Modified twill
  | 'basketweave';    // 2/2 plain variant

export interface WeavePattern {
  type: WeaveType;
  name: string;
  description: string;
  /** Threading sequence (which shaft each warp goes on) */
  threading: number[];
  /** Tie-up matrix (which shafts lift for each treadle) */
  tieUp: boolean[][];
  /** Treadling sequence */
  treadling: number[];
  /** Number of shafts required */
  shafts: number;
  /** Number of treadles */
  treadles: number;
}

export interface WovenPixel {
  /** The visible color at this intersection */
  color: string;
  /** Is warp on top (true) or weft on top (false) */
  warpOnTop: boolean;
  /** Warp thread color */
  warpColor: string;
  /** Weft thread color */
  weftColor: string;
}

// ============================================================================
// RENDERING TYPES
// ============================================================================

export interface RenderOptions {
  /** Pixels per thread */
  scale: number;
  /** Number of sett repeats in each direction */
  repeats: number;
  /** Weave pattern to use */
  weave: WeaveType;
  /** Show thread texture */
  showTexture: boolean;
  /** Texture intensity (0-1) */
  textureIntensity: number;
  /** Background color for transparent areas */
  backgroundColor?: string;
}

export interface TartanImage {
  /** Image data URL or canvas */
  data: string | HTMLCanvasElement;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** Sett used to generate */
  sett: Sett;
  /** Options used */
  options: RenderOptions;
}

// ============================================================================
// OPTICAL ILLUSION / SHAPE MASK TYPES
// ============================================================================

export type ShapeMaskType = 
  | 'none'
  | 'cube'
  | 'penrose'
  | 'hexagon'
  | 'sphere'
  | 'wave'
  | 'diamond'
  | 'escher';

export interface ShapeMaskOptions {
  type: ShapeMaskType;
  /** Size of shape elements */
  elementSize: number;
  /** Depth/intensity of 3D effect */
  depth: number;
  /** Light direction in degrees */
  lightAngle: number;
  /** Ambient light level (0-1) */
  ambientLight: number;
}

export interface MaskedRegion {
  /** Brightness multiplier for this region */
  brightness: number;
  /** Optional hue shift */
  hueShift?: number;
  /** Optional saturation multiplier */
  saturationMultiplier?: number;
}

// ============================================================================
// GENERATOR / CONSTRAINT TYPES
// ============================================================================

export interface GeneratorConstraints {
  /** Min/max number of colors */
  colorCount: { min: number; max: number };
  /** Min/max number of stripes in half-sett */
  stripeCount: { min: number; max: number };
  /** Min/max thread count per stripe */
  threadCount: { min: number; max: number };
  /** Total thread count range for half-sett */
  totalThreads: { min: number; max: number };
  /** Allowed color palette */
  allowedColors?: string[];
  /** Required colors (must appear) */
  requiredColors?: string[];
  /** Symmetry type */
  symmetry: 'symmetric' | 'asymmetric' | 'either';
  /** Minimum Delta E between adjacent colors */
  minColorContrast?: number;
}

export interface GeneratorResult {
  sett: Sett;
  seed: number;
  constraints: GeneratorConstraints;
  signature: SettSignature;
}

// ============================================================================
// SIMILARITY / COMPARISON TYPES
// ============================================================================

export interface SimilarityResult {
  /** Overall similarity score (0-1, 1 = identical) */
  overall: number;
  /** Structural similarity (ignoring colors) */
  structural: number;
  /** Color palette similarity */
  colorPalette: number;
  /** Proportion similarity */
  proportions: number;
  /** Visual similarity (rendered comparison) */
  visual?: number;
}

export interface TartanMatch {
  sett: Sett;
  similarity: SimilarityResult;
  source?: string;  // e.g., "Scottish Register"
}

// ============================================================================
// PRODUCTION / YARN TYPES
// ============================================================================

export type YarnWeight = 
  | 'lace'
  | 'fingering'
  | 'sport'
  | 'dk'
  | 'worsted'
  | 'aran'
  | 'bulky'
  | 'super-bulky';

export interface YarnProfile {
  weightClass: YarnWeight;
  /** Wraps per inch */
  wpi: number;
  /** Yards per 100g (approximate) */
  yardsPer100g: number;
  /** Typical gauge (stitches per 4 inches) */
  typicalGauge: number;
}

export interface ProductDimensions {
  width: number;
  length: number;
  unit: 'inch' | 'cm';
}

export interface ProductTemplate {
  name: string;
  description: string;
  dimensions: ProductDimensions;
  recommendedYarnWeight: YarnWeight;
  recommendedGauge: number;
}

export interface YarnRequirement {
  color: string;
  colorName: string;
  hex: string;
  /** Yards needed for warp */
  warpYards: number;
  /** Yards needed for weft */
  weftYards: number;
  /** Total yards */
  totalYards: number;
  /** Weight in grams */
  weightGrams: number;
  /** Number of skeins (rounded up) */
  skeins: number;
}

export interface MaterialsCalculation {
  sett: Sett;
  dimensions: ProductDimensions;
  yarnProfile: YarnProfile;
  /** Threads per inch (gauge) */
  gauge: number;
  /** Waste/loom allowance multiplier */
  wasteMultiplier: number;
  /** Requirements per color */
  requirements: YarnRequirement[];
  /** Total yards needed */
  totalYards: number;
  /** Total weight in grams */
  totalWeight: number;
  /** Total skeins needed */
  totalSkeins: number;
}

// ============================================================================
// EXPORT FORMAT TYPES
// ============================================================================

export interface WIFExport {
  /** Complete WIF file content */
  content: string;
  /** Filename suggestion */
  filename: string;
}

export interface SVGExport {
  /** SVG markup */
  content: string;
  /** Width in specified units */
  width: number;
  /** Height in specified units */
  height: number;
  /** Unit type */
  unit: 'px' | 'mm' | 'in';
}

export interface ExportOptions {
  format: 'wif' | 'svg' | 'png' | 'pdf' | 'json';
  /** Include production specs */
  includeProduction?: boolean;
  /** Scale factor for raster exports */
  scale?: number;
  /** DPI for print exports */
  dpi?: number;
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface AppState {
  currentSett: Sett | null;
  expandedSett: ExpandedSett | null;
  renderOptions: RenderOptions;
  shapeMask: ShapeMaskOptions;
  constraints: GeneratorConstraints;
  history: GeneratorResult[];
  favorites: Sett[];
}

export interface GeneratorUIState {
  isGenerating: boolean;
  lastResult: GeneratorResult | null;
  showAdvanced: boolean;
  previewScale: number;
}
