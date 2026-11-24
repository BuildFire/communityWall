// settings: how the wall works, kept in the plugin's one settings record, managed from the control panel.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const reason = (error) => String((error && error.message) || error);
// The reason a call was refused; fails the spec when the call succeeds.
const refusal = (promise) => promise.then(() => fail('expected the call to be refused'), reason);
const unique = (label) => `Post ${label} (${contract.host}) ${Date.now()}`;
const settings = () => call('getSettings', {});
const button = (label) => ({ title: unique(label), action: 'linkToWeb', url: 'https://example.com/wall' });
// What every read of the settings holds, whatever was saved before.
const SETTINGS_SHAPE = {
  allowAutoSubscribe: jasmine.any(Boolean),
  disableFollowLeaveGroup: jasmine.any(Boolean),
  showMembers: jasmine.any(Boolean),
  allowCommunityFeedFollow: jasmine.any(Boolean),
  chatFeature: jasmine.any(String),
};

// controlBackground only: this block runs in the control frame.
contract.describe('getSettings', () => {
  it('shows every setting, the way the wall uses it', async () => {
    const result = await settings();
    expect(result).toEqual(jasmine.objectContaining(SETTINGS_SHAPE));
    expect(['default', 'actionItem']).toContain(result.chatFeature);
    ['chatFeatureAction', 'actionItem', 'pinnedPost'].forEach((name) => expect(name in result).toBe(true));
  });

  it('shows what was last saved', async () => {
    const pinnedPost = `<p>${unique('pinned')}</p>`;
    await call('updateSettings', { showMembers: false, pinnedPost });
    expect(await settings()).toEqual(jasmine.objectContaining({ showMembers: false, pinnedPost }));
  });

  it('changes nothing', async () => {
    const before = await settings();
    expect(await settings()).toEqual(before);
  });
});

// controlBackground only: this block runs in the control frame, where the datastore is writable.
contract.describe('updateSettings', () => {
  it('changes one setting, keeps the others, and returns the settings as they now stand', async () => {
    await call('updateSettings', { allowAutoSubscribe: true, disableFollowLeaveGroup: false });
    const result = await call('updateSettings', { disableFollowLeaveGroup: true });
    expect(result).toEqual(jasmine.objectContaining({ ...SETTINGS_SHAPE, allowAutoSubscribe: true, disableFollowLeaveGroup: true }));
    expect(await settings()).toEqual(result);
  });

  it('changes every setting at once', async () => {
    const actionItem = button('button');
    const chatFeatureAction = { title: unique('chat'), action: 'linkToWeb', url: 'https://example.com/chat' };
    const pinnedPost = `<p>${unique('every')}</p>`;
    const changes = {
      allowAutoSubscribe: false,
      disableFollowLeaveGroup: true,
      showMembers: false,
      allowCommunityFeedFollow: true,
      chatFeature: 'actionItem',
      chatFeatureAction: [chatFeatureAction],
      actionItem: [actionItem],
      pinnedPost,
    };
    const expected = { ...changes, chatFeatureAction: jasmine.objectContaining(chatFeatureAction), actionItem: jasmine.objectContaining(actionItem) };
    expect(await call('updateSettings', changes)).toEqual(jasmine.objectContaining(expected));
    expect(await settings()).toEqual(jasmine.objectContaining(expected));
  });

  describe('action items', () => {
    it('keeps the one action item given as a list as that item', async () => {
      const actionItem = button('listed');
      expect((await call('updateSettings', { actionItem: [actionItem] })).actionItem).toEqual(jasmine.objectContaining(actionItem));
      expect((await settings()).actionItem).toEqual(jasmine.objectContaining(actionItem));
    });

    it('takes an action item given on its own', async () => {
      const actionItem = button('single');
      await call('updateSettings', { actionItem });
      expect((await settings()).actionItem).toEqual(jasmine.objectContaining(actionItem));
    });

    it('takes an action item that does nothing', async () => {
      const actionItem = { title: unique('no action'), action: 'noAction' };
      await call('updateSettings', { actionItem: [actionItem] });
      expect((await settings()).actionItem).toEqual(jasmine.objectContaining(actionItem));
    });

    it('removes the action item with null, and with an empty list', async () => {
      await call('updateSettings', { actionItem: [button('to remove')] });
      expect((await call('updateSettings', { actionItem: null })).actionItem).toBeNull();
      expect((await settings()).actionItem).toBeNull();
      await call('updateSettings', { actionItem: [button('to empty')] });
      await call('updateSettings', { actionItem: [] });
      expect((await settings()).actionItem).toBeNull();
    });

    it("keeps the plugin's own chat when the action item is chosen without one set", async () => {
      await call('updateSettings', { chatFeatureAction: null });
      expect((await call('updateSettings', { chatFeature: 'actionItem' })).chatFeature).toBe('default');
      expect((await settings()).chatFeature).toBe('default');
    });

    it('opens chats with the action item once one is set', async () => {
      const chatFeatureAction = { title: unique('chat'), action: 'linkToWeb', url: 'https://example.com/chat' };
      await call('updateSettings', { chatFeature: 'actionItem', chatFeatureAction: [chatFeatureAction] });
      expect(await settings()).toEqual(jasmine.objectContaining({ chatFeature: 'actionItem', chatFeatureAction: jasmine.objectContaining(chatFeatureAction) }));
      await call('updateSettings', { chatFeature: 'default' });
      expect(await settings()).toEqual(jasmine.objectContaining({ chatFeature: 'default', chatFeatureAction: jasmine.objectContaining(chatFeatureAction) }));
    });
  });

  describe('the pinned post', () => {
    it('keeps the formatted text as given', async () => {
      const pinnedPost = `<p><strong>${unique('bold')}</strong> <a href="https://example.com">link</a></p>`;
      await call('updateSettings', { pinnedPost });
      expect((await settings()).pinnedPost).toBe(pinnedPost);
    });

    it('removes it with null, and with an empty text', async () => {
      await call('updateSettings', { pinnedPost: `<p>${unique('to clear')}</p>` });
      await call('updateSettings', { pinnedPost: null });
      expect((await settings()).pinnedPost).toBeNull();
      await call('updateSettings', { pinnedPost: `<p>${unique('to empty')}</p>` });
      await call('updateSettings', { pinnedPost: '' });
      expect((await settings()).pinnedPost).toBe('');
    });
  });

  describe('refuses, and changes nothing', () => {
    let before;
    beforeEach(async () => {
      await call('updateSettings', { showMembers: true, actionItem: [button('kept')], pinnedPost: `<p>${unique('kept')}</p>` });
      before = await settings();
    });
    afterEach(async () => {
      expect(await settings()).toEqual(before);
    });

    it('a call with no setting in it', async () => {
      await expectAsync(call('updateSettings', {})).toBeRejected();
    });

    it('a toggle that is not true or false', async () => {
      expect(await refusal(call('updateSettings', { showMembers: 'no' }))).toContain('showMembers');
      expect(await refusal(call('updateSettings', { allowAutoSubscribe: null }))).toContain('allowAutoSubscribe');
      expect(await refusal(call('updateSettings', { disableFollowLeaveGroup: 1 }))).toContain('disableFollowLeaveGroup');
      expect(await refusal(call('updateSettings', { allowCommunityFeedFollow: 'true' }))).toContain('allowCommunityFeedFollow');
    });

    it('a chat feature it does not offer', async () => {
      expect(await refusal(call('updateSettings', { chatFeature: 'popup' }))).toContain('chatFeature');
    });

    it('a valid change beside an invalid one', async () => {
      expect(await refusal(call('updateSettings', { showMembers: false, chatFeature: 'popup' }))).toContain('chatFeature');
    });

    it('more than one action item', async () => {
      expect(await refusal(call('updateSettings', { actionItem: [button('one'), button('two')] }))).toContain('actionItem');
      expect(await refusal(call('updateSettings', { chatFeatureAction: [button('one'), button('two')] }))).toContain('chatFeatureAction');
    });

    it('an action item without its kind of action', async () => {
      expect(await refusal(call('updateSettings', { actionItem: [{ title: unique('no kind') }] }))).toContain('actionItem');
      expect(await refusal(call('updateSettings', { chatFeatureAction: 'https://example.com/chat' }))).toContain('chatFeatureAction');
    });

    it('a pinned post that is not text', async () => {
      expect(await refusal(call('updateSettings', { pinnedPost: 5 }))).toContain('pinnedPost');
    });
  });
});
