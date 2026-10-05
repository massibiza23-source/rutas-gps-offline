/**
 * Geographic and Mathematical Utilities for GPS Tracking
 */

import { RouteBounds, RouteRecord, TrackPoint, Waypoint } from '../types/gps';

const EARTH_RADIUS_METERS = 6371000;

/**
 * Calculates great-circle distance between two points on a sphere (Haversine formula)
 * Returns distance in meters.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Calculates forward bearing (compass heading) from point 1 to point 2 in degrees (0-360)
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaLambda = toRadians(lon2 - lon1);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  return (toDegrees(theta) + 360) % 360;
}

/**
 * Formats distance in meters to a readable string (e.g. "850 m" or "14.28 km")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Formats duration in milliseconds to "HH:MM:SS" or "MM:SS"
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Formats speed from m/s or km/h to string
 */
export function formatSpeed(kmh: number): string {
  if (isNaN(kmh) || kmh < 0.1) return '0.0 km/h';
  return `${kmh.toFixed(1)} km/h`;
}

/**
 * Calculates outdoor pace in min/km from km/h (useful for hikers and trail runners)
 */
export function formatPace(kmh: number): string {
  if (isNaN(kmh) || kmh < 0.5) return '--:-- /km';
  const minutesPerKm = 60 / kmh;
  if (minutesPerKm > 99) return '--:-- /km';
  const mins = Math.floor(minutesPerKm);
  const secs = Math.round((minutesPerKm - mins) * 60);
  return `${mins}'${secs.toString().padStart(2, '0')}" /km`;
}

/**
 * Computes bounding box encompassing all points
 */
export function computeBounds(points: Array<{ lat: number; lng: number }>): RouteBounds | null {
  if (points.length === 0) return null;

  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;

  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }

  return { minLat, maxLat, minLng, maxLng };
}

/**
 * Exports route, points, and waypoints to standard GPX 1.1 format
 */
export function exportToGPX(
  route: RouteRecord,
  points: TrackPoint[],
  waypoints: Waypoint[]
): string {
  const sanitize = (text: string) =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const startTimeIso = new Date(route.startTime).toISOString();

  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="RutaGPS Offline - Outdoor Tracker"
     xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${sanitize(route.title)}</name>
    <desc>${sanitize(route.description || 'Ruta registrada con RutaGPS Offline')}</desc>
    <time>${startTimeIso}</time>
  </metadata>
`;

  // Waypoints
  for (const wp of waypoints) {
    gpx += `  <wpt lat="${wp.lat.toFixed(7)}" lon="${wp.lng.toFixed(7)}">
    ${wp.altitude !== null ? `<ele>${wp.altitude.toFixed(1)}</ele>` : ''}
    <time>${new Date(wp.timestamp).toISOString()}</time>
    <name>${sanitize(wp.title)}</name>
    <desc>${sanitize(wp.notes || '')}</desc>
    <type>${wp.category}</type>
  </wpt>\n`;
  }

  // Track & Segments
  gpx += `  <trk>
    <name>${sanitize(route.title)}</name>
    <type>${route.activityType}</type>
    <trkseg>\n`;

  for (const p of points) {
    gpx += `      <trkpt lat="${p.lat.toFixed(7)}" lon="${p.lng.toFixed(7)}">
        ${p.altitude !== null ? `<ele>${p.altitude.toFixed(1)}</ele>` : ''}
        <time>${new Date(p.timestamp).toISOString()}</time>
        ${p.speed !== null ? `<speed>${p.speed.toFixed(2)}</speed>` : ''}
      </trkpt>\n`;
  }

  gpx += `    </trkseg>
  </trk>
</gpx>`;

  return gpx;
}

/**
 * Exports to GeoJSON format
 */
export function exportToGeoJSON(
  route: RouteRecord,
  points: TrackPoint[],
  waypoints: Waypoint[]
): string {
  const coordinates = points.map((p) => [
    p.lng,
    p.lat,
    p.altitude !== null ? p.altitude : 0,
  ]);

  const features: any[] = [
    {
      type: 'Feature',
      properties: {
        id: route.id,
        name: route.title,
        activityType: route.activityType,
        startTime: route.startTime,
        totalDistance: route.totalDistance,
        duration: route.duration,
        avgSpeed: route.avgSpeed,
        elevationGain: route.elevationGain,
      },
      geometry: {
        type: 'LineString',
        coordinates,
      },
    },
  ];

  // Add waypoints
  for (const wp of waypoints) {
    features.push({
      type: 'Feature',
      properties: {
        id: wp.id,
        name: wp.title,
        notes: wp.notes,
        category: wp.category,
        timestamp: wp.timestamp,
      },
      geometry: {
        type: 'Point',
        coordinates: [wp.lng, wp.lat, wp.altitude || 0],
      },
    });
  }

  const geojson = {
    type: 'FeatureCollection',
    features,
  };

  return JSON.stringify(geojson, null, 2);
}

/**
 * Downloads a string as a file locally without network request
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parses an imported GPX XML text into route points and waypoints
 */
export function parseGPX(xmlText: string): {
  title: string;
  points: Array<{ lat: number; lng: number; altitude: number | null; timestamp: number }>;
  waypoints: Array<{ lat: number; lng: number; altitude: number | null; title: string; category: string }>;
} {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'application/xml');

  let title = 'Ruta Importada';
  const nameEl = xml.querySelector('trk > name') || xml.querySelector('metadata > name');
  if (nameEl && nameEl.textContent) {
    title = nameEl.textContent.trim();
  }

  const points: Array<{ lat: number; lng: number; altitude: number | null; timestamp: number }> = [];
  const trkpts = xml.querySelectorAll('trkpt');

  let now = Date.now();
  let timeCounter = now;

  trkpts.forEach((pt, index) => {
    const lat = parseFloat(pt.getAttribute('lat') || '0');
    const lng = parseFloat(pt.getAttribute('lon') || '0');
    const eleEl = pt.querySelector('ele');
    const altitude = eleEl ? parseFloat(eleEl.textContent || '0') : null;
    const timeEl = pt.querySelector('time');
    let timestamp = timeEl && timeEl.textContent ? new Date(timeEl.textContent).getTime() : 0;
    if (isNaN(timestamp) || timestamp === 0) {
      timestamp = timeCounter + index * 5000;
    }

    if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
      points.push({ lat, lng, altitude, timestamp });
    }
  });

  const waypoints: Array<{ lat: number; lng: number; altitude: number | null; title: string; category: string }> = [];
  const wpts = xml.querySelectorAll('wpt');

  wpts.forEach((wp) => {
    const lat = parseFloat(wp.getAttribute('lat') || '0');
    const lng = parseFloat(wp.getAttribute('lon') || '0');
    const eleEl = wp.querySelector('ele');
    const altitude = eleEl ? parseFloat(eleEl.textContent || '0') : null;
    const wpName = wp.querySelector('name')?.textContent || 'Punto de interés';
    const type = wp.querySelector('type')?.textContent || 'milestone';

    if (!isNaN(lat) && !isNaN(lng)) {
      waypoints.push({ lat, lng, altitude, title: wpName, category: type });
    }
  });

  return { title, points, waypoints };
}
