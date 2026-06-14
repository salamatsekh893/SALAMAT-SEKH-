import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import { 
  Wallet, Send, CheckCircle2, XCircle, Clock, 
  ArrowLeft, Landmark, FileText, Check, X, AlertTriangle,
  Search, Filter, History, ChevronRight, Download, RefreshCw, BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatAmount } from '../lib/utils';
import { voiceFeedback } from '../lib/voice';
import toast from 'react-hot-toast';

export default function BranchWallet() {
  const { user } = useAuth();
  const isSuperAdmin = ['superadmin', 'dm', 'am'].includes(user?.role || '');

  // Core navigation state: 'dashboard' | 'history'
  const [activeView, setActiveView] = useState<'dashboard' | 'history'>('dashboard');

  // Data states
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

  // History Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');

  const loadData = async () => {
    try {
      setLoading(true);
      const userRole = user?.role || '';
      const userIsSuperAdmin = ['superadmin', 'dm', 'am'].includes(userRole);

      const [balData, reqData, bankData, branchData] = await Promise.all([
        fetchWithAuth('/branch-wallet/balances').catch(() => []),
        fetchWithAuth('/branch-wallet/requests').catch(() => []),
        userIsSuperAdmin ? fetchWithAuth('/banks').catch(() => []) : Promise.resolve([]),
        userIsSuperAdmin ? fetchWithAuth('/branches').catch(() => []) : Promise.resolve([])
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
    if (user) {
      loadData();
    }
  }, [user]);

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

      toast.success('Funds request submitted successfully');
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

      toast.success('Request approved! Wallet auto-refilled.');
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

      toast.success('Funds request has been rejected');
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
      <div className="flex flex-col items-center justify-center min-h-[400px] py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
          Loading Wallet details... Please wait
        </p>
      </div>
    );
  }

  // Find own balance for branch managers
  const myBranchBalance = !isSuperAdmin && balances.length > 0 ? balances[0] : null;

  // Split requests into Active (Pending) and History logs
  const pendingRequests = requests.filter(r => r.status === 'pending');
  
  // Filter list for full history tab
  const filteredRequests = requests.filter(r => {
    const matchesSearch = 
      (r.branch_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.branch_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.remarks || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.admin_remarks || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesBranch = branchFilter === 'all' || r.branch_id.toString() === branchFilter;

    return matchesSearch && matchesStatus && matchesBranch;
  });

  return (
    <div className="space-y-6 pb-20">
      
      {/* 1. Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Wallet className="w-6 h-6" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Branch Wallet Management
                </h1>
                
                {/* Header balance with a small icon showing the amount to disburse/approve or current status */}
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-emerald-800 shadow-sm shrink-0">
                  <Wallet className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                  <span className="text-xs font-black">
                    ₹{formatAmount(isSuperAdmin ? balances.reduce((sum, b) => sum + parseFloat(b.wallet_balance || 0), 0) : (myBranchBalance?.wallet_balance || 0))}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md inline-block mt-1">
                {isSuperAdmin ? 'SUPER ADMIN ACCESS' : 'BRANCH ACCESS PORTAL'}
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm font-bold text-slate-500 mt-2">
            {isSuperAdmin 
              ? 'Branch Cash Balance & Offline Fund Approval System (India Portal)' 
              : 'Branch Cash Balance Management and Head Office Fund Request Portal (India Portal)'}
          </p>
        </div>

        {/* 2. Interactive Navigation Toggle (Clicking opens "History Page" effect) */}
        <div className="flex items-center gap-2 self-stretch md:self-auto shrink-0">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`flex-1 md:flex-initial px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border ${
              activeView === 'dashboard'
                ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Dashboard
          </button>
          
          <button
            onClick={() => setActiveView('history')}
            className={`flex-1 md:flex-initial px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border ${
              activeView === 'history'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10'
                : 'bg-white text-indigo-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <History className="w-4 h-4" />
            Transaction History 📜
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeView === 'dashboard' ? (
          <motion.div
            key="dashboard-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* LEFT SIDEBAR: Wallet Stats & Form */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* CURRENT CASH WALLET CARD */}
              {!isSuperAdmin && myBranchBalance ? (
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden border border-white/10">
                  <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <Wallet className="w-24 h-24 rotate-12" />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Current Branch Balance (Cash In Hand)</span>
                      <h2 className="text-3xl font-black mt-1 text-emerald-400">₹{formatAmount(myBranchBalance.wallet_balance || 0)}</h2>
                    </div>
                    <div className="pt-3 border-t border-white/10 flex justify-between text-[11px] font-extrabold text-indigo-200">
                      <span>Code: {myBranchBalance.branch_code}</span>
                      <span>Manager: {myBranchBalance.manager_name || user?.name}</span>
                    </div>
                  </div>
                </div>
              ) : isSuperAdmin && (
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Landmark className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider">Branch Cash Balances</h3>
                  </div>
                  <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                    {balances.map((b) => (
                      <div key={b.id} className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-all">
                        <div>
                          <span className="text-xs font-black text-slate-900 block leading-tight">{b.branch_name}</span>
                          <span className="text-[9px] font-black text-slate-500 mt-1 uppercase tracking-wider bg-slate-200/50 px-1.5 py-0.5 rounded">
                            {b.branch_code}
                          </span>
                        </div>
                        <span className="text-xs font-black text-slate-900 bg-white border px-2.5 py-1 rounded-xl shadow-sm">
                          ₹{formatAmount(b.wallet_balance || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ACTION FORM CARD */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <Send className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider">
                    {isSuperAdmin ? 'Direct Balance Dispatch' : 'Request Wallet Refill'}
                  </h3>
                </div>

                <form onSubmit={handleCreateRequest} className="space-y-4">
                  {isSuperAdmin && branches.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Recipient Branch</label>
                      <select
                        value={selectedBranchId}
                        onChange={(e) => setSelectedBranchId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs font-bold text-slate-700 focus:border-indigo-500 focus:bg-white outline-none transition-all cursor-pointer shadow-sm"
                      >
                        {branches.map((br) => (
                          <option key={br.id} value={br.id}>{br.branch_name} ({br.branch_code})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Request Amount</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">₹</span>
                      <input
                        type="number"
                        value={requestAmount}
                        onChange={(e) => setRequestAmount(e.target.value)}
                        placeholder="Enter amount in INR"
                        className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-3 rounded-2xl text-sm font-bold text-slate-950 focus:border-indigo-500 focus:bg-white outline-none transition-all shadow-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Purpose Remarks (Reason)</label>
                    <textarea
                      value={requestRemarks}
                      onChange={(e) => setRequestRemarks(e.target.value)}
                      placeholder="Specify reason (e.g., daily loan disbursement, emergency expense, etc.)"
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs font-bold text-slate-950 focus:border-indigo-500 focus:bg-white outline-none transition-all shadow-sm resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingRequest}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submittingRequest ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" /> 
                        {isSuperAdmin ? 'Dispatch Refill Fund' : 'Submit Fund Request'}
                      </>
                    )}
                  </button>
                </form>
              </div>

            </div>

            {/* RIGHT MAIN PANEL: Active approvals & Recent activity */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* CURRENT PENDING REQUEST QUEUE */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col min-h-[350px]">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider">
                        Pending Approvals (Awaiting Review)
                      </h3>
                      <p className="text-[10px] font-bold text-slate-500"> Awaiting review and approval from Head Office </p>
                    </div>
                  </div>
                  <span className="bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full text-[10px] border border-amber-200 uppercase tracking-wider font-black">
                    {pendingRequests.length} Pending
                  </span>
                </div>

                {pendingRequests.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                    <span className="text-xs uppercase font-extrabold tracking-widest text-slate-500">
                      No pending wallet requests
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">All fund requests processed.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="py-2.5 text-left text-[10px] font-black uppercase text-slate-400 tracking-wider">Requested Branch</th>
                          <th className="py-2.5 text-left text-[10px] font-black uppercase text-slate-400 tracking-wider">Amount</th>
                          <th className="py-2.5 text-left text-[10px] font-black uppercase text-slate-400 tracking-wider">Remarks</th>
                          {isSuperAdmin && <th className="py-2.5 text-center text-[10px] font-black uppercase text-slate-400 tracking-wider">Action</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {pendingRequests.map((req) => (
                          <tr key={req.id} className="hover:bg-slate-50/50 transition-colors text-slate-900 text-xs font-bold">
                            <td className="py-3 pr-2 space-y-0.5">
                              <span className="font-extrabold text-slate-900 block leading-tight">{req.branch_name}</span>
                              <div className="flex items-center gap-1.5 text-[9px] text-slate-500 mt-0.5">
                                <span className="font-black uppercase tracking-wider text-indigo-600">{req.branch_code}</span>
                                <span>•</span>
                                <span>{req.request_date ? format(new Date(req.request_date), 'dd MMM yyyy') : '-'}</span>
                              </div>
                            </td>
                            <td className="py-3 font-black text-sm text-slate-950">
                              ₹{formatAmount(req.amount)}
                            </td>
                            <td className="py-3 text-[10px] text-slate-600 font-serif">
                              {req.remarks ? `"${req.remarks}"` : <span className="text-slate-300">-</span>}
                            </td>
                            {isSuperAdmin && (
                              <td className="py-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => setActionModal({ request: req, type: 'approve' })}
                                    className="px-2 py-1 flex items-center gap-1 text-[10px] font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm"
                                    title="Approve Request"
                                  >
                                    <Check className="w-3 h-3" /> Approve
                                  </button>
                                  <button
                                    onClick={() => setActionModal({ request: req, type: 'reject' })}
                                    className="px-2 py-1 flex items-center gap-1 text-[10px] font-black text-rose-600 hover:bg-rose-100 border border-rose-100 rounded-lg transition-colors"
                                    title="Reject Request"
                                  >
                                    <X className="w-3 h-3" /> Reject
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* SHORT HIGHLIGHT LOGS PREVIEW */}
              <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider">Recent Transactions Preview</span>
                  <button 
                    onClick={() => setActiveView('history')}
                    className="text-[10px] font-black text-indigo-600 hover:underline uppercase tracking-wide flex items-center gap-1"
                  >
                    View All Logs
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-2">
                  {requests.filter(r => r.status !== 'pending').slice(0, 3).map((r) => (
                    <div key={r.id} className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100">
                      <div className="space-y-0.5">
                        <span className="text-xs font-extrabold text-slate-900 block leading-tight">{r.branch_name}</span>
                        <span className="text-[9px] text-slate-400 block">
                          {r.request_date ? format(new Date(r.request_date), 'dd MMM yyyy') : '-'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">₹{formatAmount(r.amount)}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider ${getStatusBadgeClass(r.status)}`}>
                          {r.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {requests.filter(r => r.status !== 'pending').length === 0 && (
                    <div className="text-center py-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      No processed transactions yet.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        ) : (
          /* HISTORY PAGE MODE / SCREEN (Simulating new page opens seamlessly with clean filtering) */
          <motion.div
            key="history-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6"
          >
            
            {/* Header filters bar */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 pb-5">
              <div>
                <button
                  onClick={() => setActiveView('dashboard')}
                  className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 font-extrabold text-xs uppercase tracking-wider mb-2 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
                </button>
                <h3 className="text-base font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Wallet Refills & Dispatches History
                </h3>
                <p className="text-[11px] font-bold text-slate-500">
                  {isSuperAdmin ? 'All branch cash refill history logs' : 'All your wallet fund requests sent to Head Office'}
                </p>
              </div>

              {/* Refresh / Action */}
              <button
                onClick={loadData}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2.5 rounded-xl transition-all self-end lg:self-auto shadow-sm"
                title="Reload Ledger"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
              
              {/* Search input */}
              <div className="md:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by branch, remarks, approver..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-slate-200 pl-9 pr-3 py-2 rounded-xl text-xs font-bold text-slate-900 focus:border-indigo-500 outline-none transition-all shadow-sm"
                />
              </div>

              {/* Status filter dropdown */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200 p-2 rounded-xl text-xs font-bold text-slate-700 focus:border-indigo-500 outline-none cursor-pointer shadow-sm"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending Review</option>
                  <option value="approved">Approved & Paid</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* Branch filter dropdown (Visible only to Admin) */}
              <div>
                {isSuperAdmin ? (
                  <select
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-2 rounded-xl text-xs font-bold text-slate-700 focus:border-indigo-500 outline-none cursor-pointer shadow-sm"
                  >
                    <option value="all">All Branches</option>
                    {balances.map((b) => (
                      <option key={b.id} value={b.id.toString()}>{b.branch_name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="bg-slate-200/50 p-2 rounded-xl text-center text-[11px] font-black text-slate-600 block uppercase tracking-wider">
                    {myBranchBalance?.branch_code || 'My Branch'}
                  </div>
                )}
              </div>

            </div>

            {/* TRANSACTIONS TABLE */}
            {filteredRequests.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Filter className="w-8 h-8 opacity-30 mx-auto mb-2.5" />
                <span className="text-xs uppercase font-extrabold tracking-widest text-slate-500">No transactions match filters</span>
                <p className="text-[10px] text-slate-400 mt-1">Please select different filtering rules.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="py-3 px-4 text-left">Ref No / Date</th>
                      <th className="py-3 px-4 text-left">Branch Name</th>
                      <th className="py-3 px-4 text-left">Fund Amount</th>
                      <th className="py-3 px-4 text-left">Status</th>
                      <th className="py-3 px-4 text-left">Ledger Details / Approver Comments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-xs font-semibold">
                    {filteredRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/40 transition-colors text-slate-900 leading-relaxed">
                        
                        {/* Ref / Date */}
                        <td className="py-3.5 px-4">
                          <span className="font-extrabold text-indigo-700 block text-[11px]">#{req.id}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {req.request_date ? format(new Date(req.request_date), 'dd MMM yyyy') : '-'}
                          </span>
                        </td>

                        {/* Branch */}
                        <td className="py-3.5 px-4 font-black">
                          <span className="block leading-none text-slate-900">{req.branch_name}</span>
                          <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase mt-1 inline-block">
                            {req.branch_code}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 font-black text-[13px] text-slate-950">
                          ₹{formatAmount(req.amount)}
                        </td>

                        {/* status badge */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider ${getStatusBadgeClass(req.status)}`}>
                            {getStatusIcon(req.status)}
                            {req.status}
                          </span>
                        </td>

                        {/* Ledger comments */}
                        <td className="py-3.5 px-4 space-y-1 max-w-md">
                          {req.remarks && (
                            <div className="font-serif italic text-slate-600 bg-slate-50 p-1.5 rounded-lg leading-snug text-[10px]">
                              Req: "{req.remarks}"
                            </div>
                          )}

                          {req.status === 'approved' && (
                            <div className="text-[10px] text-slate-600 leading-snug">
                              <span className="text-emerald-600 block font-bold leading-none">
                                ✓ Approved by {req.approved_by_name || 'Admin'} {req.approved_at ? `@ ${format(new Date(req.approved_at), 'dd-MM-yyyy hh:mm a')}` : ''}
                              </span>
                              {req.ho_bank_name && (
                                <span className="block text-slate-500 font-extrabold mt-0.5">
                                  HO Bank Out: <span className="text-slate-700">{req.ho_bank_name}</span>
                                </span>
                              )}
                              {req.admin_remarks && (
                                <span className="block text-[10px] font-bold text-slate-500 mt-1 border-l-2 border-emerald-500 pl-1.5 italic">
                                  Ref: "{req.admin_remarks}"
                                </span>
                              )}
                            </div>
                          )}

                          {req.status === 'rejected' && (
                            <div className="text-[10px] text-slate-600 leading-snug">
                              <span className="text-rose-500 block font-bold">
                                ✗ Rejected by {req.approved_by_name || 'Admin'}
                              </span>
                              {req.admin_remarks && (
                                <span className="block text-[10px] font-bold text-slate-500 mt-1 border-l-2 border-rose-500 pl-1.5 italic">
                                  Reason: "{req.admin_remarks}"
                                </span>
                              )}
                            </div>
                          )}

                          {req.status === 'pending' && (
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest italic block">Awaiting HO Approval</span>
                          )}
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </motion.div>
        )}
      </AnimatePresence>

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
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-black text-slate-950 uppercase tracking-tight">
                      {actionModal.type === 'approve' ? 'Disburse Funds' : 'Reject Fund Request'}
                    </h3>
                    
                    {/* Tiny header icon and amount representing the balance to approve */}
                    {actionModal.type === 'approve' && (
                      <div className="flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full text-xs font-black border border-emerald-200 shrink-0">
                        <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>₹{formatAmount(actionModal.request.amount)}</span>
                      </div>
                    )}
                  </div>
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
                    <span className="text-slate-950 truncate block font-bold">{actionModal.request.branch_name}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Amount</span>
                    <span className="text-slate-950 font-black block">₹{formatAmount(actionModal.request.amount)}</span>
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
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-700 focus:border-indigo-500 focus:bg-white outline-none transition-all cursor-pointer shadow-sm px-3 py-2.5"
                    >
                      <option value="">-- Select Funding Bank --</option>
                      {banks.map((b) => (
                        <option key={b.id} value={b.id}>{b.bank_name} - ({b.account_number.slice(-4)}) - ₹{formatAmount(b.current_balance)}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 text-left block uppercase tracking-widest mb-1">Admin Remarks</label>
                  <textarea
                    value={adminRemarks}
                    onChange={(e) => setAdminRemarks(e.target.value)}
                    placeholder="Provide details of bank transfer or core cause of actions"
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
                          <Check className="w-3.5 h-3.5" /> Approve & Disburse
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
