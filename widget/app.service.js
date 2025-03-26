'use strict';

(function (angular, buildfire, location) {
    angular.module('socialPluginWidget')
        .provider('Buildfire', [function () {
            var Buildfire = this;
            Buildfire.$get = function () {
                return buildfire
            };
            return Buildfire;
        }])
        .factory('Location', [function () {
            var _location = location;
            return {
                go: function (path, pushToHistory = true) {
                    _location.href = path;
                    let label = path.includes('thread') ? 'thread' : path.includes('members') ? 'members' : 'report';
                    if (pushToHistory) {
                        buildfire.history.push(label, {});
                    }
                },
                goToHome: function () {
                    _location.href = _location.href.substr(0, _location.href.indexOf('#'));
                }
            };
        }])
        .factory('Util', ['SERVER_URL', function (SERVER_URL) {
            return {
                injectAnchors(text) {
                    let decodeedText = decodeURIComponent(text);
                    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4})/g;
                    return decodeedText.replace(urlRegex, function(url) {
                        if (url.includes('@')) {
                            return `<a href="#" onclick='sendEmail("${url}"); return false;'>${url}</a>`;
                        } else {
                            let fullUrl = url
                            if (url && url.indexOf('http') !== 0 && url.indexOf('https') !== 0) {
                                fullUrl = "http://"+url;
                            }
                            return `<a href="#" onclick='buildfire.navigation.openWindow("${fullUrl}", "_system"); return false;'>${url}</a>`;
                        }
                    });
                },
                getParameterByName: function (name, url) {
                    if (!url) {
                        url = window.location.href;
                    }
                    name = name.replace(/[\[\]]/g, "\\$&");
                    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
                        results = regex.exec(url);
                    if (!results) return null;
                    if (!results[2]) return '';
                    return decodeURIComponent(results[2].replace(/\+/g, " "));
                },
                splitArrayIntoChunks: function(array) {
                    let chunkSize = 50, chunks = [];

                    for (let i = 0; i < array.length; i += chunkSize) {
                        chunks.push(array.slice(i, i + chunkSize));
                    }

                    return chunks;
                },
                isHTML: function(content) {
                    const a = document.createElement('div');
                    a.innerHTML = content;

                    for (let c = a.childNodes, i = c.length; i--; ) {
                        if (c[i].nodeType === 1) return true;
                    }

                    return false;
                },
                limitToHtmlSafely: function (htmlString, limit) {
                    // Create a temporary container for the HTML content
                    const tempDiv = document.createElement('div');
                    tempDiv.style.display = 'none'; // Hide the element
                    document.body.appendChild(tempDiv); // Append it to the body to ensure scripts are not executed

                    // Use the safer method to set HTML content
                    tempDiv.innerHTML = htmlString;

                    let currentLength = 0;
                    let shouldTruncate = false;

                    // Function to traverse and possibly truncate text nodes
                    function traverseAndTruncate(node) {
                        if (node.nodeType === Node.TEXT_NODE) {
                            if (currentLength + node.textContent.length > limit) {
                                // Calculate remaining characters and truncate
                                const remaining = limit - currentLength;
                                node.textContent = node.textContent.slice(0, remaining);
                                shouldTruncate = true;
                            } else {
                                currentLength += node.textContent.length;
                            }
                        } else if (node.nodeType === Node.ELEMENT_NODE) {
                            Array.from(node.childNodes).forEach(traverseAndTruncate);
                            if (shouldTruncate) {
                                // Once truncation starts, remove all following siblings
                                while (node.nextSibling) {
                                    node.parentNode.removeChild(node.nextSibling);
                                }
                                shouldTruncate = false; // Reset flag after truncation
                            }
                        }
                    }

                    traverseAndTruncate(tempDiv);

                    // Extract the processed HTML
                    const resultHtml = tempDiv.innerHTML;

                    // Clean up by removing the temporary element
                    document.body.removeChild(tempDiv);

                    return resultHtml;
                },
                UUID: function () {
                    // Using the window.crypto API for secure random number generation
                    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
                    );
                },
                parseDeeplinkData : function(deeplinkQueryString) {
                    let cleanedString;
                    if (typeof deeplinkQueryString === 'string') {
                        cleanedString = deeplinkQueryString.replace(/^&dld=/, '');
                    } else {
                        return deeplinkQueryString;
                    }
                    try {
                        const decodedString = decodeURIComponent(cleanedString);
                        return JSON.parse(decodedString);
                    } catch (error) {
                        console.error('Error decoding deepLinkData:', error);
                        return null;
                    }
                },
                evaluateExpression(expression) {
                    return new Promise((resolve, reject) => {
                        buildfire.dynamic.expressions.evaluate({expression}, (err, result) => {
                            if (err) return reject(err);
                            resolve(result.evaluatedExpression);
                        });
                    })
                },
                setExpression(expression) {
                    buildfire.dynamic.expressions.getContext = (options, callback) => {
                        const context = {
                          plugin: expression
                        }
                        callback(null, context)
                    }
                },
                resizeImage(imageUrl, options) {
                    const calculateWidth = () => {
                        const windowWidth = window.innerWidth;
                        const windowHeight = window.innerHeight;
                        return { width: windowWidth, height: Math.floor(windowHeight / 3) };
                    }
                    if (!options) {
                        options = calculateWidth();
                    }
                    return buildfire.imageLib.resizeImage(
                        imageUrl, options
                    );
                },
            }
        }])
        .factory("SubscribedUsersData", function () {

            function continueToCheckCurrent(callback) {
                window.buildfire.auth.getCurrentUser((err, currentUser) => {
                    if (err) {
                        callback(err, false)
                    }
                    if (currentUser) {
                        window.buildfire.publicData.search({
                            filter: {
                                $and: [{
                                    "_buildfire.index.array1.string1": `${currentUser.userId}-`
                                }, {
                                    "_buildfire.index.string1": ""
                                }]
                            }
                        }, 'subscribedUsersData', function (err, data) {
                            if (err) callback(err, false);
                            else if (data && data.length > 0) {
                                if (data[0].data.userDetails.hasAllowChat) {
                                    callback(null, true);
                                } else {
                                    callback(err, false)
                                }
                            } else {
                                callback(err, false)
                            }
                        })
                    } else {
                        callback(err, false)
                    }
                });
            }

            return {
                indexingUpdateDone: false,
                save: function (params, callback) {
                    var _this = this;
                    if (params.userDetails.userTags) {
                        delete params.userDetails.userTags
                        delete params.userDetails.userToken
                    }
                    window.buildfire.publicData.insert(_this.getDataWithIndex({
                        data: params
                    }).data, 'subscribedUsersData', function (err, data) {
                        if (err) callback(err);
                        else {
                            callback();
                        }
                    });
                },
                unfollowWall: function (userId, wallId, callback) {
                    var _this = this;
                    window.buildfire.publicData.search({
                            filter: this.getIndexedFilter(userId, wallId)
                        },
                        'subscribedUsersData',
                        function (err, data) {
                            if (err) return console.error(err)
                            if (data && data.length > 1) {
                                let count = 0;
                                let allPosts = [];
                                let update = function () {
                                    data[0].data.posts = allPosts;
                                    data[0].data.leftWall = true;
                                    buildfire.publicData.save(_this.getDataWithIndex(data[0]).data, 'subscribedUsersData', (err, result) => {
                                        callback(null, true);
                                    });
                                }
                                data.map(item => {
                                    allPosts = allPosts.concat(item.data.posts);
                                    buildfire.publicData.delete(item.id, 'subscribedUsersData', function (err, status) {
                                        if (err) return console.error(err)
                                        count++;
                                        if (count === data.length)
                                            update();
                                    });
                                });
                            } else {
                                data[0].data.leftWall = true;
                                buildfire.publicData.update(data[0].id, _this.getDataWithIndex(data[0]).data, 'subscribedUsersData', (err, result) => {
                                    callback(null, result);
                                });
                            }
                        })
                },
                getUsersWhoFollow: function (userId, wallId, cb) {
                    const pageSize = 50;
                    var allUsers = [];
                    let page = 0;
                    let filter = {};
                    if (this.indexingUpdateDone) {
                        filter = {
                            '_buildfire.index.string1': wallId,
                            '_buildfire.index.number1': 0
                        }
                    } else {
                        filter = {
                            '_buildfire.index.string1': wallId ? wallId : "",
                            $or: [{
                                    '$json.leftWall': {
                                        $exists: true,
                                        $eq: false
                                    }
                                },
                                {
                                    '$json.leftWall': {
                                        $exists: false
                                    }
                                }
                            ]
                        }
                    }

                    function getUsers() {
                        window.buildfire.publicData.search({
                            pageSize,
                            page,
                            recordCount: true,
                            filter: filter,
                        }, 'subscribedUsersData', function (err, data) {
                            if (err) return cb(err, null);
                            data.result.map(item => allUsers.push(item.data));
                            if (allUsers.length === data.totalRecord) {
                                allUsers = allUsers.filter((item) => {
                                    return item.userId !== userId
                                });
                                cb(null, allUsers);
                            } else {
                                page++;
                                getUsers();
                            }
                        })
                    }
                    getUsers();
                },
                searchForUsers: function (query, callback) {
                    window.buildfire.publicData.search(query, 'subscribedUsersData', function (err, data) {
                        if (err) return callback(err);
                        else {
                            var allUsers = [];
                            if (data && data.length) {
                                data.map(user => allUsers.push(user.data));
                                callback(null, allUsers);
                            } else callback(null, [])
                        }
                    })
                },
                getGroupFollowingStatus: function (userId, wallId, instanceId, cb) {
                    window.buildfire.publicData.search({
                        filter: this.getIndexedFilter(userId, wallId)
                    }, 'subscribedUsersData', function (err, data) {
                        if (err) return cb(err);
                        if (data) cb(null, data);
                        else cb(null, []);
                    });
                },
                followThread: function (params, callback) {
                    var _this = this;
                    window.buildfire.publicData.search({
                        filter: this.getIndexedFilter(params.userId, params.wallId)
                    }, 'subscribedUsersData', function (err, result) {
                        if (result && result.length) {
                            let data = result[0].data;
                            data.posts.push(params.post);
                            buildfire.publicData.update(result[0].id, _this.getDataWithIndex(result[0]).data, 'subscribedUsersData', (err, posts) => {});
                        }
                    })
                },
                unFollowThread: function (params, callback) {
                    var _this = this;
                    window.buildfire.publicData.search({
                        filter: this.getIndexedFilter(params.userId, params.wallId)
                    }, 'subscribedUsersData', function (error, result) {
                        if (error) return console.log(error)
                        if (result && result.length) {
                            let data = result[0].data;
                            data.posts = data.posts.filter(x => x !== params.post);
                            buildfire.publicData.update(result[0].id, _this.getDataWithIndex(result[0]).data, 'subscribedUsersData', (err, posts) => {});
                        }
                    });
                },
                getThreadFollowingStatus: function (userId, threadId, wallId, instanceId, cb) {
                    window.buildfire.publicData.search({
                        filter: this.getIndexedFilter(userId, wallId)
                    }, 'subscribedUsersData', function (error, result) {
                        if (error) return console.log(error)
                        if (result && result.length) {
                            let data = result[0].data;
                            let exists = data.posts.find(x => x === threadId);
                            if (exists) cb(null, data);
                            else cb(null, null);
                        } else {
                            cb(null, null);
                        }
                    });
                },
                getIndexedFilter: function (userId, wallId) {
                    let filter = {
                        '_buildfire.index.text': userId + '-' + wallId
                    };

                    if (this.indexingUpdateDone)
                        filter = {
                            '_buildfire.index.array1.string1': userId + '-' + wallId
                        };
                    return filter;
                },
                getDataWithIndex: function (item) {
                    item.data._buildfire = {
                        index: this.buildIndex(item.data)
                    }
                    return item;
                },
                buildIndex: function (data) {
                    var index = {
                        'string1': data.wallId,
                        'text': data.userId + '-' + data.wallId,
                        'number1': data.leftWall ? 1 : 0,
                        array1: [{
                            string1: data.userId + '-' + data.wallId
                        }]
                    }
                    if (Array.isArray(data.blockedUsers)) {
                        data.blockedUsers.forEach(function (blockedUser) {
                            index.array1.push({
                                string1: `blockedUser_${blockedUser}`
                            });
                        });
                    }
                    return index;
                },
                checkIfCanChat: function (toUser, callback) {
                    window.buildfire.publicData.search({
                        filter: {
                            $and: [{
                                "_buildfire.index.array1.string1": `${toUser}-`
                            }, {
                                "_buildfire.index.string1": ""
                            }]
                        }
                    }, 'subscribedUsersData', function (err, data) {
                        if (err) callback(err, false);
                        else if (data && data.length > 0) {
                            if (data[0].data.userDetails.hasAllowChat) {
                                callback(null, true);
                            } else {
                                continueToCheckCurrent((err, response) => {
                                    if (err) callback(null, false);
                                    if (response) {
                                        callback(null, true);
                                    } else {
                                        callback(null, false);
                                    }
                                })
                            }
                        } else {
                            continueToCheckCurrent((err, response) => {
                                if (err) callback(null, false);
                                if (response) {
                                    callback(null, true);
                                } else {
                                    callback(null, false);
                                }
                            })
                        }
                    })
                },
                blockUser: function (userId, callback) {
                    let _this = this;
                    buildfire.auth.getCurrentUser((err, currentUser) => {
                        if (err) {
                            callback(err, false)
                        }
                        if (currentUser) {
                            buildfire.publicData.search({
                                filter: {
                                    $and: [{
                                        "_buildfire.index.array1.string1": `${currentUser.userId}-`
                                    }, {
                                        "_buildfire.index.string1": ""
                                    }]
                                }
                            }, 'subscribedUsersData', function (err, data) {
                                if (err) callback(err, false);
                                else if (data && data.length > 0) {

                                    if(!data[0].data.blockedUsers) {
                                        data[0].data.blockedUsers = [];
                                    }

                                    if (!data[0].data.blockedUsers.includes(userId)) {
                                        data[0].data.blockedUsers.push(userId);
                                    }
                                    buildfire.publicData.update(data[0].id, _this.getDataWithIndex(data[0]).data, 'subscribedUsersData', (err, result) => {
                                        callback(null, result);
                                    });
                                } else {
                                    const userDataObject = {
                                        userId: currentUser.userId,
                                        userDetails: {
                                            displayName: currentUser.displayName,
                                            firstName: currentUser.firstName,
                                            lastName: currentUser.lastName,
                                            imageUrl: currentUser.imageUrl,
                                            email: currentUser.email,
                                            lastUpdated: new Date().getTime(),
                                        },
                                        wallId: "",
                                        leftWall: true,
                                        blockedUsers : [userId],
                                        posts: [],
                                        _buildfire: {
                                            index: {
                                                'text': currentUser.userId + '-',
                                                'number1': 1,
                                                array1: [
                                                    {
                                                        string1: currentUser.userId + '-'
                                                    },
                                                    {
                                                        string1: `blockedUser_${userId}`
                                                    }
                                                ]
                                            }
                                        }
                                    };
                                    buildfire.publicData.save(_this.getDataWithIndex({data: userDataObject}).data, 'subscribedUsersData', (err, result) => {
                                        if(err) callback(err, false);
                                        else callback(null, result);
                                    });
                                }
                            })
                        } else {
                            callback(err, false)
                        }
                    });
                },
                getBlockedUsers: function(callback) {
                    let _this = this;
                    buildfire.auth.getCurrentUser((err, currentUser) => {
                        if (err) {
                            callback(err, false)
                        }
                        if (currentUser) {
                            buildfire.publicData.search({
                                filter: {
                                    $and: [{
                                        "_buildfire.index.array1.string1": `${currentUser.userId}-`
                                    }, {
                                        "_buildfire.index.string1": ""
                                    }]
                                }
                            }, 'subscribedUsersData', function (err, data) {
                                if (err) callback(err, false);
                                else if (data && data.length > 0) {

                                    if (data[0].data.blockedUsers) {
                                        callback(null, data[0].data.blockedUsers);
                                    } else {
                                        callback(null, []);
                                    }
                                } else {
                                    callback(err, []);
                                }
                            })
                        } else {
                            callback(err, false)
                        }
                    });
                }
            }
        })
        .factory("SocialDataStore", ['$q', function ($q) {
            return {
                updatePost: function (postData) {
                    var deferred = $q.defer();
                    buildfire.publicData.update(postData.id, postData, 'posts', (error, updatedPost) => {
                        if (error) return deferred.reject(error);
                        return deferred.resolve(updatedPost);
                    });
                    return deferred.promise;
                },
                createPost: function (postData) {
                    var deferred = $q.defer();
                    postData.userToken = postData.userDetails.userToken;
                    postData.userId = postData.userDetails.userId;
                    postData.likes = [];
                    postData.comments = [];
                    postData.createdOn = new Date();
                    postData.createdBy = postData.userDetails.userId;
                    postData._buildfire = {
                        index: {
                            string1: postData.wid,
                            date1: new Date().getTime(),
                            array1: [{string1: `createdBy_${postData.userDetails.userId}`}]
                        }
                    }
                    buildfire.publicData.insert(postData, 'posts', (error, result) => {
                        if (error) return deferred.reject(error);
                        if (result && result.id && result.data) {
                            result.data.id = result.id;
                            result.data.uniqueLink = result.id + "-" + result.data.wid;
                            buildfire.publicData.update(result.id, result.data, 'posts', (err, posts) => {
                                if (error) return deferred.reject(error);
                                return deferred.resolve(posts);
                            });
                        }
                    });
                    return deferred.promise;
                },
                addComment: function (data) {
                    var deferred = $q.defer();
                    if (data.userDetails.userTags) {
                        delete data.userDetails.userTags
                        delete data.userDetails.userToken
                    }
                    buildfire.publicData.getById(data.threadId, 'posts', function (err, post) {
                        if (err) return deferred.reject(err);
                        post.data.comments.push(data);
                        buildfire.publicData.update(post.id, post.data, 'posts', function (err, status) {
                            if (err) return deferred.reject(err);
                            else{
                                Analytics.trackAction("post-commented");
                                return deferred.resolve(status)
                            };
                        });
                    });
                    return deferred.promise;
                },
                getCommentsOfAPost: function (data) {
                    var deferred = $q.defer();
                    buildfire.publicData.getById(data.threadId, 'posts', function (error, result) {
                        if (error) return deferred.reject(error);
                        if (result) return deferred.resolve(result.data.comments);
                    });
                    return deferred.promise;
                },
                deletePost: function (postId) {
                    var deferred = $q.defer();
                    buildfire.publicData.delete(postId, 'posts', function (error, result) {
                        if (error) return deferred.reject(error);
                        if (result) {
                            Analytics.trackAction("post-deleted");
                            return deferred.resolve(result)
                        };
                    })
                    return deferred.promise;
                },
                deleteComment: function (threadId, comment) {
                    var deferred = $q.defer();
                    buildfire.publicData.getById(threadId, 'posts', function (error, result) {
                        if (error) return deferred.reject(error);
                        if (result) {
                            let commentToDelete = result.data.comments.find((element) => {
                                if(comment.commentId) return element.commentId === comment.commentId;
                                else return element.comment === comment.comment;
                            })
                            let index = result.data.comments.indexOf(commentToDelete);
                            result.data.comments.splice(index, 1);
                            buildfire.publicData.update(result.id, result.data, 'posts', function (error, result) {
                                return deferred.resolve(result.data.comments);
                            })
                        }
                    });
                    return deferred.promise;
                },
                getPost: function (postId) {
                    var deferred = $q.defer();
                    buildfire.publicData.getById(postId, 'posts', function (error, result) {
                        if (error) return deferred.reject(error);
                        if (result) return deferred.resolve(result.data);
                    });
                    return deferred.promise;
                },
                addFeedPost : (post , callback) =>{
                    const buildIndex = data => {
                        const index = {
                            array1 : [
                                {string1 : 'userId_' + data.userId},
                                {string1 : 'displayName_' + data.displayName.toLowerCase()},
                                {string1 : 'pluginId_' + data.pluginInstanceId.toLowerCase()},
                                {string1 : 'pluginTitle_' + data.pluginTitle.toLowerCase()},
                                {string1 : 'isPublic_'+ data.isPublic}
                            ]
                        }
                        return index;
                    }

                    const createPost = (post, user, isPublic = false) =>{
                        let displayName = "Someone";
                        if(isPublic){
                            displayName = post.postTitle || buildfire.getContext().title ||buildfire.getContext().pluginId || "Someone";
                        }
                        else{
                            if(user.displayName) displayName = user.displayName;
                            else if(!user.displayName && user.firstName && user.lastName) displayName = user.firstName + " " + user.lastName;
                            else if(!user.displayName && !user.lastName && user.firstName) displayName = user.firstName;
                            else if(!user.displayName && user.lastName && !user.firstName) displayName = user.lastName;
                            else if(!user.displayName && !user.firstName) displayName = "Someone";
                            else displayName = "Someone";
                        }
                        return new Post({
                            userId: !isPublic ? user._id : "publicPost",
                            createdBy:!isPublic ? (user.displayName || "Someone") : "publicPost",
                            displayName: displayName,
                            postText: post.postText || "",
                            postImages: post.postImages || [],
                            isPublic,
                            pluginInstance : {
                                pluginInstanceId: (post && post.pluginInstance && post.pluginInstance.pluginInstanceId)
                                ? post.pluginInstance.pluginInstanceId
                                : buildfire.getContext().instanceId,
                                pluginInstanceTitle: (post && post.pluginInstance && post.pluginInstance.pluginInstanceTitle)
                                                        ? post.pluginInstance.pluginInstanceTitle
                                                        : (buildfire.getContext().title || buildfire.getContext().pluginId)
                            },
                            _buildfire:{index : buildIndex({
                                displayName : !isPublic ? (user.displayName || user.username) : (post.postTitle || buildfire.getContext().title ||buildfire.getContext().pluginId) ,
                                userId: !isPublic ? (user && user._id ? user._id : undefined) : "publicPost",
                                pluginTitle : buildfire.getContext().title || buildfire.getContext().pluginId,
                                isPublic : isPublic ? 1 : 0,
                                pluginInstanceId: buildfire.getContext().instanceId
                            })}
                        })
                    }

                    if ((!post.postText && !post.postImages) ||
                        (post && post.postImages && !Array.isArray(post.postImages)) ||
                        (post && post.postImages && Array.isArray(post.postImages) && post.postImages.length === 0 && !post.postText)) {
                        return callback({
                            code: errorsList.ERROR_400,
                            message: "Must have at least post text or post images, post images must be an array of at least one image URL"
                        });
                    }

                    buildfire.auth.getCurrentUser((err, currentUser) =>{
                        if(err || !currentUser) return callback({code: errorsList.ERROR_401,message:"Must be logged in"});
                        else if(!(post.postText || (post.postImages && post.postImages.length > 0))) return callback({code:errorsList.ERROR_400,message:"Must have atleast post text or post images, post images must be an array of atleast one image url"});
                        post = createPost(post, currentUser);
                        buildfire.appData.insert(post, "posts", (err, rPost) =>{
                            if(err || !rPost) return callback({code:errorsList.ERROR_404,message:"Couldn't find matching data"});
                            Analytics.trackAction("post-added");
                            callback(null, rPost);
                        })
                    });
                },
                deleteFeedPost : (filter, callback) =>{
                    buildfire.auth.getCurrentUser((err, currentUser) =>{
                        if(err || !currentUser) return callback({code: errorsList.ERROR_401,message:"Must be logged in"});
                        buildfire.appData.search({filter:{$and:[{...filter}]},sort:{createdOn: -1} }, "posts", (err, r) =>{
                            if(err || !r || r.length == 0) return callback({code:errorsList.ERROR_404,message:"Couldn't find matching data"});
                            r.forEach(p =>{
                                if(!p) return callback({code:errorsList.ERROR_404,message:"Couldn't find matching data"})
                                if(p.data.userId != currentUser._id && buildfire.getContext().type !== 'control') return callback({code: errorsList.ERROR_402, message: "You are not authorized to modify this post"});
                                buildfire.appData.delete(p.id, "posts", (err, r) =>{
                                    if(err) return console.error(err);
                                    Analytics.trackAction("post-deleted");
                                    callback(r);
                                })

                            })
                        })
                    })
                }
            }
        }])
        .factory('SocialItems', ['Util', '$rootScope', '$timeout', function (Util, $rootScope, $timeout) {
            var _this;
            var SocialItems = function () {
                _this = this;
                _this.items = [];
                _this.context = {};
                _this.appSettings = null;
                _this.userDetails = {};
                _this.newPostTimerChecker = null;
                _this.isPrivateChat = false;
                _this.forcedToLogin = false;
                _this.languages = {};
                _this.showMorePosts = false;
                _this.pageSize = 5;
                _this.page = 0;
                _this.indexingUpdateDone = false;
                _this.reportData = {};
                _this.blockedUsers = [];
                _this.cachedUserProfiles = {};
            };
            var instance;
            SocialItems.prototype.getUserName = function (userDetails) {
                let name = null;
                const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                if (userDetails && userDetails.displayName !== 'Someone' && !re.test(String(userDetails.displayName).toLowerCase()) &&
                    userDetails.displayName) {
                    name = userDetails.displayName;
                } else if (userDetails && userDetails.firstName !== 'Someone' && !re.test(String(userDetails.firstName).toLowerCase()) &&
                    userDetails.firstName && userDetails.lastName)
                    name = userDetails.firstName + ' ' + userDetails.lastName;

                else if (userDetails && userDetails.firstName !== 'Someone' && !re.test(String(userDetails.firstName).toLowerCase()) &&
                    userDetails.firstName)
                    name = userDetails.firstName;
                else if (userDetails && userDetails.lastName !== 'Someone' && !re.test(String(userDetails.lastName).toLowerCase()) &&
                    userDetails.lastName)
                    name = userDetails.lastName;
                else name = 'Someone';
                if (name.length > 25)
                    name = name.substring(0, 25) + '...';
                return name;
            }
            SocialItems.prototype.authenticateUser = function (loggedUser, callback) {
                function prepareData(user) {
                    _this.userDetails = {
                        userToken: user.userToken,
                        userId: user._id,
                        email: user.email,
                        firstName: user.firstName ? user.firstName : "",
                        lastName: user.lastName ? user.lastName : "",
                        displayName: user.displayName ? user.displayName : "",
                        imageUrl: user.imageUrl,
                        userTags: user.tags ? user.tags : {}
                    }
                    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                    if (re.test(String(user.firstName).toLowerCase()))
                        _this.userDetails.firstName = 'Someone';
                    if (re.test(String(user.displayName).toLowerCase()))
                        _this.userDetails.displayName = 'Someone';
                }
                if (loggedUser) {
                    prepareData(loggedUser);
                    return callback(null, loggedUser);
                } else buildfire.auth.getCurrentUser((err, user) => {
                    if (err) return callback(err, null);
                    if (user) {
                        prepareData(user);
                        return callback(null, user);
                    } else {
                        _this.forcedToLogin = true;
                        buildfire.auth.login(null, (err, user) => {
                            if (err) return callback(err, null);
                            if (user) {
                                prepareData(user);
                                callback(null, user);
                            } else if (!user) callback(null, null);
                        });
                    }
                });
            }


            SocialItems.prototype.authenticateUserWOLogin = function (loggedUser, callback) {
                function prepareData(user) {
                    _this.userDetails = {
                        userToken: user.userToken,
                        userId: user._id,
                        email: user.email,
                        firstName: user.firstName ? user.firstName : "",
                        lastName: user.lastName ? user.lastName : "",
                        displayName: user.displayName ? user.displayName : "",
                        imageUrl: user.imageUrl,
                        userTags: user.tags ? user.tags : {}
                    }
                    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                    if (re.test(String(user.firstName).toLowerCase()))
                        _this.userDetails.firstName = 'Someone';
                    if (re.test(String(user.displayName).toLowerCase()))
                        _this.userDetails.displayName = 'Someone';
                }
                if (loggedUser) {
                    prepareData(loggedUser);
                    return callback(null, loggedUser);
                } else buildfire.auth.getCurrentUser((err, user) => {
                    if (err) return callback(err, null);
                    if (user) {
                        prepareData(user);
                        return callback(null, user);
                    } else {
                        callback(null, null);
                    }
                });
            }

            SocialItems.prototype.getUserProfiles = function (wallId) {
                if (wallId.length === 49 && wallId.length.indexOf('|') === 24) {
                    wallId = wallId.replace("|", "");
                }
                let usersId = [wallId.slice(0, 24), wallId.slice(24, 48)];
                usersId.forEach(userId => {
                    if (this.cachedUserProfiles[userId]) {
                        usersId = usersId.filter(id => id !== userId);
                    }
                })
                return new Promise((resolve, reject) => {
                    if (usersId.length === 0) {
                        resolve([this.cachedUserProfiles[wallId.slice(0, 24)], this.cachedUserProfiles[wallId.slice(24, 48)]]);
                        return;
                    }
                    buildfire.auth.getUserProfiles({ userIds: usersId }, (err, users) => {
                        if (err) return reject(err);
                        users.forEach(user => {
                            this.cachedUserProfiles[user.userId] = user;
                        })
                        resolve(users);
                    });
                });
            }

            // this function is used to validate the wallId for private chat that received from deeplinks
            SocialItems.prototype.getOneToOneWallId = function (wallId) {
                return new Promise(async (resolve) => {
                    if (wallId.length !== 48) return resolve(wallId);
                    const users = await this.getUserProfiles(wallId);

                    if (users && users.length === 2) {
                        let validWid = '';
                        if (users[0].userId > users[1].userId) {
                            validWid = `${users[0].userId}${users[1].userId}`;
                        } else {
                            validWid = `${users[1].userId}${users[0].userId}`;
                        }
                        return resolve(validWid);
                    } else {
                        return resolve(wallId);
                    }
                });
            }

            SocialItems.prototype.setPrivateChatTitle = async function (wallId) {
                const haveWallTitle = !!(new URLSearchParams(window.location.search).get('wTitle'));
                if (haveWallTitle) return;
                const users = await this.getUserProfiles(wallId);
                this.pluginTitle = (users[0] ? SocialItems.prototype.getUserName(users[0]) : 'Someone') +
                        ' | ' + (users[1] ? SocialItems.prototype.getUserName(users[1]) : 'Someone');
            }

            SocialItems.prototype.getPosts = function (callback) {
                let pageSize = _this.pageSize,
                    page = _this.page;
                let searchOptions = {
                    pageSize,
                    page,
                    filter: getFilter(),
                    sort: {
                        "_buildfire.index.date1": -1
                    },
                    recordCount: true
                }

                buildfire.publicData.search(searchOptions, 'posts', (error, data) => {
                    if (error) return console.log(error);

                    if (data && data.result.length) {
                        const result = data.result.filter(newItem => !_this.items.some(existItem => existItem.id === newItem.id));
                        const newItems = result.map(item => {
                            return {...item.data, id: item.id};
                        });
                        _this.items = _this.items.concat(newItems);
                        if (data.totalRecord > _this.items.length) {
                            _this.showMorePosts = true;
                            _this.page++;
                        } else _this.showMorePosts = false;
                        if (_this.isPrivateChat) {
                            this.getUserProfiles(_this.wid).then((users) => {
                                _this.items.forEach(item => {
                                    const privateChatUser = this.cachedUserProfiles[item.userId];
                                    if (privateChatUser) {
                                        item.userDetails = {
                                            displayName: privateChatUser.displayName,
                                            firstName: privateChatUser.firstName,
                                            lastName: privateChatUser.lastName,
                                            email: privateChatUser.email,
                                            lastUpdated: privateChatUser.lastUpdated,
                                            imageUrl: privateChatUser.imageUrl,
                                        };
                                    }
                                });
                                window.buildfire.messaging.sendMessageToControl({
                                    name: 'SEND_POSTS_TO_CP',
                                    posts: _this.items,
                                });
                                if (page === 0) startBackgroundService();
                                else clearInterval(_this.newPostTimerChecker);
                                $rootScope.$digest();
                                callback(null, data);
                            })

                        }
                        else {
                            window.buildfire.messaging.sendMessageToControl({
                                name: 'SEND_POSTS_TO_CP',
                                posts: _this.items,
                            });
                            if (page === 0) startBackgroundService();
                            else clearInterval(_this.newPostTimerChecker);
                            $rootScope.$digest();
                            callback(null, data);
                        }

                    } else {
                        _this.showMorePosts = false;
                        $rootScope.$digest();
                        callback(null, _this.items = [])
                        //Checking if user comming from notification for thread comment.
                        startBackgroundService();
                        if (window.URLSearchParams && window.location.search) {
                            var queryParamsInstance = new URLSearchParams(window.location.search);
                            var postId = queryParamsInstance.get('threadPostUniqueLink');
                            if (postId) location.href = '#/thread/' + postId;
                        }
                    }
                });
            }

            SocialItems.prototype.getPostById = function (id, callback) {
                buildfire.publicData.getById(id, "posts", callback);
            }

            function getSort() {
                if (_this.indexingUpdateDone)
                    return {
                        "_buildfire.index.date1": -1
                    };
                else return {
                    "createdOn": -1
                };
            }

            function getFilter() {
                let filter = {};

                const blockedUserStrings = _this.blockedUsers.map(userId => `createdBy_${userId}`);

                if (_this.wid === "") {
                    filter = {
                        $and: [
                            {
                                '_buildfire.index.string1': {
                                    $eq: ''
                                }
                            },
                            {
                                '_buildfire.index.array1.string1': {
                                    $nin: blockedUserStrings
                                }
                            }
                        ]
                    };
                } else {
                    filter = {
                        $and: [
                            {
                                "_buildfire.index.string1": {
                                    "$regex": _this.wid,
                                    "$options": "i"
                                }
                            },
                            {
                                '_buildfire.index.array1.string1': {
                                    $nin: blockedUserStrings
                                }
                            }
                        ]
                    };
                }

                return filter;
            }

            SocialItems.prototype.setupImageList = function(listId, item) {
                if (item.imageUrl) {
                    $timeout(() => {
                        let imageList = document.getElementById(listId);
                        if (!imageList) return;
                        if (Array.isArray(item.imageUrl)) {
                            imageList.images = item.imageUrl;
                        } else {
                            imageList.images = [item.imageUrl];
                        }
                        imageList.addEventListener('imageSelected', (e) => {
                            let selectedImage = e.detail.filter(image => image.selected);
                            if (selectedImage && selectedImage[0] && selectedImage[0].name)
                                selectedImage[0].name = selectedImage[0].name;
                            buildfire.imagePreviewer.show({
                                images: selectedImage
                            });
                        });
                    });
                }
            };

            function startBackgroundService() {
                if (!_this.newPostTimerChecker) {
                    _this.newPostTimerChecker = setInterval(function () {
                        if (_this.items.length > _this.pageSize) {
                            return clearInterval(_this.newPostTimerChecker);
                        }
                        let searchOptions = {
                            filter: getFilter(),
                            sort: {
                                "_buildfire.index.date1": -1
                            },
                            pageSize: _this.pageSize,
                            page: 0,
                            recordCount: true
                        }

                        buildfire.publicData.search(searchOptions, 'posts', (error, results) => {
                            if (error) return console.log(error);

                            const data = results.result;
                            if (results.totalRecord > _this.pageSize) {
                                _this.showMorePosts = true;
                            } else _this.showMorePosts = false;

                            if (data && data.length) {
                                let items = data.map(item => {
                                    const existItem = _this.items.find(_item => _item.id === item.id) || {};
                                    let newItem = {...existItem, ...item.data, id: item.id};
                                    if (_this.isPrivateChat) {
                                        const privateChatUser = _this.cachedUserProfiles[newItem.userId];
                                        if (privateChatUser) {
                                            newItem.userDetails = {
                                                displayName: privateChatUser.displayName,
                                                firstName: privateChatUser.firstName,
                                                lastName: privateChatUser.lastName,
                                                email: privateChatUser.email,
                                                lastUpdated: privateChatUser.lastUpdated,
                                                imageUrl: privateChatUser.imageUrl,
                                            };
                                        }
                                    }
                                    return newItem;
                                });

                                // Check if the new data is different from the current data
                                if (JSON.stringify(items) !== JSON.stringify(_this.items)) {
                                    _this.items = items;
                                    window.buildfire.messaging.sendMessageToControl({
                                        name: 'SEND_POSTS_TO_CP',
                                        posts: _this.items,
                                    });
                                    $rootScope.$digest();
                                } else {
                                    return '';
                                }
                            } else {
                                return '';
                            }
                        });}, 10000);
                }
            }

            SocialItems.prototype.formatLanguages = function (response) {
                const stringsCopy = JSON.parse(JSON.stringify(stringsConfig));
                _this.languages = {};
                if (response.data && response.data.screenOne) {
                    Object.keys(response.data.screenOne).forEach((oldKey) => {
                        Object.keys(stringsConfig).forEach((defaultKey) => {
                            Object.keys(stringsCopy[defaultKey].labels).forEach((newKey) => {
                                if (stringsCopy[defaultKey].labels[newKey].defaultValue === response.data.screenOne[oldKey].defaultValue && response.data.screenOne[oldKey].value)
                                    stringsCopy[defaultKey].labels[newKey].value = response.data.screenOne[oldKey].value
                            });
                        });
                    });
                    Object.keys(stringsConfig).forEach((defaultKey) => {
                        delete stringsCopy[defaultKey].title;
                        delete stringsCopy[defaultKey].subtitle;
                        Object.keys(stringsCopy[defaultKey].labels).forEach((newKey) => {
                            let defaultValue = stringsCopy[defaultKey].labels[newKey].defaultValue;
                            let value = stringsCopy[defaultKey].labels[newKey].value;
                            stringsCopy[defaultKey][newKey] = {
                                defaultValue
                            };
                            if (value) stringsCopy[defaultKey][newKey].value = value;
                        });
                        delete stringsCopy[defaultKey].labels;
                    });
                    let strings = {}
                    for (let key in stringsConfig) {
                        strings = Object.assign(strings, stringsCopy[key]);
                    }
                    Object.keys(strings).forEach(e => {
                        strings[e].value ? _this.languages[e] = strings[e].value : _this.languages[e] = strings[e].defaultValue;
                    });
                } else {
                    let strings = {};
                    if (response.data && response.data.mainWall && response.data.sideThread && response.data.members && response.data.input && response.data.modal) {
                        strings = Object.assign({}, response.data.mainWall, response.data.sideThread, response.data.members, response.data.input, response.data.modal);

                        const newProperties = ['pushNotifications'];
                        newProperties.forEach((key) => {
                            if (response.data[key]) {
                                strings = Object.assign(strings, response.data[key]);
                            } else {
                                strings = Object.assign(strings, stringsConfig[key].labels);
                            }
                        });
                    } else {
                        for (let key in stringsConfig) {
                            strings = Object.assign(strings, stringsCopy[key].labels);
                        }
                    }
                    Object.keys(strings).forEach(e => {
                        if (e == "specificChat" && strings[e].value == "")
                            _this.languages[e] = strings[e].value
                        else
                            strings[e].value ? _this.languages[e] = strings[e].value : _this.languages[e] = strings[e].defaultValue;
                    });
                }
                $rootScope.$digest();
            }

            SocialItems.prototype.getSettings = function (callback) {
                buildfire.getContext((error, context) => {
                    if (error) return console.error("Fetching app context failed.", err);
                    _this.context = context;

                    buildfire.history.get({
                        pluginBreadcrumbsOnly: false
                    }, async (err, history) => {
                        if (err) return console.error(err);
                        let lastInHistory = history[history.length - 1];
                        let wallId = '';
                        let userIds = '';
                        if (lastInHistory && lastInHistory.options.pluginData &&
                            lastInHistory.options.pluginData.queryString) {
                            wallId = new URLSearchParams(lastInHistory.options.pluginData.queryString).get('wid');
                            userIds = new URLSearchParams(lastInHistory.options.pluginData.queryString).get('userIds');
                            wallId = wallId ? await this.getOneToOneWallId(wallId) : '';
                            userIds = userIds ? userIds : '';
                        }

                        if (!_this.wid) {
                            _this.wid = Util.getParameterByName("wid") ?
                               await this.getOneToOneWallId(Util.getParameterByName("wid")) : wallId;
                            _this.mainWallID = _this.wid;
                        }

                        if (!this.userIds) {
                            _this.userIds = Util.getParameterByName("userIds") ?
                                Util.getParameterByName("userIds") : userIds;
                        }

                        if (_this.wid.length === 48 || _this.userIds) {
                            _this.isPrivateChat = true;
                        }

                        let headerContent = Util.getParameterByName("headerContentHtml");
                        if(headerContent) {
                            _this.headerContent = headerContent;
                        }

                        buildfire.datastore.get("languages", (err, languages) => {
                            if (err) return console.log(err)
                            _this.formatLanguages(languages);

                            buildfire.datastore.get("Social", (err, response) => {
                                callback(err, response);
                            });
                        });
                    });

                });
            };

            return {
                getInstance: function () {
                    if (!instance) instance = new SocialItems();

                    return instance;
                }
            };
        }])
})(window.angular, window.buildfire, window.location);

function sendEmail(emailAddress) {
    buildfire.actionItems.execute(
        {
            title: "",
            subject: "",
            body: "",
            email: emailAddress,
            action: "sendEmail",
            iconUrl: "",
        },
        (err) => {
            if (err) return console.error(err);
        }
    );
}
