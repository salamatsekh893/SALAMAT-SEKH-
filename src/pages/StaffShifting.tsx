import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../lib/api';
import { Users, ArrowRightLeft, UserCircle } from 'lucide-react';

export default function StaffShifting() {
  const [staff, setStaff] = useState<any[]>([]);
  const [sourceStaffId, setSourceStaffId] = useState('');
  const [targetStaffId, setTargetStaffId] = useState('');
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch all staff who act as Field Officers / Managers
    fetchWithAuth('/employees').then(data => {
      // Filter if necessary. Right now let's just show all or just fo/am/dm
      setStaff(data);
    });
  }, []);

  useEffect(() => {
    if (sourceStaffId) {
      // Fetch groups that belong to the selected staff
      fetchWithAuth('/groups').then(data => {
        setGroups(data.filter((g: any) => g.collector_id?.toString() === sourceStaffId));
        setSelectedGroups([]);
      });
    } else {
      setGroups([]);
      setSelectedGroups([]);
    }
  }, [sourceStaffId]);

  const toggleSelect = (id: string) => {
    setSelectedGroups(prev => 
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const handleShift = async () => {
    if (!targetStaffId) return alert('Please select target staff');
    if (selectedGroups.length === 0) return alert('Please select at least one group to shift');
    if (sourceStaffId === targetStaffId) return alert('Source and Target staff cannot be the same');

    setLoading(true);
    try {
      await fetchWithAuth('/shifting/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupIds: selectedGroups, targetStaffId })
      });
      alert('Groups shifted successfully!');
      setSourceStaffId('');
      setTargetStaffId('');
      setGroups([]);
      setSelectedGroups([]);
    } catch (err: any) {
      alert(err.message || 'Failed to shift groups');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3 uppercase">
            <UserCircle className="w-8 h-8 text-pink-600" />
            Staff Shifting
          </h1>
          <p className="text-slate-500 font-bold text-xs mt-2 uppercase tracking-widest">
            Transfer groups from one staff member to another
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Source Staff */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2">
              Source Staff (Field Officer)
            </label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-pink-500"
              value={sourceStaffId}
              onChange={(e) => setSourceStaffId(e.target.value)}
            >
              <option value="">-- Select Source Staff --</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
              ))}
            </select>

            {groups.length > 0 && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Groups In Portfolio</h3>
                  <button 
                    onClick={() => setSelectedGroups(groups.map(g => g.id.toString()))}
                    className="text-[10px] text-pink-600 font-bold uppercase"
                  >
                    Select All
                  </button>
                </div>
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {groups.map(g => (
                    <label key={g.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-300 cursor-pointer transition-colors bg-white">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-pink-600 focus:ring-pink-500"
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
            
            {sourceStaffId && groups.length === 0 && (
              <div className="mt-6 p-4 text-center bg-slate-50 border border-slate-100 rounded-xl">
                 <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">No groups assigned to this staff</p>
              </div>
            )}
          </div>

          {/* Transfer & Destination */}
          <div className="flex flex-col items-center gap-6">
            <div className="w-12 h-12 bg-pink-50 rounded-full flex items-center justify-center -my-2 md:my-0 md:-ml-3 md:translate-x-1/2 z-10 hidden md:flex text-pink-600 border border-pink-100">
              <ArrowRightLeft className="w-5 h-5" />
            </div>

            <div className="w-full bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mt-4 md:mt-0">
              <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2">
                Target Staff (Field Officer)
              </label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                value={targetStaffId}
                onChange={(e) => setTargetStaffId(e.target.value)}
              >
                <option value="">-- Select Destination Staff --</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id} disabled={s.id.toString() === sourceStaffId}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <button
                  onClick={handleShift}
                  disabled={loading || selectedGroups.length === 0 || !targetStaffId}
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
