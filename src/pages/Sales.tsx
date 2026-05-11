import React, { useState, useEffect } from 'react';
import { voiceFeedback } from '../lib/voice';
import { Plus, Search, ShoppingCart, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatAmount } from '../lib/utils';

export default function Sales() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const res = await fetch('/api/sales');
      if (!res.ok) throw new Error('Network response was not ok');
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        setSales(data);
      } catch (err) {
        console.error("Failed to parse JSON:", text.substring(0, 100));
        throw err;
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = sales.filter(s => 
    s.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.member_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-fuchsia-600" />
            Sales History
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Track all product sales</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search sales..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 bg-white shadow-sm w-full md:w-64"
            />
          </div>
          <button
            onClick={() => navigate('/sales/new')}
            className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> New Sale
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-fuchsia-600" />
        </div>
      ) : (
        <div className="bg-white rounded-[20px] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left text-xs font-black text-slate-500 uppercase tracking-wider p-4">Date</th>
                  <th className="text-left text-xs font-black text-slate-500 uppercase tracking-wider p-4">Product</th>
                  <th className="text-left text-xs font-black text-slate-500 uppercase tracking-wider p-4">Member/Customer</th>
                  <th className="text-center text-xs font-black text-slate-500 uppercase tracking-wider p-4">Qty</th>
                  <th className="text-right text-xs font-black text-slate-500 uppercase tracking-wider p-4">Amount</th>
                  <th className="text-left text-xs font-black text-slate-500 uppercase tracking-wider p-4">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      <ShoppingCart className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="font-medium">No sales found</p>
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-sm font-bold text-slate-700">
                        {new Date(s.sale_date).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{s.product_name}</div>
                        <div className="text-xs text-slate-500 font-mono">{s.product_code}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-700">{s.member_name || 'Walk-in Customer'}</div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-fuchsia-100 text-fuchsia-700">
                          {s.quantity}
                        </span>
                      </td>
                      <td className="p-4 text-right font-black text-slate-800">
                        ₹{formatAmount(s.total_amount)}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 uppercase tracking-wider">
                          {s.payment_method || 'CASH'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
