// settings: how the wall works and the message pinned at its top, one record the control panel keeps.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));

contract.describe('getSettings', () => {
  it('reads the settings', async () => {
    expect(await call('getSettings', {})).toEqual(jasmine.objectContaining({
      allowAutoSubscribe: jasmine.any(Boolean), showMembers: jasmine.any(Boolean), chatFeature: jasmine.any(String),
    }));
  });
});

contract.describe('updateSettings', () => {
  it('changes one setting', async () => {
    expect(await call('updateSettings', { showMembers: false })).toEqual(jasmine.objectContaining({ showMembers: false }));
  });

  it('changes every setting', async () => {
    const all = {
      allowAutoSubscribe: true,
      disableFollowLeaveGroup: false,
      showMembers: true,
      allowCommunityFeedFollow: false,
      chatFeature: 'actionItem',
      chatFeatureAction: { title: 'Pre chat', action: 'linkToWeb', url: 'https://example.com/pre-chat' },
      actionItem: { title: 'Pre button', action: 'linkToWeb', url: 'https://example.com/pre-button' },
      pinnedPost: '<p>Pre pinned post</p>',
    };
    expect(await call('updateSettings', all)).toEqual(jasmine.objectContaining({ showMembers: true, pinnedPost: '<p>Pre pinned post</p>' }));
  });
});
