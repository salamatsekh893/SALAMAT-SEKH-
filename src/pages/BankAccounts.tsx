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
  const [showAccountSelector, setShowAccountSelector] = useState(false);
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
      if (Array.isArray(data)) {
        setCapital(data);
      } else {
        setCapital([]);
      }
    } catch (err) {
      setCapital([]);
    }
  };

  const loadBranches = async () => {
    try {
      const data = await fetchWithAuth('/branches');
      if (Array.isArray(data)) {
        setBranches(data);
      } else {
        setBranches([]);
      }
    } catch (err) {
      setBranches([]);
    }
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
      if (Array.isArray(data)) {
        setBanks(data);
        if (data.length > 0) {
          // Auto-select first bank or update current reference on reload
          const activeSelect = selectedBank 
            ? (data.find((b: any) => b.id === selectedBank.id) || data[0])
            : data[0];
          viewBankDetails(activeSelect);
        } else {
          setSelectedBank(null);
          setTransactions([]);
        }
      } else {
        setBanks([]);
        setSelectedBank(null);
        setTransactions([]);
      }
    } catch (err) {
      console.error(err);
      setBanks([]);
      setSelectedBank(null);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const viewBankDetails = async (bank: any) => {
    if (!bank) return;
    setSelectedBank(bank);
    setLoadingTransactions(true);
    try {
      const data = await fetchWithAuth(`/banks/${bank.id}/transactions`);
      if (Array.isArray(data)) {
        setTransactions(data);
      } else {
        setTransactions([]);
      }
    } catch (err) {
      console.error(err);
      setTransactions([]);
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
    const list = Array.isArray(banks) ? banks : [];
    const exportData = list.map((b, i) => ({
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

  const filteredBanks = Array.isArray(banks) ? banks.filter(b => 
    b.bank_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.account_number?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  return (
    <div className="space-y-4 pb-10 w-full px-0 sm:px-1 pt-2">
      {/* Page Header matching design */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-2 border-b border-slate-200/50 pb-2 mb-2">
        <div className="flex items-center gap-2 text-[#d32f2f]">
          <div className="w-8 h-8 rounded-full bg-[#f8bbd0] flex items-center justify-center">
            <Building2 className="w-4.5 h-4.5 text-[#d32f2f]" />
          </div>
          <h1 className="text-base md:text-lg font-bold uppercase tracking-wider">ACCOUNTS & FUNDS</h1>
        </div>

        {/* Search & Excel on top right saving line space */}
        <div className="flex items-center gap-2">
          <div className="relative w-40 sm:w-56">
            <Search className="absolute text-slate-400 w-3.5 h-3.5 left-2.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search / খুঁজুন..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold bg-white"
            />
          </div>
          <button 
            onClick={exportToExcel}
            className="bg-[#10b981] text-white px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1 whitespace-nowrap"
          >
            Excel
          </button>
        </div>
      </div>

      {/* Buttons row directly below title */}
      <div className="flex flex-wrap items-center gap-2 px-2">
        {user?.role === 'superadmin' && (
          <>
            <button 
              onClick={() => navigate('/banks/new')}
              className="bg-[#5c6bc0] hover:bg-[#3f51b5] text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Account
            </button>
            <button 
              onClick={() => setShowTransactionForm(true)}
              className="bg-[#00bfa5] hover:bg-[#009688] text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Transaction
            </button>
          </>
        )}
        
        {/* SELECT ACCOUNT BUTTON */}
        <button 
          onClick={() => setShowAccountSelector(true)}
          className="bg-[#ff9800] hover:bg-[#f57c00] text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 flex items-center gap-1.5 border border-[#e65100]/25"
        >
          <Building2 className="w-3.5 h-3.5 animate-pulse" /> 
          {selectedBank ? `${selectedBank.bank_name} (${selectedBank.account_number})` : 'Select Account / ব্যাংক একাউন্ট'}
        </button>
      </div>

      {/* Summary Header */}
      <div className="px-2">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 w-full">
          {/* Total Bank Balance Card */}
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white p-2.5 rounded-xl shadow-sm flex flex-col justify-center items-center relative overflow-hidden min-h-[80px]">
             <div className="absolute top-0 right-0 -mr-8 -mt-8 w-20 h-20 bg-white opacity-10 rounded-full blur-xl"></div>
             <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center mb-1 relative z-10">
               <Wallet className="w-3.5 h-3.5 text-white" />
             </div>
             <div className="text-[9px] font-bold uppercase tracking-wider text-white/95 text-center mb-0.5 relative z-10 line-clamp-1">
               Total Bank Balance
             </div>
             <div className="text-lg font-black text-center leading-none text-white tracking-tight relative z-10">
               ₹{formatAmount((Array.isArray(banks) ? banks : []).reduce((sum, b) => sum + parseFloat(b.current_balance || 0), 0))}
             </div>
          </div>
          
          {/* Total Capital Card */}
          <div className="bg-[#00d284] text-white p-2.5 rounded-xl shadow-sm flex flex-col justify-center items-center relative overflow-hidden min-h-[80px]">
             <div className="absolute top-0 right-0 -mr-8 -mt-8 w-20 h-20 bg-white opacity-10 rounded-full blur-xl"></div>
             <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center mb-1 relative z-10">
               <Banknote className="w-3.5 h-3.5 text-white" />
             </div>
             <div className="text-[9px] font-bold uppercase tracking-wider text-white/95 text-center mb-0.5 relative z-10 line-clamp-1">
               Total Capital
             </div>
             <div className="text-lg font-black text-center leading-none text-white tracking-tight relative z-10">
               ₹{formatAmount((Array.isArray(capital) ? capital : []).reduce((sum, c) => sum + parseFloat(c.amount || 0), 0))}
             </div>
          </div>

          {/* Active Accounts Card */}
          <div className="bg-[#0ea5e9] text-white p-2.5 rounded-xl shadow-sm flex flex-col justify-center items-center relative overflow-hidden min-h-[80px]">
             <div className="absolute top-0 right-0 -mr-8 -mt-8 w-20 h-20 bg-white opacity-10 rounded-full blur-xl"></div>
             <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center mb-1 relative z-10">
               <Building2 className="w-3.5 h-3.5 text-white" />
             </div>
             <div className="text-[9px] font-bold uppercase tracking-wider text-white/95 text-center mb-0.5 relative z-10 line-clamp-1">
               Active Accounts
             </div>
             <div className="text-lg font-black text-center leading-none text-white tracking-tight relative z-10">
               {(Array.isArray(banks) ? banks : []).filter(b => b.status === 'active').length}
             </div>
          </div>
          
          {/* Total Accounts Card */}
          <div className="bg-[#f97316] text-white p-2.5 rounded-xl shadow-sm flex flex-col justify-center items-center relative overflow-hidden min-h-[80px]">
             <div className="absolute top-0 right-0 -mr-8 -mt-8 w-20 h-20 bg-white opacity-10 rounded-full blur-xl"></div>
             <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center mb-1 relative z-10">
               <Store className="w-3.5 h-3.5 text-white" />
             </div>
             <div className="text-[9px] font-bold uppercase tracking-wider text-white/95 text-center mb-0.5 relative z-10 line-clamp-1">
               Total Accounts
             </div>
             <div className="text-lg font-black text-center leading-none text-white tracking-tight relative z-10">
               {(Array.isArray(banks) ? banks : []).length}
             </div>
          </div>
        </div>
      </div>

      {/* Direct inline Ledger & History Workspace under the selected bank card selector */}
      {selectedBank ? (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-md overflow-hidden mt-3 mx-2">
          {/* Dashboard Header with operations */}
          <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap gap-3 items-center justify-between bg-slate-50">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                  {selectedBank.bank_name} - Ledger & History (বিস্তারিত লেনদেন)
                </h2>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                  selectedBank.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {selectedBank.status}
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-505 tracking-wide mt-0.5 leading-tight text-slate-500">
                A/C Holder: <span className="text-slate-805 font-bold text-slate-700">{selectedBank.account_name}</span> | A/C No: <span className="text-slate-900 font-mono font-black">{selectedBank.account_number}</span> | Branch: <span className="text-slate-800 font-bold">{selectedBank.branch_name}</span>
              </p>
            </div>

            {/* Quick Action Buttons */}
            {user?.role === 'superadmin' && (
              <div className="flex flex-wrap gap-1.5">
                <button 
                  onClick={() => setShowTransactionForm(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Tx
                </button>
                <button 
                  onClick={() => navigate(`/banks/edit/${selectedBank.id}`)}
                  className="bg-amber-550 bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm transition-colors flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" /> Edit A/C
                </button>
                <button 
                  onClick={() => handleDelete(selectedBank.id)}
                  className="bg-rose-500 hover:bg-rose-600 text-white px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Delete A/C
                </button>
              </div>
            )}
          </div>

          <div className="p-6">
            {/* Quick Stats: "koto bar holo koto dhuklo koto ber holo, details soho" */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Overall Balance */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100/50 flex items-center justify-center text-blue-600 shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Current Balance (বর্তমান ব্যালেন্স)</div>
                  <div className="text-xl font-black text-slate-800">
                    ₹{formatAmount(selectedBank.current_balance)}
                  </div>
                </div>
              </div>

              {/* Total Deposit Inflows (Koto Dhuklo) */}
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Received (কত ঢুকেছে)</div>
                  <div className="text-xl font-black text-emerald-850">
                    ₹{formatAmount(transactions.filter(t => t.type === 'deposit').reduce((acc, curr) => acc + Number(curr.amount), 0))}
                  </div>
                </div>
              </div>

              {/* Total Withdrawals (Koto Ber holo) */}
              <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-200 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Total Withdrawn (কত বের হয়েছে)</div>
                  <div className="text-xl font-black text-rose-800">
                    ₹{formatAmount(transactions.filter(t => t.type === 'withdrawal').reduce((acc, curr) => acc + Number(curr.amount), 0))}
                  </div>
                </div>
              </div>

              {/* Transaction Times Count (Koto bar holo) */}
              <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">Tx Count (কতবার লেনদেন হয়েছে)</div>
                  <div className="text-xl font-black text-amber-900">
                    {transactions.length} Times
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed list display */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">Detailed Transaction History (বিস্তারিত লেনদেনের বিবরণ)</span>
              </div>

              {loadingTransactions ? (
                <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-wider text-xs animate-pulse">Loading Ledger...</div>
              ) : transactions.length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                  <AlertCircle className="w-10 h-10 mb-2 opacity-50 text-slate-300" />
                  <div className="text-xs font-black uppercase tracking-wider text-slate-400">No Ledger history recorded yet.</div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-600">
                        <th className="p-3.5 text-[10px] font-black uppercase tracking-wider">Date</th>
                        <th className="p-3.5 text-[10px] font-black uppercase tracking-wider">Type</th>
                        <th className="p-3.5 text-[10px] font-black uppercase tracking-wider">Ref / Source</th>
                        <th className="p-3.5 text-[10px] font-black uppercase tracking-wider">Purpose / Details</th>
                        <th className="p-3.5 text-[10px] font-black uppercase tracking-wider text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transactions.map((t, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3.5 text-xs font-semibold text-slate-600 whitespace-nowrap">
                            {format(new Date(t.date), 'dd MMM yyyy')}
                          </td>
                          <td className="p-3.5 text-xs">
                            {t.type === 'deposit' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-100 text-emerald-700 font-bold uppercase tracking-wider text-[10px]">
                                <ArrowDownLeft className="w-3.5 h-3.5" /> Deposit
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-100 text-rose-700 font-bold uppercase tracking-wider text-[10px]">
                                <ArrowUpRight className="w-3.5 h-3.5" /> Withdrawal
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                              {t.source_type === 'branch' ? `Branch: ${t.branch_name}` : 
                               t.source_type === 'capital' ? 'Capital Fund' : 'Other'}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="text-[11px] font-medium text-slate-600 leading-snug">
                              {t.purpose || <span className="text-slate-400 italic">No details given</span>}
                            </div>
                          </td>
                          <td className={`p-3.5 text-sm font-black text-right whitespace-nowrap ${t.type === 'deposit' ? 'text-emerald-600' : 'text-rose-600'}`}>
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
        </div>
      ) : (
        !loading && (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <div className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              No Bank Account selected. Select one above.
            </div>
          </div>
        )
      )}

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

      {/* Account Selector Popup Modal Selection */}
      <AnimatePresence>
        {showAccountSelector && (
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
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="bg-gradient-to-r from-[#ff9800] to-[#f57c00] text-white px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  <h2 className="text-sm font-black uppercase tracking-wider">Select Bank Account / ব্যাংক একাউন্ট নির্বাচন করুন</h2>
                </div>
                <button onClick={() => setShowAccountSelector(false)} className="text-white hover:text-white/80 transition p-1 hover:bg-white/10 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
                {/* Search inside selector popup */}
                <div className="relative mb-5">
                  <Search className="absolute text-slate-400 w-4 h-4 left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Search bank / account number / ব্যাংক বা একাউন্ট নাম্বার দিয়ে খুঁজুন..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#ff9800]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredBanks.map((bank) => {
                    const isSelected = selectedBank && selectedBank.id === bank.id;
                    return (
                      <button
                        key={bank.id}
                        onClick={() => {
                          viewBankDetails(bank);
                          setShowAccountSelector(false);
                        }}
                        type="button"
                        className={`w-full text-left rounded-xl transition-all relative overflow-hidden cursor-pointer flex flex-col p-4 border ${
                          isSelected
                            ? 'border-blue-500 bg-[#e3f2fd] ring-2 ring-blue-500/30 shadow-md transform -translate-y-0.5'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full mb-2">
                          <span className="text-[10px] font-mono font-black text-slate-800 tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">
                            {bank.account_number}
                          </span>
                          <span className={`px-1 rounded text-[8px] font-bold uppercase tracking-wider ${
                            bank.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {bank.status}
                          </span>
                        </div>

                        <div className="text-[14px] font-black text-slate-800 uppercase tracking-tight line-clamp-1">
                          {bank.bank_name}
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mt-0.5">
                          {bank.account_name}
                        </div>
                        
                        <div className="mt-3 flex justify-between items-center w-full pt-2 border-t border-slate-200/50">
                          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Balance</div>
                          <div className={`text-base font-black ${isSelected ? 'text-blue-700' : 'text-blue-600'}`}>
                            ₹{formatAmount(bank.current_balance || 0)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {filteredBanks.length === 0 && !loading && (
                    <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200">
                      <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <div className="text-sm font-bold text-slate-400 uppercase tracking-wider text-slate-550">No Bank Accounts Found / কোনো একাউন্ট পাওয়া যায়নি</div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
