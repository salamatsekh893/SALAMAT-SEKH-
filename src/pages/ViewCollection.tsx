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
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalCollectedAmount, setTotalCollectedAmount] = useState(0);

  // Selection state for Bulk Deletion
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<any>({ 
    id: '', loan_id: '', amount_paid: '', payment_date: format(new Date(), 'yyyy-MM-dd')
  });

  const loadData = (pageNum = page, limitVal = limit, searchVal = searchTerm, start = startDate, end = endDate) => {
    setLoading(true);
    let url = `/collections?page=${pageNum}&limit=${limitVal}`;
    if (searchVal) url += `&search=${encodeURIComponent(searchVal)}`;
    if (start) url += `&start_date=${start}`;
    if (end) url += `&end_date=${end}`;

    Promise.all([fetchWithAuth(url), fetchWithAuth('/loans')])
      .then(([colData, loanData]) => {
        if (Array.isArray(colData)) {
          setCollections(colData);
          setTotal(colData.length);
          setTotalCollectedAmount(colData.reduce((acc: number, c: any) => acc + (parseFloat(c.amount_paid) || 0), 0));
        } else if (colData && colData.collections) {
          setCollections(colData.collections || []);
          setTotal(colData.total || 0);
          setTotalCollectedAmount(colData.totalAmount || 0);
        }
        setLoans((loanData || []).filter((l: any) => l.status === 'active'));
      })
      .catch(err => console.error(err))
      .finally(() => {
        setLoading(false);
        setInitialLoading(false);
      });
  };

  // Reset selected ids when page or filter updates
  useEffect(() => {
    setSelectedIds([]);
  }, [page, limit, searchTerm, startDate, endDate]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pageIds = collections.map(col => col.id);
      setSelectedIds(prev => {
        const newSet = new Set([...prev, ...pageIds]);
        return Array.from(newSet);
      });
    } else {
      const pageIds = collections.map(col => col.id);
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`আপনি কি নিশ্চিত যে আপনি এই ${selectedIds.length}টি কালেকশন একসাথে ডিলিট করতে চান?`)) return;

    setLoading(true);
    try {
      await fetchWithAuth('/collections/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });
      toast.success('সিলেক্ট করা কালেকশনগুলো সফলভাবে ডিলিট করা হয়েছে! 🗑️');
      voiceFeedback.success();
      setSelectedIds([]);
      loadData(page, limit);
    } catch (err: any) {
      toast.error(err.message || 'কালেকশনগুলো ডিলিট করতে ব্যর্থ হয়েছে।');
      voiceFeedback.error();
    } finally {
      setLoading(false);
    }
  };

  // Trigger load when page or limit changes
  useEffect(() => {
    loadData(page, limit, searchTerm, startDate, endDate);
  }, [page, limit]);

  // Reset to page 1 and load with delay when search/dates change (Debounce)
  useEffect(() => {
    setPage(1);
    const delayDebounceFn = setTimeout(() => {
      loadData(1, limit, searchTerm, startDate, endDate);
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, startDate, endDate]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this recovery record?')) return;
    try {
      await fetchWithAuth(`/collections/${id}`, { method: 'DELETE' });
      voiceFeedback.success();
      toast.success('Collection deleted successfully');
      loadData(page, limit);
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
      loadData(page, limit);
    } catch (err: any) {
      toast.error(err.message || 'Error saving collection');
      voiceFeedback.error();
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  // Filter collections directly from the paginated state
  const filteredCollections = collections;

  const exportToExcel = () => {
    let url = '/collections';
    const params = [];
    if (searchTerm) params.push(`search=${encodeURIComponent(searchTerm)}`);
    if (startDate) params.push(`start_date=${startDate}`);
    if (endDate) params.push(`end_date=${endDate}`);
    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    toast.loading('Preparing excel download...');
    fetchWithAuth(url)
      .then((colData: any) => {
        toast.dismiss();
        const records = Array.isArray(colData) ? colData : (colData?.collections || []);
        if (records.length === 0) {
          toast.error('No records to export');
          return;
        }

        const data = records.map((col: any, idx: number) => ({
          'SL': idx + 1,
          'DATE': col.payment_date ? col.payment_date.substring(0, 10) : '',
          'TIME': col.created_at ? format(new Date(col.created_at), 'hh:mm a') : '',
          'LOAN NO': col.loan_no || '',
          'LOAN ID': col.loan_id,
          'MEMBER CODE': col.member_code || '',
          'MEMBER NAME': col.customer_name,
          'GROUP': col.group_name || 'Individual',
          'COLLECTED BY': col.collected_by_name,
          'APPROVED BY': col.approved_by_name || '-',
          'STATUS': col.status || 'pending',
          'AMOUNT': parseFloat(col.amount_paid)
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Collections");
        XLSX.writeFile(wb, `Collections_${format(new Date(), 'dd_MM_yyyy')}.xlsx`);
        toast.success('Exported successfully! 📥');
      })
      .catch(() => {
        toast.dismiss();
        toast.error('Failed to export data');
      });
  };

  const totalCollected = totalCollectedAmount;
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

  const renderPagination = () => {
    const totalPages = Math.ceil(total / limit) || 1;
    const limits = [10, 20, 30, 50, 100, 200, 500, 1000];
    const startIdx = total === 0 ? 0 : (page - 1) * limit + 1;
    const endIdx = Math.min(total, page * limit);

    return (
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white px-6 py-4 rounded-2xl border border-indigo-100 shadow-lg max-w-[1600px] mx-auto my-6">
        {/* Info & Limit Selector */}
        <div className="flex flex-col sm:flex-row items-center gap-4 text-slate-500 text-xs font-bold uppercase tracking-wider w-full md:w-auto text-center sm:text-left justify-center md:justify-start">
          <div className="flex items-center gap-2 justify-center">
            <span className="text-slate-400">Records per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-200 text-indigo-600 font-extrabold px-3 py-1.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
            >
              {limits.map((l) => (
                <option key={l} value={l}>
                  {l} items
                </option>
              ))}
            </select>
          </div>
          <span className="hidden sm:inline text-slate-300">|</span>
          <div className="text-slate-500 font-bold">
            Showing <span className="text-slate-800 font-black">{startIdx}</span> to{" "}
            <span className="text-slate-800 font-black">{endIdx}</span> of{" "}
            <span className="text-indigo-600 font-black">{total}</span> records
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-center">
          <motion.button
            whileHover={page > 1 ? { scale: 1.02 } : {}}
            whileTap={page > 1 ? { scale: 0.98 } : {}}
            disabled={page === 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all border ${
              page === 1
                ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                : "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50 shadow-sm cursor-pointer"
            }`}
          >
            ← Prev
          </motion.button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = page;
              if (page <= 3) pageNum = i + 1;
              else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = page - 2 + i;

              if (pageNum < 1 || pageNum > totalPages) return null;

              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 rounded-xl text-xs font-black transition-all ${
                    page === pageNum
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-100"
                      : "text-slate-600 hover:bg-slate-100 cursor-pointer"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <motion.button
            whileHover={page < totalPages ? { scale: 1.02 } : {}}
            whileTap={page < totalPages ? { scale: 0.98 } : {}}
            disabled={page === totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all border ${
              page === totalPages
                ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                : "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50 shadow-sm cursor-pointer"
            }`}
          >
            Next →
          </motion.button>
        </div>
      </div>
    );
  };

  if (initialLoading) return (
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
                  <div className="text-3xl font-black tracking-tight">{total}</div>
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
            <div className="flex items-center gap-3 w-full lg:justify-end flex-wrap">
              {selectedIds.length > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wide shadow-md transition-all cursor-pointer border border-rose-500"
                >
                  <Trash2 className="w-4 h-4" />
                  ডিলিট করুন ({selectedIds.length})
                </motion.button>
              )}
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
                {loading ? (
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                )}
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
                  <th className="p-4 w-[50px] text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                      checked={collections.length > 0 && collections.every(col => selectedIds.includes(col.id))}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th className="text-center text-[11px] font-black uppercase tracking-wider p-4 w-[60px] text-white">#</th>
                  <th className="text-left text-[11px] font-black uppercase tracking-wider p-4 w-[130px] text-white">Date & Time</th>
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
                  {filteredCollections.map((col, idx) => (
                    <tr 
                      key={col.id}
                      className="group hover:bg-indigo-50/30 transition-colors"
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                          checked={selectedIds.includes(col.id)}
                          onChange={(e) => handleSelectOne(col.id, e.target.checked)}
                        />
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-sm font-bold text-indigo-500">{(page - 1) * limit + idx + 1}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700">{col.payment_date ? col.payment_date.substring(0, 10) : ''}</span>
                          <span className="text-[9px] font-mono text-slate-400">
                            {col.created_at ? format(new Date(col.created_at), 'hh:mm a') : format(new Date(col.payment_date || new Date()), 'EEEE')}
                          </span>
                        </div>
                       </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-800">{col.customer_name}</span>
                            {col.member_code && (
                              <span className="bg-slate-100 text-slate-600 text-[10px] font-mono px-2 py-0.5 rounded-md font-bold">
                                {col.member_code}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-tighter flex items-center gap-1 mt-0.5">
                            <CreditCard className="w-3 h-3" />
                            {col.loan_no ? col.loan_no : `Loan #${col.loan_id}`}
                            <span className="text-slate-400 mx-1">•</span>
                            <span className="text-purple-600">{col.group_name || 'Individual'}</span>
                          </span>
                        </div>
                       </td>
                      <td className="p-4 text-right">
                        <div className="flex flex-col items-end justify-center">
                           <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl text-base font-black border border-emerald-200">
                             <DollarSign className="w-3.5 h-3.5" />
                             ₹{formatAmount(col.amount_paid)}
                           </span>
                           {col.remarks === 'Late Payment Penalty/Fine' && (
                              <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 mt-1 rounded-md">Penalty</span>
                           )}
                        </div>
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
                    </tr>
                  ))}
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
            {filteredCollections.map((col, idx) => (
              <div
                key={col.id}
                className="bg-white rounded-2xl shadow-lg overflow-hidden border border-indigo-100"
              >
                {/* Card Header */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-3 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-white/40 text-white focus:ring-indigo-500 cursor-pointer accent-white"
                      checked={selectedIds.includes(col.id)}
                      onChange={(e) => handleSelectOne(col.id, e.target.checked)}
                    />
                    <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                      <span className="text-white font-black text-sm">#{(page - 1) * limit + idx + 1}</span>
                    </div>
                    <div>
                      <p className="text-white text-xs font-bold opacity-90">Collection / Loan</p>
                      <p className="text-white text-xs font-mono">{col.loan_no || `LOAN #${col.loan_id}`}</p>
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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-base font-black text-slate-800">{col.customer_name}</p>
                        {col.member_code && (
                          <span className="bg-slate-100 text-slate-600 text-[9px] font-mono px-1.5 py-0.5 rounded font-black">
                            {col.member_code}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-black text-purple-600 uppercase mt-0.5">{col.group_name || 'Individual'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Date & Time</p>
                      <p className="text-sm font-bold text-slate-700">{col.payment_date ? col.payment_date.substring(0, 10) : ''}</p>
                      <p className="text-[10px] font-bold text-slate-400">{col.created_at ? format(new Date(col.created_at), 'hh:mm a') : ''}</p>
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
                    <div className="bg-slate-50 rounded-xl p-3 text-center col-span-2">
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
              </div>
            ))}

          {filteredCollections.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-2xl p-12 text-center shadow-lg border border-indigo-100 w-full"
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

      {/* Modern Pagination Controls (Shared for both Desktop and Mobile layout) */}
      <div className="px-4 sm:px-6">
        {renderPagination()}
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