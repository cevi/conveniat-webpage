import { getPayloadHMR } from '@payloadcms/next/utilities'
import configPromise from '@payload-config'
import { ErrorBoundary } from 'react-error-boundary'

interface BlogPostProps {
  slug?: Promise<string>
}

async function BlogPost({ slug }: BlogPostProps) {
  const payload = await getPayloadHMR({ config: configPromise })

  const article_paged = await payload.find({
    collection: 'blog',
    limit: 1,
    where: {
      and: [{ urlSlug: { equals: slug } }],
    },
  })
  const article = article_paged.docs[0]

  const blog_de_CH = await payload.findByID({
    id: article.id,
    collection: 'blog',
    locale: 'de-CH',
    fallbackLocale: undefined,
    depth: 0,
  })

  const blog_fr_CH = await payload.findByID({
    id: article.id,
    collection: 'blog',
    locale: 'fr-CH',
    fallbackLocale: undefined,
    depth: 0,
  })

  const blog_en_US = await payload.findByID({
    collection: 'blog',
    id: article.id,
    locale: 'en-US',
    fallbackLocale: undefined,
    depth: 0,
  })

  return (
    <article className="mx-auto max-w-6xl px-4 py-8">
      {blog_de_CH._localized_status.published && (
        <div className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-amber-950">
          DE: {blog_de_CH.blogH1}
        </div>
      )}

      {blog_fr_CH._localized_status.published && (
        <div className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-amber-950">
          FR: {blog_fr_CH.blogH1}
        </div>
      )}

      {blog_en_US._localized_status.published && (
        <div className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-amber-950">
          EN: {blog_en_US.blogH1}
        </div>
      )}
    </article>
  )
}

const Page = ({ params }: { params: { slug: string } }) => {
  const { slug } = params

  return (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <BlogPost slug={slug} />
    </ErrorBoundary>
  )
}

export default Page
