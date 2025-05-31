import { Outlet } from 'react-router-dom';


const Layout: React.FC = () => {
  return (
    <div className="min-h-screen ">
      <main>
        <Outlet />
      </main>
     
    </div>
  );
};

export default Layout;
