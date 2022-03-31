class SearchTableHelper {
	constructor(tableId, tag, config, sort = {}) {
		if (!config) throw "No config provided";
		if (!tableId) throw "No tableId provided";
		this.table = document.getElementById(tableId);
		if (!this.table) throw "Cant find table with ID that was provided";
        this.parent = this.table.parentElement;
		this.config = config;
		this.tag = tag;
		this.sort = sort;
		this.commands = {};
		this.items = [];
		this.init();
	}
	
	init() {
		this.table.innerHTML = "";
		if(this.config.options.showHeaders)
			this.renderHeader();
        if(this.config.options.allowSearch)
            this.renderSearch();
        this.renderBody();
	}

    renderSearch(){
        let searchContainer = this._create("div",null,"",["search_input_container"]);
        let input = this._createInput(`${this.tag}_search`,`Search Hashtags`);
        let searchButton = this._createSearchButton();
        searchContainer.appendChild(input);
        searchContainer.appendChild(searchButton)
        this.parent.prepend(searchContainer)
    }

    _createSearchButton(){
        let btn = document.createElement("button");
		let x = this;
		btn.onclick = () =>{
			let filter = {
				"_buildfire.index.array1.string1":{"$regex":"name_"+document.getElementById(`${this.tag}_search`).value, "$options":"i"}
			}
			x.endReached = false;
			x.pageIndex = 0;
			x.fetchingNextPage = false;
			x.search(filter, x.sort);
		}
        btn.style.background = "black";
        btn.style.display = "flex";
        btn.style.alignItems = "center";
        btn.style.justifyContent = "center";
        btn.style.borderTopRightRadius = "7px"
        btn.style.borderBottomRightRadius = "7px";
        btn.style.flex = "0.3"
        btn.innerHTML = '<span style="color:white;font-size:25px !important" class="material-icons-outlined">search</span>';
        return btn;
    }

    _createInput(id, placeholder){
        let e = document.createElement("input");
        e.placeholder = placeholder;
        e.id = id;
        e.classList.add("search_input");
        return e;
    }

	renderHeader() {
		if (!this.config.columns) throw "No columns are indicated in the config";
		this.thead = this._create('thead', this.table);
		this.config.columns.forEach(colConfig => {
			let classes = [];
			if (colConfig.type == "date")
				classes = ["text-left"];
			else if (colConfig.type == "number")
				classes = ["text-right"];
			else classes = ["text-left"];
			let th = this._create('th', this.thead, colConfig.header, classes);
			if (colConfig.sortBy) {
				const icon = colConfig.type === 'date' ?
				 this._create('span', th, "", ['icon', 'icon-chevron-down'])
				 : this._create('span', th, "", [])
				const _t = this;
				th.addEventListener('click', function () {
					if (_t.sort[colConfig.sortBy] && _t.sort[colConfig.sortBy] > 0) {
						_t.sort = { [colConfig.sortBy]: -1 };
						_t.items.sort(function(a,b){
							return new Date(a.reportedAt) - new Date(b.reportedAt);
						});
						icon.classList.remove('icon-chevron-up');
						icon.classList.add('icon-chevron-down');
					}
					else {
						_t.sort = { [colConfig.sortBy]: 1 };
						_t.items.sort(function(a,b){
							return new Date(b.reportedAt) - new Date(a.reportedAt);
						});
						icon.classList.remove('icon-chevron-down');
						icon.classList.add('icon-chevron-up');
					}
					_t.tbody.innerHTML = '';
					_t.items.map(r=> _t.renderRow({data:r}))
				});
			}
			if (colConfig.width)
				th.style.width = colConfig.width;
		});

		if (this.config.options.showEditButton)
			this._create('th', this.thead, "Ban", ["editColumn"]);

		if (this.config.options.showDeleteButton)
			this._create('th', this.thead, "Delete", ["deleteColumn"]);
	}

	renderBody() {
		this.tbody = this._create("tbody", this.table);
		let t = this;
		this.tbody.onscroll = e => {
			if (t.tbody.scrollTop / t.tbody.scrollHeight > 0.8)
				t._fetchNextPage();
		};
	}

	search(filter, sort) {
		this.tbody.innerHTML = `<div class="padded">
			<div class="empty-state">
				<h4 class="text-center" style="font-size:16px; line-height:22px;">Loading...</h4>
			</div>
		</div>
			`;
		// this._create('tr', this.tbody, '<td colspan="99"> searching...</td>', ["loadingRow"]);
		this.items = [];
		this.filter = filter;
		this.sort = sort;
		console.log("passed sort: " + sort);
		console.log(sort);
		console.log("setting this.sort to: " + this.sort);
		console.log(this.sort);
		this._fetchPageOfData(this.filter, this.sort, 0);
	}

	_fetchNextPage() {
		if (this.fetchingNextPage) return;
		this.fetchingNextPage = true;
		let t = this;
		this._fetchPageOfData(this.filter, this.sort, this.pageIndex + 1, () => {
			t.fetchingNextPage = false;
		});
	}

	_fetchPageOfData(filter, sort, pageIndex, callback) {
		console.log("from fetch page of data");
		console.log(sort);
		if (pageIndex > 0 && this.endReached) return;
		let pageSize = 50;
		this.pageIndex = pageIndex;
		let options = {
			filter: filter
			, sort: sort ? sort : {createdOn: -1}
			, page: pageIndex
			, pageSize: pageSize
		};

		this.searchOptions = options;
		buildfire.appData.search(options, this.tag, (e, results) => {
			if (e && callback) return callback(e);
            if(!this.items.length) this.tbody.innerHTML = '';
			if((results && results.length > 0)){
				this.endReached = results.length < pageSize;
				this.endReached = results && results.length ? results.length < pageSize : true;
				this.tbody.classList.remove('text-center', 'padded')
				this.items.push(...results);
				results.forEach(r => this.renderRow(r))
			} else {
                
				this.tbody.classList.add('text-center', 'padded')
				// this.tbody.innerHTML = 'No results.';
				this.tbody.innerHTML = `<div class="empty-state">
				<h4 class="text-center" style="font-size:16px; line-height:22px;">No Results</h4>
				<br>
			</div>`;
			}
			if (callback) callback();
		});
	}

	_onCommand(obj, tr, command) {
		if (this.commands[command]) {
			this.commands[command](obj, tr)
		} else {
		}
	}

	renderRow(obj, tr, atStart = false) {
		if (tr) //used to update a row
			tr.innerHTML = '';
		else
			tr = this._create('tr');
			if(atStart) this.tbody.prepend(tr);
			else this.tbody.appendChild(tr);
		tr.setAttribute("objId", obj.id);
		this.config.columns.forEach(colConfig => {
			let classes = ["text-left","hashtag_row"];
            var td;
			if (colConfig.type == "command") {
				td = this._create('td', tr, '<button class="btn btn-link">' + colConfig.data + '</button>', ["editColumn"]);
				td.onclick = (event) => {
					event.preventDefault();
					this._onCommand(obj, tr, colConfig.command);
				};
			} else {
				var output = ""
				try {
					///needed for the eval statement next
					var data = obj.data;
					output = eval("`" + colConfig.data + "`");
				} catch (error) {
				}
				td = this._create('td', tr, `#${output}`, classes);
				if(colConfig.command) {
					td.onclick = (event) => {
						event.preventDefault();
						this._onCommand(obj, tr, colConfig.command);
					};
				}
			}
			if (colConfig.width)
				td.style.width = colConfig.width;

		});

		let t = this;
		if (this.config.options.showEditButton) {
			let td = this._create('td', tr, '<button class="btn btn--icon"><span class="icon icon-pencil3"></span></button>', ["editColumn"]);
			td.onclick = () => {
				t.onEditRow(obj, tr);
			};
		}

		if (this.config.options.showDeleteButton) {
			let td = this._create('td', tr, '<button class="btn btn--icon"><span class="icon icon-cross2"></span></button>', ["editColumn","force-padding-td"]);
			td.onclick = () => {
				buildfire.notifications.confirm({
					title: "Delete Hashtag"
					, message: "Are you sure you want to delete this hashtag?"
					, confirmButton: { text: 'Delete', key: 'yes', type: 'danger' }
					, cancelButton: { text: 'Cancel', key: 'no', type: 'default' }
				}, function (e, data) {

					if (data.selectedButton.key == "yes") {
						tr.classList.add("hidden");
						buildfire.appData.delete(obj.id, t.tag, e => {
							if (e)
								tr.classList.remove("hidden");
							else
								t.onRowDeleted(obj, tr);
						});

					}
				});

			};
		}
		this.onRowAdded(obj, tr);
	}

	onSearchSet(options) {
		return options;
	}
	onRowAdded(obj, tr) { }

	onEditRow(obj, tr) {
	}

	onRowDeleted(obj, tr) {
	}

	onCommand(command, cb) {
		this.commands[command] = cb;
	}

	_create(elementType, appendTo, innerHTML, classNameArray) {
		let e = document.createElement(elementType);
		if (innerHTML) e.innerHTML = innerHTML;
		if (Array.isArray(classNameArray))
			classNameArray.forEach(c => e.classList.add(c));
		if (appendTo) appendTo.appendChild(e);
		return e;
	}


}