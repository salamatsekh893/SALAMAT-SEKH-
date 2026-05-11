import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../lib/api';
import { cn } from '../lib/utils';
import { Calendar, ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock, Send, X } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, isSameDay } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import Attendance from './Attendance';

export default function MyAttendance({ user }: { user: any }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [attendance, setAttendance] = useState<any>(null); // Today's attendance
  const [history, setHistory] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ start_date: '', end_date: '', leave_type: 'Sick Leave', reason: '' });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadData();
    loadHolidays();
  }, [currentMonth]);

  const loadHolidays = async () => {
    try {
      const data = await fetchWithAuth('/holidays').catch(() => []);
      setHolidays(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadData = async () => {
    try {
      const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const res = await fetchWithAuth(`/my-attendance?start=${start}&end=${end}&user_id=${user.id}`);
      setHistory(res);
      
      const todayRec = res.find((r: any) => r.date.startsWith(today));
      setAttendance(todayRec);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePunch = async (type: 'in' | 'out') => {
    if (user?.role === 'superadmin') {
      // Using actual Bengali script makes the TTS engine sound much more natural and "local"
      const msg = new SpeechSynthesisUtterance("স্যার, আপনি সুপার অ্যাডমিন। তাই আপনার অ্যাটেনডেন্স দেওয়ার দরকার নেই।");
      msg.lang = 'bn-IN'; // Bengali locale
      msg.rate = 0.9; // Slightly slower for a more natural sound
      
      const voices = window.speechSynthesis.getVoices();
      const bnVoice = voices.find(v => v.lang.startsWith('bn'));
      if (bnVoice) {
        msg.voice = bnVoice;
      }

      window.speechSynthesis.speak(msg);
      alert('Sir apni super admin, tai apnar attendance dorkar nai 😁');
      return;
    }

    try {
      setLoading(true);
      const nowTime = format(new Date(), 'HH:mm:ss');
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const payload: any = {
        user_id: user.id,
        date: today,
        status: 'present'
      };
      
      if (attendance) {
         payload.in_time = attendance.in_time;
         payload.out_time = attendance.out_time;
      }

      if (type === 'in') {
        payload.in_time = nowTime;
      } else {
        payload.out_time = nowTime;
      }
      
      await fetchWithAuth('/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const playVoiceFeedback = (text: string) => {
        const msg = new SpeechSynthesisUtterance(text);
        msg.lang = 'bn-IN';
        msg.rate = 0.9;
        const voices = window.speechSynthesis.getVoices();
        const bnVoice = voices.find(v => v.lang.startsWith('bn'));
        if (bnVoice) msg.voice = bnVoice;
        window.speechSynthesis.speak(msg);
      };

      const hour = parseInt(nowTime.split(':')[0]);
      const minute = parseInt(nowTime.split(':')[1]);

      if (type === 'in') {
        if (hour > 10 || (hour === 10 && minute > 30)) {
          playVoiceFeedback(`আপনার পাঞ্চ ইন সফল হয়েছে, তবে আজকে আপনি লেট করে এসেছেন।`);
        } else {
          playVoiceFeedback(`আপনার পাঞ্চ ইন সফল হয়েছে। আপনার দিন শুভ হোক।`);
        }
      } else {
        if (hour < 16) {
           playVoiceFeedback(`আপনার পাঞ্চ আউট সফল হয়েছে। আপনি হাফ ডে সম্পূর্ণ করেছেন।`);
        } else {
           playVoiceFeedback(`আপনার পাঞ্চ আউট সফল হয়েছে। সম্পূর্ণ দিনের কাজ সম্পন্ন।`);
        }
      }
      
      alert(`Punched ${type} successfully!`);
      loadData();
    } catch (error) {
      alert('Failed to record punch');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await fetchWithAuth('/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          ...leaveForm
        })
      });
      alert('Leave application submitted successfully!');
      setIsLeaveModalOpen(false);
      setLeaveForm({ start_date: '', end_date: '', leave_type: 'Sick Leave', reason: '' });
    } catch (err: any) {
      alert(err.message || 'Failed to apply leave');
    } finally {
      setLoading(false);
    }
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const getStatusColor = (date: Date) => {
     const dayStr = format(date, 'yyyy-MM-dd');
     const record = history.find(r => r.date.startsWith(dayStr));
     const holiday = holidays.find(h => {
       const hDate = new Date(h.date).toISOString().split('T')[0];
       return hDate === dayStr;
     });
     
     if (holiday) return 'bg-pink-500 text-white border-pink-600';
     
     if (!record) {
       if (date.getDay() === 0) return 'bg-indigo-600 text-white'; // Sunday
       if (date > new Date()) return 'bg-white text-slate-800 border-slate-200'; // Future
       return 'bg-white text-slate-800 border-slate-200'; // Past no record
     }
     switch(record.status) {
       case 'present': return 'bg-emerald-500 text-white border-emerald-600';
       case 'absent': return 'bg-rose-500 text-white border-rose-600';
       case 'late': return 'bg-orange-500 text-white border-orange-600';
       case 'leave': return 'bg-blue-500 text-white border-blue-600';
       case 'holiday': return 'bg-pink-500 text-white border-pink-600';
       default: return 'bg-white text-slate-800 border-slate-200';
     }
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayHoliday = holidays.find(h => {
    const hDate = new Date(h.date).toISOString().split('T')[0];
    return hDate === todayStr;
  });

  return (
    <div className="space-y-6 pb-10">
      <div className="space-y-6 max-w-lg mx-auto">
        {/* Top Banner */}
      <div className="bg-gradient-to-br from-indigo-500 to-blue-500 rounded-[32px] p-8 text-center text-white relative shadow-lg">
         <div className="absolute top-4 right-4 leading-none">
            <button 
              onClick={() => setIsLeaveModalOpen(true)}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-sm transition-colors flex items-center gap-2"
            >
              <Send className="w-3 h-3" /> Apply Leave
            </button>
         </div>
         <div className="space-y-4 pt-4">
            <h2 className="text-white/80 font-bold uppercase tracking-widest text-sm">Attendance</h2>
            <h1 className="text-3xl font-black uppercase tracking-tight">{user?.name}</h1>
            <div className="text-3xl font-medium opacity-90 pb-4 tabular-nums">
               {format(currentTime, 'hh:mm:ss a')}
            </div>
            
            {todayHoliday ? (
              <div className="bg-pink-500/30 border border-pink-400 p-4 rounded-xl font-bold flex flex-col items-center gap-2">
                <span className="text-4xl text-pink-200">🎉</span>
                <div className="text-pink-100 text-lg uppercase tracking-wide">{todayHoliday.reason}</div>
                <div className="text-pink-200 text-sm mt-1">Enjoy your holiday!</div>
              </div>
            ) : !attendance?.in_time ? (
              <button 
                onClick={() => handlePunch('in')}
                disabled={loading}
                className="bg-white text-blue-600 rounded-full px-12 py-4 font-black uppercase text-xl shadow-xl hover:scale-105 active:scale-95 transition-all w-full md:w-auto"
              >
                 {loading ? 'Processing...' : 'Punch In'}
              </button>
            ) : !attendance?.out_time ? (
              <div className="space-y-4">
                 <div className="bg-white/20 p-3 rounded-xl font-bold">
                    Punched in at {attendance.in_time}
                 </div>
                 <button 
                   onClick={() => handlePunch('out')}
                   disabled={loading}
                   className="bg-rose-500 text-white rounded-full px-12 py-4 font-black uppercase text-xl shadow-xl hover:scale-105 active:scale-95 transition-all w-full md:w-auto border border-rose-400"
                 >
                    {loading ? 'Processing...' : 'Punch Out'}
                 </button>
              </div>
            ) : (
               <div className="bg-emerald-500/20 border border-emerald-400 p-4 rounded-xl font-bold flex flex-col items-center gap-2">
                 <CheckCircle className="w-8 h-8 text-emerald-300" />
                 <div>
                   <p>In: {attendance.in_time}</p>
                   <p>Out: {attendance.out_time}</p>
                 </div>
                 <div className="text-emerald-200 mt-2">Duty Completed</div>
               </div>
            )}
         </div>
      </div>

      {/* History Calendar */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative z-0">
         <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
               <Calendar className="w-5 h-5 text-indigo-500" />
               <h3 className="font-black text-slate-800 text-lg">My History</h3>
            </div>
            <div className="flex items-center gap-3">
               <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-slate-100 rounded-lg"><ChevronLeft className="w-5 h-5 text-slate-600"/></button>
               <span className="font-bold text-slate-700 min-w-[100px] text-center">{format(currentMonth, 'MMM yyyy')}</span>
               <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-slate-100 rounded-lg"><ChevronRight className="w-5 h-5 text-slate-600"/></button>
            </div>
         </div>

         {/* Legend */}
         <div className="flex flex-wrap gap-3 mb-6 border-b border-slate-50 pb-4 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-600">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500" /> Present</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-rose-500" /> Absent</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-500" /> Late</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500" /> Leave</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-pink-500" /> Holiday</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-indigo-600" /> Sun</div>
         </div>

         {/* Grid */}
         <div className="grid grid-cols-7 gap-2 sm:gap-3">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => (
               <div key={day} className="text-center text-[10px] font-bold text-slate-400 mb-2 uppercase">{day}</div>
            ))}
            
            {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
               <div key={`empty-${i}`} className="aspect-square rounded-xl" />
            ))}

            {daysInMonth.map(date => {
               const isCurrentDay = isToday(date);
               return (
                 <div 
                   key={date.toISOString()}
                   className={cn(
                     "aspect-square rounded-xl flex items-center justify-center font-bold text-sm border-2 transition-all cursor-default",
                     getStatusColor(date),
                     isCurrentDay && "ring-4 ring-indigo-200 ring-offset-2 scale-110 z-10"
                   )}
                 >
                    {format(date, 'd')}
                 </div>
               )
            })}
         </div>
      </div>
      </div>
      
      {user?.role === 'superadmin' && (
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t-2 border-slate-100 px-4 sm:px-0">
          <div className="mb-6">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest">Administrator View</h2>
            <p className="text-slate-500 font-medium">Daily Staff Report is available below for management.</p>
          </div>
          <Attendance />
        </div>
      )}

      {/* Leave Application Modal */}
      <AnimatePresence>
        {isLeaveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Send className="w-5 h-5 text-indigo-500" /> Apply for Leave
                </h3>
                <button onClick={() => setIsLeaveModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleApplyLeave} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Start Date</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.start_date}
                    onChange={e => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">End Date</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.end_date}
                    onChange={e => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Leave Type</label>
                  <select
                    value={leaveForm.leave_type}
                    onChange={e => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1em' }}
                  >
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Privilege Leave">Privilege Leave</option>
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Reason</label>
                  <textarea
                    required
                    rows={3}
                    value={leaveForm.reason}
                    onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
                    placeholder="Why do you need leave?"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white rounded-xl py-3 font-bold shadow-lg hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
