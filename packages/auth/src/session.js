export const AUTH_STORAGE_KEYS = {
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
};

export const getAccessToken = () => localStorage.getItem(AUTH_STORAGE_KEYS.accessToken);

export const getRefreshToken = () => localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken);

export const setSessionTokens = ({ accessToken, refreshToken }) => {
  if (accessToken) {
    localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, accessToken);
  }

  if (refreshToken) {
    localStorage.setItem(AUTH_STORAGE_KEYS.refreshToken, refreshToken);
  }
};

export const clearSessionTokens = () => {
  localStorage.removeItem(AUTH_STORAGE_KEYS.accessToken);
  localStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);
};

