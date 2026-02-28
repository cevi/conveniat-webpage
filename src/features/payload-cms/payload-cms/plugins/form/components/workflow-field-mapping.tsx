'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { extractFields } from '@/utils/get-form-fields';
import { useField, useLocale, useWatchForm } from '@payloadcms/ui';
import React, { useMemo } from 'react';

interface WorkflowInput {
  key: string;
  label: string | Record<string, string>;
  required: boolean;
}

interface WorkflowDefinition {
  label: string | Record<string, string>;
  inputs: WorkflowInput[];
}

interface WorkflowFieldMappingProperties {
  path: string;
  workflowDefinitions: Record<string, WorkflowDefinition>;
}

export const WorkflowFieldMapping: React.FC<WorkflowFieldMappingProperties> = ({
  path,
  workflowDefinitions,
}): React.ReactNode => {
  const { value: mappingRaw, setValue } = useField<Record<string, string>>({ path });
  const mapping = mappingRaw;

  // Infer the root path of the row data by replacing ".mapping" at the end with ".workflow"
  // E.g. "configuredWorkflows.0.mapping" -> "configuredWorkflows.0.workflow"
  const workflowPath = path.replace(/\.mapping$/, '.workflow');
  const { value: selectedWorkflow } = useField<string>({
    path: workflowPath,
  });

  const { code } = useLocale();

  const { getData: getWatchedData } = useWatchForm();
  const data = getWatchedData();

  const availableFormFields = useMemo(() => {
    return extractFields(data);
  }, [data]);

  const handleMappingChange = (inputKey: string, formField: string): void => {
    setValue({
      ...mapping,
      [inputKey]: formField,
    });
  };

  const getLocalizedValue = (value: string | Record<string, string>, key?: string): string => {
    if (typeof value === 'string') {
      return value;
    }
    return value[code] ?? value['en'] ?? Object.values(value)[0] ?? key ?? '';
  };

  const currentWorkflowDefinition = workflowDefinitions[selectedWorkflow];
  if (currentWorkflowDefinition === undefined) return <></>;

  return (
    <div className="bg-card text-card-foreground mb-4 rounded-md">
      <h3 className="mb-4 text-lg font-semibold">
        Mapping: {getLocalizedValue(currentWorkflowDefinition.label)}
      </h3>
      <p className="text-muted-foreground mb-4 text-sm">
        Map the form fields to the workflow inputs. Ensure the form fields provide the expected data
        format.
      </p>

      <div className="grid gap-4">
        {currentWorkflowDefinition.inputs.map((input) => (
          <div key={input.key} className="grid grid-cols-1 items-center gap-4 sm:grid-cols-3">
            <label className="text-sm font-medium">
              {getLocalizedValue(input.label, input.key)}{' '}
              {input.required && <span className="text-red-500">*</span>}
            </label>
            <div className="sm:col-span-2">
              <Select
                value={mapping[input.key] ?? ''}
                onValueChange={(val) => handleMappingChange(input.key, val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Form Field" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">N/A</SelectItem>
                  {availableFormFields.map((field) => (
                    <SelectItem key={field.value} value={field.value}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
