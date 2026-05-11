import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../lib/api';
import { voiceFeedback } from '../lib/voice';
import { Trash2, Building, Plus, Globe, Mail, Phone, MapPin, Edit3, Building2, ShieldCheck, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Companies() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      const data = await fetchWithAuth('/companies');
      setCompanies(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this company? All its branches will also be deleted.')) return;
    try {
      await fetchWithAuth(`/companies/${id}`, { method: 'DELETE' });
      voiceFeedback.success();
      loadData();
    } catch (err: any) {
      voiceFeedback.error();
      alert(err.message);
    }
  };

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  );

  const company = companies[0];

  if (company) {
    return (
      <div className="w-full pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="bg-white rounded-[40px] shadow-2xl shadow-indigo-100/50 border border-slate-100 overflow-hidden">
          {/* Header Banner */}
          <div className="h-48 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 relative">
            <div className="absolute top-0 right-0 p-8">
              <button 
                onClick={() => navigate(`/companies/edit/${company.id}`)}
                className="bg-white/20 backdrop-blur-md text-white px-6 py-2.5 rounded-2xl text-sm font-bold hover:bg-white/30 transition-all flex items-center gap-2 border border-white/20"
              >
                <Edit3 className="h-4 w-4" />
                Edit Details
              </button>
            </div>
          </div>

          <div className="px-10 pb-10">
            {/* Logo and Intro */}
            <div className="relative -mt-20 mb-8 flex items-end gap-8">
              <div className="w-40 h-40 bg-white rounded-[40px] shadow-2xl border-8 border-white flex items-center justify-center overflow-hidden">
                {company.logo_url ? (
                  <img src={company.logo_url} className="w-full h-full object-contain" alt="logo" referrerPolicy="no-referrer" />
                ) : (
                  <Building2 className="h-16 w-16 text-indigo-500" />
                )}
              </div>
              <div className="pb-4">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">{company.name}</h1>
                <p className="text-indigo-600 font-bold uppercase tracking-[0.2em] text-xs mt-2">Parent Organization</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-slate-400">
                    <ShieldCheck className="h-5 w-5" />
                    <h2 className="text-sm font-black uppercase tracking-widest">General Information</h2>
                  </div>
                  <div className="bg-slate-50/50 rounded-3xl p-6 space-y-4 border border-slate-100">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Legal Entity Name</p>
                      <p className="text-sm font-bold text-slate-800">{company.legal_name || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Registration Number</p>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-slate-300" />
                        <p className="text-sm font-bold text-slate-800">{company.registration_no || 'Not registered'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-slate-400">
                    <MapPin className="h-5 w-5" />
                    <h2 className="text-sm font-black uppercase tracking-widest">Office Location</h2>
                  </div>
                  <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100">
                    <p className="text-sm font-bold text-slate-800 leading-relaxed">
                      {company.address || 'Headquarters address not yet provided'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-slate-400">
                    <Mail className="h-5 w-5" />
                    <h2 className="text-sm font-black uppercase tracking-widest">Contact Channels</h2>
                  </div>
                  <div className="bg-slate-50/50 rounded-3xl p-6 space-y-6 border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-indigo-500">
                        <Phone className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Contact</p>
                        <p className="text-sm font-bold text-slate-800">{company.contact_no || 'No contact added'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-purple-500">
                        <Mail className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Business Email</p>
                        <p className="text-sm font-bold text-slate-800">{company.email || 'No email added'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between items-center">
               <button 
                 onClick={() => handleDelete(company.id)}
                 className="flex items-center gap-2 text-slate-400 hover:text-red-500 transition-colors text-xs font-bold uppercase tracking-widest"
               >
                 <Trash2 className="h-4 w-4" />
                 Delete Organization
               </button>
               <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest">
                 Organization ID: {company.id}
               </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
      <div className="w-24 h-24 bg-white rounded-[32px] shadow-2xl border border-slate-100 flex items-center justify-center mb-8 relative">
        <Building2 className="h-10 w-10 text-indigo-200" />
        <div className="absolute -top-2 -right-2">
          <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg animate-bounce">
            <Plus className="h-4 w-4" />
          </div>
        </div>
      </div>
      <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-4">No Organization Yet</h1>
      <p className="text-slate-500 max-w-sm font-medium leading-relaxed mb-8">
        You need to register your parent organization before you can manage branches and employees.
      </p>
      <button 
        onClick={() => navigate('/companies/new')} 
        className="bg-indigo-600 shadow-[0_20px_50px_-12px_rgba(79,70,229,0.3)] text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
      >
        <Building2 className="h-5 w-5" />
        Register Company
      </button>
    </div>
  );
}
