// comments: the comments on the wall's posts, removed from the control panel.
// No operation makes a post or a comment (app users write them, as themselves), so the removals are checked by how they find their target and what they refuse.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const reason = (error) => String((error && error.message) || error);
// The reason a call was refused; fails the spec when the call succeeds.
const refusal = (promise) => promise.then(() => fail('expected the call to be refused'), reason);
const unique = (label) => `Post ${label} (${contract.host}) ${Date.now()}`;
const NO_SUCH_ID = '000000000000000000000000';
// A removal announces the comment and refreshes the widget; nothing here answers either, so spies stand in for them.
const standInForTheSends = () => {
  spyOn(buildfire.services.contract.events, 'send').and.callFake((eventName, data, callback) => callback && callback(null, []));
  spyOn(buildfire.messaging, 'sendMessageToWidget');
};
const expectNothingSent = () => {
  expect(buildfire.services.contract.events.send).not.toHaveBeenCalled();
  expect(buildfire.messaging.sendMessageToWidget).not.toHaveBeenCalled();
};

// controlBackground only: this block runs in the control frame.
contract.describe('deleteComment', () => {
  beforeEach(standInForTheSends);

  it('refuses a text no comment has, naming it, and announces nothing', async () => {
    const commentText = unique('missing');
    expect(await refusal(call('deleteComment', { commentText }))).toContain(commentText);
    expectNothingSent();
  });

  it('refuses a text no comment has, with every narrowing given', async () => {
    const commentText = unique('narrowed');
    expect(await refusal(call('deleteComment', { commentText, postText: unique('post'), userId: [contract.user._id] }))).toContain(commentText);
    expectNothingSent();
  });

  it('takes the author given on its own', async () => {
    const commentText = unique('single author');
    expect(await refusal(call('deleteComment', { commentText, userId: contract.user._id }))).toContain(commentText);
  });

  describe('refuses, and removes nothing', () => {
    it('without the comment text', async () => {
      expect(await refusal(call('deleteComment', {}))).toContain('commentText');
      expect(await refusal(call('deleteComment', { commentText: null }))).toContain('commentText');
      expect(await refusal(call('deleteComment', { commentText: '' }))).toContain('commentText');
      expect(await refusal(call('deleteComment', { commentText: 5 }))).toContain('commentText');
      expectNothingSent();
    });

    it('a post text that is not text', async () => {
      expect(await refusal(call('deleteComment', { commentText: unique('post text'), postText: 5 }))).toContain('postText');
    });

    it('more than one author', async () => {
      expect(await refusal(call('deleteComment', { commentText: unique('two authors'), userId: [contract.user._id, '6ad6624a418cfa5ac8b30001'] }))).toContain('userId');
      expectNothingSent();
    });

    it('an email no app user has', async () => {
      await expectAsync(call('deleteComment', { commentText: unique('email'), userId: [`nobody.${Date.now()}@example.com`] })).toBeRejected();
      expectNothingSent();
    });
  });
});

// controlBackground only: this block runs in the control frame.
contract.describe('deleteCommentAdvanced', () => {
  beforeEach(standInForTheSends);

  it('refuses a post id no post has, and announces nothing', async () => {
    expect(await refusal(call('deleteCommentAdvanced', { postId: NO_SUCH_ID, commentId: 'a1b2c3' }))).toContain(NO_SUCH_ID);
    expectNothingSent();
  });

  it('refuses without the post id or the comment id', async () => {
    expect(await refusal(call('deleteCommentAdvanced', { commentId: 'a1b2c3' }))).toContain('postId');
    expect(await refusal(call('deleteCommentAdvanced', { postId: null, commentId: 'a1b2c3' }))).toContain('postId');
    expect(await refusal(call('deleteCommentAdvanced', { postId: '', commentId: 'a1b2c3' }))).toContain('postId');
    expect(await refusal(call('deleteCommentAdvanced', { postId: NO_SUCH_ID }))).toContain('commentId');
    expect(await refusal(call('deleteCommentAdvanced', { postId: NO_SUCH_ID, commentId: null }))).toContain('commentId');
    expect(await refusal(call('deleteCommentAdvanced', { postId: NO_SUCH_ID, commentId: '' }))).toContain('commentId');
    expect(await refusal(call('deleteCommentAdvanced', { postId: NO_SUCH_ID, commentId: 5 }))).toContain('commentId');
    expectNothingSent();
  });
});

// controlBackground only: this block runs in the control frame.
contract.describe('deleteCommentsAdvanced', () => {
  beforeEach(standInForTheSends);

  describe('refuses the whole list, and removes none of it', () => {
    it('when one comment does not exist', async () => {
      expect(await refusal(call('deleteCommentsAdvanced', { comments: [{ postId: NO_SUCH_ID, commentId: 'a1b2c3' }] }))).toContain(NO_SUCH_ID);
      expectNothingSent();
    });

    it('when one entry has no comment id', async () => {
      const comments = [{ postId: NO_SUCH_ID, commentId: 'a1b2c3' }, { postId: NO_SUCH_ID }];
      expect(await refusal(call('deleteCommentsAdvanced', { comments }))).toContain('commentId');
      expectNothingSent();
    });

    it('when one entry has no post id', async () => {
      expect(await refusal(call('deleteCommentsAdvanced', { comments: [{ commentId: 'a1b2c3' }] }))).toContain('postId');
    });

    it('when the same comment is listed twice', async () => {
      const comments = [{ postId: NO_SUCH_ID, commentId: 'a1b2c3' }, { postId: NO_SUCH_ID, commentId: 'a1b2c3' }];
      await expectAsync(call('deleteCommentsAdvanced', { comments })).toBeRejected();
      expectNothingSent();
    });

    it('when it is empty, or missing', async () => {
      expect(await refusal(call('deleteCommentsAdvanced', { comments: [] }))).toContain('comments');
      expect(await refusal(call('deleteCommentsAdvanced', {}))).toContain('comments');
    });

    it('when it holds more than 50 comments', async () => {
      const comments = Array.from({ length: 51 }, (value, index) => ({ postId: NO_SUCH_ID, commentId: `comment${index}` }));
      expect(await refusal(call('deleteCommentsAdvanced', { comments }))).toContain('comments');
      expectNothingSent();
    });
  });
});
