'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .controller('ViewBadgesCtrl', ['$scope', '$rootScope', '$routeParams','SocialDataStore', 'Buildfire','Location', 'EVENTS', 'SubscribedUsersData','SocialUserProfile', 'SocialItems', 'ProfileActivity', '$timeout', function ($scope, $rootScope, $routeParams, SocialDataStore, Buildfire, Location, EVENTS, SubscribedUsersData, SocialUserProfile, SocialItems , ProfileActivity, $timeout) {
            var t = this;
            t.isLoading = true;
            t.user = {
                socialProfile: null,
            }
            t.SocialItems = SocialItems.getInstance();
            t.init = () =>{
                SocialUserProfile.get(t.SocialItems.userDetails.userId, (err, socialProfile) =>{
                    console.log(socialProfile);
                    t.user.socialProfile = socialProfile.data;
                    t.user.socialProfile.badges.reverse();
                    t.isLoading = false;
                    $rootScope.showThread = false;
                    $timeout(function(){
                        $scope.$digest();
                    })
                })
            }
            t.init();
        }]);
})(window.angular);