import { useEffect } from 'react';
import Router from './routes/Router';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import { initMetaPixel } from './lib/metaPixel';

function App() {
  // Initialise Meta Pixel once on mount (script injection + fbq('init'))
  useEffect(() => {
    initMetaPixel();
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <Toaster position="top-center" />
          <Router />
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
