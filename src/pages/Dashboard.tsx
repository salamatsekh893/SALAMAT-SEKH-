import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { fetchWithAuth } from '../lib/api';
import { formatAmount } from '../lib/utils';
import { Building2, UsersRound, Banknote, Wallet, ArrowUpRight, TrendingUp, Calendar, Clock, CheckSquare, ArrowRightLeft, Users, Sun, Coins, MapPin, ClipboardList, CheckCircle, Settings } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

import { usePermissions } from '../hooks/usePermissions';

export default function Dashboard({ user }: { user: any }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();

  useEffect(() => {
    fetchWithAuth('/dashboard')
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (!user) return null;

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  );

  const statCards = [
    { name: 'Total Branches', value: stats?.branches || 0, icon: Building2 },
    { name: 'Total Customers', value: stats?.customers || 0, icon: UsersRound },
    { name: 'Pending Loan Apps', value: stats?.pendingLoans || 0, icon: Clock },
    { name: 'Awaiting Disbursal', value: stats?.approvedLoans || 0, icon: CheckSquare },
    { name: 'Active Loans', value: stats?.activeLoans || 0, icon: Banknote },
    { name: 'Total Bank Balance', value: `₹${formatAmount(stats?.totalBankBalance || 0)}`, icon: Building2 },
    { name: 'Total Capital', value: `₹${formatAmount(stats?.totalCapital || 0)}`, icon: Coins },
    { name: 'Total Collection', value: `₹${formatAmount(stats?.collections || 0)}`, icon: Wallet },
  ];

  const getRoleLabel = () => {
    switch(user?.role) {
      case 'superadmin': return 'Super Admin Command Center';
      case 'dm': return 'Divisional Manager Dashboard';
      case 'am': return 'Area Manager Dashboard';
      case 'branch_manager': return 'Branch Command Center';
      case 'fo': return 'Field Officer Console';
      default: return 'System Statistics';
    }
  };

  return (
    <div className="flex flex-col gap-2 sm:gap-4 pb-10">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-indigo-100 pb-1.5 gap-2">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">{getRoleLabel()}</h1>
          <p className="text-slate-500 font-medium text-[9px] sm:text-[10px] mt-0.5 uppercase tracking-widest">Dashboard Overview</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-slate-100">
            <Calendar className="h-4 w-4 text-indigo-500" />
            <span className="text-xs font-bold text-slate-700">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>
      </div>

      <motion.div 
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1
            }
          }
        }}
        className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-4"
      >
        {statCards.map((stat, idx) => {
          if (stat.name === 'Total Branches' && !hasPermission('sub_dash_stat_branches')) return null;
          if (stat.name === 'Total Customers' && !hasPermission('sub_dash_stat_customers')) return null;
          if (stat.name === 'Pending Loan Apps' && !hasPermission('sub_dash_stat_loans_pending')) return null;
          if (stat.name === 'Awaiting Disbursal' && !hasPermission('sub_dash_stat_loans_awaiting')) return null;
          if (stat.name === 'Active Loans' && !hasPermission('sub_dash_stat_loans_active')) return null;
          if (stat.name === 'Total Bank Balance' && !hasPermission('sub_dash_stat_bank')) return null;
          if (stat.name === 'Total Capital' && !hasPermission('sub_dash_stat_capital')) return null;
          if (stat.name === 'Total Collection' && !hasPermission('sub_dash_stat_collection')) return null;
          return (
            <motion.div 
              key={stat.name} 
              variants={{
                hidden: { opacity: 0, y: 20 },
                show: { opacity: 1, y: 0 }
              }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className={cn(
                "group relative p-2 sm:p-2.5 lg:p-2 rounded-lg shadow-md flex justify-between items-center transition-transform overflow-hidden min-h-[70px] sm:min-h-[85px] lg:min-h-[75px]",
                idx % 6 === 0 ? "bg-[#0ea5e9]" :
                idx % 6 === 1 ? "bg-[#10b981]" :
                idx % 6 === 2 ? "bg-[#f97316]" :
                idx % 6 === 3 ? "bg-[#ec4899]" :
                idx % 6 === 4 ? "bg-[#8b5cf6]" :
                "bg-[#f43f5e]"
              )}
            >
              <div className="absolute right-0 top-0 -mt-2 -mr-2 w-16 h-16 bg-white opacity-10 rounded-full blur-xl transform group-hover:scale-150 transition-transform duration-500"></div>
              
              <div className="card-info relative z-10">
                <h3 className="text-[9px] sm:text-[11px] text-white/90 mb-0.5 sm:mb-1 font-black uppercase tracking-wider line-clamp-1">{stat.name}</h3>
                <h1 className="text-base sm:text-xl md:text-2xl text-white font-black tracking-tight">{stat.value}</h1>
              </div>
              <div className="text-white/20 transition-transform group-hover:scale-110 group-hover:-rotate-12 duration-300 ml-1 relative z-10 shrink-0">
                <stat.icon className="w-6 h-6 sm:w-10 sm:h-10" strokeWidth={2.5} />
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Company Financial Overview Section */}
      {hasPermission('sub_dash_portfolio') && stats?.financeStats && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-4 sm:p-5 shadow-lg border border-indigo-500/20 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                <Banknote className="w-5 h-5 text-emerald-400" />
                Active Portfolio Overview
              </h2>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
              <span className="block text-[8px] uppercase font-bold text-indigo-300 tracking-widest text-right">Running Outstanding</span>
              <span className="block text-lg sm:text-xl font-black text-emerald-400 leading-none mt-1">₹{formatAmount(stats?.financeStats?.totalOutstanding || 0)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-6 gap-1.5 sm:gap-2 relative z-10">
            <div className="bg-white/5 border border-white/10 rounded-xl p-2 sm:p-2.5 lg:p-2 backdrop-blur-sm transition-all hover:bg-white/10">
              <span className="block text-[8px] uppercase font-bold text-slate-400 tracking-widest mb-0.5">Total Principal</span>
              <span className="text-xs sm:text-sm font-black text-white">₹{formatAmount(stats?.financeStats?.totalPrincipal || 0)}</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-2 sm:p-2.5 lg:p-2 backdrop-blur-sm transition-all hover:bg-white/10">
              <span className="block text-[8px] uppercase font-bold text-indigo-300 tracking-widest mb-0.5">Total Interest</span>
              <span className="text-xs sm:text-sm font-black text-indigo-100">₹{formatAmount(stats?.financeStats?.totalInterest || 0)}</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-2 sm:p-2.5 lg:p-2 backdrop-blur-sm transition-all hover:bg-white/10">
              <span className="block text-[8px] uppercase font-bold text-slate-400 tracking-widest mb-0.5 text-nowrap">Target Collectible</span>
              <span className="text-xs sm:text-sm font-black text-white">₹{formatAmount(stats?.financeStats?.totalRepayment || 0)}</span>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2 sm:p-2.5 lg:p-2 backdrop-blur-sm transition-all hover:bg-emerald-500/20">
              <span className="block text-[8px] uppercase font-bold text-emerald-400 tracking-widest mb-0.5">Collected</span>
              <span className="text-xs sm:text-sm font-black text-emerald-400">₹{formatAmount(stats?.financeStats?.totalPaid || 0)}</span>
            </div>
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-2 sm:p-2.5 lg:p-2 backdrop-blur-sm transition-all hover:bg-rose-500/20">
              <span className="block text-[8px] uppercase font-bold text-rose-300 tracking-widest mb-0.5">Interest Baki</span>
              <span className="text-xs sm:text-sm font-black text-rose-300">₹{formatAmount((stats?.financeStats?.totalInterest || 0) - ((stats?.financeStats?.totalPaid || 0) * ((stats?.financeStats?.totalInterest || 0) / (stats?.financeStats?.totalRepayment || 1))))}</span>
            </div>
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-2 sm:p-2.5 lg:p-2 backdrop-blur-sm transition-all hover:bg-orange-500/20">
              <span className="block text-[8px] uppercase font-bold text-orange-300 tracking-widest mb-0.5 text-nowrap">Asol Baki</span>
              <span className="text-xs sm:text-sm font-black text-orange-300">₹{formatAmount((stats?.financeStats?.totalPrincipal || 0) - ((stats?.financeStats?.totalPaid || 0) * ((stats?.financeStats?.totalPrincipal || 0) / (stats?.financeStats?.totalRepayment || 1))))}</span>
            </div>
          </div>
        </motion.div>
      )}

      {(hasPermission('sub_dash_quick_close') || hasPermission('sub_dash_quick_loan') || hasPermission('sub_dash_quick_col') || hasPermission('sub_dash_quick_member') || hasPermission('sub_dash_quick_group_shift') || hasPermission('sub_dash_quick_staff_shift') || hasPermission('sub_dash_quick_day_shift')) && (
      <div>
        <h3 className="text-sm sm:text-base font-bold text-slate-700 mb-2 tracking-tight uppercase">Quick Actions</h3>
        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-7 gap-1 sm:gap-1.5">
          {hasPermission('sub_dash_quick_close') && (
          <button 
            className="flex flex-col items-center justify-center py-1 px-0.5 sm:py-1 bg-gradient-to-br from-rose-400 to-rose-500 border border-rose-500/50 rounded-lg sm:rounded-xl shadow-sm hover:shadow-md hover:from-rose-500 hover:to-rose-600 transition-all group h-12 sm:h-16 lg:h-14"
            onClick={() => navigate('/loans/closed')}
          >
            <div className="w-4 h-4 sm:w-5 sm:h-5 bg-white/20 rounded-full flex items-center justify-center mb-0.5 shadow-sm group-hover:scale-110 transition-transform border border-white/20">
              <CheckSquare className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
            </div>
            <span className="text-[6px] sm:text-[7px] lg:text-[8px] font-bold text-white text-center leading-tight uppercase">Closed Loans</span>
          </button>
          )}

          {hasPermission('sub_dash_quick_loan') && (
          <button 
            className="flex flex-col items-center justify-center py-1 px-0.5 sm:py-1 bg-gradient-to-br from-indigo-400 to-indigo-500 border border-indigo-500/50 rounded-lg sm:rounded-xl shadow-sm hover:shadow-md hover:from-indigo-500 hover:to-indigo-600 transition-all group h-12 sm:h-16 lg:h-14"
            onClick={() => navigate('/loans/new')}
          >
            <div className="w-4 h-4 sm:w-5 sm:h-5 bg-white/20 rounded-full flex items-center justify-center mb-0.5 shadow-sm group-hover:scale-110 transition-transform border border-white/20">
              <Banknote className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
            </div>
            <span className="text-[6px] sm:text-[7px] lg:text-[8px] font-bold text-white text-center leading-tight uppercase">New Loan</span>
          </button>
          )}

          {hasPermission('sub_dash_quick_col') && (
          <button 
            className="flex flex-col items-center justify-center py-1 px-0.5 sm:py-1 bg-gradient-to-br from-emerald-400 to-emerald-500 border border-emerald-500/50 rounded-lg sm:rounded-xl shadow-sm hover:shadow-md hover:from-emerald-500 hover:to-emerald-600 transition-all group h-12 sm:h-16 lg:h-14"
            onClick={() => navigate('/collections')}
          >
            <div className="w-4 h-4 sm:w-5 sm:h-5 bg-white/20 rounded-full flex items-center justify-center mb-0.5 shadow-sm group-hover:scale-110 transition-transform border border-white/20">
              <Wallet className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
            </div>
            <span className="text-[6px] sm:text-[7px] lg:text-[8px] font-bold text-white text-center leading-tight uppercase">Collection</span>
          </button>
          )}

          {hasPermission('sub_dash_quick_member') && (
          <button 
            className="flex flex-col items-center justify-center py-1 px-0.5 sm:py-1 bg-gradient-to-br from-blue-400 to-blue-500 border border-blue-500/50 rounded-lg sm:rounded-xl shadow-sm hover:shadow-md hover:from-blue-500 hover:to-blue-600 transition-all group h-12 sm:h-16 lg:h-14"
            onClick={() => navigate('/members/new')}
          >
            <div className="w-4 h-4 sm:w-5 sm:h-5 bg-white/20 rounded-full flex items-center justify-center mb-0.5 shadow-sm group-hover:scale-110 transition-transform border border-white/20">
              <UsersRound className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
            </div>
            <span className="text-[6px] sm:text-[7px] lg:text-[8px] font-bold text-white text-center leading-tight uppercase">New Member</span>
          </button>
          )}

          {hasPermission('sub_dash_quick_group_shift') && (
          <button 
            className="flex flex-col items-center justify-center py-1 px-0.5 sm:py-1 bg-gradient-to-br from-purple-400 to-purple-500 border border-purple-500/50 rounded-lg sm:rounded-xl shadow-sm hover:shadow-md hover:from-purple-500 hover:to-purple-600 transition-all group h-12 sm:h-16 lg:h-14"
            onClick={() => navigate('/shifting/group')}
          >
            <div className="w-4 h-4 sm:w-5 sm:h-5 bg-white/20 rounded-full flex items-center justify-center mb-0.5 shadow-sm group-hover:scale-110 transition-transform border border-white/20">
              <Users className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
            </div>
            <span className="text-[6px] sm:text-[7px] lg:text-[8px] font-bold text-white text-center leading-tight uppercase">Group Shift</span>
          </button>
          )}

          {hasPermission('sub_dash_quick_staff_shift') && (
          <button 
            className="flex flex-col items-center justify-center py-1 px-0.5 sm:py-1 bg-gradient-to-br from-pink-400 to-pink-500 border border-pink-500/50 rounded-lg sm:rounded-xl shadow-sm hover:shadow-md hover:from-pink-500 hover:to-pink-600 transition-all group h-12 sm:h-16 lg:h-14"
            onClick={() => navigate('/shifting/staff')}
          >
            <div className="w-4 h-4 sm:w-5 sm:h-5 bg-white/20 rounded-full flex items-center justify-center mb-0.5 shadow-sm group-hover:scale-110 transition-transform border border-white/20">
              <ArrowRightLeft className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
            </div>
            <span className="text-[6px] sm:text-[7px] lg:text-[8px] font-bold text-white text-center leading-tight uppercase">Staff Shift</span>
          </button>
          )}

          {hasPermission('sub_dash_quick_travel_track') && (
          <button 
            className="flex flex-col items-center justify-center py-1 px-0.5 sm:py-1 bg-gradient-to-br from-amber-400 to-amber-500 border border-amber-500/50 rounded-lg sm:rounded-xl shadow-sm hover:shadow-md hover:from-amber-500 hover:to-amber-600 transition-all group h-12 sm:h-16 lg:h-14"
            onClick={() => navigate('/travel/track')}
          >
            <div className="w-4 h-4 sm:w-5 sm:h-5 bg-white/20 rounded-full flex items-center justify-center mb-0.5 shadow-sm group-hover:scale-110 transition-transform border border-white/20">
              <MapPin className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
            </div>
            <span className="text-[6px] sm:text-[7px] lg:text-[8px] font-bold text-white text-center leading-tight uppercase">Track Day</span>
          </button>
          )}

          {hasPermission('sub_dash_quick_travel_log') && (
          <button 
            className="flex flex-col items-center justify-center py-1 px-0.5 sm:py-1 bg-gradient-to-br from-slate-600 to-slate-700 border border-slate-700/50 rounded-lg sm:rounded-xl shadow-sm hover:shadow-md hover:from-slate-700 hover:to-slate-800 transition-all group h-12 sm:h-16 lg:h-14"
            onClick={() => navigate('/travel/log')}
          >
            <div className="w-4 h-4 sm:w-5 sm:h-5 bg-white/20 rounded-full flex items-center justify-center mb-0.5 shadow-sm group-hover:scale-110 transition-transform border border-white/20">
              <ClipboardList className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
            </div>
            <span className="text-[6px] sm:text-[7px] lg:text-[8px] font-bold text-white text-center leading-tight uppercase">Travel Log</span>
          </button>
          )}

          {hasPermission('sub_dash_quick_travel_approve') && (
          <button 
            className="flex flex-col items-center justify-center py-1 px-0.5 sm:py-1 bg-gradient-to-br from-orange-400 to-orange-500 border border-orange-500/50 rounded-lg sm:rounded-xl shadow-sm hover:shadow-md hover:from-orange-500 hover:to-orange-600 transition-all group h-12 sm:h-16 lg:h-14"
            onClick={() => navigate('/travel/approvals')}
          >
            <div className="w-4 h-4 sm:w-5 sm:h-5 bg-white/20 rounded-full flex items-center justify-center mb-0.5 shadow-sm group-hover:scale-110 transition-transform border border-white/20">
              <CheckCircle className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
            </div>
            <span className="text-[6px] sm:text-[7px] lg:text-[8px] font-bold text-white text-center leading-tight uppercase">Approvals</span>
          </button>
          )}

          {hasPermission('sub_dash_quick_day_shift') && (
          <button 
            className="flex flex-col items-center justify-center py-1 px-0.5 sm:py-1 bg-gradient-to-br from-orange-400 to-orange-500 border border-orange-500/50 rounded-lg sm:rounded-xl shadow-sm hover:shadow-md hover:from-orange-500 hover:to-orange-600 transition-all group h-12 sm:h-16 lg:h-14"
            onClick={() => navigate('/shifting/day')}
          >
            <div className="w-4 h-4 sm:w-5 sm:h-5 bg-white/20 rounded-full flex items-center justify-center mb-0.5 shadow-sm group-hover:scale-110 transition-transform border border-white/20">
              <Sun className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
            </div>
            <span className="text-[6px] sm:text-[7px] lg:text-[8px] font-bold text-white text-center leading-tight uppercase">Day Shift</span>
          </button>
          )}

          {['superadmin', 'admin'].includes(user?.role || '') && (
          <button 
            className="flex flex-col items-center justify-center py-1 px-0.5 sm:py-1 bg-gradient-to-br from-slate-400 to-slate-500 border border-slate-500/50 rounded-lg sm:rounded-xl shadow-sm hover:shadow-md hover:from-slate-500 hover:to-slate-600 transition-all group h-12 sm:h-16 lg:h-14"
            onClick={() => navigate('/travel/settings')}
          >
            <div className="w-4 h-4 sm:w-5 sm:h-5 bg-white/20 rounded-full flex items-center justify-center mb-0.5 shadow-sm group-hover:scale-110 transition-transform border border-white/20">
              <Settings className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
            </div>
            <span className="text-[6px] sm:text-[7px] lg:text-[8px] font-bold text-white text-center leading-tight uppercase">Trv Config</span>
          </button>
          )}
        </div>
      </div>
      )}

      {stats?.trends && stats.trends.length > 0 && hasPermission('sub_dash_chart_trend') && (
        <div className="grid grid-cols-1 gap-4 mt-2">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
            <h3 className="text-sm font-bold text-slate-700 mb-4 tracking-tight uppercase flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              Collection Trend
            </h3>
            <div className="flex-1 min-h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.trends}>
                  <defs>
                    <linearGradient id="colorCol" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} dx={-10} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCol)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

