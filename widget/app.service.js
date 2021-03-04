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
                    if (params.userDetails.userTags) {
                        delete params.userDetails.userTags
                        delete params.userDetails.userToken
                    }
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
                        { filter: { '_buildfire.index.text': userId + '-' + wallId } },
                        'subscribedUsersData', function (err, data) {
                            if (err) return console.error(err)
                            if (data && data.length) {
                                let count = 0;
                                data.map(item => {
                                    console.log("DELETE", item)
                                    buildfire.publicData.delete(item.id, 'subscribedUsersData', function (err, status) {
                                        if (err) return console.error(err)
                                        count++;
                                        if (count === data.length)
                                            callback(null, status);
                                    });
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
                                pageSize, page, recordCount: true,
                                filter: { '_buildfire.index.string1': wallId ? wallId : { "$eq": "" } }
                            }, 'subscribedUsersData', function (err, data) {
                                console.log("AAAAAAA", data)
                                if (err) return cb(err, null);
                                //data = data.result.filter((item) => { return item.data.userId !== userId });
                                data.result.map(item => allUsers.push(item.data));
                                if (allUsers.length === data.totalRecord) {
                                    allUsers = allUsers.filter((item) => { return item.userId !== userId });
                                    cb(null, allUsers);
                                }
                                    
                                else {
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
                                callback(null, allUsers)
                            } else callback(null, [])
                        }
                    })
                },
                getGroupFollowingStatus: function (userId, wallId, instanceId, cb) {
                    window.buildfire.publicData.search(
                        {
                            filter: { '_buildfire.index.text': userId + '-' + wallId }
                        }, 'subscribedUsersData', function (err, data) {
                            if (err) return cb(err);
                            if (data) cb(null, data);
                            else cb(null, []);
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
                            filter: { '_buildfire.index.text': params.userId + '-' + params.wallId }
                        }, 'subscribedUsersData', function (error, result) {
                            if (error) return console.log(error)
                            if (result && result.length) {
                                let data = result[0].data;
                                data.posts = data.posts.filter(x => x !== params.post);
                                buildfire.publicData.update(result[0].id, data, 'subscribedUsersData', (err, posts) => {
                                    console.log(posts);
                                });
                            }
                        });
                },
                getThreadFollowingStatus: function (userId, threadId, wallId, instanceId, cb) {
                    window.buildfire.publicData.search(
                        {
                            filter: { '_buildfire.index.text': userId + '-' + wallId }
                        }, 'subscribedUsersData', function (error, result) {
                            if (error) return console.log(error)
                            if (result && result.length) {
                                let data = result[0].data;
                                let exists = data.posts.find(x => x === threadId);
                                if (exists) cb(null, true);
                                else cb(null, false);
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
                    postData.isUserLikeActive = false;
                    postData.likes = [];
                    postData.comments = [];
                    postData.createdOn = new Date();
                    postData.createdBy = postData.userDetails.userId;
                    postData._buildfire = {
                        index: {
                            string1: postData.wid,
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
                addComment: function (data) {
                    var deferred = $q.defer();
                    if(data.userDetails.userTags) {
                        delete data.userDetails.userTags
                        delete data.userDetails.userToken
                    }
                    console.log(data, "AAAAAAAAAAAAA")
                    
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
            };
            var instance;
            SocialItems.prototype.getUserName = function (userDetails) {
                let name = null;
                const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                if (userDetails.displayName !== 'Someone' && !re.test(String(userDetails.displayName).toLowerCase())
                    && userDetails.displayName) {
                    name = userDetails.displayName;
                }
                else if (userDetails.firstName !== 'Someone' && !re.test(String(userDetails.firstName).toLowerCase())
                && userDetails.firstName && userDetails.lastName)
                    name = userDetails.firstName + ' ' + userDetails.lastName;
                else name = 'Someone';
                if (name.length > 25)
                    name = name.substring(0, 25) + '...';
                    console.log("NAMEEEEEEEEEE", name)
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
                if (loggedUser) { prepareData(loggedUser); return callback(null, loggedUser); }
                else buildfire.auth.getCurrentUser((err, user) => {
                    if (err) return callback(err, null);
                    if (user) {
                        prepareData(user);
                        return callback(null, user);
                    } else {
                        _this.forcedToLogin = true;
                        buildfire.auth.login(null, (err, user) => {
                            if (err) return callback(err, null);
                            if (user) { prepareData(user); callback(null, user); }
                            else if (!user) callback(null, null);
                        });
                    }
                });
            }

            SocialItems.prototype.getPosts = function (pageSize, page, callback) {
                let searchOptions = { pageSize, page, sort: { "id": -1 }, recordCount: true }
                if (_this.wid === "")
                    searchOptions.filter = { '_buildfire.index.string1': { "$eq": "" } }
                else
                    searchOptions.filter = { "_buildfire.index.string1": { "$regex": _this.wid, "$options": "i" } }
                buildfire.publicData.search(searchOptions, 'posts', (error, data) => {
                    if (error) return console.log(error);
                    if (data && data.result.length) {
                        data.result.map(item => _this.items.push(item.data))
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
                        $rootScope.$digest();
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
                        if (_this.wid === "")
                            searchOptions.filter = { "_buildfire.index.string1": { "$eq": "" } }
                        else
                            searchOptions.filter = { "_buildfire.index.string1": { "$regex": _this.wid, "$options": "i" } }

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

            SocialItems.prototype.formatLanguages = function (strings) {
                _this.languages = {};
                Object.keys(strings).forEach(e => {
                    strings[e].value ? _this.languages[e] = strings[e].value : _this.languages[e] = strings[e].defaultValue;
                });
                $rootScope.$digest();
            }

            SocialItems.prototype.getSettings = function (callback) {
                buildfire.getContext((error, context) => {
                    if (error) return console.error("Fetching app context failed.", err);
                    _this.context = context;
                    _this.wid = Util.getParameterByName("wid") ? Util.getParameterByName("wid") : '';
                    if (_this.wid.length === 48)
                        _this.isPrivateChat = true;

                    buildfire.datastore.get("languages", (err, languages) => {
                        if (err) return console.log(err)
                        let strings = {};
                        if (languages.data && languages.data.screenOne)
                            strings = languages.data.screenOne;
                        else
                            strings = stringsConfig.screenOne.labels;
                        _this.formatLanguages(strings);
                        buildfire.datastore.get("Social", (err, response) => {
                            callback(err, { appSettings: response.data });
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
