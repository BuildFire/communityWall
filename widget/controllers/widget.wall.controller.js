'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .controller('WidgetWallCtrl', ['$scope', 'SocialDataStore', 'Modals', 'Buildfire', '$rootScope', 'Location', 'EVENTS', 'GROUP_STATUS', 'MORE_MENU_POPUP', 'FILE_UPLOAD', '$modal', 'SocialItems', '$q', '$anchorScroll', '$location', '$timeout', 'Util', 'SubscribedUsersData', function ($scope, SocialDataStore, Modals, Buildfire, $rootScope, Location, EVENTS, GROUP_STATUS, MORE_MENU_POPUP, FILE_UPLOAD, $modal, SocialItems, $q, $anchorScroll, $location, $timeout, util, SubscribedUsersData) {
            var WidgetWall = this;
            WidgetWall.usersData = [];
            WidgetWall.userDetails = {};
            WidgetWall.height = window.innerHeight;
            WidgetWall.noMore = false;
            WidgetWall.postText = '';
            WidgetWall.picFile = '';
            WidgetWall.imageSelected = false;
            WidgetWall.imageName = '';
            WidgetWall.showImageLoader = true;
            WidgetWall.modalPopupThreadId;
            $rootScope.showThread = true;
            WidgetWall.allowCreateThread = true;
            WidgetWall.allowPrivateChat = false;
            WidgetWall.allowFollowLeaveGroup = true;
            WidgetWall.groupFollowingStatus = false;
            WidgetWall.threadTag = "thread";
            WidgetWall.wid = util.getParameterByName("wid") ? util.getParameterByName("wid") : '';
            WidgetWall.appTheme = null;
            WidgetWall.pageSize = 5;
            WidgetWall.page = 0;
            WidgetWall.showMorePosts = false;
            WidgetWall.loadedPlugin = false;
            WidgetWall.SocialItems = SocialItems.getInstance();
            $scope.users = {};

            var masterItems = WidgetWall.SocialItems && WidgetWall.SocialItems.items && WidgetWall.SocialItems.items.slice(0, WidgetWall.SocialItems.items.length);
            WidgetWall.showHideCommentBox = function () {
                if (WidgetWall.SocialItems &&
                    WidgetWall.SocialItems.appSettings &&
                    WidgetWall.SocialItems.appSettings.allowMainThreadTags &&
                    WidgetWall.SocialItems.appSettings.mainThreadUserTags &&
                    WidgetWall.SocialItems.appSettings.mainThreadUserTags.length > 0
                ) {
                    var _userTagsObj = WidgetWall.SocialItems.userDetails.userTags;
                    var _userTags = [];
                    if (_userTagsObj) {
                        _userTags = _userTagsObj[Object.keys(_userTagsObj)[0]];
                    }

                    if (_userTags) {
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
                    } else {
                        WidgetWall.allowCreateThread = false;
                    }
                } else {
                    WidgetWall.allowCreateThread = true;
                }
            };

            WidgetWall.showHidePrivateChat = function () {
                if (WidgetWall.SocialItems &&
                    WidgetWall.SocialItems.appSettings &&
                    WidgetWall.SocialItems.appSettings.disablePrivateChat
                ) {
                    WidgetWall.allowPrivateChat = false;
                } else {
                    WidgetWall.allowPrivateChat = true;
                }
            };

            WidgetWall.followLeaveGroupPermission = function () {
                if (WidgetWall.SocialItems &&
                    WidgetWall.SocialItems.appSettings &&
                    WidgetWall.SocialItems.appSettings.disableFollowLeaveGroup
                ) {
                    WidgetWall.allowFollowLeaveGroup = false;
                } else {
                    WidgetWall.allowFollowLeaveGroup = true;
                }
            };

            WidgetWall.init = function () {
                buildfire.spinner.show();
                buildfire.datastore.get("languages", (err, result) => {
                    if (err) return console.log(err)
                    let strings = {};
                    if (result.data && result.data.screenOne)
                        strings = result.data.screenOne;
                    else
                        strings = stringsConfig.screenOne.labels;

                    let languages = {};
                    Object.keys(strings).forEach(e => {
                        strings[e].value ? languages[e] = strings[e].value : languages[e] = strings[e].defaultValue;
                    });
                    WidgetWall.languages = languages;
                    WidgetWall.SocialItems.init(function (err, result) {
                        if (err) {
                            console.error('------------->cannot get app settings on init');
                        } else {

                            buildfire.datastore.get("Social", (err, response) => {
                                if (err) console.error('------------->cannot get app settings on init');
                                WidgetWall.SocialItems.appSettings = response.data.appSettings;
                                var dldActionItem = new URLSearchParams(window.location.search).get('actionItem');
                                if (!WidgetWall.SocialItems.appSettings) WidgetWall.SocialItems.appSettings = {};
                                if (WidgetWall.SocialItems.appSettings) {
                                    if (dldActionItem)
                                        WidgetWall.SocialItems.appSettings.actionItem = JSON.parse(dldActionItem);
                                    if (WidgetWall.SocialItems.appSettings.actionItem && WidgetWall.SocialItems.appSettings.actionItem.iconUrl) {
                                        WidgetWall.SocialItems.appSettings.actionItem.iconUrl = buildfire.imageLib.cropImage(WidgetWall.SocialItems.appSettings.actionItem.iconUrl, { size: 'xss', aspect: '1:1' })
                                        angular.element('#actionBtn').attr('style', `background-image: url(${WidgetWall.SocialItems.appSettings.actionItem.iconUrl}) !important; background-size: cover !important;`);
                                    }
                                    console.log("GOT ACTION ITEM", WidgetWall.SocialItems.appSettings.actionItem)
                                }
                                if(typeof (WidgetWall.SocialItems.appSettings.showMembers) == 'undefined') {
                                    WidgetWall.SocialItems.appSettings.showMembers = true;
                                }

                                if (response.data.appSettings && response.data.appSettings.pinnedPost) {
                                    WidgetWall.pinnedPost = response.data.appSettings.pinnedPost;
                                    pinnedPost.innerHTML = WidgetWall.pinnedPost;
                                }
                                WidgetWall.SocialItems.getPosts(WidgetWall.pageSize, WidgetWall.page, function (err, data) {
                                    if(data.totalRecord > WidgetWall.SocialItems.items.length) {
                                        WidgetWall.page++;
                                        WidgetWall.showMorePosts = true;
                                    }
                                });
                                WidgetWall.showHidePrivateChat();
                                WidgetWall.followLeaveGroupPermission();
                                const checkUserAuthPromise = checkUserIsAuthenticated();
                                checkUserAuthPromise.then(function (user) {
                                    let unsubscribed = util.getParameterByName("unsubscribed");

                                    if (unsubscribed !== null)
                                        WidgetWall.unfollowWall();
                                    else
                                        WidgetWall.followWall();

                                    if (WidgetWall.SocialItems.isPrivateChat) {
                                        SubscribedUsersData.getUsersWhoFollow(WidgetWall.SocialItems.userDetails.userId, WidgetWall.wid, function (err, users) {
                                            if (err) return console.log(err);
                                            console.log("USERS", users)
                                            const user1Id = WidgetWall.wid.slice(0, 24);
                                            const user2Id = WidgetWall.wid.slice(24, 48);
                                            if(!users.length) {
                                                var otherUser = (user1Id.localeCompare(WidgetWall.SocialItems.userDetails.userId) === 0)
                                                ? user2Id : user1Id;
                                                WidgetWall.subscribeUser(otherUser, WidgetWall.wid);
                                            }
                                        });
 
                                    }
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
                                    })
                                    WidgetWall.loadedPlugin = true;
                                    buildfire.spinner.hide();
                                })
                            })
                        }
                    })
                });

            };

            WidgetWall.init();

            WidgetWall.unfollowWall = function () {
                WidgetWall.groupFollowingStatus = false;
                buildfire.notifications.pushNotification.unsubscribe({ groupName: WidgetWall.wid }, () => { });
                const options = {
                    text: 'You have left this group',
                };
                buildfire.components.toast.showToastMessage(options, (error, result) => { });
            }


            WidgetWall.followWall = function () {
                SubscribedUsersData.getGroupFollowingStatus(WidgetWall.SocialItems.userDetails.userId, WidgetWall.wid, WidgetWall.SocialItems.context.instanceId, function (err, status) {
                    if (err) {
                        console.log('error while getting initial group following status.', err);
                    } else {
                        if (!status.length) return WidgetWall.newInitSubscribe()
                        WidgetWall.groupFollowingStatus = true;
                        buildfire.notifications.pushNotification.subscribe({ groupName: WidgetWall.wid }, () => { });
                        WidgetWall.showHideCommentBox();
                        buildfire.auth.getCurrentUser(function (err, user) {
                            WidgetWall.statusCheck(status, user);
                        })
                        setTimeout(function () {
                            if (!$scope.$$phase) $scope.$digest();
                        }, 50);
                    }
                });

            }


            WidgetWall.newInitSubscribe = function () {
                window.buildfire.auth.getCurrentUser(function (err, user) {
                    if (user) {
                        SubscribedUsersData.getGroupFollowingStatus(user._id, WidgetWall.wid, WidgetWall.SocialItems.context.instanceId, function (err, status) {
                            if (status.length === 0) {
                                const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                                if (re.test(String(user.firstName).toLowerCase()))
                                    user.firstName = 'Someone';
                                if (re.test(String(user.displayName).toLowerCase()))
                                    user.displayName = 'Someone';
                                var params = {
                                    userId: user._id,
                                    userDetails: {
                                        displayName: user.displayName,
                                        imageUrl: user.imageUrl,
                                        email: user.email,
                                        lastUpdated: new Date().getTime(),
                                    },
                                    wallId: WidgetWall.wid,
                                    posts: [],
                                    _buildfire: {
                                        index: { text: user._id + '-' + WidgetWall.wid, string1: WidgetWall.wid }
                                    }
                                };
                                SubscribedUsersData.save(params, function (err) {
                                    if (err) {
                                        console.log('Error while saving subscribed user data.');
                                    } else {
                                        WidgetWall.groupFollowingStatus = true;
                                        buildfire.notifications.pushNotification.subscribe({ groupName: WidgetWall.wid }, () => { });
                                        console.log("SACUVAVA KORISNIKA", user._id)
                                        if (!$scope.$$phase) $scope.$digest();
                                    }
                                });
                            }
                        })

                    }
                });
            };

            WidgetWall.subscribeUser = function (userId, wid, userName = null) {
                buildfire.auth.getUserProfile({ userId: userId }, (err, user) => {
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
                    console.log("SACUVAVA KORISNIKA ZA PRIVATE", params)
                    SubscribedUsersData.save(params, function (err) {
                        if (err) console.log('Error while saving subscribed user data.');
                        if(userName) {
                            Buildfire.history.push("Main Social Wall");

                            Buildfire.navigation.navigateTo({
                                pluginId: WidgetWall.SocialItems.context.pluginId,
                                instanceId: WidgetWall.SocialItems.context.instanceId,
                                //folderName: plugin._buildfire.pluginType.result[0].folderName,
                                title: WidgetWall.SocialItems.userDetails.displayName + ' | ' + userName,
                                queryString: 'wid=' + wid + '&targetUser=' + JSON.stringify({ userId: userId, userName: userName }) + "&wTitle=" + encodeURIComponent(WidgetWall.SocialItems.userDetails.displayName + ' | ' + userName)
                            });
                        }
 
                    });
                })
            } 

            WidgetWall.openChatOrProfile = function (userId) {
                if (WidgetWall.allowPrivateChat) {
                    buildfire.auth.getUserProfile({ userId: userId }, function (err, user) {
                        WidgetWall.openPrivateChat(userId, user.displayName);
                    })

                }
            };

            WidgetWall.openPrivateChat = function (userId, userName) {

                var checkUserAuthPromise = checkUserIsAuthenticated();
                checkUserAuthPromise.then(function (response) {
                    var wid = null;
                    //check if user logged in and avoid self chatting
                    if (WidgetWall.SocialItems.userDetails.userId && WidgetWall.SocialItems.userDetails.userId != userId) {
                        if (WidgetWall.SocialItems.userDetails.userId > userId) {
                            wid = WidgetWall.SocialItems.userDetails.userId + userId;
                        } else {
                            wid = userId + WidgetWall.SocialItems.userDetails.userId;
                        }

                        //prevent opening same private chat when it's already opened
                        var _instanceId = util.getParameterByName("wid");

                        if (_instanceId && _instanceId == wid) {
                            return;
                        }
                        //#

                        SubscribedUsersData.getGroupFollowingStatus(userId, wid, WidgetWall.SocialItems.context.instanceId, function (err, status) {
                            if (err) {
                                console.log('error while getting initial group following status.', err);
                            } else
                                if (!status.length) {
                                  WidgetWall.subscribeUser(userId, wid, userName);                                
                                } else {
                                    Buildfire.history.push("Main Social Wall");
                                    Buildfire.navigation.navigateTo({
                                        pluginId: WidgetWall.SocialItems.context.pluginId,
                                        instanceId: WidgetWall.SocialItems.context.instanceId,
                                        title: WidgetWall.SocialItems.userDetails.displayName + ' | ' + userName,
                                        queryString: 'wid=' + wid + '&targetUser=' + JSON.stringify({ userId: userId, userName: userName }) + "&wTitle=" + encodeURIComponent(WidgetWall.SocialItems.userDetails.displayName + ' | ' + userName)
                                    });

                                }
                        })


                    }
                }, function (err) {
                    console.log('error is ------', err);
                });
            };
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
                const wallId = util.getParameterByName("wid");
                const wallTitle = util.getParameterByName("wTitle");

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
            WidgetWall.loadMorePosts = function () {
                WidgetWall.SocialItems.getPosts(WidgetWall.pageSize, WidgetWall.page, function (err, data) {
                    if(data.totalRecord > WidgetWall.SocialItems.items.length) {
                        WidgetWall.showMorePosts = true;
                        WidgetWall.page++;
                    } else WidgetWall.showMorePosts = false;
                    $scope.$digest();
                });
            }

            WidgetWall.createPost = function ($event) {
                var checkuserAuthPromise = checkUserIsAuthenticated();
                checkuserAuthPromise.then(function (response) {
                    if (!$rootScope.$$phase) $rootScope.$digest();
                    WidgetWall.closePostSection();

                    if ((WidgetWall.postText || ($scope.WidgetWall.images && $scope.WidgetWall.images.length > 0)) && !WidgetWall.waitAPICompletion) {                        // text post
                        WidgetWall.waitAPICompletion = true;
                        finalPostCreation($scope.WidgetWall.images);
                    }

                }, function (err) {
                    console.log('error is ------', err);
                });

            };
            WidgetWall.openPostSection = function () {
                var checkUserPromise = checkUserIsAuthenticated(false);
                checkUserPromise.then(function () {
                    if (!WidgetWall.allowCreateThread) return;
                    buildfire.input.showTextDialog({
                        "placeholder": WidgetWall.languages.writePost,
                        "saveText": WidgetWall.languages.confirmPost,
                        "cancelText": WidgetWall.languages.cancelPost,
                        "attachments": {
                            "images": { enable: true, multiple: true },
                            "gifs": { enable: true }
                        }
                    }, function (err, data) {
                        if (err)
                            console.error(err);
                        else
                            if (data && data.results && data.results.length > 0 && !data.cancelled) {
                                $scope.WidgetWall.postText = data.results["0"].textValue;
                                $scope.WidgetWall.images = data.results["0"].images;

                                var gif = getGifUrl(data.results["0"].gifs);
                                if (gif && $scope.WidgetWall.images && $scope.WidgetWall.images.push) {
                                    $scope.WidgetWall.images.push(gif);
                                }

                                WidgetWall.createPost();

                                function getGifUrl(gifs) {
                                    if (gifs["0"] && gifs["0"].images.downsided_medium && gifs["0"].images.downsided_medium.url) {
                                        return gifs["0"].images.downsided_medium.url;
                                    } else if (gifs["0"] && gifs["0"].images.original && gifs["0"].images.original.url) {
                                        return gifs["0"].images.original.url;
                                    }
                                }
                            }
                    });
                }, function (err) {
                    console.log('error is::::', err);
                });


            };
            WidgetWall.closePostSection = function () {
                WidgetWall.goFullScreen = false;
                Buildfire.history.pop();
            };
            Buildfire.history.onPop(function (breadcrumb) {
                WidgetWall.init();
                WidgetWall.goFullScreen = false;
                if (!$scope.$$phase) $scope.$digest();
            }, true);

            var getImageSizeInMB = function (size) {
                return (size / (1024 * 1024));       // return size in MB
            };


            var checkUserIsAuthenticated = function () {
                var deferredObject = $q.defer();
                Buildfire.auth.getCurrentUser(function (err, userData) {

                    if (userData) {
                        WidgetWall.SocialItems.userDetails.userToken = userData.userToken;
                        WidgetWall.SocialItems.userDetails.userId = userData._id;
                        WidgetWall.SocialItems.userDetails.email = userData.email;
                        WidgetWall.SocialItems.userDetails.firstName = userData.firstName;
                        WidgetWall.SocialItems.userDetails.displayName = userData.displayName;

                        const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

                        if (re.test(String(userData.firstName).toLowerCase()))
                            WidgetWall.SocialItems.userDetails.firstName = 'Someone';

                        if (re.test(String(userData.displayName).toLowerCase()))
                            WidgetWall.SocialItems.userDetails.displayName = 'Someone';

                        console.info('Current Logged In user details are -----------------', WidgetWall.SocialItems.userDetails);
                        WidgetWall.showHideCommentBox();
                        deferredObject.resolve(userData);
                    }
                    else if (err) {
                        return deferredObject.reject(err);
                    } else {
                        if (err) {
                            return deferredObject.reject(err);
                        } else {
                            Buildfire.auth.login(null, function (err, user) {
                                console.log('Login called---------------------------------', user, err);
                                if (err) {
                                    return deferredObject.reject(err);
                                } else if (user)
                                    WidgetWall.openPostSection();
                            });
                        }
                    }
                });
                return deferredObject.promise;
            };

            function finalPostCreation(imageUrl) {
                var postData = {};
                postData.text = WidgetWall.postText ? WidgetWall.postText.replace(/[#&%+!@^*()-]/g, function (match) {
                    return encodeURIComponent(match)
                }) : '';
                buildfire.auth.getCurrentUser(function (err, result) {
                    postData.userDetails = {
                        email: result.email,
                        displayName: WidgetWall.SocialItems.userDetails.displayName,
                        imageUrl: result.imageUrl,
                    }
                    postData.images = WidgetWall.images ? $scope.WidgetWall.images : [];
                    postData.title = '';
                    postData.imageUrl = imageUrl || null;
                    postData.userToken = WidgetWall.SocialItems.userDetails.userToken;
                    postData.userId = WidgetWall.SocialItems.userDetails.userId;
                    // postData.userName = WidgetWall.SocialItems.userDetails.displayName;
                    postData.isUserLikeActive = false;
                    postData.likes = [];
                    postData.comments = [];
                    postData.wid = WidgetWall.wid;
                    postData.createdOn = new Date();
                    postData.createdBy = result._id;
                    postData._buildfire = {
                        index: {
                            string1: WidgetWall.wid,
                        }
                    }
                    WidgetWall.SocialItems.items.unshift(postData);
                    WidgetWall.onSendMessage({ _id: postData.userId }, postData.text, () => {SocialDataStore.createPost(postData).then(success, error);})
                });

                var success = function (response) {
                    console.log("POST", response)
                    WidgetWall.postText = '';
                    WidgetWall.picFile = '';
                    if (response.data.error) {
                        console.error('Error while creating post ', response.data.error);
                        WidgetWall.waitAPICompletion = false;
                        var _postIndex = WidgetWall.SocialItems.items.indexOf(postData);
                        WidgetWall.SocialItems.items.splice(_postIndex, 1);
                    } else if (response.data) {
                        Buildfire.messaging.sendMessageToControl({
                            name: EVENTS.POST_CREATED,
                            status: 'Success',
                            post: response.data
                        });
                        postData.id = response.data.id;
                        WidgetWall.imageName = '';
                        WidgetWall.imageSelected = false;
                        postData.uniqueLink = response.data.uniqueLink;

                        if (!$scope.$$phase) $scope.$digest();

                        var wallIdValue = util.getParameterByName("wid");
                        var wallId = wallIdValue ? wallIdValue : '';
                        var options = {
                            title: 'Notification',
                            text: '',
                            at: new Date(),
                            users: [],
                        };

                        var sendNotification = function() {
                            if (WidgetWall.SocialItems.userDetails.firstName) {
                                options.text = WidgetWall.SocialItems.userDetails.firstName + ' added new post on ' + WidgetWall.SocialItems.context.title;
                            } else {
                                options.text = 'Someone added new post on ' + WidgetWall.SocialItems.context.title;
                            }
                            options.inAppMessage = options.text;
                            if (wallId.length) options.queryString = `wid=${wallId}`;
                            console.log("SENT NOTIFICATION", options)
                            buildfire.notifications.pushNotification.schedule(
                                options,
                                function (e) {
                                    if (e) console.error('Error while setting PN schedule.', e);
                                }
                            );
                        }

                        if (WidgetWall.SocialItems.isPrivateChat) {
                            SubscribedUsersData.getUsersWhoFollow(WidgetWall.SocialItems.userDetails.userId, wallId, function (err, users) {
                                if (err) return console.log(err);
                                users.map(el => { options.users.push(el.userId) })
                                sendNotification();
                            });
                        } else {
                            options.groupName = WidgetWall.wid;
                            sendNotification();
                        }


                        WidgetWall.waitAPICompletion = false;
                        $location.hash('top');
                        $anchorScroll();
                        Buildfire.navigation.scrollTop();
                    }
                };
                var error = function (err) {
                    var _postIndex = WidgetWall.SocialItems.items.indexOf(postData);
                    WidgetWall.SocialItems.items.splice(_postIndex, 1);
                    console.log('Error while creating post ', err);
                    WidgetWall.postText = '';
                    WidgetWall.picFile = '';
                    WidgetWall.waitAPICompletion = false;
                    if (err.status == 0) {
                        console.log('------------->INTERNET CONNECTION PROBLEM')
                        $modal
                            .open({
                                template: [
                                    '<div class="padded clearfix">',
                                    '<div class="content text-center">',
                                    '<p>No internet connection was found. please try again later</p>',
                                    '<a class="margin-zero"  ng-click="ok(option)">OK</a>',
                                    '</div>',
                                    '</div></div>'
                                ].join(''),
                                controller: 'MoreOptionsModalPopupCtrl',
                                controllerAs: 'MoreOptionsPopup',
                                size: 'sm',
                                resolve: {
                                    Info: function () {
                                        return {};
                                    }
                                }
                            });

                    }
                    if (!$scope.$$phase) $scope.$digest();

                };
            };

            WidgetWall.getUserName = function (userId) {
                if (!userId)
                    return;

                var userName = '';
                WidgetWall.usersData.some(function (userData) {
                    if (userData.userObject && userData.userObject._id == userId) {
                        userName = userData.userObject.displayName;
                        return true;
                    }
                });

                return userName;
            };
            WidgetWall.getUserImage = function (userId) {
                if (!userId)
                    return;

                var userImageUrl = '';
                WidgetWall.usersData.some(function (userData) {
                    if (userData.userObject && userData.userObject._id == userId) {
                        userImageUrl = userData.userObject.imageUrl || '';
                        return true;
                    }
                });

                return userImageUrl;
            };
            WidgetWall.navigateTo = function () {
                let privacy = util.getParameterByName("privacy") ? util.getParameterByName("privacy") : null;
                console.log(privacy)
                let query = 'wid=' + WidgetWall.wid;
                if (privacy) query += '&privacy=' + privacy;
                console.log("QUERY", query)
                if (!WidgetWall.SocialItems.appSettings.actionItem.queryString)
                    WidgetWall.SocialItems.appSettings.actionItem.queryString = query;
                console.log("ACTION ITEM", WidgetWall.SocialItems.appSettings.actionItem)
                if(WidgetWall.SocialItems.appSettings.actionItem.type === 'navigation') {
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
                if (WidgetWall.wid) {
                    Location.go('#/members/' + WidgetWall.wid);
                } else {
                    Location.go('#/members/home');
                }
            }

            WidgetWall.showMoreOptions = function (post) {
                WidgetWall.modalPopupThreadId = post.id;
                var checkuserAuthPromise = checkUserIsAuthenticated();
                checkuserAuthPromise.then(function (response) {
                    Modals.showMoreOptionsModal({
                        'postId': post.id,
                        'userId': post.userId,
                        'socialItemUserId': WidgetWall.SocialItems.userDetails.userId,
                        'languages': WidgetWall.languages
                    })
                        .then(function (data) {
                            switch (data) {

                                case MORE_MENU_POPUP.REPORT:

                                    var reportPostPromise = SocialDataStore.reportPost(post.id);
                                    reportPostPromise.then(function (response) {
                                        for (var index in WidgetWall.SocialItems.items)
                                            if (WidgetWall.SocialItems.items[index].id == post.id) {
                                                WidgetWall.SocialItems.items.splice(index, 1);
                                                break;
                                            }
                                        $modal
                                            .open({
                                                templateUrl: 'templates/modals/report-generated-modal.html',
                                                controller: 'MoreOptionsModalPopupCtrl',
                                                controllerAs: 'MoreOptionsPopup',
                                                size: 'sm',
                                                resolve: {
                                                    Info: function () {
                                                        return post.id;
                                                    }
                                                }
                                            });

                                    }, function () {

                                    });

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
                }, function (err) {
                    console.log('Error is ::::::', err);
                });
            };

            WidgetWall.likeThread = function (post, type) {
                let pushNotification = false;
                var checkuserAuthPromise = checkUserIsAuthenticated();
                checkuserAuthPromise.then(function () {
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
                    buildfire.publicData.update(post.id, post, 'posts', (err, updatedPost) => {
                        let wallId = util.getParameterByName("wid") ? util.getParameterByName("wid") : '';
                        let oldPost = WidgetWall.SocialItems.items.find(element => element.id === updatedPost.id);
                        oldPost = updatedPost;
                        if (postUpdate.isUserLikeActive) {
                            var options = {
                                title: 'Notification',
                                text: '',
                                at: new Date(),
                                users: []
                            };
                            if (WidgetWall.SocialItems.userDetails.firstName) {
                                options.text = WidgetWall.SocialItems.userDetails.firstName + ' liked a post on ' + WidgetWall.SocialItems.context.title;
                            } else {
                                options.text = 'Someone liked a post on ' + WidgetWall.SocialItems.context.title;
                            }

                            if (wallId.length) options.queryString = `wid=${wallId}`;
                            options.inAppMessage = options.text;
                            options.users.push(post.userId);
                            buildfire.notifications.pushNotification.schedule(
                                options,
                                function (e) {
                                    if (e) console.error('Error while setting PN schedule.', e);
                                }
                            );
                        }
                    });
                });
            };

            WidgetWall.seeMore = function (post) {
                post.seeMore = true;
                post.limit = 10000000;
                if (!$scope.$$phase) $scope.$digest();
            };
            WidgetWall.getDuration = function (timestamp) {
                if (timestamp)
                    return moment(timestamp.toString()).fromNow();
            };

            WidgetWall.goInToThread = function (threadId) {

                if (threadId)
                    Location.go('#/thread/' + threadId);
            };

            WidgetWall.deletePost = function (postId) {
                var success = function (response) {
                    if (response) {
                        Buildfire.messaging.sendMessageToControl({ 'name': EVENTS.POST_DELETED, 'id': postId });
                        let postToDelete = WidgetWall.SocialItems.items.find(element => element.id === postId)
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

            WidgetWall.followUnfollow = function (isFollow) {
                if (WidgetWall.SocialItems.userDetails.userToken && WidgetWall.SocialItems.userDetails.userId) {
                    updateFollowUnfollow(isFollow);
                } else {
                    Buildfire.auth.login(null, function (err, user) {
                        console.log('Login called---------------------------------', user, err);
                        if (err) {
                            console.log('Error while logging in---------', err);
                        } else {
                            updateFollowUnfollow(isFollow);
                        }
                    });
                }
            };

            var updateFollowUnfollow = function () {
                if (WidgetWall.groupFollowingStatus) {
                    SubscribedUsersData.unfollowWall(WidgetWall.SocialItems.userDetails.userId, WidgetWall.wid, WidgetWall.SocialItems.context.instanceId, function (err, result) {
                        if (err) return console.error(err);
                        else {
                            WidgetWall.groupFollowingStatus = false;
                            WidgetWall.unfollowWall();
                            if (!$scope.$$phase) $scope.$digest();
                        }
                    })
                } else WidgetWall.newInitSubscribe();
            };

            Buildfire.messaging.onReceivedMessage = function (event) {
                if (event) {
                    switch (event.name) {
                        case EVENTS.POST_DELETED:
                            WidgetWall.deletePost(event.id);

                            if (WidgetWall.modalPopupThreadId == event.id)
                                Modals.close('Post already deleted');
                            if (!$scope.$$phase)
                                $scope.$digest();
                            break;
                        case EVENTS.BAN_USER:
                            WidgetWall.SocialItems.items = WidgetWall.SocialItems.items.filter(function (el) {
                                return el.userId != event.id;
                            });
                            WidgetWall.SocialItems.items.map(item => {
                                item.comments.filter(function (el) {
                                    return el.userId != event.id;
                                });
                            })
                            Modals.close('User already banned');
                            if (!$scope.$$phase)
                                $scope.$digest();
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
                        default:
                            break;
                    }
                }
            };

            WidgetWall.uploadImage = function (file) {
                var fileSize;
                if (file) {
                    fileSize = getImageSizeInMB(file.size);      // get image size in MB
                    WidgetWall.imageSelected = true;
                    if (fileSize > FILE_UPLOAD.MAX_SIZE) {
                        WidgetWall.imageName = file.name + ' - ' + FILE_UPLOAD.SIZE_EXCEED;
                        WidgetWall.showImageLoader = false;
                    } else {
                        WidgetWall.imageName = file.name;
                        WidgetWall.showImageLoader = true;
                    }
                }
            };

            WidgetWall.decodeText = function (text) {
                return decodeURIComponent(text);
            };

            WidgetWall.cancelImageSelect = function () {
                WidgetWall.imageName = WidgetWall.imageName.replace(' - ' + FILE_UPLOAD.SIZE_EXCEED, '') + ' - ' + FILE_UPLOAD.CANCELLED;
                $timeout(function () {
                    WidgetWall.imageSelected = false;
                    WidgetWall.imageName = '';
                    WidgetWall.picFile = '';
                    WidgetWall.showImageLoader = true;
                    if (!$scope.$$phase)
                        $scope.$digest();
                }, 500);
            };

            $scope.$watch(function () {
                return WidgetWall.SocialItems.items;
            }, function () {
                if (masterItems && WidgetWall.SocialItems.items && masterItems.length != WidgetWall.SocialItems.items.length) {
                    masterItems = WidgetWall.SocialItems && WidgetWall.SocialItems.items && WidgetWall.SocialItems.items.slice(0, WidgetWall.SocialItems.items.length);
                }
            }, true);

            Buildfire.datastore.onUpdate(function (response) {
                WidgetWall.SocialItems.parentThreadId = response && response.data.parentThreadId;
                WidgetWall.SocialItems.socialAppId = response && response.data.socialAppId;
                if (response.data.appSettings) {
                    WidgetWall.SocialItems.appSettings = response.data.appSettings;
                    if (response.data.appSettings.pinnedPost) {
                        WidgetWall.pinnedPost = response.data.appSettings.pinnedPost;
                        pinnedPost.innerHTML = WidgetWall.pinnedPost;
                    } else pinnedPost.innerHTML = "";
                    if (WidgetWall.SocialItems.appSettings.actionItem && WidgetWall.SocialItems.appSettings.actionItem.iconUrl) {
                        WidgetWall.SocialItems.appSettings.actionItem.iconUrl = buildfire.imageLib.cropImage(WidgetWall.SocialItems.appSettings.actionItem.iconUrl, { size: 'xs', aspect: '1:1' })
                        angular.element('#actionBtn').attr('style', `background-image: url(${WidgetWall.SocialItems.appSettings.actionItem.iconUrl}) !important`);
                        if (!$scope.$$phase) $scope.$digest();
                    } else angular.element('#actionBtn').attr('style', `background-image: unset`);
                    console.log("UPDATEAAAA", response)
                    WidgetWall.showHidePrivateChat();
                    WidgetWall.followLeaveGroupPermission();
                    WidgetWall.showHideCommentBox();
                    
                    setTimeout(function () {
                        if (!response.data.appSettings.disableFollowLeaveGroup) {
                            document.getElementById("membersSvg").style.setProperty("fill", WidgetWall.appTheme.icons, "important");
                        }
                    }, 100);
                }

                if (response.tag === "languages") {
                    let languages = {};
                    Object.keys(response.data.screenOne).forEach(e => {
                        response.data.screenOne[e].value ? languages[e] = response.data.screenOne[e].value : languages[e] = response.data.screenOne[e].defaultValue;
                    });
                    WidgetWall.languages = languages;
                }
                $scope.$digest();

            });

            WidgetWall.statusCheck = function (status, user) {
                if (status && status[0]) {
                    if (!status[0].data.userDetails.lastUpdated) {
                        console.log('nema updated');
                        status[0].data.userDetails.lastUpdated = user.lastUpdated;
                        window.buildfire.publicData.update(status[0].id, status[0].data, 'subscribedUsersData', function (err, data) {
                            if (err) return console.error(err);
                            console.log("UPDEJTOVAN", data);
                        });
                    } else {
                        var lastUpdated = new Date(status[0].data.userDetails.lastUpdated).getTime();
                        var dbLastUpdate = new Date(user.lastUpdated).getTime();
                        if (dbLastUpdate > lastUpdated) {
                            status[0].data.userDetails.displayName = user.displayName;
                            status[0].data.userDetails.email = user.email;
                            status[0].data.userDetails.imageUrl = user.imageUrl;
                            status[0].data.userDetails.lastUpdated = user.lastUpdated;
                            window.buildfire.publicData.update(status[0].id, status[0].data, 'subscribedUsersData', function (err, data) {
                                if (err) return console.error(err);
                            });

                            WidgetWall.SocialItems.items.map(item => {
                                var needsUpdate = false;
                                if (item.userId === user._id) {
                                    item.userDetails = status[0].data.userDetails;
                                    // item.userDetails.displayName = status[0].data.userDetails.displayName;
                                    // item.userDetails.email = status[0].data.userDetails.email;
                                    // item.userDetails.imageUrl = status[0].data.userDetails.imageUrl;
                                    needsUpdate = true;
                                }
                                item.comments.map(comment => {
                                    if (comment.userId === user._id) {
                                        comment.userDetails = status[0].data.userDetails;
                                        comment.userDetails.firstName = user.firstName;
                                        comment.userDetails.lastName = user.lastName;
                                        needsUpdate = true;
                                    }
                                })
                                if (needsUpdate)
                                    buildfire.publicData.update(item.id, item, 'posts', (err, updatedPost) => {
                                        console.log("UPDATED ITEM", updatedPost)
                                    });

                            });
                            console.log("ITEMS", WidgetWall.SocialItems.items)
                        }

                        console.log('ima updated')
                    }
                }
            }
            // On Login
            Buildfire.auth.onLogin(function (user) {

                console.log('New user loggedIN from Widget Wall Page', user);
                if (user && user._id) {
                    WidgetWall.SocialItems.userDetails.userToken = user.userToken;
                    WidgetWall.SocialItems.userDetails.userId = user._id;
                    WidgetWall.SocialItems.userDetails.email = user.email;
                    WidgetWall.SocialItems.userDetails.userTags = user.tags;

                    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

                    if (re.test(String(user.firstName).toLowerCase()))
                        WidgetWall.SocialItems.userDetails.firstName = 'Someone';

                    if (re.test(String(user.displayName).toLowerCase()))
                        WidgetWall.SocialItems.userDetails.displayName = 'Someone';


                    SubscribedUsersData.getGroupFollowingStatus(user._id, WidgetWall.wid, WidgetWall.SocialItems.context.instanceId, function (err, status) {
                        if (err) {
                            console.log('error while getting initial group following status.', err);
                        } else {
                            if (!status.length) return WidgetWall.newInitSubscribe();
                            WidgetWall.groupFollowingStatus = true;
                        }
                        WidgetWall.showHideCommentBox();
                        WidgetWall.statusCheck(status, user)
                        buildfire.notifications.pushNotification.subscribe({ groupName: WidgetWall.wid }, () => { });
                        $scope.$digest();
                    })

                }
            });
            // On Logout
            Buildfire.auth.onLogout(function () {
                console.log('User loggedOut from Widget Wall Page');
                WidgetWall.SocialItems.userDetails = {};
                WidgetWall.groupFollowingStatus = false;
                buildfire.notifications.pushNotification.unsubscribe({ groupName: WidgetWall.wid }, () => { });
                $scope.$digest();
            });

            /**
             * Implementation of pull down to refresh
             */
            var onRefresh = Buildfire.datastore.onRefresh(function () {
                Location.goToHome();
            });

        }])
})(window.angular);
