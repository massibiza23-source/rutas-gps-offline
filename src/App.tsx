/**
 * RutaGPS Offline - Outdoor GPS Tracker & Cartography Engine
 * 100% offline, production-grade tracking for real outdoor activities (hiking, cycling, trail running).
 * Features IndexedDB storage for saved routes, pure vector canvas map, Leaflet base map fallback,
 * tactical altimeter (msnm, hPa, cotas), elevation profiles, waypoints, and GPX/GeoJSON export.
 */

import React, { useState, useEffect } from 'react';
import { useGPSTracker } from './hooks/useGPSTracker';
import { VectorCanvasMap } from './components/VectorCanvasMap';
import { LeafletMapRenderer } from './components/LeafletMapRenderer';
import { TelemetryHUD } from './components/TelemetryHUD';
import { ElevationProfile } from './components/ElevationProfile';
import { AddWaypointModal } from './components/AddWaypointModal';
import { RouteHistoryModal } from './components/RouteHistoryModal';
import { SettingsModal } from './components/SettingsModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { dbService } from './services/db';
import { ActivityType } from './types/gps';
import {
  Compass,
  Sliders,
  FolderOpen,
  ChevronUp,
  ChevronDown,
  Play,
  Footprints,
  Bike,
  Activity,
  Edit2,
  Check,
} from 'lucide-react';

export default function App() {
  const {
    currentRoute,
    trackPoints,
    waypoints,
    currentPosition,
    gpsStatus,
    settings,
    isSimulating,
    batteryInfo,
    startRecording,
    pauseRecording,
    resumeRecording,
    finishRecording,
    cancelRecording,
    addWaypoint,
    loadRouteDetails,
    updateSettings,
  } = useGPSTracker();

  // Modals state
  const [isWaypointModalOpen, setIsWaypointModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [showElevationDrawer, setShowElevationDrawer] = useState(true);
  const [scrubberIndex, setScrubberIndex] = useState<number | null>(null);

  // New route form state
  const [routeTitle, setRouteTitle] = useState('Mi Ruta');
  const [selectedActivity, setSelectedActivity] = useState<ActivityType>('hiking');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [savedRouteCount, setSavedRouteCount] = useState(0);

  // Load count of saved routes from IndexedDB
  const refreshRouteCount = async () => {
    try {
      const routes = await dbService.getAllRoutes();
      setSavedRouteCount(routes.length);
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    refreshRouteCount();
  }, [currentRoute?.status, isHistoryModalOpen]);

  const isRecording = currentRoute?.status === 'recording';
  const isPaused = currentRoute?.status === 'paused';

  const handleStartRecording = () => {
    startRecording(routeTitle, selectedActivity);
  };

  const handleFinishRecording = async () => {
    await finishRecording();
    await refreshRouteCount();
    setIsHistoryModalOpen(true);
  };

  const handleToggleMapMode = () => {
    updateSettings({
      mapType: settings.mapType === 'vector_canvas' ? 'leaflet_osm' : 'vector_canvas',
    });
  };

  return (
    <div
      className={`relative w-full h-[100dvh] max-h-[100dvh] min-h-[100dvh] flex flex-col overflow-hidden select-none touch-manipulation ${
        settings.highContrastMode ? 'bg-black text-white contrast-125' : 'bg-slate-950 text-slate-100'
      }`}
    >
      {/* Offline Status Badge */}
      <OfflineIndicator />

      {/* Main Top Header */}
      <header className="h-14 sm:h-16 px-3 sm:px-4 bg-slate-900/95 border-b border-white/10 backdrop-blur-xl flex items-center justify-between z-30 select-none shrink-0">
        {/* Brand & Route Name */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-950/60 shrink-0">
            <Compass className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              {isEditingTitle ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    autoFocus
                    value={routeTitle}
                    onChange={(e) => setRouteTitle(e.target.value)}
                    onBlur={() => setIsEditingTitle(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                    className="bg-slate-950 border border-emerald-500 rounded-lg px-2 py-0.5 text-xs sm:text-sm font-bold text-slate-100 focus:outline-none"
                  />
                  <button
                    onClick={() => setIsEditingTitle(false)}
                    className="p-1 rounded bg-emerald-600 text-white"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <h1
                    onClick={() => !isRecording && !isPaused && setIsEditingTitle(true)}
                    className={`font-black text-xs sm:text-sm tracking-wide truncate max-w-[130px] sm:max-w-[200px] ${
                      !isRecording && !isPaused ? 'cursor-pointer hover:text-emerald-400' : ''
                    }`}
                    title={currentRoute?.title || routeTitle}
                  >
                    {currentRoute?.title || routeTitle}
                  </h1>

                  {!isRecording && !isPaused && (
                    <button
                      onClick={() => setIsEditingTitle(true)}
                      className="p-0.5 text-slate-400 hover:text-white"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Status pill */}
              {isRecording && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-500/50 text-emerald-400 text-[9px] font-mono font-bold uppercase animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  REC
                </span>
              )}

              {isPaused && (
                <span className="px-1.5 py-0.5 rounded bg-amber-950/90 border border-amber-500/50 text-amber-400 text-[9px] font-mono font-bold uppercase">
                  Pausa
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-400 font-mono">
              <span className="text-emerald-400 font-semibold">RutaGPS Offline</span>
              <span className="text-slate-600">·</span>
              <span className="hidden sm:inline">100% Autónomo</span>
            </div>
          </div>
        </div>

        {/* Activity Selector & Right Tools */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Activity Type Switcher (When not recording) */}
          {!isRecording && !isPaused && (
            <div className="hidden sm:flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setSelectedActivity('hiking')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  selectedActivity === 'hiking'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Footprints className="w-3.5 h-3.5" />
                <span>Senderismo</span>
              </button>

              <button
                onClick={() => setSelectedActivity('cycling')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  selectedActivity === 'cycling'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Bike className="w-3.5 h-3.5" />
                <span>Bici</span>
              </button>

              <button
                onClick={() => setSelectedActivity('trail_running')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  selectedActivity === 'trail_running'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Trail</span>
              </button>
            </div>
          )}

          {/* Mis Rutas Grabadas Button */}
          <button
            onClick={() => setIsHistoryModalOpen(true)}
            title="Mis Rutas Guardadas en IndexedDB"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-bold transition cursor-pointer shadow-md"
          >
            <FolderOpen className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Mis Rutas</span>
            {savedRouteCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] flex items-center justify-center font-mono ml-0.5">
                {savedRouteCount}
              </span>
            )}
          </button>

          {/* Settings */}
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            title="Ajustes de Batería y GPS"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-sky-400" />
          </button>

          <PWAInstallButton />
        </div>
      </header>

      {/* Main Map Viewport */}
      <main className="relative flex-1 w-full overflow-hidden bg-slate-950 min-h-0">
        {settings.mapType === 'vector_canvas' ? (
          <VectorCanvasMap
            trackPoints={trackPoints}
            waypoints={waypoints}
            currentPosition={currentPosition}
            isRecording={isRecording}
            highlightedPointIndex={scrubberIndex}
            highContrast={settings.highContrastMode}
          />
        ) : (
          <LeafletMapRenderer
            trackPoints={trackPoints}
            waypoints={waypoints}
            currentPosition={currentPosition}
            isRecording={isRecording}
            highlightedPointIndex={scrubberIndex}
          />
        )}

        {/* Collapsible Elevation Profile Drawer (Only when user has recorded points) */}
        {trackPoints.length >= 2 && (
          <div className="absolute left-3 right-3 sm:left-4 sm:right-auto sm:w-96 bottom-3 sm:bottom-4 z-20 transition-all duration-300">
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-t-xl backdrop-blur-md">
              <span className="text-[11px] font-mono font-semibold text-slate-300 uppercase tracking-wider">
                Altimetría del Recorrido
              </span>
              <button
                onClick={() => setShowElevationDrawer(!showElevationDrawer)}
                className="text-slate-400 hover:text-slate-100 p-0.5"
              >
                {showElevationDrawer ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>

            {showElevationDrawer && (
              <div className="rounded-b-xl overflow-hidden shadow-2xl border-x border-b border-slate-700/80">
                <ElevationProfile
                  trackPoints={trackPoints}
                  elevationGain={currentRoute?.elevationGain || 0}
                  elevationLoss={currentRoute?.elevationLoss || 0}
                  currentAltitude={currentPosition?.altitude ?? null}
                  onHoverPoint={(idx) => setScrubberIndex(idx)}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Telemetry HUD & Altimeter */}
      <footer className="z-30 shrink-0">
        <TelemetryHUD
          currentRoute={currentRoute}
          currentPosition={currentPosition}
          batteryInfo={batteryInfo}
          batteryProfile={settings.batteryProfile}
          isSimulating={isSimulating}
          onStart={handleStartRecording}
          onPause={pauseRecording}
          onResume={resumeRecording}
          onFinish={handleFinishRecording}
          onOpenWaypointModal={() => setIsWaypointModalOpen(true)}
          onToggleMapMode={handleToggleMapMode}
          mapType={settings.mapType}
        />
      </footer>

      {/* Modals */}
      <AddWaypointModal
        isOpen={isWaypointModalOpen}
        onClose={() => setIsWaypointModalOpen(false)}
        onSave={addWaypoint}
        currentPosition={currentPosition}
      />

      <RouteHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          refreshRouteCount();
        }}
        onSelectRoute={loadRouteDetails}
        currentRouteId={currentRoute?.id}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        batteryInfo={batteryInfo}
      />
    </div>
  );
}
