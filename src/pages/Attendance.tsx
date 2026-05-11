import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../lib/api';
import { CalendarCheck, Save, Clock, XCircle, CheckCircle, HelpCircle, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { voiceFeedback } from '../lib/voice';

const STATUS_ICONS = {
  present: <CheckCircle className="w-5 h-5 text-emerald-500" />,
  absent: <XCircle className="w-5 h-5 text-rose-500" />,
  late: <Clock className="w-5 h-5 text-orange-500" />,
  'half-day': <HelpCircle className="w-5 h-5 text-yellow-500" />,
  leave: <HelpCircle className="w-5 h-5 text-blue-500" />,
  not_marked: <HelpCircle className="w-5 h-5 text-slate-300" />
};

const STATUS_COLORS = {
  present: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  absent: 'bg-rose-50 text-rose-700 border-rose-200',
  late: 'bg-orange-50 text-orange-700 border-orange-200',
  'half-day': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  leave: 'bg-blue-50 text-blue-700 border-blue-200',
  not_marked: 'bg-slate-50 text-slate-500 border-slate-200'
};

export default function Attendance() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [holidays, setHolidays] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'attendance'|'leaves'>('attendance');
  const [leaves, setLeaves] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === 'attendance') {
      loadData();
    } else {
      loadLeaves();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, activeTab]);

  useEffect(() => {
    loadHolidays();
  }, []);

  const loadLeaves = async () => {
    setLoading(true);
    try {
      const data = await fetchWithAuth('/leaves');
      setLeaves(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveLeave = async (id: number, status: 'approved' | 'rejected') => {
    try {
      await fetchWithAuth(`/leaves/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      loadLeaves();
    } catch (e) {
      alert('Failed to update leave status');
    }
  };

  const loadHolidays = async () => {
    try {
      const data = await fetchWithAuth('/holidays').catch(() => []);
      setHolidays(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [empRes, branchRes] = await Promise.all([
        fetchWithAuth(`/attendance?date=${date}`),
        fetchWithAuth('/branches').catch(() => []) 
      ]);
      setEmployees(empRes);
      setBranches(branchRes);
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFeedback = async () => {
    await loadData();
    const msg = new SpeechSynthesisUtterance("আপডেট সফল হয়েছে।");
    msg.lang = 'bn-IN';
    msg.rate = 0.9;
    const voices = window.speechSynthesis.getVoices();
    const bnVoice = voices.find(v => v.lang.startsWith('bn'));
    if (bnVoice) msg.voice = bnVoice;
    window.speechSynthesis.speak(msg);
  };

  const handleStatusChange = async (userId: number, newStatus: string) => {
    const emp = employees.find(e => e.user_id === userId);
    try {
      await fetchWithAuth('/attendance', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          date,
          status: newStatus,
          in_time: emp?.in_time,
          out_time: emp?.out_time,
          notes: emp?.notes || ''
        })
      });

      // Update local state
      setEmployees(employees.map(emp => 
        emp.user_id === userId ? { ...emp, status: newStatus } : emp
      ));
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleTimeChange = async (userId: number, field: 'in_time' | 'out_time', value: string) => {
    const emp = employees.find(e => e.user_id === userId);
    try {
      await fetchWithAuth('/attendance', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          date,
          status: emp?.status || 'present', // if setting time, auto present
          in_time: field === 'in_time' ? value : emp?.in_time,
          out_time: field === 'out_time' ? value : emp?.out_time,
          notes: emp?.notes || ''
        })
      });

      setEmployees(employees.map(emp => 
        emp.user_id === userId ? { ...emp, status: emp.status !== 'not_marked' ? emp.status : 'present', [field]: value } : emp
      ));
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDelete = async (userId: number) => {
    if (!confirm('Are you sure you want to clear attendance for this staff for the selected date?')) return;
    try {
      await fetchWithAuth(`/attendance?user_id=${userId}&date=${date}`, { method: 'DELETE' });
      voiceFeedback.success();
      loadData();
    } catch (err: any) {
      alert(err.message);
      voiceFeedback.error();
    }
  };

  const filteredEmployees = employees.filter(emp => 
    selectedBranch === 'all' || emp.branch_id?.toString() === selectedBranch
  );

  const currentHoliday = holidays.find(h => {
    // some dates from DB might have 'T00:00:00.000Z', some might be 'yyyy-mm-dd'
    const hDate = new Date(h.date).toISOString().split('T')[0];
    return hDate === date;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Attendance & Leaves</h1>
            <div className="flex gap-4 mt-2">
              <button 
                onClick={() => setActiveTab('attendance')}
                className={cn("text-xs font-bold uppercase tracking-widest pb-1 transition-colors border-b-2", activeTab === 'attendance' ? "text-indigo-600 border-indigo-600" : "text-slate-400 border-transparent hover:text-slate-600")}
              >
                Attendance
              </button>
              <button 
                onClick={() => setActiveTab('leaves')}
                className={cn("text-xs font-bold uppercase tracking-widest pb-1 transition-colors border-b-2", activeTab === 'leaves' ? "text-indigo-600 border-indigo-600" : "text-slate-400 border-transparent hover:text-slate-600")}
              >
                Leave Approvals
              </button>
            </div>
          </div>
        </div>
        {activeTab === 'attendance' && (
          <div className="flex flex-wrap items-center gap-3">
             <select 
               className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600 appearance-none bg-no-repeat bg-right pr-10"
               style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundSize: '1rem' }}
               value={selectedBranch}
               onChange={(e) => setSelectedBranch(e.target.value)}
             >
               <option value="all">All Branches</option>
               {branches.map((b) => (
                 <option key={b.id} value={b.id.toString()}>{b.branch_name}</option>
               ))}
             </select>
             <input 
               type="date" 
               value={date}
               onChange={(e) => setDate(e.target.value)}
               className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600"
               max={new Date().toISOString().split('T')[0]}
             />
          </div>
        )}
      </div>

      {activeTab === 'attendance' ? (
        <>
          <div className="bg-white rounded-[32px] overflow-hidden border border-slate-100 shadow-sm">
            {currentHoliday && (
          <div className="bg-yellow-50 border-b border-yellow-200 p-6 flex items-center justify-between gap-4">
             <div>
                <h3 className="text-yellow-800 font-black text-lg">🎉 Holiday Alert!</h3>
                <p className="text-yellow-700 font-medium text-sm mt-1">
                   Today is marked as <b className="uppercase tracking-wider">{currentHoliday.reason}</b>. Staff are not required to mark attendance today.
                </p>
             </div>
             <button 
               onClick={async () => {
                 if(confirm('Remove this holiday?')) {
                    try {
                      await fetchWithAuth(`/holidays/${currentHoliday.id}`, { method: 'DELETE' });
                      loadHolidays();
                    } catch(e) {}
                 }
               }}
               className="bg-yellow-200 text-yellow-800 px-4 py-2 rounded-xl text-xs font-bold uppercase hover:bg-yellow-300 transition-colors shrink-0"
             >
               Remove Holiday
             </button>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-slate-500 font-bold">Loading records...</div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:-mx-0 px-4 sm:px-0">
            <div className="hidden md:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Employee</th>
                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Role & Branch</th>
                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 min-w-[200px]">Status</th>
                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">In</th>
                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Out</th>
                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredEmployees.map((emp) => {
                    const branchName = branches.find(b => b.id === emp.branch_id)?.branch_name || 'N/A';
                    return (
                      <tr key={emp.user_id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold uppercase">
                              {emp.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 tracking-tight">{emp.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-5">
                          <div className="text-[13px] text-slate-800 font-bold uppercase tracking-tight">{emp.role}</div>
                          <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-0.5">{branchName}</div>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-2">
                             <div className={cn(
                               "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-bold uppercase tracking-wider",
                               STATUS_COLORS[emp.status as keyof typeof STATUS_COLORS]
                             )}>
                               {STATUS_ICONS[emp.status as keyof typeof STATUS_ICONS]}
                               <select
                                 value={emp.status}
                                 onChange={(e) => handleStatusChange(emp.user_id, e.target.value)}
                                 className="bg-transparent outline-none appearance-none cursor-pointer pr-4"
                               >
                                 <option value="not_marked">Select Status</option>
                                 <option value="present">Present</option>
                                 <option value="absent">Absent</option>
                                 <option value="late">Late</option>
                                 <option value="half-day">Half Day</option>
                                 <option value="leave">Leave</option>
                               </select>
                             </div>
                          </div>
                        </td>
                         <td className="p-3">
                           <input type="time" value={emp.in_time ? emp.in_time.slice(0, 5) : ''} onChange={(e) => handleTimeChange(emp.user_id, 'in_time', e.target.value)} className="bg-white border flex border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 outline-none w-24 focus:border-indigo-500 transition-all font-mono" />
                         </td>
                         <td className="p-3">
                           <input type="time" value={emp.out_time ? emp.out_time.slice(0, 5) : ''} onChange={(e) => handleTimeChange(emp.user_id, 'out_time', e.target.value)} className="bg-white border flex border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 outline-none w-24 focus:border-indigo-500 transition-all font-mono" />
                         </td>
                        <td className="p-5 text-right">
                          {emp.id && (
                            <button 
                              onClick={() => handleDelete(emp.user_id)}
                              className="w-10 h-10 flex items-center justify-center bg-white text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-100 rounded-xl transition-all shadow-sm ml-auto"
                              title="Clear Attendance"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {filteredEmployees.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 font-bold">
                        No employees found to mark attendance.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="block md:hidden overflow-x-auto w-full border-t border-slate-100 mt-2">
              <table className="w-full text-left border-collapse min-w-[320px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-3 text-[11px] font-black tracking-wide text-slate-700">Name</th>
                    <th className="p-3 text-[11px] font-black tracking-wide text-slate-700">Status</th>
                    <th className="p-3 text-[11px] font-black tracking-wide text-slate-700">In</th>
                    <th className="p-3 text-[11px] font-black tracking-wide text-slate-700">Out</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                        No employees found.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <tr key={emp.user_id} className="bg-white">
                        <td className="p-3 max-w-[90px] break-words">
                          <div className="text-[11px] font-black uppercase text-slate-900 leading-tight">
                            {emp.name}
                          </div>
                        </td>
                        <td className="p-3 w-[70px]">
                          <select
                            value={emp.status}
                            onChange={(e) => handleStatusChange(emp.user_id, e.target.value)}
                            className={cn(
                              "text-[10px] font-bold uppercase rounded-md px-1.5 py-1 appearance-none outline-none border w-full cursor-pointer",
                              STATUS_COLORS[emp.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.not_marked
                            )}
                            style={{ backgroundImage: 'none' /* remove default select arrow to save space */ }}
                          >
                            <option value="not_marked">--</option>
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="late">Late</option>
                            <option value="half-day">Half Day</option>
                            <option value="leave">Leave</option>
                          </select>
                        </td>
                        <td className="p-2 w-[80px]">
                          <input 
                            type="time" 
                            value={emp.in_time ? emp.in_time.slice(0, 5) : ''} 
                            onChange={(e) => handleTimeChange(emp.user_id, 'in_time', e.target.value)} 
                            className="bg-white border text-center border-slate-200 rounded-md px-1 py-1.5 text-[11px] font-bold text-slate-700 outline-none w-full focus:border-indigo-500 font-mono" 
                          />
                        </td>
                        <td className="p-2 w-[80px]">
                          <input 
                            type="time" 
                            value={emp.out_time ? emp.out_time.slice(0, 5) : ''} 
                            onChange={(e) => handleTimeChange(emp.user_id, 'out_time', e.target.value)} 
                            className="bg-white border text-center border-slate-200 rounded-md px-1 py-1.5 text-[11px] font-bold text-slate-700 outline-none w-full focus:border-indigo-500 font-mono" 
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div className="p-4 bg-slate-50 border-t border-slate-100">
                <button 
                  onClick={handleUpdateFeedback}
                  className="w-full bg-slate-800 text-white font-bold text-sm py-3 rounded-lg shadow-sm hover:bg-slate-700 active:bg-slate-900 transition-colors"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

       {/* Holidays Section */}
       <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-sm mt-6">
         <h3 className="text-lg font-black text-slate-900 mb-4">Manage Holidays</h3>
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div>
             <form onSubmit={async (e) => {
               e.preventDefault();
               const fd = new FormData(e.currentTarget);
               try {
                 await fetchWithAuth('/holidays', {
                   method: 'POST',
                   headers: {'Content-Type': 'application/json'},
                   body: JSON.stringify({
                     date: fd.get('date'),
                     reason: fd.get('reason')
                   })
                 });
                 alert('Holiday Saved!');
                 e.currentTarget.reset();
                 loadHolidays();
               } catch(err) {
                 alert('Error saving holiday');
               }
             }} className="space-y-4">
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Holiday Date</label>
                 <input type="date" name="date" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Reason (e.g. Eid)</label>
                 <input type="text" name="reason" placeholder="Reason (e.g. Eid)" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:font-medium placeholder:text-slate-400" />
               </div>
               <button type="submit" className="w-full bg-slate-800 text-white font-black py-3 rounded-xl hover:bg-slate-700 active:scale-[0.98] transition-all">Save Holiday</button>
             </form>
           </div>
           
           <div>
             <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Upcoming Holidays</h4>
             {holidays.length === 0 ? (
                <div className="text-sm font-bold text-slate-400">No holidays found.</div>
             ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {holidays.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(h => (
                     <div key={h.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                        <div>
                          <div className="font-bold text-slate-900">{h.reason}</div>
                          <div className="text-xs font-bold text-slate-500">{new Date(h.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric'})}</div>
                        </div>
                        <button 
                          onClick={async () => {
                            if(confirm('Delete holiday?')) {
                               await fetchWithAuth(`/holidays/${h.id}`, { method: 'DELETE' });
                               loadHolidays();
                            }
                          }}
                          className="w-8 h-8 rounded-full bg-white text-rose-500 border border-rose-100 flex items-center justify-center hover:bg-rose-50 hover:scale-110 active:scale-95 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                  ))}
                </div>
             )}
           </div>
         </div>
       </div>
       </>
      ) : (
        <div className="bg-white rounded-[32px] p-6 lg:p-10 border border-slate-100 shadow-sm mt-6">
          <h2 className="text-xl font-black text-slate-800 tracking-tight mb-8">Leave Applications</h2>
          {loading ? (
             <div className="text-center text-slate-500 font-bold p-8">Loading leaves...</div>
          ) : leaves.length === 0 ? (
             <div className="text-center text-slate-500 font-bold p-8">No leave applications found.</div>
          ) : (
            <div className="space-y-4">
               {leaves.map((l: any) => (
                  <div key={l.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                     <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                           <h3 className="font-black text-slate-800">{l.user_name}</h3>
                           <span className={cn(
                             "text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full",
                             l.status === 'pending' ? "bg-amber-100 text-amber-700" :
                             l.status === 'approved' ? "bg-emerald-100 text-emerald-700" :
                             "bg-rose-100 text-rose-700"
                           )}>
                              {l.status}
                           </span>
                           <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
                             {l.leave_type || 'Other'}
                           </span>
                        </div>
                        <div className="text-sm font-bold text-slate-500">
                           {format(new Date(l.start_date), 'MMM d, yyyy')} - {format(new Date(l.end_date), 'MMM d, yyyy')}
                        </div>
                        <p className="text-slate-600 bg-white p-3 rounded-xl border border-slate-100 text-sm italic">
                           "{l.reason}"
                        </p>
                     </div>
                     {l.status === 'pending' && (
                        <div className="flex items-center gap-3 md:shrink-0 mt-4 md:mt-0">
                           <button 
                             onClick={() => handleApproveLeave(l.id, 'approved')}
                             className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white p-3 rounded-xl transition-all shadow-sm"
                             title="Approve Leave"
                           >
                             <CheckCircle className="w-5 h-5" />
                           </button>
                           <button 
                             onClick={() => handleApproveLeave(l.id, 'rejected')}
                             className="bg-rose-500 hover:bg-rose-600 active:scale-95 text-white p-3 rounded-xl transition-all shadow-sm"
                             title="Reject Leave"
                           >
                             <XCircle className="w-5 h-5" />
                           </button>
                        </div>
                     )}
                  </div>
               ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
