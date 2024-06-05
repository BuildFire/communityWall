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
                        Analytics.trackAction("post-deleted");
                        callback(r);
                    })

                })
            })
        })
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