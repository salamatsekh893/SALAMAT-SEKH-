import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchWithAuth } from '../lib/api';
import { voiceFeedback } from '../lib/voice';
import { ArrowLeft, Upload, Building2, Globe, Mail, Phone, MapPin, ShieldCheck, CreditCard, AlertCircle, Save } from 'lucide-react';
import { cn } from '../lib/utils';

export default function CreateCompany() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [alreadyExists, setAlreadyExists] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    legal_name: '',
    registration_no: '',
    address: '',
    contact_no: '',
    email: '',
    logo_url: ''
  });

  useEffect(() => {
    const checkAndFetch = async () => {
      try {
        const companies = await fetchWithAuth('/companies');
        
        if (isEdit) {
          const companyToEdit = companies.find((c: any) => c.id.toString() === id);
          if (companyToEdit) {
            setFormData({
              name: companyToEdit.name || '',
              legal_name: companyToEdit.legal_name || '',
              registration_no: companyToEdit.registration_no || '',
              address: companyToEdit.address || '',
              contact_no: companyToEdit.contact_no || '',
              email: companyToEdit.email || '',
              logo_url: companyToEdit.logo_url || ''
            });
            setLogoPreview(companyToEdit.logo_url);
          } else {
            navigate('/companies');
          }
        } else if (companies.length > 0) {
          setAlreadyExists(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setChecking(false);
      }
    };
    checkAndFetch();
  }, [id, isEdit]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
      setFormData({ ...formData, logo_url: reader.result as string });
    };
    reader.readAsDataURL(file);
  }
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  try {
    await fetchWithAuth(isEdit ? `/companies/${id}` : '/companies', {
      method: isEdit ? 'PUT' : 'POST',
      body: JSON.stringify(formData)
    });
    voiceFeedback.success();
    navigate('/companies');
  } catch (err: any) {
    voiceFeedback.error();
    alert(err.message);
  } finally {
    setLoading(false);
  }
};

if (checking) return (
  <div className="flex h-screen items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
  </div>
);

if (alreadyExists) return (
  <div className="min-h-[80vh] flex items-center justify-center p-4">
    <div className="max-w-md w-full bg-white rounded-[40px] p-10 text-center shadow-2xl border border-slate-100">
      <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center text-amber-500 mx-auto mb-6">
        <AlertCircle className="h-10 w-10" />
      </div>
      <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-4">Organization Exists</h2>
      <p className="text-slate-500 font-medium leading-relaxed mb-8">
        You have already registered your organization. This system is designed for a single parent company. 
        Please manage your branches and employees from the dashboard.
      </p>
      <button 
        onClick={() => navigate('/companies')}
        className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
      >
        View Profile
      </button>
    </div>
  </div>
);

return (
    <div className="min-h-screen pb-12">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200/40 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-200/40 rounded-full blur-[120px] animation-delay-2000"></div>
      </div>

      <div className="w-full space-y-6">
        <button 
          onClick={() => navigate('/companies')}
          className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold text-xs uppercase tracking-widest transition-all group"
        >
          <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 group-hover:-translate-x-1 transition-transform">
            <ArrowLeft className="h-4 w-4" />
          </div>
          Back to profile
        </button>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-white -mx-4 sm:mx-0 rounded-none sm:rounded-[40px] shadow-2xl shadow-indigo-100/50 border-y sm:border border-slate-100 overflow-hidden">
            {/* Header with Mix Color Gradient */}
            <div className="p-10 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div>
                  <h1 className="text-3xl font-black tracking-tight">
                    {isEdit ? 'Update Organization' : 'Create New Organization'}
                  </h1>
                  <p className="text-indigo-100 font-medium mt-2">
                    {isEdit ? 'Refine your parent company details and brand identity' : 'Register your parent company details and brand identity'}
                  </p>
                </div>
                
                {/* Logo Upload Section */}
                <div className="relative group">
                  <div className="w-32 h-32 rounded-3xl bg-white/20 backdrop-blur-md border-2 border-dashed border-white/40 flex items-center justify-center overflow-hidden transition-all group-hover:border-white/80">
                    {logoPreview ? (
                      <img src={logoPreview} className="w-full h-full object-cover" alt="preview" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="h-8 w-8 text-white/60 mb-2" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Logo</span>
                      </div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-white text-indigo-600 p-2 rounded-xl shadow-lg transform transition-transform group-hover:scale-110">
                    <Building2 className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              {/* Basic Info Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <Building2 className="h-5 w-5 text-indigo-500" />
                  <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Basic Information</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Display Name *</label>
                    <input 
                      required
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-600 outline-none transition-all"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g. Subidha Group"
                    />
                  </div>
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Legal Entity Name</label>
                    <input 
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-600 outline-none transition-all"
                      value={formData.legal_name}
                      onChange={e => setFormData({...formData, legal_name: e.target.value})}
                      placeholder="e.g. Subidha Services Pvt. Ltd."
                    />
                  </div>
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Registration No.</label>
                    <div className="relative">
                      <CreditCard className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                      <input 
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-14 pr-5 py-4 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-600 outline-none transition-all"
                        value={formData.registration_no}
                        onChange={e => setFormData({...formData, registration_no: e.target.value})}
                        placeholder="GSTIN or Trade License"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Info Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <ShieldCheck className="h-5 w-5 text-pink-500" />
                  <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Communication</h2>
                </div>
                <div className="space-y-4">
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Primary Email</label>
                    <div className="relative">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                      <input 
                        type="email"
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-14 pr-5 py-4 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-600 outline-none transition-all"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        placeholder="admin@yourcompany.com"
                      />
                    </div>
                  </div>
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Contact Number</label>
                    <div className="relative">
                      <Phone className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                      <input 
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-14 pr-5 py-4 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-600 outline-none transition-all"
                        value={formData.contact_no}
                        onChange={e => setFormData({...formData, contact_no: e.target.value})}
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-5 top-5 h-5 w-5 text-slate-300" />
                      <textarea 
                        rows={2}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-14 pr-5 py-4 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-600 outline-none transition-all resize-none"
                        value={formData.address}
                        onChange={e => setFormData({...formData, address: e.target.value})}
                        placeholder="HQ Full Address"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer with colorful action button */}
            <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end">
              <button 
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-2xl shadow-indigo-200 text-white rounded-2xl px-12 py-5 font-black uppercase tracking-widest text-[13px] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-3"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    {isEdit ? 'Save Changes' : 'Launch Organization'}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

const Plus = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);
