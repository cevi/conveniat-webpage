import { Flag, MessageCircleQuestion, MessageSquare } from 'lucide-react';
import type React from 'react';

export const AnnotationForumAndReportSection: React.FC = () => {
  return (
    <div className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <MessageCircleQuestion size={18} className="text-conveniat-green" />
        <h3 className="text-conveniat-green font-semibold">conveniat27 Forum</h3>
      </div>
      <div className="space-y-2">
        <button className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left hover:border-gray-300 hover:bg-gray-50">
          <MessageSquare size={16} className="text-blue-600" />
          <div>
            <div className="font-medium text-gray-900">View Forum Posts</div>
            <div className="text-sm text-gray-600">See what others are saying</div>
          </div>
        </button>
        <button className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left hover:border-gray-300 hover:bg-gray-50">
          <Flag size={16} className="text-orange-600" />
          <div>
            <div className="font-medium text-gray-900">Report an Issue</div>
            <div className="text-sm text-gray-600">Broken toilet, maintenance needed, etc.</div>
          </div>
        </button>
      </div>
    </div>
  );
};
