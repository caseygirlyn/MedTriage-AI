import React, { useState, useRef, useEffect } from 'react';
import { 
  Activity, 
  Mic, 
  Square, 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  User, 
  Phone, 
  Calendar,
  Stethoscope,
  AlertTriangle,
  ChevronRight,
  Loader2,
  LayoutDashboard,
  ClipboardList,
  Search,
  Filter,
  ExternalLink,
  LogOut,
  Play,
  Pause,
  Volume2,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { processTriageAudio } from './services/geminiService';
import Login from './components/Login';

interface User {
  role: 'patient' | 'gp';
  name: string;
}

interface TriageResult {
  id?: number;
  patient_info: {
    name: string;
    dob_mentioned: string | null;
    phone_number: string;
    contact_number_verified: boolean;
  };
  clinical_data: {
    symptoms: string[];
    duration: string;
    pain_score_mentioned: number | null;
  };
  triage_logic: {
    urgency_score: string;
    triage_category: 'ROUTINE' | 'URGENT_SAME_DAY' | 'EMERGENCY_999';
    emergency_alert: boolean;
    recommended_action: string;
  };
  booking_intent: {
    preferred_time: string;
    clinician_preference: string | null;
  };
  ai_confidence: number;
  recording_url?: string;
  status: 'Pending' | 'Action Required' | 'In Progress' | 'Completed';
  closure_summary?: string;
  closed_by?: string;
  closed_at?: string;
  history?: {
    id: number;
    status: string;
    changed_by: string;
    notes: string;
    changed_at: string;
  }[];
  created_at?: string;
}

type View = 'patient' | 'gp';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'patient' | 'dashboard'>('patient');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [allMemos, setAllMemos] = useState<TriageResult[]>([]);
  const [isLoadingMemos, setIsLoadingMemos] = useState(false);
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);
  const [selectedMemo, setSelectedMemo] = useState<TriageResult | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (user?.role === 'gp') {
      setView('dashboard');
    } else {
      setView('patient');
    }
  }, [user]);

  useEffect(() => {
    if (view === 'dashboard') {
      if (user?.role === 'gp') {
        fetchMemos();
      } else {
        fetchPatientMemos();
      }
    }
  }, [view, user]);

  const fetchPatientMemos = async () => {
    if (!user?.name) return;
    setIsLoadingMemos(true);
    try {
      const response = await fetch(`/api/triage/patient/${encodeURIComponent(user.name)}`);
      const data = await response.json();
      
      const mappedData = data.map((item: any) => ({
        id: item.id,
        patient_info: {
          name: item.patient_name,
          dob_mentioned: item.patient_dob,
          phone_number: item.patient_phone,
          contact_number_verified: true,
        },
        clinical_data: {
          symptoms: JSON.parse(item.symptoms),
          duration: item.duration,
          pain_score_mentioned: null,
        },
        triage_logic: {
          urgency_score: item.urgency_score.toString(),
          triage_category: item.triage_category,
          emergency_alert: item.emergency_alert === 1,
          recommended_action: item.recommended_action,
        },
        booking_intent: {
          preferred_time: item.preferred_time,
          clinician_preference: item.clinician_preference,
        },
        ai_confidence: item.ai_confidence,
        recording_url: item.recording_url,
        status: item.status,
        closure_summary: item.closure_summary,
        closed_by: item.closed_by,
        closed_at: item.closed_at,
        history: item.history,
        created_at: item.created_at,
      }));
      setAllMemos(mappedData);
    } catch (err) {
      console.error("Failed to fetch patient memos", err);
    } finally {
      setIsLoadingMemos(false);
    }
  };

  const fetchMemos = async () => {
    setIsLoadingMemos(true);
    try {
      const response = await fetch('/api/triage');
      const data = await response.json();
      // Map flat DB structure back to nested interface
      const mappedData = data.map((item: any) => ({
        id: item.id,
        patient_info: {
          name: item.patient_name,
          dob_mentioned: item.patient_dob,
          phone_number: item.patient_phone,
          contact_number_verified: true,
        },
        clinical_data: {
          symptoms: JSON.parse(item.symptoms),
          duration: item.duration,
          pain_score_mentioned: null,
        },
        triage_logic: {
          urgency_score: item.urgency_score.toString(),
          triage_category: item.triage_category,
          emergency_alert: item.emergency_alert === 1,
          recommended_action: item.recommended_action,
        },
        booking_intent: {
          preferred_time: item.preferred_time,
          clinician_preference: item.clinician_preference,
        },
        ai_confidence: item.ai_confidence,
        recording_url: item.recording_url,
        status: item.status,
        closure_summary: item.closure_summary,
        closed_by: item.closed_by,
        closed_at: item.closed_at,
        history: item.history,
        created_at: item.created_at,
      }));
      setAllMemos(mappedData);
    } catch (err) {
      console.error("Failed to fetch memos", err);
    } finally {
      setIsLoadingMemos(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    
    try {
      const response = await fetch(`/api/triage/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setAllMemos(prev => prev.filter(m => m.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete record:', err);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError("Microphone access denied. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioBlob(file);
      setError(null);
    }
  };

  const processAudio = async () => {
    if (!audioBlob) return;

    setIsProcessing(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        const mimeType = audioBlob.type || 'audio/webm';
        
        try {
          // 1. Upload audio to server
          const uploadResponse = await fetch('/api/upload-audio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64Audio, mimeType }),
          });
          const uploadData = await uploadResponse.json();
          const recording_url = uploadData.url;

          // 2. Process with AI
          const triageData = await processTriageAudio(base64Audio, mimeType, user?.name);
          setResult(triageData);
          
          // 3. Save to backend
          await fetch('/api/triage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...triageData,
              recording_url: recording_url
            }),
          });
        } catch (err) {
          console.error(err);
          setError("Failed to process audio. Please try again.");
        } finally {
          setIsProcessing(false);
        }
      };
    } catch (err) {
      setError("Error reading audio file.");
      setIsProcessing(false);
    }
  };

  const getUrgencyColor = (category: string) => {
    switch (category) {
      case 'EMERGENCY_999': return 'text-red-600 bg-red-50 border-red-200';
      case 'URGENT_SAME_DAY': return 'text-amber-600 bg-amber-50 border-amber-200';
      default: return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    }
  };

  const getUrgencyBadge = (category: string) => {
    switch (category) {
      case 'EMERGENCY_999': return 'bg-red-500 text-white';
      case 'URGENT_SAME_DAY': return 'bg-amber-500 text-white';
      default: return 'bg-emerald-500 text-white';
    }
  };

  const handleUpdateStatus = async (id: number, status: string, notes: string, summary?: string) => {
    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/triage/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          notes,
          closure_summary: summary,
          changed_by: user?.name || 'Unknown'
        })
      });
      if (response.ok) {
        await fetchMemos();
        setSelectedMemo(null);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'text-slate-600 bg-slate-100 border-slate-200';
      case 'Action Required': return 'text-red-600 bg-red-50 border-red-200';
      case 'In Progress': return 'text-sky-600 bg-sky-50 border-sky-200';
      case 'Completed': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      default: return 'text-slate-600 bg-slate-100 border-slate-200';
    }
  };

  const StatusBadge = ({ status }: { status: string }) => (
    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(status)}`}>
      {status}
    </span>
  );

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Rail */}
      <nav className="fixed left-0 top-0 h-full w-20 bg-slate-900 flex flex-col items-center py-8 gap-8 z-50">
        <div className="p-3 bg-sky-600 rounded-xl mb-4">
          <Activity className="w-6 h-6 text-white" />
        </div>
        
        {user.role === 'patient' && (
          <>
            <button 
              onClick={() => setView('patient')}
              className={`p-3 rounded-xl transition-all ${view === 'patient' ? 'bg-sky-600/20 text-sky-400' : 'text-slate-500 hover:text-slate-300'}`}
              title="Patient Intake"
            >
              <Mic className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setView('dashboard')}
              className={`p-3 rounded-xl transition-all ${view === 'dashboard' ? 'bg-sky-600/20 text-sky-400' : 'text-slate-500 hover:text-slate-300'}`}
              title="My Dashboard"
            >
              <LayoutDashboard className="w-6 h-6" />
            </button>
          </>
        )}

        {user.role === 'gp' && (
          <button 
            onClick={() => setView('dashboard')}
            className={`p-3 rounded-xl transition-all ${view === 'dashboard' ? 'bg-sky-600/20 text-sky-400' : 'text-slate-500 hover:text-slate-300'}`}
            title="GP Dashboard"
          >
            <LayoutDashboard className="w-6 h-6" />
          </button>
        )}

        <button 
          onClick={() => setUser(null)}
          className="mt-auto p-3 text-slate-500 hover:text-red-400 transition-colors"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </nav>

      <main className="pl-20 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <header className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {view === 'patient' ? 'Patient Voice Intake' : user.role === 'gp' ? 'GP Triage Dashboard' : 'My Health Dashboard'}
              </h1>
              <p className="text-sm text-slate-500 font-medium">
                {view === 'patient' ? 'Secure clinical submission for GP review' : user.role === 'gp' ? 'Integrated with Accurx • Real-time patient prioritization' : 'Track your clinical submissions and GP feedback'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right mr-2">
                <p className="text-xs font-bold text-slate-900">{user.name}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">{user.role === 'gp' ? 'Clinician' : 'Patient'}</p>
              </div>
              <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-100">
                Accurx Integrated
              </div>
              <div className="hidden md:block text-right">
                <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">System Status: Operational</p>
              </div>
            </div>
          </header>

          <AnimatePresence mode="wait">
            {view === 'patient' ? (
              <motion.div 
                key="patient-view"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8"
              >
                {/* Left Column: Input */}
                <div className="lg:col-span-5 space-y-6">
                  <section className="glass-card rounded-2xl p-6 border border-slate-200">
                    <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">Patient Voice Intake</h2>
                    
                    <div className="space-y-4">
                      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 transition-colors hover:border-sky-300">
                        <AnimatePresence mode="wait">
                          {isRecording ? (
                            <motion.div 
                              key="recording"
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.8, opacity: 0 }}
                              className="flex flex-col items-center"
                            >
                              <div className="relative">
                                <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20" />
                                <button 
                                  onClick={stopRecording}
                                  className="relative p-6 bg-red-500 rounded-full text-white shadow-lg hover:bg-red-600 transition-colors"
                                >
                                  <Square className="w-8 h-8 fill-current" />
                                </button>
                              </div>
                              <p className="mt-4 text-sm font-medium text-red-600 animate-pulse">Recording Patient Audio...</p>
                            </motion.div>
                          ) : (
                            <motion.div 
                              key="idle"
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.8, opacity: 0 }}
                              className="flex flex-col items-center"
                            >
                              <button 
                                onClick={startRecording}
                                className="p-6 bg-sky-600 rounded-full text-white shadow-lg hover:bg-sky-700 transition-colors"
                              >
                                <Mic className="w-8 h-8" />
                              </button>
                              <p className="mt-4 text-sm font-medium text-slate-600">Click to start recording</p>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="mt-6 flex items-center gap-4 w-full">
                          <div className="h-px bg-slate-200 flex-1" />
                          <span className="text-xs font-bold text-slate-400 uppercase">or</span>
                          <div className="h-px bg-slate-200 flex-1" />
                        </div>

                        <label className="mt-6 flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors">
                          <Upload className="w-4 h-4" />
                          Upload Recording
                          <input type="file" className="hidden" accept="audio/*" onChange={handleFileUpload} />
                        </label>
                      </div>

                      {audioBlob && !isRecording && (
                        <motion.div 
                          initial={{ y: 10, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          className="p-4 bg-sky-50 border border-sky-100 rounded-xl flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-sky-100 rounded-lg text-sky-600">
                              <Activity className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-sky-900 uppercase tracking-tight">Audio Ready</p>
                              <p className="text-[10px] text-sky-600">{(audioBlob.size / 1024 / 1024).toFixed(2)} MB • Ready for Triage</p>
                            </div>
                          </div>
                          <button 
                            onClick={processAudio}
                            disabled={isProcessing}
                            className="px-4 py-2 bg-sky-600 text-white text-xs font-bold rounded-lg hover:bg-sky-700 disabled:opacity-50 flex items-center gap-2"
                          >
                            {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : "Process"}
                          </button>
                        </motion.div>
                      )}

                      {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                          <p className="text-xs text-red-600 font-medium">{error}</p>
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="p-6 bg-slate-900 rounded-2xl text-white">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Safety Protocol</h3>
                    <ul className="space-y-3">
                      {[
                        "Automatic Red Flag Detection",
                        "UK GP Triage Standards (NHS)",
                        "Encrypted Audio Processing",
                        "Direct 999 Escalation Logic"
                      ].map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-slate-300">
                          <CheckCircle2 className="w-3 h-3 text-sky-400" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>

                {/* Right Column: Results */}
                <div className="lg:col-span-7">
                  <AnimatePresence mode="wait">
                    {isProcessing ? (
                      <motion.div 
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-full flex flex-col items-center justify-center p-12 glass-card rounded-2xl border border-slate-200"
                      >
                        <Loader2 className="w-12 h-12 text-sky-600 animate-spin mb-4" />
                        <h3 className="text-lg font-bold text-slate-900">Analyzing Clinical Intent</h3>
                        <p className="text-sm text-slate-500 max-w-xs text-center mt-2">
                          Our AI is extracting patient details, symptoms, and determining triage urgency...
                        </p>
                      </motion.div>
                    ) : result ? (
                      <motion.div 
                        key="result"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                      >
                        {/* Urgency Banner */}
                        <div className={`p-6 rounded-2xl border flex items-center justify-between ${getUrgencyColor(result.triage_logic.triage_category)}`}>
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl bg-white/50`}>
                              {result.triage_logic.emergency_alert ? <AlertTriangle className="w-6 h-6" /> : <Stethoscope className="w-6 h-6" />}
                            </div>
                            <div>
                              <h3 className="text-sm font-bold uppercase tracking-widest opacity-70">Triage Category</h3>
                              <p className="text-2xl font-black tracking-tight">{result.triage_logic.triage_category.replace(/_/g, ' ')}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold opacity-70 uppercase">Urgency Score</p>
                            <p className="text-3xl font-black">{result.triage_logic.urgency_score}/5</p>
                          </div>
                        </div>

                        {/* Main Data Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Patient Info - Only show to GP */}
                          {user?.role === 'gp' && (
                            <div className="glass-card rounded-2xl p-6 border border-slate-200">
                              <div className="flex items-center gap-2 mb-4">
                                <User className="w-4 h-4 text-sky-600" />
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Patient Identity</h3>
                              </div>
                              <div className="space-y-4">
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Full Name</p>
                                  <p className="text-lg font-bold text-slate-900">{result.patient_info.name}</p>
                                </div>
                                <div className="flex justify-between">
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Phone Number</p>
                                    <p className="text-sm font-bold text-sky-600">{result.patient_info.phone_number}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">DOB</p>
                                    <p className="text-sm font-medium text-slate-700">{result.patient_info.dob_mentioned || 'N/A'}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Clinical Data */}
                          <div className="glass-card rounded-2xl p-6 border border-slate-200">
                            <div className="flex items-center gap-2 mb-4">
                              <Activity className="w-4 h-4 text-sky-600" />
                              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clinical Presentation</h3>
                            </div>
                            <div className="space-y-4">
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Symptoms Detected</p>
                                <div className="flex flex-wrap gap-2">
                                  {result.clinical_data.symptoms.map((s, i) => (
                                    <span key={i} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-[10px] font-bold uppercase">{s}</span>
                                  ))}
                                </div>
                              </div>
                              <div className="flex justify-between">
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Duration</p>
                                  <p className="text-sm font-medium text-slate-700">{result.clinical_data.duration}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Pain Score</p>
                                  <p className="text-sm font-bold text-slate-900">{result.clinical_data.pain_score_mentioned ? `${result.clinical_data.pain_score_mentioned}/10` : 'N/A'}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Recommended Action */}
                        <div className="glass-card rounded-2xl p-6 border border-slate-200">
                          <div className="flex items-center gap-2 mb-4">
                            <ChevronRight className="w-4 h-4 text-sky-600" />
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recommended Action</h3>
                          </div>
                          <p className="text-lg font-bold text-slate-900 mb-4">{result.triage_logic.recommended_action}</p>
                          
                          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-3">
                              <Clock className="w-4 h-4 text-slate-400" />
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Preferred Time</p>
                                <p className="text-xs font-bold text-slate-700">{result.booking_intent.preferred_time}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Stethoscope className="w-4 h-4 text-slate-400" />
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Clinician Pref.</p>
                                <p className="text-xs font-bold text-slate-700">{result.booking_intent.clinician_preference || 'Any'}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                      {/* Confidence Footer */}
                      <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-4">
                          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">AI Confidence: {(result.ai_confidence * 100).toFixed(1)}%</p>
                          {result.status && (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status:</span>
                              <StatusBadge status={result.status} />
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => setResult(null)}
                          className="text-[10px] font-bold text-sky-600 uppercase hover:underline"
                        >
                          Process New Patient
                        </button>
                      </div>

                      {result.status === 'Completed' && result.closure_summary && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-6 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-100"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <CheckCircle2 className="w-6 h-6" />
                            <h3 className="text-lg font-bold">Triage Resolved</h3>
                          </div>
                          <p className="text-sm opacity-90 mb-4">Your request has been processed by our clinical team. Here is a summary of the outcome:</p>
                          <div className="p-4 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                            <p className="text-lg font-bold">"{result.closure_summary}"</p>
                          </div>
                          <p className="text-[10px] mt-4 opacity-70 uppercase tracking-widest">Closed by {result.closed_by} • {new Date(result.closed_at!).toLocaleDateString()}</p>
                        </motion.div>
                      )}
                      </motion.div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                        <div className="p-4 bg-slate-100 rounded-full mb-4">
                          <Activity className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-400">Waiting for Intake</h3>
                        <p className="text-sm text-slate-400 max-w-xs text-center mt-2">
                          Record or upload a patient voice memo to begin the automated triage process.
                        </p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="dashboard-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Dashboard Controls */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between glass-card p-4 rounded-2xl border border-slate-200">
                  <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder={user.role === 'gp' ? "Search patients, symptoms, or phone..." : "Search your symptoms or history..."}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <button className="flex-1 md:flex-none flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">
                      <Filter className="w-4 h-4" />
                      Filter
                    </button>
                    <button 
                      onClick={user.role === 'gp' ? fetchMemos : fetchPatientMemos}
                      className="flex-1 md:flex-none px-4 py-2 bg-sky-600 text-white rounded-xl text-sm font-bold hover:bg-sky-700"
                    >
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Memos List */}
                <div className="glass-card rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-bottom border-slate-200">
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Urgency</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                          {user.role === 'gp' && <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Patient</th>}
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Symptoms</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Submitted</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {isLoadingMemos ? (
                          <tr>
                            <td colSpan={user.role === 'gp' ? 6 : 5} className="px-6 py-12 text-center">
                              <Loader2 className="w-8 h-8 text-sky-600 animate-spin mx-auto mb-2" />
                              <p className="text-sm text-slate-500">Loading triage results...</p>
                            </td>
                          </tr>
                        ) : allMemos.length === 0 ? (
                          <tr>
                            <td colSpan={user.role === 'gp' ? 6 : 5} className="px-6 py-12 text-center">
                              <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                              <p className="text-sm text-slate-500">No triage results found.</p>
                            </td>
                          </tr>
                        ) : allMemos.map((memo) => (
                          <tr key={memo.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${getUrgencyBadge(memo.triage_logic.triage_category)}`}>
                                {memo.triage_logic.triage_category.split('_')[0]}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <StatusBadge status={memo.status} />
                            </td>
                            {user.role === 'gp' && (
                              <td className="px-6 py-4">
                                <div>
                                  <p className="text-sm font-bold text-slate-900">{memo.patient_info.name}</p>
                                  <p className="text-xs font-bold text-sky-600">{memo.patient_info.phone_number}</p>
                                </div>
                              </td>
                            )}
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {memo.clinical_data.symptoms.slice(0, 3).map((s, i) => (
                                  <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold uppercase">{s}</span>
                                ))}
                                {memo.clinical_data.symptoms.length > 3 && (
                                  <span className="text-[9px] font-bold text-slate-400">+{memo.clinical_data.symptoms.length - 3} more</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-xs text-slate-500 font-medium">
                                {memo.created_at ? new Date(memo.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {memo.created_at ? new Date(memo.created_at).toLocaleDateString() : ''}
                              </p>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => setSelectedMemo(memo)}
                                  className="p-2 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-all"
                                  title={user.role === 'gp' ? "Update Status & History" : "View Details & History"}
                                >
                                  <ClipboardList className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => memo.recording_url && setActiveAudioUrl(memo.recording_url)}
                                  className={`p-2 rounded-lg transition-all ${activeAudioUrl === memo.recording_url ? 'bg-sky-600 text-white shadow-lg shadow-sky-200' : 'text-slate-400 hover:text-sky-600 hover:bg-sky-50'}`}
                                  title="Play Recording"
                                >
                                  {activeAudioUrl === memo.recording_url ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                </button>
                                {user.role === 'gp' && (
                                  <button 
                                    onClick={() => memo.id && handleDelete(memo.id)}
                                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                    title="Delete Record"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Dashboard Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="glass-card p-6 rounded-2xl border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Emergency Alerts</p>
                    <p className="text-3xl font-black text-red-600">{allMemos.filter(m => m.triage_logic.emergency_alert).length}</p>
                  </div>
                  <div className="glass-card p-6 rounded-2xl border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Urgent Same Day</p>
                    <p className="text-3xl font-black text-amber-500">{allMemos.filter(m => m.triage_logic.triage_category === 'URGENT_SAME_DAY').length}</p>
                  </div>
                  <div className="glass-card p-6 rounded-2xl border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Avg. Confidence</p>
                    <p className="text-3xl font-black text-emerald-500">
                      {(allMemos.reduce((acc, m) => acc + m.ai_confidence, 0) / (allMemos.length || 1) * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>

                {/* Status Update Modal */}
                <AnimatePresence>
                  {selectedMemo && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
                      >
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                          <div>
                            <h3 className="text-lg font-bold text-slate-900">
                              {user.role === 'gp' ? 'Update Ticket Lifecycle' : 'Ticket Details & History'}
                            </h3>
                            <p className="text-xs text-slate-500">
                              {user.role === 'gp' ? `Patient: ${selectedMemo.patient_info.name}` : 'Your clinical submission details'}
                            </p>
                          </div>
                          <button 
                            onClick={() => setSelectedMemo(null)}
                            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            <Square className="w-4 h-4 text-slate-400" />
                          </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                          {/* Clinical Summary for Context */}
                          <section className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Clinical Summary</h4>
                            <div className="space-y-3">
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Symptoms</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {selectedMemo.clinical_data.symptoms.map((s, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-white border border-slate-200 text-slate-600 rounded text-[9px] font-bold uppercase">{s}</span>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Recommended Action</p>
                                <p className="text-sm font-bold text-slate-900">{selectedMemo.triage_logic.recommended_action}</p>
                              </div>
                            </div>
                          </section>
                          {/* Current Status & Update */}
                          <section>
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                              {user.role === 'gp' ? 'Update Status' : 'Current Status'}
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {['Pending', 'Action Required', 'In Progress', 'Completed'].map((s) => (
                                <button
                                  key={s}
                                  disabled={user.role !== 'gp'}
                                  onClick={() => {
                                    if (user.role !== 'gp') return;
                                    const notes = prompt(`Enter notes for changing status to ${s}:`);
                                    if (notes !== null) {
                                      let summary = undefined;
                                      if (s === 'Completed') {
                                        summary = prompt("Enter a brief closure summary for the patient (e.g., 'Advice given', 'Referred to Pharmacy'):");
                                      }
                                      if (selectedMemo.id) {
                                        handleUpdateStatus(selectedMemo.id, s as any, notes, summary || undefined);
                                      }
                                    }
                                  }}
                                  className={`px-3 py-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                                    selectedMemo.status === s 
                                      ? 'border-sky-600 bg-sky-50 text-sky-700' 
                                      : 'border-slate-100 hover:border-slate-200 text-slate-500'
                                  } ${user.role !== 'gp' ? 'cursor-default' : 'cursor-pointer'}`}
                                >
                                  <div className={`p-2 rounded-lg ${getStatusColor(s)}`}>
                                    {s === 'Pending' && <Clock className="w-4 h-4" />}
                                    {s === 'Action Required' && <AlertCircle className="w-4 h-4" />}
                                    {s === 'In Progress' && <Activity className="w-4 h-4" />}
                                    {s === 'Completed' && <CheckCircle2 className="w-4 h-4" />}
                                  </div>
                                  <span className="text-[10px] font-bold uppercase">{s}</span>
                                </button>
                              ))}
                            </div>
                          </section>

                          {/* Audit Trail / History */}
                          <section>
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Audit Trail</h4>
                            <div className="space-y-4">
                              {selectedMemo.history && selectedMemo.history.length > 0 ? (
                                selectedMemo.history.map((h, i) => (
                                  <div key={i} className="flex gap-4">
                                    <div className="flex flex-col items-center">
                                      <div className={`w-2 h-2 rounded-full mt-1.5 ${i === 0 ? 'bg-sky-600' : 'bg-slate-300'}`} />
                                      {i !== selectedMemo.history!.length - 1 && <div className="w-px h-full bg-slate-100 my-1" />}
                                    </div>
                                    <div className="flex-1 pb-4">
                                      <div className="flex items-center justify-between mb-1">
                                        <p className="text-xs font-bold text-slate-900">Status changed to <span className="text-sky-600">{h.status}</span></p>
                                        <p className="text-[10px] text-slate-400 font-mono">{new Date(h.changed_at).toLocaleString()}</p>
                                      </div>
                                      <p className="text-xs text-slate-500 italic">"{h.notes || 'No notes provided'}"</p>
                                      <p className="text-[10px] text-slate-400 mt-1">— {h.changed_by}</p>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-slate-400 italic">No history available for this ticket.</p>
                              )}
                            </div>
                          </section>

                          {selectedMemo.status === 'Completed' && selectedMemo.closure_summary && (
                            <section className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                              <h4 className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">Closure Summary</h4>
                              <p className="text-sm text-emerald-900 font-medium">"{selectedMemo.closure_summary}"</p>
                              <p className="text-[10px] text-emerald-600 mt-2">Closed by {selectedMemo.closed_by} on {new Date(selectedMemo.closed_at!).toLocaleDateString()}</p>
                            </section>
                          )}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                          <button 
                            onClick={() => setSelectedMemo(null)}
                            className="px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors"
                          >
                            Close
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                {/* Audio Player Bar */}
                <AnimatePresence>
                  {activeAudioUrl && (
                    <motion.div 
                      initial={{ y: 100, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 100, opacity: 0 }}
                      className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-50"
                    >
                      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-800 flex items-center gap-4">
                        <div className="p-2 bg-sky-600 rounded-xl">
                          <Volume2 className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Now Playing</p>
                          <p className="text-xs font-bold truncate">Patient Recording • Twilio Original</p>
                        </div>
                        <audio 
                          autoPlay 
                          controls 
                          src={activeAudioUrl} 
                          className="h-8 w-48 md:w-64"
                          onEnded={() => setActiveAudioUrl(null)}
                        />
                        <button 
                          onClick={() => setActiveAudioUrl(null)}
                          className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
                        >
                          <Square className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

