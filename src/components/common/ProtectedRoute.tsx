import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getFeatureFromPath } from '../../config/features';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isLoggedIn } = useAuth();
  const location = useLocation();

  const isAuthenticated = isLoggedIn && !!localStorage.getItem('access_token');

  if (!isAuthenticated) {
    // Detect feature from the attempted URL path
    const feature = getFeatureFromPath(location.pathname);
    const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
    const loginPath = `${basePath}/login`;
    
    // Redirect to feature-prefixed login page but save the attempted location
    return <Navigate to={loginPath} state={{ from: location, returnUrl: location.pathname }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 