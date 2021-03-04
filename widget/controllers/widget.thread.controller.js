'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .controller('ThreadCtrl', ['$scope', '$routeParams', '$location', '$anchorScroll', 'SocialDataStore', 'Modals', '$rootScope', 'Buildfire', 'EVENTS', 'THREAD_STATUS', 'FILE_UPLOAD', 'SocialItems', '$q', '$timeout', 'Location', 'Util', 'GROUP_STATUS', 'SubscribedUsersData', function ($scope, $routeParams, $location, $anchorScroll, SocialDataStore, Modals, $rootScope, Buildfire, EVENTS, THREAD_STATUS, FILE_UPLOAD, SocialItems, $q, $timeout, Location, Util, GROUP_STATUS, SubscribedUsersData) {
            var Thread = this;
            Thread.userDetails = {};
            Thread.SocialItems = SocialItems.getInstance();
            Thread.allowCreateThread = false;
            Thread.allowPrivateChat = false;
            Thread.allowFollowLeaveGroup = false;
            Thread.post = {};
            Thread.showImageLoader = true;
            Thread.modalPopupThreadId;
            Thread.followingStatus = false;
            console.log(Util)
            Thread.util = Util
            var counter = 0;
            $scope.setupImageList = function (comment) {
                if (comment.imageUrl.length) {
                    comment.imageListId = "commentImageList_" + (counter++);
                    setTimeout(function () {
                        let imageList = document.getElementById(comment.imageListId);
                        if (Array.isArray(comment.imageUrl)) {
                            imageList.images = comment.imageUrl;
                        } else {
                            imageList.images = [comment.imageUrl[0]]
                        }
                        imageList.addEventListener('imageSelected', (e) => {
                            let selectedImage = e.detail.filter(image => image.selected);
                            if (selectedImage && selectedImage[0] && selectedImage[0].name)
                                selectedImage[0].name = selectedImage[0].name;
                            buildfire.imagePreviewer.show({ images: selectedImage });
                        });
                    }, 0);
                }
            };
            Thread.showHideCommentBox = function () {
                if (Thread.SocialItems && Thread.SocialItems.appSettings && Thread.SocialItems.appSettings.allowSideThreadTags &&
                    Thread.SocialItems.appSettings.sideThreadUserTags && Thread.SocialItems.appSettings.sideThreadUserTags.length > 0
                ) {
                    var _userTagsObj = Thread.SocialItems.userDetails.userTags;
                    var _userTags = [];
                    if (_userTagsObj) {
                        _userTags = _userTagsObj[Object.keys(_userTagsObj)[0]];
                    }

                    if (_userTags) {
                        var _hasPermission = false;
                        for (var i = 0; i < Thread.SocialItems.appSettings.sideThreadUserTags.length; i++) {
                            var _sideThreadTag = Thread.SocialItems.appSettings.sideThreadUserTags[i].text;
                            for (var x = 0; x < _userTags.length; x++) {
                                if (_sideThreadTag.toLowerCase() == _userTags[x].tagName.toLowerCase()) {
                                    _hasPermission = true;
                                    break;
                                }
                            }
                        }
                        Thread.allowCreateThread = _hasPermission;
                    } else {
                        Thread.allowCreateThread = false;
                    }
                } else {
                    Thread.allowCreateThread = true;
                }

                $scope.$digest();
            };
            Thread.showHidePrivateChat = function () {
                if (Thread.SocialItems && Thread.SocialItems.appSettings && Thread.SocialItems.appSettings.disablePrivateChat) {
                    Thread.allowPrivateChat = false;
                } else {
                    Thread.allowPrivateChat = true;
                }
            };

            Thread.followLeaveGroupPermission = function () {
                if (Thread.SocialItems && Thread.SocialItems.appSettings && Thread.SocialItems.appSettings.disableFollowLeaveGroup) {
                    Thread.allowFollowLeaveGroup = false;
                } else {
                    Thread.allowFollowLeaveGroup = true;
                }
            }

            Thread.setAppTheme = function () {
                buildfire.appearance.getAppTheme((err, obj) => {
                    let elements = document.getElementsByTagName('svg');
                    console.log(document.getElementById('addBtn'))
                    document.getElementById('addBtn').style.setProperty("background-color", obj.colors.icons, "important");
                    elements[3].style.setProperty("fill", obj.colors.titleBarTextAndIcons, "important");
                });
            }
            Thread.setupThreadImage = function () {
                if (Thread.post.imageUrl) {
                    setTimeout(function () {
                        let imageList = document.getElementById("commentPostImage");
                        imageList.images = Thread.post.imageUrl;
                        imageList.addEventListener('imageSelected', (e) => {
                            let selectedImage = e.detail.filter(image => image.selected);
                            if (selectedImage && selectedImage[0] && selectedImage[0].name)
                                selectedImage[0].name = selectedImage[0].name;
                            buildfire.imagePreviewer.show({ images: selectedImage });
                        });

                    });
                }
            }

            Thread.init = function () {
                Thread.setAppTheme();
                if ($routeParams.threadId) {
                    console.log(Thread.SocialItems.items)
                    let post = Thread.SocialItems.items.find(el => el.id === $routeParams.threadId);
                    Thread.post = post || {};
                    Thread.setupThreadImage();
                    Buildfire.history.push('Post', { post: Thread.post });
                    $rootScope.showThread = false;

                    Thread.SocialItems.authenticateUser(null, (err, userData) => {
                        if (err) return console.error("Getting user failed.", err);
                        if (userData) {
                            let liked = Thread.post.likes.find(element => element === Thread.SocialItems.userDetails.userId);
                            if (liked !== undefined) Thread.post.isUserLikeActive = true;
                            else Thread.post.isUserLikeActive = false;
                            Thread.showHideCommentBox();
                            Thread.showHidePrivateChat();
                            Thread.followLeaveGroupPermission();
                            SubscribedUsersData.getThreadFollowingStatus(userData._id, Thread.post.id, Thread.SocialItems.wid, Thread.SocialItems.context.instanceId, function (err, status) {
                                if (status) {
                                    Thread.followingStatus = true;
                                }
                                else {
                                    Thread.followUnfollow();
                                }
                                $scope.$digest();
                            });
                        }
                    });
                }
            }

            Thread.init();

            Thread.navigateToPrivateChat = function (user) {
                Buildfire.navigation.navigateTo({
                    pluginId: Thread.SocialItems.context.pluginId,
                    instanceId: Thread.SocialItems.context.instanceId,
                    title: Thread.SocialItems.getUserName(Thread.SocialItems.userDetails) + ' | ' + user.name,
                    queryString: 'wid=' + user.wid + '&targetUser=' + JSON.stringify({ userId: user.id, userName: user.name })
                        + "&wTitle=" + encodeURIComponent(Thread.SocialItems.getUserName(Thread.SocialItems.userDetails) + ' | ' + user.name)
                });
            }

            Thread.followPrivateWall = function (userId, wid, userName = null) {
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
                    userName = Thread.SocialItems.getUserName(params.userDetails)
                    console.log("SACUVAVA KORISNIKA ZA PRIVATE", params)
                    SubscribedUsersData.save(params, function (err) {
                        if (err) console.log('Error while saving subscribed user data.');
                        if (userName)
                            Thread.navigateToPrivateChat({ id: userId, name: userName, wid: wid });
                    });
                })
            }

            Thread.openChatOrProfile = function (userId) {
                if (Thread.allowPrivateChat) {
                    Thread.SocialItems.authenticateUser(null, (err, user) => {
                        if (err) return console.error("Getting user failed.", err);
                        if(userId === Thread.SocialItems.userDetails.userId) return;
                        buildfire.auth.getUserProfile({ userId: userId }, function (err, otherUser) {
                            if (err) return console.error("Getting user profile failed.", err);
                            Thread.openPrivateChat(userId, Thread.SocialItems.getUserName(otherUser));
                        });
                    });
                }
            };

            Thread.openPrivateChat = function (userId, userName) {
                let wid = null;
                if (Thread.SocialItems.userDetails.userId && Thread.SocialItems.userDetails.userId != userId) {
                    if (Thread.SocialItems.userDetails.userId > userId) {
                        wid = Thread.SocialItems.userDetails.userId + userId;
                    } else {
                        wid = userId + Thread.SocialItems.userDetails.userId;
                    }
                }
                SubscribedUsersData.getGroupFollowingStatus(userId, wid, Thread.SocialItems.context.instanceId, function (err, status) {
                    if (err) console.error('Error while getting initial group following status.', err);
                    console.log(status)
                    if (!status.length) {
                        Thread.followPrivateWall(userId, wid, userName);
                    } else {
                        Thread.navigateToPrivateChat({ id: userId, name: userName, wid: wid });
                    }
                });
            }

            /**
             * showMoreOptions method shows the more Option popup.
             */
            Thread.showMoreOptions = function () {
                Thread.modalPopupThreadId = Thread.post._id;
                Thread.SocialItems.authenticateUser(null, (err, user) => {
                    if (err) return console.error("Getting user failed.", err);
                    if (user) {
                        Modals.showMoreOptionsModal({
                            postId: Thread.post._id,
                            'languages': Thread.SocialItems.languages
                        }).then(function (data) {
                            console.log('Data in Successs------------------data');
                        },
                            function (err) {
                                console.log('Error in Error handler--------------------------', err);
                        });
                    }
                });
            };

            /**
             * showMoreOptions method shows the more Option popup.
             */
            Thread.showMoreOptionsComment = function (commentId) {
                Thread.modalPopupThreadId = commentId;
                Thread.SocialItems.authenticateUser(null, (err, user) => {
                    if (err) return console.error("Getting user failed.", err);
                    if (user) {
                        Modals.showMoreOptionsCommentModal({
                            'commentId': commentId,
                            'languages': Thread.SocialItems.languages
                        }).then(function (data) {
                            console.log('Data in Successs------------------data');
                        },
                            function (err) {
                                console.log('Error in Error handler--------------------------', err);
                            });
                    }
                });
            };
            /**
             * likeThread method is used to like a post.
             * @param post
             * @param type
             */
            Thread.scheduleNotification = function (post, text) {
                SubscribedUsersData.getGroupFollowingStatus(post.userId, Thread.SocialItems.wid, Thread.SocialItems.context.instanceId, function (err, status) {
                    console.log("scheduleNotification", status, Thread.post)
                    if (status.length) {
                        let followsPost = status[0].data.posts.find(el => el === Thread.post.id);
                        if (followsPost) {
                            let options = {
                                title: 'Notification',
                                text: '',
                                at: new Date(),
                                users: [post.userId],
                            };

                            if (text === 'comment')
                                options.text = Thread.SocialItems.getUserName(Thread.SocialItems.userDetails) + ' commented on post: ' + Thread.SocialItems.context.title;
                            else if (text === 'likedComment')
                                options.text = Thread.SocialItems.getUserName(Thread.SocialItems.userDetails) + ' liked a comment on ' + Thread.SocialItems.context.title;
                            else if (text === 'likedPost')
                                options.text = Thread.SocialItems.getUserName(Thread.SocialItems.userDetails) + ' liked a post on ' + Thread.SocialItems.context.title;
                            options.inAppMessage = options.text;
                            options.queryString = `wid=${Thread.SocialItems.wid}`;
                            buildfire.dialog.alert({
                                title: "Access Denied!",
                                subtitle: "Operation not allowed!",
                                message: JSON.stringify(options)
                            });
                            buildfire.notifications.pushNotification.schedule(options, function (err) {
                                if (err) return console.error('Error while setting PN schedule.', err);
                                console.log("SENT NOTIFICATION", options);
                            });
                        }
                    }
                });

            }
            Thread.likeThread = function (post) {
                Thread.SocialItems.authenticateUser(null, (err, userData) => {
                    if (err) return console.error("Getting user failed.", err);
                    if (userData) {
                        let liked = post.likes.find(element => element === Thread.SocialItems.userDetails.userId);
                        let index = post.likes.indexOf(Thread.SocialItems.userDetails.userId);
                        if (liked !== undefined) {
                            post.likes.splice(index, 1)
                            post.isUserLikeActive = false;
                            Buildfire.messaging.sendMessageToControl({
                                'name': EVENTS.POST_UNLIKED,
                                'id': post.id,
                                'userId': Thread.SocialItems.userDetails.userId
                            });
                        }
                        else {
                            post.likes.push(Thread.SocialItems.userDetails.userId);
                            post.isUserLikeActive = true;
                            Buildfire.messaging.sendMessageToControl({
                                'name': EVENTS.POST_LIKED,
                                'id': post.id,
                                'userId': Thread.SocialItems.userDetails.userId
                            });
                        }

                        SocialDataStore.updatePost(post).then(() => {
                            if (!liked)
                                Thread.scheduleNotification(post, 'likedPost');
                        }, (err) => console.log(err));
                    }
                });
            }

            Thread.likeComment = function (comment) {
                Thread.SocialItems.authenticateUser(null, (err, userData) => {
                    if (err) return console.error("Getting user failed.", err);
                    if (userData) {
                        let liked = comment.likes.find(element => element === Thread.SocialItems.userDetails.userId);
                        let index = comment.likes.indexOf(Thread.SocialItems.userDetails.userId)
                        if (liked !== undefined) {
                            comment.likes.splice(index, 1)
                            comment.isUserLikeActive = false;
                        }
                        else {
                            comment.likes.push(Thread.SocialItems.userDetails.userId);
                            comment.isUserLikeActive = true;
                            Buildfire.messaging.sendMessageToControl({
                                'name': EVENTS.COMMENT_LIKED,
                                'userId': comment.userId,
                                'comment': comment,
                                'postId': Thread.post.id
                            });
                        }
                        let commentIndex = Thread.post.comments.indexOf(comment);
                        Thread.post.comments[commentIndex] = comment;
                        SocialDataStore.updatePost(Thread.post).then(() => {
                            if (!liked)
                                Thread.scheduleNotification(comment, 'likedComment');
                        }, (err) => console.log(err));
                    }
                });
            }

            /**
             * follow method is used to follow the thread/post.
             */
            Thread.followUnfollow = function () {
                let params = {
                    userId: Thread.SocialItems.userDetails.userId,
                    wallId: Thread.SocialItems.wid,
                    instanceId: Thread.SocialItems.context.instanceId,
                    post: Thread.post.id,
                    _buildfire: {
                        index: { text: Thread.SocialItems.userDetails.userId + '-' + Thread.SocialItems.wid }
                    }
                };
                if (Thread.followingStatus) {
                    SubscribedUsersData.unFollowThread(params, function (err) {
                        if (err) return console.log(err);
                    });
                } else {
                    SubscribedUsersData.followThread(params, function (err) {
                        if (err) return console.log(err);
                    });
                }
                Thread.followingStatus = !Thread.followingStatus;
                setTimeout(function () {
                    buildfire.spinner.hide();
                }, 50);
            };
            /**
             * getDuration method to used to show the time from current.
             * @param timestamp
             * @returns {*}
             */
            Thread.getDuration = function (timestamp) {
                if (timestamp)
                    return moment(timestamp.toString()).fromNow();
            };

            $rootScope.$on("Delete-Comment", function (event, comment) {
                Thread.deleteComment(comment);
            });

            Thread.deleteComment = function (comment) {
                SocialDataStore.deleteComment(Thread.post.id, comment).then(
                    function (data) {
                        Buildfire.messaging.sendMessageToControl({
                            name: EVENTS.COMMENT_DELETED,
                            comment: comment,
                            post: Thread.post
                        });
                        let commentToDelete = Thread.post.comments.find(element => element.comment === comment.comment)
                        let index = Thread.post.comments.indexOf(commentToDelete);
                        Thread.post.comments.splice(index, 1);
                        if (!$scope.$$phase)
                            $scope.$digest();
                        console.log('Comment deleted=============================success----------data', data);
                    },
                    function (err) {
                        console.log('Comment deleted=============================Error----------err', err);
                    }
                );
            };

            Thread.addComment = function (imageUrl) {
                let commentData = {
                    threadId: Thread.post.id,
                    comment: Thread.comment ? Thread.comment.replace(/[#&%+!@^*()-]/g, function (match) {
                        return encodeURIComponent(match)
                    }) : '',
                    userToken: Thread.SocialItems.userDetails.userToken,
                    imageUrl: imageUrl || null,
                    userId: Thread.SocialItems.userDetails.userId,
                    likes: [],
                    userDetails: Thread.SocialItems.userDetails,
                    createdOn: new Date()
                };
                SocialDataStore.addComment(commentData).then(
                    function (data) {
                        console.log('Add Comment Successsss------------------', data);
                        Thread.comment = '';
                        Thread.waitAPICompletion = false;
                        commentData.id = data.data.id;
                        $rootScope.$broadcast(EVENTS.COMMENT_ADDED);
                        Buildfire.messaging.sendMessageToControl({
                            'name': EVENTS.COMMENT_ADDED,
                            'id': Thread.post.id,
                            'comment': commentData
                        });
                        Thread.post.comments.push(commentData);
                        Thread.scheduleNotification(Thread.post, 'comment');
                    });
            }

            Thread.getPostContent = function (data) {
                if (data && data.results && data.results.length > 0 && !data.cancelled) {
                    $scope.Thread.comment = data.results["0"].textValue;
                    $scope.Thread.imageUrl = data.results["0"].images;

                    var gif = getGifUrl(data.results["0"].gifs);
                    if (gif && $scope.Thread.images && $scope.Thread.images.push) {
                        $scope.Thread.images.push(gif);
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

            Thread.openCommentSection = function () {
                Thread.SocialItems.authenticateUser(null, (err, user) => {
                    if (err) return console.error("Getting user failed.", err);
                    if (user) {
                        buildfire.input.showTextDialog({
                            "placeholder": Thread.SocialItems.languages.writePost,
                            "saveText": Thread.SocialItems.languages.confirmPost.length > 9 ? Thread.SocialItems.languages.confirmPost.substring(0, 9) : Thread.SocialItems.languages.confirmPost,
                            "cancelText": Thread.SocialItems.languages.cancelPost.length > 9 ? Thread.SocialItems.languages.cancelPost.substring(0, 9) : Thread.SocialItems.languages.cancelPost,
                            "attachments": {
                                "images": { enable: true, multiple: true },
                                "gifs": { enable: true }
                            }
                        }, (err, data) => {
                            if (err) return console.error("Something went wrong.", err);
                            if(data.cancelled) return console.error('User canceled.')
                            Thread.getPostContent(data);
                            if ((Thread.comment || ($scope.Thread.images && $scope.Thread.images.length > 0))) {
                                Thread.addComment($scope.Thread.imageUrl);
                            }
                        });
                    }
                });

            }

            Buildfire.history.onPop(function (breadcrumb) {
                Thread.goFullScreen = false;
                if (!$scope.$$phase) $scope.$digest();
            }, true);

            Thread.deletePost = function (postId) {
                var success = function (response) {
                    console.log('inside success of delete post', response);
                    if (response.data.result) {
                        Buildfire.messaging.sendMessageToControl({ 'name': EVENTS.POST_DELETED, 'id': postId });
                        console.log('post successfully deleted');
                        let postToDelete = Thread.SocialItems.items.find(element => element.id === postId)
                        let index = Thread.SocialItems.items.indexOf(postToDelete);
                        Thread.SocialItems.items.splice(index, 1);
                        console.log('post successfully deleted', postId, index);
                        if (!$scope.$$phase)
                            $scope.$digest();
                    }
                };
                // Called when getting error from SocialDataStore.deletePost method
                var error = function (err) {
                    console.log('Error while deleting post ', err);
                };
                console.log('Post id appid usertoken-- in delete ---------------', postId);
                // Deleting post having id as postId
                SocialDataStore.deletePost(postId).then(success, error);
            };

            Buildfire.messaging.onReceivedMessage = function (event) {
                console.log('Widget syn called method in controller Thread called-----', event);
                if (event) {
                    switch (event.name) {
                        case EVENTS.POST_DELETED:
                            Thread.deletePost(event.id);
                            let postToDelete = Thread.SocialItems.items.find(element => element.id === postId)
                            let index = Thread.SocialItems.items.indexOf(postToDelete);
                            Thread.SocialItems.items.splice(index, 1);
                            if (event.id == Thread.modalPopupThreadId) {
                                Buildfire.history.pop();
                                Modals.close('Post already deleted');
                            }
                            if (!$scope.$$phase)
                                $scope.$digest();
                            break;
                        case EVENTS.BAN_USER:
                            Thread.SocialItems.items = Thread.SocialItems.items.filter(function (el) {
                                return el.userId != event.id;
                            });
                            Modals.close('User already banned');
                            if (!$scope.$$phase)
                                $scope.$digest();
                            break;
                        case EVENTS.COMMENT_DELETED:
                            console.log('Comment Deleted in thread controlled event called-----------', event);
                            if (event.postId == Thread.post.id) {
                                let commentToDelete = Thread.post.comments.find(element => element.comment === event.comment.comment)
                                let index = Thread.post.comments.indexOf(commentToDelete);
                                Thread.post.comments.splice(index, 1);
                                $rootScope.$broadcast(EVENTS.COMMENT_DELETED);

                                if (!$scope.$$phase)
                                    $scope.$digest();
                            }
                            if (Thread.modalPopupThreadId == event._id)
                                Modals.close('Comment already deleted');
                            break;
                        default:
                            break;
                    }
                }
            };
            // On Login
            Buildfire.datastore.onUpdate(function (response) {
                console.log('----------- on Update Side Thread ----', response);
                if (response.tag === "languages")
                    Thread.SocialItems.formatLanguages(response.data.screenOne);
                //Thread.init();
            });

            Buildfire.auth.onLogin(function (user) {
                Thread.SocialItems.authenticateUser(user, (err, userData) => {
                    if (err) return console.error("Getting user failed.", err);
                    if (userData) {
                        Thread.showHideCommentBox();
                        $scope.$digest();
                    }
                });
                console.log('New user loggedIN from Widget Thread Page', user);
            });
            // On Logout
            Buildfire.auth.onLogout(function () {
                console.log('User loggedOut from Widget Thread page');
                Thread.SocialItems.userDetails.userToken = null;
                Thread.SocialItems.userDetails.userId = null;
                $scope.$digest();
            });


            /**
             * Implementation of pull down to refresh
             */
            var onRefresh = Buildfire.datastore.onRefresh(function () {
                Location.go('#/thread/' + $routeParams.threadId);
            });
            /**
             * Unbind the onRefresh
             */
            $scope.$on('$destroy', function () {
                $rootScope.$broadcast('ROUTE_CHANGED', { _id: Thread.post.id, isUserLikeActive: Thread.post.isUserLikeActive });
                onRefresh.clear();
                Buildfire.datastore.onRefresh(function () {
                    Location.goToHome();
                });
            });

        }])
})(window.angular);
