import React from 'react';
import { 
  Activity, 
  User, 
  Stethoscope, 
  ChevronRight, 
  ShieldCheck, 
  Mic, 
  Clock, 
  FileCheck2, 
  AlertTriangle 
} from 'lucide-react';
import { motion } from 'motion/react';

interface PortalGatewayProps {
  onSelectPatient: () => void;
  onSelectGP: () => void;
}

export default function PortalGateway({ onSelectPatient, onSelectGP }: PortalGatewayProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="max-w-3xl w-full"
      >
        {/* App Title Header */}
        <div className="text-center mb-10">
          <div className="inline-flex p-3.5 bg-sky-600 rounded-2xl mb-4 shadow-xl shadow-sky-600/25">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            MedTriage AI
          </h1>
          <p className="text-sm sm:text-base text-slate-600 font-medium mt-2 max-w-lg mx-auto">
            Intelligent Clinical Audio Triage & Practice Intake Management
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-800 bg-sky-100/70 px-3 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
            NHS Digital Standards & Caldicott Safety Compliant
          </div>
        </div>

        {/* Two Separate Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Patient Portal Card */}
          <motion.div 
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-3xl p-7 shadow-xl shadow-slate-200/70 border border-slate-200/90 flex flex-col justify-between relative overflow-hidden group hover:border-sky-300"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 rounded-bl-full -z-0 pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-5">
                <div className="p-3 bg-sky-100 text-sky-700 rounded-2xl group-hover:bg-sky-600 group-hover:text-white transition-colors">
                  <User className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
                  Patients & Carers
                </span>
              </div>

              <h2 className="text-xl font-bold text-slate-900 mb-2">
                Patient Portal
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Submit voice memos describing symptoms, receive immediate automated triage guidance, and track clinical status.
              </p>

              <div className="space-y-2 mb-8">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Mic className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span>Voice-first symptom recording</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span>Real-time consultation updates</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <FileCheck2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span>GP feedback & closure notes</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onSelectPatient}
              className="w-full py-3.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 transition-all relative z-10"
            >
              <span>Enter Patient Portal</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>

          {/* GP Clinical Staff Card */}
          <motion.div 
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ duration: 0.2 }}
            className="bg-slate-900 rounded-3xl p-7 shadow-2xl shadow-slate-900/30 border border-slate-800 flex flex-col justify-between relative overflow-hidden group hover:border-slate-700"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-950/40 rounded-bl-full -z-0 pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-5">
                <div className="p-3 bg-slate-800 text-sky-400 rounded-2xl group-hover:bg-sky-600 group-hover:text-white transition-colors">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold text-sky-300 bg-sky-950/80 px-2.5 py-1 rounded-full border border-sky-800/60">
                  Clinical Staff Only
                </span>
              </div>

              <h2 className="text-xl font-bold text-white mb-2">
                GP Staff Portal
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Manage practice triage queue, assess emergency red flags, listen to patient audio, and complete disposition audits.
              </p>

              <div className="space-y-2 mb-8">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Prioritized urgency scoring</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Mic className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Original audio playback & transcript</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <FileCheck2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Status lifecycle & audit logging</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onSelectGP}
              className="w-full py-3.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-600/25 transition-all relative z-10"
            >
              <span>Enter GP Clinical Staff Portal</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>

        {/* Footer info */}
        <div className="mt-10 text-center text-xs text-slate-400">
          <p>MedTriage AI Clinical System • Practice Triage Workstation v2.0</p>
        </div>
      </motion.div>
    </div>
  );
}
