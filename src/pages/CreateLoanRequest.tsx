import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Save, Search, Calculator, User, Building, Landmark, ChevronRight, FileText } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { formatAmount } from '../lib/utils';
import { format } from 'date-fns';
import { voiceFeedback } from '../lib/voice';

export default function CreateLoanRequest() {
  const navigate = useNavigate();
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
  });

  useEffect(() => {
    Promise.all([
      fetchWithAuth('/members'),
      fetchWithAuth('/schemes'),
      fetchWithAuth('/branches')
    ]).then(([memData, schemeData, branchData]) => {
      setMembers(memData);
      setSchemes(schemeData.filter((s: any) => !s.status || String(s.status).toLowerCase() === 'active'));
      setBranches(branchData);
    }).finally(() => {
      setInitLoading(false);
    });
  }, []);

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
    
    // Determine duration in years for interest calculation
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
    
    // Flat interest calculation
    if (selectedScheme.interest_type === 'flat') {
      interestAmount = (loanAmount * rate * durationYears) / 100;
    } else {
      // Reducing calculation approximation (basic)
      // Usually standard EMI formula: P * r * (1+r)^n / ((1+r)^n - 1)
      // r is per EMI period rate
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
    
    // Processing Fee
    const pfVal = parseFloat(selectedScheme.processing_fee) || 0;
    processingFee = selectedScheme.processing_fee_type === 'percentage' 
      ? (loanAmount * pfVal) / 100 
      : pfVal;
      
    // Insurance Fee
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
      await fetchWithAuth('/loans', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          status: 'pending',
          loan_amount: loanAmount,
          total_repayment: totalRepayment,
          interest_amount: interestAmount,
          processing_fee: processingFee,
          insurance_fee: insuranceFee,
          emi_amount: emiAmount,
          no_of_emis: noOfEmis,
          emi_frequency: selectedScheme?.repayment_frequency,
          collection_week: selectedScheme?.collection_week,
          start_date: calculatedStartDate ? format(calculatedStartDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
        })
      });
      voiceFeedback.success();
      navigate('/loans');
    } catch (err: any) {
      voiceFeedback.error();
      alert(err.message || 'Failed to create loan request');
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

  const selectedMemberObj = (members || []).find(m => String(m.id) === String(formData.customer_id));

  // Determine first EMI date based on group meeting day and scheme
  let calculatedStartDate: Date | null = null;
  if (selectedMemberObj && selectedMemberObj.meeting_day && selectedScheme) {
    let start = new Date();
    start.setHours(0, 0, 0, 0);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDay = days.indexOf(selectedMemberObj.meeting_day);
    const freq = selectedScheme.repayment_frequency || 'weekly';

    if (targetDay !== -1) {
      let daysUntil = targetDay - start.getDay();
      if (daysUntil <= 0) daysUntil += 7;

      if (freq === 'daily') {
        start.setDate(start.getDate() + 1);
      } else if (freq === 'weekly') {
        start.setDate(start.getDate() + daysUntil);
      } else if (freq === 'bi-weekly') {
        start.setDate(start.getDate() + daysUntil + 7);
      } else if (freq === 'monthly') {
        start.setMonth(start.getMonth() + 1);
        let diff = targetDay - start.getDay();
        if (diff < 0) diff += 7;
        start.setDate(start.getDate() + diff);
      }
      calculatedStartDate = start;
    }
  }

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
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">New Loan Request</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Create customized proposal</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Input form */}
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
                {selectedMemberObj && (
                  <div className="mt-3 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
                    <p className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span className="text-slate-500 uppercase tracking-wider">Group:</span> 
                      <span>{selectedMemberObj.group_name || 'N/A'}</span>
                    </p>
                    <p className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span className="text-slate-500 uppercase tracking-wider">Collection Day:</span> 
                      <span>{selectedMemberObj.meeting_day || 'N/A'}</span>
                    </p>
                    {calculatedStartDate && (
                      <p className="text-xs font-bold text-emerald-700 flex items-center justify-between pt-2 border-t border-indigo-100">
                        <span className="uppercase tracking-wider">First EMI Date:</span> 
                        <span>{format(calculatedStartDate, 'PPPP')}</span>
                      </p>
                    )}
                  </div>
                )}
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
            </div>

            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white p-6 rounded-2xl text-xs font-black uppercase tracking-[0.4em] shadow-2xl shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                <Save className="w-5 h-5" />
                {loading ? 'SUBMITTING...' : 'CREATE NEW REQUEST'}
              </button>
            </div>
            
          </div>
        </div>

        {/* RIGHT COLUMN: Real-Time Calculator Chart */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900 rounded-[32px] shadow-2xl overflow-hidden sticky flex flex-col top-6">
            <div className="p-8 bg-indigo-600 flex items-center gap-3">
              <Calculator className="w-6 h-6 text-indigo-100" />
              <div>
                <h3 className="text-white font-black uppercase tracking-widest text-sm">Loan Structure</h3>
                <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest">Auto-calculated plan</p>
              </div>
            </div>
            
            <div className="p-8 space-y-6 flex-1">
              {selectedScheme && loanAmount > 0 ? (
                <>
                  <div className="flex justify-between items-end border-b border-slate-800 pb-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Principal Amount</span>
                    <span className="text-xl font-black text-white">₹{formatAmount(loanAmount)}</span>
                  </div>
                  
                  <div className="flex justify-between items-end border-b border-slate-800 pb-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Interest</span>
                      <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">{selectedScheme.interest_rate}% {selectedScheme.interest_type}</span>
                    </div>
                    <span className="text-lg font-black text-rose-400">+ ₹{formatAmount(interestAmount)}</span>
                  </div>
                  
                  <div className="flex justify-between items-end border-b border-slate-800 pb-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Processing Fee</span>
                      <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">
                        {selectedScheme.processing_fee_type === 'percentage' ? `${selectedScheme.processing_fee}%` : 'FIXED'}
                      </span>
                    </div>
                    <span className="text-sm font-black text-amber-400">- ₹{formatAmount(processingFee)}</span>
                  </div>
                  
                  <div className="flex justify-between items-end border-b border-slate-800 pb-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Insurance Fee</span>
                      <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">
                        {selectedScheme.insurance_fee_type === 'percentage' ? `${selectedScheme.insurance_fee}%` : 'FIXED'}
                      </span>
                    </div>
                    <span className="text-sm font-black text-amber-400">- ₹{formatAmount(insuranceFee)}</span>
                  </div>
                  
                  <div className="bg-slate-800/50 p-4 rounded-2xl flex justify-between items-center ring-1 ring-slate-800">
                    <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Net Disburse</span>
                    <span className="text-2xl font-black text-emerald-400">₹{formatAmount(disburseAmount)}</span>
                  </div>
                  
                  <div className="pt-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Repayment Schedule</p>
                      <h4 className="text-2xl font-black text-white">
                        ₹{formatAmount(emiAmount)} 
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-2">/ {selectedScheme.repayment_frequency}</span>
                      </h4>
                      {selectedScheme.repayment_frequency === 'monthly' && selectedScheme.collection_week && (
                        <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mt-1 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-amber-400" />
                          Collection: {selectedScheme.collection_week}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total EMIs</p>
                      <h4 className="text-2xl font-black text-indigo-400">{noOfEmis}</h4>
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-slate-800 flex justify-between items-center text-slate-500">
                     <span className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                       Penalty Rate 
                     </span>
                     <span className="text-[10px] font-black uppercase tracking-wider">{selectedScheme.penalty_rate || 0}% Late Fee</span>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-50 py-12">
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center mb-4">
                    <Calculator className="w-6 h-6 text-slate-500" />
                  </div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-relaxed max-w-[200px]">
                    Select a scheme and enter amount to generate structure
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
