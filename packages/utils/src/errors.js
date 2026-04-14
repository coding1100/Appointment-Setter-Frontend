export const formatApiError = (err, fallback) => {
  const detail = err?.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail.map((entry) => `${entry.loc?.join('.')} - ${entry.msg}`).join(', ');
  }

  return typeof detail === 'string' ? detail : fallback;
};

