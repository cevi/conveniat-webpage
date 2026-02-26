import {
  DetailRow,
  ExpandableSection,
  flattenObject,
  renderValue,
} from '@/features/registration_process/components/job-table/job-details-shared';
import React from 'react';

interface JobInputDataProperties {
  inputData: Record<string, unknown>;
}

export const JobInputData: React.FC<JobInputDataProperties> = ({ inputData }) => {
  return (
    <ExpandableSection title="Input Data">
      {Object.entries(flattenObject(inputData)).map(([key, value]) => (
        <DetailRow
          key={key}
          label={key}
          value={<span className="wrap-break-word">{renderValue(value)}</span>}
        />
      ))}
    </ExpandableSection>
  );
};
