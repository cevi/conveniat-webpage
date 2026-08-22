import type React from 'react';

/**
 * Download link for one of the Excel exports rendered above an admin list view: a green button
 * with a short explanation of what the workbook contains.
 */
export const ExcelExportLink: React.FC<{
  href: string;
  label: string;
  description: string;
}> = ({ href, label, description }) => (
  <div className="flex flex-col items-start gap-2">
    <a
      href={href}
      className="cursor-pointer rounded border border-solid border-green-300 bg-green-200 px-4 py-2 text-green-900 no-underline hover:bg-green-300 dark:bg-green-700 dark:text-green-100 hover:dark:bg-green-800"
    >
      {label}
    </a>
    <p className="m-0 text-sm opacity-70">{description}</p>
  </div>
);
