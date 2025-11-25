import React from 'react';
import { Loader as LoaderIcon } from 'lucide-react';

const Loader = ({ message = 'Loading...', fullScreen = false, size = 'default' }) => {
  const sizeClasses = {
    small: 'h-6 w-6',
    default: 'h-8 w-8',
    large: 'h-12 w-12'
  };

  const containerClasses = fullScreen 
    ? 'flex items-center justify-center min-h-screen' 
    : 'flex items-center justify-center';

  return (
    <div className={containerClasses}>
      <div className="text-center">
        <LoaderIcon className={`${sizeClasses[size]} animate-spin text-blue-600 mx-auto mb-4`} />
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
};

export default Loader;

