import { LinkComponent } from '@/components/ui/link-component';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { BlogArticleConverter } from '@/features/payload-cms/converters/blog-article';
import type { Permission } from '@/features/payload-cms/payload-types';
import { buildMetadata, findAlternatives } from '@/features/payload-cms/utils/metadata-helper';
import type { Locale, LocalizedCollectionComponent, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { hasPermissions } from '@/utils/has-permissions';
import config from '@payload-config';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getPayload } from 'payload';

const languageChooseText: StaticTranslationString = {
  en: 'Choose the correct article',
  de: 'Wähle den korrekten Artikel',
  fr: "Choisissez l'article correct",
};

const languagePreposition: StaticTranslationString = {
  en: 'in',
  de: 'in',
  fr: 'en',
};

const BlogPostPage: LocalizedCollectionComponent = async ({
  slugs,
  locale,
  searchParams,
  renderInPreviewMode,
}) => {
  const payload = await getPayload({ config });
  const slug = slugs.join('/');

  const currentDate = new Date().toISOString();

  const articlesInPrimaryLanguage = await payload.find({
    collection: 'blog',
    pagination: false,
    locale: locale,
    fallbackLocale: false,
    draft: renderInPreviewMode,
    where: {
      and: [
        { 'seo.urlSlug': { equals: slug } },
        // we only resolve published pages unless in preview mode
        renderInPreviewMode ? {} : { _localized_status: { equals: { published: true } } },
        renderInPreviewMode
          ? {}
          : {
              'content.releaseDate': {
                less_than_equal: currentDate,
              },
            },
      ],
    },
  });

  if (articlesInPrimaryLanguage.docs.length > 1)
    throw new Error('More than one article with the same slug found');

  const articleInPrimaryLanguage = articlesInPrimaryLanguage.docs[0];

  // article found in current locale --> render
  if (articleInPrimaryLanguage !== undefined) {
    if (
      renderInPreviewMode ||
      (await hasPermissions(articleInPrimaryLanguage.content.permissions as Permission))
    ) {
      return (
        <BlogArticleConverter
          article={articleInPrimaryLanguage}
          locale={locale}
          searchParams={searchParams}
        />
      );
    } else {
      // set error=permission in search parameters
      const searchParametersWithError: { [key: string]: string } = {
        ...searchParams,
        error: 'permission',
      };
      const searchParametersString = new URLSearchParams(searchParametersWithError).toString();
      redirect(`/${locale}/${articleInPrimaryLanguage.seo.urlSlug}?${searchParametersString}`);
    }
  }

  // fallback logic to find article in other locales
  const locales: Locale[] = i18nConfig.locales.filter((l) => l !== locale) as Locale[];

  const articles = await Promise.all(
    locales.map((l) =>
      payload.find({
        collection: 'blog',
        pagination: false,
        draft: renderInPreviewMode,
        locale: l,
        where: {
          and: [
            { 'seo.urlSlug': { equals: slug } },
            // we only resolve published pages unless in preview mode
            renderInPreviewMode ? {} : { _localized_status: { equals: { published: true } } },
            renderInPreviewMode
              ? {}
              : {
                  'content.releaseDate': {
                    less_than_equal: currentDate,
                  },
                },
          ],
        },
      }),
    ),
  )
    .then((results) =>
      results
        .filter((r) => r.docs.length === 1)
        .flatMap((r) => r.docs[0])
        .filter((a) => a !== undefined),
    )
    .then(async (a) => {
      const filteredArticles = await Promise.all(
        a.map(async (article) => await hasPermissions(article.content.permissions as Permission)),
      );
      return a.filter((_, index) => filteredArticles[index] ?? false);
    });

  // no article found --> 404
  if (articles.length === 0) {
    notFound();
  }

  // list options for user to choose from
  return (
    <article className="-auto my-8 w-full max-w-2xl px-8 max-xl:mx-auto">
      <HeadlineH1>{languageChooseText[locale]}</HeadlineH1>
      <ul>
        {articles.map((article) => (
          <li key={article.id}>
            <LinkComponent
              href={`/${article._locale.split('-')[0]}/blog/${article.seo.urlSlug}`}
              className="font-bold text-red-600"
            >
              {article.content.blogH1} {languagePreposition[locale]} {article._locale}
            </LinkComponent>
          </li>
        ))}
      </ul>
    </article>
  );
};

BlogPostPage.generateMetadata = async ({ locale, slugs }): Promise<Metadata> => {
  const payload = await getPayload({ config });
  const slug = slugs?.join('/') ?? '';
  const currentDate = new Date().toISOString();

  const result = await payload.find({
    collection: 'blog',
    pagination: false,
    fallbackLocale: false,
    locale,
    draft: false,
    where: {
      and: [
        { 'seo.urlSlug': { equals: slug } },
        { _localized_status: { equals: { published: true } } },
        { 'content.releaseDate': { less_than_equal: currentDate } },
      ],
    },
  });

  const article = result.docs[0];
  if (!article) return {};

  const blogAlternatives = await findAlternatives({
    payload,
    collection: 'blog',
    internalPageName: article.internalPageName,
    currentDate,
  });

  const germanAlternative = blogAlternatives.find((a) => a._locale.startsWith('de'));
  const canonicalLocale = germanAlternative?._locale || locale;
  const canonicalSlug = germanAlternative?.seo.urlSlug || slug;

  const alternates = Object.fromEntries(
    blogAlternatives
      .filter((alt) => alt._locale !== canonicalLocale)
      .map((alt) => [alt._locale, `/${alt._locale}/blog/${alt.seo.urlSlug}`]),
  );

  return buildMetadata({
    seo: article.seo,
    canonicalLocale,
    canonicalSlug,
    alternates,
    prefix: '/blog',
  });
};

export default BlogPostPage;
