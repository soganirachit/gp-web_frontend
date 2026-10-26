import { Suspense } from 'react';
import { lazyWithRetry as lazy } from '../utils/lazyWithRetry';
import { createBrowserRouter, RouterProvider, Navigate, useLocation } from 'react-router-dom';

function LegacyGpDailyManageSubscriptionRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/gp-daily/manage-subscription${search}`} replace />;
}
import Layout from '../components/layout/Layout';
import { PageFadeFallback } from '../components/common/PageFade';
import ProtectedRoute from '../components/common/ProtectedRoute';
import RouteErrorPage from '../components/common/RouteErrorPage';

// Context
import { StoreProvider } from '../context/StoreContext';

// ================== LAZY LOADED COMPONENTS ==================
const Unsubscribed_User_Home = lazy(() => import('../pages/Unsubscribed_User_Home'));
const Gp_daily_Homepage = lazy(() => import('../pages/GpDaily_Homepage'));
const GpStore_Homepage = lazy(() => import('../pages/GpStore_Homepage'));
const HomePage = lazy(() => import('../pages/home_page'));
const BloomBarLayout = lazy(() => import('../pages/BloomBar/BloomBarLayout'));
const BloomBarLanding = lazy(() => import('../pages/BloomBar/BloomBarLanding'));
const BloomBarScanner = lazy(() => import('../pages/BloomBar/BloomBarScanner'));
const BloomBarProduct = lazy(() => import('../pages/BloomBar/BloomBarProduct'));
const BloomBarStore = lazy(() => import('../pages/BloomBar/BloomBarStore'));
const BloomBarBasket = lazy(() => import('../pages/BloomBar/BloomBarBasket'));
const BloomBarScanNext = lazy(() => import('../pages/BloomBar/BloomBarScanNext'));
const BloomBarConfirmation = lazy(() => import('../pages/BloomBar/BloomBarConfirmation'));
const Sajawat = lazy(() => import('../pages/Sajawat'));
const SajawatSignatureGallery = lazy(() => import('../pages/SajawatSignatureGallery'));
const Products = lazy(() => import('../components/ProductPage/page'));
const ProductPage = lazy(() => import('../components/ProductPage/ProductDisplaypage'));
const ExploreMore = lazy(() => import('../components/ProductPage/ExploreMore'));

const Startup = lazy(() => import('../components/Customer/forms/login/Startup'));
const Login = lazy(() => import('../components/Customer/forms/login/Login'));
const OTPVerification = lazy(() => import('../components/Customer/forms/login/Otp_verification'));
const NameInput = lazy(() => import('../components/Customer/forms/login/NameInput'));
const Allset = lazy(() => import('../components/Customer/forms/login/Allset'));

const MorePage = lazy(() => import('../pages/More/Settings'));
const Profile = lazy(() => import('../pages/More/Account&Perferenecs/Profile/EditProfile'));
const Addresses = lazy(() => import('../pages/More/Addresses'));
const ChooseLocation = lazy(() => import('../pages/More/ChooseLocation'));
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
const Notifications = lazy(() => import('../pages/More/Notifications'));
const NotificationPreferences = lazy(() => import('../pages/More/NotificationPreferences'));
const StoreProductsPages = lazy(() => import('../components/StoreProductsPage/page'));
const StorePage = lazy(() => import('../components/StoreProductsPage/storeProductsDisplayPage'));
const ManageMyStoreProducts = lazy(() => import('../components/StoreProductsPage/manageMyStoreProducts'));
const Cart = lazy(() => import('../features/cart/components/Cart'));
const CartDaily = lazy(() => import('../features/cart/components/CartDaily'));
import StaticLegalPageRedirect from '../components/legal/StaticLegalPageRedirect';
import FeaturePrefixedRedirect from '../components/routing/FeaturePrefixedRedirect';
import PreserveSearchRedirect from '../components/routing/PreserveSearchRedirect';
const ProductDeepLinkPage = lazy(() => import('../pages/ProductDeepLinkPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

const PageLoader = () => <PageFadeFallback />;

const router = createBrowserRouter(
  [
  {
    path: '/',
    element: <Layout />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/', element: <Startup /> },
      { path: '/startup', element: <Startup /> },
      { path: '/landing', element: <BloomBarLanding /> },
      { path: '/search', element: <Navigate to="/home" replace /> },
      { path: '/explore-more', element: <ExploreMore /> },
      { path: '/home', element: <HomePage /> },
      { path: '/sajawat', element: <Sajawat /> },
      { path: '/sajawat/gallery', element: <SajawatSignatureGallery /> },
      
      // ================== BLOOMBAR ROUTES ==================
      {
        path: '/bloombar',
        element: <BloomBarLayout />,
        children: [
          { index: true, element: <BloomBarLanding /> },
          { path: 'scanner', element: <BloomBarScanner /> },
          { path: 'scan-next', element: <BloomBarScanNext /> },
          { path: 'product', element: <BloomBarProduct /> },
          { path: 'basket', element: <BloomBarBasket /> },
          { path: 'checkout', element: <Navigate to="/bloombar/basket" replace /> },
          { path: 'confirmation', element: <BloomBarConfirmation /> },
          // Store QR: `/bloombar/<code>_products`. Kept last so the static routes
          // above (scanner, product, basket, …) always win over this dynamic slug.
          { path: ':storeSlug', element: <BloomBarStore /> },
        ],
      },
      {
        path: '/gp-daily',
        element: <Gp_daily_Homepage />
      },
      { path: '/gp-store', element: <GpStore_Homepage /> },
      { path: '/gp-store/products', element: <StoreProductsPages /> },
      { path: '/gp-store/explore-more', element: <ExploreMore /> },
      {
        path: '/gp-daily/explore-more',
        element: <ExploreMore />
      },

      // GP Daily routes
      { path: '/gp-daily/startup', element: <Navigate to="/gp-daily" replace /> },
      { path: '/gp-daily/login', element: <Login /> },
      { path: '/gp-daily/otp-verification', element: <OTPVerification /> },
      { path: '/gp-daily/name-input', element: <NameInput /> },
      { path: '/gp-daily/allset', element: <Allset /> },
      { path: '/gp-daily/account', element: <ProtectedRoute><MorePage /></ProtectedRoute> },
      { path: '/gp-daily/profile', element: <ProtectedRoute><Profile /></ProtectedRoute> },
      { path: '/gp-daily/addresses', element: <ProtectedRoute><Addresses /></ProtectedRoute> },
      { path: '/gp-daily/addresses/add', element: <ProtectedRoute><AddEditAddress /></ProtectedRoute> },
      { path: '/gp-daily/addresses/edit', element: <ProtectedRoute><AddEditAddress /></ProtectedRoute> },
      { path: '/gp-daily/address-selection', element: <ProtectedRoute><AddressSelection /></ProtectedRoute> },
      { path: '/gp-daily/location', element: <ProtectedRoute><Location /></ProtectedRoute> },
      { path: '/gp-daily/faq', element: <ProtectedRoute><FAQ /></ProtectedRoute> },
      { path: '/gp-daily/notifications', element: <ProtectedRoute><Notifications /></ProtectedRoute> },
      { path: '/gp-daily/notification-preferences', element: <ProtectedRoute><NotificationPreferences /></ProtectedRoute> },
      { path: '/gp-daily/products', element: <Products /> },
      { path: '/gp-daily/Products', element: <Navigate to="/gp-daily/products" replace /> },
      { path: '/gp-daily/product/:slug', element: <ProductPage /> },
      { path: '/gp-daily/refer', element: <ProtectedRoute><Refer /></ProtectedRoute> },
      { path: '/gp-daily/customer-support', element: <ProtectedRoute><CustomerSupport /></ProtectedRoute> },
      { path: '/gp-daily/customer-support/chat', element: <ProtectedRoute><SupportTicketChat /></ProtectedRoute> },
      { path: '/gp-daily/customer-support/questions', element: <ProtectedRoute><TicketQuestionForm /></ProtectedRoute> },
      { path: '/gp-daily/orders', element: <ProtectedRoute><OrderManagement /></ProtectedRoute> },
      { path: '/gp-daily/orders/:orderNumber', element: <ProtectedRoute><OrderDetails /></ProtectedRoute> },
      { path: '/gp-daily/basket', element: <ProtectedRoute><CartDaily /></ProtectedRoute> },
      { path: '/gp-daily/payment-success', element: <ProtectedRoute><StoreOrderConfirmation /></ProtectedRoute> },
      { path: '/gp-daily/manage-my-store-products', element: <ProtectedRoute><ManageMyStoreProducts /></ProtectedRoute> },
      { path: '/gp-daily/manage-my-storeProducts', element: <Navigate to="/gp-daily/manage-my-store-products" replace /> },
      { path: '/gp-daily/manage-subscription', element: <ProtectedRoute><ManageMySubscription /></ProtectedRoute> },
      { path: '/gp-daily/manage-my-subscription', element: <LegacyGpDailyManageSubscriptionRedirect /> },
      { path: '/gp-daily/subscription/confirm', element: <ProtectedRoute><ConfirmSubscription /></ProtectedRoute> },
      { path: '/gp-daily/modify-subscription', element: <ProtectedRoute><ModifySubscription /></ProtectedRoute> },
      { path: '/gp-daily/modify-Subscription', element: <Navigate to="/gp-daily/modify-subscription" replace /> },
      { path: '/gp-daily/pause-subscription', element: <ProtectedRoute><PauseSubscription /></ProtectedRoute> },
      { path: '/gp-daily/subscription-paused', element: <ProtectedRoute><PausedSubscriptionLanding /></ProtectedRoute> },
      { path: '/gp-daily/cancel-subscription', element: <ProtectedRoute><CancelSubscriptionLanding /></ProtectedRoute> },
      { path: '/gp-daily/Cancel-Subscription', element: <Navigate to="/gp-daily/cancel-subscription" replace /> },
      { path: '/gp-daily/cancel-subscription-reason', element: <ProtectedRoute><CancelSubscriptionReason /></ProtectedRoute> },
      { path: '/gp-daily/cancel-subscription-success', element: <ProtectedRoute><CancelSubscriptionSuccess /></ProtectedRoute> },

      // GP Store routes
      { path: '/gp-store/startup', element: <Startup /> },
      { path: '/gp-store/login', element: <Login /> },
      { path: '/gp-store/otp-verification', element: <OTPVerification /> },
      { path: '/gp-store/name-input', element: <NameInput /> },
      { path: '/gp-store/allset', element: <Allset /> },
      { path: '/gp-store/account', element: <ProtectedRoute><MorePage /></ProtectedRoute> },
      { path: '/gp-store/profile', element: <ProtectedRoute><Profile /></ProtectedRoute> },
      { path: '/gp-store/addresses', element: <ProtectedRoute><Addresses /></ProtectedRoute> },
      { path: '/gp-store/choose-location', element: <ProtectedRoute><ChooseLocation /></ProtectedRoute> },
      { path: '/gp-store/addresses/add', element: <ProtectedRoute><AddEditAddress /></ProtectedRoute> },
      { path: '/gp-store/addresses/edit', element: <ProtectedRoute><AddEditAddress /></ProtectedRoute> },
      { path: '/gp-store/address-selection', element: <ProtectedRoute><AddressSelection /></ProtectedRoute> },
      { path: '/gp-store/location', element: <ProtectedRoute><Location /></ProtectedRoute> },
      { path: '/gp-store/faq', element: <ProtectedRoute><FAQ /></ProtectedRoute> },
      { path: '/gp-store/notifications', element: <ProtectedRoute><Notifications /></ProtectedRoute> },
      { path: '/gp-store/notification-preferences', element: <ProtectedRoute><NotificationPreferences /></ProtectedRoute> },
      { path: '/gp-store/refer', element: <ProtectedRoute><Refer /></ProtectedRoute> },
      { path: '/gp-store/customer-support', element: <ProtectedRoute><CustomerSupport /></ProtectedRoute> },
      { path: '/gp-store/customer-support/chat', element: <ProtectedRoute><SupportTicketChat /></ProtectedRoute> },
      { path: '/gp-store/customer-support/questions', element: <ProtectedRoute><TicketQuestionForm /></ProtectedRoute> },
      { path: '/gp-store/orders', element: <ProtectedRoute><OrderManagement /></ProtectedRoute> },
      { path: '/gp-store/orders/:orderNumber', element: <ProtectedRoute><OrderDetails /></ProtectedRoute> },
      { path: '/gp-store/product/:slug', element: <StorePage /> },
      { path: '/gp-store/basket', element: <ProtectedRoute><Cart /></ProtectedRoute> },

      // Bare auth route shortcuts — feature-aware (last-used store vs daily)
      { path: '/login', element: <FeaturePrefixedRedirect segment="login" /> },
      { path: '/otp-verification', element: <FeaturePrefixedRedirect segment="otp-verification" /> },
      { path: '/name-input', element: <FeaturePrefixedRedirect segment="name-input" /> },
      { path: '/allset', element: <FeaturePrefixedRedirect segment="allset" /> },

      // Generic routes (redirect to feature-prefixed paths)
      { path: '/location', element: <FeaturePrefixedRedirect segment="location" /> },
      { path: '/wallet', element: <FeaturePrefixedRedirect segment="wallet" /> },
      { path: '/gp-daily/wallet', element: <ProtectedRoute><Wallet /></ProtectedRoute> },
      { path: '/gp-store/wallet', element: <Navigate to="/gp-daily/wallet" replace /> },
      { path: '/gp-store/payment-success', element: <ProtectedRoute><StoreOrderConfirmation /></ProtectedRoute> },
      { path: '/payment-success', element: <ProtectedRoute><PaymentSuccessful /></ProtectedRoute> },
      { path: '/refer', element: <FeaturePrefixedRedirect segment="refer" /> },
      { path: '/customer-support', element: <FeaturePrefixedRedirect segment="customer-support" /> },
      { path: '/customer-support/chat', element: <FeaturePrefixedRedirect segment="customer-support/chat" /> },
      { path: '/faq', element: <FeaturePrefixedRedirect segment="faq" /> },
      { path: '/products', element: <PreserveSearchRedirect to="/gp-store/products" /> },
      { path: '/Account', element: <Navigate to="/gp-store/account" replace /> },
      { path: '/account', element: <FeaturePrefixedRedirect segment="account" /> },
      { path: '/addresses', element: <FeaturePrefixedRedirect segment="addresses" /> },
      { path: '/address-selection', element: <FeaturePrefixedRedirect segment="address-selection" /> },
      { path: '/products/:slug', element: <ProductDeepLinkPage /> },
      { path: '/terms', element: <StaticLegalPageRedirect path="/terms_of_service.html" /> },
      { path: '/privacy', element: <StaticLegalPageRedirect path="/privacy-policy.html" /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  ],
  {
    future: {
      // v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  },
);

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
