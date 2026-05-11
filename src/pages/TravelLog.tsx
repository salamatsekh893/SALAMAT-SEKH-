import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Plus, Calendar, Navigation, Trash2, Car, Eye, X, ArrowRight, Clock } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { formatAmount, cn } from '../lib/utils';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function TravelLog() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [view, setView] = useState<'shifts' | 'logs'>('shifts');

  const fetchData = async () => {
    try {
      const [logsRes, shiftsRes] = await Promise.all([
        fetchWithAuth('/travel/logs'),
        fetchWithAuth('/travel/shifts')
      ]);
      setLogs(logsRes);
      setShifts(shiftsRes);
    } catch (err) {
      toast.error('Failed to load travel data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this log?')) return;
    try {
      await fetchWithAuth(`/travel/logs/${id}`, { method: 'DELETE' });
      toast.success('Deleted');
      fetchData();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'rejected': return 'text-rose-600 bg-rose-50 border-rose-100';
      default: return 'text-amber-600 bg-amber-50 border-amber-100';
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-20">
      <div className="bg-white border-b border-slate-100 flex items-center justify-between h-16 px-4 sticky top-0 z-10 -mx-4 -mt-4">
        <div className="px-2">
          <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight">Travel Logs</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Movement Tracking</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => navigate('/travel/track')}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-xs uppercase shadow-lg shadow-indigo-200 flex items-center gap-2 hover:bg-indigo-700 transition-colors"
          >
            <Navigation className="w-4 h-4" />
            Track Day
          </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-2xl">
           <button 
            onClick={() => setView('shifts')}
            className={cn(
              "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              view === 'shifts' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {view === 'shifts' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                  {shifts.map((shift) => (
                    <motion.div
                      key={shift.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-shadow"
                    >
                      <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-indigo-400" />
                          <span className="text-[10px] font-black text-slate-900 uppercase">{format(new Date(shift.date), 'dd MMM yyyy')}</span>
                        </div>
                        <div className={cn("text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border", getStatusColor(shift.status))}>
                          {shift.status}
                        </div>
                      </div>

                      <div className="p-5 grid grid-cols-2 gap-6 relative">
                         <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-slate-100 rounded-full flex items-center justify-center z-10 shadow-sm">
                            <ArrowRight className="w-3 h-3 text-slate-300" />
                         </div>

                         <div className="space-y-3">
                            {shift.start_image ? (
                              <div className="relative group/start cursor-pointer" onClick={() => setSelectedImage(shift.start_image)}>
                                <img src={shift.start_image} className="w-full h-24 object-cover rounded-2xl border border-slate-100 shadow-sm grayscale group-hover/start:grayscale-0 transition-all" />
                                <div className="absolute inset-0 flex items-end p-2 bg-gradient-to-t from-black/20 to-transparent rounded-2xl">
                                    <span className="text-[7px] font-black text-white uppercase bg-indigo-600 px-1.5 rounded-sm">St: {shift.start_odometer} KM</span>
                                </div>
                              </div>
                            ) : (
                              <div className="h-24 bg-slate-50 rounded-2xl border border-slate-100" />
                            )}
                            <p className="text-[8px] font-black text-slate-400 uppercase text-center">{shift.start_time ? format(new Date(shift.start_time), 'hh:mm a') : 'N/A'}</p>
                         </div>

                         <div className="space-y-3">
                            {shift.end_image ? (
                              <>
                                <div className="relative group/end cursor-pointer" onClick={() => setSelectedImage(shift.end_image)}>
                                  <img src={shift.end_image} className="w-full h-24 object-cover rounded-2xl border border-slate-100 shadow-sm grayscale group-hover/end:grayscale-0 transition-all" />
                                  <div className="absolute inset-0 flex items-end p-2 bg-gradient-to-t from-black/20 to-transparent rounded-2xl">
                                      <span className="text-[7px] font-black text-white uppercase bg-rose-600 px-1.5 rounded-sm">En: {shift.end_odometer} KM</span>
                                  </div>
                                </div>
                                <p className="text-[8px] font-black text-slate-400 uppercase text-center">{shift.end_time ? format(new Date(shift.end_time), 'hh:mm a') : 'Ongoing'}</p>
                              </>
                            ) : (
                              <div className="h-24 bg-indigo-50 border-2 border-dashed border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-300 flex-col gap-1">
                                 <Clock className="w-4 h-4 animate-pulse" />
                                 <span className="text-[7px] font-black uppercase tracking-widest">Tracking...</span>
                              </div>
                            )}
                         </div>
                      </div>

                      <div className="px-5 pb-5 flex items-center justify-between border-t border-slate-50 pt-4 bg-slate-50/10">
                         <div className="flex gap-4">
                            <div className="flex flex-col">
                               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total KM</span>
                               <span className="text-sm font-black text-indigo-600 leading-none">{shift.total_km}</span>
                            </div>
                            <div className="flex flex-col border-l border-slate-100 pl-4">
                               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Claim</span>
                               <span className="text-sm font-black text-slate-900 leading-none">₹{formatAmount(shift.amount)}</span>
                            </div>
                         </div>
                         
                         <div className="flex gap-2">
                            {shift.status === 'active' && (
                              <button onClick={() => navigate('/travel/track')} className="text-[8px] font-black bg-indigo-600 text-white px-3 py-2 rounded-lg uppercase shadow-lg shadow-indigo-100">
                                 Resume
                              </button>
                            )}
                         </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {shifts.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-300">
                    <Navigation className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    <p className="text-xs font-black uppercase tracking-[0.2em]">No tracked shifts yet</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                  {logs.map((log) => (
                    <motion.div
                      key={log.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group flex flex-col"
                    >
                      {/* Image Section */}
                      {log.image_url ? (
                        <div className="relative h-32 w-full overflow-hidden group/img cursor-pointer" onClick={() => setSelectedImage(log.image_url)}>
                          <img src={log.image_url} alt="Travel Evidence" className="w-full h-full object-cover transition-transform group-hover/img:scale-110" />
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                             <Eye className="text-white w-6 h-6" />
                          </div>
                          <div className="absolute top-2 right-2 flex items-center gap-1.5">
                             <div className={cn("text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border bg-white/90 backdrop-blur-sm shadow-sm", getStatusColor(log.status))}>
                               {log.status}
                             </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 border-b border-slate-50 flex justify-between items-center">
                           <div className={cn("text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border", getStatusColor(log.status))}>
                             {log.status}
                           </div>
                           <button onClick={() => handleDelete(log.id)} className="text-rose-400 hover:text-rose-600">
                              <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                      )}

                      <div className="p-4 flex-1">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-[10px] font-black text-slate-900 uppercase">{format(new Date(log.date), 'dd MMM yyyy')}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Claim</p>
                            <p className="text-lg font-black text-teal-600 tracking-tighter leading-none">₹{formatAmount(log.amount)}</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="flex flex-col items-center gap-1 mt-1">
                              <div className="w-2 h-2 rounded-full border-2 border-teal-500 bg-white" />
                              <div className="w-0.5 h-6 bg-slate-100" />
                              <Navigation className="w-3 h-3 text-rose-500 rotate-180" />
                            </div>
                            <div className="flex-1 space-y-3">
                              <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">From</p>
                                <p className="text-xs font-black text-slate-700 uppercase line-clamp-1 leading-tight">{log.source}</p>
                              </div>
                              <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">To</p>
                                <p className="text-xs font-black text-slate-700 uppercase line-clamp-1 leading-tight">{log.destination}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {log.status === 'pending' && log.image_url && (
                        <div className="px-4 py-3 border-t border-slate-50 flex justify-end bg-slate-50/30">
                          <button onClick={() => handleDelete(log.id)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {logs.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-300">
                    <MapPin className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    <p className="text-xs font-black uppercase tracking-[0.2em]">No direct logs found</p>
                    <button onClick={() => navigate('/travel/new')} className="mt-4 text-[10px] font-black text-teal-600 uppercase border-b border-teal-100">Create New Log</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {selectedImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedImage(null)} className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative max-w-4xl w-full aspect-auto rounded-3xl overflow-hidden shadow-2xl">
              <img src={selectedImage} alt="Travel Evidence Full" className="w-full h-auto max-h-[80vh] object-contain" />
              <button onClick={() => setSelectedImage(null)} className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full backdrop-blur-md transition-colors">
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

