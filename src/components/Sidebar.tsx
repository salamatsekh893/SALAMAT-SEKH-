import { useEffect } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { 
  X, LogOut, ChevronRight, User
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  user: any;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onLogout: () => void;
  navigation: any[];
}

export default function Sidebar({ user, isOpen, setIsOpen, onLogout, navigation }: SidebarProps) {
  const location = useLocation();
  
  // Close sidebar on navigation (useful for mobile)
  useEffect(() => {
    if (isOpen) {
      setIsOpen(false);
    }
  }, [location.pathname]);

  return (
    <>
      {/* Backdrop (Mobile only) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[3px] cursor-pointer"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-[280px] bg-[#34495e] text-white transform transition-all duration-300 ease-in-out flex flex-col overflow-hidden h-screen shadow-[10px_0_30px_rgba(0,0,0,0.3)]",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Sidebar Header (Matches .sidebar-header) */}
        <div className="p-[25px_20px] text-center bg-[#34495e] border-b border-white/5 flex items-center justify-center gap-2">
            <span className="text-xl font-[800] uppercase tracking-wider text-white flex items-center gap-2">
                <svg className="w-5 h-5 opacity-80" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7v2h20V7L12 2zm0 18c-4.41 0-8-3.59-8-8 0-4.41 3.59-8 8-8s8 3.59 8 8c0 4.41-3.59 8-8 8z" /></svg>
                ALJOOYA SUBIDHA
            </span>
        </div>

        {/* Profile Info (Minimal integration for staff) */}
        <div className="px-5 py-3 bg-[#2c3e50] border-b border-[#34495e] flex items-center gap-3">
            <Link 
              to="/profile" 
              className="flex items-center gap-3 flex-1 min-w-0 group"
              onClick={() => { setIsOpen(false); }}
            >
              <div className="w-10 h-10 rounded-full border-2 border-white/20 bg-white/10 flex items-center justify-center overflow-hidden group-hover:border-blue-400 transition-colors">
                  {user?.photo_url ? (
                    <img src={user.photo_url} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="text-white w-5 h-5" />
                  )}
              </div>
              <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-bold uppercase truncate group-hover:text-blue-400 transition-colors">{user?.name}</div>
                  <div className="text-[9px] font-bold text-blue-400 uppercase tracking-tighter opacity-80 underline underline-offset-2 decoration-transparent group-hover:decoration-blue-400 transition-all">
                    View Profile
                  </div>
              </div>
            </Link>
            <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white">
                <X className="w-4 h-4" />
            </button>
        </div>

        {/* Navigation (.menu-items) */}
        <div className="flex-1 overflow-y-auto scrollbar-hide pt-2 pb-20">
          <nav className="flex flex-col">
            {navigation.map((item) => (
              <div key={item.name} className="menu-group">
                {item.isGroup ? (
                  <>
                    <button
                      onClick={() => item.setOpen?.(!item.isOpen)}
                      className={cn(
                        "w-full flex items-center justify-between px-5 py-[15px] text-[14px] font-[700] uppercase tracking-[0.5px] transition-all outline-none border-l-4 border-transparent",
                        item.isOpen ? "bg-transparent text-white active-dropdown" : "text-[#ffffff] hover:bg-transparent"
                      )}
                    >
                      <div className="flex items-center">
                        <item.icon className="mr-3 h-[18px] w-[18px] text-[#ecf0f1]" />
                        {item.name}
                      </div>
                      <ChevronRight className={cn(
                        "h-4 w-4 transition-transform duration-300 arrow text-[#bdc3c7]",
                        item.isOpen && "rotate-180"
                      )} />
                    </button>
                    <AnimatePresence>
                      {item.isOpen && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden bg-transparent"
                        >
                          {item.children?.map((child: any) => {
                            const isChildActive = location.pathname === child.href;
                            return (
                              <NavLink
                                key={child.name}
                                to={child.href}
                                className={cn(
                                  "flex items-center px-10 py-[12px] text-[13px] font-[700] tracking-[0.5px] text-[#e0e0e0] uppercase hover:text-white transition-all whitespace-nowrap",
                                  isChildActive && 'text-white'
                                )}
                                onClick={() => {
                                  setIsOpen(false);
                                }}
                              >
                                <div className="mr-3 w-2 h-2 rounded-full border-2 border-[#ecf0f1] opacity-80" />
                                <span className="flex-1">{child.name}</span>
                                {child.badge !== undefined && (
                                  <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full ml-auto">
                                    {child.badge}
                                  </span>
                                )}
                              </NavLink>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={({ isActive }) => cn(
                      "flex items-center px-5 py-[15px] text-[14px] font-[700] uppercase tracking-[0.5px] transition-all outline-none border-l-4 border-transparent",
                      isActive 
                        ? 'bg-transparent text-white border-white/20' 
                        : 'text-[#ffffff] hover:bg-transparent'
                    )}
                    onClick={() => {
                      setIsOpen(false);
                    }}
                  >
                    <item.icon className="mr-3 h-[18px] w-[18px] text-[#ecf0f1]" />
                    {item.name}
                  </NavLink>
                )}
              </div>
            ))}
            
            {/* Logout Link (Matches example) */}
            <button
               onClick={onLogout}
               className="flex items-center px-5 py-[15px] text-[14px] font-[700] uppercase tracking-[0.5px] transition-all outline-none text-[#ff7675] border-t border-white/10 mt-5"
            >
               <LogOut className="mr-3 h-[18px] w-[18px]" />
               LOGOUT
            </button>
          </nav>
        </div>
      </aside>
    </>
  );
}
