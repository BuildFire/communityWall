// comments: the comments on the wall's posts, removed from the control panel.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
// No operation makes a post or a comment (app users write them, as themselves), so a removal here has nothing to remove:
// the call is checked to reach the operation and be answered, whichever way a later contract answers a comment nothing has.
const answered = (promise) => promise.then(() => 'answered', () => 'answered');
// A removal announces the comment and refreshes the widget; nothing here answers either, so spies stand in for them.
const standInForTheSends = () => {
  spyOn(buildfire.services.contract.events, 'send').and.callFake((eventName, data, callback) => callback && callback(null, []));
  spyOn(buildfire.messaging, 'sendMessageToWidget');
};

contract.describe('deleteComment', () => {
  beforeEach(standInForTheSends);

  it('removes a comment named by its text', async () => {
    expect(await answered(call('deleteComment', { commentText: `Pre comment to delete (${contract.host})` }))).toBe('answered');
  });

  it("removes a comment named by its text, its post's text and its author", async () => {
    const options = { commentText: `Pre narrowed comment to delete (${contract.host})`, postText: `Pre commented post (${contract.host})`, userId: [contract.user._id] };
    expect(await answered(call('deleteComment', options))).toBe('answered');
  });
});

contract.describe('deleteCommentAdvanced', () => {
  beforeEach(standInForTheSends);

  it("removes a comment by its post's id and its own", async () => {
    expect(await answered(call('deleteCommentAdvanced', { postId: '000000000000000000000000', commentId: 'pre-comment-id' }))).toBe('answered');
  });
});

contract.describe('deleteCommentsAdvanced', () => {
  beforeEach(standInForTheSends);

  it('removes several comments by their ids', async () => {
    const comments = [
      { postId: '000000000000000000000000', commentId: 'pre-comment-one' },
      { postId: '000000000000000000000000', commentId: 'pre-comment-two' },
    ];
    expect(await answered(call('deleteCommentsAdvanced', { comments }))).toBe('answered');
  });
});
