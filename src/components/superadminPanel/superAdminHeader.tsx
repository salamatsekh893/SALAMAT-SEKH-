import { Menu, Bell, Shield, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SuperAdminHeaderProps {
  onMenuClick: () => void;
  title?: string;
  user: any;
  company?: any;
}

export default function SuperAdminHeader({ onMenuClick, title = "ALJOOYA SUPERADMIN CONSOLE", user, company }: SuperAdminHeaderProps) {
  const displayTitle = company?.name || title;
  const logoUrl = company?.logo_url;

  return (
    <header className="h-16 lg:h-20 bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900 sticky top-0 z-30 shadow-2xl border-b border-indigo-500/20 overflow-hidden">
      <div className="max-w-[1600px] mx-auto w-full h-full flex items-center justify-between px-4 lg:px-8 relative">
        {/* Futuristic glowing effects */}
        <div className="absolute top-0 right-0 -mt-24 -mr-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
        <div className="absolute top-0 left-1/3 -mt-12 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="flex items-center gap-4 lg:gap-8 relative z-10">
          <button 
            onClick={onMenuClick}
            className="p-3 bg-white/5 hover:bg-white/10 text-indigo-200 hover:text-white rounded-2xl transition-all border border-white/10 active:scale-95 shadow-md"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white rounded-xl p-1 shadow-inner overflow-hidden flex-shrink-0">
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="flex flex-col">
              <h1 className="text-xs lg:text-base font-black text-white tracking-[0.2em] uppercase drop-shadow-lg leading-tight flex items-center gap-1.5">
                {displayTitle}
                <span className="bg-amber-500/20 text-amber-300 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full border border-amber-500/30">HQ</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                <span className="text-[8px] lg:text-[9px] font-black text-indigo-300 uppercase tracking-widest leading-none">SUPERADMIN CONTROL ACTIVE</span>
              </div>
            </div>
          </div>
        </div>

        <Link to="/profile" className="flex items-center gap-4 relative z-10 group hover:opacity-90 transition-all">
          <div className="hidden lg:block text-right">
            <div className="text-xs font-black text-white uppercase leading-none mb-1 drop-shadow-md group-hover:text-indigo-200">{user?.name}</div>
            <div className="text-[8px] font-extrabold text-amber-300 uppercase tracking-widest leading-none flex items-center justify-end gap-1">
              <Award className="w-3.5 h-3.5" /> SUPER ADMIN
            </div>
          </div>
          <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-white font-bold overflow-hidden shadow-xl ring-2 ring-indigo-500/30 group-hover:ring-indigo-400/50 group-hover:scale-105 transition-all">
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
