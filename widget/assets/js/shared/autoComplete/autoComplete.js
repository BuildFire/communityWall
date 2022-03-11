'use strict';

if (typeof (buildfire) === 'undefined') {
    throw ('please add buildfire.js first to use auto complete component');
}

if (typeof (buildfire.components) === 'undefined') {
    buildfire.components = {};
}

if (typeof (buildfire.components.autoComplete) === 'undefined') {
    buildfire.components.autoComplete = {};
}

const _injectScript = (cb) => {
    let script = document.getElementById('autoCompleteScript');
    let script2 = document.getElementById('autoCompleteScript2');
    if (script && script2){
        document.head.removeChild(script);
        document.head.removeChild(script2);
    }
    if (!document.head) {
        return cb(new Error('please add head element to the document first to use auto complete component'));
    }
    script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('src', './assets/js/shared/autoComplete/tagify.js');
    script.id = 'autoCompleteScript';

    script2 = document.createElement('script');
    script2.setAttribute('type', 'text/javascript');
    script2.setAttribute('src', './assets/js/shared/autoComplete/tagify.polyfills.min.js');
    script2.id = 'autoCompleteScript2';



    document.head.appendChild(script);
    document.head.appendChild(script2);
    
    script.onload = function () {
      cb();
      console.info('Loaded tagify CDN successfully');
    };
    script.onerror = function () {
      cb(new Error('Failed to load tagify CDN'));
      console.error('Failed to load tagify CDN');
    };
}

  
const _injectCSS = () => {
    if (!document.head) {
      throw new Error('please add head element to the document first to use auto complete component');
    }
    let style = document.getElementById('autoCompleteCSS');
    if (style) document.head.removeChild(style);
  
    style = document.createElement('link');
    style.rel = "stylesheet";
    style.href = "./assets/js/shared/autoComplete/autoComplete.css";
  
    document.head.appendChild(style);
};


buildfire.components.autoComplete = class{
    
    constructor(id, options = {}, delay = 300){
        if(!document.getElementById(id)) return new Error("Please specifiy an input with a correct id");
        this.visible = false;
        this.onInput = (prefix, val) => {};
        this.onItemAdded = (e) =>{}
        this.onItemRemoved = (e) =>{}
        this.loading = false;
        _injectScript((err) =>{
            if(err) return err;
            _injectCSS();
            this.input = document.getElementById(id);
            this.tagify = new Tagify(this.input, options);
            this.tagify.on('input',(e) =>  this.onInput(e));
            this.tagify.on('add',(e) => this.onItemAdded(e));
            this.tagify.on('remove',(e) => this.onItemRemoved(e) );
            this.selectedItems = [];
        })
    }

    updateWhitelist = async(list) =>{
        if(this.tagify){
            this.tagify.whitelist = list.map(item => {
                return {key: item.id, value: item.data.name || item.data.title || item.data.userDetails.displayName || "", data:item.data};
            });;
            this.whitelist = list.map(item => {
                return {key: item.id, value: item.data.name || item.data.title || item.data.userDetails.displayName || "", data:item.data};
            });
        }
        else{
            setTimeout(() => {
                this.updateWhitelist(list);
            }, 500);
        }
    }

    setVisibility = (bool, filter = "") =>{
        if(bool) this.tagify.dropdown.show.call(this.tagify, filter);
        else this.tagify.dropdown.hide();
    }


    setLoading = (bool) =>{
        this.tagify.loading(bool);
    }

} 


