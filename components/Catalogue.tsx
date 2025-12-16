import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import { getCatalogue, saveCatalogue, updateProduct } from '../services/storageService';
import { Upload, FileText, Loader2, Edit2, Check, X, Plus, Trash2, Edit3 } from 'lucide-react';

// Swipeable Item Component for Catalogue
interface SwipeableCatalogueItemProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (code: string) => void;
}

const SwipeableCatalogueItem: React.FC<SwipeableCatalogueItemProps> = ({ product, onEdit, onDelete }) => {
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
    setTimeout(() => { isSwiping.current = false; }, 100);
  };

  return (
    <div className="relative overflow-hidden border-b border-gray-100 last:border-0 select-none bg-white">
       {/* Background Actions Layer (Mobile Only) */}
       <div className="absolute inset-y-0 right-0 w-[140px] flex z-0 md:hidden">
         <button 
            onClick={() => { onEdit(product); setOffsetX(0); }} 
            className="w-1/2 bg-nhs-blue text-white flex flex-col items-center justify-center active:bg-blue-700 transition-colors"
         >
            <Edit3 size={20} />
            <span className="text-[10px] font-bold mt-1">EDIT</span>
         </button>
         <button 
            onClick={() => { onDelete(product.code); setOffsetX(0); }} 
            className="w-1/2 bg-red-600 text-white flex flex-col items-center justify-center active:bg-red-700 transition-colors"
         >
            <Trash2 size={20} />
            <span className="text-[10px] font-bold mt-1">DELETE</span>
         </button>
       </div>

       {/* Foreground Content Layer */}
       <div 
         className="bg-white relative z-10 transition-transform duration-200 ease-out touch-pan-y flex flex-col md:flex-row md:items-center p-4 gap-2 md:gap-4"
         style={{ transform: `translateX(${offsetX}px)` }}
         onTouchStart={handleTouchStart}
         onTouchMove={handleTouchMove}
         onTouchEnd={handleTouchEnd}
       >
          {/* Code */}
          <div className="md:w-48 font-bold text-gray-900 flex-shrink-0 flex items-center">
             <span className="md:hidden text-xs text-gray-400 font-bold uppercase mr-2 tracking-wider w-12">Code:</span>
             {product.code}
          </div>
          
          {/* Description */}
          <div className="flex-1 text-gray-700 flex items-start">
             <span className="md:hidden text-xs text-gray-400 font-bold uppercase mr-2 tracking-wider w-12 mt-1">Desc:</span>
             <span>{product.description}</span>
          </div>

          {/* Desktop Actions (Hidden on Mobile) */}
          <div className="hidden md:flex gap-2 w-24 justify-end">
             <button onClick={() => onEdit(product)} className="text-gray-400 hover:text-nhs-blue p-2 rounded hover:bg-blue-50 transition-colors">
                <Edit2 size={18} />
             </button>
             <button onClick={() => onDelete(product.code)} className="text-gray-400 hover:text-red-600 p-2 rounded hover:bg-red-50 transition-colors">
                <Trash2 size={18} />
             </button>
          </div>
       </div>
    </div>
  );
};

export const Catalogue: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});

  // State for manual add
  const [newCode, setNewCode] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    setProducts(getCatalogue());
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError('');

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      const parsedProducts: Product[] = [];

      for (let i = 0; i < lines.length; i += 2) {
        const description = lines[i]?.trim();
        const code = lines[i+1]?.trim();

        if (description && code) {
            parsedProducts.push({
                code: code.toUpperCase(), // Normalize code to uppercase
                description: description
            });
        }
      }

      if (parsedProducts.length > 0) {
        saveCatalogue(parsedProducts);
        setProducts(parsedProducts);
        alert(`Successfully imported ${parsedProducts.length} items from text file.`);
      } else {
        setError("No valid items found. Ensure format is alternating lines: Description then Code.");
      }

    } catch (err) {
      console.error(err);
      setError("Failed to read or parse file.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newDesc.trim()) {
        alert("Please enter both a product code and description.");
        return;
    }

    const code = newCode.trim().toUpperCase();
    
    // Check if duplicate (optional warning)
    const exists = products.find(p => p.code === code);
    if (exists) {
        if(!confirm(`Product code "${code}" already exists. Do you want to overwrite it?`)) {
            return;
        }
    }

    updateProduct({
        code: code,
        description: newDesc.trim()
    });

    setProducts(getCatalogue());
    setNewCode('');
    setNewDesc('');
    alert(exists ? "Product updated." : "Product added.");
  };

  const handleDelete = (code: string) => {
      if(!confirm("Are you sure you want to delete this product?")) return;
      
      const currentList = getCatalogue();
      const newList = currentList.filter(p => p.code !== code);
      
      saveCatalogue(newList);
      setProducts(newList);
  };

  const startEdit = (product: Product) => {
    setEditingCode(product.code);
    setEditForm({ ...product });
  };

  const cancelEdit = () => {
    setEditingCode(null);
    setEditForm({});
  };

  const saveEdit = () => {
    if (editForm.code && editForm.description && editingCode) {
        const newCode = editForm.code.trim().toUpperCase();
        const newDesc = editForm.description.trim();

        const currentList = getCatalogue();

        // If code changed, check for collision
        if (newCode !== editingCode) {
             const exists = currentList.find(p => p.code === newCode);
             if (exists) {
                 alert(`Product code "${newCode}" already exists.`);
                 return;
             }
        }

        // Update list: Map through products, if match old ID, update with new data (including potential new ID)
        const newList = currentList.map(p => {
            if (p.code === editingCode) {
                return { 
                    code: newCode, 
                    description: newDesc 
                };
            }
            return p;
        });
        
        saveCatalogue(newList);
        setProducts(newList);
        setEditingCode(null);
        setEditForm({});
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <FileText className="text-nhs-blue" />
            Catalogue Management
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* File Upload Section */}
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
                <h3 className="font-semibold text-nhs-blue mb-2">Import Catalogue (.txt)</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Upload a raw text file formatted with alternating lines:
                    <br/>
                    <span className="font-mono text-xs bg-white px-1 border rounded">Line 1: Product Description</span>
                    <br/>
                    <span className="font-mono text-xs bg-white px-1 border rounded">Line 2: Product Code</span>
                </p>
                <label className="flex items-center justify-center w-full p-4 bg-white border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
                    <div className="flex flex-col items-center">
                        {isLoading ? <Loader2 className="animate-spin text-nhs-blue" /> : <Upload className="text-nhs-blue" />}
                        <span className="mt-2 text-sm font-medium text-gray-700">
                            {isLoading ? "Processing..." : "Select Text File"}
                        </span>
                    </div>
                    <input type="file" className="hidden" accept=".txt" onChange={handleFileUpload} disabled={isLoading} />
                </label>
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </div>

            {/* Manual Entry Section */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-700 mb-2">Manual Entry</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Add individual items to your product list manually.
                </p>
                <form onSubmit={handleManualAdd} className="space-y-3">
                    <div>
                        <input 
                            type="text" 
                            placeholder="Product Code (e.g. NPC123)"
                            value={newCode}
                            onChange={e => setNewCode(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nhs-blue outline-none uppercase text-black bg-white"
                        />
                    </div>
                    <div>
                        <input 
                            type="text" 
                            placeholder="Description"
                            value={newDesc}
                            onChange={e => setNewDesc(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nhs-blue outline-none text-black bg-white"
                        />
                    </div>
                    <button 
                        type="submit"
                        className="w-full bg-nhs-blue text-white py-3 px-4 rounded-lg shadow-sm hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors font-semibold"
                    >
                        <Plus size={20} /> Add Product
                    </button>
                </form>
            </div>
        </div>

        <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">Product List ({products.length})</h3>
            
            <div className="border rounded-lg bg-gray-50 overflow-hidden">
                {/* Header - Hidden on Mobile */}
                <div className="hidden md:flex bg-gray-100 text-gray-900 font-semibold uppercase text-sm border-b">
                    <div className="p-3 w-48">Code</div>
                    <div className="p-3 flex-1">Description</div>
                    <div className="p-3 w-24 text-right">Actions</div>
                </div>

                {/* List Body */}
                <div className="divide-y divide-gray-200 bg-white">
                    {products.map((product) => (
                        editingCode === product.code ? (
                             // Editing View
                            <div key={product.code} className="p-4 bg-blue-50 flex flex-col md:flex-row gap-3 items-start md:items-center animate-in fade-in">
                                <div className="w-full md:w-48">
                                    <label className="text-xs font-bold text-gray-500 uppercase md:hidden">Code</label>
                                    <input 
                                        value={editForm.code} 
                                        onChange={e => setEditForm({...editForm, code: e.target.value})}
                                        className="w-full p-2 border border-blue-300 rounded focus:ring-2 focus:ring-nhs-blue outline-none uppercase font-bold text-gray-900" 
                                        placeholder="Code"
                                    />
                                </div>
                                <div className="flex-1 w-full">
                                    <label className="text-xs font-bold text-gray-500 uppercase md:hidden">Description</label>
                                    <input 
                                        value={editForm.description} 
                                        onChange={e => setEditForm({...editForm, description: e.target.value})}
                                        className="w-full p-2 border border-blue-300 rounded focus:ring-2 focus:ring-nhs-blue outline-none text-gray-900" 
                                        placeholder="Description"
                                    />
                                </div>
                                <div className="flex gap-2 w-full md:w-auto justify-end mt-2 md:mt-0">
                                    <button onClick={saveEdit} className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 flex items-center gap-1 text-sm font-bold">
                                        <Check size={16} /> Save
                                    </button>
                                    <button onClick={cancelEdit} className="bg-gray-200 text-gray-700 px-3 py-2 rounded hover:bg-gray-300 flex items-center gap-1 text-sm font-bold">
                                        <X size={16} /> Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // Normal / Swipe View
                            <SwipeableCatalogueItem 
                                key={product.code} 
                                product={product} 
                                onEdit={startEdit} 
                                onDelete={handleDelete} 
                            />
                        )
                    ))}
                    
                    {products.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                            No products in catalogue. Import a file or add manually.
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};