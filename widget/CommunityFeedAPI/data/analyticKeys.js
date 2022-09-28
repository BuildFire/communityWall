const analyticKeys = Object.freeze({ 
    POST_ADDED: { 
        title: 'New post added', 
        key: 'post-added', 
        description: 'A new post has been added', 
    }, 
    POST_DELETED: { 
        title: 'New post deleted', 
        key: 'post-deleted', 
        description: 'A post has been deleted', 
    }, 
    POST_UPDATED: { 
        title: 'New post updated', 
        key: 'post-updated', 
        description: 'A post has been updated', 
    },
    POST_LIKED: { 
        title: 'New post liked',  
        key: 'post-liked',  
        description: 'A post has been liked', 
    },
    POST_REPORTED: { 
        title: 'New post reported',   
        key: 'post-reported',   
        description: 'A post has been reported',  
    },
    POST_COMMENTED: { 
        title: 'New post commented',   
        key: 'post-commented',   
        description: 'A post has been commented',  
    },
    
});


const Analytics = {
    trackView: (eventName, metaData) => {
      if (eventName) return buildfire.analytics.trackView(eventName, metaData);
    },
    trackAction: (eventName, metaData) => {
      if (eventName) return buildfire.analytics.trackAction(eventName, metaData);
    },
    registerEvent: (event, options, callback) => {
      if (event.title && event.key) {
        let _options = options.silentNotification || true;
        buildfire.analytics.registerEvent(event, _options, (err, res) => {
          if (err) return callback(err, null);
          return callback(null, res);
        });
      }
    },
    unregisterEvent: (key, callback) => {
      if (key) {
        buildfire.analytics.unregisterEvent(key, (err, res) => {
          if (err) return callback(err, null);
          return callback(null, res);
        });
      }
    },
    showReports: (options, callback) => {
      if (options.eventKey) {
        buildfire.analytics.showReports(options, (err, res) => {
          if (err) return callback(err, null);
          return callback(null, res);
        });
      }
    },
  
    init: () => {
      Analytics.registerEvent(
       analyticKeys.POST_ADDED,
        { silentNotification: false },
        (err, res) => {
          if (err) console.error(err);
          else return res;
        }
      );
  
      Analytics.registerEvent(
       analyticKeys.POST_DELETED,
        { silentNotification: false },
        (err, res) => {
          if (err) console.error(err);
          else console.log("from analytics",res);;
        }
      );
  
      Analytics.registerEvent(
        analyticKeys.POST_UPDATED,
        { silentNotification: false },
        (err, res) => {
          if (err) console.error(err);
          else return res;
        }
      );
  
      Analytics.registerEvent(
        analyticKeys.POST_LIKED,
        { silentNotification: false },
        (err, res) => {
          if (err) console.error(err);
          else return res;
        }
      );

      Analytics.registerEvent(
        analyticKeys.POST_COMMENTED,
        { silentNotification: false },
        (err, res) => {
          if (err) console.error(err);
          else return res;
        }
      );

      Analytics.registerEvent(
        analyticKeys.POST_REPORTED,
        { silentNotification: false },
        (err, res) => {
          if (err) console.error(err);
          else return res;
        }
      );
    },
  };
  