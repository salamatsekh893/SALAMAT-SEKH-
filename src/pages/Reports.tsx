import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../lib/api';
import { FileText, Download, Filter, Calendar } from 'lucide-react';
import { formatAmount } from '../lib/utils';

export default function Reports() {
  const [reportData, setReportData] = useState<any[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await fetchWithAuth(`/reports/daily?date=${date}`);
      setReportData(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [date]);

  const totalCollected = reportData.reduce((sum, item) => sum + parseFloat(item.amount_paid), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Reports</h1>
          <p className="text-slate-500 text-sm mt-1">Detailed analysis of daily collections and activities</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="date" 
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-600 outline-none"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export PDF</span>
          </button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Date Collection</div>
          <div className="text-3xl font-black text-slate-900">{formatAmount(totalCollected)}</div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Entries</div>
          <div className="text-3xl font-black text-slate-900">{reportData.length}</div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Average / Entry</div>
          <div className="text-3xl font-black text-slate-900">{reportData.length > 0 ? formatAmount(totalCollected / reportData.length) : 0}</div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="hidden md:block">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="text-left text-slate-400 text-[10px] font-black uppercase tracking-widest p-5 border-b border-slate-100">Date/Time</th>
                  <th className="text-left text-slate-400 text-[10px] font-black uppercase tracking-widest p-5 border-b border-slate-100">Customer</th>
                  <th className="text-left text-slate-400 text-[10px] font-black uppercase tracking-widest p-5 border-b border-slate-100">Branch</th>
                  <th className="text-left text-slate-400 text-[10px] font-black uppercase tracking-widest p-5 border-b border-slate-100">Collected By</th>
                  <th className="text-right text-slate-400 text-[10px] font-black uppercase tracking-widest p-5 border-b border-slate-100">Amount</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        <span className="text-slate-400 text-sm font-bold">Fetching records...</span>
                      </div>
                    </td>
                  </tr>
                ) : reportData.length > 0 ? reportData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-5 text-[13px] text-slate-500 font-medium border-b border-slate-50">
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-5 text-[14px] text-slate-900 font-bold border-b border-slate-50">
                      {item.customer_name}
                    </td>
                    <td className="p-5 border-b border-slate-50">
                      <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight">
                        {item.branch_name}
                      </span>
                    </td>
                    <td className="p-5 text-[13px] text-slate-600 font-bold border-b border-slate-50">
                      {item.collected_by_name}
                    </td>
                    <td className="p-5 text-right text-[15px] font-black text-emerald-600 border-b border-slate-50">
                      {formatAmount(item.amount_paid)}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="p-12 text-center">
                      <div className="flex flex-col items-center gap-2 opacity-30">
                        <FileText className="h-10 w-10 text-slate-400" />
                        <span className="text-slate-900 text-sm font-black uppercase tracking-widest">No Records Found</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="block md:hidden p-4 space-y-4">
             {loading ? (
                <div className="p-12 text-center">
                   <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                      <span className="text-slate-400 text-sm font-bold">Fetching records...</span>
                   </div>
                </div>
             ) : reportData.length > 0 ? (
                reportData.map((item) => (
                   <div key={item.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                      <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-3">
                         <div>
                            <div className="font-bold text-slate-900 text-lg leading-tight uppercase">{item.customer_name}</div>
                            <div className="text-[10px] text-slate-400 font-bold tracking-widest mt-1">
                               {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                         </div>
                         <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-xl text-sm font-black border border-emerald-100">
                            {formatAmount(item.amount_paid)}
                         </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                         <div>
                            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Branch</span>
                            <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg text-[11px] uppercase tracking-tight">{item.branch_name}</span>
                         </div>
                         <div>
                            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Collected By</span>
                            <span className="font-bold text-slate-700 uppercase tracking-tight break-words">{item.collected_by_name}</span>
                         </div>
                      </div>
                   </div>
                ))
             ) : (
                <div className="p-12 text-center">
                   <div className="flex flex-col items-center gap-2 opacity-30">
                      <FileText className="h-10 w-10 text-slate-400" />
                      <span className="text-slate-900 text-sm font-black uppercase tracking-widest">No Records Found</span>
                   </div>
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
