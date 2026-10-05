/**
 * Altimeter Calibration Modal
 * Allows mountaineers, hikers, and outdoor athletes to calibrate their barometric & GPS altimeter
 * to a known reference altitude (trailhead, peak signboard, topo contour, sea level 0m),
 * adjust QNH sea-level atmospheric pressure, or reset to raw satellite 3D fix.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Mountain,
  Gauge,
  Check,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Info,
} from 'lucide-react';

interface AltimeterCalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAltitude: number | null;
  altitudeOffset: number;
  onCalibrate: (targetAltitudeMeters: number) => void;
  onReset: () => void;
}

export const AltimeterCalibrationModal: React.FC<AltimeterCalibrationModalProps> = ({
  isOpen,
  onClose,
  currentAltitude,
  altitudeOffset,
  onCalibrate,
  onReset,
}) => {
  const effectiveCurrent = currentAltitude !== null ? Math.round(currentAltitude) : 450;
  const [targetAlt, setTargetAlt] = useState<number>(effectiveCurrent);
  const [qnhPressure, setQnhPressure] = useState<number>(1013.25);
  const [mode, setMode] = useState<'known_altitude' | 'qnh_pressure'>('known_altitude');

  useEffect(() => {
    if (isOpen) {
      setTargetAlt(effectiveCurrent);
    }
  }, [isOpen, effectiveCurrent]);

  if (!isOpen) return null;

  // Convert QNH pressure difference to altitude: approx 8.3m per hPa near sea level
  const handleQnhChange = (val: number) => {
    setQnhPressure(val);
    // Standard atmosphere: h = 44330 * (1 - (P_station / P_0)^(1/5.255))
    // Offset based on standard 1013.25:
    const deltaHpa = 1013.25 - val;
    const estAlt = Math.round(effectiveCurrent + deltaHpa * 8.4);
    setTargetAlt(estAlt);
  };

  const handleApply = () => {
    onCalibrate(targetAlt);
    onClose();
  };

  const handleQuickPreset = (meters: number) => {
    setTargetAlt(meters);
  };

  const handleAdjust = (delta: number) => {
    setTargetAlt((prev) => prev + delta);
  };

  const computedOffset = targetAlt - (effectiveCurrent - altitudeOffset);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-950/80 border border-teal-500/40 text-teal-400 flex items-center justify-center shadow-md">
              <Mountain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-100 tracking-wide">
                Calibrar Altímetro
              </h2>
              <p className="text-[10px] text-slate-400 font-mono">
                Ajuste barométrico y corrección de cota GPS
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current State Strip */}
        <div className="px-5 py-3 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between text-xs font-mono">
          <div>
            <span className="text-slate-400 block text-[10px]">Cota Actual:</span>
            <span className="text-slate-200 font-bold text-sm">{effectiveCurrent} msnm</span>
          </div>

          <div className="text-right">
            <span className="text-slate-400 block text-[10px]">Offset Aplicado:</span>
            <span className={`font-bold text-sm ${altitudeOffset === 0 ? 'text-slate-400' : altitudeOffset > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {altitudeOffset > 0 ? `+${altitudeOffset}` : altitudeOffset} m
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4">
          {/* Tabs: Known Altitude vs QNH Pressure */}
          <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs">
            <button
              onClick={() => setMode('known_altitude')}
              className={`flex-1 py-2 px-3 rounded-xl font-bold transition ${
                mode === 'known_altitude'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Altitud Conocida (msnm)
            </button>
            <button
              onClick={() => setMode('qnh_pressure')}
              className={`flex-1 py-2 px-3 rounded-xl font-bold transition ${
                mode === 'qnh_pressure'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Presión QNH (hPa)
            </button>
          </div>

          {mode === 'known_altitude' ? (
            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold text-slate-300">
                Introduce tu altitud de referencia exacta:
              </label>

              {/* Big Digital Stepper */}
              <div className="flex items-center justify-between gap-2 p-2 bg-slate-950 rounded-2xl border border-slate-800">
                <div className="flex gap-1">
                  <button
                    onClick={() => handleAdjust(-10)}
                    className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold text-xs active:scale-95 transition"
                  >
                    -10
                  </button>
                  <button
                    onClick={() => handleAdjust(-1)}
                    className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold text-xs active:scale-95 transition"
                  >
                    -1
                  </button>
                </div>

                <div className="flex items-baseline justify-center gap-1 flex-1">
                  <input
                    type="number"
                    value={targetAlt}
                    onChange={(e) => setTargetAlt(Number(e.target.value) || 0)}
                    className="w-28 text-center font-mono text-2xl font-black text-teal-300 bg-transparent focus:outline-none"
                  />
                  <span className="font-mono text-xs text-teal-500 font-bold uppercase">m</span>
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => handleAdjust(+1)}
                    className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold text-xs active:scale-95 transition"
                  >
                    +1
                  </button>
                  <button
                    onClick={() => handleAdjust(+10)}
                    className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold text-xs active:scale-95 transition"
                  >
                    +10
                  </button>
                </div>
              </div>

              {/* Quick Reference Presets */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Atajos:</span>
                <div className="flex gap-1.5 flex-wrap flex-1">
                  <button
                    onClick={() => handleQuickPreset(0)}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-200 border border-slate-700 transition"
                  >
                    0 m (Costa/Mar)
                  </button>
                  <button
                    onClick={() => handleQuickPreset(500)}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-200 border border-slate-700 transition"
                  >
                    500 m
                  </button>
                  <button
                    onClick={() => handleQuickPreset(1000)}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-200 border border-slate-700 transition"
                  >
                    1.000 m
                  </button>
                  <button
                    onClick={() => handleQuickPreset(2000)}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-200 border border-slate-700 transition"
                  >
                    2.000 m
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold text-slate-300">
                Presión atmosférica a nivel del mar (QNH local):
              </label>

              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-sky-400" />
                  <span className="text-xs text-slate-400 font-mono">Presión QNH:</span>
                </div>
                <div className="flex items-baseline gap-1 font-mono">
                  <input
                    type="number"
                    step="0.5"
                    value={qnhPressure}
                    onChange={(e) => handleQnhChange(parseFloat(e.target.value) || 1013.25)}
                    className="w-24 text-right text-lg font-black text-sky-300 bg-transparent focus:outline-none"
                  />
                  <span className="text-xs text-sky-500 font-bold">hPa</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-sky-950/40 border border-sky-800/40 text-[11px] text-sky-300 font-mono flex items-center justify-between">
                <span>Altitud Resultante:</span>
                <strong className="text-sm font-bold text-teal-300">{targetAlt} msnm</strong>
              </div>
            </div>
          )}

          {/* Explanation Banner */}
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-2.5 text-slate-400 text-xs">
            <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              La señal vertical de los satélites GPS puede tener una desviación de ±15–30m. Calibrar tu altímetro en una cota conocida (vértice geodésico, mapa topográfico o inicio del sendero) asegura máxima precisión en tu desnivel y en el trazado 3D.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex items-center gap-2">
          {altitudeOffset !== 0 && (
            <button
              onClick={() => {
                onReset();
                onClose();
              }}
              title="Restablecer calibración a GPS directo"
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 active:scale-95 transition"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>Restablecer</span>
            </button>
          )}

          <button
            onClick={handleApply}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-teal-950/60 active:scale-95 transition cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Calibrar a {targetAlt} m ({computedOffset >= 0 ? `+${computedOffset}` : computedOffset}m)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
