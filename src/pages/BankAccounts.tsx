import React, { useState, useEffect } from 'react';
import { voiceFeedback } from '../lib/voice';
import { motion, AnimatePresence } from 'motion/react';
import { Building2, Plus, Edit2, Trash2, Search, Eye, X, ArrowUpRight, ArrowDownLeft, AlertCircle, Wallet, Banknote, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { fetchWithAuth } from '../lib/api';
import { formatAmount } from '../lib/utils';

export default function BankAccounts() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [banks, setBanks] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [selectedBank, setSelectedBank] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [transactionForm, setTransactionForm] = useState({
    bank_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'deposit',
    source_type: 'other',
    source_id: '',
    amount: '',
    purpose: ''
  });
  const [branches, setBranches] = useState<any[]>([]);

  const [capital, setCapital] = useState<any[]>([]);

  useEffect(() => {
    loadBanks();
    loadBranches();
    loadCapital();
  }, []);

  const loadCapital = async () => {
    try {
      const data = await fetchWithAuth('/capital');
      setCapital(data);
    } catch (err) {}
  };

  const loadBranches = async () => {
    try {
      const data = await fetchWithAuth('/branches');
      setBranches(data);
    } catch (err) {}
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionForm.bank_id) {
       voiceFeedback.error();
       alert('Please select an account');
       return;
    }
    
    try {
      await fetchWithAuth(`/banks/${transactionForm.bank_id}/transactions`, {
        method: 'POST',
        body: JSON.stringify(transactionForm)
      });
      setShowTransactionForm(false);
      setTransactionForm({
        bank_id: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        type: 'deposit',
        source_type: 'other',
        source_id: '',
        amount: '',
        purpose: ''
      });
      loadBanks(); // Reload bank balances
      if (selectedBank && selectedBank.id === Number(transactionForm.bank_id)) {
          viewBankDetails(selectedBank); // Reload transactions if viewing same bank
      }
    } catch (err: any) {
      voiceFeedback.error();
      alert(err.message || 'Error saving transaction');
    }
  };

  const loadBanks = async () => {
    try {
      const data = await fetchWithAuth('/banks');
      setBanks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const viewBankDetails = async (bank: any) => {
    setSelectedBank(bank);
    setLoadingTransactions(true);
    try {
      const data = await fetchWithAuth(`/banks/${bank.id}/transactions`);
      setTransactions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this bank account?')) return;
    try {
      await fetchWithAuth(`/banks/${id}`, { method: 'DELETE' });
      loadBanks();
    } catch (err) {
      console.error(err);
    }
  };

  const exportToExcel = () => {
    const exportData = banks.map((b, i) => ({
      'SL NO': i + 1,
      'Bank Name': b.bank_name,
      'Account Number': b.account_number,
      'IFSC Code': b.ifsc_code,
      'Branch': b.branch_name,
      'Account Name': b.account_name,
      'Status': b.status
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bank Accounts');
    XLSX.writeFile(wb, `Bank_Accounts_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredBanks = banks.filter(b => 
    b.bank_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.account_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-10 w-full px-3 sm:px-4 lg:px-6 pt-4">
      {/* Page Header matching design */}
      <div className="flex items-center gap-3 text-[#d32f2f] mb-2">
        <div className="w-10 h-10 rounded-full bg-[#f8bbd0] flex items-center justify-center">
          <Building2 className="w-5 h-5 text-[#d32f2f]" />
        </div>
        <h1 className="text-xl md:text-2xl font-bold uppercase tracking-wider">ACCOUNTS & FUNDS</h1>
      </div>

      {user?.role === 'superadmin' && (
        <div className="flex flex-wrap gap-3 mb-6">
          <button 
            onClick={() => navigate('/banks/new')}
            className="bg-[#5c6bc0] hover:bg-[#3f51b5] text-white px-5 py-2.5 rounded-full text-sm font-bold uppercase tracking-wider shadow-sm transition-colors"
          >
            Add Account
          </button>
          <button 
            onClick={() => setShowTransactionForm(true)}
            className="bg-[#00bfa5] hover:bg-[#009688] text-white px-5 py-2.5 rounded-full text-sm font-bold uppercase tracking-wider shadow-sm transition-colors"
          >
            Transaction
          </button>
        </div>
      )}

      {/* Summary Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start gap-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 w-full">
          {/* Total Bank Balance Card */}
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white p-3 md:p-3 rounded-xl shadow-md flex flex-col justify-center items-center relative overflow-hidden min-h-[90px] md:min-h-[100px] lg:min-h-[90px]">
             <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-white opacity-10 rounded-full blur-2xl"></div>
             <div className="w-8 h-8 md:w-9 md:h-9 bg-white/20 rounded-full flex items-center justify-center mb-1 md:mb-1 relative z-10">
               <Wallet className="w-4 h-4 md:w-5 md:h-5 text-white" />
             </div>
             <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-white/90 text-center mb-0.5 relative z-10 line-clamp-1">
               Total Bank Balance
             </div>
             <div className="text-xl md:text-xl font-black text-center leading-none text-white tracking-tight relative z-10">
               ₹{formatAmount(banks.reduce((sum, b) => sum + parseFloat(b.current_balance || 0), 0))}
             </div>
          </div>
          
          {/* Total Capital Card */}
          <div className="bg-[#00d284] text-white p-3 md:p-3 rounded-xl shadow-md flex flex-col justify-center items-center relative overflow-hidden min-h-[90px] md:min-h-[100px] lg:min-h-[90px]">
             <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-white opacity-10 rounded-full blur-2xl"></div>
             <div className="w-8 h-8 md:w-9 md:h-9 bg-white/20 rounded-full flex items-center justify-center mb-1 md:mb-1 relative z-10">
               <Banknote className="w-4 h-4 md:w-5 md:h-5 text-white" />
             </div>
             <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-white/90 text-center mb-0.5 relative z-10 line-clamp-1">
               Total Capital
             </div>
             <div className="text-xl md:text-xl font-black text-center leading-none text-white tracking-tight relative z-10">
               ₹{formatAmount(capital.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0))}
             </div>
          </div>

          {/* Active Accounts Card */}
          <div className="bg-[#0ea5e9] text-white p-3 md:p-3 rounded-xl shadow-md flex flex-col justify-center items-center relative overflow-hidden min-h-[90px] md:min-h-[100px] lg:min-h-[90px]">
             <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-white opacity-10 rounded-full blur-2xl"></div>
             <div className="w-8 h-8 md:w-9 md:h-9 bg-white/20 rounded-full flex items-center justify-center mb-1 md:mb-1 relative z-10">
               <Building2 className="w-4 h-4 md:w-5 md:h-5 text-white" />
             </div>
             <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-white/90 text-center mb-0.5 relative z-10 line-clamp-1">
               Active Accounts
             </div>
             <div className="text-xl md:text-xl font-black text-center leading-none text-white tracking-tight relative z-10">
               {banks.filter(b => b.status === 'active').length}
             </div>
          </div>
          
          {/* Total Accounts Card */}
          <div className="bg-[#f97316] text-white p-3 md:p-3 rounded-xl shadow-md flex flex-col justify-center items-center relative overflow-hidden min-h-[90px] md:min-h-[100px] lg:min-h-[90px]">
             <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-white opacity-10 rounded-full blur-2xl"></div>
             <div className="w-8 h-8 md:w-9 md:h-9 bg-white/20 rounded-full flex items-center justify-center mb-1 md:mb-1 relative z-10">
               <Store className="w-4 h-4 md:w-5 md:h-5 text-white" />
             </div>
             <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-white/90 text-center mb-0.5 relative z-10 line-clamp-1">
               Total Accounts
             </div>
             <div className="text-xl md:text-xl font-black text-center leading-none text-white tracking-tight relative z-10">
               {banks.length}
             </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full xl:w-auto mt-2 xl:mt-0 xl:self-end">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 xl:w-64">
              <Search className="absolute text-slate-400 w-4 h-4 left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search accounts..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              />
            </div>
            <button 
              onClick={exportToExcel}
              className="bg-[#10b981] text-white px-3 sm:px-4 py-2 rounded text-[10px] sm:text-[12px] font-black uppercase tracking-wider shadow-sm hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              Excel
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 px-3 sm:px-4 lg:px-6">
        {filteredBanks.map((bank, idx) => (
          <div key={bank.id} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col relative group">
            <div className="p-2.5 border-b border-slate-100 flex justify-between items-start bg-slate-50 relative z-10">
              <div>
                <h3 className="text-[13px] font-black text-slate-800 uppercase tracking-tight line-clamp-1">{bank.bank_name}</h3>
                <div className="text-[9px] font-bold text-slate-500 tracking-wider uppercase mt-0.5">Branch: {bank.branch_name}</div>
              </div>
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                bank.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}>
                {bank.status}
              </span>
            </div>
            
            <div className="p-3 flex-1 flex flex-col gap-2 relative z-10 bg-white">
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Account Number</div>
                  <div className="text-[14px] font-mono font-black text-slate-800 tracking-wider bg-slate-100 px-1.5 py-0.5 rounded inline-block">
                    {bank.account_number}
                  </div>
                </div>
              </div>
              
              <div>
                <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Account Name</div>
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider truncate">{bank.account_name}</div>
              </div>
              
              <div className="mt-1 pt-2 border-t border-slate-100 flex justify-between items-center">
                <div>
                  <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Current Balance</div>
                  <div className="text-base font-black text-blue-600">₹{formatAmount(bank.current_balance || 0)}</div>
                </div>
              </div>
            </div>

            {user?.role === 'superadmin' && (
              <div className="flex bg-slate-50 border-t border-slate-100 relative z-10 text-[9px]">
                <button
                  onClick={() => viewBankDetails(bank)}
                  className="flex-1 py-2 text-center font-black uppercase tracking-wider text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors border-r border-slate-100 flex items-center justify-center gap-1"
                >
                  <Eye className="w-3 h-3" /> Ledger
                </button>
                <button
                  onClick={() => navigate(`/banks/edit/${bank.id}`)}
                  className="flex-1 py-2 text-center font-black uppercase tracking-wider text-slate-600 hover:bg-amber-50 hover:text-amber-600 transition-colors border-r border-slate-100 flex items-center justify-center gap-1"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(bank.id)}
                  className="flex-1 py-2 text-center font-black uppercase tracking-wider text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            )}
          </div>
        ))}
        {filteredBanks.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <div className="text-sm font-bold text-slate-400 uppercase tracking-wider">No Bank Accounts Found</div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedBank && (
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
              className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">{selectedBank.bank_name} - Details</h2>
                  <p className="text-xs font-bold text-slate-500 tracking-wider">A/C: {selectedBank.account_number}</p>
                </div>
                <button
                  onClick={() => setSelectedBank(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Current Balance</div>
                    <div className="text-2xl font-black text-slate-800">
                      ₹{formatAmount(selectedBank.current_balance)}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm bg-emerald-50/30">
                    <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total from Capital</div>
                    <div className="text-xl font-bold text-emerald-800">
                      ₹{formatAmount(transactions.filter(t => t.type === 'deposit' && t.source_type === 'capital').reduce((acc, curr) => acc + Number(curr.amount), 0))}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm bg-blue-50/30">
                    <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Total from Branches</div>
                    <div className="text-xl font-bold text-blue-800">
                      ₹{formatAmount(transactions.filter(t => t.type === 'deposit' && t.source_type === 'branch').reduce((acc, curr) => acc + Number(curr.amount), 0))}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm bg-rose-50/30">
                    <div className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Total Withdrawn</div>
                    <div className="text-xl font-bold text-rose-800">
                      ₹{formatAmount(transactions.filter(t => t.type === 'withdrawal').reduce((acc, curr) => acc + Number(curr.amount), 0))}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Transaction Ledger</h3>
                    {!showTransactionForm && (
                      <button 
                        onClick={() => setShowTransactionForm(true)}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider hover:bg-blue-700 transition"
                      >
                        + Add Transaction
                      </button>
                    )}
                  </div>
                  
                  {/* Removed inline form, moved to modal below */}

                  {loadingTransactions ? (
                    <div className="p-10 flex justify-center text-slate-400">Loading...</div>
                  ) : transactions.length === 0 ? (
                    <div className="p-10 flex flex-col items-center justify-center text-slate-400">
                      <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                      <div className="text-xs font-bold uppercase tracking-wider">No transactions found</div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[40vh]">
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-slate-100 z-10">
                          <tr>
                            <th className="p-3 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b">Date</th>
                            <th className="p-3 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b">Type</th>
                            <th className="p-3 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b">Source / Purpose</th>
                            <th className="p-3 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {transactions.map((t, i) => (
                            <tr key={i} className="hover:bg-slate-50/50">
                              <td className="p-3 text-xs font-semibold text-slate-600 whitespace-nowrap">
                                {format(new Date(t.date), 'dd MMM yyyy')}
                              </td>
                              <td className="p-3 text-xs">
                                {t.type === 'deposit' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-100 text-emerald-700 font-bold uppercase tracking-wider text-[10px]">
                                    <ArrowDownLeft className="w-3 h-3" /> Deposit
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-100 text-rose-700 font-bold uppercase tracking-wider text-[10px]">
                                    <ArrowUpRight className="w-3 h-3" /> Withdrawal
                                  </span>
                                )}
                              </td>
                              <td className="p-3">
                                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                  {t.source_type === 'branch' ? `Branch: ${t.branch_name}` : 
                                   t.source_type === 'capital' ? 'Capital Fund' : 'Other'}
                                </div>
                                {t.purpose && <div className="text-[11px] font-medium text-slate-500 mt-0.5">{t.purpose}</div>}
                              </td>
                              <td className={`p-3 text-sm font-black text-right ${t.type === 'deposit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {t.type === 'deposit' ? '+' : '-'}₹{formatAmount(t.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Transaction Modal */}
      <AnimatePresence>
        {showTransactionForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-gradient-to-r from-[#00bcd4] to-[#2196f3] text-white px-5 py-4 flex items-center justify-between">
                <h2 className="text-lg font-medium tracking-wide">Process Transaction</h2>
                <button onClick={() => setShowTransactionForm(false)} className="text-white hover:text-white/80 transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                <form onSubmit={handleSaveTransaction} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5">Select Account</label>
                    <select required value={transactionForm.bank_id} onChange={e => setTransactionForm({...transactionForm, bank_id: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded font-bold text-slate-700 focus:outline-none focus:border-[#00bcd4]">
                      <option value="">-- Choose Account --</option>
                      {banks.filter(b => b.status === "active").map((b) => <option key={b.id} value={b.id}>{b.bank_name} {b.account_number ? `- ${b.account_number}` : ''}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5">Type</label>
                      <select required value={transactionForm.type} onChange={e => setTransactionForm({...transactionForm, type: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded font-bold text-slate-700 focus:outline-none focus:border-[#00bcd4]">
                        <option value="deposit">Deposit (In)</option>
                        <option value="withdrawal">Withdrawal (Out)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5">Date</label>
                      <input required type="date" value={transactionForm.date} onChange={e => setTransactionForm({...transactionForm, date: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded font-bold text-slate-700 focus:outline-none focus:border-[#00bcd4]" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5">Amount</label>
                    <input required type="number" step="0.01" min="0.01" value={transactionForm.amount} onChange={e => setTransactionForm({...transactionForm, amount: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded font-bold text-slate-700 focus:outline-none focus:border-[#00bcd4]" placeholder="0.00" />
                  </div>

                  {transactionForm.type === 'deposit' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5">Source</label>
                        <select required value={transactionForm.source_type} onChange={e => setTransactionForm({...transactionForm, source_type: e.target.value, source_id: ''})} className="w-full px-3 py-2 border border-slate-300 rounded font-bold text-slate-700 focus:outline-none focus:border-[#00bcd4]">
                          <option value="other">Other Deposit</option>
                          <option value="branch">From Branch</option>
                        </select>
                      </div>
                      {transactionForm.source_type === 'branch' && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5">Branch</label>
                          <select required value={transactionForm.source_id} onChange={e => setTransactionForm({...transactionForm, source_id: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded font-bold text-slate-700 focus:outline-none focus:border-[#00bcd4]">
                            <option value="">-- Select --</option>
                            {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5">Description</label>
                    <input type="text" value={transactionForm.purpose} onChange={e => setTransactionForm({...transactionForm, purpose: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded font-bold text-slate-700 focus:outline-none focus:border-[#00bcd4]" placeholder="" />
                  </div>

                  <button type="submit" className="w-full bg-[#00897b] text-white py-3 rounded text-sm font-bold shadow-md hover:bg-[#00796b] transition-colors mt-2">
                    Confirm Txn
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
