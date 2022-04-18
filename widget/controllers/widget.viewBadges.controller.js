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
                let inHours = badge.badgeData.expires.number * (badge.badgeData.expires.frame === 'hours'? 1 : badge.badgeData.expires.frame === 'days' ? 24 : badge.badgeData.expires.frame === 'weeks' ? 168 : 720 );
                let expiryDate = moment(badge.receivedOn).add(inHours, "hours");
                let diff = expiryDate.diff(moment(new Date), "hours");
                if (diff < 24) {
                    t.timeUnit = "hours";
                    if (diff < 1) {
                        return 1;
                    }
                    return diff;
                }

                // convert hours to days
                diff = Math.round((diff / 24));
                t.timeUnit = 'days';
                return diff;
                // if(diff < 1 && diff > 0) return 1;
                // else return diff 
            }
            t.init();
        }]);
})(window.angular);