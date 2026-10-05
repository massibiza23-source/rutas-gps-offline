/**
 * IndexedDB Local Storage Service
 * Provides 100% offline persistence for routes, GPS points, waypoints, and cached tiles.
 */

import { RouteRecord, TrackPoint, Waypoint } from '../types/gps';

const DB_NAME = 'OutdoorGPS_Tracker_DB';
const DB_VERSION = 1;

class GPSDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB no está soportado en este entorno.'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Stores: routes
        if (!db.objectStoreNames.contains('routes')) {
          const routesStore = db.createObjectStore('routes', { keyPath: 'id' });
          routesStore.createIndex('startTime', 'startTime', { unique: false });
          routesStore.createIndex('status', 'status', { unique: false });
        }

        // Stores: trackPoints
        if (!db.objectStoreNames.contains('trackPoints')) {
          const pointsStore = db.createObjectStore('trackPoints', { keyPath: 'id' });
          pointsStore.createIndex('routeId', 'routeId', { unique: false });
          pointsStore.createIndex('routeId_timestamp', ['routeId', 'timestamp'], { unique: false });
        }

        // Stores: waypoints
        if (!db.objectStoreNames.contains('waypoints')) {
          const waypointsStore = db.createObjectStore('waypoints', { keyPath: 'id' });
          waypointsStore.createIndex('routeId', 'routeId', { unique: false });
        }

        // Stores: offlineTiles
        if (!db.objectStoreNames.contains('offlineTiles')) {
          const tilesStore = db.createObjectStore('offlineTiles', { keyPath: 'key' });
          tilesStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  // --- ROUTES ---

  async saveRoute(route: RouteRecord): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('routes', 'readwrite');
      const store = tx.objectStore('routes');
      store.put(route);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getRoute(id: string): Promise<RouteRecord | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('routes', 'readonly');
      const store = tx.objectStore('routes');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async getAllRoutes(): Promise<RouteRecord[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('routes', 'readonly');
      const store = tx.objectStore('routes');
      const index = store.index('startTime');
      const req = index.openCursor(null, 'prev'); // Most recent first
      const routes: RouteRecord[] = [];

      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          routes.push(cursor.value);
          cursor.continue();
        } else {
          resolve(routes);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async deleteRoute(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['routes', 'trackPoints', 'waypoints'], 'readwrite');

      // 1. Delete route
      tx.objectStore('routes').delete(id);

      // 2. Delete all points of this route
      const pointsStore = tx.objectStore('trackPoints');
      const pointsIndex = pointsStore.index('routeId');
      const pointsReq = pointsIndex.openKeyCursor(IDBKeyRange.only(id));
      pointsReq.onsuccess = () => {
        const cursor = pointsReq.result;
        if (cursor) {
          pointsStore.delete(cursor.primaryKey);
          cursor.continue();
        }
      };

      // 3. Delete all waypoints of this route
      const waypointsStore = tx.objectStore('waypoints');
      const waypointsIndex = waypointsStore.index('routeId');
      const wpReq = waypointsIndex.openKeyCursor(IDBKeyRange.only(id));
      wpReq.onsuccess = () => {
        const cursor = wpReq.result;
        if (cursor) {
          waypointsStore.delete(cursor.primaryKey);
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- TRACK POINTS ---

  async addTrackPoint(point: TrackPoint): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('trackPoints', 'readwrite');
      const store = tx.objectStore('trackPoints');
      store.put(point);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async addTrackPointsBatch(points: TrackPoint[]): Promise<void> {
    if (points.length === 0) return;
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('trackPoints', 'readwrite');
      const store = tx.objectStore('trackPoints');
      for (const p of points) {
        store.put(p);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getTrackPoints(routeId: string): Promise<TrackPoint[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('trackPoints', 'readonly');
      const store = tx.objectStore('trackPoints');
      const index = store.index('routeId');
      const req = index.getAll(IDBKeyRange.only(routeId));

      req.onsuccess = () => {
        // Sort chronologically
        const points = (req.result as TrackPoint[]) || [];
        points.sort((a, b) => a.timestamp - b.timestamp);
        resolve(points);
      };
      req.onerror = () => reject(req.error);
    });
  }

  // --- WAYPOINTS ---

  async addWaypoint(waypoint: Waypoint): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('waypoints', 'readwrite');
      const store = tx.objectStore('waypoints');
      store.put(waypoint);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getWaypoints(routeId: string): Promise<Waypoint[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('waypoints', 'readonly');
      const store = tx.objectStore('waypoints');
      const index = store.index('routeId');
      const req = index.getAll(IDBKeyRange.only(routeId));

      req.onsuccess = () => {
        const waypoints = (req.result as Waypoint[]) || [];
        waypoints.sort((a, b) => a.timestamp - b.timestamp);
        resolve(waypoints);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async deleteWaypoint(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('waypoints', 'readwrite');
      const store = tx.objectStore('waypoints');
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- OFFLINE TILES CACHE ---

  async saveTile(key: string, dataUrl: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('offlineTiles', 'readwrite');
      const store = tx.objectStore('offlineTiles');
      store.put({ key, dataUrl, timestamp: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getTile(key: string): Promise<string | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('offlineTiles', 'readonly');
      const store = tx.objectStore('offlineTiles');
      const req = store.get(key);
      req.onsuccess = () => {
        resolve(req.result ? req.result.dataUrl : null);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getTileCount(): Promise<number> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('offlineTiles', 'readonly');
      const store = tx.objectStore('offlineTiles');
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async clearAllTiles(): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('offlineTiles', 'readwrite');
      const store = tx.objectStore('offlineTiles');
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const dbService = new GPSDatabase();
