import type {
  ParsedDsnInfo,
  SmtpResult,
} from '@/features/payload-cms/payload-cms/components/smtp-results/types';
import type { FieldHook } from 'payload';

export const parseDsnsFromText = (raw: string): ParsedDsnInfo[] => {
  const dsns: ParsedDsnInfo[] = [];

  const remoteMtaMatch =
    raw.match(/Remote-MTA:\s*dns;\s*([^\s]+)/i) ?? raw.match(/Reporting-MTA:\s*dns;\s*([^\s]+)/i);

  const actionDateMatch =
    raw.match(/Last-Attempt-Date:\s*(.+)/i) ??
    raw.match(/Action-Date:\s*(.+)/i) ??
    raw.match(/^Date:\s*(.+)/im);

  const arrivalMatch = raw.match(/Arrival-Date:\s*(.+)/i);

  const globalInfo = {
    remoteMta: remoteMtaMatch?.[1]?.trim(),
    actionDate: actionDateMatch?.[1]?.trim(),
    arrivalDate: arrivalMatch?.[1]?.trim(),
  };

  const lines = raw.split(/\r?\n/);

  let currentDsn: Partial<ParsedDsnInfo> | undefined = undefined;
  let inDiagCode = false;
  let currentDiagnosticCode = '';

  for (const line of lines) {
    if (inDiagCode && (line.startsWith(' ') || line.startsWith('\t'))) {
      currentDiagnosticCode += '\n' + line.trim();
      continue;
    } else if (inDiagCode) {
      if (currentDsn !== undefined) currentDsn.diagnosticCode = currentDiagnosticCode.trim();
      inDiagCode = false;
    }

    const finalRecpMatch = line.match(/^Final-Recipient:\s*(?:rfc822;\s*)?([^\s;]+)/i);
    if (finalRecpMatch) {
      if (
        currentDsn !== undefined &&
        (currentDsn.finalRecipient !== undefined || currentDsn.originalRecipient !== undefined)
      ) {
        dsns.push(currentDsn as ParsedDsnInfo);
      }
      currentDsn = { ...globalInfo, finalRecipient: finalRecpMatch[1] as string };
      continue;
    }

    const origRecpMatch = line.match(/^Original-Recipient:\s*(?:rfc822;\s*)?([^\s;]+)/i);
    if (origRecpMatch) {
      currentDsn ??= { ...globalInfo };
      currentDsn.originalRecipient = origRecpMatch[1] as string;
      continue;
    }

    if (currentDsn !== undefined) {
      const actionMatch = line.match(/^Action:\s*([^\s]+)/i);
      if (actionMatch) currentDsn.action = (actionMatch[1] as string).toLowerCase();

      const statusMatch = line.match(/^Status:\s*([^\s]+)/i);
      if (statusMatch) currentDsn.status = statusMatch[1];

      const diagForwardMatch = line.match(
        /^Diagnostic-Code:\s*.*?<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>/i,
      );
      if (diagForwardMatch && currentDsn.forwardedTo === undefined) {
        currentDsn.forwardedTo = diagForwardMatch[1] as string;
      }

      const diagCodeMatch = line.match(/^Diagnostic-Code:\s*(.*)/i);
      if (diagCodeMatch) {
        inDiagCode = true;
        currentDiagnosticCode = diagCodeMatch[1] as string;
      }
    }
  }

  if (inDiagCode && currentDsn !== undefined) {
    currentDsn.diagnosticCode = currentDiagnosticCode.trim();
  }
  if (
    currentDsn !== undefined &&
    (currentDsn.finalRecipient !== undefined || currentDsn.originalRecipient !== undefined)
  ) {
    dsns.push(currentDsn as ParsedDsnInfo);
  }

  if (dsns.length === 0) {
    const actionMatch = raw.match(/Action:\s*([^\s]+)/i);
    const statusMatch = raw.match(/Status:\s*([^\s]+)/i);
    const diagCodeMatch = raw.match(/Diagnostic-Code:\s*(.*?)(?:\n(?![ \t])|$)/is);
    const finalRecipientMatch = raw.match(/Final-Recipient:\s*(?:rfc822;\s*)?([^\s;]+)/i);
    const originalRecipientMatch = raw.match(/Original-Recipient:\s*(?:rfc822;\s*)?([^\s;]+)/i);

    const diagForwardMatch = raw.match(
      /Diagnostic-Code:\s*.*?<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>/i,
    );

    dsns.push({
      ...globalInfo,
      action: actionMatch?.[1]?.toLowerCase() ?? 'Unknown',
      finalRecipient: finalRecipientMatch?.[1],
      originalRecipient: originalRecipientMatch?.[1],
      status: statusMatch?.[1],
      diagnosticCode: diagCodeMatch?.[1]?.trim(),
      forwardedTo: diagForwardMatch?.[1],
    });
  }

  return dsns;
};

export const parseSmtpResultsHook: FieldHook = ({ value }) => {
  if (!Array.isArray(value)) return value as unknown;

  return value.map((result: SmtpResult) => {
    if (result.bounceReport !== true) {
      return result;
    }

    let rawText: string | undefined;
    if (typeof result.response?.response === 'string') {
      rawText = result.response.response;
    } else if (typeof result.error === 'string') {
      rawText = result.error;
    }

    if (typeof rawText !== 'string' || rawText.length === 0) {
      return result;
    }

    const parsedDsns = parseDsnsFromText(rawText);

    const normalizedTo =
      typeof result.to === 'string' && result.to.length > 0 ? result.to.toLowerCase() : undefined;

    let parsedDsn =
      parsedDsns.length === 1
        ? parsedDsns[0]
        : parsedDsns.find((d) => {
            if (normalizedTo === undefined) return false;
            return (
              d.finalRecipient?.toLowerCase() === normalizedTo ||
              d.originalRecipient?.toLowerCase() === normalizedTo
            );
          });

    parsedDsn ??= parsedDsns[0];

    if (parsedDsn === undefined) {
      return result;
    }

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
  });
};
