import React from 'react';

const Loading: React.FC = () => {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="animate-spin rounded-full border-3 border-solid border-conveniat-green border-t-transparent h-12 w-12"></div>
    </div>
  );
};

export default Loading;
