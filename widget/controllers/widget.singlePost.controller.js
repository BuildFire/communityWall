'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .controller('SinglePostCtrl', ['$scope', '$rootScope', '$sce', '$routeParams','SocialDataStore', 'Buildfire', 'EVENTS', 'SubscribedUsersData', 'SocialItems', function ($scope, $rootScope, $sce, $routeParams, SocialDataStore, Buildfire, EVENTS, SubscribedUsersData, SocialItems) {
            var SinglePost = this;
            var postId = $routeParams.postId;
            SinglePost.SocialItems = SocialItems.getInstance();
            // SinglePost.SocialItems.getPostById(postId, function(error, post){
            

            $scope.trustSrc = function(src) {
                return $sce.trustAsResourceUrl(src);
            };

            SinglePost.init = function () {
                console.log(postId);
                Buildfire.appData.getById(postId, "wall_posts",(err,res) =>{
                    console.log("res data:");
                    console.log(res.data);
                    if(res.data) $scope.post = res.data;
                    if($scope.post.taggedPeople.length > 0){
                        console.log($scope.post.taggedPeople);
                        SubscribedUsersData.getUsersByIds($scope.post.taggedPeople, (err, users) =>{
                            if(err || users.length == 0){
                                $rootScope.showThread = false;
                                $rootScope.$digest();
             
                            }
                            else{
                                console.log("users:");
                                console.log(users);
                                $scope.taggedUsers = "";
                                if(users.length == 1) $scope.taggedUsers = SinglePost.SocialItems.getUserName(users[0].data.userDetails);
                                else{
                                    for (let i = 0; i < users.length; i++) {
                                        if(i == users.length - 1){
                                            $scope.taggedUsers += " and " + SinglePost.SocialItems.getUserName(users[i].data.userDetails) + ".";
                                        }
                                        else{
                                            $scope.taggedUsers += SinglePost.SocialItems.getUserName(users[i].data.userDetails) + ", ";
                                        }
                                    }

                                }
                                $rootScope.showThread = false;
                                $rootScope.$digest();
             
                            }
                        })
                    }
                    else{
                        $rootScope.showThread = false;
                        $rootScope.$digest();     
                    }
                });
            }
            SinglePost.getDuration = function (timestamp) {
                if (timestamp)
                    return moment(timestamp.toString()).fromNow();
            };
            SinglePost.decodeText = function (text) {
                return decodeURIComponent(text);
            };
            SinglePost.sharePost = function(post){
                console.log(post);
                Buildfire.deeplink.generateUrl({
                    data: {postId: post.id}
                }, function (err, result) {
                    if (err) {
                        console.error(err)
                    } else {
                        Buildfire.device.share({
                            text: "Hey Check out this post:",
                            image: post.images.length > 0 ? post.images[0] : null,
                            link: result.url
                        }, function (err, result) { });

                    }
                });
            }


            SinglePost.repostPost = function(postId){
                Buildfire.input.showTextDialog({
                    "placeholder": "Enter a caption to repost",
                    "defaultValue": "",
                    "attachments": {
                        "images": { enable: false },
                        "gifs": { enable: false }
                    }
                }, (err, data) => {
                    if(err || !data || !data.results || !data.results.length > 0) return;
                    let text = data.results[0].textValue;
                    let postData = {
                        text: text ? text.replace(/[#&%+!@^*()-]/g, function (match) {
                            return encodeURIComponent(match)
                        }) : '',
                        images : [],
                        videos : [],
                        location: {},
                        taggedPeople: [],
                        hashtags: [],
                        userDetails: SinglePost.SocialItems.userDetails,
                        wid: SinglePost.SocialItems.wid,
                        originalPostId: postId,
                    }
                    SocialDataStore.createPost(postData).then((response) => {
                        console.log("RESPONSE HERE ####");
                        console.log(response);
                        console.log("RESPONSE HERE ####");
                        SinglePost.SocialItems.items.unshift(postData);
                            Buildfire.messaging.sendMessageToControl({
                                name: EVENTS.POST_CREATED,
                                status: 'Success',
                                post: response.data
                            });
                            postData.id = response.data.id;
                            postData.uniqueLink = response.data.uniqueLink;
                            
    
                        }, (err) => {
                            console.error("Something went wrong.", err)
                            $scope.text = '';
                        })
                });
                
            }

            SinglePost.init();
        }]);
})(window.angular);