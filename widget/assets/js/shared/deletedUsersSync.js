class UsersDeletionState {
    constructor(data = {}) {
        this.isActive = typeof data.isActive === "boolean" ? data.isActive : true;
        this.createdOn = data.createdOn || new Date();
        this.createdBy = data.createdBy || null;
        this.lastUpdatedOn = data.lastUpdatedOn || null;
        this.lastUpdatedBy = data.lastUpdatedBy || null;
        this.deletedOn = data.deletedOn || null;
        this.deletedBy = data.deletedBy || null;

        this.deletedUsersLastSync = data.deletedUsersLastSync || null;
    }
}

class UsersDeletionStateAccess {
    static get TAG() { return "deletedUsersLastSync"; }

    static get() {
        return new Promise((resolve, reject) => {
            buildfire.publicData.get(UsersDeletionStateAccess.TAG, (err, result) => {
                if (err) return reject(err);
                if (result.data && Object.keys(result.data).length) resolve(new UsersDeletionState(result.data));
                else resolve(new UsersDeletionState());
            });
        });
    }

    static save(userId, data) {
        if (!data.createdBy) {
            data.createdBy = userId;
            data.createdOn = new Date();
        } else if (data.lastUpdatedBy && data.lastUpdatedOn) {
            data.lastUpdatedBy = userId;
            data.lastUpdatedOn = new Date();
        }
        return new Promise((resolve, reject) => {
            buildfire.publicData.save(data, UsersDeletionStateAccess.TAG, (err, result) => {
                if (err) return reject(err);
                if (result) resolve(new UsersDeletionState(result.data));
            });
        });
    }
}

const splitArrayIntoChunks = (array) => {
    let chunkSize = 10, chunks = [];

    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }

    return chunks;
}

const deleteMemberships = (userId) => {
    return new Promise((resolve, reject) => {
        let searchOptions = {
            filter: {
                "$json.userId": userId
            },
            limit: 50,
            skip: 0
        }, records = [];

        const deleteMemberships = (memberships, callback) => {
            Promise.all(
                memberships.map(membership => {
                    return new Promise((resolve, reject) => {
                        buildfire.publicData.delete(membership.id, 'subscribedUsersData', (err, deleted) => {
                            if (err) return reject(err);
                            if (deleted && deleted.status == 'deleted') resolve();
                            else reject();
                        })
                    });
                })).then(() => {
                    callback();
                }).catch((err) => console.error(err));
        }

        const processMemberships = (memberships, index) => {
            let splittedMemberships = splitArrayIntoChunks(memberships);

            const iterateMemberships = (membershipsChunk, index) => {
                if (index < membershipsChunk.length) {
                    deleteMemberships(membershipsChunk[index], () => {
                        iterateMemberships(splittedMemberships, index + 1);
                    });
                } else {
                    resolve(memberships);
                }
            }
            iterateMemberships(splittedMemberships, 0);
        }

        const getAllMemberships = () => {
            buildfire.publicData.search(searchOptions, 'subscribedUsersData', (err, result) => {
                if (err) console.error(err);

                if (result.length < searchOptions.limit) {
                    records = records.concat(result);
                    processMemberships(records, 0);
                } else {
                    searchOptions.skip = searchOptions.skip + searchOptions.limit;
                    records = records.concat(result);
                    return getAllMemberships();
                }
            });
        }
        getAllMemberships();
    });
}

const softDeleteComments = (userId) => {
    return new Promise((resolve, reject) => {
        let searchOptions = {
            filter: {
                "$json.comments.userId": userId
            },
            limit: 50,
            skip: 0
        }, records = [];

        const deleteComments = (posts, callback) => {
            posts.forEach(post => {
                post.data.comments.forEach(comment => {
                    if (comment.userId == userId) {
                        comment.comment = "MESSAGE DELETED";
                        comment.deletedOn = new Date();
                        comment.originalUserId = userId;
                        comment.userId = null;
                        comment.userDetails = null;
                    }
                })
            });

            Promise.all(
                posts.map(post => {
                    return new Promise((resolve, reject) => {
                        buildfire.publicData.update(post.id, post.data, 'posts', (err, updated) => {
                            if (err) return reject(err);
                            if (updated && updated.id) resolve();
                            else reject();
                        })
                    });
                })).then(() => {
                    callback();
                }).catch((err) => console.error(err));

        }

        const processComments = (comments, index) => {
            let splittedComments = splitArrayIntoChunks(comments);

            const iterateComments = (commentsChunk, index) => {
                if (index < commentsChunk.length) {
                    deleteComments(commentsChunk[index], () => {
                        iterateComments(splittedComments, index + 1);
                    });
                } else {
                    resolve(comments);
                }
            }
            iterateComments(splittedComments, 0);
        }


        const getAllComments = () => {
            buildfire.publicData.search(searchOptions, 'posts', (err, result) => {
                if (err) console.error(err);

                if (result.length < searchOptions.limit) {
                    records = records.concat(result);
                    processComments(records, 0);
                } else {
                    searchOptions.skip = searchOptions.skip + searchOptions.limit;
                    records = records.concat(result);
                    return getAllComments();
                }
            });
        }
        getAllComments();
    });
}

const softDeletePosts = (userId) => {
    return new Promise((resolve, reject) => {
        buildfire.publicData.searchAndUpdate({
            "createdBy": userId
        }, {
            $set: {
                'text': "MESSAGE DELETED",
                'deletedOn': new Date(),
                'originalCreatedBy': userId,
                'createdBy': null,
                'userDetails': null
            }
        }, 'posts', (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
}

const processUser = (userId, callback) => {
    Promise.all([
        softDeletePosts(userId),
        softDeleteComments(userId),
        deleteMemberships(userId)
    ]).then((data) => {
        callback();
    });

}
const processDeletedUsers = (users, callback) => {
    const iterateUsers = (users, index, callback) => {
        if (index < users.length) {
            processUser(users[index].userId, () => {
                iterateUsers(users, index + 1, callback);
            });
        } else {
            callback()
        }
    }
    iterateUsers(users, 0, () => { 
        callback(); 
    });
}