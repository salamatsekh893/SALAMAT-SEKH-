import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../lib/api';
import { Search, CheckCircle, AlertCircle, RefreshCcw, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { formatAmount } from '../lib/utils';

export default function PreCloseLoan() {
  const navigate = useNavigate();
  const [loans, setLoans] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [settlementInput, setSettlementInput] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = () => {
    setLoading(true);
    fetchWithAuth('/loans')
      .then((loanData) => {
        setLoans(loanData.filter((l: any) => l.status === 'active'));
      })
      .finally(() => setLoading(false));
  };

  const filteredActiveLoans = loans.filter(loan => 
    loan.member_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loan.loan_no?.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 10); 

  const handleCloseLoan = async (loan: any, settlementAmount: number) => {
    if (!loan) return;
    
    if (!window.confirm(`Are you sure you want to pre-close account ${loan.loan_no} with a settlement of ₹${settlementAmount}?`)) return;

    setActionLoading(true);
    try {
      await fetchWithAuth(`/loans/${loan.id}/pre-close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settlement_amount: settlementAmount })
      });
      
      alert('Pre-close request submitted successfully! It is pending approval by an admin.');
      setSelectedLoan(null);
      setSearchTerm('');
      setSettlementInput('');
      fetchLoans();
      // Redirect to dashboard or stay
      navigate('/');
    } catch (error: any) {
      alert(error.message || 'Failed to pre-close account');
    } finally {
      setActionLoading(false);
    }
  };

  const outstanding = selectedLoan ? Math.max(0, (selectedLoan.total_repayment || 0) - (selectedLoan.total_paid || 0)) : 0;
  const amtInputs = parseFloat(settlementInput);

  return (
    <div className="max-w-[700px] mx-auto pb-10 xl:px-4 space-y-4 pt-2">
      {/* Header */}
      <div className="flex items-center gap-3 px-2 sm:px-0 mt-4 mb-6">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">Pre-Close Loan</h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Search and settle active accounts</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 sm:p-6 overflow-y-auto no-scrollbar">
          {!selectedLoan ? (
            <div className="space-y-4">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Find active loan by ID or Member Name..."
                  className="w-full pl-10 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none font-medium text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {loading && searchTerm && (
                <div className="text-center py-8">
                  <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
                </div>
              )}
              
              {searchTerm && !loading && (
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden divide-y divide-slate-100">
                  {filteredActiveLoans.length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-500">No active accounts found matching "{searchTerm}".</div>
                  ) : (
                    filteredActiveLoans.map((loan, idx) => (
                      <button
                        key={loan.id}
                        className="w-full text-left p-4 hover:bg-slate-50 transition-colors flex justify-between items-center group cursor-pointer"
                        onClick={() => {
                          setSelectedLoan(loan);
                          setSearchTerm(loan.loan_no);
                          const outst = Math.max(0, (loan.total_repayment || 0) - (loan.total_paid || 0));
                          setSettlementInput(outst.toString());
                        }}
                      >
                        <div>
                          <div className="font-bold text-base text-slate-800 flex items-center gap-2">
                            {loan.loan_no}
                            <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">Active</span>
                          </div>
                          <div className="text-xs uppercase font-medium text-slate-500 mt-1">{loan.member_name}</div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-transform" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-start border-b border-slate-100 pb-5">
                <div>
                  <h3 className="text-xs font-black text-blue-500 mb-1.5 uppercase tracking-widest">Selected Account</h3>
                  <div className="text-2xl font-black text-slate-800 tracking-tight">{selectedLoan.loan_no}</div>
                  <div className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">{selectedLoan.member_name}</div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <button 
                    onClick={() => { setSelectedLoan(null); setSearchTerm(''); }}
                    className="text-[10px] uppercase font-bold text-slate-400 hover:text-slate-600 mb-3 underline decoration-slate-300 underline-offset-4"
                  >
                    Change Loan
                  </button>
                  <h3 className="text-xs font-black text-slate-400 mb-1 uppercase tracking-widest">Outstanding</h3>
                  <div className="text-3xl font-black text-rose-600 tracking-tight">₹{formatAmount(outstanding)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1.5">Loan Amount</div>
                  <div className="font-black text-slate-700 text-lg">₹{formatAmount(selectedLoan.amount)}</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1.5">Maturity Amount</div>
                  <div className="font-black text-slate-700 text-lg">₹{formatAmount(selectedLoan.total_repayment)}</div>
                </div>
              </div>
              
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                <label className="text-xs font-black text-slate-800 block mb-2 uppercase tracking-widest">Final Settlement Amount</label>
                <div className="relative mt-2">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-slate-400">₹</span>
                  <input 
                    type="number" 
                    value={settlementInput}
                    onChange={e => setSettlementInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 bg-white border border-slate-200 rounded-lg text-xl outline-none font-black text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-sm"
                  />
                </div>
                
                <AnimatePresence>
                  {!isNaN(amtInputs) && amtInputs < outstanding && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-2 text-sm font-black text-emerald-600 mt-4 bg-emerald-50/50 p-3.5 rounded-lg border border-emerald-100 shadow-sm uppercase tracking-widest">
                        <CheckCircle className="w-5 h-5" />
                        WAIVE-OFF: ₹{formatAmount(outstanding - amtInputs)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </div>
        
        {selectedLoan && (
          <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-xl">
             <button
               onClick={() => { setSelectedLoan(null); setSearchTerm(''); }}
               className="px-6 py-3 rounded-lg border border-slate-200 text-slate-600 font-bold text-sm uppercase tracking-widest hover:bg-slate-100 transition-colors shadow-sm"
             >
               Cancel
             </button>
             <button
               onClick={() => handleCloseLoan(selectedLoan, parseFloat(settlementInput) || 0)}
               disabled={actionLoading}
               className="bg-blue-600 border border-transparent text-white font-black uppercase tracking-widest px-8 py-3 rounded-lg shadow-md shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2.5 disabled:opacity-70 text-sm"
             >
               {actionLoading ? (
                 <>
                   <RefreshCcw className="w-5 h-5 animate-spin" />
                   PROCESSING
                 </>
               ) : (
                 <>
                   <CheckCircle className="w-5 h-5" />
                   CONFIRM CLOSURE
                 </>
               )}
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
