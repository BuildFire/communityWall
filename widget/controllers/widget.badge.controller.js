'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .controller('BadgeCtrl', ['$scope', '$rootScope', '$routeParams','SocialDataStore', 'Buildfire','Location', 'EVENTS', 'SubscribedUsersData','SocialUserProfile', 'SocialItems', 'ProfileActivity', '$timeout', function ($scope, $rootScope, $routeParams, SocialDataStore, Buildfire, Location, EVENTS, SubscribedUsersData, SocialUserProfile, SocialItems , ProfileActivity, $timeout) {
            var t = this;
            t.SocialItems = SocialItems.getInstance();
            t.badge = {
                shouldShow: false,
                color: null,
                conditions: null,
                description: null,
                expires: null,
                icon: null,
                title: null,
            }
            $rootScope.$watch("wonBadge",() =>{
                if($rootScope.wonBadge){
                    t.badge = {
                        color: $rootScope.wonBadge.data.color,
                        conditions: $rootScope.wonBadge.data.conditions,
                        description: $rootScope.wonBadge.data.description,
                        expires: $rootScope.wonBadge.data.expires,
                        icon: $rootScope.wonBadge.data.icon,
                        title: $rootScope.wonBadge.data.title,
                        shouldShow: true,
                    }
                    $rootScope.wonBadge.data.createdOn = new Date();
                    $rootScope.wonBadge.data.id = $rootScope.wonBadge.id;
                    t.saveBadgeToDB($rootScope.wonBadge.id)
                    $rootScope.showBadgeModal = true;

                    $timeout(function(){
                        $scope.$digest();
                    })
                }

            });

            t.saveBadgeToDB = (data) =>{
                if(!t.SocialItems.userDetails.userId) return;
                SocialUserProfile.get(t.SocialItems.userDetails.userId,(err, socialProfile) =>{
                    socialProfile.data.badges.push({badgeData: data, receivedOn: new Date()});
                    let params = {id: socialProfile.id, data: socialProfile.data}
                    SocialUserProfile.update(params, (err, updatedProfile) =>{
                        console.log(updatedProfile);
                    })
                })
            }

            t.collectBadge = () =>{
                $timeout(function(){
                    t.shouldShow = false;
                    $rootScope.wonBadge = null;
                    $rootScope.showBadgeModal = false;
                    $rootScope.$digest();
                    Buildfire.history.get({
                        pluginBreadcrumbsOnly: true
                    }, function (err, result) {
                        if(result){
                            result.forEach(e => Buildfire.history.pop());
                        }
                    });
                    if(t.SocialItems.userDetails.userId) Location.go("#/ViewBadges");
                    else{
                        if($rootScope.wonBadge.goToPath) Location.go($rootScope.wonBadge.goToPath);
                        else Location.go("");
                    }
                })
                // Buildfire.publicData.insert()
            }
        }]);
})(window.angular);