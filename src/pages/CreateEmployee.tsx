import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchWithAuth } from '../lib/api';
import { voiceFeedback } from '../lib/voice';
import { ArrowLeft, UserPlus, User, Phone, Mail, Lock, Shield, Building2, Save, UserCheck, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';

export default function CreateEmployee() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [branches, setBranches] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    role: 'fo',
    branch_id: '',
    status: 'active',
    address: '',
    photo_url: '',
    join_date: new Date().toISOString().split('T')[0],
    date_of_birth: '',
    salary: '',
    emergency_contact: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const branchesData = await fetchWithAuth('/branches');
        setBranches(branchesData);

        if (isEdit) {
          const employees = await fetchWithAuth('/employees');
          const employeeToEdit = employees.find((e: any) => e.id.toString() === id);
          if (employeeToEdit) {
            setFormData({
              name: employeeToEdit.name || '',
              phone: employeeToEdit.phone || '',
              email: employeeToEdit.email || '',
              password: '', // Don't fetch password for security
              role: employeeToEdit.role || 'fo',
              branch_id: employeeToEdit.branch_id?.toString() || '',
              status: employeeToEdit.status || 'active',
              address: employeeToEdit.address || '',
              photo_url: employeeToEdit.photo_url || '',
              join_date: employeeToEdit.join_date ? new Date(employeeToEdit.join_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              date_of_birth: employeeToEdit.date_of_birth ? new Date(employeeToEdit.date_of_birth).toISOString().split('T')[0] : '',
              salary: employeeToEdit.salary?.toString() || '',
              emergency_contact: employeeToEdit.emergency_contact || ''
            });
          } else {
            navigate('/employees');
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [id, isEdit, navigate]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image size must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photo_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Check for existing superadmin if trying to set this user as superadmin
      if (formData.role === 'superadmin') {
        const employees = await fetchWithAuth('/employees');
        // If we are creating NEW, or if we are editing and changing role to superadmin, check if another superadmin exists
        const existingAdmin = employees.find((emp: any) => emp.role === 'superadmin' && emp.id.toString() !== id);
        
        if (existingAdmin) {
          throw new Error('There is already a Super Admin in the system. Only one Super Admin is allowed.');
        }
      }

      const payload = { ...formData };
      if (isEdit && !payload.password) {
        delete (payload as any).password;
      }
      
      await fetchWithAuth(isEdit ? `/employees/${id}` : '/employees', {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });
      
      voiceFeedback.success();
      navigate('/employees');
    } catch (err: any) {
      alert(err.message);
      voiceFeedback.error();
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
          <User className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-indigo-600" />
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Accessing Directory...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      <div className="w-full px-4 sm:px-6 lg:px-10 py-8">
        {/* Navigation */}
        <div className="mb-8 flex items-center justify-between">
          <button 
            type="button"
            onClick={() => navigate('/employees')}
            className="group flex items-center gap-2 text-slate-900 hover:text-indigo-600 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center group-hover:bg-indigo-50 group-hover:border-indigo-200 transition-all">
              <ArrowLeft className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest">Team Portal</span>
          </button>
          
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
             <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Admin Oversight</span>
          </div>
        </div>

        {/* Header */}
        <div className="mb-10 border-b-2 border-indigo-100 pb-5 flex items-center justify-between">
           <div>
            <h1 className="text-2xl font-black text-indigo-900 tracking-tighter uppercase flex items-center gap-3">
              <span className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><UserPlus className="w-5 h-5" /></span>
              <span>{isEdit ? 'UPDATE' : 'PROVISION'} <span className="text-indigo-400">STAFF</span></span>
            </h1>
            <p className="text-indigo-600/60 font-bold text-[10px] mt-1 uppercase tracking-[0.2em]">Manage personnel access & assignments</p>
           </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
              {/* Profile Card */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white -mx-4 sm:mx-0 rounded-none sm:rounded-[32px] p-6 sm:p-8 shadow-xl border-y sm:border-2 border-slate-100"
              >
                <div className="flex flex-col md:flex-row items-center gap-8 mb-8 pb-8 border-b-2 border-slate-50">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-[32px] bg-slate-100 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center relative">
                      {formData.photo_url ? (
                        <img src={formData.photo_url} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-12 h-12 text-slate-300" />
                      )}
                      <label className="absolute inset-0 bg-indigo-600/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center cursor-pointer backdrop-blur-[2px]">
                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                        <span className="text-white text-[8px] font-black uppercase tracking-widest">Update Photo</span>
                      </label>
                    </div>
                    {formData.photo_url && (
                      <button 
                        type="button" 
                        onClick={() => setFormData({...formData, photo_url: ''})}
                        className="absolute -top-2 -right-2 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-600 transition-all border-2 border-white"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex-1 space-y-1 text-center md:text-left">
                    <h2 className="text-xl font-black text-indigo-700 tracking-tight uppercase">Identity Profile</h2>
                    <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] leading-relaxed">
                      Upload a clear headshot and provide legal identification details.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2 col-span-2">
                    <label className="text-[9px] font-black text-indigo-600/70 uppercase tracking-widest ml-1">Legal Name</label>
                    <div className="relative">
                      <input 
                        required
                        type="text" 
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 pl-12 text-base font-black text-black focus:border-indigo-600 focus:bg-white outline-none transition-all placeholder:text-slate-300"
                        placeholder="NAME"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <label className="text-[9px] font-black text-indigo-600/70 uppercase tracking-widest ml-1">Contact Dial</label>
                    <div className="relative">
                      <input 
                        required
                        type="tel"
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 pl-12 text-base font-black text-black focus:border-indigo-600 focus:bg-white outline-none transition-all placeholder:text-slate-300"
                        placeholder="MOBILE"
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                      />
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                  <div className="space-y-2 col-span-2 lg:col-span-4">
                    <label className="text-[9px] font-black text-indigo-600/70 uppercase tracking-widest ml-1">Full Address</label>
                    <div className="relative">
                      <textarea 
                        rows={2}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 pl-12 text-sm font-bold text-black focus:border-indigo-600 focus:bg-white outline-none transition-all placeholder:text-slate-300 resize-none"
                        placeholder="VILLAGE, PO, PS, DISTRICT, PIN"
                        value={formData.address}
                        onChange={e => setFormData({...formData, address: e.target.value})}
                      />
                      <Building2 className="absolute left-4 top-8 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-indigo-600/70 uppercase tracking-widest ml-1">Emergency Contact</label>
                    <div className="relative">
                      <input 
                        type="tel"
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 pl-12 text-base font-black text-black focus:border-indigo-600 focus:bg-white outline-none transition-all placeholder:text-slate-300"
                        placeholder="EMERGENCY PHONE"
                        value={formData.emergency_contact}
                        onChange={e => setFormData({...formData, emergency_contact: e.target.value})}
                      />
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-indigo-600/70 uppercase tracking-widest ml-1">Salary (Monthly)</label>
                    <div className="relative">
                      <input 
                        type="number"
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 pl-12 text-base font-black text-black focus:border-indigo-600 focus:bg-white outline-none transition-all placeholder:text-slate-300"
                        placeholder="0.00"
                        value={formData.salary}
                        onChange={e => setFormData({...formData, salary: e.target.value})}
                      />
                      <Save className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-indigo-600/70 uppercase tracking-widest ml-1">Joining Date</label>
                    <div className="relative">
                      <input 
                        type="date"
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 pl-12 text-base font-black text-black focus:border-indigo-600 focus:bg-white outline-none transition-all placeholder:text-slate-300"
                        value={formData.join_date}
                        onChange={e => setFormData({...formData, join_date: e.target.value})}
                      />
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-indigo-600/70 uppercase tracking-widest ml-1">Date of Birth</label>
                    <div className="relative">
                      <input 
                        type="date"
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 pl-12 text-base font-black text-black focus:border-indigo-600 focus:bg-white outline-none transition-all placeholder:text-slate-300"
                        value={formData.date_of_birth}
                        onChange={e => setFormData({...formData, date_of_birth: e.target.value})}
                      />
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                  <div className="space-y-2 lg:col-span-1">
                    <label className="text-[9px] font-black text-indigo-600/70 uppercase tracking-widest ml-1">Digital Credential (Email)</label>
                    <div className="relative">
                      <input 
                        type="email" 
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 pl-12 text-base font-black text-black focus:border-indigo-600 focus:bg-white outline-none transition-all placeholder:text-slate-300"
                        placeholder="EMAIL"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                      />
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Security Card */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white -mx-4 sm:mx-0 rounded-none sm:rounded-[32px] p-6 sm:p-8 shadow-xl border-y sm:border-2 border-slate-100"
              >
                <div className="flex items-center gap-4 mb-8 pb-4 border-b-2 border-slate-50">
                  <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-amber-700 tracking-tight uppercase">Access Control</h2>
                    <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">Permissions & Authentication</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-amber-600/70 uppercase tracking-widest ml-1">Clearance Level</label>
                    <div className="relative">
                      <select 
                        required
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 pl-12 text-base font-black text-black focus:border-amber-600 focus:bg-white outline-none transition-all appearance-none"
                        value={formData.role}
                        onChange={e => setFormData({...formData, role: e.target.value})}
                      >
                        <option value="fo">Field Officer (FO)</option>
                        <option value="branch_manager">Branch Manager (BM)</option>
                        <option value="am">Area Manager (AM)</option>
                        <option value="dm">Divisional Manager (DM)</option>
                        <option value="superadmin">Super Admin</option>
                      </select>
                      <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-amber-600/70 uppercase tracking-widest ml-1">Password {isEdit && '(Leave blank to keep current)'}</label>
                    <div className="relative">
                      <input 
                        required={!isEdit}
                        type="password" 
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 pl-12 text-base font-black text-black focus:border-amber-600 focus:bg-white outline-none transition-all placeholder:text-slate-300"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                      />
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="lg:col-span-4 space-y-8">
              {/* Assignment Card */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white -mx-4 sm:mx-0 rounded-none sm:rounded-[32px] p-6 sm:p-8 shadow-xl border-y sm:border-2 border-slate-100"
              >
                <div className="flex items-center gap-4 mb-6 pb-4 border-b-2 border-slate-50">
                  <Building2 className="h-5 w-5 text-indigo-600" />
                  <div>
                    <h3 className="text-sm font-black text-indigo-700 uppercase tracking-tight">Assignment</h3>
                    <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">Operational Unit</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-indigo-600/70 uppercase tracking-widest ml-1">Assigned Branch</label>
                    <div className="relative">
                      <select 
                        required={formData.role !== 'superadmin'}
                        disabled={formData.role === 'superadmin'}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 pl-12 text-sm font-black text-black focus:border-indigo-600 focus:bg-white outline-none transition-all appearance-none disabled:opacity-50"
                        value={formData.role === 'superadmin' ? '' : formData.branch_id}
                        onChange={e => setFormData({...formData, branch_id: e.target.value})}
                      >
                        <option value="">{formData.role === 'superadmin' ? 'Global Oversight' : 'Select Branch Unit'}</option>
                        {branches.map(b => (
                          <option key={b.id} value={b.id}>{b.branch_name}</option>
                        ))}
                      </select>
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>
                  </div>

                  {formData.role !== 'superadmin' && (
                    <div className="pt-4">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Site Status</label>
                      <div className="flex p-1 bg-slate-100 rounded-[20px]">
                        <button 
                          type="button" 
                          onClick={() => setFormData({...formData, status: 'active'})}
                          className={cn("flex-1 py-3 rounded-[16px] text-[9px] font-black uppercase tracking-[0.2em] transition-all", formData.status === 'active' ? "bg-white text-emerald-600 shadow-md" : "text-slate-500")}
                        >
                          Active
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setFormData({...formData, status: 'inactive'})}
                          className={cn("flex-1 py-3 rounded-[16px] text-[9px] font-black uppercase tracking-[0.2em] transition-all", formData.status === 'inactive' ? "bg-rose-600 text-white shadow-md" : "text-slate-500")}
                        >
                          Suspended
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Action Card */}
              <div className="bg-indigo-600 -mx-4 sm:mx-0 rounded-none sm:rounded-[32px] p-6 sm:p-8 text-white shadow-2xl shadow-indigo-200 group">
                <div className="space-y-6 text-center">
                   <div className="flex flex-col items-center gap-3">
                     <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
                       <UserCheck className="w-6 h-6 text-white" />
                     </div>
                     <h3 className="text-base font-black uppercase tracking-[0.2em]">Identity Confirm</h3>
                   </div>
                   
                   <button 
                     type="submit" 
                     disabled={loading}
                     className="w-full bg-white text-indigo-600 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-3 hover:scale-[1.03] active:scale-[0.97]"
                   >
                     {loading ? <div className="w-5 h-5 border-2 border-indigo-600/30 border-t-indigo-600 animate-spin rounded-full"></div> : <><Save className="h-5 w-5" /> {isEdit ? 'Update Details' : 'Finalize Staff'}</>}
                   </button>
                   
                   <p className="text-white/40 text-[8px] font-bold uppercase tracking-widest leading-relaxed">
                     By clicking commit, you are authorizing system access with assigned privilege levels
                   </p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
