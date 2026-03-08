import React, { useState } from 'react';
import { Activity, User, Lock, Loader2, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginProps {
  onLogin: (user: { role: 'patient' | 'gp'; name: string }) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [role, setRole] = useState<'patient' | 'gp'>('patient');
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
        ? { nhs_number: nhsNumber, full_name: fullName, password }
        : { role, password, nhs_number: nhsNumber };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        if (isRegistering) {
          setSuccessMessage('Account created! Please log in.');
          setIsRegistering(false);
          setPassword('');
        } else {
          onLogin({ role: data.role, name: data.name });
        }
      } else {
        setError(data.message || 'Action failed');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full glass-card rounded-3xl p-8 border border-slate-200"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 bg-sky-600 rounded-2xl mb-4 shadow-lg shadow-sky-200">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Patient Voice Intake</h1>
          <p className="text-sm text-slate-500 font-medium">Clinical Intake & Triage System</p>
        </div>

        <div className="flex p-1 bg-slate-100 rounded-xl mb-8">
          <button 
            onClick={() => { setRole('patient'); setIsRegistering(false); setError(null); }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${role === 'patient' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Patient
          </button>
          <button 
            onClick={() => { setRole('gp'); setIsRegistering(false); setError(null); }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${role === 'gp' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            GP Staff
          </button>
        </div>

        {role === 'patient' && !isRegistering && (
          <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl mb-6">
            <p className="text-[10px] font-bold text-sky-700 uppercase tracking-widest mb-2">Demo Patient Accounts</p>
            <div className="grid grid-cols-1 gap-1">
              <button 
                type="button"
                onClick={() => { setNhsNumber('1234567890'); setPassword('pass123'); }}
                className="text-[10px] text-sky-600 hover:text-sky-800 text-left flex justify-between group"
              >
                <span className="group-hover:underline">Sarah Jenkins</span>
                <span className="font-mono">1234567890</span>
              </button>
              <button 
                type="button"
                onClick={() => { setNhsNumber('9876543210'); setPassword('pass123'); }}
                className="text-[10px] text-sky-600 hover:text-sky-800 text-left flex justify-between group"
              >
                <span className="group-hover:underline">Jenny Wilson</span>
                <span className="font-mono">9876543210</span>
              </button>
            </div>
            <p className="text-[9px] text-sky-400 mt-2 italic">Password for all: pass123</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {role === 'patient' && (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">NHS Number</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    value={nhsNumber}
                    onChange={(e) => setNhsNumber(e.target.value)}
                    placeholder="Enter 10-digit NHS number..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    required
                  />
                </div>
              </div>

              {isRegistering && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name..."
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                      required
                    />
                  </div>
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
              {role === 'gp' ? 'Staff Password' : 'Password'}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={role === 'gp' ? "Enter GP access code..." : "Enter your password..."}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                required
              />
            </div>
            {role === 'gp' && <p className="text-[10px] text-slate-400 ml-1 italic">Demo password: gp123</p>}
          </div>

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2 text-emerald-600 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4" />
              {successMessage}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-xs font-medium">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-sky-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-sky-700 transition-all shadow-lg shadow-sky-100 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                {isRegistering ? 'Create Account' : 'Access System'}
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>

          {role === 'patient' && (
            <button 
              type="button"
              onClick={() => { setIsRegistering(!isRegistering); setError(null); setSuccessMessage(null); }}
              className="w-full text-center text-xs font-bold text-sky-600 hover:underline mt-2"
            >
              {isRegistering ? 'Already have an account? Log in' : 'New patient? Register here'}
            </button>
          )}
        </form>

        <div className="mt-8 pt-8 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">NHS Digital Standards Compliant</p>
        </div>
      </motion.div>
    </div>
  );
}
