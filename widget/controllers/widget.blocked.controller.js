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
              if (!data || !data.length) {
                Blocked.hasMoreData = false;
                Blocked.loading = false;
                SkeletonHandler.stop(Blocked.blockedSkeletonContainer, Blocked.skeleton);
                $scope.$digest();
                return;
              }

              data.forEach(arr => Blocked.users.push({...arr.data.userDetails, userId: arr.data.userId}));
              if (data.length === Blocked.searchOptions.pageSize) {
                Blocked.searchOptions.page++;
                Blocked.hasMoreData = true;
              } else {
                Blocked.hasMoreData = false;
              }
              Blocked.loading = false;
              SkeletonHandler.stop(Blocked.blockedSkeletonContainer, Blocked.skeleton);
              $scope.$digest();
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
                  Blocked.SocialItems.items = [];
                  Blocked.SocialItems.page = 0;
                  Blocked.SocialItems.showMorePosts = false;
                  Blocked.SocialItems.getPosts();
                  $scope.$digest();
                  if (!Blocked.users.length) {
                    Blocked.goHomeTimeout = setTimeout(() => {
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