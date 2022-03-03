'use strict';

(function (angular, buildfire) {
    angular.module('socialPluginContent')
        .provider('Buildfire', [function () {
            var Buildfire = this;
            Buildfire.$get = function () {
                return buildfire
            };
            return Buildfire;
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
                    var URLREGEX = new RegExp(/^(?!.*iframe).*(https?:\/\/(?:www\.|(?!www))[^\s\.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,})/);
                    var EMAILREGEX = /([\w\.]+)@([\w\.]+)\.(\w+)/g;
                    var lookup = [];

                    text = text.replace(URLREGEX, function (url) {
                        var obj = { url: url, target: '_system' }
                        if (obj.url && obj.url.indexOf('http') !== 0 && obj.url.indexOf('https') !== 0) {
                            obj.url = 'http://' + obj.url;
                        }
                        lookup.push("<a href='" + obj.url + "' target='" + obj.target + "' >" + url + "</a>");
                        return "_RF" + (lookup.length - 1) + "_";
                    });
                    text = text.replace(EMAILREGEX, function (url) {
                        var obj = { url: "mailto:" + url, target: '_system' };
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
        .factory('SocialItems', ['Buildfire', function () {
            var _this;
            var SocialItems = function () {
                _this = this;
                _this.items = [];
                _this.busy = false;
                _this.lastThreadId = null;
                buildfire.getContext((err, response) => {
                    _this.context = response;
                });
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
                _this.exportingThreads = false;
                _this.isPrivateChat = false;
                _this.comments = [];
            };
            var instance;
            return {
                getInstance: function () {
                    if (!instance) {
                        instance = new SocialItems();
                    }
                    return instance;
                }
            }
        }])
        .factory("SocialDataStore", ['Buildfire', '$q', 'SERVER_URL', 'Util', '$http', function (Buildfire, $q, SERVER_URL, Util, $http) {
            return {
                getPosts: function (data) {
                    var deferred = $q.defer();
                    buildfire.publicData.search({
                        "$json.parentThreadId": data.parentThreadId,
                        "sort": { "createdOn": -1 }
                    }, 'posts', (error, data) => {
                        if (error) return deferred.reject(error)
                        else return deferred.resolve(data);
                    });
                    return deferred.promise;
                },
                getUsers: function (userIdsArray) {
                    var deferred = $q.defer();
                    var postDataObject = {};
                    postDataObject.id = '1';
                    postDataObject.method = 'users/getUsers';
                    postDataObject.params = {};
                    postDataObject.params.userIds = userIdsArray || [];
                    postDataObject.userToken = null;
                    var successCallback = function (response) {
                        return deferred.resolve(response);
                    };
                    var errorCallback = function (err) {
                        return deferred.reject(err);
                    };
                    $http({
                        method: 'GET',
                        url: SERVER_URL.link,
                        params: { data: postDataObject },
                        headers: { 'Content-Type': 'application/json' }
                    }).then(successCallback, errorCallback);
                    return deferred.promise;
                },
                deletePost: function (postId, socialAppId, secureToken) {
                    var deferred = $q.defer();
                    buildfire.publicData.delete(postId, 'posts', function (err, status) {
                        if (err) return deferred.reject(err);
                        else return deferred.resolve(status);
                    })
                    return deferred.promise;
                },
                getCommentsOfAPost: function (data) {
                    var deferred = $q.defer();
                    var postDataObject = {};
                    postDataObject.id = '1';
                    postDataObject.method = 'threadComments/findByPage';
                    postDataObject.params = {};
                    postDataObject.params.appId = data.socialAppId;
                    postDataObject.params.threadId = data.threadId;
                    postDataObject.params.lastCommentId = data.lastCommentId || null;
                    postDataObject.userToken = null;
                    var successCallback = function (response) {
                        return deferred.resolve(response);
                    };
                    var errorCallback = function (err) {
                        return deferred.reject(err);
                    };
                    $http({
                        method: 'GET',
                        url: SERVER_URL.link,
                        params: { data: postDataObject },
                        headers: { 'Content-Type': 'application/json' }
                    }).then(successCallback, errorCallback);
                    return deferred.promise;
                },
                banUser: function (userId, wallId) {
                    var deferred = $q.defer();

                    let searchOptions = {
                        filter: {
                            $and: [
                                { "$json.userId": userId },
                                { '$json.wid': wallId }
                            ]
                        }
                    }

                    let searchOptions2 = {
                        filter: {
                            $and: [
                                { "$json.comments.userId": userId },
                                { '$json.wid': wallId }
                            ]
                        }
                    }

                    buildfire.publicData.search(searchOptions2, 'posts', (error, data) => {
                        if (error) return deferred.reject(error);
                        let count = 0;
                        if (data && data.length) {
                            data.map(post => {
                                post.data.comments.map((comment, index) => {
                                    if (comment.userId === userId) {
                                        post.data.comments.splice(index, 1)
                                    }
                                })
                                buildfire.publicData.update(post.id, post.data, 'posts', (error, data) => {
                                    if (error) return deferred.reject(error);
                                })
                            })
                        }
                        buildfire.publicData.search(searchOptions, 'posts', (error, data) => {
                            if (error) return deferred.reject(error);
                            if (data && data.length) {
                                data.map(post => {
                                    buildfire.publicData.delete(post.id, 'posts', function (err, status) {
                                        if (error) return deferred.reject(error);
                                        return deferred.resolve(status);
                                    })
                                })
                            }
                        });
                    });
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
                },
                getThreadLikes: function (uniqueIds, socialAppId) {
                    var deferred = $q.defer();
                    var postDataObject = {};
                    postDataObject.id = '1';
                    postDataObject.method = 'threadLikes/getLikes';
                    postDataObject.params = {};
                    postDataObject.params.uniqueIds = uniqueIds;
                    postDataObject.params.appId = socialAppId;
                    postDataObject.params.userId = null;
                    var success = function (response) {
                        return deferred.resolve(response);
                    };
                    var error = function (err) {
                        return deferred.reject(err);
                    };
                    $http({
                        method: 'GET',
                        url: SERVER_URL.link,
                        params: { data: postDataObject },
                        headers: { 'Content-Type': 'application/json' }
                    }).then(success, error);
                    return deferred.promise;
                }
            }
        }])
})(window.angular, window.buildfire);
