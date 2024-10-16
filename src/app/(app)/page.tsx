import { getPayloadHMR } from '@payloadcms/next/utilities'
import configPromise from '@payload-config'

const Page = async () => {
  const payload = await getPayloadHMR({ config: configPromise })

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
  })

  const blogs = blogs_paged.docs

  return (
    <article className="mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-4xl font-serif font-bold leading-tight max-w-lg">Landing Page</h1>

      <h2>Latest Blog Articles</h2>

      <div className="grid grid-cols-2 gap-8 max-w-8xl mx-auto mt-12">
        {blogs.map((blog) => (
          <a key={blog.id} className="blog bg-amber-200 p-12" href={`/blog/${blog.urlSlug}`}>
            <h3 className="text-2xl font-serif font-bold leading-tight max-w-lg">{blog.blogH1}</h3>
            <p>{blog.blogH1}</p>
          </a>
        ))}
      </div>
    </article>
  )
}

export default Page
