const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

export const getApiBaseUrl = () => {
  const envUrl = process.env.REACT_APP_API_URL;

  if (!envUrl) {
    return 'http://localhost:8001';
  }

  return trimTrailingSlash(envUrl.trim());
};

export const getColdCallerBaseUrl = () => {
  const envUrl = process.env.REACT_APP_COLD_CALLER_API_URL;

  if (!envUrl) {
    return 'http://localhost:8010';
  }

  return trimTrailingSlash(envUrl.trim());
};

export const API_BASE_URL = trimTrailingSlash(getApiBaseUrl());
export const COLD_CALLER_BASE_URL = trimTrailingSlash(getColdCallerBaseUrl());
export const WS_BASE_URL = API_BASE_URL.replace(/^http/i, 'ws');

