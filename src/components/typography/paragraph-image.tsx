import Image from 'next/image';
import React from 'react';

export const ParagraphImage: React.FC = () => {
  return (
    <div className="my-8 select-none bg-white">
      <Image
        className="rounded-2xl"
        src="/imgs/Konekta_5-min.jpg"
        alt="Konekta 2024"
        width={1200}
        height={800}
      />
    </div>
  );
};
