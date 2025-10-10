
import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { ref, onValue, set, push, update, remove, serverTimestamp } from 'firebase/database';
import { useAuth } from '../App';
import { Box, BoxStatus, WarehouseItem, UserRole, BoxItem, ItemCondition, Comment, BoxActivityLog } from '../types';
import { PlusCircleIcon, InfoIcon, TrashIcon } from '../components/icons';

const BoxDetailsModal: React.FC<{ box: Box, onClose: () => void, warehouseItems: WarehouseItem[], canManage: boolean }> = ({ box, onClose, warehouseItems, canManage }) => {
    const { user } = useAuth();
    const [newItem, setNewItem] = useState<{ id: string, name: string, quantity: number }>({ id: '', name: '', quantity: 1 });
    const [newComment, setNewComment] = useState("");

    const logActivity = (text: string) => {
        const logRef = push(ref(db, `boxes/${box.id}/activityLog`));
        const newLog: Omit<BoxActivityLog, 'id'> = {
            text: `${user?.name} ${text}`,
            timestamp: serverTimestamp(),
            userName: user?.name || 'مستخدم غير معروف',
        };
        set(logRef, newLog);
        
        const globalLogRef = push(ref(db, 'activity_log'));
        set(globalLogRef, {
            text: `(صندوق ${box.boxNumber || 'بلا رقم'}): ${user?.name} ${text}`,
            timestamp: serverTimestamp()
        })
    };
    
    const handleAddItem = async () => {
        if (!newItem.id || newItem.quantity <= 0) {
            alert("يرجى اختيار عنصر وتحديد كمية صالحة.");
            return;
        }

        const warehouseItem = warehouseItems.find(item => item.id === newItem.id);
        if (!warehouseItem || warehouseItem.quantity < newItem.quantity) {
            alert("الكمية المطلوبة غير متوفرة في المخزن.");
            return;
        }

        const updates: any = {};
        const newWarehouseQuantity = warehouseItem.quantity - newItem.quantity;
        updates[`/warehouse/${newItem.id}/quantity`] = newWarehouseQuantity;

        const existingItem = box.items && box.items[newItem.id];
        if (existingItem) {
            updates[`/boxes/${box.id}/items/${newItem.id}/quantity`] = existingItem.quantity + newItem.quantity;
        } else {
            updates[`/boxes/${box.id}/items/${newItem.id}`] = {
                id: newItem.id,
                name: newItem.name,
                quantity: newItem.quantity,
                condition: ItemCondition.NEW
            };
        }
        
        await update(ref(db), updates);
        logActivity(`أضاف ${newItem.quantity} من "${newItem.name}"`);
        setNewItem({ id: '', name: '', quantity: 1 });
    };

    const handleRemoveItem = async (item: BoxItem) => {
        const quantityToRemove = parseInt(prompt(`كم الكمية التي تريد إزالتها من "${item.name}"؟`, String(item.quantity)) || '0', 10);
        if (isNaN(quantityToRemove) || quantityToRemove <= 0 || quantityToRemove > item.quantity) {
            alert("كمية غير صالحة.");
            return;
        }

        const condition: ItemCondition = prompt(`ما هي حالة العناصر المزالة؟ (${ItemCondition.USED}, ${ItemCondition.DAMAGED})`, ItemCondition.USED) as ItemCondition;
        if (!Object.values(ItemCondition).includes(condition)) {
            alert("حالة غير صالحة.");
            return;
        }

        const updates: any = {};
        const newBoxItemQuantity = item.quantity - quantityToRemove;

        if (newBoxItemQuantity > 0) {
            updates[`/boxes/${box.id}/items/${item.id}/quantity`] = newBoxItemQuantity;
        } else {
            updates[`/boxes/${box.id}/items/${item.id}`] = null;
        }

        if (condition === ItemCondition.DAMAGED) {
            const reason = prompt("ما هو سبب التلف؟");
            const newDamagedItemRef = push(ref(db, 'damaged'));
            updates[`/damaged/${newDamagedItemRef.key}`] = {
                itemId: item.id,
                name: item.name,
                quantity: quantityToRemove,
                reason: reason || 'غير محدد',
                responsiblePersonName: box.recipientName || 'غير محدد',
                timestamp: serverTimestamp(),
                fromBoxId: box.id
            };
             logActivity(`أبلغ عن تلف ${quantityToRemove} من "${item.name}"`);
        } else {
            const warehouseItemRef = ref(db, `/warehouse/${item.id}`);
            const warehouseItem = warehouseItems.find(wi => wi.id === item.id);
            if (warehouseItem) {
                updates[`/warehouse/${item.id}/quantity`] = warehouseItem.quantity + quantityToRemove;
            }
             logActivity(`أعاد ${quantityToRemove} من "${item.name}" إلى المخزن`);
        }

        await update(ref(db), updates);
    };

    const handleUpdateBoxDetails = async (field: 'siteName' | 'recipientName' | 'status', value: string) => {
        const updates: any = {};
        updates[`/boxes/${box.id}/${field}`] = value;
        await update(ref(db), updates);
        logActivity(`غير ${field === 'siteName' ? 'الموقع' : field === 'recipientName' ? 'المستلم' : 'الحالة'} إلى "${value}"`);
    };
    
    const handlePostComment = async () => {
        if (!newComment.trim() || !user) return;
        const newCommentRef = push(ref(db, `boxes/${box.id}/comments`));
        const comment: Omit<Comment, 'id'> = {
            userId: user.id,
            userName: user.name,
            text: newComment,
            timestamp: serverTimestamp(),
        };
        await set(newCommentRef, comment);
        setNewComment("");
        logActivity("أضاف تعليقاً جديداً");
    };

    const boxItems = box.items ? Object.values(box.items) : [];
    const comments = box.comments ? Object.values(box.comments).sort((a,b) => b.timestamp - a.timestamp) : [];
    const activityLog = box.activityLog ? Object.values(box.activityLog).sort((a,b) => b.timestamp - a.timestamp) : [];


    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-light rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b">
                    <div className="flex justify-between items-start">
                         <h2 className="text-2xl font-bold text-primary">تفاصيل الصندوق رقم: {box.boxNumber || 'N/A'}</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-800">&times;</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
                        <p><strong>المستلم:</strong> {box.recipientName || 'غير محدد'}</p>
                        <p><strong>الموقع:</strong> {box.siteName || 'غير محدد'}</p>
                        <p><strong>الحالة:</strong> <span className={`px-2 py-1 rounded-full text-xs ${box.status === BoxStatus.ACTIVE ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>{box.status}</span></p>
                    </div>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-bold text-lg mb-4">محتويات الصندوق</h3>
                            <div className="space-y-3">
                                {boxItems.length > 0 ? boxItems.map(item => (
                                    <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-md shadow-sm">
                                        <span>{item.name}</span>
                                        <div className="flex items-center gap-4">
                                            <span className="font-bold text-primary">{item.quantity}</span>
                                            {canManage && <button onClick={() => handleRemoveItem(item)} className="text-red-500 hover:text-red-700 text-sm">إزالة</button>}
                                        </div>
                                    </div>
                                )) : <p className="text-gray-500">الصندوق فارغ.</p>}
                            </div>
                             {canManage && (
                                <div className="mt-6 p-4 border rounded-lg bg-white">
                                    <h4 className="font-semibold mb-2">إضافة عنصر جديد</h4>
                                    <div className="flex gap-2">
                                        <select
                                            value={newItem.id}
                                            onChange={e => {
                                                const selectedId = e.target.value;
                                                const selectedName = warehouseItems.find(i=>i.id === selectedId)?.name || '';
                                                setNewItem({ ...newItem, id: selectedId, name: selectedName });
                                            }}
                                            className="flex-grow border-gray-300 rounded-md shadow-sm"
                                        >
                                            <option value="">اختر عنصراً</option>
                                            {warehouseItems.map(item => <option key={item.id} value={item.id}>{item.name} (المتاح: {item.quantity})</option>)}
                                        </select>
                                        <input type="number" min="1" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value)})} className="w-20 border-gray-300 rounded-md shadow-sm" />
                                        <button onClick={handleAddItem} className="bg-primary text-white px-3 py-1 rounded-md hover:bg-blue-600">إضافة</button>
                                    </div>
                                </div>
                            )}

                             {canManage && (
                                <div className="mt-6 p-4 border rounded-lg bg-white">
                                    <h4 className="font-semibold mb-2">تحديث بيانات الصندوق</h4>
                                    <div className="flex flex-col gap-2">
                                        <input type="text" placeholder="اسم الموقع الجديد" onBlur={e => e.target.value && handleUpdateBoxDetails('siteName', e.target.value)} className="border-gray-300 rounded-md shadow-sm" />
                                        <input type="text" placeholder="اسم المستلم الجديد" onBlur={e => e.target.value && handleUpdateBoxDetails('recipientName', e.target.value)} className="border-gray-300 rounded-md shadow-sm" />
                                        <select onBlur={e => handleUpdateBoxDetails('status', e.target.value)} defaultValue={box.status} className="border-gray-300 rounded-md shadow-sm">
                                            {Object.values(BoxStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>
                             )}
                        </div>

                        <div>
                            <h3 className="font-bold text-lg mb-4">التعليقات</h3>
                            <div className="space-y-3">
                                 <div className="flex gap-2">
                                    <input type="text" value={newComment} onChange={e=>setNewComment(e.target.value)} placeholder="أضف تعليقاً..." className="flex-grow border-gray-300 rounded-md shadow-sm" />
                                    <button onClick={handlePostComment} className="bg-accent text-white px-3 py-1 rounded-md hover:bg-yellow-500">نشر</button>
                                 </div>
                                 <div className="max-h-60 overflow-y-auto space-y-2 mt-2">
                                    {comments.map(c => (
                                        <div key={c.id} className="bg-white p-3 rounded-md text-sm">
                                            <p className="font-semibold">{c.userName}</p>
                                            <p>{c.text}</p>
                                            <p className="text-xs text-gray-400 mt-1">{new Date(c.timestamp).toLocaleString('ar-EG')}</p>
                                        </div>
                                    ))}
                                 </div>
                            </div>
                            
                            <h3 className="font-bold text-lg mb-4 mt-8">سجل النشاط</h3>
                            <div className="max-h-60 overflow-y-auto space-y-2">
                                {activityLog.map(log => (
                                    <div key={log.id} className="bg-white p-2 rounded-md text-xs">
                                        <p>{log.text}</p>
                                        <p className="text-gray-400">{new Date(log.timestamp).toLocaleString('ar-EG')}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


const BoxesPage: React.FC = () => {
    const { user } = useAuth();
    const [boxes, setBoxes] = useState<Box[]>([]);
    const [warehouseItems, setWarehouseItems] = useState<WarehouseItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBox, setSelectedBox] = useState<Box | null>(null);
    const [newBoxData, setNewBoxData] = useState({ boxNumber: '', recipientName: '', siteName: '' });

    useEffect(() => {
        const boxesRef = ref(db, 'boxes');
        const unsubscribeBoxes = onValue(boxesRef, (snapshot) => {
            const data = snapshot.val();
            const loadedBoxes: Box[] = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
            setBoxes(loadedBoxes.sort((a,b) => b.createdAt - a.createdAt));
            setIsLoading(false);
        });

        const warehouseRef = ref(db, 'warehouse');
        const unsubscribeWarehouse = onValue(warehouseRef, (snapshot) => {
            const data = snapshot.val();
            const loadedItems: WarehouseItem[] = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
            setWarehouseItems(loadedItems);
        });

        return () => {
            unsubscribeBoxes();
            unsubscribeWarehouse();
        };
    }, []);
    
    const canManage = user?.role === UserRole.ADMIN || user?.role === UserRole.MODERATOR;

    const handleCreateBox = async (e: React.FormEvent) => {
        e.preventDefault();
        const newBoxRef = push(ref(db, 'boxes'));
        const box: Omit<Box, 'id'> = {
            ...newBoxData,
            createdAt: serverTimestamp(),
            status: BoxStatus.ACTIVE,
            items: {},
            comments: {},
            activityLog: {}
        };
        await set(newBoxRef, box);

        const globalLogRef = push(ref(db, 'activity_log'));
        await set(globalLogRef, {
            text: `${user?.name} أنشأ صندوقًا جديدًا ${newBoxData.boxNumber ? `برقم ${newBoxData.boxNumber}` : ''}`,
            timestamp: serverTimestamp()
        })

        setNewBoxData({ boxNumber: '', recipientName: '', siteName: '' });
        setIsModalOpen(false);
    };

    const handleDeleteBox = async (boxId: string, boxNumber?: string) => {
        if (!window.confirm(`هل أنت متأكد من رغبتك في حذف الصندوق ${boxNumber || ''}؟ سيتم إعادة جميع محتوياته إلى المخزن.`)) return;

        const boxToDelete = boxes.find(b => b.id === boxId);
        if(!boxToDelete) return;

        const updates: any = {};
        // Return items to warehouse
        if(boxToDelete.items) {
            for (const item of Object.values(boxToDelete.items)) {
                const warehouseItem = warehouseItems.find(wi => wi.id === item.id);
                if (warehouseItem) {
                    updates[`/warehouse/${item.id}/quantity`] = warehouseItem.quantity + item.quantity;
                }
            }
        }
        
        // Delete the box
        updates[`/boxes/${boxId}`] = null;
        await update(ref(db), updates);

        const globalLogRef = push(ref(db, 'activity_log'));
        await set(globalLogRef, {
            text: `${user?.name} حذف الصندوق ${boxNumber || ''}`,
            timestamp: serverTimestamp()
        })
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow">
                <h1 className="text-2xl font-bold text-primary">الصناديق</h1>
                {canManage && (
                    <button onClick={() => setIsModalOpen(true)} className="flex items-center bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-blue-600 transition-colors">
                        <PlusCircleIcon className="w-5 h-5 ml-2" />
                        إنشاء صندوق جديد
                    </button>
                )}
            </div>

            {isLoading ? (
                <p>جاري تحميل الصناديق...</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {boxes.length > 0 ? boxes.map(box => (
                        <div key={box.id} className="bg-white rounded-lg shadow-md p-5 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-lg text-dark">صندوق رقم: {box.boxNumber || "غير محدد"}</h3>
                                    <span className={`px-2 py-1 rounded-full text-xs ${box.status === BoxStatus.ACTIVE ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>{box.status}</span>
                                </div>
                                <p className="text-sm text-gray-600 mt-2"><strong>المستلم:</strong> {box.recipientName || "غير محدد"}</p>
                                <p className="text-sm text-gray-600"><strong>الموقع:</strong> {box.siteName || "غير محدد"}</p>
                                <p className="text-xs text-gray-400 mt-2">تاريخ الإنشاء: {new Date(box.createdAt).toLocaleDateString('ar-EG')}</p>
                            </div>
                            <div className="flex items-center justify-between mt-4 border-t pt-3">
                                <button onClick={() => setSelectedBox(box)} className="flex items-center text-sm text-primary hover:underline">
                                    <InfoIcon className="w-4 h-4 ml-1" />
                                    فتح التفاصيل
                                </button>
                                {canManage && (
                                    <button onClick={() => handleDeleteBox(box.id, box.boxNumber)} className="text-red-500 hover:text-red-700 p-2 rounded-full"><TrashIcon className="w-5 h-5" /></button>
                                )}
                            </div>
                        </div>
                    )) : (
                        <p className="col-span-full text-center">لا توجد صناديق حالياً.</p>
                    )}
                </div>
            )}
            
            {isModalOpen && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-6">إنشاء صندوق جديد</h2>
                        <form onSubmit={handleCreateBox} className="space-y-4">
                            <input type="text" placeholder="رقم الصندوق (اختياري)" value={newBoxData.boxNumber} onChange={e => setNewBoxData({...newBoxData, boxNumber: e.target.value})} className="w-full border border-gray-300 rounded-md py-2 px-3"/>
                            <input type="text" placeholder="اسم المستلم (اختياري)" value={newBoxData.recipientName} onChange={e => setNewBoxData({...newBoxData, recipientName: e.target.value})} className="w-full border border-gray-300 rounded-md py-2 px-3"/>
                            <input type="text" placeholder="اسم الموقع (اختياري)" value={newBoxData.siteName} onChange={e => setNewBoxData({...newBoxData, siteName: e.target.value})} className="w-full border border-gray-300 rounded-md py-2 px-3"/>
                            <div className="flex justify-end gap-4 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">إلغاء</button>
                                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-600">إنشاء</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedBox && <BoxDetailsModal box={selectedBox} onClose={() => setSelectedBox(null)} warehouseItems={warehouseItems} canManage={canManage} />}
        </div>
    );
};

export default BoxesPage;
