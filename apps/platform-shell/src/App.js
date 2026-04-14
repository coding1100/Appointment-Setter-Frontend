import React, { useMemo } from 'react';
import { RouterProvider } from 'react-router-dom';

import ErrorBoundary from './components/ErrorBoundary';
import AppProviders from './app/providers/AppProviders';
import { createAppRouter } from './app/router';

function App() {
  const router = useMemo(() => createAppRouter(), []);

  return (
    <ErrorBoundary>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </ErrorBoundary>
  );
}

export default App;
