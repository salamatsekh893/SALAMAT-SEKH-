import { useEffect } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { 
  X, LogOut, User, LayoutDashboard, PiggyBank, HandCoins, HelpCircle, ShieldAlert
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
    },
    {
      name: 'আমার প্রোফাইল',
      href: '/profile',
      icon: User,
      description: 'Profile Information'
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
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[4px] cursor-pointer"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-[290px] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 transition-transform duration-300 ease-in-out flex flex-col overflow-hidden h-screen shadow-2xl border-r border-amber-500/10 shrink-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Sidebar Header */}
        <div className="p-6 text-center bg-amber-950/40 border-b border-amber-500/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md">
              <span className="text-white font-black text-sm">AS</span>
            </div>
            <div className="text-left">
              <span className="text-sm font-black uppercase tracking-widest text-amber-400 block leading-none">
                ALJOOYA
              </span>
              <span className="text-[9px] font-bold text-amber-200/60 uppercase tracking-widest block mt-0.5">
                SUBIDHA SERVICES
              </span>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            className="text-amber-200/60 hover:text-white transition-colors p-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Info */}
        <div className="mx-4 my-4 p-4 bg-gradient-to-br from-amber-950/30 to-amber-900/10 border border-amber-500/10 rounded-2xl flex items-center gap-3.5 shadow-md">
          <Link 
            to="/profile" 
            className="flex items-center gap-3.5 flex-1 min-w-0 group"
            onClick={() => setIsOpen(false)}
          >
            <div className="w-11 h-11 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-center overflow-hidden group-hover:border-amber-400 transition-all duration-300 transform group-hover:scale-105">
              {user?.photo_url ? (
                <img src={user.photo_url} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User className="text-amber-400 w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-black text-white uppercase truncate group-hover:text-amber-300 transition-colors">
                {user?.name}
              </div>
              <div className="text-[9px] font-extrabold text-amber-400/80 uppercase tracking-widest mt-0.5">
                পোর্টালে স্বাগতম
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-3 py-2 space-y-1">
          <div className="text-[10px] font-black uppercase text-amber-500/50 px-3 mb-2 tracking-widest">
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
                    className="w-full flex items-center gap-3 px-3.5 py-3 text-[12.5px] font-bold rounded-xl transition-all outline-none text-slate-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5 text-left"
                  >
                    <div className="p-1.5 bg-amber-500/5 text-amber-400 rounded-lg">
                      <item.icon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <span className="block leading-none text-slate-200">{item.name}</span>
                      <span className="text-[9px] font-semibold text-slate-400 block mt-0.5">{item.description}</span>
                    </div>
                  </button>
                );
              }

              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-3 text-[12.5px] font-bold rounded-xl transition-all outline-none text-slate-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5",
                    isActive && 'text-white bg-gradient-to-r from-amber-950 to-amber-900/50 border-amber-500/20 font-black'
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <div className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    isActive ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20" : "bg-amber-500/5 text-amber-400"
                  )}>
                    <item.icon className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <span className={cn("block leading-none", isActive ? "text-amber-300" : "text-slate-200")}>{item.name}</span>
                    <span className="text-[9px] font-semibold text-slate-400 block mt-0.5">{item.description}</span>
                  </div>
                </NavLink>
              );
            })}
          </nav>

          {/* Quick Notice Card */}
          <div className="mx-1 mt-6 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
            <div className="flex items-center gap-2 mb-1.5 text-amber-400">
              <ShieldAlert className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">সতর্কবার্তা / নোটিশ</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
              আপনার পাসওয়ার্ড বা ওটিপি কারো সাথে শেয়ার করবেন না। Aljooya Subidha কোনো সময়েই আপনার গোপন পাসওয়ার্ড জানতে চায় না।
            </p>
          </div>
        </div>

        {/* Logout section */}
        <div className="p-4 border-t border-amber-500/10 bg-slate-950/60">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 text-[12.5px] font-black uppercase tracking-wider transition-all outline-none text-rose-400 hover:text-white bg-rose-500/5 hover:bg-rose-500 rounded-xl border border-rose-500/20 hover:border-rose-500 cursor-pointer shadow-sm"
          >
            <LogOut className="h-4 w-4" />
            লগআউট (LOGOUT)
          </button>
        </div>
      </aside>
    </>
  );
}
