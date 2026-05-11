import React, { useState, useEffect } from 'react';
import { voiceFeedback } from '../lib/voice';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Plus, X, Search, Building2, Trash2, Calendar, Receipt } from 'lucide-react';
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
  const [submitting, setSubmitting] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetchWithAuth('/expenses', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setShowForm(false);
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
      alert(err.message || 'Error adding expense');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = expenses.filter(e => 
    e.category.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (e.description && e.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 min-h-screen">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-rose-100 p-2.5 rounded-xl">
            <Receipt className="w-6 h-6 text-rose-700" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Expenses</h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Manage Company Expenses</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-6 relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search expenses..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">Date</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">Category</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">Branch</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">Description</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">Payment By</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-slate-500">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">
                      {format(new Date(item.date), 'dd MMM yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-700">{item.branch_name || '-'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{item.description}</td>
                    <td className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {item.payment_method}
                    </td>
                    <td className="px-4 py-3 text-sm font-black text-rose-600 text-right">
                      ₹{formatAmount(item.amount)}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                      <Receipt className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <div className="text-sm font-bold uppercase tracking-widest">No expenses found</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Add New Expense</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                <form id="expenseForm" onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Date *</label>
                      <input 
                        required 
                        type="date" 
                        value={formData.date}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Branch</label>
                      <select 
                        value={formData.branch_id}
                        onChange={e => setFormData({...formData, branch_id: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Category *</label>
                      <select 
                        required 
                        value={formData.category}
                        onChange={e => setFormData({...formData, category: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Amount (₹) *</label>
                      <input 
                        required 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={e => setFormData({...formData, amount: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Payment Method *</label>
                      <select 
                        required 
                        value={formData.payment_method}
                        onChange={e => setFormData({...formData, payment_method: e.target.value, bank_id: ''})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      >
                        <option value="cash">Cash</option>
                        <option value="bank">Bank Transfer / UPI</option>
                      </select>
                    </div>
                    {formData.payment_method === 'bank' && (
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Select Bank *</label>
                        <select 
                          required 
                          value={formData.bank_id}
                          onChange={e => setFormData({...formData, bank_id: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        >
                          <option value="">-- Select Bank --</option>
                          {banks.map(b => (
                            <option key={b.id} value={b.id}>{b.bank_name} - {b.account_number}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Description</label>
                    <textarea 
                      rows={3}
                      placeholder="Enter details about this expense..."
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                    />
                  </div>
                </form>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  form="expenseForm"
                  disabled={submitting}
                  className="px-6 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Expense'}
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
