import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { voiceFeedback } from '../lib/voice';
import { Trash2 } from 'lucide-react';

export default function Customers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '', aadhaar: '', group_id: '', branch_id: '' });

  const loadData = () => {
    setLoading(true);
    const promises: any[] = [fetchWithAuth('/members'), fetchWithAuth('/groups')];
    if (user?.role === 'superadmin') promises.push(fetchWithAuth('/branches'));
    
    Promise.all(promises).then(([custData, grpData, branchData]) => {
      setCustomers(Array.isArray(custData) ? custData : []);
      setGroups(grpData);
      if (branchData) setBranches(branchData);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('আপনি কি নিশ্চিত যে আপনি এই সদস্যকে ডিলিট করতে চান?')) return;
    try {
      await fetchWithAuth(`/members/${id}`, { method: 'DELETE' });
      voiceFeedback.success();
      loadData();
    } catch (err: any) {
      alert(err.message || 'ডিলিট করা সম্ভব হয়নি।');
      voiceFeedback.error();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchWithAuth('/members', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      voiceFeedback.success();
      setShowModal(false);
      setFormData({ name: '', phone: '', address: '', aadhaar: '', group_id: '', branch_id: '' });
      loadData();
    } catch (err: any) {
      alert(err.message);
      voiceFeedback.error();
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400 font-bold uppercase tracking-widest text-sm animate-pulse">
      Loading Registry...
    </div>
  );

  return (
    <div className="space-y-8 pb-10">
      <div className="bg-white rounded-[40px] p-4 sm:p-10 shadow-xl shadow-indigo-500/5 border border-slate-100 overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10 border-b border-slate-100 pb-8 px-2 sm:px-0">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Beneficiary Registry</h1>
            <p className="text-slate-500 font-medium text-sm mt-0.5 uppercase tracking-widest leading-none">Managing loan profiles & documentation</p>
          </div>
          <button 
            onClick={() => setShowModal(true)} 
            className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:shadow-xl hover:shadow-indigo-500/30 transition-all active:scale-95 shadow-md shadow-indigo-200 flex items-center justify-center gap-2"
          >
            Register Client
          </button>
        </div>

        <div className="overflow-x-auto -mx-4 sm:-mx-10 px-4 sm:px-10">
          <div className="hidden md:block">
            <table className="w-full border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
                  <th className="text-left text-white text-[11px] font-black uppercase tracking-[0.2em] p-6 border-b border-indigo-500/20 rounded-tl-xl">Full Identity</th>
                  <th className="text-left text-white text-[11px] font-black uppercase tracking-[0.2em] p-6 border-b border-indigo-500/20">Contact Details</th>
                  <th className="text-left text-white text-[11px] font-black uppercase tracking-[0.2em] p-6 border-b border-indigo-500/20">Verification</th>
                  <th className="text-left text-white text-[11px] font-black uppercase tracking-[0.2em] p-6 border-b border-indigo-500/20">Unit</th>
                  <th className="text-right text-white text-[11px] font-black uppercase tracking-[0.2em] p-6 border-b border-indigo-500/20 rounded-tr-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((cust) => (
                  <tr key={cust.id} className="group hover:bg-slate-50 transition-all duration-300">
                    <td className="p-6">
                      <div className="text-[15px] text-slate-900 font-black tracking-tight group-hover:text-indigo-600 transition-colors uppercase">{cust.full_name || cust.name}</div>
                      <div className="text-[10px] text-slate-500 font-black tracking-widest mt-1 uppercase opacity-70">{cust.address || cust.village}</div>
                    </td>
                    <td className="p-6">
                      <span className="text-[14px] text-slate-700 font-black tracking-widest">{cust.mobile_no || cust.phone}</span>
                    </td>
                    <td className="p-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">AADHAAR SECURE</span>
                        <span className="text-[13px] font-black tracking-wider text-slate-900">{cust.aadhar_no || cust.aadhaar}</span>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className="inline-flex px-4 py-1.5 bg-white text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-indigo-100 shadow-sm">
                        {cust.group_name || 'Individual'}
                      </span>
                    </td>
                    <td className="p-6 text-right">
                      <button 
                        onClick={() => handleDelete(cust.id)}
                        className="w-10 h-10 flex items-center justify-center bg-white text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-100 rounded-xl transition-all shadow-sm flex-shrink-0 ml-auto"
                        title="Remove Client"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-20 text-slate-400 text-center text-xs font-black uppercase tracking-widest opacity-50">Null Client Records</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="block md:hidden space-y-4">
             {customers.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-xs bg-slate-50 rounded-xl border border-slate-100">
                  Null Client Records
                </div>
             ) : (
                customers.map((cust) => (
                  <div key={cust.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                     <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4 text-white flex justify-between items-start">
                        <div>
                           <h3 className="font-black uppercase tracking-tight text-lg leading-tight mb-1">{cust.full_name || cust.name}</h3>
                           <div className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest opacity-90 line-clamp-1">{cust.address || cust.village}</div>
                        </div>
                     </div>
                     
                     <div className="p-4 grid grid-cols-2 gap-4">
                        <div className="col-span-2 flex items-center gap-2 text-sm font-black text-slate-900">
                           <span className="inline-flex px-2 py-1 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-widest rounded-md border border-indigo-100">
                             {cust.group_name || 'Individual'}
                           </span>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact</p>
                          <p className="text-sm font-black text-slate-900 tracking-widest">{cust.mobile_no || cust.phone}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Aadhaar (Secure)</p>
                          <p className="text-[11px] font-black text-slate-800 tracking-widest">{cust.aadhar_no || cust.aadhaar}</p>
                        </div>
                     </div>

                     <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
                        <button 
                          onClick={() => handleDelete(cust.id)}
                          className="w-12 h-10 shrink-0 flex items-center justify-center bg-white text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-all shadow-sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                     </div>
                  </div>
                ))
             )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-slate-900">Add Customer</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase font-semibold text-slate-500 mb-1">Name</label>
                <input required type="text" className="block w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-600 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] uppercase font-semibold text-slate-500 mb-1">Phone</label>
                <input required type="tel" className="block w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-600 outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] uppercase font-semibold text-slate-500 mb-1">Address</label>
                <textarea required className="block w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-600 outline-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] uppercase font-semibold text-slate-500 mb-1">Aadhaar Number</label>
                <input required type="text" className="block w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-600 outline-none" value={formData.aadhaar} onChange={e => setFormData({...formData, aadhaar: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] uppercase font-semibold text-slate-500 mb-1">Group (JLG)</label>
                <select className="block w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-600 outline-none bg-white" value={formData.group_id} onChange={e => setFormData({...formData, group_id: e.target.value})}>
                  <option value="">No Group</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.group_name}</option>)}
                </select>
              </div>
              {user?.role === 'superadmin' && (
                <div>
                  <label className="block text-[11px] uppercase font-semibold text-slate-500 mb-1">Branch</label>
                  <select required className="block w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-600 outline-none bg-white" value={formData.branch_id} onChange={e => setFormData({...formData, branch_id: e.target.value})}>
                    <option value="">Select Branch</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-3 mt-6 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
