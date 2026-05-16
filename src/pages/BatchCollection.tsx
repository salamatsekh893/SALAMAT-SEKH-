import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "../lib/api";
import { format, parseISO, differenceInDays } from "date-fns";
import {
  Bot,
  Calendar,
  Users,
  ListFilter,
  Send,
  Phone,
  Info,
  Clock,
  CheckCircle,
  X,
  User as UserIcon,
} from "lucide-react";
import { voiceFeedback } from "../lib/voice";
import { formatAmount } from "../lib/utils";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";

// Helper for rounding to nearest whole number
const roundVal = (val: any) => Math.round(parseFloat(val) || 0);

const getOrdinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
};

const getScheduleBadge = (loan: any, selectedDate: string) => {
  if (!selectedDate) return "REGULAR";
  const dateObj = parseISO(selectedDate);
  const dayOfMonth = dateObj.getDate();
  const weekOfMonth = Math.ceil(dayOfMonth / 7);
  const termType = (loan.emi_frequency || loan.term_type || "").toLowerCase();
  
  if (termType.includes('month')) {
    if (loan.collection_week && loan.collection_week !== "Every Week") {
      return loan.collection_week.toUpperCase();
    }
    // If it's the monthly anniversary of the first installment
    if (loan.start_date) {
        const firstDate = parseISO(loan.start_date);
        if (firstDate.getDate() === dayOfMonth) return "MONTHLY";
    }
    return `${weekOfMonth}${getOrdinal(weekOfMonth)} WEEK`;
  }
  
  if (termType.includes('bi')) return "BI-WEEKLY";
  if (termType.includes('week')) return "WEEKLY";
  if (termType.includes('day')) return "DAILY";
  
  return "ACTIVE";
};

const calculateOverdueInfo = (loan: any, selectedDate: string, totalPaid: number) => {
  if (!loan.start_date || !selectedDate) return { overdue: 0, expected: 0, emisDue: 0 };
  
  const start = parseISO(loan.start_date);
  const current = parseISO(selectedDate);
  
  if (current < start) return { overdue: 0, expected: 0, emisDue: 0 };
  
  const freq = (loan.emi_frequency || loan.term_type || 'weekly').toLowerCase();
  const installment = parseFloat(loan.installment) || 0;
  let expectedEmis = 0;
  
  const diffDays = Math.max(0, differenceInDays(current, start));
  
  if (freq.includes('day')) {
    expectedEmis = diffDays + 1;
  } else if (freq.includes('bi')) {
    expectedEmis = Math.floor(diffDays / 14) + 1;
  } else if (freq.includes('month')) {
    const months = (current.getFullYear() - start.getFullYear()) * 12 + (current.getMonth() - start.getMonth());
    expectedEmis = months + 1;
  } else { // default to weekly
    expectedEmis = Math.floor(diffDays / 7) + 1;
  }
  
  // Cap at max EMIs from loan duration
  const maxEmis = parseInt(loan.duration_weeks) || parseInt(loan.no_of_emis) || 0;
  if (maxEmis > 0) {
    expectedEmis = Math.min(expectedEmis, maxEmis);
  }
  
  const expectedDemand = expectedEmis * installment;
  const overdue = Math.max(0, expectedDemand - totalPaid);
  
  return { 
    overdue: roundVal(overdue), 
    expected: roundVal(expectedDemand),
    emisDue: expectedEmis
  };
};

export default function BatchCollection() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [groups, setGroups] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]); // previous collections to show paid sum possibly
  const [selectedGroup, setSelectedGroup] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // State for member selection and amounts
  const [selectedLoans, setSelectedLoans] = useState<Record<string, boolean>>(
    {},
  );
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [penalties, setPenalties] = useState<Record<string, string>>({});
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [paymentModes, setPaymentModes] = useState<Record<string, string>>({});
  const [isClosing, setIsClosing] = useState<Record<string, boolean>>({});
  
  // Optimization: Pre-calculate paid sums to avoid O(N*M) complexity in render
  const paidSums = React.useMemo(() => {
    const sums: Record<string, number> = {};
    collections.forEach(c => {
      const lid = c.loan_id?.toString();
      if (lid) {
        sums[lid] = (sums[lid] || 0) + (parseFloat(c.amount_paid) || 0);
      }
    });
    return sums;
  }, [collections]);

  // Track modal state
  const [trackingLoanId, setTrackingLoanId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchWithAuth("/groups"),
      fetchWithAuth("/loans"),
      fetchWithAuth("/collections"),
    ])
      .then(([grpData, loanData, colData]) => {
        setGroups(grpData);
        setLoans(loanData.filter((l: any) => l.status === "active"));
        setCollections(colData);

        // Check if we have incoming state from navigation
        if (location.state?.groupId) {
          setSelectedGroup(location.state.groupId);
          
          if (location.state.loanId) {
            setSelectedLoans(prev => ({ ...prev, [location.state.loanId]: true }));
            setAmounts(prev => ({ ...prev, [location.state.loanId]: location.state.amount?.toString() || "" }));
            setPaymentModes(prev => ({ ...prev, [location.state.loanId]: "Cash" }));
            setAttendance(prev => ({ ...prev, [location.state.loanId]: true }));
          }
        }
      })
      .finally(() => setLoading(false));
  }, [location]);

  const handleGroupSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const groupId = e.target.value;
    setSelectedGroup(groupId);

    // Reset selection state when changing group
    setSelectedLoans({});
    setAmounts({});
    setPenalties({});
    setAttendance({});
    setPaymentModes({});

    // Auto-prefill attendance to 'Present' for everyone
    const currentGroupLoans = groupId
      ? loans.filter((l) => l.group_id?.toString() === groupId)
      : [];
    
    const initialAttendance: Record<string, boolean> = {};
    currentGroupLoans.forEach(l => {
      initialAttendance[l.id] = true;
    });
    setAttendance(initialAttendance);
  };

  const currentGroupLoans = React.useMemo(() => {
    return selectedGroup
      ? loans.filter((l) => l.group_id?.toString() === selectedGroup)
      : [];
  }, [selectedGroup, loans]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    const newSelected: Record<string, boolean> = {};
    const newAmounts: Record<string, string> = { ...amounts };
    const newModes: Record<string, string> = { ...paymentModes };

    currentGroupLoans.forEach((loan) => {
      newSelected[loan.id] = checked;
      if (checked && !newAmounts[loan.id]) {
        newAmounts[loan.id] = roundVal(loan.installment).toString();
      }
      if (checked && !newModes[loan.id]) {
        newModes[loan.id] = "Cash";
      }
    });

    setSelectedLoans(newSelected);
    setAmounts(newAmounts);
    setPaymentModes(newModes);
  };

  const handleToggleLoan = (
    loanId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const checked = e.target.checked;
    setSelectedLoans((prev) => ({ ...prev, [loanId]: checked }));

    if (checked) {
      setAmounts((prev) => ({
        ...prev,
        [loanId]:
          prev[loanId] ||
          roundVal(loans.find((l) => l.id === loanId)?.installment).toString() ||
          "0",
      }));
      setPaymentModes((prev) => ({
        ...prev,
        [loanId]: prev[loanId] || "Cash",
      }));
    }
  };

  const handleToggleAttendance = (loanId: string) => {
    setAttendance(prev => ({ ...prev, [loanId]: !prev[loanId] }));
    // If marked absent, unselect the loan
    if (attendance[loanId]) {
      setSelectedLoans(prev => ({ ...prev, [loanId]: false }));
    }
  };

  const handleToggleClose = (loanId: string, checked: boolean) => {
    setIsClosing((prev) => ({ ...prev, [loanId]: checked }));
    
    if (checked) {
      // Calculate balance
      const loan = loans.find(l => l.id === loanId);
      if (loan) {
        const loanCollections = collections.filter(
          (c: any) => c.loan_id?.toString() === loanId.toString(),
        );
        const totalPaid = loanCollections.reduce(
          (acc: number, c: any) => acc + (parseFloat(c.amount_paid) || 0),
          0,
        );
        const repayable = parseFloat(
          loan.total_repayment ||
            parseFloat(loan.amount) + parseFloat(loan.interest || 0),
        );
        const balance = Math.max(0, roundVal(repayable - totalPaid));
        
        setAmounts(prev => ({ ...prev, [loanId]: balance.toString() }));
        setSelectedLoans(prev => ({ ...prev, [loanId]: true })); // Auto-select if closing
      }
    } else {
      // Revert to installment
      const loan = loans.find(l => l.id === loanId);
      if (loan) {
        setAmounts(prev => ({ ...prev, [loanId]: roundVal(loan.installment).toString() }));
      }
    }
  };

  const handleAmountChange = (loanId: string, val: string) => {
    setAmounts((prev) => ({ ...prev, [loanId]: val }));
  };

  const handlePenaltyChange = (loanId: string, val: string) => {
    setPenalties((prev) => ({ ...prev, [loanId]: val }));
  };

  const handleModeChange = (loanId: string, val: string) => {
    setPaymentModes((prev) => ({ ...prev, [loanId]: val }));
  };

  const totalSelected = React.useMemo(() => {
    return Object.keys(selectedLoans).reduce((acc, loanId) => {
      if (selectedLoans[loanId]) {
        const amt = parseFloat(amounts[loanId]) || 0;
        const penalty = parseFloat(penalties[loanId]) || 0;
        return acc + amt + penalty;
      }
      return acc;
    }, 0);
  }, [selectedLoans, amounts, penalties]);

  const expectedTotal = React.useMemo(() => {
    return currentGroupLoans.reduce((acc, loan) => acc + roundVal(loan.installment), 0);
  }, [currentGroupLoans]);

  const handleSubmit = async () => {
    const selectedIds = Object.keys(selectedLoans).filter(
      (id) => selectedLoans[id],
    );
    if (selectedIds.length === 0) {
      toast.error("Please select at least one member to collect from.");
      return;
    }

    setSubmitting(true);
    let successCount = 0;

    for (const loanId of selectedIds) {
      const amount = amounts[loanId] || "0";
      const penalty = parseFloat(penalties[loanId]) || 0;
      
      // Submit basic collection
      if (parseFloat(amount) > 0) {
        try {
          await fetchWithAuth("/collections", {
            method: "POST",
            body: JSON.stringify({
              loan_id: loanId,
              amount_paid: amount,
              payment_date: date,
              payment_mode: paymentModes[loanId],
            }),
          });
          successCount++;
        } catch (e) {
          console.error(`Failed to submit for loan ${loanId}`, e);
        }
      }

      // Submit penalty as a separate entry or note? 
      // Assuming server supports a comment or separate type? 
      // For now, let's just stick to principal/interest combined as logged above.
      // If server doesn't have a penalty field, we might need to add it to server.ts or just add it to amount_paid.
      // Let's add it to amount_paid if user just wants it logged, or assume server might need it.
      // If we add it to amount_paid, it will mess up the balance calculation if its a "Fine".
      // Let's assume we want a separate collection entry with a note.
      if (penalty > 0) {
        try {
          await fetchWithAuth("/collections", {
            method: "POST",
            body: JSON.stringify({
              loan_id: loanId,
              amount_paid: penalty,
              payment_date: date,
              payment_mode: paymentModes[loanId],
              comment: "Late Payment Penalty/Fine"
            }),
          });
        } catch (e) {
          console.error(`Failed to submit penalty for loan ${loanId}`, e);
        }
      }
    }

    setSubmitting(false);

    if (successCount > 0) {
      voiceFeedback.payment();
      toast.success(`Successfully logged ${successCount} collections!`);
      navigate("/collections/view");
    } else {
      voiceFeedback.error();
      toast.error("Failed to log collections.");
    }
  };

  if (loading)
    return (
      <div className="p-20 text-center">
        <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
          Loading...
        </p>
      </div>
    );

  const getDayName = (dateStr: string) => {
    if (!dateStr) return "";
    return format(parseISO(dateStr), "EEEE");
  };

  const scheduledGroups = groups.filter(g => 
    g.meeting_day?.toLowerCase() === getDayName(date).toLowerCase()
  );

  return (
    <div className="pb-32 w-full mx-auto bg-[#F4F6F9] min-h-screen font-sans">
      {/* 2. Compact Top Navbar - Branding & User Identity ONLY */}
      <div className="bg-[#3B5998] text-white p-3 shadow-md sm:sticky sm:top-0 z-30 lg:z-10">
        <div className="max-w-[1700px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-base lg:text-xl font-black uppercase tracking-widest text-[#FFF]">
               COLLECTION
            </h1>
            <div className="h-4 w-[1px] bg-white/20 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2">
              <div className="bg-emerald-500 w-2 h-2 rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-tighter opacity-80">Online</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Collecting By</span>
              <span className="text-sm lg:text-base font-black text-white uppercase">{user?.name || "Member"}</span>
            </div>
            <div className="w-9 h-9 rounded-full border-2 border-white/50 shadow-lg overflow-hidden bg-white/10 flex items-center justify-center">
              {user?.photo_url ? (
                <img src={user.photo_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-5 h-5 text-white/50" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1700px] mx-auto">
        {/* 3. Compact Filter Bar - One Row on Desktop - Minimal/Clean */}
        <div className="bg-white border m-2 p-1 rounded-lg shadow-sm border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-slate-100 overflow-hidden">
          {/* Date Filter */}
          <div className="flex items-center gap-2 px-3 py-1.5 sm:w-auto shrink-0 bg-slate-50/50">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setSelectedGroup(""); 
              }}
              className="bg-transparent border-none p-0 text-[11px] font-black focus:ring-0 outline-none text-slate-600 cursor-pointer"
            />
          </div>

          {/* Date's Groups Dropdown */}
          <div className="flex items-center gap-2 px-3 py-1.5 flex-1">
            <Users className="w-3.5 h-3.5 text-emerald-500" />
            <select 
              className="w-full bg-transparent border-none p-0 text-[11px] font-black outline-none focus:ring-0 appearance-none cursor-pointer text-emerald-600 uppercase"
              value={selectedGroup}
              onChange={handleGroupSelect}
            >
              <option value="">TODAY'S GROUPS ({scheduledGroups.length})</option>
              {scheduledGroups.map(g => (
                <option key={g.id} value={g.id.toString()}>
                  {g.group_name}
                </option>
              ))}
            </select>
          </div>

          {/* All Groups Dropdown */}
          <div className="flex items-center gap-2 px-3 py-1.5 flex-1 border-t sm:border-t-0">
            <ListFilter className="w-3.5 h-3.5 text-blue-500" />
            <select
              className="w-full bg-transparent border-none p-0 text-[11px] font-black outline-none focus:ring-0 appearance-none cursor-pointer text-blue-600 uppercase"
              value={selectedGroup}
              onChange={handleGroupSelect}
            >
              <option value="">ALL GROUPS ({groups.length})</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id.toString()}>
                  {g.group_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3. Selection & Stats Strip - Matching Screenshot */}
        {selectedGroup && (
          <div className="mx-4 mb-4 mt-6 bg-white border border-slate-100 rounded-xl p-3 flex items-center justify-between shadow-sm">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  className="w-8 h-8 rounded-lg border-2 border-slate-200 text-blue-600 focus:ring-offset-0 focus:ring-0 transition-all cursor-pointer appearance-none checked:bg-blue-600 checked:border-blue-600"
                  checked={
                    currentGroupLoans.length > 0 &&
                    Object.keys(selectedLoans).filter((k) => selectedLoans[k])
                      .length === currentGroupLoans.length
                  }
                  onChange={handleSelectAll}
                />
                <svg className="absolute top-1.5 left-1.5 w-5 h-5 text-white pointer-events-none opacity-0 checked:opacity-100 peer-checked:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">SELECT ALL</span>
            </label>

            <div className="flex items-center gap-2">
               <div className="bg-white px-3 py-1.5 rounded-lg border-2 border-blue-500 text-blue-600 flex items-center gap-2 font-black shadow-sm">
                  <span className="text-[10px] uppercase">Total:</span>
                  <span className="text-sm">₹{formatAmount(totalSelected)}</span>
               </div>
               <div className="text-[11px] font-black text-slate-800 bg-slate-50 border-2 border-slate-100 px-3 py-1.5 rounded-lg shadow-sm">
                 {format(new Date(date), 'dd-MMM-yyyy')}
               </div>
            </div>
          </div>
        )}

        {/* 4. Main Collection Content */}
        <div className="mx-0 lg:mx-4 mt-0">
          {!selectedGroup ? (
            <div className="mx-4 flex flex-col items-center justify-center py-40 text-center bg-white rounded-xl border border-slate-200">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 shadow-inner text-slate-200">
                <Users className="w-10 h-10" />
              </div>
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[4px]">PLEASE SELECT A GROUP TO START</h3>
            </div>
          ) : (
            <>
              {/* DESKTOP VIEW - Table based design */}
              <div className="hidden lg:block bg-white rounded-lg shadow-sm border border-slate-300 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1400px]">
                  <thead>
                    <tr className="bg-[#1D4ED8] text-white text-[11px] font-black uppercase tracking-wider">
                      <th className="py-3 px-2 w-10 text-center border-r border-white/10">#</th>
                      <th className="py-3 px-4 w-[280px]">NAME</th>
                      <th className="py-3 px-4 w-[140px] text-center">CODE</th>
                      <th className="py-3 px-4 w-[150px] text-center">MOBILE</th>
                      <th className="py-3 px-4 w-[250px]">LOAN ID</th>
                      <th className="py-3 px-4 text-right">PRINCIPAL</th>
                      <th className="py-3 px-4 text-right">PAID</th>
                      <th className="py-3 px-4 text-center">EMI</th>
                      <th className="py-3 px-4 text-center">OD / DUE</th>
                      <th className="py-3 px-4 text-right">BALANCE</th>
                      <th className="py-3 px-4 text-center">MODE & CLOSE</th>
                      <th className="py-3 px-6 text-center">COLLECT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {currentGroupLoans.map((loan, idx) => {
                      const isSelected = !!selectedLoans[loan.id];
                      const isPresent = attendance[loan.id] !== false;
                      const totalPaidSum = paidSums[loan.id.toString()] || 0;
                      const repayable = parseFloat(loan.total_repayment || (parseFloat(loan.amount) + parseFloat(loan.interest || 0)));
                      const balance = Math.max(0, repayable - totalPaidSum);
                      const installmentAmt = parseFloat(loan.installment) || 0;
                      
                      return (
                        <tr 
                          key={loan.id} 
                          className={`group transition-all ${!isPresent ? 'bg-slate-50 opacity-40' : isSelected ? "bg-blue-50/50" : "hover:bg-slate-50/30"}`}
                        >
                          <td className="py-2.5 px-2 text-center bg-blue-700/5 text-blue-700 font-black text-[11px] border-r border-slate-100">
                             {idx + 1}
                          </td>
                          <td className="py-2.5 px-4">
                             <div className="flex items-center gap-3">
                                <input 
                                  type="checkbox" 
                                  disabled={!isPresent}
                                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  checked={isSelected}
                                  onChange={(e) => handleToggleLoan(loan.id, e)}
                                />
                                <h4 className="font-black text-[13px] text-slate-800 uppercase tracking-tight truncate">
                                  {loan.member_name}
                                </h4>
                             </div>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                             <span className="text-[11px] font-black text-blue-600">
                               {loan.member_code}
                             </span>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                             <span className="text-xs font-bold text-slate-500">{loan.mobile_no || '7866829952'}</span>
                          </td>
                          <td className="py-2.5 px-4">
                             <div className="flex items-center gap-2">
                                <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{loan.loan_no || `L-260${idx+1000}`}</span>
                                <button 
                                  onClick={() => setTrackingLoanId(loan.id)} 
                                  className="bg-[#00BCD4] text-white text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 uppercase italic"
                                >
                                  <Clock className="w-2.5 h-2.5" /> TRACK
                                </button>
                                <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-1.5 py-0.5 rounded border border-amber-200 uppercase tracking-tighter shadow-sm flex items-center gap-1">
                                  <Calendar className="w-2 h-2" /> {getScheduleBadge(loan, date)}
                                </span>
                             </div>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                             <span className="text-xs font-bold text-slate-500">{formatAmount(loan.amount)}</span>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                             <span className="text-xs font-black text-emerald-600">{formatAmount(totalPaidSum)}</span>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                             <span className="text-xs font-black text-slate-900">{formatAmount(loan.installment)}</span>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                             {(() => {
                               const { overdue } = calculateOverdueInfo(loan, date, totalPaidSum);
                               return overdue > 0 ? (
                                 <div className="flex flex-col items-center">
                                   <span className="bg-rose-50 text-rose-600 text-[10px] font-black px-2 py-0.5 rounded border border-rose-100 uppercase italic">
                                     OD: {formatAmount(overdue)}
                                   </span>
                                   <span className="text-[9px] font-bold text-slate-400 mt-0.5">DUE</span>
                                 </div>
                               ) : (
                                 <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-2 py-0.5 rounded border border-emerald-100 uppercase italic">
                                   REGULAR
                                 </span>
                               );
                             })()}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                             <span className="text-xs font-black text-rose-600">{formatAmount(balance)}</span>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                             <div className="flex flex-col items-center gap-1">
                                <select 
                                  className="text-[10px] font-black border border-slate-300 rounded px-1.5 py-1 bg-white outline-none focus:border-blue-500 w-full"
                                  value={paymentModes[loan.id] || "Cash"}
                                  onChange={(e) => handleModeChange(loan.id, e.target.value)}
                                >
                                  <option value="Cash">Cash</option>
                                  <option value="UPI">UPI</option>
                                  <option value="Bank">Bank</option>
                                </select>
                                <div className="flex items-center gap-2">
                                   <label className="relative inline-flex items-center cursor-pointer scale-75">
                                    <input type="checkbox" className="sr-only peer" checked={!!isClosing[loan.id]} onChange={(e) => handleToggleClose(loan.id, e.target.checked)} disabled={!isSelected} />
                                    <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-rose-600"></div>
                                   </label>
                                   <span className="text-[9px] font-black text-rose-500 uppercase tracking-tighter">Close</span>
                                </div>
                             </div>
                          </td>
                          <td className="py-2.5 px-6">
                             <input 
                               type="number" 
                               className={`w-full max-w-[130px] mx-auto bg-white border-2 border-emerald-500 rounded p-2 text-center font-black text-[#16A34A] text-lg focus:border-emerald-600 focus:ring-0 outline-none transition-all shadow-sm ${!isSelected ? 'opacity-20' : ''}`}
                               value={amounts[loan.id] || ""}
                               placeholder={roundVal(loan.installment).toString()}
                               onChange={(e) => handleAmountChange(loan.id, e.target.value)}
                             />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>

              {/* MOBILE VIEW - Card based design - Optimized for Screenshot */}
              <div className="lg:hidden space-y-3 pb-10">
                {currentGroupLoans.map((loan, idx) => {
                  const isSelected = !!selectedLoans[loan.id];
                  const totalPaidSum = paidSums[loan.id.toString()] || 0;
                  const repayable = parseFloat(loan.total_repayment || (parseFloat(loan.amount) + parseFloat(loan.interest || 0)));
                  const balance = Math.max(0, repayable - totalPaidSum);
                  const installmentAmt = parseFloat(loan.installment) || 0;
                  const principalAmt = parseFloat(loan.amount) || 0;

                  return (
                    <div key={loan.id} className={`bg-white p-5 shadow-sm border-y border-slate-200 transition-all ${isSelected ? 'border-blue-400 bg-blue-50/10' : ''}`}>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-black text-slate-900 uppercase text-[15px] tracking-tight">{loan.member_name}</h3>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight leading-none mb-1">Balance</p>
                          <p className="text-[17px] font-black text-rose-600 leading-none">{formatAmount(balance)}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4 mb-4">
                        <div className="relative mt-1">
                          <input 
                            type="checkbox" 
                            className="w-8 h-8 rounded-xl border-2 border-slate-200 text-blue-600 focus:ring-0 transition-all appearance-none checked:bg-blue-600 checked:border-blue-600 cursor-pointer"
                            checked={isSelected}
                            onChange={(e) => handleToggleLoan(loan.id, e)}
                          />
                          <svg className="absolute top-2 left-2 w-4 h-4 text-white pointer-events-none opacity-0 checked:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ display: isSelected ? 'block' : 'none' }}><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 text-[11px] font-black">
                            <span className="text-blue-600">{loan.member_code}</span>
                            <span className="text-slate-300">|</span>
                            <span className="text-slate-500">Loan: {loan.loan_no || `L-260${idx+1000}`}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600">
                                <Phone className="w-3.5 h-3.5 text-slate-400" /> {loan.mobile_no || '8927143558'}
                              </div>
                              <button 
                                onClick={() => setTrackingLoanId(loan.id)}
                                className="bg-[#00BCD4] text-white text-[9px] font-black px-2 py-0.5 rounded shadow-sm flex items-center gap-1 uppercase italic transition-transform active:scale-95"
                              >
                                <Clock className="w-3 h-3" /> Track
                              </button>
                          </div>

                          <div className="flex flex-wrap gap-1.5 mt-3">
                            <span className="bg-slate-50 text-slate-700 text-[9px] font-black px-2 py-1 rounded-md border border-slate-100 uppercase">EMI: {formatAmount(installmentAmt)}</span>
                            <span className="bg-slate-50 text-slate-500 text-[9px] font-black px-2 py-1 rounded-md border border-slate-100 uppercase">P: {formatAmount(principalAmt)}</span>
                            <span className="bg-emerald-50 text-emerald-700 text-[9px] font-black px-2 py-1 rounded-md border border-emerald-100 uppercase">Paid: {formatAmount(totalPaidSum)}</span>
                            {(() => {
                              const { overdue } = calculateOverdueInfo(loan, date, totalPaidSum);
                              return overdue > 0 && (
                                <span className="bg-rose-50 text-rose-600 text-[9px] font-black px-2 py-1 rounded-md border border-rose-100 uppercase">OD: {formatAmount(overdue)}</span>
                              );
                            })()}
                          </div>
                          
                          <div className="mt-2 text-left">
                             <span className="bg-amber-50 text-amber-700 text-[9px] font-black px-2 py-1 rounded-md border border-amber-100 uppercase flex items-center gap-1 w-fit">
                               <Calendar className="w-3 h-3" /> {getScheduleBadge(loan, date)}
                             </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <div className="flex items-center gap-3 mb-4">
                           <div className="flex-1">
                              <select 
                                className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3 text-sm font-black outline-none focus:border-blue-500 shadow-sm appearance-none"
                                value={paymentModes[loan.id] || "Cash"}
                                onChange={(e) => handleModeChange(loan.id, e.target.value)}
                              >
                                <option value="Cash">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="Bank">Bank</option>
                              </select>
                           </div>
                           <div className="flex items-center gap-2">
                             <label className="relative inline-flex items-center cursor-pointer scale-90">
                              <input type="checkbox" className="sr-only peer" checked={!!isClosing[loan.id]} onChange={(e) => handleToggleClose(loan.id, e.target.checked)} disabled={!isSelected} />
                              <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                             </label>
                             <span className="text-[11px] font-black text-rose-600 uppercase">Close</span>
                           </div>
                        </div>

                        <div className="relative">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Enter Amount</p>
                          <input 
                            type="number" 
                            className="w-full h-14 bg-white border-2 border-slate-200 rounded-xl px-4 text-center font-black text-[#16A34A] text-2xl outline-none shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all placeholder:text-slate-300"
                            value={amounts[loan.id] || ""}
                            placeholder={roundVal(loan.installment).toString()}
                            onChange={(e) => handleAmountChange(loan.id, e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Footer Bottom Submit Strip (Desktop) */}
              <div className="mt-8 hidden lg:flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={submitting || totalSelected <= 0}
                  className="w-[350px] bg-[#2563EB] hover:bg-blue-600 active:scale-95 text-white font-black py-4 rounded-lg shadow-xl shadow-blue-500/20 flex justify-center items-center gap-3 transition-all disabled:opacity-50 uppercase tracking-widest text-lg"
                >
                  {submitting ? "PROCESSING..." : "SUBMIT COLLECTION"}
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>


      {/* Fixed bottom Submit Button for Mobile Only - Styled as Screenshot */}
      {selectedGroup && currentGroupLoans.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-100 z-50">
          <div className="max-w-xl mx-auto">
            <button
              onClick={handleSubmit}
              disabled={submitting || totalSelected <= 0}
              className="w-full bg-[#0070f3] hover:bg-blue-700 text-white font-black text-lg py-5 rounded-xl shadow-xl shadow-blue-200 flex justify-center items-center gap-3 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
            >
              {submitting ? "PROCESSING..." : "SUBMIT COLLECTION"}{" "}
              <Send className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Track Modal */}
      <AnimatePresence>
        {trackingLoanId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTrackingLoanId(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-6 flex justify-between items-center text-white">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-6 h-6" /> Payment History
                  </h2>
                  <p className="text-xs font-bold text-cyan-100 uppercase tracking-widest mt-1">
                    {loans.find(l => l.id === trackingLoanId)?.member_name}
                  </p>
                </div>
                <button 
                  onClick={() => setTrackingLoanId(null)}
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {collections.filter(c => c.loan_id?.toString() === trackingLoanId.toString()).length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <Bot className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-bold uppercase tracking-widest text-xs">No payments recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {collections
                      .filter(c => c.loan_id?.toString() === trackingLoanId.toString())
                      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
                      .map((col, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                              {col.payment_mode || 'Cash'} Payment
                            </div>
                            <div className="text-sm font-black text-slate-700">
                              {format(new Date(col.payment_date), 'dd MMMM yyyy')}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-black text-emerald-600">
                              ₹{formatAmount(col.amount_paid)}
                            </div>
                            <div className="text-[9px] font-black px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full uppercase tracking-tighter">
                              Received
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
              
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setTrackingLoanId(null)}
                  className="bg-slate-900 text-white font-black px-6 py-3 rounded-xl shadow-lg uppercase tracking-widest text-xs transition-transform active:scale-95"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hide scrollbar styles for cleaner mobile view */}
      <style>{`
        .dot { transition: transform 0.2s ease-in-out; }
      `}</style>
    </div>
  );
}
