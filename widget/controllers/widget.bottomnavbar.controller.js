'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .controller('BottomNavBarCtrl', ['$scope', '$rootScope', '$routeParams','$location','SocialDataStore', 'Buildfire', 'EVENTS', 'SubscribedUsersData', 'SocialItems', 'Location','$timeout', function ($scope, $rootScope, $routeParams,$location, SocialDataStore, Buildfire, EVENTS, SubscribedUsersData, SocialItems, Location, $timeout) {
            let t = this;
            t.SocialItems = SocialItems.getInstance();


            t.init = function() {
                Buildfire.datastore.get("SocialIcons", (err, res) =>{
                    if(res && res.data && Object.keys(res.data).length > 0){
                        t.home = res.data.bottomNavBar.home;
                        t.discover = res.data.bottomNavBar.discover;
                        t.addContent = res.data.bottomNavBar.addContent;
                        t.myProfile = res.data.bottomNavBar.myProfile;
                        t.notifications = res.data.bottomNavBar.notifications;
                    }
                })
    
                t.isLoggedIn = t.SocialItems.userDetails.userId ? true : false;
                t.setAppTheme()
            }
            

            t.setAppTheme = function () {
                buildfire.appearance.getAppTheme((err, obj) => {
            
                    t.appTheme = obj.colors;
                    // debugger
                });
            }


            t.navigateToProfile = function(userId){
                t.SocialItems = SocialItems.getInstance();
                let shouldNavigate = $location.absUrl().split('#')[1].includes('profile/'+userId) ? false : true;  
                if(shouldNavigate) Location.go("#/profile/"+userId);
            }
            t.showMainWall = function(){
                t.SocialItems = SocialItems.getInstance();
                let shouldNavigate = $location.absUrl().split('#')[1] == "/" ? false : true;  
                if(shouldNavigate) Location.go("");
                Buildfire.history.get({
                    pluginBreadcrumbsOnly: true
                }, function (err, result) {
                    if(result){
                        result.forEach(e => Buildfire.history.pop());
                    }
                });
            }
            t.goToMyProfile = function(){
                t.SocialItems = SocialItems.getInstance();
                var userId = t.SocialItems.userDetails.userId;
                if(!userId){
                    Buildfire.auth.login({},(err, user) =>{
                        if(user){
                            t.SocialItems.authenticateUser(user, (err, userData) => {
                                if (err) return console.error("Getting user failed.", err);
                                if (userData) {
                                    t.goToMyProfile();
                                }
                            })
                        }
                        else{
                            return;
                        }
                    })
                    return;
                };
                let shouldNavigate = $location.absUrl().split('#')[1].includes('profile/'+userId) ? false : true;  
                if(shouldNavigate) Location.go("#/profile/"+userId);
            }
            t.goToDiscover = function(){
                let shouldNavigate = $location.absUrl().split('#')[1].includes('discover') ? false : true;  
                if(shouldNavigate) Location.go("#/discover/");
            }
            t.goToActivity = function(){
                t.SocialItems = SocialItems.getInstance();
                var userId = t.SocialItems.userDetails.userId;
                if(userId){
                    let shouldNavigate = $location.absUrl().split('#')[1].includes('activity') ? false : true;  
                    if(shouldNavigate) Location.go("#/activity")
                }
                else{
                    
                    Buildfire.auth.login({},(err, user) =>{
                        if(user){
                            t.SocialItems.authenticateUser(user, (err, userData) => {
                                if (err) return console.error("Getting user failed.", err);
                                if (userData) {
                                    t.goToActivity();
                                }
                            })
                        }
                        else{
                            return;
                        }
                    })
                    return;
                }
            }
            t.openPostSection = function(){
                t.SocialItems = SocialItems.getInstance();
                var userId = t.SocialItems.userDetails.userId;
                if(userId){
                    let shouldNavigate = $location.absUrl().split('#')[1].includes('createPost') ? false : true;  
                    if(shouldNavigate) {
                        Location.go('#/post/createPost/0');
                    };

                }
                else{
                    Buildfire.auth.login({},(err, user) =>{
                        if(user){
                            t.SocialItems.authenticateUser(user, (err, userData) => {
                                if (err) return console.error("Getting user failed.", err);
                                if (userData) {
                                    t.goToActivity();
                                }
                            })
                        }
                        else{
                            return;
                        }
                    })
                    return;
                }
            }

            t.init();

        }]);
})(window.angular);