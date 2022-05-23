'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .controller('WidgetWallCtrl', ['$scope', 'SocialDataStore', 'Modals', 'Buildfire', '$rootScope', 'Location', 'EVENTS', 'GROUP_STATUS', 'MORE_MENU_POPUP', 'FILE_UPLOAD', '$modal', 'SocialItems', '$q', '$anchorScroll', '$location', '$timeout', 'Util', 'SubscribedUsersData', function ($scope, SocialDataStore, Modals, Buildfire, $rootScope, Location, EVENTS, GROUP_STATUS, MORE_MENU_POPUP, FILE_UPLOAD, $modal, SocialItems, $q, $anchorScroll, $location, $timeout, util, SubscribedUsersData) {
            var WidgetWall = this;

            WidgetWall.userDetails = {};
            WidgetWall.postText = '';
            WidgetWall.modalPopupThreadId;

            WidgetWall.allowCreateThread = true;
            WidgetWall.allowPrivateChat = false;
            WidgetWall.allowFollowLeaveGroup = true;
            WidgetWall.groupFollowingStatus = false;

            WidgetWall.threadTag = "thread";
            WidgetWall.appTheme = null;

            WidgetWall.loadedPlugin = false;
            WidgetWall.SocialItems = SocialItems.getInstance();
            WidgetWall.util = util;
            $rootScope.showThread = true;
            WidgetWall.loading = true;

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
                
                if(!WidgetWall.allowCreateThread && WidgetWall.SocialItems.isPrivateChat) {
                    WidgetWall.allowCreateThread = true;
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
                    elements[2].style.setProperty("fill", obj.colors.titleBarTextAndIcons, "important");
                    document.getElementById('followBtn').style.setProperty("background-color", obj.colors.icons, "important");
                    document.getElementById('addBtn').style.setProperty("background-color", obj.colors.icons, "important");
                    document.getElementById('socialHeader').style.setProperty("background-color", obj.colors.backgroundColor, "important");
                    WidgetWall.loadedPlugin = true;
                });
            }

            WidgetWall.getPosts = function () {
                WidgetWall.SocialItems.getPosts(function (err, data) {
                    WidgetWall.showUserLikes();
                    window.buildfire.messaging.sendMessageToControl({
                        name: 'SEND_POSTS_TO_CP',
                        posts: WidgetWall.SocialItems.items,
                        pinnedPost: WidgetWall.pinnedPost,
                        wid: WidgetWall.SocialItems.wid
                    });
                });
            }

            WidgetWall.showUserLikes = function () {
                WidgetWall.SocialItems.items.map(item => {
                    let liked = item.likes.find(like => like === WidgetWall.SocialItems.userDetails.userId);
                    if (liked) item.isUserLikeActive = true;
                    else item.isUserLikeActive = false;
                });
                $scope.$digest();
            }

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
                        index: { text: user.userId + '-' + WidgetWall.SocialItems.wid, string1: WidgetWall.SocialItems.wid }
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
                                        buildfire.publicData.update(status[0].id, status[0].data, 'subscribedUsersData', console.log);
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
                    options.text = WidgetWall.SocialItems.getUserName(WidgetWall.SocialItems.userDetails) + ' added new post on ' + decodeURIComponent(WidgetWall.SocialItems.context.title);
                else if (text === 'like')
                    options.text = WidgetWall.SocialItems.getUserName(WidgetWall.SocialItems.userDetails) + ' liked a post on ' + decodeURIComponent(WidgetWall.SocialItems.context.title);

                options.inAppMessage = decodeURIComponent(options.text);
                options.queryString = `wid=${WidgetWall.SocialItems.wid}`

                if (text === 'like' && post.userId === WidgetWall.SocialItems.userDetails.userId) return;

                if (WidgetWall.SocialItems.isPrivateChat) {
                    
                    let userIdsTosSend = [];
                    if (WidgetWall.SocialItems.userIds) {
                        options.queryString += `&userIds=${WidgetWall.SocialItems.userIds}` 
                        const userIds  = WidgetWall.SocialItems.userIds.split(',').filter((userId) => userId !== WidgetWall.SocialItems.userDetails.userId);
                        userIdsTosSend = userIds;
                    } else {
                        const user1Id = WidgetWall.SocialItems.wid.slice(0, 24);
                        const user2Id = WidgetWall.SocialItems.wid.slice(24, 48);
                        let userToSend = user1Id === WidgetWall.SocialItems.userDetails.userId
                            ? user2Id : user1Id;
                        userIdsTosSend.push(userToSend);
                    }

                    for (const userToSend of userIdsTosSend) {
                        SubscribedUsersData.getGroupFollowingStatus(userToSend, WidgetWall.SocialItems.wid, WidgetWall.SocialItems.context.instanceId, function (err, status) {
                            if (err) console.error('Error while getting initial group following status.', err);
                            if (status.length && status[0].data && !status[0].data.leftWall) {
                                options.users.push(userToSend);
                                options.text = WidgetWall.SocialItems.getUserName(WidgetWall.SocialItems.userDetails) + ' added new post on '
                                    + WidgetWall.SocialItems.getUserName(WidgetWall.SocialItems.userDetails) + ' | ' + WidgetWall.SocialItems.getUserName(status[0].data.userDetails);
                                    
                                buildfire.notifications.pushNotification.schedule(options, function 
                                    (err) {
                                    
                                    if (err) return console.error('Error while setting PN schedule.', err);
                                
                                });
                            } else if(!status.length && WidgetWall.SocialItems.appSettings.allowAutoSubscribe) {
                                buildfire.auth.getUserProfile({ userId: userToSend }, (err, user) => {
                                    if (err || !user) return console.error(err);
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
                     }
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
                                else if(result.text == "Send Direct Message") WidgetWall.openChat(userId);
                                else if(result.text == "Unfollow") Follows.unfollowUser(userId,(err, r) => err ? console.log(err) : console.log(r));
                                else if(result.text == "Follow") Follows.followUser(userId,(err, r) => err ? console.log(err) : console.log(r));
                                buildfire.components.drawer.closeDrawer();
                            }
                        );
                })
            }

            WidgetWall.openChat = function (userId) {
                if (WidgetWall.allowPrivateChat) {
                    WidgetWall.SocialItems.authenticateUser(null, (err, user) => {
                        if (err) return console.error("Getting user failed.", err);
                        if (user) {
                            buildfire.auth.getUserProfile({ userId: userId }, function (err, user) {
                                if (err || !user) return console.error("Getting user profile failed.", err);
                                if (userId === WidgetWall.SocialItems.userDetails.userId) return;
                                WidgetWall.openPrivateChat(userId, WidgetWall.SocialItems.getUserName(user));
                            });
                        }
                    });
                }
            };

            WidgetWall.init = function () {
                WidgetWall.SocialItems.getSettings((err, result) => {
                    if (err) return console.error("Fetching settings failed.", err);
                    if (result) {
                        WidgetWall.SocialItems.items = [];
                        WidgetWall.setSettings(result);
                        WidgetWall.showHidePrivateChat();
                        WidgetWall.followLeaveGroupPermission();
                        WidgetWall.setAppTheme();
                        WidgetWall.getPosts();
                        WidgetWall.SocialItems.authenticateUser(null, (err, user) => {
                            if (err) return console.error("Getting user failed.", err);
                            if (user) {
                                WidgetWall.checkFollowingStatus(user);
                                WidgetWall.checkForPrivateChat();
                            } else {
                                WidgetWall.groupFollowingStatus = false;
                            }
                        });
                    }
                });
            };

            WidgetWall.init();

            WidgetWall.checkForPrivateChat = function () {
                if (WidgetWall.SocialItems.isPrivateChat) {  
                        SubscribedUsersData.getUsersWhoFollow(WidgetWall.SocialItems.userDetails.userId, WidgetWall.SocialItems.wid, function (err, users) {
                            if (err) return console.log(err);

                            const otherUserIds = [];
                            if (!WidgetWall.SocialItems.userIds) {
                                const user1Id = WidgetWall.SocialItems.wid.slice(0, 24);
                                const user2Id = WidgetWall.SocialItems.wid.slice(24, 48);
                                var otherUser = (user1Id.localeCompare(WidgetWall.SocialItems.userDetails.userId) === 0)
                                    ? user2Id : user1Id;
                                    otherUserIds.push(otherUser)
                            } else {
                                const userIds = WidgetWall.SocialItems.userIds.split(',');
                                for (const uid of userIds) {
                                    otherUserIds.push(uid.trim());
                                }
                            }
                            
                            if (!users.length) {
                                for (const userId of otherUserIds) {
                                    WidgetWall.followPrivateWall(userId, WidgetWall.SocialItems.wid);
                                }
                            }
                        });
                }
                buildfire.deeplink.onUpdate((deeplinkData) => {
                    if (deeplinkData) {
                        let wallId = new URLSearchParams(deeplinkData).get('wid');
                        let userIds = new URLSearchParams(deeplinkData).get('userIds');
                        if (!userIds && wallId && wallId.length === 48) {
                            const user1Id = wallId.slice(0, 24);
                            const user2Id = wallId.slice(24, 48);
                            const otherUser = (user1Id.localeCompare(WidgetWall.SocialItems.userDetails.userId) === 0)
                                ? user2Id : user1Id;

                            WidgetWall.openChat(otherUser);
                        } else  {
                            WidgetWall.openGroupChat(userIds, wallId);
                        }
                    }
                });
            }

            WidgetWall.sanitizeWall = function (callback) {
                buildfire.publicData.search(
                    { filter: { '_buildfire.index.string1': WidgetWall.SocialItems.wid } },
                    'subscribedUsersData', function (err, result) {
                        if (err) console.log(err);
                        if (result && result.length > 2) {
                            const user1Id = WidgetWall.SocialItems.wid.slice(0, 24);
                            const user2Id = WidgetWall.SocialItems.wid.slice(24, 48);
                            result.map(item => {
                                if (item.data.userId !== user1Id && item.data.userId !== user2Id) {
                                    buildfire.publicData.delete(item.id, 'subscribedUsersData');
                                }
                            });
                        }
                    });
            }

            WidgetWall.followPrivateWall = function (userId, wid, userName = null) {
                buildfire.auth.getUserProfile({ userId: userId }, (err, user) => {
                    if (err || !user) return console.log('Error while saving subscribed user data.');
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
                        },
                        wallId: wid,
                        posts: [],
                        _buildfire: {
                            index: { text: userId + '-' + wid, string1: wid }
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

                WidgetWall.SocialItems.isPrivateChat = true;
                WidgetWall.SocialItems.wid = user.wid;
                WidgetWall.SocialItems.showMorePosts = false;
                WidgetWall.SocialItems.pageSize = 5;
                WidgetWall.SocialItems.page = 0;
                WidgetWall.SocialItems.pluginTitle = WidgetWall.SocialItems.getUserName(WidgetWall.SocialItems.userDetails) + ' | ' + user.name;

                buildfire.history.push(WidgetWall.SocialItems.getUserName(WidgetWall.SocialItems.userDetails) + ' | ' + user.name, {
                    isPrivateChat: true,
                    showLabelInTitlebar: true
                });
                WidgetWall.init();
            }

            $rootScope.$on('loadPrivateChat', function (event, error) {
                WidgetWall.init();
            });

            $rootScope.$on('navigatedBack', function (event, error) {
                WidgetWall.SocialItems.items = [];
                WidgetWall.SocialItems.isPrivateChat = false;
                WidgetWall.SocialItems.pageSize = 5;
                WidgetWall.SocialItems.page = 0;
                WidgetWall.SocialItems.wid = WidgetWall.SocialItems.mainWallID;
                WidgetWall.SocialItems.pluginTitle = '';
                WidgetWall.init();
            });

            // TODO
            /**
             * 
             */

            
            WidgetWall.openGroupChat = function (userIds, wid) {
                if (WidgetWall.allowPrivateChat) {
                    WidgetWall.SocialItems.authenticateUser(null, (err, user) => {
                        if (err) return console.error("Getting user failed.", err);
                        if (user) {
                            WidgetWall.navigateToPrivateChat({ id: userIds, name: 'someone', wid: wid });
                        }
                    });
                }
            }

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
                    this.isSupportThread = record.data.isSupportThread || undefined;
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
                        isSupportThread: this.isSupportThread,
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
                if (!WidgetWall.SocialItems.userIds && (!wallId || wallId.length != 48)) {
                    console.error("Invalid wall id");
                    return callback(new Error("Invalid wall id"));
                }
                    
                const otherUserIds = [];
                if (!WidgetWall.SocialItems.userIds) {
                    const user1Id = wallId.slice(0, 24);
                    const user2Id = wallId.slice(24, 48);
                    otherUserIds.push(user1Id, user2Id);
                } else {
                    const userIds = WidgetWall.SocialItems.userIds.split(',');
                    for (const uid of userIds) {
                        otherUserIds.push(uid.trim());
                    }
                    if (!otherUserIds.includes(user._id)) {
                        otherUserIds.push(user._id);
                    }
                }

                if (otherUserIds.length === 0 || !otherUserIds.includes(user._id)) {
                    return callback(
                        new Error("Logged in user must be one of the wall users")
                    );
                }

                buildfire.auth.getUserProfiles({ userIds: otherUserIds }, (err, users) => {
                    if (err) return callback(err);
                  
                    callback(null, users);
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

                        const haveSameUsers = (arr1, arr2) => {
                            if (arr1.length !== arr2.length) return false;

                            let userIds = {};
                            for (let user of arr1) {
                                userIds[user._id] = true;
                            }
                            
                            for (let user of arr1) {
                                if (!userIds[user._id]) return false;
                            }
                            return true;
                        }

                        if (!records || !records.length) {
                            let thread = new WidgetWall.Thread({
                                data: { users, wallId, wallTitle, createdBy }
                            });

                            if (WidgetWall.SocialItems.userIds) {
                                thread.isSupportThread = true;
                            }

                            buildfire.appData.insert(
                                thread.toJSON(),
                                WidgetWall.threadTag,
                                false,
                                (err, record) => {
                                    if (err) return callback(err);
                                    return callback(null, new WidgetWall.Thread(record));
                                }
                            );
                        } 
                        else if (!haveSameUsers(records[0].data.users, users)) {
                            let thread = new WidgetWall.Thread(records[0]);
                            thread.users = users;

                            if (WidgetWall.SocialItems.userIds) {
                                thread.isSupportThread = true;
                            }

                            buildfire.appData.update(
                                thread.id,
                                thread.toJSON(),
                                WidgetWall.threadTag,
                                (err, record) => {
                                    if (err) return callback(err);
                                    return callback(null, new WidgetWall.Thread(record));
                                });
                        }
                        else {
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

                        if (WidgetWall.SocialItems.userIds) {
                            thread.isSupportThread = true;
                        }

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
            WidgetWall.loadMorePosts = function () {
                WidgetWall.SocialItems.getPosts(function (err, data) {
                    window.buildfire.messaging.sendMessageToControl({
                        name: 'SEND_POSTS_TO_CP',
                        posts: WidgetWall.SocialItems.items,
                        pinnedPost: WidgetWall.pinnedPost,
                        wid: WidgetWall.SocialItems.wid
                    });
                    $scope.$digest();
                });
            }

            function finalPostCreation(imageUrl) {
                let postData = {};
                postData.userDetails = WidgetWall.SocialItems.userDetails;
                postData.imageUrl = imageUrl || null;
                postData.images = WidgetWall.images ? $scope.WidgetWall.images : [];
                postData.wid = WidgetWall.SocialItems.wid;
                postData.text = WidgetWall.postText ? WidgetWall.postText.replace(/[#&%+!@^*()-]/g, function (match) {
                    return encodeURIComponent(match)
                }) : '';


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

            WidgetWall.openPostSection = function () {
                WidgetWall.SocialItems.authenticateUser(null, (err, user) => {
                    if (err) return console.error("Getting user failed.", err);
                    if (user) {
                        WidgetWall.checkFollowingStatus();
                        buildfire.input.showTextDialog({
                            "placeholder": WidgetWall.SocialItems.languages.writePost,
                            "saveText": WidgetWall.SocialItems.languages.confirmPost.length > 9 ? WidgetWall.SocialItems.languages.confirmPost.substring(0, 9) : WidgetWall.SocialItems.languages.confirmPost,
                            "cancelText": WidgetWall.SocialItems.languages.cancelPost.length > 9 ? WidgetWall.SocialItems.languages.cancelPost.substring(0, 9) : WidgetWall.SocialItems.languages.cancelPost,
                            "attachments": {
                                "images": { enable: true, multiple: true },
                                "gifs": { enable: true }
                            }
                        }, (err, data) => {
                            if (err) return console.error("Something went wrong.", err);
                            if (data.cancelled) return console.error('User canceled.')
                            WidgetWall.getPostContent(data);
                            if ((WidgetWall.postText || ($scope.WidgetWall.images && $scope.WidgetWall.images.length > 0))) {
                                finalPostCreation($scope.WidgetWall.images);
                                if(!WidgetWall.SocialItems.isPrivateChat){
                                    buildfire.auth.getCurrentUser((err , currentUser) => {
                                        if(err || !currentUser) return;
                                        else{
                                            console.log(WidgetWall.postText);
                                            Posts.addPost({postText:WidgetWall.postText ? WidgetWall.postText : "", postImages:$scope.WidgetWall.images || []},(err, r) => err ? console.log(err) : console.log(r));
                                        } 
                                    })
                                }
                            }
                        });
                    }
                });
            }

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
                                            reporter: WidgetWall.SocialItems.userDetails.email,
                                            reported: post.userDetails.email,
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
                post.seeMore = true;
                post.limit = 10000000;
                if (!$scope.$$phase) $scope.$digest();
            };

            WidgetWall.seeLess = function (post) {
              post.seeMore = false;
              post.limit = 150;
              if (!$scope.$$phase) $scope.$digest();
            };

            WidgetWall.getDuration = function (timestamp) {
                if (timestamp)
                    return moment(timestamp.toString()).fromNow();
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
                    buildfire.publicData.search({
                        filter: {
                            $or: [
                                { "$json.userId": user._id },
                                { "$json.comments.userId": user._id },
                            ]
                        }, page, pageSize, recordCount: true
                    }, 'posts', (err, posts) => {
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
                                    buildfire.publicData.update(item.id, item.data, 'posts', (err, updatedPost) => {
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
                        window.buildfire.publicData.update(status[0].id, status[0].data, 'subscribedUsersData', function (err, data) {
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

                            window.buildfire.publicData.update(status[0].id, status[0].data, 'subscribedUsersData', function (err, data) {
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
            // On Login
            Buildfire.auth.onLogin(function (user) {
                console.log("NEW USER LOGGED IN", WidgetWall.SocialItems.forcedToLogin)
                if (!WidgetWall.SocialItems.forcedToLogin) {
                    WidgetWall.SocialItems.authenticateUser(user, (err, userData) => {
                        if (err) return console.error("Getting user failed.", err);
                        if (userData) {
                            WidgetWall.checkFollowingStatus();
                        }
                    });
                } else WidgetWall.SocialItems.forcedToLogin = false;
                WidgetWall.showUserLikes();
                if ($scope.$$phase) $scope.$digest();
            });
            // On Logout
            Buildfire.auth.onLogout(function () {
                console.log('User loggedOut from Widget Wall Page');
                buildfire.appearance.titlebar.show();
                WidgetWall.SocialItems.userDetails = {};
                WidgetWall.groupFollowingStatus = false;
                buildfire.notifications.pushNotification.unsubscribe(
                    {
                        groupName: WidgetWall.SocialItems.wid === '' ?
                            WidgetWall.SocialItems.context.instanceId : WidgetWall.SocialItems.wid
                    }, () => { });
                WidgetWall.privateChatSecurity();
                $scope.$digest();
            });

        }])
})(window.angular);
