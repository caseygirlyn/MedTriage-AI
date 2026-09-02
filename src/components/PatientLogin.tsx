import React, { useState } from 'react';
import { 
  User, 
  Lock, 
  Loader2, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowLeft, 
  Heart, 
  Sparkles,
  Stethoscope
} from 'lucide-react';
import { motion } from 'motion/react';

interface PatientLoginProps {
  onLogin: (user: { role: 'patient'; name: string }) => void;
  onSwitchToGP: () => void;
  onBackToGateway: () => void;
}

export default function PatientLogin({ onLogin, onSwitchToGP, onBackToGateway }: PatientLoginProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [nhsNumber, setNhsNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const endpoint = isRegistering ? '/api/register' : '/api/login';
      const body = isRegistering 
        ? { nhs_number: nhsNumber.trim(), full_name: fullName.trim(), password }
        : { role: 'patient', password, nhs_number: nhsNumber.trim() };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        if (isRegistering) {
          setSuccessMessage('NHS patient account created! You can now log in.');
          setIsRegistering(false);
          setPassword('');
        } else {
          onLogin({ role: 'patient', name: data.name });
        }
      } else {
        setError(data.message || 'Authentication failed. Please verify your credentials.');
      }
    } catch (err) {
      setError('Connection error. Please ensure the server is running and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoAutofill = (nhs: string, name: string) => {
    setNhsNumber(nhs);
    setPassword('pass123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/60 border border-slate-200/80"
      >
        {/* Navigation & Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={onBackToGateway}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors py-1 px-2 -ml-2 rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Portals
          </button>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-100">
            <Heart className="w-3 h-3 text-sky-600 fill-sky-600/20" />
            NHS Patient Portal
          </span>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex p-3.5 bg-sky-600 rounded-2xl mb-3 shadow-lg shadow-sky-600/25">
            <User className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isRegistering ? 'Register NHS Account' : 'Patient Sign In'}
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            {isRegistering 
              ? 'Create a patient account to submit voice memos and view GP triage outcomes'
              : 'Sign in with your 10-digit NHS number to access your triage history'}
          </p>
        </div>

        {/* Demo Accounts Quick-Select */}
        {!isRegistering && (
          <div className="p-3.5 bg-sky-50/70 border border-sky-100 rounded-2xl mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-sky-600" />
                Demo Patient Accounts
              </span>
              <span className="text-[10px] text-sky-600 font-mono">pass: pass123</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button 
                type="button"
                onClick={() => handleDemoAutofill('1234567890', 'Sarah Jenkins')}
                className="p-2 bg-white hover:bg-sky-100/60 border border-sky-200/80 rounded-xl text-left transition-all group"
              >
                <p className="text-[11px] font-bold text-slate-800 group-hover:text-sky-700 truncate">Sarah J.</p>
                <p className="text-[9px] text-slate-400 font-mono">1234567890</p>
              </button>
              <button 
                type="button"
                onClick={() => handleDemoAutofill('9876543210', 'Jenny Wilson')}
                className="p-2 bg-white hover:bg-sky-100/60 border border-sky-200/80 rounded-xl text-left transition-all group"
              >
                <p className="text-[11px] font-bold text-slate-800 group-hover:text-sky-700 truncate">Jenny W.</p>
                <p className="text-[9px] text-slate-400 font-mono">9876543210</p>
              </button>
              <button 
                type="button"
                onClick={() => handleDemoAutofill('5556667777', 'Elena Rodriguez')}
                className="p-2 bg-white hover:bg-sky-100/60 border border-sky-200/80 rounded-xl text-left transition-all group"
              >
                <p className="text-[11px] font-bold text-slate-800 group-hover:text-sky-700 truncate">Elena R.</p>
                <p className="text-[9px] text-slate-400 font-mono">5556667777</p>
              </button>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider ml-1">
              NHS Number
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={nhsNumber}
                onChange={(e) => setNhsNumber(e.target.value)}
                placeholder="e.g. 1234567890"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-mono"
                required
              />
            </div>
          </div>

          {isRegistering && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider ml-1">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider ml-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                required
              />
            </div>
          </div>

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2 text-emerald-700 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 transition-all disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{isRegistering ? 'Complete NHS Registration' : 'Access Patient Portal'}</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="pt-2 text-center">
            <button 
              type="button"
              onClick={() => { 
                setIsRegistering(!isRegistering); 
                setError(null); 
                setSuccessMessage(null); 
              }}
              className="text-xs font-semibold text-sky-600 hover:text-sky-800 hover:underline transition-colors"
            >
              {isRegistering ? 'Already registered? Log in here' : 'New patient? Register your NHS account'}
            </button>
          </div>
        </form>

        {/* Switch to GP Login */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500 mb-2">Are you a GP or practice staff member?</p>
          <button
            type="button"
            onClick={onSwitchToGP}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-sky-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Stethoscope className="w-3.5 h-3.5 text-sky-600" />
            Go to GP Staff Login
          </button>
          <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>NHS Digital Standards • 256-Bit Encrypted</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
