import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { ref, onValue, remove, push, set, serverTimestamp } from 'firebase/database';
import { useAuth } from '../App';
import { DamagedItem, UserRole } from '../types';
import { TrashIcon } from '../components/icons';

const DamagedPage: React.FC = () => {
    const { user } = useAuth();
    const [damagedItems, setDamagedItems] = useState<DamagedItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const damagedRef = ref(db, 'damaged');
        const unsubscribe = onValue(damagedRef, (snapshot) => {
            const data = snapshot.val();
            const loadedItems: DamagedItem[] = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
            setDamagedItems(loadedItems.sort((a, b) => b.timestamp - a.timestamp));
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const canManage = user?.role === UserRole.ADMIN || user?.role === UserRole.MODERATOR;

    const handleDelete = async (itemId: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذا الإجراء.')) {
            const itemToDelete = damagedItems.find(item => item.id === itemId);
            if (!itemToDelete) return;

            await remove(ref(db, `damaged/${itemId}`));

            const logRef = push(ref(db, 'activity_log'));
            await set(logRef, {
                text: `${user?.name} حذف السجل التالف الخاص بـ "${itemToDelete.name}"`,
                timestamp: serverTimestamp()
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow">
                <h1 className="text-2xl font-bold text-primary">التوالف</h1>
                <p className="text-gray-600">قائمة بجميع المعدات التالفة والمسجلة.</p>
            </div>
            {isLoading ? (
                <p>جاري تحميل قائمة التوالف...</p>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-x-auto">
                    <table className="w-full text-sm text-right text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">اسم المعدة</th>
                                <th scope="col" className="px-6 py-3">الكمية</th>
                                <th scope="col" className="px-6 py-3">السبب</th>
                                <th scope="col" className="px-6 py-3">المسؤول</th>
                                <th scope="col" className="px-6 py-3">تاريخ التبليغ</th>
                                {canManage && <th scope="col" className="px-6 py-3">إجراءات</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {damagedItems.length > 0 ? damagedItems.map(item => (
                                <tr key={item.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{item.name}</td>
                                    <td className="px-6 py-4">{item.quantity}</td>
                                    <td className="px-6 py-4">{item.reason}</td>
                                    <td className="px-6 py-4">{item.responsiblePersonName}</td>
                                    <td className="px-6 py-4">{new Date(item.timestamp).toLocaleString('ar-EG')}</td>
                                    {canManage && (
                                        <td className="px-6 py-4">
                                            <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700">
                                                <TrashIcon />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={canManage ? 6 : 5} className="text-center py-10">لا توجد عناصر تالفة حالياً.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default DamagedPage;