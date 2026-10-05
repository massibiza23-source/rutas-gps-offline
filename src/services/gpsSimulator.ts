/**
 * GPS Trail Simulation Service
 * Generates realistic streaming GPS coordinates for testing outdoor tracking,
 * polyline rendering, waypoints, and battery profiles without needing to walk outside.
 */

export interface PresetTrack {
  id: string;
  name: string;
  description: string;
  activityType: 'hiking' | 'cycling' | 'trail_running';
  basePoints: Array<{ lat: number; lng: number; altitude: number }>;
}

export const PRESET_SIMULATED_TRACKS: PresetTrack[] = [
  {
    id: 'sendero_cumbre',
    name: 'Sendero Glaciar & Mirador del Águila',
    description: 'Ruta de senderismo de alta montaña con ascenso sostenido y curva panorámica.',
    activityType: 'hiking',
    basePoints: [
      { lat: 42.6105, lng: 0.1250, altitude: 1420 },
      { lat: 42.6118, lng: 0.1265, altitude: 1445 },
      { lat: 42.6135, lng: 0.1288, altitude: 1480 },
      { lat: 42.6149, lng: 0.1312, altitude: 1530 },
      { lat: 42.6160, lng: 0.1340, altitude: 1590 },
      { lat: 42.6182, lng: 0.1358, altitude: 1655 },
      { lat: 42.6201, lng: 0.1385, altitude: 1720 },
      { lat: 42.6225, lng: 0.1410, altitude: 1795 },
      { lat: 42.6248, lng: 0.1425, altitude: 1860 },
      { lat: 42.6265, lng: 0.1450, altitude: 1930 },
      { lat: 42.6280, lng: 0.1492, altitude: 2010 },
      { lat: 42.6295, lng: 0.1528, altitude: 2085 },
      { lat: 42.6310, lng: 0.1560, altitude: 2140 },
      { lat: 42.6318, lng: 0.1602, altitude: 2190 },
      { lat: 42.6305, lng: 0.1645, altitude: 2215 }, // Cumbre
      { lat: 42.6288, lng: 0.1680, altitude: 2180 },
      { lat: 42.6260, lng: 0.1702, altitude: 2120 },
      { lat: 42.6235, lng: 0.1718, altitude: 2040 },
    ],
  },
  {
    id: 'circuito_btt',
    name: 'Circuito BTT Desfiladero del Lobo',
    description: 'Pista rápida de ciclismo de montaña con cambios de rasante y curvas cerradas.',
    activityType: 'cycling',
    basePoints: [
      { lat: 40.4168, lng: -3.7038, altitude: 650 },
      { lat: 40.4182, lng: -3.7015, altitude: 655 },
      { lat: 40.4208, lng: -3.6980, altitude: 662 },
      { lat: 40.4235, lng: -3.6955, altitude: 674 },
      { lat: 40.4260, lng: -3.6920, altitude: 688 },
      { lat: 40.4278, lng: -3.6875, altitude: 679 },
      { lat: 40.4285, lng: -3.6820, altitude: 668 },
      { lat: 40.4270, lng: -3.6765, altitude: 659 },
      { lat: 40.4242, lng: -3.6720, altitude: 648 },
      { lat: 40.4210, lng: -3.6690, altitude: 640 },
      { lat: 40.4175, lng: -3.6685, altitude: 638 },
      { lat: 40.4140, lng: -3.6715, altitude: 644 },
      { lat: 40.4120, lng: -3.6760, altitude: 652 },
      { lat: 40.4132, lng: -3.6825, altitude: 658 },
      { lat: 40.4150, lng: -3.6890, altitude: 662 },
    ],
  },
];

export class GPSSimulator {
  private timer: any = null;
  private currentStep = 0;
  private points: Array<{ lat: number; lng: number; altitude: number }> = [];
  private onPositionUpdate: ((pos: GeolocationPosition) => void) | null = null;
  private speed = 1.0;

  startSimulation(
    trackIndex = 0,
    callback: (pos: GeolocationPosition) => void,
    intervalMs = 1500
  ) {
    this.stopSimulation();
    const track = PRESET_SIMULATED_TRACKS[trackIndex] || PRESET_SIMULATED_TRACKS[0];

    // Generate interpolated denser points for smooth tracking
    this.points = [];
    for (let i = 0; i < track.basePoints.length - 1; i++) {
      const p1 = track.basePoints[i];
      const p2 = track.basePoints[i + 1];
      const steps = 8;
      for (let s = 0; s < steps; s++) {
        const ratio = s / steps;
        // add slight GPS jitter
        const jitterLat = (Math.random() - 0.5) * 0.00004;
        const jitterLng = (Math.random() - 0.5) * 0.00004;
        const jitterAlt = (Math.random() - 0.5) * 1.5;

        this.points.push({
          lat: p1.lat + (p2.lat - p1.lat) * ratio + jitterLat,
          lng: p1.lng + (p2.lng - p1.lng) * ratio + jitterLng,
          altitude: p1.altitude + (p2.altitude - p1.altitude) * ratio + jitterAlt,
        });
      }
    }
    this.points.push(track.basePoints[track.basePoints.length - 1]);

    this.currentStep = 0;
    this.onPositionUpdate = callback;

    const emitNextPoint = () => {
      if (this.currentStep >= this.points.length) {
        // loop or finish
        this.currentStep = 0;
      }

      const p = this.points[this.currentStep];
      const nextP = this.points[(this.currentStep + 1) % this.points.length];

      // calculate simulated heading & speed
      const speedKmh = track.activityType === 'cycling' ? 18 + Math.random() * 5 : 4.5 + Math.random() * 1.2;
      const speedMs = speedKmh / 3.6;

      const mockPosition: GeolocationPosition = {
        coords: {
          latitude: p.lat,
          longitude: p.lng,
          altitude: p.altitude,
          accuracy: 4 + Math.random() * 3, // very good outdoor GPS accuracy 4-7m
          altitudeAccuracy: 6,
          heading: Math.atan2(nextP.lng - p.lng, nextP.lat - p.lat) * (180 / Math.PI),
          speed: speedMs,
          toJSON: () => ({}),
        } as GeolocationCoordinates,
        timestamp: Date.now(),
        toJSON: () => ({}),
      } as GeolocationPosition;

      if (this.onPositionUpdate) {
        this.onPositionUpdate(mockPosition);
      }

      this.currentStep++;
    };

    emitNextPoint();
    this.timer = setInterval(emitNextPoint, intervalMs);
  }

  stopSimulation() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.currentStep = 0;
    this.onPositionUpdate = null;
  }

  isRunning(): boolean {
    return this.timer !== null;
  }
}

export const gpsSimulator = new GPSSimulator();
