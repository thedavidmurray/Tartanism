import { useState, useCallback, useRef, useEffect } from 'react';
import { generateBatch, DEFAULT_CONSTRAINTS, generateTartan } from './core/generator';
import { TARTAN_COLORS, getColor, rgbToHex, adjustBrightness } from './core/colors';
import { expandSett, Sett, parseThreadcount } from './core/sett';
import { WEAVE_PATTERNS, getIntersectionColor, WeaveType } from './core/weaves';
import { applyMask, SHAPE_PRESETS, ShapeMaskType, ShapeMaskOptions, createDefaultMaskOptions } from './optical/shapes';
import { GeneratorResult, ThreadStripe } from './core/types';

// ============================================================================
// TYPES
// ============================================================================

interface TartanCardData {
  id: string;
  result: GeneratorResult;
  parentId?: string;
  isOptical?: boolean;
}

interface GeneratorConfig {
  batchSize: number;
  colorMin: number;
  colorMax: number;
  stripeMin: number;
  stripeMax: number;
  threadMin: number;
  threadMax: number;
  totalMin: number;
  totalMax: number;
  threadGauge: number;
  weaveType: WeaveType;
  symmetry: 'symmetric' | 'asymmetric' | 'either';
  opticalMode: boolean;
  shapeMask: ShapeMaskOptions;
  allowedColors: string[];
}

type ViewMode = 'generator' | 'builder';

type TileSize = 'swatch' | 'pocket' | 'tie' | 'scarf' | 'kilt' | 'blanket';

const TILE_SIZES: Record<TileSize, { repeats: number; name: string; inches: string }> = {
  swatch: { repeats: 1, name: 'Swatch', inches: '~6"' },
  pocket: { repeats: 2, name: 'Pocket Square', inches: '~10"' },
  tie: { repeats: 3, name: 'Tie', inches: '~3.5"' },
  scarf: { repeats: 4, name: 'Scarf', inches: '~12"' },
  kilt: { repeats: 6, name: 'Kilt Panel', inches: '~24"' },
  blanket: { repeats: 8, name: 'Blanket', inches: '~48"' },
};

// ============================================================================
// CANVAS RENDERER
// ============================================================================

function renderTartan(
  canvas: HTMLCanvasElement,
  sett: Sett,
  weaveType: WeaveType,
  scale: number = 2,
  repeats: number = 1,
  shapeMask?: ShapeMaskOptions
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const expanded = expandSett(sett);
  const weave = WEAVE_PATTERNS[weaveType];
  const settSize = expanded.length;
  const size = settSize * repeats * scale;

  canvas.width = size;
  canvas.height = size;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const warpIdx = Math.floor(x / scale) % settSize;
      const weftIdx = Math.floor(y / scale) % settSize;

      const pixel = getIntersectionColor(expanded, expanded, weave, warpIdx, weftIdx);
      const colorData = getColor(pixel.color);

      if (!colorData) continue;

      let rgb = { ...colorData.rgb };

      // Apply shape mask if enabled
      if (shapeMask && shapeMask.type !== 'none') {
        const maskPixel = applyMask(x, y, size, size, shapeMask);
        rgb = adjustBrightness(rgb, maskPixel.brightness);
      }

      ctx.fillStyle = rgbToHex(rgb);
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

// ============================================================================
// COMPONENTS
// ============================================================================

function TartanCanvas({
  sett,
  weaveType,
  scale = 2,
  repeats = 1,
  shapeMask,
  onClick,
  className = ''
}: {
  sett: Sett;
  weaveType: WeaveType;
  scale?: number;
  repeats?: number;
  shapeMask?: ShapeMaskOptions;
  onClick?: () => void;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      renderTartan(canvasRef.current, sett, weaveType, scale, repeats, shapeMask);
    }
  }, [sett, weaveType, scale, repeats, shapeMask]);

  return (
    <canvas
      ref={canvasRef}
      className={`${className} ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all' : ''}`}
      onClick={onClick}
    />
  );
}

function ColorChip({ code, small = false }: { code: string; small?: boolean }) {
  const color = getColor(code);
  if (!color) return null;

  return (
    <div
      className={`${small ? 'w-4 h-4' : 'w-6 h-6'} rounded border border-gray-600 flex-shrink-0`}
      style={{ backgroundColor: color.hex }}
      title={`${color.name} (${code})`}
    />
  );
}

function TartanCard({
  data,
  config,
  onMutate,
  onEdit,
  onTiledPreview,
  onCopySeed,
  onDownloadSVG
}: {
  data: TartanCardData;
  config: GeneratorConfig;
  onMutate: (data: TartanCardData) => void;
  onEdit: (data: TartanCardData) => void;
  onTiledPreview: (data: TartanCardData) => void;
  onCopySeed: (seed: number) => void;
  onDownloadSVG: (data: TartanCardData) => void;
}) {
  const { result, isOptical, parentId } = data;
  const { sett, seed } = result;
  const expanded = expandSett(sett);
  const settInches = (expanded.length / config.threadGauge).toFixed(2);

  return (
    <div className="card p-4 space-y-3 animate-fadeIn">
      <div className="flex items-start justify-between">
        <div className="flex flex-wrap gap-1">
          {sett.colors.map(code => <ColorChip key={code} code={code} />)}
        </div>
        <div className="flex gap-1">
          {isOptical && <span className="text-xs px-2 py-0.5 bg-purple-900/50 text-purple-300 rounded-full">Optical</span>}
          {parentId && <span className="text-xs px-2 py-0.5 bg-green-900/50 text-green-300 rounded-full">Mutant</span>}
        </div>
      </div>

      <TartanCanvas
        sett={sett}
        weaveType={config.weaveType}
        scale={2}
        repeats={1}
        shapeMask={isOptical ? config.shapeMask : undefined}
        onClick={() => onTiledPreview(data)}
        className="w-full aspect-square rounded-lg"
      />

      <div
        className="font-mono text-xs text-gray-400 truncate cursor-pointer hover:text-gray-200 transition-colors"
        onClick={() => navigator.clipboard.writeText(sett.threadcount)}
        title="Click to copy threadcount"
      >
        {sett.threadcount}
      </div>

      <div className="flex justify-between text-xs text-gray-500">
        <span>{expanded.length} threads</span>
        <span>{settInches}" sett</span>
        <span>{sett.colors.length} colors</span>
      </div>

      <div className="flex gap-2">
        <button onClick={() => onMutate(data)} className="btn-secondary text-xs flex-1" title="Generate variations">
          Mutate
        </button>
        <button onClick={() => onEdit(data)} className="btn-secondary text-xs flex-1" title="Edit pattern">
          Edit
        </button>
        <button onClick={() => onDownloadSVG(data)} className="btn-secondary text-xs px-2" title="Download SVG">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
        <button onClick={() => onCopySeed(seed)} className="btn-secondary text-xs px-2" title="Copy seed">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function ConfigPanel({
  config,
  onChange,
  onGenerate
}: {
  config: GeneratorConfig;
  onChange: (config: GeneratorConfig) => void;
  onGenerate: () => void;
}) {
  const colorCategories = [
    { name: 'Blues', codes: ['B', 'LB', 'DB', 'AB', 'RB', 'NB'] },
    { name: 'Reds', codes: ['R', 'LR', 'DR', 'CR', 'SC', 'MR'] },
    { name: 'Greens', codes: ['G', 'LG', 'DG', 'HG', 'OG', 'FG', 'TL'] },
    { name: 'Yellows', codes: ['Y', 'LY', 'GD', 'AM', 'ST'] },
    { name: 'Neutrals', codes: ['K', 'W', 'GY', 'LGY', 'DGY', 'CH', 'CW', 'IW'] },
    { name: 'Browns', codes: ['BR', 'LBR', 'DBR', 'TN', 'RU', 'CB'] },
    { name: 'Purples', codes: ['P', 'LP', 'DP', 'VI', 'LV'] },
    { name: 'Oranges', codes: ['O', 'LO', 'DO'] },
    { name: 'Pinks', codes: ['PK', 'LP2', 'DP2'] },
  ];

  const toggleColor = (code: string) => {
    const newColors = config.allowedColors.includes(code)
      ? config.allowedColors.filter(c => c !== code)
      : [...config.allowedColors, code];
    onChange({ ...config, allowedColors: newColors });
  };

  const toggleCategory = (codes: string[]) => {
    const allSelected = codes.every(c => config.allowedColors.includes(c));
    const newColors = allSelected
      ? config.allowedColors.filter(c => !codes.includes(c))
      : [...new Set([...config.allowedColors, ...codes])];
    onChange({ ...config, allowedColors: newColors });
  };

  return (
    <div className="card p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Generator Settings</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Batch Size</label>
            <input
              type="number"
              min="1"
              max="50"
              value={config.batchSize}
              onChange={e => onChange({ ...config, batchSize: Math.min(50, Math.max(1, parseInt(e.target.value) || 1)) })}
              className="input"
            />
          </div>

          <div>
            <label className="label">Thread Gauge (TPI)</label>
            <input
              type="number"
              min="12"
              max="96"
              value={config.threadGauge}
              onChange={e => onChange({ ...config, threadGauge: parseInt(e.target.value) || 24 })}
              className="input"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="label">Colors ({config.colorMin} - {config.colorMax})</label>
        <div className="flex gap-2 items-center">
          <input
            type="range"
            min="2"
            max="8"
            value={config.colorMin}
            onChange={e => onChange({ ...config, colorMin: parseInt(e.target.value) })}
            className="slider flex-1"
          />
          <span className="text-gray-400 w-8 text-center">{config.colorMin}</span>
          <span className="text-gray-500">to</span>
          <input
            type="range"
            min="2"
            max="8"
            value={config.colorMax}
            onChange={e => onChange({ ...config, colorMax: parseInt(e.target.value) })}
            className="slider flex-1"
          />
          <span className="text-gray-400 w-8 text-center">{config.colorMax}</span>
        </div>
      </div>

      <div>
        <label className="label">Stripes ({config.stripeMin} - {config.stripeMax})</label>
        <div className="flex gap-2 items-center">
          <input
            type="range"
            min="3"
            max="16"
            value={config.stripeMin}
            onChange={e => onChange({ ...config, stripeMin: parseInt(e.target.value) })}
            className="slider flex-1"
          />
          <span className="text-gray-400 w-8 text-center">{config.stripeMin}</span>
          <span className="text-gray-500">to</span>
          <input
            type="range"
            min="3"
            max="16"
            value={config.stripeMax}
            onChange={e => onChange({ ...config, stripeMax: parseInt(e.target.value) })}
            className="slider flex-1"
          />
          <span className="text-gray-400 w-8 text-center">{config.stripeMax}</span>
        </div>
      </div>

      <div>
        <label className="label">Thread Width ({config.threadMin} - {config.threadMax})</label>
        <div className="flex gap-2 items-center">
          <input
            type="range"
            min="2"
            max="48"
            step="2"
            value={config.threadMin}
            onChange={e => onChange({ ...config, threadMin: parseInt(e.target.value) })}
            className="slider flex-1"
          />
          <span className="text-gray-400 w-8 text-center">{config.threadMin}</span>
          <span className="text-gray-500">to</span>
          <input
            type="range"
            min="2"
            max="48"
            step="2"
            value={config.threadMax}
            onChange={e => onChange({ ...config, threadMax: parseInt(e.target.value) })}
            className="slider flex-1"
          />
          <span className="text-gray-400 w-8 text-center">{config.threadMax}</span>
        </div>
      </div>

      <div>
        <label className="label">Total Threads ({config.totalMin} - {config.totalMax})</label>
        <div className="flex gap-2 items-center">
          <input
            type="range"
            min="40"
            max="400"
            step="10"
            value={config.totalMin}
            onChange={e => onChange({ ...config, totalMin: parseInt(e.target.value) })}
            className="slider flex-1"
          />
          <span className="text-gray-400 w-12 text-center">{config.totalMin}</span>
          <span className="text-gray-500">to</span>
          <input
            type="range"
            min="40"
            max="400"
            step="10"
            value={config.totalMax}
            onChange={e => onChange({ ...config, totalMax: parseInt(e.target.value) })}
            className="slider flex-1"
          />
          <span className="text-gray-400 w-12 text-center">{config.totalMax}</span>
        </div>
      </div>

      <div>
        <label className="label">Weave Pattern</label>
        <select
          value={config.weaveType}
          onChange={e => onChange({ ...config, weaveType: e.target.value as WeaveType })}
          className="input"
        >
          {Object.entries(WEAVE_PATTERNS).map(([key, pattern]) => (
            <option key={key} value={key}>{pattern.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Symmetry</label>
        <div className="flex gap-2">
          {(['symmetric', 'asymmetric', 'either'] as const).map(sym => (
            <button
              key={sym}
              onClick={() => onChange({ ...config, symmetry: sym })}
              className={`flex-1 py-2 px-3 rounded-lg text-sm transition-all ${
                config.symmetry === sym
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {sym.charAt(0).toUpperCase() + sym.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Optical Illusion Mode</label>
          <button
            onClick={() => onChange({ ...config, opticalMode: !config.opticalMode })}
            className={`w-12 h-6 rounded-full transition-colors ${config.opticalMode ? 'bg-purple-600' : 'bg-gray-700'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${config.opticalMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {config.opticalMode && (
          <div className="mt-3 space-y-3 p-3 bg-purple-900/20 rounded-lg border border-purple-800/30">
            <div>
              <label className="label text-purple-300">Shape Preset</label>
              <select
                value={config.shapeMask.type}
                onChange={e => {
                  const preset = SHAPE_PRESETS[e.target.value as keyof typeof SHAPE_PRESETS];
                  if (preset) {
                    onChange({ ...config, shapeMask: preset });
                  } else {
                    onChange({ ...config, shapeMask: { ...config.shapeMask, type: e.target.value as ShapeMaskType } });
                  }
                }}
                className="input bg-purple-900/30 border-purple-700"
              >
                <option value="none">None</option>
                <option value="cube">Cubes</option>
                <option value="hexagon">Hexagons</option>
                <option value="sphere">Spheres</option>
                <option value="wave">Waves</option>
                <option value="diamond">Diamonds</option>
                <option value="penrose">Penrose</option>
                <option value="escher">Escher Stairs</option>
              </select>
            </div>

            {config.shapeMask.type !== 'none' && (
              <>
                <div>
                  <label className="label text-purple-300">Element Size ({config.shapeMask.elementSize})</label>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={config.shapeMask.elementSize}
                    onChange={e => onChange({
                      ...config,
                      shapeMask: { ...config.shapeMask, elementSize: parseInt(e.target.value) }
                    })}
                    className="slider"
                  />
                </div>
                <div>
                  <label className="label text-purple-300">Depth ({(config.shapeMask.depth * 100).toFixed(0)}%)</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={config.shapeMask.depth * 100}
                    onChange={e => onChange({
                      ...config,
                      shapeMask: { ...config.shapeMask, depth: parseInt(e.target.value) / 100 }
                    })}
                    className="slider"
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="label">Color Palette</label>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
          {colorCategories.map(cat => (
            <div key={cat.name}>
              <button
                onClick={() => toggleCategory(cat.codes)}
                className="text-xs text-gray-400 hover:text-gray-200 mb-1"
              >
                {cat.name}
              </button>
              <div className="flex flex-wrap gap-1">
                {cat.codes.map(code => {
                  const color = getColor(code);
                  if (!color) return null;
                  return (
                    <button
                      key={code}
                      onClick={() => toggleColor(code)}
                      className={`w-6 h-6 rounded border-2 transition-all ${
                        config.allowedColors.includes(code)
                          ? 'border-white scale-110'
                          : 'border-transparent opacity-40'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={onGenerate} className="btn-primary w-full text-lg">
        Roll {config.batchSize} Tartan{config.batchSize > 1 ? 's' : ''}
      </button>
    </div>
  );
}

function PatternBuilder({
  initialSett,
  config,
  onSave,
  onClose
}: {
  initialSett?: Sett;
  config: GeneratorConfig;
  onSave: (sett: Sett) => void;
  onClose: () => void;
}) {
  const [stripes, setStripes] = useState<ThreadStripe[]>(
    initialSett?.stripes || [
      { color: 'B', count: 24, isPivot: true },
      { color: 'W', count: 4 },
      { color: 'B', count: 24 },
      { color: 'R', count: 4 },
      { color: 'G', count: 24, isPivot: true },
    ]
  );
  const [selectedStripe, setSelectedStripe] = useState<number | null>(null);
  const [patternName, setPatternName] = useState(initialSett?.name || '');

  const currentSett = parseThreadcount(stripes.map(s => `${s.color}${s.isPivot ? '/' : ''}${s.count}`).join(' '));

  const addStripe = () => {
    const colors = Object.keys(TARTAN_COLORS);
    const lastColor = stripes[stripes.length - 1]?.color;
    const newColor = colors.find(c => c !== lastColor) || 'B';
    setStripes([...stripes, { color: newColor, count: 8 }]);
  };

  const removeStripe = (index: number) => {
    if (stripes.length <= 2) return;
    setStripes(stripes.filter((_, i) => i !== index));
    setSelectedStripe(null);
  };

  const updateStripe = (index: number, updates: Partial<ThreadStripe>) => {
    setStripes(stripes.map((s, i) => i === index ? { ...s, ...updates } : s));
  };

  const moveStripe = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= stripes.length) return;
    const newStripes = [...stripes];
    [newStripes[index], newStripes[newIndex]] = [newStripes[newIndex], newStripes[index]];
    setStripes(newStripes);
    setSelectedStripe(newIndex);
  };

  const duplicateStripe = (index: number) => {
    const newStripes = [...stripes];
    newStripes.splice(index + 1, 0, { ...stripes[index], isPivot: false });
    setStripes(newStripes);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="card max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Pattern Builder</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="label">Pattern Name</label>
              <input
                type="text"
                value={patternName}
                onChange={e => setPatternName(e.target.value)}
                placeholder="My Custom Tartan"
                className="input"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Stripes</label>
                <button onClick={addStripe} className="btn-secondary text-xs">+ Add Stripe</button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {stripes.map((stripe, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                      selectedStripe === index ? 'bg-indigo-900/30 ring-1 ring-indigo-500' : 'bg-gray-800/50'
                    }`}
                    onClick={() => setSelectedStripe(index)}
                  >
                    <div
                      className="w-8 h-8 rounded border border-gray-600 flex-shrink-0"
                      style={{ backgroundColor: getColor(stripe.color)?.hex }}
                    />

                    <select
                      value={stripe.color}
                      onChange={e => updateStripe(index, { color: e.target.value })}
                      className="input flex-1 py-1 text-sm"
                      onClick={e => e.stopPropagation()}
                    >
                      {Object.entries(TARTAN_COLORS).map(([code, color]) => (
                        <option key={code} value={code}>{color.name} ({code})</option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min="2"
                      max="48"
                      step="2"
                      value={stripe.count}
                      onChange={e => updateStripe(index, { count: Math.max(2, parseInt(e.target.value) || 2) })}
                      className="input w-16 py-1 text-sm text-center"
                      onClick={e => e.stopPropagation()}
                    />

                    <button
                      onClick={e => { e.stopPropagation(); moveStripe(index, -1); }}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); moveStripe(index, 1); }}
                      disabled={index === stripes.length - 1}
                      className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); duplicateStripe(index); }}
                      className="p-1 text-gray-400 hover:text-white"
                    >
                      ⧉
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); removeStripe(index); }}
                      disabled={stripes.length <= 2}
                      className="p-1 text-red-400 hover:text-red-300 disabled:opacity-30"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-sm text-gray-400 space-y-1">
              <div>Total: {currentSett.totalThreads} threads</div>
              <div>Sett size: {(expandSett(currentSett).length / config.threadGauge).toFixed(2)}"</div>
              <div>Colors: {currentSett.colors.length}</div>
            </div>

            <div className="font-mono text-xs text-gray-500 p-2 bg-gray-900 rounded">
              {currentSett.threadcount}
            </div>
          </div>

          <div className="space-y-4">
            <label className="label">Preview</label>
            <TartanCanvas
              sett={currentSett}
              weaveType={config.weaveType}
              scale={3}
              repeats={2}
              className="w-full aspect-square rounded-lg"
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-800 flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={() => {
              const sett = { ...currentSett, name: patternName || undefined };
              onSave(sett);
            }}
            className="btn-primary"
          >
            Save to Collection
          </button>
        </div>
      </div>
    </div>
  );
}

function TiledPreviewModal({
  data,
  config,
  onClose
}: {
  data: TartanCardData;
  config: GeneratorConfig;
  onClose: () => void;
}) {
  const [tileSize, setTileSize] = useState<TileSize>('pocket');
  const { sett } = data.result;
  const expanded = expandSett(sett);
  const settInches = expanded.length / config.threadGauge;
  const tileConfig = TILE_SIZES[tileSize];
  const physicalSize = (settInches * tileConfig.repeats).toFixed(1);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="card max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Tiled Preview</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TILE_SIZES) as TileSize[]).map(size => (
              <button
                key={size}
                onClick={() => setTileSize(size)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  tileSize === size
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {TILE_SIZES[size].name}
              </button>
            ))}
          </div>

          <div className="text-sm text-gray-400">
            {tileConfig.repeats}x{tileConfig.repeats} repeats = ~{physicalSize}" x {physicalSize}"
          </div>

          <div className="overflow-auto">
            <TartanCanvas
              sett={sett}
              weaveType={config.weaveType}
              scale={2}
              repeats={tileConfig.repeats}
              shapeMask={data.isOptical ? config.shapeMask : undefined}
              className="mx-auto rounded-lg"
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-800 flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN APP
// ============================================================================

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('generator');
  const [tartans, setTartans] = useState<TartanCardData[]>([]);
  const [config, setConfig] = useState<GeneratorConfig>({
    batchSize: 6,
    colorMin: 3,
    colorMax: 6,
    stripeMin: 4,
    stripeMax: 12,
    threadMin: 4,
    threadMax: 48,
    totalMin: 60,
    totalMax: 180,
    threadGauge: 24,
    weaveType: 'twill-2-2',
    symmetry: 'symmetric',
    opticalMode: false,
    shapeMask: createDefaultMaskOptions(),
    allowedColors: Object.keys(TARTAN_COLORS),
  });

  const [selectedForBuilder, setSelectedForBuilder] = useState<TartanCardData | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [tiledPreview, setTiledPreview] = useState<TartanCardData | null>(null);

  const handleGenerate = useCallback(() => {
    const results = generateBatch(config.batchSize, {
      colorCount: { min: config.colorMin, max: config.colorMax },
      stripeCount: { min: config.stripeMin, max: config.stripeMax },
      threadCount: { min: config.threadMin, max: config.threadMax },
      totalThreads: { min: config.totalMin, max: config.totalMax },
      symmetry: config.symmetry,
      allowedColors: config.allowedColors.length > 0 ? config.allowedColors : undefined,
    });

    const newTartans: TartanCardData[] = results.map(result => ({
      id: `${result.seed}-${Date.now()}`,
      result,
      isOptical: config.opticalMode,
    }));

    setTartans(prev => [...newTartans, ...prev]);
  }, [config]);

  const handleMutate = useCallback((data: TartanCardData) => {
    const { sett, seed } = data.result;
    const mutations: TartanCardData[] = [];

    for (let i = 0; i < 4; i++) {
      const mutationSeed = seed + i + 1000;
      const result = generateTartan({
        ...DEFAULT_CONSTRAINTS,
        allowedColors: config.allowedColors.length > 0 ? config.allowedColors : undefined,
      }, mutationSeed);

      // Mix in some of the original structure
      const mixedStripes = result.sett.stripes.map((stripe, idx) => {
        if (idx < sett.stripes.length && Math.random() > 0.5) {
          return { ...stripe, color: sett.stripes[idx].color };
        }
        return stripe;
      });

      const mutatedSett = parseThreadcount(mixedStripes.map(s => `${s.color}${s.isPivot ? '/' : ''}${s.count}`).join(' '));

      mutations.push({
        id: `${mutationSeed}-${Date.now()}`,
        result: { ...result, sett: mutatedSett },
        parentId: data.id,
        isOptical: data.isOptical,
      });
    }

    setTartans(prev => [...mutations, ...prev]);
  }, [config.allowedColors]);

  const handleEdit = useCallback((data: TartanCardData) => {
    setSelectedForBuilder(data);
    setShowBuilder(true);
  }, []);

  const handleSavePattern = useCallback((sett: Sett) => {
    const result = generateTartan({}, Date.now());
    const newCard: TartanCardData = {
      id: `custom-${Date.now()}`,
      result: { ...result, sett },
      isOptical: config.opticalMode,
    };
    setTartans(prev => [newCard, ...prev]);
    setShowBuilder(false);
    setSelectedForBuilder(null);
  }, [config.opticalMode]);

  const handleDownloadSVG = useCallback((data: TartanCardData) => {
    const { sett } = data.result;
    const expanded = expandSett(sett);
    const weave = WEAVE_PATTERNS[config.weaveType];
    const scale = 4;
    const size = expanded.length * scale;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;

    for (let y = 0; y < expanded.length; y++) {
      for (let x = 0; x < expanded.length; x++) {
        const pixel = getIntersectionColor(expanded, expanded, weave, x, y);
        const color = getColor(pixel.color);
        if (color) {
          svg += `<rect x="${x * scale}" y="${y * scale}" width="${scale}" height="${scale}" fill="${color.hex}"/>`;
        }
      }
    }

    svg += '</svg>';

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tartan-${data.result.seed}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [config.weaveType]);

  const handleCopySeed = useCallback((seed: number) => {
    navigator.clipboard.writeText(seed.toString());
  }, []);

  const handleExportCSV = useCallback(() => {
    const headers = ['id', 'seed', 'threadcount', 'colors', 'totalThreads', 'colorCount', 'isOptical'];
    const rows = tartans.map(t => [
      t.id,
      t.result.seed,
      `"${t.result.sett.threadcount}"`,
      `"${t.result.sett.colors.join(',')}"`,
      t.result.sett.totalThreads,
      t.result.sett.colors.length,
      t.isOptical ? 'true' : 'false',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tartans-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [tartans]);

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
              <span className="text-xl font-bold">T</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gradient">Tartanism</h1>
              <p className="text-xs text-gray-500">The best plaid maker</p>
            </div>
          </div>

          <nav className="flex items-center gap-4">
            <button
              onClick={() => setViewMode('generator')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'generator' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Generator
            </button>
            <button
              onClick={() => { setShowBuilder(true); setSelectedForBuilder(null); }}
              className="px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              Builder
            </button>
            {tartans.length > 0 && (
              <button onClick={handleExportCSV} className="btn-secondary text-sm">
                Export CSV
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[320px_1fr] gap-8">
          {/* Config Panel */}
          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <ConfigPanel config={config} onChange={setConfig} onGenerate={handleGenerate} />
          </aside>

          {/* Results Grid */}
          <section>
            {tartans.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🏴󠁧󠁢󠁳󠁣󠁴󠁿</div>
                <h2 className="text-2xl font-semibold text-gray-300 mb-2">Ready to design tartans?</h2>
                <p className="text-gray-500 mb-6">Configure your constraints and roll to generate mathematically valid patterns.</p>
                <button onClick={handleGenerate} className="btn-primary">
                  Roll Your First Tartan
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {tartans.map(data => (
                  <TartanCard
                    key={data.id}
                    data={data}
                    config={config}
                    onMutate={handleMutate}
                    onEdit={handleEdit}
                    onTiledPreview={setTiledPreview}
                    onCopySeed={handleCopySeed}
                    onDownloadSVG={handleDownloadSVG}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>Create mathematically valid tartans following Scottish Register conventions.</p>
          <p className="mt-2">Built for the love of plaid.</p>
        </div>
      </footer>

      {/* Modals */}
      {showBuilder && (
        <PatternBuilder
          initialSett={selectedForBuilder?.result.sett}
          config={config}
          onSave={handleSavePattern}
          onClose={() => { setShowBuilder(false); setSelectedForBuilder(null); }}
        />
      )}

      {tiledPreview && (
        <TiledPreviewModal
          data={tiledPreview}
          config={config}
          onClose={() => setTiledPreview(null)}
        />
      )}
    </div>
  );
}
