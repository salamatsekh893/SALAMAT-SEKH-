import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  Users, Search, Plus, Trash2, Edit2, 
  ExternalLink, Loader2, Phone, MapPin, QrCode, X, Filter, Download
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchWithAuth } from '../lib/api';
import { formatAmount } from '../lib/utils';
import { voiceFeedback } from '../lib/voice';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { usePermissions } from '../hooks/usePermissions';

export default function Members() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const groupFilter = searchParams.get('group');
  
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [memberLoans, setMemberLoans] = useState<any[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [viewerImage, setViewerImage] = useState<string | null>(null);

  useEffect(() => {
    if (selectedMember) {
      setLoadingLoans(true);
      fetchWithAuth(`/members/${selectedMember.id}/loans`)
        .then(data => setMemberLoans(data))
        .catch(err => console.error("Failed to fetch member loans", err))
        .finally(() => setLoadingLoans(false));
    } else {
      setMemberLoans([]);
    }
  }, [selectedMember]);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const data = await fetchWithAuth('/members');
        setMembers(data);
      } catch (err) {
        console.error('Failed to fetch members');
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this member record? This cannot be undone.')) return;
    try {
      await fetchWithAuth(`/members/${id}`, { method: 'DELETE' });
      setMembers(prev => prev.filter(m => m.id !== id));
      voiceFeedback.success();
    } catch (err: any) {
      voiceFeedback.error();
      alert(err.message || 'সদস্য ডিলিট করা যায়নি।');
    }
  };

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchSearch = m.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.member_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.aadhar_no?.includes(searchTerm) ||
        m.mobile_no?.includes(searchTerm);
      
      const matchGroup = groupFilter ? m.group_id?.toString() === groupFilter : true;
      
      return matchSearch && matchGroup;
    });
  }, [members, searchTerm, groupFilter]);

  const clearGroupFilter = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('group');
    setSearchParams(newParams);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Syncing Member Directory</span>
    </div>
  );

  return (
    <div className="space-y-8 pb-10">
      {/* Header Card */}
      <div className="bg-white rounded-[42px] p-6 sm:p-10 shadow-xl shadow-indigo-500/5 border border-slate-100">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-10 border-b border-slate-100 pb-8">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">Beneficiary Ledger</h1>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {members.length} ACTIVE PROFILES REGISTERED
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-4">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="SEARCH BY NAME, CODE OR AADHAR..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-[11px] font-black tracking-widest text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all uppercase"
              />
            </div>
            {groupFilter && (
              <button 
                onClick={clearGroupFilter}
                className="bg-indigo-50 text-indigo-600 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-indigo-100 transition-all border border-indigo-100"
              >
                <Filter className="w-4 h-4" />
                Clear Group Filter
              </button>
            )}
            {canCreate && (
              <button 
                onClick={() => navigate('/members/new')} 
                className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Register New Member
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto -mx-6 sm:-mx-10">
          <div className="hidden md:block">
            <table className="w-full border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] px-8 py-5 border-b border-slate-100">Identity & ID</th>
                  <th className="text-left text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] px-8 py-5 border-b border-slate-100">Contact & Address</th>
                  <th className="text-left text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] px-8 py-5 border-b border-slate-100">JLG Information</th>
                  <th className="text-left text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] px-8 py-5 border-b border-slate-100">KYC Status</th>
                  <th className="text-right text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] px-8 py-5 border-b border-slate-100">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence mode="popLayout">
                  {filteredMembers.map((member) => (
                    <motion.tr 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      key={member.id} 
                      className="group hover:bg-indigo-50/30 transition-all duration-300"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex-shrink-0 overflow-hidden border-2 border-slate-50">
                            {member.profile_image ? (
                              <img src={member.profile_image} alt={member.full_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <Users className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-[14px] font-black text-slate-900 tracking-tight uppercase group-hover:text-indigo-600 transition-colors uppercase">{member.full_name}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-lg tracking-widest">{member.member_code}</span>
                              <span className="text-[9px] font-bold text-slate-400 tracking-tight flex items-center gap-1 uppercase">
                                <QrCode className="w-2.5 h-2.5" />
                                {member.aadhar_no}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-[12px] font-black text-slate-700">
                            <Phone className="w-3.5 h-3.5 text-slate-300" />
                            {member.mobile_no}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400 uppercase tracking-tight">
                            <MapPin className="w-3.5 h-3.5" />
                            {member.village}, {member.district}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1.5">
                          <span className="inline-flex px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-emerald-100 self-start">
                            {member.group_id ? 'GROUP MEMBER' : 'INDIVIDUAL'}
                          </span>
                          {member.join_date && (
                            <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">ENROLLED: {format(new Date(member.join_date), 'dd MMM yyyy')}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-1.5">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            member.customer_signature && member.profile_image ? "bg-emerald-500" : "bg-amber-500"
                          )} />
                          <span className="text-[10px] font-black tracking-widest uppercase text-slate-600">
                            {member.customer_signature && member.profile_image ? 'VERIFIED' : 'PENDING DOCS'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2">
                          {canEdit && (
                            <button 
                              onClick={() => navigate(`/members/edit/${member.id}`)}
                              className="w-10 h-10 flex items-center justify-center bg-white text-slate-400 hover:text-indigo-600 border border-slate-100 rounded-xl transition-all shadow-sm hover:shadow-md hover:border-indigo-100"
                              title="Manage Profile"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button 
                              onClick={() => handleDelete(member.id)}
                              className="w-10 h-10 flex items-center justify-center bg-white text-slate-400 hover:text-rose-600 border border-slate-100 rounded-xl transition-all shadow-sm hover:shadow-md hover:border-rose-100"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button 
                            onClick={() => setSelectedMember(member)}
                            className="w-10 h-10 flex items-center justify-center bg-white text-slate-400 hover:text-emerald-600 border border-slate-100 rounded-xl transition-all shadow-sm hover:shadow-md hover:border-emerald-100"
                            title="View Dossier"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
                {filteredMembers.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="p-20 text-slate-400 text-center flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center opacity-50">
                        <Search className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50">No Member Records Found</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="block md:hidden space-y-4 px-6 md:px-0">
            <AnimatePresence mode="popLayout">
              {filteredMembers.length === 0 && !loading ? (
                <div className="p-10 text-slate-400 text-center flex flex-col items-center gap-4 bg-slate-50 rounded-3xl">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                    <Search className="w-5 h-5 text-slate-300" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50">Zero records found</span>
                </div>
              ) : (
                filteredMembers.map((member) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={member.id}
                    className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
                  >
                    <div className="p-4 border-b border-slate-100 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 border-2 border-indigo-100 overflow-hidden flex-shrink-0">
                        {member.profile_image ? (
                          <img src={member.profile_image} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-indigo-300"><Users className="w-5 h-5" /></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-black text-slate-900 tracking-tight uppercase text-sm leading-tight">{member.full_name}</h3>
                        <div className="flex gap-2 items-center mt-1">
                          <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-widest">{member.member_code}</span>
                          <div className={cn("w-1.5 h-1.5 rounded-full", member.customer_signature ? "bg-emerald-500" : "bg-amber-400")} />
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 grid grid-cols-2 gap-4 bg-slate-50/50">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Phone</span>
                        <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                           <Phone className="w-3 h-3 text-slate-400" /> {member.mobile_no}
                        </div>
                      </div>
                      <div>
                         <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Aadhar</span>
                         <div className="text-xs font-bold text-slate-700">{member.aadhar_no || 'N/A'}</div>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Address</span>
                        <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5 truncate">
                           <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> <span className="truncate">{member.village}, {member.district}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="px-4 py-3 bg-white border-t border-slate-100 flex gap-2 justify-end">
                      <button 
                        onClick={() => setSelectedMember(member)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-white text-indigo-600 border border-indigo-200 rounded-xl px-3 py-2 transition-all shadow-sm font-bold text-xs uppercase tracking-widest hover:bg-indigo-50"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> View
                      </button>
                      <button 
                        onClick={() => navigate(`/members/edit/${member.id}`)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-white text-blue-600 border border-blue-200 rounded-xl px-3 py-2 transition-all shadow-sm font-bold text-xs uppercase tracking-widest hover:bg-blue-50"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button 
                         disabled={user?.role !== 'superadmin'}
                         onClick={() => handleDelete(member.id)}
                         className="w-10 flex flex-shrink-0 items-center justify-center bg-white text-rose-600 border border-rose-200 rounded-xl py-2 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-rose-50 transition-all shadow-sm"
                      >
                         <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedMember && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-slate-50 sm:rounded-[32px] rounded-t-[32px] w-full h-[90vh] sm:h-auto sm:max-h-[90vh] max-w-5xl overflow-y-auto shadow-2xl relative flex flex-col"
            >
              <div className="sticky top-0 z-10 bg-slate-50/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between sm:rounded-t-[32px] rounded-t-[32px]">
                <h2 className="text-xl font-black uppercase tracking-widest text-slate-900">
                  Beneficiary Dossier
                </h2>
                <button 
                  onClick={() => setSelectedMember(null)}
                  className="w-10 h-10 bg-white hover:bg-slate-100 text-slate-600 rounded-full flex items-center justify-center transition-all shadow-sm border border-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 sm:p-10 flex-1 overflow-y-auto">
                {/* Header profile section */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 mb-10 pb-8 border-b border-slate-200">
                  <div className="w-32 h-32 rounded-[2rem] bg-indigo-100 border-4 border-white shadow-xl shadow-indigo-500/10 overflow-hidden flex-shrink-0">
                    {selectedMember.profile_image ? (
                      <img src={selectedMember.profile_image} className="w-full h-full object-cover" alt={selectedMember.full_name} referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-indigo-300">
                         <Users className="w-12 h-12" />
                      </div>
                    )}
                  </div>
                  <div className="text-center sm:text-left flex-1">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase mb-2">{selectedMember.full_name}</h1>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                      <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-black tracking-widest uppercase rounded-lg border border-indigo-200">
                        {selectedMember.member_code}
                      </span>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-black tracking-widest uppercase rounded-lg border border-emerald-200">
                        {selectedMember.status || 'ACTIVE'}
                      </span>
                      {selectedMember.group_id && (
                        <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-black tracking-widest uppercase rounded-lg border border-amber-200">
                          GROUP: {selectedMember.group_id}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-sm font-black uppercase text-indigo-600 tracking-widest border-l-4 border-indigo-600 pl-4 mb-6">Personal Data</h3>
                      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Aadhar No</span>
                          <p className="text-sm font-black text-slate-800">{selectedMember.aadhar_no || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Mobile</span>
                          <p className="text-sm font-black text-slate-800">{selectedMember.mobile_no || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Form No</span>
                          <p className="text-sm font-black text-slate-800">{selectedMember.form_no || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Ration Card</span>
                          <p className="text-sm font-black text-slate-800">{selectedMember.ration_card || 'N/A'}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Guardian</span>
                          <p className="text-sm font-black text-slate-800 uppercase">{selectedMember.guardian_name} <span className="text-slate-400">({selectedMember.guardian_type})</span></p>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Address</span>
                          <p className="text-sm font-bold text-slate-800 uppercase leading-snug">
                            {selectedMember.village}, PO: {selectedMember.post_office}<br/>
                            PS: {selectedMember.police_station}, Dist: {selectedMember.district}<br/>
                            {selectedMember.state} - {selectedMember.pin_code}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-black uppercase text-amber-600 tracking-widest border-l-4 border-amber-600 pl-4 mb-6">Banking Data</h3>
                      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Bank Name</span>
                            <p className="text-sm font-bold text-slate-800 uppercase">{selectedMember.mem_bank_name || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">IFSC</span>
                            <p className="text-sm font-bold text-slate-800 uppercase">{selectedMember.mem_bank_ifsc || 'N/A'}</p>
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Account No</span>
                          <p className="text-lg font-black text-slate-900 tracking-widest">{selectedMember.mem_bank_ac || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                       <h3 className="text-sm font-black uppercase text-slate-600 tracking-widest border-l-4 border-slate-600 pl-4 mb-6">Customer Signature</h3>
                       <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center">
                          {selectedMember.signature ? (
                            <img src={selectedMember.signature} className="h-24 object-contain mix-blend-multiply" alt="Signature" />
                          ) : (
                            <div className="h-24 flex items-center justify-center flex-col text-slate-300">
                              <span className="text-xs font-black uppercase tracking-widest">No Signature On File</span>
                            </div>
                          )}
                       </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-sm font-black uppercase text-indigo-600 tracking-widest border-l-4 border-indigo-600 pl-4 mb-6">Active & Past Loans</h3>
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                      {loadingLoans ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-4">
                          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Fetching Loans</span>
                        </div>
                      ) : memberLoans.length > 0 ? (
                        <div className="space-y-4">
                          {memberLoans.map(loan => {
                            const outstanding = (parseFloat(loan.total_repayment) || 0) - (parseFloat(loan.total_paid) || 0);
                            return (
                              <div key={loan.id} className="border border-slate-100 rounded-2xl p-4 hover:border-indigo-200 transition-colors bg-slate-50">
                                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
                                  <div className="flex gap-2 items-center">
                                    <span className="text-xs font-black text-slate-800">{loan.loan_no || 'NA'}</span>
                                    <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded", loan.status === 'active' ? "bg-emerald-100 text-emerald-700" : loan.status === 'closed' ? "bg-slate-200 text-slate-600" : "bg-amber-100 text-amber-700")}>
                                      {loan.status}
                                    </span>
                                  </div>
                                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">
                                    {format(new Date(loan.created_at || new Date()), 'dd MMM yyyy')}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                  <div>
                                    <span className="block text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-1">Principal (Asol)</span>
                                    <span className="text-sm font-black text-slate-800">₹{formatAmount(loan.amount)}</span>
                                  </div>
                                  <div>
                                    <span className="block text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-1">Total w/ Int</span>
                                    <span className="text-sm font-black text-slate-700">₹{formatAmount(loan.total_repayment)}</span>
                                  </div>
                                  <div>
                                    <span className="block text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-1">Total Paid</span>
                                    <span className="text-sm font-black text-emerald-600">₹{formatAmount(loan.total_paid || 0)}</span>
                                  </div>
                                  <div>
                                    <span className="block text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-1">Outstanding</span>
                                    <span className="text-sm font-black text-rose-600">₹{outstanding > 0 ? formatAmount(outstanding) : 0}</span>
                                  </div>
                                </div>
                                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-2 text-[10px] uppercase tracking-widest font-bold">
                                  <button onClick={() => navigate(`/loans/card/${loan.id}`)} className="text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1">
                                    <ExternalLink className="w-3 h-3" /> View Passbook
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-10 flex flex-col items-center justify-center text-slate-400">
                          <span className="text-[10px] font-black uppercase tracking-[0.3em]">No loans assigned</span>
                        </div>
                      )}
                    </div>

                    <h3 className="text-sm font-black uppercase text-emerald-600 tracking-widest border-l-4 border-emerald-600 pl-4 mb-6 mt-8">Identity Documents</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Doc Box Maker */}
                      {[
                        { label: 'House Photo', img: selectedMember.house_image },
                        { label: 'Aadhar Front', img: selectedMember.aadhar_f_image },
                        { label: 'Aadhar Back', img: selectedMember.aadhar_b_image },
                        { label: 'Voter Front', img: selectedMember.voter_f_image },
                        { label: 'Voter Back', img: selectedMember.voter_b_image },
                      ].map((doc, idx) => (
                        <div key={idx} className="bg-white rounded-3xl p-3 shadow-sm border border-slate-200 flex flex-col">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block text-center">{doc.label}</span>
                           <div 
                             className={cn("bg-slate-50 rounded-2xl h-32 flex items-center justify-center overflow-hidden border border-slate-100 relative group", doc.img && "cursor-pointer")}
                             onClick={() => doc.img && setViewerImage(doc.img)}
                           >
                             {doc.img ? (
                               <>
                                 <img src={doc.img} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={doc.label} referrerPolicy="no-referrer" />
                                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <ExternalLink className="w-6 h-6 text-white" />
                                 </div>
                               </>
                             ) : (
                               <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Missing</span>
                             )}
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewerImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          >
            <div className="absolute top-4 right-4 flex items-center gap-4">
              <a
                href={viewerImage}
                download="document.jpg"
                className="text-white hover:text-white/70 p-2 transition-colors bg-black/50 rounded-full"
                title="Download"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="w-8 h-8" />
              </a>
              <button 
                onClick={() => setViewerImage(null)}
                className="text-white hover:text-white/70 p-2 transition-colors bg-black/50 rounded-full"
              >
                <X className="w-8 h-8" />
              </button>
            </div>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={viewerImage}
              className="max-w-full max-h-[90vh] object-contain rounded-xl"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
