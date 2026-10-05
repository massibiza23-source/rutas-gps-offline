/**
 * Route History & Storage Manager Modal
 * Browse, load, export (GPX/GeoJSON), and import offline routes stored in IndexedDB.
 */

import React, { useEffect, useState, useRef } from 'react';
import { RouteRecord } from '../types/gps';
import { dbService } from '../services/db';
import {
  X,
  FolderOpen,
  Download,
  Trash2,
  Calendar,
  Clock,
  TrendingUp,
  Upload,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import {
  downloadFile,
  exportToGeoJSON,
  exportToGPX,
  formatDistance,
  formatDuration,
  parseGPX,
} from '../utils/geoUtils';

interface RouteHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRoute: (routeId: string) => void;
  currentRouteId?: string;
}

export const RouteHistoryModal: React.FC<RouteHistoryModalProps> = ({
  isOpen,
  onClose,
  onSelectRoute,
  currentRouteId,
}) => {
  const [routes, setRoutes] = useState<RouteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadRoutes = async () => {
    setLoading(true);
    try {
      const data = await dbService.getAllRoutes();
      setRoutes(data);
    } catch (err) {
      console.error('Error loading routes from IndexedDB:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRoutes();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = async (routeId: string, title: string) => {
    if (confirm(`¿Eliminar la ruta "${title}" de la memoria local?`)) {
      await dbService.deleteRoute(routeId);
      await loadRoutes();
    }
  };

  const handleExportGPX = async (route: RouteRecord) => {
    const points = await dbService.getTrackPoints(route.id);
    const waypoints = await dbService.getWaypoints(route.id);
    const gpxString = exportToGPX(route, points, waypoints);
    const filename = `${route.title.toLowerCase().replace(/\s+/g, '_')}_${new Date(route.startTime).toISOString().slice(0, 10)}.gpx`;
    downloadFile(gpxString, filename, 'application/gpx+xml');

    setExportNotice(`Exportado: ${filename}`);
    setTimeout(() => setExportNotice(null), 3000);
  };

  const handleExportGeoJSON = async (route: RouteRecord) => {
    const points = await dbService.getTrackPoints(route.id);
    const waypoints = await dbService.getWaypoints(route.id);
    const geojsonString = exportToGeoJSON(route, points, waypoints);
    const filename = `${route.title.toLowerCase().replace(/\s+/g, '_')}.geojson`;
    downloadFile(geojsonString, filename, 'application/geo+json');

    setExportNotice(`Exportado: ${filename}`);
    setTimeout(() => setExportNotice(null), 3000);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseGPX(text);

      if (parsed.points.length === 0) {
        alert('El archivo GPX no contiene puntos de ruta válidos.');
        return;
      }

      const now = Date.now();
      const routeId = `route_imported_${now}`;

      // Calculate total metrics
      let totalDist = 0;
      let eleGain = 0;
      let eleLoss = 0;
      let minEle: number | null = null;
      let maxEle: number | null = null;

      const trackPoints = parsed.points.map((pt, idx) => {
        if (pt.altitude !== null) {
          minEle = minEle === null ? pt.altitude : Math.min(minEle, pt.altitude);
          maxEle = maxEle === null ? pt.altitude : Math.max(maxEle, pt.altitude);
        }

        let deltaDist = 0;
        let deltaEle = 0;
        if (idx > 0) {
          const prev = parsed.points[idx - 1];
          // Simple haversine
          const dLat = (pt.lat - prev.lat) * (Math.PI / 180);
          const dLng = (pt.lng - prev.lng) * (Math.PI / 180);
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(prev.lat * (Math.PI / 180)) * Math.cos(pt.lat * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
          deltaDist = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          totalDist += deltaDist;

          if (pt.altitude !== null && prev.altitude !== null) {
            deltaEle = pt.altitude - prev.altitude;
            if (deltaEle > 0) eleGain += deltaEle;
            else eleLoss += Math.abs(deltaEle);
          }
        }

        return {
          id: `${routeId}_pt_${idx}`,
          routeId,
          lat: pt.lat,
          lng: pt.lng,
          altitude: pt.altitude,
          accuracy: 5,
          speed: 1.4,
          heading: null,
          timestamp: pt.timestamp,
          distanceFromStart: totalDist,
          elevationDelta: deltaEle,
        };
      });

      const startTime = trackPoints[0]?.timestamp || now;
      const endTime = trackPoints[trackPoints.length - 1]?.timestamp || now + 3600000;
      const duration = endTime - startTime;

      const newRoute: RouteRecord = {
        id: routeId,
        title: parsed.title || file.name.replace(/\.[^/.]+$/, ''),
        activityType: 'hiking',
        status: 'completed',
        startTime,
        endTime,
        totalDistance: totalDist,
        duration: Math.max(duration, 1000),
        movingTime: Math.max(duration, 1000),
        avgSpeed: duration > 0 ? (totalDist / (duration / 1000)) * 3.6 : 0,
        maxSpeed: 12,
        currentSpeed: 0,
        minElevation: minEle,
        maxElevation: maxEle,
        elevationGain: Math.round(eleGain),
        elevationLoss: Math.round(eleLoss),
        pointCount: trackPoints.length,
        waypointCount: parsed.waypoints.length,
      };

      await dbService.saveRoute(newRoute);
      await dbService.addTrackPointsBatch(trackPoints);

      for (let i = 0; i < parsed.waypoints.length; i++) {
        const wp = parsed.waypoints[i];
        await dbService.addWaypoint({
          id: `${routeId}_wp_${i}`,
          routeId,
          lat: wp.lat,
          lng: wp.lng,
          altitude: wp.altitude,
          title: wp.title,
          category: (wp.category as any) || 'milestone',
          timestamp: now,
        });
      }

      await loadRoutes();
      onSelectRoute(routeId);
      onClose();
    } catch (err) {
      console.error('Error importing GPX:', err);
      alert('Error al leer el archivo GPX.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Rutas Guardadas en IndexedDB</h3>
              <p className="text-xs text-slate-400">
                Almacenamiento persistente 100% offline en tu dispositivo
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice alert */}
        {exportNotice && (
          <div className="mt-3 flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{exportNotice}</span>
          </div>
        )}

        {/* Top actions bar */}
        <div className="flex items-center justify-between gap-3 my-3">
          <span className="text-xs text-slate-400 font-mono">
            {routes.length} {routes.length === 1 ? 'ruta registrada' : 'rutas registradas'}
          </span>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".gpx,.xml"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 text-xs font-medium transition cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Importar GPX</span>
            </button>
          </div>
        </div>

        {/* Route List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-sm font-mono">
              Cargando base de datos IndexedDB...
            </div>
          ) : routes.length === 0 ? (
            <div className="py-16 text-center text-slate-500 flex flex-col items-center">
              <FolderOpen className="w-10 h-10 mb-2 opacity-40 text-slate-400" />
              <p className="text-sm font-medium text-slate-400">No hay rutas registradas todavía</p>
              <p className="text-xs text-slate-600 mt-1 max-w-xs">
                Inicia una grabación de ruta en el panel principal o importa un archivo GPX para comenzar.
              </p>
            </div>
          ) : (
            routes.map((route) => {
              const isCurrent = currentRouteId === route.id;
              const dateStr = new Date(route.startTime).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });
              const timeStr = new Date(route.startTime).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={route.id}
                  className={`p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-slate-800/90 border-emerald-500/60 ring-1 ring-emerald-500/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div
                    onClick={() => {
                      onSelectRoute(route.id);
                      onClose();
                    }}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-100 text-sm hover:text-emerald-400 transition">
                        {route.title}
                      </h4>
                      {isCurrent && (
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-400">
                          Activa
                        </span>
                      )}
                    </div>

                    {/* Stats pills */}
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400 font-mono">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{dateStr} {timeStr}</span>
                      </div>

                      <div className="flex items-center gap-1 text-emerald-400 font-semibold">
                        <span>{formatDistance(route.totalDistance)}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{formatDuration(route.duration)}</span>
                      </div>

                      {route.elevationGain > 0 && (
                        <div className="flex items-center gap-1 text-teal-400">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>+{route.elevationGain}m</span>
                        </div>
                      )}

                      <span className="text-slate-600">· {route.pointCount} pts</span>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800 shrink-0">
                    <button
                      onClick={() => handleExportGPX(route)}
                      title="Exportar archivo GPX para GPS y Garmin"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 text-xs font-mono font-medium transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>GPX</span>
                    </button>

                    <button
                      onClick={() => handleExportGeoJSON(route)}
                      title="Exportar GeoJSON"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono font-medium transition cursor-pointer"
                    >
                      GeoJSON
                    </button>

                    <button
                      onClick={() => handleDelete(route.id, route.title)}
                      title="Eliminar de almacenamiento local"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>Base de datos: IndexedDB (Offline Storage)</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
