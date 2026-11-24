// labels: the wording of the wall's labels and messages, from the Languages tab, managed from the control panel.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const reason = (error) => String((error && error.message) || error);
// The reason a call was refused; fails the spec when the call succeeds.
const refusal = (promise) => promise.then(() => fail('expected the call to be refused'), reason);
// Short enough for a 30-character label: "control 1793057950611" is 21.
const unique = () => `${contract.host} ${Date.now()}`;
const labels = async () => (await call('getLabels', {})).labels;
const labelOf = async (key) => (await labels()).find((label) => label.key === key);
// Every label the Languages tab lists, in its order (widget/assets/js/shared/stringsConfig.js).
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

// controlBackground only: this block runs in the control frame.
contract.describe('getLabels', () => {
  it('shows every label, in the order the Languages tab lists them', async () => {
    const found = await labels();
    expect(found.map((label) => label.key)).toEqual(LABEL_KEYS);
    found.forEach((label) => expect(label).toEqual(jasmine.objectContaining({
      key: jasmine.any(String), section: jasmine.any(String), title: jasmine.any(String), defaultValue: jasmine.any(String),
    })));
  });

  it("shows each label's original text", async () => {
    expect(await labelOf('leaveGroup')).toEqual(jasmine.objectContaining({ section: 'Main Wall labels', title: 'Leave Group', defaultValue: 'Leave Group' }));
    expect(await labelOf('you')).toEqual(jasmine.objectContaining({ section: 'General', defaultValue: '(You)' }));
  });

  it('shows the text last saved for a label', async () => {
    const text = unique();
    await call('updateLabels', { joinGroup: text });
    expect(await labelOf('joinGroup')).toEqual(jasmine.objectContaining({ value: text, defaultValue: 'Join Group' }));
  });

  it('changes nothing', async () => {
    const before = await labels();
    expect(await labels()).toEqual(before);
  });
});

// controlBackground only: this block runs in the control frame, where the datastore is writable.
contract.describe('updateLabels', () => {
  it('changes one label, keeps the others, and returns every label as it now stands', async () => {
    const first = unique();
    await call('updateLabels', { leaveGroup: first });
    const second = `${unique()} b`;
    const result = await call('updateLabels', { members: second });
    expect(result.labels.map((label) => label.key)).toEqual(LABEL_KEYS);
    expect(result.labels).toEqual(jasmine.arrayContaining([
      jasmine.objectContaining({ key: 'leaveGroup', value: first }),
      jasmine.objectContaining({ key: 'members', value: second }),
    ]));
    expect(await labels()).toEqual(result.labels);
  });

  it('changes every label at once', async () => {
    // 'Post text' fits every label, the shortest of which takes 9 characters.
    const changes = {};
    LABEL_KEYS.forEach((key) => { changes[key] = 'Post text'; });
    const result = await call('updateLabels', changes);
    result.labels.forEach((label) => expect(label.value).toBe('Post text'));
    expect(await labels()).toEqual(result.labels);
  });

  it('takes a text as long as the label allows', async () => {
    await call('updateLabels', { cancelPost: 'Dismiss 1' });
    expect((await labelOf('cancelPost')).value).toBe('Dismiss 1');
  });

  it('goes back to the original with null, and with an empty text', async () => {
    await call('updateLabels', { followPost: unique() });
    await call('updateLabels', { followPost: null });
    expect(await labelOf('followPost')).toEqual(jasmine.objectContaining({ value: null, defaultValue: 'Follow Post' }));
    await call('updateLabels', { followPost: unique() });
    await call('updateLabels', { followPost: '' });
    expect((await labelOf('followPost')).value).toBe('');
  });

  describe('refuses, and changes nothing', () => {
    let before;
    beforeEach(async () => {
      await call('updateLabels', { cancelPost: 'Cancel it', writePost: unique() });
      before = await labels();
    });
    afterEach(async () => {
      expect(await labels()).toEqual(before);
    });

    it('a text longer than the label allows', async () => {
      expect(await refusal(call('updateLabels', { cancelPost: 'Dismiss 10' }))).toContain('cancelPost');
      expect(await refusal(call('updateLabels', { writePost: 'w'.repeat(31) }))).toContain('writePost');
    });

    it('a text that is not text', async () => {
      expect(await refusal(call('updateLabels', { joinGroup: 5 }))).toContain('joinGroup');
    });

    it('a valid change beside an invalid one', async () => {
      expect(await refusal(call('updateLabels', { writePost: unique(), cancelPost: 'Dismiss 10' }))).toContain('cancelPost');
    });

    it('a call with no label in it', async () => {
      await expectAsync(call('updateLabels', {})).toBeRejected();
    });
  });
});
