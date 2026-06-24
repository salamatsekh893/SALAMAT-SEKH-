import { useEffect } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { 
  X, LogOut, User, LayoutDashboard, PiggyBank, HandCoins, ShieldAlert
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface CustomerPanelSidebarProps {
  user: any;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onLogout: () => void;
}

export default function CustomerPanelSidebar({ user, isOpen, setIsOpen, onLogout }: CustomerPanelSidebarProps) {
  const location = useLocation();
  
  // Close sidebar on navigation
  useEffect(() => {
    if (isOpen) {
      setIsOpen(false);
    }
  }, [location.pathname]);

  const navItems = [
    {
      name: 'ড্যাশবোর্ড (Dashboard)',
      href: '/',
      icon: LayoutDashboard,
      description: 'অ্যাকাউন্ট ওভারভিউ'
    },
    {
      name: 'আমার সঞ্চয় ও আরডি',
      href: '/#savings-section',
      icon: PiggyBank,
      description: 'Savings & RD Accounts'
    },
    {
      name: 'আমার লোন বা ঋণ',
      href: '/#loans-section',
      icon: HandCoins,
      description: 'Active Loan Details'
    }
  ];

  const handleScrollToSection = (href: string) => {
    setIsOpen(false);
    if (href.startsWith('/#')) {
      const elementId = href.substring(2);
      setTimeout(() => {
        const element = document.getElementById(elementId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

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
        "fixed inset-y-0 left-0 z-50 w-[290px] bg-[#fff5f6] text-rose-950 transition-transform duration-300 ease-in-out flex flex-col overflow-hidden h-screen shadow-2xl border-r border-[#ffe4e6] shrink-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Sidebar Header */}
        <div className="p-6 text-center bg-rose-50/60 border-b border-rose-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-600 to-rose-700 flex items-center justify-center shadow-md">
              <span className="text-white font-black text-sm">AS</span>
            </div>
            <div className="text-left">
              <span className="text-sm font-black uppercase tracking-widest text-rose-800 block leading-none">
                ALJOOYA
              </span>
              <span className="text-[9px] font-bold text-rose-600/80 uppercase tracking-widest block mt-0.5">
                SUBIDHA SERVICES
              </span>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            className="text-rose-400 hover:text-rose-600 transition-colors p-1.5 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Info */}
        <div className="mx-4 my-4 p-4 bg-white border border-rose-100 rounded-2xl flex items-center gap-3.5 shadow-sm">
          <Link 
            to="/profile" 
            className="flex items-center gap-3.5 flex-1 min-w-0 group"
            onClick={() => setIsOpen(false)}
          >
            <div className="w-11 h-11 rounded-xl border border-rose-200 bg-rose-50 flex items-center justify-center overflow-hidden group-hover:border-rose-400 transition-all duration-300 transform group-hover:scale-105">
              {user?.photo_url ? (
                <img src={user.photo_url} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User className="text-rose-600 w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-black text-rose-950 uppercase truncate group-hover:text-rose-800 transition-colors">
                {user?.name}
              </div>
              <div className="text-[9px] font-extrabold text-[#9f1239] uppercase tracking-widest mt-0.5">
                পোর্টালে স্বাগতম
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-3 py-2 space-y-1">
          <div className="text-[10px] font-black uppercase text-rose-500/80 px-3 mb-2 tracking-widest">
            মেনুসমূহ (MENU OPTIONS)
          </div>
          
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isScrollLink = item.href.includes('#');
              const isActive = !isScrollLink && location.pathname === item.href;
              
              if (isScrollLink) {
                return (
                  <button
                    key={item.name}
                    onClick={() => handleScrollToSection(item.href)}
                    className="w-full flex items-center gap-3 px-3.5 py-3 text-[12.5px] font-bold rounded-xl transition-all outline-none text-rose-900/90 hover:text-rose-950 hover:bg-rose-100/50 border border-transparent hover:border-white/5 text-left"
                  >
                    <div className="p-1.5 bg-rose-50 border border-rose-100/50 text-rose-600 rounded-lg">
                      <item.icon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <span className="block leading-none text-rose-950">{item.name}</span>
                      <span className="text-[9px] font-semibold text-rose-500/70 block mt-0.5">{item.description}</span>
                    </div>
                  </button>
                );
              }

              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-3 text-[12.5px] font-bold rounded-xl transition-all outline-none text-rose-900/90 hover:text-rose-950 hover:bg-rose-100/50 border border-transparent hover:border-white/5",
                    isActive && 'text-[#9f1239] font-black bg-[#ffe4e6]/60 border-l-4 border-[#9f1239]'
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <div className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    isActive ? "bg-[#9f1239] text-white shadow-sm shadow-rose-900/10" : "bg-rose-50 border border-rose-100/50 text-rose-600"
                  )}>
                    <item.icon className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <span className={cn("block leading-none", isActive ? "text-[#9f1239] font-black" : "text-rose-950")}>{item.name}</span>
                    <span className="text-[9px] font-semibold text-rose-500/70 block mt-0.5">{item.description}</span>
                  </div>
                </NavLink>
              );
            })}
          </nav>

          {/* Quick Notice Card */}
          <div className="mx-1 mt-6 p-4 bg-rose-50/50 border border-rose-100 rounded-2xl">
            <div className="flex items-center gap-2 mb-1.5 text-rose-600">
              <ShieldAlert className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">সতর্কবার্তা / নোটিশ</span>
            </div>
            <p className="text-[10px] text-rose-800/80 leading-relaxed font-medium">
              আপনার পাসওয়ার্ড বা ওটিপি কারো সাথে শেয়ার করবেন না। Aljooya Subidha কোনো সময়েই আপনার গোপন পাসওয়ার্ড জানতে চায় না।
            </p>
          </div>
        </div>

        {/* Logout section */}
        <div className="p-4 border-t border-rose-100 bg-rose-50/30">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 text-[12.5px] font-black uppercase tracking-wider transition-all outline-none text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 rounded-xl border border-rose-200 hover:border-rose-600 cursor-pointer shadow-sm"
          >
            <LogOut className="h-4 w-4" />
            লগআউট (LOGOUT)
          </button>
        </div>
      </aside>
    </>
  );
}
