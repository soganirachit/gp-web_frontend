import React from "react";
import { Outlet, useLocation } from 'react-router-dom';
import FixedHeader from "./FixedHeader";
import BottomNav from "./BottomNav";


const Layout: React.FC = () => {
  const location = useLocation();
  
  // Define auth routes that should not show BottomNav
  const authRoutes = ['/login', '/otp-verification', '/name-input', '/allset'];
  const isAuthRoute = authRoutes.includes(location.pathname);
  
  // Routes that render their own BottomNav (no need for Layout padding)
  const routesWithOwnBottomNav = ['/account', '/Account'];
  const hasOwnBottomNav = routesWithOwnBottomNav.includes(location.pathname);
  
  // Routes that should not show BottomNav (location/address pages)
  const routesWithoutBottomNav = ['/location', '/addresses/add', '/addresses/edit'];
  const shouldHideBottomNav = routesWithoutBottomNav.includes(location.pathname);

  return (
    <div className="min-h-screen bg-[#FFFBEB]">

      {/* Fixed Header - Hide on auth routes */}
      {!isAuthRoute && <FixedHeader />}

      <main className={!isAuthRoute && !hasOwnBottomNav && !shouldHideBottomNav ? "pt-4" : ""}>
        <div className={!isAuthRoute && !hasOwnBottomNav && !shouldHideBottomNav ? "min-h-[calc(100vh-144px)] pb-20" : ""}>
          <Outlet/>
        </div>
      </main>

      {/* Bottom navigation */}
      {/* <BottomNav /> */}
      {!isAuthRoute && !hasOwnBottomNav && !shouldHideBottomNav && <BottomNav />}
     
    </div>
  );
};

export default Layout;
