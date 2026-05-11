import React, { useState, useEffect } from 'react';
import { voiceFeedback } from '../lib/voice';
import { PiggyBank, ArrowLeft, Save, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../lib/api';

export default function CreateSavings() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const queryType = new URLSearchParams(window.location.search).get('type') || 'saving';
  const prefix = queryType === 'rd' ? 'RD' : 'SAV';

  const [formData, setFormData] = useState({
    account_no: prefix + Date.now().toString().slice(-6),
    member_id: '',
    account_type: queryType,
    deposit_frequency: 'monthly',
    monthly_deposit: '',
    duration_months: '',
    interest_rate: '',
    maturity_amount: '',
    maturity_date: ''
  });

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    if (formData.account_type === 'rd' && formData.duration_months && !formData.maturity_date) {
      const duration = parseInt(formData.duration_months);
      if (!isNaN(duration)) {
        const date = new Date();
        if (formData.deposit_frequency === 'daily') date.setDate(date.getDate() + duration);
        else if (formData.deposit_frequency === 'weekly') date.setDate(date.getDate() + duration * 7);
        else if (formData.deposit_frequency === 'biweekly') date.setDate(date.getDate() + duration * 14);
        else date.setMonth(date.getMonth() + duration);
        
        setFormData(prev => ({ ...prev, maturity_date: date.toISOString().split('T')[0] }));
      }
    }
  }, [formData.duration_months, formData.deposit_frequency]);

  useEffect(() => {
    if (formData.account_type === 'rd' && formData.monthly_deposit && formData.duration_months && formData.interest_rate) {
      const P = parseFloat(formData.monthly_deposit);
      const n = parseInt(formData.duration_months);
      const r = parseFloat(formData.interest_rate);
      
      if (!isNaN(P) && !isNaN(n) && !isNaN(r)) {
        // Approximate RD Maturity calculation: Total = P*n + Interest
        // Interest = P * [n(n+1)/2] * (r/12) * (1/100)
        const interest = P * (n * (n + 1) / 2) * (r / 1200);
        const maturityValue = (P * n) + interest;
        setFormData(prev => ({ ...prev, maturity_amount: maturityValue.toFixed(2) }));
      }
    }
  }, [formData.monthly_deposit, formData.duration_months, formData.interest_rate]);

  const fetchMembers = async () => {
    try {
      const data = await fetchWithAuth('/members');
      setMembers(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetchWithAuth('/savings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      navigate(formData.account_type === 'rd' ? '/recurring-deposits' : '/savings-accounts');
    } catch (e: any) {
      voiceFeedback.error();
      alert('Failed: ' + e.message);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-10 pt-4">
      <div className="flex items-center justify-between mb-6 px-4">
        <div className="flex items-center gap-3 text-[#1976d2]">
          <button onClick={() => navigate(queryType === 'rd' ? '/recurring-deposits' : '/savings-accounts')} className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-full bg-[#e3f2fd] flex items-center justify-center">
            <PiggyBank className="w-5 h-5 text-[#1976d2]" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold uppercase tracking-wider">Open Account</h1>
        </div>
      </div>

      <div className="bg-white sm:rounded-[20px] shadow-lg border-y sm:border border-slate-100 overflow-hidden">
        <div className="bg-[#1976d2] px-6 py-4 border-b border-blue-600">
          <h2 className="text-white font-bold tracking-wide uppercase flex items-center gap-2">
            <Building2 className="w-5 h-5"/> Account Details
          </h2>
        </div>
        <form onSubmit={handleCreate} className="p-4 md:p-8 space-y-6">
          <div className="grid grid-cols-2 gap-3 md:gap-6">
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 md:mb-2">Account No *</label>
              <input required type="text" value={formData.account_no} onChange={e => setFormData({...formData, account_no: e.target.value})} className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-slate-300 rounded-[10px] md:rounded-[12px] font-mono text-xs md:text-sm text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#1976d2] focus:ring-1 focus:ring-[#1976d2] transition-colors" />
            </div>
            
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 md:mb-2 truncate">Member (Customer) *</label>
              <select required value={formData.member_id} onChange={e => setFormData({...formData, member_id: e.target.value})} className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-slate-300 rounded-[10px] md:rounded-[12px] font-bold text-xs md:text-sm text-slate-700 focus:outline-none focus:border-[#1976d2] focus:ring-1 focus:ring-[#1976d2] transition-colors bg-white">
                <option value="">-- Select Member --</option>
                {members.filter(m => m.status === 'Active').map((m: any) => (
                  <option key={m.id} value={m.id}>{m.full_name} ({m.member_code})</option>
                ))}
              </select>
            </div>
          </div>

          {formData.account_type === 'rd' && (
            <div className="p-4 md:p-6 bg-purple-50/50 rounded-[12px] md:rounded-[16px] border border-purple-100 space-y-4 md:space-y-6">
              <h3 className="text-[11px] md:text-sm font-bold text-purple-800 uppercase tracking-widest border-b border-purple-200 pb-2">RD Configuration</h3>
              <div className="grid grid-cols-2 gap-3 md:gap-6">
                <div>
                  <label className="block text-[9px] md:text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 md:mb-2">Deposit Freq *</label>
                  <select required={formData.account_type==='rd'} value={formData.deposit_frequency} onChange={e => setFormData({...formData, deposit_frequency: e.target.value})} className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-slate-300 rounded-[10px] md:rounded-[12px] text-xs md:text-sm text-slate-700 font-bold bg-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] md:text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 md:mb-2 truncate">Deposit Amount *</label>
                  <input required={formData.account_type==='rd'} type="number" step="0.01" value={formData.monthly_deposit} onChange={e => setFormData({...formData, monthly_deposit: e.target.value})} className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-slate-300 rounded-[10px] md:rounded-[12px] text-xs md:text-sm text-slate-700 bg-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" placeholder="₹" />
                </div>
                <div>
                  <label className="block text-[9px] md:text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 md:mb-2 truncate" title={`Duration (${formData.deposit_frequency === 'daily' ? 'Days' : formData.deposit_frequency === 'weekly' ? 'Weeks' : formData.deposit_frequency === 'biweekly' ? 'Bi-weeks' : 'Months'})`}>
                    Duration ({formData.deposit_frequency === 'daily' ? 'Days' : formData.deposit_frequency === 'weekly' ? 'Weeks' : formData.deposit_frequency === 'biweekly' ? 'Bi-weeks' : 'Months'}) *
                  </label>
                  <input required={formData.account_type==='rd'} type="number" value={formData.duration_months} onChange={e => setFormData({...formData, duration_months: e.target.value})} className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-slate-300 rounded-[10px] md:rounded-[12px] text-xs md:text-sm text-slate-700 bg-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" placeholder={formData.deposit_frequency === 'daily' ? 'e.g. 120' : formData.deposit_frequency === 'weekly' ? 'e.g. 52' : formData.deposit_frequency === 'biweekly' ? 'e.g. 26' : 'e.g. 12'} />
                </div>
                <div>
                  <label className="block text-[9px] md:text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 md:mb-2 truncate">Maturity Date</label>
                  <input type="date" value={formData.maturity_date} onChange={e => setFormData({...formData, maturity_date: e.target.value})} className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-slate-300 rounded-[10px] md:rounded-[12px] text-xs md:text-sm text-slate-700 bg-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-[9px] md:text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 md:mb-2 truncate">Interest Rate (%)</label>
                  <input type="number" step="0.01" value={formData.interest_rate} onChange={e => setFormData({...formData, interest_rate: e.target.value})} className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-slate-300 rounded-[10px] md:rounded-[12px] text-xs md:text-sm text-slate-700 bg-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" placeholder="e.g. 5.5" />
                </div>
                <div>
                  <label className="block text-[9px] md:text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 md:mb-2 truncate">Maturity Amount</label>
                  <input type="number" step="0.01" value={formData.maturity_amount} onChange={e => setFormData({...formData, maturity_amount: e.target.value})} className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-slate-300 rounded-[10px] md:rounded-[12px] text-xs md:text-sm text-slate-700 bg-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" placeholder="₹" />
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end">
            <button disabled={loading} type="submit" className="bg-[#1976d2] text-white px-8 py-3.5 rounded-full text-sm font-bold uppercase tracking-wider shadow-lg hover:bg-[#1565c0] transition-colors flex items-center gap-2 disabled:opacity-70">
              {loading ? 'Saving...' : <><Save className="w-5 h-5"/> Create Account</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
