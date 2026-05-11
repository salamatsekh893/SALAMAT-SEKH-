import { useState, useEffect } from 'react';
import { User, Phone, Mail, Building2, Shield, Calendar, Camera, Lock, KeyRound, Eye, EyeOff, Save, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fetchWithAuth } from '../lib/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

interface ProfileProps {
  user: any;
}

export default function Profile({ user }: ProfileProps) {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [changing, setChanging] = useState(false);
  const [showPass, setShowPass] = useState({ current: false, next: false, confirm: false });

  // Real-time check for current password
  useEffect(() => {
    const checkPassword = async () => {
      if (passForm.currentPassword.length < 4) {
        setPasswordStatus('idle');
        return;
      }

      setPasswordStatus('checking');
      try {
        const res = await fetchWithAuth('/auth/verify-password', {
          method: 'POST',
          body: JSON.stringify({ password: passForm.currentPassword })
        });
        
        if (res.valid) {
          setPasswordStatus('valid');
        } else {
          setPasswordStatus('invalid');
        }
      } catch (err) {
        setPasswordStatus('invalid');
      }
    };

    const timer = setTimeout(checkPassword, 500);
    return () => clearTimeout(timer);
  }, [passForm.currentPassword]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordStatus !== 'valid') {
      toast.error("Please provide correct current password first.");
      return;
    }
    if (passForm.newPassword !== passForm.confirmPassword) {
      toast.error("New passwords do not match!");
      return;
    }
    if (passForm.newPassword.length < 4) {
      toast.error("Password must be at least 4 characters.");
      return;
    }

    try {
      setChanging(true);
      const res = await fetchWithAuth('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: passForm.currentPassword,
          newPassword: passForm.newPassword
        })
      });

      if (res.error) throw new Error(res.error);
      
      toast.success("Password changed successfully!");
      setShowPasswordModal(false);
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Banner */}
        <div className="h-48 bg-gradient-to-r from-indigo-600 via-violet-600 to-rose-500 relative">
          <div className="absolute inset-0 bg-black/10" />
        </div>

        {/* Profile Content */}
        <div className="px-8 pb-12 relative">
          <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-16 mb-8">
            <div className="relative group">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-white p-1.5 shadow-2xl overflow-hidden ring-4 ring-white/50">
                {user?.photo_url ? (
                  <img src={user.photo_url} alt={user.name} className="w-full h-full object-cover rounded-2xl" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center rounded-2xl">
                    <User className="w-16 h-16 text-slate-300" />
                  </div>
                )}
              </div>
              <button className="absolute bottom-2 right-2 p-2 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all scale-0 group-hover:scale-100">
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">{user?.name}</h1>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full uppercase tracking-widest border border-emerald-200">
                  Active
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-slate-500 font-medium h-6">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-widest font-bold text-indigo-600">{user?.role?.replace('_', ' ')}</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-slate-200" />
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-widest font-bold">Branch ID: {user?.branchId || 'Head Office'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest border-l-4 border-indigo-600 pl-4 mb-8">Personal Information</h2>
              
              <div className="space-y-4">
                <div className="flex items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-500/30 hover:bg-white hover:shadow-lg transition-all duration-300">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div className="ml-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Phone Number</p>
                    <p className="text-sm font-black text-slate-800">{user?.phone || 'Not Available'}</p>
                  </div>
                </div>

                <div className="flex items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-500/30 hover:bg-white hover:shadow-lg transition-all duration-300">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="ml-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Email Address</p>
                    <p className="text-sm font-black text-slate-800">{user?.email || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-500/30 hover:bg-white hover:shadow-lg transition-all duration-300">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="ml-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Joined Date</p>
                    <p className="text-sm font-black text-slate-800">{user?.join_date ? format(new Date(user.join_date), 'dd MMMM yyyy') : 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest border-l-4 border-emerald-500 pl-4 mb-8">Access Profile</h2>
              
              <div className="bg-slate-900 p-8 rounded-3xl relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="space-y-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Security Clearance</p>
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2 py-1 border border-white/10 rounded-lg">Level 0{user?.role === 'superadmin' ? 5 : 2}</span>
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-2">{user?.role?.replace('_', ' ')}</h3>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full shadow-[0_0_12px_#34d399]" 
                        style={{ width: user?.role === 'superadmin' ? '100%' : '60%' }} 
                      />
                    </div>
                  </div>

                  <ul className="space-y-3">
                    {['Access Dashboard', 'View Members', 'Check Collections'].map((perm) => (
                      <li key={perm} className="flex items-center gap-3 text-slate-400 text-xs font-bold uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                        {perm}
                      </li>
                    ))}
                  </ul>

                  <button 
                    onClick={() => setShowPasswordModal(true)}
                    className="w-full py-4 mt-4 bg-indigo-600 border border-white/10 text-white font-black text-xs uppercase tracking-[0.3em] rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-900/20 transition-all active:scale-[0.98]"
                  >
                    Credential Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="bg-slate-900 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest">Change Access Key</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Updates immediately</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Password</label>
                    <AnimatePresence>
                      {passwordStatus === 'valid' && (
                        <motion.span initial={{ opacity: 0, x: 5 }} animate={{ opacity: 1, x: 0 }} className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Verified
                        </motion.span>
                      )}
                      {passwordStatus === 'invalid' && (
                        <motion.span initial={{ opacity: 0, x: 5 }} animate={{ opacity: 1, x: 0 }} className="text-[9px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Incorrect Key
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="relative">
                    <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${passwordStatus === 'valid' ? 'text-emerald-500' : passwordStatus === 'invalid' ? 'text-rose-500' : 'text-slate-300'}`} />
                    <input
                      type={showPass.current ? "text" : "password"}
                      required
                      className={`w-full bg-slate-50 border-2 rounded-2xl pl-12 pr-12 py-4 text-sm font-bold outline-none transition-all ${
                        passwordStatus === 'valid' ? 'border-emerald-100 bg-emerald-50/30 text-emerald-900' : 
                        passwordStatus === 'invalid' ? 'border-rose-100 bg-rose-50/30 text-rose-900' : 
                        'border-slate-100 focus:border-indigo-500 text-slate-800'
                      }`}
                      placeholder="Old password"
                      value={passForm.currentPassword}
                      onChange={e => setPassForm({...passForm, currentPassword: e.target.value})}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {passwordStatus === 'checking' && <Loader2 className="w-4 h-4 text-slate-300 animate-spin" />}
                      <button 
                        type="button"
                        onClick={() => setShowPass({...showPass, current: !showPass.current})}
                        className="text-slate-300 hover:text-indigo-500"
                      >
                        {showPass.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input
                      type={showPass.next ? "text" : "password"}
                      required
                      className="w-full bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 rounded-2xl pl-12 pr-12 py-4 text-sm font-bold text-slate-800 outline-none transition-all"
                      placeholder="At least 4 characters"
                      value={passForm.newPassword}
                      onChange={e => setPassForm({...passForm, newPassword: e.target.value})}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPass({...showPass, next: !showPass.next})}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-500"
                    >
                      {showPass.next ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                  <div className="relative">
                    <Save className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input
                      type={showPass.confirm ? "text" : "password"}
                      required
                      className="w-full bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 rounded-2xl pl-12 pr-12 py-4 text-sm font-bold text-slate-800 outline-none transition-all"
                      placeholder="Repeat new password"
                      value={passForm.confirmPassword}
                      onChange={e => setPassForm({...passForm, confirmPassword: e.target.value})}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPass({...showPass, confirm: !showPass.confirm})}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-500"
                    >
                      {showPass.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changing}
                  className="flex-[2] px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {changing ? "Updating..." : (
                    <>
                      <Save className="w-4 h-4" /> Update Key
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
