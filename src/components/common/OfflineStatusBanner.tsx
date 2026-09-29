import React from 'react';
import { usePWA } from '../../context/PWAContext';
import { WifiOff, RefreshCw, Smartphone, Download, CheckCircle2 } from 'lucide-react';

export const OfflineStatusBanner: React.FC = () => {
  const { isOnline, updateAvailable, reloadToUpdate, isInstalled, promptInstall, isInstallable } = usePWA();

  return (
    <>
      {/* Offline Status Indicator */}
      {!isOnline && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-sm z-50 sticky top-0">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-slate-950 animate-pulse" />
              <span>You are currently offline. Working from local cached records.</span>
            </div>
            <span className="text-[10.5px] font-semibold bg-amber-600/30 px-2 py-0.5 rounded text-slate-950">
              Offline Mode Active
            </span>
          </div>
        </div>
      )}

      {/* App Update Ready Banner */}
      {updateAvailable && (
        <div className="bg-indigo-600 text-white px-4 py-2 text-xs font-medium flex items-center justify-between shadow-md z-50 sticky top-0">
          <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-indigo-200 animate-spin" />
              <span>A new version of E3 School Portal is ready.</span>
            </div>
            <button
              onClick={reloadToUpdate}
              className="px-3 py-1 bg-white text-indigo-700 font-bold rounded-lg hover:bg-indigo-50 transition-colors text-xs cursor-pointer shadow-xs"
            >
              Update Now
            </button>
          </div>
        </div>
      )}
    </>
  );
};
