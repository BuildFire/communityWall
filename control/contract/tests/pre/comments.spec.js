// comments: removed from the posts they are on, from the control panel. Only app users write comments, as themselves,
// which the contract never does: so a call that removes one can only name a comment nothing has.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const missingId = '000000000000000000000000';
const standIn = () => {
  spyOn(buildfire.messaging, 'sendMessageToWidget');
  spyOn(buildfire.services.contract.events, 'send').and.callFake((eventName, data, callback) => callback && callback(null, []));
};

// No comment can be made through the contract, so these calls name comments nothing has: they show the operation is
// still there and still looks its comment up, which is all a call written now can rely on.
contract.describe('deleteComment', () => {
  beforeEach(standIn);

  it('looks a comment up by its text', async () => {
    await expectAsync(call('deleteComment', { commentText: `Pre comment to delete (${contract.host})` })).toBeRejected();
  });

  it('looks a comment up by its text, its post and its author', async () => {
    const parameters = { commentText: `Pre comment to delete (${contract.host})`, postText: `Pre post (${contract.host})`, userId: contract.user._id };
    await expectAsync(call('deleteComment', parameters)).toBeRejected();
  });
});

contract.describe('deleteCommentAdvanced', () => {
  beforeEach(standIn);

  it('looks a comment up by its post and its id', async () => {
    await expectAsync(call('deleteCommentAdvanced', { postId: missingId, commentId: 'pre-comment' })).toBeRejected();
  });
});

contract.describe('deleteCommentsAdvanced', () => {
  beforeEach(standIn);

  it('looks every comment up by its post and its id', async () => {
    await expectAsync(call('deleteCommentsAdvanced', { comments: [{ postId: missingId, commentId: 'pre-comment' }] })).toBeRejected();
  });
});
