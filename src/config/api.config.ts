interface ApiConfig {

  baseUrl: string;

  apiVersion: string;

}



const config: ApiConfig = {

  baseUrl: import.meta.env.VITE_API_BASE_URL,

  apiVersion: "v1",

};



export const getApiUrl = () => {

  return config.baseUrl;

};



export const getBasePacksUrl = () => {

  return `${getApiUrl()}/basepacks`;

};



export const getAddressesUrl = () => {

  return `${getApiUrl()}/addresses`;

};



export const getPolygonUrl = () => {

  return `${getApiUrl()}/polygon`;

};



/** Customer subscription APIs: `/api/v1/subscriptions/...` */

export const getSubscriptionsUrl = () => {

  return `${getApiUrl()}/subscriptions`;

};



/** Wallet: Postman `09 - Wallet` — `/api/v1/wallet/...` */

export const getWalletUrl = () => {

  return `${getApiUrl()}/wallet`;

};



/**

 * Razorpay payment routes — Postman `08 - Payments (Razorpay)`.

 * Avoids duplicating `/api/v1` when VITE_API_BASE_URL already includes it.

 */

export const getPaymentsRazorpayUrl = () => {

  const baseUrl = getApiUrl();

  if (baseUrl.includes("/api/v1")) {

    return `${baseUrl}/payments/razorpay`;

  }

  return `${baseUrl}/api/v1/payments/razorpay`;

};



export default config;

