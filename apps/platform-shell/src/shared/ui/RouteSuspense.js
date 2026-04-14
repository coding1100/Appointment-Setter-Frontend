import React, { Suspense } from 'react';

import Loader from '../../components/Loader';

const RouteSuspense = ({ children, message = 'Loading workspace...' }) => (
  <Suspense fallback={<Loader message={message} />}>{children}</Suspense>
);

export default RouteSuspense;

