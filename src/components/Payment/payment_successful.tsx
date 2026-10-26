import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import allsetLogo from "../../assets/All/allset_logo.png";
import {
  DAILY_WALLET_PATH,
  GP_DAILY,
  GP_STORE,
  featureFromPathPrefix,
} from "../../config/routes.config";
import { getLastUsedFeature } from "../../utils/lastUsedFeature";
import { GpButton } from "../ui/GpButton";

type PaymentSuccessState = {
  orderId?: string;
  orderNumber?: string;
  amount?: number;
};

const PaymentSuccessful = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as PaymentSuccessState;

  const orderRef = (state.orderNumber || state.orderId || "").trim();
  const amount =
    typeof state.amount === "number" && Number.isFinite(state.amount)
      ? state.amount
      : null;

  const homePath = useMemo(() => {
    const fromPath = featureFromPathPrefix(location.pathname);
    if (fromPath === "gpDaily") return GP_DAILY;
    if (fromPath === "gpStore") return GP_STORE;
    const last = getLastUsedFeature();
    return last === "gpDaily" ? GP_DAILY : GP_STORE;
  }, [location.pathname]);

  const ordersPath = `${homePath}/orders`;

  return (
    <div className="min-h-screen bg-[#f8f6f1] flex items-center justify-center p-4 pb-nav-bottom">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="bg-[#f8f6f1] p-8 sm:p-12 flex flex-col items-center justify-center relative">
          <motion.img
            src={allsetLogo}
            alt="Payment successful"
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: 0.2,
            }}
            className="w-24 h-24 sm:w-28 sm:h-28 object-contain mb-6"
          />

          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 text-center tracking-wide mb-2">
            Payment successful
          </h1>

          {orderRef ? (
            <p className="text-center text-sm text-gray-700 mb-1">
              Order{" "}
              <span className="font-semibold text-gray-900">{orderRef}</span>
            </p>
          ) : (
            <p className="text-center text-sm text-gray-600 mb-1">
              Your payment went through. If you do not see an order yet, check
              My Orders in a moment.
            </p>
          )}

          {amount != null && amount > 0 ? (
            <p className="text-center text-base font-medium text-gray-800 mb-6">
              ₹{amount.toLocaleString("en-IN")}
            </p>
          ) : (
            <div className="mb-6" />
          )}

          <div className="flex w-full flex-col gap-3">
            {orderRef ? (
              <GpButton
                type="button"
                variant="primary"
                className="w-full"
                onClick={() =>
                  navigate(`${ordersPath}/${encodeURIComponent(orderRef)}`)
                }
              >
                View order
              </GpButton>
            ) : (
              <GpButton
                type="button"
                variant="primary"
                className="w-full"
                onClick={() => navigate(ordersPath)}
              >
                View my orders
              </GpButton>
            )}
            <GpButton
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => navigate(homePath)}
            >
              Back to home
            </GpButton>
          </div>

          {homePath === GP_DAILY ? (
            <button
              type="button"
              className="mt-4 text-sm font-medium text-[#19411F] underline-offset-2 hover:underline"
              onClick={() => navigate(DAILY_WALLET_PATH)}
            >
              Open wallet
            </button>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentSuccessful;
