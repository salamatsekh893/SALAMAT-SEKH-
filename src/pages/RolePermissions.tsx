import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { fetchWithAuth } from '../lib/api';
import { Shield, Save, Key } from 'lucide-react';
import { voiceFeedback } from '../lib/voice';
import toast from 'react-hot-toast';

const PERMISSION_MODULES = [
  { id: 'module_dashboard', label: 'Dashboard', sub: [
    { id: 'sub_dash_stat_branches', label: 'Stat: Total Branches' },
    { id: 'sub_dash_stat_customers', label: 'Stat: Total Customers' },
    { id: 'sub_dash_stat_loans_pending', label: 'Stat: Pending Loans' },
    { id: 'sub_dash_stat_loans_awaiting', label: 'Stat: Awaiting Disbursal' },
    { id: 'sub_dash_stat_loans_active', label: 'Stat: Active Loans' },
    { id: 'sub_dash_stat_bank', label: 'Stat: Total Bank Balance' },
    { id: 'sub_dash_stat_collection', label: 'Stat: Total Collection' },
    { id: 'sub_dash_portfolio', label: 'Active Portfolio Overview' },
    { id: 'sub_dash_chart_trend', label: 'Chart: Collection Trend' },
    { id: 'sub_dash_quick_close', label: 'Quick Action: Close A/C' },
    { id: 'sub_dash_quick_loan', label: 'Quick Action: New Loan' },
    { id: 'sub_dash_quick_col', label: 'Quick Action: Collection' },
    { id: 'sub_dash_quick_member', label: 'Quick Action: New Member' },
    { id: 'sub_dash_quick_group_shift', label: 'Quick Action: Group Shifting' },
    { id: 'sub_dash_quick_staff_shift', label: 'Quick Action: Staff Shifting' },
    { id: 'sub_dash_quick_day_shift', label: 'Quick Action: Day Shifting' },
    { id: 'sub_dash_quick_travel_log', label: 'Quick Action: Travel Log' },
    { id: 'sub_dash_quick_travel_approve', label: 'Quick Action: Travel Approve' },
  ] },
  { id: 'module_administration', label: 'Administration', sub: [
    { id: 'sub_admin_company', label: 'Company Profile' },
    { id: 'sub_admin_branch', label: 'Branch Management' },
    { id: 'sub_admin_user', label: 'User Management' },
  ] },
  { id: 'module_hr', label: 'HR Management', sub: [
    { id: 'sub_hr_employee', label: 'Employee List' },
    { id: 'sub_hr_attendance', label: 'Attendance' },
    { id: 'sub_hr_salary', label: 'Salary Payment' },
  ] },
  { id: 'module_capital', label: 'Capital & Banking', sub: [
    { id: 'sub_capital_log', label: 'Capital Log' },
    { id: 'sub_capital_bank', label: 'Bank Accounts' },
  ] },
  { id: 'module_members', label: 'Members & Groups', sub: [
    { id: 'sub_member_group_list', label: 'Group List' },
    { id: 'sub_member_create_group', label: 'Create Group' },
    { id: 'sub_member_add', label: 'Add Member' },
    { id: 'sub_member_list', label: 'Member List' },
    { id: 'sub_member_group_shift', label: 'Group Shifting' },
    { id: 'sub_member_staff_shift', label: 'Staff Shifting' },
    { id: 'sub_member_day_shift', label: 'Day Shifting' },
  ] },
  { id: 'module_loans', label: 'Loan Management', sub: [
    { id: 'sub_loan_schemes', label: 'Loan Schemes' },
    { id: 'sub_loan_new', label: 'New Request' },
    { id: 'sub_loan_approvals', label: 'Approvals' },
    { id: 'sub_loan_disburse', label: 'Disbursement' },
    { id: 'sub_loan_accounts', label: 'Loan Accounts' },
  ] },
  { id: 'module_collection', label: 'Collection', sub: [
    { id: 'sub_col_daily', label: 'Daily Collection' },
    { id: 'sub_col_approve', label: 'Approve Collection' },
    { id: 'sub_col_view', label: 'Collection View' },
    { id: 'sub_col_demand', label: 'Demand Sheet' },
    { id: 'sub_col_preclose', label: 'Pre-Close Loan' },
    { id: 'sub_col_overdue', label: 'Overdue List' },
  ] },
  { id: 'module_accounts', label: 'Accounts & Expense', sub: [
    { id: 'sub_acc_daybook', label: 'Day Book' },
    { id: 'sub_acc_expense', label: 'Add Expense' },
    { id: 'sub_acc_pl', label: 'Profit & Loss' },
  ] },
  { id: 'module_savings', label: 'Savings & RD', sub: [
    { id: 'sub_sav_accounts', label: 'Savings Accounts' },
    { id: 'sub_sav_rd', label: 'Recurring Deposits' },
  ] },
  { id: 'module_sales', label: 'Product & Sales', sub: [
    { id: 'sub_sale_add_prod', label: 'Add Product' },
    { id: 'sub_sale_stock', label: 'Stock List' },
    { id: 'sub_sale_new', label: 'New Sale' },
    { id: 'sub_sale_history', label: 'Sales History' },
  ] },
  { id: 'module_reports', label: 'Reports', sub: [
    { id: 'sub_report_daily', label: 'Financial Reports' },
  ] },
  { id: 'module_travel', label: 'Travel Management', sub: [
    { id: 'sub_travel_log', label: 'Travel Log' },
    { id: 'sub_travel_approve', label: 'Travel Approvals' },
  ] }
];

const PERMISSION_ACTIONS = [
  { id: 'action_create', label: 'Create Records' },
  { id: 'action_edit', label: 'Edit Database' },
  { id: 'action_delete', label: 'Delete Records' },
];

const AVAILABLE_ROLES = [
  { id: 'fo', label: 'Field Officer (FO)' },
  { id: 'branch_manager', label: 'Branch Manager (BM)' },
  { id: 'am', label: 'Area Manager (AM)' },
  { id: 'dm', label: 'Divisional Manager (DM)' },
  { id: 'manager', label: 'General Manager' }
];

export default function RolePermissions() {
  const [selectedRole, setSelectedRole] = useState('fo');
  const [permissionsByRole, setPermissionsByRole] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchWithAuth('/role_permissions')
      .then(data => {
        const mapping: Record<string, string[]> = {};
        if (Array.isArray(data)) {
          data.forEach((row: any) => {
             try {
               mapping[row.role] = JSON.parse(row.permissions);
             } catch(e) {}
          });
        }
        setPermissionsByRole(mapping);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const currentPermissions = permissionsByRole[selectedRole] || [];

  const handleToggle = (permissionId: string) => {
    const updated = currentPermissions.includes(permissionId)
      ? currentPermissions.filter(id => id !== permissionId)
      : [...currentPermissions, permissionId];
    
    setPermissionsByRole({
      ...permissionsByRole,
      [selectedRole]: updated
    });
  };

  const handleModuleToggle = (module: any, type: 'all' | 'none') => {
    const subIds = module.sub.map((s: any) => s.id);
    let updated = [...currentPermissions];
    
    if (type === 'all') {
      // Add module ID and all sub IDs if not present
      if (!updated.includes(module.id)) updated.push(module.id);
      subIds.forEach((id: string) => {
        if (!updated.includes(id)) updated.push(id);
      });
    } else {
      // Remove module ID and all sub IDs
      updated = updated.filter(id => id !== module.id && !subIds.includes(id));
    }

    setPermissionsByRole({
      ...permissionsByRole,
      [selectedRole]: updated
    });
    toast.success(`${type === 'all' ? 'Enabled' : 'Disabled'} ${module.label} permissions`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetchWithAuth('/role_permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: selectedRole,
          permissions: currentPermissions
        })
      });
      voiceFeedback.success();
      toast.success('Role permissions updated successfully');
    } catch(err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Shield className="w-8 h-8 text-indigo-600" />
            Role Permissions
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-1">Configure sidebar and action access for each role</p>
        </div>
        
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/30 w-full sm:w-auto justify-center"
        >
          {saving ? 'Saving...' : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-200 overflow-x-auto hide-scrollbar">
          {AVAILABLE_ROLES.map(role => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={`shrink-0 whitespace-nowrap px-5 py-2.5 text-sm rounded-xl font-bold transition-all ${
                selectedRole === role.id 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {role.label}
            </button>
          ))}
        </div>

        <motion.div 
          key={selectedRole}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 sm:space-y-8"
        >
          <div className="flex items-center gap-3 px-1">
            <div className="w-12 h-12 bg-white shadow-sm border border-slate-200 rounded-xl flex items-center justify-center shrink-0">
              <Key className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
               <h3 className="text-xl sm:text-2xl font-black text-slate-800">
                 {AVAILABLE_ROLES.find(r => r.id === selectedRole)?.label} Permissions
               </h3>
               <p className="text-xs sm:text-sm font-bold text-slate-500">Enable or disable access to specific features</p>
            </div>
          </div>

          <div className="space-y-8">
            <section className="overflow-hidden w-full">
              <div className="flex items-center justify-between mb-3 px-2">
                 <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Sidebar Modules</h4>
              </div>
              <div className="rounded-2xl border border-slate-200 overflow-x-auto bg-white shadow-sm w-full block">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 border-r border-slate-200 py-3 text-xs font-black text-slate-500 uppercase w-12 text-center">Module</th>
                      <th className="px-4 py-3 text-xs border-r border-slate-200 font-black text-slate-500 uppercase w-1/3">Main Menu</th>
                      <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase">Sub Menu Permissions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {PERMISSION_MODULES.map((module, idx) => (
                      <tr key={module.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="px-4 py-4 align-top text-center border-r border-slate-100">
                          <label className="inline-flex cursor-pointer group">
                            <input type="checkbox" className="hidden" checked={currentPermissions.includes(module.id)} onChange={() => handleToggle(module.id)} />
                            <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                               currentPermissions.includes(module.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 group-hover:border-indigo-400'
                            }`}>
                              {currentPermissions.includes(module.id) && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </div>
                          </label>
                        </td>
                        <td className="px-4 py-4 align-top border-r border-slate-100">
                          <div className="flex flex-col gap-1">
                            <span className={`text-sm font-black ${currentPermissions.includes(module.id) ? 'text-indigo-900' : 'text-slate-600'}`}>{module.label}</span>
                            <div className="flex gap-2">
                               <button 
                                 onClick={() => handleModuleToggle(module, 'all')}
                                 className="text-[9px] font-black text-indigo-600 uppercase tracking-tighter hover:underline"
                               >
                                 All
                               </button>
                               <button 
                                 onClick={() => handleModuleToggle(module, 'none')}
                                 className="text-[9px] font-black text-rose-600 uppercase tracking-tighter hover:underline"
                               >
                                 None
                               </button>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          {module.sub && module.sub.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {module.sub.map((sub: any) => (
                                <label key={sub.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors cursor-pointer group ${currentPermissions.includes(sub.id) ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                  <input type="checkbox" className="hidden" checked={currentPermissions.includes(sub.id)} onChange={() => handleToggle(sub.id)} />
                                  <div className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center border transition-colors ${
                                     currentPermissions.includes(sub.id) ? 'bg-indigo-500 border-indigo-500' : 'bg-white border-slate-300 group-hover:border-indigo-400'
                                  }`}>
                                    {currentPermissions.includes(sub.id) && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                  </div>
                                  <span className={`text-xs font-bold ${currentPermissions.includes(sub.id) ? 'text-indigo-800' : 'text-slate-600'}`}>{sub.label}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-slate-400 italic">No sub-menus configured</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="w-full">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-3 px-2">Action Privileges</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-slate-200 rounded-2xl overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-white shadow-sm">
                {PERMISSION_ACTIONS.map(action => (
                  <label key={action.id} className="flex items-center gap-3 p-4 bg-white hover:bg-slate-50 cursor-pointer transition-colors group">
                    <input type="checkbox" className="hidden" checked={currentPermissions.includes(action.id)} onChange={() => handleToggle(action.id)} />
                    <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                       currentPermissions.includes(action.id) ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-slate-300 group-hover:border-emerald-400'
                    }`}>
                      {currentPermissions.includes(action.id) && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <span className={`text-sm font-black ${currentPermissions.includes(action.id) ? 'text-emerald-900' : 'text-slate-600'}`}>{action.label}</span>
                  </label>
                ))}
              </div>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
