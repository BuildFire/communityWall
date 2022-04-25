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
                go: function (path, options = {}) {
                    _location.href = path;
                    let label;
                    if(path.includes('thread')) label.push('thread');
                    else if(path.includes('members')) label.push('members');
                    else{
                        label = path
                    } 
                    buildfire.history.push(label, options);
                },
                goToHome: function () {
                    buildfire.history.get({
                        pluginBreadcrumbsOnly: true
                    }, function (err, result) {
                        result.forEach(buildfire.history.pop());
                    });
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
                    params._buildfire = {index:{
                        array1:[{
                            string1:`fromUser_${params.fromUser.userId}`
                        },{                            
                            string1:`toUser_${params.toUser.userId}`
                        },
                        {
                            string1:`type_${params.type}`
                        }
                    ]
                    }}
                    buildfire.publicData.insert(params, "ProfileActivity", function(err, res){
                        err ? callback(err) : callback(null, res)
                    })
                },
                search: function(params, callback){
                    buildfire.publicData.search(params, "ProfileActivity", function(err, res){
                        err ? callback(err) : callback(null, res)
                    })
                },
                delete: function(id, callback){
                    buildfire.publicData.delete(id, "ProfileActivity", function(err, res){
                        err ? callback(err) : callback(null, res)
                    })
                },
            }
        }])
        .factory("ProfileSocialBadges",['$rootScope', function($rootScope){
            return{
                add: function(params, callback){
                    buildfire.publicData.insert(params, "ProfileSocialBadges", function(err, res){
                        err ? callback(err) : callback(null, res)
                    })
                },
                search: function(params, callback){
                    buildfire.publicData.search(params, "ProfileSocialBadges", function(err, res){
                        err ? callback(err) : callback(null, res)
                    })
                },
                delete: function(id, callback){
                    buildfire.publicData.delete(id, "ProfileSocialBadges", function(err, res){
                        err ? callback(err) : callback(null, res)
                    })
                },
            }
        }])
        .factory("SocialUserProfile", ['$rootScope', 'Location', function($rootScope, Location){
            return{
                init: function(params, callback = () => {}){
                    window.buildfire.publicData.search({filter:{
                        "_buildfire.index.string1" : params.userId,
                    }}, "SocialUserProfile", function(err, data){
                        if(err || data.length == 0){
                            window.buildfire.publicData.insert(params, "SocialUserProfile", () =>{

                            });
                        }
                        else{
                        }
                    })
                },
                insert: function(params) {
                    return new Promise((resolve, reject) => {
                        window.buildfire.publicData.insert(params, "SocialUserProfile", ((err, data) =>{
                            if (err) {
                                return reject(err);
                            }
                            resolve(data);
                        }));
                    })
                },
                update: function(params, callback){
                    window.buildfire.publicData.update(params.id, params.data, "SocialUserProfile", function(err, data){
                        if(err) return callback(err);
                        else return callback(null, data)
                    })
                },
                search: function(options, callback){
                    window.buildfire.publicData.search(options, "SocialUserProfile", function(err, data){
                        if(err) {
                            return callback(err, null)
                        } 
                        return callback(null, data);
                        
                    })
                },
                get: function(userId, callback){                    
                    let options = {
                        filter:{
                            "_buildfire.index.string1":userId
                        }
                    }
                        window.buildfire.publicData.search(options, "SocialUserProfile", function(err, data){
                        if(err || data.length == 0){
                            return callback(err, null)
                        }
                        else{
                            if(data[0].data.badges.length > 0){
                                let shouldUpdate = false;
                                let clone = JSON.parse(JSON.stringify(data[0]))
                                let sp = clone.data.badges;
                                let originalLength = data[0].data.badges.length;
                                
                                sp.forEach((badge,index) =>{
                                    if (!badge) {
                                        return;
                                    }

                                    buildfire.publicData.getById(badge.badgeData, "SocialBadges", (err, res) =>{
                                        if(res && res.data && Object.keys(res.data).length > 0){
                                            const badgeDataId = clone.data.badges[index].badgeData;
                                            clone.data.badges[index].badgeData = {
                                                id: badgeDataId,
                                                ...res.data 
                                            }; 
                                        }
                                        else{
                                            shouldUpdate = true;
                                            clone.data.badges.splice(index, 1);
                                            data[0].data.badges.splice(index,1);
                                        }
                                        if(index === originalLength - 1){
                                            data[0].data.badgesWithData = clone.data.badges;
                                            callback(null, data[0]);
                                            // if(shouldUpdate){
                                                buildfire.publicData.update(data[0].id, data[0].data, "SocialUserProfile", () =>{})
                                            // }
                                        }                                        
                                    })
                                    
                                })

                            }
                            else{
                                return callback(null, data[0]);                                
                            }
                        }
                    })
                },

                blockUser: function(userId, callback, callbackaboutotherUser){
                
                    window.buildfire.auth.getCurrentUser((err, currentUser) =>{
                        if(err || !currentUser) return callback("Must be logged in");
                        else {
                            window.buildfire.publicData.search({filter:{"_buildfire.index.string1":currentUser._id}}, "SocialUserProfile", function(err, socialProfile){
                                if(err || socialProfile.length == 0) return callback("error");
                                else{
                                    let social = socialProfile[0];
                                    social.data.blockedUsers.push(userId);
                                        buildfire.publicData.search({filter:{
                                            $and:[
                                                {"_buildfire.index.string1":""},
                                                {"_buildfire.index.array1.string1":`userId_${currentUser._id}`}
                                                ]
                                            }},    "subscribedUsersData", (err, res) =>{
                                                res[0].data._buildfire.index.array1.push({string1:`blocked_${userId}`});
                                                buildfire.publicData.update(res[0].id, res[0].data, "subscribedUsersData", () =>{})
                                            });
                                                                 
                                    let index = social.data.following.findIndex(e => e === userId);
                                    if(index >= 0){
                                        social.data.following.splice(index, 1);
                                    }
                                    index = social.data.followers.findIndex(e => e === userId);
                                    if(index >= 0){
                                        social.data.followers.splice(index, 1);
                                    }
                                    index = social.data.pendingFollowers.findIndex(e => e === userId);
                                    if(index >= 0){
                                        social.data.pendingFollowers.splice(index, 1);
                                    }
                                    
                                    window.buildfire.publicData.update(social.id, social.data, "SocialUserProfile", (err, succ) =>{
                                        if(err)  callback(err);
                                        else  callback(null, succ);
                                        window.buildfire.publicData.search({filter:{"_buildfire.index.string1":userId}}, "SocialUserProfile", function(err, socialProfile){
                                            let social = socialProfile[0];
                                            let index = social.data.following.findIndex(e => e === currentUser._id);
                                            if(index >= 0){
                                                social.data.following.splice(index, 1);
                                            }
                                            index = social.data.followers.findIndex(e => e === currentUser._id);
                                            if(index >= 0){
                                                social.data.followers.splice(index, 1);
                                            }
                                            index = social.data.pendingFollowers.findIndex(e => e === currentUser._id);
                                            if(index >= 0){
                                                social.data.pendingFollowers.splice(index, 1);
                                            }
                                            window.buildfire.publicData.update(social.id, social.data, "SocialUserProfile", (err, data) =>{
                                                if(callbackaboutotherUser) callbackaboutotherUser(err, data);
                                            });
                                        });
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
                            window.buildfire.publicData.search({filter:{"_buildfire.index.string1":currentUser._id}}, "SocialUserProfile", function(err, socialProfile){
                                if(err || socialProfile.length == 0) return callback("error");
                                else{
                                    let social = socialProfile[0];
                                    let index = social.data.blockedUsers.findIndex(e => e === userId);
                                    if(index >= 0){
                                        buildfire.publicData.search({filter:{
                                            $and:[
                                                {"_buildfire.index.string1":""},
                                                {"_buildfire.index.array1.string1":`userId_${currentUser._id}`}
                                                ]
                                            }},    "subscribedUsersData", (err, res) =>{
                                                let index = res[0].data._buildfire.index.array1.findIndex(e => e.string1 === `blocked_${userId}`);
                                                if(index >=0) res[0].data._buildfire.index.array1.splice(index, 1);
                                                buildfire.publicData.update(res[0].id, res[0].data, "subscribedUsersData", () =>{})
                                            });
                                        social.data.blockedUsers.splice(index, 1);
                                        window.buildfire.publicData.update(social.id, social.data, "SocialUserProfile", (err, succ) =>{
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
                    window.buildfire.publicData.search({filter:{"_buildfire.index.string1":userId}},"SocialUserProfile",(err, results) =>{
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
                    window.buildfire.publicData.search({filter:{"_buildfire.index.string1":userId}}, "SocialUserProfile", function(err, socialProfile){
                        if(socialProfile.length > 0){
                            let temp = socialProfile[0];
                            let data = temp.data;
                            data.isPublicProfile = !data.isPublicProfile;
                            if(data.isPublicProfile){
                                data.followers.push(...data.pendingFollowers);
                                data.pendingFollowers = [];

                            }                            
                            window.buildfire.publicData.update(temp.id, data , "SocialUserProfile",(err, res) =>{
                                err ? callback(err) : callback(null, res);
                            });
                            if(data.isPublicProfile){
                                window.buildfire.publicData.search({filter:{"_buildfire.index.array1.string1":"toUser_"+data.userId}}, "ProfileActivity",(err, data) =>{
                                    if(data && data.length > 0){
                                        data.forEach(item =>{
                                            if(item && item.data.type === 'pendingFollow'){
                                                let data = {...item.data};
                                                data.type = "follow";
                                                window.buildfire.publicData.update(item.id, data, "ProfileActivity", () =>{});
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
                followUnfollowUser: function(params, callback, callbackForCurrentUser = null){
                    window.buildfire.publicData.search({filter:{"_buildfire.index.string1":params.userId}}, "SocialUserProfile", function(err, socialProfile){
                        socialProfile = socialProfile[0];
                        if(socialProfile && socialProfile.data){
                            let followers;
                            let updatedObj = {...socialProfile.data};
                            if(socialProfile.data.isPublicProfile){
                                followers = socialProfile.data.followers;
                                let index = followers.findIndex(e => e === params.currentUser);
                                if(index == -1){
                                    updatedObj.followers.push(params.currentUser);
                                }
                                else{
                                    updatedObj.followers.splice(index, 1);
                                }
                                window.buildfire.publicData.update(socialProfile.id, updatedObj, "SocialUserProfile", (err, data) =>{
                                    err ? callback(err) : callback(null, data);
                                    window.buildfire.publicData.search({filter:{"_buildfire.index.string1":params.currentUser}} , "SocialUserProfile", (err, results) =>{
                                        let p = results[0];
                                        if(index == -1) p.data.following.push(params.userId);
                                        else p.data.following.splice(index,1);
                                        window.buildfire.publicData.update(p.id, p.data, "SocialUserProfile", (err, results) =>{
                                            if(callbackForCurrentUser) callbackForCurrentUser(err, results);
                                        })
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

                                window.buildfire.publicData.update(socialProfile.id, updatedObj, "SocialUserProfile", (err, data) =>{
                                    err ? callback(err) : callback(null, data);
                                    window.buildfire.publicData.search({filter:{"_buildfire.index.string1":params.currentUser}} , "SocialUserProfile", (err, results) =>{
                                        let p = results[0];
                                        if(index == -1 && index2 >= 0) p.data.following.splice(index2, 1);

                                        window.buildfire.publicData.update(p.id, p.data, "SocialUserProfile", (err, results) =>{
                                            if(callbackForCurrentUser) callbackForCurrentUser(err, results)
                                        });
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
                    window.buildfire.publicData.search({filter:{"_buildfire.index.string1":currentUserId}}, "SocialUserProfile", function (err, results){
                        if(err) return callback(err);
                        else if(!results || (results && results.length == 0)){
                            return callback("error");
                        }
                        else{
                            let socialProfile = results[0].data;
                            let index = socialProfile.pendingFollowers.findIndex(e => e === userId);
                            socialProfile.pendingFollowers.splice(index);
                            socialProfile.followers.push(userId)
                            window.buildfire.publicData.update(results[0].id, socialProfile, "SocialUserProfile", (err, res) =>{
                                callback(err ? err : null, res);
                                // update profile activity 
                                let newParams = {
                                    fromUser: params.currentUser,
                                    toUser: params.user,
                                    type: "acceptedFollowRequest",
                                    createdOn: new Date(),
                                    createdBy: params.currentUser.userId,
                                }
                                window.buildfire.publicData.insert(newParams, "ProfileActivity", () =>{});
                                window.buildfire.publicData.search({filter:{
                                $and:[
                                    {"_buildfire.index.array1.string1":"fromUser_"+ params.user.userId},
                                    {"_buildfire.index.array1.string1": "toUser_"+ params.currentUser.userId},
                                    {"_buildfire.index.array1.string1": "type_pendingFollow"}
                                ]
                                    
                                }} , "ProfileActivity", (err, data) =>{
                                    if(data && data.length > 0){
                                        data.forEach(item =>{
                                            window.buildfire.publicData.update(item.id, {...item.data, type: "follow"}, "ProfileActivity", () =>{});
                                        })
                                    }
                                }
                                )
                            })
                            window.buildfire.publicData.search({filter:{"_buildfire.index.string1":params.user.userId}}, "SocialUserProfile", (err, results) =>{
                                let profile = results[0].data;
                                profile.following.push(params.currentUser.userId);
                                window.buildfire.publicData.update(results[0].id, profile, "SocialUserProfile", (err, data) =>{
    
                                });
                            })
                        }
                    })
                },
                declineFollowRequest: function(params, callback){
                    let currentUserId = params.currentUserId;
                    let userId = params.userId;
                    window.buildfire.publicData.search({filter:{"_buildfire.index.string1":currentUserId}}, "SocialUserProfile", function (err, results){
                        if(err) return callback(err);
                        else if(!results || (results && results.length == 0)){
                            return callback("error");
                        }
                        else{
                            let socialProfile = results[0].data;
                            let index = socialProfile.pendingFollowers.findIndex(e => e === userId);
                            socialProfile.pendingFollowers.splice(index);
                            window.buildfire.publicData.update(results[0].id, socialProfile, "SocialUserProfile", (err, res) =>{
                                callback(err ? err : null, res);
                                window.buildfire.publicData.search({filter:{
                                    $and:[
                                        {"_buildfire.index.array1.string1":"fromUser_"+ params.userId},
                                        {"_buildfire.index.array1.string1": "toUser_"+params.currentUserId},
                                        {"_buildfire.index.array1.string1": "type_pendingFollow"}
                                    ]
                                        
                                    }} , "ProfileActivity", (err, data) =>{
                                        if(data && data.length > 0){
                                            data.forEach(item =>{
                                                window.buildfire.publicData.delete(item.id, "ProfileActivity", () =>{});
                                            })
                                        }
                                    }
                                    )
                            })
                        }
                    })
                },

            }
        }])

        .factory("SubscribedUsersData", function () {
            return {
                get: function(userId, callback){

                    window.buildfire.publicData.search({filter:{$and:[{"_buildfire.index.array1.string1":`userId_${userId}`}, {"_buildfire.index.string1":""}]}}, 'subscribedUsersData', function (err, data) {
                        if(err) callback ? callback(err) : console.error(err);
                        else if(data && data.length > 0){
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
                    window.buildfire.publicData.insert(params, 'subscribedUsersData', function (err, data) {
                        if (err) callback(err);
                        else {
                            callback();
                        }
                    });
                },
                searchAndUpdate: function (search, obj) {
                    return new Promise( (resolve, reject) => {
                        window.buildfire.publicData.searchAndUpdate(search, obj, 'subscribedUsersData', function (err, data) {
                            if (err) return reject(err);
                            
                            resolve(data);
                        });
                    })
                },
                unfollowWall: function (userId, wallId, banUser, callback) {
                    window.buildfire.publicData.search(
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

                                    buildfire.publicData.save(toSave, 'subscribedUsersData', (err, result) => {
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
                                buildfire.publicData.update(data[0].id, data[0].data, 'subscribedUsersData', (err, result) => {
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
                        window.buildfire.publicData.search(
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
                    let tempArray = [];
                    for(let i = 0 ; i < array.length ; i++){
                        tempArray.push(`userId_${array[i]}`);
                    }
                    window.buildfire.publicData.search({filter:{$and:[{"_buildfire.index.string1":""},{"_buildfire.index.array1.string1":{$in:tempArray}}]}}, "subscribedUsersData", function(err, data){
                        if(err) return cb(err);
                        else if(data && data.length){
                            return cb(null, data)
                        }
                        else{
                            return cb(null, []);
                        }
                    })
                },
                getUsers: function(options, cb, userId = null){
                    window.buildfire.publicData.search(options, "subscribedUsersData", function (err, users){
                        if(err) return cb(err);
                        else{
                            if(userId){
                                let results = [];
                                users.map(e => {
                                    if(userId){
                                        if(e.data._buildfire.index.array1 && e.data._buildfire.index.array1.findIndex(e=> e.string1 === `blocked_${userId}`) < 0){
                                            results.push(e);
                                        }
                                    }
                                    else{
                                        results.push(e)
                                    }
                                })
                                return cb(null, results)

                            }
                            else{
                                return cb(null, users)
                            }
                        } 
                    })
                },
                searchForUsers: function (query, callback) {
                    window.buildfire.publicData.search(query, 'subscribedUsersData', function (err, data) {
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
                                });
                            }
                        });
                },
                getThreadFollowingStatus: function (userId, threadId, wallId, instanceId, cb) {
                    window.buildfire.publicData.search(
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
        .factory("SocialDataStore", ['$rootScope','$q', function ($rootScope, $q) {
            return {
                updatePost: function (postData) {
                    delete postData._buildfire;
                    let composeIndex = function(postData){
                        let array = [];
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
                    postData._buildfire = {
                        index: composeIndex(postData)
                    }
                    var deferred = $q.defer();
                    buildfire.publicData.update(postData.id, postData, 'wall_posts', (error, updatedPost) => {
                        if (error) return deferred.reject(error);
                        return deferred.resolve(updatedPost);
                    });
                    return deferred.promise;
                },
                createPrivatePost: function(postData){
                    var deferred = $q.defer();
                    postData.userToken = postData.userDetails.userToken;
                    postData.userId = postData.userDetails.userId;
                    postData.createdOn = new Date();
                    postData.createdBy = postData.userDetails.userId;
                    postData._buildfire = {
                        index: {
                            string1: postData.wid,
                        }
                    }
                    buildfire.publicData.insert(postData, 'wall_posts', (error, result) => {
                        if (error) return deferred.reject(error);
                        if (result && result.id && result.data) {
                            result.data.id = result.id;
                            result.data.uniqueLink = result.id + "-" + result.data.wid;
                            buildfire.publicData.update(result.id, result.data, 'wall_posts', (err, posts) => {
                                if (error) return deferred.reject(error);
                                return deferred.resolve(posts);
                            });
                        }else{
                            deferred.reject("");
                        }
                    });
                    return deferred.promise;

                },
                datesAreOnSameDay: (first, second) =>{
                    if(first.getFullYear() === second.getFullYear() &&first.getMonth() === second.getMonth() &&first.getDate() === second.getDate()){
                        return true;
                    }              
                    else {
                        return false;
                    }
                },
                checkForStreak: function(userId, post){
                    buildfire.publicData.search({filter:{
                        $and:[
                            {"_buildfire.index.string1":""},
                            {"_buildfire.index.array1.string1":`userId_${userId}`},
                            {"$json.createdOn":{$gt:new Date(Date.now() - 24*60*60 * 1000 * 2)}}
                        ]
                    }
                    },"wall_posts",(err, results) =>{
                        buildfire.publicData.search({filter:{
                            "_buildfire.index.string1":userId
                        }},"SocialUserProfile", (err, profiles) =>{
                            if(profiles && profiles.length > 0){
                                console.log(profiles);
                                let profile = profiles[0];
                                console.log(this.datesAreOnSameDay(new Date(profile.data.lastUpdatedOn), new Date(post.createdOn)));
                                console.log(new Date(profile.data.lastUpdatedOn));
                                console.log( new Date(post.createdOn));
                                if(!this.datesAreOnSameDay(new Date(profile.data.lastUpdatedOn), new Date(post.createdOn))){
                                    if(!profile.data.streak){
                                        profile.data.streak = 1;
                                        profile.data.highestStreak = 1;
                                    }
                                    else{
    
                                        if(results && results.length > 0){
                                            profile.data.streak++;
                                            if(profile.data.streak > profile.data.highestStreak)
                                                profile.data.highestStreak = profile.data.streak;
                                        }
                                        else{
                                            profile.data.streak = 1;
                                            if(profile.data.streak > profile.data.highestStreak)
                                                profile.data.highestStreak = profile.data.streak;
                                        }
                                    }
                                    profile.data.lastUpdatedOn = new Date();
                                    buildfire.publicData.update(profile.id, profile.data, "SocialUserProfile", console.log)
                                }
                            }

                        })
                        
                    })
                },
                checkForBadges : function(userId, callback){
                    let filter = {
                        $and:[
                            {"_buildfire.index.array1.string1": `userId_${userId}`},
                            {"$json.createdOn":{$gt:new Date(Date.now() - 24*60*60 * 1000)}},
                            {"_buildfire.index.string1":""}
                        ]
                    }
                    buildfire.publicData.search({filter:filter},"wall_posts",(err, posts) =>{
                            if(err || (posts && posts.length == 0)){
                                callback(true)
                            }
                            else{
                                let postsArray = [];
                                let repostsArray = [];
                                for (let i = 0; i < posts.length; i++) {
                                    if(posts[i].data.originalPost && Object.keys(posts[i].data.originalPost).length){
                                        repostsArray.push(posts[i]);
                                    }
                                    else{
                                        postsArray.push(posts[i]);
                                    }
                                }

                                buildfire.publicData.search({},"SocialBadges",(err, badges) =>{
                                    if(badges && badges.length > 0){
                                        let options = {
                                            filter:{
                                                "_buildfire.index.string1":userId,
                                            }
                                        }
                                        window.buildfire.publicData.search(options, "SocialUserProfile", function(err, socialProfile){
                                            if(!err && socialProfile && socialProfile.length > 0){
                                                if(err || !badges || (badges && badges.length == 0)) callback(true)
                                                else{
                                                    let mySocialProfile = socialProfile[0];
                                                    let myBadges = mySocialProfile.data.badges;
                                                    badges.forEach(badge =>{
                                                        let wonBadge = true;
                                                        console.log(myBadges);
                                                        console.log(badge);
                                                        let index = myBadges.findIndex(e => e && e.badgeData === badge.id);
                                                        console.log(index);
                                                        if(index < 0){
                                                            if(badge.data.conditions.posts.isTurnedOn){
                                                                if(postsArray.length > badge.data.conditions.posts.value){
                                                                    wonBadge = true
                                                                }
                                                                else{
                                                                    wonBadge = false;
                                                                }
                                                            }
                                                            if(badge.data.conditions.reposts.isTurnedOn){
                                                                if(repostsArray.length > badge.data.conditions.reposts.value){
                                                                    wonBadge = true;
                                                                }
                                                                else {
                                                                    wonBadge = false
                                                                }
                                                            }
                                                            if(badge.data.conditions.reactions.isTurnedOn){
                                                                ReactionsUI.getUserReactionsCount(mySocialProfile.data.userId, (count) =>{
                                                                    if(count > badge.data.conditions.reactions.value){
                                                                        $rootScope.wonBadge =  badge;
                                                                        $rootScope.$digest();
                                                                    }
                                                                })
                                                            }
                                                            else{
                                                                if(wonBadge){
                                                                    $rootScope.wonBadge =  badge;
                                                                }
                                                                $rootScope.$digest();
                                                            }
                                                        }
                                                    })
                                                    callback(true)
                                                }
                                            }
                                            else{
                                                callback(true)
                                            }
                                        })
                                    }
                                    else{
                                        callback(true)
                                    }
                                })
                            }
                        })
                },
                createPost: function (postData, callback) {
                    var deferred = $q.defer();
                    let composeIndex = function(postData){
                        let array = [];
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
                    postData.repostsCount = 0;
                    postData.sharesCount = 0;
                    postData.repliesCount = 0;
                    postData._buildfire = {
                        index: composeIndex(postData)
                    }
                    buildfire.publicData.insert(postData, 'wall_posts', (error, result) => {
                        this.checkForStreak(postData.userId, postData);
                        this.checkForBadges(postData.userId, (isFinished) =>{
                            if(isFinished){
                                if (error) return deferred.reject(error);
                                if (result && result.id && result.data) {
                                    result.data.id = result.id;
                                    result.data.uniqueLink = result.id + "-" + result.data.wid;
        
                                    buildfire.publicData.update(result.id, result.data, 'wall_posts', (err, posts) => {
                                        if (error) return deferred.reject(error);
                                        if(postData.hashtags && postData.hashtags.length > 0){
                                            let newDate = new Date();
                                            let tag = "$$$hashtags_count$$$_"+newDate.getDay() + "$" + newDate.getMonth() + "$" + newDate.getYear();
                                            buildfire.publicData.search({},tag, (err, results) =>{
                                                if(results && results.length > 0){
                                                    let clone = {...results[0].data};
                                                    for(let i = 0 ; i < postData.hashtags.length; i++){
                                                        if(clone[postData.hashtags[i]]){
                                                            clone[postData.hashtags[i]]+= 1;
                                                        }
                                                        else{
                                                            clone[postData.hashtags[i]] = 1;
                                                        }
                                                        if(i === postData.hashtags.length - 1) buildfire.publicData.update(results[0].id, clone, tag, (err, res) => deferred.resolve(posts));
                                                    }
                                                }
                                                else{
                                                    let hashtagsCountObj = {};
                                                    for (let i = 0; i < postData.hashtags.length; i++) {
                                                        hashtagsCountObj[postData.hashtags[i]] = 1;
                                                    }
                                                    buildfire.publicData.insert(hashtagsCountObj, tag, (err, res) => deferred.resolve(posts))
                                                }
                                                
                                            })
                                        }else{
                                            return deferred.resolve(posts);
                                        }
                                    });
                                } 
                            }
                        });
                    });
                    return deferred.promise;
                },
                reportPost: function (data) {
                    buildfire.publicData.get('reports_' + data.wid, (err, result) => {
                        if (!result.data.length)
                            buildfire.publicData.save([{ ...data }], 'reports_' + data.wid, () => { });
                        else {
                            let alreadyReported = result.data.find(el =>
                                el.reporter === data.reporter && el.postId === data.postId)
                            if (!alreadyReported) {
                                result.data.push(data);
                                buildfire.publicData.update(result.id, result.data, 'reports_' + data.wid, (err, saved) => {
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

                    buildfire.publicData.getById(data.threadId, 'wall_posts', function (err, post) {
                        if (err) return deferred.reject(err);
                        post.data.comments.push(data);
                        buildfire.publicData.update(post.id, post.data, 'wall_posts', function (err, status) {
                            if (err) return deferred.reject(err);
                            else return deferred.resolve(status);
                        });
                    });
                    return deferred.promise;
                },
                getCommentsOfAPost: function (data) {
                    var deferred = $q.defer();
                    buildfire.publicData.getById(data.threadId, 'wall_posts', function (error, result) {
                        if (error) return deferred.reject(error);
                        if (result) return deferred.resolve(result.data.comments);
                    });
                    return deferred.promise;
                },
                deletePost: function (postId) {
                    var deferred = $q.defer();
                    buildfire.publicData.delete(postId, 'wall_posts', function (error, result) {
                        if (error) return deferred.reject(error);
                        if (result) return deferred.resolve(result);
                    })
                    return deferred.promise;
                },
                deleteComment: function (threadId, comment) {
                    var deferred = $q.defer();
                    buildfire.publicData.getById(threadId, 'wall_posts', function (error, result) {
                        if (error) return deferred.reject(error);
                        if (result) {
                            let commentToDelete = result.data.comments.find(element => element.comment === comment.comment)
                            let index = result.data.comments.indexOf(commentToDelete);
                            result.data.comments.splice(index, 1);
                            buildfire.publicData.update(result.id, result.data, 'wall_posts', function (error, result) {
                                return deferred.resolve(result.data.comments);
                            })
                        }
                    });
                    return deferred.promise;
                }
            }
        }])
        .factory('SocialBuddies',['$rootScope','$timeout','SocialItems', function($rootScope, $timeout, SocialItems){
            return{
                init: function(userId, callback){
                    let obj = {
                        createdOn: new Date(),
                        createdBy: userId,
                        userId: userId,
                        _buildfire:{
                            index:{
                                string1: userId,
                            }
                        }
                    }
                    buildfire.publicData.insert(obj, 'SocialBuddies', (err, res) =>{
                        return callback(err, res);
                    })
                },
                search: function(userId, callback){
                    buildfire.publicData.search({filter:{"_buildfire.index.string1":userId}}, "SocialBuddies",(err, data) =>{
                        return callback(err, data);
                    })
                },
                withUser: function(currentUser, targetUser, callback){
                    buildfire.publicData.search({filter:{"_buildfire.index.string1":currentUser}}, "SocialBuddies",(err, data) =>{
                        if(err) return callback(err);
                        else if(data && data.length > 0){
                            let curr = data[0].data;
                            if(curr[targetUser]){
                                curr[targetUser] += 1;
                            }
                            else{
                                curr[targetUser] = 1;
                            }
                            buildfire.publicData.update(data[0].id, curr, "SocialBuddies", (err, data) =>{
                                return callback(err, data);
                            })
                        }
                    })
                },
                interact: function(currentUser, targetUser, callback){
                    this.search(currentUser, (err, data) =>{
                        if(err || !data || (data && data.length == 0)){
                            this.init(currentUser, (err, data) =>{
                                this.withUser(currentUser, targetUser, (err, data) =>{
                                    return callback(err,data);
                                })
                            })
                        } 
                        else{
                            this.withUser(currentUser, targetUser, (err, data) =>{
                                return callback(err,data);
                            })
                        }
                    })

                }
            }
        }])
        .factory('SocialItems', ['Util', '$rootScope','$timeout', function (Util, $rootScope, $timeout) {
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
                _this.SocialIcons = {};
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
                    let location = {
                        address: user.userProfile.address && user.userProfile.address.fullAddress ?  user.userProfile.address.fullAddress :  null,
                        lat: user.userProfile.address && user.userProfile.address.geoLocation && user.userProfile.address.geoLocation.lat ?  user.userProfile.address.geoLocation.lat :  null,
                        lng: user.userProfile.address && user.userProfile.address.geoLocation && user.userProfile.address.geoLocation.lng ?  user.userProfile.address.geoLocation.lng :  null,
                    }
                    _this.userDetails = {
                        userToken: user.userToken,
                        userId: user._id,
                        email: user.email,
                        firstName: user.firstName ? user.firstName : "",
                        lastName: user.lastName ? user.lastName : "",
                        displayName: user.displayName ? user.displayName : "",
                        location:  location,
                        imageUrl: user.imageUrl,
                        userTags: user.tags ? user.tags : {},
                        bio: user.userProfile && user.userProfile.bio? user.userProfile.bio : "",
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
                        user.userProfile = user.userProfile? user.userProfile : {};
                        if (user.userProfile.bio) {
                            prepareData(user);
                            return callback(null, user);
                        }

                        buildfire.auth.getUserProfile({ userId: user._id }, function (err, userProfile) {
                            if (err) return callback(err, null);
                            user.userProfile.bio = userProfile.bio;
                            prepareData(user);
                            return callback(null, user);
                        });
                        
                    } else {
                        _this.forcedToLogin = false;
                        callback(null, null);
                    }
                });
            }
            SocialItems.prototype.getPosts = function (callback, clear = false) {

                $timeout(function(){
                    $rootScope.$digest();
                })
                const getPostLikes = (id, callback) =>{
                    buildfire.publicData.aggregate(
                        {
                          pipelineStages: [
                            { $match: { 
                              "_buildfire.index.string1":id,
                            }},
                            { $group: { _id: null, totalCount: { $sum: 1 } } }
                          ],
                        },
                        "$$reactions$$",
                        (err, result) => {
                            if(result && result.length > 0 && result[0].totalCount) return callback(result[0].totalCount);
                            else return callback(0);
                          }
                      );
                }
                let pageSize = _this.pageSize, page = _this.page;
                let searchOptions = { pageSize, page, sort: { "createdOn": -1 }, recordCount: true }
                window.buildfire.auth.getCurrentUser((err, currentUser) =>{
                    if(currentUser){
                            window.buildfire.publicData.search({filter:{"_buildfire.index.string1":currentUser._id}},"SocialUserProfile",(err, results) =>{
                                let and = [{"_buildfire.index.string1":""}];
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
                                    orArray.push({"_buildfire.index.array1.string1":`userId_${currentUser._id}`});
                                    and.push({$or:orArray});
                                }
                                searchOptions.filter = {$and:and};
                                window.buildfire.publicData.search(searchOptions, 'wall_posts', (error, data) => {
                                    if (data && data.result.length) {
                                        ReactionsUI.getReactions(currentUser._id,data.result, (err, reactions) =>{
                                            for (let i = 0; i < data.result.length; i++) {
                                                let item = data.result[i];                                                
                                                if(reactions){
                                                    let index = reactions.findIndex(e => e.data.id === item.data.id); 
                                                    if(index >= 0){
                                                        item.data.liked = true;
                                                        item.data.DBReactionId = reactions[index].id;
                                                    }
                                                    else{
                                                        item.data.liked = false;
                                                        item.data.DBReactionId = "";
                                                    }
                                                }
                                                else{                                                    
                                                    item.data.liked = false;
                                                    item.data.DBReactionId = "";
                                                }
                                                _this.items.push(item.data);                                                
                                            }
                                            for(let i = 0 ; i < _this.items.length ; i++){
                                                let item = _this.items[i];
                                                getPostLikes(item.id, (count) =>{
                                                    item.likesCount = count;
                                                    if(i === _this.items.length - 1){
                                                        $timeout(function(){
                                                            $rootScope.$digest();
                                                            callback(null, data);
                                                        })
    
                                                    }
                                                });
                                            }
                                                
                                           
                                            
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
                                        });
                                    }
                                    else {
                                        _this.showMorePosts = false;
                                        $rootScope.$digest();
                                        callback(null, [])
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
                        searchOptions.filter = { '_buildfire.index.string1': "" }
                        buildfire.publicData.search(searchOptions, 'wall_posts', (error, data) => {
                            if (error) return console.log(error);
   
                            if (data && data.result.length) {
                                for (let i = 0; i < data.result.length; i++) {
                                    let item = data.result[i];                                                
                                    item.data.liked = false;
                                    item.data.DBReactionId = "";                                
                                    _this.items.push(item.data);                                                
                                }
                                for(let i = 0 ; i < _this.items.length ; i++){
                                    let item = _this.items[i];
                                    getPostLikes(item.id, (count) =>{
                                        item.likesCount = count;
                                        if(i === _this.items.length - 1){
                                            $timeout(function(){
                                                $rootScope.$digest();
                                                callback(null, data);
                                            })

                                        }
                                    });
                                }
                                data.result.map(item =>{
                                    getPostLikes(item.data.id, (count) =>{
                                        item.data.likesCount = count;
                                        _this.items.push(item.data);
                                    });  
                                    callback(null, data);
                                })
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
            SocialItems.prototype.getPost = function (postId, callback) {
                const getPostLikes = (id, callback) =>{
                    buildfire.publicData.aggregate(
                        {
                          pipelineStages: [
                            { $match: { 
                              "_buildfire.index.string1":postId,
                            }},
                            { $group: { _id: null, totalCount: { $sum: 1 } } }
                          ],
                        },
                        "$$reactions$$",
                        (err, result) => {
                            if(result && result.length > 0 && result[0].totalCount) return callback(result[0].totalCount);
                            else return callback(0);
                          }
                      );
                }
                buildfire.auth.getCurrentUser((err, currentUser) =>{
                    window.buildfire.publicData.getById(postId, "wall_posts",(err, results) =>{
                        let item = results.data;
                        if(currentUser){
                            ReactionsUI.getReactions(currentUser._id, [item], (err, reactions) =>{
                                if(reactions && reactions.length > 0){
                                    item.liked = true;
                                }
                                else{
                                    item.liked = false
                                }
                                getPostLikes(item.id, (count) =>{
                                    item.likesCount = count;
                                    $timeout(function(){
                                        $rootScope.$digest();
                                        callback(null, item);
                                    })
                                });
                                
                            });
                        }
                        else{
                            getPostLikes(item.id, (count) =>{
                                item.likesCount = count;
                                item.liked = false;
                                $timeout(function(){
                                    $rootScope.$digest();
                                    callback(null, item);
                                })
                            });

                        }
                            
                    });
                })
            }


            SocialItems.prototype.getMorePrivatePosts = function(wid, callback){
                let options = {
                    filter:{"_buildfire.index.string1":wid},
                    sort:{"createdOn": -1},
                    page: _this.page,
                    pageSize: _this.pageSize,
                }
                buildfire.publicData.search(options, "wall_posts",(err, posts) =>{
                    if(posts && posts.length > 0){  
                        posts.map(e => _this.items.push(e.data));
                        if(posts.length == _this.pageSize){
                            _this.page++;
                        }
                        else{
                            _this.showMorePosts = false;
                        }
                        $timeout(function(){
                            $rootScope.$digest();
                            callback(null, posts)
                        })
                        privatePostsBackgroundService(options)
                    }
                    else{
                        callback(null, []);
                        privatePostsBackgroundService(options)
                    }
                })
            }

            SocialItems.prototype.getPrivatePosts = function(wid, callback){
                clearInterval(_this.newPrivatePostTimerChecker);
                _this.items = [];
                // $timeout(function(){
                //     $rootScope.$digest();
                // })
                let options = {
                    filter:{"_buildfire.index.string1":wid},
                    sort:{"createdOn": -1},
                    page:_this.page,
                    pageSize:_this.pageSize,
                }
                buildfire.publicData.search(options, "wall_posts",(err, posts) =>{
                    if(posts && posts.length > 0){  
                        posts.map(e => _this.items.push(e.data));
                        if(posts.length == _this.pageSize){
                            _this.page++;
                        }
                        else{
                            _this.showMorePosts = false;
                        }
                        $timeout(function(){
                            $rootScope.$digest();
                            callback(null, posts)
                        })
                        privatePostsBackgroundService(options)
                    }
                    else{
                        callback(null, []);
                        privatePostsBackgroundService(options)
                    }
                })
            }

            SocialItems.prototype.getLastPrivatePosts = function(wid){
                
                let options = {
                    filter: { "_buildfire.index.string1": wid },
                    sort: { "createdOn": -1 },
                    limit: 1,
                    skip: 1,
                }
                
                return new Promise((resolve, reject) => {
                    buildfire.publicData.search(options, "wall_posts",(err, posts) =>{
                        if (err) return reject(err);
                        resolve(posts)
                    })
                })
            }

            function privatePostsBackgroundService(options){
                if(!_this.newPrivatePostTimerChecker){
                    _this.newPrivatePostTimerChecker = setInterval(() => {
                        buildfire.publicData.search(options, 'wall_posts', (error, data) => {
                            if (error) return console.log(error);
                            if (data && data.length) {
                                if (data[0].data.id === (_this.items.length && _this.items[0].id)){
                                    return;
                                }
                                else{
                                    let items = [];
                                    data.map(item => items.push(item.data));
                                    _this.items = items;
                                }
                            }
                            
                            $rootScope.$digest();
                        });
                    }, 5000);

                }
            }


            function startBackgroundService(searchOptions) {
                if (!_this.newPostTimerChecker) {
                    _this.newPostTimerChecker = setInterval(function () {

                        buildfire.publicData.search(searchOptions, 'wall_posts', (error, data) => {
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
                            stringsCopy[defaultKey][newKey] = { defaultValue };
                            if (value) stringsCopy[defaultKey][newKey].value = value;
                        });
                        delete stringsCopy[defaultKey].labels;
                    });
                    let strings = {}
                    strings = Object.assign({}, stringsCopy.accountBannedModal, stringsCopy.activity, stringsCopy.blockUserModal, stringsCopy.logInBanner, stringsCopy.reportPostModal, stringsCopy.unblockUserModal, stringsCopy.unfollowModal, stringsCopy.userProfile);
                    Object.keys(strings).forEach(e => {
                        strings[e].value ? _this.languages[e] = strings[e].value : _this.languages[e] = strings[e].defaultValue;
                    });
                } else {
                    let strings = {};
                    if (response.data && response.data.blockUserModal && response.data.activity && response.data.blockUserModal && response.data.logInBanner && response.data.reportPostModal && response.data.unblockUserModal && response.data.unfollowModal && response.data.userProfile)
                        strings = Object.assign({}, response.data.accountBannedModal, response.data.activity, response.data.blockUserModal, response.data.logInBanner, response.data.reportPostModal, response.data.unblockUserModal, response.data.unfollowModal, response.data.userProfile);
                    else
                        strings = Object.assign({}, stringsConfig.accountBannedModal.labels, stringsConfig.activity.labels, stringsConfig.blockUserModal.labels, stringsConfig.logInBanner.labels, stringsConfig.reportPostModal.labels, stringsConfig.unblockUserModal.labels, stringsConfig.unfollowModal.labels, stringsConfig.userProfile.labels);
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
                            // i should navigate
                        }

                        buildfire.datastore.get("languages", (err, languages) => {
                            if (err) return console.log(err);
                            _this.formatLanguages(languages);
                            buildfire.datastore.get("SocialIcons", (err, SocialIcons) =>{
                                _this.SocialIcons = SocialIcons.data;
                                buildfire.datastore.get("Social", (err, response) => {
                                    callback(err, response);
                                });
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
        .factory("PushNotification",['$rootScope', 'SocialItems', function($rootScope, SocialItems){
            return{
                
            }
        }])
})(window.angular, window.buildfire, window.location);
