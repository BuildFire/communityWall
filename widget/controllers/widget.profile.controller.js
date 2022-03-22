'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .controller('ProfileCtrl', ['$scope', '$rootScope', '$routeParams', 'SocialBuddies','SocialDataStore', 'Buildfire','Location', 'EVENTS', 'SubscribedUsersData','SocialUserProfile', 'SocialItems', 'ProfileActivity', '$timeout', function ($scope, $rootScope, $routeParams, SocialBuddies, SocialDataStore, Buildfire, Location, EVENTS, SubscribedUsersData, SocialUserProfile, SocialItems , ProfileActivity, $timeout) {
            var t = this;
            t.SocialItems = SocialItems.getInstance();
            console.log($routeParams.userId);
            t.user = {
                userId: $routeParams.userId,
                isCurrentUser:$routeParams.userId == t.SocialItems.userDetails.userId ? true : false
            }
            t.posts = {
                ownPosts:{
                    shouldFetchMore: true,
                    items: [],
                    container: document.getElementById("profile-posts-container")
                },
                taggedPosts:{
                    shouldFetchMore: true,
                    items: [],
                    container: document.getElementById("profile-tagged-posts-container")
                }
            }
            t.currentPage = "posts";
            t.strings = t.SocialItems.languages;
            t.currentPage = 'posts';
            t.isLoading = true;
            
            t.setInitialState = (callback) =>{
                t.isLoading = true;
                t.user = {
                    userId: $routeParams.userId,
                    isCurrentUser:$routeParams.userId == t.SocialItems.userDetails.userId ? true : false
                }
                t.SocialItems = SocialItems.getInstance();
                t.strings = t.SocialItems.languages;
                t.currentPage = 'posts';
                t.posts = {
                    ownPosts:{
                        shouldFetchMore: true,
                        items: [],
                        container: document.getElementById("profile-posts-container")
                    },
                    taggedPosts:{
                        shouldFetchMore: true,
                        items: [],
                        container: document.getElementById("profile-tagged-posts-container")
                    }
                }
                // t.posts.ownPosts.container.innerHTML = "";
                // t.posts.taggedPosts.container.innerHTML = "";
                return callback(true);
            }

            t.initProfile = (callback) =>{
                if(t.user.isCurrentUser){
                    t.user.userDetails = t.SocialItems.userDetails;
                    t.getBuddies((isFinished) =>{
                        if(isFinished){
                            SocialUserProfile.get(t.user.userId,(err, socialProfile) =>{
                                t.user.socialProfile = socialProfile;
                                t.borderColor = t.user.socialProfile.data.badges.length > 0 ? t.user.socialProfile.data.badges[0].badgeData.color.solidColor : 'transparent'
                                console.log(t.borderColor);
                                return callback(true)
                            })
                        }
                    })
                }
                else{
                    t.getUserDetails(isFinished =>{
                        if(isFinished){
                            t.getUserSocialProfile(isFinished =>{
                                if(isFinished){
                                    t.getMySocialProfile(isFinished =>{
                                        if(isFinished){
                                            return callback(true);
                                        }
                                    })
                                }
                            })
                        }
                    })
                }
            }

            t.GoToBadgeView = () =>{
                if(t.user.isCurrentUser){
                    Location.go("#/ViewBadges");
                }
            }

            t.getUserDetails = (callback) =>{
                console.log("from get user details");
                console.log(t.user.userId);
                SubscribedUsersData.get($routeParams.userId, (err, userDetails) =>{
                    console.log("response");
                    console.log(userDetails);
                    t.user.userDetails = userDetails.data.userDetails;
                    return callback(true)
                })

            }
            t.getUserSocialProfile = (callback) =>{
                SocialUserProfile.get(t.user.userId, (err, profile) =>{
                    console.log(profile);
                    t.user.socialProfile = profile;
                    t.user.isPublicProfile = t.user.socialProfile.data.isPublicProfile;
                    t.user.amIFollowing = t.user.socialProfile.data.followers.findIndex(e => e === t.SocialItems.userDetails.userId) < 0 ? false : true;
                    t.user.amIPending = t.user.socialProfile.data.pendingFollowers.findIndex(e => e === t.SocialItems.userDetails.userId) < 0 ? false : true;
                    return callback(true);
                })
            }

            t.getMySocialProfile = (callback) =>{
                SocialUserProfile.get(t.SocialItems.userDetails.userId, (err, profile) =>{
                    t.user.didIBlock = profile.data.blockedUsers.findIndex(e => e === t.user.userId) < 0 ? false : true;
                    return callback(true);
                })
            }



            t.openDrawer = function(){
                let listItems = [];
                if(t.user.isCurrentUser){
                    listItems = [
                        { index: 0,text:"View Activity"},
                        { index: 1,text: "Make My Profile " + (t.user.socialProfile.data.isPublicProfile ? "Private" : "Public")},
                        { index: 2,text: "Edit Interests"},
                        { index: 3,text: "View Blocked Users"},
                        { index: 4,text: "Connect My Address Book"},
                        { index: 5,text: "Share Profile"},
                    ];
                }else{
                    listItems = [{
                        index: 6,text: "Block " + t.SocialItems.getUserName(t.user.userDetails)
                    },{
                        index: 7,text:"Share Profile"
                    }];
                    if(t.user.didIBlock){
                        listItems.splice(0,1);
                        listItems.unshift({index: 8, text: "Unblock " + t.SocialItems.getUserName(t.user.userDetails)})
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
                                    t.user.socialProfile = data;
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
                            // connect address book after search api is finished
                        }
                        else if(index == 5 || index == 7){
                            Buildfire.deeplink.generateUrl({
                                data: {userId: t.user.userId}
                            }, function (err, result) {
                                if (err) {
                                    console.error(err)
                                } else {
                                    Buildfire.device.share({
                                        text: "Hey Check out this Profile:",
                                        image: t.user.imageUrl || null,
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
            
                            SocialUserProfile.blockUser(t.user.userId, (err, data) =>{
                                if(data){
                                    t.init();
                                }
                            }, (err,data) =>{
                                console.log(data);
                            });

                            
                        }
                        else if(index == 8){
                            t.unblockUser();


                        }
                        
                        Buildfire.components.drawer.closeDrawer();
                    }
                })
            }
            t.unblockUser = function(){
                t.isUpdating = true;
                
                $timeout(function(){
                    $scope.$digest()
                })
                SocialUserProfile.unblockUser(t.user.userId, (err, data) =>{
                    if(data){
                        t.init();
                    }
                });
            }


            t.openBFProfile = () =>{
                Buildfire.auth.openProfile(t.user.userId);
            }

            t.followUnfollowUser = function(){
                let params = {userId: t.user.userId, currentUser: t.SocialItems.userDetails.userId};
                SocialUserProfile.followUnfollowUser(params, (err, data) =>{
                    if(data){
                        t.user.socialProfile = data;
                        t.user.amIFollowing = t.user.socialProfile.data.followers.findIndex(e => e === t.SocialItems.userDetails.userId) < 0 ? false : true;
                        t.user.amIPending = t.user.socialProfile.data.pendingFollowers.findIndex(e => e === t.SocialItems.userDetails.userId) < 0 ? false : true;
                            $scope.$digest();
                        if(t.user.amIFollowing){
                            let type = "follow"
                            let fromUser = {
                                displayName: t.SocialItems.userDetails.displayName,
                                imageUrl: t.SocialItems.userDetails.imageUrl,
                                userId: t.SocialItems.userDetails.userId
                            }
                            let toUser = {
                                displayName: t.user.userDetails.displayName,
                                userId: t.user.userId
                            }
                            t.createActivity(type, {toUser, fromUser});
                        } 
                        else if(t.user.amIPending){
                            let type = "pendingFollow"
                            let fromUser = {
                                displayName: t.SocialItems.userDetails.displayName,
                                imageUrl: t.SocialItems.userDetails.imageUrl,
                                userId: t.SocialItems.userDetails.userId
                            }
                            let toUser = {
                                displayName: t.user.userDetails.displayName,
                                userId: t.user.userId
                            }
                            t.createActivity(type, {toUser, fromUser});
                        } 
                        else{
                            let params = {
                                filter:{$and:[
                                    {"$json.fromUser.userId":t.SocialItems.userDetails.userId},
                                    {"$json.toUser.userId": t.user.userId},
                                    {$or:[
                                        {"$json.type":"follow"},
                                        {"$json.type":"pendingFollow"},
                                    ]}
                                ]}
                            }
                            ProfileActivity.search(params, (err, results) =>{
                                if(results && results.length > 0){
                                    results.forEach(res =>{
                                        ProfileActivity.delete(res.id, console.log)
                                    })
                                }
                            })
                        }
                    }
                });
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

            t.shouldShowSwitch = (callback) =>{
                if(t.user.didIBlock) return false;
                else return true;
            }

            t.shouldShowPosts = () =>{
                if(t.user.didIBlock) return false;
                else if(t.user.isCurrentUser) return true;
                else if(t.user.isPublicProfile) return true;
                else if(t.user.amIFollowing) return true;
                else return false;
            }

            t.getUserPicture = (user, callback) =>{
                SubscribedUsersData.get(user,(err, res) =>{
                    if(res && res.data && res.data.userDetails && res.data.userDetails.imageUrl){
                        return callback(res.data.userDetails.imageUrl)
                    }
                    else return callback("");
                });

            }

            t.getBuddies = (callback) =>{
                SocialBuddies.search(t.user.userId, (err, data) =>{
                    if(err || !data || (data && data.length == 0)){
                        t.user.buddies = [];
                        SocialBuddies.init(t.user.userId, console.log);
                        return callback(true)
                    } 
                    else{
                        let curr = data[0].data;
                        console.log(curr);
                        delete curr.userId;
                        delete curr._buildfire;
                        delete curr.createdOn;
                        delete curr.createdBy;
                        t.user.buddies = [];
                        if(Object.keys(curr).length == 0) return callback(true)
                        let firstBuddy = Object.keys(curr).reduce((a, b) => curr[a] > curr[b] ? a : b);
                        t.getUserPicture(firstBuddy, (pic) =>{
                            t.user.buddies.push({userId: firstBuddy, pic: pic});
                        })
                        if(firstBuddy && Object.keys(curr).length > 0){
                            delete curr[firstBuddy];
                            if(Object.keys(curr).length == 0) return callback(true)
                            let secondBuddy = Object.keys(curr).reduce((a, b) => curr[a] > curr[b] ? a : b);
                            t.getUserPicture(secondBuddy, (pic) =>{
                                t.user.buddies.push({userId: secondBuddy, pic: pic});
                            })
                            
                            if(firstBuddy && secondBuddy && Object.keys(curr).length > 0){
                                delete curr[secondBuddy];
                                if(Object.keys(curr).length == 0) return callback(true)
                                let thirdBuddy = Object.keys(curr).reduce((a, b) => curr[a] > curr[b] ? a : b);

                                t.getUserPicture(thirdBuddy, (pic) =>{
                                    t.user.buddies.push({userId: thirdBuddy, pic: pic});
                                    delete curr[thirdBuddy];
                                })
    
                            }
                        }
                        return callback(true)

                    }
                })
            }

            t.init = () =>{
                t.setInitialState(finished =>{
                    if(finished){
                        t.isLoading = true;
                        $rootScope.showThread = false;
                        t.initProfile(finished =>{
                            if(finished){
                                t.initPosts(finished =>{
                                    if(finished){
                                        t.initTaggedPosts(finished =>{
                                            if(finished){
                                                Buildfire.spinner.hide();
                                                $timeout(function(){
                                                    t.isLoading = false;
                                                    $scope.$digest();
                                                })
                                            }
                                        })
                                    }
                                })                        
                            }
                        });
                    }
                })
            }



            t.initPosts = (callback) =>{
                t.attachListener(t.posts.ownPosts.container,"ownPosts");
                t.getPosts("ownPosts",(err, posts) =>{
                    t.posts.ownPosts.items.push(...posts);
                    t.injectElements(posts, t.posts.ownPosts.container, finished =>{
                        if(finished){
                            return callback(true);
                        }
                    })
                })
            }

            t.initTaggedPosts = (callback) =>{
                t.attachListener(t.posts.taggedPosts.container,"taggedPosts");
                t.getPosts("taggedPosts",(err, posts) =>{
                    t.posts.taggedPosts.items.push(...posts);
                    t.injectElements(posts, t.posts.taggedPosts.container, finished =>{
                        if(finished){
                            return callback(true);
                        }
                    })
                })
            }

            t.getPosts = (type, callback) =>{
                let options = {
                    skip: t.posts[type].items.length, 
                    limit: 8, 
                    sort:{createdOn: -1}
                }
                if(type === 'ownPosts'){
                    options.filter = {"_buildfire.index.array1.string1":`userId_${t.user.userId}`}
                }
                else{
                    options.filter = {"_buildfire.index.array1.string1":`tagged_${t.user.userId}`};
                }
                Buildfire.appData.search(options,"wall_posts",(err, data) =>{
                    if(err) return callback(err);
                    else{
                        if(data && data.length != 8) t.posts[type].shouldFetchMore = false;
                        return callback(null, data)
                    } 
                })
            }

            t.attachListener = (container, type) =>{
                container.addEventListener('scroll',() =>{
                    if( t.posts[type].shouldFetchMore && ( container.scrollTop - (container.scrollHeight - container.offsetHeight) > - 30) && !t.isCurrentlyFetching ){
                        Buildfire.spinner.show();
                        t.isCurrentlyFetching = true;
                        t.getPosts(type,(err, posts) =>{
                            t.posts[type].items.push(...posts);
                            t.injectElements(posts, t.posts[type].container, finished =>{
                                if(finished){
                                    t.isCurrentlyFetching = false;
                                    Buildfire.spinner.hide();
                                }
                            })
                        })
                    }
                });
            }

            t.loadPage = function(title){
                if(title === t.currentPage) return;
                else{
                    var oldPage = t.currentPage + "";
                    t.currentPage = title;
                    document.getElementById("profile-"+oldPage).classList.add("no-bottom-border");
                    document.getElementById("profile-"+oldPage).classList.remove("has-bottom-border");
                    document.getElementById("profile-"+title).classList.add('has-bottom-border');
                    document.getElementById("profile-"+title).classList.remove('no-bottom-border');
                    $timeout(function(){
                        $scope.$digest();
                    })

                }
            }

            t.openSinglePost = (postId) =>{
                Location.go("#/singlePostView/"+postId)
            }

            t.createElement = function(type, innerHTML = "", elClass = [], id = "", post){
                let e = document.createElement(type);
                e.innerHTML = "";
                elClass.forEach(c => e.classList.add(c));
                if(id) e.id = id;
                if(!post) return e;
                e.onclick = function(){
                    console.log(post);
                    t.openSinglePost(post.id)
                }
                return e;
            }
            t.createImage = function(src, postId){
                let e = document.createElement('img');
                e.src = Buildfire.imageLib.cropImage(src, {width: 100, height: 100});
                e.onclick = () =>{
                    console.log(postId);
                    t.openSinglePost(postId)
                }
                return e;
            }
            

            t.createVideo = (src, postId, parent) =>{
                parent.style.position = "relative";
                parent.style.backgroundColor = "#E5E5E5"
                let span = document.createElement("span");
                span.classList.add("material-icons");
                span.innerHTML = "play_arrow";
                span.style.fontSize = "70px";
                span.style.position = "absolute"
                let e = document.createElement('video');
                e.style.width = "100%";
                e.style.height = "100%";
                e.style.objectFit = "cover"
                e.style.borderRadius = "15px";
                let vidSrc = document.createElement("source");
                vidSrc.src = src+"#t=0.1";
                vidSrc.type = "video/mp4";
                e.appendChild(vidSrc)
                parent.appendChild(span);
                parent.appendChild(e);
            }

            t.injectElements = function(posts, container, callback){
                console.log("injecting");
                console.log(posts);
                console.log(container);
                if(!container) return;
                let lastParent;
                let lastElement;
                let lastParentType = "row";
                let img;
                for (let i = 0; i < posts.length; i++) {
                    if( parseInt(i / 5) != 0 &&  lastParentType == "grid" ){
                        lastParentType = "row";
                        lastParent = t.createElement("div","",["row-grid"]);
                        container.appendChild(lastParent);
                    }
                    else if(parseInt(i / 5) == 0 && lastParentType == "row"){
                        lastParentType = "grid";
                        lastParent = t.createElement("div","",["grid"]);
                        container.appendChild(lastParent)
                    }
                    lastElement = t.createElement("div","",[],"",posts[i]);
                    if(posts[i].data.images && posts[i].data.images.length > 0){
                        img = t.createImage(posts[i].data.images[0], posts[i].id);
                        lastElement.appendChild(img);
                    }
                    else if(posts[i].data.videos && posts[i].data.videos.length > 0){
                        let vid = t.createVideo(posts[i].data.videos, posts[i].id , lastElement);
                    }
                    
                    lastParent.appendChild(lastElement);
                }
                $timeout(function(){
                    $scope.$digest();
                })
                return callback(true);
            }
            Buildfire.datastore.onUpdate((event) =>{
                if(event.tag === 'Social'){
                    t.SocialItems.appSettings.showStreak = event.data.appSettings.showStreak || null;
                    t.SocialItems.appSettings.showLongestStreak = event.data.appSettings.showLongestStreak || null;
                    $scope.$digest();
                }
                else if(event.tag === 'languages'){
                    t.SocialItems.getSettings((err, settings) =>{
                        t.strings = t.SocialItems.languages;
                    })
                    $scope.$digest();
                }
                t.SocialItems.getSettings(console.log);
            });
        

            t.init();
        }]);
})(window.angular);