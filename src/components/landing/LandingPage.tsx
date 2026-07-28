import React from 'react';
import {
  GraduationCap,
  ShieldCheck,
  Building2,
  BookOpen,
  Users,
  Award,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between">
      {/* Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-lg shadow-md shadow-blue-500/20">
              E3
            </div>
            <span className="font-bold text-lg text-white tracking-tight">E3 School Portal</span>
          </div>

          <button
            onClick={onGetStarted}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
          >
            Access Portal <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-1 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Lightweight Academic Management System • Version 1
          </span>

          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Remove the stress of calculating results so teachers can focus on teaching.
          </h1>

          <p className="text-base text-slate-300 leading-relaxed font-normal">
            E3 School Portal simplifies how schools record student assessments, calculates subject totals and overall averages automatically, and allows parents to monitor their child's academic progress online.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onGetStarted}
              className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              Get Started / Sign In <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4 Role Capabilities Grid */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-800/60 border border-slate-700/80 p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white">1. Super Admin (E3)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Platform governance, registering schools, managing school activation status, and subscription oversight.
            </p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/80 p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white">2. School Admin</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Manage students, teachers, classes, subjects, teacher course assignments, and review & publish result sheets.
            </p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/80 p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white">3. Teachers</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enter assessment scores up to max limits. Scores, subject totals, and grades calculate live and automatically!
            </p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/80 p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white">4. Parents & Students</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Secure online access to view official published report cards, score breakdowns, teacher remarks, and averages.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          E3 School Portal • Version 1 MVP • Designed for Academic Excellence & Efficient Result Processing
        </div>
      </footer>
    </div>
  );
};
