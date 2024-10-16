import { getPayloadHMR } from '@payloadcms/next/utilities'
import configPromise from '@payload-config'
import { CalendarIcon } from 'lucide-react'
import { ErrorBoundary } from 'react-error-boundary'
import { stringDateToLocale } from '@/lib/utils'

interface BlogPostProps {
  slug?: string
}

function DateTime(props: { releaseDate: string }) {
  return (
    <time className="text-sm text-muted-foreground flex items-center gap-1">
      <CalendarIcon className="w-4 h-4" /> {stringDateToLocale(props.releaseDate)}
    </time>
  )
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

  // const fullName = (article.author as User).fullName

  return (
    <article className="mx-auto px-4 py-8 max-w-6xl">

      {
        blog_de_CH?._localized_status && blog_de_CH?._localized_status.published && (
          <div className="px-3 py-1 text-xs font-semibold bg-amber-500 text-amber-950 rounded-full">
            DE: {blog_de_CH?.blogH1}
          </div>
        )
      }

      {
        blog_fr_CH?._localized_status && blog_fr_CH?._localized_status.published && (
          <div className="px-3 py-1 text-xs font-semibold bg-amber-500 text-amber-950 rounded-full">
            FR: {blog_fr_CH?.blogH1}
          </div>
        )
      }

      {
        blog_en_US?._localized_status && blog_en_US?._localized_status.published && (
          <div className="px-3 py-1 text-xs font-semibold bg-amber-500 text-amber-950 rounded-full">
            EN: {blog_en_US?.blogH1}
          </div>
        )
      }


      {/*
      <div className="flex columns-2 gap-8 mt-8 mb-16">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <span className="px-3 py-1 text-xs font-semibold bg-amber-500 text-amber-950 rounded-full">
              {article.blogShortTitle.toUpperCase()}
            </span>
            <DateTime releaseDate={article.releaseDate} />
          </div>
          <span className="text-sm text-muted-foreground mb-6 block">
            By {fullName}
          </span>

          <h1 className="text-4xl font-serif font-bold leading-tight max-w-lg">{article.blogH1}</h1>

          <div className="flex items-center gap-4 mt-4 max-w-2xl">{article.blogCaption}</div>
        </div>

        <div className="border border-gray-300 rounded-lg overflow-hidden p-2 max-w-md">
          <Image
            src="https://g-x0ejcwlecz9.vusercontent.net/placeholder.svg"
            alt="Hands typing on a laptop with red warning symbols"
            width={800}
            height={800}
            className="rounded-lg"
          />
        </div>
      </div>

      <div
        className="mx-auto py-35 s:py-100 rounded-3xl p-12 max-w-4xl"
        style={{ backgroundColor: '#fffaf5' }}
      >
        <div className="my-5 text-md text-gray-700">
          {article.blogParagraph.map((block: any, index: number) => {
            const child = block.children[0]
            return (
              <div key={index}>
                <p className="mb-5">{child.text}</p>
              </div>
            )
          })}
        </div>
      </div>
      */}
    </article>
  )
}

const Page = async ({ params }: any) => {
  const { slug } = params

  return (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <BlogPost slug={slug} />
    </ErrorBoundary>
  )
}

export default Page
