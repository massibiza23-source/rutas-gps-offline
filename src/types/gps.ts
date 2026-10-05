/**
 * Core type definitions for Offline GPS Tracker
 */

export interface TrackPoint {
  id: string;
  routeId: string;
  lat: number;
  lng: number;
  altitude: number | null; // meters
  accuracy: number; // meters
  speed: number | null; // m/s
  heading: number | null; // degrees
  timestamp: number; // ms
  distanceFromStart: number; // meters
  elevationDelta: number; // meters gained/lost relative to previous point
}

export type WaypointCategory =
  | 'summit'
  | 'water'
  | 'danger'
  | 'camp'
  | 'shelter'
  | 'photo'
  | 'rest'
  | 'milestone';

export interface Waypoint {
  id: string;
  routeId: string;
  lat: number;
  lng: number;
  altitude: number | null;
  title: string;
  notes?: string;
  category: WaypointCategory;
  timestamp: number;
}

export type ActivityType = 'hiking' | 'cycling' | 'trail_running' | 'mountain_bike' | 'walking';

export type RouteStatus = 'recording' | 'paused' | 'completed';

export interface RouteBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface RouteRecord {
  id: string;
  title: string;
  description?: string;
  activityType: ActivityType;
  status: RouteStatus;
  startTime: number;
  endTime?: number;
  totalDistance: number; // in meters
  duration: number; // in milliseconds
  movingTime: number; // in milliseconds
  avgSpeed: number; // in km/h
  maxSpeed: number; // in km/h
  currentSpeed: number; // in km/h
  minElevation: number | null;
  maxElevation: number | null;
  elevationGain: number; // in meters
  elevationLoss: number; // in meters
  pointCount: number;
  waypointCount: number;
  bounds?: RouteBounds;
}

export type BatteryProfile = 'high_precision' | 'balanced' | 'battery_saver';

export interface TrackerSettings {
  batteryProfile: BatteryProfile;
  minAccuracyFilter: number; // meters (reject fixes with accuracy worse than this)
  minDistanceFilter: number; // meters (ignore movement smaller than this to eliminate jitter)
  keepScreenAwake: boolean;
  audioFeedback: boolean;
  mapType: 'vector_canvas' | 'leaflet_osm' | 'leaflet_topo';
  highContrastMode: boolean;
  units: 'metric' | 'imperial';
  altitudeOffset: number; // Manual calibration offset in meters (positive or negative)
}

export type Route3DColorScheme = 'altitude_gradient' | 'neon_emerald' | 'cyan_laser' | 'sunset_fire';

export interface Route3DLineSettings {
  lineWidth: number; // radius in meters/pixels (e.g. 1.2, 2.2, 3.8, 5.5)
  elevationScale: number; // vertical exaggeration multiplier (1.0, 1.8, 2.8, 4.5)
  colorScheme: Route3DColorScheme;
  showCurtain: boolean; // vertical drop curtain to ground reference plane
  showGroundShadow: boolean; // 2D projection on ground
  glowIntensity: number; // emissive brightness
}

export type GPSConnectionStatus =
  | 'unsupported'
  | 'prompt'
  | 'searching'
  | 'locked'
  | 'denied'
  | 'simulated'
  | 'error';

export interface CurrentPositionState {
  lat: number;
  lng: number;
  altitude: number | null;
  accuracy: number;
  speed: number | null; // m/s
  heading: number | null;
  timestamp: number;
}
