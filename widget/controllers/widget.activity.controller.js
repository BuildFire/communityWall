'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .controller('ActivityCtrl', ['$scope', '$rootScope','$timeout', '$routeParams','SocialDataStore', 'Buildfire','Location', 'EVENTS', 'SubscribedUsersData','SocialUserProfile', 'SocialItems', 'ProfileActivity', function ($scope, $rootScope,$timeout, $routeParams, SocialDataStore, Buildfire, Location, EVENTS, SubscribedUsersData, SocialUserProfile, SocialItems, ProfileActivity) {
            let t = this;
            t.SocialItems = SocialItems.getInstance();
            t.strings = t.SocialItems.languages;
            console.log(t.strings);
            t.count = 0;
            t.todayActivity = [];
            t.yesterdayActivity = [];
            t.lastMonthActivity = [];
            t.olderActivity = [];
            t.show = false;
            t.init = () =>{
                $rootScope.showThread = false;
                Buildfire.spinner.show();
                t.getUserActivity(finished =>{
                    if(finished){
                        t.show = true;   
                        $timeout(function(){
                            $scope.$digest();
                            Buildfire.spinner.hide();                
                        })     
                    }
                });
            }
            
            t.handleActivity = (activity) =>{
                console.log("clicked");
                if(activity.type === "reactedToYourpost" || activity.type === "taggedYouInAPost"){
                    console.log("clicked");
                    // navigate to post
                    t.goToPost(activity.post.id)
                }
                else if(activity.type === "pendingFollow"){
                    return;
                }
                else{
                    // navigate to user profile
                    $scope.navigateToProfile(activity.fromUser.userId);
                }
            }

            

            t.goToPost = (postid) =>{
                console.log(postid);
                Location.go("#/singlePostView/"+postid);
            }


            t.getUserActivity = (callback) =>{
                let options = {
                    filter:{
                        "_buildfire.index.array1.string1":`toUser_${t.SocialItems.userDetails.userId}`
                    },
                    skip: t.count,
                    limit: 50,
                    sort: {createdOn: -1}
                }
                ProfileActivity.search(options, (err, data) =>{
                    console.log(data);
                    t.count += data.length;
                    if(data && data.length){ 
                        console.log(data);
                        t.divideCollection(data, (finished) =>{
                            return callback(true)
                        });

                    }
                    else{
                        return callback(true);                        
                    }
                } )
            }


            t.placeInArray = (item) =>{
                let now = parseInt(new Date().getTime() / 1000);
                let createdOn = parseInt(new Date(item.data.createdOn).getTime() / 1000) ;

                var difference = parseInt(now - createdOn);
                var differenceInDays = parseInt(difference / 86400); 
                console.log(differenceInDays);
                if(differenceInDays < 1){
                    t.todayActivity.push(item.data);
                }
                else if(differenceInDays == 1){
                    t.yesterdayActivity.push(item.data)
                }
                else if(differenceInDays > 1 && differenceInDays < 30){
                    t.lastMonthActivity.push(item.data);
                }
                else{
                    t.olderActivity.push(item.data)
                }
            }

            t.divideCollection = (items, callback) =>{
                for(let i = 0 ; i < items.length ; i++){

                    t.placeInArray(items[i])
                }
                return callback(true)
            }

            t.acceptFollowRequest = (activity, $event) =>{
                let params = {
                    currentUser: activity.toUser,
                    user: activity.fromUser
                }
                SocialUserProfile.acceptFollowRequest(params, (err, res) =>{
                    if(res){
                        let index = res.data.followers.findIndex(e => e === params.user.userId);
                        if(index > -1){
                            let element = $event.target;
                            element.parentElement.style.display = "none"
                            element.parentElement.parentElement.parentElement.children[1].children[1].innerHTML = "Started Following You"
                        }
                        Buildfire.publicData.search({filter:{}})
                    }
                });
                
            }

            t.declineFollowRequest = (activity, $event) =>{
                let params = {
                    currentUserId: t.SocialItems.userDetails.userId,
                    userId: activity.fromUser.userId
                }
                SocialUserProfile.declineFollowRequest(params, (err, res) =>{
                    if(res){
                        let index = res.data.pendingFollowers.findIndex(e => e === params.userId);
                        if(index === -1){
                            let element = $event.target;
                            element.parentElement.parentElement.parentElement.style.display = "none"
                        }
                    }
                });
            }

            t.cropImage = (image, width, height) => {
                return Buildfire.imageLib.cropImage(image, {width: width? width : 50, height: height? height : 50});
            }

            t.respondToFollowRequest = (resp, activity, $event) =>{
                if(resp === 'accept'){
                    t.acceptFollowRequest(activity, $event);
                }
                else{
                    console.log(activity);
                    t.declineFollowRequest(activity, $event);
                }
            }

            $scope.navigateToProfile = (userId) =>{
                Location.go("#/profile/"+userId);
            }
            Buildfire.datastore.onUpdate((event) =>{
                if(event.tag === 'languages'){
                    t.SocialItems.getSettings((err, settings) =>{
                        t.strings = t.SocialItems.languages;
                        $scope.$digest();
                    })
                }
                t.SocialItems.getSettings(console.log);
            });
            t.init();
        }]);
})(window.angular);