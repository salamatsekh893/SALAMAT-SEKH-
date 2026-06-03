import React, { useState, useEffect } from 'react';
import { voiceFeedback } from '../lib/voice';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  Plus, X, Search, Building2, Trash2, Edit2, Calendar, Receipt, 
  User, Wallet, Landmark, Check, AlertCircle, TrendingDown, Info, HelpCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { fetchWithAuth } from '../lib/api';
import { formatAmount } from '../lib/utils';

export default function Expenses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    category: 'Rent',
    amount: '',
    description: '',
    branch_id: '',
    payment_method: 'cash',
    bank_id: ''
  });

  const [branches, setBranches] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  
  // Custom confirmation modal for deletion
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dataExp, dataBranches, dataBanks] = await Promise.all([
        fetchWithAuth('/expenses'),
        fetchWithAuth('/branches'),
        fetchWithAuth('/banks')
      ]);

      setExpenses(dataExp);
      setBranches(dataBranches);
      setBanks(dataBanks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startAdd = () => {
    setEditingExpense(null);
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      category: 'Rent',
      amount: '',
      description: '',
      branch_id: '',
      payment_method: 'cash',
      bank_id: ''
    });
    setErrorMessage('');
    setShowForm(true);
  };

  const startEdit = (item: any) => {
    setEditingExpense(item);
    setFormData({
      date: format(new Date(item.date), 'yyyy-MM-dd'),
      category: item.category,
      amount: parseFloat(item.amount).toString(),
      description: item.description || '',
      branch_id: item.branch_id ? item.branch_id.toString() : '',
      payment_method: item.payment_method,
      bank_id: item.bank_id ? item.bank_id.toString() : ''
    });
    setErrorMessage('');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage('');
    try {
      const endpoint = editingExpense ? `/expenses/${editingExpense.id}` : '/expenses';
      const method = editingExpense ? 'PUT' : 'POST';

      await fetchWithAuth(endpoint, {
        method,
        body: JSON.stringify(formData)
      });
      
      voiceFeedback.success();
      setShowForm(false);
      setEditingExpense(null);
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        category: 'Rent',
        amount: '',
        description: '',
        branch_id: '',
        payment_method: 'cash',
        bank_id: ''
      });
      loadData();
    } catch (err: any) {
      console.error(err);
      voiceFeedback.error();
      setErrorMessage(err.message || 'Error saving expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await fetchWithAuth(`/expenses/${deleteId}`, {
        method: 'DELETE'
      });
      voiceFeedback.success();
      setDeleteId(null);
      loadData();
    } catch (err: any) {
      console.error(err);
      voiceFeedback.error();
      alert(err.message || 'Error deleting expense');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = expenses.filter(e => 
    e.category.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (e.description && e.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (e.creator_name && e.creator_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Compute metrics
  const totalExpenses = filtered.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);
  const cashExpenses = filtered.reduce((acc, curr) => curr.payment_method === 'cash' ? acc + parseFloat(curr.amount || 0) : acc, 0);
  const bankExpenses = filtered.reduce((acc, curr) => curr.payment_method === 'bank' ? acc + parseFloat(curr.amount || 0) : acc, 0);

  // Category tags style dictionary
  const categoryStyles: { [key: string]: { bg: string; text: string; border: string } } = {
    Rent: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100' },
    Electricity: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
    Internet: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100' },
    Stationery: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-100' },
    Travel: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100' },
    Food: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
    Maintenance: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100' },
    Software: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100' },
    Other: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-100' }
  };

  const getStyle = (cat: string) => {
    return categoryStyles[cat] || categoryStyles['Other'];
  };

  const isSuperAdmin = user?.role === 'superadmin';

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 min-h-screen">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-100">
            <Receipt className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Expenses Board</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tracking Corporate Spendings</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={startAdd}
            className="flex items-center gap-2 bg-rose-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-rose-700 transition-all transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Add New Expense
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        
        {/* Statistics Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Total Expense */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between"
          >
            <div className="space-y-1">
              <span className="text-slate-400 font-extrabold uppercase tracking-widest text-[10px]">Overall Spendings</span>
              <div className="text-2xl font-black text-slate-800 font-mono">
                ₹{formatAmount(totalExpenses)}
              </div>
            </div>
            <div className="bg-rose-50 text-rose-600 p-3 rounded-xl border border-rose-100">
              <TrendingDown className="w-5 h-5" />
            </div>
          </motion.div>

          {/* Cash Expenses */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between"
          >
            <div className="space-y-1">
              <span className="text-slate-400 font-extrabold uppercase tracking-widest text-[10px]">Cash Paid</span>
              <div className="text-2xl font-black text-slate-800 font-mono">
                ₹{formatAmount(cashExpenses)}
              </div>
            </div>
            <div className="bg-blue-50 text-blue-600 p-3 rounded-xl border border-blue-100">
              <Wallet className="w-5 h-5" />
            </div>
          </motion.div>

          {/* Bank / UPI Expenses */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between"
          >
            <div className="space-y-1">
              <span className="text-slate-400 font-extrabold uppercase tracking-widest text-[10px]">Bank / UPI Paid</span>
              <div className="text-2xl font-black text-slate-800 font-mono">
                ₹{formatAmount(bankExpenses)}
              </div>
            </div>
            <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl border border-indigo-100">
              <Landmark className="w-5 h-5" />
            </div>
          </motion.div>
        </div>

        {/* Filter and Table Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          {/* Search bar inside the block */}
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search category, description, spender..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 transition-all shadow-2xs"
              />
            </div>
            
            <div className="text-xs text-slate-400 font-bold">
              Showing <span className="text-slate-600">{filtered.length}</span> expenses
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-5 py-3.5 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">Date</th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">Category</th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">Branch</th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">Description</th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">Payment By</th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">Expended By</th>
                  <th className="px-5 py-3.5 text-right text-[10px] font-black uppercase tracking-wider text-slate-400">Amount</th>
                  {isSuperAdmin && (
                    <th className="px-5 py-3.5 text-center text-[10px] font-black uppercase tracking-wider text-slate-400 w-28">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item, i) => {
                  const style = getStyle(item.category);
                  return (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-5 py-4 text-xs font-semibold text-slate-600 whitespace-nowrap">
                        {format(new Date(item.date), 'dd MMM yyyy')}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`${style.bg} ${style.text} ${style.border} px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide border`}>
                          {item.category}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs font-bold text-slate-700">{item.branch_name || 'Main Office'}</td>
                      <td className="px-5 py-4 text-xs text-slate-500 max-w-xs truncate" title={item.description}>
                        {item.description || <span className="italic text-slate-300">No description</span>}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {item.payment_method === 'bank' ? (
                            <div className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-indigo-100">
                              <Landmark className="w-3 h-3" /> Bank
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-blue-100">
                              <Wallet className="w-3 h-3" /> Cash
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200">
                            <User className="w-3 h-3" />
                          </div>
                          <span className="text-xs font-bold text-slate-700">
                            {item.creator_name || 'System'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-black text-rose-600 text-right font-mono whitespace-nowrap">
                        ₹{formatAmount(item.amount)}
                      </td>
                      {isSuperAdmin && (
                        <td className="px-5 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEdit(item)}
                              title="Edit Expense"
                              className="p-1.5 hover:bg-amber-50 text-amber-600 hover:text-amber-700 rounded-lg border border-transparent hover:border-amber-100 transition-all"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteId(item.id)}
                              title="Delete Expense"
                              className="p-1.5 hover:bg-rose-50 text-rose-600 hover:text-rose-700 rounded-lg border border-transparent hover:border-rose-100 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={isSuperAdmin ? 8 : 7} className="px-5 py-16 text-center text-slate-400">
                      <Receipt className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <div className="text-xs font-bold uppercase tracking-widest text-slate-400">No expenses found</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-slate-100"
            >
              <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                <div>
                  <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                    {editingExpense ? 'Edit Expense Record' : 'Record New Expense'}
                  </h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                    {editingExpense ? `Updating Entry ID: ${editingExpense.id}` : 'Create a new spending ledger'}
                  </p>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-250 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                <form id="expenseForm" onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* Highlight Error Message */}
                  {errorMessage && (
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-3.5 flex items-start gap-2.5 text-rose-800">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <div className="text-xs font-semibold leading-relaxed">
                        {errorMessage}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Date *</label>
                      <input 
                        required 
                        type="date" 
                        value={formData.date}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                        className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Branch Office</label>
                      <select 
                        value={formData.branch_id}
                        onChange={e => setFormData({...formData, branch_id: e.target.value})}
                        className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 transition-all cursor-pointer"
                      >
                        <option value="">-- Main Office / All --</option>
                        {branches.map(b => (
                          <option key={b.id} value={b.id}>{b.branch_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Category *</label>
                      <select 
                        required 
                        value={formData.category}
                        onChange={e => setFormData({...formData, category: e.target.value})}
                        className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 transition-all cursor-pointer"
                      >
                        <option value="Rent">Rent</option>
                        <option value="Electricity">Electricity</option>
                        <option value="Internet">Internet</option>
                        <option value="Stationery">Stationery</option>
                        <option value="Travel">Travel & Conveyance</option>
                        <option value="Food">Food & Refreshment</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Software">Software & IT</option>
                        <option value="Other">Other Expenses</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Amount (₹) *</label>
                      <input 
                        required 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={e => setFormData({...formData, amount: e.target.value})}
                        className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 transition-all font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Payment Method *</label>
                      <select 
                        required 
                        value={formData.payment_method}
                        onChange={e => setFormData({...formData, payment_method: e.target.value, bank_id: ''})}
                        className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 transition-all cursor-pointer"
                      >
                        <option value="cash">Cash</option>
                        <option value="bank">Bank Transfer / UPI</option>
                      </select>
                    </div>
                    {formData.payment_method === 'bank' && (
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Select Bank Account *</label>
                        <select 
                          required 
                          value={formData.bank_id}
                          onChange={e => setFormData({...formData, bank_id: e.target.value})}
                          className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 transition-all cursor-pointer"
                        >
                          <option value="">-- Select Bank Account --</option>
                          {banks.map(b => (
                            <option key={b.id} value={b.id}>{b.bank_name} - {b.account_number}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Description details</label>
                    <textarea 
                      rows={3}
                      placeholder="Add simple context notes about this spending..."
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 transition-all resize-none leading-relaxed"
                    />
                  </div>
                </form>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3.5">
                <button 
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold border border-slate-200 hover:border-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  form="expenseForm"
                  disabled={submitting}
                  className="px-6 py-2.5 text-xs font-extrabold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingExpense ? 'Update Expense' : 'Create Entry'}
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 border border-slate-100 text-center"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
                <Trash2 className="w-5 h-5 stroke-[2.5]" />
              </div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-2">Confirm Delete</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed mb-6">
                Are you sure you want to permanently delete this expense ledger entry? 
                This will also restore any associated bank balance deductions!
              </p>
              
              <div className="flex items-center justify-center gap-3">
                <button
                  disabled={deleting}
                  onClick={() => setDeleteId(null)}
                  className="w-1/2 py-2.5 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-bold border border-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={deleting}
                  onClick={handleDelete}
                  className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
