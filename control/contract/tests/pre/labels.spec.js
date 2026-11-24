// labels: the wording of the wall's labels and messages, from the Languages tab, managed from the control panel.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const holding = (key, value) => jasmine.objectContaining({
  labels: jasmine.arrayContaining([jasmine.objectContaining({ key, value })]),
});
// Every label the Languages tab lists.
const LABEL_KEYS = [
  'leaveGroup', 'joinGroup', 'specificChat', 'messageDeleted',
  'followPost', 'unfollowPost', 'deleteComment', 'reportComment', 'postDeleteSuccess', 'blockedUser',
  'members', 'membersBlankState', 'membersNoResults',
  'cancelPost', 'confirmPost', 'writePost',
  'unblockUserTitleConfirmation', 'unblockUserBodyConfirmation', 'unblockUserConfirmBtn', 'unblockUserCancelBtn',
  'blockUserTitleConfirmation', 'blockUserBodyConfirmation', 'blockUserConfirmBtn', 'blockUserCancelBtn',
  'moreOptions', 'reportPost', 'blockUser', 'deletePost', 'reportPostSuccess', 'reportPostFail', 'blockUserSuccess',
  'unblockUserSuccess', 'reportComemntSuccess', 'reportCommentFail', 'reportPostAlreadyReported', 'reportPostUserBanned',
  'personalNotificationMessageTitle', 'personalNotificationMessageBody', 'personalInAppMessageBody',
  'publicNotificationMessageTitle', 'publicNotificationMessageBody', 'publicInAppMessageBody',
  'commentNotificationMessageTitle', 'commentNotificationMessageBody', 'commentInAppMessageBody',
  'postLikeNotificationTitle', 'postLikeNotificationMessageBody', 'postLikeInAppMessageBody',
  'commentLikeNotificationTitle', 'commentLikeNotificationMessageBody', 'commentLikeInAppMessageBody',
  'someone', 'you', 'unblockBtn', 'blockedUsers', 'noBlockedUsers',
];

contract.describe('getLabels', () => {
  it('shows a label saved before', async () => {
    await call('updateLabels', { joinGroup: 'Pre join' });
    expect(await call('getLabels', {})).toEqual(holding('joinGroup', 'Pre join'));
  });
});

contract.describe('updateLabels', () => {
  it('changes one label', async () => {
    expect(await call('updateLabels', { leaveGroup: 'Pre leave' })).toEqual(holding('leaveGroup', 'Pre leave'));
  });

  it('changes every label', async () => {
    // 'Pre text' fits every label, the shortest of which takes 9 characters.
    const changes = {};
    LABEL_KEYS.forEach((key) => { changes[key] = 'Pre text'; });
    expect(await call('updateLabels', changes)).toEqual(holding('noBlockedUsers', 'Pre text'));
  });
});
