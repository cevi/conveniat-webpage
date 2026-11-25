import type { LocalizedFieldReference } from '@/features/payload-cms/payload-cms/services/field-introspection';
import {
  lexicalPlainText,
  PROOFREAD_CATEGORIES,
  type ProofreadFieldType,
  type ProofreadFinding,
  replaceUniqueInLexical,
  replaceUniqueInText,
} from '@/features/payload-cms/payload-cms/utils/proofread';
import type { Config } from '@/features/payload-cms/payload-types';
import { Agent, fetch, type Response } from 'undici';
import { z } from 'zod';

/**
 * On a page with ten planted mistakes (November 2026), 3.6 Flash found all ten in 14 to 21
 * seconds and Flash-Lite seven or eight in 5 to 9, missing "PROST!" and a wrong article. The
 * dialog waits with a skip button, so quality wins; Flash-Lite answers when Flash is overloaded,
 * which it is often enough. Thinking `minimal` is as good as `low` here and faster.
 */
export const PROOFREAD_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash-lite'] as const;

export type ProofreadModel = (typeof PROOFREAD_MODELS)[number];

const modelUrl = (model: ProofreadModel): string =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

/** Longer than the slowest answer we measured, shorter than an editor's patience. */
const TIMEOUT_MS = 45_000;

/**
 * Gemini sends its headers only with the finished answer. The process-wide agent from
 * `next-auth-config.ts` and `http-client.ts` gives up after 5 or 10 seconds without headers,
 * which suits Cevi.DB but cuts off every Flash answer, so this request brings its own.
 */
const geminiAgent = new Agent({
  headersTimeout: TIMEOUT_MS,
  bodyTimeout: TIMEOUT_MS,
  connect: { timeout: 10_000 },
});

/**
 * A long page is checked from the top; the rest would only make every check slower. The editor
 * is told when text was left out, so an unchecked part never passes for a clean one.
 */
const MAX_CHARACTERS = 30_000;
const MAX_FINDINGS = 50;
const CONTEXT_CHARACTERS = 30;

/** One field's text, as sent to Gemini. */
export interface ProofreadSegment {
  id: number;
  path: string;
  fieldType: ProofreadFieldType;
  label: string;
  /** The text sent to Gemini: the field's text, or its beginning when the budget ran out. */
  text: string;
  /** The field's whole value, a string or a Lexical state, to decide whether a fix applies. */
  value: unknown;
}

export interface ProofreadSegments {
  segments: ProofreadSegment[];
  /** Whether some text did not fit into the budget and stays unchecked. */
  truncated: boolean;
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
): ProofreadSegments => {
  const referenceBySchemaPath = new Map(references.map((r) => [r.path.join('.'), r]));
  const segments: ProofreadSegment[] = [];
  let characters = 0;
  let truncated = false;

  const push = (
    reference: LocalizedFieldReference,
    formPath: string[],
    fullText: string,
    value: unknown,
  ): void => {
    if (fullText.trim() === '') return;
    const text = fullText.slice(0, MAX_CHARACTERS - characters);
    if (text.length < fullText.length) truncated = true;
    if (text.trim() === '') return;
    characters += text.length;
    segments.push({
      id: segments.length,
      path: formPath.join('.'),
      fieldType: reference.type,
      label: resolveLabel(reference, locale),
      text,
      value,
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
        push(reference, childFormPath, lexicalPlainText(child), child);
      } else if (typeof child === 'string') {
        push(reference, childFormPath, child, child);
      }
    }
  };

  walk(data, [], []);
  return { segments, truncated };
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
 * Whether a click on "Übernehmen" will apply the fix: the very check the dialog runs then, so it
 * never offers a fix it would refuse, like one across normal and bold text.
 */
const canApply = (segment: ProofreadSegment, original: string, suggestion: string): boolean => {
  if (segment.fieldType === 'richText') {
    return replaceUniqueInLexical(segment.value, original, suggestion) !== undefined;
  }
  return (
    typeof segment.value === 'string' &&
    replaceUniqueInText(segment.value, original, suggestion) !== undefined
  );
};

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
      applicable: canApply(segment, original, suggestion),
    });
    if (findings.length === MAX_FINDINGS) break;
  }
  return findings;
};

/** The `generateContent` request for `segments`. */
export const proofreadRequest = (
  segments: ProofreadSegment[],
  locale: Config['locale'],
): Record<string, unknown> => ({
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
    thinkingConfig: { thinkingLevel: 'minimal' },
  },
});

const callGemini = async (
  model: ProofreadModel,
  body: string,
  apiKey: string,
  signal: AbortSignal,
): Promise<Response> =>
  fetch(modelUrl(model), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body,
    signal,
    dispatcher: geminiAgent,
  });

/**
 * Asks Gemini for the problems in `segments`.
 *
 * @param segments The text of the fields, from `collectProofreadSegments`.
 * @param locale The language of the text.
 * @param apiKey The deployment's Gemini key.
 * @returns The model that answered and the findings that point at a real place in the text.
 * @throws {ProofreadUnavailableError} When Gemini fails, is busy or takes too long.
 */
export const proofreadWithGemini = async (
  segments: ProofreadSegment[],
  locale: Config['locale'],
  apiKey: string,
): Promise<{ model: ProofreadModel; findings: ProofreadFinding[] }> => {
  const [primary, fallback] = PROOFREAD_MODELS;
  if (segments.length === 0) return { model: primary, findings: [] };

  const body = JSON.stringify(proofreadRequest(segments, locale));
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let model: ProofreadModel = primary;
  let response: Response;
  try {
    response = await callGemini(model, body, apiKey, signal);
    // "high demand" on Flash can last for hours, so the lighter model answers instead
    if (response.status === 503 || response.status === 429) {
      model = fallback;
      response = await callGemini(model, body, apiKey, signal);
    }
  } catch (error) {
    if (signal.aborted) throw new ProofreadUnavailableError('Gemini took too long', 'timeout');
    // undici hides the reason, like a refused connection, in the cause of "fetch failed"
    const cause = error instanceof Error && error.cause instanceof Error ? error.cause : error;
    throw new ProofreadUnavailableError(
      `${model} unreachable: ${cause instanceof Error ? cause.message : String(cause)}`,
      'failed',
    );
  }

  if (!response.ok) {
    throw new ProofreadUnavailableError(`${model} answered ${response.status}`, 'failed');
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
  return { model, findings: toFindings(findings.data.findings, segments) };
};
