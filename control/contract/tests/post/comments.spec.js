// comments: removed from the posts they are on, from the control panel. Only app users write comments, as themselves,
// which the contract never does: so these specs find none of their own, and test every refusal instead.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const reason = (error) => String((error && error.message) || error);
// The reason a call was refused; fails the spec when the call succeeds.
const refusal = (promise) => promise.then(() => fail('expected the call to be refused'), reason);
const unique = (label) => `Post ${label} (${contract.host}) ${Date.now()}`;
const missingId = '000000000000000000000000';
// Nothing here answers the refresh message or the contract's events: spies stand in for both.
const standIn = () => {
  spyOn(buildfire.messaging, 'sendMessageToWidget');
  spyOn(buildfire.services.contract.events, 'send').and.callFake((eventName, data, callback) => callback && callback(null, []));
};
const toldNoOne = () => {
  expect(buildfire.services.contract.events.send).not.toHaveBeenCalled();
  expect(buildfire.messaging.sendMessageToWidget).not.toHaveBeenCalled();
};

// controlBackground only: removing comments is the owner's.
contract.describe('deleteComment', () => {
  beforeEach(standIn);

  describe('refuses, and removes nothing', () => {
    it('a text no comment has, naming it', async () => {
      const commentText = unique('missing');
      expect(await refusal(call('deleteComment', { commentText }))).toContain(commentText);
      toldNoOne();
    });

    it('a text no comment by that person has, on that post', async () => {
      const commentText = unique('missing narrowed');
      expect(await refusal(call('deleteComment', { commentText, postText: unique('post'), userId: contract.user._id }))).toContain(commentText);
      toldNoOne();
    });

    it('without a comment text', async () => {
      expect(await refusal(call('deleteComment', {}))).toContain('commentText');
      toldNoOne();
    });

    it('with no comment text', async () => {
      expect(await refusal(call('deleteComment', { commentText: null }))).toContain('commentText');
      toldNoOne();
    });

    it('with an empty comment text', async () => {
      expect(await refusal(call('deleteComment', { commentText: '' }))).toContain('commentText');
      toldNoOne();
    });

    it('with a comment text that is not text', async () => {
      expect(await refusal(call('deleteComment', { commentText: 42 }))).toContain('commentText');
      toldNoOne();
    });

    it('with a post text that is not text', async () => {
      expect(await refusal(call('deleteComment', { commentText: unique('comment'), postText: 42 }))).toContain('postText');
      toldNoOne();
    });

    it('with an empty author', async () => {
      expect(await refusal(call('deleteComment', { commentText: unique('comment'), userId: '' }))).toContain('userId');
      toldNoOne();
    });
  });
});

contract.describe('deleteCommentAdvanced', () => {
  beforeEach(standIn);

  describe('refuses, and removes nothing', () => {
    it('a post id no post has, naming it', async () => {
      expect(await refusal(call('deleteCommentAdvanced', { postId: missingId, commentId: 'a-comment' }))).toContain(missingId);
      toldNoOne();
    });

    it('without a post id', async () => {
      expect(await refusal(call('deleteCommentAdvanced', { commentId: 'a-comment' }))).toContain('postId');
      toldNoOne();
    });

    it('with no post id', async () => {
      expect(await refusal(call('deleteCommentAdvanced', { postId: null, commentId: 'a-comment' }))).toContain('postId');
      toldNoOne();
    });

    it('with an empty post id', async () => {
      expect(await refusal(call('deleteCommentAdvanced', { postId: '', commentId: 'a-comment' }))).toContain('postId');
      toldNoOne();
    });

    it('without a comment id', async () => {
      expect(await refusal(call('deleteCommentAdvanced', { postId: missingId }))).toContain('commentId');
      toldNoOne();
    });

    it('with no comment id', async () => {
      expect(await refusal(call('deleteCommentAdvanced', { postId: missingId, commentId: null }))).toContain('commentId');
      toldNoOne();
    });

    it('with an empty comment id', async () => {
      expect(await refusal(call('deleteCommentAdvanced', { postId: missingId, commentId: '' }))).toContain('commentId');
      toldNoOne();
    });

    it('with a comment id that is not text', async () => {
      expect(await refusal(call('deleteCommentAdvanced', { postId: missingId, commentId: 42 }))).toContain('commentId');
      toldNoOne();
    });
  });
});

contract.describe('deleteCommentsAdvanced', () => {
  beforeEach(standIn);

  describe('refuses the whole list, and removes none of it', () => {
    it('when a comment no longer exists', async () => {
      expect(await refusal(call('deleteCommentsAdvanced', { comments: [{ postId: missingId, commentId: 'a-comment' }] }))).toContain(missingId);
      toldNoOne();
    });

    it('when one entry has no comment id', async () => {
      const comments = [{ postId: missingId, commentId: 'a-comment' }, { postId: missingId }];
      expect(await refusal(call('deleteCommentsAdvanced', { comments }))).toContain('commentId');
      toldNoOne();
    });

    it('when one entry has no post id', async () => {
      expect(await refusal(call('deleteCommentsAdvanced', { comments: [{ commentId: 'a-comment' }] }))).toContain('postId');
      toldNoOne();
    });

    it('when the same comment is listed twice', async () => {
      const comments = [{ postId: missingId, commentId: 'a-comment' }, { postId: missingId, commentId: 'a-comment' }];
      await expectAsync(call('deleteCommentsAdvanced', { comments })).toBeRejected();
      toldNoOne();
    });

    it('when it is empty', async () => {
      await expectAsync(call('deleteCommentsAdvanced', { comments: [] })).toBeRejected();
      toldNoOne();
    });

    it('when it holds more than 50 entries', async () => {
      const comments = Array.from({ length: 51 }, (value, index) => ({ postId: missingId, commentId: `comment-${index}` }));
      await expectAsync(call('deleteCommentsAdvanced', { comments })).toBeRejected();
      toldNoOne();
    });

    it('when it is missing', async () => {
      expect(await refusal(call('deleteCommentsAdvanced', {}))).toContain('comments');
      toldNoOne();
    });
  });
});
