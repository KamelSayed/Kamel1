
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { db } from './services/firebase';
import { ref, onValue, off, set, push, serverTimestamp, query, orderByChild, limitToLast, remove, update } from 'firebase/database';
import { User, UserRole, UserStatus, ActivityLog } from './types';

// Pages
import LoginPage from './pages/LoginPage';
import WarehousePage from './pages/WarehousePage';
import BoxesPage from './pages/BoxesPage';
import DamagedPage from './pages/DamagedPage';
import UsersPage from './pages/UsersPage';

// Components
import { Header } from './components/Header';
import { Footer } from './components/Footer';

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = (userData: User) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  const authContextValue: AuthContextType = {
    user,
    login,
    logout,
  };

  return <AuthContext.Provider value={authContextValue}>{children}</AuthContext.Provider>;
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);

  useEffect(() => {
    const logRef = query(ref(db, 'activity_log'), orderByChild('timestamp'), limitToLast(10));
    const unsubscribe = onValue(logRef, (snapshot) => {
      const data: Record<string, ActivityLog> = snapshot.val();
      if (data) {
        const logs = Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
        setActivityLog(logs);
      } else {
        setActivityLog([]);
      }
    });

    return () => off(logRef, 'value', unsubscribe);
  }, []);

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-light text-dark">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-6">
        <Routes>
          <Route path="/" element={<Navigate to="/boxes" />} />
          <Route path="/warehouse" element={<WarehousePage />} />
          <Route path="/boxes" element={<BoxesPage />} />
          <Route path="/damaged" element={<DamagedPage />} />
          {user.role === UserRole.ADMIN && <Route path="/users" element={<UsersPage />} />}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <Footer logs={activityLog} />
    </div>
  );
};


const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  );
};

export default App;
