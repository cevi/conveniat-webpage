export interface ParsedDsnInfo {
  action: string;
  finalRecipient?: string | undefined;
  originalRecipient?: string | undefined;
  status?: string | undefined;
  remoteMta?: string | undefined;
  diagnosticCode?: string | undefined;
  forwardedTo?: string | undefined;
  arrivalDate?: string | undefined;
  actionDate?: string | undefined;
}

export interface SmtpResult {
  success: boolean;
  to: string;
  bounceReport?: boolean;
  receivedAt?: string;
  parsedDsn?: ParsedDsnInfo;
  response?: {
    accepted?: string[];
    rejected?: string[];
    envelopeTime?: number;
    messageTime?: number;
    messageSize?: number;
    response?: string;
    messageId?: string;
    envelope?: {
      from: string;
      to: string[];
    };
  };
  error?: string;

  // Appended in component logic
  _isPendingPlaceholder?: boolean;
  _dsnHistory?: SmtpResult[];
}

export type SmtpStatusType = 'empty' | 'pending' | 'success' | 'error';

export type SmtpLanguage = 'en' | 'de' | 'fr';
