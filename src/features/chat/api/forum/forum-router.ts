import {
  approveForumPost,
  claimForumPost,
  createForumPost,
  createForumPostAssignment,
  deleteForumMessage,
  endForumPostAssignment,
  getForumPrivateReportTopic,
  mergeForumPost,
  moveForumPost,
  setForumPostAnswer,
  setForumPostPinned,
  unmergeForumPost,
  updateForumPostStatus,
  updateForumPostSubscription,
  updateForumTopicSubscription,
} from '@/features/chat/api/forum/forum-mutations';
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
  getForumZentraleList,
} from '@/features/chat/api/forum/forum-zentrale';
import { createTRPCRouter } from '@/trpc/init';

/**
 * The forum. Comments, likes and the deletion of one's own post or comment go through the chat
 * router like in every thread: `chat.sendMessage` with the post as `parentId`,
 * `chat.toggleReaction` with `FORUM_LIKE_EMOJI`, `chat.deleteMessage`.
 */
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
  getForumRessortList,
  claimForumPost,
  moveForumPost,
  getForumPrivateReportTopic,
  createForumPost,
  approveForumPost,
  updateForumPostStatus,
  setForumPostPinned,
  setForumPostAnswer,
  mergeForumPost,
  unmergeForumPost,
  deleteForumMessage,
  createForumPostAssignment,
  endForumPostAssignment,
  updateForumTopicSubscription,
  updateForumPostSubscription,
});
