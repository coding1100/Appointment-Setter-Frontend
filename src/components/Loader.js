import React from 'react';
import { Loader as LoaderIcon } from 'lucide-react';

const Loader = ({ message = 'Loading...', fullScreen = false, size = 'default' }) => {
  const sizeClasses = {
    small: 'h-6 w-6',
    default: 'h-8 w-8',
    large: 'h-12 w-12'
  };

  const containerClasses = fullScreen
    ? 'flex min-h-screen w-full items-center justify-center px-4'
    : 'flex min-h-[52vh] w-full items-center justify-center px-4 py-10';

  return (
    <div className={containerClasses}>
      <div className="text-center">
        <LoaderIcon className={`${sizeClasses[size]} mx-auto mb-4 animate-spin text-[#2f66ea]`} />
        <p className="text-sm font-medium text-white/68">{message}</p>
      </div>
    </div>
  );
};

export default Loader;

