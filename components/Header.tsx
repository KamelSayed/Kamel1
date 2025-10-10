
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { db } from '../services/firebase';
import { ref, onValue } from 'firebase/database';
import { User, UserRole, UserStatus } from '../types';
import { WarehouseIcon, BoxIcon, DamagedIcon, UsersIcon, LogoutIcon } from './icons';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pendingUsersCount, setPendingUsersCount] = useState(0);

  useEffect(() => {
    if (user?.role !== UserRole.ADMIN) return;
    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
        const usersData = snapshot.val();
        if (usersData) {
            const usersList: User[] = Object.values(usersData);
            const pendingCount = usersList.filter(u => u.status === UserStatus.PENDING).length;
            setPendingUsersCount(pendingCount);
        }
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/boxes', label: 'الصناديق', icon: BoxIcon },
    { to: '/warehouse', label: 'المخزن', icon: WarehouseIcon },
    { to: '/damaged', label: 'التوالف', icon: DamagedIcon },
  ];

  if (user?.role === UserRole.ADMIN) {
    navItems.push({ to: '/users', label: 'المستخدمين', icon: UsersIcon });
  }

  const activeLinkClass = 'bg-accent text-white';
  const inactiveLinkClass = 'text-white hover:bg-white hover:bg-opacity-20';

  return (
    <header className="bg-primary shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-white">إدارة معدات المصنع</h1>
          </div>
          
          <nav className="hidden md:flex items-center space-x-1 space-x-reverse">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${isActive ? activeLinkClass : inactiveLinkClass}`
                }
              >
                <item.icon className="w-5 h-5 ml-2" />
                <span>{item.label}</span>
                {item.to === '/users' && pendingUsersCount > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center mr-2">{pendingUsersCount}</span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center">
            <div className="text-white text-sm mx-4">
              مرحباً، {user?.name}
            </div>
            <button
              onClick={handleLogout}
              title="تسجيل الخروج"
              className="p-2 rounded-full text-white hover:bg-white hover:bg-opacity-20 transition-colors duration-200"
            >
              <LogoutIcon />
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center justify-around bg-primary p-2">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center p-2 rounded-md text-xs font-medium transition-colors duration-200 ${isActive ? activeLinkClass : inactiveLinkClass}`
                }
              >
                <item.icon className="w-6 h-6 mb-1" />
                <span>{item.label}</span>
                {item.to === '/users' && pendingUsersCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center transform translate-x-1/2 -translate-y-1/2">{pendingUsersCount}</span>
                )}
              </NavLink>
            ))}
        </div>
      </div>
    </header>
  );
};
