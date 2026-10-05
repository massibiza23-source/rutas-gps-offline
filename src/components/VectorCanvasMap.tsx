/**
 * Pure Vector Canvas Map
 * Renders 100% offline topological vector routes without any external tile dependencies.
 * Includes continuous polyline, 'INICIO' and 'FIN' markers, GPS beacon, waypoints, and grid.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CurrentPositionState, TrackPoint, Waypoint } from '../types/gps';
import { Compass, Crosshair, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { formatDistance } from '../utils/geoUtils';

interface VectorCanvasMapProps {
  trackPoints: TrackPoint[];
  waypoints: Waypoint[];
  currentPosition: CurrentPositionState | null;
  isRecording: boolean;
  highlightedPointIndex?: number | null;
  highContrast?: boolean;
}

export const VectorCanvasMap: React.FC<VectorCanvasMapProps> = ({
  trackPoints,
  waypoints,
  currentPosition,
  isRecording,
  highlightedPointIndex,
  highContrast = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Viewport transformation: center lat/lng, zoom level (pixels per degree)
  const [center, setCenter] = useState<{ lat: number; lng: number }>({
    lat: currentPosition?.lat || 42.615,
    lng: currentPosition?.lng || 0.135,
  });
  const [zoom, setZoom] = useState<number>(35000); // pixels per degree
  const [autoFollow, setAutoFollow] = useState<boolean>(true);

  // Pan interaction state
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const touchStartDistRef = useRef<number | null>(null);

  // Initial center sync
  useEffect(() => {
    if (trackPoints.length > 0 && autoFollow) {
      const latest = trackPoints[trackPoints.length - 1];
      setCenter({ lat: latest.lat, lng: latest.lng });
    } else if (currentPosition && autoFollow) {
      setCenter({ lat: currentPosition.lat, lng: currentPosition.lng });
    }
  }, [currentPosition, trackPoints, autoFollow]);

  // Center to bounds of entire route
  const fitToRoute = useCallback(() => {
    if (trackPoints.length === 0 && !currentPosition) return;
    setAutoFollow(false);

    const points = [...trackPoints];
    if (currentPosition) {
      points.push({
        lat: currentPosition.lat,
        lng: currentPosition.lng,
      } as any);
    }

    let minLat = points[0].lat;
    let maxLat = points[0].lat;
    let minLng = points[0].lng;
    let maxLng = points[0].lng;

    for (const p of points) {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    }

    const midLat = (minLat + maxLat) / 2;
    const midLng = (minLng + maxLng) / 2;
    setCenter({ lat: midLat, lng: midLng });

    const spanLat = Math.max(0.002, maxLat - minLat);
    const spanLng = Math.max(0.002, maxLng - minLng);

    const rect = containerRef.current?.getBoundingClientRect();
    const w = rect ? rect.width : 400;
    const h = rect ? rect.height : 400;

    const zoomLat = (h * 0.75) / spanLat;
    const zoomLng = (w * 0.75) / (spanLng * Math.cos((midLat * Math.PI) / 180));
    const newZoom = Math.min(zoomLat, zoomLng, 250000);
    setZoom(Math.max(5000, newZoom));
  }, [trackPoints, currentPosition]);

  // Recenter to current GPS location
  const centerOnGPS = useCallback(() => {
    setAutoFollow(true);
    if (currentPosition) {
      setCenter({ lat: currentPosition.lat, lng: currentPosition.lng });
    } else if (trackPoints.length > 0) {
      const p = trackPoints[trackPoints.length - 1];
      setCenter({ lat: p.lat, lng: p.lng });
    }
  }, [currentPosition, trackPoints]);

  // Mouse & Touch events
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    setAutoFollow(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    const cosLat = Math.cos((center.lat * Math.PI) / 180);
    const dLng = -dx / (zoom * cosLat);
    const dLat = dy / zoom;

    setCenter((prev) => ({
      lat: prev.lat + dLat,
      lng: prev.lng + dLng,
    }));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setAutoFollow(false);
    const factor = e.deltaY < 0 ? 1.25 : 0.8;
    setZoom((prev) => Math.min(800000, Math.max(3000, prev * factor)));
  };

  // Touch handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setAutoFollow(false);
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      isDraggingRef.current = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDistRef.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDraggingRef.current) {
      const dx = e.touches[0].clientX - lastMousePosRef.current.x;
      const dy = e.touches[0].clientY - lastMousePosRef.current.y;
      lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

      const cosLat = Math.cos((center.lat * Math.PI) / 180);
      const dLng = -dx / (zoom * cosLat);
      const dLat = dy / zoom;

      setCenter((prev) => ({
        lat: prev.lat + dLat,
        lng: prev.lng + dLng,
      }));
    } else if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const factor = dist / touchStartDistRef.current;
      touchStartDistRef.current = dist;
      setZoom((prev) => Math.min(800000, Math.max(3000, prev * factor)));
    }
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    touchStartDistRef.current = null;
  };

  // Canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Color theme
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    if (highContrast) {
      bgGrad.addColorStop(0, '#000000');
      bgGrad.addColorStop(1, '#050505');
    } else {
      bgGrad.addColorStop(0, '#0a0f1d');
      bgGrad.addColorStop(1, '#0f172a');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    const cosLat = Math.cos((center.lat * Math.PI) / 180);

    // Coordinate conversion function
    const toScreen = (lat: number, lng: number) => {
      const x = width / 2 + (lng - center.lng) * zoom * cosLat;
      const y = height / 2 - (lat - center.lat) * zoom;
      return { x, y };
    };

    // 1. Draw Coordinate Grid & Scale
    ctx.lineWidth = 1;
    ctx.strokeStyle = highContrast ? 'rgba(255,255,255,0.08)' : 'rgba(56, 189, 248, 0.08)';

    // Step calculation based on zoom
    const gridStepDeg = Math.pow(10, Math.floor(Math.log10(100 / zoom)));
    const startLng = Math.floor((center.lng - (width / (2 * zoom * cosLat))) / gridStepDeg) * gridStepDeg;
    const endLng = Math.ceil((center.lng + (width / (2 * zoom * cosLat))) / gridStepDeg) * gridStepDeg;

    ctx.font = '10px monospace';
    ctx.fillStyle = highContrast ? 'rgba(255,255,255,0.3)' : 'rgba(148, 163, 184, 0.4)';

    for (let lng = startLng; lng <= endLng; lng += gridStepDeg) {
      const { x } = toScreen(center.lat, lng);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      ctx.fillText(`${lng.toFixed(4)}°`, x + 4, height - 10);
    }

    const startLat = Math.floor((center.lat - (height / (2 * zoom))) / gridStepDeg) * gridStepDeg;
    const endLat = Math.ceil((center.lat + (height / (2 * zoom))) / gridStepDeg) * gridStepDeg;

    for (let lat = startLat; lat <= endLat; lat += gridStepDeg) {
      const { y } = toScreen(lat, center.lng);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      ctx.fillText(`${lat.toFixed(4)}°`, 10, y - 4);
    }

    // 2. Draw Continuous Polyline (The Route)
    if (trackPoints.length >= 2) {
      // Glow effect underlay
      ctx.beginPath();
      const first = toScreen(trackPoints[0].lat, trackPoints[0].lng);
      ctx.moveTo(first.x, first.y);

      for (let i = 1; i < trackPoints.length; i++) {
        const pt = toScreen(trackPoints[i].lat, trackPoints[i].lng);
        ctx.lineTo(pt.x, pt.y);
      }

      ctx.strokeStyle = highContrast ? 'rgba(74, 222, 128, 0.3)' : 'rgba(34, 197, 94, 0.3)';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Sharp central line with speed gradient or vibrant trail color
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < trackPoints.length; i++) {
        const pt = toScreen(trackPoints[i].lat, trackPoints[i].lng);
        ctx.lineTo(pt.x, pt.y);
      }

      ctx.strokeStyle = highContrast ? '#22c55e' : '#10b981';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Subtle track dash interior
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 3. Highlighted Point from Elevation Scrubber
    if (
      highlightedPointIndex !== null &&
      highlightedPointIndex !== undefined &&
      trackPoints[highlightedPointIndex]
    ) {
      const hp = trackPoints[highlightedPointIndex];
      const screenHp = toScreen(hp.lat, hp.lng);

      ctx.beginPath();
      ctx.arc(screenHp.x, screenHp.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.3)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(screenHp.x, screenHp.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
    }

    // 4. Waypoints
    for (const wp of waypoints) {
      const scr = toScreen(wp.lat, wp.lng);

      // Pin circle
      ctx.beginPath();
      ctx.arc(scr.x, scr.y, 9, 0, Math.PI * 2);
      ctx.fillStyle = wp.category === 'danger' ? '#ef4444' : wp.category === 'water' ? '#0ea5e9' : '#eab308';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      // Pin core
      ctx.beginPath();
      ctx.arc(scr.x, scr.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Waypoint text label tag
      ctx.font = 'bold 11px system-ui, sans-serif';
      const label = wp.title;
      const textWidth = ctx.measureText(label).width;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.roundRect(scr.x - textWidth / 2 - 6, scr.y - 28, textWidth + 12, 18, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.fillText(label, scr.x - textWidth / 2, scr.y - 15);
    }

    // 5. START MARKER ("INICIO")
    if (trackPoints.length > 0) {
      const startPt = trackPoints[0];
      const scrStart = toScreen(startPt.lat, startPt.lng);

      // Beacon ring
      ctx.beginPath();
      ctx.arc(scrStart.x, scrStart.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(scrStart.x, scrStart.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#10b981';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.fill();
      ctx.stroke();

      // INICIO Banner
      ctx.font = 'bold 10px system-ui, sans-serif';
      const tagText = 'INICIO';
      const textW = ctx.measureText(tagText).width;

      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.roundRect(scrStart.x - textW / 2 - 8, scrStart.y - 30, textW + 16, 18, 4);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(tagText, scrStart.x - textW / 2, scrStart.y - 17);
    }

    // 6. END / FIN MARKER
    if (trackPoints.length > 1) {
      const endPt = trackPoints[trackPoints.length - 1];
      const scrEnd = toScreen(endPt.lat, endPt.lng);

      // If active recording, end point is current position; otherwise completed FIN marker
      const isCompleted = !isRecording;

      if (isCompleted) {
        ctx.beginPath();
        ctx.arc(scrEnd.x, scrEnd.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(scrEnd.x, scrEnd.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 10px system-ui, sans-serif';
        const tagText = 'FIN';
        const textW = ctx.measureText(tagText).width;

        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.roundRect(scrEnd.x - textW / 2 - 8, scrEnd.y - 30, textW + 16, 18, 4);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.fillText(tagText, scrEnd.x - textW / 2, scrEnd.y - 17);
      }
    }

    // 7. LIVE GPS BEACON (Current position with accuracy halo & heading)
    if (currentPosition) {
      const scrGps = toScreen(currentPosition.lat, currentPosition.lng);

      // Accuracy radius in pixels
      const metersPerPixel = (111320 * cosLat) / zoom;
      const accRadiusPx = Math.max(12, Math.min(100, currentPosition.accuracy / metersPerPixel));

      // Accuracy circle
      ctx.beginPath();
      ctx.arc(scrGps.x, scrGps.y, accRadiusPx, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();

      // Heading directional cone
      if (currentPosition.heading !== null && !isNaN(currentPosition.heading)) {
        const rad = ((currentPosition.heading - 90) * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(scrGps.x, scrGps.y);
        ctx.arc(scrGps.x, scrGps.y, 28, rad - 0.45, rad + 0.45);
        ctx.closePath();
        ctx.fillStyle = 'rgba(14, 165, 233, 0.35)';
        ctx.fill();
      }

      // Live Center Dot (Blue Radar Pulse)
      ctx.beginPath();
      ctx.arc(scrGps.x, scrGps.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.fill();
      ctx.stroke();

      // Status pulse ring
      ctx.beginPath();
      ctx.arc(scrGps.x, scrGps.y, 12, 0, Math.PI * 2);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 8. Scale Bar (Bottom Left)
    const scaleBarPixels = 100;
    const metersRepresented = scaleBarPixels * ((111320 * cosLat) / zoom);
    const scaleText = formatDistance(metersRepresented);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.beginPath();
    ctx.roundRect(16, height - 42, 130, 26, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(24, height - 24);
    ctx.lineTo(24 + scaleBarPixels, height - 24);
    ctx.moveTo(24, height - 28);
    ctx.lineTo(24, height - 20);
    ctx.moveTo(24 + scaleBarPixels, height - 28);
    ctx.lineTo(24 + scaleBarPixels, height - 20);
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText(scaleText, 24 + scaleBarPixels / 2 - ctx.measureText(scaleText).width / 2, height - 30);

    ctx.restore();
  }, [
    center,
    zoom,
    trackPoints,
    waypoints,
    currentPosition,
    isRecording,
    highlightedPointIndex,
    highContrast,
  ]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none overflow-hidden touch-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

      {/* Tactical Top Right Compass */}
      <div className="absolute top-4 right-4 flex flex-col items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-xl p-2 shadow-xl pointer-events-none">
        <div className="relative w-9 h-9 flex items-center justify-center">
          <Compass className="w-8 h-8 text-sky-400 animate-pulse" />
          <span className="absolute -top-1 font-mono font-bold text-[9px] text-red-400">N</span>
        </div>
      </div>

      {/* Zoom and Center Floating Controls */}
      <div className="absolute right-4 bottom-16 flex flex-col gap-2 z-10">
        <button
          onClick={() => {
            setAutoFollow(false);
            setZoom((z) => Math.min(800000, z * 1.4));
          }}
          aria-label="Acercar mapa"
          className="w-11 h-11 flex items-center justify-center bg-slate-900/90 hover:bg-slate-800 text-slate-100 rounded-xl border border-slate-700/80 shadow-lg active:scale-95 transition"
        >
          <ZoomIn className="w-5 h-5 text-sky-400" />
        </button>

        <button
          onClick={() => {
            setAutoFollow(false);
            setZoom((z) => Math.max(3000, z * 0.7));
          }}
          aria-label="Alejar mapa"
          className="w-11 h-11 flex items-center justify-center bg-slate-900/90 hover:bg-slate-800 text-slate-100 rounded-xl border border-slate-700/80 shadow-lg active:scale-95 transition"
        >
          <ZoomOut className="w-5 h-5 text-sky-400" />
        </button>

        <button
          onClick={centerOnGPS}
          title="Centrar en ubicación GPS"
          aria-label="Centrar GPS"
          className={`w-11 h-11 flex items-center justify-center rounded-xl border shadow-lg active:scale-95 transition ${
            autoFollow
              ? 'bg-sky-500 text-white border-sky-400 shadow-sky-500/30'
              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700/80'
          }`}
        >
          <Crosshair className={`w-5 h-5 ${autoFollow ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
        </button>

        <button
          onClick={fitToRoute}
          title="Ver ruta completa"
          aria-label="Enfocar ruta"
          className="w-11 h-11 flex items-center justify-center bg-slate-900/90 hover:bg-slate-800 text-slate-100 rounded-xl border border-slate-700/80 shadow-lg active:scale-95 transition"
        >
          <Maximize2 className="w-5 h-5 text-emerald-400" />
        </button>
      </div>

      {/* Offline Status Badge */}
      <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 font-mono text-xs shadow-lg backdrop-blur-md">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        <span>Lienzo Vectorial 100% Offline</span>
      </div>
    </div>
  );
};
