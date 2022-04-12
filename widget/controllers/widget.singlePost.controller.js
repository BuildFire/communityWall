'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .controller('SinglePostCtrl', ['$scope', '$rootScope', '$timeout','ProfileActivity','SocialBuddies', '$sce','SocialUserProfile','Location', '$routeParams','SocialDataStore', 'Buildfire', 'EVENTS', 'SubscribedUsersData', 'SocialItems', function ($scope, $rootScope, $timeout, ProfileActivity, SocialBuddies, $sce, SocialUserProfile, Location, $routeParams, SocialDataStore, Buildfire, EVENTS, SubscribedUsersData, SocialItems) {
            var SinglePost = this;
            var postId = $routeParams.postId;
            
            SinglePost.SocialItems = SocialItems.getInstance();
            SinglePost.isLoading = true;


            $scope.trustSrc = function(src) {
                return $sce.trustAsResourceUrl(src);
            };




            SinglePost.openChat = function (post) {
                let userId = post.userId;
                let newData = {...post};
                newData.repliesCount++;
                SocialDataStore.updatePost(newData).then((response) =>{

                },(err) => {})

                if (true || SinglePost.allowPrivateChat) {
                    SinglePost.SocialItems.authenticateUser(null, (err, user) => {
                        if (err) return console.error("Getting user failed.", err);
                        if (user) {
                            buildfire.auth.getUserProfile({ userId: userId }, function (err, user) {
                                if (err) return console.error("Getting user profile failed.", err);
                                if (userId === SinglePost.SocialItems.userDetails.userId) return;
                                SinglePost.openPrivateChat(userId, SinglePost.SocialItems.getUserName(user));
                            });
                        }
                    });
                }
            };
            SinglePost.openPrivateChat = function (userId, userName) {
                let wid = null;
                if (SinglePost.SocialItems.userDetails.userId && SinglePost.SocialItems.userDetails.userId != userId) {
                    if (SinglePost.SocialItems.userDetails.userId > userId) {
                        wid = SinglePost.SocialItems.userDetails.userId + userId;
                    } else {
                        wid = userId + SinglePost.SocialItems.userDetails.userId;
                    }
                }
                SubscribedUsersData.getGroupFollowingStatus(userId, wid, SinglePost.SocialItems.context.instanceId, function (err, status) {
                    if (err) console.error('Error while getting initial group following status.', err);
                    if (!status.length) {
                        SinglePost.followPrivateWall(userId, wid, userName);
                    } else {
                        SinglePost.navigateToPrivateChat({ id: userId, name: userName, wid: wid });
                    }
                });
            }

            SinglePost.followPrivateWall = function (userId, wid, userName = null) {
                Buildfire.auth.getUserProfile({ userId: userId }, (err, user) => {
                    if (err) console.log('Error while saving subscribed user data.');
                    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                    if (re.test(String(user.firstName).toLowerCase()))
                        user.firstName = 'Someone';
                    if (re.test(String(user.displayName).toLowerCase()))
                        user.displayName = 'Someone';

                    var params = {
                        userId: userId,
                        userDetails: {
                            displayName: user.displayName,
                            firstName: user.firstName,
                            lastName: user.lastName,
                            imageUrl: user.imageUrl,
                            email: user.email,
                            lastUpdated: new Date().getTime(),
                            location:{
                                address: user?.userProfile?.address?.fullAddress || null,
                                lat: user?.userProfile?.address?.geoLocation?.lat || null,
                                lng: user?.userProfile?.address?.geoLocation?.lng || null,

                            }
                        },
                        wallId: wid,
                        posts: [],
                        _buildfire: {
                            index: { text: userId + '-' + wid, string1: wid,
                            array1:[
                                {string1: "userId_"+userId}
                            ]}
                        }

                    };

                    userName = SinglePost.SocialItems.getUserName(params.userDetails)
                    SubscribedUsersData.save(params, function (err) {
                        if (err) console.log('Error while saving subscribed user data.');
                        if (userName)
                            SinglePost.navigateToPrivateChat({ id: userId, name: userName, wid: wid });
                    });
                })
            }

            SinglePost.navigateToPrivateChat = function (user) {
                buildfire.history.get({
                    pluginBreadcrumbsOnly: true
                }, function (err, result) {
                    result.forEach(e=> buildfire.history.pop());
                });
                
                SinglePost.SocialItems.isPrivateChat = true;
                SinglePost.SocialItems.wid = user.wid;
                SinglePost.SocialItems.showMorePosts = true;
                SinglePost.SocialItems.pageSize = 20;
                SinglePost.SocialItems.page = 0;
                SinglePost.SocialItems.pluginTitle = SinglePost.SocialItems.getUserName(SinglePost.SocialItems.userDetails) + ' | ' + user.name;

                $timeout(function(){
                    $rootScope.isPrivateChat = true;
                    Location.go("#/PrivateChat",{isPrivateChat: true});
                })
            }




















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
                                                Buildfire.dialog.toast({
                                                    message: "Tag removed successfully",
                                                });
                                                let inArray = SinglePost.SocialItems.items.findIndex(e => e.id === post.id);
                                                SinglePost.SocialItems.items[inArray].taggedPeople = updatedpost.data.taggedPeople;
                                                SinglePost.SocialItems.items[inArray]._buildfire = updatedpost.data._buildfire;
        
                                            });
                                        }
                                        else if(result && result.index == 4){
                                            Location.go("#/post/createPost/"+post.id);
                                        }
                                        else if(result && result.index == 5){
                                            buildfire.dialog.confirm(
                                                {
                                                    title: 'Delete Post?',
                                                    message: 'Are you sure you want to delete this post?',
                                                    confirmButton:{ 
                                                        type: "primary", 
                                                        text: 'DELETE'
                                                    }
                                                    
                                                },
                                                (err, isConfirmed) => {
                                                  if (err) console.error(err);
                                              
                                                  if (isConfirmed) {
                                                    SinglePost.deletePost(post.id);
                                                     Location.go("");
                                                  } 
                                                }
                                              );
                                            
                                        }
                                        else if(result && result.index == 6){
                                            SinglePost.sharePost(post);
                                        }
                                    });
                            }
                        })
                    }
                    SinglePost.goToUserProfile = function(userId){
                        Location.go("#/profile/"+userId);
                    }
                    SinglePost.deletePost = function (postId) {
                        var success = function (response) {
                            if (response) {
                                Buildfire.dialog.toast({
                                    message: "Post deleted successfully",
                                });
        
                                let postToDelete = SinglePost.SocialItems.items.find(element => element.id === postId)
                                let index = SinglePost.SocialItems.items.indexOf(postToDelete);
                                SinglePost.SocialItems.items.splice(index, 1);
                                Location.go("");
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

                    SinglePost.navigateToProfile = function(userId){
                        Location.go("#/profile/"+userId);
                    }

                    SinglePost.SocialItems.getPost(postId, (err,res) =>{
                        if(Object.keys(res).length === 2){
                            Location.go("");
                        }
                        if(res) $scope.post = res;
                        if($scope.post.taggedPeople && $scope.post.taggedPeople.length > 0){
                            console.log($scope.post);
                            SubscribedUsersData.getUsersByIds($scope.post.taggedPeople, (err, users) =>{
                                if(err || users.length == 0){
                                    $timeout(function(){
                                        $rootScope.showThread = false;
                                        SinglePost.isLoading = false;

                                        $rootScope.$digest();
                                        $rootScope.$digest();
                                    })
                 
                                }
                                else{
                                    $scope.taggedUsers = [];
                                    for (let i = 0; i < users.length; i++) {
                                        let temp = {
                                            displayName: SinglePost.SocialItems.getUserName(users[i].data.userDetails),
                                            userId: users[i].data.userId
                                        }

                                        $scope.taggedUsers.push(temp)

                                    }

                                    SinglePost.isLoading = false;
                                    $rootScope.showThread = false;
                                    $timeout(function(){
                                        $scope.$digest();
                                        $rootScope.$digest();
                                    })
                 
                                }
                            })
                        }
                        else{
                            SinglePost.isLoading = false;
                            $rootScope.showThread = false;
                            $timeout(function(){
                                $scope.$digest();
                                $rootScope.$digest();
                            })

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
            $scope.getCroppedImage = (url) =>{
                return Buildfire.imageLib.cropImage(url, { size: "half_width", aspect: "9:16" });
            }


            SinglePost.createReactionActivity = (post) =>{
                let type = "reactedToYourpost";
                let fromUser = {
                    displayName: SinglePost.SocialItems.userDetails.displayName,
                    imageUrl: SinglePost.SocialItems.userDetails.imageUrl,
                    userId: SinglePost.SocialItems.userDetails.userId
                }
                let toUser = {
                    displayName: post.userDetails.displayName,
                    userId: post.userId
                }
                SinglePost.saveActivity(type, {fromUser, toUser, post: {image: post.images[0],id: post.id}})
            }
            

            SinglePost.saveActivity = function(type, data){
                let activity = {
                    type: type,
                    fromUser: data.fromUser,
                    toUser: data.toUser,
                    post: data.post,
                    createdOn: new Date(),
                    createdBy: data.fromUser.userId,
                }
                ProfileActivity.add(activity, (err, res) =>{
                    if(err) console.error(err);
                    else console.log(res);
                })
            }


            SinglePost.toggleReaction = (post) =>{
                if(!SinglePost.SocialItems.userDetails.userId){
                    Buildfire.auth.login({},() => {});
                }
                if(!post.liked){
                    let ids = {
                        uniqueID: post.id,
                        currentUserId: SinglePost.SocialItems.userDetails.userId
                    }
                    SocialBuddies.interact(SinglePost.SocialItems.userDetails.userId, post.userDetails.userId, (err, resp) =>{
                    });
                    ReactionsUI.toggle(ids, SinglePost.SocialItems.getUserName(post.userDetails) , false);
                }
                else{
                    ReactionsUI.delete(`${post.id}-${SinglePost.SocialItems.userDetails.userId}`, console.log)
                }
                post.liked = !post.liked;
                post.liked = post.liked;
                if(post.liked){
                    post.likesCount++;
                    SinglePost.createReactionActivity(post);
                    SocialDataStore.checkForBadges(SinglePost.SocialItems.userDetails.userId, () => {
                        console.log("checked");
                    })
                } 
                else post.likesCount--;
            }




            
            SinglePost.repostPost = function(post){
                Buildfire.input.showTextDialog({
                    "placeholder": "Enter a caption to repost",
                    "defaultValue": "",
                    "attachments": {
                        "images": { enable: true },
                        "gifs": { enable: false }
                    },
                    defaultAttachments: {
                        images: post.images
                    }
                }, (err, data) => {
                    if(err || !data || !data.results || !data.results.length > 0) return;
                    let text = data.results[0].textValue;
                    let postData = {
                        text: text ? text.replace(/[#&%+!@^*()-]/g, function (match) {
                            return encodeURIComponent(match)
                        }) : '',
                        images : post.images,
                        videos : post.videos,
                        location: post.location,
                        taggedPeople: [],
                        hashtags: [],
                        userDetails: SinglePost.SocialItems.userDetails,
                        wid: SinglePost.SocialItems.wid,
                        originalPost:{
                            displayName: SinglePost.SocialItems.getUserName(post.userDetails),
                            userId: post.userDetails.userId,
                            postId: post.id, 
                        } ,
                    }
                    SocialDataStore.createPost(postData).then((response) => {
                        postData.likesCount = 0;
                        postData.sharesCount = 0;
                        postData.repliesCount = 0;
                        postData.repostsCount = 0;
                        SocialBuddies.interact(SinglePost.SocialItems.userDetails.userId, post.userDetails.userId, (err, resp) =>{
                        });
                        SinglePost.SocialItems.items.unshift(postData);
                            Buildfire.messaging.sendMessageToControl({
                                name: EVENTS.POST_CREATED,
                                status: 'Success',
                                post: response.data
                            });
                            postData.id = response.data.id;
                            postData.uniqueLink = response.data.uniqueLink;
                            let newData = {...post.data}
                            newData.repostsCount++;
                            SocialDataStore.updatePost(newData).then((response) =>{
                            },(err) => {})
    
                        }, (err) => {
                            console.error("Something went wrong.", err)
                            $scope.text = '';
                        })
                });
                
                
            }

            SinglePost.init();
        }]);
})(window.angular);