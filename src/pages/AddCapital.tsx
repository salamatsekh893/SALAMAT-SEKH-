import React, { useState, useEffect } from 'react';
import { voiceFeedback } from '../lib/voice';
import { useNavigate } from 'react-router-dom';
import { Save, X, Coins } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import { fetchWithAuth } from '../lib/api';

export default function AddCapital() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [banks, setBanks] = useState<any[]>([]);
  const [investors, setInvestors] = useState<any[]>([]);
  const [showInvestorModal, setShowInvestorModal] = useState(false);
  const [investorForm, setInvestorForm] = useState({
    name: '',
    mobile: '',
    address: '',
    photo: '',
    id_proof: ''
  });
  
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    payment_method: 'cash',
    bank_id: '',
    source_type: 'self',
    investor_id: '',
    remarks: ''
  });

  useEffect(() => {
    loadBanks();
    loadInvestors();
  }, []);

  const loadBanks = async () => {
    try {
      const data = await fetchWithAuth('/banks');
      setBanks(data.filter((b: any) => b.status === 'active'));
    } catch (err) {
      console.error(err);
    }
  };

  const loadInvestors = async () => {
    try {
      const data = await fetchWithAuth('/investors');
      setInvestors(data);
    } catch (err) {
      console.error(err);
    }
  };

  const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

  const handleInvestorImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'photo' | 'id_proof') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await toBase64(file);
      setInvestorForm(prev => ({ ...prev, [field]: b64 }));
    } catch (err) {
      console.error("Failed to convert file to base64");
    }
  };

  const handleSaveInvestor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newInvestor = await fetchWithAuth('/investors', {
        method: 'POST',
        body: JSON.stringify(investorForm)
      });
      setInvestors([...investors, newInvestor]);
      setFormData(prev => ({ ...prev, investor_id: newInvestor.id.toString(), source_type: 'other' }));
      setShowInvestorModal(false);
      setInvestorForm({ name: '', mobile: '', address: '', photo: '', id_proof: '' });
    } catch (err: any) {
      voiceFeedback.error();
      alert(err.message || 'Error saving investor');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.payment_method === 'bank' && !formData.bank_id) {
      voiceFeedback.error();
      alert('Please select a bank account');
      return;
    }

    try {
      await fetchWithAuth('/capital', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      voiceFeedback.success();
      navigate('/capital');
    } catch (err: any) {
      voiceFeedback.error();
      alert(`Failed: ${err.message}`);
    }
  };

  if (user?.role !== 'superadmin' && user?.role !== 'manager') {
    return <div className="p-10 text-center text-rose-500 font-bold">Access Denied</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-4 pb-10 px-3 md:px-0">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Add Capital</h2>
              <p className="text-xs text-slate-500 font-semibold tracking-wide uppercase mt-0.5">Record new company investment</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/capital')}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Date *</label>
              <input 
                required
                type="date" 
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-semibold transition-colors"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Amount (₹) *</label>
              <input 
                required
                type="number" 
                step="0.01"
                min="1"
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: e.target.value})}
                placeholder="Enter amount"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-semibold text-emerald-700 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Payment Method *</label>
              <select
                required
                value={formData.payment_method}
                onChange={e => setFormData({...formData, payment_method: e.target.value, bank_id: ''})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-semibold transition-colors uppercase"
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
              </select>
            </div>

            {formData.payment_method === 'bank' && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Select Bank Account *</label>
                <select
                  required={formData.payment_method === 'bank'}
                  value={formData.bank_id}
                  onChange={e => setFormData({...formData, bank_id: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-semibold transition-colors"
                >
                  <option value="">-- Choose Bank Account --</option>
                  {banks.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.bank_name} - {b.account_number}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Source of Fund *</label>
              <select
                required
                value={formData.source_type}
                onChange={e => setFormData({...formData, source_type: e.target.value, investor_id: ''})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-semibold transition-colors uppercase"
              >
                <option value="self">Own Capital</option>
                <option value="other">Other Party / Investor</option>
              </select>
            </div>

            {formData.source_type === 'other' && (
              <div className="space-y-1.5 md:col-span-2 border border-blue-100 bg-blue-50/50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Select Investor *</label>
                  <button
                    type="button"
                    onClick={() => setShowInvestorModal(true)}
                    className="text-[11px] font-bold bg-blue-600 text-white px-3 py-1.5 rounded flex items-center gap-1 hover:bg-blue-700 transition"
                  >
                    + New Investor
                  </button>
                </div>
                <select
                  required={formData.source_type === 'other'}
                  value={formData.investor_id}
                  onChange={e => setFormData({...formData, investor_id: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-semibold transition-colors"
                >
                  <option value="">-- Select Investor --</option>
                  {investors.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.name} {inv.mobile ? `- ${inv.mobile}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Remarks / Note</label>
              <input 
                type="text" 
                value={formData.remarks}
                onChange={e => setFormData({...formData, remarks: e.target.value})}
                placeholder="Optional notes about this capital addition"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-semibold transition-colors"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
            <button 
              type="button"
              onClick={() => navigate('/capital')}
              className="px-6 py-2.5 text-[11px] font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-6 py-2.5 bg-blue-600 text-white text-[11px] font-black uppercase tracking-wider rounded flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Save className="w-4 h-4" />
              Save Record
            </button>
          </div>
        </form>
      </div>

      {showInvestorModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50 sticky top-0">
              <h3 className="font-bold text-slate-800">Add New Investor</h3>
              <button type="button" onClick={() => setShowInvestorModal(false)} className="text-slate-500 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveInvestor} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Investor Name *</label>
                <input required type="text" value={investorForm.name} onChange={e => setInvestorForm({...investorForm, name: e.target.value})} className="w-full px-3 py-2 border rounded text-sm"/>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Mobile Number</label>
                <input type="tel" value={investorForm.mobile} onChange={e => setInvestorForm({...investorForm, mobile: e.target.value})} className="w-full px-3 py-2 border rounded text-sm"/>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Address</label>
                <textarea rows={2} value={investorForm.address} onChange={e => setInvestorForm({...investorForm, address: e.target.value})} className="w-full px-3 py-2 border rounded text-sm"></textarea>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Photo (Optional)</label>
                <input type="file" accept="image/*" onChange={e => handleInvestorImageUpload(e, 'photo')} className="w-full text-sm"/>
                {investorForm.photo && <img src={investorForm.photo} alt="Photo" className="w-20 h-20 object-cover mt-2 rounded border"/>}
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">ID Proof (Optional)</label>
                <input type="file" accept="image/*" onChange={e => handleInvestorImageUpload(e, 'id_proof')} className="w-full text-sm"/>
                {investorForm.id_proof && <img src={investorForm.id_proof} alt="ID" className="w-20 h-20 object-cover mt-2 rounded border"/>}
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowInvestorModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded flex items-center gap-2 relative">
                  Save Investor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
