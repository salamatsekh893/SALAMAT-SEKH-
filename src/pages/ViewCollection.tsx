import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchWithAuth } from '../lib/api';
import { formatAmount } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import { Trash2, Search, Edit2, PlusCircle, FileSpreadsheet, X, Filter, Calendar, DollarSign, Users, CreditCard, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { voiceFeedback } from '../lib/voice';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

export default function ViewCollection() {
  const { user } = useAuth();
  const [collections, setCollections] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<any>({ 
    id: '', loan_id: '', amount_paid: '', payment_date: format(new Date(), 'yyyy-MM-dd')
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([fetchWithAuth('/collections'), fetchWithAuth('/loans')])
      .then(([colData, loanData]) => {
        setCollections(colData);
        setLoans(loanData.filter((l: any) => l.status === 'active'));
      }).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this recovery record?')) return;
    try {
      await fetchWithAuth(`/collections/${id}`, { method: 'DELETE' });
      voiceFeedback.success();
      toast.success('Collection deleted successfully');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete collection');
      voiceFeedback.error();
    }
  };

  const handleEdit = (col: any) => {
    setFormData({
      id: col.id,
      loan_id: col.loan_id,
      amount_paid: col.amount_paid,
      payment_date: col.payment_date ? col.payment_date.substring(0, 10) : format(new Date(), 'yyyy-MM-dd'),
    });
    setShowModal(true);
  };

  const handleAddNew = () => {
    setFormData({ 
      id: '', loan_id: '', amount_paid: '', payment_date: format(new Date(), 'yyyy-MM-dd')
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await fetchWithAuth(`/collections/${formData.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        toast.success("Collection Successfully Updated ✅");
      } else {
        await fetchWithAuth('/collections', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        toast.success("Collection Successful ✅");
      }
      voiceFeedback.payment();
      setShowModal(false);
      setFormData({ 
        id: '', loan_id: '', amount_paid: '', payment_date: format(new Date(), 'yyyy-MM-dd')
      });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error saving collection');
      voiceFeedback.error();
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
  };

  const filteredCollections = collections.filter(col => {
    const searchMatches = col.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      col.loan_id?.toString().includes(searchTerm) ||
      col.collected_by_name?.toLowerCase().includes(searchTerm.toLowerCase());

    let dateMatches = true;
    if (col.payment_date) {
      const payDate = col.payment_date.substring(0, 10);
      if (startDate) dateMatches = dateMatches && payDate >= startDate;
      if (endDate) dateMatches = dateMatches && payDate <= endDate;
    } else {
      if (startDate || endDate) dateMatches = false;
    }

    return searchMatches && dateMatches;
  });

  const exportToExcel = () => {
    const data = filteredCollections.map((col, idx) => ({
      'SL': idx + 1,
      'DATE': col.payment_date,
      'LOAN ID': col.loan_id,
      'MEMBER NAME': col.customer_name,
      'COLLECTED BY': col.collected_by_name,
      'AMOUNT': parseFloat(col.amount_paid)
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Collections");
    XLSX.writeFile(wb, `Collections_${format(new Date(), 'dd_MM_yyyy')}.xlsx`);
    toast.success('Exported successfully!');
  };

  const totalCollected = filteredCollections.reduce((acc, col) => acc + (parseFloat(col.amount_paid) || 0), 0);
  const hasActiveFilters = searchTerm !== '' || startDate !== '' || endDate !== '';

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const statusConfig = {
      approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle, label: 'Approved' },
      rejected: { bg: 'bg-rose-100', text: 'text-rose-700', icon: AlertCircle, label: 'Rejected' },
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock, label: 'Pending' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  if (loading) return (
    <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          className="w-14 h-14 border-4 border-indigo-600 border-t-transparent rounded-full"
        />
        <p className="text-slate-600 font-black uppercase tracking-widest text-xs">Loading Collections...</p>
      </motion.div>
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
      </div>

      {/* Summary Header */}
      <div className="relative w-full px-4 sm:px-6 pt-6 pb-4 bg-white/80 backdrop-blur-md border-b border-indigo-100 sticky top-0 z-20 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 max-w-[1600px] mx-auto">
          {/* Stats Cards */}
          <motion.div 
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.1 } }
            }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto"
          >
            <motion.div 
              variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
              whileHover={{ y: -4, transition: { type: "spring", stiffness: 400 } }}
              className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-indigo-700 text-white px-5 py-4 rounded-2xl shadow-xl"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-10 -mt-10" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-wider opacity-90 mb-1 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Total Records
                  </div>
                  <div className="text-3xl font-black tracking-tight">{filteredCollections.length}</div>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <CreditCard className="w-6 h-6" />
                </div>
              </div>
            </motion.div>

            <motion.div 
              variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
              whileHover={{ y: -4, transition: { type: "spring", stiffness: 400 } }}
              className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-700 text-white px-5 py-4 rounded-2xl shadow-xl"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-10 -mt-10" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-wider opacity-90 mb-1 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    Total Collected
                  </div>
                  <div className="text-3xl font-black tracking-tight">₹{formatAmount(totalCollected)}</div>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Actions */}
          <div className="flex flex-col gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-3 w-full lg:justify-end">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={exportToExcel}
                className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wide shadow-sm border border-emerald-200 hover:bg-emerald-100 transition-all"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export Excel
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAddNew}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wide shadow-md hover:shadow-lg transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                New Payment
              </motion.button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search by name, loan ID, agent..."
                  className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
                <Calendar className="w-4 h-4 text-indigo-500" />
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)} 
                  className="w-full text-sm font-medium text-slate-700 outline-none bg-transparent"
                />
                <span className="text-slate-300 font-bold">—</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)} 
                  className="w-full text-sm font-medium text-slate-700 outline-none bg-transparent"
                />
                {(startDate || endDate) && (
                  <button onClick={() => { setStartDate(''); setEndDate(''); }}>
                    <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                  </button>
                )}
              </div>

              {hasActiveFilters && (
                <motion.button 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={clearFilters}
                  className="flex items-center justify-center gap-1.5 bg-slate-100 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-slate-200 transition-all"
                >
                  <Filter className="w-3.5 h-3.5" />
                  Clear Filters
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop/Laptop View - Table */}
      <div className="hidden md:block relative px-4 sm:px-6 py-6 max-w-[1600px] mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-indigo-100">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-600 to-purple-600">
                  <th className="text-center text-[11px] font-black uppercase tracking-wider p-4 w-[60px] text-white">#</th>
                  <th className="text-left text-[11px] font-black uppercase tracking-wider p-4 w-[130px] text-white">Date</th>
                  <th className="text-left text-[11px] font-black uppercase tracking-wider p-4 text-white">Customer / Loan</th>
                  <th className="text-left text-[11px] font-black uppercase tracking-wider p-4 w-[140px] text-white text-right">Amount</th>
                  <th className="text-left text-[11px] font-black uppercase tracking-wider p-4 w-[150px] text-white">Collected By</th>
                  <th className="text-left text-[11px] font-black uppercase tracking-wider p-4 w-[150px] text-white">Approved By</th>
                  <th className="text-center text-[11px] font-black uppercase tracking-wider p-4 w-[120px] text-white">Status</th>
                  {user?.role === 'superadmin' && (
                    <th className="text-center text-[11px] font-black uppercase tracking-wider p-4 w-[100px] text-white">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence>
                  {filteredCollections.map((col, idx) => (
                    <motion.tr 
                      key={col.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2, delay: idx * 0.02 }}
                      whileHover={{ backgroundColor: "rgba(99, 102, 241, 0.04)" }}
                      className="group hover:bg-indigo-50/30 transition-colors"
                    >
                      <td className="p-4 text-center">
                        <span className="text-sm font-bold text-indigo-500">{idx + 1}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700">{col.payment_date}</span>
                          <span className="text-[9px] font-mono text-slate-400">
                            {format(new Date(col.payment_date), 'EEEE')}
                          </span>
                        </div>
                       </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-800">{col.customer_name}</span>
                          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-tighter flex items-center gap-1 mt-0.5">
                            <CreditCard className="w-3 h-3" />
                            Loan #{col.loan_id}
                          </span>
                        </div>
                       </td>
                      <td className="p-4 text-right">
                        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl text-base font-black border border-emerald-200">
                          <DollarSign className="w-3.5 h-3.5" />
                          ₹{formatAmount(col.amount_paid)}
                        </span>
                       </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                            <Users className="w-3 h-3 text-indigo-600" />
                          </div>
                          <span className="text-sm font-bold text-slate-600">{col.collected_by_name}</span>
                        </div>
                       </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-600">{col.approved_by_name || '-'}</span>
                        </div>
                       </td>
                      <td className="p-4 text-center">
                        <StatusBadge status={col.status || 'pending'} />
                       </td>
                      {user?.role === 'superadmin' && (
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <motion.button 
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleEdit(col)} 
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            >
                              <Edit2 className="w-4 h-4" />
                            </motion.button>
                            <motion.button 
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleDelete(col.id)} 
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          </div>
                        </td>
                      )}
                    </motion.tr>
                  ))}
                </AnimatePresence>
                {filteredCollections.length === 0 && (
                  <tr>
                    <td colSpan={user?.role === 'superadmin' ? 7 : 6} className="py-20 text-center">
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center gap-4 text-slate-400"
                      >
                        <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center">
                          <Search className="w-10 h-10 text-indigo-300" />
                        </div>
                        <p className="text-sm font-black uppercase tracking-wider">No collections match your filters</p>
                        {hasActiveFilters && (
                          <button onClick={clearFilters} className="text-xs text-indigo-500 font-bold underline hover:text-indigo-600">
                            Clear filters
                          </button>
                        )}
                      </motion.div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Mobile View - Cards */}
      <div className="block md:hidden relative px-4 py-6">
        <div className="space-y-4">
          <AnimatePresence>
            {filteredCollections.map((col, idx) => (
              <motion.div
                key={col.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="bg-white rounded-2xl shadow-lg overflow-hidden border border-indigo-100"
              >
                {/* Card Header */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-3 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                      <span className="text-white font-black text-sm">#{idx + 1}</span>
                    </div>
                    <div>
                      <p className="text-white text-xs font-bold opacity-90">Collection ID</p>
                      <p className="text-white text-xs font-mono">{col.loan_id}</p>
                    </div>
                  </div>
                  <StatusBadge status={col.status || 'pending'} />
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3">
                  {/* Customer Info */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Customer Name</p>
                      <p className="text-base font-black text-slate-800">{col.customer_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Date</p>
                      <p className="text-sm font-bold text-slate-700">{col.payment_date}</p>
                    </div>
                  </div>

                  {/* Amount & Collection Info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50 rounded-xl p-3 text-center">
                      <p className="text-[9px] font-black uppercase text-emerald-600 tracking-wider flex items-center justify-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        Amount
                      </p>
                      <p className="text-xl font-black text-emerald-700">
                        ₹{formatAmount(col.amount_paid)}
                      </p>
                    </div>
                    <div className="bg-indigo-50 rounded-xl p-3 text-center">
                      <p className="text-[9px] font-black uppercase text-indigo-600 tracking-wider flex items-center justify-center gap-1">
                        <Users className="w-3 h-3" />
                        Collected By
                      </p>
                      <p className="text-sm font-bold text-indigo-700">{col.collected_by_name}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                      <p className="text-[9px] font-black uppercase text-slate-600 tracking-wider flex items-center justify-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Approved By
                      </p>
                      <p className="text-sm font-bold text-slate-700">{col.approved_by_name || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                {user?.role === 'superadmin' && (
                  <div className="bg-slate-50 px-4 py-3 flex justify-end gap-3 border-t border-slate-100">
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleEdit(col)} 
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDelete(col.id)} 
                      className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </motion.button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredCollections.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-2xl p-12 text-center shadow-lg border border-indigo-100"
            >
              <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                <Search className="w-10 h-10 text-indigo-300" />
              </div>
              <p className="text-sm font-black uppercase tracking-wider text-slate-400">No collections match your filters</p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="mt-3 text-xs text-indigo-500 font-bold underline">
                  Clear filters
                </button>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Bottom padding */}
      <div className="h-8" />

      {/* Animated Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                <h2 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                  {formData.id ? <Edit2 className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
                  {formData.id ? 'Edit Collection' : 'Record New Payment'}
                </h2>
              </div>
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-500 mb-1.5">Select Loan</label>
                    <select 
                      required 
                      className="block w-full border border-slate-200 rounded-xl p-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      value={formData.loan_id} 
                      onChange={e => {
                        const lId = e.target.value;
                        const loan = loans.find(l => l.id == lId);
                        setFormData({
                          ...formData, 
                          loan_id: lId, 
                          amount_paid: loan ? Math.round(loan.installment) : ''
                        })
                      }}
                    >
                      <option value="">Select a loan</option>
                      {loans.map(l => (
                        <option key={l.id} value={l.id}>
                          {l.customer_name} - EMI: ₹{Math.round(parseFloat(l.installment))}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-500 mb-1.5">Amount Received</label>
                    <input 
                      required 
                      type="number" 
                      min="0" 
                      step="1" 
                      className="block w-full border border-slate-200 rounded-xl p-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={formData.amount_paid} 
                      onChange={e => setFormData({...formData, amount_paid: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-500 mb-1.5">Payment Date</label>
                    <input 
                      required 
                      type="date" 
                      className="block w-full border border-slate-200 rounded-xl p-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={formData.payment_date} 
                      onChange={e => setFormData({...formData, payment_date: e.target.value})} 
                    />
                  </div>

                  <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                    <button 
                      type="button" 
                      onClick={() => setShowModal(false)} 
                      className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 transition-all"
                    >
                      Cancel
                    </button>
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit" 
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition-all"
                    >
                      {formData.id ? 'Update Payment' : 'Save Payment'}
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}