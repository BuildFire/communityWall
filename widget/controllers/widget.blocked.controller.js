'use strict';

(function (angular) {
  angular.module('socialPluginWidget')
      .controller('BlockedUsersCtrl', ['$scope', '$rootScope', 'Buildfire', 'SubscribedUsersData', 'SocialItems', 'Util', 'SkeletonHandler', 'Location',
        function ($scope, $rootScope, Buildfire, SubscribedUsersData, SocialItems, Util, SkeletonHandler, Location) {
          var Blocked = this;
          Blocked.users = [];
          Blocked.SocialItems = SocialItems.getInstance();
          Blocked.loading = false;
          Blocked.skeleton = null;
          Blocked.blockedSkeletonContainer = '.blocked-users';
          Blocked.searchOptions = { pageSize: 50, page: 0 };
          Blocked.hasMoreData = false;
          Blocked.goHomeTimeout = null

          Blocked.fetchBlockedUsers = function () {
            if (Blocked.loading) return;
            Blocked.loading = true;
            SubscribedUsersData.getBlockedUsersList(Blocked.searchOptions, (err, data) => {
              if (err) {
                Blocked.loading = false;
                SkeletonHandler.stop(Blocked.blockedSkeletonContainer, Blocked.skeleton);
                return console.error('Error fetching blocked users', err);
              }

              const subscribedUsers = Array.isArray(data) ? data : [];
              const returnedUserIds = [];

              subscribedUsers.forEach(item => {
                const userId = item.data.userId;
                if (!userId) return;
                returnedUserIds.push(userId);
                const userDetails = item.data.userDetails || {};
                Blocked.users.push({ ...userDetails, userId });
              });

              if (subscribedUsers.length === Blocked.searchOptions.pageSize) {
                Blocked.searchOptions.page++;
                Blocked.hasMoreData = true;
              } else {
                Blocked.hasMoreData = false;
              }

              const blockedIds = Array.isArray(Blocked.SocialItems.blockedUsers) ? Blocked.SocialItems.blockedUsers : [];
              const missingUserIds = blockedIds
                  .filter(id => !returnedUserIds.includes(id))
                  .filter(id => !Blocked.users.some(user => (user._id || user.userId) === id));

              const finalize = () => {
                Blocked.loading = false;
                SkeletonHandler.stop(Blocked.blockedSkeletonContainer, Blocked.skeleton);
                $scope.$digest();
              };

              if (!subscribedUsers.length && !missingUserIds.length) {
                Blocked.hasMoreData = false;
                return finalize();
              }

              if (missingUserIds.length) {
                buildfire.auth.getUserProfiles({ userIds: missingUserIds }, (profilesErr, users) => {
                  if (profilesErr) {
                    console.error('Error fetching blocked user profiles', profilesErr);
                  } else if (Array.isArray(users) && users.length) {
                    users.forEach(profile => {
                      Blocked.users.push(profile);
                    });
                  }
                  finalize();
                });
              } else {
                finalize();
              }
            });
          };

          var scrollContainer = null;
          Blocked.onScroll = function () {
            if (Blocked.loading || !Blocked.hasMoreData) return;
            if (scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 50) {
              Blocked.fetchBlockedUsers();
            }
          };

          Blocked.init = function () {
            $rootScope.showThread = false;
            Blocked.skeleton = SkeletonHandler.start(Blocked.blockedSkeletonContainer);
            scrollContainer = document.querySelector('.blocked-users');
            if (scrollContainer) {
              scrollContainer.addEventListener('scroll', Blocked.onScroll);
            }
            Blocked.fetchBlockedUsers();
          };

          $scope.$on('$destroy', function () {
            if (scrollContainer) {
              scrollContainer.removeEventListener('scroll', Blocked.onScroll);
            }
            if (Blocked.goHomeTimeout) {
              clearTimeout(Blocked.goHomeTimeout);
            }
          });

          Blocked.unblockUser = function (userId) {
            const user = Blocked.users.find(u => (u._id || u.userId) === userId);
            const userName = Blocked.SocialItems.getUserName(user);
            buildfire.dialog.confirm({
              title: `${Blocked.SocialItems.languages.unblockUserTitleConfirmation} ${userName}`,
              message: Blocked.SocialItems.languages.unblockUserBodyConfirmation,
              cancelButton: { text: Blocked.SocialItems.languages.unblockUserCancelBtn },
              confirmButton: { text: Blocked.SocialItems.languages.unblockUserConfirmBtn }
            }, (err, isConfirmed) => {
              if (err) return console.error(err);
              if (!isConfirmed) return;
              SubscribedUsersData.unblockUser(userId, (error, result) => {
                if (error) return console.error('Error unblocking user', error);
                if (result) {
                  Blocked.users = Blocked.users.filter(u => (u._id || u.userId) !== userId);
                  Blocked.SocialItems.blockedUsers = Blocked.SocialItems.blockedUsers.filter(id => id !== userId);
                  Buildfire.dialog.toast({
                    message: `${userName} ${Blocked.SocialItems.languages.unblockUserSuccess}`,
                    type: 'info'
                  });
                  Blocked.SocialItems.resetState();
                  Blocked.SocialItems.getPosts();
                  $scope.$digest();
                  if (!Blocked.users.length) {
                    Blocked.goHomeTimeout = setTimeout(() => {
                      buildfire.components.toast.closeToastMessage(
                          {
                            force: true,
                          },
                          (err) => {
                            if (err) console.error(err);
                          }
                      );
                      Location.goToHome();
                    }, 3000);
                  }
                }
              });
            });
          };

          Blocked.init();
        }]);
})(window.angular);