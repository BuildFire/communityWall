class Posts{
    static TAG = "posts";


    static lastPostTime = "";
    static skip = 0;
    static createPost = (post, user, isPublic = false) =>{
        let displayName = "Someone";
        if(isPublic){
            displayName = post.postTitle || buildfire.getContext().title ||buildfire.getContext().pluginId || "Someone";
        }
        else{
            if(user.displayName) displayName = user.displayName;
            else if(!user.displayName && user.firstName && user.lastName) displayName = user.firstName + " " + user.lastName;
            else if(!user.displayName && !user.lastName && user.firstName) displayName = user.firstName;
            else if(!user.displayName && user.lastName && !user.firstName) displayName = user.lastName;
            else if(!user.displayName && !user.firstName) displayName = "Someone";
            else displayName = "Someone";            
        }
        return new Post({
            userId: !isPublic ? user._id : "publicPost",
            createdBy:!isPublic ? (user.displayName || "Someone") : "publicPost",
            displayName: displayName,
            postText: post.postText || "",
            postImages: post.postImages || [],
            isPublic,
            pluginInstance : {
                pluginInstanceId : post?.pluginInstance?.pluginInstanceId || buildfire.getContext().instanceId,
                pluginInstanceTitle : post?.pluginInstance?.pluginInstanceTitle ||  buildfire.getContext().title || buildfire.getContext().pluginId
            },
            _buildfire:{index : Posts.buildIndex({
                displayName : !isPublic ? (user.displayName || user.username) : (post.postTitle || buildfire.getContext().title ||buildfire.getContext().pluginId) , 
                userId : !isPublic ? user?._id : "publicPost", 
                pluginTitle : buildfire.getContext().title || buildfire.getContext().pluginId,
                isPublic : isPublic ? 1 : 0,
                pluginInstanceId: buildfire.getContext().instanceId
            })}
        })
    } 


    static searchPosts = (options,callback) =>{
        if(!options.filter) return console.error("Malformatted data");
        buildfire.appData.search({
            filter :{
                $or:[
                    {$and:[{"_buildfire.index.array1.string1":`isPublic_0`},{"_buildfire.index.array1.string1":`userId_${options.filter}`}]},
                    {$and:[{"_buildfire.index.array1.string1":`isPublic_0`},{"_buildfire.index.array1.string1":`displayName_${options.filter}`}]},
                ]
            }
        ,skip: options.skip || 0, limit: options.limit || 50}, Posts.TAG,(err,r) =>{
            if(err || !r) return callback({code:errorsList.ERROR_404,message:"Couldn't find matching data"});
            console.log(r);
            return callback(null,r);
        });
    }
    static addPost = (post , callback) =>{
        console.log(post);
        if((!post.postText && !post.postImages) ||  post?.postImages && !Array.isArray(post.postImages) || (post?.postImages && Array.isArray(post.postImages) && post.postImages.length == 0 && !post?.postText)) return callback({code:errorsList.ERROR_400,message:"Must have atleast post text or post images, post images must be an array of atleast one image url"});
        buildfire.auth.getCurrentUser((err, currentUser) =>{
            if(err || !currentUser) return callback({code: errorsList.ERROR_401,message:"Must be logged in"});
            else if(!(post.postText || (post.postImages && post.postImages.length > 0))) return callback({code:errorsList.ERROR_400,message:"Must have atleast post text or post images, post images must be an array of atleast one image url"});
            post = Posts.createPost(post, currentUser);
            buildfire.appData.insert(post, Posts.TAG, (err, rPost) =>{
                if(err || !rPost) return callback({code:errorsList.ERROR_404,message:"Couldn't find matching data"});
                Analytics.trackAction("post-added");
                callback(null, rPost);
            })
        });
    }

    static addPublicPost = (post, callback ) =>{
        if((!post.postText && !post.postImages) ||  post?.postImages && !Array.isArray(post.postImages) || (post?.postImages && Array.isArray(post.postImages) && post.postImages.length == 0)) return callback({code:errorsList.ERROR_400,message:"Must have atleast post text or post images, post images must be an array of atleast one image url"});
        post = Posts.createPost(post,null,true);
        
        buildfire.appData.insert(post, Posts.TAG, (err, rPost) =>{
            if(err || !rPost) return callback({code:errorsList.ERROR_404,message:"Couldn't find matching data"});
            Analytics.trackAction("post-added");
            callback(null, rPost)
        })
    }

    static deletePublicPost = (id, callback) =>{
        buildfire.appData.getById(id, Posts.TAG, (err,r) =>{
            if(err) return callback({code: errorsList.ERROR_404,message:"Couldn't find post with this ID"});
            buildfire.appData.delete(id, Posts.TAG, (err, r) =>{
                if(err || !r) return callback({code: errorsList.ERROR_404,message:"Couldn't find post with this ID"});
                else {
                    Analytics.trackAction("post-deleted");
                    return callback(null,"Deleted successfully")
                }
            })
        })
    }


    static deletePostById = (id, callback) =>{
        buildfire.auth.getCurrentUser((err, currentUser) =>{
            if(err || !currentUser) return callback({code: errorsList.ERROR_401,message:"Must be logged in"});
            buildfire.appData.getById(id, Posts.TAG, (err, r) =>{
                if(err || !r) return callback({code:errorsList.ERROR_404,message:"Couldn't find matching data"});
                else if(r.data.userId != currentUser._id) return callback({code: errorsList.ERROR_402, message: "You are not authorized to modify this post"});
                buildfire.appData.delete(id, Posts.TAG, (err, r) =>{
                    if(err) return console.error(err);
                    Analytics.trackAction("post-deleted");
                    callback(r);
                })
            })
        })
    }
    static deletePost = (filter, callback) =>{
        console.log(filter);
        buildfire.auth.getCurrentUser((err, currentUser) =>{
            if(err || !currentUser) return callback({code: errorsList.ERROR_401,message:"Must be logged in"});
            buildfire.appData.search({filter:{$and:[{...filter}]},sort:{createdOn: -1} }, Posts.TAG, (err, r) =>{
                if(err || !r || r.length == 0) return callback({code:errorsList.ERROR_404,message:"Couldn't find matching data"});
                r.forEach(p =>{
                    if(!p) return callback({code:errorsList.ERROR_404,message:"Couldn't find matching data"})
                    if(p.data.userId != currentUser._id && buildfire.getContext().type !== 'control') return callback({code: errorsList.ERROR_402, message: "You are not authorized to modify this post"});
                    buildfire.appData.delete(p.id, Posts.TAG, (err, r) =>{
                        if(err) return console.error(err);
                        Analytics.trackAction("post-added");
                        callback(r);
                    })

                })
            })
        })
    }

    static getPosts = (options , callback) =>{
        let tempArray = [];
        if(!options) tempArray.push({"$json.isPublic" : true});
        else if((options.hasOwnProperty('publicPosts') && options.publicPosts) || !options.hasOwnProperty('publicPosts')) tempArray.push({"_buildfire.index.array1.string1":"isPublic_1"});
        buildfire.auth.getCurrentUser((err, currentUser) =>{
            if(err || !currentUser){
                buildfire.appData.search({filter : {$or: tempArray} , skip : options?.skip || 0 , limit : options?.limit || 6, sort:options?.sort ? options.sort : {createdOn : -1}} , Posts.TAG , (e , r) =>{
                    e ? callback(e , null) : callback(null , r);
                })
            }
            else{
                Follows.getUserFollowData((err , resp) =>{            
                    resp?.followedUsers && resp.followedUsers.forEach(id => tempArray.push({"_buildfire.index.array1.string1" : `userId_${id}`}));
                    resp?.followedPlugins && resp.followedPlugins.forEach(id => tempArray.push({"_buildfire.index.array1.string1" : `pluginId_${id}`.toLowerCase()}));
                    buildfire.appData.search({filter : {$or: tempArray} , skip : options?.skip || 0 , limit : options?.limit || 6 , sort:{createdOn : -1}} , Posts.TAG , (e , r) =>{
                        e ? callback(e , null) : callback(null , r);
                    })                
                })

            }
        })
        
            
    }

    static getNewPosts = (options, callback) =>{
        let tempArray = [];
        if(!options) tempArray.push({"_buildfire.index.array1.string1":"isPublic_1"});
        else if((options.hasOwnProperty('publicPosts') && options.publicPosts) || !options.hasOwnProperty('publicPosts')) tempArray.push({"_buildfire.index.array1.string1":"isPublic_1"});
        buildfire.auth.getCurrentUser((err, currentUser) =>{
            if(err || !currentUser) {
                buildfire.appData.search({filter :{$and:[{$or:tempArray},{"$json.createdOn":{$gt:new Date(options.lastPostDate)}}]} , skip : options?.skip || 0 , limit : options?.limit || 6 ,page: options?.page || 0, pageSize: options?.pageSize, sort:options?.sort ? options.sort : {createdOn : -1}} , Posts.TAG , (e , r) =>{    
                    e ? callback(e , null) : callback(null , r)
                })
            }
            else{
                Follows.getUserFollowData((err , resp) =>{            
                    if(err || !resp){
                        buildfire.appData.search({filter : {$and:[{$or: tempArray},{"$json.createdOn":{$lt:new Date(),$gt:new Date(options.lastPostDate)}}]} , skip : options?.skip ||  0 , limit : options?.limit || 6 ,page: options?.page || 0, pageSize: options?.pageSize, sort:options?.sort ? options.sort : {createdOn : -1}} , Posts.TAG , (e , r) =>{
                            e ? callback(e , null) : callback(null , r)
                        })
                    }
                    resp?.followedUsers && resp.followedUsers.forEach(id => tempArray.push({"_buildfire.index.array1.string1" : `userId_${id}`}));
                    resp?.followedPlugins && resp.followedPlugins.forEach(id => tempArray.push({"_buildfire.index.array1.string1" : `pluginId_${id}`.toLowerCase()}));
                    buildfire.appData.search({filter : {$and:[{$or: tempArray},{"$json.createdOn":{$lt:new Date(),$gt:new Date(options.lastPostDate)}}]} , skip : options?.skip || 0 , limit : options?.limit || 6 ,page: options?.page || 0, pageSize: options?.pageSize, sort:options?.sort ? options.sort : {createdOn : -1}} , Posts.TAG , (e , r) =>{
                        e ? callback(e , null) : callback(null , r)
                    })
                })
            }        
        });
    }


    static updatePost = (id , post , callback) =>{
        if(!id) return callback({code:errorsList.ERROR_400,message:"id cannot be null"});
        if((!post.postText && !post.postImages) ||  post?.postImages && !Array.isArray(post.postImages) || (post?.postImages && Array.isArray(post.postImages) && post.postImages.length == 0)) return callback({code:errorsList.ERROR_400,message:"Must have atleast post text or post images, post images must be an array of atleast one image url"});
        buildfire.auth.getCurrentUser((err, currentUser) => {
            if(err || !currentUser) return callback({code: errorsList.ERROR_401,message:"Must be logged in"});
            buildfire.appData.getById(id , Posts.TAG , (e , r) => {
                if(e) return callback({code:errorsList.ERROR_404,message:"Couldn't find matching data"});
                else if(!r || !r?.data) return callback({code:errorsList.ERROR_404,message:"Couldn't find matching data"});
                else if(r.data.userId != currentUser._id) callback({code: errorsList.ERROR_402, message: "You are not authorized to modify this post"});
                else {
                    buildfire.appData.update( id, {...r.data , postText : post?.postText || "", postImages : post?.postImages || [] , isPublic : post?.isPublic || false}, Posts.TAG, (e , r) => {
                        if(e) return callback({code:errorsList.ERROR_400,message:e});
                        Analytics.trackAction("post-updated");
                        callback(null , r);
                        // buildfire.analytics.trackAction(analyticKeys.POST_postD.key);
                    });
                }
            })


        })

    }

    static searchPublicPosts = (options, callback) =>{
        console.log(options);
        let title = options.displayName;
        if(!title) title = "";
        console.log(title);
        buildfire.appData.search({
            filter : {
                $and:[{"_buildfire.index.array1.string1":`isPublic_1`},{"_buildfire.index.array1.string1" : {"$regex":`displayName_(.|\n)*?${title.toLowerCase()}`}}]
            } , 
            skip : options?.skip  || 0 , 
            limit : options?.limit || 10 ,
            page: options?.page || 0, 
            pageSize: options?.pageSize || 10, 
            sort: options?.sort && Object.keys(options.sort).length > 0 ? options.sort :{createdOn : -1}
        }
        , Posts.TAG, (err, r) =>{
            console.log(err);
            console.log(r);
            if(err) return callback({code:errorsList.ERROR_404,message:"Couldn't find matching data"})
            else return callback(null, r)
        })
    }

    static updatePublicPost = (id , post , callback) =>{
        if(!id) return callback({code:errorsList.ERROR_400,message:"id cannot be null"});
        if(!post?.postTitle || !post?.postText) return callback({code:errorsList.ERROR_400,message:"Must have post title and description"});
        buildfire.appData.getById(id , Posts.TAG , (e , r) => {
            if(e) return callback({code:errorsList.ERROR_404,message:"Couldn't find matching data"});
            else if(!r || !r?.data) return callback({code:errorsList.ERROR_404,message:"Couldn't find matching data"});
            else {
                buildfire.appData.update( id, {...r.data , postText : post.postText, displayName: post.postTitle}, Posts.TAG, (e , r) => {
                    if(e) return callback({code:errorsList.ERROR_400,message:e});
                    Analytics.trackAction("post-updated");
                    callback(null , r);
                    // buildfire.analytics.trackAction(analyticKeys.POST_postD.key);
                });
            }
        })

    }

    static getById = (id, callback) =>{
        buildfire.appData.getById(id , Posts.TAG , (e , r) => {
            if(e || !r) return console.error(e);
            else return callback(null,r);
        });
    }

    static buildIndex = data => {
        const index = {
            array1 : [
                {string1 : 'userId_' + data.userId},
                {string1 : 'displayName_' + data.displayName.toLowerCase()},
                {string1 : 'pluginId_' + data.pluginInstanceId.toLowerCase()},
                {string1 : 'pluginTitle_' + data.pluginTitle.toLowerCase()},
                {string1 : 'isPublic_'+ data.isPublic}
            ]
        }
        return index;
    }

}