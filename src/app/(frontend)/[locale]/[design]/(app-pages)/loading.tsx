import React from 'react';

const Loading: React.FC = () => {
  return (
    <div className="fixed left-0 top-[62px] z-30 h-[calc(100dvh-62px)] w-full bg-[#f8fafc] xl:left-[480px] xl:w-[calc(100dvw-480px)]">
      <div className="flex h-full w-full items-center justify-center">
        <div className="border-conveniat-green border-3 h-12 w-12 animate-spin rounded-full border-solid border-t-transparent"></div>
      </div>
    </div>
  );
};

export default Loading;
