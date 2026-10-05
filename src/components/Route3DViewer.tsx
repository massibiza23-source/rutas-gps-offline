/**
 * Real Route 3D Viewer (Three.js WebGL)
 * Visualizes the user's actual recorded GPS track in full 3D with true elevation,
 * 3D ribbon trajectory, terrain drop curtains, waypoints, live GPS beacon,
 * and intuitive 3D orbit / elevation profile camera controls.
 * ZERO mock/demo data — 100% powered by real track points from the GPS tracker.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { TrackPoint, Waypoint, CurrentPositionState } from '../types/gps';
import {
  RotateCcw,
  Compass,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Mountain,
  Play,
  Layers,
  MapPin,
} from 'lucide-react';
import { formatDistance } from '../utils/geoUtils';

interface Route3DViewerProps {
  trackPoints: TrackPoint[];
  waypoints: Waypoint[];
  currentPosition: CurrentPositionState | null;
  isRecording: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onStartRecording?: () => void;
}

export const Route3DViewer: React.FC<Route3DViewerProps> = ({
  trackPoints,
  waypoints,
  currentPosition,
  isRecording,
  isFullscreen = false,
  onToggleFullscreen,
  onStartRecording,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Orbit controls state
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const sphericalRef = useRef({ radius: 200, theta: Math.PI / 4, phi: Math.PI / 3.2 });
  const targetRef = useRef(new THREE.Vector3(0, 0, 0));

  const [cameraMode, setCameraMode] = useState<'orbit_3d' | 'top_down' | 'profile'>('orbit_3d');
  const [hoveredWaypoint, setHoveredWaypoint] = useState<Waypoint | null>(null);

  // Stats for the HUD
  const stats = React.useMemo(() => {
    if (trackPoints.length === 0) {
      return {
        pointCount: 0,
        minAlt: currentPosition?.altitude !== null && currentPosition?.altitude !== undefined ? Math.round(currentPosition.altitude) : 0,
        maxAlt: currentPosition?.altitude !== null && currentPosition?.altitude !== undefined ? Math.round(currentPosition.altitude) : 0,
        altDiff: 0,
        totalDist: 0,
      };
    }

    let min = Infinity;
    let max = -Infinity;
    trackPoints.forEach((p) => {
      const alt = p.altitude || 0;
      if (alt < min) min = alt;
      if (alt > max) max = alt;
    });

    if (min === Infinity) min = 0;
    if (max === -Infinity) max = 0;

    return {
      pointCount: trackPoints.length,
      minAlt: Math.round(min),
      maxAlt: Math.round(max),
      altDiff: Math.round(max - min),
      totalDist: 0,
    };
  }, [trackPoints, currentPosition]);

  // Center view
  const resetView = useCallback(() => {
    sphericalRef.current = { radius: 200, theta: Math.PI / 4, phi: Math.PI / 3.2 };
    setCameraMode('orbit_3d');
  }, []);

  // Update camera mode presets
  const handleSetCameraMode = (mode: 'orbit_3d' | 'top_down' | 'profile') => {
    setCameraMode(mode);
    if (mode === 'top_down') {
      sphericalRef.current.phi = 0.05; // Looking directly down
    } else if (mode === 'profile') {
      sphericalRef.current.phi = Math.PI / 2 - 0.05; // Flat side elevation view
      sphericalRef.current.theta = 0;
    } else {
      sphericalRef.current.phi = Math.PI / 3.2;
      sphericalRef.current.theta = Math.PI / 4;
    }
  };

  // Three.js Scene Setup & Geometry Generation
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x060913);
    scene.fog = new THREE.FogExp2(0x060913, 0.0018);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 5000);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // Clear previous children
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 1.4);
    dirLight1.position.set(200, 400, 200);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x10b981, 1.0);
    dirLight2.position.set(-200, 300, -200);
    scene.add(dirLight2);

    // 5. Convert Track Points to Metric Coordinates centered around bounding box
    if (trackPoints.length > 0) {
      // Find bounds and mean center
      let minLat = Infinity,
        maxLat = -Infinity;
      let minLng = Infinity,
        maxLng = -Infinity;
      let minAlt = Infinity,
        maxAlt = -Infinity;

      trackPoints.forEach((pt) => {
        if (pt.lat < minLat) minLat = pt.lat;
        if (pt.lat > maxLat) maxLat = pt.lat;
        if (pt.lng < minLng) minLng = pt.lng;
        if (pt.lng > maxLng) maxLng = pt.lng;
        const alt = pt.altitude || 0;
        if (alt < minAlt) minAlt = alt;
        if (alt > maxAlt) maxAlt = alt;
      });

      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;
      const baseAlt = minAlt;

      // Projection scales
      const metersPerLat = 111320;
      const metersPerLng = 111320 * Math.cos((centerLat * Math.PI) / 180);

      // Exaggerate vertical scale slightly for nice readability in terrain
      const altScale = 1.4;

      const points3D: THREE.Vector3[] = trackPoints.map((pt) => {
        const x = (pt.lng - centerLng) * metersPerLng;
        const z = -(pt.lat - centerLat) * metersPerLat; // North is -Z in Three.js
        const y = ((pt.altitude || minAlt) - baseAlt) * altScale;
        return new THREE.Vector3(x, y, z);
      });

      // Compute bounding box extent to fit camera
      let maxDistFromOrigin = 100;
      points3D.forEach((p) => {
        const d = Math.sqrt(p.x * p.x + p.z * p.z);
        if (d > maxDistFromOrigin) maxDistFromOrigin = d;
      });

      sphericalRef.current.radius = Math.max(80, maxDistFromOrigin * 2.2);

      // 5.1 Base Grid Ground Plane
      const gridSize = Math.max(300, maxDistFromOrigin * 2.6);
      const gridHelper = new THREE.GridHelper(gridSize, 30, 0x1e293b, 0x0f172a);
      gridHelper.position.y = -2;
      scene.add(gridHelper);

      // 5.2 Glowing 3D Track Line / Ribbon
      if (points3D.length >= 2) {
        // Curve
        const curve = new THREE.CatmullRomCurve3(points3D);
        curve.curveType = 'centripetal';
        curve.tension = 0.5;

        // Tube geometry for high-visibility 3D trajectory
        const tubeGeom = new THREE.TubeGeometry(curve, points3D.length * 4, 1.8, 8, false);

        // Vertex color gradient based on altitude
        const count = tubeGeom.attributes.position.count;
        const colors = new Float32Array(count * 3);
        const posAttr = tubeGeom.attributes.position;

        const lowColor = new THREE.Color(0x06b6d4); // Cyan for lower elevation
        const midColor = new THREE.Color(0x10b981); // Emerald for mid
        const highColor = new THREE.Color(0xf59e0b); // Amber for peaks

        const maxY = (maxAlt - minAlt) * altScale || 1;

        for (let i = 0; i < count; i++) {
          const y = posAttr.getY(i);
          const t = Math.max(0, Math.min(1, y / maxY));
          const col = t < 0.5 ? lowColor.clone().lerp(midColor, t * 2) : midColor.clone().lerp(highColor, (t - 0.5) * 2);
          colors[i * 3] = col.r;
          colors[i * 3 + 1] = col.g;
          colors[i * 3 + 2] = col.b;
        }

        tubeGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const tubeMat = new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.2,
          metalness: 0.4,
          emissive: 0x0284c7,
          emissiveIntensity: 0.35,
        });

        const tubeMesh = new THREE.Mesh(tubeGeom, tubeMat);
        scene.add(tubeMesh);

        // 5.3 Vertical Drop Curtains (Ground reference lines down to plane)
        const curtainPositions: number[] = [];
        const curtainColors: number[] = [];
        const step = Math.max(1, Math.floor(points3D.length / 45));

        for (let i = 0; i < points3D.length; i += step) {
          const pt = points3D[i];
          curtainPositions.push(pt.x, pt.y, pt.z);
          curtainPositions.push(pt.x, 0, pt.z);

          // Fading color
          curtainColors.push(0.2, 0.7, 0.9, 0.1, 0.2, 0.3);
        }

        const curtainGeom = new THREE.BufferGeometry();
        curtainGeom.setAttribute('position', new THREE.Float32BufferAttribute(curtainPositions, 3));
        const curtainMat = new THREE.LineBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.25,
        });
        const curtainLines = new THREE.LineSegments(curtainGeom, curtainMat);
        scene.add(curtainLines);
      }

      // 5.4 START Marker (Green Pillar & Sphere)
      const startPt = points3D[0];
      const startGroup = new THREE.Group();
      startGroup.position.copy(startPt);

      // Sphere
      const startSphereGeom = new THREE.SphereGeometry(3.5, 16, 16);
      const startSphereMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 0.6,
      });
      startGroup.add(new THREE.Mesh(startSphereGeom, startSphereMat));

      // Pole to ground
      const poleGeom = new THREE.CylinderGeometry(0.5, 0.5, startPt.y, 8);
      const poleMat = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.5 });
      const pole = new THREE.Mesh(poleGeom, poleMat);
      pole.position.y = -startPt.y / 2;
      startGroup.add(pole);

      // Base ring
      const ringGeom = new THREE.RingGeometry(2, 6, 24);
      ringGeom.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.position.y = -startPt.y;
      startGroup.add(ring);

      scene.add(startGroup);

      // 5.5 END / CURRENT Position Marker
      const endPt = points3D[points3D.length - 1];
      const endGroup = new THREE.Group();
      endGroup.position.copy(endPt);

      const isLiveTracking = isRecording;
      const endColor = isLiveTracking ? 0x38bdf8 : 0xef4444;

      const endSphereGeom = new THREE.SphereGeometry(4, 16, 16);
      const endSphereMat = new THREE.MeshStandardMaterial({
        color: endColor,
        emissive: endColor,
        emissiveIntensity: 0.8,
      });
      endGroup.add(new THREE.Mesh(endSphereGeom, endSphereMat));

      // End Pole to ground
      const endPoleGeom = new THREE.CylinderGeometry(0.6, 0.6, endPt.y, 8);
      const endPoleMat = new THREE.MeshBasicMaterial({ color: endColor, transparent: true, opacity: 0.6 });
      const endPole = new THREE.Mesh(endPoleGeom, endPoleMat);
      endPole.position.y = -endPt.y / 2;
      endGroup.add(endPole);

      // Beacon ring
      const endRingGeom = new THREE.RingGeometry(3, 8, 24);
      endRingGeom.rotateX(-Math.PI / 2);
      const endRingMat = new THREE.MeshBasicMaterial({ color: endColor, side: THREE.DoubleSide });
      const endRing = new THREE.Mesh(endRingGeom, endRingMat);
      endRing.position.y = -endPt.y;
      endGroup.add(endRing);

      scene.add(endGroup);

      // 5.6 Waypoints (Markers in 3D Space)
      waypoints.forEach((wp) => {
        const wpX = (wp.lng - centerLng) * metersPerLng;
        const wpZ = -(wp.lat - centerLat) * metersPerLat;
        const wpY = ((wp.altitude || minAlt) - baseAlt) * altScale;

        const wpGroup = new THREE.Group();
        wpGroup.position.set(wpX, wpY, wpZ);

        const wpPinGeom = new THREE.ConeGeometry(2.5, 6, 8);
        wpPinGeom.rotateX(Math.PI);
        const wpPinMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xb45309 });
        wpGroup.add(new THREE.Mesh(wpPinGeom, wpPinMat));

        scene.add(wpGroup);
      });
    } else {
      // Empty state default grid
      const gridHelper = new THREE.GridHelper(200, 20, 0x1e293b, 0x0f172a);
      scene.add(gridHelper);
    }

    // 6. Animation Loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      // Update camera position from spherical coordinates
      const { radius, theta, phi } = sphericalRef.current;
      camera.position.x = targetRef.current.x + radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = targetRef.current.y + radius * Math.cos(phi);
      camera.position.z = targetRef.current.z + radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(targetRef.current);

      renderer.render(scene, camera);
    };
    animate();

    // 7. Window Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      renderer.dispose();
    };
  }, [trackPoints, waypoints, isRecording]);

  // Touch and Mouse Interaction
  const handlePointerDown = (clientX: number, clientY: number) => {
    isDraggingRef.current = true;
    previousMousePositionRef.current = { x: clientX, y: clientY };
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDraggingRef.current) return;

    const deltaX = clientX - previousMousePositionRef.current.x;
    const deltaY = clientY - previousMousePositionRef.current.y;

    sphericalRef.current.theta -= deltaX * 0.007;
    sphericalRef.current.phi = Math.max(0.05, Math.min(Math.PI / 2 - 0.02, sphericalRef.current.phi - deltaY * 0.007));

    previousMousePositionRef.current = { x: clientX, y: clientY };
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    sphericalRef.current.radius = Math.max(30, Math.min(800, sphericalRef.current.radius + e.deltaY * 0.25));
  };

  return (
    <div
      className="relative w-full h-full select-none overflow-hidden touch-none bg-slate-950"
      onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
      onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={(e) => {
        if (e.touches.length === 1) {
          handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
      onTouchMove={(e) => {
        if (e.touches.length === 1) {
          handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
      onTouchEnd={handlePointerUp}
      onWheel={handleWheel}
    >
      <div ref={mountRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

      {/* Empty State Banner (When 0 points recorded) */}
      {trackPoints.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none z-20">
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 max-w-md text-center shadow-2xl backdrop-blur-xl pointer-events-auto flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
              <Mountain className="w-6 h-6" />
            </div>

            <h3 className="text-base sm:text-lg font-black text-slate-100">
              Visor 3D de Grabación Real
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              No hay puntos grabados en la ruta activa. Inicia la grabación para ver tu travesía real proyectada en 3D con desniveles, relieve y balizas en tiempo real.
            </p>

            {onStartRecording && !isRecording && (
              <button
                onClick={onStartRecording}
                className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-950 active:scale-95 transition cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Iniciar Grabación de Ruta</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top Left: Real Elevation & Track 3D Telemetry */}
      {trackPoints.length > 0 && (
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 pointer-events-none">
          <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-2xl p-3 shadow-2xl flex flex-col gap-1.5 font-mono text-xs">
            <div className="flex items-center gap-2 text-slate-400 font-sans font-bold uppercase text-[10px] tracking-wider border-b border-slate-800/80 pb-1">
              <Mountain className="w-3.5 h-3.5 text-teal-400" />
              <span>Relieve 3D de tu Ruta</span>
            </div>

            <div className="flex items-center justify-between gap-4 text-xs pt-0.5">
              <span className="text-slate-400 text-[11px] font-sans">Puntos 3D:</span>
              <span className="text-emerald-400 font-bold">{stats.pointCount} coordenadas</span>
            </div>

            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="text-slate-400 text-[11px] font-sans">Cota Mínima:</span>
              <span className="text-sky-300 font-bold">{stats.minAlt} msnm</span>
            </div>

            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="text-slate-400 text-[11px] font-sans">Cota Máxima:</span>
              <span className="text-amber-400 font-bold">{stats.maxAlt} msnm</span>
            </div>

            <div className="flex items-center justify-between gap-4 text-xs border-t border-slate-800/80 pt-1">
              <span className="text-slate-400 text-[11px] font-sans">Desnivel Relieve:</span>
              <span className="text-teal-400 font-bold">+{stats.altDiff} m</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Right: Camera Mode Switcher & Fullscreen Trigger */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-xl">
        <button
          onClick={() => handleSetCameraMode('orbit_3d')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            cameraMode === 'orbit_3d'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Órbita 3D
        </button>

        <button
          onClick={() => handleSetCameraMode('top_down')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            cameraMode === 'top_down'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Planta (Zenital)
        </button>

        <button
          onClick={() => handleSetCameraMode('profile')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            cameraMode === 'profile'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Alzado / Perfil
        </button>

        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'Salir de pantalla completa' : 'Ver en pantalla completa'}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer bg-sky-950/90 hover:bg-sky-900 border border-sky-500/50 text-sky-300 shadow-md ml-1"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Salir</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pantalla Completa</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Floating 3D Navigation Controls (Bottom-Right) */}
      <div className="absolute right-4 bottom-6 z-20 flex flex-col gap-2">
        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa 3D'}
            className="w-12 h-12 flex items-center justify-center bg-sky-600 hover:bg-sky-500 text-white rounded-2xl border border-sky-400 shadow-xl active:scale-95 transition cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        )}

        <button
          onClick={() => {
            sphericalRef.current.radius = Math.max(25, sphericalRef.current.radius * 0.82);
          }}
          aria-label="Acercar 3D"
          title="Zoom +"
          className="w-12 h-12 flex items-center justify-center bg-slate-900/95 hover:bg-slate-800 text-emerald-400 rounded-2xl border border-slate-700/80 shadow-lg active:scale-95 transition cursor-pointer"
        >
          <ZoomIn className="w-5 h-5" />
        </button>

        <button
          onClick={() => {
            sphericalRef.current.radius = Math.min(800, sphericalRef.current.radius * 1.22);
          }}
          aria-label="Alejar 3D"
          title="Zoom -"
          className="w-12 h-12 flex items-center justify-center bg-slate-900/95 hover:bg-slate-800 text-emerald-400 rounded-2xl border border-slate-700/80 shadow-lg active:scale-95 transition cursor-pointer"
        >
          <ZoomOut className="w-5 h-5" />
        </button>

        <button
          onClick={resetView}
          aria-label="Restablecer vista 3D"
          title="Centrar y resetear cámara"
          className="w-12 h-12 flex items-center justify-center bg-slate-900/95 hover:bg-slate-800 text-slate-200 rounded-2xl border border-slate-700/80 shadow-lg active:scale-95 transition cursor-pointer"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Legend Card (Bottom-Left) */}
      {trackPoints.length > 0 && (
        <div className="absolute left-4 bottom-6 z-20 pointer-events-none">
          <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-2xl px-3 py-2 shadow-2xl flex items-center gap-3 text-[11px] font-mono">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Inicio</span>
            </div>
            <div className="flex items-center gap-1.5 text-sky-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              <span>{isRecording ? 'Posición GPS' : 'Fin'}</span>
            </div>
            {waypoints.length > 0 && (
              <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>{waypoints.length} Hitos</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
