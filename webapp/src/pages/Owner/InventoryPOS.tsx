import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../api/apiClient';
import FeatureGate from '../../components/FeatureGate';

interface InventoryItem {
    id: string;
    name: string;
    category: string;
    price: number | string;
    stockQuantity: number;
    sku?: string;
    reorderLevel: number;
}

interface CartItem {
    product: InventoryItem;
    quantity: number;
}

function InventoryPOSContent() {
    const queryClient = useQueryClient();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('All');
    const [taxRate] = useState<number>(0);

    // POS Active sessions & Payment tracking
    const [selectedSessionId, setSelectedSessionId] = useState<string>('');
    const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'UPI' | 'WALLET' | 'DUES'>('CASH');

    // For adding new Item
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [newItem, setNewItem] = useState({ name: '', category: 'Drinks', price: '', stockQuantity: '', reorderLevel: '10', sku: '', cost: '' });

    // Fetch Inventory
    const { data: products = [], isLoading } = useQuery({
        queryKey: ['inventory'],
        queryFn: () => apiFetch('/inventory')
    });

    // Fetch Active Sessions
    const { data: activeSessions = [] } = useQuery({
        queryKey: ['activeSessions'],
        queryFn: () => apiFetch('/sessions/active')
    });

    // Fetch Recent/All Players
    const { data: playersList = [] } = useQuery({
        queryKey: ['posPlayers'],
        queryFn: () => apiFetch('/sessions/search-players')
    });

    const createOrderMutation = useMutation({
        mutationFn: (payload: any) => apiFetch('/inventory/orders', {
            method: 'POST',
            body: JSON.stringify(payload)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            setCart([]);
            setSelectedSessionId('');
            setSelectedPlayerId('');
            setSuccessMsg('Order placed successfully!');
            setTimeout(() => setSuccessMsg(''), 3000);
        },
        onError: (err: any) => {
            setErrorMsg(`Order failed: ${err.message || 'Unknown error'}`);
            setTimeout(() => setErrorMsg(''), 4000);
        }
    });

    const addItemMutation = useMutation({
        mutationFn: (payload: any) => apiFetch('/inventory', {
            method: 'POST',
            body: JSON.stringify(payload)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            setIsAddingItem(false);
            setNewItem({ name: '', category: 'Drinks', price: '', stockQuantity: '', reorderLevel: '10', sku: '', cost: '' });
            setSuccessMsg('Product added successfully!');
            setTimeout(() => setSuccessMsg(''), 3000);
        },
        onError: (err: any) => {
            setErrorMsg(`Failed to add product: ${err.message || 'Server error'}`);
            setTimeout(() => setErrorMsg(''), 4000);
        }
    });

    const addCategoryMutation = useMutation({
        mutationFn: (payload: any) => apiFetch('/inventory', {
            method: 'POST',
            body: JSON.stringify(payload)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            setIsAddingCategory(false);
            setNewCategoryName('');
            setSuccessMsg('Category added!');
            setTimeout(() => setSuccessMsg(''), 3000);
        },
        onError: (err: any) => {
            setErrorMsg(`Failed to add category: ${err.message || 'Server error'}`);
            setTimeout(() => setErrorMsg(''), 4000);
        }
    });

    const handleSaveCategory = () => {
        if (!newCategoryName.trim()) return;
        // Create a placeholder product to register the category
        addCategoryMutation.mutate({
            name: `${newCategoryName.trim()} — Category Item`,
            category: newCategoryName.trim(),
            price: '0',
            stockQuantity: '0',
            reorderLevel: '0'
        });
    };

    // POS Logic
    const addToCart = (product: InventoryItem) => {
        if (product.stockQuantity <= 0) {
            alert('Item out of stock!');
            return;
        }
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                if (existing.quantity >= product.stockQuantity) return prev; // Cannot exceed stock
                return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                const newQ = item.quantity + delta;
                if (newQ > item.product.stockQuantity) return item;
                if (newQ > 0) return { ...item, quantity: newQ };
                return item;
            }
            return item;
        }));
    };

    const handleCheckout = () => {
        if (cart.length === 0) return;
        const items = cart.map(c => ({
            inventoryItemId: c.product.id,
            quantity: c.quantity
        }));

        createOrderMutation.mutate({
            items,
            sessionId: selectedSessionId || undefined,
            playerId: selectedPlayerId || undefined,
            paymentMethod: paymentMethod
        });
    };

    const handleSaveNewItem = () => {
        if (!newItem.name || !newItem.price) return;
        addItemMutation.mutate(newItem);
    };

    // Derived
    const subtotal = cart.reduce((sum, item) => sum + (Number(item.product.price) * item.quantity), 0);
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    const categories: string[] = ['All', ...Array.from(new Set((products as any[]).map((p: any) => p.category as string)))];
    const filteredProducts: any[] = activeCategory === 'All' ? products as any[] : (products as any[]).filter((p: any) => p.category === activeCategory);

    return (
        <div className="flex flex-col xl:flex-row gap-6 h-full font-display">
            {/* Left Column: Catalog & Tabs */}
            <div className="flex-1 flex flex-col space-y-6 min-h-0">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Point of Sale</h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Manage walk-in orders and inventory.</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => { setIsAddingCategory(!isAddingCategory); setIsAddingItem(false); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all border ${isAddingCategory
                                ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-primary/40'
                                }`}>
                            <span className="material-symbols-outlined text-sm">label</span> {isAddingCategory ? 'Cancel' : 'Add Category'}
                        </button>
                        <button
                            onClick={() => { setIsAddingItem(!isAddingItem); setIsAddingCategory(false); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-lg transition-all ${isAddingItem
                                ? 'bg-rose-500 text-white hover:bg-rose-600'
                                : 'bg-primary text-white hover:bg-primary/90 shadow-primary/20'
                                }`}>
                            <span className="material-symbols-outlined text-sm">{isAddingItem ? 'close' : 'add'}</span> {isAddingItem ? 'Cancel' : 'New Product'}
                        </button>
                    </div>
                </div>

                {/* Success / Error toasts */}
                {successMsg && (
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                        <span className="material-symbols-outlined text-[20px]">check_circle</span>
                        {successMsg}
                    </div>
                )}
                {errorMsg && (
                    <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-400 font-bold text-sm">
                        <span className="material-symbols-outlined text-[20px]">error</span>
                        {errorMsg}
                    </div>
                )}

                {isAddingItem && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                        <h3 className="font-extrabold text-lg mb-5 text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">add_box</span> Add New Product
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Product Name *</label>
                                <input type="text" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. Red Bull 250ml" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Category *</label>
                                <div className="relative">
                                    <input
                                        list="categories-list"
                                        value={newItem.category}
                                        onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                                        placeholder="Select or type a category"
                                    />
                                    <datalist id="categories-list">
                                        {categories.filter(c => c !== 'All').map(c => <option key={c} value={c} />)}
                                    </datalist>
                                </div>
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Selling Price (₹) *</label>
                                <input type="number" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="120" min="0" />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cost Price (₹)</label>
                                <input type="number" value={newItem.cost} onChange={e => setNewItem({ ...newItem, cost: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="80" min="0" />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Opening Stock</label>
                                <input type="number" value={newItem.stockQuantity} onChange={e => setNewItem({ ...newItem, stockQuantity: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="24" min="0" />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Reorder Level</label>
                                <input type="number" value={newItem.reorderLevel} onChange={e => setNewItem({ ...newItem, reorderLevel: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="5" min="0" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">SKU / Barcode</label>
                                <input type="text" value={newItem.sku} onChange={e => setNewItem({ ...newItem, sku: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="RB-250-CAN" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button onClick={() => setIsAddingItem(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                            <button onClick={handleSaveNewItem} disabled={addItemMutation.isPending || !newItem.name || !newItem.price} className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">{addItemMutation.isPending ? 'hourglass_empty' : 'check'}</span>
                                {addItemMutation.isPending ? 'Saving...' : 'Save Product'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Add Category Inline Panel */}
                {isAddingCategory && (
                    <div className="bg-white dark:bg-slate-900 border border-primary/30 rounded-2xl p-5 shadow-sm">
                        <h3 className="font-extrabold text-base mb-4 text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-[20px]">label</span> Add New Category
                        </h3>
                        <div className="flex gap-3 items-end">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Category Name</label>
                                <input
                                    type="text"
                                    value={newCategoryName}
                                    onChange={e => setNewCategoryName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSaveCategory()}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="e.g. Equipment, Snacks, Beverages..."
                                    autoFocus
                                />
                            </div>
                            <button onClick={() => setIsAddingCategory(false)} className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-500 hover:bg-slate-50 transition-colors">Cancel</button>
                            <button
                                onClick={handleSaveCategory}
                                disabled={addCategoryMutation.isPending || !newCategoryName.trim()}
                                className="px-5 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">check</span>
                                {addCategoryMutation.isPending ? 'Adding...' : 'Add Category'}
                            </button>
                        </div>
                        {categories.filter(c => c !== 'All').length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                <p className="text-xs font-bold text-slate-400 uppercase w-full">Existing categories:</p>
                                {categories.filter(c => c !== 'All').map(c => (
                                    <span key={c} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300">{c}</span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Quick Filters */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {categories.map((cat: any) => (
                        <button key={cat} onClick={() => setActiveCategory(cat)} className={`flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-xl px-5 text-sm font-bold transition-all ${activeCategory === cat ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-primary/50'}`}>
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Grid Display */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 overflow-y-auto">
                    {isLoading ? (
                        <div className="col-span-full py-20 text-center font-bold text-slate-500 animate-pulse">Loading Catalog...</div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="col-span-full py-20 text-center text-slate-500">
                            <span className="material-symbols-outlined text-5xl mb-3 opacity-50 block">inventory_2</span>
                            <p className="font-bold">No products found in this category.</p>
                        </div>
                    ) : filteredProducts.map((product: InventoryItem) => (
                        <div key={product.id} className="group flex flex-col bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 hover:shadow-lg hover:border-primary/30 transition-all">
                            <div className="relative w-full aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800/50 flex flex-col items-center justify-center text-primary/20">
                                <span className="material-symbols-outlined text-6xl group-hover:scale-110 transition-transform">{product.category.toLowerCase().includes('drink') ? 'local_cafe' : product.category.toLowerCase().includes('snack') ? 'fastfood' : 'sports_golf'}</span>
                                <div className="absolute top-2 right-2 flex gap-1">
                                    {product.stockQuantity <= product.reorderLevel && product.stockQuantity > 0 && <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">Low Stock</span>}
                                    {product.stockQuantity <= 0 && <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border border-red-200 dark:border-red-800/50">Out of Stock</span>}
                                    {product.stockQuantity > product.reorderLevel && <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase bg-green-100 text-green-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-green-200 dark:border-emerald-800/50">{product.stockQuantity} in Stock</span>}
                                </div>
                            </div>
                            <div className="p-4 flex flex-col flex-1">
                                <div className="flex justify-between items-start mb-1 gap-2">
                                    <h3 className="text-slate-900 dark:text-slate-100 font-bold text-base line-clamp-2">{product.name}</h3>
                                    <span className="text-primary font-black whitespace-nowrap">₹{Number(product.price).toFixed(2)}</span>
                                </div>
                                <p className="text-slate-500 text-xs mb-4 flex-1 font-medium">{product.category}</p>
                                <button onClick={() => addToCart(product)} disabled={product.stockQuantity <= 0} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold hover:bg-primary hover:text-white disabled:opacity-50 disabled:hover:bg-slate-100 dark:disabled:hover:bg-slate-800 disabled:hover:text-slate-700 transition-all border border-transparent">
                                    <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span> Add
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Column: POS / Bill Area */}
            <aside className="w-full xl:w-[400px] shrink-0 xl:sticky xl:top-0 xl:h-[calc(100vh-140px)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Current Cart</h2>
                        <span className="bg-primary/10 text-primary text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-widest">POS Walk-In</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 p-3">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                            <span className="material-symbols-outlined text-6xl mb-4 opacity-30">shopping_cart</span>
                            <p className="font-bold">Your cart is empty.</p>
                            <p className="text-sm font-medium opacity-60 mt-1">Select items from the catalog.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {cart.map(c => (
                                <div key={c.product.id} className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-700/50 relative group">
                                    <div className="flex justify-between items-start pr-6">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{c.product.name}</p>
                                        <p className="text-sm font-black text-primary whitespace-nowrap">₹{(Number(c.product.price) * c.quantity).toFixed(2)}</p>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-medium text-slate-400">₹{Number(c.product.price).toFixed(2)} × </p>
                                        <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shadow-sm">
                                            <button onClick={() => updateQuantity(c.product.id, -1)} className="size-6 flex items-center justify-center text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-md transition-colors">
                                                <span className="material-symbols-outlined text-[16px]">remove</span>
                                            </button>
                                            <span className="w-8 text-center text-sm font-black">{c.quantity}</span>
                                            <button onClick={() => updateQuantity(c.product.id, 1)} className="size-6 flex items-center justify-center text-slate-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-md transition-colors">
                                                <span className="material-symbols-outlined text-[16px]">add</span>
                                            </button>
                                        </div>
                                    </div>
                                    <button onClick={() => removeFromCart(c.product.id)} className="absolute top-2 right-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="material-symbols-outlined text-[16px]">close</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="shrink-0 max-h-[55%] overflow-y-auto border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/20">
                    <div className="p-4 space-y-3">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Payment Method</label>
                            <div className="grid grid-cols-3 gap-2">
                                {([
                                    { value: 'CASH', label: 'Cash', icon: 'payments', color: 'text-emerald-600' },
                                    { value: 'CARD', label: 'Card', icon: 'credit_card', color: 'text-blue-600' },
                                    { value: 'UPI', label: 'UPI', icon: 'qr_code_scanner', color: 'text-violet-600' },
                                    { value: 'WALLET', label: 'Wallet', icon: 'account_balance_wallet', color: 'text-amber-600' },
                                    { value: 'DUES', label: 'Add to Dues', icon: 'account_balance', color: 'text-red-500' },
                                ] as { value: 'CASH' | 'CARD' | 'UPI' | 'WALLET' | 'DUES'; label: string; icon: string; color: string }[]).map(opt => (
                                    <button key={opt.value} type="button"
                                        onClick={() => setPaymentMethod(opt.value)}
                                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all gap-1.5 ${paymentMethod === opt.value
                                            ? 'border-primary bg-primary/5 shadow-sm shadow-primary/20'
                                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-300'
                                            }`}>
                                        <span className={`material-symbols-outlined text-2xl ${paymentMethod === opt.value ? 'text-primary' : opt.color}`}>{opt.icon}</span>
                                        <span className={`text-[10px] font-bold uppercase tracking-wide leading-tight text-center ${paymentMethod === opt.value ? 'text-primary' : 'text-slate-600 dark:text-slate-400'}`}>{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                            {paymentMethod === 'DUES' && (
                                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 mt-1">
                                    <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">warning</span>
                                    <span>This will create a pending due for the assigned player.</span>
                                </div>
                            )}
                            {paymentMethod === 'WALLET' && !selectedPlayerId && (
                                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-400 mt-1">
                                    <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">info</span>
                                    <span>Assign to a player to deduct from their wallet.</span>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Assign to Active Table (Optional)</label>
                            <select value={selectedSessionId} onChange={e => setSelectedSessionId(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none text-slate-600 dark:text-slate-300 font-medium">
                                <option value="">-- No Assignment --</option>
                                {activeSessions?.map((s: any) => (
                                    <option key={s.id} value={s.id}>
                                        Table {s.table?.nameOrNumber} ({s.id.slice(0, 4)})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Assign to Player (Optional)</label>
                            <select value={selectedPlayerId} onChange={e => setSelectedPlayerId(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none text-slate-600 dark:text-slate-300 font-medium">
                                <option value="">-- No Assignment --</option>
                                {playersList?.map((p: any) => (
                                    <option key={p.id} value={p.id}>
                                        {p.fullName || p.email} ({p.profile?.nickname || 'Player'})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex justify-between text-slate-500 text-sm font-bold items-end pt-3 border-t border-slate-200 dark:border-slate-700">
                            <span>Total Due</span>
                            <span className="text-2xl font-black text-primary">₹{total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Checkout Buttons — always visible at bottom */}
                <div className="shrink-0 p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="grid grid-cols-2 gap-3">
                        <button className="flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-bold text-sm hover:border-slate-300 transition-all text-slate-700 dark:text-slate-300">
                            <span className="material-symbols-outlined text-[18px]">print</span> Print
                        </button>
                        <button onClick={handleCheckout} disabled={cart.length === 0 || createOrderMutation.isPending} className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/25 hover:opacity-90 disabled:opacity-50 disabled:shadow-none transition-all">
                            <span className="material-symbols-outlined text-[18px]">{createOrderMutation.isPending ? 'hourglass_empty' : 'payments'}</span>
                            {createOrderMutation.isPending ? 'Processing' : 'Checkout'}
                        </button>
                    </div>
                </div>
            </aside>
        </div>
    );
}

export default function OwnerInventoryPOS() {
    return (
        <FeatureGate feature="pos">
            <InventoryPOSContent />
        </FeatureGate>
    );
}
