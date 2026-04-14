import React from 'react';

import { AuthProvider } from '../../contexts/AuthContext';
import { PlatformProvider } from '../../contexts/PlatformContext';

const AppProviders = ({ children }) => (
  <AuthProvider>
    <PlatformProvider>{children}</PlatformProvider>
  </AuthProvider>
);

export default AppProviders;

