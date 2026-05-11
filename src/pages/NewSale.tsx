import React, { useState, useEffect } from 'react';
import { voiceFeedback } from '../lib/voice';
import { ArrowLeft, ShoppingCart, Save, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../lib/api';

export default function NewSale() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    sale_date: new Date().toISOString().split('T')[0],
    member_id: '',
    product_id: '',
    quantity: '1',
    total_amount: '',
    payment_method: 'Cash'
  });

  useEffect(() => {
    fetchProducts();
    fetchMembers();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await fetchWithAuth('/products');
      setProducts(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMembers = async () => {
    try {
      const data = await fetchWithAuth('/members');
      setMembers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id.toString() === productId);
    if (product) {
      const qty = parseInt(formData.quantity) || 1;
      setFormData(prev => ({
        ...prev,
        product_id: productId,
        total_amount: (product.price * qty).toFixed(2)
      }));
    } else {
       setFormData(prev => ({
        ...prev,
        product_id: productId,
        total_amount: ''
      }));
    }
  };

  const handleQuantityChange = (qtyStr: string) => {
    const qty = parseInt(qtyStr) || 1;
    const product = products.find(p => p.id.toString() === formData.product_id);
    
    setFormData(prev => ({
      ...prev,
      quantity: qtyStr,
      total_amount: product ? (product.price * qty).toFixed(2) : prev.total_amount
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Validate stock
    const product = products.find(p => p.id.toString() === formData.product_id);
    const qty = parseInt(formData.quantity) || 1;
    if (product && qty > product.stock_quantity) {
      voiceFeedback.error();

      alert(`Not enough stock! Only ${product.stock_quantity} available.`);
      setLoading(false);
      return;
    }
    
    try {
      await fetchWithAuth('/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          member_id: formData.member_id ? formData.member_id : null
        })
      });
      
      voiceFeedback.success();

      
      navigate('/sales');
    } catch (err: any) {
      voiceFeedback.error();

      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-10 pt-4">
      <div className="flex items-center justify-between mb-6 px-4">
        <div className="flex items-center gap-3 text-fuchsia-600">
          <button onClick={() => navigate('/sales')} className="p-2 bg-fuchsia-50 text-fuchsia-600 rounded-full hover:bg-fuchsia-100 transition shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-full bg-fuchsia-100 flex items-center justify-center shadow-sm">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight">Record Sale</h1>
        </div>
      </div>

      <div className="bg-white sm:rounded-[20px] shadow-lg border-y sm:border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-fuchsia-600 to-fuchsia-800 px-6 py-4">
          <h2 className="text-white font-bold tracking-wide uppercase flex items-center gap-2 text-sm sm:text-base">
            <ShoppingCart className="w-5 h-5"/> Sale Information
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 md:mb-2">Sale Date *</label>
              <input required type="date" value={formData.sale_date} onChange={e => setFormData({...formData, sale_date: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-[12px] text-slate-700 bg-white focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500" />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 md:mb-2">Member (Optional)</label>
              <select value={formData.member_id} onChange={e => setFormData({...formData, member_id: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-[12px] font-bold text-slate-700 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 bg-white">
                <option value="">-- Walk-in Customer --</option>
                {members.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.full_name} ({m.member_code})</option>
                ))}
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 md:mb-2">Product *</label>
              <select required value={formData.product_id} onChange={e => handleProductChange(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-[12px] font-bold text-slate-700 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 bg-white">
                <option value="">-- Select Product --</option>
                {products.map((p: any) => (
                  <option key={p.id} value={p.id} disabled={p.stock_quantity <= 0}>
                    {p.product_code} - {p.product_name} (Stock: {p.stock_quantity}) - ₹{p.price}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 md:mb-2">Quantity *</label>
              <input required type="number" min="1" value={formData.quantity} onChange={e => handleQuantityChange(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-[12px] text-slate-700 bg-white focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 font-bold text-lg" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 md:mb-2">Payment Method *</label>
              <select required value={formData.payment_method} onChange={e => setFormData({...formData, payment_method: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-[12px] font-bold text-slate-700 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 bg-white">
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Card">Card</option>
              </select>
            </div>
            
            <div className="md:col-span-2 bg-slate-50 p-6 rounded-2xl border border-slate-200 mt-2">
              <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2 text-center border-b border-slate-200 pb-2">Total Amount</label>
              <input required type="number" step="0.01" value={formData.total_amount} onChange={e => setFormData({...formData, total_amount: e.target.value})} className="w-full text-center bg-transparent text-4xl font-black text-slate-800 focus:outline-none" placeholder="0.00" />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/sales')}
              className="px-6 py-3 border border-slate-300 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50 transition uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-fuchsia-600 text-white font-bold rounded-xl text-sm flex items-center gap-2 hover:bg-fuchsia-700 transition shadow-lg shadow-fuchsia-200 uppercase tracking-wider disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Complete Sale
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
