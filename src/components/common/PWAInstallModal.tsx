import React, { useState } from 'react';
import { usePWA } from '../../context/PWAContext';
import { Modal } from './Modal';
import {
  Download,
  Smartphone,
  Laptop,
  Apple,
  Share,
  PlusSquare,
  CheckCircle2,
  Sparkles,
  WifiOff,
  Zap,
  ShieldCheck,
  Globe,
  ArrowRight,
  Monitor,
} from 'lucide-react';

export const PWAInstallModal: React.FC = () => {
  const {
    isInstallGuideOpen,
    closeInstallGuide,
    promptInstall,
    isIOS,
    isAndroid,
    isDesktop,
    isInstalled,
  } = usePWA();

  const [activeTab, setActiveTab] = useState<'current' | 'ios' | 'android' | 'desktop'>('current');

  const resolvedTab =
    activeTab === 'current'
      ? isIOS
        ? 'ios'
        : isAndroid
        ? 'android'
        : 'desktop'
      : activeTab;

  return (
    <Modal
      isOpen={isInstallGuideOpen}
      onClose={closeInstallGuide}
      title="Install E3 School Portal App"
      maxWidth="xl"
    >
      <div className="space-y-5">
        {/* App Hero Badge */}
        <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 p-0.5 shadow-md flex items-center justify-center shrink-0">
            <img
              src="/icons/icon-192.png"
              alt="E3 School Portal"
              className="w-full h-full object-cover rounded-xl"
              onError={(e) => {
                // fallback if png loading in iframe
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">E3 School Portal</h3>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                PWA
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Works seamlessly on iOS (iPhone/iPad), Android, Windows & Mac computers.
            </p>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-3 gap-2.5 text-center">
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <Zap className="w-4 h-4 text-amber-600 mx-auto mb-1" />
            <p className="text-[11px] font-bold text-slate-800">Instant Load</p>
            <p className="text-[10px] text-slate-500">Fast performance</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <WifiOff className="w-4 h-4 text-indigo-600 mx-auto mb-1" />
            <p className="text-[11px] font-bold text-slate-800">Offline Access</p>
            <p className="text-[10px] text-slate-500">View saved records</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
            <p className="text-[11px] font-bold text-slate-800">No App Store</p>
            <p className="text-[10px] text-slate-500">Zero download wait</p>
          </div>
        </div>

        {/* Platform Selection Tabs */}
        <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('current')}
            className={`flex-1 py-2 px-2 rounded-lg text-center transition-all cursor-pointer ${
              activeTab === 'current'
                ? 'bg-white text-indigo-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Your Device ({isIOS ? 'iOS' : isAndroid ? 'Android' : 'Computer'})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ios')}
            className={`py-2 px-3 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'ios'
                ? 'bg-white text-indigo-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Apple className="w-3.5 h-3.5" />
            iOS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`py-2 px-3 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'android'
                ? 'bg-white text-indigo-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Android
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('desktop')}
            className={`py-2 px-3 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'desktop'
                ? 'bg-white text-indigo-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            Computer
          </button>
        </div>

        {/* Dynamic Platform Instructions */}
        {resolvedTab === 'ios' && (
          <div className="space-y-3 bg-slate-50/80 border border-slate-200/90 p-4 rounded-2xl">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Apple className="w-4 h-4 text-slate-900" />
              <span>How to Install on iPhone or iPad (Safari):</span>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="flex items-start gap-3 p-2.5 bg-white rounded-xl border border-slate-200/70 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </div>
                <div>
                  <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                    Tap the Share button
                    <Share className="w-4 h-4 text-blue-600 inline-block" />
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Located at the bottom of Safari on iPhone, or top bar on iPad.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 bg-white rounded-xl border border-slate-200/70 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </div>
                <div>
                  <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                    Select "Add to Home Screen"
                    <PlusSquare className="w-4 h-4 text-indigo-600 inline-block" />
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Scroll down the share sheet menu until you see the Add to Home Screen option.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 bg-white rounded-xl border border-slate-200/70 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">
                  3
                </div>
                <div>
                  <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                    Tap "Add" in top-right
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 inline-block" />
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    The E3 School icon will now appear on your home screen and run in full-screen standalone mode.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {resolvedTab === 'android' && (
          <div className="space-y-3 bg-slate-50/80 border border-slate-200/90 p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>Android Installation:</span>
              </div>
              <button
                type="button"
                onClick={promptInstall}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Install Now
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="flex items-start gap-3 p-2.5 bg-white rounded-xl border border-slate-200/70 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Click "Install Now" or Browser Menu</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tap the green "Install Now" button above, or tap the three dots (⋮) in Chrome.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 bg-white rounded-xl border border-slate-200/70 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Tap "Install" on Prompt</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Android will create a native app drawer entry with instant notifications and offline caching.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {resolvedTab === 'desktop' && (
          <div className="space-y-3 bg-slate-50/80 border border-slate-200/90 p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Monitor className="w-4 h-4 text-indigo-600" />
                <span>Computer Desktop App (Windows / Mac / Linux):</span>
              </div>
              <button
                type="button"
                onClick={promptInstall}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Install Desktop App
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="flex items-start gap-3 p-2.5 bg-white rounded-xl border border-slate-200/70 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Click "Install Desktop App"</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Or click the Install icon (⤓) in your browser's address bar (Chrome, Edge, Brave).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 bg-white rounded-xl border border-slate-200/70 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Dedicated Window & Taskbar Icon</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Opens as a clean standalone desktop application without browser tabs or address bar clutter.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span>PWA Ready v1.0.0</span>
          </div>

          <button
            type="button"
            onClick={closeInstallGuide}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};
