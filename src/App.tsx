import Router from './routes/Router';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" />
      <Router />
    </AuthProvider>
  );
}

export default App;
