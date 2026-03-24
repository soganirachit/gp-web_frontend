import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { storeService } from '../services/store.service';

interface AuthContextType {
  isLoggedIn: boolean;
  phoneNumber: string | null;
  checkLoginStatus: () => boolean;
  login: (phone: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return !!localStorage.getItem('access_token');
  });
  const [phoneNumber, setPhoneNumber] = useState<string | null>(() => {
    return localStorage.getItem('phoneNumber');
  });

  useEffect(() => {
    const handleStorageChange = () => {
      checkLoginStatus();
    };

    // Listen for tokenRemoved event (fired when session expires)
    const handleTokenRemoved = () => {
      checkLoginStatus();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('tokenRemoved', handleTokenRemoved);
    checkLoginStatus(); // Initial check

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('tokenRemoved', handleTokenRemoved);
    };
  }, []);

  const checkLoginStatus = () => {
    const token = localStorage.getItem('access_token');
    const phone = localStorage.getItem('phoneNumber');
    const isValid = !!token;
    setIsLoggedIn(isValid);
    setPhoneNumber(phone);
    return isValid;
  };

  const login = (phone: string) => {
    localStorage.setItem('phoneNumber', phone);
    setIsLoggedIn(true);
    setPhoneNumber(phone);

    // Clear temporary store ID when user logs in
    storeService.clearTemporaryStoreId();
  };

  const logout = async () => {
    const { authService } = await import('../services/auth.service');
    const result = await authService.logout();

    setIsLoggedIn(false);
    setPhoneNumber(null);

    if (!result.success) {
      console.warn('Logout API call had issues, but local logout completed:', result.message);
    }
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, phoneNumber, checkLoginStatus, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
