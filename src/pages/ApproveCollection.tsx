import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchWithAuth } from '../lib/api';
import { formatAmount } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import { Check, XCircle, Search, AlertCircle, CheckSquare } from 'lucide-react';
import { voiceFeedback } from '../lib/voice';
import toast from 'react-hot-toast';

export default function ApproveCollection() {
  const { user } = useAuth();
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean, id: number | null, status: 'approved' | 'rejected' | null }>({ isOpen: false, id: null, status: null });
  const [selectedCollections, setSelectedCollections] = useState<Set<number>>(new Set());
  const [isBulkApproving, setIsBulkApproving] = useState(false);

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

  // Update selected items if active tab changes
  useEffect(() => {
    setSelectedCollections(new Set());
  }, [activeTab, searchTerm]);

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

  const executeBulkApprove = async () => {
    if (selectedCollections.size === 0) return;
    setIsBulkApproving(true);
    let successCount = 0;
    
    try {
      await Promise.all(Array.from(selectedCollections).map(async (id) => {
        await fetchWithAuth(`/collections/${id}/status`, { 
          method: 'PUT',
          body: JSON.stringify({ status: 'approved' })
        });
        successCount++;
      }));
      voiceFeedback.success();
      toast.success(`${successCount} Collections Approved ✅`);
      setSelectedCollections(new Set());
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update some collections');
      loadData();
    } finally {
      setIsBulkApproving(false);
    }
  };

  const filteredCollections = collections.filter(col => {
    if (col.status !== activeTab) return false;
    return col.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      col.loan_id?.toString().includes(searchTerm) ||
      col.collected_by_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      col.group_name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedCollections(new Set(filteredCollections.map(c => c.id)));
    } else {
      setSelectedCollections(new Set());
    }
  };

  const handleSelect = (id: number, checked: boolean) => {
    const newSet = new Set(selectedCollections);
    if (checked) newSet.add(id);
    else newSet.delete(id);
    setSelectedCollections(newSet);
  };

  const totalAmount = filteredCollections.reduce((acc, col) => acc + (parseFloat(col.amount_paid) || 0), 0);
  const isAllSelected = filteredCollections.length > 0 && selectedCollections.size === filteredCollections.length;

  if (loading) return (
    <div className="p-20 text-center">
      <div className="animate-spin w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full mx-auto mb-4"></div>
      <p className="text-pink-500 font-bold uppercase tracking-widest text-xs">Loading Pending Collections...</p>
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
              className="fixed inset-0 bg-pink-950/40 backdrop-blur-md z-40"
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
            className={`text-white px-2 sm:px-4 py-2 sm:py-3 rounded-xl shadow-md border-b-4 flex flex-col justify-center items-center ${activeTab === 'pending' ? 'bg-pink-500 border-pink-700' : activeTab === 'approved' ? 'bg-emerald-500 border-emerald-700' : 'bg-rose-500 border-rose-700'}`}
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
            className={`text-white px-2 sm:px-4 py-2 sm:py-3 rounded-xl shadow-md border-b-4 flex flex-col justify-center items-center ${activeTab === 'pending' ? 'bg-pink-600 border-pink-800' : activeTab === 'approved' ? 'bg-emerald-600 border-emerald-800' : 'bg-rose-600 border-rose-800'}`}
          >
             <div className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider opacity-90 text-center mb-1">{activeTab} Amt</div>
             <div className="text-sm sm:text-lg lg:text-2xl font-black text-center leading-none flex items-center">₹{formatAmount(totalAmount)}</div>
          </motion.div>
        </motion.div>

        <div className="flex flex-col gap-2 w-full xl:w-auto mt-1 xl:mt-0 xl:self-end">
          <div className="flex bg-pink-50/50 p-1 rounded-xl gap-1 border border-pink-100">
            <button onClick={() => setActiveTab('pending')} className={`flex-1 px-4 py-1.5 rounded-[8px] text-[11px] font-bold uppercase tracking-wider transition-all ${activeTab === 'pending' ? 'bg-white shadow-sm text-pink-600 border border-pink-100' : 'text-slate-500 hover:bg-pink-50'}`}>Pending</button>
            <button onClick={() => setActiveTab('approved')} className={`flex-1 px-4 py-1.5 rounded-[8px] text-[11px] font-bold uppercase tracking-wider transition-all ${activeTab === 'approved' ? 'bg-white shadow-sm text-emerald-600 border border-emerald-100' : 'text-slate-500 hover:bg-emerald-50'}`}>Approved</button>
            <button onClick={() => setActiveTab('rejected')} className={`flex-1 px-4 py-1.5 rounded-[8px] text-[11px] font-bold uppercase tracking-wider transition-all ${activeTab === 'rejected' ? 'bg-white shadow-sm text-rose-600 border border-rose-100' : 'text-slate-500 hover:bg-rose-50'}`}>Rejected</button>
          </div>
          <div className="relative w-full xl:w-full">
            <input 
              type="text" 
              placeholder="Search collections..."
              className="w-full pl-3 pr-10 py-1.5 bg-white border border-pink-200 rounded-lg text-xs outline-none font-bold text-slate-700 h-[38px] placeholder:text-pink-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-colors shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-300" />
          </div>
        </div>
      </div>

      {activeTab === 'pending' && selectedCollections.size > 0 && (
        <div className="px-3 sm:px-4 lg:px-6">
          <div className="bg-pink-50 border border-pink-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
            <span className="text-pink-800 font-bold text-xs"><span className="text-pink-600 text-sm">{selectedCollections.size}</span> collections selected for approval</span>
            <button 
              onClick={executeBulkApprove}
              disabled={isBulkApproving}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isBulkApproving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : <CheckSquare className="w-4 h-4" />}
              Approve Selected
            </button>
          </div>
        </div>
      )}

      {/* Main Table Content */}
      <div className="px-0 lg:px-4 overflow-hidden">
        <div className="overflow-x-auto border-y lg:border border-pink-200 bg-white shadow-sm rounded-xl">
          <table className="w-full border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-pink-50 border-b border-pink-100 text-pink-900 divide-x divide-pink-100">
                {activeTab === 'pending' && (
                  <th className="text-center p-2 w-[40px]">
                    <div className="flex justify-center">
                      <input 
                        type="checkbox" 
                        className="w-3.5 h-3.5 rounded border-pink-300 text-pink-600 focus:ring-pink-500 cursor-pointer"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                      />
                    </div>
                  </th>
                )}
                <th className="text-center text-[10px] font-black uppercase tracking-wider p-2 w-[40px]">#</th>
                <th className="text-left text-[10px] font-black uppercase tracking-wider p-2 w-[90px]">DATE</th>
                <th className="text-left text-[10px] font-black uppercase tracking-wider p-2 w-[220px]">PAYER INFO</th>
                <th className="text-left text-[10px] font-black uppercase tracking-wider p-2 w-[180px]">GROUP & DETAILS</th>
                <th className="text-center text-[10px] font-black uppercase tracking-wider p-2 w-[120px]">AMOUNT</th>
                <th className="text-left text-[10px] font-black uppercase tracking-wider p-2 w-[140px]">AGENT</th>
                {activeTab !== 'pending' && <th className="text-left text-[10px] font-black uppercase tracking-wider p-2 w-[140px]">APPROVED BY</th>}
                <th className="text-center text-[10px] font-black uppercase tracking-wider p-2 min-w-[120px]">{activeTab === 'pending' ? 'ACTION' : 'STATUS'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-50">
              {filteredCollections.map((col, idx) => {
                const isSelected = selectedCollections.has(col.id);
                return (
                  <tr key={col.id} className={`transition-colors divide-x divide-pink-50 group hover:bg-pink-50/50 ${isSelected ? 'bg-pink-50/80' : ''}`}>
                    {activeTab === 'pending' && (
                      <td className="p-2 text-center align-middle">
                        <input 
                          type="checkbox" 
                          className="w-3.5 h-3.5 rounded border-pink-300 text-pink-600 focus:ring-pink-500 cursor-pointer"
                          checked={isSelected}
                          onChange={(e) => handleSelect(col.id, e.target.checked)}
                        />
                      </td>
                    )}
                    <td className="p-2 text-center align-middle">
                      <span className="text-[11px] font-black text-pink-300">{idx + 1}</span>
                    </td>
                    <td className="p-2 align-middle">
                      <span className="text-[11px] font-black text-pink-900 uppercase tracking-widest">{format(new Date(col.payment_date), 'dd/MM/yyyy')}</span>
                    </td>
                    <td className="p-2 align-middle">
                      <div className="flex flex-col leading-tight items-start">
                        <span className="text-[12px] text-pink-950 font-black uppercase leading-tight truncate max-w-[200px]" title={col.customer_name}>{col.customer_name}</span>
                        <span className="text-[9px] font-bold text-pink-600 uppercase mt-0.5 tracking-tighter">LOAN #{col.loan_id}</span>
                        {col.is_pre_close ? (
                          <span className="mt-1 text-[8px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-black uppercase tracking-widest border border-rose-200">Pre-close Request</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="p-2 align-middle">
                      <div className="flex flex-col leading-tight items-start gap-1">
                        <span className="text-[10px] bg-pink-100 text-pink-800 px-2 py-0.5 rounded uppercase font-bold tracking-tight inline-block whitespace-nowrap">{col.group_name || 'N/A'}</span>
                        <span className="text-[9px] font-bold text-slate-400 capitalize">Mode: Cash</span>
                      </div>
                    </td>
                    <td className="p-2 text-center align-middle">
                      <div className="inline-flex items-center gap-1">
                        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-[13px] font-black uppercase flex items-center gap-1 border border-emerald-200 shadow-sm">
                          ₹{formatAmount(col.amount_paid)}
                        </span>
                      </div>
                    </td>
                    <td className="p-2 align-middle">
                      <span className="text-[10px] text-slate-600 font-bold uppercase tracking-tight">{col.collected_by_name}</span>
                    </td>
                    {activeTab !== 'pending' && (
                      <td className="p-2 align-middle">
                        <div className="flex flex-col leading-tight items-start">
                          <span className="text-[10px] text-slate-600 font-bold uppercase tracking-tight">{col.approved_by_name || '-'}</span>
                          {col.approved_by_role && <span className="text-[8px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">{col.approved_by_role}</span>}
                        </div>
                      </td>
                    )}
                    <td className="p-2 align-middle">
                      {activeTab === 'pending' ? (
                         <div className="flex items-center justify-center gap-1.5">
                            <button 
                              onClick={() => handleUpdateStatus(col.id, 'approved')} 
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-200 hover:border-emerald-500 rounded text-[9px] font-black uppercase tracking-wider transition-colors shadow-sm"
                              title="Approve"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Approve
                            </button>
                            <button 
                              onClick={() => handleUpdateStatus(col.id, 'rejected')} 
                              className="flex items-center gap-1 px-2 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white border border-rose-200 hover:border-rose-500 rounded text-[9px] font-black uppercase tracking-wider transition-colors shadow-sm"
                              title="Reject"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                         </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <span className={`px-2 py-1 space-x-1 rounded-md text-[9px] font-black tracking-wider uppercase border flex items-center shadow-sm ${activeTab === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
                            {activeTab === 'approved' ? <Check className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            <span>{activeTab}</span>
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredCollections.length === 0 && (
                <tr>
                  <td colSpan={activeTab === 'pending' ? 9 : 9} className="p-16 text-pink-300 text-center text-[11px] font-black uppercase tracking-[0.2em] bg-pink-50/30">
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
