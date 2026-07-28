import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import {
  GraduationCap,
  Lock,
  Mail,
  ShieldCheck,
  Building2,
  BookOpen,
  Users,
  User,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface LoginFormProps {
  onForgotPasswordClick: () => void;
  onBackToLanding?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onForgotPasswordClick,
  onBackToLanding,
}) => {
  const { login, switchDemoRole } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { role: 'school_admin' as UserRole, name: 'School Admin', email: 'principal@graceville.edu', color: 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100', icon: Building2 },
    { role: 'teacher' as UserRole, name: 'Teacher', email: 'david.o@graceville.edu', color: 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100', icon: BookOpen },
    { role: 'parent' as UserRole, name: 'Parent', email: 'parent@graceville.edu', color: 'bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Subtle Accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100/80 p-8 z-10">
        {onBackToLanding && (
          <div className="mb-4 text-left">
            <button
              onClick={onBackToLanding}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              ← Back to Landing Page
            </button>
          </div>
        )}

        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white font-black text-2xl shadow-lg shadow-blue-600/30 mb-3">
            E3
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">E3 School Portal</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Remove the stress of calculating results so teachers can focus on teaching.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium text-center">
            {error}
          </div>
        )}

        {/* Quick Demo Login Picker */}
        <div className="mb-6 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Instant Demo Sign-In
            </span>
            <span className="text-[10px] text-slate-400">1-Click Portal Access</span>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {demoAccounts.map((item) => {
              const IconComp = item.icon;
              return (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => switchDemoRole(item.role)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${item.color}`}
                >
                  <div className="flex items-center gap-2">
                    <IconComp className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative my-4 flex items-center justify-center">
          <div className="border-t border-slate-200 w-full"></div>
          <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider absolute">
            Or Sign In With Password
          </span>
        </div>

        {/* Standard Email/Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g., principal@graceville.edu"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-slate-700">Password</label>
              <button
                type="button"
                onClick={onForgotPasswordClick}
                className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                Forgot?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating...' : 'Sign In to Portal'}
          </button>
        </form>

        <p className="text-[11px] text-center text-slate-400 mt-6">
          Powered by <strong className="text-slate-600">E3 School Portal</strong> • Version 1 MVP
        </p>
      </div>
    </div>
  );
};
