// settings: how the wall works, kept in the plugin's one settings record, managed from the control panel.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));

contract.describe('getSettings', () => {
  it('shows the settings', async () => {
    expect(await call('getSettings', {})).toEqual(jasmine.objectContaining({
      allowAutoSubscribe: jasmine.any(Boolean),
      showMembers: jasmine.any(Boolean),
      chatFeature: jasmine.any(String),
    }));
  });
});

contract.describe('updateSettings', () => {
  it('changes one setting', async () => {
    expect(await call('updateSettings', { showMembers: true })).toEqual(jasmine.objectContaining({ showMembers: true }));
  });

  it('changes every setting', async () => {
    const changes = {
      allowAutoSubscribe: false,
      disableFollowLeaveGroup: true,
      showMembers: false,
      allowCommunityFeedFollow: true,
      chatFeature: 'actionItem',
      chatFeatureAction: [{ title: 'Pre chat', action: 'linkToWeb', url: 'https://example.com/pre-chat' }],
      actionItem: [{ title: 'Pre wall button', action: 'linkToWeb', url: 'https://example.com/pre-button' }],
      pinnedPost: '<p>Pre pinned message</p>',
    };
    expect(await call('updateSettings', changes)).toEqual(jasmine.objectContaining({
      allowAutoSubscribe: false,
      disableFollowLeaveGroup: true,
      showMembers: false,
      allowCommunityFeedFollow: true,
      chatFeature: 'actionItem',
      chatFeatureAction: jasmine.objectContaining({ title: 'Pre chat', action: 'linkToWeb' }),
      actionItem: jasmine.objectContaining({ title: 'Pre wall button', action: 'linkToWeb' }),
      pinnedPost: '<p>Pre pinned message</p>',
    }));
  });

  it('takes an action item given on its own', async () => {
    const actionItem = { title: 'Pre single wall button', action: 'linkToWeb', url: 'https://example.com/pre-single' };
    expect(await call('updateSettings', { actionItem })).toEqual(jasmine.objectContaining({
      actionItem: jasmine.objectContaining({ title: 'Pre single wall button' }),
    }));
  });
});
