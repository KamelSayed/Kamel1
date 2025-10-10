import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { ref, onValue, update, remove, push, set, query, orderByChild, equalTo, get, serverTimestamp } from 'firebase/database';
import { useAuth } from '../App';
import { User, UserRole, UserStatus } from '../types';
import { CheckCircleIcon, XCircleIcon, TrashIcon, PlusCircleIcon } from '../components/icons';

const UsersPage: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newUserData, setNewUserData] = useState({ name: '', phoneNumber: '', password: '', role: UserRole.USER });
    const [modalError, setModalError] = useState('');

    useEffect(() => {
        if (currentUser?.role !== UserRole.ADMIN) return;

        const usersRef = ref(db, 'users');
        const unsubscribe = onValue(usersRef, (snapshot) => {
            const data = snapshot.val();
            const loadedUsers: User[] = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
            setUsers(loadedUsers);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handleUpdateUserStatus = (userId: string, status: UserStatus) => {
        const updates: any = {};
        updates[`/users/${userId}/status`] = status;
        update(ref(db), updates);
    };

    const handleUpdateUserRole = (userId: string, role: UserRole) => {
        const updates: any = {};
        updates[`/users/${userId}/role`] = role;
        update(ref(db), updates);
    };

    const handleDeleteUser = (userId: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذا المستخدم نهائياً؟')) {
            remove(ref(db, `users/${userId}`));
        }
    };
    
    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setModalError('');
    
        if (!newUserData.name || !newUserData.phoneNumber || !newUserData.password) {
            setModalError('يرجى ملء جميع الحقول.');
            return;
        }
    
        const phoneRegex = /^(010|011|012|015)\d{8}$/;
        if (!phoneRegex.test(newUserData.phoneNumber)) {
            setModalError('رقم الهاتف غير صالح. يجب أن يبدأ بـ 010, 011, 012, أو 015 ويتكون من 11 رقمًا.');
            return;
        }
    
        try {
            const usersRef = ref(db, 'users');
            const q = query(usersRef, orderByChild('phoneNumber'), equalTo(newUserData.phoneNumber));
            const snapshot = await get(q);
    
            if (snapshot.exists()) {
                setModalError('رقم الهاتف هذا مسجل بالفعل.');
                return;
            }
    
            const newUserRef = push(usersRef);
            const newUser: Omit<User, 'id'> = {
                name: newUserData.name,
                phoneNumber: newUserData.phoneNumber,
                password: newUserData.password,
                role: newUserData.role,
                status: UserStatus.APPROVED, // Admin created users are approved by default
            };
            await set(newUserRef, newUser);
            
            const logRef = push(ref(db, 'activity_log'));
            await set(logRef, {
                text: `${currentUser?.name} أنشأ مستخدمًا جديدًا: ${newUserData.name}`,
                timestamp: serverTimestamp()
            });
            
            setIsCreateModalOpen(false);
            setNewUserData({ name: '', phoneNumber: '', password: '', role: UserRole.USER });
    
        } catch (err) {
            setModalError('حدث خطأ أثناء إنشاء المستخدم. يرجى المحاولة مرة أخرى.');
        }
    };

    if (currentUser?.role !== UserRole.ADMIN) {
        return <div className="text-center p-10">ليس لديك صلاحية الوصول لهذه الصفحة.</div>;
    }

    const pendingUsers = users.filter(u => u.status === UserStatus.PENDING);
    const approvedUsers = users.filter(u => u.status === UserStatus.APPROVED);

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold mb-4 text-primary">طلبات الوصول الجديدة</h2>
                {pendingUsers.length > 0 ? (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <ul className="divide-y divide-gray-200">
                            {pendingUsers.map(user => (
                                <li key={user.id} className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold">{user.name}</p>
                                        <p className="text-sm text-gray-500">{user.phoneNumber}</p>
                                    </div>
                                    <div className="flex items-center space-x-2 space-x-reverse">
                                        <button onClick={() => handleUpdateUserStatus(user.id, UserStatus.APPROVED)} className="text-green-500 hover:text-green-700 p-2 rounded-full bg-green-100">
                                            <CheckCircleIcon />
                                        </button>
                                        <button onClick={() => handleUpdateUserStatus(user.id, UserStatus.REJECTED)} className="text-red-500 hover:text-red-700 p-2 rounded-full bg-red-100">
                                            <XCircleIcon />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <p className="text-gray-600">لا توجد طلبات جديدة.</p>
                )}
            </div>

            <div>
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-primary">إدارة المستخدمين الحاليين</h2>
                    <button onClick={() => { setIsCreateModalOpen(true); setModalError(''); }} className="flex items-center bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-blue-600 transition-colors">
                        <PlusCircleIcon className="w-5 h-5 ml-2" />
                        إضافة مستخدم جديد
                    </button>
                </div>
                {isLoading ? <p>جاري تحميل المستخدمين...</p> : (
                    <div className="bg-white rounded-lg shadow overflow-x-auto">
                        <table className="w-full text-sm text-right text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3">الاسم</th>
                                    <th className="px-6 py-3">رقم الهاتف</th>
                                    <th className="px-6 py-3">الصلاحية</th>
                                    <th className="px-6 py-3">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {approvedUsers.map(user => (
                                    <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                                        <td className="px-6 py-4">{user.phoneNumber}</td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={user.role}
                                                onChange={(e) => handleUpdateUserRole(user.id, e.target.value as UserRole)}
                                                className="border-gray-300 rounded-md shadow-sm"
                                                disabled={user.id === 'admin' || user.phoneNumber === 'admin123' }
                                            >
                                                <option value={UserRole.USER}>مستخدم</option>
                                                <option value={UserRole.MODERATOR}>مشرف</option>
                                                <option value={UserRole.ADMIN}>مدير</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            {(user.id !== 'admin' && user.phoneNumber !== 'admin123') && (
                                                <button onClick={() => handleDeleteUser(user.id)} className="text-red-500 hover:text-red-700">
                                                    <TrashIcon />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-6">إنشاء مستخدم جديد</h2>
                        {modalError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{modalError}</div>}
                        <form onSubmit={handleCreateUser} className="space-y-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700">الاسم الكامل</label>
                                <input type="text" value={newUserData.name} onChange={e => setNewUserData({...newUserData, name: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">رقم الهاتف</label>
                                <input type="text" value={newUserData.phoneNumber} onChange={e => setNewUserData({...newUserData, phoneNumber: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">كلمة المرور</label>
                                <input type="password" value={newUserData.password} onChange={e => setNewUserData({...newUserData, password: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">الصلاحية</label>
                                <select value={newUserData.role} onChange={e => setNewUserData({...newUserData, role: e.target.value as UserRole})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required>
                                    <option value={UserRole.USER}>مستخدم</option>
                                    <option value={UserRole.MODERATOR}>مشرف</option>
                                    <option value={UserRole.ADMIN}>مدير</option>
                                </select>
                            </div>
                            <div className="flex justify-end space-x-4 space-x-reverse pt-4">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">إلغاء</button>
                                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-600">إنشاء المستخدم</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersPage;