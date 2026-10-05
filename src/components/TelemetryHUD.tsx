/**
 * Tactical Outdoor Telemetry HUD
 * High-visibility real-time dashboard for outdoor athletes and hikers.
 * Displays speed, pace, distance, elevation, GPS fix accuracy, and route controls.
 */

import React from 'react';
import { RouteRecord, CurrentPositionState, BatteryProfile } from '../types/gps';
import {
  Play,
  Pause,
  Square,
  MapPin,
  Battery,
  BatteryCharging,
  Radio,
  Timer,
  Navigation,
  Compass,
  Zap,
} from 'lucide-react';
import { formatDistance, formatDuration, formatPace, formatSpeed } from '../utils/geoUtils';

interface TelemetryHUDProps {
  currentRoute: RouteRecord | null;
  currentPosition: CurrentPositionState | null;
  batteryInfo: { level: number | null; charging: boolean | null };
  batteryProfile: BatteryProfile;
  isSimulating: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onOpenWaypointModal: () => void;
  onToggleMapMode: () => void;
  mapType: 'vector_canvas' | 'leaflet_osm' | 'leaflet_topo';
}

export const TelemetryHUD: React.FC<TelemetryHUDProps> = ({
  currentRoute,
  currentPosition,
  batteryInfo,
  batteryProfile,
  isSimulating,
  onStart,
  onPause,
  onResume,
  onFinish,
  onOpenWaypointModal,
  onToggleMapMode,
  mapType,
}) => {
  const isRecording = currentRoute?.status === 'recording';
  const isPaused = currentRoute?.status === 'paused';

  const speedKmh = currentPosition?.speed !== null && currentPosition?.speed !== undefined
    ? currentPosition.speed * 3.6
    : (currentRoute?.currentSpeed || 0);

  const accuracy = currentPosition?.accuracy ?? null;
  const altitude = currentPosition?.altitude ?? currentRoute?.maxElevation ?? null;

  // Signal quality based on accuracy
  const getSignalBadge = () => {
    if (isSimulating) {
      return (
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-900/60 border border-purple-500/40 text-purple-300 text-[10px] font-mono">
          <Zap className="w-3 h-3 text-purple-400" />
          SIMULADO
        </span>
      );
    }
    if (accuracy === null) {
      return (
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-mono">
          <Radio className="w-3 h-3 text-slate-500" />
          BUSCANDO...
        </span>
      );
    }
    if (accuracy <= 8) {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
          <Radio className="w-3 h-3" />
          ±{Math.round(accuracy)}m ÓPTIMO
        </span>
      );
    }
    if (accuracy <= 25) {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/70 border border-amber-500/30 text-amber-400 text-[10px] font-mono">
          <Radio className="w-3 h-3" />
          ±{Math.round(accuracy)}m BUENO
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950/70 border border-rose-500/30 text-rose-400 text-[10px] font-mono">
        <Radio className="w-3 h-3" />
        ±{Math.round(accuracy)}m DÉBIL
      </span>
    );
  };

  return (
    <div className="bg-slate-900/95 border-t border-slate-800 p-3 sm:p-4 backdrop-blur-xl shadow-2xl flex flex-col gap-3">
      {/* Top Status Strip */}
      <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          {getSignalBadge()}
          <span className="hidden sm:inline-block text-slate-600">|</span>
          <span className="hidden sm:inline-block text-[11px] text-slate-400">
            Perfil: <strong className="text-slate-200 uppercase">{batteryProfile === 'high_precision' ? 'Alta Precisión' : batteryProfile === 'balanced' ? 'Equilibrado' : 'Ultra Trek'}</strong>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Battery Status */}
          {batteryInfo.level !== null && (
            <div className="flex items-center gap-1 text-[11px] text-slate-300">
              {batteryInfo.charging ? (
                <BatteryCharging className="w-4 h-4 text-emerald-400" />
              ) : (
                <Battery className={`w-4 h-4 ${batteryInfo.level < 20 ? 'text-rose-400 animate-pulse' : 'text-slate-300'}`} />
              )}
              <span>{batteryInfo.level}%</span>
            </div>
          )}

          {/* Map Layer Switcher Button */}
          <button
            onClick={onToggleMapMode}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 text-[11px] font-medium border border-slate-700 transition"
          >
            <Compass className="w-3 h-3" />
            <span>{mapType === 'vector_canvas' ? 'Ver Mapa Base' : 'Ver Lienzo Vector'}</span>
          </button>
        </div>
      </div>

      {/* Main Outdoor Telemetry Grid */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center">
        {/* Metric 1: Distance */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2 sm:p-2.5 flex flex-col justify-center">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Distancia</span>
          <div className="font-mono text-base sm:text-xl font-bold text-emerald-400 mt-0.5">
            {currentRoute ? formatDistance(currentRoute.totalDistance) : '0 m'}
          </div>
        </div>

        {/* Metric 2: Speed / Pace */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2 sm:p-2.5 flex flex-col justify-center">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Velocidad</span>
          <div className="font-mono text-base sm:text-xl font-bold text-sky-400 mt-0.5">
            {formatSpeed(speedKmh)}
          </div>
          <span className="text-[9px] text-slate-500 font-mono">{formatPace(speedKmh)}</span>
        </div>

        {/* Metric 3: Duration */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2 sm:p-2.5 flex flex-col justify-center">
          <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            <Timer className="w-3 h-3 text-amber-400" />
            <span>Tiempo</span>
          </div>
          <div className="font-mono text-base sm:text-xl font-bold text-amber-400 mt-0.5">
            {currentRoute ? formatDuration(currentRoute.duration) : '00:00'}
          </div>
        </div>

        {/* Metric 4: Elevation Gain / Altitude */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2 sm:p-2.5 flex flex-col justify-center">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Desnivel +</span>
          <div className="font-mono text-base sm:text-xl font-bold text-teal-400 mt-0.5">
            +{currentRoute ? currentRoute.elevationGain : 0} m
          </div>
          <span className="text-[9px] text-slate-500 font-mono">
            {altitude !== null ? `${Math.round(altitude)}m alt` : '--'}
          </span>
        </div>
      </div>

      {/* Control Actions Bar */}
      <div className="flex items-center gap-2 sm:gap-3 pt-1">
        {!isRecording && !isPaused && (
          <button
            onClick={onStart}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/50 active:scale-[0.98] transition cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Iniciar Grabación</span>
          </button>
        )}

        {isRecording && (
          <>
            <button
              onClick={onPause}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-lg shadow-amber-950/50 active:scale-[0.98] transition cursor-pointer"
            >
              <Pause className="w-5 h-5 fill-current" />
              <span>Pausar</span>
            </button>

            <button
              onClick={onOpenWaypointModal}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 font-medium text-sm active:scale-[0.98] transition cursor-pointer"
            >
              <MapPin className="w-5 h-5 text-sky-400" />
              <span className="hidden sm:inline">Marcar Hito</span>
            </button>

            <button
              onClick={onFinish}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-bold text-sm shadow-lg shadow-rose-950/50 active:scale-[0.98] transition cursor-pointer"
            >
              <Square className="w-5 h-5 fill-current" />
              <span>Finalizar</span>
            </button>
          </>
        )}

        {isPaused && (
          <>
            <button
              onClick={onResume}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/50 active:scale-[0.98] transition cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Reanudar</span>
            </button>

            <button
              onClick={onOpenWaypointModal}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 font-medium text-sm active:scale-[0.98] transition cursor-pointer"
            >
              <MapPin className="w-5 h-5 text-sky-400" />
              <span className="hidden sm:inline">Hito</span>
            </button>

            <button
              onClick={onFinish}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-bold text-sm shadow-lg shadow-rose-950/50 active:scale-[0.98] transition cursor-pointer"
            >
              <Square className="w-5 h-5 fill-current" />
              <span>Finalizar Ruta</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
