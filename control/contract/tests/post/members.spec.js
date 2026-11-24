// members: the people who follow a wall, found from both sides.
// No operation makes a member (people join a wall themselves), so the read is checked by its shape, its filters and what it refuses.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const reason = (error) => String((error && error.message) || error);
// The reason a call was refused; fails the spec when the call succeeds.
const refusal = (promise) => promise.then(() => fail('expected the call to be refused'), reason);
const unique = (label) => `Post${label}${contract.host}${Date.now()}`;

contract.describe('searchMembers', () => {
  // Every member carries these, each left empty when the person has none.
  const memberFields = ['userId', 'displayName', 'firstName', 'lastName', 'imageUrl'];

  it("shows the main wall's members, with how many there are and whether more follow", async () => {
    const result = await call('searchMembers', {});
    expect(result).toEqual(jasmine.objectContaining({ members: jasmine.any(Array), total: jasmine.any(Number), page: 0, hasMore: jasmine.any(Boolean) }));
    expect(result.members.length).toBeLessThanOrEqual(50);
    result.members.forEach((found) => expect(Object.keys(found)).toEqual(jasmine.arrayContaining(memberFields)));
    expect(result.hasMore).toBe(result.total > result.members.length);
  });

  it('takes every filter and the paging at once', async () => {
    expect(await call('searchMembers', { wallId: '', name: unique('name'), page: 0, pageSize: 10 }))
      .toEqual(jasmine.objectContaining({ members: [], total: 0, page: 0, hasMore: false }));
  });

  it('finds no one on a wall nobody follows', async () => {
    expect(await call('searchMembers', { wallId: unique('wall') })).toEqual(jasmine.objectContaining({ members: [], total: 0, hasMore: false }));
  });

  it('gives back the page it was asked for, holding at most a page of members', async () => {
    const result = await call('searchMembers', { page: 2, pageSize: 1 });
    expect(result.page).toBe(2);
    expect(result.members.length).toBeLessThanOrEqual(1);
  });

  describe('refuses', () => {
    it('a wall id or a name that is not text', async () => {
      expect(await refusal(call('searchMembers', { wallId: 5 }))).toContain('wallId');
      expect(await refusal(call('searchMembers', { name: 5 }))).toContain('name');
    });

    it('a page below 0, or not a whole number', async () => {
      expect(await refusal(call('searchMembers', { page: -1 }))).toContain('page');
      expect(await refusal(call('searchMembers', { page: 0.5 }))).toContain('page');
    });

    it('a page size outside 1 to 50', async () => {
      expect(await refusal(call('searchMembers', { pageSize: 0 }))).toContain('pageSize');
      expect(await refusal(call('searchMembers', { pageSize: 51 }))).toContain('pageSize');
    });
  });
});
