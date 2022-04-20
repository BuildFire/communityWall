'use strict';

(function (angular) {
    angular
        .module('socialPluginContent')
        .controller('ContentHomeCtrl', ['$scope', '$location', 'SocialDataStore', 'Modals', 'Buildfire', 'EVENTS', '$timeout', 'SocialItems', 'Util', function ($scope, $location, SocialDataStore, Modals, Buildfire, EVENTS, $timeout, SocialItems, Util) {
            var ContentHome = this;
            ContentHome.usersData = [];
            var userIds = [];
            var initialCommentsLength;
            ContentHome.postText = '';
            ContentHome.posts = [];
            ContentHome.socialAppId;
            ContentHome.parentThreadId;
            ContentHome.modalPopupThreadId;
            ContentHome.startLoadingPosts = false;
            ContentHome.privateThreads = [];
            ContentHome.exportingThreads = false;
            ContentHome.util = Util;
            var counter = 0;
            ContentHome.loading = true;
            
            $scope.setupImageList = function (post) {
                if (post.imageUrl) {
                    post.imageListId = "imageList_" + (counter++);
                    setTimeout(function () {
                        let imageList = document.getElementById(post.imageListId);
                        if (imageList) {
                            imageList.images = post.imageUrl;
                            if (Array.isArray(post.imageUrl)) {
                                imageList.images = post.imageUrl;
                            } else {
                                imageList.images = [post.imageUrl];
                            }
                        }
                    }, 0);
                }
            };
            var datastoreWriteKey;
            var appId;
            var instanceId;
            var pluginTitle;
            var init = function () {
                buildfire.datastore.get("languages", (err, result) => {
                    if (result.data && result.data.screenOne) {
                        let data = result.data;
                        if(Object.keys(data.screenOne).length <= 6) {
                            Object.keys(data.screenOne).forEach((key) => {
                                if(data.screenOne[key].value) {
                                    stringsConfig.screenOne.labels[key].value = data.screenOne[key].value;
                                }
                            });
                            buildfire.datastore.save({ screenOne: stringsConfig.screenOne.labels }, "languages", (err, data) => { console.log(data) });
                        }
                    }
                });
                Buildfire.getContext(function (err, context) {
                    if (err) return console.log(err);
                    datastoreWriteKey = context.datastoreWriteKey;
                    appId = context.appId;
                    instanceId = context.instanceId;
                    Buildfire.datastore.get('Social', function (err, data) {
                        if (err) return console.log(err);

                        if (data && data.data && data.data.appSettings) {
                            ContentHome.appSettings = data.data;
                            if (ContentHome.appSettings.appSettings.pinnedPost) {
                                ContentHome.descriptionWYSIWYG = ContentHome.appSettings.appSettings.pinnedPost;
                                $scope.$digest()
                            }

                        } else {

                        }
                        setTimeout(() => {
                            if(!ContentHome.posts.length) 
                                buildfire.messaging.sendMessageToWidget({ name: 'ASK_FOR_POSTS' });
                        }, 500);
                    });
                });

                function myCustomURLConverter(url, node, on_save, name) {
                    if (!/^https?:\/\//i.test(url)) {
                        return "https://" + url.replace("//", "");
                    }
                    else return url;
                }
                ContentHome.descriptionWYSIWYGOptions = {
                    plugins: 'advlist autolink link image lists charmap print preview',
                    skin: 'lightgray',
                    trusted: true,
                    theme: 'modern',
                    urlconverter_callback: myCustomURLConverter,
                    plugin_preview_width: "500",
                    plugin_preview_height: "500"
                };

                ContentHome.setWYSIWYG = function () {
                    if (ContentHome.appSettings) {
                        ContentHome.appSettings.appSettings.pinnedPost = ContentHome.descriptionWYSIWYG
                    } else {
                        ContentHome.appSettings = {
                            appSettings: {
                                pinnedPost: ContentHome.descriptionWYSIWYG
                            }
                        }
                    }
                    Buildfire.datastore.save(ContentHome.appSettings, 'Social', function (err, result) {
                        if (err) return console.log(err)
                    })
                }
                ContentHome.height = window.innerHeight;
                ContentHome.noMore = false;
            };

            ContentHome.showComments = function (post) {
                post.viewComments = true;
            }

            // Method for getting User Name by giving userId as its argument
            ContentHome.getUserName = function (userId) {
                var userName = '';
                ContentHome.usersData.some(function (userData) {
                    if (userData && userData.userObject && userData.userObject._id == userId) {
                        userName = userData.userObject.displayName;
                        return true;
                    }
                });
                return userName;
            };

            //Method for getting User Image by giving userId as its argument
            ContentHome.getUserImage = function (userId) {
                var userImageUrl = '';
                ContentHome.usersData.some(function (userData) {
                    if (userData && userData.userObject && userData.userObject._id == userId) {
                        userImageUrl = userData.userObject.imageUrl ? Buildfire.imageLib.cropImage(userData.userObject.imageUrl, {
                            width: 40,
                            height: 40
                        }) : '';
                        return true;
                    }
                });
                return userImageUrl;
            };

            // Method for deleting post using SocialDataStore deletePost method
            ContentHome.deletePost = function (postId) {
                ContentHome.modalPopupThreadId = postId;

                buildfire.dialog.confirm(
                    {
                        title: "Delete Post",
                        message: `Are you sure you want to delete this post?`,
                        confirmButton: {
                            text: "Delete",
                            type: "danger",
                        },
                    },
                    (err, isConfirmed) => {
                        if (err) console.error(err);
                        if (isConfirmed) {
                            // Called when getting success from SocialDataStore.deletePost method
                            var success = function (response) {
                                console.log('inside success of delete post', response);
                                if (response) {
                                    Buildfire.messaging.sendMessageToWidget({ 'name': EVENTS.POST_DELETED, 'id': postId });
                                    console.log('post successfully deleted');

                                    ContentHome.posts = ContentHome.posts.filter(function (el) {
                                        return el.id != postId;
                                    });
                                }
                                ContentHome.loading = false;
                                if (!$scope.$$phase)
                                    $scope.$digest();
                            };
                            // Called when getting error from SocialDataStore.deletePost method
                            var error = function (err) {
                                console.log('Error while deleting post ', err);
                                ContentHome.loading = false;
                                if (!$scope.$$phase)
                                    $scope.$digest();
                            };

                            var postToDelete = ContentHome.posts.find(element => element.id === postId);
                            if (postToDelete) Posts.deletePost({userId:postToDelete.userId,postText:postToDelete.text,postImages: postToDelete.imageUrl || [],},(err, r) =>{return});

                            // Deleting post having id as postId
                            SocialDataStore.deletePost(postId, ContentHome.socialAppId, datastoreWriteKey).then(success, error);
                        }
                    }
                );

                console.log('delete post method called', postId);
                
            };

            // Method for deleting comments of a post
            ContentHome.deleteComment = function (post, commentId) {
                ContentHome.modalPopupThreadId = commentId;

                buildfire.dialog.confirm(
                    {
                        title: "Delete Comment",
                        message: `Are you sure you want to delete this comment?`,
                        confirmButton: {
                            text: "Delete",
                            type: "danger",
                        },
                    },
                    (err, isConfirmed) => {
                        if (err) console.error(err);
                        if (isConfirmed) {
                            // Called when getting success from SocialDataStore.deletePost method
                            var success = function (response) {
                                console.log('inside success of delete comment', response);
                                if (response) {
                                    Buildfire.messaging.sendMessageToWidget({
                                        'name': EVENTS.COMMENT_DELETED,
                                        'comment': commentId,
                                        'postId': post.id
                                    });
                                    console.log('comment successfully deleted');
                                    let index = post.comments.indexOf(commentId);
                                    post.comments.splice(index, 1);
                                    if (!$scope.$$phase)
                                        $scope.$digest();
                                }
                            };
                            // Called when getting error from SocialDataStore.deletePost method
                            var error = function (err) {
                                console.log('Error while deleting post ', err);
                                ContentHome.loading = false;
                                if (!$scope.$$phase)
                                    $scope.$digest();
                            };

                            // Deleting post having id as postId
                            SocialDataStore.deleteComment(post.id, commentId).then(success, error);
                        }
                    }
                );
            };

            // Method for banning a user by calling SocialDataStore banUser method
            ContentHome.banUser = function (userId, threadId, username) {
                ContentHome.modalPopupThreadId = threadId;
                console.log('inside ban user controller method>>>>>>>>>>');
                
                buildfire.dialog.confirm(
                    {
                        title: "Ban User",
                        message: `Are you sure you want to ban ${username || 'this user'}?`,
                        confirmButton: {
                            text: "Ban User",
                            type: "danger",
                        },
                    },
                    (err, isConfirmed) => {
                        if (err) console.error(err);

                        if (isConfirmed) {
                            // Called when getting success from SocialDataStore banUser method
                            var success = function (response) {
                                console.log(
                                    "User successfully banned and response is :",
                                    response
                                );
                                Buildfire.messaging.sendMessageToWidget({
                                    name: EVENTS.BAN_USER,
                                    reported: userId,
                                    wid: ContentHome.posts[0].wallId,
                                });
                                ContentHome.posts = ContentHome.posts.filter(
                                    function (el) {
                                        return el.userId != userId;
                                    }
                                );
                                ContentHome.loading = false;
                                if (!$scope.$$phase) $scope.$digest();
                            };
                            // Called when getting error from SocialDataStore banUser method
                            var error = function (err) {
                                console.log("Error while banning a user ", err);
                            };
                            // Calling SocialDataStore banUser method for banning a user
                            SocialDataStore.banUser(userId).then(
                                success,
                                error
                            );
                        }
                    }
                );
            };

            // Method for loading comments
            ContentHome.loadMoreComments = function (thread, viewComment) {
                var newUniqueLinksOfComments = [];
                var newUserIds = [];
                initialCommentsLength = (thread.comments && thread.comments.length) || null;
                if (viewComment && viewComment == 'viewComment' && thread.comments.length > 0)
                    thread.viewComments = thread.viewComments ? false : true;

                if (thread.commentsCount > 0 && thread.commentsCount != initialCommentsLength) {
                    SocialDataStore.getCommentsOfAPost({
                        threadId: thread._id,
                        lastCommentId: thread.comments && !viewComment ? thread.comments[thread.comments.length - 1]._id : null,
                        socialAppId: ContentHome.socialAppId
                    }).then(
                        function (data) {
                            console.log('Success in Content get Load more Comments---------', data);
                            if (data && data.data && data.data.result) {
                                thread.uniqueLinksOfComments = thread.uniqueLinksOfComments || [];
                                thread.comments = thread.comments && !viewComment ? thread.comments.concat(data.data.result) : data.data.result;
                                thread.moreComments = thread.comments && thread.comments.length < thread.commentsCount ? false : true;
                                thread.comments.forEach(function (commentData) {
                                    if (thread.uniqueLinksOfComments.indexOf(commentData.threadId + "cmt" + commentData._id) == -1) {
                                        thread.uniqueLinksOfComments.push(commentData.threadId + "cmt" + commentData._id);
                                        newUniqueLinksOfComments.push(commentData.threadId + "cmt" + commentData._id);
                                    }

                                    if (userIds.indexOf(commentData.userId) == -1) {
                                        userIds.push(commentData.userId);
                                        newUserIds.push(commentData.userId);
                                    }
                                });

                                if (!$scope.$$phase) $scope.$digest();
                            }
                        },
                        function (err) {
                            console.log('Error get Load More Comments----------', err);
                        }
                    );
                }
            };

            ContentHome.seeMore = function (post) {
                post.seeMore = true;
                post.limit = 10000000;
                if (!$scope.$$phase) $scope.$digest();
            };

            ContentHome.seeLess = function (post) {
              post.seeMore = false;
              post.limit = 150;
              if (!$scope.$$phase) $scope.$digest();
            };

            // Method for getting Post's and Comment's creation time in User Readable Time Format
            ContentHome.getDuration = function (timestamp) {
                return moment(timestamp.toString()).fromNow();
            };

            ContentHome.exportMainWallPosts = function (mainCallback) {
                var allPosts = [];
                const pageSize = 50;
                var page = 0;
                let wid = ContentHome.posts[0].wid;

                ContentHome.exportingThreads = true;
                function parseToCSV() {
                    var lineArray = [];

                    allPosts.forEach(function (threadData) {
                        var _data = [];
                        _data.push('post');
                        _data.push(moment(threadData.data.createdOn).format('DD/MM/YYYY hh:mm a'));
                        _data.push(threadData.data.userDetails.displayName);
                        _data.push(ContentHome.util.injectAnchors(threadData.data.text));
                        lineArray.push(_data);
                        if (threadData.data.comments.length > 0) {
                            threadData.data.comments.forEach(function (commentData) {
                                var _data = [];
                                _data.push('comment');
                                _data.push(moment(commentData.createdOn).format('DD/MM/YYYY hh:mm a'));
                                _data.push(commentData.userDetails.displayName);
                                _data.push(commentData.comment);
                                lineArray.push(_data);
                            })
                        }
                    });
                    var csv = Papa.unparse({
                        fields: ["type", "date", "username", "text"],
                        data: lineArray,
                        config: {
                            quotes: true,
                            quoteChar: '"',
                            delimiter: ",",
                            header: true,
                            newline: "\r\n"
                        }
                    });

                    csv = "data:text/csv;charset=utf-8," + csv;
                    var csvContent = csv;
                    var encodedUri = encodeURI(csvContent);
                    var link = document.createElement("a");
                    var _fileName = "Social App Chat" + ".csv";
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", _fileName);
                    link.setAttribute("id", "exportThreadsLink");
                    document.body.appendChild(link); // Required for FF
                    link.click(); // This will download the data file named "my_data.csv".
                    link.parentNode.removeChild(link);
                    ContentHome.exportingThreads = false;
                    buildfire.spinner.hide();
                    if (!$scope.$$phase) $scope.$digest();
                }
                const loadPage = () => {
                    buildfire.spinner.show();
                    let searchOptions = {
                        page, pageSize, sort: { "createdOn": -1 }, recordCount: true,
                    }
                    if (wid === null)
                        searchOptions.filter = { "_buildfire.index.string1": "" }
                    else
                        searchOptions.filter = { "_buildfire.index.string1": { "$regex": wid, "$options": "i" } }
                        buildfire.publicData.search(searchOptions, 'posts', function(err, data) {
                            if(data && data.result.length) {
                                data.result.map(item => allPosts.push(item));
                                if(data.totalRecord > allPosts.length) {
                                    page++; loadPage();
                                } else {
                                    parseToCSV();
                                }
                            }
                        });
                }
                loadPage();

            }
            
            ContentHome.decodeText = function (text) {
                return decodeURIComponent(text);
            };

            $scope.initHesGallery = () => {
                setTimeout(() => {
                    HesGallery.init({
                        // disable scrolling when the popup is activated
                        disableScrolling: true,
                        
                        // self-hosted styles
                        hostedStyles: true,
                        
                        // enable/disable animation
                        animations: false,
                        
                        // enable/disable keyboard navigation
                        keyboardControl: true,
                        
                        // disable the plugin when the screen size is smaller than this value
                        minResolution: 0,
                        
                        // enable/disable infinite loop
                        wrapAround: false,
                        
                        // show/hide image count
                        showImageCount: true
                    });
                }, 0);
            }

            $scope.getUserName = function(userDetails) {
                let name = null;
                if (userDetails.displayName !== 'Someone'
                && userDetails.displayName) {
                    name = userDetails.displayName;
                }
                else if (userDetails.firstName !== 'Someone' &&
                    userDetails.firstName && userDetails.lastName)
                    name = userDetails.firstName + ' ' + userDetails.lastName;
                else if(userDetails.firstName !== 'Someone' &&
                userDetails.firstName)
                    name = userDetails.firstName;
                else if(userDetails.lastName)
                    name = userDetails.lastName;
                else name = 'Someone';
                return name;
            }

            Buildfire.messaging.onReceivedMessage = function (event) {
                if (event) {
                    switch (event.name) {
                        case EVENTS.POST_CREATED:
                            if (event.post) {
                                ContentHome.posts.unshift(event.post);
                            }
                            break;
                        case EVENTS.POST_LIKED:
                            ContentHome.posts.some(function (el) {
                                if (el.id == event.id) {
                                    el.likes.push(event.userId);
                                    return true;
                                }
                            });
                            break;
                        case EVENTS.POST_UNLIKED:
                            ContentHome.posts.some(function (el) {
                                if (el.id == event.id) {
                                    let index = el.likes.indexOf(event.userId)
                                    el.likes.splice(index, 1)
                                    return true;
                                }
                            });
                            break;
                        case EVENTS.COMMENT_ADDED:
                            ContentHome.posts.some(function (el) {
                                if (el.id == event.id) {
                                    el.comments.push(event.comment)
                                    return true;
                                }
                            });
                            if (!$scope.$$phase) $scope.$digest();
                            break;
                        case EVENTS.POST_DELETED:
                            ContentHome.posts = ContentHome.posts.filter(function (el) {
                                return el.id != event.id;
                            });
                            ContentHome.loading = false;
                            if (ContentHome.modalPopupThreadId == event._id)
                                Modals.close('Post already deleted');
                            break;
                        case EVENTS.COMMENT_DELETED:
                            ContentHome.posts.map((post, index) => {
                                if (post.id === event.post.id) {
                                    post.comments.splice(index, 1);
                                }
                            });
                            if (ContentHome.modalPopupThreadId == event._id)
                                Modals.close('Comment already deleted');
                            break;
                        case EVENTS.COMMENT_LIKED:
                            ContentHome.posts.some(function (el) {
                                if (el.id == event.postId) {
                                    if (el.comments && el.comments.length) {
                                        el.comments.some(function (commentData) {
                                            if (commentData.id == event.id) {
                                                let liked = commentData.likes.find(element => element === event.userId);
                                                let index = commentData.likes.indexOf(liked)
                                                if (liked !== undefined)
                                                    commentData.likes.splice(index, 1)
                                                else
                                                    commentData.likes.push(event.userId);
                                                return true;
                                            }
                                        });
                                    }
                                    return true;
                                }
                            });
                            if (!$scope.$$phase)
                                $scope.$digest();
                            break;
                        case 'SEND_POSTS_TO_CP':
                            ContentHome.posts = event.posts;
                            setTimeout(() => {
                                $scope.initHesGallery();
                            });
                            ContentHome.loading = false;
                            if (!$scope.$$phase)
                                $scope.$digest();
                            break;
                        default:
                            ContentHome.loading = false;
                            if (!$scope.$$phase)
                                $scope.$digest();
                            break;
                    }
                    if (!$scope.$$phase)
                        $scope.$digest();
                }
            };

            // Init WYSIWYG
            let appSettings = {};
            let updateDelay;
            tinymce.init({
                selector: "textarea",
                setup: (ed) => {
                    ed.on('KeyUp', (e) => {
                        clearTimeout(updateDelay);
                        updateDelay = setTimeout(() => {
                            appSettings.pinnedPost = ed.getContent();
                            buildfire.datastore.save({ appSettings: appSettings }, "Social", console.log)
                        }, 700);
                    });
                }
            });

            window.onload = function () {
                buildfire.datastore.get("Social", function (err, result) {
                    if (result.data.appSettings && result.data.appSettings.pinnedPost) {
                        appSettings = result.data.appSettings;
                        tinymce.activeEditor.setContent(result.data.appSettings.pinnedPost);
                    }
                });
                setTimeout(() => {
                    ContentHome.loading = false;
                    if (!$scope.$$phase)
                    $scope.$digest();
                }, 1500)
            }

            init();
        }]);
})(window.angular);

