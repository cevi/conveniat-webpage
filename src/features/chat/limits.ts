import { z } from 'zod/mini';

/** The longest message one send stores. The composer splits a longer text into several sends. */
export const CHAT_MESSAGE_MAX_LENGTH = 2000;

/** The bounds of a group's name, trimmed. A longer name ends up in push titles. */
export const CHAT_NAME_MIN_LENGTH = 3;
export const CHAT_NAME_MAX_LENGTH = 50;

/**
 * A group's name as the forms and the routers accept it, trimmed. `zod/mini` keeps the forms'
 * bundle small; a regular `z.object` takes it as a field.
 */
export const chatNameSchema = z
  .string()
  .check(z.trim(), z.minLength(CHAT_NAME_MIN_LENGTH), z.maxLength(CHAT_NAME_MAX_LENGTH));

/** The text of one message, see {@link CHAT_MESSAGE_MAX_LENGTH}. */
export const chatMessageContentSchema = z
  .string()
  .check(
    z.minLength(1, 'Message content cannot be empty.'),
    z.maxLength(CHAT_MESSAGE_MAX_LENGTH, 'Message content is too long.'),
  );

/** Why a chat name is refused, or `undefined` when {@link chatNameSchema} accepts it. */
export const chatNameProblem = (name: string): 'tooShort' | 'tooLong' | undefined => {
  const result = chatNameSchema.safeParse(name);
  if (result.success) return undefined;
  return result.error.issues.some((issue) => issue.code === 'too_big') ? 'tooLong' : 'tooShort';
};
