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
            className="mt-5 w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_12px_40px_-12px_rgba(15,23,42,0.14)]"
          >
            {account.displayName && account.initial ? (
              <div
                className="flex items-center gap-3.5 border-b border-slate-100 px-4 py-4"
                style={{
                  background: `linear-gradient(145deg, ${primary}12 0%, transparent 58%)`,
                }}
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold text-white shadow-sm"
                  style={{
                    backgroundColor: primary,
                    boxShadow: `0 0 0 2px #fff, 0 0 0 4px ${primary}40`,
                  }}
                  aria-hidden
                >
                  {account.initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-500">Signed in as</p>
                  <p className="mt-0.5 truncate text-base font-semibold tracking-tight text-slate-900">
                    {account.displayName}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="px-4">
              {account.addressLine ? (
                <div className="flex gap-3 border-b border-slate-100 py-3.5">
                  <IoLocationOutline
                    className="mt-0.5 h-5 w-5 shrink-0 text-slate-400"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-500">Delivery address</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-800 line-clamp-2">
                      {account.addressLine}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="border-b border-slate-100 py-3.5 text-center text-sm text-slate-500">
                  No saved address yet
                </p>
              )}

              <div className="flex gap-3 py-3.5">
                <IoStorefrontOutline
                  className="mt-0.5 h-5 w-5 shrink-0 text-slate-400"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-500">Your store</p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                    {account.storeName}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
};

export default Startup;
