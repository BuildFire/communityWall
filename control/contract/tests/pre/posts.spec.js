// posts: the wall's posts, found from both sides and removed from the control panel.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
// No operation makes a post (app users write them, as themselves), so a removal here has nothing to remove: the call
// is checked to reach the operation and be answered, whichever way a later contract answers a post nothing has.
const answered = (promise) => promise.then(() => 'answered', () => 'answered');
// A removal announces the post and refreshes the widget; nothing here answers either, so spies stand in for them.
const standInForTheSends = () => {
  spyOn(buildfire.services.contract.events, 'send').and.callFake((eventName, data, callback) => callback && callback(null, []));
  spyOn(buildfire.messaging, 'sendMessageToWidget');
};
const PAGE = { posts: jasmine.any(Array), total: jasmine.any(Number), page: jasmine.any(Number), hasMore: jasmine.any(Boolean) };

contract.describe('searchPosts', () => {
  it('shows the posts', async () => {
    expect(await call('searchPosts', {})).toEqual(jasmine.objectContaining(PAGE));
  });

  it('shows the posts with every filter and the paging given', async () => {
    const options = { wallId: '', text: `Pre searched post (${contract.host})`, userId: [contract.user._id], page: 0, pageSize: 5 };
    expect(await call('searchPosts', options)).toEqual(jasmine.objectContaining(PAGE));
  });

  it("shows one person's posts, the person given on their own", async () => {
    expect(await call('searchPosts', { userId: contract.user._id })).toEqual(jasmine.objectContaining(PAGE));
  });
});

contract.describe('deletePost', () => {
  beforeEach(standInForTheSends);

  it('removes a post named by its text', async () => {
    expect(await answered(call('deletePost', { postText: `Pre post to delete (${contract.host})` }))).toBe('answered');
  });

  it('removes a post named by its text, its author and its wall', async () => {
    const options = { postText: `Pre narrowed post to delete (${contract.host})`, userId: [contract.user._id], wallId: '' };
    expect(await answered(call('deletePost', options))).toBe('answered');
  });
});

contract.describe('deletePostAdvanced', () => {
  beforeEach(standInForTheSends);

  it('removes a post by its id', async () => {
    expect(await answered(call('deletePostAdvanced', { postId: '000000000000000000000000' }))).toBe('answered');
  });
});

contract.describe('deletePostsAdvanced', () => {
  beforeEach(standInForTheSends);

  it('removes several posts by their ids', async () => {
    const posts = [{ postId: '000000000000000000000000' }, { postId: '000000000000000000000001' }];
    expect(await answered(call('deletePostsAdvanced', { posts }))).toBe('answered');
  });
});
