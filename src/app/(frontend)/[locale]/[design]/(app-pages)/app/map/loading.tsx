import type React from 'react';

export default function MapLoading(): React.ReactNode {
  return (
    <div className="fixed top-[60px] left-0 h-[calc(100dvh-60px)] w-screen pb-20">
      <div className="flex h-full w-full items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="border-conveniat-green mx-auto h-12 w-12 animate-spin rounded-full border-3 border-solid border-t-transparent" />
        </div>
      </div>
    </div>
  );
}
