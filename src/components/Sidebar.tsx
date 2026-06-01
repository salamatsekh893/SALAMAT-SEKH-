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
  
  // Close sidebar on navigation
  useEffect(() => {
    if (isOpen) {
      setIsOpen(false);
    }
  }, [location.pathname]);

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[3px] cursor-pointer"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-[280px] bg-[#fff5f6] text-rose-950 transition-transform duration-300 ease-in-out flex flex-col overflow-hidden h-screen shadow-2xl border-r border-[#ffe4e6] shrink-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Sidebar Header (Matches .sidebar-header) */}
        <div className="p-6 text-center bg-rose-50/60 border-b border-rose-100 flex items-center justify-center gap-2">
            <span className="text-lg font-[900] uppercase tracking-widest text-[#9f1239] flex items-center gap-2">
                <svg className="w-5 h-5 text-rose-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7v2h20V7L12 2zm0 18c-4.41 0-8-3.59-8-8 0-4.41 3.59-8 8-8s8 3.59 8 8c0 4.41-3.59 8-8 8z" /></svg>
                ALJOOYA SUBIDHA
            </span>
        </div>

        {/* Profile Info (Minimal integration for staff) */}
        <div className="mx-3 my-2 p-3 bg-white border border-rose-100 rounded-xl flex items-center gap-3 shadow-xs">
            <Link 
              to="/profile" 
              className="flex items-center gap-3 flex-1 min-w-0 group"
              onClick={() => { setIsOpen(false); }}
            >
              <div className="w-10 h-10 rounded-full border-2 border-rose-200 bg-rose-50 flex items-center justify-center overflow-hidden group-hover:border-rose-400 transition-all duration-300 transform group-hover:scale-105">
                  {user?.photo_url ? (
                    <img src={user.photo_url} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="text-rose-600 w-5 h-5" />
                  )}
              </div>
              <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-black text-rose-950 uppercase truncate group-hover:text-rose-800 transition-colors">{user?.name}</div>
                  <div className="text-[10px] font-extrabold text-[#9f1239] uppercase tracking-wider">
                    View Profile
                  </div>
              </div>
            </Link>
            <button onClick={() => setIsOpen(false)} className="text-rose-400 hover:text-rose-600 transition-colors p-1 bg-rose-50 hover:bg-rose-100 rounded-full">
                <X className="w-4 h-4" />
            </button>
        </div>

        {/* Navigation (.menu-items) */}
        <div className="flex-1 overflow-y-auto scrollbar-hide pt-2 pb-20">
          <nav className="flex flex-col space-y-1">
            {navigation.map((item) => (
              <div key={item.name} className="menu-group px-2">
                {item.isGroup ? (
                  <>
                    <button
                      onClick={() => item.setOpen?.(!item.isOpen)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 text-[13px] font-[800] uppercase tracking-[0.5px] rounded-xl transition-all duration-200 outline-none text-rose-900/90 hover:bg-rose-100/60 hover:text-rose-950",
                        item.isOpen ? "bg-rose-100/50 text-rose-950 font-extrabold" : ""
                      )}
                    >
                      <div className="flex items-center">
                        <item.icon className="mr-3 h-[18px] w-[18px] text-rose-600 group-hover:scale-110 transition-transform font-extrabold" />
                        {item.name}
                      </div>
                      <ChevronRight className={cn(
                        "h-4 w-4 transition-transform duration-350 text-rose-600 font-bold",
                        item.isOpen && "rotate-180"
                      )} />
                    </button>
                    <AnimatePresence>
                      {item.isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="overflow-hidden mt-1 mb-2 bg-rose-50/60 rounded-xl py-1 space-y-0.5 mx-1"
                        >
                          {item.children?.map((child: any) => {
                            const isChildActive = location.pathname === child.href;
                            return (
                              <NavLink
                                key={child.name}
                                to={child.href}
                                className={cn(
                                  "flex items-center px-6 py-2 text-[12.5px] font-[700] tracking-[0.3px] text-rose-900/80 rounded-lg hover:text-rose-950 hover:bg-rose-100/50 transition-all duration-200 whitespace-nowrap outline-none",
                                  isChildActive && 'text-[#9f1239] font-extrabold bg-[#ffe4e6]/30'
                                )}
                                onClick={() => {
                                  setIsOpen(false);
                                }}
                              >
                                <div className={cn(
                                  "mr-3 w-1.5 h-1.5 rounded-full border border-rose-400 transition-all bg-transparent",
                                  isChildActive && "bg-[#9f1239] border-[#9f1239] scale-125"
                                )} />
                                <span className="flex-1">{child.name}</span>
                                {child.badge !== undefined && (
                                  <span className="bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full ml-auto shadow-sm">
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
                      "flex items-center px-4 py-3 text-[13px] font-[800] uppercase tracking-[0.5px] rounded-xl transition-all duration-250 outline-none text-rose-900/90 hover:bg-rose-100/50 hover:text-rose-950",
                      isActive 
                        ? 'text-[#9f1239] font-black bg-[#ffe4e6]/45 border-l-4 border-[#9f1239]' 
                        : ''
                    )}
                    onClick={() => {
                      setIsOpen(false);
                    }}
                  >
                    <item.icon className="mr-3 h-[18px] w-[18px] text-rose-600 font-extrabold" />
                    {item.name}
                  </NavLink>
                )}
              </div>
            ))}
            
            {/* Logout Link (Matches example) */}
            <div className="px-4 pt-2">
              <button
                 onClick={onLogout}
                 className="w-full flex items-center justify-center gap-2 px-4 py-3 text-[13px] font-[800] uppercase tracking-[0.5px] transition-all outline-none text-rose-700 hover:text-rose-950 hover:bg-rose-100 rounded-xl border border-rose-200 bg-white/50 shadow-xs mt-4 cursor-pointer font-black"
              >
                 <LogOut className="h-[18px] w-[18px] text-rose-600" />
                 LOGOUT
              </button>
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
}
