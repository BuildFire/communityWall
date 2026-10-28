// labels: the wording of the app's labels and messages, kept by the control panel's Languages tab.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const reason = (error) => String((error && error.message) || error);
// The reason a call was refused; fails the spec when the call succeeds.
const refusal = (promise) => promise.then(() => fail('expected the call to be refused'), reason);
// Short enough for the tightest label (9 characters), different on every run and host.
const short = () => `${contract.host[0]}${Date.now() % 10000000}`;
const unique = (label) => `Post ${label} (${contract.host}) ${Date.now()}`;
const labelOf = (result, key) => result.labels.find((label) => label.key === key);

// controlBackground only: the labels are the owner's.
contract.describe('getLabels', () => {
  it('answers every label with its original text', async () => {
    const { labels } = await call('getLabels', {});
    expect(labels.length).toBe(56);
    expect(labels[0]).toEqual(jasmine.objectContaining({
      key: 'leaveGroup', section: jasmine.any(String), title: jasmine.any(String), defaultValue: 'Leave Group',
    }));
    expect(labelOf({ labels }, 'cancelPost')).toEqual(jasmine.objectContaining({ defaultValue: 'Cancel' }));
  });

  it('changes nothing', async () => {
    expect(await call('getLabels', {})).toEqual(await call('getLabels', {}));
  });
});

contract.describe('updateLabels', () => {
  it('changes only the labels it is given, and answers them all', async () => {
    const leaveGroup = short();
    await call('updateLabels', { leaveGroup });
    const cancelPost = short();
    const result = await call('updateLabels', { cancelPost });
    expect(labelOf(result, 'cancelPost').value).toBe(cancelPost);
    expect(labelOf(result, 'leaveGroup').value).toBe(leaveGroup);
    expect(result.labels.length).toBe(56);
    expect(await call('getLabels', {})).toEqual(result);
  });

  it('changes several labels at once', async () => {
    const changes = { joinGroup: short(), members: unique('people').slice(0, 30), publicNotificationMessageBody: unique('new post') };
    const result = await call('updateLabels', changes);
    Object.keys(changes).forEach((key) => expect(labelOf(result, key).value).toBe(changes[key]));
  });

  it('goes back to the original with null, and keeps an empty text', async () => {
    await call('updateLabels', { messageDeleted: unique('gone').slice(0, 50) });
    await call('updateLabels', { messageDeleted: null });
    expect(labelOf(await call('getLabels', {}), 'messageDeleted').value).toBeNull();
    await call('updateLabels', { specificChat: unique('restricted') });
    await call('updateLabels', { specificChat: '' });
    expect(labelOf(await call('getLabels', {}), 'specificChat').value).toBe('');
  });

  describe('refuses, and changes nothing', () => {
    let before;
    beforeEach(async () => {
      await call('updateLabels', { confirmPost: short() });
      before = await call('getLabels', {});
    });
    const unchanged = async () => expect(await call('getLabels', {})).toEqual(before);

    it('a text longer than the label allows', async () => {
      expect(await refusal(call('updateLabels', { cancelPost: 'Cancel it now' }))).toContain('cancelPost');
      await unchanged();
    });

    it('a text that is not text', async () => {
      expect(await refusal(call('updateLabels', { confirmPost: 42 }))).toContain('confirmPost');
      await unchanged();
    });

    it('a call with no label in it', async () => {
      await expectAsync(call('updateLabels', {})).toBeRejected();
      await unchanged();
    });
  });
});
