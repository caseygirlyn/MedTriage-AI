import React, { useState } from 'react';
import { 
  Stethoscope, 
  Lock, 
  Loader2, 
  ChevronRight, 
  AlertCircle, 
  ShieldCheck, 
  ArrowLeft, 
  Sparkles,
  Building2,
  Heart,
  KeyRound,
  FileText
} from 'lucide-react';
import { motion } from 'motion/react';

interface GPLoginProps {
  onLogin: (user: { role: 'gp'; name: string }) => void;
  onSwitchToPatient: () => void;
  onBackToGateway: () => void;
}

export default function GPLogin({ onLogin, onSwitchToPatient, onBackToGateway }: GPLoginProps) {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'gp', password }),
      });

      const data = await response.json();

      if (data.success) {
        onLogin({ role: 'gp', name: data.name || 'Dr. Smith' });
      } else {
        setError(data.message || 'Invalid clinical access code. Access denied.');
      }
    } catch (err) {
      setError('Connection error. Please check your network and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoAutofill = () => {
    setPassword('gp123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full bg-slate-800/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-black/40 border border-slate-700/80"
      >
        {/* Top Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={onBackToGateway}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors py-1 px-2 -ml-2 rounded-lg hover:bg-slate-700/50"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Portals
          </button>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-400 bg-sky-950/80 px-2.5 py-1 rounded-full border border-sky-800/60">
            <Building2 className="w-3 h-3 text-sky-400" />
            Practice Clinical Staff
          </span>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3.5 bg-gradient-to-tr from-sky-600 to-indigo-600 rounded-2xl mb-3 shadow-lg shadow-sky-600/30">
            <Stethoscope className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">GP Clinical Login</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Authorised medical triage dashboard for GPs, duty doctors, and practice clinicians
          </p>
        </div>

        {/* Demo Fast-fill Banner */}
        <div className="p-3.5 bg-slate-900/80 border border-slate-700 rounded-2xl mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-slate-200">Demo Staff Access Passcode</p>
                <p className="text-[10px] text-slate-400 font-mono">Code: <span className="text-amber-400 font-bold">gp123</span></p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDemoAutofill}
              className="px-2.5 py-1 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Autofill
            </button>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">
              Clinical Access Passcode
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter GP access code..."
                className="w-full pl-10 pr-4 py-3 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 transition-all font-mono"
                required
                autoFocus
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl flex items-center gap-2 text-red-400 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-600/25 transition-all disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Access Clinical Triage Dashboard</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Clinical Safety & Compliance Notice */}
        <div className="mt-6 p-3 bg-slate-900/50 border border-slate-700/60 rounded-xl flex items-start gap-2.5">
          <FileText className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Clinical access is logged under Caldicott Principles. Triage results must be clinically verified prior to final patient disposition.
          </p>
        </div>

        {/* Switch to Patient Portal */}
        <div className="mt-8 pt-6 border-t border-slate-700 text-center">
          <p className="text-xs text-slate-400 mb-2">Are you a patient wanting to submit a voice memo?</p>
          <button
            type="button"
            onClick={onSwitchToPatient}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-700/80 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Heart className="w-3.5 h-3.5 text-sky-400" />
            Go to Patient Portal
          </button>
          <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Encrypted NHS Clinical Workstation Gateway</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
