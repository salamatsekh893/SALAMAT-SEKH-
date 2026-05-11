import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../lib/api';
import { Banknote, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { cn, formatAmount } from '../lib/utils';
import { motion } from 'motion/react';
import { voiceFeedback } from '../lib/voice';

const STATUS_COLORS = {
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-orange-50 text-orange-700 border-orange-200'
};

export default function Salary() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [branches, setBranches] = useState<any[]>([]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [empRes, branchRes] = await Promise.all([
        fetchWithAuth(`/salaries?month=${month}`),
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

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this salary record?')) return;
    try {
      await fetchWithAuth(`/salaries/${id}`, { method: 'DELETE' });
      voiceFeedback.success();
      loadData();
    } catch (err: any) {
      alert(err.message);
      voiceFeedback.error();
    }
  };

  const handleUpdate = async (userId: number, field: string, value: string | number) => {
    const originalEmp = employees.find(e => e.user_id === userId);
    if (!originalEmp) return;
    
    const updatedEmp = { ...originalEmp, [field]: value };
    // update state optimistically
    setEmployees(employees.map(emp => 
        emp.user_id === userId ? updatedEmp : emp
    ));

    try {
      const res = await fetchWithAuth('/salaries', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          month,
          addition: updatedEmp.addition,
          deduction: updatedEmp.deduction,
          status: updatedEmp.status
        })
      });
      // apply calculated net_salary back
      setEmployees(prev => prev.map(emp => 
        emp.user_id === userId ? { ...emp, net_salary: res.net_salary, payment_date: res.payment_date } : emp
      ));
    } catch (error: any) {
      alert(error.message);
      // Revert on error
      setEmployees(employees.map(emp => 
        emp.user_id === userId ? originalEmp : emp
      ));
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
            <Banknote className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Salary & Payroll</h1>
            <p className="text-slate-500 font-medium text-sm">Manage monthly employee salaries</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <input 
             type="month" 
             value={month}
             onChange={(e) => setMonth(e.target.value)}
             className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600"
             max={new Date().toISOString().substring(0, 7)}
           />
        </div>
      </div>

      <div className="bg-white rounded-[32px] overflow-hidden border border-slate-100 shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-500 font-bold">Loading records...</div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:-mx-0 px-4 sm:px-0">
            <div className="hidden md:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Employee</th>
                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Base Salary</th>
                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Addition</th>
                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Deduction</th>
                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Net Salary</th>
                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 min-w-[150px]">Status</th>
                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {employees.map((emp) => {
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
                              <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-0.5">{emp.role} • {branchName}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-5 font-bold text-slate-700">
                          ₹{formatAmount(emp.base_salary)}
                        </td>
                        <td className="p-3">
                          <input 
                             type="number"
                             className="w-20 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-600"
                             value={emp.addition || ''}
                             onChange={(e) => handleUpdate(emp.user_id, 'addition', e.target.value)}
                             disabled={emp.status === 'paid'}
                          />
                        </td>
                        <td className="p-3">
                          <input 
                             type="number"
                             className="w-20 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-600"
                             value={emp.deduction || ''}
                             onChange={(e) => handleUpdate(emp.user_id, 'deduction', e.target.value)}
                             disabled={emp.status === 'paid'}
                          />
                        </td>
                        <td className="p-5">
                          <div className="font-black text-indigo-700 text-lg tracking-tight">
                              ₹{formatAmount(emp.net_salary)}
                          </div>
                        </td>
                        <td className="p-5">
                          <div className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-bold uppercase tracking-wider w-fit",
                              STATUS_COLORS[emp.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending
                          )}>
                              {emp.status === 'paid' ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                              <select
                              value={emp.status}
                              onChange={(e) => handleUpdate(emp.user_id, 'status', e.target.value)}
                              className="bg-transparent outline-none appearance-none cursor-pointer pr-4"
                              >
                              <option value="pending">Pending</option>
                              <option value="paid">Paid</option>
                              </select>
                          </div>
                          {emp.payment_date && <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 ml-1">Paid: {new Date(emp.payment_date).toLocaleDateString()}</div>}
                        </td>
                        <td className="p-5 text-right">
                          {emp.id && (
                            <button 
                              onClick={() => handleDelete(emp.id)}
                              className="w-10 h-10 flex items-center justify-center bg-white text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-100 rounded-xl transition-all shadow-sm ml-auto"
                              title="Delete Salary Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {employees.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 font-bold">
                        No employees found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="block md:hidden space-y-4 py-4">
               {employees.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-xs bg-slate-50 rounded-xl border border-slate-100">
                     No employees found.
                  </div>
               ) : (
                  employees.map((emp) => {
                     const branchName = branches.find(b => b.id === emp.branch_id)?.branch_name || 'N/A';
                     return (
                        <div key={emp.user_id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                           <div className="p-4 flex items-start justify-between border-b border-slate-100">
                              <div className="flex items-center gap-3">
                                 <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold uppercase text-lg shadow-sm border border-indigo-100">
                                   {emp.name.charAt(0)}
                                 </div>
                                 <div>
                                   <div className="font-black text-slate-900 tracking-tight uppercase">{emp.name}</div>
                                   <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-0.5">{emp.role} • {branchName}</div>
                                 </div>
                              </div>
                              {emp.id && (
                                <button 
                                  onClick={() => handleDelete(emp.id)}
                                  className="w-10 h-10 shrink-0 flex items-center justify-center bg-white text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-all shadow-sm ml-2"
                                  title="Delete Salary Record"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                           </div>
                           <div className="p-4 grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Base Salary</p>
                                <p className="text-sm font-black text-slate-900">₹{formatAmount(emp.base_salary)}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Salary</p>
                                <p className="text-sm font-black text-indigo-600">₹{formatAmount(emp.net_salary)}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Addition</p>
                                <input 
                                   type="number"
                                   className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-600"
                                   value={emp.addition || ''}
                                   onChange={(e) => handleUpdate(emp.user_id, 'addition', e.target.value)}
                                   disabled={emp.status === 'paid'}
                                />
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Deduction</p>
                                <input 
                                   type="number"
                                   className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-600"
                                   value={emp.deduction || ''}
                                   onChange={(e) => handleUpdate(emp.user_id, 'deduction', e.target.value)}
                                   disabled={emp.status === 'paid'}
                                />
                              </div>
                           </div>
                           <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Status</p>
                              <div className="flex flex-col items-end">
                                 <div className={cn(
                                     "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-wider w-fit",
                                     STATUS_COLORS[emp.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending
                                 )}>
                                     {emp.status === 'paid' ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                                     <select
                                       value={emp.status}
                                       onChange={(e) => handleUpdate(emp.user_id, 'status', e.target.value)}
                                       className="bg-transparent outline-none appearance-none cursor-pointer pr-4"
                                     >
                                       <option value="pending">Pending</option>
                                       <option value="paid">Paid</option>
                                     </select>
                                 </div>
                                 {emp.payment_date && <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Paid: {new Date(emp.payment_date).toLocaleDateString()}</div>}
                              </div>
                           </div>
                        </div>
                     )
                  })
               )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
