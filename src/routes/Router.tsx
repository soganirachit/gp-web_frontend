import { createBrowserRouter, RouterProvider, } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import ProtectedRoute from './ProtectedRoute';

// Context
import { StoreProvider } from '../context/StoreContext';

// ================== PUBLIC ROUTES COMPONENTS ==================
// Main Pages
import Unsubscribed_User_Home from '../pages/Unsubscribed_User_Home';
import Gp_daily_Homepage from '../pages/GpDaily_Homepage';
import HomePage from '../pages/home_page';
import Products from '../components/ProductPage/page';
import ProductPage from '../components/ProductPage/ProductDisplaypage';
import Search from '../components/ProductPage/SearchPage';
import ExploreMore from '../components/ProductPage/ExploreMore';

// Auth Components
import Startup from '../components/Customer/forms/login/Startup';
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
import OrderManagement from '../components/Order/MyOrders';

// Subscription Components
import ManageMySubscription from '../components/Subscription/ManageMySubscription';
import AddressSelection from '../components/Subscription/AddressSelection';
import ConfirmSubscription from '../components/Subscription/ConfirmSubscription';
import ModifySubscription from '../components/Subscription/Page/Modify_subscription';
import PausedSubscriptionLanding from '../components/Subscription/Page/Paused_susbcription_Landing';
import PauseSubscription from '../components/Subscription/Page/PauseSubscription';
import CancelSubscriptionLanding from '../components/Subscription/Page/Cancel_subscription_Landingpage';
import CancelSubscriptionReason from '../components/Subscription/Page/CancelSubscriptionReason';
import CancelSubscriptionSuccess from '../components/Subscription/Page/CancelSubscriptionSuccess';

// Payment Components
import Wallet from '../components/Payment/Wallet/wallet';
import PaymentSuccessful from '../components/Payment/payment_successful';

// Other Components
import Refer from '../pages/Refer/Refer';
import CustomerSupport from '../pages/More/CustomerSupport';
import FAQ from '../pages/More/FAQ';
import StoreProductsPages from '@/components/StoreProductsPage/page';
import StorePage from '@/components/StoreProductsPage/storeProductsDisplayPage';
import ManageMyStoreProducts from '@/components/StoreProductsPage/manageMyStoreProducts';




const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      // ================== PUBLIC ROUTES ==================
      // Startup/Splash Screen - shown first
      { path: '/', element: <Startup /> },
      { path: '/startup', element: <Startup /> },
      // Main Pages

      { path: '/gp-daily', element: <Gp_daily_Homepage /> },
      { path: '/NewUser', element: <Unsubscribed_User_Home /> },
      { path: '/Products', element: <Products /> },
      { path: '/product/:id', element: <ProductPage /> },
      { path: '/store/:id', element: <StorePage /> },
      { path: '/search', element: <Search /> },
      { path: '/store', element: <StoreProductsPages /> },
      { path: '/explore-more', element: <ExploreMore /> },


      // Auth Routes
      { path: '/login', element: <Login /> },
      { path: '/otp-verification', element: <OTPVerification /> },
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
      { path: '/subscription/confirm', element: <ProtectedRoute><ConfirmSubscription /></ProtectedRoute> },
      { path: '/modify-Subscription', element: <ProtectedRoute><ModifySubscription /></ProtectedRoute> },
      { path: '/pause-subscription', element: <ProtectedRoute><PauseSubscription /></ProtectedRoute> },
      { path: '/subscription-paused', element: <ProtectedRoute><PausedSubscriptionLanding /></ProtectedRoute> },
      { path: '/Cancel-Subscription', element: <ProtectedRoute><CancelSubscriptionLanding /></ProtectedRoute> },
      { path: '/cancel-subscription', element: <ProtectedRoute><CancelSubscriptionLanding /></ProtectedRoute> },
      { path: '/cancel-subscription-reason', element: <ProtectedRoute><CancelSubscriptionReason /></ProtectedRoute> },
      { path: '/cancel-subscription-success', element: <ProtectedRoute><CancelSubscriptionSuccess /></ProtectedRoute> },

      // Payment Routes 
      { path: '/wallet', element: <ProtectedRoute><Wallet /></ProtectedRoute> },
      { path: '/payment-success', element: <ProtectedRoute><PaymentSuccessful /></ProtectedRoute> },

      // Other Protected Routes
      { path: '/refer', element: <ProtectedRoute><Refer /></ProtectedRoute> },
      { path: '/customer-support', element: <ProtectedRoute><CustomerSupport /></ProtectedRoute> },
      { path: '/faq', element: <ProtectedRoute><FAQ /></ProtectedRoute> },
    ],
  },
  // Standalone home page route without Layout wrapper
  {
    path: '/home',
    element: <HomePage />,
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