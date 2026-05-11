import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../lib/api';
import { voiceFeedback } from '../lib/voice';
import { Plus, MapPin, Hash, Trash2, Edit3, Building2, Search, ArrowRight, User, Phone, Mail, Filter, Navigation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

export default function Branches() {
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('All Districts');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    fetchWithAuth('/branches').then(data => {
      setBranches(data);
    }).finally(() => setLoading(false));
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deactivating this branch will mark it as "Inactive". It will remain in the system but cannot process new loans. Proceed?')) return;
    try {
      await fetchWithAuth(`/branches/${id}`, { method: 'DELETE' });
      voiceFeedback.success();
      loadData();
    } catch (err: any) {
      voiceFeedback.error();
      alert(err.message);
    }
  };

  const districts = ['All Districts', ...new Set(branches.map(b => b.district).filter(Boolean))];

  const filteredBranches = branches.filter(b => {
    const matchesSearch = (b.branch_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                         (b.branch_code?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesDistrict = filterDistrict === 'All Districts' || b.district === filterDistrict;
    return matchesSearch && matchesDistrict;
  });

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 font-bold"></div>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-10">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-none">Branch Network</h1>
          <p className="text-slate-500 font-medium text-sm mt-2 uppercase tracking-widest leading-none">Operational Oversight: {branches.length} Sites</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group min-w-[240px]">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-900 group-focus-within:text-indigo-600 transition-colors" />
             <input 
               type="text" 
               placeholder="SEARCH NETWORK..."
               className="w-full bg-white border-4 border-slate-100 rounded-2xl py-3 pl-12 pr-4 text-[12px] font-black text-slate-900 focus:border-black transition-all outline-none"
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
             />
          </div>

          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-900 pointer-events-none" />
            <select 
              className="bg-white border-4 border-slate-100 rounded-2xl py-3 pl-12 pr-10 text-[12px] font-black text-slate-900 focus:border-black transition-all outline-none appearance-none"
              value={filterDistrict}
              onChange={e => setFilterDistrict(e.target.value)}
            >
              {districts.map(d => (
                <option key={d as string} value={d as string}>{(d as string).toUpperCase()}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={() => navigate('/branches/new')} 
            className="whitespace-nowrap bg-indigo-600 text-white px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Establish Site
          </button>
        </div>
      </div>

      {/* Branch List Section */}
      <div className="bg-white rounded-[40px] p-4 sm:p-10 shadow-xl shadow-indigo-500/5 border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto -mx-4 sm:-mx-10 px-4 sm:px-10">
          <div className="hidden md:block">
            <table className="w-full border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
                  <th className="text-left text-white text-[11px] font-black uppercase tracking-[0.2em] p-6 border-b border-indigo-500/20 rounded-tl-xl">Branch Identity</th>
                  <th className="text-left text-white text-[11px] font-black uppercase tracking-[0.2em] p-6 border-b border-indigo-500/20">Location</th>
                  <th className="text-left text-white text-[11px] font-black uppercase tracking-[0.2em] p-6 border-b border-indigo-500/20">Leadership</th>
                  <th className="text-left text-white text-[11px] font-black uppercase tracking-[0.2em] p-6 border-b border-indigo-500/20">Status</th>
                  <th className="text-right text-white text-[11px] font-black uppercase tracking-[0.2em] p-6 border-b border-indigo-500/20 rounded-tr-xl">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBranches.map(branch => (
                  <tr key={branch.id} className="group hover:bg-slate-50 transition-all duration-300">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-transform shadow-sm",
                          branch.status === 'active' 
                            ? "bg-slate-900 text-white border-slate-900" 
                            : "bg-slate-100 text-slate-400 border-slate-200"
                        )}>
                          <Building2 className="h-6 w-6" />
                        </div>
                        <div>
                           <span className="text-[15px] text-slate-900 font-black tracking-tight group-hover:text-indigo-600 transition-colors uppercase block leading-none">{branch.branch_name}</span>
                           <span className="text-[10px] text-slate-500 font-black tracking-widest mt-1.5 block opacity-70 uppercase leading-none">CODE: {branch.branch_code}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-[13px] text-slate-900 font-black">
                          <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                          {branch.district}
                        </div>
                        <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-5.5">{branch.state}</div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                         <User className="h-4 w-4 text-slate-400" />
                         <p className="text-[13px] font-black text-slate-900 uppercase">{branch.manager_name || 'PENDING'}</p>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm",
                        branch.status === 'active' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                      )}>
                        {branch.status}
                      </div>
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => navigate(`/employees?branch_id=${branch.id}`)}
                          className="px-4 h-10 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-sm border border-slate-200"
                        >
                          Staff
                        </button>
                        <button 
                          onClick={() => navigate(`/branches/edit/${branch.id}`)}
                          className="w-10 h-10 flex items-center justify-center bg-white text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-100 rounded-xl transition-all shadow-sm"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(branch.id)}
                          className="w-10 h-10 flex items-center justify-center bg-white text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-100 rounded-xl transition-all shadow-sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="block md:hidden space-y-4">
            {filteredBranches.map(branch => (
              <div key={branch.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                 <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4 text-white flex justify-between items-start">
                    <div className="flex gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center border-2 shadow-sm shrink-0",
                        branch.status === 'active' 
                          ? "bg-slate-900 border-white/20 text-white" 
                          : "bg-white/10 text-white/50 border-white/10"
                      )}>
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-black uppercase tracking-tight text-lg leading-tight mb-1">{branch.branch_name}</h3>
                        <span className="text-[10px] font-black bg-white/20 text-white px-2 py-0.5 rounded-lg border border-white/20 uppercase">CODE: {branch.branch_code}</span>
                      </div>
                    </div>
                 </div>
                 
                 <div className="p-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border",
                        branch.status === 'active' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                      )}>
                        {branch.status}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Location</p>
                      <p className="text-sm font-black text-slate-900 leading-tight">{branch.district}</p>
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest leading-tight">{branch.state}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Leadership</p>
                      <div className="flex items-center gap-2 text-sm font-black text-slate-900 uppercase">
                         <User className="h-3.5 w-3.5 text-slate-400" />
                         {branch.manager_name || 'PENDING'}
                      </div>
                    </div>
                 </div>

                 <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
                    <button 
                      onClick={() => navigate(`/employees?branch_id=${branch.id}`)}
                      className="flex-1 max-w-[5rem] px-4 h-10 bg-white text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all shadow-sm border border-slate-200"
                    >
                      Staff
                    </button>
                    <button 
                      onClick={() => navigate(`/branches/edit/${branch.id}`)}
                      className="h-10 flex-1 flex items-center justify-center bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-xl transition-all shadow-sm font-bold text-xs uppercase tracking-widest"
                    >
                      <Edit3 className="h-3.5 w-3.5 mr-1.5" /> Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(branch.id)}
                      className="w-10 h-10 flex-1 max-w-[3rem] shrink-0 flex items-center justify-center bg-white text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-all shadow-sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                 </div>
              </div>
            ))}
          </div>
        </div>

        {filteredBranches.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-slate-200" />
            </div>
            <h3 className="text-lg font-black text-slate-900">No Branches Found</h3>
            <p className="text-slate-400 text-xs font-medium max-w-[240px] mt-1">Adjust your filters or add a new branch to your network.</p>
          </div>
        )}
      </div>

    </div>
  );
}
