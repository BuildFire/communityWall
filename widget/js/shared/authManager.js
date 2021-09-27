const authManager = {
    
    _currentUser:null,
    get currentUser() {
        return authManager._currentUser;
    },
    set currentUser(user) {
        authManager._currentUser = user; 
    },
    

    getCurrentUser(callback){
        buildfire.auth.getCurrentUser((e , u) =>{
            if(e || !u) authManager.currentUser = null;
            else authManager.currentUser = u;
            return callback(u);
        })
    },

    enforceLogin() {
        buildfire.auth.getCurrentUser((err, user) => {
            if(err) console.log(err);
            if (!user) {
                buildfire.auth.login({ allowCancel: false }, (err, user) => {
                    if (!user)
                         authManager.enforceLogin();
                    else
                        authManager.currentUser = user;
                });
            }
            else
                authManager.currentUser = user;
        });
       
    },


    enforceLoginWithCb(callback){
        buildfire.auth.getCurrentUser((err, user) => {
            if(err) console.log(err);
            if (!user) {
                buildfire.auth.login({ allowCancel: true }, (err, user) => {
                    if (!user)
                        return callback(false);
                    else{
                        authManager.currentUser = user;
                        return callback(true)
                    }
                });
            }
            else{
                authManager.currentUser = user;
                return callback(true)
            }

        });
        
    }

};
buildfire.auth.onLogout(() => {
    authManager.enforceLogin();
});
