import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import { Check, X, Printer, IndianRupee, Eye, FileText, CreditCard, Calendar, Download, ExternalLink, ZoomIn, ZoomOut, RotateCw, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { formatAmount } from '../lib/utils';
import { voiceFeedback } from '../lib/voice';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

export default function LoanApprovals() {
  const { user } = useAuth();
  const [loans, setLoans] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [editDateModal, setEditDateModal] = useState<{id: number, start_date: string} | null>(null);
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [zoomDragging, setZoomDragging] = useState(false);
  const [zoomDragStart, setZoomDragStart] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    setZoomScale(1);
    setZoomPosition({ x: 0, y: 0 });
    setZoomDragging(false);
    setRotation(0);
  }, [viewerImage]);

  const updateFirstEmiDate = async () => {
    if (!editDateModal) return;
    try {
      setProcessingId(editDateModal.id);
      await fetchWithAuth(`/loans/${editDateModal.id}`, {
        method: 'PUT',
        body: JSON.stringify({ start_date: editDateModal.start_date }),
      });
      toast.success('First EMI Date updated for documents');
      setEditDateModal(null);
      loadData();
    } catch (err) {
      toast.error('Failed to update date');
    } finally {
      setProcessingId(null);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [loanData, branchData] = await Promise.all([
        fetchWithAuth('/loans?status=pending'),
        fetchWithAuth('/branches').catch(() => []) 
      ]);
      setLoans(loanData);
      setBranches(branchData || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const [confirmAction, setConfirmAction] = useState<{id: number, status: string, first_emi_date?: string} | null>(null);

  const executeStatusChange = async (id: number, newStatus: string, first_emi_date?: string) => {
    try {
      setProcessingId(id);
      await fetchWithAuth(`/loans/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus, first_emi_date }),
      });
      voiceFeedback.success();
      if (newStatus === 'approved') {
        toast.success("Loan Approved ✅");
      } else {
        toast.error("Loan Rejected ❌");
      }
      loadData();
      if (selectedLoan && selectedLoan.id === id) {
        setSelectedLoan(null);
      }
      setConfirmAction(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error updating status');
      voiceFeedback.error();
    } finally {
      setProcessingId(null);
    }
  };

  const handleStatusChange = (id: number, newStatus: string, defaultDate?: string) => {
    setConfirmAction({ id, status: newStatus, first_emi_date: defaultDate || format(new Date(), 'yyyy-MM-dd') });
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

  if (loading) return <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Loading pending approvals...</div>;

  return (
    <div className="space-y-8 pb-10">
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
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 40 }}
            className="fixed top-[50%] md:top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] md:max-w-sm bg-white rounded-3xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-6 md:p-8 flex flex-col items-center text-center">
               <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-inner ${
                  confirmAction.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
               }`}>
                 {confirmAction.status === 'approved' ? <Check className="w-8 h-8" /> : <X className="w-8 h-8" />}
               </div>
              <h3 className="text-xl md:text-2xl font-black text-slate-800 mb-2">
                {confirmAction.status === 'approved' ? 'Approve Loan?' : 'Reject Loan?'}
              </h3>
              <p className="text-sm md:text-base text-slate-500 font-medium leading-relaxed mb-6">
                Are you sure you want to {confirmAction.status === 'approved' ? <span className="text-emerald-600 font-black uppercase">Approve</span> : <span className="text-rose-600 font-black uppercase">Reject</span>} this application? This action cannot be easily undone.
              </p>
              
              {confirmAction.status === 'approved' && (
                <div className="w-full text-left mb-8">
                   <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">First EMI Date</label>
                   <input
                     type="date"
                     value={confirmAction.first_emi_date || ''}
                     onChange={(e) => setConfirmAction({...confirmAction, first_emi_date: e.target.value})}
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all cursor-pointer"
                   />
                </div>
              )}

              <div className="flex flex-col sm:flex-row w-full gap-3 sm:gap-4">
                <button
                  onClick={() => setConfirmAction(null)}
                  disabled={processingId !== null}
                  className="flex-1 py-3.5 rounded-2xl text-sm font-black text-slate-600 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition-colors uppercase tracking-widest disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => executeStatusChange(confirmAction.id, confirmAction.status, confirmAction.first_emi_date)}
                  disabled={processingId !== null}
                  className={`flex-1 py-3.5 rounded-2xl text-sm font-black text-white hover:opacity-90 active:scale-[0.98] transition-all shadow-lg uppercase tracking-widest disabled:opacity-50 flex items-center justify-center ${
                     confirmAction.status === 'approved' ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-rose-500 shadow-rose-500/30'
                  }`}
                >
                  {processingId === confirmAction.id ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
              <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Application Review: {selectedLoan.member_name}</h2>
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
                              <span className="text-sm font-black text-amber-600">₹{formatAmount(selectedLoan.amount)}</span>
                           </div>
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
                           { label: 'Nominee Aadhar Front', img: selectedLoan.nominee_aadhar_front },
                           { label: 'Nominee Aadhar Back', img: selectedLoan.nominee_aadhar_back },
                           { label: 'Signature', img: selectedLoan.customer_signature }
                        ].map((doc, idx) => (
                           <div key={idx} className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{doc.label}</span>
                              <div 
                                 className={cn("w-full aspect-video bg-slate-100 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center relative group", doc.img && "cursor-pointer")}
                                 onClick={() => doc.img && setViewerImage(doc.img)}
                              >
                                 {doc.img ? (
                                    <>
                                       <img src={doc.img} alt={doc.label} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <ExternalLink className="w-6 h-6 text-white" />
                                       </div>
                                    </>
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
                  onClick={() => handleStatusChange(selectedLoan.id, 'approved')}
                  className="px-6 py-2.5 rounded-xl font-black text-sm text-white bg-emerald-600 hover:bg-emerald-700 transition-colors uppercase tracking-widest flex items-center gap-2 shadow-sm shadow-emerald-600/20"
               >
                  <Check className="w-4 h-4" /> Approve
               </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[40px] p-4 sm:p-10 shadow-xl shadow-indigo-500/5 border border-slate-100 overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10 border-b border-slate-100 pb-8 px-2 sm:px-0">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Loan Approvals</h1>
            <p className="text-slate-500 font-medium text-sm mt-0.5 uppercase tracking-widest leading-none">Review and approve pending loan requests</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="bg-amber-100 text-amber-800 font-bold px-4 py-2 rounded-xl text-sm border border-amber-200">
              {filteredLoans.length} Pending
            </span>
            {user?.role === 'superadmin' && branches.length > 0 && (
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-2 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="all">All Branches</option>
                {branches.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.branch_name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="overflow-x-auto -mx-4 sm:-mx-10 px-4 sm:px-10">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <table className="w-full border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                  <th className="text-left text-white text-[11px] font-black uppercase tracking-[0.2em] p-6 border-b border-amber-500/20 rounded-tl-xl">Borrower / Branch</th>
                  <th className="text-left text-white text-[11px] font-black uppercase tracking-[0.2em] p-6 border-b border-amber-500/20">Product</th>
                  <th className="text-left text-white text-[11px] font-black uppercase tracking-[0.2em] p-6 border-b border-amber-500/20">Principal</th>
                  <th className="text-left text-white text-[11px] font-black uppercase tracking-[0.2em] p-6 border-b border-amber-500/20">Terms</th>
                  <th className="text-left text-white text-[11px] font-black uppercase tracking-[0.2em] p-6 border-b border-amber-500/20">Cycle EMI</th>
                  <th className="text-left text-white text-[11px] font-black uppercase tracking-[0.2em] p-6 border-b border-amber-500/20">Apply Date</th>
                  <th className="text-right text-white text-[11px] font-black uppercase tracking-[0.2em] p-6 border-b border-amber-500/20 rounded-tr-xl">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLoans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No pending applications</td>
                  </tr>
                ) : (
                  filteredLoans.map((loan) => (
                    <tr key={loan.id} className="group hover:bg-slate-50 transition-all duration-300">
                      <td className="p-6">
                        <div className="flex flex-col">
                          <span className="text-[15px] text-slate-900 font-black tracking-tight group-hover:text-amber-600 transition-colors uppercase">{loan.member_name}</span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-widest">{loan.loan_no || `L${loan.id}`}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">•</span>
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-widest">{loan.member_code || `CID: ${loan.customer_id}`}</span>
                          </div>
                          {loan.scheme_name && <span className="text-[10px] text-amber-600 font-black uppercase tracking-widest mt-1 opacity-70">{loan.scheme_name}</span>}
                          {loan.emi_frequency === 'monthly' && loan.collection_week && (
                            <span className="text-[9px] font-black text-amber-500 uppercase tracking-tighter mt-0.5 flex items-center gap-1">
                               <span className="w-1 h-1 rounded-full bg-amber-500" />
                               {loan.collection_week}
                            </span>
                          )}
                          {loan.branch_name && <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Branch: {loan.branch_name}</span>}
                        </div>
                      </td>
                      <td className="p-6">
                        <span className="text-[15px] text-slate-900 font-black tracking-tight tracking-widest">₹{formatAmount(loan.amount)}</span>
                      </td>
                      <td className="p-6">
                        <span className="text-[11px] text-slate-500 font-black uppercase tracking-widest block">{loan.interest}% FIXED</span>
                      </td>
                      <td className="p-6">
                        <span className="text-[11px] text-amber-600 font-black uppercase tracking-widest bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">{loan.duration_weeks} WKS</span>
                      </td>
                      <td className="p-6">
                        <div className="bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-100 w-fit shrink-0">
                           <span className="text-[14px] font-black text-emerald-600 uppercase flex flex-row items-center"><IndianRupee className="w-3 h-3 mr-1" />{formatAmount(loan.installment)}</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <span className="text-[11px] text-slate-400 font-black uppercase tracking-widest">{loan.created_at ? format(new Date(loan.created_at), 'dd MMM yyyy') : '-'}</span>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            disabled={loadingDetails}
                            onClick={() => handleViewDetails(loan.id)}
                            className="w-10 h-10 flex items-center justify-center bg-white text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-100 rounded-xl transition-all shadow-sm disabled:opacity-50"
                            title="View Information & Docs"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <Link 
                            to={`/loans/view/${loan.id}`}
                            className="w-10 h-10 flex items-center justify-center bg-white text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-100 rounded-xl transition-all shadow-sm"
                            title="Print Form"
                          >
                            <Printer className="w-4 h-4" />
                          </Link>
                          <button 
                            onClick={() => setEditDateModal({ id: loan.id, start_date: loan.start_date ? format(new Date(loan.start_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd') })}
                            className="w-10 h-10 flex items-center justify-center bg-white text-orange-600 hover:text-white hover:bg-orange-600 border border-orange-100 rounded-xl transition-all shadow-sm"
                            title="Edit First EMI Date before printing"
                          >
                            <Calendar className="w-4 h-4" />
                          </button>
                          <Link 
                            to={`/loans/agreement/${loan.id}`}
                            className="w-10 h-10 flex items-center justify-center bg-white text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-100 rounded-xl transition-all shadow-sm"
                            title="Print Agreement"
                          >
                            <FileText className="w-4 h-4" />
                          </Link>
                          <Link 
                            to={`/loans/card/${loan.id}`}
                            className="w-10 h-10 flex items-center justify-center bg-white text-emerald-600 hover:text-white hover:bg-emerald-600 border border-emerald-100 rounded-xl transition-all shadow-sm"
                            title="Print Card"
                          >
                            <CreditCard className="w-4 h-4" />
                          </Link>
                          <button 
                            onClick={() => handleStatusChange(loan.id, 'approved')}
                            className="w-10 h-10 flex items-center justify-center bg-white text-emerald-600 hover:text-white hover:bg-emerald-600 border border-emerald-100 rounded-xl transition-all shadow-sm"
                            title="Approve Loan"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleStatusChange(loan.id, 'rejected')}
                            className="w-10 h-10 flex items-center justify-center bg-white text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-100 rounded-xl transition-all shadow-sm"
                            title="Reject Loan"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden space-y-4">
            {filteredLoans.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-xs bg-slate-50 rounded-xl border border-slate-100">
                No pending applications
              </div>
            ) : (
              filteredLoans.map((loan) => (
                <div key={loan.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white flex justify-between items-center">
                    <div>
                      <h3 className="font-black uppercase tracking-tight text-lg">{loan.member_name}</h3>
                      <div className="flex items-center gap-1.5 mt-1 mb-1">
                        <span className="bg-white/20 text-white px-1.5 py-0.5 rounded text-[10px] font-bold tracking-widest">{loan.loan_no || `L${loan.id}`}</span>
                        <span className="bg-white/20 text-white px-1.5 py-0.5 rounded text-[10px] font-bold tracking-widest">{loan.member_code || `CID: ${loan.customer_id}`}</span>
                      </div>
                      {loan.branch_name && <p className="text-[10px] uppercase tracking-widest opacity-80 mt-0.5">Branch: {loan.branch_name}</p>}
                    </div>
                    {loan.scheme_name && (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-1 rounded-lg">
                          {loan.scheme_name}
                        </span>
                        {loan.emi_frequency === 'monthly' && loan.collection_week && (
                          <span className="text-[8px] font-black uppercase tracking-tighter bg-amber-400 text-white px-1.5 py-0.5 rounded mt-1 shadow-sm">
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
                      <p className="text-sm font-black text-slate-700">{loan.interest}% • <span className="text-amber-600">{loan.duration_weeks} Wks</span></p>
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
                      className="w-10 h-10 flex items-center justify-center bg-white text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 rounded-xl transition-all shadow-sm"
                      title="Print Form"
                    >
                      <Printer className="w-4 h-4" />
                    </Link>
                    <button 
                      onClick={() => setEditDateModal({ id: loan.id, start_date: loan.start_date ? format(new Date(loan.start_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd') })}
                      className="w-10 h-10 flex items-center justify-center bg-white text-orange-600 hover:text-white hover:bg-orange-600 border border-orange-200 rounded-xl transition-all shadow-sm"
                      title="Edit First EMI Date before printing"
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                    <Link 
                      to={`/loans/agreement/${loan.id}`}
                      className="w-10 h-10 flex items-center justify-center bg-white text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-200 rounded-xl transition-all shadow-sm"
                      title="Print Agreement"
                    >
                      <FileText className="w-4 h-4" />
                    </Link>
                    <Link 
                      to={`/loans/card/${loan.id}`}
                      className="w-10 h-10 flex items-center justify-center bg-white text-emerald-600 hover:text-white hover:bg-emerald-600 border border-emerald-200 rounded-xl transition-all shadow-sm"
                      title="Print Card"
                    >
                      <CreditCard className="w-4 h-4" />
                    </Link>
                    <button 
                      onClick={() => handleStatusChange(loan.id, 'approved')}
                      className="flex-1 min-w-[80px] flex items-center justify-center gap-2 bg-white text-emerald-600 hover:text-white hover:bg-emerald-600 border border-emerald-200 rounded-xl py-2 transition-all shadow-sm font-bold text-xs uppercase tracking-widest"
                    >
                      <Check className="w-4 h-4" /> Approve
                    </button>
                    <button 
                      onClick={() => handleStatusChange(loan.id, 'rejected')}
                      className="w-10 flex items-center justify-center bg-white text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 rounded-xl py-2 transition-all shadow-sm"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {editDateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setEditDateModal(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden relative z-10 p-8"
            >
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-6">
                <Calendar className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-xl md:text-2xl font-black text-slate-800 mb-2">
                Set First EMI Date
              </h3>
              <p className="text-sm md:text-base text-slate-500 font-medium leading-relaxed mb-6">
                Set the starting date to preview correctly in printed Agreement and Loan Card.
              </p>
              
              <div className="w-full text-left mb-8">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">First EMI Date</label>
                <input
                  type="date"
                  value={editDateModal.start_date || ''}
                  onChange={(e) => setEditDateModal({...editDateModal, start_date: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 outline-none transition-all cursor-pointer"
                />
              </div>

              <div className="flex w-full gap-3">
                <button
                  onClick={() => setEditDateModal(null)}
                  className="flex-1 py-3.5 rounded-2xl text-sm font-black text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  onClick={updateFirstEmiDate}
                  disabled={processingId !== null}
                  className="flex-1 py-3.5 rounded-2xl text-sm font-black text-white bg-orange-500 hover:bg-orange-600 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-orange-500/30 uppercase tracking-widest disabled:opacity-50 flex items-center justify-center"
                >
                  {processingId === editDateModal.id ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : 'Save'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewerImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/95 select-none"
          >
            {/* Top Toolbar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-2xl">
              <button
                onClick={() => setZoomScale(prev => Math.min(prev + 0.5, 8))}
                className="text-white hover:text-sky-400 p-2 transition-colors rounded-xl hover:bg-white/5"
                title="Zoom In"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                onClick={() => setZoomScale(prev => {
                  const next = prev - 0.5;
                  if (next <= 1) {
                    setZoomPosition({ x: 0, y: 0 });
                    return 1;
                  }
                  return next;
                })}
                className="text-white hover:text-sky-400 p-2 transition-colors rounded-xl hover:bg-white/5"
                title="Zoom Out"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button
                onClick={() => setRotation(prev => (prev + 90) % 360)}
                className="text-white hover:text-sky-400 p-2 transition-colors rounded-xl hover:bg-white/5"
                title="Rotate Clockwise"
              >
                <RotateCw className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setZoomScale(1);
                  setZoomPosition({ x: 0, y: 0 });
                  setRotation(0);
                }}
                className="text-white hover:text-sky-400 p-2 transition-colors rounded-xl hover:bg-white/5"
                title="Reset Zoom"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <div className="w-[1px] h-6 bg-white/20 mx-1" />
              <a
                href={viewerImage}
                download="document.jpg"
                className="text-white hover:text-emerald-400 p-2 transition-colors rounded-xl hover:bg-white/5"
                title="Download"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="w-5 h-5" />
              </a>
              <button
                onClick={() => setViewerImage(null)}
                className="text-white hover:text-rose-400 p-2 transition-colors rounded-xl hover:bg-white/5"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Instruction tooltip */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-white/50 text-[11px] font-medium bg-black/40 px-4 py-1.5 rounded-full pointer-events-none">
              Mouse wheel to Zoom • Click and Drag to Pan
            </div>

            {/* Zoomable Image Container */}
            <div
              className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
              onMouseDown={(e) => {
                if (zoomScale <= 1) return;
                e.preventDefault();
                setZoomDragging(true);
                setZoomDragStart({ x: e.clientX - zoomPosition.x, y: e.clientY - zoomPosition.y });
              }}
              onMouseMove={(e) => {
                if (!zoomDragging || zoomScale <= 1) return;
                e.preventDefault();
                setZoomPosition({
                  x: e.clientX - zoomDragStart.x,
                  y: e.clientY - zoomDragStart.y
                });
              }}
              onMouseUp={() => setZoomDragging(false)}
              onMouseLeave={() => setZoomDragging(false)}
              onWheel={(e) => {
                const zoomFactor = 0.15;
                let newScale = zoomScale;
                if (e.deltaY < 0) {
                  newScale = Math.min(zoomScale + zoomFactor, 8);
                } else {
                  newScale = Math.max(zoomScale - zoomFactor, 1);
                }
                setZoomScale(newScale);
                if (newScale === 1) {
                  setZoomPosition({ x: 0, y: 0 });
                }
              }}
            >
              <img
                src={viewerImage}
                style={{
                  transform: `translate(${zoomPosition.x}px, ${zoomPosition.y}px) scale(${zoomScale}) rotate(${rotation}deg)`,
                  transition: zoomDragging ? 'none' : 'transform 0.15s ease-out',
                }}
                className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl select-none pointer-events-none"
                referrerPolicy="no-referrer"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
