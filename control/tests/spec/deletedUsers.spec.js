jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
const recordsCount = 101;

describe('Deleted Users Tests', () => {

    it('Add 101 posts and comments', (done) => {
        let posts = createPosts(recordsCount);
        buildfire.publicData.bulkInsert(posts, "posts", (error, result) => {
            expect(error).toEqual(null);
            expect(result.data.length).toBe(recordsCount);
            done();
        });
    });

    it('Soft delete posts', (done) => {
        softDeletePosts(sampleUser.id).then((result) => {
            expect(result).not.toEqual(null);
            expect(result.nModified).toBe(recordsCount);
            done();
        });
    });

    it('Search for posts', (done) => {
        buildfire.publicData.search({
            filter: {
                '$json.createdBy': sampleUser.id
            }
        }, 'posts', (error, posts) => {
            expect(error).toEqual(null);
            expect(posts.length).toBe(0);
            done();
        });
    });

    it('Delete comments', (done) => {
        softDeleteComments(sampleUser2.id).then((result) => {
            expect(result).not.toEqual(null);
            expect(result.length).toBe(recordsCount);
            done();
        });
    });

    it('Search for comments', (done) => {
        buildfire.publicData.search({
            filter: {
                '$json.comments.userId': sampleUser.id
            }
        }, 'posts', (error, posts) => {
            expect(error).toEqual(null);
            expect(posts.length).toBe(0);
            done();
        });
    });

    it('Add 101 memberships', (done) => {
        let memberships = createMemberships(recordsCount);
        buildfire.publicData.bulkInsert(memberships, "subscribedUsersData", (error, result) => {
            expect(error).toEqual(null);
            expect(result.data.length).toBe(recordsCount);
            done();
        });
    });

    it('Delete memberships', (done) => {
        deleteMemberships(sampleUser.id).then((result) => {
            expect(result).not.toEqual(null);
            expect(result.length).toBeGreaterThan(100);
            done();
        });
    });

    it('Search for memberships', (done) => {
        buildfire.publicData.search({
            filter: {
                '$json.userId': sampleUser.id
            }
        }, 'subscribedUsersData', (error, memberships) => {
            expect(error).toEqual(null);
            expect(memberships.length).toBe(0);
            done();
        });
    });

});