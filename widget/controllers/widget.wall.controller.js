'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .controller('WidgetWallCtrl', ['$scope','$sce','ProfileActivity', 'SocialDataStore', 'SocialBuddies' , 'Modals', 'Buildfire', "SocialUserProfile", '$rootScope', 'Location', 'EVENTS', 'GROUP_STATUS', 'MORE_MENU_POPUP', 'FILE_UPLOAD', '$modal', 'SocialItems', '$q', '$anchorScroll', '$location', '$timeout', 'Util', 'SubscribedUsersData', function ($scope, $sce, ProfileActivity, SocialDataStore,SocialBuddies, Modals, Buildfire, SocialUserProfile, $rootScope, Location, EVENTS, GROUP_STATUS, MORE_MENU_POPUP, FILE_UPLOAD, $modal, SocialItems, $q, $anchorScroll, $location, $timeout, util, SubscribedUsersData) {
            var WidgetWall = this;
            WidgetWall.userDetails = {};
            WidgetWall.postText = '';
            WidgetWall.modalPopupThreadId;
            WidgetWall.allowCreateThread = true;
            WidgetWall.allowPrivateChat = false;
            WidgetWall.allowFollowLeaveGroup = true;
            WidgetWall.groupFollowingStatus = false;
            $scope.isBusyLoadingPosts = false;
            WidgetWall.threadTag = "thread";
            WidgetWall.appTheme = null;
            $rootScope.isLoading = true;
            WidgetWall.loadedPlugin = false;
            WidgetWall.SocialItems = SocialItems.getInstance();
            WidgetWall.socialLanguages = WidgetWall.SocialItems.socialLanguages;
            $rootScope.showThread = true;

            

            WidgetWall.getGradientValue = (likes, add = 0) =>{
                return parseFloat((parseFloat(likes / WidgetWall.reaction.threshold) * 100) + add)
            }
            WidgetWall.loading = true;
            $scope.trustSrc = function(src) {
                return $sce.trustAsResourceUrl(src);
            };
            WidgetWall.showLogin = function(){
                Buildfire.auth.login({}, (err, user) => {
                    console.log(err, user);
                });
            }
            WidgetWall.showHideCommentBox = function () {
                if (WidgetWall.SocialItems && WidgetWall.SocialItems.appSettings && WidgetWall.SocialItems.appSettings.allowMainThreadTags &&
                    WidgetWall.SocialItems.appSettings.mainThreadUserTags && WidgetWall.SocialItems.appSettings.mainThreadUserTags.length > 0
                ) {
                    var _userTagsObj = WidgetWall.SocialItems.userDetails.userTags;
                    var _userTags = [];
                    if (_userTagsObj) {
                        _userTags = _userTagsObj[Object.keys(_userTagsObj)[0]];
                    }

                    if (_userTags && !WidgetWall.SocialItems.userBanned) {
                        var _hasPermission = false;
                        for (var i = 0; i < WidgetWall.SocialItems.appSettings.mainThreadUserTags.length; i++) {
                            var _mainThreadTag = WidgetWall.SocialItems.appSettings.mainThreadUserTags[i].text;
                            for (var x = 0; x < _userTags.length; x++) {
                                if (_mainThreadTag.toLowerCase() == _userTags[x].tagName.toLowerCase()) {
                                    _hasPermission = true;
                                    break;
                                }
                            }
                        }
                        WidgetWall.allowCreateThread = _hasPermission;
                        if (WidgetWall.SocialItems.userBanned) WidgetWall.allowCreateThread = false;
                    } else {
                        WidgetWall.allowCreateThread = false;
                    }
                } else {
                    if (WidgetWall.SocialItems.userBanned) WidgetWall.allowCreateThread = false;
                    else WidgetWall.allowCreateThread = true;
                }
            };

            WidgetWall.showHidePrivateChat = function () {
                if (WidgetWall.SocialItems && WidgetWall.SocialItems.appSettings && WidgetWall.SocialItems.appSettings.disablePrivateChat) {
                    WidgetWall.allowPrivateChat = false;
                } else {
                    WidgetWall.allowPrivateChat = true;
                }
            };

            WidgetWall.followLeaveGroupPermission = function () {
                if (WidgetWall.SocialItems && WidgetWall.SocialItems.appSettings && WidgetWall.SocialItems.appSettings.disableFollowLeaveGroup) {
                    WidgetWall.allowFollowLeaveGroup = false;
                } else {
                    WidgetWall.allowFollowLeaveGroup = true;
                }
            };

            WidgetWall.formatLanguages = function (strings) {
                Object.keys(strings).forEach(e => {
                    strings[e].value ? WidgetWall.SocialItems.languages[e] = strings[e].value : WidgetWall.SocialItems.languages[e] = strings[e].defaultValue;
                });
            }

            WidgetWall.setSettings = function (settings) {
                WidgetWall.SocialItems.appSettings = settings.data && settings.data.appSettings ? settings.data.appSettings : {};
                WidgetWall.showHidePrivateChat();
                WidgetWall.followLeaveGroupPermission();
                WidgetWall.showHideCommentBox();
                let dldActionItem = new URLSearchParams(window.location.search).get('actionItem');
                if (dldActionItem)
                    WidgetWall.SocialItems.appSettings.actionItem = JSON.parse(dldActionItem);

                let actionItem = WidgetWall.SocialItems.appSettings.actionItem;
                if (actionItem && actionItem.iconUrl) {
                    actionItem.iconUrl = buildfire.imageLib.cropImage(actionItem.iconUrl, { size: 'xss', aspect: '1:1' })
                    angular.element('#actionBtn').attr('style', `background-image: url(${actionItem.iconUrl}) !important; background-size: cover !important;`);
                }

                if (typeof (WidgetWall.SocialItems.appSettings.showMembers) == 'undefined')
                    WidgetWall.SocialItems.appSettings.showMembers = true;
                if (typeof (WidgetWall.SocialItems.appSettings.allowAutoSubscribe) == 'undefined')
                    WidgetWall.SocialItems.appSettings.allowAutoSubscribe = true;
                if (WidgetWall.SocialItems.appSettings && typeof WidgetWall.SocialItems.appSettings.pinnedPost !== 'undefined') {
                    WidgetWall.pinnedPost = WidgetWall.SocialItems.appSettings.pinnedPost;
                    pinnedPost.innerHTML = WidgetWall.pinnedPost;
                }
                WidgetWall.loadedPlugin = true;
                $scope.$digest();

            }

            WidgetWall.setAppTheme = function () {
                buildfire.appearance.getAppTheme((err, obj) => {
                    let elements = document.getElementsByTagName('svg');
                    for (var i = 0; i < elements.length; i++) {
                        elements[i].style.setProperty("fill", obj.colors.icons, "important");
                    }
                    WidgetWall.appTheme = obj.colors;
                    WidgetWall.loadedPlugin = true;
                });
            }

            WidgetWall.getPosts = function (callback) {
                Buildfire.auth.getCurrentUser((err, res) =>{
                    WidgetWall.SocialItems.getPosts( function (err, data) {
                        // WidgetWall.showUserLikes();
                        callback(err, data);
                        window.buildfire.messaging.sendMessageToControl({
                            name: 'SEND_POSTS_TO_CP',
                            posts: WidgetWall.SocialItems.items,
                            pinnedPost: WidgetWall.pinnedPost,
                            wid: WidgetWall.SocialItems.wid
                        });
                    });
                });
            }

            // WidgetWall.showUserLikes = function () {
            //     WidgetWall.SocialItems.items.map(item => {
            //         let liked = item.likes.find(like => like === WidgetWall.SocialItems.userDetails.userId);
            //         if (liked) item.isUserLikeActive = true;
            //         else item.isUserLikeActive = false;
            //     });
            //     $scope.$digest();
            // }

            WidgetWall.checkFollowingStatus = function (user = null) {
                WidgetWall.loading = true;
                buildfire.spinner.show();
                SubscribedUsersData.getGroupFollowingStatus(WidgetWall.SocialItems.userDetails.userId, WidgetWall.SocialItems.wid, WidgetWall.SocialItems.context.instanceId, function (err, status) {
                    if (err) console.log('error while getting initial group following status.', err);
                    else {
                        if (!status.length && WidgetWall.SocialItems.appSettings.allowAutoSubscribe) {
                            buildfire.spinner.hide();
                            WidgetWall.loading = false;
                            return WidgetWall.followWall();
                        }
                        if (status.length && !status[0].data.leftWall) {
                            buildfire.notifications.pushNotification.subscribe(
                                {
                                    groupName: WidgetWall.SocialItems.wid === '' ?
                                        WidgetWall.SocialItems.context.instanceId : WidgetWall.SocialItems.wid
                                }, () => { });
                            WidgetWall.groupFollowingStatus = true;
                        } else {
                            if (status[0].data.banned) {
                                WidgetWall.SocialItems.userBanned = true;
                                WidgetWall.allowFollowLeaveGroup = false;
                                WidgetWall.allowCreateThread = false;
                                WidgetWall.SocialItems.appSettings.showMembers = false;
                            }
                            WidgetWall.groupFollowingStatus = false;
                        }
                        WidgetWall.showHideCommentBox();
                        if (user) WidgetWall.statusCheck(status, user);
                        buildfire.spinner.hide();
                        WidgetWall.loading = false;
                        $scope.$digest();
                    }
                });
            }

            WidgetWall.reloadPosts = (isLoading) =>{
                $timeout(function(){
                    $rootScope.isLoading = isLoading;
                    $rootScope.$digest();
                    $scope.$digest();

                })
            }

            WidgetWall.openPostBottomDrawer = function(post){
                console.log(post);
                SocialUserProfile.get(post.userDetails.userId, (err, socialProfile) =>{
                    if(socialProfile){

                        let listItems = [];
                        if(post.userId !== WidgetWall.SocialItems.userDetails.userId){
                            listItems.push({text:"Report post", index: 0});
                            if(WidgetWall.SocialItems.userDetails.userId){
                                if(socialProfile.data.followers.findIndex(e => e === WidgetWall.SocialItems.userDetails.userId) >= 0){
                                    listItems.push({text:"Unfollow " + WidgetWall.SocialItems.getUserName(post.userDetails), index: 1});
                                }
                                else{
                                    if(socialProfile.data.pendingFollowers.findIndex(e => e === WidgetWall.SocialItems.userDetails.userId) >= 0){
                                        listItems.push({text:"Unfollow " + WidgetWall.SocialItems.getUserName(post.userDetails), index: 1});
                                    }
                                    listItems.push({text:"Follow " + WidgetWall.SocialItems.getUserName(post.userDetails), index: 1});
                                }
                                listItems.push({text:"Block " +  WidgetWall.SocialItems.getUserName(post.userDetails), index: 2});
                                if(post.taggedPeople.findIndex(e => e === WidgetWall.SocialItems.userDetails.userId) >= 0){
                                    listItems.push({text:"Remove My Tag", index:3});
                
                                }
                            }
                        }
                        else{
                            if(Object.keys(post.originalPost).length == 0) listItems.push({text:"Edit Post",index:4})
                            listItems.push({text:"Delete Post",index:5});
                            
                        }
                        listItems.push({text:"Share Post",index:6});

                        Buildfire.components.drawer.open(
                            {
                                enableFilter:false,
                                listItems: listItems
                            },(err, result) => {
                                buildfire.components.drawer.closeDrawer();
                                if(result && result.index == 0){
                                    let title = WidgetWall.SocialItems.languages.reportPosttitle;
                                    let body =  WidgetWall.SocialItems.languages.reportPostbody;
                                    let confirmButton =  WidgetWall.SocialItems.languages.reportPostconfirm;
                                    buildfire.dialog.confirm(
                                        {
                                            title:title,
                                            message: body,
                                            confirmButton:{ 
                                                type: "primary", 
                                                text: confirmButton
                                            }
                                            
                                        },
                                        (err, isConfirmed) => {
                                          if (err) console.error(err);
                                      
                                          if (isConfirmed) {
                                            Buildfire.input.showTextDialog({
                                                "placeholder": "Reporting Reason*",
                                                "defaultValue": "",
                                                "attachments": {
                                                    "images": { enable: false },
                                                    "gifs": { enable: false }
                                                }
                                            },(err, data) =>{
                                                console.log(data);
                                                if(data && data.results.length){
                                                    WidgetWall.reportPost(post, data.results[0].textValue);
                                                }
                                            })
                                          } 
                                        }
                                      );
                                }
                                else if(result && result.index == 1){
                                    let params = {userId: post.userDetails.userId, currentUser: WidgetWall.SocialItems.userDetails.userId};
                                    WidgetWall.reloadPosts(true);
                                    SocialUserProfile.followUnfollowUser(params,
                                        () => {},
                                        (err, data) =>{
                                        if(data){
                                            WidgetWall.SocialItems.items = [];
                                            WidgetWall.SocialItems.page = 0;
                                            WidgetWall.getPosts((err, posts) =>{
                                                WidgetWall.reloadPosts(false);
                                            });
                                        }
                                    });
                                    
                                }
                                else if(result && result.index == 2){
                                    WidgetWall.reloadPosts(true);
                                    SocialUserProfile.blockUser(post.userDetails.userId, (err, data) =>{
                                        WidgetWall.SocialItems.items = [];
                                        WidgetWall.SocialItems.page = 0;

                                        WidgetWall.getPosts((err, posts) =>{
                                            WidgetWall.reloadPosts(false);
                                        });
                                    })
                                }
                                else if(result && result.index ==  3){
                                    let taggedPeople = post.taggedPeople;
                                    let index = taggedPeople.findIndex(e => e === WidgetWall.SocialItems.userDetails.userId);
                                    taggedPeople.splice(index, 1);
                                    SocialDataStore.updatePost(post).then((updatedpost) =>{
                                        Buildfire.dialog.toast({
                                            message: "Tag removed successfully",
                                        });
                                        console.log(updatedpost);
                                        let inArray = WidgetWall.SocialItems.items.findIndex(e => e.id === post.id);
                                        WidgetWall.SocialItems.items[inArray].taggedPeople = updatedpost.data.taggedPeople;
                                        WidgetWall.SocialItems.items[inArray]._buildfire = updatedpost.data._buildfire;

                                    });
                                }
                                else if(result && result.index == 4){
                                    Location.go("#/post/createPost/"+post.id);
                                }
                                else if(result && result.index == 5){
                                    WidgetWall.deletePost(post.id)
                                }
                                else if(result && result.index == 6){
                                    WidgetWall.sharePost(post);
                                }
                            });
                    }
                })
            }

            WidgetWall.unfollowWall = function () {
                SubscribedUsersData.unfollowWall(WidgetWall.SocialItems.userDetails.userId, WidgetWall.SocialItems.wid, false, function (err, result) {
                    if (err) return console.error(err);
                    else {
                        Follows.unfollowPlugin((err, r) => err ? console.log(err) : console.log(r));
                        WidgetWall.groupFollowingStatus = false;
                        buildfire.notifications.pushNotification.unsubscribe(
                            {
                                groupName: WidgetWall.SocialItems.wid === '' ?
                                    WidgetWall.SocialItems.context.instanceId : WidgetWall.SocialItems.wid
                            }, () => { });
                        const options = { text: 'You have left this group' };
                        buildfire.components.toast.showToastMessage(options, () => { });
                        $scope.$digest();
                    }
                });
            }

            WidgetWall.followWall = function () {
                let user = WidgetWall.SocialItems.userDetails;
                var params = {
                    userId: user.userId,
                    userDetails: {
                        displayName: user.displayName,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        imageUrl: user.imageUrl,
                        email: user.email,
                        lastUpdated: new Date().getTime(),
                    },
                    wallId: WidgetWall.SocialItems.wid,
                    posts: [],
                    _buildfire: {
                        index: { text: user.userId + '-' + WidgetWall.SocialItems.wid, string1: WidgetWall.SocialItems.wid,
                        array1:[
                            {string1: "userId_"+user.userId}
                        ]}
                    }

                };
                Follows.followPlugin((e , u) => e ? console.log(e) : console.log(u));

                SubscribedUsersData.save(params, function (err) {
                    if (err) console.log('Error while saving subscribed user data.');
                    else {
                        WidgetWall.groupFollowingStatus = true;
                        buildfire.notifications.pushNotification.subscribe(
                            {
                                groupName: WidgetWall.SocialItems.wid === '' ?
                                WidgetWall.SocialItems.context.instanceId : WidgetWall.SocialItems.wid
                            }, () => { });
                        buildfire.spinner.hide();
                        WidgetWall.loading = false;
                        $scope.$digest();
                    }
                });
            }

            WidgetWall.followUnfollow = function () {
                if (WidgetWall.groupFollowingStatus) return WidgetWall.unfollowWall();
                else {
                    WidgetWall.SocialItems.authenticateUser(null, (err, user) => {
                        if (err) return console.error("Getting user failed.", err);
                        if (user) {
                            WidgetWall.loading = true;
                            buildfire.spinner.show();
                            SubscribedUsersData.getGroupFollowingStatus(WidgetWall.SocialItems.userDetails.userId, WidgetWall.SocialItems.wid, WidgetWall.SocialItems.context.instanceId, function (err, status) {
                                if (err) console.log('error while getting initial group following status.', err);
                                else {
                                    if (!status.length) return WidgetWall.followWall();
                                    else if (status.length && status[0].data.leftWall) {
                                        status[0].data.leftWall = false;
                                        Follows.followPlugin((e , u) => e ? console.log(e) : console.log(u));                                        
                                        buildfire.appData.update(status[0].id, status[0].data, 'subscribedUsersData', console.log);
                                        buildfire.notifications.pushNotification.subscribe(
                                            {
                                                groupName: WidgetWall.SocialItems.wid === '' ?
                                                    WidgetWall.SocialItems.context.instanceId : WidgetWall.SocialItems.wid
                                            }, () => { });
                                        WidgetWall.groupFollowingStatus = true;
                                    }
                                    else if (status.length && !status[0].data.leftWall)
                                        return WidgetWall.unfollowWall();
                                    WidgetWall.showHideCommentBox();
                                    if (user) WidgetWall.statusCheck(status, user);
                                    buildfire.spinner.hide();
                                    WidgetWall.loading = false;
                                    $scope.$digest();
                                }
                            });
                        }
                    });
                }
            }

            WidgetWall.scheduleNotification = function (post, text) {
                let options = {
                    title: 'Notification',
                    text: '',
                    users: [],
                    sendToSelf: false
                };

                if (text === 'post')
                    options.text = WidgetWall.SocialItems.getUserName(WidgetWall.SocialItems.userDetails) + ' added new post on ' + decodeURI(WidgetWall.SocialItems.context.title);
                else if (text === 'like')
                    options.text = WidgetWall.SocialItems.getUserName(WidgetWall.SocialItems.userDetails) + ' liked a post on ' + decodeURI(WidgetWall.SocialItems.context.title);

                options.inAppMessage = options.text;
                options.queryString = `wid=${WidgetWall.SocialItems.wid}`

                if (text === 'like' && post.userId === WidgetWall.SocialItems.userDetails.userId) return;

                if (WidgetWall.SocialItems.isPrivateChat) {
                    const user1Id = WidgetWall.SocialItems.wid.slice(0, 24);
                    const user2Id = WidgetWall.SocialItems.wid.slice(24, 48);
                    let userToSend = user1Id === WidgetWall.SocialItems.userDetails.userId
                        ? user2Id : user1Id;
                    SubscribedUsersData.getGroupFollowingStatus(userToSend, WidgetWall.SocialItems.wid, WidgetWall.SocialItems.context.instanceId, function (err, status) {
                        if (err) console.error('Error while getting initial group following status.', err);
                        if (status.length && status[0].data && !status[0].data.leftWall) {
                            options.users.push(userToSend);
                            options.text = WidgetWall.SocialItems.getUserName(WidgetWall.SocialItems.userDetails) + ' added new post on '
                                + WidgetWall.SocialItems.getUserName(WidgetWall.SocialItems.userDetails) + ' | ' + WidgetWall.SocialItems.getUserName(status[0].data.userDetails);
                            buildfire.notifications.pushNotification.schedule(options, function (err) {
                                if (err) return console.error('Error while setting PN schedule.', err);
                                console.log("SENT NOTIFICATION", options);
                            });
                        } else if(!status.length && WidgetWall.SocialItems.appSettings.allowAutoSubscribe) {
                            buildfire.auth.getUserProfile({ userId: userToSend }, (err, user) => {
                                if (err) return console.error(err);
                                options.users.push(userToSend);
                                options.text = WidgetWall.SocialItems.getUserName(WidgetWall.SocialItems.userDetails) + ' added new post on '
                                    + WidgetWall.SocialItems.getUserName(WidgetWall.SocialItems.userDetails) + ' | ' + WidgetWall.SocialItems.getUserName(user);
                                buildfire.notifications.pushNotification.schedule(options, function (err) {
                                    if (err) return console.error('Error while setting PN schedule.', err);
                                    console.log("SENT NOTIFICATION", options);
                                });  
                              });
                        }
                    });
                } else {
                    if (text === 'like') {
                        options.users.push(post.userId);
                    }
                    else options.groupName = WidgetWall.SocialItems.wid === '' ?
                        WidgetWall.SocialItems.context.instanceId : WidgetWall.SocialItems.wid
                    buildfire.notifications.pushNotification.schedule(options, function (err) {
                        if (err) return console.error('Error while setting PN schedule.', err);
                        console.log("SENT NOTIFICATION", options);
                    });
                }
            }


            WidgetWall.openBottomDrawer = function(userId){
                Follows.isFollowingUser(userId , (err , r) =>{
                        let listItems = [];
                        if(WidgetWall.SocialItems.appSettings.seeProfile) listItems.push({text: "See Profile"})
                        if(WidgetWall.SocialItems.appSettings.allowCommunityFeedFollow == true) listItems.push({text: r ? 'Unfollow' : 'Follow'});
                        if( ( WidgetWall.SocialItems.appSettings && !WidgetWall.SocialItems.appSettings.disablePrivateChat) || WidgetWall.SocialItems.appSettings.disablePrivateChat == false) listItems.push({text:'Send Direct Message'});
                        if(listItems.length == 0) return;
                        Buildfire.components.drawer.open(
                            {
                                enableFilter:false,
                                listItems: listItems
                            },(err, result) => {
                                if (err) return console.error(err);
                                else if(result.text == "See Profile") buildfire.auth.openProfile(userId);
                                else if(result.text == "Send Direct Message") WidgetWall.openPrivateChat(userId);
                                else if(result.text == "Unfollow") Follows.unfollowUser(userId,(err, r) => err ? console.log(err) : console.log(r));
                                else if(result.text == "Follow") Follows.followUser(userId,(err, r) => err ? console.log(err) : console.log(r));
                                buildfire.components.drawer.closeDrawer();
                            }
                        );
                })
            }

            WidgetWall.openChat = function (post) {
                let userId = post.userId;
                let newData = {...post};
                newData.repliesCount++;
                SocialDataStore.updatePost(newData).then((response) =>{

                },(err) => {})

                if (WidgetWall.allowPrivateChat) {
                    WidgetWall.SocialItems.authenticateUser(null, (err, user) => {
                        if (err) return console.error("Getting user failed.", err);
                        if (user) {
                            buildfire.auth.getUserProfile({ userId: userId }, function (err, user) {
                                if (err) return console.error("Getting user profile failed.", err);
                                if (userId === WidgetWall.SocialItems.userDetails.userId) return;
                                WidgetWall.openPrivateChat(userId, WidgetWall.SocialItems.getUserName(user));
                            });
                        }
                    });
                }
            };
            WidgetWall.openPrivateChat = function (userId, userName) {
                let wid = null;
                if (WidgetWall.SocialItems.userDetails.userId && WidgetWall.SocialItems.userDetails.userId != userId) {
                    if (WidgetWall.SocialItems.userDetails.userId > userId) {
                        wid = WidgetWall.SocialItems.userDetails.userId + userId;
                    } else {
                        wid = userId + WidgetWall.SocialItems.userDetails.userId;
                    }
                }
                SubscribedUsersData.getGroupFollowingStatus(userId, wid, WidgetWall.SocialItems.context.instanceId, function (err, status) {
                    if (err) console.error('Error while getting initial group following status.', err);
                    if (!status.length) {
                        WidgetWall.followPrivateWall(userId, wid, userName);
                    } else {
                        WidgetWall.navigateToPrivateChat({ id: userId, name: userName, wid: wid });
                    }
                });
            }


            WidgetWall.init = function () {
                WidgetWall.SocialItems.getSettings((err, result) => {
                    if (err) return console.error("Fetching settings failed.", err);
                    if (result) {
                        Buildfire.datastore.get("SocialIcons", (err, res) =>{
                            if(res && res.data && Object.keys(res.data).length > 0){
                                WidgetWall.reaction = {
                                    icon: WidgetWall.SocialItems.SocialIcons.reactions.icon,
                                    color: WidgetWall.SocialItems.SocialIcons.reactions.color,
                                    threshold: WidgetWall.SocialItems.SocialIcons.reactions.threshold,
                                }
                            }
                            $timeout(function(){
                                $scope.$digest();
                            })
                        })
                        buildfire.deeplink.getData((deeplinkData) => {
                            if (deeplinkData){
                                if(deeplinkData.postId){
                                    
                                    Location.go("#/singlePostView/"+deeplinkData.postId);
                                }
                                else if(deeplinkData.profileId){
                                    Location.go("#/profile/"+deeplinkData.profileId);

                                }
                            }
                        });
                        WidgetWall.loginModal = {
                            message: WidgetWall.SocialItems.languages.logInbannerText,
                            dismiss: WidgetWall.SocialItems.languages.logIndismiss,
                            loginRegister: WidgetWall.SocialItems.languages.logInloginRegister,
                        }
                        WidgetWall.loginModal.isClosed = false;
                        let postsContainer = document.getElementById("posts_main_wall");

                        postsContainer.addEventListener('scroll',() =>{
                            if(!$scope.isBusyLoadingPosts && WidgetWall.SocialItems.showMorePosts && ( postsContainer.scrollTop - (postsContainer.scrollHeight - postsContainer.offsetHeight) > - 30) ){
                                Buildfire.spinner.show();
                                $scope.isBusyLoadingPosts = true;
                                WidgetWall.loadMorePosts((isFinished) =>{
                                    if(isFinished){
                                        Buildfire.spinner.hide();
                                        $scope.isBusyLoadingPosts = false;
                                    } 
                                    $scope.$digest();
                                })
                            }
                        })
                        WidgetWall.SocialItems.page = 0;
                        WidgetWall.SocialItems.items = [];
                        WidgetWall.setSettings(result);
                        WidgetWall.showHidePrivateChat();
                        WidgetWall.followLeaveGroupPermission();
                        WidgetWall.setAppTheme();
                        WidgetWall.getPosts((err, posts) =>{
                            if(posts){
                                $timeout(function(){
                                    WidgetWall.SocialItems = SocialItems.getInstance();
                                    $rootScope.$digest();
                                    $scope.$digest();
                                    $rootScope.isLoading = false;
                                }, 300)
                            }
                        });

                        WidgetWall.saveActivity = function(type, data){
                            let activity = {
                                type: type,
                                fromUser: data.fromUser,
                                toUser: data.toUser,
                                post: data.post,
                                createdOn: new Date(),
                                createdBy: data.fromUser.userId,
                            }
                            ProfileActivity.add(activity, (err, res) =>{
                                if(err) console.error(err);
                                else console.log(res);
                            })
                        }

                        WidgetWall.createReactionActivity = (post) =>{
                            let type = "reactedToYourpost";
                            let fromUser = {
                                displayName: WidgetWall.SocialItems.userDetails.displayName,
                                imageUrl: WidgetWall.SocialItems.userDetails.imageUrl,
                                userId: WidgetWall.SocialItems.userDetails.userId
                            }
                            let toUser = {
                                displayName: post.userDetails.displayName,
                                userId: post.userId
                            }
                            WidgetWall.saveActivity(type, {fromUser, toUser, post: {image: post.images[0],id: post.id}})
                        }

                        WidgetWall.toggleReaction = (post) =>{
                            if(!WidgetWall.SocialItems.userDetails.userId){
                                Buildfire.auth.login({},() => {});
                            }
                            if(!post.liked){
                                let ids = {
                                    uniqueID: post.id,
                                    currentUserId: WidgetWall.SocialItems.userDetails.userId
                                }
                                SocialBuddies.interact(WidgetWall.SocialItems.userDetails.userId, post.userDetails.userId, (err, resp) =>{
                                });
                                ReactionsUI.toggle(ids, WidgetWall.SocialItems.getUserName(post.userDetails) , false);
                            }
                            else{
                                ReactionsUI.delete(`${post.id}-${WidgetWall.SocialItems.userDetails.userId}`, console.log)
                            }
                            post.liked = !post.liked;
                            let index = WidgetWall.SocialItems.items.findIndex(e => e.id === post.id);
                            WidgetWall.SocialItems.items[index].liked = post.liked;
                            if(post.liked){
                                WidgetWall.SocialItems.items[index].likesCount++;
                                WidgetWall.createReactionActivity(WidgetWall.SocialItems.items[index]);
                                SocialDataStore.checkForBadges(WidgetWall.SocialItems.userDetails.userId, () => {
                                    console.log("checked");
                                })
                            } 
                            else WidgetWall.SocialItems.items[index].likesCount--;
                        }

                        buildfire.auth.getCurrentUser((err, user) => {
                            if (err) return;
                            else if(user){                                
                                WidgetWall.SocialItems.authenticateUser(null, (err, user) => {
                                    if (err) return console.error("Getting user failed.", err);
                                    if (user) {
                                        WidgetWall.checkFollowingStatus(user);
                                        WidgetWall.checkForPrivateChat();
                                        var params = {
                                            userId: user._id,
                                            interests: [],
                                            isPublicProfile: true,
                                            followers: [],
                                            blockedUsers: [],
                                            pendingFollowers: [],
                                            lastUpdatedOn: new Date(),
                                            streak: 0,
                                            highestStreak: 0,
                                            following:[],
                                            badges:[],
                                            _buildfire:{
                                                index:{
                                                    string1: user._id
                                                }
                                            }
                                        }
                                        SocialUserProfile.init(params)
                                    } else {
                                        WidgetWall.groupFollowingStatus = false;
                                    }
                                });
                            }
                          
                          });
                    }
                    
                });
            };
            WidgetWall.init();


            WidgetWall.goToSinglePostView = (postId) =>{
                Location.go("#/singlePostView/" + postId);
            }

            WidgetWall.checkForPrivateChat = function () {
                if (WidgetWall.SocialItems.isPrivateChat) {  
                        SubscribedUsersData.getUsersWhoFollow(WidgetWall.SocialItems.userDetails.userId, WidgetWall.SocialItems.wid, function (err, users) {
                            if (err) return console.log(err);
                            const user1Id = WidgetWall.SocialItems.wid.slice(0, 24);
                            const user2Id = WidgetWall.SocialItems.wid.slice(24, 48);
                            if (!users.length) {
                                var otherUser = (user1Id.localeCompare(WidgetWall.SocialItems.userDetails.userId) === 0)
                                    ? user2Id : user1Id;
                                WidgetWall.followPrivateWall(otherUser, WidgetWall.SocialItems.wid);
                            }
                        });
                }
            }

            WidgetWall.sanitizeWall = function (callback) {
                buildfire.appData.search(
                    { filter: { '_buildfire.index.string1': WidgetWall.SocialItems.wid } },
                    'subscribedUsersData', function (err, result) {
                        if (err) console.log(err);
                        if (result && result.length > 2) {
                            const user1Id = WidgetWall.SocialItems.wid.slice(0, 24);
                            const user2Id = WidgetWall.SocialItems.wid.slice(24, 48);
                            result.map(item => {
                                if (item.data.userId !== user1Id && item.data.userId !== user2Id) {
                                    buildfire.appData.delete(item.id, 'subscribedUsersData');
                                }
                            });
                        }
                    });
            }

            WidgetWall.followPrivateWall = function (userId, wid, userName = null) {
                Buildfire.auth.getUserProfile({ userId: userId }, (err, user) => {
                    if (err) console.log('Error while saving subscribed user data.');
                    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                    if (re.test(String(user.firstName).toLowerCase()))
                        user.firstName = 'Someone';
                    if (re.test(String(user.displayName).toLowerCase()))
                        user.displayName = 'Someone';

                    var params = {
                        userId: userId,
                        userDetails: {
                            displayName: user.displayName,
                            firstName: user.firstName,
                            lastName: user.lastName,
                            imageUrl: user.imageUrl,
                            email: user.email,
                            lastUpdated: new Date().getTime(),
                            location:{
                                address: user?.userProfile?.address?.fullAddress || null,
                                lat: user?.userProfile?.address?.geoLocation?.lat || null,
                                lng: user?.userProfile?.address?.geoLocation?.lng || null,

                            }
                        },
                        wallId: wid,
                        posts: [],
                        _buildfire: {
                            index: { text: userId + '-' + wid, string1: wid,
                            array1:[
                                {string1: "userId_"+userId}
                            ]}
                        }

                    };

                    userName = WidgetWall.SocialItems.getUserName(params.userDetails)
                    SubscribedUsersData.save(params, function (err) {
                        if (err) console.log('Error while saving subscribed user data.');
                        if (userName)
                            WidgetWall.navigateToPrivateChat({ id: userId, name: userName, wid: wid });
                    });
                })
            }

            WidgetWall.navigateToPrivateChat = function (user) {
                buildfire.history.get({
                    pluginBreadcrumbsOnly: true
                }, function (err, result) {
                    result.forEach(e=> buildfire.history.pop());
                });
                
                WidgetWall.SocialItems.isPrivateChat = true;
                WidgetWall.SocialItems.wid = user.wid;
                WidgetWall.SocialItems.showMorePosts = true;
                WidgetWall.SocialItems.pageSize = 20;
                WidgetWall.SocialItems.page = 0;
                WidgetWall.SocialItems.pluginTitle = WidgetWall.SocialItems.getUserName(WidgetWall.SocialItems.userDetails) + ' | ' + user.name;

                $timeout(function(){
                    $rootScope.isPrivateChat = true;
                    Location.go("#/PrivateChat",{isPrivateChat: true});
                })
            }

            $rootScope.$on('loadPrivateChat', function (event, error) {
                WidgetWall.init();
            });

            $rootScope.$on('navigatedBack', function (event, error) {
                $rootScope.isLoading = true;
                $timeout(function(){
                    clearInterval(WidgetWall.SocialItems.newPrivatePostTimerChecker)
                    $rootScope.$digest();
                })
                
                $rootScope.isPrivateChat = false;
                WidgetWall.SocialItems.wid = WidgetWall.SocialItems.mainWallID;
                WidgetWall.SocialItems.items = [];
                WidgetWall.SocialItems.isPrivateChat = false;
                WidgetWall.SocialItems.pageSize = 5;
                WidgetWall.SocialItems.page = 0;
                WidgetWall.SocialItems.pluginTitle = '';
                $timeout(function(){
                    $rootScope.$digest();
                    WidgetWall.init();
                })
            });



            var counter = 0;
            $scope.setupImageList = function (post) {
                if (post.imageUrl) {
                    post.imageListId = "imageList_" + (counter++);
                    setTimeout(function () {
                        let imageList = document.getElementById(post.imageListId);
                        imageList.addEventListener('imageSelected', (e) => {
                            let selectedImage = e.detail.filter(image => image.selected);
                            if (selectedImage && selectedImage[0] && selectedImage[0].name)
                                selectedImage[0].name = selectedImage[0].name;
                            buildfire.imagePreviewer.show({ images: selectedImage });
                        });
                        if (Array.isArray(post.imageUrl)) {
                            imageList.images = post.imageUrl;
                        } else {
                            imageList.images = [post.imageUrl];
                        }

                    }, 0);
                }
            };
            $scope.openThread = function (event, post) {
                if (event.target.nodeName != "BF-IMAGE-LIST")
                    window.location.href = " #/thread/" + post.id;
            };
            WidgetWall.Thread = class {
                constructor(record = {}) {
                    if (!record.data) record.data = {};
                    this.id = record.id || undefined;
                    this.isActive =
                        typeof record.data.isActive === "boolean" ? record.data.isActive : true;
                    this.createdOn = record.data.createdOn || new Date();
                    this.createdBy = record.data.createdBy || undefined;
                    this.lastUpdatedOn = record.data.lastUpdatedOn || undefined;
                    this.lastUpdatedBy = record.data.lastUpdatedBy || undefined;
                    this.deletedOn = record.data.deletedOn || undefined;
                    this.deletedBy = record.data.deletedBy || undefined;

                    this.users = record.data.users || [];
                    this.wallId = record.data.wallId || undefined;
                    this.wallTitle = record.data.wallTitle || undefined;
                    this.navigationData = record.data.navigationData || {
                        pluginId: undefined,
                        instanceId: undefined,
                        folderName: undefined
                    };
                    this.lastMessage = record.data.lastMessage || {
                        text: undefined,
                        createdAt: undefined,
                        sender: undefined,
                        isRead: undefined
                    };
                }

                /**
                 * Get instance ready for data access with _buildfire index object
                 */
                toJSON() {
                    return {
                        id: this.id,
                        isActive: this.isActive,
                        createdOn: this.createdOn,
                        createdBy: this.createdBy,
                        lastUpdatedOn: this.lastUpdatedOn,
                        lastUpdatedBy: this.lastUpdatedBy,
                        deletedOn: this.deletedOn,
                        deletedBy: this.deletedBy,

                        users: this.users,
                        wallId: this.wallId,
                        wallTitle: this.wallTitle,
                        lastMessage: this.lastMessage,
                        navigationData: this.navigationData,
                        _buildfire: {
                            index: {
                                number1: this.isActive ? 1 : 0,
                                date1: this.lastMessage.createdAt,
                                string1: this.wallId,
                                array1: this.users.map(user => ({
                                    string1: user._id
                                })),
                                text: this.users.map(user => user.displayName).join(" || ")
                            }
                        }
                    };
                }
            }

            WidgetWall.verifyWallId = function (user, wallId, callback) {
                if (!wallId || wallId.length != 48)
                    return callback(new Error("Invalid wall id"));

                const user1Id = wallId.slice(0, 24);
                const user2Id = wallId.slice(24, 48);

                if (user._id !== user1Id && user._id !== user2Id)
                    return callback(
                        new Error("Logged in user must be one of the wall users")
                    );

                let users = [];

                const resolve = user => {
                    users.push(user);
                    if (users.length === 2) callback(null, users);
                };

                buildfire.auth.getUserProfile({ userId: user1Id }, (err, user) => {
                    if (err) return callback(err);
                    if (!user) return callback(new Error("User not found"));
                    resolve(user);
                });

                buildfire.auth.getUserProfile({ userId: user2Id }, (err, user) => {
                    if (err) return callback(err);
                    if (!user) return callback(new Error("User not found"));
                    resolve(user);
                });
            }

            WidgetWall.getThread = function (user, wallId, wallTitle, callback) {
                WidgetWall.verifyWallId(user, wallId, (err, users) => {
                    if (err) return callback(err);

                    const filters = {
                        filter: {
                            "_buildfire.index.string1": wallId
                        }
                    };

                    buildfire.appData.search(filters, WidgetWall.threadTag, (err, records) => {
                        if (err) return callback(err);

                        const createdBy = user._id;

                        if (!records || !records.length) {
                            let thread = new WidgetWall.Thread({
                                data: { users, wallId, wallTitle, createdBy }
                            });

                            buildfire.appData.insert(
                                thread.toJSON(),
                                WidgetWall.threadTag,
                                false,
                                (err, record) => {
                                    if (err) return callback(err);
                                    return callback(null, new WidgetWall.Thread(record));
                                }
                            );
                        } else {
                            return callback(null, new WidgetWall.Thread(records[0]));
                        }
                    });
                });
            }


            WidgetWall.getNavigationData = function (callback) {
                Buildfire.pluginInstance.get(WidgetWall.SocialItems.context.instanceId, function (err, plugin) {
                    return callback({
                        pluginId: WidgetWall.SocialItems.context.pluginId,
                        instanceId: plugin.instanceId,
                        folderName: plugin._buildfire.pluginType.result[0].folderName,
                    })
                });
            }

            WidgetWall.onSendMessage = function (user, message, callback) {
                // GET wallId and wallTitle from query params in PSW2
                const wallId = WidgetWall.SocialItems.wid;
                const wallTitle = WidgetWall.SocialItems.pluginTitle;

                WidgetWall.getThread(user, wallId, wallTitle, (err, thread) => {
                    if (err) return callback(err);

                    WidgetWall.getNavigationData(navigationData => {
                        thread.lastUpdatedOn = new Date();
                        thread.lastUpdatedBy = user._id;
                        thread.lastMessage = {
                            text: message,
                            createdAt: new Date(),
                            sender: user._id,
                            isRead: false
                        };
                        thread.navigationData = navigationData;

                        buildfire.appData.update(
                            thread.id,
                            thread.toJSON(),
                            WidgetWall.threadTag,
                            (err, record) => {
                                if (err) return callback(err);
                                return callback(null, new WidgetWall.Thread(record));
                            }
                        );
                    });
                })
            }
            WidgetWall.loadMorePosts = function (callback) {
                WidgetWall.SocialItems.getPosts(function (err, data) {
                    console.log(WidgetWall.SocialItems.items.length);
                    window.buildfire.messaging.sendMessageToControl({
                        name: 'SEND_POSTS_TO_CP',
                        posts: WidgetWall.SocialItems.items,
                        pinnedPost: WidgetWall.pinnedPost,
                        wid: WidgetWall.SocialItems.wid
                    });
                    if(callback){
                        callback(true)
                    }
                });
            }

            function finalPostCreation(imageUrl) {
                let postData = {};
                postData.userDetails = WidgetWall.SocialItems.userDetails;
                postData.images = WidgetWall.images ? $scope.WidgetWall.images : [];
                postData.imageUrl = imageUrl || null;
                postData.videos = WidgetWall.videos ? $scope.WidgetWall.videos : [];
                postData.wid = WidgetWall.SocialItems.wid;
                postData.text = WidgetWall.postText ? WidgetWall.postText.replace(/[#&%+!@^*()-]/g, function (match) {
                    return encodeURIComponent(match)
                }) : '';
                postData.location = WidgetWall.location ? $scope.WidgetWall.location : {};
                postData.taggedPeople = WidgetWall.taggedPeople ? $scope.WidgetWall.taggedPeople : [];
                postData.originalPostId = WidgetWall.originalPostId ? $scope.WidgetWall.originalPostId : "";
                WidgetWall.onSendMessage({ _id: postData.userDetails && postData.userDetails.userId ? postData.userDetails.userId : null }, postData.text, () =>
                    SocialDataStore.createPost(postData).then((response) => {
                        WidgetWall.SocialItems.items.unshift(postData);
                        Buildfire.messaging.sendMessageToControl({
                            name: EVENTS.POST_CREATED,
                            status: 'Success',
                            post: response.data
                        });
                        postData.id = response.data.id;
                        postData.uniqueLink = response.data.uniqueLink;
                        WidgetWall.scheduleNotification(postData, 'post');
                        // window.scrollTo(0, 0);
                        // $location.hash('top');
                        // $anchorScroll();
                    }, (err) => {
                        console.error("Something went wrong.", err)
                        WidgetWall.postText = '';
                    })
                );
            }

            WidgetWall.getPostContent = function (data) {
                if (data && data.results && data.results.length > 0 && !data.cancelled) {
                    $scope.WidgetWall.postText = data.results["0"].textValue;
                    $scope.WidgetWall.images = data.results["0"].images;

                    var gif = getGifUrl(data.results["0"].gifs);
                    if (gif && $scope.WidgetWall.images && $scope.WidgetWall.images.push) {
                        $scope.WidgetWall.images.push(gif);
                    }
                    function getGifUrl(gifs) {
                        if (gifs["0"] && gifs["0"].images.downsided_medium && gifs["0"].images.downsided_medium.url) {
                            return gifs["0"].images.downsided_medium.url;
                        } else if (gifs["0"] && gifs["0"].images.original && gifs["0"].images.original.url) {
                            return gifs["0"].images.original.url;
                        }
                    }
                }
            }


            // WidgetWall.openPostSection = function () {
            //     WidgetWall.SocialItems.authenticateUser(null, (err, user) => {
            //         if (err) return console.error("Getting user failed.", err);
            //         if (user) {
            //             WidgetWall.checkFollowingStatus();
                        // buildfire.input.showTextDialog({
                        //     "placeholder": WidgetWall.SocialItems.languages.writePost,
                        //     "saveText": WidgetWall.SocialItems.languages.confirmPost.length > 9 ? WidgetWall.SocialItems.languages.confirmPost.substring(0, 9) : WidgetWall.SocialItems.languages.confirmPost,
                        //     "cancelText": WidgetWall.SocialItems.languages.cancelPost.length > 9 ? WidgetWall.SocialItems.languages.cancelPost.substring(0, 9) : WidgetWall.SocialItems.languages.cancelPost,
                        //     "attachments": {
                        //         "images": { enable: true, multiple: true },
                        //         "gifs": { enable: true }
                        //     }
                        // }, (err, data) => {
            //                 if (err) return console.error("Something went wrong.", err);
            //                 if (data.cancelled) return console.error('User canceled.')
            //                 WidgetWall.getPostContent(data);
            //                 if ((WidgetWall.postText || ($scope.WidgetWall.images && $scope.WidgetWall.images.length > 0))) {
            //                     finalPostCreation($scope.WidgetWall.images);
            //                     if(!WidgetWall.SocialItems.isPrivateChat){
            //                         buildfire.auth.getCurrentUser((err , currentUser) => {
            //                             if(err || !currentUser) return;
            //                             else{
            //                                 console.log(WidgetWall.postText);
            //                                 Posts.addPost({postText:WidgetWall.postText ? WidgetWall.postText : "", postImages:$scope.WidgetWall.images || []},(err, r) => err ? console.log(err) : console.log(r));
            //                             } 
            //                         })
            //                     }
            //                 }
            //             });
            //         }
            //     });
            // }

            WidgetWall.navigateTo = function () {
                let privacy = util.getParameterByName("privacy") ? util.getParameterByName("privacy") : null;
                let query = 'wid=' + WidgetWall.SocialItems.wid;
                if (privacy) query += '&privacy=' + privacy;
                if (!WidgetWall.SocialItems.appSettings.actionItem.queryString)
                    WidgetWall.SocialItems.appSettings.actionItem.queryString = query;
                if (WidgetWall.SocialItems.appSettings.actionItem.type === 'navigation') {
                    Buildfire.navigation.navigateTo({
                        pluginId: WidgetWall.SocialItems.appSettings.actionItem.pluginId,
                        queryString: WidgetWall.SocialItems.appSettings.actionItem.queryString
                    });
                } else {
                    buildfire.actionItems.execute(WidgetWall.SocialItems.appSettings.actionItem, (err, action) => {
                        if (err) return console.error(err);
                    });
                }
            }

            WidgetWall.showMembers = function () {
                WidgetWall.SocialItems.authenticateUser(null, (err, userData) => {
                    if (err) return console.error("Getting user failed.", err);

                    if (userData) {
                        if (WidgetWall.SocialItems.wid) {
                            Location.go('#/members/' + WidgetWall.SocialItems.wid);
                        } else {
                            Location.go('#/members/home');
                        }
                    }
                });

            }

            WidgetWall.reportPost = (post, reason) =>{
                SocialDataStore.reportPost({
                    reason: reason,
                    reportedAt: new Date(),
                    reporter: WidgetWall.SocialItems.getUserName(WidgetWall.SocialItems.userDetails),
                    reported: WidgetWall.SocialItems.getUserName(post.userDetails) ,
                    reportedUserID: post.userId,
                    text: post.text,
                    postId: post.id,
                    post: post,
                    wid: WidgetWall.SocialItems.wid
                });
                Buildfire.dialog.toast({
                    message: "Post created successfully",
                });
            }

            $scope.getCroppedImage = (url) =>{
                return Buildfire.imageLib.cropImage(url, { size: "half_width", aspect: "9:16" });
            }

            WidgetWall.showMoreOptions = function (post) {
                WidgetWall.modalPopupThreadId = post.id;
                WidgetWall.SocialItems.authenticateUser(null, (err, userData) => {
                    if (err) return console.error("Getting user failed.", err);
                    if (userData) {
                        WidgetWall.checkFollowingStatus();
                        Modals.showMoreOptionsModal({
                            'postId': post.id,
                            'userId': post.userId,
                            'socialItemUserId': WidgetWall.SocialItems.userDetails.userId,
                            'languages': WidgetWall.SocialItems.languages
                        })
                            .then(function (data) {
                                if (WidgetWall.SocialItems.userBanned) return;
                                switch (data) {
                                    case WidgetWall.SocialItems.languages.reportPost:
                                        SocialDataStore.reportPost({
                                            reportedAt: new Date(),
                                            reporter: WidgetWall.SocialItems.getUserName(WidgetWall.SocialItems.userDetails),
                                            reported: WidgetWall.SocialItems.getUserName(post.userDetails) ,
                                            reportedUserID: post.userId,
                                            text: post.text,
                                            postId: post.id,
                                            wid: WidgetWall.SocialItems.wid
                                        });
                                        break;
                                    case "delete":
                                        WidgetWall.deletePost(post.id);
                                        break;
                                    case MORE_MENU_POPUP.BLOCK:

                                        $modal
                                            .open({
                                                templateUrl: 'templates/modals/delete-post-modal.html',
                                                controller: 'MoreOptionsModalPopupCtrl',
                                                controllerAs: 'MoreOptionsPopup',
                                                size: 'sm',
                                                resolve: {
                                                    Info: function () {
                                                        return post.id;
                                                    }
                                                }
                                            });
                                        break;
                                    default:
                                }

                            },
                                function (err) {
                                    console.log('Error in Error handler--------------------------', err);
                                });
                    }
                });
            };


            WidgetWall.sharePost = function(post){
                Buildfire.deeplink.generateUrl({
                    data: {postId: post.id}
                }, function (err, result) {
                    if (err) {
                        console.error(err)
                    } else {
                        buildfire.device.share({
                            text: "Hey Check out this post:",
                            image: post.images.length > 0 ? post.images[0] : null,
                            link: result.url
                        }, function (err, result) {
                            let newData = {...post.data}
                            newData.sharesCount++;
                            SocialDataStore.updatePost(newData).then((response) =>{
                            },(err) => {})
                         });

                    }
                });
            }


            WidgetWall.repostPost = function(post){
                Buildfire.input.showTextDialog({
                    "placeholder": "Enter a caption to repost",
                    "defaultValue": "",
                    "attachments": {
                        "images": { enable: false },
                        "gifs": { enable: false }
                    }
                }, (err, data) => {
                    if(err || !data || !data.results || !data.results.length > 0) return;
                    let text = data.results[0].textValue;
                    let postData = {
                        text: text ? text.replace(/[#&%+!@^*()-]/g, function (match) {
                            return encodeURIComponent(match)
                        }) : '',
                        images : post.images,
                        videos : post.videos,
                        location: post.location,
                        taggedPeople: [],
                        hashtags: [],
                        userDetails: WidgetWall.SocialItems.userDetails,
                        wid: WidgetWall.SocialItems.wid,
                        originalPost:{
                            displayName: WidgetWall.SocialItems.getUserName(post.userDetails),
                            userId: post.userDetails.userId,
                            postId: post.id, 
                        } ,
                    }
                    SocialDataStore.createPost(postData).then((response) => {
                        postData.likesCount = 0;
                        postData.sharesCount = 0;
                        postData.repliesCount = 0;
                        postData.repostsCount = 0;
                        SocialBuddies.interact(WidgetWall.SocialItems.userDetails.userId, post.userDetails.userId, (err, resp) =>{
                        });
                        WidgetWall.SocialItems.items.unshift(postData);
                            Buildfire.messaging.sendMessageToControl({
                                name: EVENTS.POST_CREATED,
                                status: 'Success',
                                post: response.data
                            });
                            postData.id = response.data.id;
                            postData.uniqueLink = response.data.uniqueLink;
                            let newData = {...post.data}
                            newData.repostsCount++;
                            SocialDataStore.updatePost(newData).then((response) =>{
                            },(err) => {})
    
                        }, (err) => {
                            console.error("Something went wrong.", err)
                            $scope.text = '';
                        })
                });
                
            }


            WidgetWall.likeThread = function (post) {
                WidgetWall.SocialItems.authenticateUser(null, (err, userData) => {
                    if (err) return console.error("Getting user failed.", err);
                    if (userData) {
                        if (WidgetWall.SocialItems.userBanned) return;
                        let liked = post.likes.find(element => element === WidgetWall.SocialItems.userDetails.userId);
                        let index = post.likes.indexOf(WidgetWall.SocialItems.userDetails.userId)
                        let postUpdate = WidgetWall.SocialItems.items.find(element => element.id === post.id)
                        if (liked !== undefined) {
                            post.likes.splice(index, 1)
                            postUpdate.isUserLikeActive = false;
                            Buildfire.messaging.sendMessageToControl({
                                'name': EVENTS.POST_UNLIKED,
                                'id': postUpdate.id,
                                'userId': liked
                            });
                        }
                        else {
                            post.likes.push(WidgetWall.SocialItems.userDetails.userId);
                            postUpdate.isUserLikeActive = true;
                            Buildfire.messaging.sendMessageToControl({
                                'name': EVENTS.POST_LIKED,
                                'id': postUpdate.id,
                                'userId': liked
                            });
                        }
                        SocialDataStore.updatePost(post).then(() => {
                            SubscribedUsersData.getGroupFollowingStatus(post.userId, WidgetWall.SocialItems.wid, WidgetWall.SocialItems.context.instanceId, function (err, status) {
                                if (status.length &&
                                    status[0].data && !status[0].data.leftWall && !liked) WidgetWall.scheduleNotification(post, 'like');
                            });
                        }, (err) => console.log(err));
                    }
                });
            }

            WidgetWall.seeMore = function (post) {
                WidgetWall.goToSinglePostView(post.id)
            };

            WidgetWall.getDuration = function (timestamp) {
                if (timestamp){
                    return moment(timestamp.toString()).fromNow();
                }
            };

            WidgetWall.goInToThread = function (threadId) {

                WidgetWall.SocialItems.authenticateUser(null, (err, user) => {
                    if (err) return console.error("Getting user failed.", err);
                    if (user) {
                        WidgetWall.checkFollowingStatus();
                        if (threadId && !WidgetWall.SocialItems.userBanned)
                            Location.go('#/thread/' + threadId);
                    }
                });
            };

            WidgetWall.deletePost = function (postId) {
                var success = function (response) {
                    if (response) {
                        Buildfire.dialog.toast({
                            message: "Post deleted successfully",
                        });
                        Buildfire.messaging.sendMessageToControl({ 'name': EVENTS.POST_DELETED, 'id': postId });
                        let postToDelete = WidgetWall.SocialItems.items.find(element => element.id === postId)
                        console.log(postToDelete);
                        Posts.deletePost({userId:postToDelete.userId,postText:postToDelete.text,postImages: postToDelete.imageUrl || [],},(err, r) =>{return});
                        let index = WidgetWall.SocialItems.items.indexOf(postToDelete);
                        WidgetWall.SocialItems.items.splice(index, 1);
                        if (!$scope.$$phase)
                            $scope.$digest();
                    }
                };
                // Called when getting error from SocialDataStore.deletePost method
                var error = function (err) {
                    console.log('Error while deleting post ', err);
                };
                // Deleting post having id as postId
                SocialDataStore.deletePost(postId).then(success, error);
            };

            Buildfire.messaging.onReceivedMessage = function (event) {
                if (event) {
                    switch (event.name) {
                        case EVENTS.POST_DELETED:
                            WidgetWall.SocialItems.items = WidgetWall.SocialItems.items.filter(function (el) {
                                return el.id != event.id;
                            });

                            if (WidgetWall.modalPopupThreadId == event.id)
                                Modals.close('Post already deleted');
                            if (!$scope.$$phase)
                                $scope.$digest();
                            break;
                        case EVENTS.BAN_USER:
                            delete event.name;
                            SubscribedUsersData.unfollowWall(event.reported, event.wid, true, function (err, result) {
                                if (err) return console.error(err);
                                else {
                                    WidgetWall.SocialItems.items = WidgetWall.SocialItems.items.filter(function (el) {
                                        return el.userId !== event.reported;
                                    });
                                    WidgetWall.SocialItems.items.map(item => {
                                        item.comments.filter(function (el) {
                                            return el.userId !== event.reported;
                                        });
                                    });
                                    if (!$scope.$$phase)
                                        $scope.$digest();
                                }
                            });

                            break;
                        case EVENTS.COMMENT_DELETED:
                            let post = WidgetWall.SocialItems.items.find(element => element.id === event.postId)
                            let index = post.comments.indexOf(event.comment);
                            post.comments.splice(index, 1);
                            if (WidgetWall.modalPopupThreadId == event.postId)
                                Modals.close('Comment already deleted');
                            if (!$scope.$$phase)
                                $scope.$digest();
                            break;
                        case 'ASK_FOR_POSTS':
                            if (WidgetWall.SocialItems.items.length) {
                                window.buildfire.messaging.sendMessageToControl({
                                    name: 'SEND_POSTS_TO_CP',
                                    posts: WidgetWall.SocialItems.items,
                                    pinnedPost: WidgetWall.pinnedPost
                                });
                            }
                            break;
                        case 'ASK_FOR_WALLID':
                            window.buildfire.messaging.sendMessageToControl({
                                name: 'SEND_WALLID',
                                wid: WidgetWall.SocialItems.wid,
                            });
                        default:
                            break;
                    }
                }
            };

            WidgetWall.decodeText = function (text) {
                return decodeURIComponent(text);
            };
            WidgetWall.navigateToProfile = function(userId){
                Location.go("#/profile/"+userId);
            }

            Buildfire.datastore.onUpdate(function (response) {
                if (response.tag === "Social") {
                    WidgetWall.setSettings(response);
                    setTimeout(function () {
                        if (!response.data.appSettings.disableFollowLeaveGroup) {
                            let wallSVG = document.getElementById("WidgetWallSvg")
                            if (wallSVG) {
                                wallSVG.style.setProperty("fill", WidgetWall.appTheme.icons, "important");
                            }
                        }
                    }, 100);
                }
                else if (response.tag === "languages")
                    WidgetWall.SocialItems.formatLanguages(response);
                $scope.$digest();
            });

            function updatePostsWithNames(user, status) {
                let page = 0, pageSize = 50, allPosts = [];
                function get() {
                    buildfire.appData.search({
                        filter: {
                            $or: [
                                { "$json.userId": user._id },
                                { "$json.comments.userId": user._id },
                            ]
                        }, page, pageSize, recordCount: true
                    }, 'wall_posts', (err, posts) => {
                        allPosts = allPosts.concat(posts.result);
                        if (posts.totalRecord > allPosts.length) {
                            page++;
                            get();
                        } else {
                            allPosts.map(item => {
                                var needsUpdate = false;
                                if (item.data.userId === user._id) {
                                    item.data.userDetails = status[0].data.userDetails;
                                    needsUpdate = true;
                                }
                                item.data.comments.map(comment => {
                                    if (comment.userId === user._id) {
                                        comment.userDetails = status[0].data.userDetails;
                                        needsUpdate = true;
                                    }
                                });
                                if (needsUpdate) {
                                    let postUpdate = WidgetWall.SocialItems.items.find(post => post.id === item.id);
                                    if (postUpdate) {
                                        let postIndex = WidgetWall.SocialItems.items.indexOf(postUpdate);
                                        WidgetWall.SocialItems.items[postIndex] = item.data;
                                    }
                                    buildfire.appData.update(item.id, item.data, 'wall_posts', (err, updatedPost) => {
                                        console.log(updatedPost)
                                        if (!$scope.$$phase) $scope.$digest();

                                    });
                                }

                            })
                            if (!$scope.$$phase) $scope.$digest();
                        }
                    });
                }
                get();
            }

            WidgetWall.statusCheck = function (status, user) {
                if (status && status[0]) {
                    if (!status[0].data.userDetails.lastUpdated) {
                        status[0].data.userDetails.lastUpdated = user.lastUpdated;
                        window.buildfire.appData.update(status[0].id, status[0].data, 'subscribedUsersData', function (err, data) {
                            if (err) return console.error(err);
                        });
                    } else {
                        var lastUpdated = new Date(status[0].data.userDetails.lastUpdated).getTime();
                        var dbLastUpdate = new Date(user.lastUpdated).getTime();
                        if (dbLastUpdate > lastUpdated || (typeof status[0].data.userDetails.firstName === 'undefined'
                            || typeof status[0].data.userDetails.lastName === 'undefined')) {
                            const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                            if (re.test(String(user.firstName).toLowerCase()))
                                user.firstName = 'Someone';
                            if (re.test(String(user.displayName).toLowerCase()))
                                user.displayName = 'Someone';
                            status[0].data.userDetails.displayName = user.displayName ? user.displayName : "";
                            status[0].data.userDetails.firstName = user.firstName ? user.firstName : "";
                            status[0].data.userDetails.lastName = user.lastName ? user.lastName : "";
                            status[0].data.userDetails.email = user.email;
                            status[0].data.userDetails.imageUrl = user.imageUrl;
                            status[0].data.userDetails.lastUpdated = user.lastUpdated;

                            window.buildfire.appData.update(status[0].id, status[0].data, 'subscribedUsersData', function (err, data) {
                                if (err) return console.error(err);
                                updatePostsWithNames(user, status);
                            });

                        }
                    }
                }
            }

            WidgetWall.privateChatSecurity = function () {
                if (WidgetWall.SocialItems.isPrivateChat) {
                    const user1Id = WidgetWall.SocialItems.wid.slice(0, 24);
                    const user2Id = WidgetWall.SocialItems.wid.slice(24, 48);
                    var loggedUser = WidgetWall.SocialItems.userDetails.userId;

                    if (loggedUser !== user1Id && loggedUser !== user2Id) {
                        buildfire.history.get({
                            pluginBreadcrumbsOnly: true
                        }, function (err, result) {
                            if (result[result.length - 1].options.isPrivateChat) {
                                result.map(item => buildfire.history.pop());
                                WidgetWall.SocialItems.items = [];
                                WidgetWall.SocialItems.isPrivateChat = false;
                                WidgetWall.SocialItems.pageSize = 5;
                                WidgetWall.SocialItems.page = 0;
                                WidgetWall.SocialItems.wid = WidgetWall.SocialItems.mainWallID;
                                WidgetWall.init();
                            }
                        });

                    }
                }
            }
            
            WidgetWall.openImageInFullScreen = (src) =>{
                buildfire.imagePreviewer.show(
                    {
                      images: [src],
                    },
                    () => {
                      console.log("Image previewer closed");
                    }
                  );
            }
            // On Login
            Buildfire.auth.onLogin(function (user) {
                console.log("NEW USER LOGGED IN", WidgetWall.SocialItems.forcedToLogin)
                if (!WidgetWall.SocialItems.forcedToLogin) {
                    WidgetWall.SocialItems.authenticateUser(user, (err, userData) => {
                        if (err) return console.error("Getting user failed.", err);
                        if (userData) {
                            WidgetWall.checkFollowingStatus();
                            WidgetWall.reloadPosts(true);
                            WidgetWall.SocialItems.items = [];
                            WidgetWall.SocialItems.page = 0;

                            WidgetWall.getPosts((err, posts) =>{
                                console.log(posts);
                                WidgetWall.reloadPosts(false);
                            });
                        }
                    });
                } else WidgetWall.SocialItems.forcedToLogin = false;
                // WidgetWall.showUserLikes();
                if ($scope.$$phase) $scope.$digest();
            });
            // On Logout
            Buildfire.auth.onLogout(function () {
                buildfire.history.get({
                    pluginBreadcrumbsOnly: true
                }, function (err, result) {
                    result.forEach(x => buildfire.history.pop());
                    Location.go("");
                    buildfire.appearance.titlebar.show();
                    WidgetWall.SocialItems.userDetails = {};
                    WidgetWall.groupFollowingStatus = false;
                    buildfire.notifications.pushNotification.unsubscribe(
                        {
                            groupName: WidgetWall.SocialItems.wid === '' ?
                                WidgetWall.SocialItems.context.instanceId : WidgetWall.SocialItems.wid
                        }, () => { });
                    WidgetWall.privateChatSecurity();
                    $rootScope.isLoading = true;
                    WidgetWall.reloadPosts(true);
                    WidgetWall.SocialItems.items = [];
                    WidgetWall.SocialItems.page = 0;

                    WidgetWall.getPosts((err, posts) =>{
                        console.log(posts);
                        WidgetWall.reloadPosts(false);
                        $timeout(function(){
                            $scope.$digest();
                        })
                    });
                });
            });
            WidgetWall.goToDiscover = function(){
                Location.go("#/discover/");
            }
            
            Buildfire.datastore.onUpdate((event) =>{
                if(event.tag === 'Social' || event.tag === 'languages'){
                    WidgetWall.SocialItems.getSettings((err, res) =>{
                        if(res) WidgetWall.setSettings(res);
                        WidgetWall.loginModal = {
                            message: WidgetWall.SocialItems.languages.logInbannerText,
                            dismiss: WidgetWall.SocialItems.languages.logIndismiss,
                            loginRegister: WidgetWall.SocialItems.languages.logInloginRegister,
                        }
                        WidgetWall.loginModal.isClosed = false;
                        $timeout(function(){
                            $scope.$digest();
                        })
                    });
                }
                else if(event.tag === 'SocialIcons'){
                    window.location.reload();
                }
            })
            let script = document.createElement("script");
            let scriptKey = Buildfire.getContext().apiKeys.googleMapKey;
            script.src = "https://maps.googleapis.com/maps/api/js?v=3.exp&libraries=places&key="+scriptKey;
            document.head.appendChild(script)
            // WidgetWall.goToDiscover();
        }])
})(window.angular);

