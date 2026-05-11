import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { fetchWithAuth } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { 
  Building2, Users, MapPin, Calendar, Clock, 
  FileText, UserCircle, Phone, Navigation, Camera,
  Briefcase, CheckCircle2, ChevronLeft, Save,
  RefreshCcw, Info
} from 'lucide-react';
import { voiceFeedback } from '../lib/voice';

export default function GroupForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    branch_id: user?.branchId || '',
    collector_id: '',
    center_name: '',
    center_code: '',
    village: '',
    meeting_location: '',
    group_name: '',
    group_code: '',
    formation_date: new Date().toISOString().split('T')[0],
    meeting_day: 'Sunday',
    meeting_time: '10:00',
    status: 'Active',
    description: '',
    leader: {
      name: '',
      mobile: '',
      alt_mobile: '',
      address: '',
      occupation: ''
    }
  });

  useEffect(() => {
    Promise.all([
      user?.role === 'superadmin' ? fetchWithAuth('/branches') : Promise.resolve([]),
      fetchWithAuth('/employees')
    ]).then(([branchData, empData]) => {
      setBranches(branchData);
      setEmployees(empData);
    }).catch(console.error);

    if (id) {
      fetchWithAuth(`/groups/${id}`).then((res) => {
        let leaderData = res.leader || {
          name: '', mobile: '', alt_mobile: '', address: '', occupation: ''
        };
        setFormData({
          branch_id: res.branch_id || '',
          collector_id: res.collector_id || '',
          center_name: res.center_name || '',
          center_code: res.center_code || '',
          village: res.village || '',
          meeting_location: res.meeting_location || '',
          group_name: res.group_name || '',
          group_code: res.group_code || '',
          formation_date: res.formation_date ? res.formation_date.split('T')[0] : '',
          meeting_day: res.meeting_day || 'Sunday',
          meeting_time: res.meeting_time || '10:00',
          status: res.status || 'Active',
          description: res.description || '',
          leader: leaderData
        });
      }).catch(console.error);
    }
  }, [id, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('leader.')) {
      const leaderField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        leader: {
          ...prev.leader,
          [leaderField]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleReset = () => {
    if(!confirm("Are you sure you want to reset the form?")) return;
    setFormData({
      branch_id: user?.branchId || '', collector_id: '',
      center_name: '', center_code: '', village: '', meeting_location: '',
      group_name: '', group_code: '', formation_date: new Date().toISOString().split('T')[0],
      meeting_day: 'Sunday', meeting_time: '10:00',
      status: 'Active', description: '',
      leader: {
        name: '', mobile: '', alt_mobile: '', address: '', occupation: ''
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.group_name || !formData.branch_id || !formData.collector_id || !formData.center_name || !formData.village || !formData.formation_date || !formData.leader.name || !formData.leader.mobile) {
      alert("Please fill all required fields.");
      return;
    }
    if (formData.leader.mobile.length !== 10) {
      alert("Leader mobile number must be exactly 10 digits.");
      return;
    }

    try {
      setLoading(true);
      if (id) {
        await fetchWithAuth(`/groups/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      } else {
        await fetchWithAuth('/groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }
      voiceFeedback.success();
      navigate('/groups');
    } catch (err: any) {
      alert(err.message);
      voiceFeedback.error();
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = user?.role === 'superadmin' 
    ? employees.filter(e => !formData.branch_id || e.branch_id === parseInt(formData.branch_id.toString()))
    : ['fo'].includes(user?.role || '')
      ? employees.filter(e => e.id === user?.id)
      : employees.filter(e => e.branch_id === user?.branchId);

  useEffect(() => {
    if (!id && ['fo'].includes(user?.role || '') && user?.id) {
      if (formData.collector_id !== String(user.id)) {
        setFormData(prev => ({ ...prev, collector_id: String(user.id) }));
      }
    }
  }, [user, id]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-full lg:max-w-4xl mx-auto px-0 sm:px-4 py-6 pb-20"
    >
      <div className="flex items-center gap-4 mb-8 px-4 sm:px-0">
        <button 
          type="button"
          onClick={() => navigate('/groups')}
          className="w-10 h-10 bg-white border border-slate-200 text-slate-500 rounded-full flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
            {id ? 'Edit Group' : 'Create New Group'}
          </h1>
          <p className="text-[10px] sm:text-xs font-bold text-slate-500 tracking-widest uppercase mt-1">
            Setup your Joint Liability Group (JLG)
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        
        {/* SECTION 1: BRANCH & STAFF */}
        <div className="bg-white sm:rounded-[24px] shadow-sm border-y sm:border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-indigo-100 px-4 sm:px-6 py-4 flex items-center gap-3">
             <div className="bg-white p-2 rounded-lg shadow-sm border border-blue-100">
               <Building2 className="w-5 h-5 text-blue-600" />
             </div>
             <h2 className="text-[11px] sm:text-[13px] font-black text-slate-800 tracking-widest uppercase">Branch & Staff</h2>
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {user?.role === 'superadmin' ? (
              <div className="col-span-1">
                <label className="block text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 sm:mb-2 ml-1 sm:ml-0">Branch <span className="text-rose-500">*</span></label>
                <select 
                  name="branch_id" value={formData.branch_id} onChange={handleChange} required
                  className="w-full border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50 focus:bg-white"
                >
                  <option value="">Select Branch</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.branch_name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="col-span-1">
                <label className="block text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 sm:mb-2 ml-1 sm:ml-0">Branch</label>
                <div className="w-full border border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm bg-slate-100/50 text-slate-500 flex items-center shadow-inner cursor-not-allowed">
                  {branches.find(b => b.id === user?.branchId)?.branch_name || 'Your Branch'}
                </div>
              </div>
            )}
            <div className="col-span-1">
              <label className="block text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 sm:mb-2 ml-1 sm:ml-0">Field Officer / Staff <span className="text-rose-500">*</span></label>
              {['fo'].includes(user?.role || '') ? (
                <div className="w-full border border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm bg-slate-100/50 text-slate-500 flex items-center shadow-inner cursor-not-allowed">
                  {user?.name || 'Your Profile'}
                </div>
              ) : (
                <select 
                  name="collector_id" value={formData.collector_id} onChange={handleChange} required
                  className="w-full border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50 focus:bg-white"
                >
                  <option value="">Select Staff</option>
                  {filteredEmployees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: CENTER & LOCATION */}
        <div className="bg-white sm:rounded-[24px] shadow-sm border-y sm:border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 px-4 sm:px-6 py-4 flex items-center gap-3">
             <div className="bg-white p-2 rounded-lg shadow-sm border border-emerald-100">
               <MapPin className="w-5 h-5 text-emerald-600" />
             </div>
             <h2 className="text-[11px] sm:text-[13px] font-black text-slate-800 tracking-widest uppercase">Center & Location</h2>
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <div className="col-span-1 border-r border-slate-100 sm:border-0 pr-3 sm:pr-0">
              <label className="block text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 sm:mb-2 ml-1 sm:ml-0">Center Name <span className="text-rose-500">*</span></label>
              <input 
                type="text" name="center_name" value={formData.center_name} onChange={handleChange} required
                placeholder="Ex: Nischintapur Center"
                className="w-full border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-slate-50 focus:bg-white"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 sm:mb-2 ml-1 sm:ml-0">Center Code</label>
              <div className="w-full border border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm bg-slate-100/50 text-slate-400 font-medium flex items-center shadow-inner cursor-not-allowed">
                <span className="truncate">{formData.center_code || 'Auto'}</span>
              </div>
            </div>
            <div className="col-span-1 border-r border-slate-100 sm:border-0 pr-3 sm:pr-0">
              <label className="block text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 sm:mb-2 ml-1 sm:ml-0">Village / Area <span className="text-rose-500">*</span></label>
              <div className="relative">
                <Navigation className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-3 top-3.5 text-slate-400" />
                <input 
                  type="text" name="village" value={formData.village} onChange={handleChange} required
                  placeholder="Ex: Rampurhut"
                  className="w-full pl-8 sm:pl-9 border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-slate-50 focus:bg-white"
                />
              </div>
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 sm:mb-2 ml-1 sm:ml-0">Meeting Location <span className="text-rose-500">*</span></label>
               <input 
                  type="text" name="meeting_location" value={formData.meeting_location} onChange={handleChange} required
                  placeholder="Ex: Community Hall"
                  className="w-full border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-slate-50 focus:bg-white"
                />
            </div>
          </div>
        </div>

        {/* SECTION 3: GROUP DETAILS */}
        <div className="bg-white sm:rounded-[24px] shadow-sm border-y sm:border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100 px-4 sm:px-6 py-4 flex items-center gap-3">
             <div className="bg-white p-2 rounded-lg shadow-sm border border-violet-100">
               <Users className="w-5 h-5 text-violet-600" />
             </div>
             <h2 className="text-[11px] sm:text-[13px] font-black text-slate-800 tracking-widest uppercase">Group Details</h2>
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <div className="col-span-1 border-r border-slate-100 sm:border-0 pr-3 sm:pr-0">
              <label className="block text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 sm:mb-2 ml-1 sm:ml-0">Group Name <span className="text-rose-500">*</span></label>
              <input 
                type="text" name="group_name" value={formData.group_name} onChange={handleChange} required
                placeholder="Ex: Rose Group"
                className="w-full border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-slate-50 focus:bg-white"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 sm:mb-2 ml-1 sm:ml-0">Group Code</label>
              <div className="w-full border border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm bg-slate-100/50 text-slate-400 font-medium flex items-center shadow-inner cursor-not-allowed">
                <span className="truncate">{formData.group_code || 'Auto'}</span>
              </div>
            </div>
            <div className="col-span-1 border-r border-slate-100 sm:border-0 pr-3 sm:pr-0">
              <label className="block text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 sm:mb-2 ml-1 sm:ml-0">Formation Date <span className="text-rose-500">*</span></label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-3 top-3 text-slate-400" />
                <input 
                  type="date" name="formation_date" value={formData.formation_date} onChange={handleChange} required
                  className="w-full pl-8 sm:pl-9 border border-slate-300 rounded-xl px-2 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-slate-50 focus:bg-white text-clip"
                />
              </div>
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 sm:mb-2 ml-1 sm:ml-0">Meeting Day</label>
              <select 
                name="meeting_day" value={formData.meeting_day} onChange={handleChange}
                className="w-full border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-slate-50 focus:bg-white"
              >
                {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="col-span-1 border-r border-slate-100 sm:border-0 pr-3 sm:pr-0">
              <label className="block text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 sm:mb-2 ml-1 sm:ml-0">Meeting Time</label>
               <div className="relative">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-3 top-3 text-slate-400" />
                <input 
                  type="time" name="meeting_time" value={formData.meeting_time} onChange={handleChange}
                  className="w-full pl-8 sm:pl-9 border border-slate-300 rounded-xl px-2 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-slate-50 focus:bg-white"
                />
              </div>
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 sm:mb-2 ml-1 sm:ml-0">Status</label>
              <select 
                name="status" value={formData.status} onChange={handleChange}
                className="w-full border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-slate-50 focus:bg-white"
              >
                 <option value="Active">Active</option>
                 <option value="Closed">Closed</option>
              </select>
            </div>
            <div className="col-span-2 lg:col-span-2">
               <label className="block text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 sm:mb-2 ml-1 sm:ml-0">Description / Notes</label>
               <textarea 
                  name="description" value={formData.description} onChange={handleChange} rows={1}
                  placeholder="Enter any additional details about the group..."
                  className="w-full border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-slate-50 focus:bg-white resize-none"
               />
            </div>
          </div>
        </div>

        {/* SECTION 4: GROUP LEADER DETAILS */}
        <div className="bg-white sm:rounded-[24px] shadow-sm border-y sm:border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 px-4 sm:px-6 py-4 flex items-center gap-3">
             <div className="bg-white p-2 rounded-lg shadow-sm border border-amber-100">
               <UserCircle className="w-5 h-5 text-amber-600" />
             </div>
             <h2 className="text-[11px] sm:text-[13px] font-black text-slate-800 tracking-widest uppercase">Leader Details</h2>
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <div className="col-span-1 border-r border-slate-100 sm:border-0 pr-3 sm:pr-0">
              <label className="block text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 sm:mb-2 ml-1 sm:ml-0">Leader Name <span className="text-rose-500">*</span></label>
              <input 
                type="text" name="leader.name" value={formData.leader.name} onChange={handleChange} required
                placeholder="Ex: Rahima Bibi"
                className="w-full border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-slate-50 focus:bg-white"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 sm:mb-2 ml-1 sm:ml-0">Mobile <span className="text-rose-500">*</span></label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-3 top-3.5 text-slate-400" />
                <input 
                  type="text" maxLength={10} name="leader.mobile" value={formData.leader.mobile} onChange={handleChange} required pattern="\d{10}"
                  placeholder="10 digit"
                  className="w-full pl-8 sm:pl-9 border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-slate-50 focus:bg-white"
                />
              </div>
            </div>
            <div className="col-span-1 border-r border-slate-100 sm:border-0 pr-3 sm:pr-0">
              <label className="block text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 sm:mb-2 ml-1 sm:ml-0">Alt Mobile</label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-3 top-3.5 text-slate-400" />
                <input 
                  type="text" maxLength={10} name="leader.alt_mobile" value={formData.leader.alt_mobile} onChange={handleChange}
                  placeholder="Optional"
                  className="w-full pl-8 sm:pl-9 border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-slate-50 focus:bg-white"
                />
              </div>
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 sm:mb-2 ml-1 sm:ml-0">Occupation</label>
               <div className="relative">
                <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-3 top-3.5 text-slate-400" />
                <input 
                  type="text" name="leader.occupation" value={formData.leader.occupation} onChange={handleChange}
                  placeholder="Ex: Farming"
                  className="w-full pl-8 sm:pl-9 border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-slate-50 focus:bg-white"
                />
              </div>
            </div>
            <div className="col-span-2 lg:col-span-4">
               <label className="block text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 sm:mb-2 ml-1 sm:ml-0">Residential Address</label>
               <textarea 
                  name="leader.address" value={formData.leader.address} onChange={handleChange} rows={1}
                  placeholder="Full address details..."
                  className="w-full border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-slate-50 focus:bg-white resize-none"
               />
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4 px-4 sm:px-0">
           <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className="sm:w-1/4 bg-white text-slate-600 border border-slate-200 shadow-sm px-8 py-4 rounded-xl text-sm font-black uppercase tracking-[0.15em] hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
           >
              <RefreshCcw className="w-4 h-4" />
              Reset
           </button>
           <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-8 py-4 rounded-xl text-sm font-black uppercase tracking-[0.15em] hover:from-indigo-700 hover:to-violet-700 transition-all active:scale-[0.98] shadow-md shadow-indigo-500/20 flex items-center justify-center gap-3 disabled:opacity-70"
           >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {id ? 'Save Changes' : 'Save JLG Group'}
                </>
              )}
           </button>
        </div>

      </form>
    </motion.div>
  );
}

