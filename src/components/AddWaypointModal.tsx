/**
 * Waypoint Creation Modal
 * Allows outdoor users to log Points of Interest (POIs), water sources,
 * viewpoints, camp sites, or hazards with offline coordinates.
 */

import React, { useState } from 'react';
import { WaypointCategory, CurrentPositionState } from '../types/gps';
import { X, Droplet, Mountain, Tent, AlertTriangle, Home, Camera, Coffee, Flag } from 'lucide-react';

interface AddWaypointModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, category: WaypointCategory, notes: string) => void;
  currentPosition: CurrentPositionState | null;
}

const CATEGORIES: Array<{ id: WaypointCategory; label: string; icon: any; color: string }> = [
  { id: 'water', label: 'Agua / Fuente', icon: Droplet, color: 'text-sky-400 border-sky-500/40 bg-sky-950/40' },
  { id: 'summit', label: 'Cumbre / Cima', icon: Mountain, color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40' },
  { id: 'camp', label: 'Campamento', icon: Tent, color: 'text-amber-400 border-amber-500/40 bg-amber-950/40' },
  { id: 'danger', label: 'Peligro / Paso', icon: AlertTriangle, color: 'text-rose-400 border-rose-500/40 bg-rose-950/40' },
  { id: 'shelter', label: 'Refugio', icon: Home, color: 'text-indigo-400 border-indigo-500/40 bg-indigo-950/40' },
  { id: 'photo', label: 'Mirador / Foto', icon: Camera, color: 'text-purple-400 border-purple-500/40 bg-purple-950/40' },
  { id: 'rest', label: 'Descanso', icon: Coffee, color: 'text-orange-400 border-orange-500/40 bg-orange-950/40' },
  { id: 'milestone', label: 'Hito de Ruta', icon: Flag, color: 'text-teal-400 border-teal-500/40 bg-teal-950/40' },
];

export const AddWaypointModal: React.FC<AddWaypointModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentPosition,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<WaypointCategory>('water');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(title || 'Hito de Ruta', category, notes);
    setTitle('');
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-100">Registrar Punto de Interés</h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {currentPosition ? `${currentPosition.lat.toFixed(5)}°, ${currentPosition.lng.toFixed(5)}°` : 'Sin coordenadas'}
              {currentPosition?.altitude ? ` · ${Math.round(currentPosition.altitude)}m alt` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Nombre del hito
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Manantial de agua fresca, Collado norte..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Categoría
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition text-left cursor-pointer ${
                      isSelected
                        ? `${cat.color} border-current ring-1 ring-current`
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Notas u observaciones (Opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Caudal abundante, sendero resbaladizo con lluvia, etc."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-950/40 transition cursor-pointer"
            >
              Guardar Hito
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
