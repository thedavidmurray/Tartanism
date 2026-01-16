/**
 * Tartan System - Color Module
 * 48-color traditional tartan palette with LAB conversion and Delta E 2000
 */

import { RGB, LAB, HSL, TartanColor, ColorCategory, ColorPalette } from './types';

// ============================================================================
// COLOR CONVERSION UTILITIES
// ============================================================================

export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) throw new Error(`Invalid hex color: ${hex}`);
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

export function rgbToHex(rgb: RGB): string {
  return '#' + [rgb.r, rgb.g, rgb.b]
    .map(x => Math.round(x).toString(16).padStart(2, '0'))
    .join('');
}

export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: l * 100 };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    case b: h = ((r - g) / d + 4) / 6; break;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToRgb(hsl: HSL): RGB {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: Math.round(hue2rgb(p, q, h + 1/3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1/3) * 255),
  };
}

// ============================================================================
// LAB COLOR SPACE (for Delta E calculations)
// ============================================================================

function rgbToXyz(rgb: RGB): { x: number; y: number; z: number } {
  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;

  // sRGB to linear
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  r *= 100;
  g *= 100;
  b *= 100;

  return {
    x: r * 0.4124564 + g * 0.3575761 + b * 0.1804375,
    y: r * 0.2126729 + g * 0.7151522 + b * 0.0721750,
    z: r * 0.0193339 + g * 0.1191920 + b * 0.9503041,
  };
}

export function rgbToLab(rgb: RGB): LAB {
  const xyz = rgbToXyz(rgb);
  
  // D65 illuminant
  const refX = 95.047;
  const refY = 100.000;
  const refZ = 108.883;

  let x = xyz.x / refX;
  let y = xyz.y / refY;
  let z = xyz.z / refZ;

  const epsilon = 0.008856;
  const kappa = 903.3;

  x = x > epsilon ? Math.pow(x, 1/3) : (kappa * x + 16) / 116;
  y = y > epsilon ? Math.pow(y, 1/3) : (kappa * y + 16) / 116;
  z = z > epsilon ? Math.pow(z, 1/3) : (kappa * z + 16) / 116;

  return {
    L: 116 * y - 16,
    a: 500 * (x - y),
    b: 200 * (y - z),
  };
}

/**
 * Delta E 2000 - perceptual color difference
 * Returns 0 for identical colors, ~2.3 is just noticeable difference
 */
export function deltaE2000(lab1: LAB, lab2: LAB): number {
  const rad = Math.PI / 180;
  const deg = 180 / Math.PI;

  const L1 = lab1.L, a1 = lab1.a, b1 = lab1.b;
  const L2 = lab2.L, a2 = lab2.a, b2 = lab2.b;

  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cb = (C1 + C2) / 2;

  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cb, 7) / (Math.pow(Cb, 7) + Math.pow(25, 7))));

  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);

  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);

  let h1p = Math.atan2(b1, a1p) * deg;
  if (h1p < 0) h1p += 360;
  let h2p = Math.atan2(b2, a2p) * deg;
  if (h2p < 0) h2p += 360;

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp: number;
  if (C1p * C2p === 0) {
    dhp = 0;
  } else if (Math.abs(h2p - h1p) <= 180) {
    dhp = h2p - h1p;
  } else if (h2p - h1p > 180) {
    dhp = h2p - h1p - 360;
  } else {
    dhp = h2p - h1p + 360;
  }

  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhp * rad / 2);

  const Lbp = (L1 + L2) / 2;
  const Cbp = (C1p + C2p) / 2;

  let Hbp: number;
  if (C1p * C2p === 0) {
    Hbp = h1p + h2p;
  } else if (Math.abs(h1p - h2p) <= 180) {
    Hbp = (h1p + h2p) / 2;
  } else if (h1p + h2p < 360) {
    Hbp = (h1p + h2p + 360) / 2;
  } else {
    Hbp = (h1p + h2p - 360) / 2;
  }

  const T = 1 
    - 0.17 * Math.cos((Hbp - 30) * rad) 
    + 0.24 * Math.cos(2 * Hbp * rad) 
    + 0.32 * Math.cos((3 * Hbp + 6) * rad) 
    - 0.20 * Math.cos((4 * Hbp - 63) * rad);

  const dTheta = 30 * Math.exp(-Math.pow((Hbp - 275) / 25, 2));
  const Rc = 2 * Math.sqrt(Math.pow(Cbp, 7) / (Math.pow(Cbp, 7) + Math.pow(25, 7)));
  const Sl = 1 + (0.015 * Math.pow(Lbp - 50, 2)) / Math.sqrt(20 + Math.pow(Lbp - 50, 2));
  const Sc = 1 + 0.045 * Cbp;
  const Sh = 1 + 0.015 * Cbp * T;
  const Rt = -Math.sin(2 * dTheta * rad) * Rc;

  const kL = 1, kC = 1, kH = 1;

  return Math.sqrt(
    Math.pow(dLp / (kL * Sl), 2) +
    Math.pow(dCp / (kC * Sc), 2) +
    Math.pow(dHp / (kH * Sh), 2) +
    Rt * (dCp / (kC * Sc)) * (dHp / (kH * Sh))
  );
}

/**
 * Check if two colors have sufficient contrast
 */
export function hasMinimumContrast(color1: TartanColor, color2: TartanColor, minDeltaE: number = 15): boolean {
  const lab1 = color1.lab || rgbToLab(color1.rgb);
  const lab2 = color2.lab || rgbToLab(color2.rgb);
  return deltaE2000(lab1, lab2) >= minDeltaE;
}

// ============================================================================
// COLOR MANIPULATION
// ============================================================================

export function adjustBrightness(rgb: RGB, factor: number): RGB {
  return {
    r: Math.min(255, Math.max(0, Math.round(rgb.r * factor))),
    g: Math.min(255, Math.max(0, Math.round(rgb.g * factor))),
    b: Math.min(255, Math.max(0, Math.round(rgb.b * factor))),
  };
}

export function adjustSaturation(rgb: RGB, factor: number): RGB {
  const hsl = rgbToHsl(rgb);
  hsl.s = Math.min(100, Math.max(0, hsl.s * factor));
  return hslToRgb(hsl);
}

export function shiftHue(rgb: RGB, degrees: number): RGB {
  const hsl = rgbToHsl(rgb);
  hsl.h = (hsl.h + degrees + 360) % 360;
  return hslToRgb(hsl);
}

export function blendColors(color1: RGB, color2: RGB, ratio: number = 0.5): RGB {
  return {
    r: Math.round(color1.r * (1 - ratio) + color2.r * ratio),
    g: Math.round(color1.g * (1 - ratio) + color2.g * ratio),
    b: Math.round(color1.b * (1 - ratio) + color2.b * ratio),
  };
}

// ============================================================================
// 48-COLOR TRADITIONAL TARTAN PALETTE
// ============================================================================

function createColor(
  code: string, 
  name: string, 
  hex: string, 
  category: ColorCategory
): TartanColor {
  const rgb = hexToRgb(hex);
  return {
    code,
    name,
    hex,
    rgb,
    lab: rgbToLab(rgb),
    category,
  };
}

export const TARTAN_COLORS: Record<string, TartanColor> = {
  // Blues
  'B':  createColor('B',  'Blue',           '#0000CD', 'blue'),
  'LB': createColor('LB', 'Light Blue',     '#87CEEB', 'blue'),
  'DB': createColor('DB', 'Dark Blue',      '#00008B', 'blue'),
  'AB': createColor('AB', 'Azure Blue',     '#1E90FF', 'blue'),
  'RB': createColor('RB', 'Royal Blue',     '#4169E1', 'blue'),
  'NB': createColor('NB', 'Navy Blue',      '#000080', 'blue'),
  
  // Reds
  'R':  createColor('R',  'Red',            '#DC143C', 'red'),
  'LR': createColor('LR', 'Light Red',      '#FF6B6B', 'red'),
  'DR': createColor('DR', 'Dark Red',       '#8B0000', 'red'),
  'CR': createColor('CR', 'Crimson',        '#DC143C', 'red'),
  'SC': createColor('SC', 'Scarlet',        '#FF2400', 'red'),
  'MR': createColor('MR', 'Maroon',         '#800000', 'red'),
  
  // Greens
  'G':  createColor('G',  'Green',          '#228B22', 'green'),
  'LG': createColor('LG', 'Light Green',    '#90EE90', 'green'),
  'DG': createColor('DG', 'Dark Green',     '#006400', 'green'),
  'HG': createColor('HG', 'Hunting Green',  '#355E3B', 'green'),
  'OG': createColor('OG', 'Olive Green',    '#6B8E23', 'green'),
  'FG': createColor('FG', 'Forest Green',   '#228B22', 'green'),
  'TL': createColor('TL', 'Teal',           '#008080', 'teal'),
  
  // Yellows & Golds
  'Y':  createColor('Y',  'Yellow',         '#FFD700', 'yellow'),
  'LY': createColor('LY', 'Light Yellow',   '#FFFFE0', 'yellow'),
  'GD': createColor('GD', 'Gold',           '#DAA520', 'yellow'),
  'AM': createColor('AM', 'Amber',          '#FFBF00', 'yellow'),
  'ST': createColor('ST', 'Straw',          '#E4D96F', 'yellow'),
  
  // Blacks & Greys
  'K':  createColor('K',  'Black',          '#000000', 'black'),
  'GY': createColor('GY', 'Grey',           '#808080', 'grey'),
  'LGY': createColor('LGY', 'Light Grey',   '#C0C0C0', 'grey'),
  'DGY': createColor('DGY', 'Dark Grey',    '#404040', 'grey'),
  'CH': createColor('CH', 'Charcoal',       '#36454F', 'grey'),
  
  // Whites & Creams
  'W':  createColor('W',  'White',          '#FFFFFF', 'white'),
  'CW': createColor('CW', 'Cream White',    '#FFFDD0', 'white'),
  'IW': createColor('IW', 'Ivory White',    '#FFFFF0', 'white'),
  
  // Browns & Tans
  'BR': createColor('BR', 'Brown',          '#8B4513', 'brown'),
  'LBR': createColor('LBR', 'Light Brown',  '#C4A484', 'brown'),
  'DBR': createColor('DBR', 'Dark Brown',   '#5C4033', 'brown'),
  'TN': createColor('TN', 'Tan',            '#D2B48C', 'brown'),
  'RU': createColor('RU', 'Rust',           '#B7410E', 'brown'),
  'CB': createColor('CB', 'Camel Brown',    '#C19A6B', 'brown'),
  
  // Purples
  'P':  createColor('P',  'Purple',         '#800080', 'purple'),
  'LP': createColor('LP', 'Light Purple',   '#DDA0DD', 'purple'),
  'DP': createColor('DP', 'Dark Purple',    '#4B0082', 'purple'),
  'VI': createColor('VI', 'Violet',         '#8B00FF', 'purple'),
  'LV': createColor('LV', 'Lavender',       '#E6E6FA', 'purple'),
  
  // Oranges
  'O':  createColor('O',  'Orange',         '#FF8C00', 'orange'),
  'LO': createColor('LO', 'Light Orange',   '#FFDAB9', 'orange'),
  'DO': createColor('DO', 'Dark Orange',    '#FF4500', 'orange'),
  
  // Pinks
  'PK': createColor('PK', 'Pink',           '#FF69B4', 'pink'),
  'LP2': createColor('LP2', 'Light Pink',   '#FFB6C1', 'pink'),
  'DP2': createColor('DP2', 'Deep Pink',    '#FF1493', 'pink'),
};

export const DEFAULT_PALETTE: ColorPalette = {
  name: 'Traditional Tartan',
  colors: Object.values(TARTAN_COLORS),
};

/**
 * Get color by code
 */
export function getColor(code: string): TartanColor | undefined {
  return TARTAN_COLORS[code.toUpperCase()];
}

/**
 * Get all colors in a category
 */
export function getColorsByCategory(category: ColorCategory): TartanColor[] {
  return Object.values(TARTAN_COLORS).filter(c => c.category === category);
}

/**
 * Find closest color in palette to a given hex
 */
export function findClosestColor(hex: string): TartanColor {
  const rgb = hexToRgb(hex);
  const lab = rgbToLab(rgb);
  
  let closest: TartanColor | null = null;
  let minDistance = Infinity;
  
  for (const color of Object.values(TARTAN_COLORS)) {
    const distance = deltaE2000(lab, color.lab!);
    if (distance < minDistance) {
      minDistance = distance;
      closest = color;
    }
  }
  
  return closest!;
}

/**
 * Get contrasting colors for a given color
 */
export function getContrastingColors(color: TartanColor, minContrast: number = 25): TartanColor[] {
  return Object.values(TARTAN_COLORS).filter(c => 
    c.code !== color.code && hasMinimumContrast(color, c, minContrast)
  );
}
