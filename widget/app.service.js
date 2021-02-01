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
                },
                goToHome: function () {
                    _location.href = _location.href.substr(0, _location.href.indexOf('#'));
                }
            };
        }])
        .factory('Util', ['SERVER_URL', function (SERVER_URL) {
            return {
                requiresHttps: function () {
                    var useHttps = false;
                    var userAgent = navigator.userAgent || navigator.vendor;
                    var isiPhone = (/(iPhone|iPod|iPad)/i.test(userAgent));
                    var isAndroid = (/android/i.test(userAgent));

                    //iOS 10 and higher should use HTTPS
                    if (isiPhone) {
                        //This checks the first digit of the OS version. (Doesn't distinguish between 1 and 10)
                        if (!(/OS [4-9](.*) like Mac OS X/i.test(userAgent))) {
                            useHttps = true;
                        }
                    }

                    //For web based access, use HTTPS
                    if (!isiPhone && !isAndroid) {
                        useHttps = true;
                    }
                    if (window && window.location && window.location.protocol && window.location.protocol.startsWith("https"))
                        useHttps = true;
                    console.warn('userAgent: ' + userAgent);
                    console.warn('useHttps: ' + useHttps);

                    return useHttps;
                },
                getProxyServerUrl: function () {
                    return this.requiresHttps() ? SERVER_URL.secureLink : SERVER_URL.link;
                },
                injectAnchors: function (text, options) {
                    text = decodeURIComponent(text);
                    var URL_CLASS = "reffix-url";
                    var URLREGEX = /(https?:\/\/(?:www\.|(?!www))[^\s\.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,})/;
                    var EMAILREGEX = /([\w\.]+)@([\w\.]+)\.(\w+)/g;

                    if (!options) options = { injectURLAnchors: true, injectEmailAnchors: true };
                    var lookup = [];
                    if (!options.urlAnchorGen)
                        options.urlAnchorGen = function (url) {
                            return { url: url, target: '_system' }
                        };
                    if (options.injectURLAnchors)
                        text = text.replace(URLREGEX, function (url) {
                            var obj = options.urlAnchorGen(url);
                            if (obj.url && obj.url.indexOf('http') !== 0 && obj.url.indexOf('https') !== 0) {
                                obj.url = 'http://' + obj.url;
                            }
                            lookup.push("<a href='" + obj.url + "' target='" + obj.target + "' >" + url + "</a>");
                            return "_RF" + (lookup.length - 1) + "_";
                        });
                    if (!options.emailAnchorGen)
                        options.emailAnchorGen = function (email) {
                            return { url: "mailto:" + email, target: '_system' }
                        };
                    if (options.injectEmailAnchors)
                        text = text.replace(EMAILREGEX, function (url) {
                            var obj = options.emailAnchorGen(url);
                            lookup.push("<a href='" + obj.url + "' target='" + obj.target + "'>" + url + "</a>");
                            return "_RF" + (lookup.length - 1) + "_";
                        });
                    /// this is done so you dont swap what was injected
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
            return {
                save: function (params, callback) {
                    window.buildfire.publicData.insert(params, 'subscribedUsersData', function (err, data) {
                        if (err) callback(err);

                        else {
                            console.log("SAVED DATA", data)
                            callback();
                        }
                    }
                    );
                },
                unfollowWall: function (userId, wallId, instanceId, callback) {
                    window.buildfire.publicData.search(
                        {
                            filter: {
                                '_buildfire.index.text': userId + '-' + wallId
                            }
                        }, 'subscribedUsersData', function (err, data) {
                            if (err) return console.error(err)
                            if (data && data.length) {
                                buildfire.publicData.delete(data[0].id, 'subscribedUsersData', function (err, status) {
                                    if (err) return console.error(err)
                                    else {
                                        callback(null, status);
                                    }
                                });
                            }
                        })
                },
                getUsersWhoFollow: function (userId, wallId, cb) {
                    const pageSize = 50;
                    var allUsers = [];
                    let page = 0;
                    function getUsers() {
                        console.log("LOADING USERS", page)
                        window.buildfire.publicData.search(
                            {
                                pageSize, page,
                                filter: {
                                    '_buildfire.index.string1': wallId
                                }
                            }, 'subscribedUsersData', function (err, data) {
                                if (err) {
                                    cb(err);
                                    return;
                                }
                                console.log(data)
                                if (data.length === pageSize) {
                                    data.map(user => {
                                        console.log(user.data.userId, userId)
                                        if (!(user.data.userId.localeCompare(userId) === 0))
                                            allUsers.push(user.data)
                                    });
                                    page++;
                                    getUsers();
                                } else {
                                    data.map(user => {
                                        console.log(user, userId)

                                        if (!(user.data.userId.localeCompare(userId) === 0))
                                            allUsers.push(user.data)
                                    });
                                    cb(null, allUsers)
                                }
                            })
                    }
                    getUsers()

                },
                searchForUsers: function (query, callback) {
                    console.log(query)
                    window.buildfire.publicData.search(query, 'subscribedUsersData', function (err, data) {
                        if (err) {
                            callback(err);
                            return;
                        } else {
                            var allUsers = [];
                            if (data && data.length) {
                                data.map(user => allUsers.push(user.data));
                                callback(null, allUsers)
                            } else callback(null, [])
                        }
                    })
                },
                getGroupFollowingStatus: function (userId, wallId, instanceId, cb) {
                    window.buildfire.publicData.search(
                        {
                            filter: {
                                '_buildfire.index.text': userId + '-' + wallId
                            }
                        }, 'subscribedUsersData', function (err, data) {

                            console.log('found', data)
                            if (err) {
                                cb(err);
                                return;
                            }
                            if (data) {
                                cb(null, data);
                            } else {
                                cb(null, true);
                            }
                        }
                    );
                },
                followThread: function (params, callback) {
                    window.buildfire.publicData.search(
                        {
                            filter: {
                                '_buildfire.index.text': params.userId + '-' + params.wallId
                            }
                        }, 'subscribedUsersData', function (err, result) {
                            console.log(result);
                            if (result && result.length) {
                                let data = result[0].data;
                                data.posts.push(params.post);
                                buildfire.publicData.update(result[0].id, data, 'subscribedUsersData', (err, posts) => {
                                    console.log(posts);
                                });
                            }
                        })
                },
                unFollowThread: function (params, callback) {
                    window.buildfire.publicData.search(
                        {
                            filter: {
                                '_buildfire.index.text': params.userId + '-' + params.wallId
                            }
                        }, 'subscribedUsersData', function (error, result) {
                            if (error) return console.log(error)
                            if (result && result.length) {
                                let data = result[0].data;
                                data.posts = data.posts.filter(x => x !== params.post);
                                console.log(data.posts)
                                buildfire.publicData.update(result[0].id, data, 'subscribedUsersData', (err, posts) => {
                                    console.log(posts);
                                });
                            }
                        });
                },
                getThreadFollowingStatus: function (userId, threadId, wallId, instanceId, cb) {
                    window.buildfire.publicData.search(
                        {
                            filter: {
                                '_buildfire.index.text': userId + '-' + wallId
                            }
                        }, 'subscribedUsersData', function (error, result) {
                            if (error) return console.log(error)
                            if (result && result.length) {
                                let data = result[0].data;
                                let exists = data.posts.find(x => x === threadId);
                                if (exists) cb(null, true)
                                else cb(null, false)
                            }
                        });
                }
            }
        })
        .factory("SocialDataStore", ['Buildfire', '$q', '$timeout', 'Util', '$http', function (Buildfire, $q, $timeout, Util, $http) {
            var _this = this;
            _this.pageSize = 1;
            _this.page = 0;
            return {
                createPost: function (postData) {
                    var deferred = $q.defer();
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
                addComment: function (data) {
                    var deferred = $q.defer();
                    buildfire.publicData.getById(data.threadId, 'posts', function (err, post) {
                        if (err) return deferred.reject(err);
                        post.data.comments.push(data);
                        buildfire.publicData.update(post.id, post.data, 'posts', function (err, status) {
                            if (err) return deferred.reject(err);
                            else return deferred.resolve(status);
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
                reportPost: function (postId) {
                    var deferred = $q.defer();
                    buildfire.publicData.delete(postId, 'posts', function (error, result) {
                        if (error) return deferred.reject(error);
                        if (result) return deferred.resolve(result);
                    })
                    return deferred.promise;
                },
                deletePost: function (postId) {
                    var deferred = $q.defer();
                    buildfire.publicData.delete(postId, 'posts', function (error, result) {
                        if (error) return deferred.reject(error);
                        if (result) return deferred.resolve(result);
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
        .factory('SocialItems', ['Buildfire', '$http', 'Util', 'Location', '$routeParams', 'SocialDataStore', '$rootScope', function (Buildfire, $http, Util, Location, $routeParams, SocialDataStore, $rootScope) {
            var _this;
            var SocialItems = function () {
                _this = this;
                _this.items = [];
                _this.busy = false;
                _this.lastThreadId = null;
                _this.context = {};
                _this.parentThreadId = null;
                _this.socialAppId = null;
                _this.appSettings = null;
                _this.userDetails = {};
                _this.userDetails.userToken = null;
                _this.userDetails.userId = null;
                _this.userDetails.settingsId = null;
                _this.userDetails.userTags = null;
                _this._receivePushNotification = false;
                _this.postMehodCalledFlag = false;
                _this.newPostTimerChecker = null;
                _this.newPostAvailable = false;
                _this.newCommentsAvailable = false;
                _this.pauseNewPostBgService = false;
                _this.isPrivateChat = false;
                _this.comments = [];
                _this.uniqueLink = null;
                _this.hasMorePosts = false;
                _this.pageSize = 5;
                _this.page = 0;
            };
            var instance;

            function getAppIdAndParentThreadId(callback) {
                var _instanceId = Util.getParameterByName("wid");
                var _instanceTitle = Util.getParameterByName("wTitle");
                var _recipientUserId = Util.getParameterByName("userId");

                _this.wid = _instanceId;
                if (_instanceId) {
                    if (_instanceId.length === 48) {
                        console.log("PRIVATNI CHAT")
                        _this.isPrivateChat = true;
                    }
                }
                callback(null);
            }


            SocialItems.prototype.getPosts = function (pageSize, page, callback) {
                let searchOptions = { pageSize, page, sort: { "id": -1 } }
                if (_this.wid === null)
                    searchOptions.filter = { '_buildfire.index.string1': "" }
                else
                    searchOptions.filter = { "_buildfire.index.string1": { "$regex": _this.wid, "$options": "i" } }
                buildfire.publicData.search(searchOptions, 'posts', (error, data) => {
                    if (error) return console.log(error);
                    if (data && data.length) {
                        data.map(item => _this.items.push(item.data))
                        window.buildfire.messaging.sendMessageToControl({
                            name: 'SEND_POSTS_TO_CP',
                            posts: _this.items,
                        });
                        if (page === 0) startBackgroundService();
                        else clearInterval(_this.newPostTimerChecker);
                        $rootScope.$digest();
                        callback(null, data);
                    }
                    else {
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

            function startBackgroundService() {
                if (!_this.newPostTimerChecker) {
                    _this.newPostTimerChecker = setInterval(function () {
                        let searchOptions = { sort: { "id": -1 } }
                        if (_this.wid === null)
                            searchOptions.filter = { "_buildfire.index.string1": "" }
                        else
                            searchOptions.filter = { "_buildfire.index.string1": { "$regex": _this.wid, "$options": "i" } }

                        buildfire.publicData.search(searchOptions, 'posts', (error, data) => {
                            if (error) return console.log(error);
                            if (data && data.length) {
                                if(data[0].data.id === _this.items[0].id) return;
                                let items = [];                                
                                data.map(item => items.push(item.data))
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

            SocialItems.prototype.init = function (callback) {
                _this.lastThreadId = null;
                _this.items = [];
                _this.busy = false;
                _this.newPostAvailable = false;
                _this.comments = [];
                _this.newCommentsAvailable = false;
                Buildfire.getContext(function (err, context) {
                    if (err) {
                        console.error("Error while getting buildfire context details", err);
                    } else {
                        _this.context = context;
                        getAppIdAndParentThreadId(function (err, result) {
                            if (err) {
                                console.error('error on app init when calling getAppIdAndParentThreadId', err);
                            } else {
                                if (callback)
                                    callback(null);
                            }
                        });
                    }
                });
            };
            return {
                getInstance: function () {
                    if (!instance) {
                        instance = new SocialItems();
                    }
                    return instance;
                }
            };
        }])
})(window.angular, window.buildfire, window.location);
