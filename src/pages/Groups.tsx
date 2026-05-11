import { useState, useEffect, useMemo } from 'react';
import { fetchWithAuth } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { Plus, UsersRound, Calendar, Edit2, Trash2, Home, User, Search, MapPin, Building2, ChevronLeft, ChevronRight, Activity, Filter, Eye, Phone, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { voiceFeedback } from '../lib/voice';

import { usePermissions } from '../hooks/usePermissions';

export default function Groups() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  
  const [groups, setGroups] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dayFilter, setDayFilter] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetchWithAuth('/groups'),
      fetchWithAuth('/branches').catch(() => []),
      fetchWithAuth('/employees').catch(() => [])
    ])
    .then(([grpData, branchData, empData]) => {
      setGroups(grpData);
      setBranches(branchData);
      setEmployees(empData);
    })
    .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this group? All associated members will be unassigned.')) return;
    try {
      await fetchWithAuth(`/groups/${id}`, { method: 'DELETE' });
      voiceFeedback.success();
      loadData();
    } catch (err: any) {
      alert(err.message);
      voiceFeedback.error();
    }
  };

  // Filter Logic
  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      const gName = (g.group_name || '').toLowerCase();
      const gCode = (g.group_code || '').toLowerCase();
      const lMobile = (g.leaderMobile || '').toLowerCase();
      const sq = searchQuery.toLowerCase();
      
      const matchesSearch = gName.includes(sq) || gCode.includes(sq) || lMobile.includes(sq);
      const matchesBranch = branchFilter ? g.branch_id?.toString() === branchFilter : true;
      const matchesStaff = staffFilter ? g.collector_id?.toString() === staffFilter : true;
      const matchesStatus = statusFilter ? g.status?.toString().toLowerCase() === statusFilter.toLowerCase() : true;
      const matchesDay = dayFilter ? g.meeting_day === dayFilter : true;

      return matchesSearch && matchesBranch && matchesStaff && matchesStatus && matchesDay;
    });
  }, [groups, searchQuery, branchFilter, staffFilter, statusFilter, dayFilter]);

  // Derived Staff for Filter (filtered by branch if BM or if Branch selected)
  const availableStaff = useMemo(() => {
    if (user?.role === 'branch_manager') {
      return employees.filter(e => e.branch_id === user.branchId);
    }
    if (branchFilter) {
      return employees.filter(e => e.branch_id?.toString() === branchFilter);
    }
    return employees;
  }, [employees, branchFilter, user]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredGroups.length / itemsPerPage);
  const paginatedGroups = filteredGroups.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const isAdmin = user?.role === 'superadmin';
  const isBM = user?.role === 'branch_manager';
  const isStaff = user?.role === 'employee' || user?.role === 'staff' || user?.role === 'fo';

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Loading Groups...</p>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto px-4 py-8 pb-24"
    >
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pt-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0">
             <UsersRound className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">Joint Liability Groups</h1>
            <p className="text-slate-500 font-bold text-[10px] sm:text-xs mt-1.5 uppercase tracking-widest leading-none">Manage Centers & Member Groups</p>
          </div>
        </div>
        
        {canCreate && (
          <button 
            onClick={() => navigate('/groups/new')} 
            className="bg-slate-900 text-white px-6 py-4 sm:py-3.5 rounded-xl text-xs font-black uppercase tracking-[0.15em] hover:bg-slate-800 transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 w-full md:w-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            Create New Group
          </button>
        )}
      </div>

      {/* FILTERS SECTION */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
           <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input 
                 type="text" 
                 placeholder="Search by name, code or leader mobile..." 
                 className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
              />
           </div>
           
           {isAdmin && (
             <div className="w-full md:w-48 shrink-0">
               <select 
                 className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                 value={branchFilter}
                 onChange={(e) => { setBranchFilter(e.target.value); setStaffFilter(''); setCurrentPage(1); }}
               >
                 <option value="">All Branches</option>
                 {branches.map(b => (
                   <option key={b.id} value={b.id}>{b.branch_name}</option>
                 ))}
               </select>
             </div>
           )}

           {(isAdmin || isBM) && (
             <div className="w-full md:w-48 shrink-0">
               <select 
                 className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                 value={staffFilter}
                 onChange={(e) => { setStaffFilter(e.target.value); setCurrentPage(1); }}
               >
                 <option value="">All Staff</option>
                 {availableStaff.map(s => (
                   <option key={s.id} value={s.id}>{s.name}</option>
                 ))}
               </select>
             </div>
           )}

           <div className="w-full md:w-40 shrink-0">
             <select 
               className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
               value={statusFilter}
               onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
             >
               <option value="">All Status</option>
               <option value="active">Active</option>
               <option value="closed">Closed</option>
             </select>
           </div>
        </div>
      </div>

      {/* DESKTOP TABLE */}
      <div className="hidden lg:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden relative min-h-[400px]">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-black tracking-widest text-slate-500">
                     <th className="p-4 pl-6 whitespace-nowrap">Group Code/Name</th>
                     <th className="p-4 whitespace-nowrap">Center & Location</th>
                     <th className="p-4 whitespace-nowrap">Leader Info</th>
                     <th className="p-4 whitespace-nowrap">Staff & Branch</th>
                     <th className="p-4 whitespace-nowrap">Meeting Schedule</th>
                     <th className="p-4 whitespace-nowrap">Created Date</th>
                     <th className="p-4 whitespace-nowrap">Status</th>
                     <th className="p-4 pr-6 text-right whitespace-nowrap">Actions</th>
                  </tr>
               </thead>
               <tbody className="text-sm">
                  {paginatedGroups.length === 0 && (
                     <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 font-medium bg-slate-50/50">
                           No groups found matching your criteria.
                        </td>
                     </tr>
                  )}
                  {paginatedGroups.map((group) => (
                     <tr key={group.id} className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors group/row">
                        <td className="p-4 pl-6">
                           <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{group.group_name}</span>
                              <span className="text-xs text-slate-500">{group.group_code}</span>
                           </div>
                        </td>
                        <td className="p-4">
                           <div className="flex flex-col">
                              <span className="font-semibold text-slate-800">{group.center_name || '-'}</span>
                              <span className="text-xs text-slate-500">{group.village}</span>
                           </div>
                        </td>
                        <td className="p-4">
                           <div className="flex flex-col">
                              <span className="font-medium text-slate-800">{group.leaderName || '-'}</span>
                              <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                 <Phone className="w-3 h-3"/> {group.leaderMobile || '-'}
                              </span>
                           </div>
                        </td>
                        <td className="p-4">
                           <div className="flex flex-col">
                              <span className="font-medium text-indigo-700">{group.collector_name || 'Unassigned'}</span>
                              <span className="text-xs text-slate-500">{group.branch_name}</span>
                           </div>
                        </td>
                        <td className="p-4">
                           <div className="flex flex-col">
                              <span className="text-sm font-medium text-slate-700">{group.meeting_day || '-'}</span>
                              <span className="text-xs text-slate-500">{group.meeting_time || '-'}</span>
                           </div>
                        </td>
                        <td className="p-4">
                           <span className="text-sm text-slate-600 font-medium">
                              {group.formation_date ? new Date(group.formation_date).toLocaleDateString() : '-'}
                           </span>
                        </td>
                        <td className="p-4">
                           {group.status?.toLowerCase() === 'active' ? (
                             <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase tracking-wider">Active</span>
                           ) : (
                             <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700 uppercase tracking-wider">{group.status || 'Inactive'}</span>
                           )}
                        </td>
                        <td className="p-4 pr-6 text-right">
                           <div className="flex items-center justify-end gap-2 opacity-50 group-hover/row:opacity-100 transition-opacity">
                              <button 
                                onClick={() => navigate(`/members?group=${group.id}`)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors tooltip"
                                title="View Members"
                              >
                                 <Eye className="w-4 h-4" />
                              </button>
                              {canEdit && (
                                <button 
                                  onClick={() => navigate(`/groups/edit/${group.id}`)}
                                  className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                  title="Edit Group"
                                >
                                   <Edit2 className="w-4 h-4" />
                                </button>
                              )}
                              {canDelete && (
                                <button 
                                  onClick={() => handleDelete(group.id)}
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Delete Group"
                                >
                                   <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                           </div>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
         {/* PAGINATION */}
         <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
            <span className="text-sm text-slate-500 font-medium">
               Showing {Math.min(filteredGroups.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredGroups.length, currentPage * itemsPerPage)} of {filteredGroups.length} groups
            </span>
            <div className="flex gap-2">
               <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="p-2 bg-white border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50 hover:text-slate-900 text-slate-500"
               >
                  <ChevronLeft className="w-4 h-4" />
               </button>
               <button 
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="p-2 bg-white border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50 hover:text-slate-900 text-slate-500"
               >
                  <ChevronRight className="w-4 h-4" />
               </button>
            </div>
         </div>
      </div>

      {/* MOBILE LIST (Cards) */}
      <div className="lg:hidden flex flex-col gap-4">
         {paginatedGroups.length === 0 && (
            <div className="p-8 text-center text-slate-400 font-medium bg-white rounded-2xl border border-slate-200">
               No groups found matching your criteria.
            </div>
         )}
         {paginatedGroups.map((group) => (
            <div key={group.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 relative">
               <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-slate-500 font-black">{group.group_code}</span>
                    <h3 className="text-lg font-black text-slate-900 leading-tight block">{group.group_name}</h3>
                  </div>
                  {group.status?.toLowerCase() === 'active' ? (
                     <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700 uppercase tracking-wider">Active</span>
                  ) : (
                     <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700 uppercase tracking-wider">{group.status || 'Inactive'}</span>
                  )}
               </div>

               <div className="flex flex-col gap-2 mb-4 text-sm">
                  <div className="flex items-start gap-2 text-slate-600">
                     <MapPin className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                     <span>{group.center_name || 'No Center'} • {group.village}</span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-600">
                     <User className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                     <span>{group.leaderName || 'No Leader'} <span className="text-slate-400">({group.leaderMobile || '-'})</span></span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-600">
                     <Building2 className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                     <span>{group.collector_name || 'Unassigned Staff'} • <span className="text-slate-400">{group.branch_name}</span></span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-600">
                     <Calendar className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                     <span>{group.meeting_day || 'Not Scheduled'} at {group.meeting_time}</span>
                  </div>
               </div>

               <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                 <button 
                   onClick={() => navigate(`/members?group=${group.id}`)}
                   className="flex-1 bg-indigo-50 text-indigo-700 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                 >
                    <UsersRound className="w-4 h-4"/> View Members
                 </button>
                 {canEdit && (
                   <button 
                     onClick={() => navigate(`/groups/edit/${group.id}`)}
                     className="px-3 py-2 bg-slate-50 text-slate-600 rounded-lg"
                   >
                     <Edit2 className="w-4 h-4" />
                   </button>
                 )}
                 {canDelete && (
                   <button 
                     onClick={() => handleDelete(group.id)}
                     className="px-3 py-2 bg-rose-50 text-rose-600 rounded-lg"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                 )}
               </div>
            </div>
         ))}
         
         {/* MOBILE PAGINATION */}
         {totalPages > 0 && (
            <div className="flex items-center justify-between px-2 pt-2">
               <span className="text-xs text-slate-500 font-medium">Page {currentPage} of {totalPages}</span>
               <div className="flex gap-2">
                  <button 
                     disabled={currentPage === 1}
                     onClick={() => setCurrentPage(p => p - 1)}
                     className="p-2 bg-white border border-slate-200 rounded-lg disabled:opacity-50 text-slate-600 shadow-sm"
                  >
                     <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button 
                     disabled={currentPage === totalPages}
                     onClick={() => setCurrentPage(p => p + 1)}
                     className="p-2 bg-white border border-slate-200 rounded-lg disabled:opacity-50 text-slate-600 shadow-sm"
                  >
                     <ChevronRight className="w-4 h-4" />
                  </button>
               </div>
            </div>
         )}
      </div>

    </motion.div>
  );
}
