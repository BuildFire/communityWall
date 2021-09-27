// PLEASE IMPORT BUILDFIRE.JS BEFORE ATTEMPTING TO EXECUTE ANY FUNCTION
if (typeof buildfire === "undefined")
  throw "Please add buildfire.js first to use BuildFire services";

class Follow {
  constructor(data = {}) {
    this.isActive = data.isActive || true;
    this.createdOn = data.createdOn || new Date();
    this.createdBy = data.createdBy || null;
    this.lastUpdatedOn = data.lastUpdatedOn || null;
    this.lastUpdatedBy = data.lastUpdatedBy || null;
    this.deletedOn = data.deletedOn || null;
    this.deletedBy = data.deletedBy || null;
    this.userId = data.userId || null;
    this.followedUsers = data.followedUsers || [];
    this.followedPlugins = data.followedPlugins || [];
    this._buildfire = data._buildfire || {};
  }
}

class Follows {
  static TAG = "follows";

  static createFollowData = (user, fUser, fPlugin) => {
    let data = {
      userId: user._id,
      _buildfire: { index: Follows.buildIndex(user._id) },
    };
    if (user && fUser)
      return new Follow({
        ...data,
        followedUsers: [fUser],
        _buildfire: { index: Follows.buildIndex(user._id) },
      });
    else if (user && !fUser && fPlugin)
      return new Follow({
        ...data,
        followedPlugins: [fPlugin],
        _buildfire: { index: Follows.buildIndex(user._id) },
      });
    else return "error missing arguments";
  };

  static followUser = (fUserId, callback) =>{
    if(!fUserId) return callback("User ID cannot be null");
    buildfire.auth.getCurrentUser((e,currentUser) => {
      if(e || !currentUser) return callback("Must be logged in");
      buildfire.appData.search({ filter: { "_buildfire.index.string1": currentUser._id } },Follows.TAG, (e,r) =>{
        if(e) console.log(e);
        console.log(r);
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
      if(e || !currentUser) return callback("Must be logged in");
      buildfire.appData.search({ filter: { "_buildfire.index.string1": currentUser._id } },Follows.TAG, (e,r) =>{
        if(e) console.log(e);
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

  static followPlugin = (callback) =>{
    buildfire.auth.getCurrentUser((e, currentUser) => {
      if(e || !currentUser) return callback("Must be logged in to follow a plugin");
      buildfire.getContext((err, context) => {
        if(err || !context) return callback("An error occured while getting app context data");
        let instanceId = context.instanceId;
        buildfire.appData.search({filter: { "_buildfire.index.string1": currentUser._id }},Follows.TAG , (err,r) =>{
          if(e || !r) return callback("An error occured");
          else if(r.length == 0){
            buildfire.appData.insert(Follows.createFollowData(currentUser,null,instanceId),Follows.TAG,(e, r) => {
                if (e) return callback(e);
                else return callback(null, r);
            });
          }
          else if(r[0]?.data?.followedPlugins.findIndex((e) => e == instanceId) >= 0) return callback("Already following this plugin");
          else{
            buildfire.appData.update(r[0].id,{...r[0].data, followedPlugins: [...r[0].data.followedPlugins, instanceId]}, Follows.TAG, (e, r) => {
                if (e) return callback(e);
                callback(null, r);
            });
          }
        })
      })
    })
  }

  static unfollowPlugin = (callback) =>{
    buildfire.auth.getCurrentUser((err, currentUser) => {
      if(err || !currentUser) return callback("Must be logged in");
      buildfire.getContext((err, context) => {
        if(err || !context) return callback("An error occured while getting app context data");
        let instanceId = context.instanceId;
        buildfire.appData.search({filter: { "_buildfire.index.string1": currentUser._id }},Follows.TAG , (e,r) =>{
          if (e || !r) return callback(e);
          else if (r.length == 0) return callback("You are not following this plugin");
          let obj = { ...r[0].data };
          let index = obj.followedPlugins.findIndex((e) => e == instanceId);
          if (index >= 0) {
            obj.followedPlugins.splice(index, 1);
            buildfire.appData.update(r[0].id, obj, Follows.TAG, (e, r) => {
              if (e) return callback(e);
              callback(r);
            });
          } 
          else return callback("You are not following this plugin");
        })
      })
    })
  }

  static isFollowingUser = (userId, callback) => {
    if(!userId) return callback("User ID cannot be null");
    buildfire.auth.getCurrentUser((e,currentUser) => {
      if(e || !currentUser) return callback("Error while getting current user");
      buildfire.auth.getUserProfile({userId}, (err , user) =>{
        if(err || !user) return callback("Couldn't find user");
        buildfire.appData.search({ filter: { "_buildfire.index.string1": currentUser._id }}, Follows.TAG, (e,r) => {
          if(e || !r) return callback("An error occured");
          else if(r && r.length == 0) return callback("Not following user");
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
      if(e || !currentUser) return callback("Error while getting current user");
        if(err || !user) return callback("Couldn't find user");
        buildfire.appData.search({ filter: { "_buildfire.index.string1": currentUser._id }}, Follows.TAG, (e,r) => {
          if(e || !r) return callback("An error occured");
          else if(r && r.length == 0) return callback("Not following user");
          else{
            let index = r[0].data.followedPlugins.findIndex((e) => e == pluginId);
            if (index < 0) return callback("Not following this user");
            else return callback(null, true);
          }
        })
    })
    
  }

  static getUserFollowData = (callback) => {
    if (!authManager.currentUser) return callback("Must be logged in");
    buildfire.appData.search(
      { filter: { "_buildfire.index.string1": authManager.currentUser._id } },
      Follows.TAG,
      (e, r) => {
        if (e) return callback(e);
        else if (!r || r.length == 0) return callback(r);
        else return callback(null, new Follow(r[0].data));
      }
    );
  };

  static buildIndex = (userId) => {
    const index = {
      string1: userId,
    };
    return index;
  };

}
