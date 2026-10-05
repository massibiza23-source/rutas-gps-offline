/**
 * Real Route 3D Viewer (Three.js WebGL)
 * Visualizes the user's actual recorded GPS track in full 3D with:
 * - Configurable 3D line thickness (Fina, Normal, Gruesa, Tubo 3D)
 * - Vertical elevation exaggeration slider (1x, 1.8x, 3x, 5x)
 * - Color schemes: Altitude Gradient, Tactical Neon, Electric Cyan, Sunset Fire
 * - Terrain drop curtains and 2D ground projection shadows
 * - Start / Live GPS beacons and 3D Waypoints
 * - Orbit, Top-Down, and Side Elevation profile camera modes
 * - Fullscreen toggle for immersive spatial inspection
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { TrackPoint, Waypoint, CurrentPositionState, Route3DLineSettings, Route3DColorScheme } from '../types/gps';
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
  Sliders,
  Sparkles,
  Eye,
  Check,
  Activity,
} from 'lucide-react';
import { formatDistance } from '../utils/geoUtils';

const DEFAULT_LINE_SETTINGS: Route3DLineSettings = {
  lineWidth: 2.2,
  elevationScale: 1.8,
  colorScheme: 'altitude_gradient',
  showCurtain: true,
  showGroundShadow: true,
  glowIntensity: 0.45,
};

const SAMPLE_TRAIL_POINTS: TrackPoint[] = [
  { id: 'p1', routeId: 'demo', lat: 42.6000, lng: 0.8500, altitude: 1220, timestamp: 1000, speed: 1.2, accuracy: 4, heading: 45, distanceFromStart: 0, elevationDelta: 0 },
  { id: 'p2', routeId: 'demo', lat: 42.6018, lng: 0.8525, altitude: 1285, timestamp: 2000, speed: 1.3, accuracy: 4, heading: 50, distanceFromStart: 250, elevationDelta: 65 },
  { id: 'p3', routeId: 'demo', lat: 42.6042, lng: 0.8560, altitude: 1370, timestamp: 3000, speed: 1.1, accuracy: 5, heading: 52, distanceFromStart: 590, elevationDelta: 85 },
  { id: 'p4', routeId: 'demo', lat: 42.6065, lng: 0.8595, altitude: 1480, timestamp: 4000, speed: 1.0, accuracy: 4, heading: 55, distanceFromStart: 950, elevationDelta: 110 },
  { id: 'p5', routeId: 'demo', lat: 42.6090, lng: 0.8625, altitude: 1620, timestamp: 5000, speed: 0.9, accuracy: 4, heading: 50, distanceFromStart: 1320, elevationDelta: 140 },
  { id: 'p6', routeId: 'demo', lat: 42.6115, lng: 0.8650, altitude: 1755, timestamp: 6000, speed: 0.8, accuracy: 5, heading: 48, distanceFromStart: 1680, elevationDelta: 135 },
  { id: 'p7', routeId: 'demo', lat: 42.6145, lng: 0.8685, altitude: 1910, timestamp: 7000, speed: 0.7, accuracy: 4, heading: 45, distanceFromStart: 2120, elevationDelta: 155 },
  { id: 'p8', routeId: 'demo', lat: 42.6170, lng: 0.8720, altitude: 2060, timestamp: 8000, speed: 0.8, accuracy: 3, heading: 60, distanceFromStart: 2550, elevationDelta: 150 },
  { id: 'p9', routeId: 'demo', lat: 42.6195, lng: 0.8755, altitude: 2010, timestamp: 9000, speed: 1.2, accuracy: 4, heading: 70, distanceFromStart: 2940, elevationDelta: -50 },
  { id: 'p10', routeId: 'demo', lat: 42.6220, lng: 0.8790, altitude: 1880, timestamp: 10000, speed: 1.4, accuracy: 4, heading: 65, distanceFromStart: 3350, elevationDelta: -130 },
  { id: 'p11', routeId: 'demo', lat: 42.6245, lng: 0.8825, altitude: 1740, timestamp: 11000, speed: 1.5, accuracy: 5, heading: 60, distanceFromStart: 3770, elevationDelta: -140 },
  { id: 'p12', routeId: 'demo', lat: 42.6265, lng: 0.8860, altitude: 1610, timestamp: 12000, speed: 1.3, accuracy: 4, heading: 58, distanceFromStart: 4150, elevationDelta: -130 },
];

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
  const sphericalRef = useRef({ radius: 220, theta: Math.PI / 4, phi: Math.PI / 3.2 });
  const targetRef = useRef(new THREE.Vector3(0, 0, 0));

  const [cameraMode, setCameraMode] = useState<'orbit_3d' | 'top_down' | 'profile'>('orbit_3d');
  const [showLineSettings, setShowLineSettings] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Active points to render (real if available, or sample preview)
  const activePoints = trackPoints.length > 0 ? trackPoints : (previewMode ? SAMPLE_TRAIL_POINTS : []);

  // Load saved 3D line settings from localStorage
  const [lineSettings, setLineSettings] = useState<Route3DLineSettings>(() => {
    try {
      const saved = localStorage.getItem('rutagps_3d_line_settings');
      return saved ? { ...DEFAULT_LINE_SETTINGS, ...JSON.parse(saved) } : DEFAULT_LINE_SETTINGS;
    } catch {
      return DEFAULT_LINE_SETTINGS;
    }
  });

  const updateLineSettings = (partial: Partial<Route3DLineSettings>) => {
    setLineSettings((prev) => {
      const updated = { ...prev, ...partial };
      try {
        localStorage.setItem('rutagps_3d_line_settings', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Stats calculation
  const stats = useMemo(() => {
    if (activePoints.length === 0) {
      const fallbackAlt = currentPosition?.altitude !== null && currentPosition?.altitude !== undefined
        ? Math.round(currentPosition.altitude)
        : 450;
      return {
        pointCount: 0,
        minAlt: fallbackAlt,
        maxAlt: fallbackAlt,
        altDiff: 0,
      };
    }

    let min = Infinity;
    let max = -Infinity;
    activePoints.forEach((p) => {
      const alt = p.altitude || 0;
      if (alt < min) min = alt;
      if (alt > max) max = alt;
    });

    if (min === Infinity) min = 0;
    if (max === -Infinity) max = 0;

    return {
      pointCount: activePoints.length,
      minAlt: Math.round(min),
      maxAlt: Math.round(max),
      altDiff: Math.round(max - min),
    };
  }, [activePoints, currentPosition]);

  // Center view
  const resetView = useCallback(() => {
    sphericalRef.current = { radius: 220, theta: Math.PI / 4, phi: Math.PI / 3.2 };
    setCameraMode('orbit_3d');
  }, []);

  // Update camera mode presets
  const handleSetCameraMode = (mode: 'orbit_3d' | 'top_down' | 'profile') => {
    setCameraMode(mode);
    if (mode === 'top_down') {
      sphericalRef.current.phi = 0.05; // Zenithal view
    } else if (mode === 'profile') {
      sphericalRef.current.phi = Math.PI / 2 - 0.04; // Side elevation view
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
    scene.fog = new THREE.FogExp2(0x060913, 0.0016);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 6000);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // Clear previous children
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 1.5);
    dirLight1.position.set(200, 400, 200);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x10b981, 1.2);
    dirLight2.position.set(-200, 300, -200);
    scene.add(dirLight2);

    // 5. Convert Track Points to Metric Coordinates centered around bounding box
    if (activePoints.length > 0) {
      let minLat = Infinity,
        maxLat = -Infinity;
      let minLng = Infinity,
        maxLng = -Infinity;
      let minAlt = Infinity,
        maxAlt = -Infinity;

      activePoints.forEach((pt) => {
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

      const metersPerLat = 111320;
      const metersPerLng = 111320 * Math.cos((centerLat * Math.PI) / 180);

      // Custom vertical exaggeration from lineSettings
      const altScale = lineSettings.elevationScale;

      const points3D: THREE.Vector3[] = activePoints.map((pt) => {
        const x = (pt.lng - centerLng) * metersPerLng;
        const z = -(pt.lat - centerLat) * metersPerLat; // North is -Z in Three.js
        const y = ((pt.altitude || minAlt) - baseAlt) * altScale;
        return new THREE.Vector3(x, y, z);
      });

      // Fit camera radius to route extent
      let maxDistFromOrigin = 100;
      points3D.forEach((p) => {
        const d = Math.sqrt(p.x * p.x + p.z * p.z);
        if (d > maxDistFromOrigin) maxDistFromOrigin = d;
      });

      sphericalRef.current.radius = Math.max(90, maxDistFromOrigin * 2.3);

      // 5.1 Base Grid Ground Plane
      const gridSize = Math.max(350, maxDistFromOrigin * 2.8);
      const gridHelper = new THREE.GridHelper(gridSize, 34, 0x1e293b, 0x0f172a);
      gridHelper.position.y = -2;
      scene.add(gridHelper);

      // 5.2 3D Route Line / Tubular Extrusion
      if (points3D.length >= 2) {
        const curve = new THREE.CatmullRomCurve3(points3D);
        curve.curveType = 'centripetal';
        curve.tension = 0.5;

        // Tube geometry with user-defined lineWidth radius
        const tubularSegments = Math.max(64, points3D.length * 4);
        const tubeGeom = new THREE.TubeGeometry(
          curve,
          tubularSegments,
          lineSettings.lineWidth,
          10,
          false
        );

        // Apply Color Scheme
        const count = tubeGeom.attributes.position.count;
        const colors = new Float32Array(count * 3);
        const posAttr = tubeGeom.attributes.position;
        const maxY = (maxAlt - minAlt) * altScale || 1;

        for (let i = 0; i < count; i++) {
          const y = posAttr.getY(i);
          const t = Math.max(0, Math.min(1, y / maxY));

          let c = new THREE.Color();
          if (lineSettings.colorScheme === 'neon_emerald') {
            c.setHex(0x10b981);
          } else if (lineSettings.colorScheme === 'cyan_laser') {
            c.setHex(0x06b6d4);
          } else if (lineSettings.colorScheme === 'sunset_fire') {
            c.setRGB(1.0, 0.3 + 0.5 * t, 0.05);
          } else {
            // Altitude gradient
            const lowColor = new THREE.Color(0x06b6d4); // Cyan in valleys
            const midColor = new THREE.Color(0x10b981); // Emerald mid
            const highColor = new THREE.Color(0xf59e0b); // Amber peaks
            c = t < 0.5 ? lowColor.clone().lerp(midColor, t * 2) : midColor.clone().lerp(highColor, (t - 0.5) * 2);
          }

          colors[i * 3] = c.r;
          colors[i * 3 + 1] = c.g;
          colors[i * 3 + 2] = c.b;
        }

        tubeGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const tubeMat = new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.18,
          metalness: 0.35,
          emissive: lineSettings.colorScheme === 'neon_emerald' ? 0x059669 : 0x0284c7,
          emissiveIntensity: lineSettings.glowIntensity,
        });

        const tubeMesh = new THREE.Mesh(tubeGeom, tubeMat);
        scene.add(tubeMesh);

        // 5.3 2D Ground Shadow Projection (if enabled)
        if (lineSettings.showGroundShadow) {
          const shadowPoints = points3D.map((p) => new THREE.Vector3(p.x, 0.2, p.z));
          const shadowCurve = new THREE.CatmullRomCurve3(shadowPoints);
          const shadowGeom = new THREE.TubeGeometry(shadowCurve, tubularSegments, lineSettings.lineWidth * 0.55, 6, false);
          const shadowMat = new THREE.MeshBasicMaterial({
            color: 0x1e293b,
            transparent: true,
            opacity: 0.7,
          });
          const shadowMesh = new THREE.Mesh(shadowGeom, shadowMat);
          scene.add(shadowMesh);
        }

        // 5.4 Vertical Drop Curtains to ground reference plane (if enabled)
        if (lineSettings.showCurtain) {
          const curtainPositions: number[] = [];
          const step = Math.max(1, Math.floor(points3D.length / 50));

          for (let i = 0; i < points3D.length; i += step) {
            const pt = points3D[i];
            curtainPositions.push(pt.x, pt.y, pt.z);
            curtainPositions.push(pt.x, 0, pt.z);
          }

          const curtainGeom = new THREE.BufferGeometry();
          curtainGeom.setAttribute('position', new THREE.Float32BufferAttribute(curtainPositions, 3));
          const curtainMat = new THREE.LineBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.28,
          });
          const curtainLines = new THREE.LineSegments(curtainGeom, curtainMat);
          scene.add(curtainLines);
        }
      }

      // 5.5 START Marker (Green Pillar & Sphere)
      const startPt = points3D[0];
      const startGroup = new THREE.Group();
      startGroup.position.copy(startPt);

      const startSphereGeom = new THREE.SphereGeometry(3.6, 16, 16);
      const startSphereMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 0.7,
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

      // 5.6 END / CURRENT Position Marker
      const endPt = points3D[points3D.length - 1];
      const endGroup = new THREE.Group();
      endGroup.position.copy(endPt);

      const isLiveTracking = isRecording;
      const endColor = isLiveTracking ? 0x38bdf8 : 0xef4444;

      const endSphereGeom = new THREE.SphereGeometry(4.2, 16, 16);
      const endSphereMat = new THREE.MeshStandardMaterial({
        color: endColor,
        emissive: endColor,
        emissiveIntensity: 0.85,
      });
      endGroup.add(new THREE.Mesh(endSphereGeom, endSphereMat));

      const endPoleGeom = new THREE.CylinderGeometry(0.6, 0.6, endPt.y, 8);
      const endPoleMat = new THREE.MeshBasicMaterial({ color: endColor, transparent: true, opacity: 0.6 });
      const endPole = new THREE.Mesh(endPoleGeom, endPoleMat);
      endPole.position.y = -endPt.y / 2;
      endGroup.add(endPole);

      const endRingGeom = new THREE.RingGeometry(3, 8, 24);
      endRingGeom.rotateX(-Math.PI / 2);
      const endRingMat = new THREE.MeshBasicMaterial({ color: endColor, side: THREE.DoubleSide });
      const endRing = new THREE.Mesh(endRingGeom, endRingMat);
      endRing.position.y = -endPt.y;
      endGroup.add(endRing);

      scene.add(endGroup);

      // 5.7 Waypoints in 3D Space
      waypoints.forEach((wp) => {
        const wpX = (wp.lng - centerLng) * metersPerLng;
        const wpZ = -(wp.lat - centerLat) * metersPerLat;
        const wpY = ((wp.altitude || minAlt) - baseAlt) * altScale;

        const wpGroup = new THREE.Group();
        wpGroup.position.set(wpX, wpY, wpZ);

        const wpPinGeom = new THREE.ConeGeometry(2.6, 6.5, 8);
        wpPinGeom.rotateX(Math.PI);
        const wpPinMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xb45309 });
        wpGroup.add(new THREE.Mesh(wpPinGeom, wpPinMat));

        scene.add(wpGroup);
      });
    } else {
      // Default empty grid
      const gridHelper = new THREE.GridHelper(200, 20, 0x1e293b, 0x0f172a);
      scene.add(gridHelper);
    }

    // 6. Animation Loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

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
  }, [activePoints, waypoints, isRecording, lineSettings]);

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
    sphericalRef.current.phi = Math.max(0.04, Math.min(Math.PI / 2 - 0.02, sphericalRef.current.phi - deltaY * 0.007));

    previousMousePositionRef.current = { x: clientX, y: clientY };
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    sphericalRef.current.radius = Math.max(30, Math.min(850, sphericalRef.current.radius + e.deltaY * 0.28));
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

      {/* Floating Preview Active Pill */}
      {previewMode && trackPoints.length === 0 && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-950/90 border border-teal-500/50 shadow-2xl backdrop-blur-md text-xs font-mono text-teal-300">
          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
          <span>Trazado de Prueba 3D activo para calibrar línea</span>
          <button
            onClick={() => setPreviewMode(false)}
            className="ml-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-[10px]"
          >
            Quitar
          </button>
        </div>
      )}

      {/* Empty State Banner (When 0 points recorded & not in preview) */}
      {trackPoints.length === 0 && !previewMode && (
        <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none z-20">
          <div className="bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 max-w-md text-center shadow-2xl backdrop-blur-xl pointer-events-auto flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-950/80 border border-teal-500/40 text-teal-400 flex items-center justify-center">
              <Mountain className="w-6 h-6" />
            </div>

            <h3 className="text-base sm:text-lg font-black text-slate-100">
              Línea del Recorrido 3D
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              La línea 3D se traza a medida que avanzas con el GPS activo, proyectando tu altitud en metros, desniveles y balizas en el espacio tridimensional.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-2 mt-2 w-full">
              {onStartRecording && !isRecording && (
                <button
                  onClick={onStartRecording}
                  className="flex-1 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-950 active:scale-95 transition cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Iniciar Grabación</span>
                </button>
              )}

              <button
                onClick={() => setPreviewMode(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-teal-300 font-bold text-xs border border-slate-700 active:scale-95 transition cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Probar Línea 3D</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Left: Real Elevation & Track 3D Telemetry */}
      {activePoints.length > 0 && (
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 pointer-events-none">
          <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-2xl p-3 shadow-2xl flex flex-col gap-1.5 font-mono text-xs">
            <div className="flex items-center gap-2 text-slate-400 font-sans font-bold uppercase text-[10px] tracking-wider border-b border-slate-800/80 pb-1">
              <Mountain className="w-3.5 h-3.5 text-teal-400" />
              <span>Relieve 3D de tu Ruta</span>
            </div>

            <div className="flex items-center justify-between gap-4 text-xs pt-0.5">
              <span className="text-slate-400 text-[11px] font-sans">Puntos 3D:</span>
              <span className="text-emerald-400 font-bold">{stats.pointCount}</span>
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
              <span className="text-slate-400 text-[11px] font-sans">Desnivel 3D:</span>
              <span className="text-teal-400 font-bold">+{stats.altDiff} m</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Right: Camera Modes, 3D Line Customizer, and Fullscreen Trigger */}
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

        {/* 3D Line Customizer Dropdown Toggle */}
        <button
          onClick={() => setShowLineSettings(!showLineSettings)}
          title="Ajustar grosor, relieve y estilo de la línea 3D"
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
            showLineSettings
              ? 'bg-teal-600 text-white border-teal-400'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-teal-300" />
          <span className="hidden sm:inline">Línea 3D</span>
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

      {/* Floating 3D Line Settings Popover */}
      {showLineSettings && (
        <div className="absolute top-16 right-4 z-30 w-72 sm:w-80 bg-slate-900/98 border border-slate-700 rounded-3xl p-4 shadow-2xl backdrop-blur-xl flex flex-col gap-3.5 animate-fade-in text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-100">
              <Sliders className="w-4 h-4 text-teal-400" />
              <span>Personalizar Línea 3D</span>
            </div>
            <button
              onClick={() => setShowLineSettings(false)}
              className="text-slate-400 hover:text-white text-xs font-mono"
            >
              Cerrar
            </button>
          </div>

          {/* 1. Line Width Stepper */}
          <div className="flex flex-col gap-1.5">
            <span className="text-slate-300 font-bold">Grosor de la Línea del Recorrido:</span>
            <div className="grid grid-cols-4 gap-1">
              {[
                { label: 'Fina', val: 1.2 },
                { label: 'Normal', val: 2.2 },
                { label: 'Gruesa', val: 3.8 },
                { label: 'Tubo 3D', val: 5.5 },
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => updateLineSettings({ lineWidth: opt.val })}
                  className={`py-1.5 rounded-xl font-bold transition text-[11px] ${
                    lineSettings.lineWidth === opt.val
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Vertical Elevation Exaggeration */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-slate-300 font-bold">
              <span>Exageración de Relieve:</span>
              <span className="text-teal-400 font-mono">{lineSettings.elevationScale}x</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[
                { label: '1.0x Real', val: 1.0 },
                { label: '1.8x', val: 1.8 },
                { label: '3.0x', val: 3.0 },
                { label: '4.5x Alta', val: 4.5 },
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => updateLineSettings({ elevationScale: opt.val })}
                  className={`py-1.5 rounded-xl font-bold transition text-[11px] ${
                    lineSettings.elevationScale === opt.val
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Color Scheme */}
          <div className="flex flex-col gap-1.5">
            <span className="text-slate-300 font-bold">Paleta de Color de la Línea:</span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'altitude_gradient', label: 'Gradiente Cota' },
                { id: 'neon_emerald', label: 'Neón Esmeralda' },
                { id: 'cyan_laser', label: 'Láser Cian' },
                { id: 'sunset_fire', label: 'Fuego Puesta de Sol' },
              ].map((scheme) => (
                <button
                  key={scheme.id}
                  onClick={() => updateLineSettings({ colorScheme: scheme.id as Route3DColorScheme })}
                  className={`py-1.5 px-2 rounded-xl text-left font-bold transition text-[11px] flex items-center justify-between ${
                    lineSettings.colorScheme === scheme.id
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span className="truncate">{scheme.label}</span>
                  {lineSettings.colorScheme === scheme.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Toggles: Curtain & Shadow */}
          <div className="flex flex-col gap-2 pt-1 border-t border-slate-800">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-300">Cortina de Caída al Suelo</span>
              <input
                type="checkbox"
                checked={lineSettings.showCurtain}
                onChange={(e) => updateLineSettings({ showCurtain: e.target.checked })}
                className="w-4 h-4 accent-teal-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-300">Sombra / Planta 2D en Base</span>
              <input
                type="checkbox"
                checked={lineSettings.showGroundShadow}
                onChange={(e) => updateLineSettings({ showGroundShadow: e.target.checked })}
                className="w-4 h-4 accent-teal-500 rounded"
              />
            </label>
          </div>
        </div>
      )}

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
            sphericalRef.current.radius = Math.min(850, sphericalRef.current.radius * 1.22);
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
      {activePoints.length > 0 && (
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
