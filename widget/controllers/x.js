'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .controller('ProfileCtrl', ['$scope', '$rootScope', '$routeParams','SocialDataStore', 'Buildfire','Location', 'EVENTS', 'SubscribedUsersData','SocialUserProfile', 'SocialItems', 'ProfileActivity', '$timeout', function ($scope, $rootScope, $routeParams, SocialDataStore, Buildfire, Location, EVENTS, SubscribedUsersData, SocialUserProfile, SocialItems , ProfileActivity, $timeout) {
            var t = this;
            t.SocialItems = SocialItems.getInstance();
            t.strings = t.SocialItems.socialLanguages;
            t.userId = $routeParams.userId;
            t.userProfile = {};
            $scope.currentPage = 'posts';
            $scope.loadingPhase = 0;
            $scope.posts = [];
            $scope.taggedPosts = [];
            $scope.shouldFetchMorePosts = true;
            $scope.shouldFetchMoreTaggedPosts = true;
            $scope.isBusy = true;
            t.isUpdating = false;

            t.clearEverything = function(callback){
                $scope.currentPage = 'posts';
                $scope.loadingPhase = 0;
                $scope.posts = [];
                $scope.taggedPosts = [];
                $scope.shouldFetchMorePosts = true;
                $scope.shouldFetchMoreTaggedPosts = true;
                $scope.isBusy = true;
                return callback(true)
            }


            t.init = function(){
                SubscribedUsersData.searchForUsers({filter:{"$json.userId":t.userId}}, function(err, data){
                    if(err || !data || (data && data.length == 0)) console.error("error");
                    t.userProfile = data[0];
                    if(t.userProfile.userId === t.SocialItems.userDetails.userId) t.userProfile.isCurrentUser = true;
                    else t.userProfile.isCurrentUser = false;
                    t.isUpdating = false;
                    SocialUserProfile.search({filter:{
                        "_buildfire.index.string1":t.SocialItems.userDetails.userId
                    }},(err, data) =>{
                        let currentUserProfile = data[0].data;
                        t.isBlocked = currentUserProfile.blockedUsers.findIndex(e => e === t.userId) >= 0 ? true : false;
                        if(t.isBlocked){
                            $scope.loadingPhase = 2;
                            $rootScope.showThread = false;
                            $scope.isBusy = false;
                            $rootScope.$digest();
                            $scope.$digest();
                            return;
                        }
                        t.getUserSocialProfile((finished) =>{
                            if(finished){
                                $rootScope.showThread = false;
                                $scope.isBusy = false;
                                $rootScope.$digest();
                                $scope.$digest();
                            }
                            else{
                                $scope.loadingPhase = 2;
                                $rootScope.showThread = false;
                                $scope.isBusy = false;
                                $rootScope.$digest();
                                $scope.$digest();
                            }
                        })
                    })
                })
            }


            t.getUserSocialProfile = (callback) =>{
                let options = {filter:{
                    "_buildfire.index.string1":t.userId
                }};
                SocialUserProfile.search(options, (err, data) =>{
                    if(err || !data || (data && data.length == 0)){

                    }
                    else{
                        t.userProfile.socialProfile = data[0];
                        t.isFollowing = data[0].data.followers.findIndex(e => e === t.SocialItems.userDetails.userId) > -1 ? true : false;
                        t.isPending = data[0].data.pendingFollowers.findIndex(e => e === t.SocialItems.userDetails.userId) > -1 ? true : false;
                        if(t.shouldShowProfilePosts()){
                            t.getPosts(t.userProfile, (err, data) =>{
                                if(data){
                                    let container = document.getElementById("profile-posts-container");
                                    t.InjectAndCheckIfFetchMore(data, container, "posts");
                                    $scope.loadingPhase++;
                                    if(container){
                                        container.addEventListener('scroll',() =>{
                                            if( $scope.shouldFetchMorePosts && ( container.scrollTop - (container.scrollHeight - container.offsetHeight) > - 30) && !$scope.isBusy ){
                                                Buildfire.spinner.show();
                                                $scope.isBusy = true;
                                                t.getPosts(t.userProfile, function(err, result){
                                                    if(result){
                                                        t.InjectAndCheckIfFetchMore(result, container, "posts");
                                                    }
                                                })
                                            }
                                        });
                                    }
                                }
                                else{
                                    $scope.loadingPhase++;
                                }
                                t.initTaggedPosts();
                            })
                            t.isUpdating = false;
                            return callback(true)
                        }
                        else{
                            t.isUpdating = false;
                            return callback(false)
                        }

                    }
                })
            }


            t.initTaggedPosts = function(){
                Buildfire.spinner.show();
                t.getTaggedPosts(t.userProfile, (err, data) =>{
                    if(data && data.length > 0){
                        let container = document.getElementById("profile-tagged-posts-container");
                        t.InjectAndCheckIfFetchMore(data, container, "tagged");
                        $scope.loadingPhase++;
                        $scope.$digest();
                        if(container){
                            console.log("tagged posts container exist");
                            container.addEventListener('scroll',() =>{
                                if( $scope.shouldFetchMoreTaggedPosts && ( container.scrollTop - (container.scrollHeight - container.offsetHeight) > - 30) && !$scope.isBusy ){
                                    console.log("$scope.shouldFetchMoreTaggedPosts");
                                    Buildfire.spinner.show();
                                    $scope.isBusy = true;
                                    t.getTaggedPosts(t.userProfile, function(err, result){
                                        if(result){
                                            t.InjectAndCheckIfFetchMore(result, container, "tagged");
                                        }
                                    })
                                }
                            });
                        }
                    }
                    else{
                        $scope.loadingPhase++;
                        $scope.$digest();
                        Buildfire.spinner.hide();
                    }
                })
            }

            t.hasUserBlocked = () =>{
                if(t.isBlocked) return true;
                else return false
            }

            t.shouldShowProfilePosts = () =>{
                if(!t.userProfile) return false;
                if(t.userProfile.isCurrentUser) return true;
                else{
                    if(t.isFollowing) return true;
                    else if(t.userProfile.socialProfile.data.isPublicProfile) return true;
                    else return false; 
                }
            }

            t.getPosts = (profile, callback) =>{
                Buildfire.appData.search({filter:{"_buildfire.index.array1.string1":`userId_${profile.userId}`}, skip:$scope.posts.length, limit: 8, sort:{createdOn: -1}},"wall_posts",(err, data) =>{
                    if(err) return callback(err);
                    else return callback(null, data)
                })
            }
            t.getTaggedPosts = (profile, callback) =>{
                Buildfire.appData.search({filter:{"_buildfire.index.array1.string1":`tagged_${profile.userId}`}, skip:$scope.taggedPosts.length, limit: 8, sort:{createdOn: -1}},"wall_posts",(err, data) =>{
                    if(err) return callback(err);
                    else return callback(null, data)
                })
            }

            t.InjectAndCheckIfFetchMore = (data, container, injectLocation) =>{
                if(data.length == 0){ 
                    if(injectLocation === 'posts') $scope.shouldFetchMorePosts = false;
                    else if(injectLocation === 'tagged') $scope.shouldFetchMoreTaggedPosts = false;
                    console.log($scope.posts.length + $scope.taggedPosts.length);
                    $scope.isBusy = false;
                    Buildfire.spinner.hide();
                    return
                }
                if(injectLocation === 'posts') $scope.posts.push(...data);
                else if(injectLocation === 'tagged') $scope.taggedPosts.push(...data);
                t.sendToCp(data);
                $scope.injectElements(data, container);
            }

            t.sendToCp = function(items){
                let posts = [];
                items.map(item => posts.push(item.data))
                window.buildfire.messaging.sendMessageToControl({
                    name: 'SEND_POSTS_TO_CP',
                    posts: posts,
                });
            }

            t.loadPage = function(title){
                if(title === $scope.currentPage) return;
                else{
                    console.log($scope.taggedPosts);
                    var oldPage = $scope.currentPage + "";
                    $scope.currentPage = title;
                    document.getElementById("profile-"+oldPage).classList.add("no-bottom-border");
                    document.getElementById("profile-"+oldPage).classList.remove("has-bottom-border");
                    document.getElementById("profile-"+title).classList.add('has-bottom-border');
                    document.getElementById("profile-"+title).classList.remove('no-bottom-border');
                    $timeout(function(){
                        $scope.$digest();
                    })

                }
            }


            t.createActivity = function(type, data){
                let activity = {
                    type: type,
                    fromUser: data.fromUser,
                    toUser: data.toUser,
                    createdOn: new Date(),
                    createdBy: data.fromUser.userId,
                }
                ProfileActivity.add(activity, (err, res) =>{
                    if(err) console.error(err);
                    else console.log(res);
                })
            }

            t.followUnfollowUser = function(){
                let params = {userId: t.userId, currentUser: t.SocialItems.userDetails.userId};
                SocialUserProfile.followUnfollowUser(params, (err, data) =>{
                    if(data){
                        t.userProfile.socialProfile = data;
                        t.isFollowing = data.data.followers.findIndex(e => e === t.SocialItems.userDetails.userId) > -1 ? true : false;
                        t.isPending = data.data.pendingFollowers.findIndex(e => e === t.SocialItems.userDetails.userId) > -1 ? true : false;
                        console.log(data);
                        console.log(t.isFollowing);
                        console.log(t.isPending);
                        $scope.$digest();
                        if(t.isFollowing){
                            let type = "follow"
                            let fromUser = {
                                displayName: t.SocialItems.userDetails.displayName,
                                imageUrl: t.SocialItems.userDetails.imageUrl,
                                userId: t.SocialItems.userDetails.userId
                            }
                            let toUser = {
                                displayName: t.userProfile.userDetails.displayName,
                                userId: t.userProfile.userId
                            }
                            t.createActivity(type, {toUser, fromUser});
                        } 
                        else if(t.isPending){
                            let type = "pendingFollow"
                            let fromUser = {
                                displayName: t.SocialItems.userDetails.displayName,
                                imageUrl: t.SocialItems.userDetails.imageUrl,
                                userId: t.SocialItems.userDetails.userId
                            }
                            let toUser = {
                                displayName: t.userProfile.userDetails.displayName,
                                userId: t.userProfile.userId
                            }
                            t.createActivity(type, {toUser, fromUser});
                        } 
                        else{
                            let params = {
                                filter:{$and:[
                                    {"$json.fromUser.userId":t.SocialItems.userDetails.userId},
                                    {"$json.toUser.userId": t.userProfile.userId},
                                    {$or:[
                                        {"$json.type":"follow"},
                                        {"$json.type":"pendingFollow"},
                                    ]}
                                ]}
                            }
                            ProfileActivity.search(params, (err, results) =>{
                                console.log("searched");
                                if(results && results.length > 0){
                                    console.log("gonna delete");
                                    results.forEach(res =>{
                                        ProfileActivity.delete(res.id, console.log)
                                    })
                                }
                            })
                        }
                    }
                });
            }


            $scope.openSinglePost = (postId) =>{
                Location.go("#/singlePostView/"+postId)
            }

            t.unblockUser = function(){
                t.isUpdating = true;
                
                $timeout(function(){
                    $scope.$digest()
                })
                SocialUserProfile.unblockUser(t.userProfile.userId, (err, data) =>{
                    if(data){
                        t.clearEverything((res) =>{
                            t.isBlocked = false;
                            t.getUserSocialProfile(console.log);
                        })
                    }
                });
            }


            t.openDrawer = function(){
                let listItems = [];
                if(t.userProfile.isCurrentUser){
                    console.log(t.userProfile.socialProfile);
                    listItems = [
                        { index: 0,text:"View Activity"},
                        { index: 1,text: "Make My Profile " + (t.userProfile.socialProfile.data.isPublicProfile ? "Private" : "Public")},
                        { index: 2,text: "Edit Interests"},
                        { index: 3,text: "View Blocked Users"},
                        { index: 4,text: "Connect My Address Book"},
                        { index: 5,text: "Share Profile"},
                    ];
                }else{
                    listItems = [{
                        index: 6,text: "Block " + t.SocialItems.getUserName(t.userProfile.userDetails)
                    },{
                        index: 7,text:"Share Profile"
                    }];
                    if(t.isBlocked){
                        listItems.splice(0,1);
                        listItems.unshift({index: 8, text: "Unblock " + t.SocialItems.getUserName(t.userProfile.userDetails)})
                    }
                }
                Buildfire.components.drawer.open({
                    enableFilters: false,
                    listItems:listItems
                }, (err, result) =>{
                    if(err || !result) return;
                    else{
                        let index = result.index
                        if(index == 0){
                            Location.go("#/activity")
                        }
                        else if(index == 1){
                            SocialUserProfile.togglePrivacy(t.SocialItems.userDetails.userId, (err, data) =>{
                                if(data){
                                    t.userProfile.socialProfile = data;
                                }
                            });
                        }
                        else if(index == 2){
                            Location.go("#/interests/");
                        }
                        else if(index == 3){
                            Location.go("#/blockedUsers/")
                        }
                        else if(index == 4){
                            
                        }
                        else if(index == 5 || index == 7){
                            Buildfire.deeplink.generateUrl({
                                data: {userId: t.userProfile.userId}
                            }, function (err, result) {
                                if (err) {
                                    console.error(err)
                                } else {
                                    Buildfire.device.share({
                                        text: "Hey Check out this Profile:",
                                        image: t.userProfile.imageUrl || null,
                                        link: result.url
                                    }, function (err, result) { });
            
                                }
                            });
                        }
                        else if(index == 6){
                            t.isUpdating = true;
                            Buildfire.spinner.show();
                            $timeout(function(){
                                $scope.$digest()
                            })
            
                            SocialUserProfile.blockUser(t.userProfile.userId, (err, data) =>{
                                if(data){
                                    t.clearEverything((res) =>{
                                        t.isBlocked = true;
                                        t.isUpdating = false;
                                        $scope.loadingPhase = 2;
                                        Buildfire.spinner.hide();
                                        $scope.$digest();
                                    })
                                }
                            });

                            
                        }
                        else if(index == 8){
                            t.unblockUser();


                        }
                        
                        Buildfire.components.drawer.closeDrawer();
                    }
                })
            }

            $scope.createElement = function(type, innerHTML = "", elClass = [], id = "", post){
                let e = document.createElement(type);
                e.innerHTML = "";
                elClass.forEach(c => e.classList.add(c));
                if(id) e.id = id;
                if(!post) return e;
                e.onclick = function(){
                    console.log(post);
                    $scope.openSinglePost(post.id)
                }
                return e;
            }
            $scope.createImage = function(src, postId){
                let e = document.createElement('img');
                e.src = Buildfire.imageLib.cropImage(src, {width: 100, height: 100});
                e.onclick = () =>{
                    console.log(postId);
                    $scope.openSinglePost(postId)
                }
                return e;
            }


            $scope.injectElements = function(posts, container){

                if(!container) return;
                let lastParent;
                let lastElement;
                let lastParentType = "row";
                let img;
                for (let i = 0; i < posts.length; i++) {
                    if( parseInt(i / 5) != 0 &&  lastParentType == "grid" ){
                        lastParentType = "row";
                        lastParent = $scope.createElement("div","",["row-grid"]);
                        container.appendChild(lastParent);
                    }
                    else if(parseInt(i / 5) == 0 && lastParentType == "row"){
                        lastParentType = "grid";
                        lastParent = $scope.createElement("div","",["grid"]);
                        container.appendChild(lastParent)
                    }
                    lastElement = $scope.createElement("div","",[],"",posts[i]);
                    if(posts[i].data.images){
                        img = $scope.createImage(posts[i].data.images[0], posts[i].id);
                        lastElement.appendChild(img);
                    }
                    
                    lastParent.appendChild(lastElement);
                    if(i === posts.length - 1){
                        Buildfire.spinner.hide();
                        let temp = [];
                        let clone = [...$scope.posts]
                        clone.map(item => temp.push(item.data))
                        Buildfire.messaging.sendMessageToControl({
                            name: 'SEND_POSTS_TO_CP',
                            posts: temp,
                        });
                        $scope.isBusy = false;
                    }
                }
            }
            Buildfire.datastore.onUpdate((event) =>{
                if(event.tag === 'Social'){
                    t.SocialItems.appSettings.showStreak = event.data.appSettings.showStreak || null;
                    t.SocialItems.appSettings.showLongestStreak = event.data.appSettings.showLongestStreak || null;
                    $scope.$digest();
                }
                else if(event.tag === 'languages'){
                    t.strings = event.data;
                    $scope.$digest();
                }
                t.SocialItems.getSettings(console.log);
            });
        

            t.init();
        }]);
})(window.angular);