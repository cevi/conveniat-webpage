import config from '@payload-config';
import { getPayload } from 'payload';

import './globals.css';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { HeadlineH1 } from '@/components/headline-h1';
import { TeaserText } from '@/components/teaser-text';
import { CallToAction } from '@/components/call-to-action';
import { SubheadingH2 } from '@/components/subheading-h2';

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
      <HeadlineH1>Welcome to Conveniat 2027</HeadlineH1>

      <TeaserText>
        Apparently we had reached a great height in the atmosphere, for the sky was a dead black,
        and the stars had ceased to twinkle. By the same illusion which lifts the horizon of the sea
        to the level of the spectato.
      </TeaserText>

      <CallToAction>Erfahre mehr &gt;</CallToAction>

      <div className="-mx-8">
        <Image src="/big-tent.png" alt="Konekta 2024" width={1200} height={800} />
      </div>

      <SubheadingH2>This is Just a Subheading</SubheadingH2>

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

      <SubheadingH2> Another Subheading</SubheadingH2>

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

      <SubheadingH2> Latest Blog Articles</SubheadingH2>

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
