import Image from 'next/image';
import React from 'react';

export const ParagraphImage: React.FC = () => {
  return (
    <div className="my-8 select-none">
      <Image
        className="aspect-[5/3] max-h-[470px] rounded-2xl bg-white object-cover max-md:aspect-square"
        src="/imgs/Konekta_5-min.jpg"
        alt="Konekta 2024"
        width={760}
        height={456}
      />

      <div className="mx-auto mt-1 w-full text-balance py-2 text-center text-xs text-gray-300 transition-opacity duration-300 lg:max-w-md">
        Lorem Ipsum is simply dummy text of the printing and typesetting industry.
      </div>
    </div>
  );
};
