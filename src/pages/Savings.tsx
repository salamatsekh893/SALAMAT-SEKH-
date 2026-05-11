import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { PiggyBank, Plus, Search, RefreshCw, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { fetchWithAuth } from '../lib/api';
import { formatAmount } from '../lib/utils';

export default function Savings({ type }: { type?: 'saving' | 'rd' }) {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAccounts();
  }, [type]); // Refetch if type changes, although for SPA it's fine.

  const fetchAccounts = async () => {
    try {
      const data = await fetchWithAuth('/savings');
      let filteredData = data;
      // Filter out if type is provided
      if (type) {
        filteredData = filteredData.filter((a: any) => a.account_type === type);
      }
      setAccounts(filteredData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(accounts.map(a => ({
      'Account No': a.account_no,
      'Member Name': a.member_name,
      'Member Code': a.member_code,
      'Type': a.account_type.toUpperCase(),
      'Status': a.status,
      'Balance': formatAmount(a.balance || 0)
    })));
    const wb = XLSX.utils.book_new();
    const sheetName = type === 'rd' ? 'RD_Accounts' : 'Savings_Accounts';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${sheetName}.xlsx`);
  };

  const filteredAccounts = accounts.filter(a => 
    a.account_no?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.member_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const title = type === 'rd' ? 'RECURRING DEPOSITS (RD)' : type === 'saving' ? 'SAVINGS ACCOUNTS' : 'SAVINGS & RD';

  return (
    <div className="space-y-6 pb-10 w-full px-3 sm:px-4 lg:px-6 pt-4">
      {/* Header */}
      <div className="flex items-center gap-3 text-[#1976d2] mb-2">
        <div className="w-10 h-10 rounded-full bg-[#e3f2fd] flex items-center justify-center">
          <PiggyBank className="w-5 h-5 text-[#1976d2]" />
        </div>
        <h1 className="text-xl md:text-2xl font-bold uppercase tracking-wider">{title}</h1>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <button 
          onClick={() => navigate(`/savings/new?type=${type || 'saving'}`)}
          className="bg-[#1976d2] hover:bg-[#1565c0] text-white px-5 py-2.5 rounded-full text-sm font-bold uppercase tracking-wider shadow-sm transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4"/> Open Account
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 w-full">
        {(!type || type === 'saving') && (
          <div className="bg-[#1976d2] text-white p-4 rounded-[20px] shadow-lg flex flex-col justify-center items-center relative overflow-hidden min-h-[140px]">
             <div className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-white/90 text-center mb-1 relative z-10">
               Total Savings Balance
             </div>
             <div className="text-2xl md:text-3xl font-black text-center leading-none text-white tracking-tight relative z-10">
               ₹{formatAmount(accounts.filter(a => a.account_type === 'saving').reduce((sum, a) => sum + parseFloat(a.balance || 0), 0))}
             </div>
          </div>
        )}
        
        {(!type || type === 'rd') && (
          <div className="bg-[#9c27b0] text-white p-4 rounded-[20px] shadow-lg flex flex-col justify-center items-center relative overflow-hidden min-h-[140px]">
             <div className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-white/90 text-center mb-1 relative z-10">
               Total RD Balance
             </div>
             <div className="text-2xl md:text-3xl font-black text-center leading-none text-white tracking-tight relative z-10">
               ₹{formatAmount(accounts.filter(a => a.account_type === 'rd').reduce((sum, a) => sum + parseFloat(a.balance || 0), 0))}
             </div>
          </div>
        )}
        
        <div className="bg-[#009688] text-white p-4 rounded-[20px] shadow-lg flex flex-col justify-center items-center relative overflow-hidden min-h-[140px]">
           <div className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-white/90 text-center mb-1 relative z-10">
             Active Accounts
           </div>
           <div className="text-2xl md:text-3xl font-black text-center leading-none text-white tracking-tight relative z-10">
             {accounts.filter(a => a.status === 'active').length}
           </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-[20px] shadow-lg border border-slate-100 overflow-hidden flex flex-col">
        <div className="p-4 md:p-6 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by AC number or name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-[12px] text-sm font-medium text-slate-700 focus:outline-none focus:border-[#1976d2] focus:ring-1 focus:ring-[#1976d2] transition-colors"
            />
          </div>
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-[12px] text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 font-medium">Loading contents...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap bg-slate-50">Account Details</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap bg-slate-50">Type & Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap bg-slate-50 text-right">Balance</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap bg-slate-50 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAccounts.map((acc, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={acc.id} 
                    className="hover:bg-blue-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 overflow-hidden shrink-0">
                          {acc.profile_image ? (
                             <img src={acc.profile_image} className="w-full h-full object-cover" />
                          ) : acc.member_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 tracking-tight">{acc.member_name}</div>
                          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{acc.account_no} • {acc.member_code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          acc.account_type === 'saving' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {acc.account_type === 'saving' ? 'Savings' : 'RD'}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          acc.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {acc.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-lg font-black text-slate-800 tracking-tight">₹{formatAmount(acc.balance || 0)}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => navigate(`/savings/passbook/${acc.account_type}/${acc.id}`)}
                        className="px-4 py-1.5 bg-[#1976d2] text-white hover:bg-black rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2 mx-auto whitespace-nowrap shadow-sm active:scale-95"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> View Passbook
                      </button>
                    </td>
                  </motion.tr>
                ))}
                {filteredAccounts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400 font-medium text-sm">No accounts found matching your search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
