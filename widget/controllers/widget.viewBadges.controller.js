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
                    if(t.user.socialProfile.badgesWithData && t.user.socialProfile.badgesWithData.length > 0)
                        t.user.socialProfile.badgesWithData.reverse();
                    else
                        t.user.socialProfile.badgesWithData = [];
                    t.isLoading = false;
                    $rootScope.showThread = false;
                    $timeout(function(){
                        $scope.$digest();
                    })
                })
            }
            t.getExpiryDate = (badge) =>{
                let inDays = badge.badgeData.expires.number * (badge.badgeData.expires.frame === 'days' ? 1 : badge.badgeData.expires.frame === 'weeks' ? 7 : 30 );
                let expiryDate = moment(badge.receivedOn).add(inDays, "days");
                let diff = expiryDate.diff(moment(new Date), "days");
                if(diff < 1 && diff > 0) return 1;
                else return diff
            }
            t.init();
        }]);
})(window.angular);