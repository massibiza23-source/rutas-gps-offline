/**
 * Interactive 3D Subterranean Cave Viewer (Three.js)
 * Visualizes subterranean 3D passage geometry, vertical pitches, chambers,
 * and vector centerlines from entrance (0m) to active front (-312m).
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { CaveStation, CaveSurveyData, SpeleoThemeMode, ViewportCameraMode } from '../types/speleo';
import {
  RotateCcw,
  Compass,
  Layers,
  Eye,
  Maximize2,
  ZoomIn,
  ZoomOut,
  MapPin,
  TrendingDown,
} from 'lucide-react';

interface Cave3DViewerProps {
  survey: CaveSurveyData;
  activeStationId?: string;
  onSelectStation: (station: CaveStation) => void;
  themeMode: SpeleoThemeMode;
  cameraMode: ViewportCameraMode;
  onChangeCameraMode: (mode: ViewportCameraMode) => void;
  liveDepth: number;
}

export const Cave3DViewer: React.FC<Cave3DViewerProps> = ({
  survey,
  activeStationId,
  onSelectStation,
  themeMode,
  cameraMode,
  onChangeCameraMode,
  liveDepth,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Orbit controls state
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const sphericalRef = useRef({ radius: 240, theta: Math.PI / 4, phi: Math.PI / 3 });
  const targetRef = useRef(new THREE.Vector3(100, -100, -140)); // Cave center

  const [hoveredStation, setHoveredStation] = useState<CaveStation | null>(null);

  // Colors based on theme
  const getThemePalette = useCallback(() => {
    if (themeMode === 'red_lamp') {
      return {
        bg: 0x050000,
        grid: 0x330000,
        entrance: 0xff3333,
        tunnelLine: 0xff1a1a,
        tunnelMesh: 0x4a0000,
        stations: 0xff4d4d,
        activeFront: 0xff0000,
        wireframe: 0x660000,
      };
    }
    if (themeMode === 'amber_high_contrast') {
      return {
        bg: 0x000000,
        grid: 0x332200,
        entrance: 0x22c55e,
        tunnelLine: 0xf59e0b,
        tunnelMesh: 0x78350f,
        stations: 0xfbbf24,
        activeFront: 0xef4444,
        wireframe: 0xb45309,
      };
    }
    // Dark Tactical default
    return {
      bg: 0x070b14,
      grid: 0x1e293b,
      entrance: 0x10b981,
      tunnelLine: 0x38bdf8,
      tunnelMesh: 0x0369a1,
      stations: 0x38bdf8,
      activeFront: 0xf43f5e,
      wireframe: 0x0284c7,
    };
  }, [themeMode]);

  // Setup Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const palette = getThemePalette();
    scene.background = new THREE.Color(palette.bg);
    scene.fog = new THREE.FogExp2(palette.bg, 0.0018);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    rendererRef.current = renderer;

    container.replaceChildren(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(150, 200, 100);
    scene.add(dirLight);

    // 1. Surface Reference Ground Grid (Z = 0)
    const surfaceGrid = new THREE.GridHelper(400, 20, palette.grid, palette.grid);
    surfaceGrid.position.set(100, 0, -100);
    scene.add(surfaceGrid);

    // 2. Depth Reference Rulers and Rings (-50m, -100m, -200m, -300m)
    [-50, -100, -200, -300].forEach((depth) => {
      const depthRingGeom = new THREE.RingGeometry(180, 181, 48);
      const depthRingMat = new THREE.MeshBasicMaterial({
        color: palette.grid,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.35,
      });
      const depthRing = new THREE.Mesh(depthRingGeom, depthRingMat);
      depthRing.rotation.x = Math.PI / 2;
      depthRing.position.set(100, depth, -100);
      scene.add(depthRing);
    });

    // 3. Build 3D Tunnel Extrusion and Centerline
    const points3D = survey.stations.map((s) => new THREE.Vector3(s.x, s.z, s.y));

    if (points3D.length >= 2) {
      const curve = new THREE.CatmullRomCurve3(points3D, false, 'centripetal', 0.2);

      // Centerline Core Beam
      const tubeGeom = new THREE.TubeGeometry(curve, 100, 1.2, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: palette.tunnelLine,
        emissive: palette.tunnelLine,
        emissiveIntensity: 0.7,
        roughness: 0.3,
      });
      const tubeMesh = new THREE.Mesh(tubeGeom, tubeMat);
      scene.add(tubeMesh);

      // Volumetric Passage Shell (Tunnel wireframe)
      const outerTubeGeom = new THREE.TubeGeometry(curve, 70, 5.5, 10, false);
      const outerTubeMat = new THREE.MeshStandardMaterial({
        color: palette.tunnelMesh,
        wireframe: true,
        transparent: true,
        opacity: 0.35,
      });
      const outerTubeMesh = new THREE.Mesh(outerTubeGeom, outerTubeMat);
      scene.add(outerTubeMesh);
    }

    // 4. Station Spheres and Features
    survey.stations.forEach((st, index) => {
      const isEntrance = st.type === 'entrance';
      const isEnd = index === survey.stations.length - 1;
      const isPitch = st.type === 'pitch';
      const isChamber = st.type === 'chamber';

      let sphereRadius = 2.4;
      let sphereColor = palette.stations;

      if (isEntrance) {
        sphereRadius = 4.5;
        sphereColor = palette.entrance;
      } else if (isEnd) {
        sphereRadius = 4.2;
        sphereColor = palette.activeFront;
      } else if (isChamber) {
        sphereRadius = 3.8;
      }

      const sphereGeom = new THREE.SphereGeometry(sphereRadius, 16, 16);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: sphereColor,
        emissive: sphereColor,
        emissiveIntensity: 0.6,
      });
      const sphere = new THREE.Mesh(sphereGeom, sphereMat);
      sphere.position.set(st.x, st.z, st.y);
      sphere.userData = { station: st };
      scene.add(sphere);

      // If it's a chamber, add translucent cavern bubble
      if (isChamber) {
        const chamberGeom = new THREE.SphereGeometry(Math.max(12, st.width / 2), 16, 12);
        const chamberMat = new THREE.MeshBasicMaterial({
          color: palette.tunnelMesh,
          wireframe: true,
          transparent: true,
          opacity: 0.18,
        });
        const chamberMesh = new THREE.Mesh(chamberGeom, chamberMat);
        chamberMesh.position.set(st.x, st.z, st.y);
        scene.add(chamberMesh);
      }

      // If it's a vertical pitch (pozo), draw rope drop line
      if (isPitch && index > 0) {
        const prev = survey.stations[index - 1];
        const ropePoints = [
          new THREE.Vector3(prev.x, prev.z, prev.y),
          new THREE.Vector3(st.x, st.z, st.y),
        ];
        const ropeGeom = new THREE.BufferGeometry().setFromPoints(ropePoints);
        const ropeMat = new THREE.LineDashedMaterial({
          color: 0xf59e0b,
          dashSize: 2,
          gapSize: 1,
        });
        const ropeLine = new THREE.Line(ropeGeom, ropeMat);
        ropeLine.computeLineDistances();
        scene.add(ropeLine);
      }
    });

    // Render loop
    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);

      // Update camera position from spherical coords
      if (cameraMode === 'orbit_3d') {
        const { radius, theta, phi } = sphericalRef.current;
        const target = targetRef.current;

        camera.position.x = target.x + radius * Math.sin(phi) * Math.sin(theta);
        camera.position.y = target.y + radius * Math.cos(phi);
        camera.position.z = target.z + radius * Math.sin(phi) * Math.cos(theta);
        camera.lookAt(target);
      } else if (cameraMode === 'plan_top') {
        camera.position.set(100, 320, -100);
        camera.lookAt(100, 0, -100);
      } else if (cameraMode === 'elevation_profile') {
        camera.position.set(380, -140, -100);
        camera.lookAt(100, -140, -100);
      } else if (cameraMode === 'first_person') {
        const lastSt = survey.stations[survey.stations.length - 1];
        const prevSt = survey.stations[Math.max(0, survey.stations.length - 2)];
        camera.position.set(lastSt.x, lastSt.z + 1.6, lastSt.y);
        camera.lookAt(lastSt.x + (lastSt.x - prevSt.x), lastSt.z + 1.6, lastSt.y + (lastSt.y - prevSt.y));
      }

      renderer.render(scene, camera);
    };

    render();

    // Resize handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      renderer.dispose();
    };
  }, [survey, themeMode, cameraMode, getThemePalette]);

  // Mouse & Touch Orbit interaction
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - previousMousePositionRef.current.x;
    const deltaY = e.clientY - previousMousePositionRef.current.y;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };

    if (cameraMode === 'orbit_3d') {
      sphericalRef.current.theta -= deltaX * 0.007;
      sphericalRef.current.phi = Math.max(
        0.05,
        Math.min(Math.PI - 0.05, sphericalRef.current.phi - deltaY * 0.007)
      );
    } else {
      // Pan in plan or elevation
      targetRef.current.x -= deltaX * 0.4;
      targetRef.current.z += deltaY * 0.4;
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.15 : 0.88;
    sphericalRef.current.radius = Math.max(40, Math.min(650, sphericalRef.current.radius * factor));
  };

  const resetView = () => {
    sphericalRef.current = { radius: 240, theta: Math.PI / 4, phi: Math.PI / 3 };
    targetRef.current = new THREE.Vector3(100, -140, -100);
    onChangeCameraMode('orbit_3d');
  };

  return (
    <div
      className="relative w-full h-full select-none overflow-hidden touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
    >
      <div ref={mountRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

      {/* Depth and Navigation Telemetry HUD Overlay (Top-Left) */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 pointer-events-none">
        <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-2xl p-3 shadow-2xl flex flex-col gap-1.5 font-mono">
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="text-slate-400 font-sans font-bold uppercase text-[10px] tracking-wider">
              Profundidad Actual
            </span>
            <span className="flex items-center gap-1 text-rose-400 font-bold">
              <TrendingDown className="w-3.5 h-3.5" />
              {liveDepth.toFixed(1)} m
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 text-xs pt-1 border-t border-slate-800/80">
            <span className="text-slate-400 text-[10px] font-sans">Desarrollo Topografiado</span>
            <span className="text-emerald-400 font-bold">{survey.totalLengthMeters} m</span>
          </div>

          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="text-slate-400 text-[10px] font-sans">Cota Máxima</span>
            <span className="text-sky-400 font-bold">-{survey.maxDepthMeters} m</span>
          </div>
        </div>

        {/* Cave Entrance Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-mono backdrop-blur-md">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>BOCA: 0.0m (Presión Sup. 1013.2 hPa)</span>
        </div>
      </div>

      {/* Camera Mode Switcher (Top-Right) */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-xl">
        <button
          onClick={() => onChangeCameraMode('orbit_3d')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            cameraMode === 'orbit_3d'
              ? 'bg-sky-500 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Órbita 3D
        </button>

        <button
          onClick={() => onChangeCameraMode('plan_top')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            cameraMode === 'plan_top'
              ? 'bg-sky-500 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Planta (Top)
        </button>

        <button
          onClick={() => onChangeCameraMode('elevation_profile')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            cameraMode === 'elevation_profile'
              ? 'bg-sky-500 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Alzado / Perfil
        </button>
      </div>

      {/* Floating 3D Controls (Bottom-Right) */}
      <div className="absolute right-4 bottom-20 z-20 flex flex-col gap-2">
        <button
          onClick={() => {
            sphericalRef.current.radius = Math.max(40, sphericalRef.current.radius * 0.85);
          }}
          aria-label="Acercar 3D"
          className="w-12 h-12 flex items-center justify-center bg-slate-900/95 hover:bg-slate-800 text-sky-400 rounded-2xl border border-slate-700/80 shadow-lg active:scale-95 transition cursor-pointer"
        >
          <ZoomIn className="w-5 h-5" />
        </button>

        <button
          onClick={() => {
            sphericalRef.current.radius = Math.min(650, sphericalRef.current.radius * 1.18);
          }}
          aria-label="Alejar 3D"
          className="w-12 h-12 flex items-center justify-center bg-slate-900/95 hover:bg-slate-800 text-sky-400 rounded-2xl border border-slate-700/80 shadow-lg active:scale-95 transition cursor-pointer"
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

      {/* Selected Station Quick Summary Drawer (Bottom-Left) */}
      <div className="absolute left-4 bottom-20 z-20 max-w-sm pointer-events-auto">
        <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-2xl p-3.5 shadow-2xl flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Estaciones de Topografía
            </span>
            <span className="text-xs font-mono text-emerald-400">
              {survey.stations.length} registradas
            </span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
            {survey.stations.map((st) => (
              <button
                key={st.id}
                onClick={() => onSelectStation(st)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-mono shrink-0 transition cursor-pointer ${
                  st.id === activeStationId
                    ? 'bg-sky-950 border-sky-400 text-sky-300 ring-1 ring-sky-400'
                    : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {st.name.split(' - ')[0]} ({st.z.toFixed(0)}m)
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
