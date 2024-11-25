import { PublishingStatusBadges } from '@/payload-cms/components/multi-lang-publishing/publishing-status-badges';

const PublishingStatus = () => (
  <div className="divide-slate-600 mb-8">
    <div className="my-3">
      <p className="max-w-prose text-sm font-medium text-gray-600">
        This content type can be published in multiple languages. If you change any field, make sure
        to publish the changes in all languages you modified.
      </p>
      <span className="me-2 py-0.5 text-sm font-medium text-gray-600">Publishing Status: </span>
      <PublishingStatusBadges />
    </div>
    <hr className="my-8 h-px border-0 bg-gray-200 dark:bg-gray-700" />
  </div>
);

export default PublishingStatus;
