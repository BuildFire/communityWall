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
                go: function (path) {
                    _location.href = path;
                    let label = path.includes('thread') ? 'thread' : 'members';
                    buildfire.history.push(label, {});
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
                }

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
                banUser: function (params, callback) {

                },
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
                unfollowWall: function (userId, wallId, banUser, callback) {
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
                                    if (banUser) {
                                        data[0].data.banned = true;
                                    }
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
                                if (banUser) {
                                    data[0].data.banned = true;
                                }
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
                    postData.isUserLikeActive = false;
                    postData.likes = [];
                    postData.comments = [];
                    postData.createdOn = new Date();
                    postData.createdBy = postData.userDetails.userId;
                    postData._buildfire = {
                        index: {
                            string1: postData.wid,
                            date1: new Date().getTime()
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
                            let commentToDelete = result.data.comments.find(element => element.comment === comment.comment)
                            let index = result.data.comments.indexOf(commentToDelete);
                            result.data.comments.splice(index, 1);
                            buildfire.publicData.update(result.id, result.data, 'posts', function (error, result) {
                                return deferred.resolve(result.data.comments);
                            })
                        }
                    });
                    return deferred.promise;
                }
            }
        }])
        .factory('SocialItems', ['Util', '$rootScope', function (Util, $rootScope) {
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

            SocialItems.prototype.getPosts = function (callback) {
                let pageSize = _this.pageSize,
                    page = _this.page;
                let searchOptions = {
                    pageSize,
                    page,
                    filter: getFilter(),
                    sort: getSort(),
                    recordCount: true
                }

                buildfire.publicData.search(searchOptions, 'posts', (error, data) => {
                    if (error) return console.log(error);

                    if (data && data.result.length) {
                        const result = data.result.filter(item => !_this.items.find(_item => _item.id === item.id));
                        result.map(item => _this.items.push({...item.data, id: item.id}))
                        if (data.totalRecord > _this.items.length) {
                            _this.showMorePosts = true;
                            _this.page++;
                        } else _this.showMorePosts = false;
                        window.buildfire.messaging.sendMessageToControl({
                            name: 'SEND_POSTS_TO_CP',
                            posts: _this.items,
                        });
                        if (page === 0) startBackgroundService();
                        else clearInterval(_this.newPostTimerChecker);
                        $rootScope.$digest();
                        callback(null, data);
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
                let filter = {}
                if (_this.wid === "")
                    filter = {
                        '_buildfire.index.string1': {
                            $eq: ''
                        }
                    }
                else
                    filter = {
                        "_buildfire.index.string1": {
                            "$regex": _this.wid,
                            "$options": "i"
                        }
                    }
                return filter;
            }

            function startBackgroundService() {
                if (!_this.newPostTimerChecker) {
                    _this.newPostTimerChecker = setInterval(function () {
                        let searchOptions = {
                            filter: getFilter(),
                            sort: getSort(),
                        }

                        buildfire.publicData.search(searchOptions, 'posts', (error, data) => {
                            if (error) return console.log(error);
                            if (data && data.length) {
                                if (data[0].data.id === (_this.items.length && _this.items[0].id)) return;
                                let items = [];
                                data.map(item => items.push({...item.data, id: item.id}));
                                _this.items = items;
                                window.buildfire.messaging.sendMessageToControl({
                                    name: 'SEND_POSTS_TO_CP',
                                    posts: _this.items,
                                });
                            }
                            $rootScope.$digest();
                        });
                    }, 10000);
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
                    strings = Object.assign({}, stringsCopy.mainWall, stringsCopy.sideThread, stringsCopy.members, stringsCopy.input, stringsCopy.modal);
                    Object.keys(strings).forEach(e => {
                        strings[e].value ? _this.languages[e] = strings[e].value : _this.languages[e] = strings[e].defaultValue;
                    });
                } else {
                    let strings = {};
                    if (response.data && response.data.mainWall && response.data.sideThread && response.data.members && response.data.input && response.data.modal)
                        strings = Object.assign({}, response.data.mainWall, response.data.sideThread, response.data.members, response.data.input, response.data.modal);
                    else
                        strings = Object.assign({}, stringsConfig.mainWall.labels, stringsConfig.sideThread.labels, stringsConfig.members.labels, stringsConfig.input.labels, stringsConfig.modal.labels);
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
                    }, (err, history) => {
                        if (err) return console.error(err);
                        let lastInHistory = history[history.length - 1];
                        let wallId = '';
                        let userIds = '';
                        if (lastInHistory && lastInHistory.options.pluginData &&
                            lastInHistory.options.pluginData.queryString) {
                            wallId = new URLSearchParams(lastInHistory.options.pluginData.queryString).get('wid');
                            userIds = new URLSearchParams(lastInHistory.options.pluginData.queryString).get('userIds');
                            wallId = wallId ? wallId : '';
                            userIds = userIds ? userIds : '';
                        }

                        if (!_this.wid) {
                            _this.wid = Util.getParameterByName("wid") ?
                                Util.getParameterByName("wid") : wallId;
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
