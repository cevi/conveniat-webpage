import type { Endpoint } from 'payload';
import {
  billingExportCsvHandler,
  billingGenerateHandler,
  billingPreviewPdfHandler,
  billingRegenerateAllHandler,
  billingRegenerateSingleHandler,
  billingSendHandler,
  billingSendSingleHandler,
  billingSyncHandler,
} from '@/features/billing/api/bill-admin-api';

export const billingEndpoints: Endpoint[] = [
  {
    path: '/confidential/billing/sync',
    method: 'post',
    handler: billingSyncHandler,
  },
  {
    path: '/confidential/billing/generate',
    method: 'post',
    handler: billingGenerateHandler,
  },
  {
    path: '/confidential/billing/regenerate-all',
    method: 'post',
    handler: billingRegenerateAllHandler,
  },
  {
    path: '/confidential/billing/regenerate-single',
    method: 'post',
    handler: billingRegenerateSingleHandler,
  },
  {
    path: '/confidential/billing/send',
    method: 'post',
    handler: billingSendHandler,
  },
  {
    path: '/confidential/billing/send-single',
    method: 'post',
    handler: billingSendSingleHandler,
  },
  {
    path: '/confidential/billing/export-csv',
    method: 'get',
    handler: billingExportCsvHandler,
  },
  {
    path: '/confidential/billing/preview-pdf',
    method: 'get',
    handler: billingPreviewPdfHandler,
  },
];
