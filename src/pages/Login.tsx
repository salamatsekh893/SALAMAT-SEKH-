import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../lib/api';
import { voiceFeedback } from '../lib/voice';
import { Phone, Lock, ChevronRight, ShieldCheck, HelpCircle, MessageSquare, ArrowLeft, Info, Eye, EyeOff, Hash, KeyRound, Loader2, Mail, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

export default function Login({ onLogin }: { onLogin: (user: any, token: string) => void }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Focus effect for inputs
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    handleVerifyCredentials();
  };

  const handleVerifyCredentials = async () => {
    if (!phone || !password) {
      setError('Please enter your credentials');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone: String(phone), 
          password: String(password)
        })
      });
      let data = {} as any;
      try {
        data = await res.json();
      } catch (e) {
        throw new Error('Our servers encountered an issue. Please try again later.');
      }
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      voiceFeedback.login(data.user.name);
      onLogin(data.user, data.token);
    } catch (err: any) {
      setError(err.message);
      voiceFeedback.error();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      {/* Subtle Background Decoration */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-100 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-100 rounded-full blur-[120px] opacity-60" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-[440px] relative z-10"
      >
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xl shadow-blue-900/5 transition-all">
          <AnimatePresence mode="wait">
            {!showForgot ? (
              <motion.div
                key="login-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="flex flex-col items-center mb-8">
                  <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-200">
                    <KeyRound className="w-8 h-8" />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    ALJOOYA <span className="text-blue-600">SYSTEMS</span>
                  </h1>
                  <p className="text-slate-500 text-sm mt-1 font-medium">Please sign in to your node</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-xs font-semibold flex items-center gap-3"
                    >
                      <Info className="w-4 h-4 shrink-0" />
                      {error}
                    </motion.div>
                  )}

                    <div className="space-y-4">
                      {/* Identity Field */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">
                          Authorized ID
                        </label>
                        <div className={`relative flex items-center transition-all duration-300 rounded-xl border ${focusedField === 'phone' ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-slate-200 font-medium'} bg-slate-50/50`}>
                          <div className={`absolute left-4 ${focusedField === 'phone' ? 'text-blue-500' : 'text-slate-400'}`}>
                            {phone.includes('@') ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                          </div>
                          <input
                            id="phone"
                            name="phone"
                            type="text"
                            required
                            onFocus={() => setFocusedField('phone')}
                            onBlur={() => setFocusedField(null)}
                            className="w-full bg-transparent pl-12 pr-4 py-3.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none disabled:opacity-50"
                            placeholder="Email or Mobile Number"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">
                          Access PIN
                        </label>
                        <div className={`relative flex items-center transition-all duration-300 rounded-xl border ${focusedField === 'password' ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-slate-200'} bg-slate-50/50`}>
                          <div className={`absolute left-4 ${focusedField === 'password' ? 'text-blue-500' : 'text-slate-400'}`}>
                            <Lock className="w-4 h-4" />
                          </div>
                          <input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            required
                            onFocus={() => setFocusedField('password')}
                            onBlur={() => setFocusedField(null)}
                            className="w-full bg-transparent pl-12 pr-12 py-3.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none"
                            placeholder="Enter PIN"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all disabled:opacity-70 flex items-center justify-center gap-2 group"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                          <>
                            Secure Sign In
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </button>

                      <div className="mt-6 text-center">
                        <button 
                          type="button"
                          onClick={() => setShowForgot(true)}
                          className="text-[11px] font-bold text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-all"
                        >
                          Manual Rescue Terminal
                        </button>
                      </div>
                    </div>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="recovery-view"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center"
              >
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 mb-6">
                  <HelpCircle className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Identity Rescue</h2>
                <p className="text-sm text-slate-500 text-center mb-8">
                  Contact administrative support to reset your node credentials.
                </p>

                <div className="w-full space-y-3">
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-blue-600 border border-slate-100">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Admin Support</h4>
                      <p className="text-[11px] font-medium text-slate-500">Open supervisor ticket</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-blue-600 border border-slate-100">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Toll-Free Helpline</h4>
                      <p className="text-[11px] font-medium text-slate-500">+91 98836 72737</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setShowForgot(false)}
                  className="mt-8 flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Go Back
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-8 flex justify-center items-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
           <span className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
             System Online
           </span>
           <span>Build 0.89.3-X</span>
        </div>
      </motion.div>
    </div>
  );
}
