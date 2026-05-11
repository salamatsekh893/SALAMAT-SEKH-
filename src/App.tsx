import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Branches from './pages/Branches';
import CreateBranch from './pages/CreateBranch';
import Employees from './pages/Employees';
import CreateEmployee from './pages/CreateEmployee';
import Groups from './pages/Groups';
import GroupForm from './pages/GroupForm';
import Members from './pages/Members';
import CreateMember from './pages/CreateMember';
import Loans from './pages/Loans';
import CreateLoanRequest from './pages/CreateLoanRequest';
import LoanApprovals from './pages/LoanApprovals';
import LoanDisbursements from './pages/LoanDisbursements';
import ViewCollection from './pages/ViewCollection';
import TravelLog from './pages/TravelLog';
import TravelApprovals from './pages/TravelApprovals';
import TravelSettings from './pages/TravelSettings';
import CreateTravelLog from './pages/CreateTravelLog';
import FieldTracking from './pages/FieldTracking';
import DemandSheet from './pages/DemandSheet';
import Reports from './pages/Reports';
import Companies from './pages/Companies';
import CreateCompany from './pages/CreateCompany';
import Attendance from './pages/Attendance';
import MyAttendance from './pages/MyAttendance';
import Salary from './pages/Salary';
import Schemes from './pages/Schemes';
import SchemeForm from './pages/SchemeForm';
import LoanApplicationView from './pages/LoanApplicationView';
import LoanCardView from './pages/LoanCardView';
import LoanAgreementView from './pages/LoanAgreementView';
import NOCView from './pages/NOCView';
import OverdueList from './pages/OverdueList';
import Profile from './pages/Profile';

import ClosedLoans from './pages/ClosedLoans';
import PreCloseLoan from './pages/PreCloseLoan';

import ApproveCollection from './pages/ApproveCollection';
import BatchCollection from './pages/BatchCollection';
import BankAccounts from './pages/BankAccounts';
import CreateBankAccount from './pages/CreateBankAccount';
import CapitalList from './pages/CapitalList';
import AddCapital from './pages/AddCapital';
import DayBook from './pages/DayBook';
import ProfitLoss from './pages/ProfitLoss';
import Expenses from './pages/Expenses';
import Savings from './pages/Savings';
import CreateSavings from './pages/CreateSavings';
import RDPassbook from './pages/RDPassbook';
import SavingsPassbook from './pages/SavingsPassbook';
import PassbookCardView from './pages/PassbookCardView';
import RolePermissions from './pages/RolePermissions';

import Products from './pages/Products';
import AddProduct from './pages/AddProduct';
import Sales from './pages/Sales';
import NewSale from './pages/NewSale';

import GroupShifting from './pages/GroupShifting';
import StaffShifting from './pages/StaffShifting';
import DayShifting from './pages/DayShifting';

import { Toaster } from 'react-hot-toast';

export default function App() {
  const { user, loading, login, logout } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <Router>
      <Toaster position="top-center" reverseOrder={false} />
      <Routes>
        <Route path="/login" element={!user ? <Login onLogin={login} /> : <Navigate to="/" />} />
        
        {/* Protected Routes */}
        <Route element={user ? <Layout user={user} onLogout={logout} /> : <Navigate to="/login" />}>
          <Route path="/" element={<Dashboard user={user} />} />
          <Route path="/profile" element={<Profile user={user} />} />
          {['superadmin', 'dm'].includes(user?.role || '') && (
            <>
              <Route path="/branches" element={<Branches />} />
              <Route path="/branches/new" element={<CreateBranch />} />
              <Route path="/branches/edit/:id" element={<CreateBranch />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/companies/new" element={<CreateCompany />} />
              <Route path="/companies/edit/:id" element={<CreateCompany />} />
              <Route path="/roles" element={<RolePermissions />} />
            </>
          )}
          {['superadmin', 'am', 'dm', 'branch_manager', 'manager'].includes(user?.role || '') && (
            <>
              <Route path="/employees" element={<Employees />} />
              <Route path="/employees/new" element={<CreateEmployee />} />
              <Route path="/employees/edit/:id" element={<CreateEmployee />} />
              <Route path="/banks" element={<BankAccounts />} />
              <Route path="/banks/new" element={<CreateBankAccount />} />
              <Route path="/banks/edit/:id" element={<CreateBankAccount />} />
              <Route path="/capital" element={<CapitalList />} />
              <Route path="/capital/add" element={<AddCapital />} />
              <Route path="/accounts/daybook" element={<DayBook />} />
              <Route path="/accounts/expense" element={<Expenses />} />
              <Route path="/accounts/pl" element={<ProfitLoss />} />
              <Route path="/salary" element={<Salary />} />
              <Route path="/schemes" element={<Schemes />} />
              <Route path="/schemes/new" element={<SchemeForm />} />
              <Route path="/schemes/edit/:id" element={<SchemeForm />} />
              <Route path="/savings-accounts" element={<Savings type="saving" />} />
              <Route path="/recurring-deposits" element={<Savings type="rd" />} />
              <Route path="/savings/new" element={<CreateSavings />} />
              <Route path="/savings/passbook/saving/:id" element={<SavingsPassbook />} />
              <Route path="/savings/passbook/rd/:id" element={<RDPassbook />} />
              <Route path="/savings/card/:type/:id" element={<PassbookCardView />} />
              <Route path="/loans" element={<Loans />} />
              <Route path="/loans/new" element={<CreateLoanRequest />} />
              <Route path="/loans/view/:id" element={<LoanApplicationView />} />
              <Route path="/loans/card/:id" element={<LoanCardView />} />
              <Route path="/loans/agreement/:id" element={<LoanAgreementView />} />
              <Route path="/loans/noc/:id" element={<NOCView />} />
              <Route path="/loans/approvals" element={<LoanApprovals />} />
              <Route path="/loans/closed" element={<ClosedLoans />} />
              <Route path="/loans/pre-close" element={<PreCloseLoan />} />
              <Route path="/loans/disbursements" element={<LoanDisbursements />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/add" element={<AddProduct />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/sales/new" element={<NewSale />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/manage-attendance" element={<Attendance />} />
            </>
          )}
          {/* General routes for everyone who can log in (including FO and Collector) */}
          <Route path="/attendance" element={<MyAttendance user={user} />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/groups/new" element={<GroupForm />} />
          <Route path="/groups/edit/:id" element={<GroupForm />} />
          <Route path="/shifting/group" element={<GroupShifting />} />
          <Route path="/shifting/staff" element={<StaffShifting />} />
          <Route path="/shifting/day" element={<DayShifting />} />
          <Route path="/members" element={<Members />} />
          <Route path="/members/new" element={<CreateMember />} />
          <Route path="/members/edit/:id" element={<CreateMember />} />
          <Route path="/collections" element={<BatchCollection />} />
          <Route path="/collections/view" element={<ViewCollection />} />
          <Route path="/collections/demand" element={<DemandSheet />} />
          <Route path="/collections/approve" element={<ApproveCollection />} />
          <Route path="/collections/overdue" element={<OverdueList />} />
          <Route path="/travel/log" element={<TravelLog />} />
          <Route path="/travel/track" element={<FieldTracking />} />
          <Route path="/travel/new" element={<CreateTravelLog />} />
          <Route path="/travel/approvals" element={<TravelApprovals />} />
          <Route path="/travel/settings" element={<TravelSettings />} />
        </Route>
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

