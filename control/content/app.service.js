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
                injectAnchors(text) {
                    let decodeedText = decodeURIComponent(text);
                    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4})/g;
                    return decodeedText.replace(urlRegex, function(url) {
                        if (url.includes('@')) {
                            return `<a href="#" onclick='sendEmail("${url}"); return false;'>${url}</a>`;
                        }
                        else {
                            let fullUrl = url;
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
        .factory("PerfomanceIndexingService", ['Buildfire', '$q', 'SERVER_URL', 'Util', '$http', function (Buildfire, $q, SERVER_URL, Util, $http) {
            return {
                getPostsWithIndex: function (item) {
                    item.data._buildfire = {
                        index: this.buildPostsIndex(item.data)
                    }
                    return item;
                },
                buildPostsIndex: function (data) {
                    var index = {
                        'string1': data.wid,
                        'date1': new Date(data.createdOn).getTime(),
                    }
                    return index;
                },
                proccessPost: function (record, callback) {
                    record = this.getPostsWithIndex(record);
                    buildfire.publicData.update(record.id, record.data, 'posts', function (err, result) {
                        if (err) return console.error(err);
                        if (result && result.id) {
                            callback();
                        }
                    });
                },
                iteratePosts: function (records, index) {
                    if (index !== records.length) {
                        this.proccessPost(records[index], () => this.iteratePosts(records, index + 1));
                    } else {
                        buildfire.datastore.get('Social', (err, result) => {
                            if(!result.data.appSettings) {
                                result.data.appSettings = {
                                   indexingUpdateDone: true,
                                   mainThreadUserTags: [],
                                   sideThreadUserTags: [],
                                   showMembers: true,
                                   allowCommunityFeedFollow: false,
                                   seeProfile: false,
                                   allowAutoSubscribe: true,
                                   allowChat: "allUsers",
                                }
                            }
                            else result.data.appSettings.indexingUpdateDone = true;
                            buildfire.datastore.save(result.data, 'Social', (err, saved) => {
                                buildfire.dialog.alert(
                                    {
                                        title: 'Community Wall Update',
                                        message: "Database has been successfully updated. Thank you for your patience, you can now publish the app!",
                                    }, (err, isConfirmed) => {
                                        if (err) return console.error(err);
                                        if (isConfirmed) {
        
                                        }
                                    }
                                );
                            });
                        });

                    }
                },
                startPostsIndexingUpdate: function () {
                    let searchOptions = {
                        limit: 50,
                        skip: 0
                    }, records = [];

                    const getPosts = () => {
                        buildfire.publicData.search(searchOptions, "posts", (err, result) => {
                            if (err) console.error(err);
                            if (result.length < searchOptions.limit) {
                                records = records.concat(result);
                                this.iteratePosts(records, 0);
                            } else {
                                searchOptions.skip = searchOptions.skip + searchOptions.limit;
                                records = records.concat(result);
                                return getPosts();
                            }
                        });
                    }
                    getPosts();
                },
                getSubscribedUsersDataWithIndex: function (item) {
                    item.data._buildfire = {
                        index: this.buildSubscribedUsersDataIndex(item.data)
                    }
                    return item;
                },
                buildSubscribedUsersDataIndex: function (data) {
                    var index = {
                        'string1': data.wallId,
                        'text': data.userId + '-' + data.wallId,
                        'number1': data.leftWall ? 1 : 0,
                        array1: [
                            { string1: data.userId + '-' + data.wallId }
                        ]
                    }
                    return index;
                },
                processSubscribedUsersData: function (record, callback) {
                    record = this.getSubscribedUsersDataWithIndex(record);
                    buildfire.publicData.update(record.id, record.data, 'subscribedUsersData', function (err, result) {
                        if (err) return console.error(err);
                        if (result && result.id) {
                            callback();
                        }
                    });
                },
                iterateSubscribedUsersData: function (records, index) {
                    if (index !== records.length) {
                        this.processSubscribedUsersData(records[index], () => this.iterateSubscribedUsersData(records, index + 1));
                    } else {
                        this.startPostsIndexingUpdate();
                    }
                },
                startSubscribedUsersDataIndexingUpdate: function () {
                    let searchOptions = {
                        limit: 50,
                        skip: 0
                    }, records = [];

                    const getSubscribedUsersData = () => {
                        buildfire.publicData.search(searchOptions, "subscribedUsersData", (err, result) => {
                            if (err) console.error(err);
                            if (result.length < searchOptions.limit) {
                                records = records.concat(result);
                                this.iterateSubscribedUsersData(records, 0);
                            } else {
                                searchOptions.skip = searchOptions.skip + searchOptions.limit;
                                records = records.concat(result);
                                return getSubscribedUsersData();
                            }
                        });
                    }
                    getSubscribedUsersData();
                },
                showIndexingDialog: function () {
                    buildfire.dialog.confirm(
                        {
                            title: 'Community Wall Update',
                            message: "We are improving your database perfomance, please do not close your browser or leave the plugin until you see success dialog. This may take a while...",
                            confirmButton: { text: "Yes", type: "success" },
                        }, (err, isConfirmed) => {
                            if (err) return console.error(err);
                            if (isConfirmed) return this.startSubscribedUsersDataIndexingUpdate();
                        }
                    );
                }
            }
        }])
})(window.angular, window.buildfire);

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