'use client'

import { cva } from 'class-variance-authority'
import { useHasPendingChanges, useIsPublished } from '@/utils/localizedCollection/hooks'

const languageStatusClasses = cva('text-sm font-medium me-2 px-2.5 py-0.5 rounded relative group', {
  variants: {
    pendingChanges: {
      true: '',
      false: '',
    },
    published: {
      true: '',
      false: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    },
  },
  compoundVariants: [
    {
      published: true,
      pendingChanges: true,
      className: 'border-solid border-2 border-green-900 text-green-800 dark:text-green-300',
    },
    {
      published: true,
      pendingChanges: false,
      className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    },
  ],
  defaultVariants: {
    published: false,
    pendingChanges: false,
  },
})

const LanguageStatus = ({
  published,
  pendingChanges,
  label,
}: {
  published: boolean
  pendingChanges: boolean
  label: string
}) => {
  const tooltip = pendingChanges
    ? 'Published but has unpublished changes'
    : published
      ? 'Published and up to date'
      : 'Not published'

  return (
    <span className={languageStatusClasses({ published, pendingChanges })}>
      {label}
      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 w-max px-2 py-1 bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {tooltip}
      </span>
    </span>
  )
}

const LanguageStatusPlaceholder = ({ label }: { label: string }) => (
  <span className="bg-gray-200 text-gray-400 text-sm font-medium me-2 px-2.5 py-0.5 rounded animate-pulse">
    {label}
  </span>
)

const PublishingStatus = () => {
  const hasPendingChanges = useHasPendingChanges(1000)
  const isPublished = useIsPublished(1000)

  return (
    <div className="mb-8 divide-slate-600">
      <div className="my-3">
        <p className="text-sm font-medium text-gray-600 max-w-prose">
          This content type can be published in multiple languages. If you change any field, make
          sure to publish the changes in all languages you modified.
        </p>
        <span className="text-sm font-medium me-2 py-0.5 text-gray-600">Publishing Status: </span>

        {Object.entries(isPublished).map(([locale, published]) =>
          published === undefined ? (
            <LanguageStatusPlaceholder key={locale} label={locale} />
          ) : (
            <LanguageStatus
              key={locale}
              published={published}
              pendingChanges={hasPendingChanges[locale] || false}
              label={locale}
            />
          ),
        )}
      </div>
      <hr className="h-px my-8 bg-gray-200 border-0 dark:bg-gray-700" />
    </div>
  )
}

export default PublishingStatus
