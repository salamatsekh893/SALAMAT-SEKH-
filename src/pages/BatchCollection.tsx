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
  const dateObj = new Date(selectedDate);
  const dayOfMonth = dateObj.getDate();
  const weekOfMonth = Math.ceil(dayOfMonth / 7);
  const termType = (loan.emi_frequency || loan.term_type || "").toLowerCase();
  
  if (termType.includes('month')) {
    if (loan.collection_week && loan.collection_week !== "Every Week") {
      return loan.collection_week.toUpperCase();
    }
    // If it's the monthly anniversary of the first installment
    const firstDateStr = loan.disbursement_date || loan.start_date;
    if (firstDateStr) {
        const firstDate = new Date(firstDateStr);
        if (!isNaN(firstDate.getTime()) && firstDate.getDate() === dayOfMonth) return "MONTHLY";
    }
    return `${weekOfMonth}${getOrdinal(weekOfMonth)} WEEK`;
  }
  
  if (termType.includes('bi')) return "BI-WEEKLY";
  if (termType.includes('week')) return "WEEKLY";
  if (termType.includes('day')) return "DAILY";
  
  return "ACTIVE";
};

const calculateOverdueInfo = (loan: any, selectedDate: string, totalPaid: number) => {
  const baseDateStr = loan.start_date || loan.disbursement_date;
  
  const freq = (loan.emi_frequency || loan.term_type || 'weekly').toLowerCase();
  const installment = Math.round(parseFloat(loan.installment) || 0);
  const maxEmis = parseInt(loan.duration_weeks) || parseInt(loan.no_of_emis) || 0;
  const paidEmisCount = installment > 0 ? Math.round(totalPaid / installment) : 0;

  if (!baseDateStr || !selectedDate) {
    return { overdue: 0, expected: 0, emisDue: 0, overdueEmisDue: 0, advance: 0, maxEmis, paidEmisCount, termOver: false };
  }
  
  const start = new Date(baseDateStr);
  const current = new Date(selectedDate);
  
  if (isNaN(start.getTime()) || isNaN(current.getTime())) {
    return { overdue: 0, expected: 0, emisDue: 0, overdueEmisDue: 0, advance: 0, maxEmis, paidEmisCount, termOver: false };
  }
  
  if (current < start) {
    return { overdue: 0, expected: 0, emisDue: 0, overdueEmisDue: 0, advance: 0, maxEmis, paidEmisCount, termOver: false };
  }
  
  let expectedEmis = 0;
  let termOver = false;
  
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
  
  if (maxEmis > 0 && expectedEmis > maxEmis) {
    termOver = true;
    expectedEmis = maxEmis;
  }
  
  // Check if today is the exact collection/demand day for the newest EMI
  let isCollectionDay = false;
  if (freq.includes('day')) {
    isCollectionDay = true;
  } else if (freq.includes('bi')) {
    isCollectionDay = (diffDays % 14 === 0);
  } else if (freq.includes('month')) {
    if (current.getDate() === start.getDate()) {
      isCollectionDay = true;
    } else {
      const lastDayOfCurrent = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
      if (current.getDate() === lastDayOfCurrent && start.getDate() > lastDayOfCurrent) {
        isCollectionDay = true;
      }
    }
  } else { // default to weekly
    isCollectionDay = (diffDays % 7 === 0);
  }

  let overdueExpectedEmis = expectedEmis;
  if (isCollectionDay && !termOver && overdueExpectedEmis > 0) {
    overdueExpectedEmis = overdueExpectedEmis - 1;
  }
  
  const expectedDemand = expectedEmis * installment;
  const overdueDemand = overdueExpectedEmis * installment;
  const overdue = Math.max(0, overdueDemand - totalPaid);
  const advance = Math.max(0, totalPaid - expectedDemand);
  
  return { 
    overdue: roundVal(overdue), 
    expected: roundVal(expectedDemand),
    emisDue: expectedEmis,
    overdueEmisDue: overdueExpectedEmis,
    advance: roundVal(advance),
    maxEmis,
    paidEmisCount,
    termOver
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
  
  // We will directly use loan.total_paid for totalPaidSum

  const hadCollectionToday = React.useMemo(() => {
    const hasToday: Record<string, boolean> = {};
    collections.forEach(c => {
      if (c.status === 'rejected') return;
      const lid = c.loan_id?.toString();
      if (lid && c.payment_date) {
        try {
          const colDateStr = format(new Date(c.payment_date), 'yyyy-MM-dd');
          if (colDateStr === date) {
            hasToday[lid] = true;
          }
        } catch (e) {
          // skip
        }
      }
    });
    return hasToday;
  }, [collections, date]);

  // Track modal state
  const [trackingLoanId, setTrackingLoanId] = useState<string | null>(null);
  const [trackingCollections, setTrackingCollections] = useState<any[]>([]);
  const [loadingTrack, setLoadingTrack] = useState(false);

  useEffect(() => {
    if (trackingLoanId) {
      setLoadingTrack(true);
      fetchWithAuth(`/collections?loan_id=${trackingLoanId}`)
        .then(data => setTrackingCollections(data || []))
        .catch(err => console.error(err))
        .finally(() => setLoadingTrack(false));
    } else {
      setTrackingCollections([]);
    }
  }, [trackingLoanId]);

  useEffect(() => {
    Promise.all([
      fetchWithAuth("/groups"),
      fetchWithAuth("/loans"),
      fetchWithAuth("/collections"),
    ])
      .then(([grpData, loanData, colData]) => {
        setGroups(grpData);
        const activeAndUnpaidLoans = loanData.filter((l: any) => {
          if (l.status !== "active") return false;
          const repayable = parseFloat(l.total_repayment) > 0 
            ? parseFloat(l.total_repayment) 
            : (Math.round(parseFloat(l.installment) || 0) * (parseInt(l.duration_weeks) || parseInt(l.no_of_emis) || 0));
          const totalPaid = parseFloat(l.total_paid || 0);
          return (repayable - totalPaid) > 1.0;
        });
        setLoans(activeAndUnpaidLoans);
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
  }, []);

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

  const processedGroupLoans = React.useMemo(() => {
    const currentGroupLoans = selectedGroup
      ? loans.filter((l) => l.group_id?.toString() === selectedGroup)
      : [];

    return currentGroupLoans.map((loan) => {
      const totalPaidSum = parseFloat(loan.total_paid || 0);
      const repayable = parseFloat(loan.total_repayment) > 0 
        ? parseFloat(loan.total_repayment) 
        : (Math.round(parseFloat(loan.installment) || 0) * (parseInt(loan.duration_weeks) || parseInt(loan.no_of_emis) || 0));
      const balance = Math.max(0, repayable - totalPaidSum);
      const installmentAmt = Math.round(parseFloat(loan.installment) || 0);
      const principalAmt = parseFloat(loan.amount) || 0;
      const overdueInfo = calculateOverdueInfo(loan, date, totalPaidSum);

      return {
        ...loan,
        _totalPaidSum: totalPaidSum,
        _repayable: repayable,
        _balance: balance,
        _installmentAmt: installmentAmt,
        _principalAmt: principalAmt,
        _overdueInfo: overdueInfo
      };
    });
  }, [selectedGroup, loans, date]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    const newSelected: Record<string, boolean> = {};
    const newAmounts: Record<string, string> = { ...amounts };
    const newModes: Record<string, string> = { ...paymentModes };

    processedGroupLoans.forEach((loan) => {
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
          (c: any) => c.loan_id?.toString() === loanId.toString() && c.status !== 'rejected' && c.remarks !== 'Late Payment Penalty/Fine',
        );
        const totalPaid = loanCollections.reduce(
          (acc: number, c: any) => acc + (parseFloat(c.amount_paid) || 0),
          0,
        );
        const repayable = parseFloat(loan.total_repayment) > 0 
          ? parseFloat(loan.total_repayment) 
          : (Math.round(parseFloat(loan.installment) || 0) * (parseInt(loan.duration_weeks) || parseInt(loan.no_of_emis) || 0));
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

    const loan = loans.find(l => l.id === loanId);
    if (loan) {
      const amt = parseFloat(val) || 0;
      const emi = Math.round(parseFloat(loan.installment) || 0);
      
      if (amt < emi) {
        let pen = 0;
        const pRate = parseFloat(loan.penalty_rate) || 0;
        if (loan.penalty_type === 'percentage') {
           // Calculate percentage of the unpaid EMI portion
           pen = Math.round((emi - amt) * (pRate / 100));
        } else {
           pen = pRate;
        }
        if (pen > 0) {
          setPenalties((prev) => ({ ...prev, [loanId]: pen.toString() }));
        } else {
          setPenalties((prev) => {
            const next = { ...prev };
            delete next[loanId];
            return next;
          });
        }
      } else {
        setPenalties((prev) => {
          const next = { ...prev };
          delete next[loanId];
          return next;
        });
      }
    }
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
    return processedGroupLoans.reduce((acc, loan) => acc + roundVal(loan.installment), 0);
  }, [processedGroupLoans]);

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
               payment_method: paymentModes[loanId], // Changed to payment_method to match backend
            }),
          });
          successCount++;
        } catch (e: any) {
          console.error(`Failed to submit for loan ${loanId}`, e);
          toast.error(e.message || `Failed to submit for loan ${loanId}`);
          break; // Stop submitting further if one fails (especially for DayBook restrictions)
        }
      }

      if (penalty > 0) {
        try {
          await fetchWithAuth("/collections", {
            method: "POST",
            body: JSON.stringify({
              loan_id: loanId,
              amount_paid: penalty,
              payment_date: date,
              payment_method: paymentModes[loanId],
              remarks: "Late Payment Penalty/Fine" // Server expects 'remarks' not 'comment'
            }),
          });
        } catch (e: any) {
          console.error(`Failed to submit penalty for loan ${loanId}`, e);
          toast.error(e.message || `Failed to submit penalty for loan ${loanId}`);
          break;
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
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return format(d, "EEEE");
  };

  const scheduledGroups = groups.filter(g => 
    g.meeting_day?.toLowerCase() === getDayName(date).toLowerCase()
  );

  return (
    <div className="pb-32 w-full mx-auto bg-pink-50/40 min-h-screen font-sans">
      {/* 2. Compact Top Navbar - Branding & User Identity ONLY */}
      <div className="bg-pink-700 text-white p-3 shadow-md sm:sticky sm:top-0 z-30 lg:z-10">
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
            <ListFilter className="w-3.5 h-3.5 text-pink-500" />
            <select
              className="w-full bg-transparent border-none p-0 text-[11px] font-black outline-none focus:ring-0 appearance-none cursor-pointer text-pink-600 uppercase"
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
          <div className="mx-4 mb-4 mt-6 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 rounded-xl p-3 flex items-center justify-between shadow-lg">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  className="w-8 h-8 rounded-lg border-2 border-white/30 bg-white/10 text-white focus:ring-offset-0 focus:ring-0 transition-all cursor-pointer appearance-none checked:bg-white checked:border-white"
                  checked={
                    processedGroupLoans.length > 0 &&
                    Object.keys(selectedLoans).filter((k) => selectedLoans[k])
                      .length === processedGroupLoans.length
                  }
                  onChange={handleSelectAll}
                />
                <svg className="absolute top-1.5 left-1.5 w-5 h-5 text-indigo-600 pointer-events-none opacity-0 checked:opacity-100 peer-checked:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <span className="text-[11px] font-black text-white uppercase tracking-widest drop-shadow-md">SELECT ALL</span>
            </label>

            <div className="flex items-center gap-2">
               <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/30 text-white flex items-center gap-2 font-black shadow-sm">
                  <span className="text-[10px] uppercase opacity-90">Total:</span>
                  <span className="text-sm">₹{formatAmount(totalSelected)}</span>
               </div>
               <div className="text-[11px] font-black text-indigo-900 bg-white border-2 border-white/30 px-3 py-1.5 rounded-lg shadow-sm">
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
                  <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-indigo-600 text-white border-b border-indigo-700 text-[9px] font-black uppercase tracking-wider">
                      <th className="py-2 px-1 w-8 text-center border-r border-indigo-500">#</th>
                      <th className="py-2 px-2">NAME</th>
                      <th className="py-2 px-2 text-center">CODE</th>
                      <th className="py-2 px-2 text-center">MOBILE</th>
                      <th className="py-2 px-2">LOAN ID</th>
                      <th className="py-2 px-2 text-right">PRINCIPAL</th>
                      <th className="py-2 px-2 text-right">PAID</th>
                      <th className="py-2 px-2 text-center">EMI</th>
                      <th className="py-2 px-2 text-center">OD / DUE</th>
                      <th className="py-2 px-2 text-right">ADVANCE</th>
                      <th className="py-2 px-2 text-right">BALANCE</th>
                      <th className="py-2 px-2 text-center">MODE / CLOSE</th>
                      <th className="py-2 px-2 text-center w-[140px]">COLLECT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {processedGroupLoans.map((loan, idx) => {
                      const isSelected = !!selectedLoans[loan.id];
                      const isPresent = attendance[loan.id] !== false;
                      const { paidEmisCount, maxEmis, termOver, overdue, advance } = loan._overdueInfo;
                      const totalPaidSum = loan._totalPaidSum;
                      const balance = loan._balance;
                      const installmentAmt = loan._installmentAmt;
                      const principalAmt = loan._principalAmt;
                      
                      return (
                        <tr 
                          key={loan.id} 
                          className={`group transition-all ${!isPresent ? 'bg-slate-50 opacity-40' : isSelected ? "bg-indigo-50/50" : "hover:bg-slate-50/30"}`}
                        >
                          <td className="py-2 px-1 text-center bg-indigo-700/5 text-indigo-700 font-black text-[10px] border-r border-slate-100">
                             {idx + 1}
                          </td>
                          <td className="py-2 px-2">
                             <div className="flex items-center gap-2">
                                <input 
                                  type="checkbox" 
                                  disabled={!isPresent}
                                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer flex-shrink-0"
                                  checked={isSelected}
                                  onChange={(e) => handleToggleLoan(loan.id, e)}
                                />
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <h4 className="font-black text-[12px] text-slate-800 uppercase tracking-tight truncate max-w-[150px]" title={loan.member_name}>
                                    {loan.member_name}
                                  </h4>
                                  {hadCollectionToday[loan.id.toString()] && (
                                    <CheckCircle className="w-4 h-4 text-emerald-600 fill-emerald-50 flex-shrink-0" />
                                  )}
                                </div>
                             </div>
                          </td>
                          <td className="py-2 px-2 text-center">
                             <span className="text-[10px] font-black text-indigo-600 whitespace-nowrap">
                               {loan.member_code}
                             </span>
                          </td>
                          <td className="py-2 px-2 text-center">
                             <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">{loan.member_mobile || loan.mobile_no || 'N/A'}</span>
                          </td>
                          <td className="py-2 px-2">
                             <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight whitespace-nowrap">{loan.loan_no || `L-260${idx+1000}`}</span>
                                <div className="flex gap-1 mt-0.5">
                                  <button 
                                    onClick={() => setTrackingLoanId(loan.id)} 
                                    className="bg-indigo-500 text-white text-[8px] font-black px-1 py-0.5 rounded flex items-center gap-0.5 uppercase italic leading-none"
                                  >
                                    <Clock className="w-2 h-2" /> TRACK
                                  </button>
                                  <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-1 py-0.5 rounded border border-amber-200 uppercase tracking-tighter shadow-sm flex items-center gap-0.5 leading-none">
                                    <Calendar className="w-2 h-2" /> {getScheduleBadge(loan, date)}
                                  </span>
                                </div>
                             </div>
                          </td>
                          <td className="py-2 px-2 text-right">
                             <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">{formatAmount(loan.amount)}</span>
                          </td>
                          <td className="py-2 px-2 text-right">
                             <div className="flex flex-col items-end leading-none">
                               <span className="text-[11px] font-black text-emerald-600 whitespace-nowrap">{formatAmount(totalPaidSum)}</span>
                               <span className="text-[9px] font-bold text-slate-400 mt-0.5 whitespace-nowrap">({installmentAmt > 0 ? Math.round(totalPaidSum / installmentAmt) : 0}/{parseInt(loan.duration_weeks) || parseInt(loan.no_of_emis) || 0})</span>
                             </div>
                          </td>
                          <td className="py-2 px-2 text-center">
                             <span className="text-[11px] font-black text-slate-900 whitespace-nowrap">{formatAmount(loan.installment)}</span>
                          </td>
                          <td className="py-2 px-2 text-center">
                             {(() => {
                               if (termOver) {
                                  return (
                                    <div className="flex flex-col items-center gap-1">
                                      <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.5 rounded border border-amber-300 uppercase tracking-tighter whitespace-nowrap leading-none">
                                        TERM OVER
                                      </span>
                                      {overdue > 0 && (
                                        <span className="text-[8px] font-bold text-rose-500 whitespace-nowrap">
                                          OD: {formatAmount(overdue)}
                                        </span>
                                      )}
                                    </div>
                                  );
                                }
                                return overdue > 0 ? (
                                 <div className="flex flex-col items-center">
                                   <span className="bg-rose-50 text-rose-600 text-[9px] font-black px-1.5 py-0.5 rounded border border-rose-100 uppercase italic whitespace-nowrap leading-none">
                                     OD: {formatAmount(overdue)}
                                   </span>
                                 </div>
                               ) : (
                                 <span className="bg-emerald-50 text-emerald-600 text-[9px] font-black px-1.5 py-0.5 rounded border border-emerald-100 uppercase italic leading-none">
                                   OK
                                 </span>
                               );
                             })()}
                          </td>
                          <td className="py-2 px-2 text-right">
                             {(() => {
                               return advance > 0 ? (
                                 <span className="text-[11px] font-black text-indigo-500 whitespace-nowrap">
                                   {formatAmount(advance)}
                                 </span>
                               ) : (
                                 <span className="text-[11px] font-black text-slate-300 whitespace-nowrap">-</span>
                               );
                             })()}
                          </td>
                          <td className="py-2 px-2 text-right">
                             <span className="text-[11px] font-black text-rose-600 whitespace-nowrap">{formatAmount(balance)}</span>
                          </td>
                          <td className="py-2 px-2 text-center">
                             <div className="flex flex-col items-center gap-1 w-full max-w-[80px] mx-auto">
                                <select 
                                  className="text-[9px] font-black border border-slate-300 rounded px-1 min-h-[22px] bg-white outline-none focus:border-pink-500 w-full"
                                  value={paymentModes[loan.id] || "Cash"}
                                  onChange={(e) => handleModeChange(loan.id, e.target.value)}
                                >
                                  <option value="Cash">Cash</option>
                                  <option value="UPI">UPI</option>
                                  <option value="Bank">Bank</option>
                                </select>
                                <div className="flex items-center gap-1 justify-center">
                                   <label className="relative inline-flex items-center cursor-pointer scale-[0.6] origin-left">
                                    <input type="checkbox" className="sr-only peer" checked={!!isClosing[loan.id]} onChange={(e) => handleToggleClose(loan.id, e.target.checked)} disabled={!isSelected} />
                                    <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-rose-600"></div>
                                   </label>
                                   <span className="text-[8px] font-black text-rose-500 uppercase tracking-tighter">Close</span>
                                </div>
                             </div>
                          </td>
                          <td className="py-2 px-2 align-middle">
                             <div className="flex flex-col items-center gap-1">
                                <input 
                                  type="number" 
                                  className={`w-full max-w-[100px] min-w-[70px] bg-white border-2 border-emerald-500 rounded p-2 text-center font-black text-[#16A34A] text-xl focus:border-emerald-600 focus:ring-4 outline-none transition-all shadow-sm h-12 leading-none ${!isSelected ? 'opacity-30' : ''}`}
                                  value={amounts[loan.id] || ""}
                                  placeholder={roundVal(loan.installment).toString()}
                                  onChange={(e) => handleAmountChange(loan.id, e.target.value)}
                                />
                                {penalties[loan.id] && parseFloat(penalties[loan.id]) > 0 && (
                                  <div className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded uppercase tracking-wider">
                                    +₹{penalties[loan.id]} Penalty
                                  </div>
                                )}
                             </div>
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
                {processedGroupLoans.map((loan, idx) => {
                  const isSelected = !!selectedLoans[loan.id];
                  const { paidEmisCount, maxEmis, termOver, overdue, advance } = loan._overdueInfo;
                  const totalPaidSum = loan._totalPaidSum;
                  const balance = loan._balance;
                  const installmentAmt = loan._installmentAmt;
                  const principalAmt = loan._principalAmt;

                  return (
                    <div key={loan.id} className={`bg-white p-5 shadow-sm border-y border-slate-200 transition-all ${isSelected ? 'border-pink-400 bg-pink-50/10' : ''}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-black text-slate-900 uppercase text-[15px] tracking-tight">{loan.member_name}</h3>
                          {hadCollectionToday[loan.id.toString()] && (
                            <CheckCircle className="w-4 h-4 text-emerald-600 fill-emerald-50 flex-shrink-0 animate-pulse" />
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight leading-none mb-1">Balance</p>
                          <p className="text-[17px] font-black text-rose-600 leading-none">{formatAmount(loan._balance)}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4 mb-4">
                        <div className="relative mt-1">
                          <input 
                            type="checkbox" 
                            className="w-8 h-8 rounded-xl border-2 border-slate-200 text-pink-600 focus:ring-0 transition-all appearance-none checked:bg-pink-600 checked:border-pink-600 cursor-pointer"
                            checked={isSelected}
                            onChange={(e) => handleToggleLoan(loan.id, e)}
                          />
                          <svg className="absolute top-2 left-2 w-4 h-4 text-white pointer-events-none opacity-0 checked:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ display: isSelected ? 'block' : 'none' }}><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 text-[11px] font-black">
                            <span className="text-pink-600">{loan.member_code}</span>
                            <span className="text-slate-300">|</span>
                            <span className="text-slate-500">Loan: {loan.loan_no || `L-260${idx+1000}`}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600">
                                <Phone className="w-3.5 h-3.5 text-slate-400" /> {loan.member_mobile || loan.mobile_no || 'N/A'}
                              </div>
                              <button 
                                onClick={() => setTrackingLoanId(loan.id)}
                                className="bg-pink-500 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-sm flex items-center gap-1 uppercase italic transition-transform active:scale-95"
                              >
                                <Clock className="w-3 h-3" /> Track
                              </button>
                          </div>

                          <div className="flex flex-wrap gap-1.5 mt-3">
                            <span className="bg-slate-50 text-slate-700 text-[9px] font-black px-2 py-1 rounded-md border border-slate-100 uppercase">EMI: {formatAmount(installmentAmt)}</span>
                            <span className="bg-slate-50 text-slate-500 text-[9px] font-black px-2 py-1 rounded-md border border-slate-100 uppercase">P: {formatAmount(principalAmt)}</span>
                            {(() => {
                              return (
                                <>
                                  <span className="bg-emerald-50 text-emerald-700 text-[9px] font-black px-2 py-1 rounded-md border border-emerald-100 uppercase">
                                    Paid: {formatAmount(totalPaidSum)} ({paidEmisCount}/{maxEmis})
                                  </span>
                                  {termOver && (
                                    <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-2 py-1 rounded-md border border-amber-200 uppercase">
                                      TERM OVER
                                    </span>
                                  )}
                                  {overdue > 0 && (
                                    <span className="bg-rose-50 text-rose-600 text-[9px] font-black px-2 py-1 rounded-md border border-rose-100 uppercase">
                                      OD: {formatAmount(overdue)}
                                    </span>
                                  )}
                                  {advance > 0 && (
                                    <span className="bg-indigo-50 text-indigo-600 text-[9px] font-black px-2 py-1 rounded-md border border-indigo-100 uppercase">
                                      ADV: {formatAmount(advance)}
                                    </span>
                                  )}
                                </>
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
                                className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3 text-sm font-black outline-none focus:border-pink-500 shadow-sm appearance-none"
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
                          {penalties[loan.id] && parseFloat(penalties[loan.id]) > 0 && (
                            <div className="mt-1 text-center">
                               <span className="text-[11px] font-bold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-md uppercase tracking-wider">
                                 +₹{penalties[loan.id]} Penalty Applied
                               </span>
                            </div>
                          )}
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
                  className="w-[350px] bg-pink-600 hover:bg-pink-700 active:scale-95 text-white font-black py-4 rounded-lg shadow-xl shadow-pink-500/20 flex justify-center items-center gap-3 transition-all disabled:opacity-50 uppercase tracking-widest text-lg"
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
      {selectedGroup && processedGroupLoans.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-100 z-50">
          <div className="max-w-xl mx-auto">
            <button
              onClick={handleSubmit}
              disabled={submitting || totalSelected <= 0}
              className="w-full bg-pink-600 hover:bg-pink-700 text-white font-black text-lg py-5 rounded-xl shadow-xl shadow-pink-200 flex justify-center items-center gap-3 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
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
              <div className="bg-gradient-to-r from-pink-500 to-pink-600 p-6 flex justify-between items-center text-white">
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
                {loadingTrack ? (
                  <div className="text-center py-10 text-slate-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-3"></div>
                    <p className="font-bold uppercase tracking-widest text-xs">Loading payments...</p>
                  </div>
                ) : trackingCollections.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <Bot className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-bold uppercase tracking-widest text-xs">No payments recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {trackingCollections
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
