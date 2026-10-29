// settings: how the wall works and the message pinned at its top, one record the control panel keeps.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const reason = (error) => String((error && error.message) || error);
// The reason a call was refused; fails the spec when the call succeeds.
const refusal = (promise) => promise.then(() => fail('expected the call to be refused'), reason);
const stamp = () => `(${contract.host}) ${Date.now()}`;
const website = (label) => ({ title: label, action: 'linkToWeb', url: 'https://example.com/community' });
const settingsShape = {
  allowAutoSubscribe: jasmine.any(Boolean),
  disableFollowLeaveGroup: jasmine.any(Boolean),
  showMembers: jasmine.any(Boolean),
  allowCommunityFeedFollow: jasmine.any(Boolean),
  chatFeature: jasmine.stringMatching(/^(default|actionItem)$/),
};

// controlBackground only: the settings are the owner's.
contract.describe('getSettings', () => {
  it('answers every setting', async () => {
    const settings = await call('getSettings', {});
    expect(settings).toEqual(jasmine.objectContaining(settingsShape));
    expect(Object.keys(settings)).toEqual(jasmine.arrayContaining(['chatFeatureAction', 'actionItem', 'pinnedPost']));
  });

  it('changes nothing', async () => {
    expect(await call('getSettings', {})).toEqual(await call('getSettings', {}));
  });
});

contract.describe('updateSettings', () => {
  it('changes only the settings it is given, and answers them all', async () => {
    await call('updateSettings', { showMembers: false, allowCommunityFeedFollow: true });
    const result = await call('updateSettings', { allowAutoSubscribe: false });
    expect(result).toEqual(jasmine.objectContaining({ allowAutoSubscribe: false, showMembers: false, allowCommunityFeedFollow: true }));
    expect(await call('getSettings', {})).toEqual(result);
  });

  it('sets every setting at once', async () => {
    const pinnedPost = `<p>Post pinned ${stamp()}</p>`;
    const chat = website(`Post chat ${stamp()}`);
    const button = website(`Post button ${stamp()}`);
    const all = {
      allowAutoSubscribe: true, disableFollowLeaveGroup: true, showMembers: true, allowCommunityFeedFollow: false,
      chatFeature: 'actionItem', chatFeatureAction: chat, actionItem: button, pinnedPost,
    };
    expect(await call('updateSettings', all)).toEqual(jasmine.objectContaining(all));
    expect(await call('getSettings', {})).toEqual(jasmine.objectContaining(all));
  });

  it('keeps the plugin\'s own chat when the action item is chosen without one', async () => {
    await call('updateSettings', { chatFeature: 'default', chatFeatureAction: null });
    expect(await call('updateSettings', { chatFeature: 'actionItem' })).toEqual(jasmine.objectContaining({ chatFeature: 'default', chatFeatureAction: null }));
  });

  it('removes the action item and the chat action item when they are left empty', async () => {
    await call('updateSettings', { actionItem: website(`Post remove ${stamp()}`), chatFeatureAction: website(`Post chat ${stamp()}`) });
    await call('updateSettings', { actionItem: null, chatFeatureAction: null });
    expect(await call('getSettings', {})).toEqual(jasmine.objectContaining({ actionItem: null, chatFeatureAction: null }));
  });

  it('removes the pinned post with null, and with an empty text', async () => {
    await call('updateSettings', { pinnedPost: `<p>Post pinned ${stamp()}</p>` });
    await call('updateSettings', { pinnedPost: null });
    expect((await call('getSettings', {})).pinnedPost).toBeNull();
    await call('updateSettings', { pinnedPost: `<p>Post pinned again ${stamp()}</p>` });
    await call('updateSettings', { pinnedPost: '' });
    expect((await call('getSettings', {})).pinnedPost).toBe('');
  });

  describe('refuses, and changes nothing', () => {
    let before;
    beforeEach(async () => {
      await call('updateSettings', { showMembers: true, pinnedPost: `<p>Post kept ${stamp()}</p>` });
      before = await call('getSettings', {});
    });
    const unchanged = async () => expect(await call('getSettings', {})).toEqual(before);

    it('a call with no setting in it', async () => {
      await expectAsync(call('updateSettings', {})).toBeRejected();
      await unchanged();
    });

    it('a toggle that is not true or false', async () => {
      expect(await refusal(call('updateSettings', { showMembers: 'no', pinnedPost: '<p>x</p>' }))).toContain('showMembers');
      await unchanged();
    });

    it('a chat feature it does not offer', async () => {
      expect(await refusal(call('updateSettings', { chatFeature: 'phone' }))).toContain('chatFeature');
      await unchanged();
    });

    it('an action item that is not one', async () => {
      expect(await refusal(call('updateSettings', { actionItem: 'https://example.com' }))).toContain('actionItem');
      await unchanged();
    });

    it('a chat action item without its kind of action', async () => {
      expect(await refusal(call('updateSettings', { chatFeatureAction: { title: 'Chat' } }))).toContain('chatFeatureAction');
      await unchanged();
    });

    it('a pinned post that is not text', async () => {
      expect(await refusal(call('updateSettings', { pinnedPost: 42 }))).toContain('pinnedPost');
      await unchanged();
    });
  });
});
