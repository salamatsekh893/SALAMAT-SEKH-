import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../lib/api';
import { usePermissions } from '../hooks/usePermissions';

// Modular Role-Based Panels
import SuperAdminDashboard from '../components/superadminPanel/superAdminDashboard';
import BranchDashboard from '../components/branchPanel/branchDashboard';
import EmployeeDashboard from '../components/employeePanel/employeeDashboard';
import CustomerDashboard from '../components/customerPanel/customerDashboard';

export default function Dashboard({ user }: { user: any }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { hasPermission } = usePermissions();

  useEffect(() => {
    fetchWithAuth('/dashboard')
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (!user) return null;

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">LOADING CONSOLE...</p>
      </div>
    </div>
  );

  // Dynamic Routing based on User Role
  if (user.role === 'superadmin') {
    return <SuperAdminDashboard user={user} stats={stats} hasPermission={hasPermission} />;
  }

  if (user.role === 'branch_manager') {
    return <BranchDashboard user={user} stats={stats} hasPermission={hasPermission} />;
  }

  if (['fo', 'am', 'dm'].includes(user.role)) {
    return <EmployeeDashboard user={user} stats={stats} hasPermission={hasPermission} />;
  }

  if (user.role === 'customer') {
    return <CustomerDashboard user={user} stats={stats} />;
  }

  // Fallback to simple dashboard view
  return (
    <div className="p-6 bg-white border border-slate-200 rounded-3xl text-center shadow-sm">
      <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">System Console</h2>
      <p className="text-xs text-slate-500 font-medium mt-1">
        স্বাগতম, {user.name}! আপনার রোলটি ({user.role}) কনফিগার করা ড্যাশবোর্ড প্যানেল সমর্থন করে না।
      </p>
    </div>
  );
}
