import config from '@payload-config';
import { getPayload } from 'payload';

import './globals.css';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

const Page: React.FC = async () => {
  const payload = await getPayload({ config });

  const blogs_paged = await payload.find({
    collection: 'blog',
    where: {
      _localized_status: {
        equals: {
          published: true,
        },
      },
    },
    limit: 5,
  });

  const blogs = blogs_paged.docs;

  return (
    <article className="mx-auto max-w-6xl px-8 py-8">
      <h1 className="max-w-lg font-heading text-[26px] font-extrabold leading-[40px] text-conveniat-green-500">
        Landing Page (Prod Build)
      </h1>

      <p className="pb-12 font-body text-base font-normal text-conveniat-text">
        Apparently we had reached a great height in the atmosphere, for the sky was a dead black,
        and the stars had ceased to twinkle. By the same illusion which lifts the horizon of the sea
        to the level of the spectato.
      </p>

      <div className="mb-20 flex h-fit min-h-full justify-end">
        <Link href="/">
          <button className="rounded-[5px] bg-conveniat-green-500 px-12 py-4 text-center font-heading text-lg font-bold leading-normal text-[#f3f3f3] hover:bg-conveniat-green-600">
            Erfahre mehr &gt;
          </button>
        </Link>
      </div>

      <div className="-mx-8">
        <Image src="/big-tent.png" alt="Konekta 2024" width={1200} height={800} />
      </div>

      <h2 className="mt-10 max-w-lg py-4 font-heading text-[20px] font-extrabold leading-[32px] text-conveniat-green-500">
        This is Just a Subheading
      </h2>

      <p className="pb-12 font-body text-sm font-normal text-conveniat-text">
        Reached a great height in the atmosphere, for the sky was a dead black, and the stars had
        ceased to twinkle. By the same illusion which lifts the horizon of the sea to the level of
        the spectato. Apparently we had reached a great height in the atmosphere, for the sky was a
        dead black, and the stars had ceased to twinkle. By the same illusion which lifts the
        horizon of the sea to the level of the spectato.{' '}
        <Link className="font-semibold text-cevi-blue-300 hover:text-cevi-blue-500" href={`/`}>
          Read more.
        </Link>
      </p>

      <h2 className="mt-10 max-w-lg py-4 font-heading text-[20px] font-extrabold leading-[32px] text-conveniat-green-500">
        Another Subheading
      </h2>

      <p className="pb-12 font-body text-sm font-normal text-conveniat-text">
        Reached a great height in the atmosphere, for the sky was a dead black, and the stars had
        ceased to twinkle. By the same illusion which lifts the horizon of the sea to the level of
        the spectato. Apparently we had reached a great height in the atmosphere, for the sky was a
        dead black, and the stars had ceased to twinkle. By the same illusion which lifts the
        horizon of the sea to the level of the spectato
      </p>

      <div className="mb-16 mt-8 flex flex-col items-center justify-center space-y-4 text-center">
        <span className="max-w-xl font-['Solitreo'] text-cite font-normal text-conveniat-text">
          We of the sea to the level of the spectato. Apparently we had reached a great height in
          the atmosphere. For the sky.
        </span>
        <div className="flex flex-col items-center justify-center space-y-0 text-center">
          <span className="text-conveniat-text">Hans Muser v/o Musterli</span>
          <span className="text-conveniat-text">Teilnehmer Conveniat 2027</span>
        </div>
      </div>

      <hr />

      <h2 className="mt-10 max-w-lg py-4 font-heading text-[20px] font-extrabold leading-[32px] text-conveniat-green-500">
        Latest Blog Articles
      </h2>

      <div className="max-w-8xl mx-auto mt-12 grid grid-cols-2 gap-8">
        {blogs.map((blog) => (
          <a key={blog.id} className="blog p-12" href={`/blog/${blog.urlSlug}`}>
            <h3 className="font-serif text-2xl max-w-lg font-bold leading-tight">{blog.blogH1}</h3>
            <p>{blog.blogH1}</p>
          </a>
        ))}
      </div>
    </article>
  );
};

export const dynamic = 'force-dynamic';
export default Page;
