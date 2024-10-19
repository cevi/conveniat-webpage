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
    <article className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="max-w-lg font-serif text-4xl font-bold leading-tight">Landing Page</h1>

      <h2>Latest Blog Articles</h2>

      <div className="max-w-8xl mx-auto mt-12 grid grid-cols-2 gap-8">
        {blogs.map((blog) => (
          <a key={blog.id} className="blog bg-amber-200 p-12" href={`/blog/${blog.urlSlug}`}>
            <h3 className="max-w-lg font-serif text-2xl font-bold leading-tight">{blog.blogH1}</h3>
            <p>{blog.blogH1}</p>
          </a>
        ))}
      </div>
    </article>
  )
}

export default Page
