import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-16 left-4 z-40 flex items-center gap-2 rounded-xl bg-amber-600/90 border border-amber-400/50 px-3 py-1.5 text-xs font-semibold text-white shadow-xl backdrop-blur-md animate-pulse">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Modo 100% Offline Activo</span>
    </div>
  );
};
