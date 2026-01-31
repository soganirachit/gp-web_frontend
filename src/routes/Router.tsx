import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import ProtectedRoute from '../components/common/ProtectedRoute';

// Context
import { StoreProvider } from '../context/StoreContext';

// ================== PUBLIC ROUTES COMPONENTS ==================
// Main Pages
import Unsubscribed_User_Home from '../pages/Unsubscribed_User_Home';
import Gp_daily_Homepage from '../pages/GpDaily_Homepage';
import GpStore_Homepage from '../pages/GpStore_Homepage';
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
      // { path: '/NewUser', element: <Unsubscribed_User_Home /> },
      { path: '/search', element: <Search /> },
      { path: '/explore-more', element: <ExploreMore /> },
      { path: '/gp-daily', element: <Gp_daily_Homepage /> },
      { path: '/gp-store', element: <GpStore_Homepage /> },
      { path: '/gp-store/products', element: <StoreProductsPages /> },
      { path: '/gp-store/explore-more', element: <ExploreMore /> },
      { path: '/gp-daily/explore-more', element: <ExploreMore /> },

      // Feature-scoped explicit routes for common pages
      // GP Daily
      { path: '/gp-daily/startup', element: <Startup /> },
      { path: '/gp-daily/login', element: <Login /> },
      { path: '/gp-daily/otp-verification', element: <OTPVerification /> },
      { path: '/gp-daily/name-input', element: <NameInput /> },
      { path: '/gp-daily/allset', element: <Allset /> },
      { path: '/gp-daily/account', element: <ProtectedRoute><MorePage /></ProtectedRoute> },
      { path: '/gp-daily/profile', element: <ProtectedRoute><Profile /></ProtectedRoute> },
      { path: '/gp-daily/addresses', element: <ProtectedRoute><Addresses /></ProtectedRoute> },
      { path: '/gp-daily/addresses/add', element: <ProtectedRoute><AddAddress /></ProtectedRoute> },
      { path: '/gp-daily/addresses/edit', element: <ProtectedRoute><EditAddress /></ProtectedRoute> },
      { path: '/gp-daily/address-selection', element: <ProtectedRoute><AddressSelection /></ProtectedRoute> },
      { path: '/gp-daily/faq', element: <ProtectedRoute><FAQ /></ProtectedRoute> },
      { path: '/gp-daily/Products', element: <Products /> },
      { path: '/gp-daily/product/:id', element: <ProductPage /> },
      { path: '/gp-daily/refer', element: <ProtectedRoute><Refer /></ProtectedRoute> },
      { path: '/gp-daily/customer-support', element: <ProtectedRoute><CustomerSupport /></ProtectedRoute> },


      // GP Store
      { path: '/gp-store/startup', element: <Startup /> },
      { path: '/gp-store/login', element: <Login /> },
      { path: '/gp-store/otp-verification', element: <OTPVerification /> },
      { path: '/gp-store/name-input', element: <NameInput /> },
      { path: '/gp-store/allset', element: <Allset /> },
      { path: '/gp-store/account', element: <ProtectedRoute><MorePage /></ProtectedRoute> },
      { path: '/gp-store/profile', element: <ProtectedRoute><Profile /></ProtectedRoute> },
      { path: '/gp-store/addresses', element: <ProtectedRoute><Addresses /></ProtectedRoute> },
      { path: '/gp-store/addresses/add', element: <ProtectedRoute><AddAddress /></ProtectedRoute> },
      { path: '/gp-store/addresses/edit', element: <ProtectedRoute><EditAddress /></ProtectedRoute> },
      { path: '/gp-store/address-selection', element: <ProtectedRoute><AddressSelection /></ProtectedRoute> },
      { path: '/gp-store/faq', element: <ProtectedRoute><FAQ /></ProtectedRoute> },
      { path: '/gp-store/refer', element: <ProtectedRoute><Refer /></ProtectedRoute> },
      { path: '/gp-store/customer-support', element: <ProtectedRoute><CustomerSupport /></ProtectedRoute> },
      { path: '/gp-store/orders', element: <ProtectedRoute><OrderManagement /></ProtectedRoute> },
      { path: '/gp-store/product/:id', element: <StorePage /> },

      // ================== ORIGINAL PROTECTED ROUTES (RESTORED) ==================

      // // Account Management Routes
      // { path: '/Account', element: <ProtectedRoute><MorePage /></ProtectedRoute> },
      // { path: '/Profile', element: <ProtectedRoute><Profile /></ProtectedRoute> },
      // { path: '/addresses', element: <ProtectedRoute><Addresses /></ProtectedRoute> },
      // { path: '/addresses/add', element: <ProtectedRoute><AddAddress /></ProtectedRoute> },
      // { path: '/addresses/edit', element: <ProtectedRoute><EditAddress /></ProtectedRoute> },

      // Feature Routes
      { path: '/location', element: <ProtectedRoute><Location /></ProtectedRoute> },
      { path: '/gp-daily/orders', element: <ProtectedRoute><OrderManagement /></ProtectedRoute> },
      // { path: '/gp-store/orders', element: <ProtectedRoute><OrderManagement /></ProtectedRoute> },

      // Subscription Routes
      { path: '/gp-daily/manage-my-storeProducts', element: <ProtectedRoute><ManageMyStoreProducts /></ProtectedRoute> },
      { path: '/gp-daily/manage-my-subscription', element: <ProtectedRoute><ManageMySubscription /></ProtectedRoute> },
      { path: '/gp-daily/manage-subscription', element: <ProtectedRoute><ManageMySubscription /></ProtectedRoute> },
      { path: '/gp-daily/address-selection', element: <ProtectedRoute><AddressSelection /></ProtectedRoute> },
      { path: '/gp-daily/subscription/confirm', element: <ProtectedRoute><ConfirmSubscription /></ProtectedRoute> },
      { path: '/gp-daily/modify-Subscription', element: <ProtectedRoute><ModifySubscription /></ProtectedRoute> },
      { path: '/gp-daily/pause-subscription', element: <ProtectedRoute><PauseSubscription /></ProtectedRoute> },
      { path: '/gp-daily/subscription-paused', element: <ProtectedRoute><PausedSubscriptionLanding /></ProtectedRoute> },
      { path: '/gp-daily/Cancel-Subscription', element: <ProtectedRoute><CancelSubscriptionLanding /></ProtectedRoute> },
      { path: '/gp-daily/cancel-subscription', element: <ProtectedRoute><CancelSubscriptionLanding /></ProtectedRoute> },
      { path: '/gp-daily/cancel-subscription-reason', element: <ProtectedRoute><CancelSubscriptionReason /></ProtectedRoute> },
      { path: '/gp-daily/cancel-subscription-success', element: <ProtectedRoute><CancelSubscriptionSuccess /></ProtectedRoute> },

      // Payment Routes 
      { path: '/wallet', element: <ProtectedRoute><Wallet /></ProtectedRoute> },
      { path: '/gp-daily/wallet', element: <ProtectedRoute><Wallet /></ProtectedRoute> },
      { path: '/gp-store/wallet', element: <ProtectedRoute><Wallet /></ProtectedRoute> },
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