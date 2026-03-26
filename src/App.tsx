import { useEffect } from 'react';
import Router from './routes/Router';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { AppToaster } from './components/ui/AppToaster';
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
          <AppToaster />
          <Router />
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
