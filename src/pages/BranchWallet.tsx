import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import { 
  Wallet, Send, CheckCircle2, XCircle, Clock, 
  ArrowUpRight, Landmark, FileText, Check, X, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatAmount } from '../lib/utils';
import { voiceFeedback } from '../lib/voice';
import toast from 'react-hot-toast';

export default function BranchWallet() {
  const { user } = useAuth();
  const isSuperAdmin = ['superadmin', 'dm', 'am'].includes(user?.role || '');

  // State
  const [balances, setBalances] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [requestAmount, setRequestAmount] = useState('');
  const [requestRemarks, setRequestRemarks] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Action/Modal states
  const [actionModal, setActionModal] = useState<{
    request: any;
    type: 'approve' | 'reject';
  } | null>(null);
  const [selectedHOAccountId, setSelectedHOAccountId] = useState('');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [balData, reqData, bankData, branchData] = await Promise.all([
        fetchWithAuth('/branch-wallet/balances').catch(() => []),
        fetchWithAuth('/branch-wallet/requests').catch(() => []),
        isSuperAdmin ? fetchWithAuth('/banks').catch(() => []) : Promise.resolve([]),
        isSuperAdmin ? fetchWithAuth('/branches').catch(() => []) : Promise.resolve([])
      ]);

      setBalances(balData || []);
      setRequests(reqData || []);
      setBanks(bankData || []);
      setBranches(branchData || []);

      if (branchData && branchData.length > 0) {
        setSelectedBranchId(branchData[0].id.toString());
      }
    } catch (err) {
      console.error('Failed to load wallet data:', err);
      toast.error('Failed to update wallet details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestAmount || parseFloat(requestAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setSubmittingRequest(true);
      await fetchWithAuth('/branch-wallet/requests', {
        method: 'POST',
        body: JSON.stringify({
          branch_id: isSuperAdmin ? parseInt(selectedBranchId, 10) : undefined,
          amount: parseFloat(requestAmount),
          remarks: requestRemarks
        })
      });

      toast.success('Money request submitted to HO successfully');
      voiceFeedback.success();
      setRequestAmount('');
      setRequestRemarks('');
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to submit request');
      voiceFeedback.error();
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleApprove = async () => {
    if (!actionModal) return;
    if (actionModal.type === 'approve' && !selectedHOAccountId) {
      toast.error('Please select an HO Bank Account');
      return;
    }

    try {
      setProcessingAction(true);
      const endpoint = `/branch-wallet/requests/${actionModal.request.id}/approve`;
      await fetchWithAuth(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          bank_id: parseInt(selectedHOAccountId, 10),
          admin_remarks: adminRemarks
        })
      });

      toast.success('Request approved! Funds disbursed to branch wallet.');
      voiceFeedback.success();
      setActionModal(null);
      setSelectedHOAccountId('');
      setAdminRemarks('');
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Approval failed');
      voiceFeedback.error();
    } finally {
      setProcessingAction(false);
    }
  };

  const handleReject = async () => {
    if (!actionModal) return;
    try {
      setProcessingAction(true);
      const endpoint = `/branch-wallet/requests/${actionModal.request.id}/reject`;
      await fetchWithAuth(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          admin_remarks: adminRemarks
        })
      });

      toast.success('Money request rejected');
      voiceFeedback.success();
      setActionModal(null);
      setSelectedHOAccountId('');
      setAdminRemarks('');
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Rejection failed');
      voiceFeedback.error();
    } finally {
      setProcessingAction(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="w-3.5 h-3.5 mr-1 shrink-0" />;
      case 'rejected':
        return <XCircle className="w-3.5 h-3.5 mr-1 shrink-0" />;
      default:
        return <Clock className="w-3.5 h-3.5 mr-1 shrink-0 animate-pulse" />;
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">
        Loading Branch Wallet Details...
      </div>
    );
  }

  // Find own balance for branch managers
  const myBranchBalance = !isSuperAdmin && balances.length > 0 ? balances[0] : null;

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="bg-slate-50 rounded-2xl p-4 sm:p-6 border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Wallet className="w-6 h-6 text-indigo-600" />
            Branch Wallet Balance
          </h1>
          <p className="text-xs sm:text-sm font-bold text-slate-500 mt-1">
            {isSuperAdmin 
              ? 'Manage funds, approvals, and wallet balances for all branches.' 
              : `View balance, request funds, and manage branch cash operations for ${user?.name || 'Branch'}.`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Balance summary & Request Form */}
        <div className="lg:col-span-1 space-y-6">
          {/* Current Wallet Balance Card */}
          {!isSuperAdmin && myBranchBalance ? (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-indigo-950 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Wallet className="w-24 h-24 rotate-12" />
              </div>
              <div className="relative z-10 space-y-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Branch Cash Balance</span>
                  <h2 className="text-3xl font-black mt-1">৳{formatAmount(myBranchBalance.wallet_balance || 0)}</h2>
                </div>
                <div className="pt-3 border-t border-indigo-600 flex justify-between text-xs font-bold text-indigo-200">
                  <span>Code: {myBranchBalance.branch_code}</span>
                  <span>Manager: {myBranchBalance.manager_name || user?.name}</span>
                </div>
              </div>
            </motion.div>
          ) : isSuperAdmin && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Landmark className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Branch Wallets Overview</h3>
              </div>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {balances.map((b) => (
                  <div key={b.id} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-colors">
                    <div>
                      <span className="text-xs font-extrabold text-slate-900 block leading-tight">{b.branch_name}</span>
                      <span className="text-[9px] font-bold text-slate-500 mt-0.5 uppercase tracking-wider">{b.branch_code}</span>
                    </div>
                    <span className="text-sm font-black text-slate-950">৳{formatAmount(b.wallet_balance || 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Money Request Form (visible to both, but admin selects branch) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <Send className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                {isSuperAdmin ? 'Dispatch Offline Balance' : 'Request Cash Fund from HO'}
              </h3>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4">
              {isSuperAdmin && branches.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Recipient Branch</label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-700 focus:border-indigo-500 focus:bg-white outline-none transition-all cursor-pointer shadow-sm"
                  >
                    {branches.map((br) => (
                      <option key={br.id} value={br.id}>{br.branch_name} ({br.branch_code})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Fund Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">৳</span>
                  <input
                    type="number"
                    value={requestAmount}
                    onChange={(e) => setRequestAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full bg-slate-50 border border-slate-200 pl-7 pr-3 py-2.5 rounded-xl text-sm font-bold text-slate-950 focus:border-indigo-500 focus:bg-white outline-none transition-all shadow-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Purpose Remarks</label>
                <textarea
                  value={requestRemarks}
                  onChange={(e) => setRequestRemarks(e.target.value)}
                  placeholder="Why do you need these funds? (e.g. Daily disbursements, office rent, electricity bill)"
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-bold text-slate-950 focus:border-indigo-500 focus:bg-white outline-none transition-all shadow-sm resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submittingRequest}
                className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submittingRequest ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> 
                    {isSuperAdmin ? 'Submit Dispatch Request' : 'Submit Request'}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right column: Requests history with approval capability */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Fund Request Logs</h3>
            </div>
            <span className="bg-indigo-50 text-indigo-700 font-extrabold px-2 py-0.5 rounded-md text-[10px] border border-indigo-100 uppercase tracking-wider">
              {requests.length} Requests
            </span>
          </div>

          {requests.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
              <Clock className="w-8 h-8 opacity-40 mb-2 animate-bounce" />
              <span className="text-xs uppercase font-extrabold tracking-widest text-slate-500">No past fund requests found</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="py-2.5 text-left text-[10px] font-black uppercase text-slate-400 tracking-wider">Request Information</th>
                    <th className="py-2.5 text-left text-[10px] font-black uppercase text-slate-400 tracking-wider">Amount</th>
                    <th className="py-2.5 text-left text-[10px] font-black uppercase text-slate-400 tracking-wider">Status</th>
                    <th className="py-2.5 text-left text-[10px] font-black uppercase text-slate-400 tracking-wider">HO Approver / Details</th>
                    {isSuperAdmin && <th className="py-2.5 text-center text-[10px] font-black uppercase text-slate-400 tracking-wider">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors text-slate-900 text-xs font-bold">
                      <td className="py-3 pr-2 space-y-0.5">
                        <span className="font-extrabold text-slate-900 block leading-tight">{req.branch_name}</span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                          <span className="font-black uppercase tracking-wider text-indigo-600">{req.branch_code}</span>
                          <span>•</span>
                          <span>{req.request_date ? format(new Date(req.request_date), 'dd MMM yyyy') : '-'}</span>
                        </div>
                        {req.remarks && (
                          <div className="bg-slate-50 border border-slate-100 text-[10px] text-slate-600 p-1.5 rounded-lg mt-1 whitespace-pre-wrap max-w-sm font-serif">
                            "{req.remarks}"
                          </div>
                        )}
                      </td>
                      <td className="py-3 font-black text-[13px] text-slate-900">
                        ৳{formatAmount(req.amount)}
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase tracking-wider ${getStatusBadgeClass(req.status)}`}>
                          {getStatusIcon(req.status)}
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3 text-[10px] leading-snug space-y-0.5 text-slate-600">
                        {req.status === 'approved' && (
                          <>
                            <div className="font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                              Approved by <span className="font-black text-slate-900">{req.approved_by_name || 'Admin'}</span>
                            </div>
                            {req.ho_bank_name && (
                              <div className="font-bold text-slate-500">
                                Disbursed from: <span className="font-extrabold text-indigo-700">{req.ho_bank_name}</span>
                              </div>
                            )}
                            {req.admin_remarks && (
                              <div className="mt-1 text-[9px] font-serif border-l-2 border-emerald-500 pl-1.5 py-0.5">
                                "{req.admin_remarks}"
                              </div>
                            )}
                          </>
                        )}
                        {req.status === 'rejected' && (
                          <>
                            <div className="font-bold flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-rose-500 shrink-0" />
                              Rejected by <span className="font-black text-slate-900">{req.approved_by_name || 'Admin'}</span>
                            </div>
                            {req.admin_remarks && (
                              <div className="mt-1 text-[9px] font-serif border-l-2 border-rose-500 pl-1.5 py-0.5">
                                "{req.admin_remarks}"
                              </div>
                            )}
                          </>
                        )}
                        {req.status === 'pending' && (
                          <span className="text-slate-400 font-extrabold tracking-widest uppercase text-[9px]">Awaiting Review</span>
                        )}
                      </td>
                      {isSuperAdmin && (
                        <td className="py-3 text-center">
                          {req.status === 'pending' ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setActionModal({ request: req, type: 'approve' })}
                                className="w-8 h-8 flex items-center justify-center text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm"
                                title="Approve Request"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setActionModal({ request: req, type: 'reject' })}
                                className="w-8 h-8 flex items-center justify-center text-rose-600 hover:bg-rose-100 border border-rose-100 rounded-lg transition-colors"
                                title="Reject Request"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Approve / Reject Actions Modal */}
      {actionModal && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60]"
            onClick={() => setActionModal(null)}
          />

          {/* Modal Container */}
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] md:max-w-md bg-white rounded-3xl shadow-2xl z-[70] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3.5 mb-5">
                <div className={`p-2 rounded-xl ${
                  actionModal.type === 'approve' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {actionModal.type === 'approve' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-950 uppercase tracking-tight">
                    {actionModal.type === 'approve' ? 'Disburse Funds' : 'Reject Fund Request'}
                  </h3>
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mt-0.5 block">
                    Request ID: #{actionModal.request.id}
                  </span>
                </div>
              </div>

              {/* Request Stats summary */}
              <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-100 mb-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                  <Wallet className="w-16 h-16" />
                </div>
                <div className="grid grid-cols-2 gap-3 leading-none relative z-10 text-xs font-bold text-slate-700 text-left">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Branch</span>
                    <span className="text-slate-950 truncate block">{actionModal.request.branch_name}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Amount</span>
                    <span className="text-slate-950 font-black block">৳{formatAmount(actionModal.request.amount)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {actionModal.type === 'approve' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 text-left block uppercase tracking-widest mb-1">HO Funding Source Bank A/C</label>
                    <select
                      value={selectedHOAccountId}
                      onChange={(e) => setSelectedHOAccountId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-700 focus:border-indigo-500 focus:bg-white outline-none transition-all cursor-pointer shadow-sm"
                    >
                      <option value="">-- Select Funding Bank --</option>
                      {banks.map((b) => (
                        <option key={b.id} value={b.id}>{b.bank_name} - ({b.account_number.slice(-4)}) - ৳{formatAmount(b.current_balance)}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 text-left block uppercase tracking-widest mb-1">Admin Remarks</label>
                  <textarea
                    value={adminRemarks}
                    onChange={(e) => setAdminRemarks(e.target.value)}
                    placeholder="Provide context, bank transfer reference number, or reason of rejection"
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-bold text-slate-950 focus:border-indigo-500 focus:bg-white outline-none transition-all shadow-sm resize-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  disabled={processingAction}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors uppercase tracking-widest disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={actionModal.type === 'approve' ? handleApprove : handleReject}
                  disabled={processingAction}
                  className={`flex-[1.5] py-2.5 rounded-xl font-black text-xs text-white uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-1.5 ${
                    actionModal.type === 'approve' 
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' 
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  }`}
                >
                  {processingAction ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {actionModal.type === 'approve' ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Approve & pay
                        </>
                      ) : (
                        <>
                          <X className="w-3.5 h-3.5" /> Reject Request
                        </>
                      )}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
