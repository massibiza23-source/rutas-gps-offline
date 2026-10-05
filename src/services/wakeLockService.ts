/**
 * Screen WakeLock API Manager
 * Prevents mobile devices from sleeping during outdoor activities
 */

class WakeLockService {
  private wakeLock: any = null;
  private isRequested = false;

  async requestWakeLock(): Promise<boolean> {
    this.isRequested = true;
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return false;
    }

    try {
      this.wakeLock = await (navigator as any).wakeLock.request('screen');
      this.wakeLock.addEventListener('release', () => {
        this.wakeLock = null;
      });

      // Handle visibility changes (re-acquire when returning to tab)
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      return true;
    } catch {
      return false;
    }
  }

  private handleVisibilityChange = async () => {
    if (this.isRequested && document.visibilityState === 'visible' && !this.wakeLock) {
      await this.requestWakeLock();
    }
  };

  async releaseWakeLock(): Promise<void> {
    this.isRequested = false;
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
      } catch {
        // Ignored
      }
      this.wakeLock = null;
    }
  }

  isActive(): boolean {
    return this.wakeLock !== null;
  }
}

export const wakeLockService = new WakeLockService();
