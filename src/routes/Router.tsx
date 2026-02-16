import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import ProtectedRoute from '../components/common/ProtectedRoute';
import { FEATURE_FLAGS } from '../config/features';

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
      { 
        path: '/gp-daily', 
        element: FEATURE_FLAGS.gpDailyEnabled ? <Gp_daily_Homepage /> : <Navigate to="/gp-store" replace />
      },
      { path: '/gp-store', element: <GpStore_Homepage /> },
      { path: '/gp-store/products', element: <StoreProductsPages /> },
      { path: '/gp-store/explore-more', element: <ExploreMore /> },
      { 
        path: '/gp-daily/explore-more', 
        element: FEATURE_FLAGS.gpDailyEnabled ? <ExploreMore /> : <Navigate to="/gp-store/explore-more" replace />
      },

      // Feature-scoped explicit routes for common pages
      // GP Daily - Redirect to gp-store if disabled
      { 
        path: '/gp-daily/startup', 
        element: FEATURE_FLAGS.gpDailyEnabled ? <Startup /> : <Navigate to="/gp-store/startup" replace />
      },
      { 
        path: '/gp-daily/login', 
        element: FEATURE_FLAGS.gpDailyEnabled ? <Login /> : <Navigate to="/gp-store/login" replace />
      },
      { 
        path: '/gp-daily/otp-verification', 
        element: FEATURE_FLAGS.gpDailyEnabled ? <OTPVerification /> : <Navigate to="/gp-store/otp-verification" replace />
      },
      { 
        path: '/gp-daily/name-input', 
        element: FEATURE_FLAGS.gpDailyEnabled ? <NameInput /> : <Navigate to="/gp-store/name-input" replace />
      },
      { 
        path: '/gp-daily/allset', 
        element: FEATURE_FLAGS.gpDailyEnabled ? <Allset /> : <Navigate to="/gp-store/allset" replace />
      },
      { 
        path: '/gp-daily/account', 
        element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><MorePage /></ProtectedRoute> : <Navigate to="/gp-store/account" replace />
      },
      { 
        path: '/gp-daily/profile', 
        element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><Profile /></ProtectedRoute> : <Navigate to="/gp-store/profile" replace />
      },
      { 
        path: '/gp-daily/addresses', 
        element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><Addresses /></ProtectedRoute> : <Navigate to="/gp-store/addresses" replace />
      },
      { 
        path: '/gp-daily/addresses/add', 
        element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><AddAddress /></ProtectedRoute> : <Navigate to="/gp-store/addresses/add" replace />
      },
      { 
        path: '/gp-daily/addresses/edit', 
        element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><EditAddress /></ProtectedRoute> : <Navigate to="/gp-store/addresses/edit" replace />
      },
      { 
        path: '/gp-daily/address-selection', 
        element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><AddressSelection /></ProtectedRoute> : <Navigate to="/gp-store/address-selection" replace />
      },
      { 
        path: '/gp-daily/location', 
        element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><Location /></ProtectedRoute> : <Navigate to="/gp-store/location" replace />
      },
      { 
        path: '/gp-daily/faq', 
        element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><FAQ /></ProtectedRoute> : <Navigate to="/gp-store/faq" replace />
      },
      { 
        path: '/gp-daily/Products', 
        element: FEATURE_FLAGS.gpDailyEnabled ? <Products /> : <Navigate to="/gp-store/products" replace />
      },
      { 
        path: '/gp-daily/product/:id', 
        element: FEATURE_FLAGS.gpDailyEnabled ? <ProductPage /> : <Navigate to="/gp-store/product/:id" replace />
      },
      { 
        path: '/gp-daily/refer', 
        element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><Refer /></ProtectedRoute> : <Navigate to="/gp-store/refer" replace />
      },
      { 
        path: '/gp-daily/customer-support', 
        element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><CustomerSupport /></ProtectedRoute> : <Navigate to="/gp-store/customer-support" replace />
      },


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
      { path: '/gp-store/location', element: <ProtectedRoute><Location /></ProtectedRoute> },
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

      // Feature Routes - Generic /location redirects based on feature flag
      { 
        path: '/location', 
        element: <ProtectedRoute><Location /></ProtectedRoute> 
      },
      { path: '/gp-daily/orders', element: <ProtectedRoute><OrderManagement /></ProtectedRoute> },
      // { path: '/gp-store/orders', element: <ProtectedRoute><OrderManagement /></ProtectedRoute> },

      // Subscription Routes - Redirect to gp-store if gp-daily is disabled
      { 
        path: '/gp-daily/manage-my-storeProducts', 
        element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><ManageMyStoreProducts /></ProtectedRoute> : <Navigate to="/gp-store" replace />
      },
      { 
        path: '/gp-daily/manage-my-subscription', 
        element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><ManageMySubscription /></ProtectedRoute> : <Navigate to="/gp-store" replace />
      },
      { 
        path: '/gp-daily/manage-subscription', 
        element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><ManageMySubscription /></ProtectedRoute> : <Navigate to="/gp-store" replace />
      },
      { 
        path: '/gp-daily/subscription/confirm', 
        element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><ConfirmSubscription /></ProtectedRoute> : <Navigate to="/gp-store" replace />
      },
      { 
        path: '/gp-daily/modify-Subscription', 
        element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><ModifySubscription /></ProtectedRoute> : <Navigate to="/gp-store" replace />
      },
      { 
        path: '/gp-daily/pause-subscription', 
        element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><PauseSubscription /></ProtectedRoute> : <Navigate to="/gp-store" replace />
      },
      { 
        path: '/gp-daily/subscription-paused', 
        element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><PausedSubscriptionLanding /></ProtectedRoute> : <Navigate to="/gp-store" replace />
      },
      { 
        path: '/gp-daily/Cancel-Subscription', 
        element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><CancelSubscriptionLanding /></ProtectedRoute> : <Navigate to="/gp-store" replace />
      },
      { 
        path: '/gp-daily/cancel-subscription', 
        element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><CancelSubscriptionLanding /></ProtectedRoute> : <Navigate to="/gp-store" replace />
      },
      { 
        path: '/gp-daily/cancel-subscription-reason', 
        element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><CancelSubscriptionReason /></ProtectedRoute> : <Navigate to="/gp-store" replace />
      },
      { 
        path: '/gp-daily/cancel-subscription-success', 
        element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><CancelSubscriptionSuccess /></ProtectedRoute> : <Navigate to="/gp-store" replace />
      },

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