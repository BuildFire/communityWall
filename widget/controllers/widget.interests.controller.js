'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .controller('InterestsCtrl', ['$scope', '$rootScope', '$routeParams','SocialDataStore', 'Buildfire', 'EVENTS', 'SubscribedUsersData', 'SocialItems', 'SocialUserProfile','Location', function ($scope, $rootScope, $routeParams, SocialDataStore, Buildfire, EVENTS, SubscribedUsersData, SocialItems, SocialUserProfile, Location) {
            var t = this;
            t.SocialItems = SocialItems.getInstance();
            t.hashtags = [];
            t.userHashtags = [];
            t.interests = [];
            t.init = function(){
                Buildfire.appData.search({}, "$$hashtag$$", function(err, results){
                    if(results && results.length > 0){
                            t.hashtags = results;
                            let options = {
                                filter:{
                                    "_buildfire.index.string1":t.SocialItems.userDetails.userId
                                }
                            }
                    SocialUserProfile.search(options,(err, results) =>{
                        if(results && results.length > 0){ 
                            t.socialProfileId = results[0].id;
                            t.socialProfile = results[0].data;
                            t.userHashtags = [...results[0].data.interests];
                        }
                        for(let i = 0 ; i < t.hashtags.length ; i++){
                            t.interests.push({
                                name: t.hashtags[i].data.name || t.hashtags[i].data.title,
                                isSelected: t.userHashtags.find(e => {
                                    console.log(e === t.hashtags[i].data.name);
                                    return e === t.hashtags[i].data.name;
                                })
                            });
                            if(i === t.hashtags.length - 1){
                                console.log(t.interests);
                                $rootScope.showThread = false;
                                $scope.$digest();
                            }
                        }
                    });
                    }
                })

            }

            t.toggle = function(htag){
                let index = t.interests.findIndex(e => e.name === htag.name);
                if(index < 0) return;
                t.interests[index].isSelected = !t.interests[index].isSelected;
                t.userHashtags = [];
                t.interests.forEach((item, idx) =>{
                    if(item.isSelected) t.userHashtags.push(item.name)
                    if(idx === t.interests.length){
                        console.log(t.userHashtags);
                        $scope.$digest();
                    }
                })

                

            }

            t.save = function(){
                let obj = {...t.socialProfile, interests: t.userHashtags}
                let params = {id : t.socialProfileId, data: obj}
                SocialUserProfile.update(params, console.log);
                Location.go("#/profile/"+ obj.userId);
            }

            t.init();
        }]);
})(window.angular);