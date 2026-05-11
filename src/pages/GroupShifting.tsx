import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../lib/api';
import { Users, ArrowRightLeft, Search } from 'lucide-react';

export default function GroupShifting() {
  const [groups, setGroups] = useState<any[]>([]);
  const [sourceGroupId, setSourceGroupId] = useState('');
  const [targetGroupId, setTargetGroupId] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWithAuth('/groups').then(data => setGroups(data));
  }, []);

  useEffect(() => {
    if (sourceGroupId) {
      fetchWithAuth('/members').then(data => {
        setMembers(data.filter((m: any) => m.group_id?.toString() === sourceGroupId));
        setSelectedMembers([]);
      });
    } else {
      setMembers([]);
      setSelectedMembers([]);
    }
  }, [sourceGroupId]);

  const toggleSelect = (id: string) => {
    setSelectedMembers(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleShift = async () => {
    if (!targetGroupId) return alert('Please select a target group');
    if (selectedMembers.length === 0) return alert('Please select at least one member to shift');
    if (sourceGroupId === targetGroupId) return alert('Source and Target group cannot be the same');

    setLoading(true);
    try {
      await fetchWithAuth('/shifting/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberIds: selectedMembers, targetGroupId })
      });
      alert('Members shifted successfully!');
      setSourceGroupId('');
      setTargetGroupId('');
      setMembers([]);
      setSelectedMembers([]);
    } catch (err: any) {
      alert(err.message || 'Failed to shift members');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3 uppercase">
            <Users className="w-8 h-8 text-indigo-600" />
            Group Shifting
          </h1>
          <p className="text-slate-500 font-bold text-xs mt-2 uppercase tracking-widest">
            Transfer members from one group to another
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Source Group */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2">
              Source Group
            </label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
              value={sourceGroupId}
              onChange={(e) => setSourceGroupId(e.target.value)}
            >
              <option value="">-- Select Source Group --</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.group_name} ({g.group_code})</option>
              ))}
            </select>

            {members.length > 0 && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Members</h3>
                  <button 
                    onClick={() => setSelectedMembers(members.map(m => m.id.toString()))}
                    className="text-[10px] text-indigo-600 font-bold uppercase"
                  >
                    Select All
                  </button>
                </div>
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {members.map(m => (
                    <label key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-300 cursor-pointer transition-colors bg-white">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        checked={selectedMembers.includes(m.id.toString())}
                        onChange={() => toggleSelect(m.id.toString())}
                      />
                      <div>
                        <div className="font-bold text-sm text-slate-900">{m.full_name}</div>
                        <div className="text-[10px] text-slate-500 uppercase">{m.member_code}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Transfer & Destination */}
          <div className="flex flex-col items-center gap-6">
            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center -my-2 md:my-0 md:-ml-3 md:translate-x-1/2 z-10 hidden md:flex text-indigo-600 border border-indigo-100">
              <ArrowRightLeft className="w-5 h-5" />
            </div>

            <div className="w-full bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mt-4 md:mt-0">
              <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2">
                Target Group
              </label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                value={targetGroupId}
                onChange={(e) => setTargetGroupId(e.target.value)}
              >
                <option value="">-- Select Destination Group --</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id} disabled={g.id.toString() === sourceGroupId}>
                    {g.group_name} ({g.group_code})
                  </option>
                ))}
              </select>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <button
                  onClick={handleShift}
                  disabled={loading || selectedMembers.length === 0 || !targetGroupId}
                  className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  {loading ? 'Shifting...' : `Shift ${selectedMembers.length} Members`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
