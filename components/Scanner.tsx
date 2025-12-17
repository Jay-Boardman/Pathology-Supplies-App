import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Product, CartItem, Order } from '../types';
import { getCatalogue, saveOrder } from '../services/storageService';
import { Download, Plus, Minus, Trash2, ScanLine, X, Check, ShoppingCart, Edit3, Search, Barcode } from 'lucide-react';

// Swipeable Item Component
interface SwipeableItemProps {
  item: CartItem;
  onEdit: (item: CartItem) => void;
  onDelete: (code: string) => void;
}

const SwipeableCartItem: React.FC<SwipeableItemProps> = ({ item, onEdit, onDelete }) => {
  const [offsetX, setOffsetX] = useState(0);
  const startX = useRef<number | null>(null);
  const isSwiping = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    isSwiping.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;

    // Only allow left swipe (negative diff)
    if (diff < 0) {
      const newOffset = Math.max(diff, -140); // Max reveal width (70px * 2 buttons)
      setOffsetX(newOffset);
      if (Math.abs(diff) > 5) isSwiping.current = true;
    } else if (offsetX < 0) {
      // Closing
      const newOffset = Math.min(offsetX + diff, 0);
      setOffsetX(newOffset);
      if (Math.abs(diff) > 5) isSwiping.current = true;
    }
  };

  const handleTouchEnd = () => {
    if (offsetX < -70) {
      setOffsetX(-140); // Snap open
    } else {
      setOffsetX(0); // Snap close
    }
    startX.current = null;
    // Delay clearing isSwiping to prevent triggering click on children immediately after swipe
    setTimeout(() => { isSwiping.current = false; }, 100);
  };

  return (
    <div className="relative overflow-hidden border-b border-gray-100 last:border-0 select-none">
       {/* Background Actions Layer */}
       <div className="absolute inset-y-0 right-0 w-[140px] flex z-0">
         <button 
            onClick={() => { onEdit(item); setOffsetX(0); }} 
            className="w-1/2 bg-nhs-blue text-white flex flex-col items-center justify-center active:bg-blue-700 transition-colors"
         >
            <Edit3 size={20} />
            <span className="text-[10px] font-bold mt-1">EDIT</span>
         </button>
         <button 
            onClick={() => { onDelete(item.code); setOffsetX(0); }} 
            className="w-1/2 bg-red-600 text-white flex flex-col items-center justify-center active:bg-red-700 transition-colors"
         >
            <Trash2 size={20} />
            <span className="text-[10px] font-bold mt-1">DELETE</span>
         </button>
       </div>

       {/* Foreground Content Layer */}
       <div 
         className="bg-white relative z-10 transition-transform duration-200 ease-out touch-pan-y"
         style={{ transform: `translateX(${offsetX}px)` }}
         onTouchStart={handleTouchStart}
         onTouchMove={handleTouchMove}
         onTouchEnd={handleTouchEnd}
       >
          <div className="p-4 flex flex-row items-center justify-between gap-3">
             <div 
                className="flex-1 cursor-pointer min-w-0 pr-2" 
                onClick={() => !isSwiping.current && onEdit(item)}
             >
                <div className="font-bold text-lg text-gray-900 truncate">{item.code}</div>
                <div className="text-sm text-gray-600 line-clamp-2">{item.description}</div>
             </div>
             
             <div className="flex items-center justify-end gap-4 shrink-0">
                {/* Clickable Quantity Box */}
                <button 
                    onClick={() => !isSwiping.current && onEdit(item)}
                    className="flex flex-col items-center justify-center border-2 border-gray-200 rounded-xl bg-white shadow-sm w-20 h-16 active:border-nhs-blue active:ring-2 active:ring-blue-100 transition-all group"
                >
                    <span className="text-xs text-gray-400 font-bold uppercase mb-[-2px] group-hover:text-nhs-blue">Qty</span>
                    <span className="text-2xl font-bold text-gray-900">{item.quantity}</span>
                </button>

                {/* Trash Button - Hidden on mobile to prioritize swipe, visible on desktop */}
                <button 
                    onClick={() => onDelete(item.code)}
                    className="hidden sm:flex p-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors h-16 w-16 items-center justify-center"
                >
                    <Trash2 size={24} />
                </button>
             </div>
          </div>
       </div>
    </div>
  );
};

interface ScannerProps {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
}

export const Scanner: React.FC<ScannerProps> = ({ cart, setCart }) => {
  const [inputCode, setInputCode] = useState('');
  const [catalogue, setCatalogue] = useState<Product[]>([]);
  
  // Pending State for "Ask Quantity" flow
  const [pendingItem, setPendingItem] = useState<{code: string, description: string} | null>(null);
  const [quantityInput, setQuantityInput] = useState<string>('1');
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCatalogue(getCatalogue());
    inputRef.current?.focus();
  }, []);

  const refocusScanner = () => {
    setTimeout(() => {
        // Only refocus scanner if we aren't searching
        if (!searchQuery) {
            inputRef.current?.focus();
        }
    }, 100);
  };

  // Filter catalogue for search
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    // Search both description and code
    return catalogue.filter(p => 
      p.description.toLowerCase().includes(query) || 
      p.code.toLowerCase().includes(query)
    ).slice(0, 10); // Limit to top 10 results
  }, [searchQuery, catalogue]);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;

    const code = inputCode.trim().toUpperCase();
    const product = catalogue.find(p => p.code.toUpperCase() === code);
    const existingItem = cart.find(item => item.code === code);
    
    setPendingItem({
        code,
        description: product ? product.description : 'Unknown Item'
    });

    if (existingItem) {
        // If item exists, show current total and set to Edit mode (overwrite)
        setQuantityInput(existingItem.quantity.toString());
        setIsEditing(true);
    } else {
        // New item, default to 1 and Add mode
        setQuantityInput('1');
        setIsEditing(false);
    }
    
    // Focus quantity input after render so user can type immediately
    setTimeout(() => {
        quantityRef.current?.focus();
        quantityRef.current?.select();
    }, 100);
  };

  const handleManualSelect = (product: Product) => {
    const code = product.code;
    const existingItem = cart.find(item => item.code === code);
    
    setPendingItem({
        code,
        description: product.description
    });

    if (existingItem) {
        setQuantityInput(existingItem.quantity.toString());
        setIsEditing(true);
    } else {
        setQuantityInput('1');
        setIsEditing(false);
    }
    
    setSearchQuery(''); // Clear search query on selection
    setInputCode(''); // Clear scan input if any
    
    setTimeout(() => {
        quantityRef.current?.focus();
        quantityRef.current?.select();
    }, 100);
  };

  const handleEditQuantity = (item: CartItem) => {
    setPendingItem({
        code: item.code,
        description: item.description
    });
    setQuantityInput(item.quantity.toString());
    setIsEditing(true); // Editing overwrites existing quantity
    
    setTimeout(() => {
        quantityRef.current?.focus();
        quantityRef.current?.select();
    }, 100);
  };

  const handleConfirmQuantity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingItem) return;

    const qty = parseInt(quantityInput, 10);
    if (isNaN(qty) || qty <= 0) {
        alert("Please enter a valid quantity");
        return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.code === pendingItem.code);
      if (existing) {
        // If editing, overwrite the quantity. If scanning (not editing), add to existing quantity.
        const newQuantity = isEditing ? qty : existing.quantity + qty;
        return prev.map(item => item.code === pendingItem.code ? { ...item, quantity: newQuantity } : item);
      }
      return [{
        code: pendingItem.code,
        description: pendingItem.description,
        quantity: qty
      }, ...prev];
    });

    setPendingItem(null);
    setInputCode('');
    setIsEditing(false);
    refocusScanner();
  };

  const cancelPending = () => {
      setPendingItem(null);
      setInputCode('');
      setIsEditing(false);
      refocusScanner();
  };

  const removeItem = (code: string) => {
    setCart(prev => prev.filter(item => item.code !== code));
  };

  const finalizeOrder = () => {
    if (cart.length === 0) return;

    // 1. Generate TXT
    const txtContent = cart.map(item => `${item.code} ${item.quantity}`).join('\n');
    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Create Date String: dd-mm-yyyy
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = now.getFullYear();
    const filename = `Scanned_Items_${day}-${month}-${year}.txt`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    // 2. Save to History
    const newOrder: Order = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      items: cart
    };
    saveOrder(newOrder);

    // 3. Reset
    setCart([]);
    alert("Order file downloaded and saved to history.");
    refocusScanner();
  };

  // Helper to split description if it contains brackets (e.g. instructions)
  const renderFormattedDescription = (text: string) => {
    const splitIndex = text.indexOf('(');
    if (splitIndex !== -1) {
        const main = text.substring(0, splitIndex).trim();
        const sub = text.substring(splitIndex).trim();
        return (
            <div className="flex flex-col items-center gap-2">
                <span className="text-2xl sm:text-4xl leading-tight">{main}</span>
                <span className="block text-xl sm:text-2xl font-medium text-nhs-blue mt-1">{sub}</span>
            </div>
        );
    }
    return <span className="text-2xl sm:text-4xl leading-tight">{text}</span>;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-32"> {/* Increased padding for floating footer */}
      
      {/* 1. Main Scanner Input Area */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <ScanLine className="text-nhs-blue" />
            Barcode Scanner
        </h2>
        <form onSubmit={handleScan} className="relative z-10 mb-4">
          <div className="relative">
              <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                ref={inputRef}
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                onBlur={() => {
                    // Keep trying to maintain focus for barcode scanners unless interacting with UI
                    if (!pendingItem && !searchQuery) {
                       // Optional: refocus logic if needed
                    }
                }}
                placeholder="Scan barcode..."
                className="w-full h-12 pl-12 pr-4 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-nhs-blue focus:border-transparent outline-none bg-white transition-all shadow-sm"
              />
          </div>
          {/* Hidden submit button to allow Enter key to work */}
          <button type="submit" className="hidden">Scan</button>
        </form>
        
        {/* Search Field */}
        <div className="pt-2 relative">
            <label className="block text-sm font-bold text-gray-500 mb-2 uppercase tracking-wider">
                Or Search Catalogue
            </label>
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                    type="text"
                    placeholder="Type product description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-12 pl-12 pr-4 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-nhs-blue focus:border-transparent outline-none bg-white shadow-sm"
                />
            </div>

            {/* Dropdown Results */}
            {searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                    {filteredProducts.length > 0 ? (
                        filteredProducts.map(p => (
                            <button
                                key={p.code}
                                onClick={() => handleManualSelect(p)}
                                className="w-full text-left p-3 hover:bg-blue-50 border-b border-gray-50 last:border-0 transition-colors flex flex-col"
                            >
                                <span className="font-bold text-nhs-blue text-sm">{p.code}</span>
                                <span className="text-gray-700 text-sm">{p.description}</span>
                            </button>
                        ))
                    ) : (
                        <div className="p-4 text-center text-gray-500 text-sm">No products found</div>
                    )}
                </div>
            )}
        </div>

        <p className="text-xs sm:text-sm text-gray-500 mt-4">
            Status: {pendingItem ? 'Waiting for quantity...' : 'Ready to scan.'}
        </p>
      </div>

      {/* 2. Order Summary / Cart List */}
      <div className="bg-white rounded-lg shadow-md flex flex-col relative">
        <div className="p-4 bg-gray-50 border-b flex justify-between items-center sticky top-16 z-30 shadow-sm">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <ShoppingCart size={18} />
                Order ({cart.length})
            </h3>
            {cart.length > 0 && (
                <button 
                    onClick={() => {
                        if(confirm('Clear entire order?')) {
                            setCart([]);
                            refocusScanner();
                        }
                    }}
                    className="text-red-500 text-sm hover:underline"
                >
                    Clear All
                </button>
            )}
        </div>
        
        {cart.length === 0 ? (
            <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-2">
                <ScanLine size={48} className="opacity-20" />
                <p>Scan an item to start.</p>
            </div>
        ) : (
            // Removed fixed height and internal scroll. Now expands with content.
            <div className="divide-y divide-gray-100">
                {cart.map((item) => (
                    <SwipeableCartItem 
                        key={item.code} 
                        item={item} 
                        onEdit={handleEditQuantity} 
                        onDelete={removeItem} 
                    />
                ))}
            </div>
        )}
      </div>

      {/* 3. "Ask Quantity" Overlay Modal - Square Design */}
      {pendingItem && (
        <div className="relative z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            {/* Background backdrop */}
            <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm transition-opacity" onClick={cancelPending}></div>

            {/* Container for centering */}
            <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4">
                    
                    {/* Square Modal */}
                    <div className="relative transform overflow-hidden rounded-3xl bg-white text-center shadow-2xl transition-all w-[90vw] max-w-[500px] aspect-square flex flex-col items-center justify-center p-6 sm:p-8 animate-in zoom-in-95 duration-300 border-8 border-nhs-blue ring-4 ring-white/50">
                        
                        {/* Close Button - Absolute Positioned */}
                        <button 
                            onClick={cancelPending} 
                            className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500 rounded-full transition-colors z-20 shadow-sm"
                        >
                            <X size={24} />
                        </button>
                        
                        <form onSubmit={handleConfirmQuantity} className="w-full h-full flex flex-col items-center justify-between relative z-10">
                            
                            {/* Product Code - TOP */}
                            <div className="w-full border-b border-gray-100 pb-2 mb-2">
                                <label className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Product Code</label>
                                <div className="text-2xl sm:text-3xl font-black text-nhs-blue tracking-tighter break-all leading-none">
                                    {pendingItem.code}
                                </div>
                            </div>
                            
                            {/* Description - MIDDLE (Expanded area with formatting) */}
                            <div className="w-full flex-grow flex items-center justify-center py-2 overflow-hidden min-h-0">
                                <div className="font-bold text-gray-900 px-2 max-h-full overflow-y-auto w-full break-words flex flex-col items-center justify-center">
                                    {renderFormattedDescription(pendingItem.description)}
                                </div>
                            </div>
                            
                            {/* Quantity - BOTTOM (Smaller Input) */}
                            <div className="w-full mb-4 mt-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Quantity</label>
                                <div className="flex items-center justify-center">
                                    <input
                                        ref={quantityRef}
                                        type="number"
                                        min="1"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={quantityInput}
                                        onChange={(e) => setQuantityInput(e.target.value)}
                                        className="w-24 sm:w-32 h-12 sm:h-16 text-center text-3xl sm:text-4xl font-bold bg-transparent border-b-4 border-nhs-blue focus:border-blue-700 outline-none text-gray-900 rounded-none transition-all placeholder-gray-300"
                                        placeholder="#"
                                    />
                                </div>
                            </div>

                            {/* Confirm Button */}
                            <button 
                                type="submit" 
                                className="w-full py-3 sm:py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl text-lg font-bold shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                <Check size={24} />
                                {isEditing ? 'Update' : 'Confirm'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* 4. NEW Floating Footer Actions */}
      {cart.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-40 safe-area-bottom">
                <div className="max-w-4xl mx-auto">
                    <button 
                        onClick={finalizeOrder}
                        className="w-full h-14 bg-green-600 text-white rounded-xl text-lg font-bold hover:bg-green-700 shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                    >
                        <Download size={24} />
                        Complete Order
                    </button>
                </div>
            </div>
      )}
    </div>
  );
};