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
                injectAnchors: function (text, options) {
                    text = decodeURIComponent(text);
                    var URL_CLASS = "reffix-url";
                    var URLREGEX = new RegExp(/^(?!.*iframe).*(https?:\/\/(?:www\.|(?!www))[^\s\.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,})/);
                    var EMAILREGEX = /([\w\.]+)@([\w\.]+)\.(\w+)/g;
                    var lookup = [];

                    text = text.replace(URLREGEX, function (url) {
                        var obj = {
                            url: url,
                            target: '_system'
                        }
                        if (obj.url && obj.url.indexOf('http') !== 0 && obj.url.indexOf('https') !== 0) {
                            obj.url = 'http://' + obj.url;
                        }
                        lookup.push("<a href='" + obj.url + "' target='" + obj.target + "' >" + url + "</a>");
                        return "_RF" + (lookup.length - 1) + "_";
                    });
                    text = text.replace(EMAILREGEX, function (url) {
                        var obj = {
                            url: "mailto:" + url,
                            target: '_system'
                        };
                        lookup.push("<a href='" + obj.url + "' target='" + obj.target + "'>" + url + "</a>");
                        return "_RF" + (lookup.length - 1) + "_";
                    });
                    lookup.forEach(function (e, i) {
                        text = text.replace("_RF" + i + "_", e);
                    });
                    return text;
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
                                allUsers = allUsers.filter(el => !el.leftWall)
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
                        } else {
                            buildfire.publicData.insert(obj, 'posts', (error, result) => {
                                if (error) return deferred.reject(error);
                                result.data.uniqueLink = result.id + "-" + result.data.wid;
                                buildfire.publicData.update(result.id, result.data, 'posts', (error, post) => {
                                    if (error) return deferred.reject(error);
                                    return deferred.resolve(post);
                                });
                            });
                        }
                    });
                    return deferred.promise;
                },
                reportPost: function (data) {
                    buildfire.publicData.get('reports_' + data.wid, (err, result) => {
                        if (!result.data.length)
                            buildfire.publicData.save([{
                                ...data
                            }], 'reports_' + data.wid, () => {});
                        else {
                            let alreadyReported = result.data.find(el =>
                                el.reporter === data.reporter && el.postId === data.postId)
                            if (!alreadyReported) {
                                Analytics.trackAction("post-reported");
                                result.data.push(data);
                                buildfire.publicData.update(result.id, result.data, 'reports_' + data.wid, (err, saved) => {
                                    buildfire.messaging.sendMessageToControl({
                                        'name': "POST_REPORTED",
                                        wid: data.wid
                                    });
                                });
                            }
                        }

                    });
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
                if (userDetails.displayName !== 'Someone' && !re.test(String(userDetails.displayName).toLowerCase()) &&
                    userDetails.displayName) {
                    name = userDetails.displayName;
                } else if (userDetails.firstName !== 'Someone' && !re.test(String(userDetails.firstName).toLowerCase()) &&
                    userDetails.firstName && userDetails.lastName)
                    name = userDetails.firstName + ' ' + userDetails.lastName;

                else if (userDetails.firstName !== 'Someone' && !re.test(String(userDetails.firstName).toLowerCase()) &&
                    userDetails.firstName)
                    name = userDetails.firstName;
                else if (userDetails.lastName !== 'Someone' && !re.test(String(userDetails.lastName).toLowerCase()) &&
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
                        data.result.map(item => _this.items.push(item.data))
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
                                data.map(item => items.push(item.data));
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