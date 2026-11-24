// posts: the wall's posts, found from both sides and removed from the control panel.
// No operation makes a post (app users write them, as themselves), so the removals are checked by how they find their target and what they refuse.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const reason = (error) => String((error && error.message) || error);
// The reason a call was refused; fails the spec when the call succeeds.
const refusal = (promise) => promise.then(() => fail('expected the call to be refused'), reason);
const unique = (label) => `Post ${label} (${contract.host}) ${Date.now()}`;
const NO_SUCH_ID = '000000000000000000000000';
// A removal announces the post and refreshes the widget; nothing here answers either, so spies stand in for them.
const standInForTheSends = () => {
  spyOn(buildfire.services.contract.events, 'send').and.callFake((eventName, data, callback) => callback && callback(null, []));
  spyOn(buildfire.messaging, 'sendMessageToWidget');
};
const expectNothingSent = () => {
  expect(buildfire.services.contract.events.send).not.toHaveBeenCalled();
  expect(buildfire.messaging.sendMessageToWidget).not.toHaveBeenCalled();
};

contract.describe('searchPosts', () => {
  const page = { posts: jasmine.any(Array), total: jasmine.any(Number), page: jasmine.any(Number), hasMore: jasmine.any(Boolean) };

  it('shows the posts, with how many there are and whether more follow', async () => {
    const result = await call('searchPosts', {});
    expect(result).toEqual(jasmine.objectContaining(page));
    expect(result.page).toBe(0);
    expect(result.posts.length).toBeLessThanOrEqual(20);
    expect(result.hasMore).toBe(result.total > result.posts.length);
  });

  it('takes every filter and the paging at once', async () => {
    const result = await call('searchPosts', { wallId: '', text: unique('text'), userId: [contract.user._id], page: 0, pageSize: 5 });
    expect(result).toEqual(jasmine.objectContaining({ posts: [], total: 0, page: 0, hasMore: false }));
  });

  it('finds nothing for a text no post has', async () => {
    expect(await call('searchPosts', { text: unique('no such post') })).toEqual(jasmine.objectContaining({ posts: [], total: 0, hasMore: false }));
  });

  it('gives back the page it was asked for', async () => {
    expect(await call('searchPosts', { text: unique('paged'), page: 3, pageSize: 10 })).toEqual(jasmine.objectContaining({ posts: [], page: 3 }));
  });

  it('shows at most as many posts as a page holds', async () => {
    expect((await call('searchPosts', { pageSize: 1 })).posts.length).toBeLessThanOrEqual(1);
  });

  it('takes several authors, and one given on its own', async () => {
    const text = unique('authors');
    expect(await call('searchPosts', { text, userId: [contract.user._id, '6ad6624a418cfa5ac8b30001'] })).toEqual(jasmine.objectContaining({ posts: [] }));
    expect(await call('searchPosts', { text, userId: contract.user._id })).toEqual(jasmine.objectContaining({ posts: [] }));
  });

  it('takes an empty list of authors as everyone', async () => {
    expect(await call('searchPosts', { text: unique('everyone'), userId: [] })).toEqual(jasmine.objectContaining({ posts: [], total: 0 }));
  });

  describe('refuses', () => {
    it('an email no app user has', async () => {
      await expectAsync(call('searchPosts', { userId: [`nobody.${Date.now()}@example.com`] })).toBeRejected();
    });

    it('an author that is not an id or an email', async () => {
      expect(await refusal(call('searchPosts', { userId: [''] }))).toContain('userId');
      expect(await refusal(call('searchPosts', { userId: [5] }))).toContain('userId');
    });

    it('a wall id or a text that is not text', async () => {
      expect(await refusal(call('searchPosts', { wallId: 5 }))).toContain('wallId');
      expect(await refusal(call('searchPosts', { text: true }))).toContain('text');
    });

    it('a page below 0, or not a whole number', async () => {
      expect(await refusal(call('searchPosts', { page: -1 }))).toContain('page');
      expect(await refusal(call('searchPosts', { page: 1.5 }))).toContain('page');
    });

    it('a page size outside 1 to 50', async () => {
      expect(await refusal(call('searchPosts', { pageSize: 0 }))).toContain('pageSize');
      expect(await refusal(call('searchPosts', { pageSize: 51 }))).toContain('pageSize');
      expect(await refusal(call('searchPosts', { pageSize: 'ten' }))).toContain('pageSize');
    });
  });
});

// controlBackground only: this block runs in the control frame.
contract.describe('deletePost', () => {
  beforeEach(standInForTheSends);

  it('refuses a text no post has, naming it, and announces nothing', async () => {
    const postText = unique('missing');
    expect(await refusal(call('deletePost', { postText }))).toContain(postText);
    expectNothingSent();
  });

  it('refuses a text no post has, with every narrowing given', async () => {
    const postText = unique('narrowed');
    expect(await refusal(call('deletePost', { postText, userId: [contract.user._id], wallId: '' }))).toContain(postText);
    expectNothingSent();
  });

  it('takes the author given on its own', async () => {
    const postText = unique('single author');
    expect(await refusal(call('deletePost', { postText, userId: contract.user._id }))).toContain(postText);
  });

  describe('refuses, and removes nothing', () => {
    it('without the post text', async () => {
      expect(await refusal(call('deletePost', {}))).toContain('postText');
      expect(await refusal(call('deletePost', { postText: null }))).toContain('postText');
      expect(await refusal(call('deletePost', { postText: '' }))).toContain('postText');
      expectNothingSent();
    });

    it('a post text that is not text', async () => {
      expect(await refusal(call('deletePost', { postText: 5 }))).toContain('postText');
    });

    it('more than one author', async () => {
      expect(await refusal(call('deletePost', { postText: unique('two authors'), userId: [contract.user._id, '6ad6624a418cfa5ac8b30001'] }))).toContain('userId');
      expectNothingSent();
    });

    it('a wall id that is not text', async () => {
      expect(await refusal(call('deletePost', { postText: unique('wall'), wallId: 5 }))).toContain('wallId');
    });

    it('an email no app user has', async () => {
      await expectAsync(call('deletePost', { postText: unique('email'), userId: [`nobody.${Date.now()}@example.com`] })).toBeRejected();
      expectNothingSent();
    });
  });
});

// controlBackground only: this block runs in the control frame.
contract.describe('deletePostAdvanced', () => {
  beforeEach(standInForTheSends);

  it('refuses an id no post has, and announces nothing', async () => {
    expect(await refusal(call('deletePostAdvanced', { postId: NO_SUCH_ID }))).toContain(NO_SUCH_ID);
    expectNothingSent();
  });

  it('refuses without the post id', async () => {
    expect(await refusal(call('deletePostAdvanced', {}))).toContain('postId');
    expect(await refusal(call('deletePostAdvanced', { postId: null }))).toContain('postId');
    expect(await refusal(call('deletePostAdvanced', { postId: '' }))).toContain('postId');
    expect(await refusal(call('deletePostAdvanced', { postId: 5 }))).toContain('postId');
    expectNothingSent();
  });
});

// controlBackground only: this block runs in the control frame.
contract.describe('deletePostsAdvanced', () => {
  beforeEach(standInForTheSends);

  describe('refuses the whole list, and removes none of it', () => {
    it('when one post does not exist', async () => {
      expect(await refusal(call('deletePostsAdvanced', { posts: [{ postId: NO_SUCH_ID }] }))).toContain(NO_SUCH_ID);
      expectNothingSent();
    });

    it('when one entry has no post id', async () => {
      expect(await refusal(call('deletePostsAdvanced', { posts: [{ postId: NO_SUCH_ID }, {}] }))).toContain('postId');
      expectNothingSent();
    });

    it('when the same post is listed twice', async () => {
      await expectAsync(call('deletePostsAdvanced', { posts: [{ postId: NO_SUCH_ID }, { postId: NO_SUCH_ID }] })).toBeRejected();
      expectNothingSent();
    });

    it('when it is empty, or missing', async () => {
      expect(await refusal(call('deletePostsAdvanced', { posts: [] }))).toContain('posts');
      expect(await refusal(call('deletePostsAdvanced', {}))).toContain('posts');
    });

    it('when it holds more than 50 posts', async () => {
      const posts = Array.from({ length: 51 }, (value, index) => ({ postId: `${index}`.padStart(24, 'a') }));
      expect(await refusal(call('deletePostsAdvanced', { posts }))).toContain('posts');
      expectNothingSent();
    });
  });
});
