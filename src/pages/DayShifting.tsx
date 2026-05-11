import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../lib/api';
import { Calendar, ArrowRightLeft } from 'lucide-react';

export default function DayShifting() {
  const [sourceDay, setSourceDay] = useState('');
  const [targetDay, setTargetDay] = useState('');
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    if (sourceDay) {
      // Fetch groups that belong to the selected day
      fetchWithAuth('/groups').then(data => {
        setGroups(data.filter((g: any) => g.meeting_day === sourceDay));
        setSelectedGroups([]);
      });
    } else {
      setGroups([]);
      setSelectedGroups([]);
    }
  }, [sourceDay]);

  const toggleSelect = (id: string) => {
    setSelectedGroups(prev => 
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const handleShift = async () => {
    if (!targetDay) return alert('Please select target day');
    if (selectedGroups.length === 0) return alert('Please select at least one group to shift');
    if (sourceDay === targetDay) return alert('Source and Target days cannot be the same');

    setLoading(true);
    try {
      await fetchWithAuth('/shifting/day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupIds: selectedGroups, targetDay })
      });
      alert('Day shifted successfully!');
      setSourceDay('');
      setTargetDay('');
      setGroups([]);
      setSelectedGroups([]);
    } catch (err: any) {
      alert(err.message || 'Failed to shift days');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3 uppercase">
          <Calendar className="w-8 h-8 text-orange-500" />
          Day Shifting
        </h1>
        <p className="text-slate-500 font-bold text-xs mt-2 uppercase tracking-widest">
          Transfer groups from one meeting day to another
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Source Day */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2">
            Source Day
          </label>
          <select
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500"
            value={sourceDay}
            onChange={(e) => setSourceDay(e.target.value)}
          >
            <option value="">-- Select Source Day --</option>
            {days.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {groups.length > 0 && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Groups on this day</h3>
                <button 
                  onClick={() => setSelectedGroups(groups.map(g => g.id.toString()))}
                  className="text-[10px] text-orange-600 font-bold uppercase hover:underline"
                >
                  Select All
                </button>
              </div>
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {groups.map(g => (
                  <label key={g.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-300 cursor-pointer transition-colors bg-white">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                      checked={selectedGroups.includes(g.id.toString())}
                      onChange={() => toggleSelect(g.id.toString())}
                    />
                    <div>
                      <div className="font-bold text-sm text-slate-900">{g.group_name}</div>
                      <div className="text-[10px] text-slate-500 uppercase">{g.group_code} • {g.meeting_day}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
          
          {sourceDay && groups.length === 0 && (
            <div className="mt-6 p-4 text-center bg-slate-50 border border-slate-100 rounded-xl">
               <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">No groups assigned to this day</p>
            </div>
          )}
        </div>

        {/* Transfer & Destination */}
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center -my-2 md:my-0 md:-ml-3 md:translate-x-1/2 z-10 hidden md:flex text-orange-500 border border-orange-100">
            <ArrowRightLeft className="w-5 h-5" />
          </div>

          <div className="w-full bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mt-4 md:mt-0">
            <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2">
              Target Day
            </label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
              value={targetDay}
              onChange={(e) => setTargetDay(e.target.value)}
            >
              <option value="">-- Select Destination Day --</option>
              {days.map(d => (
                <option key={d} value={d} disabled={d === sourceDay}>
                  {d}
                </option>
              ))}
            </select>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <button
                onClick={handleShift}
                disabled={loading || selectedGroups.length === 0 || !targetDay}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <ArrowRightLeft className="w-4 h-4" />
                {loading ? 'Shifting...' : `Shift ${selectedGroups.length} Groups`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
