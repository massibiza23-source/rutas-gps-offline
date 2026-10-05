/**
 * Subterranean Hostile-Environment Speleo HUD
 * High-contrast, glove-friendly oversized controls for extreme underground conditions.
 * Supports Red-Lamp night vision preservation, Barometric depth, and dead-reckoning telemetry.
 */

import React from 'react';
import { SensorTelemetry, SpeleoThemeMode } from '../types/speleo';
import {
  Compass,
  Footprints,
  TrendingDown,
  Gauge,
  Thermometer,
  PlusCircle,
  Lightbulb,
  Radio,
  FileText,
  Sun,
  ShieldAlert,
  Battery,
} from 'lucide-react';

interface SpeleoHUDProps {
  telemetry: SensorTelemetry;
  themeMode: SpeleoThemeMode;
  onChangeThemeMode: (mode: SpeleoThemeMode) => void;
  onOpenStationModal: () => void;
  onOpenPRDModal: () => void;
  onCalibrateZeroDepth: () => void;
  onToggleSOS: () => void;
  isSOSEnabled: boolean;
}

export const SpeleoHUD: React.FC<SpeleoHUDProps> = ({
  telemetry,
  themeMode,
  onChangeThemeMode,
  onOpenStationModal,
  onOpenPRDModal,
  onCalibrateZeroDepth,
  onToggleSOS,
  isSOSEnabled,
}) => {
  const isRedMode = themeMode === 'red_lamp';
  const isAmberMode = themeMode === 'amber_high_contrast';

  return (
    <div
      className={`border-t p-3 sm:p-4 select-none backdrop-blur-2xl transition-colors duration-200 ${
        isRedMode
          ? 'bg-black border-red-950 text-red-500'
          : isAmberMode
          ? 'bg-black border-amber-950 text-amber-400'
          : 'bg-slate-950/95 border-slate-800 text-slate-100'
      }`}
    >
      {/* Top Quick Status Bar */}
      <div className="flex items-center justify-between text-xs font-mono mb-3 pb-2 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className={isRedMode ? 'text-red-400' : 'text-emerald-400'}>
              SENSOR FUSION 100% OFFLINE
            </span>
          </div>

          <span className="hidden sm:inline text-white/30">|</span>

          <div className="hidden sm:flex items-center gap-1.5 text-white/60">
            <Thermometer className="w-3.5 h-3.5" />
            <span>{telemetry.temperatureC.toFixed(1)}°C Cueva</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Battery Status */}
          <div className="flex items-center gap-1 text-[11px] font-bold">
            <Battery className="w-4 h-4 text-emerald-400" />
            <span>~{telemetry.batteryRemainingHours}h autonomía</span>
          </div>

          {/* Theme Mode Toggle (Red / Amber / Tactical) */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => onChangeThemeMode('dark_tactical')}
              title="Modo Táctico OLED"
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                themeMode === 'dark_tactical' ? 'bg-sky-600 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              OLED
            </button>
            <button
              onClick={() => onChangeThemeMode('red_lamp')}
              title="Luz Roja (Protege visión nocturna)"
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                themeMode === 'red_lamp' ? 'bg-red-700 text-white' : 'text-red-400 hover:text-red-200'
              }`}
            >
              ROJO
            </button>
            <button
              onClick={() => onChangeThemeMode('amber_high_contrast')}
              title="Ámbar Alto Contraste"
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                themeMode === 'amber_high_contrast' ? 'bg-amber-600 text-black' : 'text-amber-400 hover:text-amber-200'
              }`}
            >
              ÁMBAR
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Subterranean Telemetry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-3 text-center">
        {/* Metric 1: Barometric Depth (-Z) */}
        <div className="p-2.5 sm:p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-center">
          <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider opacity-70">
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            <span>Profundidad Z</span>
          </div>
          <div className="font-mono text-xl sm:text-2xl font-black mt-0.5 text-rose-400">
            {telemetry.currentDepthMeters.toFixed(1)} m
          </div>
          <span className="text-[10px] opacity-60 font-mono">
            {telemetry.currentPressureHpa.toFixed(1)} hPa
          </span>
        </div>

        {/* Metric 2: Compass Azimuth & Pitch */}
        <div className="p-2.5 sm:p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-center">
          <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider opacity-70">
            <Compass className="w-3.5 h-3.5 text-sky-400" />
            <span>Rumbo & Inclinación</span>
          </div>
          <div className="font-mono text-xl sm:text-2xl font-black mt-0.5 text-sky-400">
            {Math.round(telemetry.azimuthDeg)}° N
          </div>
          <span className="text-[10px] opacity-60 font-mono">
            Pitch: {telemetry.pitchDeg > 0 ? `+${Math.round(telemetry.pitchDeg)}` : Math.round(telemetry.pitchDeg)}°
          </span>
        </div>

        {/* Metric 3: PDR Step / Crawl Distance */}
        <div className="p-2.5 sm:p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-center">
          <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider opacity-70">
            <Footprints className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pasos & Avance</span>
          </div>
          <div className="font-mono text-xl sm:text-2xl font-black mt-0.5 text-emerald-400">
            {telemetry.stepCount} pasos
          </div>
          <span className="text-[10px] opacity-60 font-mono">
            Zancada: {(telemetry.strideLengthMeters * 100).toFixed(0)} cm
          </span>
        </div>

        {/* Metric 4: Pressure Sensor Barometer */}
        <div className="p-2.5 sm:p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-center">
          <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider opacity-70">
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
            <span>Δ Presión Entrada</span>
          </div>
          <div className="font-mono text-xl sm:text-2xl font-black mt-0.5 text-amber-400">
            +{(telemetry.currentPressureHpa - telemetry.surfacePressureHpa).toFixed(1)} hPa
          </div>
          <span className="text-[10px] opacity-60 font-mono">
            Confianza: {telemetry.confidenceLevel}%
          </span>
        </div>
      </div>

      {/* Hostile-Environment Glove-Friendly Tactile Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Main Station Marker Button (Minimum 52px target for neoprene gloves) */}
        <button
          onClick={onOpenStationModal}
          className="flex-1 min-h-[52px] flex items-center justify-center gap-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-950/60 active:scale-[0.98] transition cursor-pointer border-2 border-emerald-400/60"
        >
          <PlusCircle className="w-6 h-6 shrink-0" />
          <span>Registrar Estación / Hito</span>
        </button>

        {/* Calibrate Surface Pressure Button */}
        <button
          onClick={onCalibrateZeroDepth}
          title="Fijar presión en boca de cueva a 0.0m"
          className="min-h-[52px] px-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center gap-2 border-2 border-white/20 active:scale-[0.98] transition cursor-pointer"
        >
          <Gauge className="w-5 h-5 text-sky-400" />
          <span className="hidden sm:inline">Calibrar Cero (Boca)</span>
        </button>

        {/* Emergency Underground SOS Strobe */}
        <button
          onClick={onToggleSOS}
          title="Señal SOS de Emergencia Subterránea"
          className={`min-h-[52px] px-3.5 rounded-2xl font-black text-xs flex items-center gap-2 border-2 active:scale-[0.98] transition cursor-pointer ${
            isSOSEnabled
              ? 'bg-red-600 text-white border-white animate-bounce'
              : 'bg-red-950/40 text-red-400 border-red-800 hover:bg-red-900/40'
          }`}
        >
          <ShieldAlert className="w-5 h-5" />
          <span>SOS</span>
        </button>

        {/* PRD & Technical Spec Viewer Button */}
        <button
          onClick={onOpenPRDModal}
          title="Ver Guía de Requerimientos de Producto (PRD) y Arquitectura"
          className="min-h-[52px] px-3.5 rounded-2xl bg-sky-950/50 hover:bg-sky-900/50 text-sky-300 font-bold text-xs flex items-center gap-2 border-2 border-sky-600/60 active:scale-[0.98] transition cursor-pointer"
        >
          <FileText className="w-5 h-5 text-sky-400" />
          <span>Ver PRD & Diseño</span>
        </button>
      </div>
    </div>
  );
};
