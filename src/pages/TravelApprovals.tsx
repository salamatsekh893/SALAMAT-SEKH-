import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, X, Eye, Settings, MapPin, Search, Calendar, User, Navigation, Receipt, Download, Fuel, CheckCircle, XCircle, Gauge } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchWithAuth } from '../lib/api';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { usePermissions } from '../hooks/usePermissions';

export default function TravelApprovals() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Rate Settings Modal
  const [showSettings, setShowSettings] = useState(false);
  const [rate, setRate] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(`/travel_v2/sessions?status=${statusFilter}`);
      setSessions(res);
      
      const rateRes = await fetchWithAuth('/travel_v2/fuel-rates');
      setRate(rateRes.rate_per_km.toString());
    } catch (err) {
      toast.error('Failed to load travel sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleStatusUpdate = async (id: number, status: 'approved' | 'rejected', session: any) => {
    try {
      setProcessingId(id);
      await fetchWithAuth(`/travel_v2/sessions/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status,
          total_km: session.total_km,
          total_amount: session.total_amount,
          admin_remarks: session.admin_remarks || ''
        })
      });
      toast.success(`Session ${status}`);
      setSelectedSession(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setProcessingId(null);
    }
  };

  const saveRate = async () => {
    try {
      setProcessingId(-1);
      await fetchWithAuth('/travel_v2/fuel-rates', {
        method: 'POST',
        body: JSON.stringify({ rate_per_km: rate })
      });
      toast.success('Rate updated successfully');
      setShowSettings(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to limit settings');
    } finally {
      setProcessingId(null);
    }
  };

  if (selectedSession) {
    return (
      <div className="p-4 md:p-6 lg:ml-64 max-w-4xl mx-auto mb-20 lg:mb-0">
         <div className="flex items-center justify-between mb-8">
            <button onClick={() => setSelectedSession(null)} className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-2">
                 <ArrowLeft className="w-5 h-5" />
                 <span className="text-sm font-bold sm:block hidden">Back to List</span>
            </button>
            <div className="text-right">
                <h1 className="text-xl font-bold text-slate-800">Travel Session Review</h1>
                <p className="text-xs font-bold text-slate-500">{selectedSession.user_name} • {format(new Date(selectedSession.travel_date), 'dd MMM yyyy')}</p>
            </div>
         </div>

         <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col text-slate-800">
            <div className="p-6 flex flex-col lg:flex-row gap-8">
               <div className="flex-1 space-y-8">
                  {/* Odometer Details */}
                  <div>
                     <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                       <Gauge className="w-4 h-4 text-slate-400" /> Odometer Proof
                     </h3>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                           <p className="text-xs font-bold text-slate-500">Start (Morning)</p>
                           <div className="rounded-2xl overflow-hidden border border-slate-200 relative group cursor-zoom-in">
                              <img src={selectedSession.start_meter_image} className="w-full h-40 object-cover" onClick={() => setFullscreenImage(selectedSession.start_meter_image)} />
                              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                                 <span className="text-white font-black text-lg">{selectedSession.start_meter}</span>
                              </div>
                           </div>
                        </div>
                        <div className="space-y-3">
                           <p className="text-xs font-bold text-slate-500">End (Evening)</p>
                           <div className="rounded-2xl overflow-hidden border border-slate-200 relative group cursor-zoom-in">
                              <img src={selectedSession.end_meter_image} className="w-full h-40 object-cover" onClick={() => setFullscreenImage(selectedSession.end_meter_image)} />
                              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                                 <span className="text-white font-black text-lg">{selectedSession.end_meter}</span>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Financials */}
                  <div>
                     <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                       <Receipt className="w-4 h-4 text-slate-400" /> Allowance Calculation
                     </h3>
                     <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                        <div className="flex justify-between items-center mb-4">
                           <span className="text-sm font-bold text-slate-500">Total Valid Distance</span>
                           <input type="number" className="w-24 text-right bg-white border border-slate-200 rounded-lg px-3 py-1 font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" value={selectedSession.total_km} onChange={(e) => setSelectedSession({...selectedSession, total_km: e.target.value, total_amount: (Number(e.target.value) * selectedSession.rate_per_km).toFixed(2)})} disabled={statusFilter !== 'pending'} />
                        </div>
                        <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200/60">
                           <span className="text-sm font-bold text-slate-500">Rate (₹/KM)</span>
                           <span className="font-bold text-slate-800">₹{selectedSession.rate_per_km}</span>
                        </div>
                        <div className="flex justify-between items-center">
                           <span className="text-sm font-black text-slate-800 uppercase tracking-widest">Total Allowance</span>
                           <span className="text-2xl font-black text-indigo-600">₹{selectedSession.total_amount}</span>
                        </div>
                     </div>
                  </div>
                  
                  {statusFilter === 'pending' && (
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-widest">Admin Remarks</label>
                    <textarea placeholder="Add remarks (optional)" value={selectedSession.admin_remarks || ''} onChange={e => setSelectedSession({...selectedSession, admin_remarks: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 outline-none" rows={3}></textarea>
                  </div>
                  )}
               </div>

               <div className="flex-1">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-slate-400" /> Declared Route Log
                  </h3>
                  {selectedSession.entries?.length > 0 ? (
                    <div className="space-y-4">
                       {selectedSession.entries.map((trip: any, i: number) => (
                         <div key={i} className="relative pl-6 pb-6">
                           <div className="absolute left-1.5 top-2 bottom-0 w-0.5 bg-slate-200"></div>
                           <div className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-white border-4 border-emerald-500 z-10 shadow-sm"></div>
                           
                           <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 ml-4 shadow-sm">
                              <p className="text-xs font-bold text-slate-800 mb-2">{trip.from_location} <span className="text-slate-400 font-normal mx-2">→</span> {trip.to_location}</p>
                              <div className="flex justify-between items-center mt-3">
                                 <span className="px-2 py-1 bg-white rounded flex items-center gap-1 text-[10px] font-bold text-slate-500 border border-slate-200 shadow-sm">
                                   <Navigation className="w-3 h-3 text-indigo-400" /> {trip.estimated_km || 0} KM
                                 </span>
                                 <span className="text-[10px] font-bold text-slate-500 bg-slate-200/50 px-2 py-1 rounded truncate max-w-[150px]">{trip.purpose}</span>
                              </div>
                           </div>
                         </div>
                       ))}
                       <div className="relative pl-6">
                           <div className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-rose-500 border-4 border-rose-100 z-10 shadow-sm"></div>
                           <p className="text-xs font-bold text-slate-500 ml-4 border border-rose-100 bg-rose-50 px-2 py-1 inline-block rounded text-rose-600">Route Ends</p>
                       </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-2xl p-6 text-center border border-slate-100 border-dashed">
                      <p className="text-sm font-bold text-slate-400">No route logs provided by the user.</p>
                    </div>
                  )}
               </div>
            </div>

            {statusFilter === 'pending' && (
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-4">
                 <button onClick={() => handleStatusUpdate(selectedSession.id, 'rejected', selectedSession)} disabled={processingId !== null} className="w-full sm:w-auto flex-1 py-4 bg-white text-rose-600 rounded-xl font-black uppercase tracking-widest text-xs border border-rose-100 hover:bg-rose-50 hover:border-rose-200 transition-all flex items-center justify-center gap-2 shadow-sm">
                   <XCircle className="w-5 h-5" /> Reject Claim
                 </button>
                 <button onClick={() => handleStatusUpdate(selectedSession.id, 'approved', selectedSession)} disabled={processingId !== null} className="w-full sm:w-auto flex-[2] py-4 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                   {processingId === selectedSession.id ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                   Approve & Grant ₹{selectedSession.total_amount}
                 </button>
              </div>
            )}
         </div>

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

  return (
    <div className="p-4 md:p-6 lg:ml-64 max-w-7xl mx-auto mb-20 lg:mb-0">
       <div className="flex items-center justify-between mb-8">
         <div className="flex items-center gap-4">
           <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-500 hover:text-slate-800 transition-colors">
             <ArrowLeft className="w-5 h-5" />
           </button>
           <div>
             <h1 className="text-xl font-bold text-slate-800">Travel Approvals</h1>
             <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Field Movement Queue</p>
           </div>
         </div>
         {hasPermission('admin_settings') && (
         <button onClick={() => setShowSettings(true)} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors">
           <Settings className="w-5 h-5" />
         </button>
         )}
       </div>

       <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 mb-6 flex overflow-x-auto no-scrollbar">
          {['pending', 'approved', 'rejected'].map((s) => (
            <button
               key={s}
               onClick={() => setStatusFilter(s as any)}
               className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
                 statusFilter === s 
                 ? 'bg-slate-800 text-white shadow-md' 
                 : 'text-slate-500 hover:bg-slate-50'
               }`}
            >
              {s}
            </button>
          ))}
       </div>

       {loading ? (
         <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
         </div>
       ) : sessions.length === 0 ? (
         <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">All caught up!</h3>
            <p className="text-sm font-medium text-slate-500">No {statusFilter} sessions found.</p>
         </div>
       ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session) => (
               <div key={session.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-lg">
                         {session.user_name?.charAt(0) || 'U'}
                       </div>
                       <div>
                         <h3 className="font-bold text-slate-800 text-sm">{session.user_name}</h3>
                         <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{session.branch_name}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                         {format(new Date(session.travel_date), 'dd MMM')}
                       </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                     <div className="bg-slate-50 rounded-2xl p-4">
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Distance</p>
                        <p className="text-lg font-black text-slate-800">{session.total_km} <span className="text-xs text-slate-500">KM</span></p>
                     </div>
                     <div className="bg-indigo-50 rounded-2xl p-4">
                        <p className="text-[9px] font-black uppercase text-indigo-400 tracking-widest mb-1">Allowance</p>
                        <p className="text-lg font-black text-indigo-600">₹{session.total_amount}</p>
                     </div>
                  </div>

                  <button 
                    onClick={() => setSelectedSession(session)}
                    className="w-full py-4 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" /> Review Details
                  </button>
               </div>
            ))}
         </div>
       )}

       <AnimatePresence>
         {showSettings && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettings(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6">
                 <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                   <Fuel className="w-5 h-5 text-indigo-600" />
                   Fuel Policy
                 </h2>
                 <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-widest">Rate Per KM (₹)</label>
                      <input type="number" step="0.5" value={rate} onChange={e => setRate(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-lg font-black text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-center" />
                    </div>
                    <button onClick={saveRate} disabled={processingId === -1} className="w-full bg-slate-800 text-white p-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-slate-900 transition-all flex items-center justify-center">
                      {processingId === -1 ? 'Saving...' : 'Update Rate'}
                    </button>
                 </div>
              </motion.div>
           </div>
         )}
       </AnimatePresence>
    </div>
  );
}
