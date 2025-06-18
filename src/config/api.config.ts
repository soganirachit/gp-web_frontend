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

// export const getStoreProducts = () => {
//   return `${getApiUrl()}/products`;
// };
export default config;
