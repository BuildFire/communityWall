/* eslint-disable no-undef */
/**
 * Community Wall contract — runtime implementation.
 *
 * This file only implements the operations declared with "type": "function" in plugin.contract.json. Operations typed publicData / datastore / userData / appData / firebase are declarative: their platform call is built on the fly from context.query, so they intentionally have no counterpart here. Every operation of this contract is a function.
 *
 * Each function operation is dispatched by its context.functionName, receives (options, callback), may nest any number of buildfire.* calls, and may run its own logic between them. Each one declares a context.hosts in plugin.contract.json, which is what the `hosts:` tag on the JSDoc below refers to. An operation lists every place it can run: at most one widget host, at most one control host, and headlessSdk when it is server-safe (generic always stands alone):
 *
 *   generic            no buildfire at all — pure logic, evaluated anywhere.
 *   headlessSdk        uses buildfire and is server-safe; runs on the server.
 *   widgetForeground   runs in the iframe under the app; never on the server.
 *   widgetBackground   Foreground when someone has to be watching it run — it
 *                      surfaces UI, or reaches real people so unattended is
 *                      itself a problem; Background otherwise.
 *   controlForeground  runs in the iframe under the control panel; never on
 *   controlBackground  the server. Foreground/Background by the same rule.
 *
 * headlessSdk is left out when the operation needs frame state (device, localStorage, bookmarks, the actual signed-in session, UI) or handles user-sensitive data / critical behavior that must not be reachable remotely.
 *
 * Only operations whose hosts include generic or headlessSdk are exposed to the MCP.
 *
 * `buildfire` is resolved as a global: in the widget/control hosts it comes from the injected SDK, and on the server the headless SDK provides it. `widgetContract`, `controlContract` and `frameId` are assigned as implicit globals for the same reason — the consumer reaches them without importing this file. The widget frame (widget/contract.html) and the server dispatch to widgetContract; the control panel's frame (control/contract.html) loads this same file and dispatches to controlContract.
 *
 * Every function is Node-style: callback(error, result), invoked exactly once, never with both error and result populated. Invalid input is reported through the callback rather than thrown synchronously.
 *
 * Every option a function reads here must be declared in that operation's `parameters` block, or a caller cannot pass it: the MCP server refuses any param the contract does not declare.
 */

const POSTS_TAG = 'posts'; // publicData: the wall's posts, each holding its comments
const MEMBERS_TAG = 'subscribedUsersData'; // publicData: who follows which wall
const SETTINGS_TAG = 'Social'; // datastore: the settings document, under appSettings
const LABELS_TAG = 'languages'; // datastore: the Languages tab's labels
const FEED_POSTS_TAG = 'posts'; // appData: the Community Feed's copy of a wall post
const MAX_PAGE_SIZE = 50; // the most records one search returns

// Mirrors widget/assets/js/shared/stringsConfig.js: every label the Languages tab edits, in its order.
const LABEL_SECTIONS = [
  { key: "mainWall", title: "Main Wall labels", labels: [
    { key: "leaveGroup", title: "Leave Group", maxLength: 30, defaultValue: "Leave Group" },
    { key: "joinGroup", title: "Join Group", maxLength: 30, defaultValue: "Join Group" },
    { key: "specificChat", title: "Restricted Chat", maxLength: 100, defaultValue: "Direct message is only set for specific users!" },
    { key: "messageDeleted", title: "Message Deleted", maxLength: 50, defaultValue: "This message has been deleted." }
  ] },
  { key: "sideThread", title: "Side Wall labels", labels: [
    { key: "followPost", title: "Follow Post", maxLength: 30, defaultValue: "Follow Post" },
    { key: "unfollowPost", title: "Unfollow Post", maxLength: 30, defaultValue: "Unfollow Post" },
    { key: "deleteComment", title: "Delete Comment", maxLength: 30, defaultValue: "Delete Comment" },
    { key: "reportComment", title: "Report Comment", maxLength: 30, defaultValue: "Report Comment" },
    { key: "postDeleteSuccess", title: "Delete Post Success", maxLength: 50, defaultValue: "Post successfully deleted" },
    { key: "blockedUser", title: "Blocked User", maxLength: 30, defaultValue: "Blocked User" }
  ] },
  { key: "members", title: "Members labels", labels: [
    { key: "members", title: "Members", maxLength: 30, defaultValue: "Members" },
    { key: "membersBlankState", title: "Members Blank State Message", maxLength: 60, defaultValue: "There are no other members except you." },
    { key: "membersNoResults", title: "Members No Results Found", maxLength: 60, defaultValue: "No results found." }
  ] },
  { key: "input", title: "Input Dialog labels", labels: [
    { key: "cancelPost", title: "Cancel Post", maxLength: 9, defaultValue: "Cancel" },
    { key: "confirmPost", title: "Confirm Post", maxLength: 9, defaultValue: "Post" },
    { key: "writePost", title: "Input Placeholder", maxLength: 30, defaultValue: "Write a post" }
  ] },
  { key: "unblockUser", title: "Unblock User", labels: [
    { key: "unblockUserTitleConfirmation", title: "Title", maxLength: 20, defaultValue: "Unblock" },
    { key: "unblockUserBodyConfirmation", title: "Body", maxLength: 150, defaultValue: "Both of you will again be able to see each other's posts and send messages. The user won’t be notified that you unblocked them." },
    { key: "unblockUserConfirmBtn", title: "Confirm Button", maxLength: 20, defaultValue: "Unblock" },
    { key: "unblockUserCancelBtn", title: "Cancel Button", maxLength: 20, defaultValue: "Cancel" }
  ] },
  { key: "blockUser", title: "Block User", labels: [
    { key: "blockUserTitleConfirmation", title: "Title", maxLength: 20, defaultValue: "Block" },
    { key: "blockUserBodyConfirmation", title: "Body", maxLength: 150, defaultValue: "Both of you won't be able to see each other's posts and send messages. The user won’t be notified that you blocked them." },
    { key: "blockUserConfirmBtn", title: "Confirm Button", maxLength: 20, defaultValue: "Block" },
    { key: "blockUserCancelBtn", title: "Cancel Button", maxLength: 20, defaultValue: "Cancel" }
  ] },
  { key: "modal", title: "Modal labels", labels: [
    { key: "moreOptions", title: "More Options", maxLength: 30, defaultValue: "More Options" },
    { key: "reportPost", title: "Report Post", maxLength: 30, defaultValue: "Report Post" },
    { key: "blockUser", title: "Block User", maxLength: 30, defaultValue: "Block User" },
    { key: "deletePost", title: "Delete Post", maxLength: 30, defaultValue: "Delete Post" },
    { key: "reportPostSuccess", title: "Report Post Success", maxLength: 50, defaultValue: "Report submitted and pending admin review." },
    { key: "reportPostFail", title: "Report Post Failure", maxLength: 100, defaultValue: "This post is already reported." },
    { key: "blockUserSuccess", title: "Block User Success", maxLength: 50, defaultValue: "has been blocked" },
    { key: "unblockUserSuccess", title: "Unblock User Success", maxLength: 50, defaultValue: "has been unblocked" },
    { key: "reportComemntSuccess", title: "Report Comment Success", maxLength: 50, defaultValue: "Report submitted and pending admin review." },
    { key: "reportCommentFail", title: "Report Comment Failure", maxLength: 100, defaultValue: "This comment is already reported." },
    { key: "reportPostAlreadyReported", title: "This Post Has Already Been Reported", maxLength: 50, defaultValue: "This post has already been reported." },
    { key: "reportPostUserBanned", title: "Owner of This Post is Already Banned.", maxLength: 50, defaultValue: "Owner of this post is already banned." }
  ] },
  { key: "pushNotifications", title: "Push Notifications", labels: [
    { key: "personalNotificationMessageTitle", title: "Title", maxLength: 25, defaultValue: "New Private Message" },
    { key: "personalNotificationMessageBody", title: "Body", maxLength: 150, defaultValue: "${context.appUser?context.appUser.displayName:'Someone'} sent you a private message." },
    { key: "personalInAppMessageBody", title: "In App Message", maxLength: 150, defaultValue: "${context.appUser?context.appUser.displayName:'Someone'} sent you a private message." },
    { key: "publicNotificationMessageTitle", title: "Title", maxLength: 25, defaultValue: "New Post" },
    { key: "publicNotificationMessageBody", title: "Body", maxLength: 150, defaultValue: "${context.appUser?context.appUser.displayName:'Someone'} added a new post on ${context.plugin.title}" },
    { key: "publicInAppMessageBody", title: "In App Message", maxLength: 150, defaultValue: "${context.appUser?context.appUser.displayName:'Someone'} added a new post on ${context.plugin.title}" },
    { key: "commentNotificationMessageTitle", title: "Title", maxLength: 25, defaultValue: "New Comment" },
    { key: "commentNotificationMessageBody", title: "Body", maxLength: 150, defaultValue: "${context.appUser?context.appUser.displayName:'Someone'} commented on a post on ${context.plugin.title}" },
    { key: "commentInAppMessageBody", title: "In App Message", maxLength: 150, defaultValue: "${context.appUser?context.appUser.displayName:'Someone'} commented on a post on ${context.plugin.title}" },
    { key: "postLikeNotificationTitle", title: "Title", maxLength: 25, defaultValue: "Post Like" },
    { key: "postLikeNotificationMessageBody", title: "Body", maxLength: 150, defaultValue: "${context.appUser?context.appUser.displayName:'Someone'} liked your post." },
    { key: "postLikeInAppMessageBody", title: "In App Message", maxLength: 150, defaultValue: "${context.appUser?context.appUser.displayName:'Someone'} liked your post." },
    { key: "commentLikeNotificationTitle", title: "Title", maxLength: 25, defaultValue: "Comment Like" },
    { key: "commentLikeNotificationMessageBody", title: "Body", maxLength: 150, defaultValue: "${context.appUser?context.appUser.displayName:'Someone'} liked your comment." },
    { key: "commentLikeInAppMessageBody", title: "In App Message", maxLength: 150, defaultValue: "${context.appUser?context.appUser.displayName:'Someone'} liked your comment." }
  ] },
  { key: "general", title: "General", labels: [
    { key: "someone", title: "Someone", maxLength: 30, defaultValue: "Someone" },
    { key: "you", title: "You", maxLength: 15, defaultValue: "(You)" },
    { key: "unblockBtn", title: "Unblock Button", maxLength: 30, defaultValue: "Unblock" },
    { key: "blockedUsers", title: "Blocked Users", maxLength: 30, defaultValue: "Blocked Users" },
    { key: "noBlockedUsers", title: "Blocked Users Empty State", maxLength: 50, defaultValue: "No blocked users." }
  ] }
];

/**
 * Assert that every named option is a non-empty string.
 * @returns {boolean} true when valid; false when the callback has already fired.
 */
const requireStringParams = (options, names, callback) => {
  if (typeof callback !== 'function') {
    // Nothing to report through; fail loudly only in this one unrecoverable case.
    throw new TypeError('callback must be a function');
  }
  if (options === null || typeof options !== 'object') {
    callback(new Error('options must be an object'), undefined);
    return false;
  }
  const missing = names.find((name) => typeof options[name] !== 'string' || !options[name]);
  if (missing) {
    callback(new Error(`Missing required parameter: ${missing}`), undefined);
    return false;
  }
  return true;
};

/**
 * The first problem with the optional options, or null. Text options may be empty (an empty wall id is the main wall); user options must be a non-empty id or email.
 */
const checkOptional = (options, { texts = [], users = [] }) => {
  const badText = texts.find((name) => options[name] !== undefined && typeof options[name] !== 'string');
  if (badText) return `${badText} must be text`;
  const badUser = users.find((name) => options[name] !== undefined && (typeof options[name] !== 'string' || !options[name]));
  if (badUser) return `${badUser} must be a user id or an email`;
  return null;
};

/**
 * The page and page size asked for, within the store's limit of 50 records a search.
 * @returns {{ page?: number, pageSize?: number, error?: string }}
 */
const readPaging = (options, defaultPageSize) => {
  const page = options.page === undefined ? 0 : options.page;
  const pageSize = options.pageSize === undefined ? defaultPageSize : options.pageSize;
  if (!Number.isInteger(page) || page < 0) return { error: 'page must be a whole number from 0' };
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    return { error: `pageSize must be a whole number from 1 to ${MAX_PAGE_SIZE}` };
  }
  return { page, pageSize };
};

// Mirrors how the widget stores post and comment text (widget.wall.controller.js finalPostCreation,
// widget.thread.controller.js addComment): only these characters are encoded, so a text is found by encoding it the same way.
const encodeText = (text) => text.replace(/[#&%+!@^*()-]/g, (match) => encodeURIComponent(match));

// The text as the wall shows it: the widget and the control panel decode it before display.
const decodeText = (text) => {
  if (typeof text !== 'string') return '';
  try {
    return decodeURIComponent(text);
  } catch (e) {
    return text;
  }
};

// Mirrors control/content/controllers/content.home.controller.js $scope.getUserName: the name the control panel shows.
const nameOf = (userDetails) => {
  if (userDetails && userDetails.displayName !== 'Someone' && userDetails.displayName) return userDetails.displayName;
  if (userDetails && userDetails.firstName !== 'Someone' && userDetails.firstName && userDetails.lastName) {
    return `${userDetails.firstName} ${userDetails.lastName}`;
  }
  if (userDetails && userDetails.firstName !== 'Someone' && userDetails.firstName) return userDetails.firstName;
  if (userDetails && userDetails.lastName) return userDetails.lastName;
  return 'Someone';
};

const imagesOf = (value) => {
  if (Array.isArray(value)) return value.filter((url) => typeof url === 'string' && url);
  return typeof value === 'string' && value ? [value] : [];
};

// A post or comment author as results show them: never the user token the widget stores beside them.
const authorOf = (userDetails, userId) => ({
  userId: userId || (userDetails && userDetails.userId) || null,
  name: nameOf(userDetails),
  imageUrl: (userDetails && userDetails.imageUrl) || null,
});

// A post or comment author as events carry them.
const personOf = (userDetails, userId) => ({
  userId: userId || (userDetails && userDetails.userId) || null,
  displayName: nameOf(userDetails),
  email: (userDetails && userDetails.email) || null,
});

const toComment = (comment) => ({
  commentId: comment.commentId || null,
  text: decodeText(comment.comment),
  images: imagesOf(comment.imageUrl),
  createdOn: comment.createdOn || null,
  author: authorOf(comment.userDetails, comment.userId),
  likesCount: Array.isArray(comment.likes) ? comment.likes.length : 0,
});

// A post as results show it. The widget keeps the pictures both in images and in imageUrl; older posts may have only imageUrl.
const toPost = (record) => {
  const data = record.data || {};
  const comments = Array.isArray(data.comments) ? data.comments.filter(Boolean) : [];
  const images = imagesOf(data.images);
  return {
    id: record.id,
    wallId: data.wid || '',
    text: decodeText(data.text),
    images: images.length ? images : imagesOf(data.imageUrl),
    createdOn: data.createdOn || null,
    author: authorOf(data.userDetails, data.userId),
    likesCount: Array.isArray(data.likes) ? data.likes.length : 0,
    commentsCount: comments.length,
    comments: comments.map(toComment),
  };
};

// Contract events and the control panel's refresh message are fire-and-forget, as in the plugin's own pages.
const sendEvent = (name, data) => {
  const contract = buildfire.services && buildfire.services.contract;
  if (contract && contract.events && typeof contract.events.send === 'function') contract.events.send(name, data);
};
const tellWidget = (message) => {
  if (buildfire.messaging && typeof buildfire.messaging.sendMessageToWidget === 'function') {
    buildfire.messaging.sendMessageToWidget(message);
  }
};

/**
 * The app user a caller named, by id or by email. An email is recognized by its @ and looked up in the app's users.
 * @param {string|undefined} value
 * @param {function(Error=, string=)} callback - (error, user id, or undefined when none was given)
 */
const resolveUserId = (value, callback) => {
  if (value === undefined) return callback(null, undefined);
  if (value.indexOf('@') < 0) return callback(null, value);
  buildfire.auth.getUsersByEmail({ emails: [value] }, (err, users) => {
    if (err) return callback(err, undefined);
    const list = Array.isArray(users) ? users : ((users && users.result) || []);
    const user = list.find((u) => u && typeof u.email === 'string' && u.email.toLowerCase() === value.toLowerCase()) || list[0];
    const id = user && (user._id || user.userId);
    if (!id) return callback(new Error(`No app user has the email "${value}"`), undefined);
    callback(null, id);
  });
};

/**
 * The posts filter, mirroring the widget's own wall filter (app.service.js getFilter): the main wall is an empty wall id,
 * any other wall is matched the way the widget matches it.
 */
const postsFilter = ({ wallId, text, userId }) => {
  const conditions = [];
  if (wallId === '') conditions.push({ '_buildfire.index.string1': { $eq: '' } });
  else if (wallId !== undefined) conditions.push({ '_buildfire.index.string1': { $regex: wallId, $options: 'i' } });
  if (text !== undefined) conditions.push({ '$json.text': encodeText(text) });
  if (userId !== undefined) conditions.push({ '$json.userId': userId });
  return conditions.length ? { $and: conditions } : null;
};

/**
 * The one post a caller named by its exact text, optionally narrowed by its author and wall. A text several posts share is refused rather than resolved to one of them: picking would mean deleting a post the caller did not mean.
 * @param {function(Error=, object=)} callback - (error, post record)
 */
const resolvePost = ({ postText, userId, wallId }, callback) => {
  const filter = postsFilter({ wallId, text: postText, userId });
  buildfire.publicData.search({ filter, page: 0, pageSize: MAX_PAGE_SIZE, recordCount: true }, POSTS_TAG, (err, response) => {
    if (err) return callback(err, undefined);
    const found = ((response && response.result) || []).filter((record) => record && record.id);
    const total = response && typeof response.totalRecord === 'number' ? response.totalRecord : found.length;
    if (!found.length) return callback(new Error(`No post has the text "${postText}"`), undefined);
    if (found.length > 1 || total > 1) {
      return callback(new Error(`${Math.max(found.length, total)} posts have the text "${postText}"`), undefined);
    }
    callback(null, found[0]);
  });
};

/**
 * The post with this id, checked to exist: the store answers an empty record for an unknown id, which is refused here.
 * @param {function(Error=, object=)} callback - (error, post record)
 */
const requirePostById = (postId, callback) => {
  buildfire.publicData.getById(postId, POSTS_TAG, (err, record) => {
    if (err) return callback(err, undefined);
    if (!record || !record.id || !record.data || !Object.keys(record.data).length) {
      return callback(new Error(`No post has the id "${postId}"`), undefined);
    }
    callback(null, record);
  });
};

/**
 * Removes the Community Feed's copy of a post, best effort and before the post itself, as the control panel's delete does.
 * Mirrors SocialDataStore.deleteFeedPost in control/content/app.service.js, filter included; the control panel ignores its outcome, and so does this.
 */
const removeFeedCopies = (post, done) => {
  const filter = { $and: [{ userId: post.userId, postText: post.text, postImages: post.imageUrl || [] }] };
  buildfire.appData.search({ filter, sort: { createdOn: -1 } }, FEED_POSTS_TAG, (err, records) => {
    const found = (!err && Array.isArray(records)) ? records.filter((record) => record && record.id) : [];
    const next = (index) => {
      if (index >= found.length) return done();
      buildfire.appData.delete(found[index].id, FEED_POSTS_TAG, () => next(index + 1));
    };
    next(0);
  });
};

/**
 * Deletes one post the way the control panel's Delete Post does (content.home.controller.js deletePost): the Community Feed copy, the post with its comments, then the refresh message to the widget. Shared by deletePost, deletePostAdvanced and deletePostsAdvanced, so they behave identically once the post is found.
 * @param {object} record - the post record, already checked to exist
 * @param {function(Error=, object=)} callback - (error, { id, status })
 */
const removePost = (record, callback) => {
  const post = record.data;
  removeFeedCopies(post, () => {
    buildfire.publicData.delete(record.id, POSTS_TAG, (err) => {
      if (err) return callback(err, undefined);
      tellWidget({ name: 'POST_DELETED', id: record.id });
      sendEvent('postDeleted', {
        postId: record.id,
        text: decodeText(post.text),
        wallId: post.wid || '',
        postedBy: personOf(post.userDetails, post.userId),
      });
      callback(null, { id: record.id, status: 'deleted' });
    });
  });
};

// Tells one comment apart from the others on its post: by its id when it has one, else (older comments) by what it holds.
const sameComment = (target) => (comment) => (target.commentId
  ? !!comment && comment.commentId === target.commentId
  : !!comment && comment.comment === target.comment && comment.userId === target.userId
    && String(comment.createdOn) === String(target.createdOn));

/**
 * The comment with this id on the post with this id, both checked to exist.
 * @param {function(Error=, object=)} callback - (error, comment)
 */
const requireCommentById = (postId, commentId, callback) => {
  requirePostById(postId, (err, record) => {
    if (err) return callback(err, undefined);
    const comment = (Array.isArray(record.data.comments) ? record.data.comments : []).find((c) => c && c.commentId === commentId);
    if (!comment) return callback(new Error(`The post "${postId}" has no comment with the id "${commentId}"`), undefined);
    callback(null, comment);
  });
};

/**
 * Deletes one comment the way the control panel's Delete Comment does (content.home.controller.js deleteComment): reads the post, takes the comment out of it, saves the post, then tells the widget. Shared by deleteComment, deleteCommentAdvanced and deleteCommentsAdvanced. Unlike the control panel, a comment that is no longer there is refused instead of removing the post's last comment.
 * @param {string} postId
 * @param {object} target - the comment to remove, as found
 * @param {function(Error=, object=)} callback - (error, { commentId, postId, status })
 */
const removeComment = (postId, target, callback) => {
  buildfire.publicData.getById(postId, POSTS_TAG, (err, record) => {
    if (err) return callback(err, undefined);
    const comments = record && record.data && Array.isArray(record.data.comments) ? record.data.comments : [];
    const index = comments.findIndex(sameComment(target));
    if (index < 0) return callback(new Error(`The comment is no longer on the post "${postId}"`), undefined);
    const comment = comments.splice(index, 1)[0];
    buildfire.publicData.update(record.id, record.data, POSTS_TAG, (updateErr) => {
      if (updateErr) return callback(updateErr, undefined);
      tellWidget({ name: 'COMMENT_DELETED', comment, postId: record.id });
      sendEvent('commentDeleted', {
        commentId: comment.commentId || null,
        postId: record.id,
        text: decodeText(comment.comment),
        commentedBy: personOf(comment.userDetails, comment.userId),
      });
      callback(null, { commentId: comment.commentId || null, postId: record.id, status: 'deleted' });
    });
  });
};

/**
 * Runs a batch: validates every entry, checks every target exists before any write, then applies each in turn and reports each outcome. A failed write is reported for its entry and does not stop the rest.
 */
const runBatch = ({ entries, plural, validate, keyOf, check, apply, idOf }, callback) => {
  if (!Array.isArray(entries) || entries.length < 1 || entries.length > MAX_PAGE_SIZE) {
    return callback(new Error(`${plural} must be a list of 1 to ${MAX_PAGE_SIZE} entries`), undefined);
  }
  const invalid = entries.map((entry, index) => {
    const problem = entry && typeof entry === 'object' ? validate(entry) : 'not an entry';
    return problem ? `entry ${index}: ${problem}` : null;
  }).filter(Boolean);
  if (invalid.length) return callback(new Error(`Invalid ${plural}: ${invalid.join('; ')}`), undefined);
  if (new Set(entries.map(keyOf)).size !== entries.length) {
    return callback(new Error(`The same entry is listed more than once in ${plural}`), undefined);
  }

  const targets = [];
  const unknown = [];
  let pending = entries.length;
  const applyAll = () => {
    if (unknown.length) return callback(new Error(`Not found: ${unknown.join('; ')}`), undefined);
    const results = [];
    const applyNext = (index) => {
      if (index === entries.length) {
        const failed = results.filter((r) => r.error).length;
        return callback(null, { [plural]: results, succeeded: results.length - failed, failed });
      }
      apply(entries[index], targets[index], (err) => {
        results.push({ index, id: err ? null : idOf(entries[index], targets[index]), error: err ? (err.message || String(err)) : null });
        applyNext(index + 1);
      });
    };
    applyNext(0);
  };
  entries.forEach((entry, index) => {
    check(entry, (err, target) => {
      if (err) unknown.push(`entry ${index}: ${err.message || err}`);
      else targets[index] = target;
      pending -= 1;
      if (pending === 0) applyAll();
    });
  });
};

/**
 * The settings with the control panel's defaults applied where nothing is saved yet. Mirrors control/settings/controllers/mainSettingsCtrl.js load(), which applies them before the settings form saves.
 */
const withFormDefaults = (appSettings) => {
  if (!appSettings) {
    return { showMembers: true, allowAutoSubscribe: true, allowChat: 'allUsers', chatFeature: { value: 'default', actionItem: null } };
  }
  const settings = appSettings;
  if (!settings.mainThreadUserTags) settings.mainThreadUserTags = [];
  if (!settings.sideThreadUserTags) settings.sideThreadUserTags = [];
  if (typeof settings.showMembers === 'undefined') settings.showMembers = true;
  if (typeof settings.allowCommunityFeedFollow === 'undefined') settings.allowCommunityFeedFollow = false;
  if (typeof settings.seeProfile === 'undefined') settings.seeProfile = false;
  if (typeof settings.allowAutoSubscribe === 'undefined') settings.allowAutoSubscribe = true;
  if (typeof settings.allowChat === 'undefined') settings.allowChat = settings.disablePrivateChat === true ? 'noUsers' : 'allUsers';
  if (!settings.chatFeature) settings.chatFeature = { value: 'default', actionItem: null };
  return settings;
};

// The settings this contract exposes. Who may post, chat or see profiles are access settings and stay out of the contract.
const toSettingsResult = (settings) => ({
  allowAutoSubscribe: !!settings.allowAutoSubscribe,
  disableFollowLeaveGroup: !!settings.disableFollowLeaveGroup,
  showMembers: !!settings.showMembers,
  allowCommunityFeedFollow: !!settings.allowCommunityFeedFollow,
  chatFeature: (settings.chatFeature && settings.chatFeature.value) || 'default',
  chatFeatureAction: (settings.chatFeature && settings.chatFeature.actionItem) || null,
  actionItem: settings.actionItem || null,
  pinnedPost: settings.pinnedPost === undefined ? null : settings.pinnedPost,
});

// An action item as the action items component saves it: an object naming its kind of action.
const isActionItem = (value) => !!value && typeof value === 'object' && !Array.isArray(value)
  && typeof value.action === 'string' && !!value.action;

/**
 * The labels document as the Languages tab builds it before saving. Mirrors widget/assets/js/shared/strings.js (the Strings service: every label's defaultValue, then the saved values) and, for the older single-screen format, the migration in control/languages/controllers/languages.js loadLanguage (a saved value moves to the label with the same original text).
 */
const buildLabels = (stored) => {
  const data = {};
  LABEL_SECTIONS.forEach((section) => {
    data[section.key] = {};
    section.labels.forEach((label) => {
      data[section.key][label.key] = { defaultValue: label.defaultValue };
    });
  });
  if (stored && stored.screenOne) {
    Object.keys(stored.screenOne).forEach((oldKey) => {
      const old = stored.screenOne[oldKey];
      if (!old || !old.value) return;
      LABEL_SECTIONS.forEach((section) => section.labels.forEach((label) => {
        if (label.defaultValue === old.defaultValue) data[section.key][label.key].value = old.value;
      }));
    });
  } else if (stored) {
    Object.keys(stored).forEach((sectionKey) => {
      const section = stored[sectionKey];
      if (!section || typeof section !== 'object') return;
      if (!data[sectionKey]) data[sectionKey] = {};
      Object.keys(section).forEach((labelKey) => {
        if (!data[sectionKey][labelKey]) data[sectionKey][labelKey] = {};
        const saved = section[labelKey];
        if (saved && saved.value !== undefined) data[sectionKey][labelKey].value = saved.value;
      });
    });
  }
  return data;
};

const toLabelsResult = (data) => ({
  labels: [].concat(...LABEL_SECTIONS.map((section) => section.labels.map((label) => {
    const saved = data[section.key] && data[section.key][label.key];
    return {
      key: label.key,
      section: section.title,
      title: label.title,
      value: saved && saved.value !== undefined ? saved.value : null,
      defaultValue: label.defaultValue,
    };
  }))),
});

widgetContract = {
  /**
   * Bind this contract to a plugin instance. Called by the consumer; resolves the iframe window that widget/control-hosted operations are proxied into.
   * @param {string} instanceId - the plugin instance to contract with.
   */
  init(instanceId) {
    buildfire.services.contract.use({ instanceId }, (err, data) => {
      if (err) return console.error('Failed to initialize Community Wall contract', err);
      frameId = data.fid;
    });
  },

  /**
   * hosts: widgetBackground, controlBackground, headlessSdk. Lists posts newest first (index date1, as the control panel's content list sorts them), with their comments, narrowed by wall, exact text and author. Uses only buildfire.publicData (and buildfire.auth to resolve an email), which behave the same in both frames and on the server; it only reads, so nothing needs watching: Background in both frames. A function rather than a declarative search because it resolves an author's email, encodes the text the way the widget stores it, and leaves the user tokens the widget stores with each post out of the result. Covers the control panel's posts list and its CSV export, whose rows are these posts and their comments.
   * @param {{ wallId?: string, text?: string, userId?: string, page?: number, pageSize?: number }} options
   * @param {function(Error=, object=)} callback - (error, { posts, total, page, hasMore })
   */
  searchPosts(options, callback) {
    if (!requireStringParams(options, [], callback)) return;
    const problem = checkOptional(options, { texts: ['wallId', 'text'], users: ['userId'] });
    if (problem) return callback(new Error(problem), undefined);
    const { page, pageSize, error } = readPaging(options, 20);
    if (error) return callback(new Error(error), undefined);

    resolveUserId(options.userId, (userErr, userId) => {
      if (userErr) return callback(userErr, undefined);
      const searchOptions = { sort: { '_buildfire.index.date1': -1 }, page, pageSize, recordCount: true };
      const filter = postsFilter({ wallId: options.wallId, text: options.text, userId });
      if (filter) searchOptions.filter = filter;
      buildfire.publicData.search(searchOptions, POSTS_TAG, (err, response) => {
        if (err) return callback(err, undefined);
        const records = ((response && response.result) || []).filter((record) => record && record.id);
        const total = response && typeof response.totalRecord === 'number' ? response.totalRecord : records.length;
        callback(null, { posts: records.map(toPost), total, page, hasMore: page * pageSize + records.length < total });
      });
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: basic; its advanced alternative is deletePostAdvanced. Deletes one post, named by its exact text (narrowed by author and wall when given), the way the control panel's Delete Post does, via removePost. Uses buildfire.publicData, buildfire.appData and buildfire.auth, which behave the same in the control panel and on the server; the refresh message to the widget is skipped where messaging does not exist. No widget host: app users can delete only their own posts, which is acting as them, so moderating the wall stays with the owner. Background: removing a post publishes nothing and contacts no one; the dangerous flag makes the owner confirm.
   * @param {{ postText: string, userId?: string, wallId?: string }} options
   * @param {function(Error=, object=)} callback - (error, { id, status })
   */
  deletePost(options, callback) {
    if (!requireStringParams(options, ['postText'], callback)) return;
    const problem = checkOptional(options, { texts: ['wallId'], users: ['userId'] });
    if (problem) return callback(new Error(problem), undefined);

    resolveUserId(options.userId, (userErr, userId) => {
      if (userErr) return callback(userErr, undefined);
      resolvePost({ postText: options.postText, userId, wallId: options.wallId }, (err, record) => {
        if (err) return callback(err, undefined);
        removePost(record, callback);
      });
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced; the alternative of deletePost, taking the post's id. Same hosts, checks and effects, via the same removePost; it checks the id exists instead of searching.
   * @param {{ postId: string }} options
   * @param {function(Error=, object=)} callback - (error, { id, status })
   */
  deletePostAdvanced(options, callback) {
    if (!requireStringParams(options, ['postId'], callback)) return;
    requirePostById(options.postId, (err, record) => {
      if (err) return callback(err, undefined);
      removePost(record, callback);
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced (batches are never basic). The batch form of deletePostAdvanced: validates every entry and checks every post exists before deleting anything, then deletes each through removePost, so every post gets exactly what deletePostAdvanced does, events included.
   * @param {{ posts: Array<{ postId: string }> }} options
   * @param {function(Error=, object=)} callback - (error, { posts, succeeded, failed })
   */
  deletePostsAdvanced(options, callback) {
    if (!requireStringParams(options, [], callback)) return;
    runBatch({
      entries: options.posts,
      plural: 'posts',
      validate: (entry) => (typeof entry.postId === 'string' && entry.postId ? null : 'missing postId'),
      keyOf: (entry) => entry.postId,
      check: (entry, done) => requirePostById(entry.postId, done),
      apply: (entry, record, done) => removePost(record, done),
      idOf: (entry) => entry.postId,
    }, callback);
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: basic; its advanced alternative is deleteCommentAdvanced. Deletes one comment, named by its exact text (narrowed by its post's text and its author when given), the way the control panel's Delete Comment does, via removeComment. Finding it is a search over the posts holding a comment with that text; a text several comments share is refused, saying how many. Same host reasoning as deletePost.
   * @param {{ commentText: string, postText?: string, userId?: string }} options
   * @param {function(Error=, object=)} callback - (error, { commentId, postId, status })
   */
  deleteComment(options, callback) {
    if (!requireStringParams(options, ['commentText'], callback)) return;
    const problem = checkOptional(options, { texts: ['postText'], users: ['userId'] });
    if (problem) return callback(new Error(problem), undefined);

    resolveUserId(options.userId, (userErr, userId) => {
      if (userErr) return callback(userErr, undefined);
      const encoded = encodeText(options.commentText);
      const conditions = [{ '$json.comments.comment': encoded }];
      if (options.postText !== undefined) conditions.push({ '$json.text': encodeText(options.postText) });
      buildfire.publicData.search({ filter: { $and: conditions }, page: 0, pageSize: MAX_PAGE_SIZE, recordCount: true }, POSTS_TAG, (err, response) => {
        if (err) return callback(err, undefined);
        const records = ((response && response.result) || []).filter((record) => record && record.id);
        const total = response && typeof response.totalRecord === 'number' ? response.totalRecord : records.length;
        const matches = [];
        records.forEach((record) => (Array.isArray(record.data.comments) ? record.data.comments : []).forEach((comment) => {
          if (comment && comment.comment === encoded && (userId === undefined || comment.userId === userId)) matches.push({ record, comment });
        }));
        if (total > records.length) {
          return callback(new Error(`More than ${records.length} posts have a comment with the text "${options.commentText}"`), undefined);
        }
        if (!matches.length) return callback(new Error(`No comment has the text "${options.commentText}"`), undefined);
        if (matches.length > 1) {
          return callback(new Error(`${matches.length} comments have the text "${options.commentText}"`), undefined);
        }
        removeComment(matches[0].record.id, matches[0].comment, callback);
      });
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced; the alternative of deleteComment, taking the post's and the comment's ids. Same hosts, checks and effects, via the same removeComment; it checks both ids exist instead of searching. Comments older than comment ids have none, so they are deleted by text only.
   * @param {{ postId: string, commentId: string }} options
   * @param {function(Error=, object=)} callback - (error, { commentId, postId, status })
   */
  deleteCommentAdvanced(options, callback) {
    if (!requireStringParams(options, ['postId', 'commentId'], callback)) return;
    requireCommentById(options.postId, options.commentId, (err, comment) => {
      if (err) return callback(err, undefined);
      removeComment(options.postId, comment, callback);
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced (batches are never basic). The batch form of deleteCommentAdvanced: validates every entry and checks every comment exists before deleting anything, then deletes each through removeComment, one at a time, so several comments of one post are each taken out of the post as it then stands.
   * @param {{ comments: Array<{ postId: string, commentId: string }> }} options
   * @param {function(Error=, object=)} callback - (error, { comments, succeeded, failed })
   */
  deleteCommentsAdvanced(options, callback) {
    if (!requireStringParams(options, [], callback)) return;
    runBatch({
      entries: options.comments,
      plural: 'comments',
      validate: (entry) => {
        if (typeof entry.postId !== 'string' || !entry.postId) return 'missing postId';
        if (typeof entry.commentId !== 'string' || !entry.commentId) return 'missing commentId';
        return null;
      },
      keyOf: (entry) => `${entry.postId}/${entry.commentId}`,
      check: (entry, done) => requireCommentById(entry.postId, entry.commentId, done),
      apply: (entry, comment, done) => removeComment(entry.postId, comment, done),
      idOf: (entry) => entry.commentId,
    }, callback);
  },

  /**
   * hosts: widgetBackground, controlBackground, headlessSdk. Lists the members of a wall, as the widget's Members page does (widget.members.controller.js onSearchChange, indexed branch): the wall's followers who have not left it, optionally narrowed by text found in their name or email. The signed-in user's own block list, which the Members page also applies, needs the person holding the phone, so it is not applied. Only the members' names and pictures are returned. Uses only buildfire.publicData, the same in both frames and on the server; it only reads: Background.
   * @param {{ wallId?: string, name?: string, page?: number, pageSize?: number }} options
   * @param {function(Error=, object=)} callback - (error, { members, total, page, hasMore })
   */
  searchMembers(options, callback) {
    if (!requireStringParams(options, [], callback)) return;
    const problem = checkOptional(options, { texts: ['wallId', 'name'] });
    if (problem) return callback(new Error(problem), undefined);
    const { page, pageSize, error } = readPaging(options, MAX_PAGE_SIZE);
    if (error) return callback(new Error(error), undefined);

    const filter = { '_buildfire.index.string1': options.wallId || '', '_buildfire.index.number1': 0 };
    if (options.name) {
      filter.$or = ['displayName', 'firstName', 'lastName', 'email'].map((field) => ({
        [`$json.userDetails.${field}`]: { $regex: options.name, $options: 'i' },
      }));
    }
    buildfire.publicData.search({ filter, page, pageSize, recordCount: true }, MEMBERS_TAG, (err, response) => {
      if (err) return callback(err, undefined);
      const records = ((response && response.result) || []).filter((record) => record && record.data);
      const total = response && typeof response.totalRecord === 'number' ? response.totalRecord : records.length;
      const members = records.map((record) => {
        const details = record.data.userDetails || {};
        return {
          userId: record.data.userId || null,
          displayName: details.displayName || null,
          firstName: details.firstName || null,
          lastName: details.lastName || null,
          imageUrl: details.imageUrl || null,
        };
      });
      callback(null, { members, total, page, hasMore: page * pageSize + records.length < total });
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. Reads the settings document and applies the settings form's defaults where nothing is saved yet (withFormDefaults), as the Settings tab shows them, plus the pinned post from the Content tab. Uses only buildfire.datastore, the same in the control panel and on the server. No widget host: settings are the owner's. Background: it only reads.
   * @param {object} options - none are read
   * @param {function(Error=, object=)} callback - (error, settings)
   */
  getSettings(options, callback) {
    if (!requireStringParams(options || {}, [], callback)) return;
    buildfire.datastore.get(SETTINGS_TAG, (err, record) => {
      if (err) return callback(err, undefined);
      const data = (record && record.data) || {};
      callback(null, toSettingsResult(withFormDefaults(data.appSettings)));
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. Changes only the settings passed, the way the Settings tab saves them (mainSettingsCtrl.js save): reads the document, applies the form's defaults, merges, turns an action-item chat feature with no action item back to the default as the form does, and saves the whole document with datastore.save. The widget refreshes itself from the datastore, as it does after the tab saves. Clearing an action item removes its key, as the action items list's delete does; the pinned post, edited on the Content tab, is stored as passed. Who may post, chat or see profiles are access settings and are not offered. Uses only buildfire.datastore, the same in the control panel and on the server. No widget host: app users must not change the owner's configuration. Background: it changes configuration and contacts no one.
   * @param {{ allowAutoSubscribe?: boolean, disableFollowLeaveGroup?: boolean, showMembers?: boolean, allowCommunityFeedFollow?: boolean, chatFeature?: string, chatFeatureAction?: object|null, actionItem?: object|null, pinnedPost?: string|null }} options
   * @param {function(Error=, object=)} callback - (error, settings)
   */
  updateSettings(options, callback) {
    if (!requireStringParams(options, [], callback)) return;
    const toggles = ['allowAutoSubscribe', 'disableFollowLeaveGroup', 'showMembers', 'allowCommunityFeedFollow'];
    const badToggle = toggles.find((name) => options[name] !== undefined && typeof options[name] !== 'boolean');
    if (badToggle) return callback(new Error(`${badToggle} must be true or false`), undefined);
    if (options.chatFeature !== undefined && ['default', 'actionItem'].indexOf(options.chatFeature) < 0) {
      return callback(new Error('chatFeature must be one of: default, actionItem'), undefined);
    }
    const badAction = ['chatFeatureAction', 'actionItem'].find((name) => options[name] !== undefined && options[name] !== null && !isActionItem(options[name]));
    if (badAction) return callback(new Error(`${badAction} must be an action item, with its kind of action, or empty`), undefined);
    if (options.pinnedPost !== undefined && options.pinnedPost !== null && typeof options.pinnedPost !== 'string') {
      return callback(new Error('pinnedPost must be formatted text, or empty'), undefined);
    }
    const given = toggles.concat(['chatFeature', 'chatFeatureAction', 'actionItem', 'pinnedPost']).filter((name) => options[name] !== undefined);
    if (!given.length) return callback(new Error('Pass at least one setting to change'), undefined);

    buildfire.datastore.get(SETTINGS_TAG, (err, record) => {
      if (err) return callback(err, undefined);
      const data = (record && record.data) || {};
      const settings = withFormDefaults(data.appSettings);
      data.appSettings = settings;

      toggles.forEach((name) => {
        if (options[name] !== undefined) settings[name] = options[name];
      });
      if (options.chatFeature !== undefined) settings.chatFeature.value = options.chatFeature;
      if (options.chatFeatureAction === null) delete settings.chatFeature.actionItem;
      else if (options.chatFeatureAction !== undefined) settings.chatFeature.actionItem = options.chatFeatureAction;
      if (options.actionItem === null) delete settings.actionItem;
      else if (options.actionItem !== undefined) settings.actionItem = options.actionItem;
      if (options.pinnedPost !== undefined) settings.pinnedPost = options.pinnedPost;
      // The form never saves an action-item chat feature without its action item.
      if (settings.chatFeature.value === 'actionItem' && !settings.chatFeature.actionItem) settings.chatFeature.value = 'default';

      buildfire.datastore.save(data, SETTINGS_TAG, (saveErr) => {
        if (saveErr) return callback(saveErr, undefined);
        callback(null, toSettingsResult(settings));
      });
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. Reads the labels the Languages tab edits, with their original text and any saved replacement, building them the way the tab does (buildLabels). Uses only buildfire.datastore, the same in the control panel and on the server. No widget host: the labels are the owner's to manage. Background: it only reads.
   * @param {object} options - none are read
   * @param {function(Error=, object=)} callback - (error, { labels })
   */
  getLabels(options, callback) {
    if (!requireStringParams(options || {}, [], callback)) return;
    buildfire.datastore.get(LABELS_TAG, (err, record) => {
      if (err) return callback(err, undefined);
      callback(null, toLabelsResult(buildLabels(record && record.data)));
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. Changes only the labels passed, the way the Languages tab saves them (the Strings service's set then save, in widget/assets/js/shared/strings.js): builds the labels document, sets each value given and saves the whole document with datastore.save. null or '' are stored as passed; the widget shows the original text for either, except the restricted chat message, which an empty text hides. Each text is held to the tab's own length limit. The widget refreshes itself from the datastore. The tab's Block, Unblock and General labels are saved as the tab saves them, even though the widget currently reads only the other sections once labels are saved. Uses only buildfire.datastore, the same in the control panel and on the server. No widget host: app users must not change the owner's wording. Background: it changes wording and contacts no one.
   * @param {object} options - one optional text per label key in LABEL_SECTIONS
   * @param {function(Error=, object=)} callback - (error, { labels })
   */
  updateLabels(options, callback) {
    if (!requireStringParams(options, [], callback)) return;
    const changes = [];
    const problems = [];
    LABEL_SECTIONS.forEach((section) => section.labels.forEach((label) => {
      const value = options[label.key];
      if (value === undefined) return;
      if (value !== null && typeof value !== 'string') problems.push(`${label.key} must be text, or empty`);
      else if (value !== null && value.length > label.maxLength) problems.push(`${label.key} must be at most ${label.maxLength} characters`);
      else changes.push({ section: section.key, key: label.key, value });
    }));
    if (problems.length) return callback(new Error(problems.join('; ')), undefined);
    if (!changes.length) return callback(new Error('Pass at least one label to change'), undefined);

    buildfire.datastore.get(LABELS_TAG, (err, record) => {
      if (err) return callback(err, undefined);
      const data = buildLabels(record && record.data);
      changes.forEach((change) => {
        data[change.section][change.key].value = change.value;
      });
      buildfire.datastore.save(data, LABELS_TAG, (saveErr) => {
        if (saveErr) return callback(saveErr, undefined);
        callback(null, toLabelsResult(data));
      });
    });
  }
};

/**
 * What the control panel's frame (control/contract.html) dispatches to: init plus every function whose hosts include controlBackground, in plugin.contract.json order. The implementations are widgetContract's own.
 */
controlContract = {
  init: widgetContract.init,
  searchPosts: widgetContract.searchPosts,
  deletePost: widgetContract.deletePost,
  deletePostAdvanced: widgetContract.deletePostAdvanced,
  deletePostsAdvanced: widgetContract.deletePostsAdvanced,
  deleteComment: widgetContract.deleteComment,
  deleteCommentAdvanced: widgetContract.deleteCommentAdvanced,
  deleteCommentsAdvanced: widgetContract.deleteCommentsAdvanced,
  searchMembers: widgetContract.searchMembers,
  getSettings: widgetContract.getSettings,
  updateSettings: widgetContract.updateSettings,
  getLabels: widgetContract.getLabels,
  updateLabels: widgetContract.updateLabels
};
