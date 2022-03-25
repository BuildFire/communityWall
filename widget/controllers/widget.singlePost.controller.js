'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .controller('SinglePostCtrl', ['$scope', '$rootScope', '$sce','SocialUserProfile','Location', '$routeParams','SocialDataStore', 'Buildfire', 'EVENTS', 'SubscribedUsersData', 'SocialItems', function ($scope, $rootScope, $sce, SocialUserProfile, Location, $routeParams, SocialDataStore, Buildfire, EVENTS, SubscribedUsersData, SocialItems) {
            var SinglePost = this;
            var postId = $routeParams.postId;
            
            SinglePost.SocialItems = SocialItems.getInstance();
            SinglePost.isLoading = true;


            $scope.trustSrc = function(src) {
                return $sce.trustAsResourceUrl(src);
            };
            SinglePost.getGradientValue = (likes, add = 0) =>{
                return parseFloat((parseFloat(likes / SinglePost.reaction.threshold) * 100) + add)
            }
            SinglePost.seeMore = function (post) {
                post.seeMore = true;
                post.limit = 10000000;
                if (!$scope.$$phase) $scope.$digest();
            };
            SinglePost.goToDiscover = function(){
                Location.go("#/discover/");
            }

            SinglePost.init = function () {
                SinglePost.SocialItems.getSettings((err, settings) =>{
                    Buildfire.datastore.get("SocialIcons", (err, res) =>{
                        if(res && res.data && Object.keys(res.data).length > 0){
                            SinglePost.reaction = {
                                icon: SinglePost.SocialItems.SocialIcons.reactions.icon,
                                color: SinglePost.SocialItems.SocialIcons.reactions.color,
                                threshold: SinglePost.SocialItems.SocialIcons.reactions.threshold,
                            }
                            console.log(SinglePost.reaction);
                        }
                    });
                    SinglePost.openPostBottomDrawer = function(post){
                        console.log(post);
                        SocialUserProfile.get(post.userDetails.userId, (err, socialProfile) =>{
                            if(socialProfile){
                                console.log(socialProfile);
                                let listItems = [];
                                if(post.userId !== SinglePost.SocialItems.userDetails.userId){
                                    listItems.push({text:"Report post", index: 0});
                                    if(SinglePost.SocialItems.userDetails.userId){
                                        if(socialProfile.data.followers.findIndex(e => e === SinglePost.SocialItems.userDetails.userId) >= 0){
                                            listItems.push({text:"Unfollow " + SinglePost.SocialItems.getUserName(post.userDetails), index: 1});
                                        }
                                        else{
                                            if(socialProfile.data.pendingFollowers.findIndex(e => e === SinglePost.SocialItems.userDetails.userId) >= 0){
                                                listItems.push({text:"Unfollow " + SinglePost.SocialItems.getUserName(post.userDetails), index: 1});
                                            }
                                            else{

                                            }
                                            listItems.push({text:"Follow " + SinglePost.SocialItems.getUserName(post.userDetails), index: 1});
                                        }
                                        listItems.push({text:"Block " +  SinglePost.SocialItems.getUserName(post.userDetails), index: 2});
                                        if(post.taggedPeople.findIndex(e => e === SinglePost.SocialItems.userDetails.userId) >= 0){
                                            listItems.push({text:"Remove My Tag", index:3});
                        
                                        }
                                    }
                                }
                                else{
                                    if(Object.keys(post.originalPost).length == 0) listItems.push({text:"Edit Post",index:4})
                                    listItems.push({text:"Delete Post",index:5});
                                    
                                }
                                listItems.push({text:"Share Post",index:6});
        
                                Buildfire.components.drawer.open(
                                    {
                                        enableFilter:false,
                                        listItems: listItems
                                    },(err, result) => {
                                        Buildfire.components.drawer.closeDrawer();
                                        if(result && result.index == 0){
                                            let title = SinglePost.SocialItems.socialLanguages.reportPostModal.title.value || SinglePost.SocialItems.socialLanguages.reportPostModal.title.defaultValue;
                                            let body =  SinglePost.SocialItems.socialLanguages.reportPostModal.body.value || SinglePost.SocialItems.socialLanguages.reportPostModal.body.defaultValue;
                                            let confirmButton =  SinglePost.SocialItems.socialLanguages.reportPostModal.confirm.value || SinglePost.SocialItems.socialLanguages.reportPostModal.confirm.defaultValue;
                                            buildfire.dialog.confirm(
                                                {
                                                    title:title,
                                                    message: body,
                                                    confirmButton:{ 
                                                        type: "primary", 
                                                        text: confirmButton
                                                    }
                                                    
                                                },
                                                (err, isConfirmed) => {
                                                  if (err) console.error(err);
                                              
                                                  if (isConfirmed) {
                                                    Buildfire.input.showTextDialog({
                                                        "placeholder": "Reporting Reason*",
                                                        "defaultValue": "",
                                                        "attachments": {
                                                            "images": { enable: false },
                                                            "gifs": { enable: false }
                                                        }
                                                    },(err, data) =>{
                                                        console.log(data);
                                                        if(data && data.results.length){
                                                            SinglePost.reportPost(post, data.results[0].textValue);
                                                        }
                                                    })
                                                  } 
                                                }
                                              );
                                        }
                                        else if(result && result.index == 1){
                                            let params = {userId: post.userDetails.userId, currentUser: SinglePost.SocialItems.userDetails.userId};
                                            SocialUserProfile.followUnfollowUser(params,() => {},(err, data) =>{});
                                        }
                                        else if(result && result.index == 2){
                                            SinglePost.reloadPosts(true);
                                            SocialUserProfile.blockUser(post.userDetails.userId, (err, data) =>{
                                                SinglePost.SocialItems.items = [];
                                                SinglePost.SocialItems.page = 0;
                                                Location.go("");
                                            })
                                        }
                                        else if(result && result.index ==  3){
                                            let taggedPeople = post.taggedPeople;
                                            let index = taggedPeople.findIndex(e => e === SinglePost.SocialItems.userDetails.userId);
                                            taggedPeople.splice(index, 1);
                                            SocialDataStore.updatePost(post).then((updatedpost) =>{
                                                let inArray = SinglePost.SocialItems.items.findIndex(e => e.id === post.id);
                                                SinglePost.SocialItems.items[inArray].taggedPeople = updatedpost.data.taggedPeople;
                                                SinglePost.SocialItems.items[inArray]._buildfire = updatedpost.data._buildfire;
        
                                            });
                                        }
                                        else if(result && result.index == 4){
                                            Location.go("#/post/createPost/"+post.id);
                                        }
                                        else if(result && result.index == 5){
                                            SinglePost.deletePost(post.id);
                                            Location.go("");
                                        }
                                        else if(result && result.index == 6){
                                            SinglePost.sharePost(post);
                                        }
                                    });
                            }
                        })
                    }
                    SinglePost.deletePost = function (postId) {
                        var success = function (response) {
                            if (response) {
                                let postToDelete = SinglePost.SocialItems.items.find(element => element.id === postId)
                                let index = SinglePost.SocialItems.items.indexOf(postToDelete);
                                SinglePost.SocialItems.items.splice(index, 1);
                                if (!$scope.$$phase)
                                    $scope.$digest();
                            }
                        };
                        // Called when getting error from SocialDataStore.deletePost method
                        var error = function (err) {
                            console.log('Error while deleting post ', err);
                        };
                        // Deleting post having id as postId
                        SocialDataStore.deletePost(postId).then(success, error);
                    };

                    SinglePost.SocialItems.getPost(postId, (err,res) =>{
                        console.log(res);
                        if(res) $scope.post = res;
                        if($scope.post.taggedPeople && $scope.post.taggedPeople.length > 0){
                            SubscribedUsersData.getUsersByIds($scope.post.taggedPeople, (err, users) =>{
                                if(err || users.length == 0){
                                    $rootScope.showThread = false;
                                    $rootScope.$digest();
                 
                                }
                                else{
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
                                    SinglePost.isLoading = false;
                                    $rootScope.showThread = false;
                                    $rootScope.$digest();
                 
                                }
                            })
                        }
                        else{
                            SinglePost.isLoading = false;
                            $rootScope.showThread = false;
                            $rootScope.$digest();     
                        }
                    });
                })
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