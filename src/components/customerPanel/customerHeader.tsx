import { Menu, Bell, HeartHandshake } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CustomerHeaderProps {
  onMenuClick: () => void;
  title?: string;
  user: any;
  company?: any;
}

export default function CustomerHeader({ onMenuClick, title = "ALJOOYA CUSTOMER PORTAL", user, company }: CustomerHeaderProps) {
  const displayTitle = company?.name || title;
  const logoUrl = company?.logo_url;

  return (
    <header className="h-16 lg:h-20 bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 sticky top-0 z-30 shadow-2xl border-b border-amber-500/20 overflow-hidden">
      <div className="max-w-[1600px] mx-auto w-full h-full flex items-center justify-between px-4 lg:px-8 relative">
        {/* Subtle glow */}
        <div className="absolute top-0 right-0 -mt-24 -mr-24 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />

        <div className="flex items-center gap-4 lg:gap-8 relative z-10">
          <button 
            onClick={onMenuClick}
            className="p-3 bg-white/5 hover:bg-white/10 text-amber-200 hover:text-white rounded-2xl transition-all border border-white/10 active:scale-95 shadow-md"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white rounded-xl p-1 shadow-inner overflow-hidden flex-shrink-0">
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl flex items-center justify-center shadow-lg">
                <HeartHandshake className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="flex flex-col">
              <h1 className="text-xs lg:text-base font-black text-white tracking-[0.2em] uppercase drop-shadow-lg leading-tight flex items-center gap-1.5">
                {displayTitle}
                <span className="bg-amber-500/20 text-amber-300 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full border border-amber-500/30">Customer</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-[8px] lg:text-[9px] font-black text-amber-300 uppercase tracking-widest leading-none">Customer Access Portal</span>
              </div>
            </div>
          </div>
        </div>

        <Link to="/profile" className="flex items-center gap-4 relative z-10 group hover:opacity-90 transition-all">
          <div className="hidden lg:block text-right">
            <div className="text-xs font-black text-white uppercase leading-none mb-1 drop-shadow-md group-hover:text-amber-200">{user?.name}</div>
            <div className="text-[8px] font-extrabold text-amber-300 uppercase tracking-widest leading-none">
              CUSTOMER
            </div>
          </div>
          <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-white font-bold overflow-hidden shadow-xl ring-2 ring-amber-500/30 group-hover:ring-amber-400/50 group-hover:scale-105 transition-all">
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
