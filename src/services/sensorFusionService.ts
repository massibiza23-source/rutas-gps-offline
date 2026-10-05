/**
 * Sensor Fusion & Underground Dead Reckoning (PDR) Service
 * Simulates and calculates position inside caves without GPS.
 */

import { CaveStation, CaveSurveyData, SensorTelemetry } from '../types/speleo';

// Standard sea level or cave entrance pressure
const DEFAULT_SURFACE_PRESSURE = 1013.25; // hPa
const CAVE_TEMP_CELSIUS = 11.5; // Typical deep cave ambient temperature (constant)

/**
 * Calculates depth in meters from atmospheric pressure difference
 * using the Barometric Hypsometric Equation.
 * Returns negative value for depth below entrance.
 */
export function calculateBarometricDepth(
  currentPressureHpa: number,
  surfacePressureHpa = DEFAULT_SURFACE_PRESSURE,
  temperatureCelsius = CAVE_TEMP_CELSIUS
): number {
  // Gas constant for air R = 287.05 J/(kg·K), g = 9.80665 m/s²
  const T_kelvin = temperatureCelsius + 273.15;
  const factor = (287.05 * T_kelvin) / 9.80665;
  
  // As you go deeper underground, pressure increases, so ln(P_surface / P_current) is negative.
  const depthMeters = factor * Math.log(surfacePressureHpa / currentPressureHpa);
  return depthMeters;
}

/**
 * Calculates current pressure in hPa at a given subterranean depth (m)
 */
export function calculatePressureAtDepth(
  depthMeters: number, // negative for underground
  surfacePressureHpa = DEFAULT_SURFACE_PRESSURE,
  temperatureCelsius = CAVE_TEMP_CELSIUS
): number {
  const T_kelvin = temperatureCelsius + 273.15;
  const factor = (287.05 * T_kelvin) / 9.80665;
  return surfacePressureHpa * Math.exp(-depthMeters / factor);
}

/**
 * Weinberg's Step Stride Length Model
 * SL = k * (a_max - a_min)^(1/4)
 */
export function calculateStrideLength(accelPeakDelta: number, isCrawling = false): number {
  const k = isCrawling ? 0.32 : 0.44; // reduced stride during low-ceiling crawl
  return Math.max(0.3, Math.min(1.1, k * Math.pow(Math.max(0.1, accelPeakDelta), 0.25)));
}

/**
 * Preset: "Sistema Torca del Silencio" - Complex Alpine Cave Survey
 */
export const SAMPLE_CAVE_SURVEY: CaveSurveyData = {
  id: 'cave_torca_silencio',
  caveName: 'Sistema Torca del Silencio',
  region: 'Macizo Kárstico Central (Picos de Europa)',
  date: '2026-10-04',
  totalLengthMeters: 1480,
  maxDepthMeters: 312,
  stations: [
    {
      id: 'st_0',
      name: 'E0 - Boca Principal',
      x: 0,
      y: 0,
      z: 0,
      width: 4.2,
      height: 3.5,
      type: 'entrance',
      timestamp: Date.now() - 14400000,
      notes: 'Entrada kárstica en dolina. Viento soplador exterior.',
      pressureHpa: 1013.2,
      temperatureC: 14.2,
      inclinationDeg: -12,
      azimuthDeg: 210,
    },
    {
      id: 'st_1',
      name: 'E1 - Galería de los Murciélagos',
      x: 12.4,
      y: -24.8,
      z: -18.2,
      width: 5.5,
      height: 4.8,
      type: 'chamber',
      timestamp: Date.now() - 12600000,
      notes: 'Formaciones de coladas parietales y suelo de bloques.',
      pressureHpa: 1015.4,
      temperatureC: 12.1,
      inclinationDeg: -22,
      azimuthDeg: 195,
    },
    {
      id: 'st_2',
      name: 'E2 - Cabecera Pozo del Viento (P42)',
      x: 28.1,
      y: -58.3,
      z: -42.5,
      width: 2.8,
      height: 3.0,
      type: 'anchor',
      timestamp: Date.now() - 10800000,
      notes: 'Anclaje doble con spit y parabolt M10. Fraccionamiento a -15m.',
      pressureHpa: 1018.3,
      temperatureC: 11.6,
      inclinationDeg: -88,
      azimuthDeg: 180,
    },
    {
      id: 'st_3',
      name: 'E3 - Base Pozo del Viento',
      x: 30.2,
      y: -60.1,
      z: -84.7,
      width: 8.0,
      height: 15.0,
      type: 'pitch',
      timestamp: Date.now() - 9000000,
      notes: 'Cono de derrubios. Aporte hídrico continuo (goteo intenso).',
      pressureHpa: 1023.4,
      temperatureC: 11.2,
      inclinationDeg: -15,
      azimuthDeg: 140,
    },
    {
      id: 'st_4',
      name: 'E4 - Sala de las Estalagmitas Gigantes',
      x: 75.6,
      y: -98.4,
      z: -112.0,
      width: 28.0,
      height: 18.0,
      type: 'chamber',
      timestamp: Date.now() - 7200000,
      notes: 'Cámara masiva de 80x40m. Lago subterráneo somero en margen este.',
      pressureHpa: 1026.8,
      temperatureC: 11.0,
      inclinationDeg: -8,
      azimuthDeg: 115,
    },
    {
      id: 'st_5',
      name: 'E5 - Bivouac Subterráneo Camp 1',
      x: 102.5,
      y: -110.2,
      z: -118.5,
      width: 12.0,
      height: 6.0,
      type: 'bivouac',
      timestamp: Date.now() - 5400000,
      notes: 'Zona seca, arena fina y resguardo de corrientes.',
      pressureHpa: 1027.6,
      temperatureC: 11.4,
      inclinationDeg: -4,
      azimuthDeg: 95,
    },
    {
      id: 'st_6',
      name: 'E6 - Gatera del Fango',
      x: 145.0,
      y: -128.5,
      z: -142.0,
      width: 1.1,
      height: 0.65,
      type: 'crawl',
      timestamp: Date.now() - 3600000,
      notes: 'Paso muy estrecho de 35 metros arrastrándose en decúbito ventral.',
      pressureHpa: 1030.5,
      temperatureC: 11.1,
      inclinationDeg: -18,
      azimuthDeg: 70,
    },
    {
      id: 'st_7',
      name: 'E7 - Meandro Activo de la Cascada',
      x: 182.0,
      y: -150.2,
      z: -195.4,
      width: 3.5,
      height: 12.0,
      type: 'chamber',
      timestamp: Date.now() - 2400000,
      notes: 'Río subterráneo activo caudal ~120 l/s. Cañón fósil superior.',
      pressureHpa: 1037.1,
      temperatureC: 10.8,
      inclinationDeg: -35,
      azimuthDeg: 45,
    },
    {
      id: 'st_8',
      name: 'E8 - Pozo del Abismo (P85)',
      x: 215.3,
      y: -172.0,
      z: -280.4,
      width: 6.0,
      height: 40.0,
      type: 'pitch',
      timestamp: Date.now() - 1200000,
      notes: 'Gran vertical de 85m volado en campana. Sonido ensordecedor de agua.',
      pressureHpa: 1047.8,
      temperatureC: 10.5,
      inclinationDeg: -85,
      azimuthDeg: 30,
    },
    {
      id: 'st_9',
      name: 'E9 - Sifón Terminal / Frente de Exploración',
      x: 238.6,
      y: -190.5,
      z: -312.0,
      width: 4.8,
      height: 2.2,
      type: 'siphon',
      timestamp: Date.now(),
      notes: 'Galería sumergida. Requiere equipo de espeleobuceo para continuar.',
      pressureHpa: 1051.8,
      temperatureC: 10.2,
      inclinationDeg: 0,
      azimuthDeg: 25,
    },
  ],
};
