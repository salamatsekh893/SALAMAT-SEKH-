import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  HandCoins, Calendar, Clock, CheckCircle2, AlertCircle, 
  FileText, ArrowLeft, Eye, ShieldCheck, CreditCard, Landmark 
} from 'lucide-react';
import { formatAmount, cn } from '../../lib/utils';

interface MembarLoanAcountProps {
  loans: any[];
  loanPayments: any[];
  member: any;
  selectedLoan?: any;
  setSelectedLoan?: (loan: any | null) => void;
}

export default function MembarLoanAcount({ 
  loans, 
  loanPayments, 
  member,
  selectedLoan: propsSelectedLoan,
  setSelectedLoan: propsSetSelectedLoan
}: MembarLoanAcountProps) {
  const [localSelectedLoan, setLocalSelectedLoan] = useState<any | null>(null);

  const selectedLoan = propsSelectedLoan !== undefined ? propsSelectedLoan : localSelectedLoan;
  const setSelectedLoan = propsSetSelectedLoan !== undefined ? propsSetSelectedLoan : setLocalSelectedLoan;

  // Function to dynamically generate EMI schedule based on loan attributes
  const generateEMISchedule = (loan: any) => {
    const schedule = [];
    const installmentAmt = Number(loan.installment) || 0;
    const duration = Number(loan.duration_weeks) || 0;
    const totalRepay = Number(loan.total_repayment) || 0;
    
    // Parse starting date or use current as fallback
    let currentDueDate = new Date();
    if (loan.nextDue && loan.nextDue !== 'N/A') {
      // loan.nextDue comes as formatted locale string like 'DD/MM/YYYY' or 'MM/DD/YYYY'
      const parts = loan.nextDue.split('/');
      if (parts.length === 3) {
        // Assume DD/MM/YYYY or MM/DD/YYYY. We try to parse safely
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        const parsed = new Date(year, month, day);
        if (!isNaN(parsed.getTime())) {
          currentDueDate = parsed;
        }
      }
    }

    // Go backwards to simulate start date of the weeks
    const startDate = new Date(currentDueDate);
    startDate.setDate(startDate.getDate() - (duration * 7));

    let accumulatedPaid = Number(loan.paid) || 0;

    for (let w = 1; w <= duration; w++) {
      const emiDueDate = new Date(startDate);
      emiDueDate.setDate(startDate.getDate() + (w * 7));

      // Calculate how much was paid for this specific weekly EMI
      let paidForThisWeek = 0;
      let status: 'PAID' | 'PARTIAL' | 'PENDING' = 'PENDING';

      if (accumulatedPaid >= installmentAmt) {
        paidForThisWeek = installmentAmt;
        accumulatedPaid -= installmentAmt;
        status = 'PAID';
      } else if (accumulatedPaid > 0) {
        paidForThisWeek = accumulatedPaid;
        accumulatedPaid = 0;
        status = 'PARTIAL';
      } else {
        paidForThisWeek = 0;
        status = 'PENDING';
      }

      schedule.push({
        installmentNo: w,
        dueDate: emiDueDate.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' }),
        amount: installmentAmt,
        paidAmount: paidForThisWeek,
        status: status,
      });
    }

    return schedule;
  };

  if (selectedLoan) {
    const schedule = generateEMISchedule(selectedLoan);
    const outstanding = Math.max(0, selectedLoan.total_repayment - selectedLoan.paid);
    const percentPaid = selectedLoan.total_repayment > 0 
      ? Math.min(100, Math.round((selectedLoan.paid / selectedLoan.total_repayment) * 100)) 
      : 0;

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-5"
      >
        {/* Detail Header & Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <button
            onClick={() => setSelectedLoan(null)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-black text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-all rounded-lg border border-slate-200 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> তালিকায় ফিরে যান (Back to List)
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-slate-400">লোন অ্যাকাউন্ট নং:</span>
            <span className="text-xs font-black text-indigo-900 font-mono bg-indigo-50 border border-indigo-150 px-2.5 py-1 rounded-md">
              {selectedLoan.loan_no}
            </span>
          </div>
        </div>

        {/* Loan Master Details Block */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[4px] bg-amber-500" />
          
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-500" /> লোন অ্যাকাউন্টের বিস্তারিত তথ্য
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Box 1 */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 shadow-inner">
              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">কাস্টমার নাম ও আইডি</span>
              <span className="block text-xs font-black text-slate-800 mt-1">{member.full_name || 'N/A'}</span>
              <span className="block text-[10px] text-slate-500 font-mono mt-0.5">আইডি: {member.member_code || 'N/A'}</span>
            </div>

            {/* Box 2 */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 shadow-inner">
              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">লোন বিবরণী</span>
              <div className="mt-1 space-y-0.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">লোন আসল:</span>
                  <span className="font-bold text-slate-800">₹{formatAmount(selectedLoan.principal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">মোট সুদ:</span>
                  <span className="font-bold text-slate-800">₹{formatAmount(selectedLoan.interest)}</span>
                </div>
              </div>
            </div>

            {/* Box 3 */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 shadow-inner">
              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">পরিশোধ স্থিতি</span>
              <div className="mt-1 space-y-0.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">পরিশোধিত:</span>
                  <span className="font-black text-emerald-600">₹{formatAmount(selectedLoan.paid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">অবশিষ্ট বকেয়া:</span>
                  <span className="font-black text-rose-500">₹{formatAmount(outstanding)}</span>
                </div>
              </div>
            </div>

            {/* Box 4 */}
            <div className="bg-amber-50/30 border border-amber-500/15 rounded-xl p-3.5">
              <span className="block text-[8px] font-black text-amber-800/85 uppercase tracking-wider">কিস্তি বিবরণ</span>
              <div className="mt-1 space-y-0.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-amber-800/80">কিস্তির পরিমাণ:</span>
                  <span className="font-black text-amber-950">₹{formatAmount(selectedLoan.installment)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-800/80">মেয়াদ সপ্তাহ:</span>
                  <span className="font-bold text-amber-950">{selectedLoan.duration_weeks} সপ্তাহ</span>
                </div>
              </div>
            </div>

          </div>

          {/* Progress Bar of repayment */}
          <div className="mt-4 bg-slate-50/50 border border-slate-150 p-3.5 rounded-xl">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="font-black text-slate-500 uppercase tracking-wider">লোন পরিশোধ অগ্রগতি বার (Repayment Progress)</span>
              <span className="font-black text-indigo-950 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-[10px]">{percentPaid}% পরিশোধিত</span>
            </div>
            <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden border border-slate-300 shadow-inner">
              <div 
                className="bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500 h-full rounded-full transition-all duration-700" 
                style={{ width: `${percentPaid}%` }}
              />
            </div>
          </div>
        </div>

        {/* EMI Chart / Installment Schedule Table (Line boxes, perfect colors) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">কিস্তি শিডিউল চার্ট (EMI Installment Schedule)</h3>
                <p className="text-[10px] text-slate-400 font-medium">প্রতিটি কিস্তির তারিখ, পরিমাণ ও জমার অবস্থা নিচে দেখুন।</p>
              </div>
            </div>
            
            <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full border border-slate-200 font-mono">
              মোট কিস্তি সংখ্যা: {selectedLoan.duration_weeks}
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-inner max-h-[450px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider sticky top-0 bg-white z-10">
                  <th className="px-4 py-3 text-center border-r border-slate-200 w-16">কিস্তি নং</th>
                  <th className="px-4 py-3 border-r border-slate-200">নির্ধারিত তারিখ (Due Date)</th>
                  <th className="px-4 py-3 text-right border-r border-slate-200">কিস্তি পরিমাণ</th>
                  <th className="px-4 py-3 text-right border-r border-slate-200">পরিশোধিত টাকা</th>
                  <th className="px-4 py-3 text-center">জমার অবস্থা (Status)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-xs text-slate-700 font-medium">
                {schedule.map((row) => (
                  <tr 
                    key={row.installmentNo}
                    className={cn(
                      "hover:bg-slate-50/50 transition-colors",
                      row.status === 'PAID' ? "bg-emerald-50/5" : "bg-white"
                    )}
                  >
                    <td className="px-4 py-2.5 text-center font-black text-slate-500 border-r border-slate-150 font-mono bg-slate-50/30">
                      {row.installmentNo}
                    </td>
                    <td className="px-4 py-2.5 border-r border-slate-150">
                      {row.dueDate}
                    </td>
                    <td className="px-4 py-2.5 text-right border-r border-slate-150 font-mono text-slate-800">
                      ₹{formatAmount(row.amount)}
                    </td>
                    <td className="px-4 py-2.5 text-right border-r border-slate-150 font-mono">
                      <span className={cn(
                        "font-bold",
                        row.paidAmount > 0 ? "text-emerald-600" : "text-slate-400"
                      )}>
                        ₹{formatAmount(row.paidAmount)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border",
                        row.status === 'PAID' 
                          ? "bg-emerald-100/60 text-emerald-800 border-emerald-200" 
                          : row.status === 'PARTIAL'
                          ? "bg-amber-100/60 text-amber-800 border-amber-200"
                          : "bg-rose-50 text-rose-600 border-rose-200/50"
                      )}>
                        {row.status === 'PAID' ? 'PAID (জমা)' : row.status === 'PARTIAL' ? 'PARTIAL (আংশিক)' : 'PENDING (বাকি)'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment History Inside Detail Page */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
            <FileText className="w-4 h-4 text-emerald-500" /> এই লোন অ্যাকাউন্টের পেমেন্ট ট্রানজেকশন হিস্ট্রি
          </h3>

          {loanPayments.filter((p: any) => p.loan_no === selectedLoan.loan_no).length > 0 ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-150">
              {loanPayments.filter((p: any) => p.loan_no === selectedLoan.loan_no).map((p: any, idx: number) => (
                <div key={p.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-400 font-mono">#{idx + 1}</span>
                    <div>
                      <span className="font-bold text-slate-800 block">কালেকশন কিস্তি পেমেন্ট</span>
                      <span className="text-[10px] text-slate-400 block font-semibold">কালেকশন আইডি: COL-{p.id}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-emerald-600 bg-emerald-50 border border-emerald-100/50 px-2 py-0.5 rounded-md">
                      + ₹{formatAmount(p.amount_paid)}
                    </span>
                    <span className="text-[9px] text-slate-400 block font-bold mt-1">{p.payment_date}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 font-bold py-4 text-center">এখনো কোনো কিস্তি কালেকশন হিস্ট্রি পাওয়া যায়নি।</p>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Excel-style table listing all loans (Line box, colors, responsive) */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        
        {/* Header bar */}
        <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/10 text-amber-600 rounded-lg">
              <HandCoins className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">আমার সক্রিয় লোন হিসাব তালিকা</h3>
              <p className="text-[9px] text-slate-400 font-bold mt-0.5">সবগুলো লোন অ্যাকাউন্ট ও বকেয়া কিস্তির হিসাব এক নজরে দেখুন</p>
            </div>
          </div>
          <span className="text-[9px] font-black bg-white border border-slate-200 text-indigo-700 px-2.5 py-1 rounded-full font-mono">
            মোট অ্যাকাউন্ট: {loans.length} টি
          </span>
        </div>

        {loans.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="px-4 py-3 text-center border-r border-slate-200 w-12">ক্র. নং</th>
                  <th className="px-4 py-3 border-r border-slate-200">কাস্টমার নাম</th>
                  <th className="px-4 py-3 border-r border-slate-200">কাস্টমার আইডি</th>
                  <th className="px-4 py-3 border-r border-slate-200">লোন আইডি</th>
                  <th className="px-4 py-3 text-right border-r border-slate-200">মোট কিস্তি (EMI)</th>
                  <th className="px-4 py-3 text-right border-r border-slate-200">লোন আসল টাকা</th>
                  <th className="px-4 py-3 text-right border-r border-slate-200">বকেয়া (O/S)</th>
                  <th className="px-4 py-3 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs text-slate-700 font-medium">
                {loans.map((loan, index) => {
                  const outstanding = Math.max(0, loan.total_repayment - loan.paid);
                  return (
                    <tr key={loan.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-center font-black text-slate-500 border-r border-slate-200 font-mono bg-slate-50/30">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 border-r border-slate-200 font-bold text-slate-900">
                        {member.full_name || 'N/A'}
                      </td>
                      <td className="px-4 py-3 border-r border-slate-200 font-mono text-slate-600">
                        {member.member_code || 'N/A'}
                      </td>
                      <td className="px-4 py-3 border-r border-slate-200 font-mono text-indigo-700 font-bold">
                        {loan.loan_no}
                      </td>
                      <td className="px-4 py-3 text-right border-r border-slate-200 font-mono text-slate-800 font-semibold">
                        ₹{formatAmount(loan.installment)}
                      </td>
                      <td className="px-4 py-3 text-right border-r border-slate-200 font-mono text-slate-800">
                        ₹{formatAmount(loan.principal)}
                      </td>
                      <td className="px-4 py-3 text-right border-r border-slate-200 font-mono text-rose-600 font-bold">
                        ₹{formatAmount(outstanding)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedLoan(loan)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 transition-all rounded-md border border-indigo-200 hover:border-indigo-600 cursor-pointer shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5" /> দেখুন (View)
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 font-bold text-xs bg-white">
            <HandCoins className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            আপনার কোনো সক্রিয় লোন অ্যাকাউন্ট পাওয়া যায়নি।
          </div>
        )}
      </div>
    </div>
  );
}
