import Image from 'next/image';
import React from 'react';

export const ParagraphImage: React.FC = () => {
  return (
    <div className="-mx-[8px] my-[32px] bg-white">
      <Image
        className="rounded-[16px]"
        src="/imgs/big-tent.png"
        alt="Konekta 2024"
        width={1200}
        height={800}
      />
    </div>
  );
};
