import { Suspense } from 'react';
import { lazyWithRetry as lazy } from '../utils/lazyWithRetry';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Spinner from '../components/common/Spinner';
import ProtectedRoute from '../components/common/ProtectedRoute';
import { FEATURE_FLAGS } from '../config/features';
import RouteErrorPage from '../components/common/RouteErrorPage';

// Context
import { StoreProvider } from '../context/StoreContext';
import { FeatureThemeProvider } from '../context/FeatureThemeContext';

// ================== LAZY LOADED COMPONENTS ==================
const Unsubscribed_User_Home = lazy(() => import('../pages/Unsubscribed_User_Home'));
const Gp_daily_Homepage = lazy(() => import('../pages/GpDaily_Homepage'));
const GpStore_Homepage = lazy(() => import('../pages/GpStore_Homepage'));
const HomePage = lazy(() => import('../pages/home_page'));
const Products = lazy(() => import('../components/ProductPage/page'));
const ProductPage = lazy(() => import('../components/ProductPage/ProductDisplaypage'));
const Search = lazy(() => import('../components/ProductPage/SearchPage'));
const ExploreMore = lazy(() => import('../components/ProductPage/ExploreMore'));

const Startup = lazy(() => import('../components/Customer/forms/login/Startup'));
const Login = lazy(() => import('../components/Customer/forms/login/Login'));
const OTPVerification = lazy(() => import('../components/Customer/forms/login/Otp_verification'));
const NameInput = lazy(() => import('../components/Customer/forms/login/NameInput'));
const Allset = lazy(() => import('../components/Customer/forms/login/Allset'));

const MorePage = lazy(() => import('../pages/More/Settings'));
const Profile = lazy(() => import('../pages/More/Account&Perferenecs/Profile/EditProfile'));
const Addresses = lazy(() => import('../pages/More/Addresses'));
const AddEditAddress = lazy(() => import('../pages/More/AddEditAddress'));

const Location = lazy(() => import('../features/location/Home_page_location'));
const OrderManagement = lazy(() => import('../components/Order/MyOrders'));
const OrderDetails = lazy(() => import('../components/Order/OrderDetails'));

const ManageMySubscription = lazy(() => import('../components/Subscription/ManageMySubscription'));
const AddressSelection = lazy(() => import('../components/Subscription/AddressSelection'));
const ConfirmSubscription = lazy(() => import('../components/Subscription/ConfirmSubscription'));
const ModifySubscription = lazy(() => import('../components/Subscription/Page/Modify_subscription'));
const PausedSubscriptionLanding = lazy(() => import('../components/Subscription/Page/Paused_susbcription_Landing'));
const PauseSubscription = lazy(() => import('../components/Subscription/Page/PauseSubscription'));
const CancelSubscriptionLanding = lazy(() => import('../components/Subscription/Page/Cancel_subscription_Landingpage'));
const CancelSubscriptionReason = lazy(() => import('../components/Subscription/Page/CancelSubscriptionReason'));
const CancelSubscriptionSuccess = lazy(() => import('../components/Subscription/Page/CancelSubscriptionSuccess'));

const Wallet = lazy(() => import('../components/Payment/Wallet/wallet'));
const PaymentSuccessful = lazy(() => import('../components/Payment/payment_successful'));
const StoreOrderConfirmation = lazy(() => import('../components/Order/StoreOrderConfirmation'));

const Refer = lazy(() => import('../pages/Refer/Refer'));
const CustomerSupport = lazy(() => import('../pages/More/CustomerSupport'));
const SupportTicketChat = lazy(() => import('../pages/More/SupportTicketChat'));
const TicketQuestionForm = lazy(() => import('../pages/More/TicketQuestionForm'));
const FAQ = lazy(() => import('../pages/More/FAQ'));
const StoreProductsPages = lazy(() => import('../components/StoreProductsPage/page'));
const StorePage = lazy(() => import('../components/StoreProductsPage/storeProductsDisplayPage'));
const ManageMyStoreProducts = lazy(() => import('../components/StoreProductsPage/manageMyStoreProducts'));
const Cart = lazy(() => import('../features/cart/components/Cart'));
const Terms = lazy(() => import('../pages/Terms'));
const Privacy = lazy(() => import('../pages/Privacy'));

const PageLoader = () => (
  <div className="fixed inset-0 bg-[#f8f6f1] flex items-center justify-center z-50">
    <Spinner size={400} />
  </div>
);

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/', element: <Startup /> },
      { path: '/startup', element: <Startup /> },
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

      // GP Daily routes — redirect to gp-store if disabled
      { path: '/gp-daily/startup', element: FEATURE_FLAGS.gpDailyEnabled ? <Startup /> : <Navigate to="/gp-store/startup" replace /> },
      { path: '/gp-daily/login', element: FEATURE_FLAGS.gpDailyEnabled ? <Login /> : <Navigate to="/gp-store/login" replace /> },
      { path: '/gp-daily/otp-verification', element: FEATURE_FLAGS.gpDailyEnabled ? <OTPVerification /> : <Navigate to="/gp-store/otp-verification" replace /> },
      { path: '/gp-daily/name-input', element: FEATURE_FLAGS.gpDailyEnabled ? <NameInput /> : <Navigate to="/gp-store/name-input" replace /> },
      { path: '/gp-daily/allset', element: FEATURE_FLAGS.gpDailyEnabled ? <Allset /> : <Navigate to="/gp-store/allset" replace /> },
      { path: '/gp-daily/account', element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><MorePage /></ProtectedRoute> : <Navigate to="/gp-store/account" replace /> },
      { path: '/gp-daily/profile', element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><Profile /></ProtectedRoute> : <Navigate to="/gp-store/profile" replace /> },
      { path: '/gp-daily/addresses', element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><Addresses /></ProtectedRoute> : <Navigate to="/gp-store/addresses" replace /> },
      { path: '/gp-daily/addresses/add', element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><AddEditAddress /></ProtectedRoute> : <Navigate to="/gp-store/addresses/add" replace /> },
      { path: '/gp-daily/addresses/edit', element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><AddEditAddress /></ProtectedRoute> : <Navigate to="/gp-store/addresses/edit" replace /> },
      { path: '/gp-daily/address-selection', element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><AddressSelection /></ProtectedRoute> : <Navigate to="/gp-store/address-selection" replace /> },
      { path: '/gp-daily/location', element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><Location /></ProtectedRoute> : <Navigate to="/gp-store/location" replace /> },
      { path: '/gp-daily/faq', element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><FAQ /></ProtectedRoute> : <Navigate to="/gp-store/faq" replace /> },
      { path: '/gp-daily/Products', element: FEATURE_FLAGS.gpDailyEnabled ? <Products /> : <Navigate to="/gp-store/products" replace /> },
      { path: '/gp-daily/product/:id', element: FEATURE_FLAGS.gpDailyEnabled ? <ProductPage /> : <Navigate to="/gp-store" replace /> },
      { path: '/gp-daily/refer', element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><Refer /></ProtectedRoute> : <Navigate to="/gp-store/refer" replace /> },
      { path: '/gp-daily/customer-support', element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><CustomerSupport /></ProtectedRoute> : <Navigate to="/gp-store/customer-support" replace /> },
      { path: '/gp-daily/customer-support/chat', element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><SupportTicketChat /></ProtectedRoute> : <Navigate to="/gp-store/customer-support/chat" replace /> },
      { path: '/gp-daily/customer-support/questions', element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><TicketQuestionForm /></ProtectedRoute> : <Navigate to="/gp-store/customer-support/questions" replace /> },
      { path: '/gp-daily/orders', element: <ProtectedRoute><OrderManagement /></ProtectedRoute> },
      { path: '/gp-daily/orders/:orderNumber', element: <ProtectedRoute><OrderDetails /></ProtectedRoute> },
      { path: '/gp-daily/basket', element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><Cart /></ProtectedRoute> : <Navigate to="/gp-store/basket" replace /> },
      { path: '/gp-daily/manage-my-storeProducts', element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><ManageMyStoreProducts /></ProtectedRoute> : <Navigate to="/gp-store" replace /> },
      { path: '/gp-daily/manage-my-subscription', element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><ManageMySubscription /></ProtectedRoute> : <Navigate to="/gp-store" replace /> },
      { path: '/gp-daily/manage-subscription', element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><ManageMySubscription /></ProtectedRoute> : <Navigate to="/gp-store" replace /> },
      { path: '/gp-daily/subscription/confirm', element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><ConfirmSubscription /></ProtectedRoute> : <Navigate to="/gp-store" replace /> },
      { path: '/gp-daily/modify-Subscription', element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><ModifySubscription /></ProtectedRoute> : <Navigate to="/gp-store" replace /> },
      { path: '/gp-daily/pause-subscription', element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><PauseSubscription /></ProtectedRoute> : <Navigate to="/gp-store" replace /> },
      { path: '/gp-daily/subscription-paused', element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><PausedSubscriptionLanding /></ProtectedRoute> : <Navigate to="/gp-store" replace /> },
      { path: '/gp-daily/Cancel-Subscription', element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><CancelSubscriptionLanding /></ProtectedRoute> : <Navigate to="/gp-store" replace /> },
      { path: '/gp-daily/cancel-subscription', element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><CancelSubscriptionLanding /></ProtectedRoute> : <Navigate to="/gp-store" replace /> },
      { path: '/gp-daily/cancel-subscription-reason', element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><CancelSubscriptionReason /></ProtectedRoute> : <Navigate to="/gp-store" replace /> },
      { path: '/gp-daily/cancel-subscription-success', element: FEATURE_FLAGS.gpDailyEnabled ? <ProtectedRoute><CancelSubscriptionSuccess /></ProtectedRoute> : <Navigate to="/gp-store" replace /> },

      // GP Store routes
      { path: '/gp-store/startup', element: <Startup /> },
      { path: '/gp-store/login', element: <Login /> },
      { path: '/gp-store/otp-verification', element: <OTPVerification /> },
      { path: '/gp-store/name-input', element: <NameInput /> },
      { path: '/gp-store/allset', element: <Allset /> },
      { path: '/gp-store/account', element: <ProtectedRoute><MorePage /></ProtectedRoute> },
      { path: '/gp-store/profile', element: <ProtectedRoute><Profile /></ProtectedRoute> },
      { path: '/gp-store/addresses', element: <ProtectedRoute><Addresses /></ProtectedRoute> },
      { path: '/gp-store/addresses/add', element: <ProtectedRoute><AddEditAddress /></ProtectedRoute> },
      { path: '/gp-store/addresses/edit', element: <ProtectedRoute><AddEditAddress /></ProtectedRoute> },
      { path: '/gp-store/address-selection', element: <ProtectedRoute><AddressSelection /></ProtectedRoute> },
      { path: '/gp-store/location', element: <ProtectedRoute><Location /></ProtectedRoute> },
      { path: '/gp-store/faq', element: <ProtectedRoute><FAQ /></ProtectedRoute> },
      { path: '/gp-store/refer', element: <ProtectedRoute><Refer /></ProtectedRoute> },
      { path: '/gp-store/customer-support', element: <ProtectedRoute><CustomerSupport /></ProtectedRoute> },
      { path: '/gp-store/customer-support/chat', element: <ProtectedRoute><SupportTicketChat /></ProtectedRoute> },
      { path: '/gp-store/customer-support/questions', element: <ProtectedRoute><TicketQuestionForm /></ProtectedRoute> },
      { path: '/gp-store/orders', element: <ProtectedRoute><OrderManagement /></ProtectedRoute> },
      { path: '/gp-store/orders/:orderNumber', element: <ProtectedRoute><OrderDetails /></ProtectedRoute> },
      { path: '/gp-store/product/:slug', element: <StorePage /> },
      { path: '/gp-store/basket', element: <ProtectedRoute><Cart /></ProtectedRoute> },

      // Bare auth route shortcuts — used by session-expiry redirects and wallet nav
      { path: '/login', element: <Navigate to="/gp-store/login" replace /> },
      { path: '/startup', element: <Navigate to="/gp-store/startup" replace /> },
      { path: '/otp-verification', element: <Navigate to="/gp-store/otp-verification" replace /> },
      { path: '/name-input', element: <Navigate to="/gp-store/name-input" replace /> },
      { path: '/allset', element: <Navigate to="/gp-store/allset" replace /> },

      // Generic routes
      { path: '/location', element: <ProtectedRoute><Location /></ProtectedRoute> },
      { path: '/wallet', element: <ProtectedRoute><Wallet /></ProtectedRoute> },
      { path: '/gp-daily/wallet', element: <ProtectedRoute><Wallet /></ProtectedRoute> },
      { path: '/gp-store/wallet', element: <ProtectedRoute><Wallet /></ProtectedRoute> },
      { path: '/gp-store/payment-success', element: <ProtectedRoute><StoreOrderConfirmation /></ProtectedRoute> },
      { path: '/payment-success', element: <ProtectedRoute><PaymentSuccessful /></ProtectedRoute> },
      { path: '/refer', element: <ProtectedRoute><Refer /></ProtectedRoute> },
      { path: '/customer-support', element: <ProtectedRoute><CustomerSupport /></ProtectedRoute> },
      { path: '/customer-support/chat', element: <ProtectedRoute><SupportTicketChat /></ProtectedRoute> },
      { path: '/faq', element: <ProtectedRoute><FAQ /></ProtectedRoute> },
      { path: '/terms', element: <Terms /> },
      { path: '/privacy', element: <Privacy /> },
    ],
  },
  {
    path: '/home',
    element: (
      <FeatureThemeProvider>
        <Suspense fallback={<PageLoader />}>
          <HomePage />
        </Suspense>
      </FeatureThemeProvider>
    ),
    errorElement: <RouteErrorPage />,
  },
]);

const Router = () => {
  return (
    <StoreProvider>
      <Suspense fallback={<PageLoader />}>
        <RouterProvider router={router} />
      </Suspense>
    </StoreProvider>
  );
};

export default Router;
