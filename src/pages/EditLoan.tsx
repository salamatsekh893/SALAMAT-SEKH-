import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Save, Search, Calculator, User, Building, Landmark, FileText, ShieldAlert } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { formatAmount } from '../lib/utils';
import { format } from 'date-fns';
import { voiceFeedback } from '../lib/voice';
import { usePermissions } from '../hooks/usePermissions';

export default function EditLoan() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canEdit } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);

  const [members, setMembers] = useState<any[]>([]);
  const [schemes, setSchemes] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  
  const [searchMember, setSearchMember] = useState('');
  
  const [formData, setFormData] = useState({
    customer_id: '',
    scheme_id: '',
    branch_id: '',
    loan_amount: '',
    disbursement_date: '',
    start_date: '',
  });

  useEffect(() => {
    Promise.all([
      fetchWithAuth('/members'),
      fetchWithAuth('/schemes'),
      fetchWithAuth('/branches'),
      fetchWithAuth(`/loans/${id}`)
    ]).then(([memData, schemeData, branchData, loanData]) => {
      setMembers(memData);
      setSchemes(schemeData.filter((s: any) => !s.status || String(s.status).toLowerCase() === 'active'));
      setBranches(branchData);
      
      if (loanData) {
        setFormData({
          customer_id: loanData.customer_id?.toString() || '',
          scheme_id: loanData.scheme_id?.toString() || '',
          branch_id: loanData.branch_id?.toString() || '',
          loan_amount: loanData.amount?.toString() || '',
          disbursement_date: loanData.disbursement_date ? format(new Date(loanData.disbursement_date), 'yyyy-MM-dd') : '',
          start_date: loanData.start_date ? format(new Date(loanData.start_date), 'yyyy-MM-dd') : '',
        });
      }
    }).catch(err => {
      console.error("Failed to load loan data:", err);
      alert("Failed to load loan details");
      navigate('/loans');
    }).finally(() => {
      setInitLoading(false);
    });
  }, [id, navigate]);

  const selectedScheme = schemes.find(s => s.id.toString() === formData.scheme_id);
  
  // Calculate Loan Details
  const loanAmount = parseFloat(formData.loan_amount) || 0;
  
  let interestAmount = 0;
  let totalRepayment = 0;
  let emiAmount = 0;
  let noOfEmis = 0;
  let processingFee = 0;
  let insuranceFee = 0;
  
  if (selectedScheme && loanAmount > 0) {
    const rate = parseFloat(selectedScheme.interest_rate) || 0;
    const totalEmis = parseInt(selectedScheme.duration_months) || 0;
    
    let durationYears = 0;
    if (selectedScheme.repayment_frequency === 'daily') {
      durationYears = totalEmis / 365;
    } else if (selectedScheme.repayment_frequency === 'weekly') {
      durationYears = totalEmis / 52;
    } else if (selectedScheme.repayment_frequency === 'bi-weekly') {
      durationYears = totalEmis / 26;
    } else {
      durationYears = totalEmis / 12; // monthly
    }
    
    if (selectedScheme.interest_type === 'flat') {
      interestAmount = (loanAmount * rate * durationYears) / 100;
    } else {
      let rPeriod = 0;
      if (selectedScheme.repayment_frequency === 'daily') rPeriod = rate / 365 / 100;
      else if (selectedScheme.repayment_frequency === 'weekly') rPeriod = rate / 52 / 100;
      else if (selectedScheme.repayment_frequency === 'bi-weekly') rPeriod = rate / 26 / 100;
      else rPeriod = rate / 12 / 100;
      
      if (rPeriod > 0) {
        const emi = (loanAmount * rPeriod * Math.pow(1 + rPeriod, totalEmis)) / (Math.pow(1 + rPeriod, totalEmis) - 1);
        totalRepayment = emi * totalEmis;
        interestAmount = totalRepayment - loanAmount;
      }
    }
    
    if (totalRepayment === 0) totalRepayment = loanAmount + interestAmount;
    
    noOfEmis = totalEmis;
    emiAmount = noOfEmis > 0 ? totalRepayment / noOfEmis : 0;
    
    const pfVal = parseFloat(selectedScheme.processing_fee) || 0;
    processingFee = selectedScheme.processing_fee_type === 'percentage' 
      ? (loanAmount * pfVal) / 100 
      : pfVal;
       
    const insVal = parseFloat(selectedScheme.insurance_fee) || 0;
    insuranceFee = selectedScheme.insurance_fee_type === 'percentage'
      ? (loanAmount * insVal) / 100
      : insVal;
  }
  
  const disburseAmount = loanAmount - processingFee - insuranceFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetchWithAuth(`/loans/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...formData,
          amount: loanAmount,
          total_repayment: totalRepayment,
          interest: interestAmount, // Backend uses 'interest' in UPDATE route
          emi_amount: emiAmount,
          no_of_emis: noOfEmis,
          emi_frequency: selectedScheme?.repayment_frequency,
          collection_week: selectedScheme?.collection_week,
          disbursement_date: formData.disbursement_date || undefined,
          start_date: formData.start_date || undefined,
        })
      });
      voiceFeedback.success();
      navigate('/loans');
    } catch (err: any) {
      voiceFeedback.error();
      alert(err.message || 'Failed to update loan request');
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = (members || []).filter(m => {
    const matchesBranch = !formData.branch_id || String(m.branch_id) === String(formData.branch_id);
    const searchLower = String(searchMember || '').toLowerCase();
    const nameMatch = String(m.full_name || '').toLowerCase().includes(searchLower);
    const phoneMatch = String(m.mobile_no || '').toLowerCase().includes(searchLower);
    const matchesSearch = nameMatch || phoneMatch;
    return matchesBranch && matchesSearch;
  });

  if (initLoading) {
    return <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Loading modules...</div>;
  }

  if (!canEdit) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-lg">
        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8 text-rose-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1 font-sans">Access Denied</h3>
        <p className="text-slate-500 text-xs mb-6">You do not have permission to edit loan records. Please contact your manager/administrator.</p>
        <button
          onClick={() => navigate('/loans')}
          className="w-full bg-indigo-600 text-white font-semibold text-xs py-3 px-4 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
        >
          Go Back to Loans
        </button>
      </div>
    );
  }

  const selectedMemberObj = (members || []).find(m => String(m.id) === String(formData.customer_id));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-6"
    >
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate('/loans')}
          className="p-3 bg-white text-slate-400 hover:text-indigo-600 rounded-xl hover:shadow-lg hover:shadow-indigo-100 transition-all active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Edit Loan Request</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Update application details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 sm:p-10 bg-white rounded-[32px] shadow-sm border border-slate-100/50 space-y-8">
            
            <div className="space-y-6">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600 border-b border-indigo-50 pb-4 flex items-center gap-2">
                <User className="w-4 h-4" /> Client Selection
              </h2>
              
              <div className="space-y-3">
                <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 ml-1">Branch</label>
                <div className="relative group">
                  <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-600" />
                  <select
                    required
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-200 focus:bg-white p-5 pl-12 rounded-2xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-50 outline-none appearance-none transition-all cursor-pointer shadow-sm"
                    value={formData.branch_id}
                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                  >
                    <option value="" disabled>-- ALLOCATE BRANCH --</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.branch_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 ml-1">Select Member</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search member by name or phone..." 
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-200 focus:bg-white p-3 pl-12 rounded-xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-50 outline-none transition-all shadow-sm"
                      value={searchMember}
                      onChange={(e) => setSearchMember(e.target.value)}
                    />
                  </div>
                </div>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-600" />
                  <select
                    required
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-200 focus:bg-white p-5 pl-12 rounded-2xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-50 outline-none appearance-none transition-all cursor-pointer shadow-sm"
                    value={formData.customer_id}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                  >
                    <option value="" disabled>-- SELECT MEMBER --</option>
                    {filteredMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.full_name} ({m.mobile_no})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600 border-b border-indigo-50 pb-4 flex items-center gap-2 mt-10">
                <FileText className="w-4 h-4" /> Product & Amount
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 ml-1">Loan Scheme</label>
                  <div className="relative group">
                    <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-600" />
                    <select
                      required
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-200 focus:bg-white p-5 pl-12 rounded-2xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-50 outline-none appearance-none transition-all cursor-pointer shadow-sm"
                      value={formData.scheme_id}
                      onChange={(e) => setFormData({ ...formData, scheme_id: e.target.value })}
                    >
                      <option value="" disabled>-- SELECT SCHEME --</option>
                      {schemes.map(s => (
                        <option key={s.id} value={s.id}>{s.scheme_name} ({s.scheme_code})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 ml-1">Loan Amount (₹)</label>
                  <div className="relative group">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg font-black text-indigo-600">₹</span>
                    <input
                      required
                      type="number"
                      placeholder="0.00"
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-200 focus:bg-white p-5 pl-10 rounded-2xl text-lg font-black text-slate-900 focus:ring-4 focus:ring-indigo-50 outline-none transition-all shadow-sm"
                      value={formData.loan_amount}
                      onChange={(e) => setFormData({ ...formData, loan_amount: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="space-y-3">
                  <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 ml-1">Disbursement Date</label>
                  <input
                    type="date"
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-200 focus:bg-white p-4 rounded-xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-50 outline-none transition-all shadow-sm"
                    value={formData.disbursement_date}
                    onChange={(e) => setFormData({ ...formData, disbursement_date: e.target.value })}
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 ml-1">First EMI Date</label>
                  <input
                    type="date"
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-200 focus:bg-white p-4 rounded-xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-50 outline-none transition-all shadow-sm"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white p-6 rounded-2xl text-xs font-black uppercase tracking-[0.4em] shadow-2xl shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                <Save className="w-5 h-5" />
                {loading ? 'SAVING...' : 'UPDATE LOAN REQUEST'}
              </button>
            </div>
            
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-slate-900 rounded-[32px] shadow-2xl overflow-hidden sticky flex flex-col top-6">
            <div className="p-8 bg-black/20 flex items-center gap-3">
              <Calculator className="w-6 h-6 text-indigo-100" />
              <div>
                <h3 className="text-white font-black uppercase tracking-widest text-sm">Updated Fees</h3>
                <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest">Recalculated details</p>
              </div>
            </div>
            
            <div className="p-8 space-y-6 flex-1 text-slate-300">
              {selectedScheme && loanAmount > 0 ? (
                <>
                  <div className="flex justify-between items-end border-b border-slate-700 pb-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Principal</span>
                    <span className="text-xl font-black text-white">₹{formatAmount(loanAmount)}</span>
                  </div>
                  
                  <div className="flex justify-between items-end border-b border-slate-700 pb-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Interest</span>
                      <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">{selectedScheme.interest_rate}%</span>
                    </div>
                    <span className="text-lg font-black text-rose-400">+ ₹{formatAmount(interestAmount)}</span>
                  </div>

                  <div className="bg-slate-800/50 p-4 rounded-2xl flex justify-between items-center ring-1 ring-slate-800">
                    <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Disburse</span>
                    <span className="text-2xl font-black text-emerald-400">₹{formatAmount(disburseAmount)}</span>
                  </div>
                  
                  <div className="pt-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">EMI Value</p>
                      <h4 className="text-2xl font-black text-white">
                        ₹{formatAmount(emiAmount)} 
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-2">/ {selectedScheme.repayment_frequency}</span>
                      </h4>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total EMIs</p>
                      <h4 className="text-2xl font-black text-indigo-400">{noOfEmis}</h4>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-50 py-12">
                  <Calculator className="w-8 h-8 text-slate-500 mb-4" />
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                    Enter details to see calculations
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

      </form>
    </motion.div>
  );
}
