'use strict';

(function (angular) {
  angular.module('socialPluginWidget')
      .controller('BlockedUsersCtrl', ['$scope', '$rootScope', 'Buildfire', 'SubscribedUsersData', 'SocialItems', 'Util', 'SkeletonHandler',
        function ($scope, $rootScope, Buildfire, SubscribedUsersData, SocialItems, Util, SkeletonHandler) {
          var Blocked = this;
          Blocked.users = [];
          Blocked.SocialItems = SocialItems.getInstance();
          Blocked.loading = false;
          Blocked.skeleton = null;
          Blocked.setTimeoutSearrch = null;
          Blocked.blockedSkeletonContainer = '.social-plugin'

          const initSkeleton = () => {
            Blocked.skeleton.start();
            Blocked.loading = true;
            document.querySelectorAll('.bf-skeleton-container .skeleton-list-item-avatar').forEach((el)=>{
              el.style.padding = '2rem 1rem';
            });
          }

          Blocked.init = function () {
            $rootScope.showThread = false;
            Blocked.skeleton = SkeletonHandler.start(Blocked.blockedSkeletonContainer);
            SubscribedUsersData.getBlockedUsersList((err, data) => {
              if (err) {
                Blocked.loading = false;
                Blocked.skeleton.stop();
                return console.error('Error fetching blocked users', err);
              }
              console.log(data ,'data got here');
              if (!data) {
                Blocked.loading = false;
                Blocked.skeleton.stop();
                $scope.$digest();
                return;
              }
              console.log(data);
              data.forEach(arr => Blocked.users = Blocked.users.concat({...arr.data.userDetails, userId:arr.data.userId}));
              Blocked.loading = false;
              SkeletonHandler.stop(Blocked.blockedSkeletonContainer, Blocked.skeleton);
              $scope.$digest();


            });
          };

          Blocked.unblockUser = function (userId) {
            buildfire.dialog.confirm({
              message: Blocked.SocialItems.languages.unblockUserBodyConfirmation,
            }, (err, isConfirmed) => {
              if (err) return console.error(err);
              if (!isConfirmed) return;
              SubscribedUsersData.unblockUser(userId, (error, result) => {
                if (error) return console.error('Error unblocking user', error);
                if (result) {
                  Blocked.users = Blocked.users.filter(u => (u._id || u.userId) !== userId);
                  Blocked.SocialItems.blockedUsers = Blocked.SocialItems.blockedUsers.filter(id => id !== userId);
                  Buildfire.dialog.toast({
                    message: Blocked.SocialItems.languages.unblockUserSuccess,
                    type: 'info'
                  });
                  $scope.$digest();
                }
              });
            });
          };

          Blocked.init();
        }]);
})(window.angular);