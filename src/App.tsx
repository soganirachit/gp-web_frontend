import Router from './routes/Router';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Toaster position="top-center" />
        <Router />
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
