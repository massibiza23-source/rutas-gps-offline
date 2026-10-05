/**
 * Central GPS Tracking and Outdoor Telemetry Hook
 * Handles Geolocation API, filtering, battery profile adaptation,
 * IndexedDB streaming persistence, and state calculation.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { dbService } from '../services/db';
import { gpsSimulator } from '../services/gpsSimulator';
import { soundService } from '../services/soundService';
import { wakeLockService } from '../services/wakeLockService';
import {
  ActivityType,
  CurrentPositionState,
  GPSConnectionStatus,
  RouteRecord,
  TrackerSettings,
  TrackPoint,
  Waypoint,
  WaypointCategory,
} from '../types/gps';
import { calculateBearing, calculateHaversineDistance, computeBounds } from '../utils/geoUtils';

const DEFAULT_SETTINGS: TrackerSettings = {
  batteryProfile: 'balanced',
  minAccuracyFilter: 35, // meters
  minDistanceFilter: 4, // meters
  keepScreenAwake: true,
  audioFeedback: true,
  mapType: 'vector_canvas',
  highContrastMode: false,
  units: 'metric',
  altitudeOffset: 0,
};

export function useGPSTracker() {
  const [currentRoute, setCurrentRoute] = useState<RouteRecord | null>(null);
  const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [currentPosition, setCurrentPosition] = useState<CurrentPositionState | null>(null);
  const [gpsStatus, setGpsStatus] = useState<GPSConnectionStatus>('prompt');
  const [settings, setSettings] = useState<TrackerSettings>(() => {
    try {
      const saved = localStorage.getItem('rutagps_settings');
      const offsetSaved = localStorage.getItem('rutagps_altitude_offset');
      const base = saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
      if (offsetSaved !== null) {
        base.altitudeOffset = parseFloat(offsetSaved) || 0;
      }
      return base;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  const [isSimulating, setIsSimulating] = useState(false);
  const [batteryInfo, setBatteryInfo] = useState<{ level: number | null; charging: boolean | null }>({
    level: null,
    charging: null,
  });

  // Refs for tracking mutable values inside geolocation callbacks
  const watchIdRef = useRef<number | null>(null);
  const currentRouteRef = useRef<RouteRecord | null>(null);
  const trackPointsRef = useRef<TrackPoint[]>([]);
  const lastRecordedPointRef = useRef<TrackPoint | null>(null);
  const lastRecordedTimeRef = useRef<number>(0);
  const settingsRef = useRef<TrackerSettings>(DEFAULT_SETTINGS);

  // Sync refs with state
  useEffect(() => {
    currentRouteRef.current = currentRoute;
  }, [currentRoute]);

  useEffect(() => {
    trackPointsRef.current = trackPoints;
  }, [trackPoints]);

  useEffect(() => {
    settingsRef.current = settings;
    soundService.setEnabled(settings.audioFeedback);
  }, [settings]);

  // Battery Status API monitor
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBattery = () => {
          setBatteryInfo({
            level: Math.round(battery.level * 100),
            charging: battery.charging,
          });
        };
        updateBattery();
        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);
      }).catch(() => {});
    }
  }, []);

  // Screen WakeLock toggle
  useEffect(() => {
    if (currentRoute?.status === 'recording' && settings.keepScreenAwake) {
      wakeLockService.requestWakeLock();
    } else {
      wakeLockService.releaseWakeLock();
    }
  }, [currentRoute?.status, settings.keepScreenAwake]);

  // Recover active route from IndexedDB on startup if exists
  useEffect(() => {
    const recoverRoute = async () => {
      try {
        const allRoutes = await dbService.getAllRoutes();
        const active = allRoutes.find((r) => r.status === 'recording' || r.status === 'paused');
        if (active) {
          const points = await dbService.getTrackPoints(active.id);
          const wps = await dbService.getWaypoints(active.id);
          setCurrentRoute(active);
          setTrackPoints(points);
          setWaypoints(wps);
          if (points.length > 0) {
            lastRecordedPointRef.current = points[points.length - 1];
            lastRecordedTimeRef.current = points[points.length - 1].timestamp;
          }
        }
      } catch (err) {
        console.error('Error recovering active route:', err);
      }
    };
    recoverRoute();
  }, []);

  // Geolocation point processor (shared between real GPS and Simulator)
  const processNewPosition = useCallback((coords: GeolocationCoordinates, timestamp: number) => {
    const lat = coords.latitude;
    const lng = coords.longitude;
    const rawAltitude = coords.altitude !== null && !isNaN(coords.altitude) ? coords.altitude : null;
    const offset = settingsRef.current.altitudeOffset || 0;
    const altitude = rawAltitude !== null ? Math.round((rawAltitude + offset) * 10) / 10 : null;
    const accuracy = coords.accuracy || 10;
    const speed = coords.speed !== null && !isNaN(coords.speed) ? coords.speed : null;
    const heading = coords.heading !== null && !isNaN(coords.heading) ? coords.heading : null;

    const newPosState: CurrentPositionState = {
      lat,
      lng,
      altitude,
      accuracy,
      speed,
      heading,
      timestamp,
    };
    setCurrentPosition(newPosState);

    // If recording, process route filtering & storage
    const route = currentRouteRef.current;
    if (!route || route.status !== 'recording') {
      return;
    }

    const currentCfg = settingsRef.current;

    // Filter 1: Accuracy Filter (reject wild fixes)
    if (accuracy > currentCfg.minAccuracyFilter) {
      return;
    }

    // Filter 2: Battery Sampling Interval Gate
    const now = timestamp;
    let minTimeIntervalMs = 2000;
    let distanceThreshold = currentCfg.minDistanceFilter;

    if (currentCfg.batteryProfile === 'balanced') {
      minTimeIntervalMs = 5000;
      distanceThreshold = Math.max(distanceThreshold, 5);
    } else if (currentCfg.batteryProfile === 'battery_saver') {
      minTimeIntervalMs = 20000;
      distanceThreshold = Math.max(distanceThreshold, 15);
    }

    const lastPoint = lastRecordedPointRef.current;

    if (lastPoint) {
      const timeSinceLast = now - lastRecordedTimeRef.current;
      const distanceDelta = calculateHaversineDistance(lastPoint.lat, lastPoint.lng, lat, lng);

      // Filter 3: Movement Threshold (eliminate GPS jitter while stopped)
      if (distanceDelta < distanceThreshold && timeSinceLast < minTimeIntervalMs * 3) {
        return;
      }

      if (timeSinceLast < minTimeIntervalMs) {
        return;
      }
    }

    // Point accepted! Calculate metrics
    let stepDistance = 0;
    let computedBearing = heading;
    let elevationDelta = 0;

    if (lastPoint) {
      stepDistance = calculateHaversineDistance(lastPoint.lat, lastPoint.lng, lat, lng);
      if (computedBearing === null || isNaN(computedBearing)) {
        computedBearing = calculateBearing(lastPoint.lat, lastPoint.lng, lat, lng);
      }
      if (altitude !== null && lastPoint.altitude !== null) {
        const diff = altitude - lastPoint.altitude;
        // Ignore tiny barometric / GPS jitter < 1m
        if (Math.abs(diff) > 0.8) {
          elevationDelta = diff;
        }
      }
    }

    const totalDistance = route.totalDistance + stepDistance;
    const duration = now - route.startTime;

    // Moving time calculation (if speed > 0.5 km/h)
    const currentSpeedKmh = speed !== null ? speed * 3.6 : (stepDistance / Math.max(1, (now - lastRecordedTimeRef.current) / 1000)) * 3.6;
    const isMoving = currentSpeedKmh > 0.6;
    const movingTime = route.movingTime + (isMoving && lastPoint ? (now - lastRecordedTimeRef.current) : 0);

    const avgSpeed = movingTime > 0 ? (totalDistance / (movingTime / 1000)) * 3.6 : 0;
    const maxSpeed = Math.max(route.maxSpeed, currentSpeedKmh < 120 ? currentSpeedKmh : route.maxSpeed);

    let elevationGain = route.elevationGain;
    let elevationLoss = route.elevationLoss;
    if (elevationDelta > 0) {
      elevationGain += elevationDelta;
    } else if (elevationDelta < 0) {
      elevationLoss += Math.abs(elevationDelta);
    }

    let minElevation = route.minElevation;
    let maxElevation = route.maxElevation;
    if (altitude !== null) {
      minElevation = minElevation === null ? altitude : Math.min(minElevation, altitude);
      maxElevation = maxElevation === null ? altitude : Math.max(maxElevation, altitude);
    }

    const newPoint: TrackPoint = {
      id: `${route.id}_${now}_${Math.random().toString(36).substring(2, 6)}`,
      routeId: route.id,
      lat,
      lng,
      altitude,
      accuracy,
      speed,
      heading: computedBearing,
      timestamp: now,
      distanceFromStart: totalDistance,
      elevationDelta,
    };

    const updatedPoints = [...trackPointsRef.current, newPoint];
    const newBounds = computeBounds(updatedPoints);

    const updatedRoute: RouteRecord = {
      ...route,
      totalDistance,
      duration,
      movingTime,
      avgSpeed,
      maxSpeed,
      currentSpeed: currentSpeedKmh,
      minElevation,
      maxElevation,
      elevationGain: Math.round(elevationGain),
      elevationLoss: Math.round(elevationLoss),
      pointCount: updatedPoints.length,
      bounds: newBounds || undefined,
    };

    // Update refs and state
    lastRecordedPointRef.current = newPoint;
    lastRecordedTimeRef.current = now;
    trackPointsRef.current = updatedPoints;
    currentRouteRef.current = updatedRoute;

    setCurrentRoute(updatedRoute);
    setTrackPoints(updatedPoints);

    // Save to IndexedDB asynchronously
    dbService.addTrackPoint(newPoint).catch(console.error);
    dbService.saveRoute(updatedRoute).catch(console.error);
  }, []);

  // Native Geolocation watcher
  useEffect(() => {
    if (isSimulating) return;

    if (!('geolocation' in navigator)) {
      setGpsStatus('unsupported');
      return;
    }

    setGpsStatus('searching');

    const handleSuccess = (position: GeolocationPosition) => {
      setGpsStatus('locked');
      processNewPosition(position.coords, position.timestamp);
    };

    const handleError = (error: GeolocationPositionError) => {
      if (error.code === error.PERMISSION_DENIED) {
        setGpsStatus('denied');
      } else {
        setGpsStatus('error');
      }
    };

    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: settings.batteryProfile === 'high_precision' ? 1000 : 4000,
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      geoOptions
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isSimulating, processNewPosition, settings.batteryProfile]);

  // Actions
  const startRecording = useCallback(
    async (title = 'Ruta al aire libre', activityType: ActivityType = 'hiking') => {
      const now = Date.now();
      const newRoute: RouteRecord = {
        id: `route_${now}`,
        title,
        activityType,
        status: 'recording',
        startTime: now,
        totalDistance: 0,
        duration: 0,
        movingTime: 0,
        avgSpeed: 0,
        maxSpeed: 0,
        currentSpeed: 0,
        minElevation: currentPosition?.altitude || null,
        maxElevation: currentPosition?.altitude || null,
        elevationGain: 0,
        elevationLoss: 0,
        pointCount: 0,
        waypointCount: 0,
      };

      await dbService.saveRoute(newRoute);
      setCurrentRoute(newRoute);
      setTrackPoints([]);
      setWaypoints([]);
      lastRecordedPointRef.current = null;
      lastRecordedTimeRef.current = 0;

      soundService.playStart();

      // If current position exists, record first point
      if (currentPosition) {
        const firstPoint: TrackPoint = {
          id: `${newRoute.id}_start`,
          routeId: newRoute.id,
          lat: currentPosition.lat,
          lng: currentPosition.lng,
          altitude: currentPosition.altitude,
          accuracy: currentPosition.accuracy,
          speed: currentPosition.speed,
          heading: currentPosition.heading,
          timestamp: now,
          distanceFromStart: 0,
          elevationDelta: 0,
        };
        await dbService.addTrackPoint(firstPoint);
        setTrackPoints([firstPoint]);
        lastRecordedPointRef.current = firstPoint;
        lastRecordedTimeRef.current = now;
      }
    },
    [currentPosition]
  );

  const pauseRecording = useCallback(async () => {
    if (!currentRoute || currentRoute.status !== 'recording') return;
    const updated: RouteRecord = {
      ...currentRoute,
      status: 'paused',
      currentSpeed: 0,
    };
    await dbService.saveRoute(updated);
    setCurrentRoute(updated);
    soundService.playPause();
  }, [currentRoute]);

  const resumeRecording = useCallback(async () => {
    if (!currentRoute || currentRoute.status !== 'paused') return;
    const updated: RouteRecord = {
      ...currentRoute,
      status: 'recording',
    };
    await dbService.saveRoute(updated);
    setCurrentRoute(updated);
    lastRecordedTimeRef.current = Date.now();
    soundService.playStart();
  }, [currentRoute]);

  const finishRecording = useCallback(async () => {
    if (!currentRoute) return;
    const now = Date.now();
    const updated: RouteRecord = {
      ...currentRoute,
      status: 'completed',
      endTime: now,
      currentSpeed: 0,
    };
    await dbService.saveRoute(updated);
    setCurrentRoute(updated);
    soundService.playFinish();

    if (isSimulating) {
      gpsSimulator.stopSimulation();
      setIsSimulating(false);
    }
  }, [currentRoute, isSimulating]);

  const cancelRecording = useCallback(async () => {
    if (!currentRoute) return;
    await dbService.deleteRoute(currentRoute.id);
    setCurrentRoute(null);
    setTrackPoints([]);
    setWaypoints([]);
    lastRecordedPointRef.current = null;
    if (isSimulating) {
      gpsSimulator.stopSimulation();
      setIsSimulating(false);
    }
  }, [currentRoute, isSimulating]);

  const addWaypoint = useCallback(
    async (
      title: string,
      category: WaypointCategory = 'milestone',
      notes = ''
    ) => {
      if (!currentRoute || !currentPosition) return;
      const now = Date.now();
      const wp: Waypoint = {
        id: `wp_${now}_${Math.random().toString(36).substring(2, 6)}`,
        routeId: currentRoute.id,
        lat: currentPosition.lat,
        lng: currentPosition.lng,
        altitude: currentPosition.altitude,
        title: title.trim() || `Punto ${waypoints.length + 1}`,
        notes: notes.trim(),
        category,
        timestamp: now,
      };

      await dbService.addWaypoint(wp);
      const updatedWps = [...waypoints, wp];
      setWaypoints(updatedWps);

      const updatedRoute = {
        ...currentRoute,
        waypointCount: updatedWps.length,
      };
      await dbService.saveRoute(updatedRoute);
      setCurrentRoute(updatedRoute);

      soundService.playWaypoint();
    },
    [currentPosition, currentRoute, waypoints]
  );

  const startSimulation = useCallback(
    (presetIndex = 0) => {
      setIsSimulating(true);
      setGpsStatus('simulated');
      gpsSimulator.startSimulation(presetIndex, (pos) => {
        processNewPosition(pos.coords, pos.timestamp);
      });
      soundService.playGPSLock();
    },
    [processNewPosition]
  );

  const stopSimulation = useCallback(() => {
    gpsSimulator.stopSimulation();
    setIsSimulating(false);
    setGpsStatus('searching');
  }, []);

  const loadRouteDetails = useCallback(async (routeId: string) => {
    const route = await dbService.getRoute(routeId);
    if (route) {
      const points = await dbService.getTrackPoints(routeId);
      const wps = await dbService.getWaypoints(routeId);
      setCurrentRoute(route);
      setTrackPoints(points);
      setWaypoints(wps);
      if (points.length > 0) {
        const last = points[points.length - 1];
        setCurrentPosition({
          lat: last.lat,
          lng: last.lng,
          altitude: last.altitude,
          accuracy: last.accuracy,
          speed: last.speed,
          heading: last.heading,
          timestamp: last.timestamp,
        });
      }
    }
  }, []);

  const updateSettings = useCallback((newPartial: Partial<TrackerSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newPartial };
      try {
        localStorage.setItem('rutagps_settings', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const calibrateAltitude = useCallback((targetAltitudeMeters: number) => {
    setCurrentPosition((prev) => {
      const currentRaw = prev?.altitude !== null && prev?.altitude !== undefined
        ? prev.altitude - (settingsRef.current.altitudeOffset || 0)
        : 450;
      const newOffset = Math.round((targetAltitudeMeters - currentRaw) * 10) / 10;

      setSettings((s) => {
        const updated = { ...s, altitudeOffset: newOffset };
        try {
          localStorage.setItem('rutagps_altitude_offset', String(newOffset));
          localStorage.setItem('rutagps_settings', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      if (!prev) {
        return {
          lat: 42.0,
          lng: 1.0,
          altitude: targetAltitudeMeters,
          accuracy: 5,
          speed: 0,
          heading: 0,
          timestamp: Date.now(),
        };
      }

      return {
        ...prev,
        altitude: targetAltitudeMeters,
      };
    });
  }, []);

  const resetAltitudeCalibration = useCallback(() => {
    setSettings((s) => {
      const updated = { ...s, altitudeOffset: 0 };
      try {
        localStorage.removeItem('rutagps_altitude_offset');
        localStorage.setItem('rutagps_settings', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setCurrentPosition((prev) => {
      if (!prev || prev.altitude === null) return prev;
      const currentOffset = settingsRef.current.altitudeOffset || 0;
      return {
        ...prev,
        altitude: Math.round((prev.altitude - currentOffset) * 10) / 10,
      };
    });
  }, []);

  return {
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
    calibrateAltitude,
    resetAltitudeCalibration,
    setCurrentRoute,
    setTrackPoints,
    setWaypoints,
  };
}
