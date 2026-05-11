import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../lib/api';
import { format, differenceInDays } from 'date-fns';
import { AlertCircle, Search, Filter, Download } from 'lucide-react';
import { formatAmount } from '../lib/utils';

export default function OverdueList() {
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [branches, setBranches] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetchWithAuth('/loans'),
      fetchWithAuth('/branches')
    ]).then(([loansData, branchesData]) => {
      // Filter only active loans
      const activeLoans = loansData.filter((l: any) => l.status === 'active');
      
      // Calculate overdue for each loan
      // Simple logic: if last payment was more than its frequency ago OR if no payment and start_date was long ago
      // But for now let's just show those with total_paid < amount
      const overdueOnes = activeLoans.filter((l: any) => {
        const expected = Number(l.amount) + (Number(l.amount) * (Number(l.interest_rate) / 100));
        return Number(l.total_paid) < expected;
      });

      setLoans(overdueOnes);
      setBranches(branchesData);
      setLoading(loading => false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const filteredLoans = loans.filter(l => 
    (l.member_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
     l.loan_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     l.member_code?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterBranch === '' || l.branch_id === Number(filterBranch))
  );

  if (loading) return <div className="p-8 text-center">Loading overdue data...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Overdue List</h1>
          <p className="text-slate-500">Monitor loans with pending balances</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search member name, code or loan no..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 min-w-[200px]">
          <Filter className="text-slate-400 w-4 h-4" />
          <select
            className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
          >
            <option value="">All Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.branch_name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Loan Info</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Member</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Group</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Balance Details</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredLoans.length > 0 ? filteredLoans.map((loan) => {
                const totalAmount = Number(loan.amount) + (Number(loan.amount) * (Number(loan.interest_rate) / 100));
                const balance = totalAmount - Number(loan.total_paid);
                
                return (
                  <tr key={loan.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">{loan.loan_no || `L-${loan.id}`}</div>
                      <div className="text-xs text-slate-500">{format(new Date(loan.start_date), 'dd MMM yyyy')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">{loan.member_name}</div>
                      <div className="text-xs text-slate-500">{loan.member_code}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600">{loan.group_name || 'N/A'}</div>
                      <div className="text-xs text-slate-500">{loan.branch_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-rose-600">₹{formatAmount(balance)} Pending</div>
                      <div className="text-xs text-slate-500">Paid: ₹{formatAmount(loan.total_paid)} / ₹{formatAmount(totalAmount)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
                        <AlertCircle className="w-3 h-3" />
                        Overdue
                      </span>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No overdue loans found matching your criteria.
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
