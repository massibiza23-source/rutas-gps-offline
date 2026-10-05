/**
 * Leaflet Map Renderer
 * Renders the route on OpenStreetMap with cached tiles, continuous polyline,
 * custom 'INICIO' and 'FIN' SVG icons, and waypoint popups.
 */

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { CurrentPositionState, TrackPoint, Waypoint } from '../types/gps';
import { Crosshair, Maximize2 } from 'lucide-react';

interface LeafletMapRendererProps {
  trackPoints: TrackPoint[];
  waypoints: Waypoint[];
  currentPosition: CurrentPositionState | null;
  isRecording: boolean;
  highlightedPointIndex?: number | null;
}

export const LeafletMapRenderer: React.FC<LeafletMapRendererProps> = ({
  trackPoints,
  waypoints,
  currentPosition,
  isRecording,
  highlightedPointIndex,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const polylineGlowRef = useRef<L.Polyline | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const endMarkerRef = useRef<L.Marker | null>(null);
  const currentPosMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const waypointLayerRef = useRef<L.LayerGroup | null>(null);
  const scrubberMarkerRef = useRef<L.CircleMarker | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialLat = currentPosition?.lat || (trackPoints[0]?.lat ?? 42.615);
    const initialLng = currentPosition?.lng || (trackPoints[0]?.lng ?? 0.135);

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 15,
      zoomControl: false,
    });

    // Dark/Topo OpenStreetMap tile layer (cached by Service Worker)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Create polyline layer
    const polylineGlow = L.polyline([], {
      color: '#10b981',
      weight: 10,
      opacity: 0.35,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    const polyline = L.polyline([], {
      color: '#059669',
      weight: 4,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    const waypointLayer = L.layerGroup().addTo(map);

    mapRef.current = map;
    polylineRef.current = polyline;
    polylineGlowRef.current = polylineGlow;
    waypointLayerRef.current = waypointLayer;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Polyline points
  useEffect(() => {
    if (!polylineRef.current || !polylineGlowRef.current) return;

    const latlngs: L.LatLngExpression[] = trackPoints.map((p) => [p.lat, p.lng]);
    polylineRef.current.setLatLngs(latlngs);
    polylineGlowRef.current.setLatLngs(latlngs);

    // Update Start Marker
    if (trackPoints.length > 0) {
      const startPt = trackPoints[0];
      const startIcon = L.divIcon({
        className: 'custom-start-marker',
        html: `
          <div style="display:flex; flex-direction:column; align-items:center; transform: translate(-50%, -100%);">
            <div style="background:#059669; color:#fff; font-weight:bold; font-size:10px; padding:2px 8px; border-radius:4px; border:2px solid #fff; box-shadow:0 2px 6px rgba(0,0,0,0.4); margin-bottom:2px;">
              INICIO
            </div>
            <div style="width:16px; height:16px; background:#10b981; border:3px solid #fff; border-radius:50%; box-shadow:0 0 10px rgba(16,185,129,0.8);"></div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 36],
      });

      if (!startMarkerRef.current && mapRef.current) {
        startMarkerRef.current = L.marker([startPt.lat, startPt.lng], { icon: startIcon })
          .addTo(mapRef.current)
          .bindPopup(`<b>Punto de Inicio</b><br>${new Date(startPt.timestamp).toLocaleTimeString()}`);
      } else if (startMarkerRef.current) {
        startMarkerRef.current.setLatLng([startPt.lat, startPt.lng]);
      }
    }

    // Update End Marker (only when 2+ points and not actively moving)
    if (trackPoints.length > 1 && !isRecording) {
      const endPt = trackPoints[trackPoints.length - 1];
      const endIcon = L.divIcon({
        className: 'custom-end-marker',
        html: `
          <div style="display:flex; flex-direction:column; align-items:center; transform: translate(-50%, -100%);">
            <div style="background:#dc2626; color:#fff; font-weight:bold; font-size:10px; padding:2px 8px; border-radius:4px; border:2px solid #fff; box-shadow:0 2px 6px rgba(0,0,0,0.4); margin-bottom:2px;">
              FIN
            </div>
            <div style="width:16px; height:16px; background:#ef4444; border:3px solid #fff; border-radius:50%; box-shadow:0 0 10px rgba(239,68,68,0.8);"></div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 36],
      });

      if (!endMarkerRef.current && mapRef.current) {
        endMarkerRef.current = L.marker([endPt.lat, endPt.lng], { icon: endIcon })
          .addTo(mapRef.current)
          .bindPopup(`<b>Punto Final</b><br>${new Date(endPt.timestamp).toLocaleTimeString()}`);
      } else if (endMarkerRef.current) {
        endMarkerRef.current.setLatLng([endPt.lat, endPt.lng]);
      }
    } else if (endMarkerRef.current) {
      endMarkerRef.current.remove();
      endMarkerRef.current = null;
    }
  }, [trackPoints, isRecording]);

  // Update Current Position Marker
  useEffect(() => {
    if (!mapRef.current) return;

    if (currentPosition) {
      const posIcon = L.divIcon({
        className: 'current-pos-marker',
        html: `
          <div style="position:relative; width:24px; height:24px; display:flex; align-items:center; justify-content:center; transform: translate(-50%, -50%);">
            <div style="position:absolute; width:24px; height:24px; border-radius:50%; background:rgba(14,165,233,0.3); animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
            <div style="width:14px; height:14px; border-radius:50%; background:#0284c7; border:3px solid #ffffff; box-shadow:0 0 8px rgba(2,132,199,0.9);"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      if (!currentPosMarkerRef.current) {
        currentPosMarkerRef.current = L.marker([currentPosition.lat, currentPosition.lng], {
          icon: posIcon,
        }).addTo(mapRef.current);
      } else {
        currentPosMarkerRef.current.setLatLng([currentPosition.lat, currentPosition.lng]);
      }

      // Accuracy halo
      if (!accuracyCircleRef.current) {
        accuracyCircleRef.current = L.circle([currentPosition.lat, currentPosition.lng], {
          radius: currentPosition.accuracy,
          color: '#38bdf8',
          weight: 1,
          fillColor: '#38bdf8',
          fillOpacity: 0.15,
        }).addTo(mapRef.current);
      } else {
        accuracyCircleRef.current.setLatLng([currentPosition.lat, currentPosition.lng]);
        accuracyCircleRef.current.setRadius(currentPosition.accuracy);
      }
    }
  }, [currentPosition]);

  // Update Waypoints
  useEffect(() => {
    if (!mapRef.current || !waypointLayerRef.current) return;
    waypointLayerRef.current.clearLayers();

    for (const wp of waypoints) {
      const color = wp.category === 'danger' ? '#ef4444' : wp.category === 'water' ? '#0ea5e9' : '#f59e0b';
      const wpIcon = L.divIcon({
        className: 'custom-wp-marker',
        html: `
          <div style="display:flex; flex-direction:column; align-items:center; transform: translate(-50%, -100%);">
            <div style="background:#0f172a; color:#f8fafc; font-size:10px; font-weight:600; padding:2px 6px; border-radius:4px; border:1px solid rgba(255,255,255,0.2); white-space:nowrap; margin-bottom:2px;">
              ${wp.title}
            </div>
            <div style="width:14px; height:14px; background:${color}; border:2px solid #ffffff; border-radius:50%; box-shadow:0 2px 6px rgba(0,0,0,0.5);"></div>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 26],
      });

      const m = L.marker([wp.lat, wp.lng], { icon: wpIcon }).bindPopup(`
        <div style="font-family:system-ui; color:#0f172a;">
          <h4 style="margin:0 0 4px 0; font-weight:bold; font-size:13px;">${wp.title}</h4>
          ${wp.altitude ? `<p style="margin:0; font-size:11px; color:#64748b;">Altitud: ${Math.round(wp.altitude)} m</p>` : ''}
          ${wp.notes ? `<p style="margin:4px 0 0 0; font-size:11px;">${wp.notes}</p>` : ''}
        </div>
      `);
      waypointLayerRef.current.addLayer(m);
    }
  }, [waypoints]);

  // Scrubber highlight
  useEffect(() => {
    if (!mapRef.current) return;

    if (
      highlightedPointIndex !== null &&
      highlightedPointIndex !== undefined &&
      trackPoints[highlightedPointIndex]
    ) {
      const p = trackPoints[highlightedPointIndex];
      if (!scrubberMarkerRef.current) {
        scrubberMarkerRef.current = L.circleMarker([p.lat, p.lng], {
          radius: 8,
          fillColor: '#f59e0b',
          color: '#ffffff',
          weight: 3,
          fillOpacity: 0.9,
        }).addTo(mapRef.current);
      } else {
        scrubberMarkerRef.current.setLatLng([p.lat, p.lng]);
      }
    } else if (scrubberMarkerRef.current) {
      scrubberMarkerRef.current.remove();
      scrubberMarkerRef.current = null;
    }
  }, [highlightedPointIndex, trackPoints]);

  const fitRouteBounds = () => {
    if (!mapRef.current || trackPoints.length === 0) return;
    const latlngs: L.LatLngExpression[] = trackPoints.map((p) => [p.lat, p.lng]);
    const bounds = L.latLngBounds(latlngs);
    mapRef.current.fitBounds(bounds, { padding: [50, 50] });
  };

  const centerCurrentPos = () => {
    if (!mapRef.current || !currentPosition) return;
    mapRef.current.setView([currentPosition.lat, currentPosition.lng], 16);
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating control buttons */}
      <div className="absolute right-4 bottom-16 flex flex-col gap-2 z-[400]">
        <button
          onClick={centerCurrentPos}
          title="Centrar en mi ubicación"
          className="w-11 h-11 flex items-center justify-center bg-slate-900/95 hover:bg-slate-800 text-sky-400 rounded-xl border border-slate-700/80 shadow-lg active:scale-95 transition"
        >
          <Crosshair className="w-5 h-5" />
        </button>

        <button
          onClick={fitRouteBounds}
          title="Ver ruta completa"
          className="w-11 h-11 flex items-center justify-center bg-slate-900/95 hover:bg-slate-800 text-emerald-400 rounded-xl border border-slate-700/80 shadow-lg active:scale-95 transition"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
      </div>

      {/* Mode badge */}
      <div className="absolute top-4 left-4 z-[400] flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700/60 text-sky-400 font-mono text-xs shadow-lg backdrop-blur-md">
        <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
        <span>Mapa Base con Caché Offline</span>
      </div>
    </div>
  );
};
