'use client'
import { cva } from 'class-variance-authority'
import { useHasPendingChanges, useIsPublished } from '@/utils/localizedCollection/hooks'
import { Config } from '@/payload-types'

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
  let tooltip = 'Not published'
  if (pendingChanges) {
    tooltip = 'Published but has unpublished changes'
  } else if (published) {
    tooltip = 'Published and up to date'
  }
  return (
    <span className={languageStatusClasses({ published, pendingChanges })}>
      {label}
      <span className="absolute bottom-full left-1/2 mb-1 w-max -translate-x-1/2 transform rounded bg-gray-700 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        {tooltip}
      </span>
    </span>
  )
}

const LanguageStatusPlaceholder = ({ label }: { label: string }) => (
  <span className="me-2 animate-pulse rounded bg-gray-200 px-2.5 py-0.5 text-sm font-medium text-gray-400">
    {label}
  </span>
)

export const PublishingStatusBadges = () => {
  const { isPublished, error: errIsPub } = useIsPublished()
  const { hasUnpublishedChanges, error: errHasUnpub } = useHasPendingChanges()

  if (errIsPub || errHasUnpub) {
    return <span>⚠️ Something went wrong</span>
  }

  if (!isPublished || !hasUnpublishedChanges) {
    return (
      <span>
        {['de-CH', 'en-US', 'fr-CH'].map((locale) => (
          <LanguageStatusPlaceholder key={locale} label={locale} />
        ))}
      </span>
    )
  }

  return (
    <span>
      {Object.entries(isPublished).map(([locale, published]) => (
        <LanguageStatus
          key={locale}
          published={published}
          pendingChanges={hasUnpublishedChanges[locale as Config['locale']]}
          label={locale}
        />
      ))}
    </span>
  )
}
