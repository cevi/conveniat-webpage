import {
  getForumConversationList,
  openForumConversation,
} from '@/features/chat/api/forum/forum-conversations';
import { registerForumWaitingGauges } from '@/features/chat/api/forum/forum-metrics';
import {
  createForumFlag,
  deleteForumMessage,
  dismissForumFlags,
  removeForumMessage,
  requestForumReview,
  restoreForumMessage,
  setForumPostKind,
  updateForumPost,
} from '@/features/chat/api/forum/forum-moderation';
import {
  approveForumPost,
  claimForumPost,
  createForumPost,
  createForumPostAssignment,
  endForumPostAssignment,
  mergeForumPost,
  moveForumPost,
  setForumPostAnswer,
  setForumPostPinned,
  unmergeForumPost,
  updateForumPostStatus,
  updateForumPostSubscription,
  updateForumTopicConversationPush,
  updateForumTopicSubscription,
} from '@/features/chat/api/forum/forum-mutations';
import { getForumProtocolList } from '@/features/chat/api/forum/forum-protocol';
import {
  getForumAssigneeList,
  getForumPinnedPostList,
  getForumPost,
  getForumPostList,
  getForumPostMapList,
  getForumPostSuggestionList,
  getForumSettings,
  getForumTopicList,
} from '@/features/chat/api/forum/forum-queries';
import {
  getForumRessortList,
  getForumTodoList,
  getForumZentraleList,
} from '@/features/chat/api/forum/forum-zentrale';
import { createTRPCRouter } from '@/trpc/init';

/**
 * The forum. Comments, likes and the deletion of one's own post or comment go through the chat
 * router like in every thread: `chat.sendMessage` with the post as `parentId`,
 * `chat.toggleReaction` with `FORUM_LIKE_EMOJI`, `chat.deleteMessage`, `chat.editMessage`.
 */
registerForumWaitingGauges();

export const forumRouter = createTRPCRouter({
  getForumTopicList,
  getForumPostList,
  getForumPinnedPostList,
  getForumPostSuggestionList,
  getForumPostMapList,
  getForumPost,
  getForumAssigneeList,
  getForumSettings,
  getForumZentraleList,
  getForumTodoList,
  getForumRessortList,
  getForumConversationList,
  getForumProtocolList,
  openForumConversation,
  claimForumPost,
  moveForumPost,
  createForumPost,
  updateForumPost,
  approveForumPost,
  updateForumPostStatus,
  setForumPostKind,
  setForumPostPinned,
  setForumPostAnswer,
  mergeForumPost,
  unmergeForumPost,
  createForumFlag,
  dismissForumFlags,
  removeForumMessage,
  restoreForumMessage,
  requestForumReview,
  deleteForumMessage,
  createForumPostAssignment,
  endForumPostAssignment,
  updateForumTopicSubscription,
  updateForumTopicConversationPush,
  updateForumPostSubscription,
});
