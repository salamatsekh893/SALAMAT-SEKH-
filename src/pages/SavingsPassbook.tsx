import React, { useState, useEffect } from 'react';
import { voiceFeedback } from '../lib/voice';
import { PiggyBank, ArrowLeft, Printer, RefreshCw, Calendar, CreditCard } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../lib/api';
import { formatAmount } from '../lib/utils';

export default function SavingsPassbook() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [account, setAccount] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [txnForm, setTxnForm] = useState({
    type: 'deposit',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    remarks: ''
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [accRes, txnRes] = await Promise.all([
        fetchWithAuth(`/savings/${id}`),
        fetchWithAuth(`/savings/${id}/transactions`)
      ]);
      setAccount(accRes);
      setTransactions(txnRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    try {
      await fetchWithAuth(`/savings/${account.id}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txnForm)
      });
      setTxnForm({
        type: 'deposit',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        remarks: ''
      });
      fetchData(); // Reload data
    } catch (e: any) {
      console.error(e);
      voiceFeedback.error();
      alert('Failed: ' + e.message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="p-10 text-center font-bold text-slate-400 animate-pulse uppercase tracking-widest">Loading Savings Passbook...</div>;
  if (!account) return <div className="p-10 text-center font-bold text-slate-400">Savings Account not found</div>;

  return (
    <div className="max-w-5xl mx-auto pb-20 w-full px-4 pt-6">
      
      {/* Header Info */}
      <div className="flex items-center justify-between mb-6 px-2 print:hidden">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/savings-accounts')} className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Savings Passbook</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manage deposits & withdrawals</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => navigate(`/savings/card/saving/${id}`)}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition flex items-center gap-2 active:scale-95"
          >
            <CreditCard className="w-4 h-4" /> View Ledger Card
          </button>
          <button onClick={handlePrint} className="bg-slate-900 text-white px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition flex items-center gap-2 active:scale-95">
            <Printer className="w-4 h-4" /> Print Book
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden print:shadow-none print:border-none print:rounded-none">
        
        {/* Passbook Header Section */}
        <div className="bg-[#1976d2] text-white p-8 md:p-12 relative overflow-hidden">
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-48 h-48 bg-black/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
               <div className="flex items-center gap-4">
                 <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
                   <PiggyBank className="w-8 h-8 text-white" />
                 </div>
                 <div>
                   <h2 className="text-3xl font-black tracking-tighter uppercase mb-1">Savings Account</h2>
                   <div className="flex items-center gap-2">
                     <span className="px-2 py-0.5 bg-white/20 text-[10px] font-black rounded-lg border border-white/20 uppercase tracking-widest">Official Record</span>
                     <span className="text-sm font-bold text-white/80 tabular-nums"># {account.account_no}</span>
                   </div>
                 </div>
               </div>
               
               <div className="text-right">
                  <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em] mb-1">Current Available Balance</p>
                  <p className="text-4xl md:text-5xl font-black tabular-nums tracking-tighter">
                   ₹{formatAmount(account.balance)}
                  </p>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
               <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white"><CreditCard className="w-5 h-5"/></div>
                 <div>
                   <p className="text-[9px] font-black text-white/50 uppercase tracking-widest">Account Holder</p>
                   <p className="text-sm font-black uppercase text-white truncate max-w-[200px]">{account.member_name}</p>
                 </div>
               </div>
               <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white"><Calendar className="w-5 h-5"/></div>
                 <div>
                   <p className="text-[9px] font-black text-white/50 uppercase tracking-widest">Interest Rate</p>
                   <p className="text-sm font-black uppercase text-white tabular-nums">{account.interest_rate}% P.A.</p>
                 </div>
               </div>
               <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white"><RefreshCw className="w-5 h-5"/></div>
                 <div>
                   <p className="text-[9px] font-black text-white/50 uppercase tracking-widest">Account Status</p>
                   <p className="flex items-center gap-1.5 pt-0.5">
                     <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                     <span className="text-sm font-black uppercase text-white">{account.status}</span>
                   </p>
                 </div>
               </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row print:flex-col bg-white">
          {/* Action Panel */}
          <div className="w-full lg:w-80 p-8 border-b lg:border-b-0 lg:border-r border-slate-100 print:hidden shrink-0">
            <div className="mb-8">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-1">New Entry</h3>
              <div className="w-8 h-1 bg-blue-600 rounded-full" />
            </div>
            
            <form onSubmit={handleSaveTransaction} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Date</label>
                <input required type="date" value={txnForm.date} onChange={e => setTxnForm({...txnForm, date: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Entry Type</label>
                <select required value={txnForm.type} onChange={e => setTxnForm({...txnForm, type: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all appearance-none cursor-pointer">
                  <option value="deposit">Deposit (Cash In)</option>
                  <option value="withdrawal">Withdrawal (Cash Out)</option>
                  <option value="interest">Interest Credit</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Entry Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                  <input required type="number" step="0.01" min="0.01" value={txnForm.amount} onChange={e => setTxnForm({...txnForm, amount: e.target.value})} className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all" placeholder="0.00" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Description / Remarks</label>
                <textarea rows={2} value={txnForm.remarks} onChange={e => setTxnForm({...txnForm, remarks: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all resize-none" placeholder="Add txn description..." />
              </div>
              <button type="submit" className="w-full py-4 mt-2 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-600/20 hover:bg-blue-700 transform active:scale-[0.98] transition-all">
                Post Transaction
              </button>
            </form>
          </div>

          {/* Ledger Table */}
          <div className="flex-1 min-h-[400px] overflow-hidden">
            {transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 print:bg-white">
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Particulars</th>
                      <th className="px-6 py-4 text-[9px] font-black text-emerald-600 uppercase tracking-widest text-right bg-emerald-50/30 print:bg-white">Credit (In)</th>
                      <th className="px-6 py-4 text-[9px] font-black text-rose-600 uppercase tracking-widest text-right bg-rose-50/30 print:bg-white">Debit (Out)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 italic font-medium text-slate-600">
                    {transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors print:hover:bg-transparent">
                        <td className="px-6 py-4 font-bold tabular-nums whitespace-nowrap text-slate-500">
                          {new Date(t.date).toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'})}
                        </td>
                        <td className="px-6 py-4">
                           <span className="block text-xs font-bold text-slate-700 uppercase tracking-tight">{t.remarks || t.type}</span>
                           <span className="block text-[9px] font-bold text-slate-300 uppercase tracking-widest tabular-nums font-mono">TXN-{t.id.toString().padStart(6, '0')}</span>
                        </td>
                        <td className="px-6 py-4 text-right bg-emerald-50/10 text-emerald-700 font-black tabular-nums tracking-tighter w-32">
                          {(t.type === 'deposit' || t.type === 'interest') ? `₹${formatAmount(t.amount)}` : '-'}
                        </td>
                        <td className="px-6 py-4 text-right bg-rose-50/10 text-rose-700 font-black tabular-nums tracking-tighter w-32">
                          {(t.type === 'withdrawal') ? `₹${formatAmount(t.amount)}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-20 text-center text-slate-300">
                 <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                   <PiggyBank className="w-10 h-10" />
                 </div>
                 <p className="text-xs font-black uppercase tracking-[0.2em]">Zero Activity Found</p>
                 <p className="text-[10px] font-bold text-slate-400 max-w-[200px] mt-2 italic">Start posting transactions to see them in the passbook ledger.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .max-w-5xl, .max-w-5xl * { visibility: visible; }
          .max-w-5xl { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
          .print\\:hidden { display: none !important; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border-bottom: 2px solid #f1f5f9; padding: 12px 16px; }
          .bg-\\[\\#1976d2\\] { background-color: #1976d2 !important; -webkit-print-color-adjust: exact; color-adjust: exact; }
          .bg-white\\/10 { background-color: rgba(255, 255, 255, 0.1) !important; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
