import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { storeService } from '../services/store.service';

interface AuthContextType {
  isLoggedIn: boolean;
  phoneNumber: string | null;
  checkLoginStatus: () => boolean;
  login: (token: string, phone: string, refreshToken?: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    // Initialize state from localStorage on first load
    const token = localStorage.getItem('token');
    const phone = localStorage.getItem('phoneNumber');
    return !!(token && phone);
  });
  const [phoneNumber, setPhoneNumber] = useState<string | null>(() => {
    // Initialize phone from localStorage on first load
    return localStorage.getItem('phoneNumber');
  });

  const checkLoginStatus = useCallback(() => {
    const token = localStorage.getItem('token');
    const phone = localStorage.getItem('phoneNumber');
    const isValid = !!(token && phone);
    setIsLoggedIn(isValid);
    setPhoneNumber(phone);
    return isValid;
  }, []);

  useEffect(() => {
    // Check login status whenever the component mounts or localStorage changes
    const handleStorageChange = () => {
      checkLoginStatus();
    };

    window.addEventListener('storage', handleStorageChange);
    checkLoginStatus(); // Initial check

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [checkLoginStatus]);

  const login = (token: string, phone: string, refreshToken?: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('phoneNumber', phone);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
    setIsLoggedIn(true);
    setPhoneNumber(phone);
    
    // Clear temporary store ID when user logs in (they'll use their selected store)
    storeService.clearTemporaryStoreId();
  };

  const logout = async () => {
    // Call authService logout which handles API call and always clears localStorage
    const { authService } = await import('../services/auth.service');
    const result = await authService.logout();
    
    // Update local state regardless of API call result
    setIsLoggedIn(false);
    setPhoneNumber(null);
    
    // Log if there was an issue (but still proceed with logout)
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