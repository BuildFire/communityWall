'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .controller('BlockedUsersCtrl', ['$scope', '$rootScope','$timeout', '$routeParams','SocialDataStore', 'Buildfire','Location', 'EVENTS', 'SubscribedUsersData','SocialUserProfile', 'SocialItems', 'ProfileActivity', function ($scope, $rootScope,$timeout, $routeParams, SocialDataStore, Buildfire, Location, EVENTS, SubscribedUsersData, SocialUserProfile, SocialItems, ProfileActivity) {
            let t = this;
            t.users = [];
            t.loading = true;
            t.SocialItems = SocialItems.getInstance();
            Buildfire.spinner.show();
            t.init = function(){
                t.getBlockedUsersInfo(false, (succ) =>{
                    if(succ){
                        t.loading = false;
                        Buildfire.spinner.hide();
                        $rootScope.showThread = false;
                        $timeout(function(){
                            $scope.$digest();
                        })
                    }
                })
            }
            t.getBlockedUsers = function(callback){
                SocialUserProfile.getBlockedUsers(t.SocialItems.userDetails.userId, (err, data) =>{
                    if(err) return callback(err)
                    else{
                        return callback(null , data)
                    }
                })
            }
            t.getUsersInfo = function(arr, callback){
                SubscribedUsersData.getUsersByIds(arr,(err, data) =>{
                    return callback(err, data)
                })
            }

            t.getBlockedUsersInfo = function(shouldAppend, callback){
                t.getBlockedUsers((err, data) =>{
                    if(err || (data && data.length == 0)){
                        if(shouldAppend){
                            return callback(true);
                        }
                        t.users = [];
                        return callback(true)
                    }
                    else{
                        t.getUsersInfo(data, (err, results) =>{
                            if(shouldAppend){
                                let temp = results.map(a => a.data);
                                t.users.push(...temp);
                                return callback(true);
                            }
                            t.users = results.map(a => a.data);
                            return callback(true)
                        })
                    }
                })
            }

            t.unblockUser = function(userId){
                console.log(t.users);
                console.log(userId);
                let index = t.users.findIndex(e => e.userId == userId)
                t.users.splice(index, 1);
                $timeout(function(){
                    $scope.$digest();
                })
                SocialUserProfile.unblockUser(userId,console.log);
            }

            t.init();
        }]);
})(window.angular);