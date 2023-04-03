const recordsCount = 101;

class DeletedUsersTest {
  static run(callback) {
    const addPosts = (callback) => {
      let posts = createPosts(recordsCount);
      buildfire.publicData.bulkInsert(posts, "posts", (err, result) => {
        if (err) return console.error("Error while inserting your data", err);
        expect('101 posts has been added', result.data.length === recordsCount);
        callback();
      });
    }

    const deletePosts = (callback) => {
      softDeletePosts(sampleUser.id).then((result) => {
        expect("Successfully soft deleted posts", result.nModified == recordsCount);
        callback();
      }).catch((err) => {
        console.error("Error while deleting posts", err);
      });
    }

    const searchPosts = (callback) => {
      buildfire.publicData.search({
        filter: {
          '$json.createdBy': sampleUser.id
        }
      }, 'posts', (err, posts) => {
        if (err) return console.error("Error while searching for posts", err);
        expect('0 posts has been found', posts.length == 0);
        callback();
      });
    }

    const deleteComments = (callback) => {
      softDeleteComments(sampleUser2.id).then((result) => {
        expect("Successfully deleted comments", result.length == recordsCount);
        callback();
      }).catch((err) => {
        console.error("Error while deleting comments", err);
      });
    }

    const searchComments = (callback) => {
      buildfire.publicData.search({
        filter: {
          '$json.comments.userId': sampleUser.id
        }
      }, 'posts', (err, posts) => {
        if (err) return console.error("Error while searching for posts", err);
        expect('0 comments has been found', posts.length == 0);
        callback();
      });
    }

    const addMemberships = (callback) => {
      let memberships = createMemberships(recordsCount);
      buildfire.publicData.bulkInsert(memberships, "subscribedUsersData", (err, result) => {
        if (err) return console.error("Error while inserting your data", err);
        expect('101 memberships has been added', result.data.length === recordsCount);
        callback();
      });
    }

    const removeMemberships = (callback) => {
      deleteMemberships(sampleUser.id).then((result) => {
        expect("Successfully deleted memberships", result.length == recordsCount);
        callback();
      }).catch((err) => {
        console.error("Error while deleting memberships", err);
      });
    }


    const searchMemberships = (callback) => {
      buildfire.publicData.search({
        filter: {
          '$json.userId': sampleUser.id
        }
      }, 'subscribedUsersData', (err, memberships) => {
        if (err) return console.error("Error while searching for memberships", err);
        expect('0 memberships has been found', memberships.length == 0);
        callback();
      });
    }

    logInfo('Adding posts');

    addPosts(() => {
      logInfo('Soft deleting posts');
      deletePosts(() => {
        logInfo('Search for posts');
        searchPosts(() => {
          logInfo('Soft deleting comments');
          deleteComments(() => {
            logInfo('Search for comments');
            searchComments(() => {
              logInfo('Adding memberships');
              addMemberships(() => {
                logInfo('Deleting memberships');
                removeMemberships(() => {
                  logInfo('Search for memberships');
                  searchMemberships(() => {
                    logInfo('All tests done');
                    callback();
                  });
                });
              });
            });
          });
        });
      });
    });
  }
}