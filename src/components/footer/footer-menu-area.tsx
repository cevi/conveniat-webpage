import React from 'react';

export const FooterMenuArea: React.FC = () => {
  return (
    <div className="flex h-[260px] w-full flex-col items-center justify-center space-y-8 bg-conveniat-green-100">
      <div className="flex flex-col items-center justify-center">
        <span className="font-heading text-[14px] font-extrabold text-conveniat-green-500">
          Spenden
        </span>
        <span className="font-inter text-[14px] font-normal text-conveniat-green-500">
          CH23 8080 8002 2706 7598 8
        </span>
      </div>

      <div className="flex flex-col items-center justify-center">
        <span className="font-heading text-[14px] font-extrabold text-conveniat-green-500">
          Conveniat 2027
        </span>
        <span className="font-inter text-[14px] font-normal text-conveniat-green-500">
          Kontakt aufnehmen
        </span>
        <span className="font-inter text-[14px] font-normal text-conveniat-green-500">
          Über das Projekt
        </span>
      </div>
    </div>
  );
};
