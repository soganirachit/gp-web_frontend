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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
            className="mt-5 flex w-full max-w-[min(260px,88vw)] flex-col items-center gap-5 px-2"
          >
            {account.displayName && account.initial ? (
              <div className="flex  items-center gap-1.5 text-center">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: primary }}
                  aria-hidden
                >
                  {account.initial}
                </div>
                
                <p className="max-w-full truncate px-1 text-[15px] font-semibold tracking-tight text-slate-900">
                  {account.displayName}
                </p>
              </div>
            ) : (
              <p className="text-center text-[13px] font-medium text-slate-400">
                You&apos;re signed in
              </p>
            )}

            <div className="flex w-full flex-col gap-4">
              {account.addressLine ? (
                <div className="flex gap-2.5">
                  <IoLocationOutline
                    className="mt-0.5 h-[18px] w-[18px] shrink-0"
                    style={{ color: primary }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-slate-400">
                      Delivering to
                    </p>
                    <p className="mt-0.5 text-left text-[12px] font-normal leading-relaxed text-slate-600 line-clamp-3">
                      {account.addressLine}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-center text-[11px] text-slate-400">
                  No saved address yet
                </p>
              )}

              <div className="flex gap-2.5">
                <IoStorefrontOutline
                  className="mt-0.5 h-[18px] w-[18px] shrink-0"
                  style={{ color: primary }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-slate-400">
                    Your store
                  </p>
                  <p className="mt-0.5 truncate text-left text-[12px] font-semibold text-slate-800">
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
