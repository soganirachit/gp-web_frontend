import { Outlet } from 'react-router-dom';
import { BloomBarCartProvider } from './BloomBarCartContext';

export default function BloomBarLayout() {
  return (
    <BloomBarCartProvider>
      <Outlet />
    </BloomBarCartProvider>
  );
}
