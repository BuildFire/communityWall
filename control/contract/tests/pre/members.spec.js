// members: the people who follow a wall, found from both sides.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));

contract.describe('searchMembers', () => {
  it("lists the main wall's members", async () => {
    expect(await call('searchMembers', {})).toEqual(jasmine.objectContaining({ members: jasmine.any(Array) }));
  });

  it("lists a wall's members by name and page", async () => {
    const parameters = { wallId: 'PreWall', name: `PreMember${contract.host}`, page: 0, pageSize: 50 };
    expect(await call('searchMembers', parameters)).toEqual(jasmine.objectContaining({ members: jasmine.any(Array) }));
  });
});
