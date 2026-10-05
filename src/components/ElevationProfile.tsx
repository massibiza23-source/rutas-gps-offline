/**
 * Interactive Elevation Profile Component
 * Renders cross-section terrain graph with distance vs altitude,
 * elevation gain/loss metrics, and interactive scrubber sync with the map.
 */

import React, { useRef, useState } from 'react';
import { TrackPoint } from '../types/gps';
import { ArrowDownRight, ArrowUpRight, Mountain, TrendingUp } from 'lucide-react';
import { formatDistance } from '../utils/geoUtils';

interface ElevationProfileProps {
  trackPoints: TrackPoint[];
  elevationGain: number;
  elevationLoss: number;
  currentAltitude: number | null;
  onHoverPoint?: (pointIndex: number | null) => void;
}

export const ElevationProfile: React.FC<ElevationProfileProps> = ({
  trackPoints,
  elevationGain,
  elevationLoss,
  currentAltitude,
  onHoverPoint,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Filter valid points with altitude
  const validPoints = trackPoints.filter((p) => p.altitude !== null);

  if (validPoints.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-slate-400 bg-slate-900/60 rounded-2xl border border-slate-800 text-center">
        <Mountain className="w-8 h-8 mb-2 text-slate-500 opacity-60" />
        <span className="text-sm font-medium">Perfil Altimétrico</span>
        <span className="text-xs text-slate-500 mt-1">
          Se requieren al menos 2 puntos de GPS para trazar el perfil de elevación.
        </span>
      </div>
    );
  }

  // Calculate altitude and distance ranges
  const altitudes = validPoints.map((p) => p.altitude as number);
  const minEle = Math.floor(Math.min(...altitudes));
  const maxEle = Math.ceil(Math.max(...altitudes));
  const eleSpan = Math.max(15, maxEle - minEle); // minimum 15m span for graph breathing room

  const totalDistance = validPoints[validPoints.length - 1].distanceFromStart;

  // SVG dimensions
  const svgWidth = 800;
  const svgHeight = 160;
  const paddingX = 40;
  const paddingY = 24;

  const graphWidth = svgWidth - paddingX * 2;
  const graphHeight = svgHeight - paddingY * 2;

  // Build SVG polygon points
  const coords = validPoints.map((p, index) => {
    const xRatio = totalDistance > 0 ? p.distanceFromStart / totalDistance : index / (validPoints.length - 1);
    const yRatio = (p.altitude! - minEle) / eleSpan;

    const x = paddingX + xRatio * graphWidth;
    const y = svgHeight - paddingY - yRatio * graphHeight;
    return { x, y, point: p, index };
  });

  const pathD = coords.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  const areaD = `${pathD} L ${coords[coords.length - 1].x} ${svgHeight - paddingY} L ${coords[0].x} ${svgHeight - paddingY} Z`;

  // Scrubber mouse/touch move
  const handleInteraction = (clientX: number) => {
    if (!containerRef.current || coords.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, (relativeX - (paddingX / svgWidth) * rect.width) / ((graphWidth / svgWidth) * rect.width)));

    const targetDistance = ratio * totalDistance;
    let closestIndex = 0;
    let minDiff = Infinity;

    for (let i = 0; i < validPoints.length; i++) {
      const diff = Math.abs(validPoints[i].distanceFromStart - targetDistance);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }

    setHoverIndex(closestIndex);
    if (onHoverPoint) {
      onHoverPoint(closestIndex);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => handleInteraction(e.clientX);
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) handleInteraction(e.touches[0].clientX);
  };

  const handleLeave = () => {
    setHoverIndex(null);
    if (onHoverPoint) onHoverPoint(null);
  };

  const hoveredCoord = hoverIndex !== null && coords[hoverIndex] ? coords[hoverIndex] : null;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md">
      {/* Top metrics header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-800 text-xs font-mono">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
            Perfil de Elevación
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span className="text-slate-400">+{elevationGain} m</span>
          </div>

          <div className="flex items-center gap-1.5 text-rose-400">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span className="text-slate-400">-{elevationLoss} m</span>
          </div>

          <div className="flex items-center gap-1.5 text-sky-400">
            <span className="text-slate-400 font-sans">Actual:</span>
            <span>{currentAltitude !== null ? `${Math.round(currentAltitude)} m` : '--'}</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas Chart */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden cursor-crosshair touch-none"
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        onMouseLeave={handleLeave}
      >
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-36 overflow-visible">
          <defs>
            <linearGradient id="elevationGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#059669" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={svgWidth - paddingX}
            y2={paddingY}
            stroke="#334155"
            strokeDasharray="4 4"
            strokeWidth="0.8"
          />
          <line
            x1={paddingX}
            y1={svgHeight - paddingY}
            x2={svgWidth - paddingX}
            y2={svgHeight - paddingY}
            stroke="#334155"
            strokeWidth="1"
          />

          {/* Min/Max Y labels */}
          <text
            x={paddingX - 6}
            y={paddingY + 4}
            fill="#94a3b8"
            fontSize="10"
            textAnchor="end"
            fontFamily="monospace"
          >
            {maxEle}m
          </text>
          <text
            x={paddingX - 6}
            y={svgHeight - paddingY + 3}
            fill="#94a3b8"
            fontSize="10"
            textAnchor="end"
            fontFamily="monospace"
          >
            {minEle}m
          </text>

          {/* Distance X labels */}
          <text
            x={paddingX}
            y={svgHeight - 6}
            fill="#64748b"
            fontSize="9"
            fontFamily="monospace"
          >
            0 km
          </text>
          <text
            x={svgWidth - paddingX}
            y={svgHeight - 6}
            fill="#64748b"
            fontSize="9"
            textAnchor="end"
            fontFamily="monospace"
          >
            {formatDistance(totalDistance)}
          </text>

          {/* Area under curve */}
          <path d={areaD} fill="url(#elevationGrad)" />

          {/* Polyline curve */}
          <path
            d={pathD}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Scrubber vertical line & point */}
          {hoveredCoord && (
            <g>
              <line
                x1={hoveredCoord.x}
                y1={paddingY}
                x2={hoveredCoord.x}
                y2={svgHeight - paddingY}
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <circle
                cx={hoveredCoord.x}
                cy={hoveredCoord.y}
                r="5"
                fill="#f59e0b"
                stroke="#ffffff"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* Hover Floating Tooltip */}
        {hoveredCoord && (
          <div
            className="absolute top-2 pointer-events-none -translate-x-1/2 bg-slate-950/95 border border-amber-500/50 rounded-lg px-2.5 py-1 text-[11px] font-mono text-amber-300 shadow-xl"
            style={{ left: `${(hoveredCoord.x / svgWidth) * 100}%` }}
          >
            <span className="font-bold">{Math.round(hoveredCoord.point.altitude || 0)} m</span> ·{' '}
            <span className="text-slate-400">{formatDistance(hoveredCoord.point.distanceFromStart)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
