// members: the people who follow a wall, found from both sides.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const PAGE = { members: jasmine.any(Array), total: jasmine.any(Number), page: jasmine.any(Number), hasMore: jasmine.any(Boolean) };

contract.describe('searchMembers', () => {
  it("shows the main wall's members", async () => {
    expect(await call('searchMembers', {})).toEqual(jasmine.objectContaining(PAGE));
  });

  it('shows the members with every filter and the paging given', async () => {
    const options = { wallId: '', name: `Pre member (${contract.host})`, page: 0, pageSize: 10 };
    expect(await call('searchMembers', options)).toEqual(jasmine.objectContaining(PAGE));
  });
});
