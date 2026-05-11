import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardList, CheckCircle, XCircle, Search, Filter, User, Calendar, MapPin, Navigation, IndianRupee, MessageSquare, AlertCircle, Eye, ArrowRight, Gauge, Clock, Settings } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { formatAmount, cn } from '../lib/utils';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function TravelApprovals() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [approvals, setApprovals] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | string | null>(null);
  const [remarkInput, setRemarkInput] = useState<{ [key: string]: string }>({});
  const [view, setView] = useState<'shifts' | 'logs'>('shifts');
  const [selectedShiftVisits, setSelectedShiftVisits] = useState<{ [key: number]: any[] }>({});

  const fetchData = async () => {
    try {
      const [logsRes, shiftsRes] = await Promise.all([
        fetchWithAuth('/travel/logs?status=pending'),
        fetchWithAuth('/travel/shifts?status=completed')
      ]);
      setApprovals(logsRes);
      setShifts(shiftsRes);
    } catch (err) {
      toast.error('Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const loadVisits = async (shiftId: number) => {
    if (selectedShiftVisits[shiftId]) return;
    try {
      const data = await fetchWithAuth(`/travel/shifts/${shiftId}/visits`);
      setSelectedShiftVisits(prev => ({ ...prev, [shiftId]: data }));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusUpdate = async (id: number | string, status: 'approved' | 'rejected', type: 'log' | 'shift') => {
    const remarks = remarkInput[id] || '';
    
    if (status === 'rejected' && !remarks.trim()) {
      toast.error('Please provide reasons for rejection in remarks');
      return;
    }

    setProcessingId(id);
    try {
      const endpoint = type === 'log' ? `/travel/logs/${id}/status` : `/travel/shifts/${id}/status`;
      await fetchWithAuth(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, remarks })
      });
      toast.success(`${type === 'log' ? 'Log' : 'Shift'} ${status} successfully`);
      fetchData();
    } catch (err) {
      toast.error('Operation failed');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-20">
      <div className="bg-white border-b border-slate-100 flex items-center justify-between h-16 px-4 sticky top-0 z-10 -mx-4 -mt-4">
        <div className="px-2">
          <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight">Approvals</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Movement Verification</p>
        </div>
        <div className="flex gap-2">
          {['superadmin', 'admin'].includes(user?.role || '') && (
            <button 
              onClick={() => navigate('/travel/settings')}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <Settings className="w-5 h-5 text-slate-600" />
            </button>
          )}
          <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-200 shadow-sm flex items-center">
            {view === 'shifts' ? shifts.length : approvals.length} Pending
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-2xl">
           <button 
            onClick={() => setView('shifts')}
            className={cn(
              "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              view === 'shifts' ? "bg-white text-amber-600 shadow-sm" : "text-slate-400"
            )}
           >
             Daily Shifts
           </button>
           <button 
            onClick={() => setView('logs')}
            className={cn(
              "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              view === 'logs' ? "bg-white text-teal-600 shadow-sm" : "text-slate-400"
            )}
           >
             Direct Logs
           </button>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {view === 'shifts' ? (
              /* Shifts Approval List */
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <AnimatePresence mode="popLayout">
                  {shifts.map((shift) => (
                    <motion.div
                      key={shift.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col group"
                    >
                      {/* Header with User Info */}
                      <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">
                            <User className="w-6 h-6 text-slate-400" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-900 uppercase leading-tight">{shift.user_name}</h4>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{shift.branch_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-indigo-400" />
                            <span className="text-[10px] font-black text-slate-900 uppercase">{format(new Date(shift.date), 'dd MMM yyyy')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Main Odometer Section */}
                      <div className="p-6 grid grid-cols-2 gap-8 relative">
                         <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white border border-slate-100 rounded-full flex items-center justify-center z-10 shadow-md">
                            <ArrowRight className="w-5 h-5 text-slate-300" />
                         </div>

                         <div className="space-y-4">
                            <div className="relative group/start cursor-pointer" onClick={() => window.open(shift.start_image, '_blank')}>
                               <img src={shift.start_image} className="w-full h-32 object-cover rounded-[24px] border border-slate-100 shadow-sm" />
                               <div className="absolute inset-0 flex items-end p-3 bg-gradient-to-t from-black/20 to-transparent rounded-[24px]">
                                   <span className="text-[8px] font-black text-white uppercase bg-indigo-600 px-2 py-1 rounded-md">Start Odo: {shift.start_odometer}</span>
                               </div>
                            </div>
                            <div className="text-center">
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Punch In</p>
                               <p className="text-xs font-black text-slate-900">{format(new Date(shift.start_time), 'hh:mm a')}</p>
                            </div>
                         </div>

                         <div className="space-y-4 text-right">
                            <div className="relative group/end cursor-pointer" onClick={() => window.open(shift.end_image, '_blank')}>
                               <img src={shift.end_image} className="w-full h-32 object-cover rounded-[24px] border border-slate-100 shadow-sm" />
                               <div className="absolute inset-0 flex items-end justify-end p-3 bg-gradient-to-t from-black/20 to-transparent rounded-[24px]">
                                   <span className="text-[8px] font-black text-white uppercase bg-rose-600 px-2 py-1 rounded-md">End Odo: {shift.end_odometer}</span>
                               </div>
                            </div>
                            <div className="text-center">
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Punch Out</p>
                               <p className="text-xs font-black text-slate-900">{format(new Date(shift.end_time), 'hh:mm a')}</p>
                            </div>
                         </div>
                      </div>

                      {/* Distance & Amount Stats */}
                      <div className="px-6 py-5 bg-slate-50/50 flex items-center justify-between border-y border-slate-100">
                         <div className="grid grid-cols-4 gap-4 flex-1">
                            <div>
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Odo KM</p>
                               <p className="text-sm font-black text-slate-900 uppercase">{shift.total_km} KM</p>
                            </div>
                            <div className="border-l border-slate-200 pl-4">
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">GPS KM</p>
                               <p className="text-sm font-black text-blue-600 uppercase">{shift.gps_km || 0} KM</p>
                            </div>
                            <div className="border-l border-slate-200 pl-4">
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Rate</p>
                               <p className="text-sm font-black text-slate-900 font-mono tracking-tighter">₹{shift.rate_per_km}</p>
                            </div>
                            <div className="border-l border-slate-200 pl-4">
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Claim</p>
                               <p className="text-sm font-black text-amber-600 tracking-tighter">₹{formatAmount(shift.amount)}</p>
                            </div>
                         </div>
                         <button 
                           onClick={() => loadVisits(shift.id)}
                           className="p-3 bg-white hover:bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 transition-colors"
                         >
                           <MapPin className="w-5 h-5" />
                         </button>
                      </div>

                      {/* Visits Timeline (if expanded) */}
                      <AnimatePresence>
                        {selectedShiftVisits[shift.id] && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }} 
                            animate={{ height: 'auto', opacity: 1 }} 
                            className="px-6 py-6 border-b border-slate-100 bg-slate-50/30"
                          >
                             <div className="flex items-center gap-2 mb-4">
                               <Clock className="w-4 h-4 text-slate-400" />
                               <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Movement Log ({selectedShiftVisits[shift.id].length} Stops)</h5>
                             </div>
                             <div className="space-y-4 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-200 before:border-l before:border-dashed">
                               {selectedShiftVisits[shift.id].map((visit: any) => (
                                 <div key={visit.id} className="relative pl-6 flex items-start justify-between">
                                    <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full bg-white border border-slate-300 z-10 p-0.5">
                                      <div className="w-full h-full bg-slate-300 rounded-full" />
                                    </div>
                                    <div className="flex-1">
                                       <p className="text-[10px] font-black text-slate-900 leading-none">{visit.location_name}</p>
                                       <p className="text-[7px] font-bold text-slate-400 uppercase mt-1">{format(new Date(visit.time), 'hh:mm a')} • {visit.purpose}</p>
                                    </div>
                                    {visit.image_url && <img src={visit.image_url} className="w-8 h-8 rounded-lg object-cover ml-4 border border-slate-200 cursor-zoom-in" onClick={() => window.open(visit.image_url, '_blank')} />}
                                 </div>
                               ))}
                             </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Approval Actions */}
                      <div className="p-6 space-y-4">
                        <div className="flex flex-col gap-2">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Approval Remarks</label>
                           <textarea
                             placeholder="Note from verification..."
                             className="w-full p-4 bg-slate-50 border-none rounded-2xl text-[10px] font-medium text-slate-600 focus:ring-2 focus:ring-amber-500/20 resize-none h-20"
                             value={remarkInput[shift.id] || ''}
                             onChange={(e) => setRemarkInput({ ...remarkInput, [shift.id]: e.target.value })}
                           />
                        </div>

                        <div className="flex gap-3">
                           <button
                             onClick={() => handleStatusUpdate(shift.id, 'rejected', 'shift')}
                             disabled={processingId === shift.id}
                             className="flex-1 py-4 bg-rose-50 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                           >
                             <XCircle className="w-4 h-4" />
                             Reject
                           </button>
                           <button
                             onClick={() => handleStatusUpdate(shift.id, 'approved', 'shift')}
                             disabled={processingId === shift.id}
                             className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-xl shadow-slate-100 disabled:opacity-50"
                           >
                             <CheckCircle className="w-4 h-4" />
                             Verify & Approve
                           </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {shifts.length === 0 && (
                  <div className="col-span-full py-20 text-center text-slate-300">
                    <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-10" />
                    <p className="text-sm font-black uppercase tracking-[0.2em]">No daily shifts pending</p>
                  </div>
                )}
              </div>
            ) : (
              /* Logs Approval List */
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <AnimatePresence mode="popLayout">
                  {approvals.map((log) => (
                    <motion.div
                      key={log.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col md:flex-row"
                    >
                      {/* User Info Stats */}
                      <div className="bg-slate-50 md:w-56 p-6 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col justify-between">
                        <div>
                          <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-3">
                            <User className="w-6 h-6 text-slate-400" />
                          </div>
                          <h4 className="text-sm font-black text-slate-900 uppercase leading-tight mb-1">{log.user_name}</h4>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{log.user_phone}</p>
                          <div className="mt-4 inline-block bg-teal-100 text-teal-800 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter">
                            {log.branch_name}
                          </div>
                        </div>
                        
                        <div className="mt-8 space-y-4">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Claim Type</p>
                            <p className="text-xs font-black text-slate-700 uppercase">Direct Entry</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vehicle</p>
                            <p className="text-xs font-black text-slate-800 uppercase flex items-center gap-2">
                              <Gauge className="w-3 h-3" />
                              {log.vehicle_name || 'Others'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col">
                        <div className="p-6 flex-1 space-y-6">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <span className="text-xs font-black text-slate-900 uppercase">{format(new Date(log.date), 'dd MMM yyyy')}</span>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Claim</p>
                              <p className="text-xl font-black text-teal-600 tracking-tighter leading-none">₹{formatAmount(log.amount)}</p>
                            </div>
                          </div>

                          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/50 space-y-4">
                            <div className="flex items-start gap-3">
                              <div className="flex flex-col items-center gap-1 mt-1">
                                <div className="w-2 h-2 rounded-full border-2 border-teal-500 bg-white" />
                                <div className="w-0.5 h-6 bg-slate-200" />
                                <Navigation className="w-3 h-3 text-rose-500 rotate-180" />
                              </div>
                              <div className="flex-1 space-y-3">
                                <div>
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Departure</p>
                                  <p className="text-xs font-black text-slate-700 uppercase leading-tight">{log.source}</p>
                                </div>
                                <div>
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Destination</p>
                                  <p className="text-xs font-black text-slate-700 uppercase leading-tight">{log.destination}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                               <div className="flex items-center gap-2">
                                  <Navigation className="w-4 h-4 text-indigo-400" />
                                  <span className="text-xs font-black text-slate-900 uppercase">{log.distance_km} KM Total</span>
                               </div>
                            </div>
                          </div>

                          {log.purpose && (
                            <div className="flex gap-3">
                              <MessageSquare className="w-4 h-4 text-slate-400 shrink-0" />
                              <p className="text-xs font-medium text-slate-600 italic">
                                "{log.purpose}"
                              </p>
                            </div>
                          )}
                          
                          {log.image_url && (
                             <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-2xl border border-indigo-100">
                                <Eye className="w-5 h-5 text-indigo-400" />
                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex-1">Evidence Captured</span>
                                <button className="p-2 bg-white rounded-lg shadow-sm" onClick={() => window.open(log.image_url, '_blank')}>
                                   <Eye className="w-4 h-4 text-indigo-600" />
                                </button>
                             </div>
                          )}

                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Review Remarks</label>
                            <textarea
                              placeholder="Add verification notes..."
                              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-medium text-slate-600 focus:ring-2 focus:ring-teal-500/20 h-20 resize-none"
                              value={remarkInput[log.id] || ''}
                              onChange={(e) => setRemarkInput({ ...remarkInput, [log.id]: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="p-4 bg-slate-100/50 flex gap-3 border-t border-slate-100">
                          <button
                            onClick={() => handleStatusUpdate(log.id, 'rejected', 'log')}
                            disabled={processingId === log.id}
                            className="flex-1 py-3 bg-white text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-colors border border-rose-100 disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(log.id, 'approved', 'log')}
                            disabled={processingId === log.id}
                            className="flex-[2] py-3 bg-teal-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-100 disabled:opacity-50"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve Log
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {approvals.length === 0 && (
                  <div className="col-span-full py-20 text-center text-slate-300">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-10" />
                    <p className="text-sm font-black uppercase tracking-[0.2em]">No direct logs pending</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
