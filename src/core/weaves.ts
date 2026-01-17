/**
 * Tartan System - Weave Patterns Module
 * Threading, tie-up, and treadling definitions for loom weaving
 */

import { WeaveType, WeavePattern, WovenPixel } from './types';
import { ExpandedSett, getThreadAt } from './sett';

// Re-export types for convenience
export type { WeaveType, WeavePattern, WovenPixel };

// ============================================================================
// WEAVE PATTERN DEFINITIONS
// ============================================================================

export const WEAVE_PATTERNS: Record<WeaveType, WeavePattern> = {
  'plain': {
    type: 'plain',
    name: 'Plain Weave',
    description: 'Simple 1/1 over-under pattern. Creates a balanced, crisp appearance.',
    threading: [1, 2],
    tieUp: [
      [true, false],
      [false, true],
    ],
    treadling: [1, 2],
    shafts: 2,
    treadles: 2,
  },
  
  'twill-2-2': {
    type: 'twill-2-2',
    name: '2/2 Twill',
    description: 'Traditional tartan weave. Creates diagonal lines and good drape.',
    threading: [1, 2, 3, 4],
    tieUp: [
      [true, true, false, false],
      [false, true, true, false],
      [false, false, true, true],
      [true, false, false, true],
    ],
    treadling: [1, 2, 3, 4],
    shafts: 4,
    treadles: 4,
  },
  
  'twill-3-1': {
    type: 'twill-3-1',
    name: '3/1 Twill',
    description: 'Warp-dominant twill with steeper diagonal. Shows more warp color.',
    threading: [1, 2, 3, 4],
    tieUp: [
      [true, true, true, false],
      [false, true, true, true],
      [true, false, true, true],
      [true, true, false, true],
    ],
    treadling: [1, 2, 3, 4],
    shafts: 4,
    treadles: 4,
  },
  
  'herringbone': {
    type: 'herringbone',
    name: 'Herringbone',
    description: 'Reversing twill creating V-shaped pattern.',
    threading: [1, 2, 3, 4, 3, 2],
    tieUp: [
      [true, true, false, false],
      [false, true, true, false],
      [false, false, true, true],
      [true, false, false, true],
    ],
    treadling: [1, 2, 3, 4, 3, 2],
    shafts: 4,
    treadles: 4,
  },
  
  'houndstooth': {
    type: 'houndstooth',
    name: 'Houndstooth',
    description: 'Classic broken check pattern.',
    threading: [1, 2, 3, 4],
    tieUp: [
      [true, true, false, false],
      [true, true, false, false],
      [false, false, true, true],
      [false, false, true, true],
    ],
    treadling: [1, 1, 2, 2, 3, 3, 4, 4],
    shafts: 4,
    treadles: 4,
  },
  
  'basketweave': {
    type: 'basketweave',
    name: 'Basket Weave',
    description: '2/2 plain variant with doubled threads. Creates textured surface.',
    threading: [1, 1, 2, 2],
    tieUp: [
      [true, false],
      [false, true],
    ],
    treadling: [1, 1, 2, 2],
    shafts: 2,
    treadles: 2,
  },
};

/**
 * Get weave pattern by type
 */
export function getWeavePattern(type: WeaveType): WeavePattern {
  return WEAVE_PATTERNS[type];
}

// ============================================================================
// WEAVE INTERSECTION CALCULATION
// ============================================================================

/**
 * Determine if warp is on top at a given intersection
 */
export function isWarpOnTop(
  weave: WeavePattern,
  warpIndex: number,
  weftIndex: number
): boolean {
  // Get the shaft this warp thread is on (1-indexed in pattern, convert to 0-indexed)
  const threadingRepeat = weave.threading.length;
  const shaftIndex = weave.threading[warpIndex % threadingRepeat] - 1;
  
  // Get the treadle for this weft row
  const treadlingRepeat = weave.treadling.length;
  const treadleIndex = weave.treadling[weftIndex % treadlingRepeat] - 1;
  
  // Look up in tie-up matrix
  // tieUp[treadle][shaft] = true means that shaft is lifted for that treadle
  // If shaft is lifted, warp goes over weft
  return weave.tieUp[treadleIndex][shaftIndex];
}

/**
 * Calculate the visible color at a warp/weft intersection
 */
export function getIntersectionColor(
  warpExpanded: ExpandedSett,
  weftExpanded: ExpandedSett,
  weave: WeavePattern,
  warpIndex: number,
  weftIndex: number
): WovenPixel {
  const warpColor = getThreadAt(warpExpanded, warpIndex);
  const weftColor = getThreadAt(weftExpanded, weftIndex);
  const warpOnTop = isWarpOnTop(weave, warpIndex, weftIndex);
  
  return {
    color: warpOnTop ? warpColor : weftColor,
    warpOnTop,
    warpColor,
    weftColor,
  };
}

// ============================================================================
// WEAVE STRUCTURE ANALYSIS
// ============================================================================

export interface WeaveAnalysis {
  /** Percentage of surface showing warp */
  warpDominance: number;
  /** Diagonal angle (degrees, 0 = horizontal, 90 = vertical) */
  diagonalAngle: number;
  /** Pattern repeat size */
  repeatSize: { warp: number; weft: number };
  /** Float lengths (consecutive over/under) */
  maxFloat: { warp: number; weft: number };
}

/**
 * Analyze the structural properties of a weave
 */
export function analyzeWeave(weave: WeavePattern): WeaveAnalysis {
  const warpRepeat = weave.threading.length;
  const weftRepeat = weave.treadling.length;
  
  // Count warp-on-top in one repeat
  let warpOnTopCount = 0;
  const totalIntersections = warpRepeat * weftRepeat;
  
  for (let w = 0; w < warpRepeat; w++) {
    for (let f = 0; f < weftRepeat; f++) {
      if (isWarpOnTop(weave, w, f)) {
        warpOnTopCount++;
      }
    }
  }
  
  const warpDominance = warpOnTopCount / totalIntersections;
  
  // Calculate diagonal angle (simplified - based on tie-up pattern)
  // For twills, look at the shift between rows
  let diagonalAngle = 0;
  if (weave.type.includes('twill')) {
    // 2/2 twill typically has 45° diagonal
    diagonalAngle = 45;
  } else if (weave.type === 'herringbone') {
    diagonalAngle = 45; // Changes direction
  }
  
  // Calculate max float length
  let maxWarpFloat = 1;
  let maxWeftFloat = 1;
  
  // Check warp floats (vertical continuity)
  for (let w = 0; w < warpRepeat; w++) {
    let currentFloat = 0;
    for (let f = 0; f < weftRepeat * 2; f++) { // Check two repeats
      if (isWarpOnTop(weave, w, f)) {
        currentFloat++;
        maxWarpFloat = Math.max(maxWarpFloat, currentFloat);
      } else {
        currentFloat = 0;
      }
    }
  }
  
  // Check weft floats (horizontal continuity)
  for (let f = 0; f < weftRepeat; f++) {
    let currentFloat = 0;
    for (let w = 0; w < warpRepeat * 2; w++) {
      if (!isWarpOnTop(weave, w, f)) {
        currentFloat++;
        maxWeftFloat = Math.max(maxWeftFloat, currentFloat);
      } else {
        currentFloat = 0;
      }
    }
  }
  
  return {
    warpDominance,
    diagonalAngle,
    repeatSize: { warp: warpRepeat, weft: weftRepeat },
    maxFloat: { warp: maxWarpFloat, weft: maxWeftFloat },
  };
}

// ============================================================================
// WIF (WEAVING INFORMATION FILE) HELPER
// ============================================================================

/**
 * Generate threading sequence for a given sett width
 */
export function generateThreading(weave: WeavePattern, width: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < width; i++) {
    result.push(weave.threading[i % weave.threading.length]);
  }
  return result;
}

/**
 * Generate treadling sequence for a given height
 */
export function generateTreadling(weave: WeavePattern, height: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < height; i++) {
    result.push(weave.treadling[i % weave.treadling.length]);
  }
  return result;
}

/**
 * Format tie-up as a string grid (for debugging)
 */
export function formatTieUp(weave: WeavePattern): string {
  const lines: string[] = [];
  for (let t = 0; t < weave.treadles; t++) {
    const row = weave.tieUp[t]
      .map(lifted => lifted ? '█' : '░')
      .join('');
    lines.push(`T${t + 1}: ${row}`);
  }
  return lines.join('\n');
}
