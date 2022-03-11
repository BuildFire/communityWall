'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .controller('ProfileCtrl', ['$scope', '$rootScope', '$routeParams','SocialDataStore', 'Buildfire','Location', 'EVENTS', 'SubscribedUsersData','SocialUserProfile', 'SocialItems', 'ProfileActivity', '$timeout', function ($scope, $rootScope, $routeParams, SocialDataStore, Buildfire, Location, EVENTS, SubscribedUsersData, SocialUserProfile, SocialItems , ProfileActivity, $timeout) {
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
            t.strings = t.SocialItems.socialLanguages;
            t.currentPage = 'posts';
            t.isLoading = true;

            t.setInitialState = (callback) =>{
                t.user = {
                    userId: $routeParams.userId,
                }
                t.SocialItems = SocialItems.getInstance();
                t.strings = t.SocialItems.socialLanguages;
                t.currentPage = 'posts';
                t.isLoading = true;
                return callback(true);
            }

            t.initProfile = (callback) =>{
                if(t.user.isCurrentUser){
                    t.user.userDetails = t.SocialItems.userDetails;
                    SocialUserProfile.search({filter:{
                        "_buildfire.index.string1":t.SocialItems.userDetails.userId
                    }},(err, data) =>{
                        t.user.socialProfile = data[0];
                        return callback(true)
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

            t.shouldShowSwitch = (callback) =>{
                if(t.user.isBlocked) return false;
                else return true;
            }

            t.shouldShowPosts = (callback) =>{
                if(t.user.isCurrentUser) return true;
            }

            t.init = () =>{
                $rootScope.showThread = false;
                t.initProfile(finished =>{
                    if(finished){
                        $timeout(function(){
                            console.log(t.user);
                            console.log(t.SocialItems);
                            t.isLoading = false;
                            $scope.$digest();
                        })

                        // t.initPosts(finished =>{
                        //     if(finished){
                        //         t.initTaggedPosts(finished =>{
                        //             $timeout(function(){
                        //                 t.isLoading = false;
                        //                 $scope.$digest();
                        //             })
                        //         })
                        //     }
                        // })

                        
                    }
                });
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


            t.injectElements = function(posts, container, callback){

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
                    if(posts[i].data.images){
                        img = t.createImage(posts[i].data.images[0], posts[i].id);
                        lastElement.appendChild(img);
                    }
                    
                    lastParent.appendChild(lastElement);
                }
                return callback(true);
            }

            t.init();
        }]);
})(window.angular);