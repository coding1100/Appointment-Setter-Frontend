export const FALLBACK_APP_NAME = "Appointment Setter";

export const getAppName = () => {
  return (
    process.env.REACT_APP_APP_NAME ||
    process.env.REACT_APP_APP_Name ||
    process.env.APP_Name ||
    FALLBACK_APP_NAME
  );
};

