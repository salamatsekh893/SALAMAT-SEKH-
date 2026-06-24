import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { fetchWithAuth } from '../lib/api';
import Sidebar from './Sidebar';
import Header from './Header';
import SuperAdminHeader from './superadminPanel/superAdminHeader';
import BranchHeader from './branchPanel/branchHeader';
import EmployeeHeader from './employeePanel/employeeHeader';
import CustomerHeader from './customerPanel/customerHeader';
import { cn } from '../lib/utils';
import { 
  LayoutDashboard, Wallet, UsersRound, Settings, 
  ShieldCheck, Users, Coins, HandCoins, Banknote, 
  Calculator, PiggyBank, ShoppingCart, FileText, Car,
  Lock
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import AIChatBot from './AIChatBot';

interface LayoutProps {
  user: {
    name: string;
    role: string;
    photo_url?: string | null;
  };
  onLogout: () => void;
}

export default function Layout({ user, onLogout }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const [adminOpen, setAdminOpen] = useState(false);
  const [hrOpen, setHrOpen] = useState(false);
  const [capitalOpen, setCapitalOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [loanOpen, setLoanOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [savingsOpen, setSavingsOpen] = useState(false);
  const [salesOpen, setSalesOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [travelOpen, setTravelOpen] = useState(false);
  const [company, setCompany] = useState<any>(null);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [branchWalletBalance, setBranchWalletBalance] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (user?.role === 'branch_manager') {
      fetchWithAuth('/dashboard')
        .then(data => {
          if (data && data.branchWalletBalance !== undefined) {
            setBranchWalletBalance(data.branchWalletBalance);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    fetchWithAuth('/companies')
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setCompany(data[0]);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Only superadmin and manager need to know about pending approvals
    if (user && ['superadmin', 'manager'].includes(user?.role)) {
      const fetchLoans = () => {
        fetchWithAuth('/loans?status=pending')
          .then(data => {
            if (Array.isArray(data)) {
              setPendingApprovals(data.length);
            }
          })
          .catch(() => {});
      };
      
      fetchLoans();
      // Optionally refresh every 2 mins
      const interval = setInterval(fetchLoans, 120000);
      return () => clearInterval(interval);
    }
  }, [user?.role]);

  const navigation = [
    { name: 'DASHBOARD', href: '/', icon: LayoutDashboard, roles: ['superadmin', 'branch_manager', 'fo', 'am', 'dm', 'manager'], permissionId: 'module_dashboard' },
    { 
      name: 'ADMINISTRATION', 
      icon: ShieldCheck, 
      roles: ['superadmin', 'dm'],
      permissionId: 'module_administration',
      isGroup: true,
      isOpen: adminOpen,
      setOpen: setAdminOpen,
      children: [
        { name: 'Company Profile', href: '/companies', permissionId: 'sub_admin_company' },
        { name: 'Branch Management', href: '/branches', permissionId: 'sub_admin_branch' },
        { name: 'User Management', href: '/roles', roles: ['superadmin'], permissionId: 'sub_admin_user' },
        { name: 'Capital Log', href: '/capital', permissionId: 'sub_capital_log' },
        { name: 'Bank Accounts', href: '/banks', permissionId: 'sub_capital_bank' },
      ]
    },
    { 
      name: 'HR MANAGEMENT', 
      icon: Users, 
      roles: ['superadmin', 'am', 'dm', 'branch_manager', 'fo', 'manager'],
      permissionId: 'module_hr',
      isGroup: true,
      isOpen: hrOpen,
      setOpen: setHrOpen,
      children: [
        { name: 'My Attendance', href: '/attendance', permissionId: 'PUBLIC' },
        { name: 'Manage Attendance', href: '/manage-attendance', permissionId: 'sub_hr_attendance' },
        { name: 'Employee List', href: '/employees', permissionId: 'sub_hr_employee' },
        { name: 'Salary Payment', href: '/salary', permissionId: 'sub_hr_salary' },
      ]
    },
    { 
      name: 'MEMBERS & GROUPS', 
      icon: UsersRound, 
      roles: ['superadmin', 'am', 'dm', 'branch_manager', 'fo', 'manager'],
      permissionId: 'module_members',
      isGroup: true,
      isOpen: membersOpen,
      setOpen: setMembersOpen,
      children: [
        { name: 'Group List', href: '/groups', permissionId: 'sub_member_group_list' },
        { name: 'Create Group', href: '/groups/new', permissionId: 'sub_member_create_group' },
        { name: 'Add Member', href: '/members/new', permissionId: 'sub_member_add' },
        { name: 'Member List', href: '/members', permissionId: 'sub_member_list' },
      ]
    },
    { 
      name: 'LOAN MANAGEMENT', 
      icon: HandCoins, 
      roles: ['superadmin', 'am', 'dm', 'branch_manager', 'manager'],
      permissionId: 'module_loans',
      isGroup: true,
      isOpen: loanOpen,
      setOpen: setLoanOpen,
      children: [
        { name: 'Loan Schemes', href: '/schemes', permissionId: 'sub_loan_schemes' },
        { name: 'New Request', href: '/loans/new', permissionId: 'sub_loan_new' },
        { name: 'Approvals', href: '/loans/approvals', badge: pendingApprovals > 0 ? pendingApprovals : undefined, permissionId: 'sub_loan_approvals' },
        { name: 'Disbursement', href: '/loans/disbursements', permissionId: 'sub_loan_disburse' },
        { name: 'Loan Accounts', href: '/loans', permissionId: 'sub_loan_accounts' },
        { name: 'Closed Loans', href: '/loans/closed', permissionId: 'sub_loan_accounts' },
      ]
    },
    { 
      name: 'COLLECTION', 
      icon: Banknote, 
      roles: ['superadmin', 'am', 'dm', 'branch_manager', 'fo', 'manager'],
      permissionId: 'module_collection',
      isGroup: true,
      isOpen: collectionOpen,
      setOpen: setCollectionOpen,
      children: [
        { name: 'Daily Collection', href: '/collections', roles: ['superadmin', 'am', 'dm', 'branch_manager', 'fo', 'manager'], permissionId: 'sub_col_daily' },
        { name: 'Approve Collection', href: '/collections/approve', roles: ['superadmin', 'am', 'dm', 'branch_manager', 'manager'], permissionId: 'sub_col_approve' },
        { name: 'Collection View', href: '/collections/view', roles: ['superadmin', 'am', 'dm', 'branch_manager', 'fo', 'manager'], permissionId: 'sub_col_view' },
        { name: 'Demand Sheet', href: '/collections/demand', roles: ['superadmin', 'am', 'dm', 'branch_manager', 'manager', 'fo'], permissionId: 'sub_col_demand' },
        { name: 'Pre-Close Loan', href: '/loans/pre-close', roles: ['superadmin', 'am', 'dm', 'branch_manager', 'manager'], permissionId: 'sub_col_preclose' },
        { name: 'Overdue List', href: '/collections/overdue', roles: ['superadmin', 'am', 'dm', 'branch_manager', 'manager'], permissionId: 'sub_col_overdue' },
      ]
    },
    { 
      name: 'ACCOUNTS & EXPENSE', 
      icon: Calculator, 
      roles: ['superadmin', 'am', 'dm', 'branch_manager', 'manager'],
      permissionId: 'module_accounts',
      isGroup: true,
      isOpen: accountsOpen,
      setOpen: setAccountsOpen,
      children: [
        { name: 'Day Book', href: '/accounts/daybook', permissionId: 'sub_acc_daybook' },
        { name: 'Add Expense', href: '/accounts/expense', permissionId: 'sub_acc_expense' },
        { name: 'Profit & Loss', href: '/accounts/pl', permissionId: 'sub_acc_pl' },
        { name: 'Branch Wallet', href: '/accounts/branch-wallet', permissionId: 'PUBLIC' },
      ]
    },
    { 
      name: 'SAVINGS & RD', 
      icon: PiggyBank, 
      roles: ['superadmin', 'am', 'dm', 'branch_manager', 'manager'],
      permissionId: 'module_savings',
      isGroup: true,
      isOpen: savingsOpen,
      setOpen: setSavingsOpen,
      children: [
        { name: 'Open New Account', href: '/savings/new', permissionId: 'sub_sav_create' },
        { name: 'Saving Customer List', href: '/savings-accounts', permissionId: 'sub_sav_accounts' },
        { name: 'RD Customer List', href: '/recurring-deposits', permissionId: 'sub_sav_rd' },
      ]
    },
    { 
      name: 'PRODUCT & SALES', 
      icon: ShoppingCart, 
      roles: ['superadmin', 'am', 'dm', 'branch_manager', 'manager'],
      permissionId: 'module_sales',
      isGroup: true,
      isOpen: salesOpen,
      setOpen: setSalesOpen,
      children: [
        { name: 'Add Product', href: '/products/add', permissionId: 'sub_sale_add_prod' },
        { name: 'Stock List', href: '/products', permissionId: 'sub_sale_stock' },
        { name: 'New Sale', href: '/sales/new', permissionId: 'sub_sale_new' },
        { name: 'Sales History', href: '/sales', permissionId: 'sub_sale_history' },
      ]
    },
    { 
      name: 'REPORTS', 
      icon: FileText, 
      roles: ['superadmin', 'am', 'dm', 'branch_manager', 'manager'],
      permissionId: 'module_reports',
      isGroup: true,
      isOpen: reportsOpen,
      setOpen: setReportsOpen, 
      children: [
        { name: 'Financial Reports', href: '/reports', permissionId: 'sub_report_daily' },
      ]
    },
    {
      name: 'TRAVEL MANAGEMENT',
      icon: Car,
      roles: ['superadmin', 'am', 'dm', 'branch_manager', 'fo', 'manager'],
      permissionId: 'module_travel',
      isGroup: true,
      isOpen: travelOpen,
      setOpen: setTravelOpen,
      children: [
        { name: 'My Logs', href: '/travel/log', permissionId: 'sub_travel_log' },
        { name: 'Approvals', href: '/travel/approvals', permissionId: 'sub_travel_approve' },
      ]
    },
  ];

  const [myPermissions, setMyPermissions] = useState<string[] | null>((user as any).permissions || null);
  const [lockData, setLockData] = useState<{ locked: boolean; reason?: string; unclosed_dates?: string[] } | null>(null);

  const checkLock = () => {
    if (user?.role === 'superadmin') return; // Skip lock check for superadmin
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const localDate = `${year}-${month}-${day}`;
    
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const localTime = `${hours}:${mins}`;

    fetchWithAuth(`/daybook/lock-check?local_date=${localDate}&local_time=${localTime}`)
      .then(data => {
        if (data && typeof data.locked === 'boolean') {
          setLockData(data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    checkLock();
    const interval = setInterval(checkLock, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [location.pathname]);

  useEffect(() => {
    if (user && user?.role !== 'superadmin') {
      fetchWithAuth('/role_permissions')
        .then(data => {
          if (Array.isArray(data)) {
            const rolePerms = data.find((r: any) => r?.role === user?.role);
            if (rolePerms) {
              setMyPermissions(JSON.parse(rolePerms.permissions));
            } else {
              setMyPermissions([]);
            }
          }
        })
        .catch(() => {});
    }
  }, [user?.role]);

  const hasAccess = (item: any) => {
    if (!user) return false;
    if (user?.role === 'superadmin') return true;
    if (item.permissionId === 'PUBLIC') return true;
    
    if (myPermissions && Array.isArray(myPermissions)) {
      if (item.permissionId && myPermissions.includes(item.permissionId)) return true;
      if (item.children && Array.isArray(item.children)) {
        return item.children.some((child: any) => 
          child.permissionId === 'PUBLIC' || (child.permissionId && myPermissions.includes(child.permissionId))
        );
      }
      return false; // Strict mode if they have permission array
    }
    // Fallback if permissions aren't set up yet
    return false;
  };

  const filteredNav = navigation.filter(hasAccess).map((item: any) => {
    if (item.children) {
      return {
        ...item,
        children: item.children.filter(hasAccess)
      };
    }
    return item;
  }).filter((item: any) => {
    if (item.children) return item.children.length > 0;
    return true;
  });

  const bottomNavItemsRaw = [
    { icon: LayoutDashboard, label: 'Home', href: '/', roles: ['superadmin', 'branch_manager', 'fo', 'am', 'dm', 'manager'], permissionId: 'module_dashboard' },
    { icon: Wallet, label: 'Collect', href: '/collections', roles: ['superadmin', 'am', 'dm', 'branch_manager', 'fo', 'manager'], permissionId: 'module_collection' },
    { icon: UsersRound, label: 'Staff', href: '/employees', roles: ['superadmin', 'am', 'dm', 'branch_manager', 'manager'], permissionId: 'module_hr' },
    { icon: Settings, label: 'Admin', href: '/companies', roles: ['superadmin', 'dm'], permissionId: 'module_administration' },
  ];

  const bottomNavItems = bottomNavItemsRaw.filter(hasAccess);

  return (
    <div className="min-h-screen bg-slate-50 flex print:bg-white print:min-h-0 print:block">
      <div className="print:hidden">
        <Sidebar 
          user={user} 
          isOpen={sidebarOpen} 
          setIsOpen={setSidebarOpen} 
          onLogout={onLogout} 
          navigation={filteredNav} 
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 print:block">
        <div className="print:hidden">
          {(() => {
            const onMenuClick = () => setSidebarOpen(!sidebarOpen);
            if (user?.role === 'superadmin') {
              return <SuperAdminHeader onMenuClick={onMenuClick} user={user} company={company} />;
            } else if (user?.role === 'branch_manager') {
              return <BranchHeader onMenuClick={onMenuClick} user={user} company={company} branchWalletBalance={branchWalletBalance} />;
            } else if (['fo', 'am', 'dm'].includes(user?.role)) {
              return <EmployeeHeader onMenuClick={onMenuClick} user={user} company={company} />;
            } else if (user?.role === 'customer') {
              return <CustomerHeader onMenuClick={onMenuClick} user={user} company={company} />;
            } else {
              return <Header onMenuClick={onMenuClick} user={user} company={company} />;
            }
          })()}
        </div>
        
        <main className="flex-1 w-full pb-12 text-slate-800 print:p-0 print:m-0 print:block">
           {lockData?.locked && location.pathname !== '/accounts/daybook' ? (
             <div className="max-w-xl mx-auto px-4 py-16 text-center select-none">
               <motion.div
                 initial={{ scale: 0.9, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 transition={{ duration: 0.3, ease: 'easeOut' }}
                 className="bg-white border border-slate-200 rounded-2xl shadow-xl p-8 flex flex-col items-center"
               >
                 <div className="bg-red-50 text-red-600 p-4 rounded-full mb-6 border border-red-100 shadow-inner animate-pulse">
                   <Lock className="w-12 h-12" />
                 </div>
                 
                 <h2 className="text-2xl font-bold font-sans tracking-tight text-slate-900 mb-3">
                   BRANCH WORKPLACE LOCKED
                 </h2>
                 
                 <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
                   <p className="text-sm text-amber-800 font-sans leading-relaxed">
                     {lockData.reason || "A strict Day Book closure policy is in effect. All financial entries and system features are locked until EOD (End of Day) is submitted."}
                   </p>
                 </div>

                 {lockData.unclosed_dates && lockData.unclosed_dates.length > 0 && (
                   <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 mb-8 text-left">
                     <span className="text-xs font-mono font-semibold text-slate-400 tracking-wider uppercase block mb-2">
                       Unresolved Daybook Closures
                     </span>
                     <div className="flex flex-col gap-2">
                       {lockData.unclosed_dates.map((dateStr) => (
                         <div key={dateStr} className="flex justify-between items-center bg-white border border-slate-1 bg-opacity-70 px-3 py-2 rounded-lg font-mono text-xs text-slate-600">
                           <span>{dateStr}</span>
                           <span className="bg-red-100 text-red-700 text-[10px] font-sans font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                             Unclosed
                           </span>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}

                 <p className="text-xs text-slate-400 mb-6 font-sans leading-relaxed">
                   Once the Day Book EOD is closed and settled with accurate daily transactions, administrative lockouts are immediately lifted, allowing normal activity.
                 </p>

                 <button
                   onClick={() => {
                     window.location.href = '/accounts/daybook';
                   }}
                   className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold font-sans py-3 px-6 rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                 >
                   Go to Day Book and Close EOD
                   <span className="text-lg">→</span>
                 </button>
               </motion.div>
             </div>
           ) : (
             <AnimatePresence mode="wait">
               <motion.div
                 key={location.pathname}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 transition={{ duration: 0.2, ease: "easeOut" }}
                 className="max-w-none w-full px-4 sm:px-6 lg:px-8 print:p-0 print:m-0 print:block"
               >
                  <Outlet />
               </motion.div>
             </AnimatePresence>
           )}
        </main>

        {/* Floating AI Chat Assistant only for Super Admin and Managers */}
        <AIChatBot user={user} />
      </div>
    </div>
  );
}
