import React, { useState } from 'react';
import { useAuth } from '../App';
import { db } from '../services/firebase';
import { ref, query, orderByChild, equalTo, get, set, push } from 'firebase/database';
import { User, UserRole, UserStatus } from '../types';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if(phoneNumber === 'admin123' && password === 'admin123') {
        const adminUser: User = {
            id: 'admin',
            name: 'المدير العام',
            phoneNumber: 'admin',
            role: UserRole.ADMIN,
            status: UserStatus.APPROVED,
        };
        login(adminUser);
        return;
    }

    try {
      const usersRef = ref(db, 'users');
      const q = query(usersRef, orderByChild('phoneNumber'), equalTo(phoneNumber));
      const snapshot = await get(q);

      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const userId = Object.keys(usersData)[0];
        const user: User = { id: userId, ...usersData[userId] };
        
        if (user.password === password) {
            if(user.status === UserStatus.APPROVED) {
                login(user);
            } else if (user.status === UserStatus.PENDING) {
                setError('حسابك قيد المراجعة. يرجى انتظار موافقة المسؤول.');
            } else {
                setError('تم رفض حسابك. يرجى التواصل مع الإدارة.');
            }
        } else {
          setError('رقم الهاتف أو كلمة المرور غير صحيحة.');
        }
      } else {
        setError('رقم الهاتف أو كلمة المرور غير صحيحة.');
      }
    } catch (err) {
      setError('حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !phoneNumber || !password) {
        setError('يرجى ملء جميع الحقول.');
        return;
    }

    const phoneRegex = /^(010|011|012|015)\d{8}$/;
    if (!phoneRegex.test(phoneNumber)) {
        setError('رقم الهاتف غير صالح. يجب أن يبدأ بـ 010, 011, 012, أو 015 ويتكون من 11 رقمًا.');
        return;
    }

    try {
        const usersRef = ref(db, 'users');
        const q = query(usersRef, orderByChild('phoneNumber'), equalTo(phoneNumber));
        const snapshot = await get(q);

        if(snapshot.exists()) {
            setError('رقم الهاتف هذا مسجل بالفعل.');
            return;
        }

        const newUserRef = push(usersRef);
        const newUser: Omit<User, 'id'> = {
            name,
            phoneNumber,
            password,
            role: UserRole.USER,
            status: UserStatus.PENDING,
        };
        await set(newUserRef, newUser);
        setSuccess('تم إرسال طلبك بنجاح. سيتم مراجعته من قبل المسؤول.');
        setIsRegistering(false);
        setName('');
        setPhoneNumber('');
        setPassword('');
    } catch (err) {
        setError('حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.');
    }
  };

  return (
    <div className="min-h-screen bg-light flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">إدارة معدات المصنع</h1>
          <p className="text-gray-500 mt-2">
            {isRegistering ? 'إنشاء حساب جديد' : 'تسجيل الدخول إلى حسابك'}
          </p>
        </div>
        
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">{error}</div>}
        {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">{success}</div>}

        <form className="space-y-4" onSubmit={isRegistering ? handleRegister : handleLogin}>
          {isRegistering && (
            <div>
              <label htmlFor="name" className="text-sm font-medium text-gray-700 block mb-2">الاسم الكامل</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                required
              />
            </div>
          )}
          <div>
            <label htmlFor="phone" className="text-sm font-medium text-gray-700 block mb-2">رقم الهاتف</label>
            <input
              id="phone"
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium text-gray-700 block mb-2">كلمة المرور</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              required
            />
          </div>
          
          <button type="submit" className="w-full bg-primary text-white py-2 rounded-md hover:bg-blue-600 transition-colors">
            {isRegistering ? 'إرسال طلب' : 'تسجيل الدخول'}
          </button>
        </form>

        <div className="text-center text-sm">
          <button onClick={() => { setIsRegistering(!isRegistering); setError(''); setSuccess(''); }} className="text-primary hover:underline">
            {isRegistering ? 'لديك حساب بالفعل؟ تسجيل الدخول' : 'ليس لديك حساب؟ طلب وصول'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;