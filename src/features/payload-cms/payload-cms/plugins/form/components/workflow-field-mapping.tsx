'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { extractFields } from '@/utils/get-form-fields';
import { useField, useForm, useLocale } from '@payloadcms/ui';
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
  const { value: mappingRaw, setValue } = useField<Record<string, unknown>>({ path });
  const mapping = mappingRaw as Record<string, Record<string, string> | string> | undefined;

  const { value: selectedWorkflowsRaw } = useField<string | string[]>({ path: 'workflow' });
  const selectedWorkflows = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (selectedWorkflowsRaw === undefined || selectedWorkflowsRaw === null) return [];
    return Array.isArray(selectedWorkflowsRaw) ? selectedWorkflowsRaw : [selectedWorkflowsRaw];
  }, [selectedWorkflowsRaw]);
  const { code } = useLocale();

  // Subscribe to form state to extract all available fields recursively
  const { getData } = useForm();
  const data = getData();

  const availableFormFields = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (data === undefined || data === null) return [];
    return extractFields(data);
  }, [data]);

  // If no workflow selected, return nothing
  if (selectedWorkflows.length === 0) {
    return <></>;
  }

  const getMappingForWorkflow = (workflowKey: string): Record<string, string> => {
    if (!mapping) return {};

    // Check if we use the nested new format
    if (mapping[workflowKey] !== undefined && typeof mapping[workflowKey] === 'object') {
      return mapping[workflowKey];
    }

    // Fallback for previous flat format: treat flat mappings as belonging to it
    return mapping as Record<string, string>;
  };

  const handleMappingChange = (workflowKey: string, inputKey: string, formField: string): void => {
    const previousWorkflowMapping = getMappingForWorkflow(workflowKey);
    setValue({
      ...mapping,
      [workflowKey]: {
        ...previousWorkflowMapping,
        [inputKey]: formField,
      },
    });
  };

  const getLocalizedValue = (value: string | Record<string, string>, key?: string): string => {
    if (typeof value === 'string') {
      return value;
    }
    return value[code] ?? value['en'] ?? Object.values(value)[0] ?? key ?? '';
  };

  return (
    <div className="bg-card text-card-foreground mb-4 rounded-md p-4">
      {selectedWorkflows.map((workflowKey, index) => {
        const currentWorkflowDefinition = workflowDefinitions[workflowKey];
        if (currentWorkflowDefinition === undefined) return <React.Fragment key={workflowKey} />;
        const currentMapping = getMappingForWorkflow(workflowKey);

        return (
          <div key={workflowKey} className={index > 0 ? 'mt-8 border-t pt-6' : ''}>
            <h3 className="mb-4 text-lg font-semibold">
              Mapping: {getLocalizedValue(currentWorkflowDefinition.label)}
            </h3>
            <p className="text-muted-foreground mb-4 text-sm">
              Map the form fields to the workflow inputs. Ensure the form fields provide the
              expected data format.
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
                      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                      value={currentMapping?.[input.key] ?? ''}
                      onValueChange={(val) => handleMappingChange(workflowKey, input.key, val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Form Field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="peopleId">N/A</SelectItem>
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
      })}
    </div>
  );
};
