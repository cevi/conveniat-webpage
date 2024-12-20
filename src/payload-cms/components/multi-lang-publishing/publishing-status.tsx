import { PublishingStatusBadges } from '@/payload-cms/components/multi-lang-publishing/publishing-status-badges';
import React from 'react';

const PublishingStatus: React.FC = () => (
  <div className="divide-slate-600 mb-8">
    <div className="my-3">
      <span className="me-2 py-0.5 text-sm font-medium text-gray-600">
        Publishing Status:
        <br />
      </span>
      <PublishingStatusBadges />
    </div>
  </div>
);

export default PublishingStatus;
