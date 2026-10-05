/**
 * Tactical Outdoor Telemetry HUD & Altimeter
 * High-visibility real-time dashboard for outdoor activities.
 * Displays speed, pace, distance, elevation, GPS fix accuracy, and route controls.
 * Features a permanent dedicated Barometric & GPS Altimeter instrument (msnm, hPa, cotas).
 */

import React, { useState } from 'react';
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
  Compass,
  Zap,
  ChevronDown,
  ChevronUp,
  Mountain,
  Sliders,
  Gauge,
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
  onOpenCalibrateModal?: () => void;
  altitudeOffset?: number;
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
  onOpenCalibrateModal,
  altitudeOffset = 0,
}) => {
  const isRecording = currentRoute?.status === 'recording';
  const isPaused = currentRoute?.status === 'paused';
  const [isCollapsed, setIsCollapsed] = useState(false);

  const speedKmh =
    currentPosition?.speed !== null && currentPosition?.speed !== undefined
      ? currentPosition.speed * 3.6
      : (currentRoute?.currentSpeed || 0);

  const accuracy = currentPosition?.accuracy ?? null;
  const altitude = currentPosition?.altitude ?? currentRoute?.maxElevation ?? null;

  // Real-time pressure estimate at current altitude
  const pressureEst = (
    1013.25 * Math.pow(1 - (0.0065 * (altitude || 450)) / 288.15, 5.255)
  ).toFixed(1);

  // Min and Max altitudes
  const minAlt =
    currentRoute?.minElevation !== null && currentRoute?.minElevation !== undefined
      ? Math.round(currentRoute.minElevation)
      : altitude !== null
      ? Math.round(altitude)
      : '--';

  const maxAlt =
    currentRoute?.maxElevation !== null && currentRoute?.maxElevation !== undefined
      ? Math.round(currentRoute.maxElevation)
      : altitude !== null
      ? Math.round(altitude)
      : '--';

  // Signal quality badge
  const getSignalBadge = () => {
    if (isSimulating) {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-900/70 border border-purple-500/50 text-purple-300 text-[10px] font-mono font-bold">
          <Zap className="w-3 h-3 text-purple-400" />
          SIMULADO
        </span>
      );
    }
    if (accuracy === null) {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-mono">
          <Radio className="w-3 h-3 text-slate-500 animate-pulse" />
          BUSCANDO GPS...
        </span>
      );
    }
    if (accuracy <= 8) {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono font-bold">
          <Radio className="w-3 h-3" />
          GPS ±{Math.round(accuracy)}m
        </span>
      );
    }
    if (accuracy <= 25) {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-400 text-[10px] font-mono font-bold">
          <Radio className="w-3 h-3" />
          GPS ±{Math.round(accuracy)}m
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-400 text-[10px] font-mono">
        <Radio className="w-3 h-3" />
        GPS ±{Math.round(accuracy)}m
      </span>
    );
  };

  return (
    <div
      className="bg-slate-900/98 border-t border-slate-700/80 backdrop-blur-2xl shadow-2xl flex flex-col z-30 select-none"
      style={{
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 12px))',
      }}
    >
      {/* Top Status & Controls Strip */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1.5 text-xs text-slate-400 font-mono border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          {getSignalBadge()}
          <span className="hidden sm:inline-block text-slate-600">|</span>
          <span className="hidden md:inline-block text-[10px] text-slate-400">
            Perfil:{' '}
            <strong className="text-slate-200 uppercase">
              {batteryProfile === 'high_precision'
                ? 'Alta Precisión'
                : batteryProfile === 'balanced'
                ? 'Equilibrado'
                : 'Ultra Trek'}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Battery Status */}
          {batteryInfo.level !== null && (
            <div className="flex items-center gap-1 text-[11px] text-slate-300 font-mono">
              {batteryInfo.charging ? (
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Battery
                  className={`w-3.5 h-3.5 ${
                    batteryInfo.level < 20 ? 'text-rose-400 animate-pulse' : 'text-slate-300'
                  }`}
                />
              )}
              <span>{batteryInfo.level}%</span>
            </div>
          )}

          {/* Map Layer Switcher Button */}
          <button
            onClick={onToggleMapMode}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 text-[10px] font-medium border border-slate-700 transition cursor-pointer"
          >
            <Compass className="w-3 h-3" />
            <span>{mapType === 'vector_canvas' ? 'Mapa Base' : 'Lienzo Vector'}</span>
          </button>

          {/* Collapse Metrics Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expandir telemetría' : 'Colapsar telemetría'}
            className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Outdoor Telemetry Grid (Collapsible) */}
      {!isCollapsed && (
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 px-3 py-1.5 text-center">
          {/* Metric 1: Distance */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-1.5 flex flex-col justify-center">
            <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">
              Distancia
            </span>
            <div className="font-mono text-sm sm:text-base font-black text-emerald-400 leading-tight">
              {currentRoute ? formatDistance(currentRoute.totalDistance) : '0 m'}
            </div>
          </div>

          {/* Metric 2: Speed */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-1.5 flex flex-col justify-center">
            <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">
              Velocidad
            </span>
            <div className="font-mono text-sm sm:text-base font-black text-sky-400 leading-tight">
              {formatSpeed(speedKmh)}
            </div>
            <span className="hidden sm:inline text-[8px] text-slate-500 font-mono">
              {formatPace(speedKmh)}
            </span>
          </div>

          {/* Metric 3: Duration */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-1.5 flex flex-col justify-center">
            <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">
              Tiempo
            </span>
            <div className="font-mono text-sm sm:text-base font-black text-amber-400 leading-tight">
              {currentRoute ? formatDuration(currentRoute.duration) : '00:00'}
            </div>
          </div>

          {/* Metric 4: Elevation Gain */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-1.5 flex flex-col justify-center">
            <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">
              Desnivel +
            </span>
            <div className="font-mono text-sm sm:text-base font-black text-teal-400 leading-tight">
              +{currentRoute ? currentRoute.elevationGain : 0} m
            </div>
          </div>
        </div>
      )}

      {/* Permanent Dedicated Altimeter Instrument */}
      <div className="px-3 pt-1">
        <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-950/90 border border-teal-500/40 text-teal-400 flex items-center justify-center shrink-0 shadow-sm">
              <Mountain className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Altímetro
                </span>
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-teal-950 border border-teal-500/30 text-teal-300 font-bold">
                  MSNM
                </span>
                {altitudeOffset !== 0 && (
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold">
                    {altitudeOffset > 0 ? `+${altitudeOffset}m` : `${altitudeOffset}m`} CAL
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-mono text-xl sm:text-2xl font-black text-teal-300 tracking-tight leading-none">
                  {altitude !== null ? `${Math.round(altitude)} m` : '-- m'}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {pressureEst} hPa
                </span>
              </div>
            </div>
          </div>

          {/* Cotas min/max & Calibrate Button */}
          <div className="flex items-center gap-2.5">
            <div className="text-right text-[10px] text-slate-400 font-mono">
              <div>
                Mín: <strong className="text-slate-200">{minAlt}{typeof minAlt === 'number' ? 'm' : ''}</strong>
              </div>
              <div>
                Máx: <strong className="text-slate-200">{maxAlt}{typeof maxAlt === 'number' ? 'm' : ''}</strong>
              </div>
            </div>

            {onOpenCalibrateModal && (
              <button
                onClick={onOpenCalibrateModal}
                title="Calibrar altímetro barométrico y cota GPS"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-400 border border-slate-700 font-bold text-[11px] active:scale-95 transition cursor-pointer shadow-sm"
              >
                <Sliders className="w-3.5 h-3.5 text-teal-400" />
                <span>Calibrar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Control Actions Bar */}
      <div className="px-3 pt-2 pb-1">
        {!isRecording && !isPaused && (
          <button
            onClick={onStart}
            className="w-full min-h-[48px] sm:min-h-[52px] flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-emerald-950/70 border border-emerald-400/80 active:scale-[0.98] transition cursor-pointer"
          >
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
            </div>
            <span>Iniciar Grabación de Ruta</span>
          </button>
        )}

        {isRecording && (
          <div className="flex items-center gap-2">
            <button
              onClick={onPause}
              className="flex-1 min-h-[46px] flex items-center justify-center gap-2 py-2 px-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-950/50 active:scale-[0.98] transition cursor-pointer border border-amber-400/60"
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>Pausar</span>
            </button>

            <button
              onClick={onOpenWaypointModal}
              className="min-h-[46px] px-3.5 flex items-center justify-center gap-1.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 font-bold text-xs active:scale-[0.98] transition cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-sky-400" />
              <span>Hito</span>
            </button>

            <button
              onClick={onFinish}
              className="flex-1 min-h-[46px] flex items-center justify-center gap-2 py-2 px-3 rounded-2xl bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-rose-950/50 active:scale-[0.98] transition cursor-pointer border border-rose-400/60"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Finalizar</span>
            </button>
          </div>
        )}

        {isPaused && (
          <div className="flex items-center gap-2">
            <button
              onClick={onResume}
              className="flex-1 min-h-[46px] flex items-center justify-center gap-2 py-2 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/50 active:scale-[0.98] transition cursor-pointer border border-emerald-400/60"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Reanudar</span>
            </button>

            <button
              onClick={onOpenWaypointModal}
              className="min-h-[46px] px-3.5 flex items-center justify-center gap-1.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 font-bold text-xs active:scale-[0.98] transition cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-sky-400" />
              <span>Hito</span>
            </button>

            <button
              onClick={onFinish}
              className="flex-1 min-h-[46px] flex items-center justify-center gap-2 py-2 px-3 rounded-2xl bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-rose-950/50 active:scale-[0.98] transition cursor-pointer border border-rose-400/60"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Finalizar</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
