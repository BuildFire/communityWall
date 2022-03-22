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


  


buildfire.components.autoComplete = class{
    
    constructor(id, options = {}, delay = 300){
        if(!document.getElementById(id)) return new Error("Please specifiy an input with a correct id");
        this.visible = false;
        this.onInput = (prefix, val) => {};
        this.onItemAdded = (e) =>{}
        this.onItemRemoved = (e) =>{}
        this.loading = false;
        this.input = document.getElementById(id);
        this.tagify = new Tagify(this.input, options);
        this.tagify.on('input',(e) =>  this.onInput(e));
        this.tagify.on('add',(e) => this.onItemAdded(e));
        this.tagify.on('remove',(e) => this.onItemRemoved(e) );
        this.selectedItems = [];
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


