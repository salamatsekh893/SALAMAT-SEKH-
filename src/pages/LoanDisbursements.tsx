import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import { Check, X, Printer, IndianRupee, Eye, Banknote } from 'lucide-react';
import { cn } from '../lib/utils';
import { formatAmount } from '../lib/utils';
import { voiceFeedback } from '../lib/voice';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export default function LoanDisbursements() {
  const { user } = useAuth();
  const [loans, setLoans] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [loanData, branchData, bankData] = await Promise.all([
        fetchWithAuth('/loans'),
        fetchWithAuth('/branches').catch(() => []),
        fetchWithAuth('/banks').catch(() => [])
      ]);
      setLoans(loanData.filter((l: any) => l.status === 'approved'));
      setBranches(branchData || []);
      setBanks(bankData || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const [confirmAction, setConfirmAction] = useState<{id: number, status: string} | null>(null);
  const [disbursementDate, setDisbursementDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [firstEmiDate, setFirstEmiDate] = useState<string>('');

  const executeStatusChange = async (id: number, newStatus: string) => {
    if (newStatus === 'active' && !selectedBankId) {
      voiceFeedback.error();
      alert('Please select a Bank Account to disburse from.');
      return;
    }
    
    try {
      setProcessingId(id);
      await fetchWithAuth(`/loans/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ 
          status: newStatus,
          disbursement_date: newStatus === 'active' ? disbursementDate : undefined,
          first_emi_date: newStatus === 'active' ? (firstEmiDate || undefined) : undefined,
          bank_id: newStatus === 'active' ? parseInt(selectedBankId, 10) : undefined
        }),
      });
      voiceFeedback.success();
      loadData();
      if (selectedLoan && selectedLoan.id === id) {
        setSelectedLoan(null);
      }
      setConfirmAction(null);
    } catch (err: any) {
      console.error(err);
      voiceFeedback.error();
    } finally {
      setProcessingId(null);
    }
  };

  const handleStatusChange = (id: number, newStatus: string) => {
    const loan = loans.find(l => l.id === id);
    setConfirmAction({ id, status: newStatus });
    setDisbursementDate(format(new Date(), 'yyyy-MM-dd'));
    if (loan && loan.start_date) {
      setFirstEmiDate(format(new Date(loan.start_date), 'yyyy-MM-dd'));
    } else {
      setFirstEmiDate('');
    }
  };

  const handleViewDetails = async (id: number) => {
    try {
      setLoadingDetails(true);
      const loanDetails = await fetchWithAuth(`/loans/${id}`);
      setSelectedLoan(loanDetails);
    } catch (err) {
      console.error('Failed to load details', err);
      alert('Failed to load loan details.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredLoans = loans.filter(l => selectedBranch === 'all' || l.branch_id?.toString() === selectedBranch);

  if (loading) return <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Loading approved loans...</div>;

  return (
    <div className="space-y-2.5 pb-10">
      
      {/* Colorful Compact HO Bank Balances Bar - Stretch Full Fluid (0 gap) */}
      <motion.div 
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-indigo-950 shadow-md text-white relative -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-2 flex items-center min-h-[46px] border-b border-indigo-500/10 overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-3 opacity-10 blur-sm mix-blend-overlay pointer-events-none">
           <Banknote className="w-16 h-16 -rotate-12" />
        </div>
        <div className="relative z-10 flex flex-row items-center justify-between gap-3 w-full flex-wrap">
           <div className="flex items-center gap-1.5">
             <Banknote className="w-4 h-4 text-indigo-200 shrink-0" />
             <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 leading-none">
               <span className="text-[12px] font-black tracking-tight text-white">HO Bank Balances</span>
               <span className="text-indigo-300 font-bold text-[8px] uppercase tracking-wider leading-none sm:border-l sm:border-indigo-600 sm:pl-2">Available Funds</span>
             </div>
           </div>
           
           <div className="flex gap-2 overflow-x-auto py-0.5 snap-x hide-scrollbar items-center max-w-full">
              {banks.length === 0 ? (
                <span className="text-[9px] font-bold text-indigo-200/70">No accounts configured</span>
              ) : (
                <AnimatePresence>
                {banks.map((bank, idx) => (
                  <motion.div 
                    key={bank.id} 
                    initial={{ opacity: 0, scale: 0.95, x: 15 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    transition={{ delay: 0.05 * idx }}
                    className="shrink-0 bg-white/10 px-2 py-1 rounded-md border border-white/20 backdrop-blur-sm snap-start flex items-center gap-2 hover:bg-white/15 transition-colors shadow-sm"
                  >
                     <div className="leading-none flex flex-col">
                       <span className="text-[8px] font-black uppercase text-indigo-100 truncate max-w-[50px]">{bank.bank_name}</span>
                       <span className="text-[7px] font-bold text-indigo-300">*{bank.account_number.slice(-4)}</span>
                     </div>
                     <span className="text-xs font-black text-white border-l border-white/25 pl-1.5">₹{formatAmount(bank.current_balance)}</span>
                  </motion.div>
                ))}
                </AnimatePresence>
              )}
           </div>
        </div>
      </motion.div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40"
            onClick={() => setConfirmAction(null)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-[50%] md:top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] md:max-w-[340px] bg-white rounded-3xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-5 md:p-6 flex flex-col items-center text-center">
               <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 shadow-inner ${
                  confirmAction.status === 'active' ? 'bg-emerald-100/50 text-emerald-600' : 'bg-rose-100/50 text-rose-600'
               }`}>
                 {confirmAction.status === 'active' ? <Banknote className="w-7 h-7" /> : <X className="w-7 h-7" />}
               </div>
              <h3 className="text-xl font-black text-slate-800 mb-1.5 tracking-tight">
                {confirmAction.status === 'active' ? 'Disburse Loan?' : 'Reject Loan?'}
              </h3>
              <p className="text-[13px] text-slate-500 font-medium leading-relaxed mb-5">
                Are you sure you want to {confirmAction.status === 'active' ? <span className="text-emerald-600 font-black uppercase">disburse</span> : <span className="text-rose-600 font-black uppercase">reject</span>}?
              </p>

              {confirmAction.status === 'active' && (
                <div className="w-full space-y-3 mb-6 flex flex-col text-left px-1">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Disburse Date</label>
                    <input 
                      type="date"
                      value={disbursementDate}
                      onChange={(e) => setDisbursementDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm font-bold text-slate-700 focus:border-emerald-300 focus:bg-white outline-none transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">1st EMI Date</label>
                    <input 
                      type="date"
                      value={firstEmiDate}
                      onChange={(e) => setFirstEmiDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm font-bold text-slate-700 focus:border-emerald-300 focus:bg-white outline-none transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">HO Bank A/C</label>
                    <select
                      value={selectedBankId}
                      onChange={(e) => setSelectedBankId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm font-bold text-slate-700 focus:border-emerald-300 focus:bg-white outline-none transition-all cursor-pointer shadow-sm"
                    >
                      <option value="">-- Select Bank --</option>
                      {banks.map((b: any) => (
                         <option key={b.id} value={b.id}>{b.bank_name} - ₹{formatAmount(b.current_balance)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              <div className="flex w-full gap-3">
                <button
                  onClick={() => setConfirmAction(null)}
                  disabled={processingId !== null}
                  className="flex-1 py-3 rounded-2xl text-[11px] font-black text-slate-500 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition-colors uppercase tracking-wider disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => executeStatusChange(confirmAction.id, confirmAction.status)}
                  disabled={processingId !== null}
                  className={`flex-[1.5] py-3 rounded-2xl text-[11px] font-black text-white hover:opacity-90 active:scale-[0.98] transition-all shadow-md uppercase tracking-wider disabled:opacity-50 flex items-center justify-center ${
                     confirmAction.status === 'active' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-rose-500 shadow-rose-500/20'
                  }`}
                >
                  {processingId === confirmAction.id ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Confirm'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* Modal for detailed view */}
      {selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedLoan(null)} />
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Disbursement Review: {selectedLoan.member_name}</h2>
              <button onClick={() => setSelectedLoan(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column - Details */}
                  <div className="space-y-6">
                     <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Loan Details</h3>
                        <div className="space-y-3">
                           <div className="flex justify-between">
                              <span className="text-xs font-bold text-slate-500 uppercase">Product</span>
                              <span className="text-sm font-black text-slate-900">{selectedLoan.scheme_name}</span>
                           </div>
                           <div className="flex justify-between">
                              <span className="text-xs font-bold text-slate-500 uppercase">Principal</span>
                              <span className="text-sm font-black text-emerald-600">₹{formatAmount(selectedLoan.amount)}</span>
                           </div>
                           {selectedLoan.disbursement_date && (
                              <div className="flex justify-between">
                                 <span className="text-xs font-bold text-slate-400 uppercase">Disbursed On</span>
                                 <span className="text-sm font-black text-slate-600">{format(new Date(selectedLoan.disbursement_date), 'dd MMM yyyy')}</span>
                              </div>
                           )}
                           {selectedLoan.start_date && (
                              <div className="flex justify-between">
                                 <span className="text-xs font-bold text-slate-400 uppercase">First EMI Date</span>
                                 <span className="text-sm font-black text-indigo-600">{format(new Date(selectedLoan.start_date), 'dd MMM yyyy')}</span>
                              </div>
                           )}
                           <div className="flex justify-between">
                              <span className="text-xs font-bold text-slate-500 uppercase">Term</span>
                              <span className="text-sm font-black text-slate-900">{selectedLoan.duration_weeks} Weeks</span>
                           </div>
                           <div className="flex justify-between">
                              <span className="text-xs font-bold text-slate-500 uppercase">Cycle EMI</span>
                              <span className="text-sm font-black text-emerald-600">₹{formatAmount(selectedLoan.installment)}</span>
                           </div>
                           {selectedLoan.emi_frequency === 'monthly' && selectedLoan.collection_week && (
                               <div className="flex justify-between pt-2 border-t border-slate-50">
                                  <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Collection Week</span>
                                  <span className="text-[11px] font-black text-amber-600 uppercase bg-amber-50 px-2 rounded-lg border border-amber-100">{selectedLoan.collection_week}</span>
                               </div>
                            )}
                        </div>
                     </div>

                     <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Borrower Info</h3>
                        <div className="space-y-3">
                           <div className="flex justify-between">
                              <span className="text-xs font-bold text-slate-500 uppercase">Aadhar No</span>
                              <span className="text-sm font-black text-slate-900">{selectedLoan.aadhar_no || 'N/A'}</span>
                           </div>
                           <div className="flex justify-between">
                              <span className="text-xs font-bold text-slate-500 uppercase">Voter ID</span>
                              <span className="text-sm font-black text-slate-900">{selectedLoan.voter_id || 'N/A'}</span>
                           </div>
                           <div className="flex justify-between">
                              <span className="text-xs font-bold text-slate-500 uppercase">Mobile</span>
                              <span className="text-sm font-black text-slate-900">{selectedLoan.mobile_no || 'N/A'}</span>
                           </div>
                           <div className="flex justify-between">
                              <span className="text-xs font-bold text-slate-500 uppercase">Occupation</span>
                              <span className="text-sm font-black text-slate-900">{selectedLoan.occupation || 'N/A'}</span>
                           </div>
                           <div className="pt-2 border-t border-slate-100">
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Address</span>
                             <p className="text-xs font-bold text-slate-700 leading-snug">
                                {selectedLoan.village ? `${selectedLoan.village}, ` : ''}PO: {selectedLoan.post_office}, PS: {selectedLoan.police_station}, Dist: {selectedLoan.district}, {selectedLoan.state} - {selectedLoan.pin_code}
                             </p>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Right Column - Documents */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                     <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Documents (KYC)</h3>
                     <div className="grid grid-cols-2 gap-4">
                        {[
                           { label: 'Profile Photo', img: selectedLoan.profile_image },
                           { label: 'House Image', img: selectedLoan.house_image },
                           { label: 'Aadhar Front', img: selectedLoan.aadhar_image_front },
                           { label: 'Aadhar Back', img: selectedLoan.aadhar_image_back },
                           { label: 'Voter Front', img: selectedLoan.voter_image_front },
                           { label: 'Voter Back', img: selectedLoan.voter_image_back },
                           { label: 'Signature', img: selectedLoan.customer_signature }
                        ].map((doc, idx) => (
                           <div key={idx} className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{doc.label}</span>
                              <div className="w-full aspect-video bg-slate-100 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center">
                                 {doc.img ? (
                                    <img src={doc.img} alt={doc.label} className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(doc.img, '_blank')} />
                                 ) : (
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No Image</span>
                                 )}
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
               <button 
                  onClick={() => setSelectedLoan(null)}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors uppercase tracking-widest"
               >
                  Close
               </button>
               <button 
                  onClick={() => handleStatusChange(selectedLoan.id, 'rejected')}
                  className="px-6 py-2.5 rounded-xl font-black text-sm text-white bg-rose-600 hover:bg-rose-700 transition-colors uppercase tracking-widest flex items-center gap-2 shadow-sm shadow-rose-600/20"
               >
                  <X className="w-4 h-4" /> Reject
               </button>
               <button 
                  onClick={() => handleStatusChange(selectedLoan.id, 'active')}
                  className="px-6 py-2.5 rounded-xl font-black text-sm text-white bg-emerald-600 hover:bg-emerald-700 transition-colors uppercase tracking-widest flex items-center gap-2 shadow-sm shadow-emerald-600/20"
               >
                  <Banknote className="w-4 h-4" /> Disburse
               </button>
            </div>
          </div>
        </div>
      )}

      <div className="-mx-4 sm:-mx-6 lg:-mx-8 bg-white border-y border-slate-200 overflow-hidden shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-50/70 p-3 sm:px-6 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">Approved Loans</h2>
            <span className="bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded text-[10px] tracking-widest ml-1.5 border border-emerald-200">
              {filteredLoans.length}
            </span>
          </div>

          <div>
            {user?.role === 'superadmin' && branches.length > 0 && (
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-1.5 font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-xs shadow-sm"
              >
                <option value="all">All Branches</option>
                {branches.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.branch_name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th style={{ color: '#ffffff', backgroundColor: '#312e81' }} className="text-left text-xs font-black uppercase tracking-wider px-3 py-3 border-r border-indigo-950/20">Borrower</th>
                  <th style={{ color: '#ffffff', backgroundColor: '#312e81' }} className="text-left text-xs font-black uppercase tracking-wider px-3 py-3 border-r border-indigo-950/20">Loan A/C</th>
                  <th style={{ color: '#ffffff', backgroundColor: '#312e81' }} className="text-left text-xs font-black uppercase tracking-wider px-3 py-3 border-r border-indigo-950/20">Branch</th>
                  <th style={{ color: '#ffffff', backgroundColor: '#312e81' }} className="text-left text-xs font-black uppercase tracking-wider px-3 py-3 border-r border-indigo-950/20">Product</th>
                  <th style={{ color: '#ffffff', backgroundColor: '#312e81' }} className="text-left text-xs font-black uppercase tracking-wider px-3 py-3 border-r border-indigo-950/20">Principal</th>
                  <th style={{ color: '#ffffff', backgroundColor: '#312e81' }} className="text-left text-xs font-black uppercase tracking-wider px-3 py-3 border-r border-indigo-950/20">Terms</th>
                  <th style={{ color: '#ffffff', backgroundColor: '#312e81' }} className="text-left text-xs font-black uppercase tracking-wider px-3 py-3 border-r border-indigo-950/20">Cycle EMI</th>
                  <th style={{ color: '#ffffff', backgroundColor: '#312e81' }} className="text-left text-xs font-black uppercase tracking-wider px-3 py-3 border-r border-indigo-950/20">Apply Date</th>
                  <th style={{ color: '#ffffff', backgroundColor: '#312e81' }} className="text-center text-xs font-black uppercase tracking-wider px-3 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredLoans.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-slate-500 font-extrabold uppercase tracking-widest text-xs border border-slate-200">No approved applications awaiting disbursement</td>
                  </tr>
                ) : (
                  <AnimatePresence>
                    {filteredLoans.map((loan, idx) => (
                      <motion.tr 
                        key={loan.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group hover:bg-slate-50 transition-all duration-300 text-slate-900 border-b border-slate-200"
                      >
                        <td className="px-3 py-2 border-r border-slate-200">
                          <span className="font-extrabold text-slate-950 text-sm sm:text-base tracking-tight block leading-tight">{loan.member_name}</span>
                          <span className="block text-[11px] font-bold text-slate-600 mt-0.5">{loan.member_code || `CID: ${loan.customer_id}`}</span>
                        </td>
                        <td className="px-3 py-2 border-r border-slate-200">
                          <span className="font-black text-indigo-900 text-sm tracking-tight">{loan.loan_no || `L${loan.id}`}</span>
                        </td>
                        <td className="px-3 py-2 border-r border-slate-200">
                          <span className="text-xs font-bold text-slate-900">{loan.branch_name || '-'}</span>
                        </td>
                        <td className="px-3 py-2 border-r border-slate-200">
                          <span className="font-extrabold text-slate-905 text-xs block leading-tight">{loan.scheme_name || '-'}</span>
                          {loan.emi_frequency === 'monthly' && loan.collection_week && (
                            <span className="block text-[9px] font-extrabold text-amber-700 mt-0.5 uppercase tracking-wider">Week {loan.collection_week}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 border-r border-slate-200">
                          <span className="font-black text-slate-950 text-sm tracking-tight">₹{formatAmount(loan.amount)}</span>
                        </td>
                        <td className="px-3 py-2 border-r border-slate-200">
                          <span className="block font-extrabold text-slate-900 text-xs">{loan.duration_weeks} Wks</span>
                          <span className="block text-[10px] font-bold text-slate-600 mt-0.5">{loan.interest}% Fixed</span>
                        </td>
                        <td className="px-3 py-2 border-r border-slate-200">
                           <span className="font-black text-emerald-700 text-sm">₹{formatAmount(loan.installment)}</span>
                        </td>
                        <td className="px-3 py-2 border-r border-slate-200 text-xs font-bold text-slate-800">
                          {loan.created_at ? format(new Date(loan.created_at), 'dd MMM yyyy') : '-'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button 
                              disabled={loadingDetails}
                              onClick={() => handleViewDetails(loan.id)}
                              className="w-8 h-8 flex items-center justify-center text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100 disabled:opacity-50"
                              title="View Information & Docs"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <Link 
                              to={`/loans/view/${loan.id}`}
                              className="w-8 h-8 flex items-center justify-center text-blue-700 hover:bg-blue-100 rounded-lg border border-blue-100 transition-colors"
                              title="Print Application"
                            >
                              <Printer className="w-4 h-4" />
                            </Link>
                            <button 
                              onClick={() => handleStatusChange(loan.id, 'active')}
                              className="w-8 h-8 flex items-center justify-center bg-emerald-700 text-white hover:bg-emerald-800 rounded-lg transition-colors shadow-sm ml-1"
                              title="Disburse Loan"
                            >
                              <Banknote className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleStatusChange(loan.id, 'rejected')}
                              className="w-8 h-8 flex items-center justify-center text-rose-600 hover:bg-rose-100 border border-rose-100 rounded-lg transition-colors ml-0.5"
                              title="Reject Loan"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden space-y-4">
            {filteredLoans.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-xs bg-slate-50 rounded-xl border border-slate-100">
                No approved applications awaiting disbursement
              </div>
            ) : (
              <AnimatePresence>
              {filteredLoans.map((loan, idx) => (
                <motion.div 
                  key={loan.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-start">
                    <div>
                      <h3 className="font-black uppercase tracking-tight text-lg text-slate-800">{loan.member_name}</h3>
                      <div className="flex items-center gap-1.5 mt-1 mb-1">
                        <span className="bg-white text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-widest border border-slate-200">{loan.loan_no || `L${loan.id}`}</span>
                        <span className="bg-white text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-widest border border-slate-200">{loan.member_code || `CID: ${loan.customer_id}`}</span>
                      </div>
                      {loan.branch_name && <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-1 text-slate-700">Branch: {loan.branch_name}</p>}
                    </div>
                    {loan.scheme_name && (
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black uppercase tracking-widest bg-indigo-50 border border-indigo-100 text-indigo-600 px-2 py-1 rounded-lg">
                          {loan.scheme_name}
                        </span>
                        {loan.emi_frequency === 'monthly' && loan.collection_week && (
                          <span className="text-[8px] font-black uppercase tracking-tighter bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded mt-1 shadow-sm border border-amber-200">
                            {loan.collection_week}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Principal</p>
                      <p className="text-sm font-black text-slate-900">₹{formatAmount(loan.amount)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Interest & Term</p>
                      <p className="text-sm font-black text-slate-700">{loan.interest}% • <span className="text-emerald-600">{loan.duration_weeks} Wks</span></p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cycle EMI</p>
                      <div className="bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 w-fit">
                        <span className="text-xs font-black text-emerald-600 uppercase flex items-center"><IndianRupee className="w-3 h-3 mr-1" />{formatAmount(loan.installment)}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Apply Date</p>
                      <p className="text-xs font-bold text-slate-600">{loan.created_at ? format(new Date(loan.created_at), 'dd MMM yyyy') : '-'}</p>
                    </div>
                  </div>
                  
                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
                    <button 
                      onClick={() => handleViewDetails(loan.id)}
                      disabled={loadingDetails}
                      className="w-10 flex items-center justify-center bg-white text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-200 rounded-xl py-2 transition-all shadow-sm disabled:opacity-50"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <Link 
                      to={`/loans/view/${loan.id}`}
                      className="flex-1 min-w-[80px] flex items-center justify-center gap-2 bg-white text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 rounded-xl py-2 transition-all shadow-sm font-bold text-xs uppercase tracking-widest"
                    >
                      <Printer className="w-4 h-4" /> Print
                    </Link>
                    <button 
                      onClick={() => handleStatusChange(loan.id, 'active')}
                      className="flex-1 min-w-[80px] flex items-center justify-center gap-2 bg-white text-emerald-600 hover:text-white hover:bg-emerald-600 border border-emerald-200 rounded-xl py-2 transition-all shadow-sm font-bold text-xs uppercase tracking-widest"
                    >
                      <Banknote className="w-4 h-4" /> Disburse
                    </button>
                    <button 
                      onClick={() => handleStatusChange(loan.id, 'rejected')}
                      className="w-10 flex items-center justify-center bg-white text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 rounded-xl py-2 transition-all shadow-sm"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
