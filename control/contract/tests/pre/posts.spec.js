// posts: the wall's posts, found from both sides and removed from the control panel. Only app users write posts, as
// themselves, which the contract never does: so a call that removes one can only name a post nothing has.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const missingId = '000000000000000000000000';
const standIn = () => {
  spyOn(buildfire.messaging, 'sendMessageToWidget');
  spyOn(buildfire.services.contract.events, 'send').and.callFake((eventName, data, callback) => callback && callback(null, []));
};

contract.describe('searchPosts', () => {
  it('lists the posts', async () => {
    expect(await call('searchPosts', {})).toEqual(jasmine.objectContaining({ posts: jasmine.any(Array) }));
  });

  it('lists the posts of a wall, by text, author and page', async () => {
    const parameters = { wallId: '', text: `Pre post (${contract.host})`, userId: contract.user._id, page: 0, pageSize: 20 };
    expect(await call('searchPosts', parameters)).toEqual(jasmine.objectContaining({ posts: jasmine.any(Array) }));
  });
});

// No post can be made through the contract, so these calls name posts nothing has: they show the operation is still
// there and still looks its post up, which is all a call written now can rely on.
contract.describe('deletePost', () => {
  beforeEach(standIn);

  it('looks a post up by its text', async () => {
    await expectAsync(call('deletePost', { postText: `Pre post to delete (${contract.host})` })).toBeRejected();
  });

  it('looks a post up by its text, author and wall', async () => {
    await expectAsync(call('deletePost', { postText: `Pre post to delete (${contract.host})`, userId: contract.user._id, wallId: '' })).toBeRejected();
  });
});

contract.describe('deletePostAdvanced', () => {
  beforeEach(standIn);

  it('looks a post up by its id', async () => {
    await expectAsync(call('deletePostAdvanced', { postId: missingId })).toBeRejected();
  });
});

contract.describe('deletePostsAdvanced', () => {
  beforeEach(standIn);

  it('looks every post up by its id', async () => {
    await expectAsync(call('deletePostsAdvanced', { posts: [{ postId: missingId }] })).toBeRejected();
  });
});
