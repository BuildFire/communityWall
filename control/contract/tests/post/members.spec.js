// members: the people who follow a wall, found from both sides. Only app users join walls, as themselves, which the
// contract never does: so these specs find none of their own.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const reason = (error) => String((error && error.message) || error);
// The reason a call was refused; fails the spec when the call succeeds.
const refusal = (promise) => promise.then(() => fail('expected the call to be refused'), reason);
// One word, found as a name: no member has it.
const uniqueName = () => `PostMember${contract.host}${Date.now()}`;

contract.describe('searchMembers', () => {
  it('answers with the members found, their total, the page and whether more follow', async () => {
    expect(await call('searchMembers', { name: uniqueName() })).toEqual(jasmine.objectContaining({
      members: [], total: 0, page: 0, hasMore: false,
    }));
  });

  it('takes a wall, a name and a page at once', async () => {
    const result = await call('searchMembers', { wallId: `PostWall${Date.now()}`, name: uniqueName(), page: 2, pageSize: 10 });
    expect(result).toEqual(jasmine.objectContaining({ members: [], total: 0, page: 2, hasMore: false }));
  });

  it("answers the main wall's members when no wall is given", async () => {
    const result = await call('searchMembers', {});
    expect(result).toEqual(jasmine.objectContaining({ members: jasmine.any(Array), total: jasmine.any(Number), page: 0, hasMore: jasmine.any(Boolean) }));
    expect(result.members.length).toBeLessThanOrEqual(50);
  });

  describe('refuses', () => {
    it('more than 50 members a page', async () => {
      expect(await refusal(call('searchMembers', { pageSize: 51 }))).toContain('pageSize');
    });

    it('a page before the first', async () => {
      expect(await refusal(call('searchMembers', { page: -1 }))).toContain('page');
    });

    it('a name that is not text', async () => {
      expect(await refusal(call('searchMembers', { name: 42 }))).toContain('name');
    });

    it('a wall that is not text', async () => {
      expect(await refusal(call('searchMembers', { wallId: 42 }))).toContain('wallId');
    });
  });
});
