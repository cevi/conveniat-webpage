import { PublishingStatusBadges } from '@/utils/localizedCollection/components/PublishingStatusBadges';

const PublishingStatus = () => (
  <div className="divide-slate-600 mb-8">
    <div className="my-3">
      <p className="text-gray-600 max-w-prose text-sm font-medium">
        This content type can be published in multiple languages. If you change any field, make sure
        to publish the changes in all languages you modified.
      </p>
      <span className="text-gray-600 me-2 py-0.5 text-sm font-medium">Publishing Status: </span>
      <PublishingStatusBadges />
    </div>
    <hr className="bg-gray-200 dark:bg-gray-700 my-8 h-px border-0" />
  </div>
);

export default PublishingStatus;
