import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  UserPlus, QrCode, MapPin, University, Camera, 
  Info, CheckCircle, AlertCircle, Loader2, Save
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fetchWithAuth } from '../lib/api';
import { voiceFeedback } from '../lib/voice';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import ImageUpload from '../components/ImageUpload';
import SignaturePad from '../components/SignaturePad';
import AadharScanner from '../components/AadharScanner';
import { differenceInYears } from 'date-fns';
import confetti from 'canvas-confetti';

const memberSchema = z.object({
  aadhar_no: z.string().min(12, 'Aadhar must be at least 12 digits'),
  full_name: z.string().min(1, 'Full name required'),
  guardian_name: z.string().min(1, 'Guardian name required'),
  guardian_type: z.string().min(1, 'Guardian type required'),
  marital_status: z.string().min(1, 'Marital status required'),
  gender: z.string().min(1, 'Gender required'),
  dob: z.string().min(1, 'DOB required'),
  age: z.coerce.number().optional().nullable(),
  religion: z.string().optional().default('Islam'),
  category: z.string().optional().default('General'),
  education: z.string().optional().default('Secondary'),
  occupation: z.string().optional().default('Housewife'),
  monthly_income: z.coerce.number().optional().nullable().default(0),
  family_members: z.coerce.number().optional().nullable().default(1),
  earning_members: z.coerce.number().optional().nullable().default(1),
  house_type: z.string().optional().default('Owned'),
  residence_years: z.coerce.number().optional().nullable().default(1),
  mobile_no: z.string().min(10, 'Mobile must be at least 10 digits'),
  alt_mobile_no: z.string().optional().nullable(),
  pin_code: z.string().min(6, 'Pin code must be at least 6 digits'),
  state: z.string().min(1, 'State required'),
  district: z.string().min(1, 'District required'),
  post_office: z.string().min(1, 'PO required'),
  police_station: z.string().optional().nullable(),
  village: z.string().min(1, 'Village required'),
  voter_id: z.string().optional().nullable(),
  pan_no: z.string().optional().nullable(),
  group_id: z.coerce.string().optional().nullable(),
  mem_bank_ifsc: z.string().optional().nullable(),
  mem_bank_name: z.string().optional().nullable(),
  mem_bank_ac: z.string().optional().nullable(),
  nominee_name: z.string().optional().nullable(),
  nominee_relation: z.string().optional().nullable(),
  nominee_aadhar: z.string().optional().nullable(),
  nominee_dob: z.string().optional().nullable(),
  nominee_age: z.coerce.number().optional().nullable(),
});

type MemberFormValues = z.infer<typeof memberSchema>;

export default function CreateMember() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);
  const [showScanner, setShowScanner] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [poList, setPoList] = useState<string[]>([]);
  const [images, setImages] = useState<Record<string, string | null>>({
    profile: null,
    house: null,
    aadhar_front: null,
    aadhar_back: null,
    voter_front: null,
    voter_back: null,
    signature: null
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<any>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      religion: 'Islam',
      category: 'General',
      education: 'Secondary',
      occupation: 'Housewife',
      guardian_type: 'Husband',
      marital_status: 'Married',
      gender: 'Female',
      house_type: 'Owned',
      state: 'West Bengal'
    }
  });

  const dob = watch('dob');
  const nomineeDob = watch('nominee_dob');
  const pinCode = watch('pin_code');
  const ifscCode = watch('mem_bank_ifsc');

  useEffect(() => {
    if (dob && dob !== '0000-00-00') {
      const date = new Date(dob);
      if (!isNaN(date.getTime())) {
        const ageValue = differenceInYears(new Date(), date);
        setValue('age', isNaN(ageValue) ? 0 : ageValue);
      } else {
        setValue('age', 0);
      }
    }
  }, [dob, setValue]);

  useEffect(() => {
    if (nomineeDob && nomineeDob !== '0000-00-00') {
      const date = new Date(nomineeDob);
      if (!isNaN(date.getTime())) {
        const ageValue = differenceInYears(new Date(), date);
        setValue('nominee_age', isNaN(ageValue) ? 0 : ageValue);
      } else {
        setValue('nominee_age', 0);
      }
    }
  }, [nomineeDob, setValue]);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const data = await fetchWithAuth('/groups');
        setGroups(data);
      } catch (err: any) {
        console.error('Failed to fetch groups', err);
      }
    };
    fetchLocations();
  }, []);

  useEffect(() => {
    if (pinCode?.length === 6) {
      fetch(`https://api.postalpincode.in/pincode/${pinCode}`)
        .then(res => res.json())
        .then(data => {
          if (data[0].Status === 'Success') {
            const pos = data[0].PostOffice;
            setValue('state', pos[0].State);
            setValue('district', pos[0].District);
            setPoList(pos.map((p: any) => p.Name));
          }
        });
    }
  }, [pinCode, setValue]);

  useEffect(() => {
    if (ifscCode?.length === 11) {
      fetch(`/api/ifsc/${ifscCode}`)
        .then(res => res.json())
        .then(data => {
          setValue('mem_bank_name', `${data.BANK}, ${data.BRANCH}`);
        })
        .catch(() => {});
    }
  }, [ifscCode, setValue]);

  useEffect(() => {
    if (id) {
      const fetchMember = async () => {
        try {
          const data = await fetchWithAuth(`/members/${id}`);
          // Ensure group_id is a string for the form
          if (data && data.group_id !== null && data.group_id !== undefined) {
            data.group_id = String(data.group_id);
          }
          // Fix dates for HTML date input
          if (data && data.dob) {
            if (data.dob.startsWith('0000-00-00')) {
              data.dob = '';
            } else {
              data.dob = data.dob.split('T')[0];
            }
          }
          if (data && data.nominee_dob) {
            if (data.nominee_dob.startsWith('0000-00-00')) {
              data.nominee_dob = '';
            } else {
              data.nominee_dob = data.nominee_dob.split('T')[0];
            }
          }
          if (data) {
            reset(data);
            setImages({
              profile: data.profile_image || null,
              house: data.house_image || null,
              aadhar_front: data.aadhar_image_front || null,
              aadhar_back: data.aadhar_image_back || null,
              voter_front: data.voter_image_front || null,
              voter_back: data.voter_image_back || null,
              signature: data.customer_signature || null
            });
          }
        } catch (err: any) {
          console.error('Failed to fetch member details');
        }
        setInitialLoading(false);
      };
      fetchMember();
    }
  }, [id, reset]);

  const handleScan = (data: any) => {
    if (data.aadhar_no) setValue('aadhar_no', data.aadhar_no);
    if (data.full_name) setValue('full_name', data.full_name);
    if (data.guardian_name) setValue('guardian_name', data.guardian_name);
    if (data.gender) setValue('gender', data.gender);
    if (data.dob) setValue('dob', data.dob);
    if (data.pin_code) setValue('pin_code', data.pin_code);
    if (data.district) setValue('district', data.district);
    if (data.state) setValue('state', data.state);
    if (data.village) setValue('village', data.village);
    if (data.post_office) setValue('post_office', data.post_office);
    setShowScanner(false);
  };

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        profile_image: images.profile,
        house_image: images.house,
        aadhar_image_front: images.aadhar_front,
        aadhar_image_back: images.aadhar_back,
        voter_image_front: images.voter_front,
        voter_image_back: images.voter_back,
        customer_signature: images.signature,
        status: 'Active'
      };

      const responseData = await fetchWithAuth(id ? `/members/${id}` : '/members', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4f46e5', '#10b981', '#f59e0b']
      });

      voiceFeedback.success();

      navigate('/members');
    } catch (error: any) {
      voiceFeedback.error();
      const errorMsg = error?.message || 'Unknown error occurred during save';
      console.error('Save error message:', errorMsg);
      alert('Error saving member: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const onValidationError = (errors: any) => {
    const findError = (errObj: any): { field: string, message: string } | null => {
      for (const key in errObj) {
        const error = errObj[key];
        if (error.message) {
          return { field: key, message: error.message };
        }
        if (typeof error === 'object' && error !== null) {
          const nested = findError(error);
          if (nested) return nested;
        }
      }
      return null;
    };

    const firstError = findError(errors);
    if (firstError) {
      // Beautify field name: aadhar_no -> Aadhar No
      const fieldName = firstError.field
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      alert(`Correction needed in [${fieldName}]: ${firstError.message}`);
    } else {
      alert('Correction needed: Please check all required fields.');
    }
  };

  if (initialLoading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
    </div>
  );

  return (
    <div className="max-w-full lg:max-w-5xl mx-auto space-y-4 sm:space-y-8 pb-20">
      <div className="flex items-center justify-between px-4 sm:px-0 mt-4 sm:mt-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">
              {id ? 'Update Profile' : 'New Member Registration'}
            </h1>
            <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">Beneficiary Onboarding Portal</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit, onValidationError)} className="space-y-4 sm:space-y-6">
        
        {/* Section 1: Basic Details */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white sm:rounded-[24px] shadow-sm border-y sm:border border-slate-200 overflow-hidden"
        >
          <div className="bg-gradient-to-r from-sky-50 to-blue-50 border-b border-sky-100 px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-lg shadow-sm border border-sky-100">
                <Info className="w-5 h-5 text-sky-600" />
              </div>
              <h2 className="text-[11px] sm:text-[13px] font-black text-slate-800 tracking-widest uppercase">1. Identification & Personal</h2>
            </div>
            {!id && (
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="bg-white text-sky-600 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest border border-sky-100 hover:bg-sky-100 transition-all flex items-center gap-2 shadow-sm"
              >
                <QrCode className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Scan Aadhar</span>
                <span className="sm:hidden">Scan</span>
              </button>
            )}
          </div>

          <div className="p-4 sm:p-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <div className="col-span-1">
              <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 sm:mb-1.5 ml-1 sm:ml-0.5">Aadhar Number</label>
              <input 
                {...register('aadhar_no')}
                className="w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-[13px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-300"
                placeholder="0000 0000 0000"
              />
              {errors.aadhar_no?.message && (
                <p className="mt-1 text-[10px] font-bold text-rose-500 uppercase ml-1 italic">
                  {String(errors.aadhar_no?.message)}
                </p>
              )}
            </div>
            <div className="col-span-1 lg:col-span-2">
              <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 sm:mb-1.5 ml-1 sm:ml-0.5">Full Identity Name</label>
              <input 
                {...register('full_name')}
                className="w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-[13px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-uppercase"
                placeholder="AS PER GOVT RECORD"
              />
              {errors.full_name?.message && (
                <p className="mt-1 text-[10px] font-bold text-rose-500 uppercase ml-1 italic">
                  {String(errors.full_name?.message)}
                </p>
              )}
            </div>
            <div className="col-span-1">
              <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 sm:mb-1.5 ml-1 sm:ml-0.5">Mobile Contact</label>
              <input 
                {...register('mobile_no')}
                className="w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-[13px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                placeholder="+91 00000 00000"
              />
              {errors.mobile_no?.message && (
                <p className="mt-1 text-[10px] font-bold text-rose-500 uppercase ml-1 italic">
                  {String(errors.mobile_no?.message)}
                </p>
              )}
            </div>

            <div className="col-span-1">
              <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 sm:mb-1.5 ml-1 sm:ml-0.5">Guardian Type</label>
              <select 
                {...register('guardian_type')}
                className="w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-[13px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              >
                <option value="Husband">HUSBAND</option>
                <option value="Wife">WIFE</option>
                <option value="Father">FATHER</option>
                <option value="Mother">MOTHER</option>
                <option value="Son">SON</option>
                <option value="Daughter">DAUGHTER</option>
                <option value="Brother">BROTHER</option>
                <option value="Other">OTHER</option>
              </select>
            </div>
            <div className="col-span-1 lg:col-span-2">
              <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 sm:mb-1.5 ml-1 sm:ml-0.5">Guardian Name</label>
              <input 
                {...register('guardian_name')}
                className="w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-[13px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 sm:mb-1.5 ml-1 sm:ml-0.5">Gender Identity</label>
              <select 
                {...register('gender')}
                className="w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-[13px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              >
                <option value="Female">FEMALE</option>
                <option value="Male">MALE</option>
                <option value="Other">OTHER</option>
              </select>
            </div>

            <div className="col-span-1">
              <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 sm:mb-1.5 ml-1 sm:ml-0.5">Date of Birth</label>
              <input 
                type="date"
                {...register('dob')}
                className="w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-[13px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 sm:mb-1.5 ml-1 sm:ml-0.5">Member Age</label>
              <input 
                readOnly
                {...register('age', { valueAsNumber: true })}
                className="w-full bg-slate-100/50 text-slate-500 cursor-not-allowed border border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-[13px] font-medium outline-none"
                placeholder="AUTO CALCULATED"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 sm:mb-1.5 ml-1 sm:ml-0.5">Marital Status</label>
              <select 
                {...register('marital_status')}
                className="w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-[13px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              >
                <option value="Married">MARRIED</option>
                <option value="Unmarried">UNMARRIED</option>
                <option value="Widow">WIDOW</option>
                <option value="Divorced">DIVORCED</option>
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 sm:mb-1.5 ml-1 sm:ml-0.5">Category</label>
              <select 
                {...register('category')}
                className="w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-[13px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              >
                <option value="General">GENERAL</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
                <option value="OBC-A">OBC-A</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Section 2: Address & JLG */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white sm:rounded-[24px] shadow-sm border-y sm:border border-slate-200 overflow-hidden"
        >
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 px-4 sm:px-6 py-4 flex items-center gap-3">
            <div className="bg-white p-2 rounded-lg shadow-sm border border-emerald-100">
              <MapPin className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="text-[11px] sm:text-[13px] font-black text-slate-800 tracking-widest uppercase">2. Residential & Group Logistics</h2>
          </div>

          <div className="p-4 sm:p-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <div className="col-span-1">
              <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 sm:mb-1.5 ml-1 sm:ml-0.5">Pin Code Retrieval</label>
              <input 
                {...register('pin_code')}
                className="w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-[13px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                placeholder="6 DIGIT PIN"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 sm:mb-1.5 ml-1 sm:ml-0.5">State</label>
              <input 
                {...register('state')}
                className="w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-[13px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 sm:mb-1.5 ml-1 sm:ml-0.5">District</label>
              <input 
                {...register('district')}
                className="w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-[13px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 sm:mb-1.5 ml-1 sm:ml-0.5">Post Office</label>
              <select 
                {...register('post_office')}
                className="w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-[13px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-uppercase"
              >
                <option value="">-- SELECT PO --</option>
                {poList.map(po => <option key={po} value={po}>{po.toUpperCase()}</option>)}
              </select>
            </div>

            <div className="col-span-1">
              <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 sm:mb-1.5 ml-1 sm:ml-0.5">Police Station</label>
              <input 
                {...register('police_station')}
                className="w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-[13px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-uppercase"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 sm:mb-1.5 ml-1 sm:ml-0.5">Village / Para</label>
              <input 
                {...register('village')}
                className="w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-[13px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-uppercase"
              />
            </div>
            <div className="col-span-1 lg:col-span-2">
              <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 sm:mb-1.5 ml-1 sm:ml-0.5">Operation Group (JLG/SHG)</label>
              <select 
                {...register('group_id')}
                disabled={!!id && ['fo'].includes(user?.role || '')}
                className={cn(
                  "w-full border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-[13px] font-bold outline-none shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all",
                  !!id && ["fo"].includes(user?.role || "") ? "bg-slate-100/50 text-slate-500 cursor-not-allowed border-slate-200" : "bg-slate-50 focus:bg-white text-slate-800"
                )}
              >
                <option value="">-- SELECT GROUP --</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.group_name} ({g.group_code})</option>)}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Section 3: Bank & Nominee */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white sm:rounded-[24px] shadow-sm border-y sm:border border-slate-200 overflow-hidden"
        >
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 px-4 sm:px-6 py-4 flex items-center gap-3">
            <div className="bg-white p-2 rounded-lg shadow-sm border border-amber-100">
              <University className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-[11px] sm:text-[13px] font-black text-slate-800 tracking-widest uppercase">3. Banking & Inheritance</h2>
          </div>

          <div className="p-4 sm:p-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <div className="col-span-1">
              <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 sm:mb-1.5 ml-1 sm:ml-0.5">IFSC Retrieval</label>
              <input 
                {...register('mem_bank_ifsc')}
                className="w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-[13px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                placeholder="BANK IFSC"
              />
            </div>
            <div className="col-span-1 lg:col-span-2">
              <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 sm:mb-1.5 ml-1 sm:ml-0.5">Bank Branch Identification</label>
              <input 
                readOnly
                {...register('mem_bank_name')}
                className="w-full bg-slate-100/50 text-slate-500 cursor-not-allowed border border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-[13px] font-medium outline-none"
                placeholder="AUTO IDENTIFIED"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 sm:mb-1.5 ml-1 sm:ml-0.5">Account Number</label>
              <input 
                {...register('mem_bank_ac')}
                className="w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-[13px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                placeholder="SAVINGS A/C"
              />
            </div>

            <div className="col-span-1 lg:col-span-2">
              <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 sm:mb-1.5 ml-1 sm:ml-0.5">Nominee Full Name</label>
              <input 
                {...register('nominee_name')}
                className="w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-[13px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-uppercase"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 sm:mb-1.5 ml-1 sm:ml-0.5">Inheritance Relation</label>
              <select 
                {...register('nominee_relation')}
                className="w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-[13px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              >
                <option value="Husband">HUSBAND</option>
                <option value="Wife">WIFE</option>
                <option value="Son">SON</option>
                <option value="Daughter">DAUGHTER</option>
                <option value="Father">FATHER</option>
                <option value="Mother">MOTHER</option>
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 sm:mb-1.5 ml-1 sm:ml-0.5">Nominee DOB</label>
              <input 
                type="date"
                {...register('nominee_dob')}
                className="w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-[13px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>
        </motion.div>

        {/* Section 4: Documentation */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white sm:rounded-[24px] shadow-sm border-y sm:border border-slate-200 overflow-hidden"
        >
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 px-4 sm:px-6 py-4 flex items-center gap-3">
            <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-200">
              <Camera className="w-5 h-5 text-slate-600" />
            </div>
            <h2 className="text-[11px] sm:text-[13px] font-black text-slate-800 tracking-widest uppercase">4. Documentation & Verification Assets</h2>
          </div>

          <div className="p-4 sm:p-6 grid grid-cols-2 md:grid-cols-6 gap-3 sm:gap-6">
            <ImageUpload 
              label="Profile" 
              icon={UserPlus} 
              color="text-indigo-600" 
              preview={images.profile}
              onImageCaptured={(url) => setImages(prev => ({ ...prev, profile: url }))} 
            />
            <ImageUpload 
              label="House" 
              icon={MapPin} 
              color="text-emerald-600" 
              preview={images.house}
              onImageCaptured={(url) => setImages(prev => ({ ...prev, house: url }))} 
            />
            <ImageUpload 
              label="Aadhar F" 
              icon={QrCode} 
              color="text-sky-600" 
              preview={images.aadhar_front}
              onImageCaptured={(url) => setImages(prev => ({ ...prev, aadhar_front: url }))} 
            />
            <ImageUpload 
              label="Aadhar B" 
              icon={QrCode} 
              color="text-sky-600" 
              preview={images.aadhar_back}
              onImageCaptured={(url) => setImages(prev => ({ ...prev, aadhar_back: url }))} 
            />
            <ImageUpload 
              label="Voter F" 
              icon={Info} 
              color="text-amber-600" 
              preview={images.voter_front}
              onImageCaptured={(url) => setImages(prev => ({ ...prev, voter_front: url }))} 
            />
            <ImageUpload 
              label="Voter B" 
              icon={Info} 
              color="text-amber-600" 
              preview={images.voter_back}
              onImageCaptured={(url) => setImages(prev => ({ ...prev, voter_back: url }))} 
            />
          </div>

          <div className="mt-10 border-t border-slate-200 pt-10">
            <div className="flex flex-col items-center">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Authentication Signature</label>
              <div className="w-full max-w-2xl">
                <SignaturePad 
                  savedSignature={images.signature}
                  onSave={(url) => setImages(prev => ({ ...prev, signature: url }))} 
                  onClear={() => setImages(prev => ({ ...prev, signature: null }))}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Floating/Sticky Action Bar */}
        <div className="sticky bottom-4 z-40 bg-white/80 backdrop-blur-3xl border border-slate-100 p-4 rounded-[30px] shadow-2xl flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate('/members')}
            className="px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all"
          >
            Abort Registration
          </button>
          
          <button
            type="submit"
            disabled={loading}
            className="flex-1 sm:max-w-xs bg-indigo-600 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                {id ? 'Commit Changes' : 'Confirm & Save'}
              </>
            )}
          </button>
        </div>
      </form>

      <AnimatePresence>
        {showScanner && (
          <AadharScanner 
            onScan={handleScan} 
            onClose={() => setShowScanner(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
