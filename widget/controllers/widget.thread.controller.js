'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
      .controller('ThreadCtrl', ['$scope', '$routeParams', '$location', '$anchorScroll', 'SocialDataStore', '$rootScope', 'Buildfire', 'EVENTS', 'THREAD_STATUS', 'FILE_UPLOAD', 'SocialItems', '$q', '$timeout', 'Location', 'Util', 'GROUP_STATUS', 'SubscribedUsersData', function ($scope, $routeParams, $location, $anchorScroll, SocialDataStore, $rootScope, Buildfire, EVENTS, THREAD_STATUS, FILE_UPLOAD, SocialItems, $q, $timeout, Location, Util, GROUP_STATUS, SubscribedUsersData) {
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
          Thread.util = Util;
          Thread.loaded = false;
          Thread.processedComments = false;
          Thread.skeletonPost = new Buildfire.components.skeleton('.social-item', {
              type: 'list-item-avatar, list-item-two-line, image'
          });
          Thread.skeletonComments = new Buildfire.components.skeleton('.social-item-comment', {
              type: 'list-item-avatar, list-item-two-line'
          });

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
                  document.getElementById("addCommentBtn").style.setProperty("background-color", "var(--bf-theme-success)", "important");
                  elements[3].style.setProperty("fill", obj.colors.titleBarTextAndIcons, "important");
                  document.getElementById("add-comment-svg").style.setProperty("fill", 'white', "important");
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
                          buildfire.imagePreviewer.show({
                              images: selectedImage
                          });
                      });

                  });
              }
          }

          Thread.showComments = () => {
              Thread.processedComments = true;
              if (!$scope.$$phase) $scope.$digest();
          }

          Thread.getDisplayName = (userId, userDetails) => {
              const blockedUsers = Thread.SocialItems.blockedUsers;
              if (blockedUsers.includes(userId)) return Thread.SocialItems.languages.blockedUser || "Blocked User";
              else return Thread.SocialItems.getUserName(userDetails);
          }

          Thread.isBlockedUser = (userId) => {
              const blockedUsers = Thread.SocialItems.blockedUsers;
              return blockedUsers.includes(userId);
          }

          Thread.handleDeletedUsers = function () {
              if (!Thread.post.comments.length) return Thread.showComments();

              let userIds = [...new Set(Thread.post.comments.map(comment => comment.userId))];
              if (userIds.length)
                  Thread.getUserProfiles(userIds);
          }

          Thread.getUserProfiles = (userIds) => {
              let userProfilesChunks = Util.splitArrayIntoChunks(userIds);
              let userProfilesIds = [];

              const extractAndProcessDeletedUsers = () => {
                  let deletedUsers = userIds.filter(id => !userProfilesIds.includes(id)).filter(el => el);

                  if (!deletedUsers.length) return Thread.showComments();

                  deletedUsers.forEach(userId => {
                      let comments = Thread.post.comments.filter(comment => comment.userId == userId);
                      comments.forEach(comment => {
                          comment.comment = "MESSAGE DELETED";
                          comment.deletedOn = new Date();
                          comment.originalUserId = userId;
                          comment.userId = null;
                          comment.userDetails = null;
                          comment.imageUrl = [];
                      });
                  });

                  SocialDataStore.updatePost(Thread.post).then(() => {
                      return Thread.showComments();
                  }, (err) => console.error(err));
              }

              const getUserProfiles = (userIds) => {
                  return new Promise((resolve, reject) => {
                      buildfire.auth.getUserProfiles({userIds}, (err, users) => {
                          if (err) return reject(err);
                          resolve(users);
                      });
                  });
              }

              let promises = userProfilesChunks.map(chunk => getUserProfiles(chunk));

              Promise.all(promises).then((results) => {
                  results.forEach((result) => userProfilesIds = userProfilesIds.concat(result.map(el => el._id)));
                  extractAndProcessDeletedUsers();
              }).catch((error) => console.error(error));
          }

          Thread.init = function () {
              Thread.skeletonPost.start();
              Thread.skeletonComments.start();
              Thread.setAppTheme();
              if ($routeParams.threadId) {
                  let post = Thread.SocialItems.items.find(el => el.id === $routeParams.threadId);
                  Thread.post = post || {};
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
                          Thread.handleDeletedUsers();
                          SubscribedUsersData.getThreadFollowingStatus(userData._id, Thread.post.id, Thread.SocialItems.wid, Thread.SocialItems.context.instanceId, function (err, status) {
                              if (status) {
                                    let followsPost = status.posts.find(el => el === Thread.post.id);
                                    Thread.followingStatus = !!followsPost;
                              }
                              Thread.loaded = true;
                              Thread.skeletonPost.stop();
                              Thread.skeletonComments.stop();
                              Thread.setupThreadImage();
                              $scope.$digest();
                          });
                      }
                  });
              }
          }

          Thread.init();

          var watcher = $scope.$watch(function () {
              return SocialItems.getInstance().items;
          }, function (newVal, oldVal) {
              Thread.post = newVal.find(el => el.id === $routeParams.threadId);
              if (Thread.post === undefined) {
                  Location.goToHome();
              }
          }, true);

          Thread.navigateToPrivateChat = function (user) {
              Thread.SocialItems.isPrivateChat = true;
              Thread.SocialItems.items = [];
              Thread.SocialItems.wid = user.wid;
              Thread.SocialItems.pageSize = 5;
              Thread.SocialItems.page = 0;
              $rootScope.showThread = true;
              // destroy the watcher
              watcher();
              $rootScope.$broadcast("loadPrivateChat");
              buildfire.history.push(Thread.SocialItems.getUserName(Thread.SocialItems.userDetails) + ' | ' + user.name, {
                  isPrivateChat: true,
                  showLabelInTitlebar: true
              });
          }

          Thread.followPrivateWall = function (userId, wid, userName = null) {
              buildfire.auth.getUserProfile({
                  userId: userId
              }, (err, user) => {
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
                          index: {
                              text: userId + '-' + wid,
                              string1: wid
                          }
                      }
                  };
                  userName = Thread.SocialItems.getUserName(params.userDetails)
                  console.log("SACUVAVA KORISNIKA ZA PRIVATE", params)
                  SubscribedUsersData.save(params, function (err) {
                      if (err) console.log('Error while saving subscribed user data.');
                      if (userName)
                          Thread.navigateToPrivateChat({
                              id: userId,
                              name: userName,
                              wid: wid
                          });
                  });
              })
          }

          Thread.openBottomDrawer = function (post) {
              let listItems = [];
              let userId = post.userId;
              Thread.modalPopupThreadId = post.id;
              Thread.SocialItems.authenticateUser(null, (err, userData) => {
                  if (err) return console.error("Getting user failed.", err);
                  if (userData) {
                      // Add options based on user conditions
                      if (post.userId === Thread.SocialItems.userDetails.userId) {
                          listItems.push(
                            {
                                id: 'deletePost',
                                text: Thread.SocialItems.languages.deletePost
                            }
                          );
                      } else {
                          listItems.push(
                            {
                                id: 'reportPost',
                                text: Thread.SocialItems.languages.reportPost
                            },
                            {
                                id: 'blockUser',
                                text: Thread.SocialItems.languages.blockUser
                            }
                          );
                      }
                  } else return false;

                  Follows.isFollowingUser(userId, (err, r) => {
                      if (Thread.SocialItems.appSettings.allowCommunityFeedFollow == true && post.userId != Thread.SocialItems.userDetails.userId)
                          listItems.push({
                              text: r ? 'Unfollow' : 'Follow'
                          });

                      if (Thread.SocialItems.appSettings && Thread.SocialItems.appSettings.seeProfile == true && post.userId != Thread.SocialItems.userDetails.userId)
                          listItems.push({
                              text: 'See Profile'
                          });

                      if (Thread.SocialItems.appSettings && !Thread.SocialItems.appSettings.allowChat && !Thread.SocialItems.isPrivateChat
                        && post.userId != Thread.SocialItems.userDetails.userId && ((Thread.SocialItems.appSettings && !Thread.SocialItems.appSettings.disablePrivateChat) || Thread.SocialItems.appSettings.disablePrivateChat == false)) {
                          listItems.push({
                              text: 'Send Direct Message'
                          });
                      }

                      if (Thread.SocialItems.appSettings && Thread.SocialItems.appSettings.allowChat == "allUsers" && !Thread.SocialItems.isPrivateChat
                        && post.userId != Thread.SocialItems.userDetails.userId)
                          listItems.push({
                              text: 'Send Direct Message'
                          });

                      if (Thread.SocialItems.appSettings && Thread.SocialItems.appSettings.allowChat == "selectedUsers" && !Thread.SocialItems.isPrivateChat
                        && post.userId != Thread.SocialItems.userDetails.userId) {
                          SubscribedUsersData.checkIfCanChat(userId, (err, response) => {
                              if (response) {
                                  listItems.push({
                                      text: 'Send Direct Message'
                                  });
                              }
                              Thread.ContinueDrawer(post, listItems)
                          })
                      } else {
                          Thread.ContinueDrawer(post, listItems)
                      }
                  });
              });
          }

          Thread.ContinueDrawer = function (post, listItems) {
              let userId = post.userId;
              if (listItems.length == 0) return;
              Buildfire.components.drawer.open({
                  enableFilter: false,
                  listItems: listItems
              }, (err, result) => {
                  if (err) return console.error(err);
                  else if (result.text == "Send Direct Message") Thread.openChat(userId);
                  else if (result.text == "See Profile") buildfire.auth.openProfile(userId);
                  else if (result.text == "Unfollow") Follows.unfollowUser(userId, (err, r) => err ? console.log(err) : console.log(r));
                  else if (result.text == "Follow") Follows.followUser(userId, (err, r) => err ? console.log(err) : console.log(r));
                  else if (result.id == "reportPost") Thread.reportPost(post);
                  else if (result.id == "blockUser") Thread.blockUser(userId);
                  else if (result.id == "deletePost") {
                      buildfire.components.drawer.closeDrawer();
                      Thread.deletePost(post.id)
                  }
                  buildfire.components.drawer.closeDrawer();
              });
          }

          Thread.openChatOrProfile = function (userId, comment) {
              if (comment.deletedOn) return;
              if (Thread.allowPrivateChat) {
                  Thread.SocialItems.authenticateUser(null, (err, user) => {
                      if (err) return console.error("Getting user failed.", err);
                      if (userId === Thread.SocialItems.userDetails.userId) return;
                      buildfire.auth.getUserProfile({
                          userId: userId
                      }, function (err, otherUser) {
                          if (err || !otherUser) return console.error("Getting user profile failed.", err);
                          Thread.openPrivateChat(userId, Thread.SocialItems.getUserName(otherUser));
                      });
                  });
              }
          };

          Thread.openChat = function (userId) {
              Thread.SocialItems.authenticateUser(null, (err, user) => {
                  if (err) return console.error("Getting user failed.", err);
                  if (user) {
                      buildfire.auth.getUserProfile({
                          userId: userId
                      }, function (err, user) {
                          if (err || !user) return console.error("Getting user profile failed.", err);
                          if (userId === Thread.SocialItems.userDetails.userId) return;
                          Thread.openPrivateChat(userId, Thread.SocialItems.getUserName(user));
                      });
                  }
              });
          }

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
                  if (!status.length) {
                      Thread.followPrivateWall(userId, wid, userName);
                  } else {
                      Thread.navigateToPrivateChat({
                          id: userId,
                          name: userName,
                          wid: wid
                      });
                  }
              });
          }

          Thread.showMoreOptionsComment = function (comment) {
              Thread.modalPopupThreadId = comment.threadId;
              Thread.SocialItems.authenticateUser(null, (err, user) => {
                  if (err) return console.error("Getting user failed.", err);
                  if (user) {
                      const drawerOptions = {
                          listItems: []
                      };

                      // Add options based on user conditions
                      if (comment.userId === Thread.SocialItems.userDetails.userId) {
                          drawerOptions.listItems.push({
                              id: 'deleteComment',
                              text: Thread.SocialItems.languages.deleteComment
                          });
                      } else {
                          const blockedUsers = Thread.SocialItems.blockedUsers;
                          if (!blockedUsers.includes(comment.userId)) {
                              drawerOptions.listItems.push(
                                {
                                    id: 'blockUser',
                                    text: Thread.SocialItems.languages.blockUser
                                }
                              );
                          }

                          drawerOptions.listItems.push(
                            {
                                id: 'reportComment',
                                text: Thread.SocialItems.languages.reportComment
                            }
                          );
                      }

                      buildfire.components.drawer.open(drawerOptions, (err, result) => {
                          if (err) return console.error("Error opening drawer.", err);
                          if (result) {
                              switch (result.id) {
                                  case 'deleteComment':
                                      // Call the existing deleteComment function
                                      Thread.deleteComment(comment);
                                      break;
                                  case 'reportComment':
                                      // Call the existing reportComment function
                                      Thread.reportComment(comment);
                                      break;
                                  case 'blockUser':
                                      // Call the existing block function
                                      Thread.blockUser(comment.userId);
                                      break;
                              }
                          }
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
              SubscribedUsersData.getGroupFollowingStatus(Thread.post.userId, Thread.SocialItems.wid, Thread.SocialItems.context.instanceId, function (err, status) {
                  if (status.length && status[0].data && !status[0].data.leftWall) {
                      let followsPost = status[0].data.posts.find(el => el === Thread.post.id);
                      if (followsPost) {
                          let options = {
                              title: 'Notification',
                              text: '',
                              sendToSelf: false
                          };

                          Util.setExpression({title: Thread.SocialItems.context.title});

                          let titleKey, messageKey, inAppMessageKey;
                            if (text === 'likedComment') {
                                options.users = [post.userId];
                                titleKey = Thread.SocialItems.languages.commentLikeNotificationTitle;
                                messageKey = Thread.SocialItems.languages.commentLikeNotificationMessageBody;
                                inAppMessageKey = Thread.SocialItems.languages.commentLikeInAppMessageBody;
                            } else if (text === 'likedPost') {
                                options.users = [Thread.post.userId];
                                titleKey = Thread.SocialItems.languages.postLikeNotificationTitle;
                                messageKey = Thread.SocialItems.languages.postLikeNotificationMessageBody;
                                inAppMessageKey = Thread.SocialItems.languages.postLikeInAppMessageBody;
                            } else if (text === 'comment') {
                                options.users = [Thread.post.userId];
                                titleKey = Thread.SocialItems.languages.commentNotificationMessageTitle;
                                messageKey = Thread.SocialItems.languages.commentNotificationMessageBody;
                                inAppMessageKey = Thread.SocialItems.languages.commentInAppMessageBody;
                            }

                          if (Thread.SocialItems.wid) {
                              options.queryString = `&dld=${encodeURIComponent(JSON.stringify({wid: Thread.SocialItems.wid}))}`
                          } else {
                              options.queryString = `&dld=${encodeURIComponent(JSON.stringify({postId: Thread.post.id}))}`
                          }

                          Promise.all([Util.evaluateExpression(titleKey), Util.evaluateExpression(messageKey), Util.evaluateExpression(inAppMessageKey)])
                            .then(([title, message, inAppMessage]) => {
                                options.title = title;
                                options.text = message;
                                options.inAppMessage = inAppMessage;

                                buildfire.notifications.pushNotification.schedule(options, function (err) {
                                    if (err) return console.error('Error while setting PN schedule.', err);
                                    console.log("SENT NOTIFICATION", options);
                                });
                            })
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
                      } else {
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
                      } else {
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
                      index: {
                          text: Thread.SocialItems.userDetails.userId + '-' + Thread.SocialItems.wid
                      }
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

          Thread.reportComment = function (comment) {
              Buildfire.services.reportAbuse.report(
                {
                    "itemId": comment.commentId,
                    "reportedUserId": Thread.post.userId,
                    "deeplink": {
                        "fromReportAbuse": true,
                        "postId": Thread.post.id,
                        "wallId": Thread.SocialItems.wid,
                        "commentId": comment.commentId
                    },
                    "itemType": "comment"
                },
                (err, result) => {
                    if (err && err != 'Report is cancelled') {
                        Buildfire.dialog.toast({
                            message: Thread.SocialItems.languages.reportCommentFail || "This comment is already reported.",
                            type: 'info'
                        });
                    }
                    if (result) {
                        Buildfire.dialog.toast({
                            message: Thread.SocialItems.languages.reportCommentSuccess || "Report submitted and pending admin review.",
                            type: 'info'
                        });
                    }
                }
              );
          }

          Thread.reportPost = function () {
              Buildfire.services.reportAbuse.report(
                {
                    "itemId": Thread.post.id,
                    "reportedUserId": Thread.post.userId,
                    "deeplink": {
                        "fromReportAbuse": true,
                        "postId": Thread.post.id,
                        "wallId": Thread.SocialItems.wid
                    },
                    "itemType": "post"
                },
                (err, reportResult) => {
                    if (err && err !== 'Report is cancelled') {
                        Buildfire.dialog.toast({
                            message: Thread.SocialItems.languages.reportPostFail || "This post is already reported.",
                            type: 'info'
                        });
                    }
                    if (reportResult) {
                        Buildfire.dialog.toast({
                            message: Thread.SocialItems.languages.reportPostSuccess || "Report submitted and pending admin review.",
                            type: 'info'
                        });
                    }
                }
              );
          }

          Thread.addComment = function (imageUrl) {
              let commentData = {
                  threadId: Thread.post.id,
                  comment: Thread.comment ? Thread.comment.replace(/[#&%+!@^*()-]/g, function (match) {
                      return encodeURIComponent(match)
                  }) : '',
                  commentId: Util.UUID(),
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
                    Thread.scheduleNotification(commentData, 'comment');
                });
          }

          Thread.blockUser = function (userId) {
              SubscribedUsersData.blockUser(userId, (err, blockResult) => {
                  if (err) {
                      return console.error("Error blocking user.", err);
                  }
                  if (blockResult) {
                      Buildfire.dialog.toast({
                          message: Thread.SocialItems.languages.blockUserSuccess || "User has been blocked successfully.",
                          type: 'info'
                      });
                      Location.goToHome();
                  }
              });
          }

          Thread.getPostContent = function (data) {
              if (data && data.results && data.results.length > 0 && !data.cancelled) {
                  $scope.Thread.comment = data.results["0"].textValue;
                  $scope.Thread.images = data.results["0"].images;

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
                              "images": {
                                  enable: true,
                                  multiple: true
                              },
                              "gifs": {
                                  enable: true
                              }
                          }
                      }, (err, data) => {
                          if (err) return console.error("Something went wrong.", err);
                          if (data.cancelled) return console.error('User canceled.')
                          Thread.getPostContent(data);
                          if ((Thread.comment || ($scope.Thread.images && $scope.Thread.images.length > 0))) {
                              Thread.addComment($scope.Thread.images);
                          }
                      });
                  }
              });

          }

          Thread.decodeText = function (text) {
              return decodeURIComponent(text);
          };

          Buildfire.history.onPop(function (breadcrumb) {
              Thread.goFullScreen = false;
              if (!$scope.$$phase) $scope.$digest();
          }, true);

          Thread.deletePost = function (postId) {
              buildfire.spinner.show();
              var success = function (response) {
                  if (response) {
                      Buildfire.messaging.sendMessageToControl({
                          'name': EVENTS.POST_DELETED,
                          'id': postId
                      });
                      let postToDelete = Thread.SocialItems.items.find(element => element.id === postId)
                      let index = Thread.SocialItems.items.indexOf(postToDelete);
                      Thread.SocialItems.items.splice(index, 1);

                      if (!$scope.$$phase)
                          $scope.$digest();
                      Buildfire.components.drawer.closeDrawer();
                      Buildfire.spinner.hide();
                      Buildfire.dialog.toast({
                          message: Thread.SocialItems.languages.postDeleteSuccess || "Post successfully deleted",
                          type: 'info'
                      });

                      Location.goToHome();
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
                              Buildfire.dialog.toast({
                                  message: "Post already deleted",
                                  type: 'info'
                              });
                          }
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
                              Buildfire.dialog.toast({
                                  message: "Comment already deleted",
                                  type: 'info'
                              });
                          break;
                      case "ASK_FOR_WALLID":
                          window.buildfire.messaging.sendMessageToControl({
                              name: 'SEND_WALLID',
                              wid: Thread.SocialItems.wid,
                          });
                      default:
                          break;
                  }
              }
          };
          // On Login
          Buildfire.datastore.onUpdate(function (response) {
              if (response.tag === "languages")
                  Thread.SocialItems.formatLanguages(response);
              else if (response.tag === "Social") {
                  Thread.SocialItems.appSettings.allowSideThreadTags = response.data.appSettings.allowSideThreadTags;
                  Thread.SocialItems.appSettings.sideThreadUserTags = response.data.appSettings.sideThreadUserTags;
                  Thread.SocialItems.appSettings.allowChat = response.data.appSettings.allowChat;
                  Thread.showHideCommentBox();
                  $scope.$digest();
              }
              //Thread.init();
          });

          Buildfire.auth.onLogin(function (user) {
              Thread.SocialItems.authenticateUser(user, (err, userData) => {
                  if (err) return console.error("Getting user failed.", err);
                  if (userData) {
                      Thread.showHideCommentBox();
                      $scope.$digest();
                  }
                  Location.goToHome();
              });
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
              $rootScope.$broadcast('ROUTE_CHANGED', {
                  _id: Thread.post.id,
                  isUserLikeActive: Thread.post.isUserLikeActive
              });
              onRefresh.clear();
              Buildfire.datastore.onRefresh(function () {
                  Location.goToHome();
              });
          });

      }])
})(window.angular);
