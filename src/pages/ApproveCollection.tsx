import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchWithAuth } from '../lib/api';
import { formatAmount } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import { Check, XCircle, Search, AlertCircle } from 'lucide-react';
import { voiceFeedback } from '../lib/voice';
import toast from 'react-hot-toast';

export default function ApproveCollection() {
  const { user } = useAuth();
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean, id: number | null, status: 'approved' | 'rejected' | null }>({ isOpen: false, id: null, status: null });

  const loadData = () => {
    setLoading(true);
    fetchWithAuth('/collections')
      .then((colData) => {
        setCollections(colData);
      })
      .catch((err) => {
        console.error("Failed to load collections", err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const executeStatusUpdate = async () => {
    if (!confirmDialog.id || !confirmDialog.status) return;
    
    const { id, status } = confirmDialog;
    setConfirmDialog({ isOpen: false, id: null, status: null });
    
    try {
      await fetchWithAuth(`/collections/${id}/status`, { 
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      if (status === 'approved') {
        voiceFeedback.success();
        toast.success('Collection Approved ✅');
      } else {
        voiceFeedback.error();
        toast('Collection Rejected ❌', { icon: '🚫' });
      }
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleUpdateStatus = (id: number, status: 'approved' | 'rejected') => {
    setConfirmDialog({ isOpen: true, id, status });
  };

  const filteredCollections = collections.filter(col => {
    if (col.status !== activeTab) return false;
    return col.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      col.loan_id?.toString().includes(searchTerm) ||
      col.collected_by_name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totalAmount = filteredCollections.reduce((acc, col) => acc + (parseFloat(col.amount_paid) || 0), 0);

  if (loading) return (
    <div className="p-20 text-center">
      <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
      <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Pending Collections...</p>
    </div>
  );

  return (
    <div className="space-y-6 pb-10 w-full relative">
      <AnimatePresence>
        {confirmDialog.isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40"
              onClick={() => setConfirmDialog({ isOpen: false, id: null, status: null })}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 40 }}
              className="fixed top-[50%] md:top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] md:max-w-sm bg-white rounded-3xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-6 md:p-8 flex flex-col items-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-inner ${confirmDialog.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                  {confirmDialog.status === 'approved' ? <Check className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
                </div>
                <h3 className="text-xl md:text-2xl font-black text-center text-slate-800 mb-2">
                  {confirmDialog.status === 'approved' ? 'Approve Collection?' : 'Reject Collection?'}
                </h3>
                <p className="text-sm md:text-base text-center text-slate-500 font-medium leading-relaxed mb-8">
                  Are you sure you want to {confirmDialog.status === 'approved' ? <span className="text-emerald-600 font-black uppercase">Approve</span> : <span className="text-rose-600 font-black uppercase">Reject</span>} this payment? This action cannot be easily undone.
                </p>
                <div className="flex flex-col sm:flex-row w-full gap-3 sm:gap-4">
                  <button 
                    onClick={() => setConfirmDialog({ isOpen: false, id: null, status: null })}
                    className="flex-1 py-3.5 rounded-2xl text-sm font-black text-slate-600 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition-colors uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={executeStatusUpdate}
                    className={`flex-1 py-3.5 rounded-2xl text-sm font-black text-white hover:opacity-90 active:scale-[0.98] transition-all shadow-lg uppercase tracking-widest ${confirmDialog.status === 'approved' ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-rose-500 shadow-rose-500/30'}`}
                  >
                    {confirmDialog.status === 'approved' ? 'Confirm' : 'Reject'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Summary Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-3 px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4">
        <motion.div 
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
          className="grid grid-cols-2 gap-2 w-full xl:w-auto"
        >
          {/* Active Tab Records Card */}
          <motion.div 
            variants={{
              hidden: { opacity: 0, y: 15 },
              show: { opacity: 1, y: 0 }
            }}
            whileHover={{ y: -2 }}
            className={`text-white px-2 sm:px-4 py-2 sm:py-3 rounded shadow-md border-b-4 flex flex-col justify-center items-center ${activeTab === 'pending' ? 'bg-[#e67e22] border-orange-700' : activeTab === 'approved' ? 'bg-emerald-500 border-emerald-700' : 'bg-rose-500 border-rose-700'}`}
          >
             <div className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider opacity-90 text-center mb-1">{activeTab}</div>
             <div className="text-sm sm:text-lg lg:text-2xl font-black text-center leading-none">{filteredCollections.length}</div>
          </motion.div>

          {/* Active Tab Amount Card */}
          <motion.div 
            variants={{
              hidden: { opacity: 0, y: 15 },
              show: { opacity: 1, y: 0 }
            }}
            whileHover={{ y: -2 }}
            className={`text-white px-2 sm:px-4 py-2 sm:py-3 rounded shadow-md border-b-4 flex flex-col justify-center items-center ${activeTab === 'pending' ? 'bg-[#3b82f6] border-blue-700' : activeTab === 'approved' ? 'bg-emerald-600 border-emerald-800' : 'bg-rose-600 border-rose-800'}`}
          >
             <div className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider opacity-90 text-center mb-1">{activeTab} Amt</div>
             <div className="text-sm sm:text-lg lg:text-2xl font-black text-center leading-none flex items-center">₹{formatAmount(totalAmount)}</div>
          </motion.div>
        </motion.div>

        <div className="flex flex-col gap-2 w-full xl:w-auto mt-1 xl:mt-0 xl:self-end">
          <div className="flex bg-slate-100 p-1 rounded-lg gap-1 border border-slate-200">
            <button onClick={() => setActiveTab('pending')} className={`flex-1 px-4 py-1.5 rounded-[5px] text-[11px] font-bold uppercase tracking-wider transition-all ${activeTab === 'pending' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:bg-slate-200/50'}`}>Pending</button>
            <button onClick={() => setActiveTab('approved')} className={`flex-1 px-4 py-1.5 rounded-[5px] text-[11px] font-bold uppercase tracking-wider transition-all ${activeTab === 'approved' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:bg-slate-200/50'}`}>Approved</button>
            <button onClick={() => setActiveTab('rejected')} className={`flex-1 px-4 py-1.5 rounded-[5px] text-[11px] font-bold uppercase tracking-wider transition-all ${activeTab === 'rejected' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-500 hover:bg-slate-200/50'}`}>Rejected</button>
          </div>
          <div className="relative w-full xl:w-full">
            <input 
              type="text" 
              placeholder="Search collections..."
              className="w-full pl-3 pr-10 py-1.5 bg-white border border-slate-300 rounded text-xs outline-none font-bold text-slate-700 h-[38px] placeholder:text-slate-400 focus:border-blue-500 transition-colors shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="px-0 lg:px-4 overflow-hidden">
        <div className="overflow-x-auto border-y lg:border border-[#233b7e]/30 bg-white shadow-sm rounded-lg">
          <table className="w-full border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[#f8f9fa] border-b border-slate-200 text-[#34495e] divide-x divide-slate-200">
                <th className="text-center text-[11px] font-bold uppercase tracking-wider p-3 w-[50px]">SL NO</th>
                <th className="text-left text-[11px] font-bold uppercase tracking-wider p-3 w-[120px]">DATE</th>
                <th className="text-left text-[11px] font-bold uppercase tracking-wider p-3">PAYER INFO</th>
                <th className="text-center text-[11px] font-bold uppercase tracking-wider p-3 w-[150px]">AMOUNT</th>
                <th className="text-left text-[11px] font-bold uppercase tracking-wider p-3 w-[150px]">AGENT</th>
                {activeTab !== 'pending' && <th className="text-left text-[11px] font-bold uppercase tracking-wider p-3 w-[150px]">APPROVED BY</th>}
                <th className="text-center text-[11px] font-bold uppercase tracking-wider p-3 w-[150px]">{activeTab === 'pending' ? 'ACTION' : 'STATUS'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCollections.map((col, idx) => (
                <tr key={col.id} className="hover:bg-amber-50/40 transition-colors divide-x divide-slate-100 group">
                  <td className="p-3 text-center">
                    <span className="text-[12px] font-black text-slate-500">{idx + 1}</span>
                  </td>
                  <td className="p-3">
                    <span className="text-[12px] font-black text-slate-800 uppercase tracking-widest">{format(new Date(col.payment_date), 'dd/MM/yyyy')}</span>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col leading-tight items-start">
                      <span className="text-[12px] text-slate-800 font-black uppercase leading-none">{col.customer_name}</span>
                      <span className="text-[9px] font-bold text-blue-600 uppercase mt-1 tracking-tighter">LOAN ID #{col.loan_id}</span>
                      {col.is_pre_close ? (
                        <span className="mt-1.5 text-[8px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-black uppercase tracking-widest border border-rose-200">Pre-close Request</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <div className="inline-flex items-center gap-1">
                      <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-[3px] text-[12px] font-black uppercase flex items-center gap-1 border border-amber-200">
                        ₹{formatAmount(col.amount_paid)}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="text-[11px] text-slate-600 font-black uppercase tracking-tight">{col.collected_by_name}</span>
                  </td>
                  {activeTab !== 'pending' && (
                    <td className="p-3">
                      <div className="flex flex-col leading-tight items-start">
                        <span className="text-[11px] text-slate-600 font-black uppercase tracking-tight">{col.approved_by_name || '-'}</span>
                        {col.approved_by_role && <span className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">{col.approved_by_role}</span>}
                      </div>
                    </td>
                  )}
                  <td className="p-3 align-middle">
                    {activeTab === 'pending' ? (
                       <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleUpdateStatus(col.id, 'approved')} 
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-200 hover:border-emerald-500 rounded text-[10px] font-black uppercase tracking-wider transition-colors"
                            title="Approve"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Approve
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(col.id, 'rejected')} 
                            className="flex items-center gap-1 px-2 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white border border-rose-200 hover:border-rose-500 rounded text-[10px] font-black uppercase tracking-wider transition-colors"
                            title="Reject"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                       </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <span className={`px-2 py-1 space-x-1 rounded-[3px] text-[10px] font-black tracking-wider uppercase border flex items-center ${activeTab === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
                          {activeTab === 'approved' ? <Check className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          <span>{activeTab}</span>
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredCollections.length === 0 && (
                <tr>
                  <td colSpan={activeTab === 'pending' ? 6 : 7} className="p-20 text-slate-400 text-center text-[11px] font-black uppercase tracking-[0.2em] opacity-50 bg-slate-50 border-t border-slate-200">
                    No {activeTab} Approvals Detected
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
