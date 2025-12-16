import React, { useState, useEffect, useMemo } from 'react';
import { Order, Product } from '../types';
import { getOrders, getCatalogue } from '../services/storageService';
import { Calendar, Search, History, X, FileText } from 'lucide-react';

export const Tracking: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [catalogue, setCatalogue] = useState<Product[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterCode, setFilterCode] = useState('');
  
  // State for modal
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

  useEffect(() => {
    setOrders(getOrders());
    setCatalogue(getCatalogue());
    // Default to last 30 days
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  const getProductDesc = (code: string) => {
    // Lookup description case-insensitively
    return catalogue.find(p => p.code.toUpperCase() === code.toUpperCase())?.description || 'Unknown';
  };

  const filteredData = useMemo(() => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime() + 86400000; // Add one day to include end date

    let relevantOrders = orders;
    
    if (startDate && endDate) {
        relevantOrders = orders.filter(o => {
            const oDate = new Date(o.date).getTime();
            return oDate >= start && oDate <= end;
        });
    }

    // Aggregate items
    const itemTotals: Record<string, number> = {};
    
    relevantOrders.forEach(order => {
        order.items.forEach(item => {
            // Filter check (case insensitive)
            if (filterCode && !item.code.toLowerCase().includes(filterCode.toLowerCase()) && !item.description.toLowerCase().includes(filterCode.toLowerCase())) {
                return;
            }
            
            // Normalize key to uppercase to aggregate same items with different case
            const key = item.code.toUpperCase();
            itemTotals[key] = (itemTotals[key] || 0) + item.quantity;
        });
    });

    return Object.entries(itemTotals)
        .map(([code, quantity]) => ({
            code,
            name: getProductDesc(code),
            quantity
        }))
        .sort((a, b) => b.quantity - a.quantity); // Top items first

  }, [orders, startDate, endDate, catalogue, filterCode]);

  const handleViewLastOrder = () => {
    const currentOrders = getOrders(); // Refresh to ensure latest data
    if (currentOrders.length === 0) {
        alert("No order history available.");
        return;
    }
    // Assume the last item in the array is the most recent
    const lastOrder = currentOrders[currentOrders.length - 1];
    setViewingOrder(lastOrder);
  };

  return (
    <div className="w-full mx-auto space-y-6">
      <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-md">
        
        {/* Header with Action Button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Calendar className="text-nhs-blue" />
                Order Tracking
            </h2>
            <button 
                onClick={handleViewLastOrder}
                className="bg-white border-2 border-nhs-blue text-nhs-blue hover:bg-blue-50 px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-sm text-sm md:text-base justify-center"
            >
                <History size={18} />
                View Last Order
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 bg-gray-50 p-4 md:p-6 rounded-2xl border border-gray-200">
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Start Date</label>
                <div className="relative">
                    <input 
                        type="date" 
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full h-12 pl-4 pr-4 border-2 border-gray-300 rounded-xl text-black bg-white focus:border-nhs-blue focus:ring-4 focus:ring-blue-100 outline-none transition-all cursor-pointer text-sm"
                        onClick={(e) => (e.currentTarget as any).showPicker?.()}
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">End Date</label>
                <div className="relative">
                    <input 
                        type="date" 
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="w-full h-12 pl-4 pr-4 border-2 border-gray-300 rounded-xl text-black bg-white focus:border-nhs-blue focus:ring-4 focus:ring-blue-100 outline-none transition-all cursor-pointer text-sm"
                        onClick={(e) => (e.currentTarget as any).showPicker?.()}
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Search History</label>
                <div className="relative">
                    <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Filter..."
                        value={filterCode}
                        onChange={e => setFilterCode(e.target.value)}
                        className="w-full h-12 pl-10 pr-4 border-2 border-gray-300 rounded-xl text-black bg-white focus:border-nhs-blue focus:ring-4 focus:ring-blue-100 outline-none transition-all text-sm"
                    />
                </div>
            </div>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700 border-separate border-spacing-y-2">
                <thead>
                    <tr className="bg-nhs-blue text-white font-semibold uppercase tracking-wider shadow-lg">
                        <th className="p-3 md:p-6 rounded-l-xl md:rounded-l-2xl text-xs md:text-sm whitespace-nowrap">
                            <span className="md:hidden">Code</span>
                            <span className="hidden md:inline">Product Code</span>
                        </th>
                        <th className="p-3 md:p-6 text-xs md:text-sm w-full">Description</th>
                        <th className="p-3 md:p-6 text-right rounded-r-xl md:rounded-r-2xl text-xs md:text-sm whitespace-nowrap">
                            <span className="md:hidden">Qty</span>
                            <span className="hidden md:inline">Total Qty</span>
                        </th>
                    </tr>
                </thead>
                <tbody className="space-y-2">
                    {filteredData.map((row) => (
                        <tr key={row.code} className="bg-gray-50 hover:bg-blue-50 transition-colors group">
                            <td className="p-3 md:p-5 font-bold text-gray-900 rounded-l-xl md:rounded-l-2xl border-l border-y border-gray-100 group-hover:border-blue-200 text-xs md:text-sm whitespace-nowrap">
                                {row.code}
                            </td>
                            <td className="p-3 md:p-5 text-gray-800 border-y border-gray-100 group-hover:border-blue-200 text-xs md:text-sm min-w-[120px]">
                                {row.name}
                            </td>
                            <td className="p-3 md:p-5 text-right font-bold text-nhs-blue text-base md:text-lg rounded-r-xl md:rounded-r-2xl border-r border-y border-gray-100 group-hover:border-blue-200 whitespace-nowrap">
                                {row.quantity}
                            </td>
                        </tr>
                    ))}
                    {filteredData.length === 0 && (
                        <tr>
                            <td colSpan={3} className="p-10 text-center text-gray-500 bg-gray-50 rounded-2xl border border-gray-100">
                                <div className="flex flex-col items-center justify-center gap-2">
                                    <Search size={32} className="opacity-20" />
                                    <span>No orders found for this period.</span>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* Modal for Last Order View */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
                <div className="bg-nhs-blue p-5 flex justify-between items-center text-white sticky top-0 z-10">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <FileText size={20} />
                        Last Order Details
                    </h3>
                    <button onClick={() => setViewingOrder(null)} className="hover:bg-blue-700 p-1 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6 border-b bg-gray-50">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="block text-gray-500 text-xs uppercase font-bold">Date</span>
                            <span className="font-semibold text-gray-900">{new Date(viewingOrder.date).toLocaleDateString()}</span>
                        </div>
                        <div className="text-right">
                            <span className="block text-gray-500 text-xs uppercase font-bold">Time</span>
                            <span className="font-semibold text-gray-900">{new Date(viewingOrder.date).toLocaleTimeString()}</span>
                        </div>
                        <div className="col-span-2">
                             <span className="block text-gray-500 text-xs uppercase font-bold">Order ID</span>
                             <span className="font-mono text-xs text-gray-600 break-all">{viewingOrder.id}</span>
                        </div>
                    </div>
                </div>

                <div className="overflow-y-auto p-0 flex-1">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-100 text-gray-600 uppercase text-xs sticky top-0">
                            <tr>
                                <th className="px-6 py-3">Item</th>
                                <th className="px-6 py-3 text-right">Qty</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {viewingOrder.items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-blue-50">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-nhs-blue text-sm">{item.code}</div>
                                        <div className="text-gray-700 text-sm">{item.description}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-900 text-lg">
                                        {item.quantity}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-5 border-t bg-gray-50 text-right sticky bottom-0 z-10">
                    <button 
                        onClick={() => setViewingOrder(null)}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-8 rounded-xl transition-colors w-full sm:w-auto"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};