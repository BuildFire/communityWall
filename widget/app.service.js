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
                    console.log(path);
                    _location.href = path;
                    let label;
                    if(path.includes('thread')) label.push('thread');
                    else if(path.includes('members')) label.push('members');
                    else{
                        label = path
                    } 
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
        .factory("ProfileActivity",['$rootScope', function($rootScope){
            return{
                add: function(params, callback){
                    buildfire.appData.insert(params, "ProfileActivity", function(err, res){
                        err ? callback(err) : callback(null, res)
                    })
                },
                search: function(params, callback){
                    buildfire.appData.search(params, "ProfileActivity", function(err, res){
                        err ? callback(err) : callback(null, res)
                    })
                },
                delete: function(id, callback){
                    buildfire.appData.delete(id, "ProfileActivity", function(err, res){
                        err ? callback(err) : callback(null, res)
                    })
                },
            }
        }])
        .factory("ProfileSocialBadges",['$rootScope', function($rootScope){
            return{
                add: function(params, callback){
                    buildfire.appData.insert(params, "ProfileSocialBadges", function(err, res){
                        err ? callback(err) : callback(null, res)
                    })
                },
                search: function(params, callback){
                    buildfire.appData.search(params, "ProfileSocialBadges", function(err, res){
                        err ? callback(err) : callback(null, res)
                    })
                },
                delete: function(id, callback){
                    buildfire.appData.delete(id, "ProfileSocialBadges", function(err, res){
                        err ? callback(err) : callback(null, res)
                    })
                },
            }
        }])
        .factory("SocialUserProfile",['$rootScope', function($rootScope){
            return{
                init: function(params){
                    window.buildfire.appData.search({filter:{
                        "_buildfire.index.string1" : params.userId,
                    }}, "SocialUserProfile", function(err, data){
                        if(err || data.length == 0){
                            console.log("didnt find data");
                            window.buildfire.appData.insert(params, "SocialUserProfile", console.log);
                        }
                        else{
                            console.log("found data !");
                            console.log(data);
                        }
                    })
                },
                update: function(params, callback){
                    window.buildfire.appData.update(params.id, params.data, "SocialUserProfile", function(err, data){
                        if(err) return callback(err);
                        else return callback(null, data)
                    })
                },
                search: function(options, callback){
                    console.log(options);
                    window.buildfire.appData.search(options, "SocialUserProfile", function(err, data){
                        if(err || data.length == 0){
                            return callback(err, null)
                        }
                        else{
                            return callback(null, data);
                        }
                    })
                },
                get: function(userId, callback){
                    let options = {
                        filter:{
                            "_buildfire.index.string1":userId
                        }
                    }
                    window.buildfire.appData.search(options, "SocialUserProfile", function(err, data){
                        if(err || data.length == 0){
                            return callback(err, null)
                        }
                        else{
                            return callback(null, data[0]);
                        }
                    })
                },
                blockUser: function(userId, callback){
                    window.buildfire.auth.getCurrentUser((err, currentUser) =>{
                        if(err || !currentUser) return callback("Must be logged in");
                        else {
                            window.buildfire.appData.search({filter:{"_buildfire.index.string1":currentUser._id}}, "SocialUserProfile", function(err, socialProfile){
                                if(err || socialProfile.length == 0) return callback("error");
                                else{
                                    let social = socialProfile[0];
                                    social.data.blockedUsers.push(userId);
                                    window.buildfire.appData.update(social.id, social.data, "SocialUserProfile", (err, succ) =>{
                                        if(err) return callback(err);
                                        else return callback(null, succ);
                                    })
                                }
                            });
                        }
                    })
                },
                unblockUser: function(userId, callback){
                    window.buildfire.auth.getCurrentUser((err, currentUser) =>{
                        if(err || !currentUser) return callback("Must be logged in");
                        else {
                            window.buildfire.appData.search({filter:{"_buildfire.index.string1":currentUser._id}}, "SocialUserProfile", function(err, socialProfile){
                                if(err || socialProfile.length == 0) return callback("error");
                                else{
                                    let social = socialProfile[0];
                                    let index = social.data.blockedUsers.findIndex(e => e === userId);
                                    if(index >= 0){
                                        social.data.blockedUsers.splice(index, 1);
                                        window.buildfire.appData.update(social.id, social.data, "SocialUserProfile", (err, succ) =>{
                                            if(err) return callback(err);
                                            else return callback(null, succ);
                                        })
                                    }
                                    else return callback("User is not blocked")
                                }
                            });
                        }
                    })
                },
                getBlockedUsers: function(userId, callback){
                    window.buildfire.appData.search({filter:{"_buildfire.index.string1":userId}},"SocialUserProfile",(err, results) =>{
                        if(results && results.length > 0){
                            let result = results[0];
                            return callback(null, result.data.blockedUsers)
                        }
                        else{
                            return callback(err ? err : "error" , null)
                        }
                    })
                },
                togglePrivacy: function(userId, callback){
                    window.buildfire.appData.search({filter:{"_buildfire.index.string1":userId}}, "SocialUserProfile", function(err, socialProfile){
                        if(socialProfile.length > 0){
                            let temp = socialProfile[0];
                            let data = temp.data;
                            data.isPublicProfile = !data.isPublicProfile;
                            if(data.isPublicProfile){
                                data.followers.push(...data.pendingFollowers);
                                data.pendingFollowers = [];

                            }                            
                            window.buildfire.appData.update(temp.id, data , "SocialUserProfile",(err, res) =>{
                                err ? callback(err) : callback(null, res);
                            });
                            if(data.isPublicProfile){
                                window.buildfire.appData.search({filter:{"$json.toUser.userId":data.userId}}, "ProfileActivity",(err, data) =>{
                                    if(data && data.length > 0){
                                        data.forEach(item =>{
                                            if(item && item.data.type === 'pendingFollow'){
                                                let data = {...item.data};
                                                data.type = "follow";
                                                window.buildfire.appData.update(item.id, data, "ProfileActivity", console.log);
                                            }
                                        })
                                    }
                                })
                            }
                        }
                        else{
                            return callback("error");
                        }
                    });
                },
                followUnfollowUser: function(params, callback){
                    window.buildfire.appData.search({filter:{"_buildfire.index.string1":params.userId}}, "SocialUserProfile", function(err, socialProfile){
                        socialProfile = socialProfile[0];
                        if(socialProfile.data){
                            let followers;
                            let updatedObj = {...socialProfile.data};
                            if(socialProfile.data.isPublicProfile){
                                followers = socialProfile.data.followers;
                                let index = followers.findIndex(e => e === params.currentUser);
                                console.log("is pushing?");
                                if(index == -1){
                                    console.log("pushed user to followers");
                                    updatedObj.followers.push(params.currentUser);
                                }
                                else{
                                    updatedObj.followers.splice(index, 1);
                                }
                                window.buildfire.appData.update(socialProfile.id, updatedObj, "SocialUserProfile", (err, data) =>{
                                    err ? callback(err) : callback(null, data);
                                    window.buildfire.appData.search({filter:{"$json.userId":params.currentUser}} , "SocialUserProfile", (err, results) =>{
                                        let p = results[0];
                                        if(index == -1) p.data.following.push(params.userId);
                                        else p.data.following.splice(index,1);
                                        window.buildfire.appData.update(p.id, p.data, "SocialUserProfile", console.log);
                                    })
                                })
                            }
                            else{
                                followers = socialProfile.data.followers;
                                let pendingFollowers = socialProfile.data.pendingFollowers;
                                let index = pendingFollowers.findIndex(e => e === params.currentUser);
                                let index2 = followers.findIndex(e => e === params.currentUser);
                                updatedObj = {...socialProfile.data};

                                if(index == -1 && index2 == -1){
                                    // user is not neither in pending nor in followers
                                    // add to pendingFollowers
                                    updatedObj.pendingFollowers.push(params.currentUser);
                                }
                                else if(index >= 0 && index2 == -1){
                                    // user is in pending followers and not in followers
                                    // remove user from pending followers
                                    updatedObj.pendingFollowers.splice(index, 1);
                                }
                                else if(index == -1 && index2 >= 0){
                                    // user is in followers, should remove user from followers
                                    updatedObj.followers.splice(index2, 1);
                                }

                                window.buildfire.appData.update(socialProfile.id, updatedObj, "SocialUserProfile", (err, data) =>{
                                    console.log("after unfollow update for followed user");
                                    console.log(data);
                                    err ? callback(err) : callback(null, data);
                                    window.buildfire.appData.search({filter:{"$json.userId":params.currentUser}} , "SocialUserProfile", (err, results) =>{
                                        let p = results[0];
                                        if(index == -1 && index2 >= 0) p.data.following.splice(index2, 1);
                                        console.log("for user who followed");
                                        console.log(p);
                                        window.buildfire.appData.update(p.id, p.data, "SocialUserProfile", console.log);
                                    })
                                })
                            }
                        }
                        else return callback(err);
                    })
                },
                acceptFollowRequest: function(params, callback){
                    let currentUserId = params.currentUser.userId;
                    let userId = params.user.userId;
                    window.buildfire.appData.search({filter:{"_buildfire.index.string1":currentUserId}}, "SocialUserProfile", function (err, results){
                        if(err) return callback(err);
                        else if(!results || (results && results.length == 0)){
                            return callback("error");
                        }
                        else{
                            let socialProfile = results[0].data;
                            let index = socialProfile.pendingFollowers.findIndex(e => e === userId);
                            socialProfile.pendingFollowers.splice(index);
                            console.log('social profile pending followers splice');
                            console.log(socialProfile.pendingFollowers);
                            socialProfile.followers.push(userId)
                            window.buildfire.appData.update(results[0].id, socialProfile, "SocialUserProfile", (err, res) =>{
                                callback(err ? err : null, res);
                                // update profile activity 
                                let newParams = {
                                    fromUser: params.currentUser,
                                    toUser: params.user,
                                    type: "acceptedFollowRequest",
                                    createdOn: new Date(),
                                    createdBy: params.currentUser.userId,
                                }
                                window.buildfire.appData.insert(newParams, "ProfileActivity", console.log);
                                window.buildfire.appData.search({filter:{
                                $and:[
                                    {"$json.fromUser.userId": params.user.userId},
                                    {"$json.toUser.userId": params.currentUser.userId},
                                    {"$json.type": "pendingFollow"}
                                ]
                                    
                                }} , "ProfileActivity", (err, data) =>{
                                    if(data && data.length > 0){
                                        data.forEach(item =>{
                                            window.buildfire.appData.update(item.id, {...item.data, type: "follow"}, "ProfileActivity", console.log);
                                        })
                                    }
                                }
                                )
                            })
                            window.buildfire.appData.search({filter:{"_buildfire.index.string1":params.user.userId}}, "SocialUserProfile", (err, results) =>{
                                let profile = results[0].data;
                                profile.following.push(params.currentUser.userId);
                                window.buildfire.appData.update(results[0].id, profile, "SocialUserProfile", (err, data) =>{
                                    console.log("user who requests follow profile");
                                    console.log(data);
    
                                });
                            })
                        }
                    })
                },
                declineFollowRequest: function(params, callback){
                    let currentUserId = params.currentUserId;
                    let userId = params.userId;
                    window.buildfire.appData.search({filter:{"_buildfire.index.string1":currentUserId}}, "SocialUserProfile", function (err, results){
                        if(err) return callback(err);
                        else if(!results || (results && results.length == 0)){
                            return callback("error");
                        }
                        else{
                            let socialProfile = results[0].data;
                            let index = socialProfile.pendingFollowers.findIndex(e => e === userId);
                            socialProfile.pendingFollowers.splice(index);
                            window.buildfire.appData.update(results[0].id, socialProfile, "SocialUserProfile", (err, res) =>{
                                callback(err ? err : null, res);
                                window.buildfire.appData.search({filter:{
                                    $and:[
                                        {"$json.fromUser.userId": params.userId},
                                        {"$json.toUser.userId": params.currentUserId},
                                        {"$json.type": "pendingFollow"}
                                    ]
                                        
                                    }} , "ProfileActivity", (err, data) =>{
                                        if(data && data.length > 0){
                                            data.forEach(item =>{
                                                window.buildfire.appData.delete(item.id, "ProfileActivity", console.log);
                                            })
                                        }
                                    }
                                    )
                            })
                        }
                    })
                },
                checkForBadges: function(callback){
                    
                }
            }
        }])

        .factory("SubscribedUsersData", function () {
            return {
                get: function(userId, callback){
                    console.log("from get");
                    console.log(userId);
                    window.buildfire.appData.search({filter:{"_buildfire.index.array1.string1":`userId_${userId}`}}, 'subscribedUsersData', function (err, data) {
                        if(err) callback ? callback(err) : console.error(err);
                        else if(data && data.length > 0){
                            console.log("from get");
                            console.log(data);
                            callback && callback(null, data[0]) ;
                        }
                        else{
                            callback && callback(null, null);
                        }
                    })
                },
                banUser: function (params, callback) {

                },
                save: function (params, callback) {
                    if (params.userDetails.userTags) {
                        delete params.userDetails.userTags
                        delete params.userDetails.userToken
                    }
                    window.buildfire.appData.insert(params, 'subscribedUsersData', function (err, data) {
                        if (err) callback(err);
                        else {
                            callback();
                        }
                    });
                },
                unfollowWall: function (userId, wallId, banUser, callback) {
                    window.buildfire.appData.search(
                        { filter: { '_buildfire.index.text': userId + '-' + wallId } },
                        'subscribedUsersData', function (err, data) {
                            if (err) return console.error(err)
                            if (data && data.length > 1) {
                                let count = 0;
                                let allPosts = [];
                                let update = function () {
                                    let toSave = data[0].data;
                                    toSave.posts = allPosts;
                                    toSave.leftWall = true;
                                    if (banUser) {
                                        data[0].data.banned = true;
                                    }

                                    buildfire.appData.save(toSave, 'subscribedUsersData', (err, result) => {
                                        callback(null, true);
                                    });
                                }
                                data.map(item => {
                                    allPosts = allPosts.concat(item.data.posts);
                                    buildfire.appData.delete(item.id, 'subscribedUsersData', function (err, status) {
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
                                buildfire.appData.update(data[0].id, data[0].data, 'subscribedUsersData', (err, result) => {
                                    callback(null, result);
                                });
                            }
                        })
                },
                getUsersWhoFollow: function (userId, wallId, cb) {
                    const pageSize = 50;
                    var allUsers = [];
                    let page = 0;
                    function getUsers() {
                        window.buildfire.appData.search(
                            {
                                pageSize, page, recordCount: true,
                                filter: {
                                    '_buildfire.index.string1': wallId ? wallId : "",
                                    $or: [
                                        { '$json.leftWall': { $exists: true, $eq: false } },
                                        { '$json.leftWall': { $exists: false } }
                                    ]
                                },
                            }, 'subscribedUsersData', function (err, data) {
                                if (err) return cb(err, null);
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
                getUsersByIds: function(array, cb){
                    window.buildfire.appData.search({filter:{"$json.userId":{$in:array}}}, "subscribedUsersData", function(err, data){
                        if(err) return cb(err);
                        else if(data && data.length){
                            return cb(null, data)
                        }
                        else{
                            return cb(null, []);
                        }
                    })
                },
                getUsers: function(options, cb){
                    window.buildfire.appData.search(options, "subscribedUsersData", function (err, users){
                        if(err) return cb(err);
                        else return cb(null, users)
                    })
                },
                searchForUsers: function (query, callback) {
                    window.buildfire.appData.search(query, 'subscribedUsersData', function (err, data) {
                        if (err) return callback(err);
                        else {
                            var allUsers = [];
                            if (data && data.length) {
                                data.map(user => allUsers.push(user.data));
                                allUsers = allUsers.filter(el => !el.leftWall)
                                callback(null, allUsers)
                            } else callback(null, [])
                        }
                    })
                },
                getGroupFollowingStatus: function (userId, wallId, instanceId, cb) {
                    window.buildfire.appData.search(
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
                    window.buildfire.appData.search(
                        {
                            filter: {
                                '_buildfire.index.text': params.userId + '-' + params.wallId
                            }
                        }, 'subscribedUsersData', function (err, result) {
                            if (result && result.length) {
                                let data = result[0].data;
                                data.posts.push(params.post);
                                buildfire.appData.update(result[0].id, data, 'subscribedUsersData', (err, posts) => {
                                });
                            }
                        })
                },
                unFollowThread: function (params, callback) {
                    window.buildfire.appData.search(
                        {
                            filter: { '_buildfire.index.text': params.userId + '-' + params.wallId }
                        }, 'subscribedUsersData', function (error, result) {
                            if (error) return console.log(error)
                            if (result && result.length) {
                                let data = result[0].data;
                                data.posts = data.posts.filter(x => x !== params.post);
                                buildfire.appData.update(result[0].id, data, 'subscribedUsersData', (err, posts) => {
                                });
                            }
                        });
                },
                getThreadFollowingStatus: function (userId, threadId, wallId, instanceId, cb) {
                    window.buildfire.appData.search(
                        {
                            // filter: {
                            //     $and: [
                            //         { '_buildfire.index.text': userId + '-' + wallId },
                            //         { '$json.leftWall': { $exists: true, $eq: false } }
                            //     ]
                            // },
                            filter: { '_buildfire.index.text': userId + '-' + wallId }
                        }, 'subscribedUsersData', function (error, result) {
                            if (error) return console.log(error)
                            if (result && result.length) {
                                let data = result[0].data;
                                let exists = data.posts.find(x => x === threadId);
                                if (exists) cb(null, data);
                                else cb(null, null);
                            }
                        });
                }
            }
        })
        .factory("SocialDataStore", ['$q', function ($q) {
            return {
                updatePost: function (postData) {
                    var deferred = $q.defer();
                    buildfire.appData.update(postData.id, postData, 'wall_posts', (error, updatedPost) => {
                        if (error) return deferred.reject(error);
                        return deferred.resolve(updatedPost);
                    });
                    return deferred.promise;
                },
                createPost: function (postData, callback) {
                    var deferred = $q.defer();
                    let composeIndex = function(postData){
                        let array = [];
                        const checkForBadges = (posts) =>{
                            let postsArray = [];
                            let repostsArray = [];
                            posts.forEach(post =>{
                                // if(post.)
                            })
                            buildfire.appData.search({})
                        }
                        array.push({string1: `userId_${postData.userId || ""}`});
                        if(postData.hashtags && postData.hashtags.length > 0){
                            for(let i = 0 ; i < postData.hashtags.length; i++){
                                array.push({string1: `hashtag_${postData.hashtags[i]}`});
                            }
                        }
                        if(postData.taggedPeople && postData.taggedPeople.length > 0 ){
                            for(let i = 0 ; i < postData.taggedPeople.length; i++){
                                array.push({string1: `tagged_${postData.taggedPeople[i]}`});
                            }
                        }
                        if(postData.location){
                            array.push({string1: `location_${postData.location.address}`});
                        }
                        let index = {
                            string1: postData.wid,
                            array1:array
                        }
                        return index;
                    }
                    postData.userToken = postData.userDetails.userToken;
                    postData.userId = postData.userDetails.userId;                    
                    postData.createdOn = new Date();
                    postData.createdBy = postData.userDetails.userId;
                    postData._buildfire = {
                        index: composeIndex(postData)
                    }
                    buildfire.appData.insert(postData, 'wall_posts', (error, result) => {
                        if (error) return deferred.reject(error);
                        if (result && result.id && result.data) {
                            result.data.id = result.id;
                            result.data.uniqueLink = result.id + "-" + result.data.wid;

                            buildfire.appData.update(result.id, result.data, 'wall_posts', (err, posts) => {
                                if (error) return deferred.reject(error);
                                if(postData.hashtags){
                                    console.log("here");
                                    let newDate = new Date();
                                    let tag = "$$$hashtags_count$$$_"+newDate.getDay() + "$" + newDate.getMonth() + "$" + newDate.getYear();
                                    buildfire.appData.search({},tag, (err, results) =>{
                                        if(results && results.length > 0){
                                            let clone = {...results[0].data};
                                            for(let i = 0 ; i < postData.hashtags.length; i++){
                                                if(clone[postData.hashtags[i]]){
                                                    clone[postData.hashtags[i]]+= 1;
                                                }
                                                else{
                                                    clone[postData.hashtags[i]] = 1;
                                                }
                                                if(i === postData.hashtags.length - 1) buildfire.appData.update(results[0].id, clone, tag, (err, res) => deferred.resolve(posts));
                                            }
                                        }
                                        else{
                                            let hashtagsCountObj = {};
                                            for (let i = 0; i < postData.hashtags.length; i++) {
                                                hashtagsCountObj[postData.hashtags[i]] = 1;
                                            }
                                            buildfire.appData.insert(hashtagsCountObj, tag, (err, res) => deferred.resolve(posts))
                                        }
                                    })
                                }
                                else{
                                    console.log("here 2");
                                    deferred.resolve(posts);
                                }
                            });
                        } 
                    });
                    return deferred.promise;
                },
                reportPost: function (data) {
                    buildfire.appData.get('reports_' + data.wid, (err, result) => {
                        if (!result.data.length)
                            buildfire.appData.save([{ ...data }], 'reports_' + data.wid, () => { });
                        else {
                            let alreadyReported = result.data.find(el =>
                                el.reporter === data.reporter && el.postId === data.postId)
                            if (!alreadyReported) {
                                result.data.push(data);
                                buildfire.appData.update(result.id, result.data, 'reports_' + data.wid, (err, saved) => {
                                    buildfire.messaging.sendMessageToControl({ 'name': "POST_REPORTED", wid: data.wid });
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

                    buildfire.appData.getById(data.threadId, 'wall_posts', function (err, post) {
                        if (err) return deferred.reject(err);
                        post.data.comments.push(data);
                        buildfire.appData.update(post.id, post.data, 'wall_posts', function (err, status) {
                            if (err) return deferred.reject(err);
                            else return deferred.resolve(status);
                        });
                    });
                    return deferred.promise;
                },
                getCommentsOfAPost: function (data) {
                    var deferred = $q.defer();
                    buildfire.appData.getById(data.threadId, 'wall_posts', function (error, result) {
                        if (error) return deferred.reject(error);
                        if (result) return deferred.resolve(result.data.comments);
                    });
                    return deferred.promise;
                },
                deletePost: function (postId) {
                    var deferred = $q.defer();
                    buildfire.appData.delete(postId, 'wall_posts', function (error, result) {
                        if (error) return deferred.reject(error);
                        if (result) return deferred.resolve(result);
                    })
                    return deferred.promise;
                },
                deleteComment: function (threadId, comment) {
                    var deferred = $q.defer();
                    buildfire.appData.getById(threadId, 'wall_posts', function (error, result) {
                        if (error) return deferred.reject(error);
                        if (result) {
                            let commentToDelete = result.data.comments.find(element => element.comment === comment.comment)
                            let index = result.data.comments.indexOf(commentToDelete);
                            result.data.comments.splice(index, 1);
                            buildfire.appData.update(result.id, result.data, 'wall_posts', function (error, result) {
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
                _this.socialLanguages = {};
                _this.isPrivateChat = false;
                _this.forcedToLogin = false;
                _this.languages = {};
                _this.showMorePosts = false;
                _this.pageSize = 5;
                _this.page = 0;
            };
            var instance;
            SocialItems.prototype.getUserName = function (userDetails) {
                if(!userDetails) return "Someone"
                let name = null;
                const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                if (userDetails.displayName !== 'Someone' && !re.test(String(userDetails.displayName).toLowerCase())
                    && userDetails.displayName) {
                    name = userDetails.displayName;
                }
                else if (userDetails.firstName !== 'Someone' && !re.test(String(userDetails.firstName).toLowerCase())
                    && userDetails.firstName && userDetails.lastName)
                    name = userDetails.firstName + ' ' + userDetails.lastName;
                
                else if (userDetails.firstName !== 'Someone' && !re.test(String(userDetails.firstName).toLowerCase())
                    && userDetails.firstName)
                    name = userDetails.firstName;
                else if (userDetails.lastName !== 'Someone' && !re.test(String(userDetails.lastName).toLowerCase())
                    && userDetails.lastName)
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
            SocialItems.prototype.getPosts = function (callback) {
                let pageSize = _this.pageSize, page = _this.page;
                let searchOptions = { pageSize, page, sort: { "createdOn": -1 }, recordCount: true }
                window.buildfire.auth.getCurrentUser((err, currentUser) =>{
                    if(currentUser){

                            window.buildfire.appData.search({filter:{"_buildfire.index.string1":currentUser._id}},"SocialUserProfile",(err, results) =>{
                                let and = [{"_buildfire.index.string1":_this.wid === '' ? "" :  { "$regex": _this.wid, "$options": "i" }},{"_buildfire.index.array1.string1":{$ne:`userId_${currentUser._id}`}}];
                                if(results && results.length){
                                    let sp = results[0].data;
                                    let orArray = [];
                                    orArray.push({"_buildfire.index.array1.string1":`tagged_${currentUser._id}`})
                                    sp.following.forEach(x =>{
                                        orArray.push({"_buildfire.index.array1.string1":`userId_${x}`});        
                                    })
                                    sp.interests.forEach(x =>{
                                        orArray.push({"_buildfire.index.array1.string1":`hashtag_${x}`});
                                    })
                                    if(orArray.length > 0) and.push({$or:orArray});

                                }
                                searchOptions.filter = {$and:and};

                                window.buildfire.appData.search(searchOptions, 'wall_posts', (error, data) => {
                                    if (data && data.result.length) {
                                        console.log("data from get posts");
                                        console.log(data);
                                        data.result.map(item => _this.items.push(item.data))
                                        if (data.totalRecord > _this.items.length) {
                                            _this.showMorePosts = true;
                                            _this.page++;
                                        } else _this.showMorePosts = false;
                                        window.buildfire.messaging.sendMessageToControl({
                                            name: 'SEND_POSTS_TO_CP',
                                            posts: _this.items,
                                        });
                                        if (page === 0) startBackgroundService(searchOptions);
                                        else clearInterval(_this.newPostTimerChecker);
                                        $rootScope.$digest();
                                        callback(null, data);
                                    }
                                    else {
                                        console.log("no posts found");
                                        _this.showMorePosts = false;
                                        $rootScope.$digest();
                                        callback(null, [])
                                        //Checking if user comming from notification for thread comment.
                                        startBackgroundService(searchOptions);
                                        if (window.URLSearchParams && window.location.search) {
                                            var queryParamsInstance = new URLSearchParams(window.location.search);
                                            var postId = queryParamsInstance.get('threadPostUniqueLink');
                                            if (postId) location.href = '#/thread/' + postId;
                                        }
                                    }
                                });
                            })  
        
       
                    }
                    else{
                        
                        if (_this.wid === "")
                            searchOptions.filter = { '_buildfire.index.string1': "" }
                        else
                            searchOptions.filter = { "_buildfire.index.string1": { "$regex": _this.wid, "$options": "i" } }
                        buildfire.appData.search(searchOptions, 'wall_posts', (error, data) => {
                            if (error) return console.log(error);
                            console.log("from background service");
                            console.log("data");
                            console.log(data);
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
                                if (page === 0) startBackgroundService(searchOptions);
                                else clearInterval(_this.newPostTimerChecker);
                                $rootScope.$digest();
                                callback(null, data);
                            }
                            else {
                                _this.showMorePosts = false;
                                $rootScope.$digest();
                                callback(null, [])
                                //Checking if user comming from notification for thread comment.
                                startBackgroundService(searchOptions);
                                if (window.URLSearchParams && window.location.search) {
                                    var queryParamsInstance = new URLSearchParams(window.location.search);
                                    var postId = queryParamsInstance.get('threadPostUniqueLink');
                                    if (postId) location.href = '#/thread/' + postId;
                                }
                            }
                        });
                    }

                })
            }

            function startBackgroundService(searchOptions) {
                if (!_this.newPostTimerChecker) {
                    _this.newPostTimerChecker = setInterval(function () {

                        buildfire.appData.search(searchOptions, 'wall_posts', (error, data) => {
                            if (error) return console.log(error);
                            if (data && data.length) {
                                console.log("got data from background service !");
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
                            stringsCopy[defaultKey][newKey] = { defaultValue };
                            if (value) stringsCopy[defaultKey][newKey].value = value;
                        });
                        delete stringsCopy[defaultKey].labels;
                    });
                    let strings = {}
                    strings = Object.assign({}, stringsCopy.userProfile, stringsCopy.activity, stringsCopy.logInBanner, stringsCopy.unfollowModal, stringsCopy.reportPostModal, stringsCopy.blockUserModal, stringsCopy.unblockUserModal, stringsCopy.accountBannedModal);
                    Object.keys(strings).forEach(e => {
                        strings[e].value ? _this.languages[e] = strings[e].value : _this.languages[e] = strings[e].defaultValue;
                    });
                } else {
                    let strings = {};
                    if (response.data && response.data.mainWall && response.data.sideThread && response.data.members && response.data.input && response.data.modal)
                        Object.assign({},  response.data.userProfile,  response.data.activity,  response.data.logInBanner,  response.data.unfollowModal,  response.data.reportPostModal,  response.data.blockUserModal,  response.data.unblockUserModal,  response.data.accountBannedModal);
                    else
                        strings = Object.assign({},  stringsConfig.userProfile,  stringsConfig.activity,  stringsConfig.logInBanner,  stringsConfig.unfollowModal,  stringsConfig.reportPostModal,  stringsConfig.blockUserModal,  stringsConfig.unblockUserModal,  response.data.accountBannedModal);

                    Object.keys(strings).forEach(e => {
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
                        if(err) return console.error(err);
                        let lastInHistory = history[history.length - 1];
                        let wallId = '';
                        if (lastInHistory && lastInHistory.options.pluginData 
                            && lastInHistory.options.pluginData.queryString) {
                                wallId = new URLSearchParams(lastInHistory.options.pluginData.queryString).get('wid');
                                wallId = wallId ? wallId : '';
                            }

                        if (!_this.wid) {
                            _this.wid = Util.getParameterByName("wid") ? 
                            Util.getParameterByName("wid") : wallId;
                            _this.mainWallID = _this.wid;
                        }

                        if (_this.wid.length === 48) {
                            _this.isPrivateChat = true;
                        }

                        buildfire.datastore.get("languages", (err, languages) => {
                            if (err) return console.log(err)
                            console.log("languages from app services");
                            _this.socialLanguages = languages.data;
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
