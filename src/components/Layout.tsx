import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { fetchWithAuth } from '../lib/api';
import Sidebar from './Sidebar';
import Header from './Header';
import { cn } from '../lib/utils';
import { 
  LayoutDashboard, Wallet, UsersRound, Settings, 
  ShieldCheck, Users, Coins, HandCoins, Banknote, 
  Calculator, PiggyBank, ShoppingCart, FileText, Car
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

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
        fetchWithAuth('/loans')
          .then(data => {
            if (Array.isArray(data)) {
              setPendingApprovals(data.filter((l: any) => l.status === 'pending').length);
            }
          })
          .catch(() => {});
      };
      
      fetchLoans();
      // Optionally refresh every 2 mins
      const interval = setInterval(fetchLoans, 120000);
      return () => clearInterval(interval);
    }
  }, [user?.role, location.pathname]);

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
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar 
        user={user} 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
        onLogout={onLogout} 
        navigation={filteredNav} 
      />

      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <Header 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)} 
          user={user}
          company={company}
        />
        
        <main className="flex-1 w-full pb-12 text-slate-800">
           <AnimatePresence mode="wait">
             <motion.div
               key={location.pathname}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               transition={{ duration: 0.2, ease: "easeOut" }}
               className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8"
             >
                <Outlet />
             </motion.div>
           </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
