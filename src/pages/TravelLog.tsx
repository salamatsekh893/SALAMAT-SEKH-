import React, { useState, useEffect } from 'react';
import { ArrowLeft, Navigation, Receipt, Target, Plus, Eye, X, Gauge, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export default function TravelLog() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>({});
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const st = await fetchWithAuth('/travel_v2/stats/my');
        setStats(st);
        const sess = await fetchWithAuth('/travel_v2/sessions/my');
        setSessions(sess);
      } catch (err) {
        toast.error('Failed to load travel history');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'approved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'rejected': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">My Travel Log</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Field Activity & Claims</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/travel/new')} 
          className="bg-indigo-600 text-white rounded-xl px-4 py-2 font-bold uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20 flex items-center gap-2"
        >
          <Plus className="w-3 h-3" /> Start Session
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
         <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col items-center text-center justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <Target className="w-6 h-6 text-indigo-500 mb-2 relative z-10" />
            <p className="text-2xl font-black text-slate-800 relative z-10">{stats.today_km || 0}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 relative z-10">Today KM</p>
         </div>
         <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col items-center text-center justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <Clock className="w-6 h-6 text-amber-500 mb-2 relative z-10" />
            <p className="text-2xl font-black text-slate-800 relative z-10">{stats.pending_claims || 0}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 relative z-10">Pending</p>
         </div>
         <div className="bg-emerald-600 text-white rounded-3xl p-5 shadow-xl shadow-emerald-600/20 col-span-2 flex items-center justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <div className="relative z-10">
               <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200 mb-1">Monthly Earned</p>
               <p className="text-3xl font-black">₹{stats.monthly_amount || 0}</p>
            </div>
            <Receipt className="w-10 h-10 text-white/50 relative z-10" />
         </div>
      </div>

      <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 ml-1">Recent Sessions</h2>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
           <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
             <Target className="w-8 h-8 text-slate-300" />
           </div>
           <h3 className="text-lg font-bold text-slate-800 mb-1">No sessions yet</h3>
           <p className="text-sm font-medium text-slate-500">Record your travel to claim allowances.</p>
        </div>
      ) : (
        <div className="space-y-4">
           {sessions.map((sess) => (
             <div key={sess.id} onClick={() => setSelectedSession(sess)} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="font-bold text-slate-800">{format(new Date(sess.travel_date), 'EEEE, dd MMM yyyy')}</p>
                    <p className="text-xs font-medium text-slate-500 mt-1">{sess.entries?.length || 0} locations visited</p>
                  </div>
                  <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded border ${getStatusColor(sess.status)}`}>
                    {sess.status}
                  </span>
                </div>

                <div className="flex gap-4">
                   <div className="flex-1 bg-slate-50 rounded-2xl p-3 border border-slate-100 flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                         <Target className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Distance</p>
                        <p className="font-bold text-slate-800 leading-tight">{sess.total_km || 0} KM</p>
                      </div>
                   </div>
                   <div className="flex-1 bg-slate-50 rounded-2xl p-3 border border-slate-100 flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                         <Receipt className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Claim</p>
                        <p className="font-bold text-slate-800 leading-tight">₹{sess.total_amount || 0}</p>
                      </div>
                   </div>
                </div>
             </div>
           ))}
        </div>
      )}

      <AnimatePresence>
         {selectedSession && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedSession(null)} />
             
             <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div>
                    <h2 className="text-xl font-black text-slate-800">Session Details</h2>
                    <p className="text-sm font-bold text-slate-500">{format(new Date(selectedSession.travel_date), 'dd MMM yyyy')}</p>
                  </div>
                  <button onClick={() => setSelectedSession(null)} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50 text-slate-500">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                   <div className={`p-4 rounded-2xl border ${getStatusColor(selectedSession.status)}`}>
                     <div className="flex justify-between items-center">
                        <span className="text-xs font-black uppercase tracking-widest">Status</span>
                        <span className="font-bold">{selectedSession.status}</span>
                     </div>
                     {selectedSession.admin_remarks && (
                       <div className="mt-3 pt-3 border-t border-black/10">
                         <span className="text-xs font-black uppercase tracking-widest block mb-1">Remarks</span>
                         <span className="text-sm font-medium">{selectedSession.admin_remarks}</span>
                       </div>
                     )}
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Start Odometer</span>
                         {selectedSession.start_meter_image ? (
                           <img src={selectedSession.start_meter_image} className="w-full h-24 object-cover rounded-xl border border-slate-200 cursor-zoom-in" onClick={() => setFullscreenImage(selectedSession.start_meter_image)} />
                         ) : <div className="h-24 bg-slate-50 rounded-xl" />}
                         <p className="text-center font-black text-slate-700">{selectedSession.start_meter}</p>
                      </div>
                      <div className="space-y-2">
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">End Odometer</span>
                         {selectedSession.end_meter_image ? (
                           <img src={selectedSession.end_meter_image} className="w-full h-24 object-cover rounded-xl border border-slate-200 cursor-zoom-in" onClick={() => setFullscreenImage(selectedSession.end_meter_image)} />
                         ) : <div className="h-24 bg-slate-50 rounded-xl flex items-center justify-center text-xs text-slate-400 font-bold uppercase">Pending</div>}
                         <p className="text-center font-black text-slate-700">{selectedSession.end_meter || '-'}</p>
                      </div>
                   </div>

                   <div>
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 ml-1 flex items-center gap-2">
                        <Navigation className="w-3 h-3 text-slate-400" /> Route Log
                      </h3>
                      {selectedSession.entries?.length > 0 ? (
                        <div className="space-y-4">
                           {selectedSession.entries.map((trip: any, i: number) => (
                             <div key={i} className="relative pl-6 pb-6">
                               <div className="absolute left-1.5 top-2 bottom-0 w-0.5 bg-slate-200"></div>
                               <div className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-white border-4 border-emerald-500 z-10 shadow-sm"></div>
                               
                               <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 ml-4">
                                  <p className="text-xs font-bold text-slate-800 mb-1">{trip.from_location} <span className="text-slate-400 font-normal mx-1">→</span> {trip.to_location}</p>
                                  <p className="text-[10px] font-medium text-slate-500">{trip.purpose}</p>
                               </div>
                             </div>
                           ))}
                           <div className="relative pl-6">
                               <div className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-rose-500 border-4 border-rose-100 z-10 shadow-sm"></div>
                               <p className="text-xs font-bold text-slate-500 ml-4">Route Ends</p>
                           </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-2xl">No route logs recorded.</p>
                      )}
                   </div>
                </div>
             </motion.div>
           </div>
         )}
       </AnimatePresence>

       <AnimatePresence>
         {fullscreenImage && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setFullscreenImage(null)}>
             <button onClick={() => setFullscreenImage(null)} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
               <X className="w-6 h-6" />
             </button>
             <motion.img 
               initial={{ opacity: 0, scale: 0.9 }} 
               animate={{ opacity: 1, scale: 1 }} 
               exit={{ opacity: 0, scale: 0.9 }} 
               src={fullscreenImage} 
               className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" 
               onClick={(e) => e.stopPropagation()}
             />
           </div>
         )}
       </AnimatePresence>

    </div>
  );
}
