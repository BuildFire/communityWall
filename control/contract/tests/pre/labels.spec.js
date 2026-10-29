// labels: the wording of the app's labels and messages, kept by the control panel's Languages tab.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const holding = (key, value) => jasmine.objectContaining({
  labels: jasmine.arrayContaining([jasmine.objectContaining({ key, value })]),
});

contract.describe('getLabels', () => {
  it('reads the labels', async () => {
    expect(await call('getLabels', {})).toEqual(jasmine.objectContaining({
      labels: jasmine.arrayContaining([jasmine.objectContaining({ key: 'leaveGroup', defaultValue: 'Leave Group' })]),
    }));
  });
});

contract.describe('updateLabels', () => {
  it('changes one label', async () => {
    expect(await call('updateLabels', { leaveGroup: 'Pre leave' })).toEqual(holding('leaveGroup', 'Pre leave'));
  });

  it('changes several labels', async () => {
    const changes = { joinGroup: 'Pre join', cancelPost: 'Pre no', publicNotificationMessageTitle: 'Pre new post' };
    expect(await call('updateLabels', changes)).toEqual(holding('publicNotificationMessageTitle', 'Pre new post'));
  });
});
