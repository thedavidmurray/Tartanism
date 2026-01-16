/**
 * Tartan System - Yarn Calculator Module
 * Calculate yarn requirements for production planning
 */

import { 
  Sett, 
  YarnWeight, 
  YarnProfile, 
  ProductDimensions, 
  ProductTemplate,
  YarnRequirement,
  MaterialsCalculation 
} from './types';
import { expandSett } from './sett';
import { getColor } from './colors';

// ============================================================================
// YARN PROFILES
// ============================================================================

export const YARN_PROFILES: Record<YarnWeight, YarnProfile> = {
  'lace': {
    weightClass: 'lace',
    wpi: 35,
    yardsPer100g: 800,
    typicalGauge: 32,
  },
  'fingering': {
    weightClass: 'fingering',
    wpi: 28,
    yardsPer100g: 400,
    typicalGauge: 28,
  },
  'sport': {
    weightClass: 'sport',
    wpi: 22,
    yardsPer100g: 300,
    typicalGauge: 24,
  },
  'dk': {
    weightClass: 'dk',
    wpi: 18,
    yardsPer100g: 230,
    typicalGauge: 22,
  },
  'worsted': {
    weightClass: 'worsted',
    wpi: 14,
    yardsPer100g: 200,
    typicalGauge: 18,
  },
  'aran': {
    weightClass: 'aran',
    wpi: 12,
    yardsPer100g: 170,
    typicalGauge: 16,
  },
  'bulky': {
    weightClass: 'bulky',
    wpi: 9,
    yardsPer100g: 125,
    typicalGauge: 12,
  },
  'super-bulky': {
    weightClass: 'super-bulky',
    wpi: 6,
    yardsPer100g: 85,
    typicalGauge: 8,
  },
};

/**
 * Get yarn profile by weight class
 */
export function getYarnProfile(weight: YarnWeight): YarnProfile {
  return YARN_PROFILES[weight];
}

// ============================================================================
// PRODUCT TEMPLATES
// ============================================================================

export const PRODUCT_TEMPLATES: Record<string, ProductTemplate> = {
  'scarf-narrow': {
    name: 'Narrow Scarf',
    description: 'Lightweight accessory scarf',
    dimensions: { width: 6, length: 60, unit: 'inch' },
    recommendedYarnWeight: 'fingering',
    recommendedGauge: 28,
  },
  'scarf-wide': {
    name: 'Wide Scarf',
    description: 'Standard winter scarf',
    dimensions: { width: 10, length: 72, unit: 'inch' },
    recommendedYarnWeight: 'dk',
    recommendedGauge: 20,
  },
  'blanket-throw': {
    name: 'Throw Blanket',
    description: 'Lap blanket / throw',
    dimensions: { width: 50, length: 60, unit: 'inch' },
    recommendedYarnWeight: 'worsted',
    recommendedGauge: 16,
  },
  'blanket-full': {
    name: 'Full Blanket',
    description: 'Full-size bed blanket',
    dimensions: { width: 60, length: 80, unit: 'inch' },
    recommendedYarnWeight: 'aran',
    recommendedGauge: 14,
  },
  'pillow': {
    name: 'Throw Pillow',
    description: '18" square pillow cover',
    dimensions: { width: 18, length: 18, unit: 'inch' },
    recommendedYarnWeight: 'sport',
    recommendedGauge: 18,
  },
  'table-runner': {
    name: 'Table Runner',
    description: 'Dining table centerpiece',
    dimensions: { width: 12, length: 72, unit: 'inch' },
    recommendedYarnWeight: 'fingering',
    recommendedGauge: 24,
  },
  'placemat': {
    name: 'Placemat',
    description: 'Standard placemat',
    dimensions: { width: 12, length: 18, unit: 'inch' },
    recommendedYarnWeight: 'dk',
    recommendedGauge: 18,
  },
  'kilt-yardage': {
    name: 'Kilt Yardage',
    description: '8-yard kilt (traditional)',
    dimensions: { width: 54, length: 288, unit: 'inch' },
    recommendedYarnWeight: 'worsted',
    recommendedGauge: 48,
  },
  'sash': {
    name: 'Sash / Fly Plaid',
    description: 'Shoulder sash',
    dimensions: { width: 12, length: 108, unit: 'inch' },
    recommendedYarnWeight: 'worsted',
    recommendedGauge: 48,
  },
  'fabric-yard': {
    name: 'Fabric (per yard)',
    description: '54" wide fabric yardage',
    dimensions: { width: 54, length: 36, unit: 'inch' },
    recommendedYarnWeight: 'worsted',
    recommendedGauge: 48,
  },
};

/**
 * Get product template by key
 */
export function getProductTemplate(key: string): ProductTemplate | undefined {
  return PRODUCT_TEMPLATES[key];
}

/**
 * List all product templates
 */
export function listProductTemplates(): Array<{ key: string; template: ProductTemplate }> {
  return Object.entries(PRODUCT_TEMPLATES).map(([key, template]) => ({
    key,
    template,
  }));
}

// ============================================================================
// YARN CALCULATION
// ============================================================================

export interface CalculationOptions {
  /** Threads per inch (or per cm if metric) */
  gauge: number;
  /** Additional waste/loom allowance (1.1 = 10% extra) */
  wasteMultiplier?: number;
  /** Skein size in yards (for calculating skein count) */
  skeinYards?: number;
}

/**
 * Calculate yarn requirements for a sett at given dimensions
 */
export function calculateYarnRequirements(
  sett: Sett,
  dimensions: ProductDimensions,
  yarnWeight: YarnWeight,
  options: CalculationOptions
): MaterialsCalculation {
  const { gauge, wasteMultiplier = 1.15, skeinYards = 220 } = options;
  const profile = getYarnProfile(yarnWeight);
  
  // Convert dimensions to inches if necessary
  const width = dimensions.unit === 'cm' ? dimensions.width / 2.54 : dimensions.width;
  const length = dimensions.unit === 'cm' ? dimensions.length / 2.54 : dimensions.length;
  
  // Calculate total threads needed
  const warpThreadCount = Math.ceil(width * gauge);
  const weftThreadCount = Math.ceil(length * gauge);
  
  // Expand sett to get color distribution
  const expanded = expandSett(sett);
  const totalInSett = expanded.length;
  
  // Calculate yarn per color
  const requirements: YarnRequirement[] = [];
  
  for (const colorCode of sett.colors) {
    const colorInfo = getColor(colorCode);
    const threadsOfColor = expanded.distribution[colorCode] || 0;
    const proportion = threadsOfColor / totalInSett;
    
    // Warp calculation: each thread runs the full length
    // Plus loom waste (typically 18-24 inches)
    const loomWaste = 20; // inches
    const warpYardsPerThread = (length + loomWaste) / 36; // convert to yards
    const warpThreadsOfColor = Math.ceil(warpThreadCount * proportion);
    const warpYards = warpThreadsOfColor * warpYardsPerThread;
    
    // Weft calculation: each thread runs the full width
    // Plus shuttle/beating waste
    const weftYardsPerThread = (width + 2) / 36; // slight extra per pick
    const weftThreadsOfColor = Math.ceil(weftThreadCount * proportion);
    const weftYards = weftThreadsOfColor * weftYardsPerThread;
    
    // Total with waste multiplier
    const totalYards = Math.ceil((warpYards + weftYards) * wasteMultiplier);
    
    // Convert to weight
    const weightGrams = Math.ceil((totalYards / profile.yardsPer100g) * 100);
    
    // Calculate skeins needed
    const skeins = Math.ceil(totalYards / skeinYards);
    
    requirements.push({
      color: colorCode,
      colorName: colorInfo?.name || colorCode,
      hex: colorInfo?.hex || '#888888',
      warpYards: Math.ceil(warpYards),
      weftYards: Math.ceil(weftYards),
      totalYards,
      weightGrams,
      skeins,
    });
  }
  
  // Calculate totals
  const totalYards = requirements.reduce((sum, r) => sum + r.totalYards, 0);
  const totalWeight = requirements.reduce((sum, r) => sum + r.weightGrams, 0);
  const totalSkeins = requirements.reduce((sum, r) => sum + r.skeins, 0);
  
  return {
    sett,
    dimensions,
    yarnProfile: profile,
    gauge,
    wasteMultiplier,
    requirements,
    totalYards,
    totalWeight,
    totalSkeins,
  };
}

/**
 * Calculate for a product template
 */
export function calculateForProduct(
  sett: Sett,
  templateKey: string,
  options?: Partial<CalculationOptions>
): MaterialsCalculation {
  const template = getProductTemplate(templateKey);
  if (!template) {
    throw new Error(`Unknown product template: ${templateKey}`);
  }
  
  const gauge = options?.gauge || template.recommendedGauge;
  
  return calculateYarnRequirements(
    sett,
    template.dimensions,
    template.recommendedYarnWeight,
    { gauge, ...options }
  );
}

// ============================================================================
// FORMATTING
// ============================================================================

/**
 * Format a materials calculation for display
 */
export function formatMaterialsSummary(calc: MaterialsCalculation): string {
  const lines: string[] = [
    `Yarn Requirements for ${calc.dimensions.width}${calc.dimensions.unit} × ${calc.dimensions.length}${calc.dimensions.unit}`,
    `Yarn Weight: ${calc.yarnProfile.weightClass}`,
    `Gauge: ${calc.gauge} threads per inch`,
    `Waste Allowance: ${Math.round((calc.wasteMultiplier - 1) * 100)}%`,
    '',
    'By Color:',
    ...calc.requirements.map(r => 
      `  ${r.colorName} (${r.color}): ${r.totalYards} yards (${r.skeins} skeins, ${r.weightGrams}g)`
    ),
    '',
    `Total: ${calc.totalYards} yards / ${calc.totalSkeins} skeins / ${calc.totalWeight}g`
  ];
  
  return lines.join('\n');
}

/**
 * Export materials calculation as CSV
 */
export function exportMaterialsCSV(calc: MaterialsCalculation): string {
  const headers = ['Color Code', 'Color Name', 'Hex', 'Warp Yards', 'Weft Yards', 'Total Yards', 'Weight (g)', 'Skeins'];
  const rows = calc.requirements.map(r => [
    r.color,
    r.colorName,
    r.hex,
    r.warpYards,
    r.weftYards,
    r.totalYards,
    r.weightGrams,
    r.skeins
  ]);
  
  return [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');
}

/**
 * Export materials calculation as JSON
 */
export function exportMaterialsJSON(calc: MaterialsCalculation): string {
  return JSON.stringify({
    sett: {
      name: calc.sett.name,
      threadcount: calc.sett.threadcount,
      colors: calc.sett.colors,
    },
    dimensions: calc.dimensions,
    yarnProfile: calc.yarnProfile,
    gauge: calc.gauge,
    requirements: calc.requirements,
    totals: {
      yards: calc.totalYards,
      grams: calc.totalWeight,
      skeins: calc.totalSkeins,
    },
  }, null, 2);
}

// ============================================================================
// COST ESTIMATION
// ============================================================================

export interface CostEstimate {
  /** Cost per skein */
  skeinCost: number;
  /** Currency */
  currency: string;
  /** Cost by color */
  colorCosts: Array<{ color: string; cost: number }>;
  /** Total yarn cost */
  totalYarnCost: number;
}

/**
 * Estimate yarn costs
 */
export function estimateCost(
  calc: MaterialsCalculation,
  costPerSkein: number,
  currency: string = 'USD'
): CostEstimate {
  const colorCosts = calc.requirements.map(r => ({
    color: r.colorName,
    cost: r.skeins * costPerSkein,
  }));
  
  const totalYarnCost = colorCosts.reduce((sum, c) => sum + c.cost, 0);
  
  return {
    skeinCost: costPerSkein,
    currency,
    colorCosts,
    totalYarnCost,
  };
}
