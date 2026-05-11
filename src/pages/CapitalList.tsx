import React, { useState, useEffect } from 'react';
import { voiceFeedback } from '../lib/voice';
import { motion } from 'motion/react';
import { Coins, Plus, Trash2, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { fetchWithAuth } from '../lib/api';
import { formatAmount } from '../lib/utils';

export default function CapitalList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [capitals, setCapitals] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCapitals();
  }, []);

  const loadCapitals = async () => {
    try {
      const data = await fetchWithAuth('/capital');
      setCapitals(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this capital entry? This may reverse a bank transaction.')) return;
    try {
      await fetchWithAuth(`/capital/${id}`, { method: 'DELETE' });
      loadCapitals();
    } catch (err) {
      console.error(err);
    }
  };

  const exportToExcel = () => {
    const exportData = capitals.map((c, i) => ({
      'SL NO': i + 1,
      'Date': format(new Date(c.date), 'dd/MM/yyyy'),
      'Amount': c.amount,
      'Method': c.payment_method?.toUpperCase(),
      'Bank Account': c.bank_name ? `${c.bank_name} - ${c.account_number}` : 'N/A',
      'Remarks': c.remarks
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Capital');
    XLSX.writeFile(wb, `Capital_${format(new Date(), 'dd_MM_yyyy')}.xlsx`);
  };

  const filteredCapitals = capitals.filter(c => 
    c.payment_method?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.remarks?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.bank_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCapital = capitals.reduce((acc, c) => acc + parseFloat(c.amount), 0);

  return (
    <div className="space-y-6 pb-10 w-full">
      {/* Summary Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-3 px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4">
        <div className="bg-[#3b82f6] text-white px-4 sm:px-6 py-2 sm:py-3 rounded shadow-md border-b-4 border-blue-700 flex flex-col justify-center items-center w-full xl:w-auto">
           <div className="text-[10px] sm:text-[12px] font-black uppercase tracking-wider opacity-90 text-center mb-1">Total Capital Added</div>
           <div className="text-lg sm:text-xl lg:text-3xl font-black text-center leading-none">₹{formatAmount(totalCapital)}</div>
        </div>

        <div className="flex flex-col gap-2 w-full xl:w-auto mt-1 xl:mt-0 xl:self-end">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 xl:w-64">
              <Search className="absolute text-slate-400 w-4 h-4 left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search entries..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              />
            </div>
            <button 
              onClick={exportToExcel}
              className="bg-[#10b981] text-white px-3 sm:px-4 py-2 rounded text-[10px] sm:text-[12px] font-black uppercase tracking-wider shadow-sm hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              Excel
            </button>
            {user?.role === 'superadmin' && (
              <button 
                onClick={() => navigate('/capital/add')}
                className="bg-[#3b82f6] text-white px-3 sm:px-4 py-2 rounded text-[10px] sm:text-[12px] font-black uppercase tracking-wider shadow-sm hover:bg-blue-600 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" /> Add Capital
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden md:mx-6 mx-3">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[900px]">
             <thead>
              <tr className="bg-gradient-to-r from-orange-400 to-pink-500 text-white divide-x divide-white/20">
                <th className="text-center text-[10px] font-black uppercase tracking-wider p-2.5 w-[50px]">SL NO</th>
                <th className="text-left text-[10px] font-black uppercase tracking-wider p-2.5 w-[120px]">DATE</th>
                <th className="text-right text-[10px] font-black uppercase tracking-wider p-2.5 w-[150px]">AMOUNT</th>
                <th className="text-left text-[10px] font-black uppercase tracking-wider p-2.5 w-[150px]">PAYMENT TYPE</th>
                <th className="text-left text-[10px] font-black uppercase tracking-wider p-2.5 w-[150px]">SOURCE</th>
                <th className="text-left text-[10px] font-black uppercase tracking-wider p-2.5">REMARKS / BANK</th>
                {user?.role === 'superadmin' && (
                  <th className="text-center text-[10px] font-black uppercase tracking-wider p-2.5 w-[80px]">ACTION</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCapitals.map((capital, idx) => (
                <tr key={capital.id} className="hover:bg-blue-50/50 transition-colors divide-x divide-slate-100">
                  <td className="p-2.5 text-center">
                    <span className="text-[12px] font-black text-slate-500">{idx + 1}</span>
                  </td>
                  <td className="p-2.5">
                    <span className="text-[12px] font-black text-slate-800">{format(new Date(capital.date), 'dd/MM/yyyy')}</span>
                  </td>
                  <td className="p-2.5 text-right">
                    <span className="text-[14px] font-black text-emerald-600">
                      ₹{formatAmount(capital.amount)}
                    </span>
                  </td>
                  <td className="p-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      capital.payment_method === 'cash' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {capital.payment_method}
                    </span>
                  </td>
                  <td className="p-2.5">
                    <div className="flex flex-col">
                      <span className={`text-[12px] font-black ${capital.source_type === 'other' ? 'text-violet-600' : 'text-slate-600'}`}>
                        {capital.source_type === 'other' ? 'OTHER PARTY' : 'OWN CAPITAL'}
                      </span>
                      {capital.source_type === 'other' && (capital.investor_name || capital.source_name) && (
                        <div className="flex flex-col mt-0.5">
                          <span className="text-[11px] font-semibold text-slate-700">
                            {capital.investor_name || capital.source_name}
                          </span>
                          {(capital.investor_mobile || capital.source_mobile) && (
                            <span className="text-[10px] font-medium text-slate-500">
                              {capital.investor_mobile || capital.source_mobile}
                            </span>
                          )}
                          {(capital.investor_address || capital.source_address) && (
                            <span className="text-[10px] font-medium text-slate-400 truncate max-w-[140px]" title={capital.investor_address || capital.source_address}>
                              {capital.investor_address || capital.source_address}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-2.5">
                    <div className="flex flex-col">
                      <span className="text-[12px] font-semibold text-slate-700">{capital.remarks || '-'}</span>
                      {capital.payment_method === 'bank' && capital.bank_name && (
                        <span className="text-[11px] font-bold text-slate-500 uppercase mt-0.5">{capital.bank_name} - {capital.account_number}</span>
                      )}
                    </div>
                  </td>
                  {user?.role === 'superadmin' && (
                    <td className="p-2.5 text-center">
                      <button 
                        onClick={() => handleDelete(capital.id)}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded mx-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filteredCapitals.length === 0 && !loading && (
                <tr>
                  <td colSpan={user?.role === 'superadmin' ? 6 : 5} className="p-10 text-center text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    No Capital Entries Found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
