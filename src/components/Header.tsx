import { Menu, Bell, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  onMenuClick: () => void;
  title?: string;
  user: any;
  company?: any;
}

export default function Header({ onMenuClick, title = "ALJOOYA SUBIDHA SERVICES", user, company }: HeaderProps) {
  const displayTitle = company?.name || title;
  const logoUrl = company?.logo_url;

  return (
    <header className="h-16 lg:h-20 bg-gradient-to-r from-indigo-600 via-violet-600 to-rose-500 animate-gradient-x bg-[length:200%_200%] sticky top-0 z-30 shadow-xl overflow-hidden">
      <div className="max-w-[1600px] mx-auto w-full h-full flex items-center justify-between px-4 lg:px-8 relative">
        {/* Decorative glows */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-white/10 rounded-full blur-[100px] animate-pulse pointer-events-none" />
        
        <div className="flex items-center gap-4 lg:gap-8 relative z-10">
          <button 
            onClick={onMenuClick}
            className="p-3 bg-white/20 text-white hover:bg-white/30 rounded-2xl transition-all border border-white/30 active:scale-95 shadow-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-3">
            {logoUrl && (
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white rounded-xl p-1 shadow-inner overflow-hidden flex-shrink-0">
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              </div>
            )}
            <div className="flex flex-col">
              <h1 className="text-sm lg:text-lg font-black text-white tracking-[0.2em] lg:tracking-[0.2em] uppercase drop-shadow-lg leading-tight">
                {displayTitle}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                <span className="text-[9px] lg:text-[10px] font-bold text-white/80 uppercase tracking-widest leading-none">System Active</span>
              </div>
            </div>
          </div>
        </div>

        <Link to="/profile" className="flex items-center gap-4 relative z-10 group hover:opacity-90 transition-all">
          <div className="hidden lg:block text-right">
            <div className="text-xs font-black text-white uppercase leading-none mb-1 drop-shadow-md group-hover:text-indigo-100">{user?.name}</div>
            <div className="text-[9px] font-bold text-white/60 uppercase tracking-widest leading-none">{user?.role}</div>
          </div>
          <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-white font-bold overflow-hidden shadow-xl ring-2 ring-white/10 group-hover:ring-white/30 group-hover:scale-105 transition-all">
            {user?.photo_url ? (
              <img src={user.photo_url} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-xl font-black">{user?.name?.charAt(0).toUpperCase()}</span>
            )}
          </div>
        </Link>
      </div>
    </header>
  );
}
