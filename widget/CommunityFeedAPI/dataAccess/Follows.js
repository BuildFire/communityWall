class Follows {
  static TAG = "follows";

  
  static createFollowData = (user, fUser, fPlugin) => {
    let data = {userId: user._id,_buildfire: { index: Follows.buildIndex(user._id) }};
    if (user && fUser) return new Follow({...data, followedUsers: [fUser], _buildfire: { index: Follows.buildIndex(user._id) },});
    else if (user && !fUser && fPlugin) return new Follow({ ...data, followedPlugins: [fPlugin], _buildfire: { index: Follows.buildIndex(user._id) },});
    else return "error missing arguments";
  };


  static followUser = (fUserId, callback) => {
    if(!fUserId) return callback("User ID cannot be null");
    buildfire.auth.getCurrentUser((e,currentUser) => {
      if(e || !currentUser) return callback({code: errorsList.ERROR_401, message: "Must be logged in"});
      else if(currentUser._id === fUserId) return callback("You cannot follow yourself")
      buildfire.appData.search({ filter: { "_buildfire.index.string1": currentUser._id } },Follows.TAG, (e,r) =>{
        if(e) return callback(e);
        if(r.length == 0) {
          buildfire.appData.insert(Follows.createFollowData(currentUser, fUserId), Follows.TAG, (e, r) => {
            if (e) return callback(e, null);
            else return callback(null, r);
          });
        } else {
          if(r[0].data.followedUsers.findIndex(e => e == fUserId) >= 0) return callback("Already following this user");
          buildfire.appData.update(r[0].id, {...r[0].data,followedUsers: [...r[0].data.followedUsers, fUserId] }, Follows.TAG, (e, r) =>{
              if (e) return callback(e);
              callback(null, r);
          });
        }
      })
    })
  }

  static unfollowUser = (fUserId, callback) =>{
    if(!fUserId) return callback("User ID cannot be null");
    buildfire.auth.getCurrentUser((e,currentUser) => {
      if(e || !currentUser) return callback({code: errorsList.ERROR_401, message: "Must be logged in"});
      buildfire.appData.search({ filter: { "_buildfire.index.string1": currentUser._id } },Follows.TAG, (e,r) =>{
        if(e) return callback(e);
        if(r.length == 0) return callback("Not following this user");
        else {
          let index = r[0].data.followedUsers.findIndex(e => e == fUserId);
          if(index < 0) return callback("Not following this user");
          let newFollowedUsers = [...r[0].data.followedUsers];
          newFollowedUsers.splice(index,1);
          buildfire.appData.update(r[0].id, {...r[0].data,followedUsers: newFollowedUsers }, Follows.TAG, (e, r) =>{
              if (e) return callback(e);
              callback(null, r);
          });
        }
      })
    })
  }

  static getUserFollowData = (callback) => {
    buildfire.auth.getCurrentUser((err, currentUser) =>{
        if(err || !currentUser) return callback({code: errorsList.ERROR_401, message: "Must be logged in"});
        buildfire.appData.search({ filter: { "_buildfire.index.string1": currentUser._id }}, Follows.TAG, (e, r) => {
            if (e) return callback(e);
            else if (!r || r.length == 0) return callback(r);
            else return callback(null, new Follow(r[0].data));
        });
    })
  };

  static followPlugin = (callback) =>{
    buildfire.auth.getCurrentUser((e, currentUser) => {
      if(e || !currentUser) return callback({code: errorsList.ERROR_401, message: "Must be logged in"});
      buildfire.getContext((err, context) => {
        if(err || !context) return callback("An error occured while getting app context data");
        let instanceId = context.instanceId;
        buildfire.appData.search({filter: { "_buildfire.index.string1": currentUser._id }},Follows.TAG , (err,r) =>{
          if(e || !r) return callback({code: errorsList.ERROR_404, message: "Couldn't find matching data"});
          else if(r.length == 0){
            buildfire.appData.insert(Follows.createFollowData(currentUser,null,instanceId),Follows.TAG,(e, r) => {
                if (e) return callback(e);
                else return callback(null, r);
            });
          }
          else if(r[0]?.data?.followedPlugins.findIndex((e) => e == instanceId) >= 0) return callback("Already following this plugin");
          else{
            buildfire.appData.update(r[0].id,{...r[0].data, followedPlugins: [...r[0].data.followedPlugins, instanceId]}, Follows.TAG, (e, r) => {
                if (e) return callback({code: errorsList.ERROR_404, message: "Couldn't find matching data"});
                callback(null, r);
            });
          }
        })
      })
    })
  }

  static unfollowPlugin = (callback) =>{
    buildfire.auth.getCurrentUser((err, currentUser) => {
      if(err || !currentUser) return callback({code: errorsList.ERROR_401, message: "Must be logged in"});
      buildfire.getContext((err, context) => {
        if(err || !context) return callback("An error occured while getting app context data");
        let instanceId = context.instanceId;
        buildfire.appData.search({filter: { "_buildfire.index.string1": currentUser._id }},Follows.TAG , (e,r) =>{
          if (e || !r) return callback({code: errorsList.ERROR_404, message: "Couldn't find matching data"});
          else if (r.length == 0) return callback(null, false);
          let obj = { ...r[0].data };
          let index = obj.followedPlugins.findIndex((e) => e == instanceId);
          if (index >= 0) {
            obj.followedPlugins.splice(index, 1);
            buildfire.appData.update(r[0].id, obj, Follows.TAG, (e, r) => {
              if (e) return callback({code: errorsList.ERROR_404, message: "Couldn't find matching data"});
              callback(r);
            });
          } 
          else return callback(null, false);
        })
      })
    })
  }

  static isFollowingUser = (userId, callback) => {
    if(!userId) return callback("User ID cannot be null");
    buildfire.auth.getCurrentUser((e,currentUser) => {
      if(e || !currentUser) return callback({code: errorsList.ERROR_401, message: "Must be logged in"});
      buildfire.auth.getUserProfile({userId}, (err , user) =>{
        if(err || !user) return callback({code: errorsList.ERROR_404, message: "Couldn't find matching data"});
        buildfire.appData.search({ filter: { "_buildfire.index.string1": currentUser._id }}, Follows.TAG, (e,r) => {
          if(e || !r) return callback({code: errorsList.ERROR_404, message: "Couldn't find matching data"});
          else if(r && r.length == 0) return callback(null,false);
          else{
            let index = r[0].data.followedUsers.findIndex((e) => e == userId);
            if (index < 0) return callback("Not following this user");
            else return callback(null, true);
          }
        })
      })
    })
  }
  
  static isFollowingPlugin = (pluginId) =>{
    if(!pluginId) return callback("User ID cannot be null");
    buildfire.auth.getCurrentUser((e,currentUser) => {
      if(e || !currentUser) return callback({code: errorsList.ERROR_401, message: "Must be logged in"});
        if(err || !user) return callback({code: errorsList.ERROR_404, message: "Couldn't find matching data"});
        buildfire.appData.search({ filter: { "_buildfire.index.string1": currentUser._id }}, Follows.TAG, (e,r) => {
          if(e || !r) return callback({code: errorsList.ERROR_404, message: "Couldn't find matching data"});
          else if(r && r.length == 0) return callback(null,false);
          else{
            let index = r[0].data.followedPlugins.findIndex((e) => e == pluginId);
            if (index < 0) return callback("Not following this user");
            else return callback(null, true);
          }
        })
    })
    
  }

  static buildIndex = (userId) => {
    const index = {
      string1: userId,
    };
    return index;
  };
}
