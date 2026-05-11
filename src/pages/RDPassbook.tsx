import React, { useState, useEffect } from 'react';
import { voiceFeedback } from '../lib/voice';
import { RefreshCw, ArrowLeft, Printer, Calendar, Landmark, Timer, Layers } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../lib/api';
import { format } from 'date-fns';
import { formatAmount } from '../lib/utils';

export default function RDPassbook() {
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
      
      // Auto-set the monthly deposit amount for convenience in RD
      if (accRes && accRes.monthly_deposit) {
        setTxnForm(prev => ({ ...prev, amount: accRes.monthly_deposit }));
      }
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
        amount: account.monthly_deposit || '',
        date: new Date().toISOString().split('T')[0],
        remarks: ''
      });
      fetchData();
    } catch (e: any) {
      console.error(e);
      voiceFeedback.error();
      alert('Failed: ' + e.message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="p-10 text-center font-black text-slate-300 animate-pulse uppercase tracking-[0.3em]">Loading RD Ledger...</div>;
  if (!account) return <div className="p-10 text-center font-bold text-slate-400 uppercase tracking-widest">RD Account Missing</div>;

  return (
    <div className="max-w-6xl mx-auto pb-20 w-full px-4 pt-6 font-sans">
      
      {/* Header Info */}
      <div className="flex items-center justify-between mb-8 px-2 print:hidden">
        <div className="flex items-center gap-5">
          <button onClick={() => navigate('/recurring-deposits')} className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl hover:bg-purple-600 hover:text-white transition-all shadow-sm flex items-center justify-center group active:scale-90">
            <ArrowLeft className="w-6 h-6 transition-transform group-hover:-translate-x-1" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">RD Passbook</h1>
            <p className="text-[10px] font-black text-purple-500 uppercase tracking-[0.2em] mt-0.5">Recurring Deposit Management</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => navigate(`/savings/card/rd/${id}`)}
            className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition flex items-center gap-2 active:scale-95"
          >
            <Calendar className="w-4 h-4" /> View Ledger Card
          </button>
          <button onClick={handlePrint} className="bg-purple-600 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-purple-500/20 hover:bg-purple-700 transition-all active:scale-95 flex items-center gap-2">
            <Printer className="w-4 h-4" /> Print Statement
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden print:shadow-none print:border-none print:rounded-none">
        
        {/* RD Premium Header Section */}
        <div className="bg-[#4a148c] text-white p-10 md:p-14 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-24 -mr-24 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-24 -ml-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />

          <div className="relative z-10">
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-10 mb-14">
               <div className="flex items-center gap-6">
                 <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-3xl flex items-center justify-center border border-white/20 shadow-2xl">
                   <Landmark className="w-10 h-10 text-white" />
                 </div>
                 <div className="space-y-1">
                   <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">RD Passbook</h2>
                   <div className="flex items-center gap-3">
                     <span className="px-3 py-1 bg-white/10 text-[9px] font-black rounded-lg border border-white/10 uppercase tracking-[0.2em]">Verified Record</span>
                     <span className="text-lg font-black text-white/80 tracking-widest tabular-nums">{account.account_no}</span>
                   </div>
                   <p className="text-sm font-bold text-white/50 pt-1">HOLDER: <span className="text-white uppercase">{account.member_name}</span></p>
                 </div>
               </div>
               
               <div className="flex flex-col items-start xl:items-end gap-2">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl border border-white/10">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Active RD Account</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] mb-1 pr-1">Total Accumulated Balance</p>
                    <p className="text-5xl md:text-7xl font-black tabular-nums tracking-tighter shadow-sm">
                      ₹{formatAmount(account.balance)}
                    </p>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white/5 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/10 shadow-inner">
               <div className="space-y-1 border-r border-white/10 pr-4">
                 <div className="flex items-center gap-2 mb-1">
                    <Timer className="w-4 h-4 text-purple-300"/>
                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Monthly Installment</p>
                 </div>
                 <p className="text-xl font-black text-white tabular-nums tracking-tight">₹{formatAmount(account.monthly_deposit)}</p>
                 <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">PER {account.deposit_frequency}</p>
               </div>
               
               <div className="space-y-1 border-r border-white/10 pr-4 ml-0 md:ml-4">
                 <div className="flex items-center gap-2 mb-1">
                    <Layers className="w-4 h-4 text-purple-300"/>
                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Tenure Period</p>
                 </div>
                 <p className="text-xl font-black text-white tabular-nums tracking-tight">{account.duration_months} Months</p>
                 <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">FIXED DURATION</p>
               </div>

               <div className="space-y-1 border-r border-white/10 pr-4 ml-0 md:ml-4">
                 <div className="flex items-center gap-2 mb-1">
                    <RefreshCw className="w-4 h-4 text-purple-300"/>
                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Interest Rate</p>
                 </div>
                 <p className="text-xl font-black text-white tabular-nums tracking-tight">{account.interest_rate}% P.A.</p>
                 <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">ANNUAL COMPOUNDED</p>
               </div>

               <div className="space-y-1 ml-0 md:ml-4">
                 <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-purple-300"/>
                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Maturity Expectation</p>
                 </div>
                 <p className="text-xl font-black text-purple-200 tabular-nums tracking-tight">₹{formatAmount(account.maturity_amount)}</p>
                 <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest font-mono">{account.maturity_date ? format(new Date(account.maturity_date), 'dd MMM yyyy') : 'NOT SET'}</p>
               </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row print:flex-col bg-white">
          {/* Action Panel */}
          <div className="w-full lg:w-96 p-10 border-b lg:border-b-0 lg:border-r border-slate-100 print:hidden shrink-0 bg-slate-50/50">
            <div className="mb-10 text-center lg:text-left">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.3em] mb-2 flex items-center justify-center lg:justify-start gap-2">
                <RefreshCw className="w-4 h-4 text-purple-600" /> Posting Ledger
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Record an installment or withdrawal</p>
            </div>
            
            <form onSubmit={handleSaveTransaction} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Payment Date</label>
                <input required type="date" value={txnForm.date} onChange={e => setTxnForm({...txnForm, date: e.target.value})} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-sm text-slate-800 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-none transition-all shadow-sm" />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Entry Nature</label>
                <select required value={txnForm.type} onChange={e => setTxnForm({...txnForm, type: e.target.value})} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-sm text-slate-800 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-none transition-all appearance-none cursor-pointer shadow-sm">
                  <option value="deposit">Regular Installment</option>
                  <option value="withdrawal">Premature Withdrawal</option>
                  <option value="interest">Interest Credit</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Cash Value</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">₹</span>
                  <input required type="number" step="0.01" min="0.01" value={txnForm.amount} onChange={e => setTxnForm({...txnForm, amount: e.target.value})} className="w-full pl-10 pr-5 py-4 bg-white border border-slate-200 rounded-2xl font-black text-sm text-slate-800 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-none transition-all shadow-sm" placeholder="0.00" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Notes / Narration</label>
                <textarea rows={3} value={txnForm.remarks} onChange={e => setTxnForm({...txnForm, remarks: e.target.value})} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-sm text-slate-800 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-none transition-all resize-none shadow-sm" placeholder="Any specific details..." />
              </div>
              <button type="submit" className="w-full py-5 mt-4 bg-purple-600 text-white rounded-3xl text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-purple-600/30 hover:bg-purple-700 transform active:scale-[0.97] transition-all hover:-translate-y-1">
                Validate & Post Entry
              </button>
            </form>
          </div>

          {/* RD Transaction History */}
          <div className="flex-1 min-h-[500px] overflow-hidden bg-white">
            {transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 print:bg-white backdrop-blur-sm sticky top-0 z-20">
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">TXN Date</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Description</th>
                      <th className="px-8 py-5 text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] text-right bg-emerald-50/40 print:bg-white">Credit</th>
                      <th className="px-8 py-5 text-[10px] font-black text-rose-600 uppercase tracking-[0.3em] text-right bg-rose-50/40 print:bg-white">Debit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 italic">
                    {transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-purple-50/30 transition-all duration-300 print:hover:bg-transparent group">
                        <td className="px-8 py-6 font-black tabular-nums whitespace-nowrap text-slate-400 group-hover:text-purple-600 transition-colors">
                          {format(new Date(t.date), 'dd MMM, yyyy')}
                        </td>
                        <td className="px-8 py-6">
                           <span className="block text-sm font-black text-slate-800 uppercase tracking-tighter leading-tight group-hover:translate-x-1 transition-transform">{t.remarks || t.type}</span>
                           <span className="block text-[10px] font-bold text-slate-300 uppercase tracking-[0.25em] mt-1">#RD-TX-{t.id}</span>
                        </td>
                        <td className="px-8 py-6 text-right bg-emerald-50/10 text-emerald-800 font-black tabular-nums tracking-tighter text-xl">
                          {(t.type === 'deposit' || t.type === 'interest') ? `₹${formatAmount(t.amount)}` : '—'}
                        </td>
                        <td className="px-8 py-6 text-right bg-rose-50/10 text-rose-800 font-black tabular-nums tracking-tighter text-xl">
                          {(t.type === 'withdrawal') ? `₹${formatAmount(t.amount)}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-20 text-center opacity-40">
                 <RefreshCw className="w-16 h-16 text-slate-400 mb-6 animate-spin-slow" />
                 <p className="text-sm font-black uppercase tracking-[0.4em] text-slate-900">No Transactions Authenticated</p>
                 <p className="text-[11px] font-bold text-slate-500 mt-4 max-w-[280px]">RD account is ready for funding. Post the first installment to begin accumulation tracking.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        @media print {
          body * { visibility: hidden; }
          .max-w-6xl, .max-w-6xl * { visibility: visible; }
          .max-w-6xl { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
          .print\\:hidden { display: none !important; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border-bottom: 3px solid #f8fafc; padding: 16px 20px; }
          .bg-\\[\\#4a148c\\] { background-color: #4a148c !important; -webkit-print-color-adjust: exact; color-adjust: exact; }
          .bg-white\\/5 { background-color: rgba(255, 255, 255, 0.05) !important; -webkit-print-color-adjust: exact; }
          .bg-white\\/10 { background-color: rgba(255, 255, 255, 0.1) !important; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
