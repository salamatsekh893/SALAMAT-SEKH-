import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Phone, MapPin, Landmark, BadgeCheck, ShieldAlert,
  Wallet, PiggyBank, HandCoins, ArrowDownRight, ArrowUpRight, 
  Clock, CheckCircle, FileText, Calendar, HelpCircle, AlertCircle,
  Building, CreditCard
} from 'lucide-react';
import { formatAmount } from '../../lib/utils';
import { cn } from '../../lib/utils';

interface CustomerDashboardProps {
  user: any;
  stats: any;
}

export default function CustomerDashboard({ user, stats }: CustomerDashboardProps) {
  const [activeTab, setActiveTab] = useState<'savings' | 'loans'>('savings');

  // Parse enhanced stats
  const member = stats?.member || {
    member_code: 'N/A',
    full_name: user?.name || 'N/A',
    mobile_no: user?.phone || 'N/A',
    village: 'N/A',
    aadhar_no: 'N/A',
    voter_id: 'N/A',
    guardian_name: 'N/A'
  };

  const loans = stats?.loans || [];
  const savingsAccounts = stats?.savingsAccounts || [];
  const savingsTransactions = stats?.savingsTransactions || [];
  const loanPayments = stats?.loanPayments || [];

  // Filter accounts
  const savingAccountsOnly = savingsAccounts.filter((sa: any) => sa.account_type === 'saving');
  const rdAccountsOnly = savingsAccounts.filter((sa: any) => sa.account_type === 'rd');

  // Math aggregates
  const totalSavingsBalance = savingAccountsOnly.reduce((sum: number, sa: any) => sum + (sa.balance || 0), 0);
  const totalRDBalance = rdAccountsOnly.reduce((sum: number, sa: any) => sum + (sa.balance || 0), 0);

  const activeLoans = loans.filter((l: any) => l.status === 'active');
  const totalOutstanding = activeLoans.reduce((sum: number, loan: any) => {
    return sum + Math.max(0, loan.total_repayment - loan.paid);
  }, 0);
  const totalLoanPaid = loans.reduce((sum: number, loan: any) => sum + (loan.paid || 0), 0);

  const nextDueDate = activeLoans.length > 0 ? activeLoans[0].nextDue : 'N/A';
  const nextDueAmount = activeLoans.length > 0 ? activeLoans[0].installment : 0;

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Welcome Premium Banner */}
      <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 rounded-3xl p-6 lg:p-8 shadow-2xl border border-amber-500/10 overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -ml-16 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3.5">
              <span className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3.5 py-1 rounded-full text-amber-300 text-[10px] font-black uppercase tracking-wider">
                <BadgeCheck className="w-3.5 h-3.5 text-amber-400" /> কাস্টমার অ্যাকাউন্ট পোর্টাল
              </span>
              <span className="bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold px-3 py-1 rounded-full">
                মেম্বার আইডি: {member.member_code}
              </span>
            </div>
            
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              স্বাগতম, {member.full_name} <span className="text-amber-400">👋</span>
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-2 max-w-2xl font-medium leading-relaxed">
              আপনার আলজুয়া সুবিধা সার্ভিসেস পোর্টালটি সম্পূর্ণ সুরক্ষিত। আপনার সমস্ত জমানো আমানত, আরডি (RD) এবং লোন কিস্তির তথ্য রিয়েল-টাইমে নিচে দেওয়া হলো।
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-2.5 bg-white/5 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 shadow-inner">
              <Calendar className="h-4.5 w-4.5 text-amber-400" />
              <div>
                <span className="block text-[8px] uppercase tracking-widest font-black text-amber-300">আজকের তারিখ</span>
                <span className="text-xs font-black text-amber-100 block">
                  {new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bento Grid Financial Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Savings Card */}
        <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 rounded-2xl p-5 border border-indigo-500/10 shadow-lg relative overflow-hidden group hover:shadow-indigo-500/5 transition-all">
          <div className="absolute right-0 top-0 -mt-6 -mr-6 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform"></div>
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">সঞ্চয় আমানত (Savings Balance)</span>
              <h2 className="text-2xl lg:text-3xl font-black text-white mt-1.5">₹{formatAmount(totalSavingsBalance)}</h2>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="flex justify-between items-center text-[10px] text-indigo-300/80 mt-4 pt-3.5 border-t border-indigo-500/10">
            <span>অ্যাকাউন্ট সংখ্যা: <span className="font-bold text-white">{savingAccountsOnly.length} টি</span></span>
            <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">● Active</span>
          </div>
        </div>

        {/* RD Card */}
        <div className="bg-gradient-to-br from-rose-950 via-slate-900 to-rose-950 rounded-2xl p-5 border border-rose-500/10 shadow-lg relative overflow-hidden group hover:shadow-rose-500/5 transition-all">
          <div className="absolute right-0 top-0 -mt-6 -mr-6 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform"></div>
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">আরডি ব্যালেন্স (RD Deposits)</span>
              <h2 className="text-2xl lg:text-3xl font-black text-white mt-1.5">₹{formatAmount(totalRDBalance)}</h2>
            </div>
            <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-400">
              <PiggyBank className="w-5 h-5" />
            </div>
          </div>
          <div className="flex justify-between items-center text-[10px] text-rose-300/80 mt-4 pt-3.5 border-t border-rose-500/10">
            <span>RD স্কিম সংখ্যা: <span className="font-bold text-white">{rdAccountsOnly.length} টি</span></span>
            <span className="font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">● Recurring</span>
          </div>
        </div>

        {/* Loan Outstanding Card */}
        <div className="bg-gradient-to-br from-amber-950 via-slate-900 to-amber-950 rounded-2xl p-5 border border-amber-500/10 shadow-lg relative overflow-hidden group hover:shadow-amber-500/5 transition-all">
          <div className="absolute right-0 top-0 -mt-6 -mr-6 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform"></div>
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">বকেয়া ঋণ (Loan Outstanding)</span>
              <h2 className="text-2xl lg:text-3xl font-black text-white mt-1.5">₹{formatAmount(totalOutstanding)}</h2>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
              <HandCoins className="w-5 h-5" />
            </div>
          </div>
          <div className="flex justify-between items-center text-[10px] text-amber-300/80 mt-4 pt-3.5 border-t border-amber-500/10">
            <span>পরবর্তী কিস্তি: <span className="font-bold text-white">₹{formatAmount(nextDueAmount)}</span></span>
            <span className="font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">বকেয়া তারিখ: {nextDueDate}</span>
          </div>
        </div>

        {/* Loan Paid Card */}
        <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-950 rounded-2xl p-5 border border-emerald-500/10 shadow-lg relative overflow-hidden group hover:shadow-emerald-500/5 transition-all">
          <div className="absolute right-0 top-0 -mt-6 -mr-6 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform"></div>
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">পরিশোধিত ঋণ (Total Repaid)</span>
              <h2 className="text-2xl lg:text-3xl font-black text-white mt-1.5">₹{formatAmount(totalLoanPaid)}</h2>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex justify-between items-center text-[10px] text-emerald-300/80 mt-4 pt-3.5 border-t border-emerald-500/10">
            <span>মোট ঋণ অ্যাকাউন্ট: <span className="font-bold text-white">{loans.length} টি</span></span>
            <span className="font-black text-emerald-400 bg-white/5 px-2 py-0.5 rounded-full">Secure Payments</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Details Layout & Profile Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column - 2 Span: Financial Accounts Detail & Passbooks */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section Navigation Tabs */}
          <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1.5 border border-slate-200 shadow-inner w-fit">
            <button
              onClick={() => setActiveTab('savings')}
              className={cn(
                "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all duration-200 flex items-center gap-2",
                activeTab === 'savings' 
                  ? "bg-white text-slate-950 shadow-sm font-black" 
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <PiggyBank className="w-4 h-4 text-indigo-600" /> সঞ্চয় ও আরডি অ্যাকাউন্ট (Savings & RD)
            </button>
            <button
              onClick={() => setActiveTab('loans')}
              className={cn(
                "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all duration-200 flex items-center gap-2",
                activeTab === 'loans' 
                  ? "bg-white text-slate-950 shadow-sm font-black" 
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <HandCoins className="w-4 h-4 text-amber-600" /> লোন বা ঋণ অ্যাকাউন্ট (Loans List)
            </button>
          </div>

          {/* Conditional Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'savings' ? (
              <motion.div
                key="savings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                id="savings-section"
                className="space-y-4"
              >
                {savingsAccounts.length > 0 ? (
                  savingsAccounts.map((account: any) => (
                    <div 
                      key={account.id}
                      className="bg-white border border-slate-100 shadow-xs hover:shadow-md transition-all rounded-2xl p-5"
                    >
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-11 h-11 rounded-xl flex items-center justify-center font-bold",
                            account.account_type === 'saving' 
                              ? "bg-indigo-50 text-indigo-600 border border-indigo-100" 
                              : "bg-rose-50 text-rose-600 border border-rose-100"
                          )}>
                            {account.account_type === 'saving' ? 'SV' : 'RD'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                                {account.account_type === 'saving' ? 'সঞ্চয়ী আমানত খাতা' : 'রিকারিং ডিপোজিট খাতা (RD)'}
                              </span>
                              <span className={cn(
                                "text-[9px] font-black uppercase px-2 py-0.5 rounded-full",
                                account.status === 'active' ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                              )}>
                                {account.status}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500 font-mono mt-0.5 block">অ্যাকাউন্ট নং: {account.account_no}</span>
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">বর্তমান ব্যালেন্স</span>
                          <span className="block text-xl lg:text-2xl font-black text-slate-950">₹{formatAmount(account.balance)}</span>
                        </div>
                      </div>

                      {/* RD specific metadata */}
                      {account.account_type === 'rd' && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 text-xs mb-4">
                          <div>
                            <span className="block text-[9px] font-black text-slate-400 uppercase">মাসিক জমা</span>
                            <span className="font-bold text-slate-800">₹{formatAmount(account.monthly_deposit || 0)}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-black text-slate-400 uppercase">মেয়াদ (মাস)</span>
                            <span className="font-bold text-slate-800">{account.duration_months} মাস</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-black text-slate-400 uppercase">সুদের হার</span>
                            <span className="font-bold text-emerald-600">{account.interest_rate}% p.a.</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-black text-slate-400 uppercase">সম্ভাব্য ম্যাচুরিটি ব্যালেন্স</span>
                            <span className="font-bold text-slate-800">₹{formatAmount(account.maturity_amount || 0)}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-indigo-500" /> ডিপোজিট ফ্রিকোয়েন্সি: <span className="font-bold text-slate-800 uppercase">{account.deposit_frequency || 'monthly'}</span>
                        </span>
                        {account.maturity_date && (
                          <span className="bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-100/60 font-bold">
                            ম্যাচুরিটি তারিখ: {account.maturity_date}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
                    <PiggyBank className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <h3 className="text-sm font-black text-slate-700">কোনো সেভিংস বা আরডি অ্যাকাউন্ট নেই</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">আপনার নামে কোনো সঞ্চয়ী অ্যাকাউন্ট লিঙ্ক করা নেই।</p>
                  </div>
                )}

                {/* Savings Transactions Passbook */}
                <div className="bg-white border border-slate-100 shadow-xs rounded-2xl p-5">
                  <h3 className="text-xs font-black text-slate-500 mb-4 tracking-widest uppercase flex items-center gap-2">
                    <FileText className="w-4.5 h-4.5 text-indigo-500" /> শেষ ১০টি সঞ্চয় লেনদেন বিবরণী (Passbook Transactions)
                  </h3>
                  
                  {savingsTransactions.length > 0 ? (
                    <div className="divide-y divide-slate-100 overflow-hidden">
                      {savingsTransactions.map((txn: any) => (
                        <div key={txn.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              txn.type === 'deposit' || txn.type === 'interest'
                                ? "bg-emerald-50 text-emerald-600" 
                                : "bg-rose-50 text-rose-600"
                            )}>
                              {txn.type === 'deposit' || txn.type === 'interest' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-slate-800 uppercase">
                                  {txn.type === 'deposit' ? 'জমা (Deposit)' : txn.type === 'interest' ? 'সুদ ক্রেডিট (Interest)' : 'উত্তোলন (Withdrawal)'}
                                </span>
                                <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                                  {txn.account_no}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 block mt-0.5">{txn.remarks || 'সঞ্চয় কিস্তি'}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={cn(
                              "font-black text-sm",
                              txn.type === 'deposit' || txn.type === 'interest' ? "text-emerald-600" : "text-rose-500"
                            )}>
                              {txn.type === 'deposit' || txn.type === 'interest' ? '+' : '-'} ₹{formatAmount(txn.amount)}
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold block mt-0.5">{txn.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-400 font-bold text-xs">
                      কোনো সঞ্চয় লেনদেনের তথ্য পাওয়া যায়নি।
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="loans"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                id="loans-section"
                className="space-y-4"
              >
                {loans.length > 0 ? (
                  loans.map((loan: any) => {
                    const percentPaid = loan.total_repayment > 0 ? Math.min(100, Math.round((loan.paid / loan.total_repayment) * 100)) : 0;
                    return (
                      <div 
                        key={loan.id}
                        className="bg-white border border-slate-100 shadow-xs hover:shadow-md transition-all rounded-2xl p-5"
                      >
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4 mb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-800 uppercase tracking-wide">সক্রিয় লোন নম্বর</span>
                              <span className={cn(
                                "text-[9px] font-black uppercase px-2 py-0.5 rounded-full",
                                loan.status === 'active' ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                              )}>
                                {loan.status}
                              </span>
                            </div>
                            <span className="text-xs text-indigo-600 font-black font-mono mt-1 block">{loan.loan_no}</span>
                          </div>

                          <div className="text-left sm:text-right">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">অবশিষ্ট পরিশোধযোগ্য</span>
                            <span className="block text-xl lg:text-2xl font-black text-rose-500">
                              ₹{formatAmount(Math.max(0, loan.total_repayment - loan.paid))}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar of loan payment */}
                        <div className="mb-4">
                          <div className="flex justify-between text-[11px] text-slate-500 mb-1.5">
                            <span className="font-medium">ঋণ পরিশোধ অগ্রগতি</span>
                            <span className="font-bold text-slate-800">{percentPaid}% সম্পন্ন</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200 shadow-inner">
                            <div 
                              className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${percentPaid}%` }}
                            />
                          </div>
                        </div>

                        {/* Loan details row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 text-xs mb-4">
                          <div>
                            <span className="block text-[9px] font-black text-slate-400 uppercase">লোন আসল টাকা</span>
                            <span className="font-bold text-slate-800">₹{formatAmount(loan.principal)}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-black text-slate-400 uppercase">মোট সুদ (Interest)</span>
                            <span className="font-bold text-slate-800">₹{formatAmount(loan.interest)}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-black text-slate-400 uppercase">ইতিমধ্যে পরিশোধিত</span>
                            <span className="font-black text-emerald-600">₹{formatAmount(loan.paid)}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-black text-slate-400 uppercase">মোট লোন মেয়াদ</span>
                            <span className="font-bold text-slate-800">{loan.duration_weeks} সপ্তাহ</span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-slate-500 font-medium">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-indigo-500" /> পরবর্তী লোন কিস্তির তারিখ: <span className="font-bold text-rose-500">{loan.nextDue}</span>
                          </span>
                          <span className="bg-amber-50 text-amber-800 px-3 py-1 rounded-lg border border-amber-100/60 font-black">
                            কিস্তির পরিমান: ₹{formatAmount(loan.installment)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
                    <HandCoins className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <h3 className="text-sm font-black text-slate-700">কোনো সক্রিয় লোন পাওয়া যায়নি</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">আপনার নামে কোনো একটিভ লোন বা ঋণ নেই।</p>
                  </div>
                )}

                {/* Loan Installment Payments Approved Receipts */}
                <div className="bg-white border border-slate-100 shadow-xs rounded-2xl p-5">
                  <h3 className="text-xs font-black text-slate-500 mb-4 tracking-widest uppercase flex items-center gap-2">
                    <FileText className="w-4.5 h-4.5 text-amber-500" /> কিস্তির রশিদ তালিকা (Receipt Collections History)
                  </h3>
                  
                  {loanPayments.length > 0 ? (
                    <div className="divide-y divide-slate-100 overflow-hidden">
                      {loanPayments.map((p: any) => (
                        <div key={p.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                              ₹
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-slate-800 uppercase">কিস্তি পেমেন্ট রিসিভ</span>
                                <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono">
                                  {p.loan_no}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 block mt-0.5">রশিদ আইডি: Col-{p.id}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-black text-sm text-emerald-600">+ ₹{formatAmount(p.amount_paid)}</span>
                            <span className="text-[9px] text-slate-400 font-bold block mt-0.5">{p.payment_date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-400 font-bold text-xs">
                      লোন কিস্তি পরিশোধের কোনো ইতিহাস নেই।
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right column - 1 Span: Member Registered Profile Details & Support */}
        <div className="space-y-6">
          
          {/* Member Details Panel */}
          <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 relative overflow-hidden">
            <h3 className="text-xs font-black text-slate-500 tracking-widest uppercase mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <User className="w-4.5 h-4.5 text-amber-500" /> নিবন্ধিত প্রোফাইল তথ্য (Profile ID)
            </h3>
            
            <div className="space-y-3.5 text-xs text-slate-700 font-medium">
              <div>
                <span className="block text-[8px] uppercase tracking-widest text-slate-400">মেম্বার পুরো নাম (Full Name)</span>
                <span className="font-bold text-slate-950 block text-[13px]">{member.full_name}</span>
              </div>
              
              <div>
                <span className="block text-[8px] uppercase tracking-widest text-slate-400">অভিভাবক (Guardian)</span>
                <span className="font-bold text-slate-800 block">
                  {member.guardian_name} ({member.guardian_type || 'পিতা'})
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[8px] uppercase tracking-widest text-slate-400">মোবাইল নম্বর</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {member.mobile_no}</span>
                </div>
                <div>
                  <span className="block text-[8px] uppercase tracking-widest text-slate-400">পিন কোড (Pin)</span>
                  <span className="font-bold text-slate-800 font-mono">{member.pin_code || '742301'}</span>
                </div>
              </div>

              <div>
                <span className="block text-[8px] uppercase tracking-widest text-slate-400">গ্রাম / ঠিকানা (Village Address)</span>
                <span className="font-bold text-slate-800 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" /> 
                  <span>{member.village || 'N/A'}, পোস্ট: {member.post_office || 'N/A'}, থানা: {member.police_station || 'N/A'}</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <div>
                  <span className="block text-[8px] uppercase tracking-widest text-slate-400 font-bold">আধার নম্বর (Aadhaar)</span>
                  <span className="font-bold text-slate-800 font-mono text-[11px]">{member.aadhar_no || '•••• •••• ••••'}</span>
                </div>
                <div>
                  <span className="block text-[8px] uppercase tracking-widest text-slate-400 font-bold">ভোটার আইডি (Voter)</span>
                  <span className="font-bold text-slate-800 font-mono text-[11px]">{member.voter_id || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Support & Helpline Box */}
          <div className="bg-gradient-to-br from-slate-900 to-amber-950 text-white rounded-2xl p-5 border border-amber-500/10 shadow-lg relative overflow-hidden flex flex-col justify-between">
            <div className="absolute right-0 top-0 -mt-6 -mr-6 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none"></div>
            
            <div>
              <div className="flex items-center gap-2 mb-3 text-amber-400">
                <HelpCircle className="w-5 h-5" />
                <h4 className="text-xs font-black uppercase tracking-wider">জরুরি সহায়তা প্রয়োজন? (Support)</h4>
              </div>
              <p className="text-xs text-amber-200/80 leading-relaxed font-medium">
                আপনার পাসবইয়ের হিসাব বা কিস্তির পরিশোধিত রশিদের সাথে কোনো অমিল থাকলে অনুগ্রহ করে আপনার দায়িত্বপ্রাপ্ত ফিল্ড অফিসার (FO) অথবা ব্রাঞ্চ অফিসে যোগাযোগ করুন।
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 mt-5">
              <span className="block text-[8px] uppercase tracking-widest font-black text-amber-300">হেড অফিস কাস্টমার কেয়ার</span>
              <span className="block text-xs font-black text-white mt-1">support@aljooyasubidha.com</span>
              <span className="block text-[10px] text-amber-200/60 mt-1 font-semibold">হেল্পলাইন: +৮৮০-১৭xxxxxxxx</span>
            </div>
          </div>
          
        </div>

      </div>
    </div>
  );
}
