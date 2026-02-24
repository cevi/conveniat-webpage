import type {
  ParsedDsnInfo,
  SmtpResult,
} from '@/features/payload-cms/payload-cms/components/smtp-results/smtp-results-shared';
import type { FieldHook } from 'payload';

export const parseDsnFromText = (raw: string): ParsedDsnInfo => {
  const finalRecipientMatch = raw.match(/Final-Recipient:\s*(?:rfc822;\s*)?([^\s;]+)/i);
  const originalRecipientMatch = raw.match(/Original-Recipient:\s*(?:rfc822;\s*)?([^\s;]+)/i);
  const actionMatch = raw.match(/Action:\s*([^\s]+)/i);
  const statusMatch = raw.match(/Status:\s*([^\s]+)/i);

  const remoteMtaMatch =
    raw.match(/Remote-MTA:\s*dns;\s*([^\s]+)/i) ?? raw.match(/Reporting-MTA:\s*dns;\s*([^\s]+)/i);

  const diagCodeMatch = raw.match(/Diagnostic-Code:\s*(.*?)(?:\n(?![ \t])|$)/is);

  const diagForwardMatch = raw.match(
    /Diagnostic-Code:\s*.*?<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>/i,
  );

  const arrivalMatch = raw.match(/Arrival-Date:\s*(.+)/i);

  return {
    action: actionMatch?.[1] ?? 'Unknown',
    finalRecipient: finalRecipientMatch?.[1],
    originalRecipient: originalRecipientMatch?.[1],
    status: statusMatch?.[1],
    remoteMta: remoteMtaMatch?.[1],
    diagnosticCode: diagCodeMatch?.[1]?.trim(),
    forwardedTo: diagForwardMatch?.[1],
    arrivalDate: arrivalMatch?.[1],
  };
};

export const parseSmtpResultsHook: FieldHook = ({ value }) => {
  if (!Array.isArray(value)) return value as unknown;

  return value.map((result: SmtpResult) => {
    if (result.bounceReport === true) {
      let rawText: string | undefined;
      if (typeof result.response?.response === 'string') {
        rawText = result.response.response;
      } else if (typeof result.error === 'string') {
        rawText = result.error;
      }

      if (typeof rawText === 'string' && rawText.length > 0) {
        const parsedDsn = parseDsnFromText(rawText);
        let derivedSuccess = result.success;
        if (parsedDsn.action === 'failed') {
          derivedSuccess = false;
        } else if (parsedDsn.action === 'delivered' || parsedDsn.action === 'relayed') {
          derivedSuccess = true;
        }

        return {
          ...result,
          parsedDsn,
          success: derivedSuccess,
        };
      }
    }
    return result;
  });
};
