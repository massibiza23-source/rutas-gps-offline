/**
 * Settings & Battery Optimization Modal
 * Configures GPS sampling frequency, accuracy gates, WakeLock, and display modes.
 */

import React from 'react';
import { BatteryProfile, TrackerSettings } from '../types/gps';
import {
  X,
  Battery,
  Sliders,
  Shield,
  Volume2,
  Sun,
  Eye,
  Zap,
  Info,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TrackerSettings;
  onUpdateSettings: (settings: Partial<TrackerSettings>) => void;
  batteryInfo: { level: number | null; charging: boolean | null };
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  batteryInfo,
}) => {
  if (!isOpen) return null;

  const batteryProfiles: Array<{
    id: BatteryProfile;
    title: string;
    description: string;
    sampleRate: string;
    distanceFilter: string;
    bestFor: string;
  }> = [
    {
      id: 'high_precision',
      title: 'Alta Precisión',
      description: 'Muestreo continuo para máxima fidelidad en curvas y cambios de ritmo.',
      sampleRate: 'Cada 2 - 3 segundos',
      distanceFilter: 'Movimiento > 2 metros',
      bestFor: 'Trail running, MTB y descensos técnicos.',
    },
    {
      id: 'balanced',
      title: 'Senderismo Equilibrado (Recomendado)',
      description: 'Muestreo inteligente con ahorro adaptativo de energía de la CPU.',
      sampleRate: 'Cada 5 - 8 segundos',
      distanceFilter: 'Movimiento > 5 metros',
      bestFor: 'Caminatas de 4 a 8 horas con excelente detalle.',
    },
    {
      id: 'battery_saver',
      title: 'Ultra Trek / Ahorro Máximo',
      description: 'Reduce drásticamente el consumo de batería y la carga de cálculo.',
      sampleRate: 'Cada 20 - 30 segundos',
      distanceFilter: 'Movimiento > 15 metros',
      bestFor: 'Expediciones de varios días y travesías largas.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-950/60 border border-sky-500/30 text-sky-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Configuración & Eficiencia</h3>
              <p className="text-xs text-slate-400">Optimización de GPS y batería para campo</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Battery Diagnostic Banner */}
        {batteryInfo.level !== null && (
          <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Battery className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  Batería del Dispositivo: {batteryInfo.level}% {batteryInfo.charging ? '(Cargando)' : ''}
                </div>
                <div className="text-[11px] text-slate-400">
                  Sensor de batería del sistema operativo activo
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 1: Battery & Sampling Profile */}
        <div className="mt-5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Perfil de Muestreo GPS (Consumo de Batería)
          </label>
          <div className="space-y-2.5">
            {batteryProfiles.map((p) => {
              const isSelected = settings.batteryProfile === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => onUpdateSettings({ batteryProfile: p.id })}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    isSelected
                      ? 'bg-sky-950/40 border-sky-500/70 ring-1 ring-sky-500/40'
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-100">{p.title}</span>
                    <span
                      className={`w-3.5 h-3.5 rounded-full border-2 transition ${
                        isSelected ? 'border-sky-400 bg-sky-400' : 'border-slate-600'
                      }`}
                    />
                  </div>

                  <p className="text-xs text-slate-300 mt-1">{p.description}</p>

                  <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-400 font-mono">
                    <span className="text-sky-300">⏱ {p.sampleRate}</span>
                    <span>📍 {p.distanceFilter}</span>
                  </div>

                  <div className="text-[11px] text-emerald-400/90 mt-1 font-medium">
                    Ideal para: {p.bestFor}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Hardware & Accuracy Filters */}
        <div className="mt-5 space-y-3.5 border-t border-slate-800 pt-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Filtros de Precisión & Pantalla
          </label>

          {/* Accuracy Filter */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-medium text-slate-200">
                  Filtro de precisión mínima (Descartar salto falso)
                </span>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                ≤ {settings.minAccuracyFilter} m
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={60}
              step={5}
              value={settings.minAccuracyFilter}
              onChange={(e) => onUpdateSettings({ minAccuracyFilter: Number(e.target.value) })}
              className="w-full mt-2 accent-emerald-500 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Descarta puntos satelitales con margen de error superior al umbral para evitar picos irreales.
            </p>
          </div>

          {/* WakeLock toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2.5">
              <Sun className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-xs font-medium text-slate-200">
                  Mantener pantalla encendida (WakeLock API)
                </div>
                <div className="text-[10px] text-slate-500">
                  Evita que el móvil se bloquee mientras se visualiza el sendero
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.keepScreenAwake}
              onChange={(e) => onUpdateSettings({ keepScreenAwake: e.target.checked })}
              className="w-4 h-4 accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Sound / Chimes toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2.5">
              <Volume2 className="w-4 h-4 text-sky-400" />
              <div>
                <div className="text-xs font-medium text-slate-200">
                  Señales sonoras & vibración háptica
                </div>
                <div className="text-[10px] text-slate-500">
                  Avisos acústicos offline en inicio, pausa, hito y fin
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.audioFeedback}
              onChange={(e) => onUpdateSettings({ audioFeedback: e.target.checked })}
              className="w-4 h-4 accent-sky-500 cursor-pointer"
            />
          </div>

          {/* Sunlight High Contrast Mode */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2.5">
              <Eye className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-xs font-medium text-slate-200">
                  Modo Alto Contraste Solar
                </div>
                <div className="text-[10px] text-slate-500">
                  Fondo negro puro OLED y líneas fosforescentes para visibilidad bajo sol
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.highContrastMode}
              onChange={(e) => onUpdateSettings({ highContrastMode: e.target.checked })}
              className="w-4 h-4 accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition cursor-pointer"
          >
            Guardar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
