import React from 'react';

interface AxisMetric {
  label: string;
  value: number; // 0-100
  description?: string;
  tier: 'excellent' | 'good' | 'improve';
}

interface RadarChartProps {
  metrics: AxisMetric[]; // length 6
  size?: number;
}

const tierColors: Record<AxisMetric['tier'], string> = {
  excellent: '#16a34a', // green-600
  good: '#ca8a04',      // yellow-600
  improve: '#dc2626',   // red-600
};

export const RadarChart: React.FC<RadarChartProps> = ({ metrics, size = 300 }) => {
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size / 2) * 0.8;
  const angleStep = (Math.PI * 2) / metrics.length;

  function polarPoint(idx: number, valuePct: number) {
    const angle = -Math.PI / 2 + idx * angleStep; // start top
    const r = radius * (valuePct / 100);
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  }

  const polygonPoints = metrics
    .map((m, i) => {
      const { x, y } = polarPoint(i, m.value);
      return `${x},${y}`;
    })
    .join(' ');

  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <div className="relative w-full flex flex-col items-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Grid */}
        {gridLevels.map((lvl) => {
          const pts = metrics
            .map((_, i) => {
              const { x, y } = polarPoint(i, lvl * 100);
              return `${x},${y}`;
            })
            .join(' ');
          return (
            <polygon
              key={lvl}
              points={pts}
              fill={lvl === 1 ? '#f8fafc' : 'none'}
              stroke="#e2e8f0"
              strokeWidth={1}
              className="transition-colors"
              fillOpacity={lvl === 1 ? 1 : 0}
            />
          );
        })}

        {/* Spokes */}
        {metrics.map((_, i) => {
          const { x, y } = polarPoint(i, 100);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
          );
        })}

        {/* Data area */}
        <polygon
          points={polygonPoints}
          fill="url(#radarFill)"
          stroke="#334155"
          strokeWidth={1.5}
          className="drop-shadow-sm"
        />
        <defs>
          <linearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.25} />
          </linearGradient>
        </defs>

        {/* Points */}
        {metrics.map((m, i) => {
          const { x, y } = polarPoint(i, m.value);
          return (
            <g key={m.label}>
              <circle r={5} cx={x} cy={y} fill={tierColors[m.tier]} stroke="#fff" strokeWidth={2} />
              <title>{`${m.label}: ${m.value} | ${m.description || ''}`}</title>
            </g>
          );
        })}

        {/* Labels */}
        {metrics.map((m, i) => {
          const { x, y } = polarPoint(i, 108); // outside radius
          return (
            <text
              key={m.label}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-gray-700 font-medium text-[11px]"
            >
              {m.label}
              <title>{m.description || ''}</title>
            </text>
          );
        })}
      </svg>
    </div>
  );
};

export default RadarChart;
