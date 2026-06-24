import { Menu, Bell, Wallet, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatAmount } from '../../lib/utils';

interface BranchHeaderProps {
  onMenuClick: () => void;
  title?: string;
  user: any;
  company?: any;
  branchWalletBalance?: number;
}

export default function BranchHeader({ onMenuClick, title = "ALJOOYA BRANCH ACCESS PORTAL", user, company, branchWalletBalance }: BranchHeaderProps) {
  const displayTitle = company?.name || title;
  const logoUrl = company?.logo_url;

  return (
    <header className="h-16 lg:h-20 bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-900 sticky top-0 z-30 shadow-2xl border-b border-emerald-500/20 overflow-hidden">
      <div className="max-w-[1600px] mx-auto w-full h-full flex items-center justify-between px-4 lg:px-8 relative">
        {/* Glowing background highlights */}
        <div className="absolute top-0 right-0 -mt-24 -mr-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
        
        <div className="flex items-center gap-4 lg:gap-8 relative z-10">
          <button 
            onClick={onMenuClick}
            className="p-3 bg-white/5 hover:bg-white/10 text-emerald-200 hover:text-white rounded-2xl transition-all border border-white/10 active:scale-95 shadow-md"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white rounded-xl p-1 shadow-inner overflow-hidden flex-shrink-0">
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-xl flex items-center justify-center shadow-lg">
                <Home className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="flex flex-col">
              <h1 className="text-xs lg:text-base font-black text-white tracking-[0.2em] uppercase drop-shadow-lg leading-tight flex items-center gap-1.5">
                {displayTitle}
                <span className="bg-emerald-500/20 text-emerald-300 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full border border-emerald-500/30">Branch</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[8px] lg:text-[9px] font-black text-emerald-300 uppercase tracking-widest leading-none">Branch Console Active</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 relative z-10">
          {branchWalletBalance !== undefined && (
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-2xl text-emerald-300 shadow-sm">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <div className="flex flex-col">
                <span className="text-[7px] font-black uppercase tracking-widest text-emerald-400 leading-none">ওয়ালেট ব্যালেন্স</span>
                <span className="text-xs font-black mt-0.5 leading-none">₹{formatAmount(branchWalletBalance || 0)}</span>
              </div>
            </div>
          )}

          <Link to="/profile" className="flex items-center gap-4 group hover:opacity-90 transition-all">
            <div className="hidden lg:block text-right">
              <div className="text-xs font-black text-white uppercase leading-none mb-1 drop-shadow-md group-hover:text-emerald-200">{user?.name}</div>
              <div className="text-[8px] font-extrabold text-emerald-300 uppercase tracking-widest leading-none">
                BRANCH MANAGER
              </div>
            </div>
            <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-white font-bold overflow-hidden shadow-xl ring-2 ring-emerald-500/30 group-hover:ring-emerald-400/50 group-hover:scale-105 transition-all">
              {user?.photo_url ? (
                <img src={user.photo_url} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-xl font-black">{user?.name?.charAt(0).toUpperCase()}</span>
              )}
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
