/**
 * Speleological 3D Cave Mapping & Offline Sensor Fusion Types
 */

export type CaveFeatureType =
  | 'entrance'      // Boca / Entrada
  | 'pitch'         // Pozo vertical con cuerda
  | 'chamber'       // Gran sala o galería
  | 'crawl'         // Gatera / paso estrecho
  | 'siphon'        // Sifón / paso inundado
  | 'bivouac'       // Zona de acampada subterránea
  | 'anchor'        // Punto de anclaje de progresión vertical
  | 'active_front'; // Frente de exploración / final de recorrido

export interface CaveStation {
  id: string;
  name: string;
  x: number; // Easting offset from entrance in meters
  y: number; // Northing offset from entrance in meters
  z: number; // Depth relative to entrance in meters (negative downward)
  width: number; // Chamber/passage width (left + right) in meters
  height: number; // Passage height (up + down) in meters
  type: CaveFeatureType;
  timestamp: number;
  notes?: string;
  pressureHpa?: number;
  temperatureC?: number;
  inclinationDeg?: number;
  azimuthDeg?: number;
}

export interface SensorTelemetry {
  stepCount: number;
  strideLengthMeters: number;
  currentDepthMeters: number; // -Z
  surfacePressureHpa: number;
  currentPressureHpa: number;
  temperatureC: number;
  azimuthDeg: number;       // Rumbo magnético / brújula
  pitchDeg: number;         // Inclinación vertical (+/- 90)
  rollDeg: number;          // Inclinación transversal
  accelMagnitude: number;   // m/s²
  confidenceLevel: number;  // 0 - 100%
  batteryRemainingHours: number;
}

export type SpeleoThemeMode = 'dark_tactical' | 'red_lamp' | 'amber_high_contrast';
export type ViewportCameraMode = 'orbit_3d' | 'plan_top' | 'elevation_profile' | 'first_person';

export interface CaveSurveyData {
  id: string;
  caveName: string;
  region: string;
  date: string;
  totalLengthMeters: number;
  maxDepthMeters: number;
  stations: CaveStation[];
}
