import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  IoLocationOutline,
  IoStorefrontOutline,
} from 'react-icons/io5';
import logo from '../../../../assets/All/logo.png';
import { useAuth } from '../../../../context/AuthContext';
import { useFeatureTheme } from '../../../../context/FeatureThemeContext';
import { addressService, Address } from '../../../../services/address.service';
import { customerService } from '../../../../services/getcustomer.service';
import { storeService } from '../../../../services/store.service';

type SplashAccount = {
  /** Only when first/last name exist — never phone or placeholder. */
  displayName: string | null;
  initial: string | null;
  addressLine: string;
  storeName: string;
};

function formatDefaultAddress(addr: Address | null): string {
  if (!addr) return '';
  return [
    addr.houseNo,
    addr.streetName,
    addr.area,
    addr.city,
    addr.state,
    addr.pincode,
  ]
    .filter(Boolean)
    .join(', ');
}

function pickDefaultAddress(addresses: Address[]): Address | null {
  if (!addresses.length) return null;
  const def = addresses.find((a) => a.isDefault);
  if (def) return def;
  return [...addresses].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )[0];
}

const Startup: React.FC = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { theme } = useFeatureTheme();
  const primary = theme.colors.primary;
  const [account, setAccount] = useState<SplashAccount | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/home', { replace: true });
    }, 4200);

    return () => clearTimeout(timer);
  }, [navigate]);

  useEffect(() => {
    if (!isLoggedIn) return;

    let cancelled = false;

    const load = async () => {
      try {
        const [addresses, customers] = await Promise.all([
          addressService.getAllAddresses(),
          customerService.getAllCustomers(),
        ]);
        if (cancelled) return;

        const addr = pickDefaultAddress(addresses);
        const addressLine = formatDefaultAddress(addr);
        const c = customers[0];
        const displayName =
          [c?.firstName, c?.lastName].filter(Boolean).join(' ').trim() || null;
        const initial =
          displayName && displayName.length > 0
            ? displayName.charAt(0).toLocaleUpperCase()
            : null;

        const sid = storeService.getSelectedStoreId();
        let storeName = 'No store selected';
        if (sid != null) {
          const stores = await storeService.getAllStores();
          if (!cancelled) {
            storeName =
              stores.find((s) => s.id === sid)?.name || 'No store selected';
          }
        }

        if (!cancelled) {
          setAccount({
            displayName,
            initial,
            addressLine,
            storeName,
          });
        }
      } catch {
        if (!cancelled) {
          setAccount(null);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  return (
    <div
      className="fixed inset-0 flex min-h-screen w-screen flex-col items-center justify-center overflow-y-auto bg-white py-6"
      data-testid="gp-startup-screen"
    >
      <div className="flex w-full max-w-[min(320px,92vw)] flex-col items-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 110 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            opacity: { duration: 1.15, ease: [0.25, 0.1, 0.25, 1] },
            y: {
              type: 'spring',
              bounce: 0.58,
              duration: 2.45,
            },
          }}
          className="flex w-full max-w-[min(220px,68vw)] items-center justify-center"
        >
          <img
            src={logo}
            alt="गेंदा फूल"
            className="h-auto w-full object-contain"
          />
        </motion.div>

        {account ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
            className="mt-5 w-full rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-2 shadow-sm"
          >
            {account.displayName && account.initial ? (
              <div className="mb-2 flex items-center gap-2 border-b border-gray-200/80 pb-2">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: primary }}
                  aria-hidden
                >
                  {account.initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Signed in as
                  </p>
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {account.displayName}
                  </p>
                </div>
              </div>
            ) : null}

            {account.addressLine ? (
              <div className="flex gap-1.5 rounded-lg bg-white/90 px-2 py-1.5">
                <IoLocationOutline
                  className="mt-px h-3.5 w-3.5 shrink-0 text-gray-500"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500">
                    Address
                  </p>
                  <p className="text-xs leading-snug text-gray-800 line-clamp-2">
                    {account.addressLine}
                  </p>
                </div>
              </div>
            ) : (
              <p className="py-0.5 text-center text-[11px] text-gray-500">
                No saved address
              </p>
            )}

            <div className="mt-1.5 flex gap-1.5 rounded-lg bg-white/90 px-2 py-1.5">
              <IoStorefrontOutline
                className="mt-px h-3.5 w-3.5 shrink-0 text-gray-500"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500">
                  Store
                </p>
                <p className="truncate text-xs font-medium text-gray-800">
                  {account.storeName}
                </p>
              </div>
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
};

export default Startup;
