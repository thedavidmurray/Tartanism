/**
 * Tartan System - Generator Module
 * Generate random valid tartans with configurable constraints
 */

import { 
  Sett, 
  ThreadStripe, 
  GeneratorConstraints, 
  GeneratorResult,
  SettSignature 
} from './types';
import { parseThreadcount, toThreadcountString, generateSignatures, validateSett } from './sett';
import { TARTAN_COLORS, getColor, hasMinimumContrast } from './colors';

// ============================================================================
// SEEDED RANDOM NUMBER GENERATOR
// ============================================================================

/**
 * Mulberry32 PRNG - fast, simple, seedable
 */
function mulberry32(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Create a seeded random helper with utility methods
 */
function createRandom(seed: number) {
  const next = mulberry32(seed);
  
  return {
    /** Get next random float [0, 1) */
    float: () => next(),
    
    /** Get random integer in range [min, max] inclusive */
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    
    /** Pick random item from array */
    pick: <T>(arr: T[]): T => arr[Math.floor(next() * arr.length)],
    
    /** Shuffle array in place */
    shuffle: <T>(arr: T[]): T[] => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
    
    /** Weighted random selection */
    weighted: <T>(items: T[], weights: number[]): T => {
      const total = weights.reduce((a, b) => a + b, 0);
      let r = next() * total;
      for (let i = 0; i < items.length; i++) {
        r -= weights[i];
        if (r <= 0) return items[i];
      }
      return items[items.length - 1];
    },
  };
}

// ============================================================================
// DEFAULT CONSTRAINTS
// ============================================================================

export const DEFAULT_CONSTRAINTS: GeneratorConstraints = {
  colorCount: { min: 3, max: 6 },
  stripeCount: { min: 4, max: 12 },
  threadCount: { min: 4, max: 48 },
  totalThreads: { min: 60, max: 180 },
  symmetry: 'symmetric',
  minColorContrast: 20,
};

/**
 * Preset constraint configurations
 */
export const CONSTRAINT_PRESETS: Record<string, GeneratorConstraints> = {
  'simple': {
    colorCount: { min: 2, max: 3 },
    stripeCount: { min: 3, max: 5 },
    threadCount: { min: 8, max: 32 },
    totalThreads: { min: 40, max: 100 },
    symmetry: 'symmetric',
    minColorContrast: 25,
  },
  'classic': {
    colorCount: { min: 4, max: 6 },
    stripeCount: { min: 6, max: 10 },
    threadCount: { min: 4, max: 48 },
    totalThreads: { min: 80, max: 160 },
    symmetry: 'symmetric',
    minColorContrast: 20,
  },
  'complex': {
    colorCount: { min: 5, max: 8 },
    stripeCount: { min: 8, max: 16 },
    threadCount: { min: 2, max: 36 },
    totalThreads: { min: 100, max: 250 },
    symmetry: 'either',
    minColorContrast: 15,
  },
  'minimal': {
    colorCount: { min: 2, max: 2 },
    stripeCount: { min: 2, max: 4 },
    threadCount: { min: 16, max: 48 },
    totalThreads: { min: 48, max: 120 },
    symmetry: 'symmetric',
    minColorContrast: 30,
  },
  'hunting': {
    // Hunting tartans typically have muted colors and more green/brown
    colorCount: { min: 4, max: 6 },
    stripeCount: { min: 5, max: 10 },
    threadCount: { min: 4, max: 40 },
    totalThreads: { min: 80, max: 180 },
    symmetry: 'symmetric',
    minColorContrast: 18,
    allowedColors: ['DG', 'HG', 'OG', 'BR', 'DBR', 'K', 'NB', 'DR', 'GY', 'W'],
  },
  'dress': {
    // Dress tartans have more white/light colors
    colorCount: { min: 4, max: 6 },
    stripeCount: { min: 5, max: 10 },
    threadCount: { min: 4, max: 40 },
    totalThreads: { min: 80, max: 180 },
    symmetry: 'symmetric',
    minColorContrast: 20,
    requiredColors: ['W'],
  },
};

// ============================================================================
// GENERATOR
// ============================================================================

/**
 * Generate a random tartan sett
 */
export function generateTartan(
  constraints: Partial<GeneratorConstraints> = {},
  seed?: number
): GeneratorResult {
  // Merge with defaults
  const opts: GeneratorConstraints = { ...DEFAULT_CONSTRAINTS, ...constraints };
  
  // Create seeded RNG
  const actualSeed = seed ?? Math.floor(Math.random() * 2147483647);
  const rng = createRandom(actualSeed);
  
  // Select colors
  const colors = selectColors(opts, rng);
  
  // Generate stripe pattern
  const stripes = generateStripes(colors, opts, rng);
  
  // Build threadcount string
  const threadcount = buildThreadcount(stripes, opts.symmetry === 'symmetric');
  
  // Parse into Sett
  const sett = parseThreadcount(threadcount);
  
  // Generate signatures
  const signature = generateSignatures(sett);
  
  return {
    sett,
    seed: actualSeed,
    constraints: opts,
    signature,
  };
}

/**
 * Select colors for the tartan
 */
function selectColors(
  opts: GeneratorConstraints, 
  rng: ReturnType<typeof createRandom>
): string[] {
  const { colorCount, allowedColors, requiredColors, minColorContrast = 15 } = opts;
  
  // Determine available colors
  let availableCodes = allowedColors || Object.keys(TARTAN_COLORS);
  
  // How many colors to pick
  const numColors = rng.int(colorCount.min, colorCount.max);
  
  // Start with required colors
  const selected: string[] = [...(requiredColors || [])];
  
  // Remove already selected from available
  availableCodes = availableCodes.filter(c => !selected.includes(c));
  
  // Pick remaining colors ensuring contrast
  while (selected.length < numColors && availableCodes.length > 0) {
    // Shuffle available colors
    rng.shuffle(availableCodes);
    
    // Try to find a color with good contrast
    let found = false;
    for (const code of availableCodes) {
      const candidate = getColor(code);
      if (!candidate) continue;
      
      // Check contrast against all selected
      const hasGoodContrast = selected.every(selCode => {
        const selColor = getColor(selCode);
        return !selColor || hasMinimumContrast(candidate, selColor, minColorContrast);
      });
      
      if (hasGoodContrast || selected.length === 0) {
        selected.push(code);
        availableCodes = availableCodes.filter(c => c !== code);
        found = true;
        break;
      }
    }
    
    // If no contrasting color found, just pick any remaining
    if (!found && availableCodes.length > 0) {
      const pick = availableCodes.shift()!;
      selected.push(pick);
    }
  }
  
  return selected;
}

/**
 * Generate the stripe pattern
 */
function generateStripes(
  colors: string[],
  opts: GeneratorConstraints,
  rng: ReturnType<typeof createRandom>
): ThreadStripe[] {
  const { stripeCount, threadCount, totalThreads } = opts;
  
  // Determine number of stripes
  const numStripes = rng.int(stripeCount.min, stripeCount.max);
  
  // Generate initial stripe pattern
  const stripes: ThreadStripe[] = [];
  let remainingThreads = rng.int(totalThreads.min, totalThreads.max);
  
  for (let i = 0; i < numStripes; i++) {
    // Pick color (avoid same as previous)
    let colorOptions = [...colors];
    if (i > 0) {
      colorOptions = colorOptions.filter(c => c !== stripes[i - 1].color);
    }
    const color = rng.pick(colorOptions);
    
    // Determine thread count
    const isLastStripe = i === numStripes - 1;
    let count: number;
    
    if (isLastStripe) {
      // Use remaining threads
      count = Math.max(threadCount.min, Math.min(threadCount.max, remainingThreads));
    } else {
      // Calculate reasonable count
      const avgRemaining = remainingThreads / (numStripes - i);
      const min = Math.max(threadCount.min, Math.floor(avgRemaining * 0.3));
      const max = Math.min(threadCount.max, Math.floor(avgRemaining * 1.7), remainingThreads - (numStripes - i - 1) * threadCount.min);
      count = rng.int(Math.max(min, threadCount.min), Math.max(max, threadCount.min));
    }
    
    remainingThreads -= count;
    
    // Determine if this is a pivot (first and last for symmetric)
    const isPivot = (i === 0 || i === numStripes - 1);
    
    stripes.push({ color, count, isPivot });
  }
  
  return stripes;
}

/**
 * Build threadcount notation string
 */
function buildThreadcount(stripes: ThreadStripe[], symmetric: boolean): string {
  const parts = stripes.map(stripe => {
    const pivot = symmetric && stripe.isPivot ? '/' : '';
    return `${stripe.color}${pivot}${stripe.count}`;
  });
  
  return parts.join(' ');
}

// ============================================================================
// BATCH GENERATION
// ============================================================================

/**
 * Generate multiple unique tartans
 */
export function generateBatch(
  count: number,
  constraints: Partial<GeneratorConstraints> = {},
  baseSeed?: number
): GeneratorResult[] {
  const results: GeneratorResult[] = [];
  const signatures = new Set<string>();
  
  const startSeed = baseSeed ?? Math.floor(Math.random() * 2147483647);
  let attempts = 0;
  const maxAttempts = count * 10;
  
  while (results.length < count && attempts < maxAttempts) {
    const result = generateTartan(constraints, startSeed + attempts);
    attempts++;
    
    // Check for uniqueness (structural)
    if (!signatures.has(result.signature.structureSignature)) {
      signatures.add(result.signature.structureSignature);
      results.push(result);
    }
  }
  
  return results;
}

/**
 * Generate variations of a base sett
 */
export function generateVariations(
  baseSett: Sett,
  count: number,
  variationType: 'colors' | 'proportions' | 'both' = 'colors',
  seed?: number
): GeneratorResult[] {
  const results: GeneratorResult[] = [];
  const startSeed = seed ?? Math.floor(Math.random() * 2147483647);
  
  for (let i = 0; i < count; i++) {
    const rng = createRandom(startSeed + i);
    let newStripes = [...baseSett.stripes.map(s => ({ ...s }))];
    
    if (variationType === 'colors' || variationType === 'both') {
      // Shuffle colors while maintaining structure
      const uniqueColors = [...new Set(baseSett.colors)];
      const availableColors = Object.keys(TARTAN_COLORS);
      const colorMap: Record<string, string> = {};
      
      for (const original of uniqueColors) {
        const options = availableColors.filter(c => !Object.values(colorMap).includes(c));
        colorMap[original] = rng.pick(options);
      }
      
      newStripes = newStripes.map(s => ({
        ...s,
        color: colorMap[s.color] || s.color,
      }));
    }
    
    if (variationType === 'proportions' || variationType === 'both') {
      // Vary thread counts
      newStripes = newStripes.map(s => ({
        ...s,
        count: Math.max(2, Math.round(s.count * (0.7 + rng.float() * 0.6))),
      }));
    }
    
    const threadcount = toThreadcountString({
      ...baseSett,
      stripes: newStripes,
    });
    
    const sett = parseThreadcount(threadcount);
    const signature = generateSignatures(sett);
    
    results.push({
      sett,
      seed: startSeed + i,
      constraints: DEFAULT_CONSTRAINTS,
      signature,
    });
  }
  
  return results;
}

// ============================================================================
// EXPORT
// ============================================================================

export { createRandom };
