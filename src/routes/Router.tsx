import { createBrowserRouter, RouterProvider,  } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import ProtectedRoute from './ProtectedRoute';

// Context
import { StoreProvider } from '../context/StoreContext';

// ================== PUBLIC ROUTES COMPONENTS ==================
// Main Pages
import Unsubscribed_User_Home from '../pages/Unsubscribed_User_Home';
import Main_Home_page from '../pages/Main_homepage';
import Products from '../components/ProductPage/page';
import ProductPage from '../components/ProductPage/ProductDisplaypage';
import Search from '../components/ProductPage/SearchPage';

// Auth Components

import Login from '../components/Customer/forms/login/Login';
import OTPVerification from '../components/Customer/forms/login/Otp_verification';

import NameInput from '../components/Customer/forms/login/NameInput';
import Allset from '../components/Customer/forms/login/Allset';


// // Admin Pages
// import AdminLogin from '../components/Admin/Login';
// import { AdminDashboard } from '../components/Admin/App';

// // GP Buddy Components
// import { App as GpBuddyApp } from "../components/Gp_Buddy/src/App";

// ================== PROTECTED ROUTES COMPONENTS ==================
// Store Components



// Account Management
import MorePage from '../pages/More/Settings';
import Profile from '../pages/More/Account&Perferenecs/Profile/EditProfile';
import Addresses from '../pages/More/Addresses';
import AddAddress from '../pages/More/AddEditAddress';
import EditAddress from '../pages/More/AddEditAddress';

// Features
import Location from '../features/location/Home_page_location';
import OrderManagement from '../features/orders/components/OrderManagement';

// Subscription Components
import ManageMySubscription from '../components/Subscription/ManageMySubscription';
import AddressSelection from '../components/Subscription/AddressSelection';
import StoreAddress from '../components/StoreProductsPage/storeAddress';
import ConfirmSubscription from '../components/Subscription/ConfirmSubscription';
import ModifySubscription from '../components/Subscription/Page/Modify_subscription';
import PausedSubscriptionLanding from '../components/Subscription/Page/Paused_susbcription_Landing';
import CancelSubscriptionLanding from '../components/Subscription/Page/Cancel_subscription_Landingpage';

// Payment Components
import Wallet from '../components/Payment/Wallet/wallet';

// Other Components
import Refer from '../pages/Refer/Refer';
import CustomerSupport from '../pages/More/CustomerSupport';
import StoreProductsPages from '@/components/StoreProductsPage/page';
import StorePage from '@/components/StoreProductsPage/storeProductsDisplayPage';
import ManageMyStoreProducts from '@/components/StoreProductsPage/manageMyStoreProducts';
import ConfirmStoreProducts from '@/components/StoreProductsPage/confirmStoreProducts';



const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      // ================== PUBLIC ROUTES ==================
      // Main Pages
      { path: '/home', element: <Unsubscribed_User_Home /> },
      { path: '/', element: <Main_Home_page /> },
      { path: '/NewUser', element: <Unsubscribed_User_Home /> },
      { path: '/Products', element: <Products /> },
      { path: '/product/:id', element: <ProductPage /> },
      { path: '/store/:id', element: <StorePage /> },
      { path: '/search', element: <Search /> },
      { path: '/store', element: <StoreProductsPages /> },
    

      // Auth Routes

      { path: '/login', element: <Login /> },
      { path: '/otp-Verification', element: <OTPVerification /> },
      { path: '/Name-input', element: <NameInput /> },
      { path: '/Allset', element: <Allset /> },


      // // Admin Routes
      // { path: '/admin/login', element: <AdminLogin /> },
      // { path: '/admin/*', element: <AdminDashboard /> },

      // // GP Buddy Routes
      // { path: '/buddy/*', element: <GpBuddyApp /> },

      // ================== PROTECTED ROUTES ==================
      // Store Routes



      // Account Management Routes
      { path: '/Account', element: <ProtectedRoute><MorePage /></ProtectedRoute> },
      { path: '/Profile', element: <ProtectedRoute><Profile /></ProtectedRoute> },
      { path: '/addresses', element: <ProtectedRoute><Addresses /></ProtectedRoute> },
      { path: '/addresses/add', element: <ProtectedRoute><AddAddress /></ProtectedRoute> },
      { path: '/addresses/edit', element: <ProtectedRoute><EditAddress /></ProtectedRoute> },

      // Feature Routes
      { path: '/location', element: <ProtectedRoute><Location /></ProtectedRoute> },
      { path: '/orders', element: <ProtectedRoute><OrderManagement /></ProtectedRoute> },

      // Subscription Routes
       { path: '/manage-my-storeProducts', element: <ProtectedRoute><ManageMyStoreProducts /></ProtectedRoute> },
      { path: '/manage-my-subscription', element: <ProtectedRoute><ManageMySubscription /></ProtectedRoute> },
      { path: '/manage-subscription', element: <ProtectedRoute><ManageMySubscription /></ProtectedRoute> },
      { path: '/address-selection', element: <ProtectedRoute><AddressSelection /></ProtectedRoute> },
      { path: '/storeAddress-selection', element: <ProtectedRoute><StoreAddress /></ProtectedRoute> },
      { path: '/subscription/confirm', element: <ProtectedRoute><ConfirmSubscription /></ProtectedRoute> },
      { path: '/storeProduct/confirm', element: <ProtectedRoute><ConfirmStoreProducts /></ProtectedRoute> },
      { path: '/modify-Subscription', element: <ProtectedRoute><ModifySubscription /></ProtectedRoute> },
      { path: '/Pause-Subscription', element: <ProtectedRoute><PausedSubscriptionLanding /></ProtectedRoute> },
      { path: '/Cancel-Subscription', element: <ProtectedRoute><CancelSubscriptionLanding /></ProtectedRoute> },

      // Payment Routes 
      { path: '/wallet', element: <ProtectedRoute><Wallet /></ProtectedRoute> },

      // Other Protected Routes
      { path: '/refer', element: <ProtectedRoute><Refer /></ProtectedRoute> },
      { path: '/customer-support', element: <ProtectedRoute><CustomerSupport /></ProtectedRoute> },
    ],
  },
]);

const Router = () => {
  return (
    <StoreProvider>
      <RouterProvider router={router} />
    </StoreProvider>
  );
};

export default Router;