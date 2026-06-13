import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
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
  CheckCircle2
} from 'lucide-react';
import { voiceFeedback } from '../lib/voice';

type ShiftingTab = 'members' | 'groups' | 'employees';

export default function BranchShifting() {
  const [activeTab, setActiveTab] = useState<ShiftingTab>('members');
  const [branches, setBranches] = useState<any[]>([]);
  const [allGroups, setAllGroups] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3 uppercase">
          <ArrowRightLeft className="w-8 h-8 text-indigo-600 animate-pulse" />
          Branch Shift & Transfer PRO
        </h1>
        <p className="text-slate-500 font-bold text-xs mt-2 uppercase tracking-widest leading-relaxed">
          আন্তঃ-শাখা সম্পদ স্থানান্তর (কাস্টমার, গ্রুপ, কেন্দ্র এবং কর্মী বদলি করার আধুনিক প্যানেল)
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200/60 max-w-lg md:max-w-xl">
        <button
          onClick={() => handleTabChange('members')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-250 ${
            activeTab === 'members'
              ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/50'
          }`}
        >
          <UsersRound className="w-4 h-4" />
          Customer
        </button>
        <button
          onClick={() => handleTabChange('groups')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-250 ${
            activeTab === 'groups'
              ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/50'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/50'
          }`}
        >
          <Users className="w-4 h-4" />
          Group / Center
        </button>
        <button
          onClick={() => handleTabChange('employees')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-250 ${
            activeTab === 'employees'
              ? 'bg-white text-amber-600 shadow-sm border border-slate-200/50'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/50'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Employee
        </button>
      </div>

      {/* Informative Warning Card */}
      <div className="bg-blue-50 border border-blue-200/60 rounded-2xl p-4 flex gap-3 text-blue-800">
        <Info className="w-6 h-6 shrink-0 text-blue-600 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold uppercase tracking-wider">গুরুত্বপূর্ণ নির্দেশনা / Instruction:</p>
          <p className="font-medium text-slate-700 leading-relaxed">
            শাখা পরিবর্তনের সময় ডাটাবেজে রিয়েল-টাইম তথ্য পরিবর্তন ঘটে। গ্রুপ পরিবর্তন করলে ওই গ্রুপের আন্ডারে থাকা সমস্ত মেম্বার অটোমেটিক নতুন ব্রাঞ্চে এসাইন হবে। কাস্টমার পরিবর্তন করতে হলে তাকে অবশ্যই নতুন ব্রাঞ্চের অধীনে থাকা গ্রুপে যুক্ত করতে হবে।
          </p>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Source Branch & Entity List (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            
            {/* Source Selection Form Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-black text-slate-500 tracking-widest mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  Source Branch (উৎস শাখা)
                </label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  value={sourceBranchId}
                  onChange={(e) => {
                    setSourceBranchId(e.target.value);
                    setSourceGroupId('');
                  }}
                >
                  <option value="">-- Select Source Branch --</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.branch_name} ({b.branch_code})</option>
                  ))}
                </select>
              </div>

              {activeTab === 'members' && (
                <div>
                  <label className="block text-[10px] uppercase font-black text-slate-500 tracking-widest mb-1.5 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    Source Group (ঐচ্ছিক ফিল্টার)
                  </label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    value={sourceGroupId}
                    disabled={!sourceBranchId}
                    onChange={(e) => setSourceGroupId(e.target.value)}
                  >
                    <option value="">All Groups in Branch</option>
                    {sourceGroups.map(g => (
                      <option key={g.id} value={g.id}>{g.group_name} ({g.group_code})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* List Selection Section */}
            {sourceBranchId && (
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">
                    {activeTab === 'members' && `Available Customers (${filteredMembers.length})`}
                    {activeTab === 'groups' && `Available Groups & Centers (${filteredGroups.length})`}
                    {activeTab === 'employees' && `Available Employees (${filteredEmployees.length})`}
                  </h3>
                  
                  {/* Search Bar inside Left Side */}
                  <div className="relative max-w-xs w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-xs font-semibold pl-9 pr-3 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-505 transition-all"
                      placeholder="খুঁজুন / Search here..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Bulk Selector Tool */}
                <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="text-xs font-black text-indigo-600 uppercase tracking-wider flex items-center gap-2">
                    <CheckSquare className="w-4 h-4" />
                    Selected: 
                    <span className="bg-indigo-100 px-2 py-0.5 rounded-full text-indigo-800 text-[10px]">
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
                    className="text-[10px] text-slate-500 hover:text-indigo-600 font-bold uppercase tracking-wider transition-colors"
                  >
                    {activeTab === 'members' && selectedMembers.length === filteredMembers.length ? 'Deselect All' : 'Select All'}
                    {activeTab === 'groups' && selectedGroups.length === filteredGroups.length ? 'Deselect All' : 'Select All'}
                    {activeTab === 'employees' && selectedEmployees.length === filteredEmployees.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                {/* Main Scrollable Entity List */}
                <div className="max-h-[380px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {/* 1. MEMBERS LIST */}
                  {activeTab === 'members' && filteredMembers.map(m => {
                    const group = allGroups.find(g => g.id === m.group_id);
                    return (
                      <label 
                        key={m.id} 
                        className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                          selectedMembers.includes(m.id.toString())
                            ? 'border-indigo-500 bg-indigo-50/20 shadow-sm'
                            : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 bg-white'
                        }`}
                      >
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-0.5"
                          checked={selectedMembers.includes(m.id.toString())}
                          onChange={() => toggleMember(m.id.toString())}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 w-full text-xs">
                          <div>
                            <div className="font-extrabold text-slate-900">{m.full_name}</div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">{m.member_code}</div>
                            <div className="text-[10px] text-slate-600 font-medium">Guardian: {m.guardian_name}</div>
                          </div>
                          <div className="text-left sm:text-right flex flex-col justify-between">
                            <span className="inline-block bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md font-bold text-[9px] self-start sm:self-end">
                              Group: {group ? group.group_name : 'No Group'}
                            </span>
                            <div className="text-[10px] text-slate-500 font-bold mt-1">Mobile: {m.mobile_no || 'N/A'}</div>
                          </div>
                        </div>
                      </label>
                    );
                  })}

                  {/* 2. GROUPS LIST */}
                  {activeTab === 'groups' && filteredGroups.map(g => {
                    const collector = employees.find(e => e.id === g.collector_id);
                    return (
                      <label 
                        key={g.id} 
                        className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                          selectedGroups.includes(g.id.toString())
                            ? 'border-emerald-500 bg-emerald-50/20 shadow-sm'
                            : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 bg-white'
                        }`}
                      >
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 mt-0.5"
                          checked={selectedGroups.includes(g.id.toString())}
                          onChange={() => toggleGroup(g.id.toString())}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 w-full text-xs">
                          <div>
                            <div className="font-extrabold text-slate-900">{g.group_name}</div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">{g.group_code} • Day: {g.meeting_day}</div>
                            <div className="text-[10px] text-slate-600 font-medium">Center: {g.center_name || 'N/A'} ({g.center_code || 'N/A'})</div>
                          </div>
                          <div className="text-left sm:text-right flex flex-col justify-between">
                            <span className="inline-block bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-md font-bold text-[9px] self-start sm:self-end">
                              Field Officer: {collector ? collector.name : 'Unassigned'}
                            </span>
                            <div className="text-[10px] text-slate-500 font-bold mt-1">Village: {g.village || 'N/A'}</div>
                          </div>
                        </div>
                      </label>
                    );
                  })}

                  {/* 3. EMPLOYEES LIST */}
                  {activeTab === 'employees' && filteredEmployees.map(e => (
                    <label 
                      key={e.id} 
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        selectedEmployees.includes(e.id.toString())
                          ? 'border-amber-500 bg-amber-50/20 shadow-sm'
                          : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 bg-white'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 mt-0.5"
                        checked={selectedEmployees.includes(e.id.toString())}
                        onChange={() => toggleEmployee(e.id.toString())}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 w-full text-xs">
                        <div>
                          <div className="font-extrabold text-slate-900">{e.name}</div>
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Role: {e.role}</div>
                          <div className="text-[10px] text-slate-600 font-medium font-mono">{e.email || 'N/A'}</div>
                        </div>
                        <div className="text-left sm:text-right flex flex-col justify-between">
                          <span className="inline-block bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-md font-bold text-[9px] self-start sm:self-end">
                            Join: {e.join_date || 'N/A'}
                          </span>
                          <div className="text-[10px] text-slate-500 font-bold mt-1">Phone: {e.phone}</div>
                        </div>
                      </div>
                    </label>
                  ))}

                  {/* Empty States */}
                  {activeTab === 'members' && filteredMembers.length === 0 && (
                    <div className="p-8 text-center text-slate-400 font-bold text-xs uppercase tracking-widest bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      কোন কাস্টমার বা মেম্বার পাওয়া যায়নি
                    </div>
                  )}
                  {activeTab === 'groups' && filteredGroups.length === 0 && (
                    <div className="p-8 text-center text-slate-400 font-bold text-xs uppercase tracking-widest bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      কোন গ্রুপ পাওয়া যায়নি
                    </div>
                  )}
                  {activeTab === 'employees' && filteredEmployees.length === 0 && (
                    <div className="p-8 text-center text-slate-400 font-bold text-xs uppercase tracking-widest bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      কোন কর্মী বা কর্মচারী পাওয়া যায়নি
                    </div>
                  )}
                </div>
              </div>
            )}

            {!sourceBranchId && (
              <div className="p-10 text-center space-y-3 bg-slate-50/55 rounded-2xl border-2 border-dashed border-slate-200">
                <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-400 font-extrabold uppercase tracking-widest">
                  শুরু করতে প্রথমে সোর্স কাস্টমার/গ্রুপের ব্রাঞ্চ নির্বাচন করুন
                </p>
              </div>
            )}
            
          </div>
        </div>

        {/* MIDDLE ICON: Dynamic responsive spacer / visual flow direction (1 col on large screens) */}
        <div className="lg:col-span-1 flex items-center justify-center py-2 lg:py-12">
          <div className="w-10 h-10 bg-slate-100 rounded-full border border-slate-200/80 flex items-center justify-center text-slate-400 shadow-inner rotate-90 lg:rotate-0">
            <ArrowRight className="w-5 h-5 text-slate-500" />
          </div>
        </div>

        {/* RIGHT COLUMN: Target Destination & Action Execution (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-6">
            
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Target Destination
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">বদলি বা স্থানান্তরের গন্তব্য সেট করুন</p>
            </div>

            {/* Target Branch Dropdown */}
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-black text-slate-500 tracking-widest mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  Target Branch (গন্তব্য শাখা)
                </label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  value={targetBranchId}
                  disabled={!sourceBranchId}
                  onChange={(e) => {
                    setTargetBranchId(e.target.value);
                    setTargetGroupId('');
                    setTargetCollectorId('');
                  }}
                >
                  <option value="">-- Select Target Branch --</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id} disabled={b.id.toString() === sourceBranchId}>
                      {b.branch_name} ({b.branch_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Group: ONLY for Customer Shift tab */}
              {activeTab === 'members' && (
                <div>
                  <label className="block text-[10px] uppercase font-black text-slate-500 tracking-widest mb-1.5 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    Target Group (গন্তব্য গ্রুপের নাম)
                  </label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    value={targetGroupId}
                    disabled={!targetBranchId}
                    onChange={(e) => setTargetGroupId(e.target.value)}
                  >
                    <option value="">-- Select Destination Group --</option>
                    {targetGroups.map(g => (
                      <option key={g.id} value={g.id}>{g.group_name} ({g.group_code})</option>
                    ))}
                  </select>
                  {targetBranchId && targetGroups.length === 0 && (
                    <p className="text-[9px] text-rose-500 font-bold uppercase mt-1">
                      ⚠️ নির্বাচিত টার্গেট ব্রাঞ্চে কোন গ্রুপ তৈরি করা নেই!
                    </p>
                  )}
                </div>
              )}

              {/* Destination Field Officer: ONLY for Group Shift tab */}
              {activeTab === 'groups' && (
                <div>
                  <label className="block text-[10px] uppercase font-black text-slate-500 tracking-widest mb-1.5 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    Target Staff / CO (মাঠকর্মী বদলি)
                  </label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                    value={targetCollectorId}
                    disabled={!targetBranchId}
                    onChange={(e) => setTargetCollectorId(e.target.value)}
                  >
                    <option value="">-- Keep Current Or Select Staff --</option>
                    {targetStaff.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Quick Summary View before executing */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 text-xs">
              <div className="font-extrabold uppercase tracking-wider text-slate-600 border-b border-slate-200/50 pb-1.5 mb-1 text-[10px]">
                Transfer Summary
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Shifting Mode:</span>
                <span className="font-bold uppercase text-slate-800">{activeTab}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">From Branch:</span>
                <span className="font-bold text-rose-600">
                  {sourceBranchId ? branches.find(b => b.id.toString() === sourceBranchId)?.branch_name : 'Not Set'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">To Branch:</span>
                <span className="font-bold text-emerald-600">
                  {targetBranchId ? branches.find(b => b.id.toString() === targetBranchId)?.branch_name : 'Not Set'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Total selected:</span>
                <span className="font-black px-2 py-0.5 bg-slate-200 rounded text-slate-800 text-[10px]">
                  {activeTab === 'members' && selectedMembers.length}
                  {activeTab === 'groups' && selectedGroups.length}
                  {activeTab === 'employees' && selectedEmployees.length}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            {activeTab === 'members' && (
              <button
                onClick={handleMemberBranchShift}
                disabled={loading || selectedMembers.length === 0 || !targetBranchId || !targetGroupId}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-center"
              >
                {loading ? 'Processing...' : 'Transfer selected member(s)'}
              </button>
            )}

            {activeTab === 'groups' && (
              <button
                onClick={handleGroupBranchShift}
                disabled={loading || selectedGroups.length === 0 || !targetBranchId}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-center"
              >
                {loading ? 'Processing...' : 'Transfer selected group(s)'}
              </button>
            )}

            {activeTab === 'employees' && (
              <button
                onClick={handleEmployeeBranchShift}
                disabled={loading || selectedEmployees.length === 0 || !targetBranchId}
                className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-center"
              >
                {loading ? 'Processing...' : 'Transfer selected staff(s)'}
              </button>
            )}

          </div>

          {/* Warning notice info bar */}
          <div className="bg-rose-50 border border-rose-200/60 rounded-2xl p-4 flex gap-3 text-rose-800">
            <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600" />
            <div className="text-[10px] space-y-1">
              <p className="font-extrabold uppercase tracking-wide">সতর্ক বার্তা / Warning:</p>
              <p className="font-semibold text-slate-600 leading-relaxed uppercase">
                গ্রুপ বা মেম্বার অলরেডি পরিশোধ না করা সক্রিয় কলোকেশন লোনের সাথে অ্যাসোসিয়েট থাকলে স্থানান্তর করার পূর্বে এই দিনের কলোকেশন ক্লোজ হওয়া নিশ্চিত করুন।
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
