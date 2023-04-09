class Post {
    constructor(data = {}) {
        this.createdOn = data.createdOn || new Date();
        this.createdBy = data.createdBy || null;
        this.deletedOn = data.deletedOn || null;
        this.deletedBy = data.deletedBy || null;


        this.id = data.id || null;
        this.imageUrl = data.imageUrl || null;
        this.images = data.images || null;
        this.likes = data.likes || [];
        this.text = data.text || null;
        this.uniqueLink = data.uniqueLink || null;
        this.userDetails = data.userDetails || null;
        this.userId = data.userId || null;
        this.userToken = data.userToken || null;
        this.wid = data.wid || "";
        this.comments = data.comments || [];
    }

    toJSON() {
        return {
            createdOn: this.createdOn,
            createdBy: this.createdBy,
            deletedOn: this.deletedOn,
            deletedBy: this.deletedBy,

            id: this.id,
            imageUrl: this.imageUrl,
            images: this.images,
            likes: this.likes,
            text: this.text,
            uniqueLink: this.uniqueLink,
            userDetails: this.userDetails,
            userId: this.userId,
            userToken: this.userToken,
            wid: this.wid,
            comments: this.comments,
            _buildfire: {
                index: {
                    string1: this.wid,
                    date1: this.createdOn.getTime(),
                }
            }
        }
    }
}

class Comment {
    constructor(data) {
        this.createdOn = data.createdOn || new Date();

        this.comment = data.comment || "";
        this.imageUrl = data.imageUrl || [];
        this.likes = data.likes || [];
        this.threadId = data.threadId || null;
        this.userId = data.userId || null;
        this.userToken = data.userToken || null;
        this.userDetails = data.userDetails || null;
    }
}

class SubscribedUsersData {
    constructor(data) {
        this.posts = data.posts || [];
        this.wallId = data.wallId || "";
        this.userId = data.userId || null;
        this.leftWall = data.leftWall || false;
        this.userDetails = data.userDetails || null;
    }

    toJSON() {
        return {
            posts: this.posts,
            wallId: this.wallId,
            userId: this.userId,
            userDetails: this.userDetails,
            _buildfire: {
                index: {
                    string1: this.wallId,
                    text: this.userId + '-' + this.wallId,
                    number1: this.leftWall ? 1 : 0,
                    array1: [{
                        string1: this.userId + '-' + this.wallId
                    }]
                }
            }
        }
    }
}

const sampleUser = {
    id: '6f3da360-bea8-43b9-a915-10d7d566fc60',
    displayName: 'John Doe',
    firstName: 'John',
    lastName: 'Doe',
    imageUrl: 'https://fastly.picsum.photos/id/1081/200/300.jpg?hmac=ntCnXquH7cpEF0vi5yvz1wKAlRyd2EZwZJQbgtfknu8',
    email: 'johndoe@test.com'
}

const sampleUser2 = {
    id: '896a8242-e52c-432a-9512-2f65989b3356',
    displayName: 'Will Smith',
    firstName: 'Will',
    lastName: 'Smith',
    imageUrl: 'https://fastly.picsum.photos/id/1081/200/300.jpg?hmac=ntCnXquH7cpEF0vi5yvz1wKAlRyd2EZwZJQbgtfknu8',
    email: 'willsmith@test.com'
}

const createPosts = (recordsCount) => {
    let posts = [];
    for (let index = 0; index < recordsCount; index++) {
        posts.push(new Post({
            createdOn: new Date(new Date().getTime() - (index * 15000)),
            createdBy: sampleUser.id,
            text: 'test post ' + (index + 1),
            userId: sampleUser.id,
            userDetails: sampleUser,
            wid: "",
            comments: [new Comment({
                comment: 'Test comment for post ' + (index + 1),
                userId: sampleUser2.id,
                userDetails: sampleUser2
            })]
        }).toJSON());
    }
    return posts;
}

const createMemberships = (recordsCount) => {
    let memberships = [];
    for (let index = 0; index < recordsCount; index++) {
        memberships.push(new SubscribedUsersData({
            userId: sampleUser.id,
            userDetails: sampleUser,
            wallId: uuidv4(),
        }).toJSON());
    }
    return memberships;
}

const uuidv4 = () => {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}