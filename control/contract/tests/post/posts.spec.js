// posts: the wall's posts, found from both sides and removed from the control panel. Only app users write posts, as
// themselves, which the contract never does: so these specs find none of their own, and test every refusal instead.
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

contract.describe('searchPosts', () => {
  it('answers with the posts found, their total, the page and whether more follow', async () => {
    expect(await call('searchPosts', { text: unique('no such post') })).toEqual(jasmine.objectContaining({
      posts: [], total: 0, page: 0, hasMore: false,
    }));
  });

  it('takes every narrowing at once: wall, text, author and page', async () => {
    const result = await call('searchPosts', { wallId: '', text: unique('narrowed'), userId: contract.user._id, page: 1, pageSize: 5 });
    expect(result).toEqual(jasmine.objectContaining({ posts: [], total: 0, page: 1, hasMore: false }));
  });

  it('answers a list of posts with no narrowing at all', async () => {
    const result = await call('searchPosts', {});
    expect(result).toEqual(jasmine.objectContaining({ posts: jasmine.any(Array), total: jasmine.any(Number), page: 0, hasMore: jasmine.any(Boolean) }));
    expect(result.posts.length).toBeLessThanOrEqual(20);
  });

  describe('refuses', () => {
    it('more than 50 posts a page', async () => {
      expect(await refusal(call('searchPosts', { pageSize: 51 }))).toContain('pageSize');
    });

    it('an empty page', async () => {
      expect(await refusal(call('searchPosts', { pageSize: 0 }))).toContain('pageSize');
    });

    it('a page before the first', async () => {
      expect(await refusal(call('searchPosts', { page: -1 }))).toContain('page');
    });

    it('a page that is not a number', async () => {
      expect(await refusal(call('searchPosts', { page: 'first' }))).toContain('page');
    });

    it('a text that is not text', async () => {
      expect(await refusal(call('searchPosts', { text: 42 }))).toContain('text');
    });

    it('an empty author', async () => {
      expect(await refusal(call('searchPosts', { userId: '' }))).toContain('userId');
    });

    it('an email no app user has', async () => {
      await expectAsync(call('searchPosts', { userId: `nobody.${Date.now()}@example.com` })).toBeRejected();
    });
  });
});

// controlBackground only: removing posts is the owner's.
contract.describe('deletePost', () => {
  beforeEach(standIn);

  describe('refuses, and removes nothing', () => {
    it('a text no post has, naming it', async () => {
      const postText = unique('missing');
      expect(await refusal(call('deletePost', { postText }))).toContain(postText);
      toldNoOne();
    });

    it('a text no post has on that wall, by that person', async () => {
      const postText = unique('missing narrowed');
      expect(await refusal(call('deletePost', { postText, userId: contract.user._id, wallId: '' }))).toContain(postText);
      toldNoOne();
    });

    it('without a post text', async () => {
      expect(await refusal(call('deletePost', {}))).toContain('postText');
      toldNoOne();
    });

    it('with no post text', async () => {
      expect(await refusal(call('deletePost', { postText: null }))).toContain('postText');
      toldNoOne();
    });

    it('with an empty post text', async () => {
      expect(await refusal(call('deletePost', { postText: '' }))).toContain('postText');
      toldNoOne();
    });

    it('with a post text that is not text', async () => {
      expect(await refusal(call('deletePost', { postText: 42 }))).toContain('postText');
      toldNoOne();
    });

    it('with an empty author', async () => {
      expect(await refusal(call('deletePost', { postText: unique('author'), userId: '' }))).toContain('userId');
      toldNoOne();
    });

    it('with a wall that is not text', async () => {
      expect(await refusal(call('deletePost', { postText: unique('wall'), wallId: 7 }))).toContain('wallId');
      toldNoOne();
    });
  });
});

contract.describe('deletePostAdvanced', () => {
  beforeEach(standIn);

  describe('refuses, and removes nothing', () => {
    it('an id no post has, naming it', async () => {
      expect(await refusal(call('deletePostAdvanced', { postId: missingId }))).toContain(missingId);
      toldNoOne();
    });

    it('without a post id', async () => {
      expect(await refusal(call('deletePostAdvanced', {}))).toContain('postId');
      toldNoOne();
    });

    it('with no post id', async () => {
      expect(await refusal(call('deletePostAdvanced', { postId: null }))).toContain('postId');
      toldNoOne();
    });

    it('with an empty post id', async () => {
      expect(await refusal(call('deletePostAdvanced', { postId: '' }))).toContain('postId');
      toldNoOne();
    });

    it('with a post id that is not text', async () => {
      expect(await refusal(call('deletePostAdvanced', { postId: 42 }))).toContain('postId');
      toldNoOne();
    });
  });
});

contract.describe('deletePostsAdvanced', () => {
  beforeEach(standIn);

  describe('refuses the whole list, and removes none of it', () => {
    it('when a post no longer exists', async () => {
      expect(await refusal(call('deletePostsAdvanced', { posts: [{ postId: missingId }] }))).toContain(missingId);
      toldNoOne();
    });

    it('when one entry has no post id', async () => {
      expect(await refusal(call('deletePostsAdvanced', { posts: [{ postId: missingId }, {}] }))).toContain('postId');
      toldNoOne();
    });

    it('when the same post is listed twice', async () => {
      await expectAsync(call('deletePostsAdvanced', { posts: [{ postId: missingId }, { postId: missingId }] })).toBeRejected();
      toldNoOne();
    });

    it('when it is empty', async () => {
      await expectAsync(call('deletePostsAdvanced', { posts: [] })).toBeRejected();
      toldNoOne();
    });

    it('when it holds more than 50 entries', async () => {
      const posts = Array.from({ length: 51 }, () => ({ postId: missingId }));
      await expectAsync(call('deletePostsAdvanced', { posts })).toBeRejected();
      toldNoOne();
    });

    it('when it is missing', async () => {
      expect(await refusal(call('deletePostsAdvanced', {}))).toContain('posts');
      toldNoOne();
    });
  });
});
