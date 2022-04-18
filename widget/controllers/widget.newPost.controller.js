'use strict';

(function (angular) {
    angular.module('socialPluginWidget')
        .controller('NewPostCtrl', ['$scope', '$rootScope','ProfileActivity','$timeout', '$sce', '$routeParams','SocialDataStore', 'Buildfire', 'EVENTS', 'SubscribedUsersData', 'SocialItems', 'Location', function ($scope, $rootScope, ProfileActivity , $timeout, $sce, $routeParams, SocialDataStore, Buildfire, EVENTS, SubscribedUsersData, SocialItems, Location) {

            var NewPost = this;
            NewPost.SocialItems = SocialItems.getInstance();
            let postId = $routeParams.postId;
            console.log(postId);
            $scope.errorMessage = "Test";
            NewPost.init = function () {
                NewPost.people = [];
                $scope.sendToCp([]);
    
                $scope.googlePlace;
                $scope.googlePlaceDetails;
                NewPost.loadedHashtags = [];
                $scope.selectedHashtags = [];
                $scope.newHashtagsAdded = [];

                configureHashtagsAutocomplete();
                configurePeopleAutoComplete();
                if(postId != 0){
                    NewPost.SocialItems.getPost(postId,(err, res) =>{
                        $scope.text = res.text  ? res.text.replace(/[#&%+!@^*()-]/g, function (match) {
                            return encodeURIComponent(match)
                        }) : '',

                        $scope.post = res;

                        NewPost.text = res.text;
                        NewPost.choosenLocationName = res.location && res.location.address ? res.location.address : "";
                        $scope.selectedHashtags = res.hashtags;
                        if (res.hashtags && res.hashtags.length) {
                            const options = {
                                filter: {
                                    "_buildfire.index.array1.string1": {$in: res.hashtags.map(elem => `name_${elem.toLowerCase()}`)}
                                }
                            }
                            searchHashtags(options).then((hashtags) => {
                                console.log(hashtags);
                                hashtags = hashtags.map(item => ({key: item.id, value: item.data.name , data: item.data}));
                                $scope.hashtagsAutoComplete.input.value = JSON.stringify(hashtags)
                            })
                        }
                        
                      
                        $scope.selectedUsers = [];
                        if(res.taggedPeople && res.taggedPeople.length){
                            SubscribedUsersData.getUsersByIds(res.taggedPeople, (err, data) =>{
                                const updateWhitelist = (list) =>{
                                    let whitelist = list.map(item => {
                                        return {key: item.id, value: item.data.name || item.data.title || item.data.userDetails.displayName || "", data:item.data};
                                    });
                                   return whitelist;
                                };

                                let updatedList = updateWhitelist(data); 
                                $scope.peopleAutoComplete.updateWhitelist(updatedList);
                                $scope.peopleAutoComplete.input.value = JSON.stringify(updatedList);
                                $scope.selectedUsers = updatedList;
                                $timeout(function(){
                                    $scope.$digest();
                                });   
                                
                                // for(let i = 0 ; i < data.length ; i++){
                                //     let user = data[i].data.displayName || "Someone";
                                //     $scope.selectedUserNames = [];
                                //     $scope.selectedUserNames.push(user);
                                //     if(i == data.length - 1){
                                //         console.log($scope.selectedUserNames);
                                         
                                //     }
                                // }
                
                            })
                        } else {
                            $scope.selectedUserNames = [];
                            $timeout(function(){
                                $scope.$digest();
                            });  
                        }
                        
                        $scope.selectedMedia = {
                            type: res.images.length > 0 ? "image" : res.videos.length > 0 ? "video" : "image",
                            src: res.images.length > 0 ? res.images[0] : res.videos.length > 0 ? res.videos[0] : "https://pluginserver.buildfire.com/styles/media/holder-16x9.png",
                            shown:  res.images.length > 0 ? croppedImage(res.images[0]) : res.videos.length > 0 ? res.videos[0] : "https://pluginserver.buildfire.com/styles/media/holder-16x9.png",
                        }
                        $rootScope.showThread = false;
                    })
                } else {
                    NewPost.text = "";
                    NewPost.loadedHashtags = [];
                    $scope.selectedHashtags = [];
                    $scope.selectedUsers = [];
    
                    $scope.selectedMedia = {
                        type: "image",
                        src: "https://pluginserver.buildfire.com/styles/media/holder-16x9.png",
                        shown: "https://pluginserver.buildfire.com/styles/media/holder-16x9.png",
                    }
    
                    $rootScope.showThread = false;
                }
            }

            const croppedImage = (url) =>{
                return Buildfire.imageLib.cropImage(url, { size: "half_width", aspect: "9:16" });
            }

            const configureHashtagsAutocomplete = () => {
                const itemTemplate = function(tagData) {
                    return `
                        <div ${this.getAttributes(tagData)}
                            class='tagify__dropdown__item'
                            tabindex="0"
                            role="option">
                                <span style="bold font-size-18"># ${tagData.data.name}</span>                            
                        </div>
                    `
                }

                let config = {
                    delimiters: ",| ",
                    editTags: false,
                    dropdown:{
                        enabled: 0,
                        maxItems:3
                    },
                    templates:{
                        dropdownItem: itemTemplate
                    }
                }

                $scope.hashtagsAutoComplete = new buildfire.components.autoComplete("hashtagsInput", config);
                $scope.hashtagsAutoComplete.onItemAdded = (e) => {
                    const isAdded = $scope.selectedHashtags.includes(e.detail.data.value);
                    if (isAdded) return;
                    
                    $scope.selectedHashtags.push(e.detail.data.value);
                    if (!e.detail.data.key) {
                        $scope.newHashtagsAdded.push(e.detail.data.value);
                    }
                }
                $scope.hashtagsAutoComplete.onItemRemoved = (e) => {
                    console.log("Remove HASHTAG", e.detail.data);
                    //$scope.selectedHashtags.splice($scope.selectedHashtags.findIndex(x => x === e.detail.data.value), 1);
                    $scope.selectedHashtags = $scope.selectedHashtags.filter(hashtag => hashtag !== e.detail.data.value);
                    if (!e.detail.data.key) {
                        $scope.newHashtagsAdded = $scope.newHashtagsAdded.filter(hashtag => hashtag !== e.detail.data.value )
                    }
                }


                let TIMEOUT_ID;
                $scope.hashtagsAutoComplete.onInput = (e) => {
                    $scope.hashtagsAutoComplete.tagify.loading(true);
                    const searchValue = e.detail.value;
                    const options = { 
                        limit: 20
                    }
                    if (searchValue) {
                        options.filter =  {
                            "$json.name": { "$regex": searchValue, "$options": "i" }
                        }
                    }
                    clearTimeout(TIMEOUT_ID);
                    TIMEOUT_ID = setTimeout(() => {
                        searchHashtags(options).then((hashtags) => {
                            $scope.NewPost.loadedHashtags = [...hashtags];
                            $scope.hashtagsAutoComplete.updateWhitelist(hashtags);
                            $scope.hashtagsAutoComplete.tagify.loading(false);
                        }).catch(err => {
                            $scope.hashtagsAutoComplete.tagify.loading(false);
                            console.error(err)
                        });
                    }, 300)

                }

                searchHashtags().then((hashtags) => {
                    $scope.NewPost.loadedHashtags = [...$scope.NewPost.loadedHashtags, ...hashtags];
                    if(!$scope.hashtagsAutoComplete) return;
                    $scope.hashtagsAutoComplete.updateWhitelist(hashtags);
                }).catch(console.error)

            }

            const searchHashtags = (options = {}) => {
                return new Promise((resolve, reject) => {
                    Hashtags.search(options, (err, result) => {
                        if (err) return reject(err);
                        resolve(result);
                    })
                })
            }

            const saveNewHashtags = () => {
                console.log("New Hashtags", $scope.newHashtagsAdded);
                if ($scope.newHashtagsAdded && $scope.newHashtagsAdded.length) {
                    for (const hashtag of $scope.newHashtagsAdded) {
                        Hashtags.use(hashtag, (err, result) => {
                            if (err) {
                                console.log(err);
                            }
                         })
                    }
                }
            }

            const configurePeopleAutoComplete = () => {
                const itemTemplate = function (user) {
                    return `
                        <div ${this.getAttributes(user)}
                            class='tagify__dropdown__item'
                            tabindex="0"
                            role="option">
                            ${ user.data.userDetails.imageUrl ? `
                            <div class='tagify__dropdown__item__avatar-wrap'>
                                <img  src="${buildfire.imageLib.cropImage(user.data.userDetails.imageUrl, {width: 40, height: 40})}">
                            </div>` : 
                            `<div class='tagify__dropdown__item__avatar-wrap'>
                                <img  src="../../../../styles/media/avatar-placeholder.png">
                            </div>` 
                            }
                            <p>${user.data.userDetails.displayName || "Someone"}</p>
                        </div>
                    `
                }
                let autoCompletePeopleConfig = {
                    enforceWhitelist: true,
                    whitelist:this.people,
                    editTags: false,
                    dropdown:{
                        enabled: 2,
                    },
                    templates:{
                        dropdownItem: itemTemplate
                    }
                }
                $scope.peopleAutoComplete = new buildfire.components.autoComplete("peopleInput", autoCompletePeopleConfig);
                
                let TIMEOUT_ID;
                $scope.peopleAutoComplete.onInput = (e) =>{
                    $scope.peopleAutoComplete.tagify.loading(true);
                    let searchValue = e.detail.value;
                    const options = {
                        filter: {
                            $and: [
                                { "$json.userDetails.email": { $ne: NewPost.SocialItems.userDetails.email } },
                                { "$json.wallId": "" }
                            ]
                        },
                        limit: 20
                    };

                    if (searchValue) {
                        options.filter.$and.push( { "$json.userDetails.displayName": { "$regex": searchValue, "$options": "i" } })
                    }

                    clearTimeout(TIMEOUT_ID);

                    setTimeout(() => {
                        Buildfire.publicData.search(options, "subscribedUsersData", (err, users) =>{
                            if (err || !users) {
                                $scope.peopleAutoComplete.tagify.loading(false)
                            }
                            if(users){
                                $scope.peopleAutoComplete.updateWhitelist(users)
                                $scope.peopleAutoComplete.tagify.loading(false).dropdown.show(searchValue)
                            }
                        });
                    }, 300);
                }

                $scope.peopleAutoComplete.onItemAdded = (e) =>{
                    const isAdded = $scope.selectedUsers.includes(e.detail.data.data.userId);
                    if (isAdded) return;
                    $scope.selectedUsers.push(e.detail.data.data.userId);
                }
                $scope.peopleAutoComplete.onItemRemoved = (e) =>{
                    $scope.selectedUsers.splice($scope.selectedUsers.findIndex(x => x === e.detail.data.data.userId), 1);
                }
            }

            $scope.trustSrc = function(src) {
                return $sce.trustAsResourceUrl(src);
            };

            $scope.checkIfCanSubmit = function(){
                if($routeParams.postId == 0){
                    if($scope.selectedMedia.shown === "https://pluginserver.buildfire.com/styles/media/holder-16x9.png"){
                        Buildfire.dialog.alert({
                            message: "Post must have an image or a video.",
                        });
                    }
                    else{
                        let {type, src} = $scope.selectedMedia;
                        var postData = {
                            text: $scope.text ? $scope.text.replace(/[#&%+!@^*()-]/g, function (match) {
                                return encodeURIComponent(match)
                            }) : '',
                            images : type === 'image' && src != "https://pluginserver.buildfire.com/styles/media/holder-16x9.png" ? [src] : [],
                            videos : type === 'video'  ? [src] : [],
                            location: $scope.googlePlaceDetails,
                            taggedPeople: $scope.selectedUsers,
                            hashtags: $scope.selectedHashtags,
                            userDetails: NewPost.SocialItems.userDetails,
                            wid: NewPost.SocialItems.wid,
                            originalPost: {},
                        };
                        $scope.createPost(postData);
                    }
                } else {
                    if($scope.selectedMedia.shown === "https://pluginserver.buildfire.com/styles/media/holder-16x9.png"){
                        Buildfire.dialog.alert({
                            message: "Post must have an image or a video.",
                        });
                    }
                    else{
                        let {type, src} = $scope.selectedMedia;
                        var postData = $scope.post;
                        postData.text = $scope.text ? $scope.text.replace(/[#&%+!@^*()-]/g, function (match) {
                                return encodeURIComponent(match)
                            }) : '',
                        postData.images = type === 'image' && src != "https://pluginserver.buildfire.com/styles/media/holder-16x9.png" ? [src] : [],
                        postData.videos = type === 'video'  ? [src] : [],
                        postData.location =  $scope.googlePlaceDetails,
                        postData.taggedPeople =  $scope.selectedUsers,
                        postData.hashtags =  $scope.selectedHashtags,
                        $scope.updatePost(postData);
                    }
                }
            }
            $scope.updatePost = function(postData){
                console.log(postData);
                SocialDataStore.updatePost(postData).then(response => {
                    Buildfire.dialog.toast({
                        message: "Post updated successfully",
                    });

                    saveNewHashtags();

                    setTimeout(() => {                        
                        if(!$rootScope.wonBadge){
                            Location.go("#/singlePostView/"+response.data.id);
                        }else{
                            $rootScope.wonBadge.goToPath = "#/singlePostView/"+response.data.id;
                        }
                    }, 200);
                    NewPost.SocialItems.items.unshift(postData);
                        Buildfire.messaging.sendMessageToControl({
                            name: EVENTS.POST_CREATED,
                            status: 'Success',
                            post: response.data
                        });
                        postData.id = response.data.id;
                        postData.uniqueLink = response.data.uniqueLink;
                        

                    }, (err) => {
                        console.error("Something went wrong.", err);
                        $scope.text = '';
                    })
            }

            $scope.clear = function(){
                $scope.text = "";
                $scope.selectedMedia.src = "https://pluginserver.buildfire.com/styles/media/holder-16x9.png";
                $scope.selectedMedia.shown = "https://pluginserver.buildfire.com/styles/media/holder-16x9.png";

                $scope.selectedMedia.type = "image";
                $scope.images = [];
                $scope.videos = [];
                $scope.taggedPeople = [];
                $scope.hashtags = [];
                $scope.location = {};
                document.getElementById("text").innerHTML = $scope.text;
                NewPost.choosenLocationName = "";
                $scope.googlePlaceDetails = "";
            }

            $scope.openPostTextSection = function(){
                Buildfire.input.showTextDialog({
                    "placeholder": "Enter post text here",
                    "defaultValue": $scope.text || "",
                    "attachments": {
                        "images": { enable: false, multiple: true },
                        "gifs": { enable: false }
                    }
                }, (err, data) => {
                    if(err || !data || !data.results || !data.results.length > 0) return;
                    $scope.text = data.results[0].textValue;
                    document.getElementById("text").innerHTML = $scope.text.length > 150 ? $scope.text.substring(0,150) + "..." : $scope.text;
                    $scope.$digest();
                });
            }

            $scope.selectImage = function(){


                if(!Buildfire.isWeb()){
                    let listItems = [
                        {text: "Take a picture"},
                        {text:"Record a video"},
                    ];
                    Buildfire.components.drawer.open({ enableFilters: false, listItems:listItems}, (err, result) =>{
                        if(err) console.error(error);
                        else {
                            buildfire.components.drawer.closeDrawer();
                            if(result.text === 'Take a picture'){
                                Buildfire.spinner.show();
                                Buildfire.services.camera.getPicture({upload: true}, (err, imageData) => {
                                    Buildfire.spinner.hide();
                                    if (err || !imageData) return Buildfire.spinner.hide();
                                    else{
                                        $scope.selectedMedia.src = imageData;
                                        $scope.selectedMedia.type = "image";
                                        $scope.selectedMedia.shown  = Buildfire.imageLib.cropImage($scope.selectedMedia.src, { size: "half_width", aspect: "9:16" });
                                        Buildfire.spinner.hide();
                                        $scope.$digest();
                                    }
                                    
                                });
                            }
                            else{
                                Buildfire.spinner.show();
                                Buildfire.services.camera.getVideo({upload: true, quality: 0,duration: 15}, (err, videoData) => {
                                    Buildfire.spinner.hide();
                                    if (err || !videoData) return Buildfire.spinner.hide();
                                    else{
                                        $scope.selectedMedia.src = videoData.url;
                                        $scope.selectedMedia.type = "video";
                                        $scope.selectedMedia.shown  = videoData.localURI

                                        Buildfire.spinner.hide();
                                        $scope.$digest();
                                    }

                                })
                            }
                        }
                    });

                }
                else{
                    Buildfire.spinner.show();
                    Buildfire.services.publicFiles.showDialog(
                        { filter: ["image/jpeg", "image/png", "video/mp4"], allowMultipleFilesUpload: false },
                        (onProgress) => {
                            console.log(onProgress);
                        },
                        (onComplete) => {
                        },
                        (err, file) => {
                            Buildfire.spinner.hide();
                            if (err){ 
                                console.log(err);
                                return Buildfire.spinner.hide();
                            }
                            file = file[0];
                            let isImage = file.type.split('/')[0] === 'image'; 
                            $scope.selectedMedia.src = file.url;
                            $scope.selectedMedia.type = isImage ? "image" : "video";
                            $scope.selectedMedia.shown  = isImage ? Buildfire.imageLib.cropImage(file.url, { size: "full_width", aspect: "1:1" }) : file.url;
                            console.log($scope.selectedMedia);
                            $scope.$digest();
                        }
                      );
                }

            }

            $scope.sendToCp = function(items){
                let posts = [];
                if(items && items.length > 0) items.map(item => posts.push(item.data))
                window.buildfire.messaging.sendMessageToControl({
                    name: 'SEND_POSTS_TO_CP',
                    posts: posts,
                });
            }


            NewPost.createReactionActivity = (user, post) =>{
                let type = "taggedYouInAPost";
                let fromUser = {
                    displayName: NewPost.SocialItems.userDetails.displayName,
                    imageUrl: NewPost.SocialItems.userDetails.imageUrl,
                    userId: NewPost.SocialItems.userDetails.userId
                }
                let toUser = {
                    userId: user
                }

                NewPost.saveActivity(type, {fromUser, toUser, post: {image: post.images.length > 0 ?  post.images[0] : null, id: post.id}})
            }

            NewPost.saveActivity = function(type, data){
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


            $scope.createPost = function(postData){      
                console.log(postData);
                SocialDataStore.createPost(postData).then((response) => {
                    console.log(response);
                    Buildfire.dialog.toast({
                        message: "Post created successfully",
                    });
                    if(response.data.taggedPeople.length > 0){
                        response.data.taggedPeople.forEach(user =>{
                            NewPost.createReactionActivity(user, response.data);
                        })
                    }
                    saveNewHashtags();
                    setTimeout(() => {                        
                        if(!$rootScope.wonBadge){
                            Location.go("#/singlePostView/"+response.data.id);
                        }else{
                            $rootScope.wonBadge.goToPath = "#/singlePostView/"+response.data.id;
                        }
                    }, 200);
                    NewPost.SocialItems.items.unshift(postData);
                        Buildfire.messaging.sendMessageToControl({
                            name: EVENTS.POST_CREATED,
                            status: 'Success',
                            post: response.data
                        });
                        postData.id = response.data.id;
                        postData.uniqueLink = response.data.uniqueLink;
                        

                    }, (err) => {
                        console.error("Something went wrong.", err);
                        $scope.text = '';
                    })
            }


            $scope.getCurrentLocation = () => {
                getCurrentUserPosition().then(coords => {
                    console.log(coords);
                    const latLng = { lat: coords.latitude, lng: coords.longitude }
                    getAddress(latLng).then(location => {
                        console.log(location);
                        $scope.googlePlaceDetails = {
                            ...latLng,
                            address: location.formatted_address
                        }
                        NewPost.choosenLocationName = location.formatted_address;
                        $scope.$digest();
                    }).catch(error => {
                        console.warn(error);
                    });
                }).catch(err => {
                    console.warn(`failed to get current user position ${JSON.stringify(err)}`);
                })
            }

            const getCurrentUserPosition = () => new Promise((resolve, reject) => {
                let retries = 5;
                const attempt = () => {
                  console.info(`attempting to get user position ${retries}`);
                  buildfire.geo.getCurrentPosition({ enableHighAccuracy: true, timeout: 1000 }, (err, position) => {
                    if (!err) {
                      resolve(position.coords);
                    } else if (retries > 0) {
                      retries -= 1;
                      attempt();
                    } else {
                      reject(err);
                    }
                  });
                };
                attempt();
            });

            const getAddress = (coords, cb) => {
                const geoCoder = new google.maps.Geocoder();
                return new Promise((resolve, reject) => {
                    geoCoder.geocode( { location: coords }, (results, status) => {
                          if (status === 'OK') {
                            if (results[0]) {
                                resolve(results[0])
                            } else {
                                reject(new Error("No results found"))
                            }
                          } else {
                            reject(new Error("Geocoder failed due to: " + status))
                          }
                        }
                      );
                })
              };

            NewPost.init();
        }]);
})(window.angular);

