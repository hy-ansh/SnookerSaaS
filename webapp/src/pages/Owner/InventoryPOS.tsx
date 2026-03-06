import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../api/apiClient';
import FeatureGate from '../../components/FeatureGate';
import { UpiQrCode } from '../../components/Shared/UpiQrCode';
import { CheckoutPaymentModal } from '../../components/Shared/CheckoutPaymentModal';

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

    // Modal States
    const [showCartModal, setShowCartModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

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
            setShowPaymentModal(false);
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

    const handleProceedToPayment = () => {
        if (cart.length === 0) return;
        setShowCartModal(false);
        setShowPaymentModal(true);
    };

    const handleConfirmPayment = async (payload: any) => {
        const items = cart.map(c => ({
            inventoryItemId: c.product.id,
            quantity: c.quantity
        }));

        createOrderMutation.mutate({
            items,
            sessionId: selectedSessionId || undefined,
            playerId: selectedPlayerId || undefined,
            paymentMethod: payload.paymentMethod,
            splitPayments: payload.splitPayments
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

            {/* Floating Cart Button */}
            {cart.length > 0 && (
                <div className="fixed bottom-6 right-6 z-40">
                    <button onClick={() => setShowCartModal(true)}
                        className="flex items-center gap-3 px-6 py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/30 hover:bg-primary/90 transition-all hover:-translate-y-1">
                        <div className="relative">
                            <span className="material-symbols-outlined text-[24px]">shopping_cart</span>
                            <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-primary">{cart.reduce((s, c) => s + c.quantity, 0)}</span>
                        </div>
                        <div className="flex flex-col items-start border-l border-white/20 pl-3">
                            <span className="text-xs text-primary-50 uppercase tracking-wider">View Cart</span>
                            <span className="text-lg leading-tight">₹{total.toFixed(2)}</span>
                        </div>
                    </button>
                </div>
            )}

            {/* Cart Modal */}
            {showCartModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCartModal(false)} />
                    <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">shopping_cart</span>
                                Current Cart
                            </h2>
                            <button onClick={() => setShowCartModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {/* Items */}
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
                                        <button onClick={() => removeFromCart(c.product.id)} className="absolute top-2 right-2 text-slate-300 hover:text-rose-500 transition-colors">
                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Assignments */}
                            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Assign to Active Table (Optional)</label>
                                    <select value={selectedSessionId} onChange={e => setSelectedSessionId(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none text-slate-600 dark:text-slate-300 font-medium">
                                        <option value="">-- No Assignment (Walk-In) --</option>
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
                                        <option value="">-- No Assignment (Guest) --</option>
                                        {playersList?.map((p: any) => (
                                            <option key={p.id} value={p.id}>
                                                {p.fullName || p.email} ({p.profile?.nickname || 'Player'})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-800/20">
                            <div className="flex justify-between items-center mb-3 text-sm">
                                <span className="font-bold text-slate-500">Total</span>
                                <span className="text-xl font-black text-primary">₹{total.toFixed(2)}</span>
                            </div>
                            <button onClick={handleProceedToPayment} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/25 hover:opacity-90 transition-all">
                                Proceed to Payment <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Checkout Payment Modal */}
            <CheckoutPaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                totalAmount={total}
                title="Complete Purchase"
                subtitle={`${cart.reduce((s, c) => s + c.quantity, 0)} items in cart`}
                players={selectedPlayerId ? [{ id: selectedPlayerId, fullName: playersList?.find((p: any) => p.id === selectedPlayerId)?.fullName }] : []}
                onConfirm={handleConfirmPayment}
            />

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
