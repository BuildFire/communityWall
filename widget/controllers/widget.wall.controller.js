'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
      .controller('WidgetWallCtrl', ['$scope', 'SocialDataStore', 'Buildfire', '$rootScope', 'Location', 'EVENTS', 'GROUP_STATUS', 'MORE_MENU_POPUP', 'FILE_UPLOAD', 'SocialItems', '$q', '$anchorScroll', '$location', '$timeout', 'Util', 'SubscribedUsersData', function ($scope, SocialDataStore, Buildfire, $rootScope, Location, EVENTS, GROUP_STATUS, MORE_MENU_POPUP, FILE_UPLOAD, SocialItems, $q, $anchorScroll, $location, $timeout, util, SubscribedUsersData) {
          var WidgetWall = this;

          WidgetWall.userDetails = {};
          WidgetWall.postText = '';
          WidgetWall.modalPopupThreadId;

          WidgetWall.allowCreateThread = true;
          WidgetWall.allowPrivateChat = false;
          WidgetWall.allowFollowLeaveGroup = true;
          WidgetWall.groupFollowingStatus = false;
          WidgetWall.postsLoaded = false;

          WidgetWall.threadTag = "thread";
          WidgetWall.appTheme = null;

          WidgetWall.loadedPlugin = false;
          WidgetWall.SocialItems = SocialItems.getInstance();
          WidgetWall.util = util;
          $rootScope.showThread = true;
          WidgetWall.loading = true;
          WidgetWall.scrollPosition = null;
          WidgetWall.skeletonActive = false;
          WidgetWall.deeplinkHandled = false;
          WidgetWall.isFromDeepLink= false;

          WidgetWall.skeleton = new Buildfire.components.skeleton('.social-item', {
              type: 'list-item-avatar, list-item-two-line, image'});

          WidgetWall.startSkeleton = function () {
            if (!WidgetWall.skeletonActive) {
              WidgetWall.skeleton.start();
              WidgetWall.skeletonActive = true;
            }
          }

          WidgetWall.stopSkeleton = function () {
            WidgetWall.postsLoaded = true;
            if (WidgetWall.skeletonActive) {
              WidgetWall.skeleton.stop();
              WidgetWall.skeletonActive = false;
            }
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

              if (!WidgetWall.allowCreateThread && WidgetWall.SocialItems.isPrivateChat) {
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
              SubscribedUsersData.indexingUpdateDone = WidgetWall.SocialItems.appSettings.indexingUpdateDone ? WidgetWall.SocialItems.appSettings.indexingUpdateDone : false;
              WidgetWall.SocialItems.indexingUpdateDone = WidgetWall.SocialItems.appSettings.indexingUpdateDone ? WidgetWall.SocialItems.appSettings.indexingUpdateDone : false;
              WidgetWall.showHidePrivateChat();
              WidgetWall.followLeaveGroupPermission();
              WidgetWall.showHideCommentBox();
              let dldActionItem = new URLSearchParams(window.location.search).get('actionItem');
              if (dldActionItem)
                  WidgetWall.SocialItems.appSettings.actionItem = JSON.parse(dldActionItem);

              let actionItem = WidgetWall.SocialItems.appSettings.actionItem;
              if (actionItem && actionItem.iconUrl) {
                  actionItem.iconUrl = buildfire.imageLib.cropImage(actionItem.iconUrl, {
                      size: 'xss',
                      aspect: '1:1'
                  })
                  angular.element('#actionBtn').attr('style', `background-image: url(${actionItem.iconUrl}) !important; background-size: cover !important;`);
              }

              if (typeof (WidgetWall.SocialItems.appSettings.showMembers) == 'undefined')
                  WidgetWall.SocialItems.appSettings.showMembers = true;
              if (typeof (WidgetWall.SocialItems.appSettings.allowAutoSubscribe) == 'undefined')
                  WidgetWall.SocialItems.appSettings.allowAutoSubscribe = true;

              let pinnedPostMessage = null;
              if (WidgetWall.SocialItems.appSettings && typeof WidgetWall.SocialItems.appSettings.pinnedPost !== 'undefined' && !WidgetWall.SocialItems.headerContent) {
                  pinnedPostMessage = WidgetWall.SocialItems.appSettings.pinnedPost;
              } else if(WidgetWall.SocialItems.headerContent) {
                  pinnedPostMessage = WidgetWall.SocialItems.headerContent;
              }

              WidgetWall.pinnedPost = pinnedPostMessage;
              pinnedPost.innerHTML = pinnedPostMessage;

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

                  elements[2].style.setProperty("fill", 'white', "important");
                  document.getElementById('addBtn').style.setProperty("background-color", "var(--bf-theme-success)", "important");
                  document.getElementById('socialHeader').style.setProperty("background-color", obj.colors.backgroundColor, "important");
                  WidgetWall.loadedPlugin = true;
              });
          }

          WidgetWall.getPosts = function (callback = null)  {
              WidgetWall.SocialItems.getPosts(function (err, data) {
                  window.buildfire.messaging.sendMessageToControl({
                      name: 'SEND_POSTS_TO_CP',
                      posts: WidgetWall.SocialItems.items,
                      pinnedPost: WidgetWall.pinnedPost,
                      wid: WidgetWall.SocialItems.wid
                  });
                  if (callback) {
                      return callback(null, data);
                  }
              });
          }

          $rootScope.isItemLiked = function (post, userId) {
            if (!post || !post.likes || !post.likes.length) return false;
            return post.likes.includes(userId);
          }

          WidgetWall.checkFollowingStatus = function (user = null, callback = null) {
              WidgetWall.loading = true;
              SubscribedUsersData.getGroupFollowingStatus(WidgetWall.SocialItems.userDetails.userId, WidgetWall.SocialItems.wid, WidgetWall.SocialItems.context.instanceId, function (err, status) {
                  if (err) {
                      console.log('error while getting initial group following status.', err);
                      if (callback) {
                          return callback(err);
                      }
                  } else {
                      if (!status.length && WidgetWall.SocialItems.appSettings.allowAutoSubscribe) {
                          WidgetWall.loading = false;
                          if (callback) {
                              WidgetWall.followWall();
                              return callback(null);
                          } else {
                              return WidgetWall.followWall();
                          }
                      }
                      if (status.length) {
                          if (!status[0].data.leftWall) {
                              buildfire.notifications.pushNotification.subscribe({
                                  groupName: WidgetWall.SocialItems.wid === '' ?
                                    WidgetWall.SocialItems.context.instanceId : WidgetWall.SocialItems.wid
                              }, () => {});
                              WidgetWall.groupFollowingStatus = true;
                          } else if (status[0].data.banned) {

                              WidgetWall.SocialItems.userBanned = true;
                              WidgetWall.allowFollowLeaveGroup = false;
                              WidgetWall.allowCreateThread = false;
                              WidgetWall.SocialItems.appSettings.showMembers = false;
                              WidgetWall.groupFollowingStatus = false;
                          }
                      }
                      WidgetWall.showHideCommentBox();
                      if (user) WidgetWall.statusCheck(status, user);
                      buildfire.spinner.hide();
                      WidgetWall.loading = false;
                      $scope.$digest();
                      if (callback) {
                          return callback(null, status);
                      }
                  }
              });
          }

          WidgetWall.unfollowWall = function () {
              SubscribedUsersData.unfollowWall(WidgetWall.SocialItems.userDetails.userId, WidgetWall.SocialItems.wid, function (err, result) {
                  if (err) return console.error(err);
                  else {
                      Follows.unfollowPlugin((err, r) => err ? console.log(err) : console.log(r));
                      WidgetWall.groupFollowingStatus = false;
                      buildfire.notifications.pushNotification.unsubscribe({
                          groupName: WidgetWall.SocialItems.wid === '' ?
                            WidgetWall.SocialItems.context.instanceId : WidgetWall.SocialItems.wid
                      }, () => {});
                      const options = {
                          text: 'You have left this group'
                      };
                      buildfire.components.toast.showToastMessage(options, () => {});
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
                      index: {
                          text: user.userId + '-' + WidgetWall.SocialItems.wid,
                          string1: WidgetWall.SocialItems.wid
                      }
                  }
              };
              Follows.followPlugin((e, u) => e ? console.log(e) : console.log(u));

              SubscribedUsersData.save(params, function (err) {
                  if (err) console.log('Error while saving subscribed user data.');
                  else {
                      WidgetWall.groupFollowingStatus = true;
                      buildfire.notifications.pushNotification.subscribe({
                          groupName: WidgetWall.SocialItems.wid === '' ?
                            WidgetWall.SocialItems.context.instanceId : WidgetWall.SocialItems.wid
                      }, () => {});
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
                                      Follows.followPlugin((e, u) => e ? console.log(e) : console.log(u));
                                      buildfire.publicData.update(status[0].id, SubscribedUsersData.getDataWithIndex(status[0]).data, 'subscribedUsersData', console.log);
                                      buildfire.notifications.pushNotification.subscribe({
                                          groupName: WidgetWall.SocialItems.wid === '' ?
                                            WidgetWall.SocialItems.context.instanceId : WidgetWall.SocialItems.wid
                                      }, () => {});
                                      WidgetWall.groupFollowingStatus = true;
                                  } else if (status.length && !status[0].data.leftWall)
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

              if (text === 'like' && post.userId === WidgetWall.SocialItems.userDetails.userId) return;

              util.setExpression({ title: WidgetWall.SocialItems.context.title });

              const queryStringObj = {};
              if (WidgetWall.SocialItems.wid) {
                  queryStringObj.wid = WidgetWall.SocialItems.wid;
              }
              else {
                  queryStringObj.postId =post.id;
              }

              if (WidgetWall.SocialItems.pluginTitle) {
                queryStringObj.wTitle = WidgetWall.SocialItems.pluginTitle;
              }

              let titleKey, messageKey, inAppMessageKey;
              if (WidgetWall.SocialItems.isPrivateChat) {
                if (text === 'post') {
                    titleKey = WidgetWall.SocialItems.languages.personalNotificationMessageTitle;
                    messageKey = WidgetWall.SocialItems.languages.personalNotificationMessageBody;
                    inAppMessageKey = WidgetWall.SocialItems.languages.personalInAppMessageBody;
                } else if (text === 'like') {
                    titleKey = WidgetWall.SocialItems.languages.postLikeNotificationTitle;
                    messageKey = WidgetWall.SocialItems.languages.postLikeNotificationMessageBody;
                    inAppMessageKey = WidgetWall.SocialItems.languages.postLikeInAppMessageBody;
                }
                    Promise.all([util.evaluateExpression(titleKey), util.evaluateExpression(messageKey), util.evaluateExpression(inAppMessageKey)])
                    .then(([title, message, inAppMessage]) => {
                        options.title = title;
                        options.text = message;
                        options.inAppMessage = inAppMessage;

                        let userIdsTosSend = [];
                        if (WidgetWall.SocialItems.userIds) {
                            queryStringObj.userIds = WidgetWall.SocialItems.userIds;

                            const userIds = WidgetWall.SocialItems.userIds.split(',').filter((userId) => userId !== WidgetWall.SocialItems.userDetails.userId);
                            userIdsTosSend = userIds;
                        } else {
                            const user1Id = WidgetWall.SocialItems.wid.slice(0, 24);
                            const user2Id = WidgetWall.SocialItems.wid.slice(24, 48);
                            let userToSend = user1Id === WidgetWall.SocialItems.userDetails.userId ?
                              user2Id : user1Id;
                            userIdsTosSend.push(userToSend);
                            queryStringObj.userIds = [user1Id, user2Id];
                        }

                        options.queryString =`&dld=${encodeURIComponent(JSON.stringify({...queryStringObj }))}`

                        for (const userToSend of userIdsTosSend) {
                            SubscribedUsersData.getGroupFollowingStatus(userToSend, WidgetWall.SocialItems.wid, WidgetWall.SocialItems.context.instanceId, function (err, status) {
                                if (err) console.error('Error while getting initial group following status.', err);
                                if (status.length && status[0].data && !status[0].data.leftWall) {
                                    options.users.push(userToSend);

                                    buildfire.notifications.pushNotification.schedule(options, function (err) {
                                        if (err) return console.error('Error while setting PN schedule.', err);
                                    });
                                } else if (!status.length && WidgetWall.SocialItems.appSettings.allowAutoSubscribe) {
                                    buildfire.auth.getUserProfile({
                                        userId: userToSend
                                    }, (err, user) => {
                                        if (err || !user) return console.error(err);
                                        options.users.push(userToSend);

                                        buildfire.notifications.pushNotification.schedule(options, function (err) {
                                            if (err) return console.error('Error while setting PN schedule.', err);
                                        });
                                    });
                                }
                            });
                        }
                    })
              } else {
                if (text === 'post') {
                    titleKey = WidgetWall.SocialItems.languages.publicNotificationMessageTitle;
                    messageKey = WidgetWall.SocialItems.languages.publicNotificationMessageBody;
                    inAppMessageKey = WidgetWall.SocialItems.languages.publicInAppMessageBody;
                } else if (text === 'like') {
                    titleKey = WidgetWall.SocialItems.languages.postLikeNotificationTitle;
                    messageKey = WidgetWall.SocialItems.languages.postLikeNotificationMessageBody;
                    inAppMessageKey = WidgetWall.SocialItems.languages.postLikeInAppMessageBody;
                    options.users.push(post.userId);
                }
                    Promise.all([util.evaluateExpression(titleKey), util.evaluateExpression(messageKey), util.evaluateExpression(inAppMessageKey)])
                    .then(([title, message, inAppMessage]) => {
                        options.title = title;
                        options.text = message;
                        options.inAppMessage = inAppMessage;

                        options.queryString =`&dld=${encodeURIComponent(JSON.stringify({...queryStringObj }))}`
                        if (WidgetWall.SocialItems.wid) {
                          options.groupName = WidgetWall.SocialItems.wid;
                        } else {
                          options.groupName = WidgetWall.SocialItems.context.instanceId;
                        }

                        buildfire.notifications.pushNotification.schedule(options, function (err) {
                            if (err) return console.error('Error while setting PN schedule.', err);
                            console.log("SENT NOTIFICATION", options);
                        });
                    })
              }
          }

          WidgetWall.openBottomDrawer = function (post) {
              let listItems = [];
              let userId = post.userId;
              WidgetWall.modalPopupThreadId = post.id;
              WidgetWall.SocialItems.authenticateUser(null, (err, userData) => {
                  if (err) return console.error("Getting user failed.", err);
                  if (userData) {
                      WidgetWall.checkFollowingStatus();
                      // Add options based on user conditions
                      if (post.userId === WidgetWall.SocialItems.userDetails.userId) {
                          listItems.push(
                            {
                                id: 'deletePost',
                                text: WidgetWall.SocialItems.languages.deletePost
                            }
                          );
                      } else {
                          listItems.push(
                            {
                                id: 'reportPost',
                                text: WidgetWall.SocialItems.languages.reportPost
                            },
                            {
                                id: 'blockUser',
                                text: WidgetWall.SocialItems.languages.blockUser
                            }
                          );
                      }
                  } else return false;

                  Follows.isFollowingUser(userId, (err, r) => {
                      if (WidgetWall.SocialItems.appSettings.allowCommunityFeedFollow == true && post.userId != WidgetWall.SocialItems.userDetails.userId)
                          listItems.push({
                              text: r ? 'Unfollow' : 'Follow'
                          });

                      if (WidgetWall.SocialItems.appSettings.seeProfile && post.userId != WidgetWall.SocialItems.userDetails.userId)
                          listItems.push({
                              text: "See Profile"
                          })

                      if (WidgetWall.SocialItems.appSettings && !WidgetWall.SocialItems.appSettings.allowChat && !WidgetWall.SocialItems.isPrivateChat
                        && post.userId != WidgetWall.SocialItems.userDetails.userId && ((WidgetWall.SocialItems.appSettings && !WidgetWall.SocialItems.appSettings.disablePrivateChat) || WidgetWall.SocialItems.appSettings.disablePrivateChat == false)){
                          listItems.push({
                              text: 'Send Direct Message'
                          });
                      }

                      if (WidgetWall.SocialItems.appSettings && WidgetWall.SocialItems.appSettings.allowChat == "allUsers" && !WidgetWall.SocialItems.isPrivateChat
                        && post.userId != WidgetWall.SocialItems.userDetails.userId)
                          listItems.push({
                              text: 'Send Direct Message'
                          });

                      if (WidgetWall.SocialItems.appSettings && WidgetWall.SocialItems.appSettings.allowChat == "selectedUsers" && !WidgetWall.SocialItems.isPrivateChat
                        && post.userId != WidgetWall.SocialItems.userDetails.userId) {
                          SubscribedUsersData.checkIfCanChat(userId, (err, response) => {
                              if (response) {
                                  listItems.push({
                                      text: 'Send Direct Message'
                                  });
                              }
                              WidgetWall.ContinueDrawer(post, listItems)
                          })
                      } else {
                          WidgetWall.ContinueDrawer(post, listItems)
                      }
                  });
              });
          }

          WidgetWall.ContinueDrawer = function (post, listItems) {
              let userId = post.userId;
              if (listItems.length == 0) return;
              Buildfire.components.drawer.open({
                  enableFilter: false,
                  listItems: listItems
              }, (err, result) => {
                  if (err) return console.error(err);
                  else if (result.text == "Send Direct Message") WidgetWall.SocialItems.openChat(WidgetWall, userId);
                  else if (result.text == "See Profile") buildfire.auth.openProfile(userId);
                  else if (result.text == "Unfollow") Follows.unfollowUser(userId, (err, r) => err ? console.log(err) : console.log(r));
                  else if (result.text == "Follow") Follows.followUser(userId, (err, r) => err ? console.log(err) : console.log(r));
                  else if (result.id == "reportPost") WidgetWall.reportPost(post);
                  else if (result.id == "blockUser") WidgetWall.blockUser(userId);
                  else if (result.id == "deletePost") WidgetWall.deletePost(post.id);
                  buildfire.components.drawer.closeDrawer();
              });
          }


          WidgetWall.getBlockedUsers = function(callback) {
              SubscribedUsersData.getBlockedUsers((err, result)=>{
                  if (err) {
                      callback("Fetching Blocked Users Failed", null);
                  }
                  else if(result) callback(null, result);
                  else callback(null, null);
              })
          }
          WidgetWall.init = function () {

              WidgetWall.startSkeleton();
              WidgetWall.SocialItems.getSettings((err, result) => {
                  if (err) {
                      WidgetWall.stopSkeleton();
                      return console.error("Fetching settings failed.", err);
                  }
                  if (result) {
                      WidgetWall.SocialItems.items = [];
                      WidgetWall.setSettings(result);
                      WidgetWall.showHidePrivateChat();
                      WidgetWall.followLeaveGroupPermission();
                      WidgetWall.setAppTheme();
                      WidgetWall.getBlockedUsers((error, res) => {
                          if (err) console.log("Error while fetching blocked users ", err);
                          if (res) WidgetWall.SocialItems.blockedUsers = res;

                          WidgetWall.SocialItems.authenticateUserWOLogin(null, (err, user) => {
                              if (err) {
                                WidgetWall.stopSkeleton();
                                return console.error("Getting user failed.", err);
                              }
                              WidgetWall.getPosts(()=>{
                                  if (user) {
                                      WidgetWall.checkFollowingStatus(user);
                                      WidgetWall.checkForPrivateChat();
                                      WidgetWall.checkForDeeplinks();
                                  } else {
                                      WidgetWall.groupFollowingStatus = false;
                                  }
                              });
                          });
                      });
                  }
              });
          };

          WidgetWall.init();

          WidgetWall.handleDeepLinkActions = async function (deeplinkData, pushToHistory){
              if (deeplinkData) {
                  if (deeplinkData.fromReportAbuse) {
                      WidgetWall.SocialItems.reportData = deeplinkData;
                      $rootScope.showThread = false;
                      $timeout(function () {
                          Location.go('#/report', pushToHistory);
                          if (pushToHistory) {
                            WidgetWall.stopSkeleton();
                          }
                      });
                      return;
                  }
                  if (deeplinkData.postId) {
                    let isPostExist = WidgetWall.SocialItems.items.find(post => post.id === deeplinkData.postId);
                    if (isPostExist) {
                        return WidgetWall.goInToThread(deeplinkData.postId, pushToHistory);
                    } else {
                        return WidgetWall.SocialItems.getPostById(deeplinkData.postId, (err, res) => {
                            if (err) {
                                WidgetWall.stopSkeleton();
                                console.error(err);
                            } else if (res && res.data && res.id) {
                                WidgetWall.SocialItems.items.push({...res.data, id: res.id});
                                WidgetWall.goInToThread(deeplinkData.postId, pushToHistory);
                            } else {
                                WidgetWall.stopSkeleton();
                            }
                        });
                    }
                  }
                  await WidgetWall.SocialItems.migrateBrokenOneToOneWallPosts(deeplinkData.wid);
                  const wallId = await WidgetWall.SocialItems.getOneToOneWallId(deeplinkData.wid);
                  const userIds = deeplinkData.userIds;
                  const wTitle = deeplinkData.wTitle;
                  if (!userIds && wallId && wallId.length === 48) {
                      const user1Id = wallId.slice(0, 24);
                      const user2Id = wallId.slice(24, 48);
                      const otherUser = (user1Id.localeCompare(WidgetWall.SocialItems.userDetails.userId) === 0) ?
                        user2Id : user1Id;

                      WidgetWall.openChat(otherUser);
                  } else {
                      WidgetWall.openGroupChat(userIds, wallId, wTitle);
                  }
                  WidgetWall.SocialItems.items = [];
                  WidgetWall.stopSkeleton();
              } else {
                WidgetWall.stopSkeleton();
              }
          }

          WidgetWall.checkForPrivateChat = function () {
              if (WidgetWall.SocialItems.isPrivateChat) {
                  SubscribedUsersData.getUsersWhoFollow(WidgetWall.SocialItems.userDetails.userId, WidgetWall.SocialItems.wid, function (err, users) {
                      if (err) return console.log(err);

                      const otherUserIds = [];

                      if (!WidgetWall.SocialItems.userIds) {
                          const user1Id = WidgetWall.SocialItems.wid.slice(0, 24);
                          const user2Id = WidgetWall.SocialItems.wid.slice(24, 48);
                          var otherUser = (user1Id.localeCompare(WidgetWall.SocialItems.userDetails.userId) === 0) ?
                            user2Id : user1Id;
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
          }

          WidgetWall.checkForDeeplinks = function () {
            if (!WidgetWall.deeplinkHandled){
                Buildfire.deeplink.getData((data) => {
                    WidgetWall.deeplinkHandled = true;
                    const deeplinkData = WidgetWall.util.parseDeeplinkData(data);
                    if (deeplinkData) {
                        WidgetWall.isFromDeepLink = true;
                    }
                    WidgetWall.handleDeepLinkActions(deeplinkData, false);
                }, true);
            }

            Buildfire.deeplink.onUpdate((data) => {
                const deeplinkData = WidgetWall.util.parseDeeplinkData(data);
                WidgetWall.handleDeepLinkActions(deeplinkData, true);
            }, true);
          }

          WidgetWall.sanitizeWall = function (callback) {
              buildfire.publicData.search({
                    filter: {
                        '_buildfire.index.string1': WidgetWall.SocialItems.wid
                    }
                },
                'subscribedUsersData',
                function (err, result) {
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

                  userName = WidgetWall.SocialItems.getUserName(params.userDetails)
                  SubscribedUsersData.save(params, function (err) {
                      if (err) console.log('Error while saving subscribed user data.');
                      if (userName)
                          WidgetWall.navigateToPrivateChat({
                              id: userId,
                              name: userName,
                              wid: wid
                          });
                  });
              })
          }

          WidgetWall.navigateToPrivateChat = function (privateChatData) {

              WidgetWall.SocialItems.isPrivateChat = true;
              WidgetWall.SocialItems.wid = privateChatData.wid;
              WidgetWall.SocialItems.showMorePosts = false;
              WidgetWall.SocialItems.pageSize = 5;
              WidgetWall.SocialItems.page = 0;
              WidgetWall.SocialItems.setPrivateChatTitle(privateChatData.wid).then(() => {
                  if (WidgetWall.isFromDeepLink) {
                      buildfire.appearance.titlebar.setText({ text: WidgetWall.SocialItems.pluginTitle}, (err) => {
                          if (err) return console.error(err);
                      });
                  }
                  else {
                      buildfire.history.push(WidgetWall.SocialItems.pluginTitle, {
                          isPrivateChat: true,
                          showLabelInTitlebar: true
                      });
                  }
                  WidgetWall.SocialItems.items = [];
                  WidgetWall.isFromDeepLink = false;
                  WidgetWall.getPosts(() => {
                      document.getElementById('top').scrollTop = 0
                  });
              })
          }

          $rootScope.$on('loadPrivateChat', function (event, error) {
              WidgetWall.init();
          });

          $rootScope.$on('$locationChangeSuccess', function () {
              $rootScope.actualLocation = $location.path();
              if ($rootScope.actualLocation == "/") {
                  WidgetWall.SocialItems.getSettings((err, result) => {
                      if (err) return console.error("Fetching settings failed.", err);
                      if (result) {
                          WidgetWall.SocialItems.appSettings = result.data && result.data.appSettings ? result.data.appSettings : {};

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
                              } else if (response.tag === "languages")
                                  WidgetWall.SocialItems.formatLanguages(response);
                              $scope.$digest();
                          });
                      }
                  });
              }
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

          WidgetWall.openGroupChat = function (userIds, wid, wTitle) {
              if (WidgetWall.allowPrivateChat) {
                  WidgetWall.SocialItems.authenticateUser(null, (err, user) => {
                      if (err) return console.error("Getting user failed.", err);
                      if (user) {
                          WidgetWall.navigateToPrivateChat({
                              id: userIds,
                              name: 'someone',
                              wid: wid,
                              wTitle,
                          });
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
                      WidgetWall.navigateToPrivateChat({
                          id: userId,
                          name: userName,
                          wid: wid
                      });
                  }
              });
          }

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

              buildfire.auth.getUserProfiles({
                  userIds: otherUserIds
              }, (err, users) => {
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
                              data: {
                                  users,
                                  wallId,
                                  wallTitle,
                                  createdBy
                              }
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
                                Analytics.trackAction("thread-created");
                                return callback(null, new WidgetWall.Thread(record));
                            }
                          );
                      } else if (!haveSameUsers(records[0].data.users, users)) {
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
                      } else {
                          if (
                            Array.isArray(records[0].data.users) && records[0].data.users.length === 2 &&
                            records[0].data.users[0] && records[0].data.users[1]
                          ) {
                              records[0].data.wallTitle = WidgetWall.SocialItems.getUserName(records[0].data.users[0]) + ' | ' + WidgetWall.SocialItems.getUserName(records[0].data.users[1]);
                          }
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
              saveScrollPosition();
              WidgetWall.SocialItems.getPosts(function (err, data) {
                  window.buildfire.messaging.sendMessageToControl({
                      name: 'SEND_POSTS_TO_CP',
                      posts: WidgetWall.SocialItems.items,
                      pinnedPost: WidgetWall.pinnedPost,
                      wid: WidgetWall.SocialItems.wid
                  });
                  $scope.$digest();
                  restoreScrollPosition();
              });
          }


          function restoreScrollPosition() {
              const postsContainer = document.querySelector('.post-infinite-scroll');
              if (typeof WidgetWall.scrollPosition === 'number' && postsContainer) {
                  postsContainer.scrollTop = WidgetWall.scrollPosition
              }
          }

          function saveScrollPosition() {
              const postsContainer = document.querySelector('.post-infinite-scroll');
              if (postsContainer) {
                  WidgetWall.scrollPosition =  postsContainer.scrollTop;
              }
          }

          function finalPostCreation(imageUrl, callback) {
              let postData = {};
              postData.userDetails = WidgetWall.SocialItems.userDetails;
              postData.imageUrl = imageUrl || null;
              postData.images = WidgetWall.images ? $scope.WidgetWall.images : [];
              postData.wid = WidgetWall.SocialItems.wid;
              postData.text = WidgetWall.postText ? WidgetWall.postText.replace(/[#&%+!@^*()-]/g, function (match) {
                  return encodeURIComponent(match)
              }) : '';

              WidgetWall.onSendMessage({
                    _id: postData.userDetails && postData.userDetails.userId ? postData.userDetails.userId : null
                }, postData.text, () =>
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
                      callback(null, response.data);
                  }, (err) => {
                      console.error("Something went wrong.", err)
                      WidgetWall.postText = '';
                      callback(err);
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
                          if (data.cancelled) return;
                          WidgetWall.getPostContent(data);
                          if ((WidgetWall.postText || ($scope.WidgetWall.images && $scope.WidgetWall.images.length > 0))) {
                              finalPostCreation($scope.WidgetWall.images, (err) => {
                                  if (err) {
                                      return;
                                  }
                                  if (!WidgetWall.SocialItems.isPrivateChat) {
                                      buildfire.auth.getCurrentUser((err, currentUser) => {
                                          if (err || !currentUser) {
                                              console.error('Error getting current user: ', err);
                                              return;
                                          } else {
                                              SocialDataStore.addFeedPost({
                                                  postText: WidgetWall.postText ? WidgetWall.postText : "",
                                                  postImages: $scope.WidgetWall.images || []
                                              }, (err, r) => {
                                                  if (err) {
                                                      console.error('Error adding feed post: ', err);
                                                      return;
                                                  }
                                                  followThread();
                                              });
                                          }
                                      })
                                  }
                              });

                          }
                      });
                  }
              });
          }

          const followThread = () =>{
              WidgetWall.SocialItems.authenticateUser(null, (err, userData) => {
                  if (err) return console.error("Getting user failed.", err);
                  if (userData) {
                      SubscribedUsersData.getGroupFollowingStatus(userData._id, WidgetWall.SocialItems.wid, WidgetWall.SocialItems.context.instanceId, function (err, status) {
                          if (status.length) {
                              SubscribedUsersData.followThread({
                                  userId: userData._id,
                                  wallId: WidgetWall.SocialItems.wid,
                                  post: WidgetWall.SocialItems.items[0].id
                              });
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
                          Buildfire.messaging.sendMessageToControl({
                              'name': EVENTS.POST_UNLIKED,
                              'id': postUpdate.id,
                              'userId': liked
                          });
                      } else {
                          post.likes.push(WidgetWall.SocialItems.userDetails.userId);
                          Buildfire.messaging.sendMessageToControl({
                              'name': EVENTS.POST_LIKED,
                              'id': postUpdate.id,
                              'userId': liked
                          });
                      }
                      SocialDataStore.updatePost(post).then(() => {
                          SubscribedUsersData.getGroupFollowingStatus(post.userId, WidgetWall.SocialItems.wid, WidgetWall.SocialItems.context.instanceId, function (err, status) {
                              if (status.length &&
                                status[0].data && !status[0].data.leftWall && !liked) {
                                  Analytics.trackAction("post-liked");
                                  WidgetWall.scheduleNotification(post, 'like')
                              };
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

          WidgetWall.goInToThread = function (threadId, pushToHistory) {
              WidgetWall.SocialItems.authenticateUser(null, (err, user) => {
                  if (err) {
                    WidgetWall.stopSkeleton();
                    return console.error("Getting user failed.", err);
                  }
                  if (user) {
                      WidgetWall.checkFollowingStatus(null , ()=>{
                          if (threadId && !WidgetWall.SocialItems.userBanned) {
                              Location.go('#/thread/' + threadId, pushToHistory);
                         }
                         if (pushToHistory) {
                            WidgetWall.stopSkeleton();
                          }
                      });
                  }
              });
          };

          WidgetWall.deletePost = function (postId) {
              var success = function (response) {
                  if (response) {
                      Buildfire.messaging.sendMessageToControl({
                          'name': EVENTS.POST_DELETED,
                          'id': postId
                      });
                      let postToDelete = WidgetWall.SocialItems.items.find(element => element.id === postId)
                      console.log(postToDelete);
                      SocialDataStore.deleteFeedPost({
                          userId: postToDelete.userId,
                          postText: postToDelete.text,
                          postImages: postToDelete.imageUrl || [],
                      }, (err, r) => {
                          return
                      });
                      let index = WidgetWall.SocialItems.items.indexOf(postToDelete);
                      WidgetWall.SocialItems.items.splice(index, 1);
                      buildfire.spinner.hide();
                      if (!$scope.$$phase)
                          $scope.$digest();
                  }
              };
              // Called when getting error from SocialDataStore.deletePost method
              var error = function (err) {
                  console.log('Error while deleting post ', err);
              };
              // Deleting post having id as postId
              buildfire.spinner.show();
              buildfire.components.drawer.closeDrawer();
              SocialDataStore.deletePost(postId).then(success, error);
          };

          WidgetWall.blockUser = function (userId) {
              buildfire.spinner.show();
              buildfire.components.drawer.closeDrawer();
              SubscribedUsersData.blockUser(userId, (err, result) => {
                  if(err) {
                      console.log(err);
                  }
                  if(result) {
                      buildfire.spinner.hide();
                      Buildfire.dialog.toast({
                          message: WidgetWall.SocialItems.languages.blockUserSuccess || "User has been blocked succesfully",
                          type: 'info'
                      });
                      Location.goToHome();
                  }
              });

          }
          WidgetWall.reportPost = function (post) {
              Buildfire.services.reportAbuse.report(
                {
                    "itemId": post.id,
                    "reportedUserId": post.userId,
                    "deeplink": {
                        "fromReportAbuse": true,
                        "postId": post.id,
                        "wallId": WidgetWall.SocialItems.wid
                    },
                    "itemType": "post"
                },
                (err, reportResult) => {
                    if (err && err !== 'Report is cancelled') {
                        Buildfire.dialog.toast({
                            message: WidgetWall.SocialItems.languages.reportPostFail || "This post is already reported.",
                            type: 'info'
                        });
                    }
                    if (reportResult) {
                        Buildfire.dialog.toast({
                            message: WidgetWall.SocialItems.languages.reportPostSuccess || "Report submitted and pending admin review.",
                            type: 'info'
                        });
                    }
                }
              );
          }

          Buildfire.messaging.onReceivedMessage = function (event) {
              if (event) {
                  switch (event.name) {
                      case EVENTS.POST_DELETED:
                          WidgetWall.SocialItems.items = WidgetWall.SocialItems.items.filter(function (el) {
                              return el.id != event.id;
                          });

                          if (WidgetWall.modalPopupThreadId == event.id)
                              Buildfire.dialog.toast({
                                  message: "Post already deleted",
                                  type: 'info'
                              });
                          if (!$scope.$$phase)
                              $scope.$digest();
                          break;
                      case EVENTS.COMMENT_DELETED:
                          let post = WidgetWall.SocialItems.items.find(element => element.id === event.postId)
                          let index = post.comments.indexOf(event.comment);
                          post.comments.splice(index, 1);
                          if (WidgetWall.modalPopupThreadId == event.postId)
                              Buildfire.dialog.toast({
                                  message: "Comment already deleted",
                                  type: 'info'
                              });
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
              console.log(response)
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
              } else if (response.tag === "languages")
                  WidgetWall.SocialItems.formatLanguages(response);
              $scope.$digest();
          });

          function updatePostsWithNames(user, status) {
            // update posts with the user details
            buildfire.publicData.searchAndUpdate({
              "_buildfire.index.array1.string1": `createdBy_${user._id}`
              }, {
                $set: {
                  "userDetails": status[0].data.userDetails
                }
              }, 'posts', (err, res) => {
                if (err) console.error('failed to update posts ' + err);

                // update comments with the user details
                buildfire.publicData.searchAndUpdate({
                  "$json.comments.userId": user._id
                }, {
                  $set: {
                    "comments.$.userDetails": status[0].data.userDetails
                  }
                }, 'posts', (err, res) => {
                  if (err) console.error('failed to update comments ' + err);
                });
            });
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
                      if (dbLastUpdate > lastUpdated || (typeof status[0].data.userDetails.firstName === 'undefined' ||
                        typeof status[0].data.userDetails.lastName === 'undefined')) {
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
              if (!WidgetWall.SocialItems.forcedToLogin) {
                  WidgetWall.SocialItems.authenticateUser(user, (err, userData) => {
                      if (err) return console.error("Getting user failed.", err);
                      if (userData) {
                          WidgetWall.checkFollowingStatus();
                      }
                  });
              } else WidgetWall.SocialItems.forcedToLogin = false;
              Location.goToHome();
              if ($scope.$$phase) $scope.$digest();
          });
          // On Logout
          Buildfire.auth.onLogout(function () {
              console.log('User loggedOut from Widget Wall Page');
              buildfire.appearance.titlebar.show();
              WidgetWall.SocialItems.userDetails = {};
              WidgetWall.groupFollowingStatus = false;
              buildfire.notifications.pushNotification.unsubscribe({
                  groupName: WidgetWall.SocialItems.wid === '' ?
                    WidgetWall.SocialItems.context.instanceId : WidgetWall.SocialItems.wid
              }, () => {});
              WidgetWall.privateChatSecurity();
              $scope.$digest();
          });

      }])
})(window.angular);
