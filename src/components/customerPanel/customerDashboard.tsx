import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, UsersRound, Banknote, Wallet, HeartHandshake, Calendar, 
  ArrowRight, ShieldCheck, Clock, CheckCircle
} from 'lucide-react';
import { formatAmount } from '../../lib/utils';
import { cn } from '../../lib/utils';

interface CustomerDashboardProps {
  user: any;
  stats: any;
}

export default function CustomerDashboard({ user, stats }: CustomerDashboardProps) {
  const navigate = useNavigate();

  const activeLoans = stats?.loans || [];
  const savings = stats?.savings || { balance: 0, accNo: 'N/A' };

  const totalOutstanding = activeLoans.reduce((sum: number, loan: any) => {
    if (loan.status === 'active') {
      return sum + (loan.principal + loan.interest - loan.paid);
    }
    return sum;
  }, 0);

  const nextDueDate = activeLoans.length > 0 ? activeLoans[0].nextDue : 'N/A';

  return (
    <div className="flex flex-col gap-4 pb-10">
      {/* Welcome Banner */}
      <div className="relative bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900 rounded-3xl p-6 shadow-xl border border-amber-500/20 overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full text-amber-300 text-[10px] font-black uppercase tracking-widest w-fit mb-3">
              <HeartHandshake className="w-3.5 h-3.5 text-amber-400" /> Customer Account Portal
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">স্বাগতম, {user?.name}</h1>
            <p className="text-amber-200 text-xs mt-1 max-w-xl font-medium">
              Aljooya Subidha Services-এর মেম্বার পোর্টালে আপনাকে স্বাগতম। আপনার লোন অ্যাক্টিভিটি, জমানো টাকা এবং কিস্তির বিবরণী নিচে দেখুন।
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-inner">
            <Calendar className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-black text-amber-200 uppercase tracking-widest">
              {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Grid of Key Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Savings Balance Card */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="bg-gradient-to-br from-indigo-900 to-indigo-950 text-white rounded-2xl p-5 border border-indigo-500/20 shadow-lg relative overflow-hidden"
        >
          <div className="absolute right-0 top-0 -mt-6 -mr-6 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300">Savings Balance (সঞ্চয় আমানত)</span>
              <h2 className="text-2xl sm:text-3xl font-black mt-1">₹{formatAmount(savings.balance)}</h2>
            </div>
            <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-400/30">
              <Wallet className="w-6 h-6 text-indigo-400" />
            </div>
          </div>
          <div className="flex justify-between items-center text-[10px] text-indigo-200 border-t border-indigo-800/50 pt-3 mt-3">
            <span>Account: <span className="font-bold text-white">{savings.accNo}</span></span>
            <span className="font-bold text-emerald-400">● Active</span>
          </div>
        </motion.div>

        {/* Total Outstanding Card */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="bg-gradient-to-br from-amber-900 to-amber-950 text-white rounded-2xl p-5 border border-amber-500/20 shadow-lg relative overflow-hidden"
        >
          <div className="absolute right-0 top-0 -mt-6 -mr-6 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-amber-300">Active Loan Outstanding (অবশিষ্ট ঋণ)</span>
              <h2 className="text-2xl sm:text-3xl font-black mt-1">₹{formatAmount(totalOutstanding)}</h2>
            </div>
            <div className="p-3 bg-amber-500/20 rounded-xl border border-amber-400/30">
              <Banknote className="w-6 h-6 text-amber-400" />
            </div>
          </div>
          <div className="flex justify-between items-center text-[10px] text-amber-200 border-t border-amber-800/50 pt-3 mt-3">
            <span>Next Installment Due: <span className="font-bold text-white">{nextDueDate}</span></span>
            <span className="font-bold text-emerald-400">● Active</span>
          </div>
        </motion.div>
      </div>

      {/* Loan Details & Transaction List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Loan Card details */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h3 className="text-xs font-black text-slate-500 mb-4 tracking-widest uppercase flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-amber-500" /> Active Loans Statement (ঋণ বিবরণী)
          </h3>
          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Loan ID</th>
                  <th className="py-3 px-4">Principal (আসল)</th>
                  <th className="py-3 px-4">Paid (পরিশোধিত)</th>
                  <th className="py-3 px-4">Outstanding (বকেয়া)</th>
                  <th className="py-3 px-4">Next Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {activeLoans.length > 0 ? (
                  activeLoans.map((loan: any) => (
                    <tr key={loan.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="py-3 px-4 font-bold text-indigo-600">{loan.id}</td>
                      <td className="py-3 px-4">₹{formatAmount(loan.principal)}</td>
                      <td className="py-3 px-4 text-emerald-600 font-bold">₹{formatAmount(loan.paid)}</td>
                      <td className="py-3 px-4 text-rose-500 font-black">₹{formatAmount(loan.principal + loan.interest - loan.paid)}</td>
                      <td className="py-3 px-4 font-bold text-slate-600">{loan.nextDue}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400 font-bold">
                      কোনো ঋণ পাওয়া যায়নি (No active loans found)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side Info Box */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-5 border border-slate-200/60 shadow-inner flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2">Need Help? (সহায়তা পেতে)</h4>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              আপনার অ্যাকাউন্টের কোনো লেনদেন বা কিস্তির হিসেবে সমস্যা থাকলে দয়া করে আপনার এলাকার দায়িত্বপ্রাপ্ত ফিল্ড অফিসারের সাথে অথবা আমাদের হেল্পলাইনে যোগাযোগ করুন।
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs mt-4">
            <span className="block text-[8px] uppercase tracking-widest font-bold text-slate-400">Head Office Support</span>
            <span className="block text-xs font-black text-slate-800 mt-1">support@aljooyasubidha.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}
