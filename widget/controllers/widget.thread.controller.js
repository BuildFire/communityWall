'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .controller('ThreadCtrl', ['$scope', '$routeParams', '$location', '$anchorScroll', 'SocialDataStore', 'Modals', '$rootScope', 'Buildfire', 'EVENTS', 'THREAD_STATUS', 'FILE_UPLOAD', 'SocialItems', '$q', '$timeout', 'Location', 'Util', 'GROUP_STATUS', 'SubscribedUsersData', function ($scope, $routeParams, $location, $anchorScroll, SocialDataStore, Modals, $rootScope, Buildfire, EVENTS, THREAD_STATUS, FILE_UPLOAD, SocialItems, $q, $timeout, Location, util, GROUP_STATUS, SubscribedUsersData) {
            var Thread = this;
            Thread.usersData = [];
            Thread.comments = [];
            Thread.userDetails = {};
            Thread.height = window.innerHeight;
            Thread.buildfire = Buildfire;
            Thread.SocialItems = SocialItems.getInstance();
            Thread.SocialItems.comments = [];
            Thread.allowCreateThread = false;
            Thread.allowPrivateChat = false;
            Thread.allowFollowLeaveGroup = false;
            Thread.imageSelected = false;
            Thread.imageName = '';
            Thread.post = {};
            Thread.showImageLoader = true;
            Thread.modalPopupThreadId;
            Thread.util = util
            Thread.followingStatus = false;
            Thread.context = null;
            $scope.users = {};

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
                Thread.languages = languages;
            });

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
                if (Thread.SocialItems &&
                    Thread.SocialItems.appSettings &&
                    Thread.SocialItems.appSettings.allowSideThreadTags &&
                    Thread.SocialItems.appSettings.sideThreadUserTags &&
                    Thread.SocialItems.appSettings.sideThreadUserTags.length > 0
                ) {
                    var _userTagsObj = Thread.userDetails.userTags;
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
                if (Thread.SocialItems &&
                    Thread.SocialItems.appSettings &&
                    Thread.SocialItems.appSettings.disablePrivateChat
                ) {
                    Thread.allowPrivateChat = false;
                } else {
                    Thread.allowPrivateChat = true;
                }
            };

            Thread.followLeaveGroupPermission = function () {
                if (Thread.SocialItems &&
                    Thread.SocialItems.appSettings &&
                    Thread.SocialItems.appSettings.disableFollowLeaveGroup
                ) {
                    Thread.allowFollowLeaveGroup = false;
                } else {
                    Thread.allowFollowLeaveGroup = true;
                }
            }

            var checkAuthenticatedUser = function (callFromInit) {
                var deferred = $q.defer();
                Buildfire.auth.getCurrentUser(function (err, userData) {
                    console.info('Current Logged In user details are -----------------', userData);
                    if (userData) {
                        Buildfire.getContext(function (err, context) {
                            if (err) {
                                console.error('error while getting buildfire context is::::::', err);
                                return deferred.reject(err);
                            } else {
                                Thread.context = context;
                                Thread.userDetails.userId = userData._id;
                                Thread.userDetails.userToken = userData.userToken;
                                Thread.userDetails.userTags = userData.tags;
                                Thread.userDetails.firstName = userData.firstName;
                                Thread.userDetails.email = userData.email;
                                Thread.userDetails.firstName = userData.firstName;
                                Thread.userDetails.displayName = userData.displayName;

                                const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                                if (re.test(String(userData.firstName).toLowerCase()))
                                    Thread.userDetails.firstName = 'Someone';
                                if (re.test(String(userData.firstName).toLowerCase()))
                                    Thread.userDetails.displayName = 'Someone';

                                Buildfire.datastore.get('Social', function (err, SocialData) {
                                    if (err) {
                                        console.error('Side Thread Get Social settings', err);
                                    } else {
                                        Thread.SocialItems.appSettings = SocialData && SocialData.data && SocialData.data.appSettings;
                                        //check user if has permission to create thread
                                        Thread.showHideCommentBox();
                                        //check if user is allowed to have private chat
                                        Thread.showHidePrivateChat();
                                        Thread.followLeaveGroupPermission();
                                        let wallId = util.getParameterByName("wid") ? util.getParameterByName("wid") : '';
                                        SubscribedUsersData.getThreadFollowingStatus(userData._id, Thread.post.id, wallId, context.instanceId, function (err, status) {
                                            if (status) {
                                                Thread.followingStatus = true;
                                            }
                                            else {
                                                Thread.followUnfollow();
                                            }
                                            $scope.$digest();
                                        });
                                        deferred.resolve();
                                    }
                                });
                            }
                        });
                    }
                    else if (err) {
                        return deferred.reject(err);
                    } else {
                        if (!callFromInit) {
                            Buildfire.auth.login(null, function (err, data) {
                                console.log('----------================', err, data);
                                if (err) {
                                    return deferred.reject(err);
                                } else if (data)
                                    Thread.openCommentSection();
                            });
                        }
                    }
                });
                return deferred.promise;
            };

            Thread.init = function () {
                $rootScope.$on("$routeChangeSuccess", function(){
                    window.scrollTo(0,0);
               })
                Thread.SocialItems.comments = [];
                Thread.SocialItems.newCommentsAvailable = false;
                buildfire.appearance.getAppTheme((err, obj) => {
                    let elements = document.getElementsByTagName('svg');
                    console.log(document.getElementById('addBtn'))
                    document.getElementById('addBtn').style.setProperty("background-color", obj.colors.icons, "important");
                    elements[3].style.setProperty("fill", obj.colors.titleBarTextAndIcons, "important");

                })
                if ($routeParams.threadId) {
                    console.log(Thread.SocialItems.items)
                    var posts = Thread.SocialItems.items.filter(function (el) {
                        return el.id == $routeParams.threadId;
                    });

                    Thread.post = posts[0] || {};
                    console.log("POST", Thread.post)
                    SocialDataStore.getCommentsOfAPost({
                        threadId: Thread.post.id,
                    }).then(
                        function (comments) {
                            Thread.post.comments = comments;
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
                            Buildfire.history.push('Post', { post: Thread.post });
                            $rootScope.showThread = false;
                            var checkUserPromise = checkAuthenticatedUser(true);

                            checkUserPromise.then(function () {
                                let liked = Thread.post.likes.find(element => element === Thread.userDetails.userId);
                                if (liked !== undefined) Thread.post.isUserLikeActive = true;
                                else Thread.post.isUserLikeActive = false;
                            }, function (err) {
                                console.log('error is ------', err);
                            });
                        });



                }
            };
            Thread.init();

            Thread.openChatOrProfile = function (userId) {
                if (Thread.allowPrivateChat) {
                    buildfire.auth.getUserProfile({ userId: userId }, function (err, user) {

                        Thread.openPrivateChat(userId, user.displayName);
                    })
                }
            };

            Thread.openPrivateChat = function (userId, userName) {
                var checkUserAuthPromise = checkAuthenticatedUser(false);
                checkUserAuthPromise.then(function () {
                    var wid = null;
                    //check if user logged in and avoid self chatting
                    if (Thread.SocialItems.userDetails.userId && Thread.SocialItems.userDetails.userId != userId) {
                        if (Thread.SocialItems.userDetails.userId > userId) {
                            wid = Thread.SocialItems.userDetails.userId + userId;
                        } else {
                            wid = userId + Thread.SocialItems.userDetails.userId;
                        }

                        //prevent opening same private chat when it's already opened
                        var _instanceId = util.getParameterByName("wid");
                        if (_instanceId && _instanceId == wid) {
                            return;
                        }
                        //#
                        SubscribedUsersData.getGroupFollowingStatus(userId, wid, Thread.SocialItems.context.instanceId, function (err, status) {
                            if (err) {
                                console.log('error while getting initial group following status.', err);
                            } else
                                if (!status.length) {
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
                                                email: user.email
                                            },
                                            wallId: wid,
                                            instanceId: Thread.SocialItems.context.instanceId
                                        };
                                        console.log("SACUVAVA KORISNIKA ZA PRIVATE", params)
                                        SubscribedUsersData.save(params, function (err) {
                                            if (err) console.log('Error while saving subscribed user data.');

                                            Buildfire.history.push("Main Social Wall");

                                            Buildfire.navigation.navigateTo({
                                                pluginId: Thread.SocialItems.context.pluginId,
                                                instanceId: Thread.SocialItems.context.instanceId,
                                                //folderName: plugin._buildfire.pluginType.result[0].folderName,
                                                title: Thread.SocialItems.userDetails.displayName + ' | ' + userName,
                                                queryString: 'wid=' + wid + '&targetUser=' + JSON.stringify({ userId: userId, userName: userName }) + "&wTitle=" + encodeURIComponent(Thread.SocialItems.userDetails.displayName + ' | ' + userName)
                                            });
                                        });
                                    })
                                } else {
                                    Buildfire.history.push("Main Social Wall");
                                    Buildfire.navigation.navigateTo({
                                        pluginId: Thread.SocialItems.context.pluginId,
                                        instanceId: Thread.SocialItems.context.instanceId,
                                        //folderName: plugin._buildfire.pluginType.result[0].folderName,
                                        title: Thread.SocialItems.userDetails.displayName + ' | ' + userName,
                                        queryString: 'wid=' + wid + '&targetUser=' + JSON.stringify({ userId: userId, userName: userName }) + "&wTitle=" + encodeURIComponent(Thread.SocialItems.userDetails.displayName + ' | ' + userName)
                                    });

                                }
                        })
                    }
                }, function (err) {
                    console.log('error is::::', err);
                });
            };

            /**
             * Thread.addComment method checks whether image is present or not in comment.
             */
            Thread.addComment = function () {

                var checkUserPromise = checkAuthenticatedUser(false);
                checkUserPromise.then(function () {
                    if (Thread.comment || ($scope.Thread.imageUrl && $scope.Thread.imageUrl.length > 0) && !Thread.waitAPICompletion) {
                        Thread.waitAPICompletion = true;
                        addComment($scope.Thread.imageUrl);
                    }
                }, function (err) {
                    console.log('error is::::', err);
                });


            };

            var getImageSizeInMB = function (size) {
                return (size / (1024 * 1024));       // return size in MB
            };

            /**
             * getUserName method is used to get the username on the basis of userId.
             * @param userId
             * @returns {string}
             */
            Thread.getUserName = function (userId) {
                if (!userId)
                    return;

                var userName = '';
                Thread.usersData.some(function (userData) {
                    if (userData.userObject && userData.userObject._id == userId) {
                        userName = userData.userObject.displayName;
                        return true;
                    }
                });

                return userName;
            };
            /**
             * getUserImage is used to get userImage on the basis of userId.
             * @param userId
             * @returns {string}
             */
            Thread.getUserImage = function (userId) {
                if (!userId)
                    return;

                var userImageUrl = '';
                Thread.usersData.some(function (userData) {
                    if (userData.userObject && userData.userObject._id == userId) {
                        userImageUrl = userData.userObject.imageUrl || '';
                        return true;
                    }
                });

                return userImageUrl;
            };
            /**
             * showMoreOptions method shows the more Option popup.
             */
            Thread.showMoreOptions = function () {
                Thread.modalPopupThreadId = Thread.post._id;
                var checkUserPromise = checkAuthenticatedUser(false);
                checkUserPromise.then(function () {
                    Modals.showMoreOptionsModal({ postId: Thread.post._id,
                        'languages': Thread.languages
                    }).then(function (data) {
                        console.log('Data in Successs------------------data');
                    },
                        function (err) {
                            console.log('Error in Error handler--------------------------', err);
                        });
                }, function (err) {
                    console.log('Error is--------------------------', err);
                });

            };

            /**
             * showMoreOptions method shows the more Option popup.
             */
            Thread.showMoreOptionsComment = function (commentId) {
                Thread.modalPopupThreadId = commentId;
                var checkUserPromise = checkAuthenticatedUser(false);
                checkUserPromise.then(function () {
                    Modals.showMoreOptionsCommentModal({ 'commentId': commentId,
                    'languages': Thread.languages
                    }).then(function (data) {
                        console.log('Data in Successs------------------data');
                    },
                        function (err) {
                            console.log('Error in Error handler--------------------------', err);
                        });
                }, function (err) {
                    console.log('Error is--------------------------', err);
                });

            };
            /**
             * likeThread method is used to like a post.
             * @param post
             * @param type
             */
            Thread.likeThread = function (post, type) {
                console.log('inside Like a thread---------------------------');
                var checkUserPromise = checkAuthenticatedUser(false);
                checkUserPromise.then(function () {
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
                    let wallId = util.getParameterByName("wid") ? util.getParameterByName("wid") : '';

                    SubscribedUsersData.getGroupFollowingStatus(post.userId, wallId, Thread.SocialItems.context.instanceId, function (err, status) {
                        let sendPN = function (options) {
                            if (options.users[0] === Thread.SocialItems.userDetails.userId) return;
                            buildfire.notifications.pushNotification.schedule(
                                options,
                                function (e) {
                                    if (e) console.error('Error while setting PN schedule.', e);
                                }
                            );
                        }
                        buildfire.publicData.update(post.id, post, 'posts', (err, updatedPost) => {
                            if (err) return console.log(err);
                            let oldPost = Thread.SocialItems.items.find(element => element.id === updatedPost.id);
                            oldPost = updatedPost;
                            if (oldPost.data.isUserLikeActive) {
                                var options = {
                                    title: 'Notification',
                                    text: '',
                                    at: new Date(),
                                    users: [],
                                    queryString: 'threadPostUniqueLink=' + Thread.post.id
                                };

                                if (Thread.SocialItems.userDetails.firstName) {
                                    options.text = Thread.SocialItems.userDetails.firstName + ' liked a post on ' + Thread.SocialItems.context.title;
                                } else {
                                    options.text = 'Someone liked a post on ' + Thread.SocialItems.context.title;
                                }

                                options.users.push(post.userId);
                                if (status.length) {
                                    SubscribedUsersData.getThreadFollowingStatus(post.userId, post.id, wallId, Thread.SocialItems.instanceId, function (err, status) {
                                        if (status)
                                            sendPN(options);
                                    });
                                }
                            }

                            post.waitAPICompletion = false;
                            $rootScope.$broadcast(EVENTS.POST_LIKED, post);
                            if (!$scope.$$phase) $scope.$digest();
                        });
                    });

                });

            };
            /**
             * follow method is used to follow the thread/post.
             */
            Thread.followUnfollow = function () {
                var wallId = util.getParameterByName("wid");
                wallId = wallId ? wallId : '';
                let params = {
                    userId: Thread.userDetails.userId,
                    wallId: wallId,
                    instanceId: Thread.SocialItems.context.instanceId,
                    post: Thread.post.id,
                    _buildfire: {
                        index: { text: Thread.userDetails.userId + '-' + wallId }
                    }
                };
                if (Thread.followingStatus) {
                    SubscribedUsersData.unFollowThread(params, function (err) {
                        if (err) return console.log(err);
                    })
                } else {
                    SubscribedUsersData.followThread(params, function (err) {
                        if (err) return console.log(err);
                    })
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

            Thread.likeComment = function (comment, type) {
                let liked = comment.likes.find(element => element === Thread.SocialItems.userDetails.userId);
                let index = comment.likes.indexOf(Thread.SocialItems.userDetails.userId)

                if (liked !== undefined) {
                    comment.likes.splice(index, 1)
                    comment.isUserLikeActive = false;
                }
                else {
                    comment.likes.push(Thread.SocialItems.userDetails.userId);
                    comment.isUserLikeActive = true;
                }

                let commentIndex = Thread.post.comments.indexOf(comment)
                Thread.post.comments[commentIndex] = comment;
                let wallId = util.getParameterByName("wid");
                wallId = wallId ? wallId : '';
                SubscribedUsersData.getGroupFollowingStatus(comment.userId, wallId, Thread.SocialItems.context.instanceId, function (err, status) {
                    let sendPN = function (options) {
                        if (options.users[0] === Thread.SocialItems.userDetails.userId) return;
                        buildfire.notifications.pushNotification.schedule(
                            options,
                            function (e) {
                                if (e) console.error('Error while setting PN schedule.', e);
                            }
                        );
                    }
                    buildfire.publicData.update(Thread.post.id, Thread.post, 'posts', function (err, data) {
                        if (err) return console.log("something went wrong");
                        if (data && data.data) {
                            let options = {
                                title: 'Notification',
                                text: '',
                                at: new Date(),
                                users: [],
                                queryString: 'threadPostUniqueLink=' + Thread.post.id
                            };
                            options.users.push(comment.userId)
    
                            if (Thread.userDetails.firstName)
                                options.text = Thread.userDetails.firstName + ' liked comment on a post: ' + Thread.post.text.substring(0, 50) + ' on ' + Thread.SocialItems.context.title;
                            else
                                options.text = 'Someone liked comment on a post: ' + Thread.post.text.substring(0, 50) + ' on ' + Thread.SocialItems.context.title;
    
                            $rootScope.$broadcast(EVENTS.COMMENT_LIKED);
                            if (!$scope.$$phase) $scope.$digest();
                            Buildfire.messaging.sendMessageToControl({
                                'name': EVENTS.COMMENT_LIKED,
                                'userId': comment.userId,
                                'comment': comment,
                                'postId': Thread.post.id
                            });
                            
                            if (status.length && comment.isUserLikeActive) {
                                SubscribedUsersData.getThreadFollowingStatus(comment.userId, Thread.post.id, wallId, Thread.SocialItems.instanceId, function (err, status) {
                                    if (status)
                                        sendPN(options);
                                });
                            }
                        }
                    });
                });
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
            /**
             * addComment method is used to add the comment to a post.
             * @param imageUrl
             */
            var addComment = function (imageUrl) {
                buildfire.auth.getCurrentUser(function (err, result) {
                    var commentData = {
                        threadId: Thread.post.id,
                        comment: Thread.comment ? Thread.comment.replace(/[#&%+!@^*()-]/g, function (match) {
                            return encodeURIComponent(match)
                        }) : '',
                        userToken: Thread.userDetails.userToken,
                        imageUrl: imageUrl || null,
                        userId: Thread.userDetails.userId,
                        likes: [],
                        createdOn: new Date()
                    };
                    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

                    if (re.test(String(result.firstName).toLowerCase()))
                        result.firstName = 'Someone';
                    if (re.test(String(result.firstName).toLowerCase()))
                        result.displayName = 'Someone';
                    commentData.userDetails = {
                        firstName: result.firstName,
                        lastName: result.lastName,
                        email: result.email,
                        displayName: result.firstName + " " + result.lastName,
                        imageUrl: result.imageUrl,
                    }

                    Thread.SocialItems.comments.push(commentData);
                    SocialDataStore.addComment(commentData).then(
                        function (data) {
                            console.log('Add Comment Successsss------------------', data);
                            Thread.picFile = '';
                            Thread.comment = '';
                            Thread.waitAPICompletion = false;
                            Thread.imageSelected = false;
                            Thread.imageName = '';
                            commentData.id = data.data.id;
                            $rootScope.$broadcast(EVENTS.COMMENT_ADDED);
                            Buildfire.messaging.sendMessageToControl({
                                'name': EVENTS.COMMENT_ADDED,
                                'id': Thread.post.id,
                                'comment': commentData
                            });
                            Thread.post.comments.push(commentData);

                            let wallId = util.getParameterByName("wid") ? util.getParameterByName("wid") : '';
                            wallId = wallId ? wallId : '';

                            SubscribedUsersData.getGroupFollowingStatus(Thread.post.userId, wallId, Thread.SocialItems.context.instanceId, function (err, status) {
                                let sendPN = function (options) {
                                    if (options.users[0] === Thread.SocialItems.userDetails.userId) return;
                                    buildfire.notifications.pushNotification.schedule(
                                        options,
                                        function (e) {
                                            if (e) console.error('Error while setting PN schedule.', e);
                                        }
                                    );
                                }
                                var options = {
                                    title: 'Notification',
                                    text: '',
                                    at: new Date(),
                                    users: [],
                                    queryString: 'threadPostUniqueLink=' + Thread.post.id
                                };
                                options.users.push(Thread.post.userId)

                                if (Thread.userDetails.firstName) {
                                    options.text = Thread.userDetails.firstName + ' commented on post: ' + Thread.post.text.substring(0, 50) + ' on ' + Thread.SocialItems.context.title;
                                } else {
                                    options.text = 'Someone commented on post: ' + Thread.post.text.substring(0, 50) + ' on ' + Thread.SocialItems.context.title;
                                }
                                if (status.length) {
                                    SubscribedUsersData.getThreadFollowingStatus(Thread.post.userId, Thread.post.id, wallId, Thread.SocialItems.instanceId, function (err, status) {
                                        if (status)
                                            sendPN(options);
                                    });
                                }

                            });

                        },
                        function (err) {
                            console.log('Add Comment Error------------------', err);
                            Thread.picFile = '';
                            Thread.comment = '';
                            Thread.waitAPICompletion = false;
                        }
                    );

                });
            };

            Thread.openCommentSection = function () {
                var checkUserPromise = checkAuthenticatedUser(false);
                checkUserPromise.then(function () {
                    if (!Thread.allowCreateThread) return;
                    buildfire.input.showTextDialog({
                        "placeholder": "Write a comment...",
                        "saveText": "Post",
                        "cancelText": "Cancel",
                        "attachments": {
                            "images": { enable: true, multiple: true },
                            "gifs": { enable: true }
                        }
                    }, function (err, data) {
                        if (err)
                            console.error(err);
                        else if (data && data.results && data.results.length > 0 && !data.cancelled) {
                            $scope.Thread.comment = data.results["0"].textValue;
                            $scope.Thread.imageUrl = data.results["0"].images;

                            var gif = getGifUrl(data.results["0"].gifs);
                            if (gif && $scope.Thread.imageUrl && $scope.Thread.imageUrl.push) {
                                $scope.Thread.imageUrl.push(gif);
                            }

                            $scope.Thread.addComment();

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

            }
            Buildfire.history.onPop(function (breadcrumb) {
                Thread.goFullScreen = false;
                if (!$scope.$$phase) $scope.$digest();
            }, true);

            Thread.uploadImage = function (file) {
                console.log('inside select image method', file);
                var fileSize;
                if (file) {
                    fileSize = getImageSizeInMB(file.size);      // get image size in MB
                    Thread.imageSelected = true;
                    if (fileSize > FILE_UPLOAD.MAX_SIZE) {
                        Thread.imageName = file.name + ' - ' + FILE_UPLOAD.SIZE_EXCEED;
                        Thread.showImageLoader = false;
                    } else {
                        Thread.imageName = file.name;
                        Thread.showImageLoader = true;
                    }
                }

            };

            Thread.cancelImageSelect = function () {
                Thread.imageName = Thread.imageName.replace(' - ' + FILE_UPLOAD.SIZE_EXCEED, '') + ' - ' + FILE_UPLOAD.CANCELLED;
                $timeout(function () {
                    Thread.imageSelected = false;
                    Thread.imageName = '';
                    Thread.picFile = '';
                    Thread.showImageLoader = true;
                    if (!$scope.$$phase)
                        $scope.$digest();
                }, 500);
            };

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
                if (response.tag === "languages") {
                    let languages = {};
                    Object.keys(response.data.screenOne).forEach(e => {
                        response.data.screenOne[e].value ? languages[e] = response.data.screenOne[e].value : languages[e] = response.data.screenOne[e].defaultValue;
                    });
                    $rootScope.languages = languages;
                    Thread.languages = languages;
                }
                Thread.init();
            });

            Buildfire.auth.onLogin(function (user) {
                console.log('New user loggedIN from Widget Thread Page', user);
                if (user && user._id) {
                    Thread.userDetails.userToken = user.userToken;
                    Thread.userDetails.userId = user._id;
                    Thread.userDetails.email = user.email;
                    Thread.userDetails.userTags = user.tags;
                    //check user if has permission to create thread
                    Thread.showHideCommentBox();
                    $scope.$digest();
                }
            });
            // On Logout
            Buildfire.auth.onLogout(function () {
                console.log('User loggedOut from Widget Thread page');
                Thread.userDetails.userToken = null;
                Thread.userDetails.userId = null;
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
