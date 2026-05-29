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
        "fixed inset-y-0 left-0 z-50 w-[280px] bg-gradient-to-b from-[#db2777] via-[#be185d] to-[#9d174d] text-white transform transition-all duration-300 ease-in-out flex flex-col overflow-hidden h-screen shadow-[10px_0_30px_rgba(219,39,119,0.25)]",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Sidebar Header (Matches .sidebar-header) */}
        <div className="p-[25px_20px] text-center bg-[#be185d]/40 border-b border-white/10 flex items-center justify-center gap-2">
            <span className="text-xl font-[900] uppercase tracking-wider text-white flex items-center gap-2 drop-shadow-sm">
                <svg className="w-5 h-5 text-pink-100" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7v2h20V7L12 2zm0 18c-4.41 0-8-3.59-8-8 0-4.41 3.59-8 8-8s8 3.59 8 8c0 4.41-3.59 8-8 8z" /></svg>
                ALJOOYA SUBIDHA
            </span>
        </div>

        {/* Profile Info (Minimal integration for staff) */}
        <div className="px-5 py-3 bg-[#9d174d]/40 border-b border-white/10 flex items-center gap-3">
            <Link 
              to="/profile" 
              className="flex items-center gap-3 flex-1 min-w-0 group"
              onClick={() => { setIsOpen(false); }}
            >
              <div className="w-10 h-10 rounded-full border-2 border-white/40 bg-white/10 flex items-center justify-center overflow-hidden group-hover:border-white transition-colors">
                  {user?.photo_url ? (
                    <img src={user.photo_url} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="text-white w-5 h-5" />
                  )}
              </div>
              <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-black text-white uppercase truncate group-hover:text-pink-100 transition-colors drop-shadow">{user?.name}</div>
                  <div className="text-[10px] font-extrabold text-pink-200 uppercase tracking-tight underline underline-offset-2 decoration-transparent group-hover:decoration-pink-100 transition-all">
                    View Profile
                  </div>
              </div>
            </Link>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition-colors p-1 bg-white/10 hover:bg-white/20 rounded-full">
                <X className="w-4 h-4" />
            </button>
        </div>

        {/* Navigation (.menu-items) */}
        <div className="flex-1 overflow-y-auto scrollbar-hide pt-2 pb-20">
          <nav className="flex flex-col">
            {navigation.map((item) => (
              <div key={item.name} className="menu-group border-b border-white/5 last:border-b-0">
                {item.isGroup ? (
                  <>
                    <button
                      onClick={() => item.setOpen?.(!item.isOpen)}
                      className={cn(
                        "w-full flex items-center justify-between px-5 py-[15px] text-[14px] font-[800] uppercase tracking-[0.5px] transition-all outline-none border-l-4 border-transparent text-white",
                        item.isOpen ? "bg-white/10 text-white font-black" : "hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center">
                        <item.icon className="mr-3 h-[18px] w-[18px] text-pink-100 saturate-150 font-extrabold" />
                        {item.name}
                      </div>
                      <ChevronRight className={cn(
                        "h-4 w-4 transition-transform duration-300 arrow text-white font-bold",
                        item.isOpen && "rotate-180"
                      )} />
                    </button>
                    <AnimatePresence>
                      {item.isOpen && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden bg-[#9d174d]/30"
                        >
                          {item.children?.map((child: any) => {
                            const isChildActive = location.pathname === child.href;
                            return (
                              <NavLink
                                key={child.name}
                                to={child.href}
                                className={cn(
                                  "flex items-center px-10 py-[12px] text-[13px] font-[800] tracking-[0.5px] text-pink-100 hover:text-white hover:bg-white/5 transition-all whitespace-nowrap",
                                  isChildActive && 'bg-white/20 text-white font-black border-r-4 border-white'
                                )}
                                onClick={() => {
                                  setIsOpen(false);
                                }}
                              >
                                <div className="mr-3 w-2 h-2 rounded-full border-2 border-white opacity-90" />
                                <span className="flex-1">{child.name}</span>
                                {child.badge !== undefined && (
                                  <span className="bg-white text-pink-700 text-[10px] font-black px-1.5 py-0.5 rounded-full ml-auto shadow-sm">
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
                      "flex items-center px-5 py-[15px] text-[14px] font-[800] uppercase tracking-[0.5px] transition-all outline-none border-l-4 border-transparent text-white",
                      isActive 
                        ? 'bg-white/20 text-white font-black border-l-4 border-white shadow-inner' 
                        : 'hover:bg-white/5'
                    )}
                    onClick={() => {
                      setIsOpen(false);
                    }}
                  >
                    <item.icon className="mr-3 h-[18px] w-[18px] text-pink-100 font-extrabold" />
                    {item.name}
                  </NavLink>
                )}
              </div>
            ))}
            
            {/* Logout Link (Matches example) */}
            <button
               onClick={onLogout}
               className="flex items-center px-5 py-[15px] text-[14px] font-[800] uppercase tracking-[0.5px] transition-all outline-none text-white hover:bg-white/10 border-t border-white/20 mt-5 bg-rose-950/20"
            >
               <LogOut className="mr-3 h-[18px] w-[18px] text-white" />
               LOGOUT
            </button>
          </nav>
        </div>
      </aside>
    </>
  );
}
