/**
 * Tartan System - Sett Module
 * Threadcount parsing, expansion, and signature generation
 */

import { Sett, ThreadStripe, ExpandedSett, SettSignature } from './types';

// Re-export types for convenience
export type { Sett, ThreadStripe, ExpandedSett, SettSignature };

// ============================================================================
// THREADCOUNT PARSING
// ============================================================================

/**
 * Parse a threadcount string into a Sett object
 * 
 * Supports formats:
 * - Symmetric with pivots: "B/24 W4 B24 R2 K24 G24 W/2"
 * - Asymmetric with ellipses: "...B24 W4 B24 R2..."
 * - Simple: "B24 W4 B24 R2 K24 G24 W2"
 */
export function parseThreadcount(threadcount: string, name?: string): Sett {
  const normalized = threadcount.trim();
  const isAsymmetric = normalized.startsWith('...');
  
  // Remove ellipses markers
  let cleaned = normalized.replace(/\.\.\./g, '').trim();
  
  // Parse stripes
  const stripeRegex = /([A-Z]+)\/?([\d]+)/gi;
  const stripes: ThreadStripe[] = [];
  let match;
  
  while ((match = stripeRegex.exec(cleaned)) !== null) {
    const fullMatch = match[0];
    const colorCode = match[1].toUpperCase();
    const count = parseInt(match[2], 10);
    const isPivot = fullMatch.includes('/');
    
    stripes.push({
      color: colorCode,
      count,
      isPivot,
    });
  }
  
  if (stripes.length === 0) {
    throw new Error(`Invalid threadcount: ${threadcount}`);
  }
  
  // Determine symmetry
  const hasPivots = stripes.some(s => s.isPivot);
  const symmetry: 'symmetric' | 'asymmetric' = 
    isAsymmetric ? 'asymmetric' : (hasPivots ? 'symmetric' : 'symmetric');
  
  // Calculate total threads (for half-sett)
  const totalThreads = stripes.reduce((sum, s) => sum + s.count, 0);
  
  // Extract unique colors
  const colors = [...new Set(stripes.map(s => s.color))];
  
  return {
    name,
    threadcount: normalized,
    stripes,
    symmetry,
    totalThreads,
    colors,
  };
}

/**
 * Convert a Sett back to threadcount string notation
 */
export function toThreadcountString(sett: Sett): string {
  const parts = sett.stripes.map(stripe => {
    const pivot = stripe.isPivot ? '/' : '';
    return `${stripe.color}${pivot}${stripe.count}`;
  });
  
  if (sett.symmetry === 'asymmetric') {
    return `...${parts.join(' ')}...`;
  }
  
  return parts.join(' ');
}

// ============================================================================
// SETT EXPANSION
// ============================================================================

/**
 * Expand a sett into the full thread sequence for one repeat
 */
export function expandSett(sett: Sett): ExpandedSett {
  const threads: string[] = [];
  
  if (sett.symmetry === 'symmetric') {
    // Forward pass
    for (const stripe of sett.stripes) {
      for (let i = 0; i < stripe.count; i++) {
        threads.push(stripe.color);
      }
    }
    
    // Mirror pass (excluding pivots to avoid doubling)
    for (let i = sett.stripes.length - 1; i >= 0; i--) {
      const stripe = sett.stripes[i];
      if (stripe.isPivot) continue; // Skip pivot points
      
      for (let j = 0; j < stripe.count; j++) {
        threads.push(stripe.color);
      }
    }
  } else {
    // Asymmetric: just repeat as-is
    for (const stripe of sett.stripes) {
      for (let i = 0; i < stripe.count; i++) {
        threads.push(stripe.color);
      }
    }
  }
  
  // Calculate distribution
  const distribution: Record<string, number> = {};
  for (const thread of threads) {
    distribution[thread] = (distribution[thread] || 0) + 1;
  }
  
  return {
    threads,
    length: threads.length,
    distribution,
  };
}

/**
 * Get thread color at a specific index (with wrapping)
 */
export function getThreadAt(expanded: ExpandedSett, index: number): string {
  const wrappedIndex = ((index % expanded.length) + expanded.length) % expanded.length;
  return expanded.threads[wrappedIndex];
}

// ============================================================================
// SETT SIGNATURES (for comparison)
// ============================================================================

/**
 * Generate signatures for sett comparison
 */
export function generateSignatures(sett: Sett): SettSignature {
  const expanded = expandSett(sett);
  
  // Full signature: color sequence with counts
  const signature = sett.stripes
    .map(s => `${s.color}${s.count}`)
    .join('-');
  
  // Structure signature: just the pattern without specific colors
  // Replace each unique color with a letter A, B, C, etc.
  const colorMap = new Map<string, string>();
  let nextLetter = 65; // 'A'
  const structureSignature = sett.stripes
    .map(s => {
      if (!colorMap.has(s.color)) {
        colorMap.set(s.color, String.fromCharCode(nextLetter++));
      }
      return `${colorMap.get(s.color)}${s.count}`;
    })
    .join('-');
  
  // Proportion signature: normalized ratios
  const total = sett.totalThreads;
  const proportionSignature = sett.stripes
    .map(s => {
      const ratio = s.count / total;
      // Round to 2 decimal places for comparison
      return Math.round(ratio * 100) / 100;
    })
    .join(':');
  
  return {
    signature,
    structureSignature,
    proportionSignature,
  };
}

/**
 * Compare two setts for similarity
 */
export function compareSettSignatures(sig1: SettSignature, sig2: SettSignature): {
  exact: boolean;
  structural: boolean;
  proportional: boolean;
} {
  return {
    exact: sig1.signature === sig2.signature,
    structural: sig1.structureSignature === sig2.structureSignature,
    proportional: sig1.proportionSignature === sig2.proportionSignature,
  };
}

// ============================================================================
// SETT MANIPULATION
// ============================================================================

/**
 * Scale a sett by a factor (multiply all thread counts)
 */
export function scaleSett(sett: Sett, factor: number): Sett {
  const scaledStripes = sett.stripes.map(stripe => ({
    ...stripe,
    count: Math.max(1, Math.round(stripe.count * factor)),
  }));
  
  const totalThreads = scaledStripes.reduce((sum, s) => sum + s.count, 0);
  
  return {
    ...sett,
    stripes: scaledStripes,
    totalThreads,
    threadcount: toThreadcountString({ ...sett, stripes: scaledStripes }),
  };
}

/**
 * Normalize sett to a target thread count
 */
export function normalizeSett(sett: Sett, targetThreads: number): Sett {
  const factor = targetThreads / sett.totalThreads;
  return scaleSett(sett, factor);
}

/**
 * Shift colors in a sett (rotate the color assignments)
 */
export function shiftColors(sett: Sett, colorMapping: Record<string, string>): Sett {
  const newStripes = sett.stripes.map(stripe => ({
    ...stripe,
    color: colorMapping[stripe.color] || stripe.color,
  }));
  
  const colors = [...new Set(newStripes.map(s => s.color))];
  
  return {
    ...sett,
    stripes: newStripes,
    colors,
    threadcount: toThreadcountString({ ...sett, stripes: newStripes }),
  };
}

/**
 * Reverse the stripe order
 */
export function reverseSett(sett: Sett): Sett {
  const reversedStripes = [...sett.stripes].reverse().map((stripe, index, arr) => ({
    ...stripe,
    // Move pivots to maintain symmetry
    isPivot: index === 0 || index === arr.length - 1 ? stripe.isPivot : false,
  }));
  
  return {
    ...sett,
    stripes: reversedStripes,
    threadcount: toThreadcountString({ ...sett, stripes: reversedStripes }),
  };
}

// ============================================================================
// SETT VALIDATION
// ============================================================================

export interface SettValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a sett against constraints
 */
export function validateSett(
  sett: Sett,
  options: {
    minColors?: number;
    maxColors?: number;
    minStripes?: number;
    maxStripes?: number;
    minThreadCount?: number;
    maxThreadCount?: number;
    minTotalThreads?: number;
    maxTotalThreads?: number;
  } = {}
): SettValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const {
    minColors = 2,
    maxColors = 8,
    minStripes = 2,
    maxStripes = 20,
    minThreadCount = 2,
    maxThreadCount = 100,
    minTotalThreads = 10,
    maxTotalThreads = 500,
  } = options;
  
  // Color count
  if (sett.colors.length < minColors) {
    errors.push(`Too few colors: ${sett.colors.length} (min: ${minColors})`);
  }
  if (sett.colors.length > maxColors) {
    errors.push(`Too many colors: ${sett.colors.length} (max: ${maxColors})`);
  }
  
  // Stripe count
  if (sett.stripes.length < minStripes) {
    errors.push(`Too few stripes: ${sett.stripes.length} (min: ${minStripes})`);
  }
  if (sett.stripes.length > maxStripes) {
    errors.push(`Too many stripes: ${sett.stripes.length} (max: ${maxStripes})`);
  }
  
  // Individual thread counts
  for (const stripe of sett.stripes) {
    if (stripe.count < minThreadCount) {
      errors.push(`Stripe ${stripe.color} has too few threads: ${stripe.count} (min: ${minThreadCount})`);
    }
    if (stripe.count > maxThreadCount) {
      errors.push(`Stripe ${stripe.color} has too many threads: ${stripe.count} (max: ${maxThreadCount})`);
    }
  }
  
  // Total threads
  if (sett.totalThreads < minTotalThreads) {
    errors.push(`Total threads too low: ${sett.totalThreads} (min: ${minTotalThreads})`);
  }
  if (sett.totalThreads > maxTotalThreads) {
    errors.push(`Total threads too high: ${sett.totalThreads} (max: ${maxTotalThreads})`);
  }
  
  // Warnings
  if (sett.symmetry === 'symmetric') {
    const hasPivots = sett.stripes.some(s => s.isPivot);
    if (!hasPivots) {
      warnings.push('Symmetric sett has no explicit pivot points');
    }
  }
  
  // Check for adjacent identical colors
  for (let i = 0; i < sett.stripes.length - 1; i++) {
    if (sett.stripes[i].color === sett.stripes[i + 1].color) {
      warnings.push(`Adjacent stripes with same color: ${sett.stripes[i].color}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// COMMON TARTANS (examples)
// ============================================================================

export const EXAMPLE_SETTS: Record<string, string> = {
  'Black Watch': 'K/22 B4 K4 B4 K16 G/28 K6 G28 K16 B/22',
  'Royal Stewart': 'R/72 G4 R4 G28 K4 Y4 K4 W4 K4 Y4 K4 G28 R/4',
  'MacLeod': 'Y/32 K4 Y4 K24 Y/32',
  'Simple Check': 'B/24 W4 B/24',
  'Basic Tartan': 'G/16 B4 G16 R4 G16 B4 G/16',
};

/**
 * Get a pre-defined example sett
 */
export function getExampleSett(name: keyof typeof EXAMPLE_SETTS): Sett {
  const threadcount = EXAMPLE_SETTS[name];
  if (!threadcount) {
    throw new Error(`Unknown example sett: ${name}`);
  }
  return parseThreadcount(threadcount, name);
}
