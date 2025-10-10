
import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { ref, onValue, set, push, remove, update } from 'firebase/database';
import { useAuth } from '../App';
import { WarehouseItem, UserRole } from '../types';
import { PlusCircleIcon, TrashIcon, EditIcon } from '../components/icons';

const WarehousePage: React.FC = () => {
    const { user } = useAuth();
    const [warehouseItems, setWarehouseItems] = useState<WarehouseItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<Partial<WarehouseItem>>({});
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        const warehouseRef = ref(db, 'warehouse');
        const unsubscribe = onValue(warehouseRef, (snapshot) => {
            const data = snapshot.val();
            const loadedItems: WarehouseItem[] = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
            setWarehouseItems(loadedItems);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const openModalForNew = () => {
        setCurrentItem({ name: '', quantity: 0 });
        setIsEditing(false);
        setIsModalOpen(true);
    };

    const openModalForEdit = (item: WarehouseItem) => {
        setCurrentItem(item);
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentItem.name || currentItem.quantity === undefined || currentItem.quantity < 0) {
            alert('يرجى إدخال اسم وكمية صالحة.');
            return;
        }

        if (isEditing && currentItem.id) {
            const itemRef = ref(db, `warehouse/${currentItem.id}`);
            await update(itemRef, { name: currentItem.name, quantity: currentItem.quantity });
        } else {
            const newItemRef = push(ref(db, 'warehouse'));
            await set(newItemRef, { name: currentItem.name, quantity: currentItem.quantity });
        }
        setIsModalOpen(false);
    };
    
    const handleDelete = async (itemId: string) => {
        if (window.confirm('هل أنت متأكد من رغبتك في حذف هذا العنصر؟')) {
            const itemRef = ref(db, `warehouse/${itemId}`);
            await remove(itemRef);
        }
    };
    
    const totalItems = warehouseItems.reduce((sum, item) => sum + item.quantity, 0);

    const canManage = user?.role === UserRole.ADMIN || user?.role === UserRole.MODERATOR;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow">
                <div>
                    <h1 className="text-2xl font-bold text-primary">المخزن</h1>
                    <p className="text-gray-600">إجمالي عدد المعدات: {totalItems}</p>
                </div>
                {canManage && (
                    <button onClick={openModalForNew} className="flex items-center bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-blue-600 transition-colors">
                        <PlusCircleIcon className="w-5 h-5 ml-2" />
                        إضافة معدات جديدة
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="text-center p-10">جاري تحميل بيانات المخزن...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {warehouseItems.length > 0 ? warehouseItems.map(item => (
                        <div key={item.id} className="bg-white rounded-xl shadow-lg p-5 flex flex-col justify-between transition-transform hover:scale-105">
                            <div>
                                <h3 className="text-xl font-bold text-dark">{item.name}</h3>
                                <p className="text-3xl font-bold text-primary my-4">{item.quantity}</p>
                                <p className="text-sm text-gray-500">المتبقي في المخزن</p>
                            </div>
                            {canManage && (
                                <div className="flex items-center justify-end space-x-2 space-x-reverse mt-4 border-t pt-3">
                                    <button onClick={() => openModalForEdit(item)} className="text-gray-500 hover:text-accent p-2 rounded-full"><EditIcon /></button>
                                    <button onClick={() => handleDelete(item.id)} className="text-gray-500 hover:text-red-500 p-2 rounded-full"><TrashIcon /></button>
                                </div>
                            )}
                        </div>
                    )) : (
                        <p className="text-center col-span-full">المخزن فارغ حالياً.</p>
                    )}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-6">{isEditing ? 'تعديل عنصر' : 'إضافة عنصر جديد'}</h2>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">اسم العنصر</label>
                                <input
                                    type="text"
                                    value={currentItem.name || ''}
                                    onChange={e => setCurrentItem({ ...currentItem, name: e.target.value })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">الكمية</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={currentItem.quantity ?? ''}
                                    onChange={e => setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value, 10) })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                                    required
                                />
                            </div>
                            <div className="flex justify-end space-x-4 space-x-reverse pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">إلغاء</button>
                                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-600">حفظ</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WarehousePage;
