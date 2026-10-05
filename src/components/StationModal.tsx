/**
 * Station Registration Modal
 * Adds subterranean survey stations with 3D passage dimensions (LRUD),
 * feature classification, and sensor readings.
 */

import React, { useState } from 'react';
import { CaveFeatureType, CaveStation, SensorTelemetry } from '../types/speleo';
import {
  X,
  PlusCircle,
  Mountain,
  Anchor,
  Droplet,
  Tent,
  AlertTriangle,
  Flame,
  ArrowDown,
  Box,
} from 'lucide-react';

interface StationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (station: Partial<CaveStation>) => void;
  telemetry: SensorTelemetry;
  stationCount: number;
}

const FEATURE_TYPES: Array<{
  id: CaveFeatureType;
  label: string;
  icon: any;
  color: string;
  desc: string;
}> = [
  { id: 'pitch', label: 'Pozo Vertical (P)', icon: ArrowDown, color: 'text-rose-400 border-rose-500/50 bg-rose-950/40', desc: 'Descenso con cuerda' },
  { id: 'chamber', label: 'Sala / Caverna', icon: Box, color: 'text-sky-400 border-sky-500/50 bg-sky-950/40', desc: 'Gran galería espaciosa' },
  { id: 'crawl', label: 'Gatera / Paso Estrecho', icon: AlertTriangle, color: 'text-amber-400 border-amber-500/50 bg-amber-950/40', desc: 'Avance reptando' },
  { id: 'siphon', label: 'Sifón Inundado', icon: Droplet, color: 'text-cyan-400 border-cyan-500/50 bg-cyan-950/40', desc: 'Paso con agua continua' },
  { id: 'anchor', label: 'Cabecera de Anclaje', icon: Anchor, color: 'text-teal-400 border-teal-500/50 bg-teal-950/40', desc: 'Spits / parabolts' },
  { id: 'bivouac', label: 'Zona Vivac / Descanso', icon: Tent, color: 'text-emerald-400 border-emerald-500/50 bg-emerald-950/40', desc: 'Refugio subterráneo' },
  { id: 'active_front', label: 'Frente de Avance', icon: Flame, color: 'text-purple-400 border-purple-500/50 bg-purple-950/40', desc: 'Límite de exploración' },
];

export const StationModal: React.FC<StationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  telemetry,
  stationCount,
}) => {
  const [name, setName] = useState(`E${stationCount} - Nueva Estación`);
  const [type, setType] = useState<CaveFeatureType>('chamber');
  const [width, setWidth] = useState(4.0);
  const [height, setHeight] = useState(3.5);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: name.trim() || `E${stationCount}`,
      type,
      width: Number(width),
      height: Number(height),
      notes: notes.trim(),
      z: telemetry.currentDepthMeters,
      pressureHpa: telemetry.currentPressureHpa,
      temperatureC: telemetry.temperatureC,
      azimuthDeg: telemetry.azimuthDeg,
      inclinationDeg: telemetry.pitchDeg,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="w-full max-w-lg bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-black text-slate-100 uppercase tracking-wider">
              Registrar Estación Topográfica
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Profundidad calculada: <strong className="text-rose-400">{telemetry.currentDepthMeters.toFixed(1)} m</strong> · Rumbo: {Math.round(telemetry.azimuthDeg)}°
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Identificador / Nombre de la Estación
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border-2 border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-100 font-bold focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Tipo de Morfología Subterránea
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FEATURE_TYPES.map((ft) => {
                const Icon = ft.icon;
                const isSelected = type === ft.id;
                return (
                  <button
                    key={ft.id}
                    type="button"
                    onClick={() => setType(ft.id)}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border-2 text-left transition cursor-pointer ${
                      isSelected
                        ? `${ft.color} ring-2 ring-current`
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">{ft.label}</div>
                      <div className="text-[10px] opacity-60">{ft.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Passage Dimensions (LRUD) */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Anchura Galería (m)
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="80"
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-slate-100 font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Altura Techo (m)
              </label>
              <input
                type="number"
                step="0.5"
                min="0.4"
                max="100"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-slate-100 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Observaciones técnicas / Instalación de cuerdas
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instalación con cuerda semiestática 9mm, desvío natural sobre puente de roca..."
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-2xl text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-950/60 transition cursor-pointer border-2 border-emerald-400"
            >
              Guardar en Topografía 3D
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
