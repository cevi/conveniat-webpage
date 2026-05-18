import React from 'react';

const Loading: React.FC = () => {
  return (
    <>
      <div className="flex h-[50dvh] w-full items-center justify-center">
        <div className="border-conveniat-green border-3 h-12 w-12 animate-spin rounded-full border-solid border-t-transparent"></div>
      </div>
    </>
  );
};

export default Loading;
