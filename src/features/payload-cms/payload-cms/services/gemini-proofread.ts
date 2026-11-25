import type { LocalizedFieldReference } from '@/features/payload-cms/payload-cms/services/field-introspection';
import {
  countOccurrences,
  lexicalPlainText,
  PROOFREAD_CATEGORIES,
  type ProofreadFieldType,
  type ProofreadFinding,
} from '@/features/payload-cms/payload-cms/utils/proofread';
import type { Config } from '@/features/payload-cms/payload-types';
import { z } from 'zod';

/**
 * The lite model answers a page in one to five seconds. The full Flash models took between 40
 * seconds and three minutes for the same request in November 2026, far too slow for a dialog.
 */
const GEMINI_MODEL = 'gemini-3.5-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/** A long page is checked from the top; the rest would only make every check slower. */
const MAX_CHARACTERS = 30_000;
const MAX_FINDINGS = 50;
const CONTEXT_CHARACTERS = 30;

/** One field's text, as sent to Gemini. */
export interface ProofreadSegment {
  id: number;
  path: string;
  fieldType: ProofreadFieldType;
  label: string;
  text: string;
}

const LANGUAGE_NAMES: Record<Config['locale'], string> = {
  de: 'Swiss Standard German',
  fr: 'French',
  en: 'English',
};

const prettifyName = (name: string): string =>
  name.replaceAll(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (first) => first.toUpperCase());

const resolveLabel = (reference: LocalizedFieldReference, locale: Config['locale']): string => {
  const { label } = reference;
  if (typeof label === 'string' && label !== '') return label;
  if (typeof label === 'object' && label !== null) {
    const labels = label as Record<string, unknown>;
    const localized = labels[locale] ?? labels['de'];
    if (typeof localized === 'string' && localized !== '') return localized;
  }
  return prettifyName(reference.path.at(-1) ?? '');
};

/**
 * Collects the text of every localized text, textarea and rich text field in `data`, the form
 * state of one locale, with the path the admin form knows the field by.
 */
export const collectProofreadSegments = (
  data: unknown,
  references: LocalizedFieldReference[],
  locale: Config['locale'],
): ProofreadSegment[] => {
  const referenceBySchemaPath = new Map(references.map((r) => [r.path.join('.'), r]));
  const segments: ProofreadSegment[] = [];
  let characters = 0;

  const push = (reference: LocalizedFieldReference, formPath: string[], text: string): void => {
    if (text.trim() === '' || characters + text.length > MAX_CHARACTERS) return;
    characters += text.length;
    segments.push({
      id: segments.length,
      path: formPath.join('.'),
      fieldType: reference.type,
      label: resolveLabel(reference, locale),
      text,
    });
  };

  const walk = (value: unknown, schemaPath: string[], formPath: string[]): void => {
    if (Array.isArray(value)) {
      for (const [index, item] of value.entries()) {
        const blockType =
          typeof item === 'object' && item !== null
            ? (item as Record<string, unknown>)['blockType']
            : undefined;
        const itemSchemaPath =
          typeof blockType === 'string' ? [...schemaPath, '[]', blockType] : [...schemaPath, '[]'];
        walk(item, itemSchemaPath, [...formPath, String(index)]);
      }
      return;
    }
    if (typeof value !== 'object' || value === null) return;

    for (const [key, child] of Object.entries(value)) {
      const childSchemaPath = [...schemaPath, key];
      const childFormPath = [...formPath, key];
      const reference = referenceBySchemaPath.get(childSchemaPath.join('.'));
      if (reference === undefined) {
        walk(child, childSchemaPath, childFormPath);
      } else if (reference.type === 'richText') {
        push(reference, childFormPath, lexicalPlainText(child));
      } else if (typeof child === 'string') {
        push(reference, childFormPath, child);
      }
    }
  };

  walk(data, [], []);
  return segments;
};

const GLOSSARY = `
- conveniat27: the camp's name, always lower case and written together with 27 (not "Conveniat 27", "conveniat 2027", "Conveniat27"). It takes the neuter article like any camp: "das conveniat27", "am conveniat27" are correct.
- Cevi.DB: the member database, exactly like this (not "CeviDB", "Cevi DB", "Cevi-DB", "Hitobito").
- der Cevi: the association is masculine in German ("der Cevi", "beim Cevi", not "die Cevi").
- Abteilung: a local Cevi group. conveniat27 never says "Ortsgruppe".
- Hof, plural Höfe: the smallest unit on the camp ground. Quartier, plural Quartiere. Gesamtlager.
- Quartierverantwortliche (QV), Abteilungsverantwortliche Person (AVP), Hof-J+S-Hauptleitung, Hofcoach.
- Kernteam, Lageverfolgungszentrum (LVZ), Ressortmitglied, Ressort.
- Ressorts: FUSI, KOMA, PROST! (with the exclamation mark).
- Hofprogramm (HP), Ressortprogramm (RP), Externes Programm (EP), Events (EVN), Leitendenevent.
- Helfende (singular Helfende/r), Schichteinsätze, Definitive Anmeldung, Teilnahmeprognose.
- Aufbaulager Infrastruktur, Aufbaulager Höfe, Scharniertag (Leitendentag), Abbaulager Höfe, Abbaulager Infrastruktur.
`;

const systemInstruction = (locale: Config['locale']): string => `
You proofread the content of the website and app of conveniat27, a camp of the Swiss Cevi (YMCA
youth work), right before an editor publishes it. The text is in ${LANGUAGE_NAMES[locale]}.

The input is a JSON array of segments {"id", "text"}; each segment is the text of one field.
Report problems. Do not rewrite the text.

Categories:
- "spelling": a misspelled or mistyped word.
- "grammar": agreement, case, verb form, a missing or doubled word, wrong punctuation.
- "glossary": a camp term written differently from the glossary below.
- "style": only a clear improvement, like an ambiguous sentence or a word repeated by mistake.
  At most five style findings in total. Never for tone or taste.

Rules:
- "original" is copied character for character from the segment text and is as short as
  possible while occurring only once in its segment: the wrong word, or a few words around it.
  "suggestion" replaces exactly "original".
- German is Swiss Standard German: it writes "ss" and never "ß". Never report "ss".
- Gender-inclusive forms like "Teilnehmende", "Leiter:innen" or "Leiter/innen" are intended.
- Do not report names of people, places, Abteilungen or Höfe, URLs, e-mail addresses, dates or
  numbers, unless the glossary names them.
- Never change the meaning. When unsure, do not report.
- "explanation" is one short sentence in the language of the text.
- Without problems, return an empty list.

Glossary (German terms; in French and English texts only the names apply):
${GLOSSARY}`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          segmentId: { type: 'integer' },
          category: { type: 'string', enum: [...PROOFREAD_CATEGORIES] },
          original: { type: 'string' },
          suggestion: { type: 'string' },
          explanation: { type: 'string' },
        },
        required: ['segmentId', 'category', 'original', 'suggestion', 'explanation'],
      },
    },
  },
  required: ['findings'],
} as const;

const modelFindingsSchema = z.object({
  findings: z.array(
    z.object({
      segmentId: z.number().int(),
      category: z.enum(PROOFREAD_CATEGORIES),
      original: z.string(),
      suggestion: z.string(),
      explanation: z.string(),
    }),
  ),
});

type ModelFinding = z.infer<typeof modelFindingsSchema>['findings'][number];

const geminiResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z
          .object({ parts: z.array(z.object({ text: z.string().optional() })).optional() })
          .optional(),
      }),
    )
    .optional(),
});

/** Why a check found nothing to report; it never blocks publishing. */
export class ProofreadUnavailableError extends Error {
  constructor(
    message: string,
    readonly reason: 'timeout' | 'failed',
  ) {
    super(message);
    this.name = 'ProofreadUnavailableError';
  }
}

/**
 * Keeps what the editor can act on: a place that exists in its segment and a suggestion that
 * differs from it. A model sometimes quotes text with a changed character, which would point
 * the editor nowhere.
 */
export const toFindings = (
  modelFindings: ModelFinding[],
  segments: ProofreadSegment[],
): ProofreadFinding[] => {
  const seen = new Set<string>();
  const findings: ProofreadFinding[] = [];
  for (const finding of modelFindings) {
    const segment = segments[finding.segmentId];
    const { original, suggestion } = finding;
    if (segment === undefined || original === '' || original === suggestion) continue;
    const position = segment.text.indexOf(original);
    if (position === -1) continue;
    const key = `${segment.id}:${original}`;
    if (seen.has(key)) continue;
    seen.add(key);

    findings.push({
      id: key,
      path: segment.path,
      fieldType: segment.fieldType,
      fieldLabel: segment.label,
      category: finding.category,
      original,
      suggestion,
      explanation: finding.explanation,
      before: segment.text.slice(Math.max(0, position - CONTEXT_CHARACTERS), position),
      after: segment.text.slice(
        position + original.length,
        position + original.length + CONTEXT_CHARACTERS,
      ),
      applicable: countOccurrences(segment.text, original) === 1,
    });
    if (findings.length === MAX_FINDINGS) break;
  }
  return findings;
};

const callGemini = async (body: string, apiKey: string, signal: AbortSignal): Promise<Response> =>
  fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body,
    signal,
  });

/**
 * Asks Gemini for the problems in `segments`.
 *
 * @param segments The text of the fields, from `collectProofreadSegments`.
 * @param locale The language of the text.
 * @param apiKey The deployment's Gemini key.
 * @returns The findings that point at a real place in the text.
 * @throws {ProofreadUnavailableError} When Gemini fails, is busy or takes too long.
 */
export const proofreadWithGemini = async (
  segments: ProofreadSegment[],
  locale: Config['locale'],
  apiKey: string,
): Promise<ProofreadFinding[]> => {
  if (segments.length === 0) return [];

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: systemInstruction(locale) }] },
    contents: [
      {
        role: 'user',
        parts: [{ text: JSON.stringify(segments.map(({ id, text }) => ({ id, text }))) }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseJsonSchema: RESPONSE_SCHEMA,
      thinkingConfig: { thinkingLevel: 'low' },
    },
  });

  // the dialog stays usable meanwhile, but a check that arrives after the editor
  // confirmed is of no use
  const signal = AbortSignal.timeout(20_000);
  let response: Response;
  try {
    response = await callGemini(body, apiKey, signal);
    // "high demand" passes within seconds, so one more try is worth it
    if (response.status === 503 || response.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 750));
      response = await callGemini(body, apiKey, signal);
    }
  } catch (error) {
    if (signal.aborted) throw new ProofreadUnavailableError('Gemini took too long', 'timeout');
    throw new ProofreadUnavailableError(
      `Gemini unreachable: ${error instanceof Error ? error.message : String(error)}`,
      'failed',
    );
  }

  if (!response.ok) {
    throw new ProofreadUnavailableError(`Gemini answered ${response.status}`, 'failed');
  }

  const parsed = geminiResponseSchema.safeParse(await response.json());
  const text =
    parsed.data?.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
  let modelFindings: unknown;
  try {
    modelFindings = JSON.parse(text);
  } catch {
    throw new ProofreadUnavailableError('Gemini answered without JSON', 'failed');
  }
  const findings = modelFindingsSchema.safeParse(modelFindings);
  if (!findings.success) {
    throw new ProofreadUnavailableError('Gemini answered outside the schema', 'failed');
  }
  return toFindings(findings.data.findings, segments);
};
