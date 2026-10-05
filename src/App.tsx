/**
 * RutaGPS & SpeleoTrack 3D
 * Subterranean 3D Cave Mapping & Offline GPS Tracker
 * Supports both subterranean 3D Dead Reckoning (No GPS/Cellular) and outdoor surface GPS tracking.
 */

import React, { useState, useEffect, useRef } from 'react';
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
import { Cave3DViewer } from './components/Cave3DViewer';
import { SpeleoHUD } from './components/SpeleoHUD';
import { StationModal } from './components/StationModal';
import { PRDViewer } from './components/PRDViewer';
import { ActivityType } from './types/gps';
import {
  CaveStation,
  CaveSurveyData,
  SensorTelemetry,
  SpeleoThemeMode,
  ViewportCameraMode,
} from './types/speleo';
import {
  SAMPLE_CAVE_SURVEY,
  calculateBarometricDepth,
  calculatePressureAtDepth,
  calculateStrideLength,
} from './services/sensorFusionService';
import {
  Compass,
  Sliders,
  FolderOpen,
  Box,
  Map as MapIcon,
  BookOpen,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Bike,
  Footprints,
  ShieldAlert,
  Flame,
  CheckCircle2,
  TrendingDown,
} from 'lucide-react';

export default function App() {
  // Navigation Mode: 'caving_3d' (Subterráneo sin GPS) vs 'outdoor_gps' (Superficie)
  const [appMode, setAppMode] = useState<'caving_3d' | 'outdoor_gps'>('caving_3d');

  // --- Speleology 3D State ---
  const [survey, setSurvey] = useState<CaveSurveyData>(SAMPLE_CAVE_SURVEY);
  const [selectedStation, setSelectedStation] = useState<CaveStation>(SAMPLE_CAVE_SURVEY.stations[SAMPLE_CAVE_SURVEY.stations.length - 1]);
  const [speleoTheme, setSpeleoTheme] = useState<SpeleoThemeMode>('dark_tactical');
  const [cameraMode, setCameraMode] = useState<ViewportCameraMode>('orbit_3d');
  const [isStationModalOpen, setIsStationModalOpen] = useState(false);
  const [isPRDModalOpen, setIsPRDModalOpen] = useState(false);
  const [isSOSEnabled, setIsSOSEnabled] = useState(false);

  // Speleo Sensor Fusion Telemetry
  const [telemetry, setTelemetry] = useState<SensorTelemetry>({
    stepCount: 1420,
    strideLengthMeters: 0.65,
    currentDepthMeters: -312.0,
    surfacePressureHpa: 1013.25,
    currentPressureHpa: 1051.8,
    temperatureC: 10.2,
    azimuthDeg: 28,
    pitchDeg: -12,
    rollDeg: 3,
    accelMagnitude: 9.81,
    confidenceLevel: 94,
    batteryRemainingHours: 21,
  });

  // Simulated underground movement tick
  useEffect(() => {
    if (appMode !== 'caving_3d') return;

    const interval = setInterval(() => {
      setTelemetry((prev) => {
        const jitterAzimuth = (Math.random() - 0.5) * 2;
        const jitterPitch = (Math.random() - 0.5) * 1.5;
        const currentP = calculatePressureAtDepth(prev.currentDepthMeters, prev.surfacePressureHpa, prev.temperatureC);

        return {
          ...prev,
          azimuthDeg: (prev.azimuthDeg + jitterAzimuth + 360) % 360,
          pitchDeg: Math.max(-90, Math.min(90, prev.pitchDeg + jitterPitch)),
          currentPressureHpa: currentP,
          accelMagnitude: 9.8 + (Math.random() - 0.5) * 0.4,
        };
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [appMode]);

  // Handle Station Add
  const handleSaveStation = (stPartial: Partial<CaveStation>) => {
    const lastSt = survey.stations[survey.stations.length - 1];
    const newIndex = survey.stations.length;
    const radAzimuth = (telemetry.azimuthDeg * Math.PI) / 180;
    const distance = 18 + Math.random() * 8;

    const newX = lastSt.x + distance * Math.sin(radAzimuth);
    const newY = lastSt.y + distance * Math.cos(radAzimuth);
    const newZ = telemetry.currentDepthMeters;

    const newStation: CaveStation = {
      id: `st_${newIndex}`,
      name: stPartial.name || `E${newIndex}`,
      x: newX,
      y: newY,
      z: newZ,
      width: stPartial.width || 4,
      height: stPartial.height || 3.5,
      type: stPartial.type || 'chamber',
      timestamp: Date.now(),
      notes: stPartial.notes || '',
      pressureHpa: telemetry.currentPressureHpa,
      temperatureC: telemetry.temperatureC,
      azimuthDeg: telemetry.azimuthDeg,
      inclinationDeg: telemetry.pitchDeg,
    };

    const updatedStations = [...survey.stations, newStation];
    setSurvey({
      ...survey,
      totalLengthMeters: survey.totalLengthMeters + Math.round(distance),
      maxDepthMeters: Math.max(survey.maxDepthMeters, Math.abs(newZ)),
      stations: updatedStations,
    });
    setSelectedStation(newStation);
  };

  const handleCalibrateZeroDepth = () => {
    setTelemetry((prev) => ({
      ...prev,
      surfacePressureHpa: prev.currentPressureHpa,
      currentDepthMeters: 0.0,
    }));
  };

  // --- Outdoor GPS Tracker Hook ---
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
    startSimulation,
    stopSimulation,
    loadRouteDetails,
    updateSettings,
  } = useGPSTracker();

  // Outdoor GPS Modals state
  const [isWaypointModalOpen, setIsWaypointModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [showSimMenu, setShowSimMenu] = useState(false);
  const [showElevationDrawer, setShowElevationDrawer] = useState(true);
  const [scrubberIndex, setScrubberIndex] = useState<number | null>(null);

  // New route form state
  const [routeTitle, setRouteTitle] = useState('Sendero al Aire Libre');
  const [selectedActivity, setSelectedActivity] = useState<ActivityType>('hiking');

  return (
    <div
      className={`relative w-screen h-screen flex flex-col overflow-hidden select-none touch-manipulation ${
        speleoTheme === 'red_lamp'
          ? 'bg-black text-red-500'
          : speleoTheme === 'amber_high_contrast'
          ? 'bg-black text-amber-400'
          : 'bg-slate-950 text-slate-100'
      }`}
    >
      {/* Offline Status Badge */}
      <OfflineIndicator />

      {/* Emergency Underground SOS Strobe Overlay */}
      {isSOSEnabled && (
        <div
          onClick={() => setIsSOSEnabled(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-red-600 animate-ping opacity-90 cursor-pointer p-4 text-center"
        >
          <div className="bg-black/90 p-8 rounded-3xl border-4 border-white text-white font-mono text-2xl font-black">
            🚨 SEÑAL SOS SUBTERRÁNEA ACTIVA 🚨
            <p className="text-sm font-sans mt-2 font-normal">Toca la pantalla para desactivar</p>
          </div>
        </div>
      )}

      {/* Main Top Header */}
      <header className="h-14 sm:h-16 px-3 sm:px-4 bg-slate-900/90 border-b border-white/10 backdrop-blur-xl flex items-center justify-between z-30 select-none">
        {/* Brand & Mode Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-sky-700 flex items-center justify-center shadow-lg shadow-emerald-950/60 shrink-0">
            {appMode === 'caving_3d' ? (
              <Box className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            ) : (
              <Compass className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-xs sm:text-sm tracking-wide truncate max-w-[140px] sm:max-w-[220px]">
                {appMode === 'caving_3d' ? 'Mapeo 3D de Cuevas' : 'RutaGPS Superficie'}
              </h1>

              {appMode === 'caving_3d' && (
                <span className="px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-500/40 text-rose-400 text-[9px] font-mono font-bold uppercase">
                  Sin GPS
                </span>
              )}
            </div>

            <p className="text-[10px] sm:text-[11px] opacity-60 font-mono">
              {appMode === 'caving_3d'
                ? 'Rastreo Inercial & Barometría 100% Offline'
                : 'Cartografía Vectorial con Caché'}
            </p>
          </div>
        </div>

        {/* Center Mode Switcher Tabs */}
        <div className="flex items-center bg-slate-950/80 p-1 rounded-2xl border border-white/10 shadow-inner">
          <button
            onClick={() => setAppMode('caving_3d')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              appMode === 'caving_3d'
                ? 'bg-sky-500 text-white shadow-md'
                : 'opacity-60 hover:opacity-100'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cueva 3D</span>
          </button>

          <button
            onClick={() => setAppMode('outdoor_gps')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              appMode === 'outdoor_gps'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'opacity-60 hover:opacity-100'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">GPS Senderos</span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {appMode === 'caving_3d' ? (
            <button
              onClick={() => setIsPRDModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-950/80 border border-sky-500/50 text-sky-300 font-bold text-xs hover:bg-sky-900/80 transition cursor-pointer shadow-md"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Ver PRD & Diseño</span>
            </button>
          ) : (
            <>
              {/* Simulator Launcher */}
              <button
                onClick={() => setShowSimMenu(!showSimMenu)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden md:inline">Simular</span>
              </button>

              <button
                onClick={() => setIsHistoryModalOpen(true)}
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5"
              >
                <FolderOpen className="w-4 h-4 text-emerald-400" />
                <span className="hidden lg:inline">Historial</span>
              </button>
            </>
          )}

          <PWAInstallButton />
        </div>
      </header>

      {/* Main Viewport Content */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        {appMode === 'caving_3d' ? (
          /* CAVE 3D SUBTERRANEAN VIEWPORT */
          <Cave3DViewer
            survey={survey}
            activeStationId={selectedStation?.id}
            onSelectStation={(st) => setSelectedStation(st)}
            themeMode={speleoTheme}
            cameraMode={cameraMode}
            onChangeCameraMode={(m) => setCameraMode(m)}
            liveDepth={telemetry.currentDepthMeters}
          />
        ) : (
          /* SURFACE GPS VIEWPORT */
          <>
            {settings.mapType === 'vector_canvas' ? (
              <VectorCanvasMap
                trackPoints={trackPoints}
                waypoints={waypoints}
                currentPosition={currentPosition}
                isRecording={currentRoute?.status === 'recording'}
                highlightedPointIndex={scrubberIndex}
                highContrast={settings.highContrastMode}
              />
            ) : (
              <LeafletMapRenderer
                trackPoints={trackPoints}
                waypoints={waypoints}
                currentPosition={currentPosition}
                isRecording={currentRoute?.status === 'recording'}
                highlightedPointIndex={scrubberIndex}
              />
            )}

            {/* Elevation Profile Drawer */}
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
          </>
        )}
      </main>

      {/* Bottom Telemetry HUD */}
      <footer className="z-30 shrink-0">
        {appMode === 'caving_3d' ? (
          <SpeleoHUD
            telemetry={telemetry}
            themeMode={speleoTheme}
            onChangeThemeMode={(m) => setSpeleoTheme(m)}
            onOpenStationModal={() => setIsStationModalOpen(true)}
            onOpenPRDModal={() => setIsPRDModalOpen(true)}
            onCalibrateZeroDepth={handleCalibrateZeroDepth}
            onToggleSOS={() => setIsSOSEnabled(!isSOSEnabled)}
            isSOSEnabled={isSOSEnabled}
          />
        ) : (
          <TelemetryHUD
            currentRoute={currentRoute}
            currentPosition={currentPosition}
            batteryInfo={batteryInfo}
            batteryProfile={settings.batteryProfile}
            isSimulating={isSimulating}
            onStart={() => startRecording(routeTitle, selectedActivity)}
            onPause={pauseRecording}
            onResume={resumeRecording}
            onFinish={finishRecording}
            onOpenWaypointModal={() => setIsWaypointModalOpen(true)}
            onToggleMapMode={() =>
              updateSettings({
                mapType: settings.mapType === 'vector_canvas' ? 'leaflet_osm' : 'vector_canvas',
              })
            }
            mapType={settings.mapType}
          />
        )}
      </footer>

      {/* Modals */}
      <StationModal
        isOpen={isStationModalOpen}
        onClose={() => setIsStationModalOpen(false)}
        onSave={handleSaveStation}
        telemetry={telemetry}
        stationCount={survey.stations.length}
      />

      <PRDViewer
        isOpen={isPRDModalOpen}
        onClose={() => setIsPRDModalOpen(false)}
      />

      <AddWaypointModal
        isOpen={isWaypointModalOpen}
        onClose={() => setIsWaypointModalOpen(false)}
        onSave={addWaypoint}
        currentPosition={currentPosition}
      />

      <RouteHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
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
