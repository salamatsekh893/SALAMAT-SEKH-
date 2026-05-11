import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchWithAuth } from '../lib/api';
import { voiceFeedback } from '../lib/voice';
import { ArrowLeft, Building2, MapPin, Hash, Save, AlertCircle, Phone, Mail, User, Calendar, Clock, Navigation, Search, Globe } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

const PINCODE_API_KEY = '8f901ff3-7f5f-4fd4-97c4-af65bda70cac';

export default function CreateBranch() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [showLocations, setShowLocations] = useState(false);
  const [showDistricts, setShowDistricts] = useState(false);
  const WEST_BENGAL_DISTRICTS = [
    "Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur",
    "Darjeeling", "Hooghly", "Howrah", "Jalpaiguri", "Jhargram",
    "Kalimpong", "Kolkata", "Malda", "Murshidabad", "Nadia",
    "North 24 Parganas", "Paschim Bardhaman", "Paschim Medinipur",
    "Purba Bardhaman", "Purba Medinipur", "Purulia", "South 24 Parganas", "Uttar Dinajpur"
  ];
  const [companies, setCompanies] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    branch_name: '',
    area: '',
    district: '',
    state: '',
    address: '',
    phone: '',
    email: '',
    pincode: '',
    manager_name: '',
    manager_phone: '',
    opening_date: '',
    status: 'active',
    company_id: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const companiesData = await fetchWithAuth('/companies');
        setCompanies(companiesData);
        
        if (companiesData.length === 1) {
          setFormData(prev => ({ ...prev, company_id: companiesData[0].id.toString() }));
        }

        if (isEdit) {
          const branches = await fetchWithAuth('/branches');
          const branchToEdit = branches.find((b: any) => b.id.toString() === id);
          if (branchToEdit) {
              setFormData({
                branch_name: branchToEdit.branch_name || '',
                area: branchToEdit.area || '',
                district: branchToEdit.district || '',
                state: branchToEdit.state || '',
                address: branchToEdit.address || '',
                phone: branchToEdit.phone || '',
                email: branchToEdit.email || '',
                pincode: branchToEdit.pincode || '',
                manager_name: branchToEdit.manager_name || '',
                manager_phone: branchToEdit.manager_phone || '',
                opening_date: branchToEdit.opening_date ? new Date(branchToEdit.opening_date).toISOString().split('T')[0] : '',
                status: branchToEdit.status || 'active',
                company_id: branchToEdit.company_id?.toString() || ''
              });
          } else {
            navigate('/branches');
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [id, isEdit, navigate]);

  const handlePincodeLookup = async () => {
    if (!formData.pincode || formData.pincode.length !== 6) {
      voiceFeedback.error();
      alert("Please enter a valid 6-digit Pincode.");
      return;
    }
    
    setLookupLoading(true);
    setLocations([]);
    setShowLocations(false);
    
    try {
      console.log('Starting pincode lookup for:', formData.pincode);
      
      let data: any = null;
      let mappedLocations: any[] = [];
      
      try {
        // Primary search using provided API Key
        const response = await fetch(`https://api.apitier.com/v1/pincode?pincode=${formData.pincode}`, {
          headers: { 'x-api-key': PINCODE_API_KEY }
        });
        
        const respText = await response.text();
        
        if (respText && respText.trim().startsWith('{') || respText.trim().startsWith('[')) {
          data = JSON.parse(respText);
        }

        // Flexible mapping for various API response shapes
        if (data && (data.success || data.Status === 'Success') && (data.data || data.PostOffice)) {
          const sourceData = data.data || data.PostOffice;
          const sourceArray = Array.isArray(sourceData) ? sourceData : [sourceData];
          mappedLocations = sourceArray.map((loc: any) => ({
            post_office_name: loc.post_office_name || loc.office_name || loc.place_name || loc.Name || loc.office || loc.village,
            district: loc.district || loc.District || loc.city || loc.division,
            state: loc.state || loc.State
          })).filter((loc: any) => loc.post_office_name);
        }
      } catch (e) {
        console.warn('Primary API fetch failed', e);
      }

      // Fallback: Use direct postalpincode.in as secondary
      if (mappedLocations.length === 0) {
        console.log('Trying fallback API...');
        const fallRes = await fetch(`https://api.postalpincode.in/pincode/${formData.pincode}`);
        const fallText = await fallRes.text();
        
        try {
          const fallData = JSON.parse(fallText);
          if (fallData && fallData[0] && fallData[0].Status === 'Success') {
            const poList = fallData[0].PostOffice || [];
            mappedLocations = poList.map((po: any) => ({
              post_office_name: po.Name,
              district: po.District,
              state: po.State
            }));
          }
        } catch (e) {
          console.error('Fallback API failed', e);
        }
      }

      if (mappedLocations.length > 0) {
        console.log('Locations found:', mappedLocations.length);
        setLocations(mappedLocations);
        setShowLocations(true);
        const first = mappedLocations[0];
        setFormData(prev => ({
          ...prev,
          area: first.post_office_name,
          district: first.district || prev.district,
          state: first.state || prev.state
        }));
        voiceFeedback.success();
      } else {
        console.warn('No locations found in either API');
        voiceFeedback.error();
        alert("No area found for this PIN code. Please check the PIN code or enter the area manually.");
      }
    } catch (err) {
      console.error('Pincode lookup critical error:', err);
      voiceFeedback.error();
      alert("There was a problem fetching the data. Please check your internet connection or enter the area manually.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleLocationSelect = (location: any) => {
    setFormData(prev => ({
      ...prev,
      area: location.post_office_name,
      district: location.district,
      state: location.state
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Stripping any unwanted fields and ensuring payload is clean
      await fetchWithAuth(isEdit ? `/branches/${id}` : '/branches', {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(formData)
      });
      voiceFeedback.branchCreated();
      navigate('/branches');
    } catch (err: any) {
      alert(err.message);
      voiceFeedback.error();
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
          <Building2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-indigo-600" />
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Initializing System...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      <div className="w-full px-4 sm:px-6 lg:px-10 py-8">
        {/* Simplified Navigation */}
        <div className="mb-8 flex items-center justify-between">
          <button 
            type="button"
            onClick={() => navigate('/branches')}
            className="group flex items-center gap-2 text-slate-900 hover:text-indigo-600 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center group-hover:bg-indigo-50 group-hover:border-indigo-200 transition-all">
              <ArrowLeft className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest">Back to Network</span>
          </button>
          
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
             <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">System Online</span>
          </div>
        </div>

        {/* Clean Header */}
        <div className="mb-10 border-b-2 border-indigo-100 pb-5">
           <h1 className="text-2xl font-black text-indigo-900 tracking-tighter uppercase flex items-center gap-3">
             <span className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><Globe className="w-5 h-5" /></span>
             <span>{isEdit ? 'UPDATE' : 'CREATE'} <span className="text-indigo-400">SITE</span></span>
           </h1>
           <p className="text-indigo-600/60 font-bold text-[10px] mt-1 uppercase tracking-[0.2em]">Configure physical operational node</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
            <div className="lg:col-span-8 space-y-6 md:space-y-8">
              {/* Identity Card */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white -mx-4 sm:mx-0 rounded-none sm:rounded-[28px] p-6 sm:p-8 shadow-xl border-y sm:border-2 border-slate-100"
              >
                <div className="flex items-center gap-4 mb-6 pb-4 border-b-2 border-slate-50">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-indigo-700 tracking-tight uppercase">Core Identity</h2>
                    <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">Legal Branch Data</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-indigo-600/70 uppercase tracking-widest ml-1">Branch Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-base font-black text-black focus:border-indigo-600 focus:bg-white outline-none transition-all placeholder:text-slate-300"
                      placeholder="HUB NAME"
                      value={formData.branch_name}
                      onChange={e => setFormData({...formData, branch_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-indigo-600/70 uppercase tracking-widest ml-1">Inauguration</label>
                    <input 
                      type="date"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-base font-black text-black focus:border-indigo-600 focus:bg-white outline-none transition-all"
                      value={formData.opening_date}
                      onChange={e => setFormData({...formData, opening_date: e.target.value})}
                    />
                  </div>
                </div>
              </motion.div>

              {/* Geo Card */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-white -mx-4 sm:mx-0 rounded-none sm:rounded-[28px] p-6 sm:p-8 shadow-xl border-y sm:border-2 border-slate-100"
              >
                <div className="flex items-center gap-4 mb-6 pb-4 border-b-2 border-slate-50">
                  <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-emerald-700 tracking-tight uppercase">Geographic Hub</h2>
                    <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">Operational Boundaries</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-emerald-600/70 uppercase tracking-widest ml-1">ZIP Lookup</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                       <input 
                         type="text" 
                         maxLength={6}
                         placeholder="PINCODE"
                         className="flex-1 w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-base font-black text-black focus:border-emerald-600 outline-none placeholder:text-slate-300"
                         value={formData.pincode}
                         onChange={e => {
                           setFormData({...formData, pincode: e.target.value});
                           if (locations.length > 0) setLocations([]);
                           if (showLocations) setShowLocations(false);
                         }}
                       />
                       <button 
                         type="button" 
                         disabled={lookupLoading}
                         onClick={handlePincodeLookup} 
                         className="w-full sm:w-auto min-h-[56px] bg-emerald-600 text-white px-8 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 whitespace-nowrap flex items-center justify-center gap-2"
                       >
                         <Search className="w-4 h-4" />
                         {lookupLoading ? '...' : 'Verify'}
                       </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-emerald-600/70 uppercase tracking-widest ml-1">Physical Address</label>
                    <input 
                      type="text" 
                      placeholder="STREET ADDRESS..." 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-base font-black text-black focus:border-emerald-600 outline-none transition-all placeholder:text-slate-300" 
                      value={formData.address} 
                      onChange={e => setFormData({...formData, address: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Area Selection Column */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[9px] font-black text-emerald-600/70 uppercase tracking-widest">Village / Area</label>
                      {locations.length > 0 && (
                        <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                          {locations.length} FOUND
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="SEARCH OR TYPE AREA..."
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3.5 px-4 pr-10 text-[13px] font-black text-black focus:border-emerald-600 outline-none transition-all cursor-text hover:bg-emerald-50/10" 
                        value={formData.area} 
                        onChange={e => {
                          setFormData({...formData, area: e.target.value});
                          if (locations.length > 0) setShowLocations(true);
                        }}
                        onFocus={() => {
                          if (locations.length > 0) setShowLocations(true);
                        }}
                      />
                      <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 pointer-events-none" />
                      
                      {showLocations && locations.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-3 bg-white border-2 border-emerald-100 rounded-2xl shadow-[0_25px_60px_rgba(16,185,129,0.2)] z-[100] max-h-72 overflow-y-auto p-2 space-y-1 animate-in fade-in zoom-in-95 duration-300 origin-top">
                          <div className="flex items-center justify-between px-3 py-2 border-b border-emerald-50 mb-1">
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em]">Select Village</span>
                            <button type="button" onClick={(e) => { e.stopPropagation(); setShowLocations(false); }} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-black transition-all">✕</button>
                          </div>
                          {locations.map((loc, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLocationSelect(loc);
                                setShowLocations(false);
                              }}
                              className={cn(
                                "w-full text-left px-4 py-3 rounded-xl text-[12px] font-bold transition-all flex items-center justify-between group",
                                formData.area === loc.post_office_name ? "bg-emerald-50 text-emerald-700 border-emerald-100 border" : "hover:bg-slate-50 text-slate-600"
                              )}
                            >
                              <span>{loc.post_office_name}</span>
                              <MapPin className="w-3 h-3 text-emerald-600 opacity-0 group-hover:opacity-100 shrink-0 ml-2" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1 relative">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">District</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        readOnly
                        placeholder="SELECT DISTRICT..."
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3.5 px-4 pr-10 text-[13px] font-black text-black outline-none focus:border-emerald-600 transition-all cursor-pointer hover:bg-emerald-50/20" 
                        value={formData.district} 
                        onClick={() => setShowDistricts(!showDistricts)} 
                      />
                      <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                    
                    {showDistricts && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-emerald-100 rounded-2xl shadow-2xl z-[110] max-h-64 overflow-y-auto p-2 space-y-1 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-3 py-2 border-b border-slate-50 mb-1 flex justify-between items-center">
                          <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">West Bengal Districts</span>
                          <button type="button" onClick={() => setShowDistricts(false)} className="text-slate-400">✕</button>
                        </div>
                        {WEST_BENGAL_DISTRICTS.map((dist) => (
                          <button
                            key={dist}
                            type="button"
                            onClick={() => {
                              setFormData({...formData, district: dist, state: 'West Bengal'});
                              setShowDistricts(false);
                            }}
                            className={cn(
                              "w-full text-left px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all",
                              formData.district === dist ? "bg-emerald-50 text-emerald-700" : "hover:bg-slate-50 text-slate-600"
                            )}
                          >
                            {dist}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">State</label>
                    <input 
                      type="text" 
                      readOnly
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3.5 px-4 text-[13px] font-black text-slate-400 outline-none" 
                      value={formData.state || 'West Bengal'} 
                    />
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="lg:col-span-4 space-y-6 md:space-y-8">
               {/* Controls */}
               <motion.div 
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 className="space-y-6"
               >
                <div className="bg-white -mx-4 sm:mx-0 rounded-none sm:rounded-[28px] p-6 sm:p-8 shadow-xl border-y sm:border-2 border-slate-100">
                    <div className="flex items-center gap-4 mb-6 pb-4 border-b-2 border-slate-50">
                      <User className="h-5 w-5 text-amber-600" />
                      <div>
                        <h3 className="text-sm font-black text-amber-700 uppercase tracking-tight">Management</h3>
                        <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">Contact Protocols</p>
                      </div>
                    </div>
                    <div className="space-y-5">
                      <div>
                        <label className="text-[9px] font-black text-amber-600/70 uppercase tracking-widest ml-1">Manager</label>
                        <input type="text" placeholder="NAME" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-sm font-black text-black focus:border-amber-600 outline-none transition-all placeholder:text-slate-300" value={formData.manager_name} onChange={e => setFormData({...formData, manager_name: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-amber-600/70 uppercase tracking-widest ml-1">Phone</label>
                        <input type="text" placeholder="CONTACT" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-sm font-black text-black focus:border-amber-600 outline-none transition-all placeholder:text-slate-300" value={formData.manager_phone} onChange={e => setFormData({...formData, manager_phone: e.target.value})} />
                      </div>
                    </div>
                 </div>

                 <div className="bg-white -mx-4 sm:mx-0 rounded-none sm:rounded-[24px] p-4 sm:p-2 border-y sm:border-2 border-slate-100 shadow-lg">
                    <div className="flex p-1 bg-slate-100 rounded-[20px]">
                      <button 
                        type="button" 
                        onClick={() => setFormData({...formData, status: 'active'})}
                        className={cn("flex-1 py-4 rounded-[16px] text-[10px] font-black uppercase tracking-[0.2em] transition-all", formData.status === 'active' ? "bg-white text-black shadow-md" : "text-slate-500 hover:text-slate-900")}
                      >
                        Active
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setFormData({...formData, status: 'inactive'})}
                        className={cn("flex-1 py-4 rounded-[16px] text-[10px] font-black uppercase tracking-[0.2em] transition-all", formData.status === 'inactive' ? "bg-red-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900")}
                      >
                        Inactive
                      </button>
                    </div>
                 </div>

                 <div className="bg-indigo-600 -mx-4 sm:mx-0 rounded-none sm:rounded-[32px] p-6 sm:p-8 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group">
                    <div className="relative z-10 space-y-5 text-center">
                       <h3 className="text-base font-black uppercase tracking-[0.2em] border-b-2 border-white/20 pb-3">Final Release</h3>
                       <button 
                         type="submit" 
                         disabled={loading}
                         className="w-full bg-white text-indigo-600 py-5 rounded-2xl font-black text-[12px] uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.05] active:scale-[0.95] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                       >
                         {loading ? <div className="w-5 h-5 border-2 border-indigo-600/30 border-t-indigo-600 animate-spin rounded-full"></div> : <><Save className="h-5 w-5" /> Commit Entry</>}
                       </button>
                    </div>
                 </div>
               </motion.div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
