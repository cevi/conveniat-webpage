import React from 'react';

export const FooterMenuArea: React.FC = () => {
  return (
    <div className="flex h-[260px] w-full flex-col items-center justify-center space-y-8 bg-green-200">
      <div className="flex flex-col items-center justify-center">
        <span className="font-heading text-[14px] font-extrabold text-green-600">Spenden</span>
        <span className="font-inter text-[14px] font-normal leading-[24px] text-green-600">
          CH23 8080 8002 2706 7598 8
        </span>
      </div>

      <div className="flex flex-col items-center justify-center">
        <span className="font-heading text-[14px] font-extrabold text-green-600">
          Conveniat 2027
        </span>
        <span className="font-inter text-[14px] font-normal leading-[24px] text-green-600">
          Kontakt aufnehmen
        </span>
        <span className="font-inter text-[14px] font-normal leading-[24px] text-green-600">
          Über das Projekt
        </span>
      </div>
    </div>
  );
};
