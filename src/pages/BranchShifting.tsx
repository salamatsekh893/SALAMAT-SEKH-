import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchWithAuth } from '../lib/api';
import { 
  Building2, 
  UsersRound, 
  Users, 
  Briefcase, 
  ArrowRightLeft, 
  Search, 
  CheckSquare, 
  Info, 
  ShieldAlert,
  ArrowRight,
  Filter,
  CheckCircle2,
  X,
  AlertTriangle
} from 'lucide-react';
import { voiceFeedback } from '../lib/voice';

type ShiftingTab = 'members' | 'groups' | 'employees';

export default function BranchShifting() {
  const [activeTab, setActiveTab] = useState<ShiftingTab>('members');
  const [branches, setBranches] = useState<any[]>([]);
  const [allGroups, setAllGroups] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showInstruction, setShowInstruction] = useState(true);

  // Source & Destination state
  const [sourceBranchId, setSourceBranchId] = useState('');
  const [targetBranchId, setTargetBranchId] = useState('');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Members state
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [sourceGroupId, setSourceGroupId] = useState('');
  const [targetGroupId, setTargetGroupId] = useState('');

  // 2. Groups state
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [targetCollectorId, setTargetCollectorId] = useState('');

  // 3. Employees state
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  // Initial Fetches
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const branchData = await fetchWithAuth('/branches');
      setBranches(branchData);

      const groupData = await fetchWithAuth('/groups');
      setAllGroups(groupData);

      const empData = await fetchWithAuth('/employees');
      setEmployees(empData);
    } catch (err) {
      console.error("Error loading branch shifting data:", err);
    }
  };

  // Load members dynamically when source branch or source group changes
  useEffect(() => {
    if (sourceBranchId) {
      setLoading(true);
      fetchWithAuth('/members')
        .then(data => {
          let filtered = data.filter((m: any) => m.branch_id?.toString() === sourceBranchId);
          if (sourceGroupId) {
            filtered = filtered.filter((m: any) => m.group_id?.toString() === sourceGroupId);
          }
          setMembers(filtered);
          setSelectedMembers([]);
        })
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    } else {
      setMembers([]);
      setSelectedMembers([]);
    }
  }, [sourceBranchId, sourceGroupId]);

  // Reset tab states when switching tabs
  const handleTabChange = (tab: ShiftingTab) => {
    setActiveTab(tab);
    setSourceBranchId('');
    setTargetBranchId('');
    setSearchQuery('');
    setSourceGroupId('');
    setTargetGroupId('');
    setTargetCollectorId('');
    setSelectedMembers([]);
    setSelectedGroups([]);
    setSelectedEmployees([]);
  };

  // Helper selectors
  const sourceGroups = allGroups.filter(g => g.branch_id?.toString() === sourceBranchId);
  const targetGroups = allGroups.filter(g => g.branch_id?.toString() === targetBranchId);
  const targetStaff = employees.filter(e => e.branch_id?.toString() === targetBranchId && ['fo', 'manager', 'branch_manager'].includes(e.role));

  const filteredMembers = members.filter(m => 
    m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.member_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.mobile_no?.includes(searchQuery)
  );

  const availableGroupsForShifting = allGroups.filter(g => g.branch_id?.toString() === sourceBranchId);
  const filteredGroups = availableGroupsForShifting.filter(g => 
    g.group_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    g.group_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.center_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableEmployeesForShifting = employees.filter(e => e.branch_id?.toString() === sourceBranchId);
  const filteredEmployees = availableEmployeesForShifting.filter(e => 
    e.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    e.phone?.includes(searchQuery) ||
    e.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Toggle selection functions
  const toggleMember = (id: string) => {
    setSelectedMembers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleGroup = (id: string) => {
    setSelectedGroups(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleEmployee = (id: string) => {
    setSelectedEmployees(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Bulk selectors
  const handleSelectAllMembers = () => {
    if (selectedMembers.length === filteredMembers.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(filteredMembers.map(m => m.id.toString()));
    }
  };

  const handleSelectAllGroups = () => {
    if (selectedGroups.length === filteredGroups.length) {
      setSelectedGroups([]);
    } else {
      setSelectedGroups(filteredGroups.map(g => g.id.toString()));
    }
  };

  const handleSelectAllEmployees = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map(e => e.id.toString()));
    }
  };

  // API Submission Handlers
  const handleMemberBranchShift = async () => {
    if (!sourceBranchId) return alert('দয়া করে সোর্স ব্রাঞ্চ নির্বাচন করুন।');
    if (selectedMembers.length === 0) return alert('স্থানান্তরের জন্য অন্তত একজন সদস্য নির্বাচন করুন।');
    if (!targetBranchId) return alert('টার্গেট বা গন্তব্য ব্রাঞ্চ নির্বাচন করুন।');
    if (!targetGroupId) return alert('টার্গেট ব্রাঞ্চের জন্য একটি গ্রুপ নির্বাচন করুন।');
    if (sourceBranchId === targetBranchId) return alert('সোর্স এবং টার্গেট ব্রাঞ্চ একই হতে পারে না।');

    const confirmed = window.confirm(
      `আপনি কি নিশ্চিত যে আপনি এই ${selectedMembers.length} জন কাস্টমারকে ${branches.find(b => b.id.toString() === targetBranchId)?.branch_name} ব্রাঞ্চে স্থানান্তর করতে চান?`
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      await fetchWithAuth('/shifting/branch/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberIds: selectedMembers,
          targetBranchId: parseInt(targetBranchId, 10),
          targetGroupId: parseInt(targetGroupId, 10)
        })
      });
      voiceFeedback.success();
      alert('Branch Transfer Successful! কাস্টমারদের ব্রাঞ্চ স্থানান্তর সফলভাবে সম্পন্ন হয়েছে।');
      
      // Reset
      setSelectedMembers([]);
      setTargetBranchId('');
      setTargetGroupId('');
      loadInitialData();
    } catch (err: any) {
      voiceFeedback.error();
      alert('স্থানান্তর সম্পন্ন করা যায়নি। Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGroupBranchShift = async () => {
    if (!sourceBranchId) return alert('দয়া করে সোর্স ব্রাঞ্চ নির্বাচন করুন।');
    if (selectedGroups.length === 0) return alert('স্থানান্তরের জন্য অন্তত একটি গ্রুপ নির্বাচন করুন।');
    if (!targetBranchId) return alert('টার্গেট ব্রাঞ্চ নির্বাচন করুন।');
    if (sourceBranchId === targetBranchId) return alert('সোর্স এবং টার্গেট ব্রাঞ্চ একই হতে পারে না।');

    const targetBranchName = branches.find(b => b.id.toString() === targetBranchId)?.branch_name;
    const confirmed = window.confirm(
      `স্থানাস্তর করতে যাওয়া এই ${selectedGroups.length} টি গ্রুপের সাথে সংযুক্ত সকল কাস্টমারও কিন্তু স্বয়ংক্রিয়ভাবে "${targetBranchName}" ব্রাঞ্চে স্থানান্তরিত হয়ে যাবে। আপনি কি নিশ্চিত?`
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      await fetchWithAuth('/shifting/branch/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupIds: selectedGroups,
          targetBranchId: parseInt(targetBranchId, 10),
          targetCollectorId: targetCollectorId ? parseInt(targetCollectorId, 10) : null
        })
      });
      voiceFeedback.success();
      alert('Group & Members Branch Transfer Successful! গ্রুপ এবং এর কাস্টমারদের ব্রাঞ্চ স্থানান্তর সফল হয়েছে।');
      
      // Reset
      setSelectedGroups([]);
      setTargetBranchId('');
      setTargetCollectorId('');
      loadInitialData();
    } catch (err: any) {
      voiceFeedback.error();
      alert('গ্রুপ স্থানান্তর ব্যর্থ হয়েছে। Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeBranchShift = async () => {
    if (!sourceBranchId) return alert('সোর্স ব্রাঞ্চ নির্বাচন করুন।');
    if (selectedEmployees.length === 0) return alert('স্থানান্তরের জন্য অন্তত একজন কর্মী নির্বাচন করুন।');
    if (!targetBranchId) return alert('টার্গেট ব্রাঞ্চ নির্বাচন করুন।');
    if (sourceBranchId === targetBranchId) return alert('সোর্স এবং টার্গেট ব্রাঞ্চ একই হতে পারে না।');

    const targetBranchName = branches.find(b => b.id.toString() === targetBranchId)?.branch_name;
    const confirmed = window.confirm(
      `আপনি কি নিশ্চিত যে এই ${selectedEmployees.length} জন স্টাফ কর্মীকে "${targetBranchName}" ব্রাঞ্চে বদলি/স্থানান্তর করতে চান?`
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      await fetchWithAuth('/shifting/branch/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeIds: selectedEmployees,
          targetBranchId: parseInt(targetBranchId, 10)
        })
      });
      voiceFeedback.success();
      alert('Employee Transfer Successful! কর্মীদের ব্রাঞ্চ বদলি সফলভাবে সম্পন্ন হয়েছে।');
      
      // Reset
      setSelectedEmployees([]);
      setTargetBranchId('');
      loadInitialData();
    } catch (err: any) {
      voiceFeedback.error();
      alert('কর্মী স্থানান্তর ক্যানসেল হয়েছে বা ভুল হয়েছে। Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Determine accent color theme with absolute precision based on active tab
  const getTabColors = () => {
    switch (activeTab) {
      case 'members':
        return {
          primary: 'text-indigo-600 bg-indigo-50 border-indigo-200',
          accent: 'indigo',
          solidBtn: 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500',
          borderAccent: 'border-indigo-100',
          badgeText: 'text-indigo-800 bg-indigo-100',
          focusRing: 'focus:ring-indigo-500'
        };
      case 'groups':
        return {
          primary: 'text-emerald-600 bg-emerald-50 border-emerald-200',
          accent: 'emerald',
          solidBtn: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500',
          borderAccent: 'border-emerald-100',
          badgeText: 'text-emerald-800 bg-emerald-100',
          focusRing: 'focus:ring-emerald-500'
        };
      case 'employees':
        return {
          primary: 'text-amber-600 bg-amber-50 border-amber-200',
          accent: 'amber',
          solidBtn: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
          borderAccent: 'border-amber-100',
          badgeText: 'text-amber-800 bg-amber-100',
          focusRing: 'focus:ring-amber-500'
        };
    }
  };

  const schemeColors = getTabColors();

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-5">
      
      {/* Top Main Navigation Block: Clean and Space-saving Grid */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm transition-all">
        {/* Title, Accent Indicator and Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0 shadow-sm">
            <ArrowRightLeft className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              Branch Shifter <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider font-black">Pro</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-semibold leading-none mt-1">
              আন্তঃ-শাখা কাস্টমার, গ্রুপ ও কর্মী স্থানান্তর প্যানেল
            </p>
          </div>
        </div>

        {/* Beautiful Sliding Navigation Tabs inside Top Bar */}
        <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/50 max-w-md w-full md:w-auto self-stretch md:self-auto shrink-0 shadow-inner">
          {(['members', 'groups', 'employees'] as ShiftingTab[]).map((tab) => {
            const isActive = activeTab === tab;
            let icon = <UsersRound className="w-3.5 h-3.5" />;
            if (tab === 'groups') icon = <Users className="w-3.5 h-3.5" />;
            if (tab === 'employees') icon = <Briefcase className="w-3.5 h-3.5" />;

            const tabLabel = tab === 'members' ? 'Customer' : tab === 'groups' ? 'Group / Center' : 'Employee';

            // Active Tab Text Styling
            let activeText = 'text-indigo-600';
            if (tab === 'groups') activeText = 'text-emerald-600';
            if (tab === 'employees') activeText = 'text-amber-600';

            return (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all relative ${
                  isActive
                    ? `bg-white ${activeText} shadow-sm border border-slate-200/40 font-black`
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                }`}
              >
                {icon}
                <span className="text-[10px]">{tabLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {/* Compact dismissible instruction bar */}
        {showInstruction && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, margin: 0, overflow: 'hidden' }}
            transition={{ duration: 0.2 }}
            className="bg-blue-50/70 border border-blue-200/50 rounded-xl p-3.5 flex gap-3 text-blue-900 justify-between items-center"
          >
            <div className="flex gap-2.5 items-start">
              <Info className="w-5 h-5 shrink-0 text-blue-600 mt-0.5" />
              <div className="text-[11px] font-medium leading-relaxed">
                <span className="font-extrabold text-blue-950 block uppercase tracking-wide text-[10px] mb-0.5">রিয়েল-টাইম ব্রাঞ্চ বদলি নির্দেশিকা</span>
                গ্রুপ সরালে গ্রুপের আন্ডারের সমস্ত মেম্বার অটোমেটিক নতুন ব্রাঞ্চে অন্তর্ভুক্ত হবে। কাস্টমার একাকী সরালে তাকে নতুন ব্রাঞ্চের অধীনে একটি গ্রুপ আগে এসাইন করতে হবে।
              </div>
            </div>
            <button 
              onClick={() => setShowInstruction(false)}
              className="text-blue-500 hover:text-blue-800 p-1 hover:bg-blue-100 rounded-lg transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid of Columns: Extremely balanced and space-conscious */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* LEFT CARD: 7 cols - Source Branch selector, entity checklist */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md/50 transition-all p-4 flex-1 flex flex-col justify-between space-y-4">
            
            {/* Source Configuration Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-slate-100">
              
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider flex items-center gap-1.5 leading-none">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  Source Branch (উৎস শাখা)
                </label>
                <select
                  className="w-full bg-slate-50/80 hover:bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  value={sourceBranchId}
                  onChange={(e) => {
                    setSourceBranchId(e.target.value);
                    setSourceGroupId('');
                  }}
                >
                  <option value="">-- Choose Branch --</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.branch_name} ({b.branch_code})</option>
                  ))}
                </select>
              </div>

              {activeTab === 'members' && (
                <div className="space-y-1 animate-fadeIn">
                  <label className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider flex items-center gap-1.5 leading-none">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    Branch Group Filter (অপশনাল)
                  </label>
                  <select
                    className="w-full bg-slate-50/80 hover:bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
                    value={sourceGroupId}
                    disabled={!sourceBranchId}
                    onChange={(e) => setSourceGroupId(e.target.value)}
                  >
                    <option value="">All Groups (সকল গ্রুপ)</option>
                    {sourceGroups.map(g => (
                      <option key={g.id} value={g.id}>{g.group_name} ({g.group_code})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* List Selection Section */}
            {sourceBranchId ? (
              <div className="flex-1 flex flex-col space-y-3 pt-1">
                
                {/* Search Bar + Selected Items Badge Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-3.5 bg-indigo-600 rounded-full inline-block"></span>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                      {activeTab === 'members' && `Members (${filteredMembers.length})`}
                      {activeTab === 'groups' && `Groups (${filteredGroups.length})`}
                      {activeTab === 'employees' && `Employees (${filteredEmployees.length})`}
                    </h3>
                  </div>

                  {/* High Density Sleek Search */}
                  <div className="relative max-w-xs w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      className="w-full bg-slate-50/80 hover:bg-slate-50 focus:bg-white text-xs font-semibold pl-8.5 pr-3 py-1.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                      placeholder="খুঁজুন / Filter list..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Bulk Selector Tool with precise tab matching status colors */}
                <div className="flex items-center justify-between bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-slate-400" />
                    Selected: 
                    <span className={`px-2 py-0.5 rounded-full font-black text-[9px] ${schemeColors.badgeText}`}>
                      {activeTab === 'members' && selectedMembers.length}
                      {activeTab === 'groups' && selectedGroups.length}
                      {activeTab === 'employees' && selectedEmployees.length}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (activeTab === 'members') handleSelectAllMembers();
                      if (activeTab === 'groups') handleSelectAllGroups();
                      if (activeTab === 'employees') handleSelectAllEmployees();
                    }}
                    className={`text-[10px] hover:underline font-extrabold uppercase tracking-wider transition-colors text-slate-500`}
                  >
                    {activeTab === 'members' && selectedMembers.length === filteredMembers.length ? 'Deselect All' : 'Select All'}
                    {activeTab === 'groups' && selectedGroups.length === filteredGroups.length ? 'Deselect All' : 'Select All'}
                    {activeTab === 'employees' && selectedEmployees.length === filteredEmployees.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                {/* Main Scrollable Entity List: Structured as an outstanding, dense view list preventing screen-depth scrolling */}
                <div className="max-h-[300px] sm:max-h-[320px] overflow-y-auto space-y-2 pr-1.5 custom-scrollbar [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
                  <AnimatePresence mode="popLayout">
                    {/* 1. MEMBERS LIST */}
                    {activeTab === 'members' && filteredMembers.map(m => {
                      const group = allGroups.find(g => g.id === m.group_id);
                      const isSelected = selectedMembers.includes(m.id.toString());
                      return (
                        <motion.label 
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          layout
                          key={m.id} 
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50/30 shadow-sm'
                              : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 bg-white'
                          }`}
                        >
                          <div className="pt-0.5">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              checked={isSelected}
                              onChange={() => toggleMember(m.id.toString())}
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 w-full text-xs">
                            <div>
                              <div className="font-extrabold text-slate-900 leading-snug">{m.full_name}</div>
                              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{m.member_code}</div>
                              <div className="text-[10px] text-slate-600 font-medium">Guardian: {m.guardian_name}</div>
                            </div>
                            <div className="text-left sm:text-right flex flex-col justify-between items-start sm:items-end gap-1">
                              <span className="inline-block bg-slate-100/90 text-slate-700 px-2 py-0.5 rounded font-bold text-[9px]">
                                Group: {group ? group.group_name : 'No Group'}
                              </span>
                              <div className="text-[10px] text-slate-500 font-bold">Mobile: {m.mobile_no || 'N/A'}</div>
                            </div>
                          </div>
                        </motion.label>
                      );
                    })}

                    {/* 2. GROUPS LIST */}
                    {activeTab === 'groups' && filteredGroups.map(g => {
                      const collector = employees.find(e => e.id === g.collector_id);
                      const isSelected = selectedGroups.includes(g.id.toString());
                      return (
                        <motion.label 
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          layout
                          key={g.id} 
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50/30 shadow-sm'
                              : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 bg-white'
                          }`}
                        >
                          <div className="pt-0.5">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              checked={isSelected}
                              onChange={() => toggleGroup(g.id.toString())}
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 w-full text-xs">
                            <div>
                              <div className="font-extrabold text-slate-900 leading-snug">{g.group_name}</div>
                              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{g.group_code} • Day: {g.meeting_day}</div>
                              <div className="text-[10px] text-slate-600 font-medium">Center: {g.center_name || 'N/A'}</div>
                            </div>
                            <div className="text-left sm:text-right flex flex-col justify-between items-start sm:items-end gap-1">
                              <span className="inline-block bg-emerald-100/80 text-emerald-800 px-2.5 py-0.5 rounded font-bold text-[9px]">
                                FO: {collector ? collector.name : 'Unassigned'}
                              </span>
                              <div className="text-[10px] text-slate-500 font-bold">Village: {g.village || 'N/A'}</div>
                            </div>
                          </div>
                        </motion.label>
                      );
                    })}

                    {/* 3. EMPLOYEES LIST */}
                    {activeTab === 'employees' && filteredEmployees.map(e => {
                      const isSelected = selectedEmployees.includes(e.id.toString());
                      return (
                        <motion.label 
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          layout
                          key={e.id} 
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50/30 shadow-sm'
                              : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 bg-white'
                          }`}
                        >
                          <div className="pt-0.5">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                              checked={isSelected}
                              onChange={() => toggleEmployee(e.id.toString())}
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 w-full text-xs">
                            <div>
                              <div className="font-extrabold text-slate-900 leading-snug">{e.name}</div>
                              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Role: {e.role || 'FO'}</div>
                              <div className="text-[10px] text-slate-600 font-semibold">{e.email || 'N/A'}</div>
                            </div>
                            <div className="text-left sm:text-right flex flex-col justify-between items-start sm:items-end gap-1">
                              <span className="inline-block bg-amber-105 bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded font-bold text-[9px]">
                                Registered Member
                              </span>
                              <div className="text-[10px] text-slate-500 font-bold">Phone: {e.phone || 'N/A'}</div>
                            </div>
                          </div>
                        </motion.label>
                      );
                    })}
                  </AnimatePresence>

                  {/* Filter Content Empty States */}
                  {activeTab === 'members' && filteredMembers.length === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center text-slate-400 font-bold text-xs uppercase tracking-widest bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      কোন সদস্য বা কাস্টমার পাওয়া যায়নি
                    </motion.div>
                  )}
                  {activeTab === 'groups' && filteredGroups.length === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center text-slate-400 font-bold text-xs uppercase tracking-widest bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      কোন গ্রুপ তালিকাভুক্ত নেই
                    </motion.div>
                  )}
                  {activeTab === 'employees' && filteredEmployees.length === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center text-slate-400 font-bold text-xs uppercase tracking-widest bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      কোন কর্মী তালিকাভুক্ত নেই
                    </motion.div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-3 bg-slate-50/60 rounded-2xl border-2 border-dashed border-slate-200 my-auto min-h-[300px]">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-800 font-extrabold uppercase tracking-wider">
                    সোর্স ব্রাঞ্চ নির্বাচন করুন
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 max-w-[280px] mx-auto leading-normal">
                    সদস্য, গ্রুপ অথবা কর্মী বদলি বা স্থানান্তর শুরু করার আগে অনুগ্রহ করে বামপাশের ড্রপডাউন হতে উৎস শাখা নির্নয় করুন।
                  </p>
                </div>
              </div>
            )}
            
          </div>
        </div>

        {/* MIDDLE DIRECTION DIVIDER: Animated icon connector */}
        <div className="lg:col-span-1 flex lg:flex-col items-center justify-center py-1 lg:py-0 self-stretch">
          <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200/80 shadow-inner flex items-center justify-center text-slate-400 rotate-90 lg:rotate-0 transform transition-transform duration-300">
            <ArrowRight className="w-4 h-4 text-slate-500 animate-pulse" />
          </div>
        </div>

        {/* RIGHT CARD: 4 cols - Target branch dropdowns, dynamic sub-actions & final execution button */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md/50 p-4 transition-all flex-1 flex flex-col justify-between space-y-4">
            
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Target Destination
                  </h2>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">কোথায় স্থানান্তর করা হবে?</p>
                </div>
              </div>

              {/* Destination Form Fields with high density spacing */}
              <div className="space-y-3">
                
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider flex items-center gap-1.5 leading-none">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    Target Branch (গন্তব্য শাখা)
                  </label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 transition-all"
                    value={targetBranchId}
                    disabled={!sourceBranchId}
                    onChange={(e) => {
                      setTargetBranchId(e.target.value);
                      setTargetGroupId('');
                      setTargetCollectorId('');
                    }}
                  >
                    <option value="">-- Choose Destination Branch --</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id} disabled={b.id.toString() === sourceBranchId}>
                        {b.branch_name} ({b.branch_code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Group Selector: ONLY for Customer Shift tab */}
                {activeTab === 'members' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-1">
                    <label className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider flex items-center gap-1.5 leading-none">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      Target Group (গন্তব্য গ্রুপ)
                    </label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 outline-none"
                      value={targetGroupId}
                      disabled={!targetBranchId}
                      onChange={(e) => setTargetGroupId(e.target.value)}
                    >
                      <option value="">-- Choose Target Group --</option>
                      {targetGroups.map(g => (
                        <option key={g.id} value={g.id}>{g.group_name} ({g.group_code})</option>
                      ))}
                    </select>
                    {targetBranchId && targetGroups.length === 0 && (
                      <p className="text-[9px] text-rose-500 font-bold bg-rose-50 p-1.5 rounded-lg flex items-center gap-1 mt-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        টার্গেট ব্রাঞ্চে কোন গ্রুপ নেই! গ্রুপ তৈরি করুন।
                      </p>
                    )}
                  </motion.div>
                )}

                {/* Target Collector Selector: ONLY for Group Shift tab */}
                {activeTab === 'groups' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-1">
                    <label className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider flex items-center gap-1.5 leading-none">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      Assign Field Officer / CO (ঐচ্ছিক)
                    </label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                      value={targetCollectorId}
                      disabled={!targetBranchId}
                      onChange={(e) => setTargetCollectorId(e.target.value)}
                    >
                      <option value="">-- Current Officer --</option>
                      {targetStaff.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                      ))}
                    </select>
                  </motion.div>
                )}

              </div>
            </div>

            {/* Quick Summary Section inside right cards */}
            <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl space-y-1.5 text-xs">
              <div className="font-extrabold uppercase tracking-wide text-slate-500 border-b border-slate-200/50 pb-1.5 mb-1.5 text-[9px]">
                Summary of Transfer
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500 font-medium font-mono">Shifting Mode:</span>
                <span className="font-bold uppercase text-slate-800">{activeTab}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500 font-medium font-mono">From Branch:</span>
                <span className="font-bold text-rose-600">
                  {sourceBranchId ? branches.find(b => b.id.toString() === sourceBranchId)?.branch_name : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500 font-medium font-mono">To Branch:</span>
                <span className="font-bold text-emerald-600">
                  {targetBranchId ? branches.find(b => b.id.toString() === targetBranchId)?.branch_name : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500 font-medium font-mono">Selected Count:</span>
                <span className="font-black px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded text-[9px]">
                  {activeTab === 'members' && selectedMembers.length}
                  {activeTab === 'groups' && selectedGroups.length}
                  {activeTab === 'employees' && selectedEmployees.length}
                </span>
              </div>
            </div>

            {/* Execution Actions */}
            <div className="space-y-2">
              {activeTab === 'members' && (
                <button
                  onClick={handleMemberBranchShift}
                  disabled={loading || selectedMembers.length === 0 || !targetBranchId || !targetGroupId}
                  className="w-full py-3 px-4 rounded-xl text-xs font-black uppercase text-white tracking-widest transition-all shadow-sm focus:outline-none focus:ring-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {loading ? 'Processing...' : `Transfer ${selectedMembers.length} Customer(s)`}
                </button>
              )}

              {activeTab === 'groups' && (
                <button
                  onClick={handleGroupBranchShift}
                  disabled={loading || selectedGroups.length === 0 || !targetBranchId}
                  className="w-full py-3 px-4 rounded-xl text-xs font-black uppercase text-white tracking-widest transition-all shadow-sm focus:outline-none focus:ring-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {loading ? 'Processing...' : `Transfer ${selectedGroups.length} Group(s)`}
                </button>
              )}

              {activeTab === 'employees' && (
                <button
                  onClick={handleEmployeeBranchShift}
                  disabled={loading || selectedEmployees.length === 0 || !targetBranchId}
                  className="w-full py-3 px-4 rounded-xl text-xs font-black uppercase text-white tracking-widest transition-all shadow-sm focus:outline-none focus:ring-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {loading ? 'Processing...' : `Transfer ${selectedEmployees.length} Employee(s)`}
                </button>
              )}

              {/* Informative safety caution */}
              <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-2.5 flex gap-2 text-rose-850">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed leading-snug">
                  নিশ্চিৎ করুন গ্রুপ বা মেম্বারের এই দিনের কলোকেশন সম্পূর্ণরূপে ক্লোজ রয়েছে যা ব্রাঞ্চ পরিবর্তনের ক্ষেত্রে আবশ্যক।
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
