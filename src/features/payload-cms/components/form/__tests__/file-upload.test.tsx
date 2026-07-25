/**
 * @jest-environment jsdom
 */

import { FileUpload } from '@/features/payload-cms/components/form/file-upload';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';

jest.mock('next-i18n-router/client', () => ({
  useCurrentLocale: (): string => 'de',
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const methods = useForm();
  return <FormProvider {...methods}>{children}</FormProvider>;
};

describe('FileUpload Component', () => {
  it('renders dropzone text', (): void => {
    render(
      <TestWrapper>
        <FileUpload
          blockType="fileUpload"
          name="testFile"
          label="Test File Upload"
          formId="test-form"
        />
      </TestWrapper>,
    );

    expect(screen.getByText('Test File Upload')).toBeInTheDocument();
    expect(screen.getByText(/ziehen Sie Dateien hierhin/i)).toBeInTheDocument();
  });

  it('handles drag drop event correctly', (): void => {
    render(
      <TestWrapper>
        <FileUpload
          blockType="fileUpload"
          name="testFile"
          label="Test File Upload"
          formId="test-form"
        />
      </TestWrapper>,
    );

    const dropzone = screen.getByText(/ziehen Sie Dateien hierhin/i).closest('div');
    expect(dropzone).not.toBeNull();

    const file = new File(['dummy content'], 'test-document.pdf', { type: 'application/pdf' });

    if (dropzone) {
      fireEvent.dragOver(dropzone);
      expect(screen.getByText(/Dateien hier ablegen.../i)).toBeInTheDocument();

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file],
        },
      });

      expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
    }
  });
});
