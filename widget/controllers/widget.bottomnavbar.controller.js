'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .controller('BottomNavBarCtrl', ['$scope', '$rootScope', '$routeParams','$location','SocialDataStore', 'Buildfire', 'EVENTS', 'SubscribedUsersData', 'SocialItems', 'Location','$timeout', function ($scope, $rootScope, $routeParams,$location, SocialDataStore, Buildfire, EVENTS, SubscribedUsersData, SocialItems, Location, $timeout) {
            let t = this;
            t.SocialItems = SocialItems.getInstance();
            t.isLoggedIn = t.SocialItems.userDetails.userId ? true : false;
            t.navigateToProfile = function(userId){
                let shouldNavigate = $location.absUrl().split('#')[1].includes('profile') ? false : true;  
                if(shouldNavigate) Location.go("#/profile/"+userId);
            }
            t.showMainWall = function(){
                let shouldNavigate = $location.absUrl().split('#')[1] == "/" ? false : true;  
                if(shouldNavigate) Location.go("");
            }
            t.goToMyProfile = function(){
                var userId = t.SocialItems.userDetails.userId;
                if(!userId) return;
                let shouldNavigate = $location.absUrl().split('#')[1].includes('profile') ? false : true;  
                if(shouldNavigate) Location.go("#/profile/"+userId);
            }
            t.goToDiscover = function(){
                let shouldNavigate = $location.absUrl().split('#')[1].includes('discover') ? false : true;  
                if(shouldNavigate) Location.go("#/discover/");
                
            }
            t.goToActivity = function(){
                t.SocialItems = SocialItems.getInstance();
                t.isLoggedIn = t.SocialItems.userDetails.userId ? true : false;
                if(t.isLoggedIn){
                    console.log(t.isLoggedIn);
                    let shouldNavigate = $location.absUrl().split('#')[1].includes('activity') ? false : true;  
                    console.log(shouldNavigate);
                    if(shouldNavigate) Location.go("#/activity")
                }
                else{
                    
                    Buildfire.auth.login(null,(err, user) =>{
                        if(err || !user){
                            return;
                        }
                        t.SocialItems.authenticateUser(user, (err, succ) =>{
                            if(err) return;
                            else if(!succ) return;
                            else{
                                t.isLoggedIn = true;
                            }
                        })
                    })
                }
            }
            t.openPostSection = function(){
                Location.go('#/post/createPost');
            }
        }]);
})(window.angular);