/**
 * Tartan System - Optical Illusion Shapes Module
 * Generate brightness/color masks for 3D effects on tartan patterns
 */

import { ShapeMaskType, ShapeMaskOptions, MaskedRegion } from '../core/types';

// Re-export types for convenience
export type { ShapeMaskType, ShapeMaskOptions, MaskedRegion };

// ============================================================================
// MASK GENERATION
// ============================================================================

export interface MaskPixel {
  brightness: number;       // 0-1 multiplier
  hueShift: number;        // degrees
  saturationMult: number;  // multiplier
}

export type MaskFunction = (
  x: number,
  y: number,
  width: number,
  height: number,
  options: ShapeMaskOptions
) => MaskPixel;

/**
 * No mask - returns neutral values
 */
const noneMask: MaskFunction = () => ({
  brightness: 1,
  hueShift: 0,
  saturationMult: 1,
});

/**
 * Isometric cube illusion
 */
const cubeMask: MaskFunction = (x, y, width, height, options) => {
  const { elementSize, depth, lightAngle, ambientLight } = options;
  
  // Create cube grid
  const cubeW = elementSize * 2;
  const cubeH = elementSize * Math.sqrt(3);
  
  // Offset every other row
  const row = Math.floor(y / cubeH);
  const offsetX = (row % 2) * cubeW / 2;
  
  // Local position within cube
  const localX = ((x + offsetX) % cubeW) / cubeW;
  const localY = (y % cubeH) / cubeH;
  
  // Determine which face we're on
  // Cube has 3 visible faces: top, left, right
  const centerX = 0.5;
  const centerY = 0.5;
  
  // Calculate face based on position relative to center
  const dx = localX - centerX;
  const dy = localY - centerY;
  
  let face: 'top' | 'left' | 'right';
  
  if (dy < -0.15) {
    face = 'top';
  } else if (dx < 0) {
    face = 'left';
  } else {
    face = 'right';
  }
  
  // Light direction (convert angle to vector)
  const lightRad = (lightAngle * Math.PI) / 180;
  const lightX = Math.cos(lightRad);
  const lightY = Math.sin(lightRad);
  
  // Face normals and brightness calculation
  let faceBrightness: number;
  switch (face) {
    case 'top':
      // Top face normal points up
      faceBrightness = 0.3 + 0.7 * Math.max(0, -lightY);
      break;
    case 'left':
      // Left face normal points left-down
      faceBrightness = 0.3 + 0.5 * Math.max(0, -lightX - lightY * 0.5);
      break;
    case 'right':
      // Right face normal points right-down
      faceBrightness = 0.3 + 0.5 * Math.max(0, lightX - lightY * 0.5);
      break;
  }
  
  // Apply depth and ambient
  const brightness = ambientLight + (1 - ambientLight) * faceBrightness * depth;
  
  return {
    brightness: Math.max(0.2, Math.min(1.2, brightness)),
    hueShift: 0,
    saturationMult: 0.9 + brightness * 0.2,
  };
};

/**
 * Penrose triangle / impossible shapes
 */
const penroseMask: MaskFunction = (x, y, width, height, options) => {
  const { elementSize, depth } = options;
  
  // Create triangular grid
  const size = elementSize * 3;
  const localX = (x % size) / size;
  const localY = (y % size) / size;
  
  // Create three-bar pattern
  const bar = Math.floor((localX + localY * 2) * 3) % 3;
  
  const brightnesses = [0.6, 0.9, 1.1];
  const brightness = brightnesses[bar] * depth + (1 - depth);
  
  return {
    brightness,
    hueShift: bar * 3,
    saturationMult: 1,
  };
};

/**
 * Hexagonal honeycomb
 */
const hexagonMask: MaskFunction = (x, y, width, height, options) => {
  const { elementSize, depth, lightAngle } = options;
  
  const hexSize = elementSize;
  const hexHeight = hexSize * Math.sqrt(3);
  const hexWidth = hexSize * 2;
  
  // Offset rows
  const row = Math.floor(y / (hexHeight * 0.75));
  const offsetX = (row % 2) * hexWidth * 0.5;
  
  // Find hex center
  const col = Math.floor((x + offsetX) / hexWidth);
  const centerX = col * hexWidth - offsetX + hexWidth / 2;
  const centerY = row * hexHeight * 0.75 + hexHeight / 2;
  
  // Distance from center
  const dx = x - centerX;
  const dy = y - centerY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const maxDist = hexSize * 0.9;
  
  // Create 3D depth effect
  const normalizedDist = Math.min(1, dist / maxDist);
  const zHeight = Math.cos(normalizedDist * Math.PI / 2);
  
  // Light direction
  const lightRad = (lightAngle * Math.PI) / 180;
  const lightX = Math.cos(lightRad);
  const lightY = Math.sin(lightRad);
  
  // Surface normal based on position
  const nx = dx / maxDist;
  const ny = dy / maxDist;
  
  // Dot product for lighting
  const lightDot = nx * lightX + ny * lightY;
  
  const brightness = 0.5 + 0.5 * (zHeight + lightDot * 0.3) * depth;
  
  return {
    brightness: Math.max(0.3, Math.min(1.2, brightness)),
    hueShift: 0,
    saturationMult: 1 - normalizedDist * 0.2,
  };
};

/**
 * Sphere / bubble effect
 */
const sphereMask: MaskFunction = (x, y, width, height, options) => {
  const { elementSize, depth, lightAngle, ambientLight } = options;
  
  const sphereSize = elementSize * 2;
  
  // Sphere grid
  const gridX = Math.floor(x / sphereSize);
  const gridY = Math.floor(y / sphereSize);
  const centerX = (gridX + 0.5) * sphereSize;
  const centerY = (gridY + 0.5) * sphereSize;
  
  // Distance from center
  const dx = (x - centerX) / (sphereSize / 2);
  const dy = (y - centerY) / (sphereSize / 2);
  const dist2 = dx * dx + dy * dy;
  
  if (dist2 > 1) {
    // Outside sphere
    return { brightness: ambientLight, hueShift: 0, saturationMult: 0.8 };
  }
  
  // Sphere surface normal (z component from sphere equation)
  const nz = Math.sqrt(1 - dist2);
  const nx = dx;
  const ny = dy;
  
  // Light vector
  const lightRad = (lightAngle * Math.PI) / 180;
  const lx = Math.cos(lightRad) * 0.7;
  const ly = Math.sin(lightRad) * 0.7;
  const lz = 0.7;
  
  // Diffuse lighting
  const diffuse = Math.max(0, nx * lx + ny * ly + nz * lz);
  
  // Specular highlight
  const rx = 2 * nz * nx - lx;
  const ry = 2 * nz * ny - ly;
  const rz = 2 * nz * nz - lz;
  const specular = Math.pow(Math.max(0, rz), 20);
  
  const brightness = ambientLight + (diffuse * 0.7 + specular * 0.5) * depth;
  
  return {
    brightness: Math.max(0.2, Math.min(1.4, brightness)),
    hueShift: specular * 10,
    saturationMult: 1 - specular * 0.5,
  };
};

/**
 * Wave / ripple effect
 */
const waveMask: MaskFunction = (x, y, width, height, options) => {
  const { elementSize, depth, lightAngle } = options;
  
  const waveLength = elementSize * 2;
  const amplitude = depth * 0.5;
  
  // Multiple overlapping waves
  const wave1 = Math.sin((x / waveLength) * Math.PI * 2);
  const wave2 = Math.sin((y / waveLength) * Math.PI * 2);
  const wave3 = Math.sin(((x + y) / waveLength) * Math.PI * 2);
  
  const combined = (wave1 + wave2 * 0.5 + wave3 * 0.3) / 1.8;
  
  // Surface normal approximation
  const gradX = Math.cos((x / waveLength) * Math.PI * 2);
  const gradY = Math.cos((y / waveLength) * Math.PI * 2);
  
  // Light direction
  const lightRad = (lightAngle * Math.PI) / 180;
  const lightX = Math.cos(lightRad);
  const lightY = Math.sin(lightRad);
  
  const lighting = gradX * lightX + gradY * lightY;
  
  const brightness = 0.6 + combined * amplitude + lighting * 0.3 * depth;
  
  return {
    brightness: Math.max(0.3, Math.min(1.3, brightness)),
    hueShift: combined * 5,
    saturationMult: 1,
  };
};

/**
 * Diamond / rhombus 3D effect
 */
const diamondMask: MaskFunction = (x, y, width, height, options) => {
  const { elementSize, depth, lightAngle } = options;
  
  const size = elementSize * 2;
  
  // Rotate coordinates 45 degrees
  const rx = (x + y) / Math.sqrt(2);
  const ry = (y - x) / Math.sqrt(2);
  
  // Grid position
  const localX = ((rx % size) + size) % size / size;
  const localY = ((ry % size) + size) % size / size;
  
  // Diamond faces
  const inTop = localY < 0.5 && localX > 0.25 && localX < 0.75;
  const inLeft = localX < 0.5;
  
  let faceBrightness: number;
  if (inTop) {
    faceBrightness = 1.1;
  } else if (inLeft) {
    faceBrightness = 0.7;
  } else {
    faceBrightness = 0.9;
  }
  
  const brightness = 0.4 + faceBrightness * 0.6 * depth;
  
  return {
    brightness,
    hueShift: 0,
    saturationMult: 1,
  };
};

/**
 * Escher-style impossible stairs
 */
const escherMask: MaskFunction = (x, y, width, height, options) => {
  const { elementSize, depth } = options;
  
  const stepSize = elementSize;
  const numSteps = 4;
  
  // Create stair pattern
  const stairX = Math.floor(x / stepSize) % numSteps;
  const stairY = Math.floor(y / stepSize) % numSteps;
  
  // Each step has different height (creates impossible loop)
  const step = (stairX + stairY) % numSteps;
  
  // Brightness varies by step level
  const levels = [0.6, 0.75, 0.9, 1.05];
  const baseBrightness = levels[step];
  
  // Add edge highlights
  const localX = (x % stepSize) / stepSize;
  const localY = (y % stepSize) / stepSize;
  const nearEdge = localX < 0.1 || localY < 0.1;
  
  const brightness = baseBrightness * depth + (nearEdge ? 0.1 : 0);
  
  return {
    brightness: Math.max(0.3, Math.min(1.2, brightness)),
    hueShift: step * 2,
    saturationMult: 1,
  };
};

// ============================================================================
// MASK REGISTRY
// ============================================================================

const MASK_FUNCTIONS: Record<ShapeMaskType, MaskFunction> = {
  'none': noneMask,
  'cube': cubeMask,
  'penrose': penroseMask,
  'hexagon': hexagonMask,
  'sphere': sphereMask,
  'wave': waveMask,
  'diamond': diamondMask,
  'escher': escherMask,
};

/**
 * Get mask function by type
 */
export function getMaskFunction(type: ShapeMaskType): MaskFunction {
  return MASK_FUNCTIONS[type];
}

/**
 * Apply mask to get pixel modification at coordinates
 */
export function applyMask(
  x: number,
  y: number,
  width: number,
  height: number,
  options: ShapeMaskOptions
): MaskPixel {
  const maskFn = getMaskFunction(options.type);
  return maskFn(x, y, width, height, options);
}

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

export const SHAPE_PRESETS: Record<string, ShapeMaskOptions> = {
  'subtle-cubes': {
    type: 'cube',
    elementSize: 40,
    depth: 0.5,
    lightAngle: 45,
    ambientLight: 0.4,
  },
  'deep-cubes': {
    type: 'cube',
    elementSize: 60,
    depth: 1.0,
    lightAngle: 30,
    ambientLight: 0.2,
  },
  'honeycomb': {
    type: 'hexagon',
    elementSize: 30,
    depth: 0.7,
    lightAngle: 60,
    ambientLight: 0.3,
  },
  'bubbles': {
    type: 'sphere',
    elementSize: 50,
    depth: 0.8,
    lightAngle: 45,
    ambientLight: 0.3,
  },
  'water-ripple': {
    type: 'wave',
    elementSize: 25,
    depth: 0.6,
    lightAngle: 90,
    ambientLight: 0.4,
  },
  'gem-facets': {
    type: 'diamond',
    elementSize: 35,
    depth: 0.9,
    lightAngle: 45,
    ambientLight: 0.3,
  },
  'impossible-stairs': {
    type: 'escher',
    elementSize: 45,
    depth: 0.8,
    lightAngle: 45,
    ambientLight: 0.3,
  },
  'penrose-tiles': {
    type: 'penrose',
    elementSize: 40,
    depth: 0.7,
    lightAngle: 45,
    ambientLight: 0.4,
  },
};

/**
 * Get a preset configuration
 */
export function getShapePreset(name: keyof typeof SHAPE_PRESETS): ShapeMaskOptions {
  return { ...SHAPE_PRESETS[name] };
}

/**
 * Create default mask options
 */
export function createDefaultMaskOptions(): ShapeMaskOptions {
  return {
    type: 'none',
    elementSize: 40,
    depth: 0.7,
    lightAngle: 45,
    ambientLight: 0.3,
  };
}
