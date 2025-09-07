import React from "react";
import { Outlet } from 'react-router-dom';
import FixedHeader from "./FixedHeader";
import BottomNav from "./BottomNav";


const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FFFBEB]">

      {/* Fixed Header */}
      <FixedHeader />

      <main>
        <Outlet/>
      </main>

      {/* Bottom navigation */}
      <BottomNav />
     
    </div>
  );
};

export default Layout;
