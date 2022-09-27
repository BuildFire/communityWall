class SearchTableHelper {

  constructor(tableId, config, loading, headTable) {
    if (!config) throw "No config provided";
    if (!tableId) throw "No tableId provided";
    this.table = document.getElementById(tableId);
    if (!this.table) throw "Cant find table with ID that was provided";

    if (!loading) throw "No loading provided";
    this.loading = document.getElementById(loading);
    if (!this.loading)
      throw "Cant find loading with ID that was provided";

    if (!headTable) throw "No loading provided";
    this.headTable = document.getElementById(headTable);
    if (!this.headTable)
      throw "Cant find loading with ID that was provided";

    this.config = config;
    this.sort = {};
    this.commands = {};
    this.init();
  }

  init() {
    this.table.innerHTML = "";
    this.table.classList.add("hidden");
    this.headTable.classList.add("hidden");
    this.renderHeader();
    this.renderBody();
  }

  renderHeader() {
    if (!this.config.columns) throw "No columns are indicated in the config";
    this.thead = this.createElement("thead", this.table, "", ["hidden"]);
    this.config.columns.forEach((colConfig) => {
      let classes = ["headerCell"];
      if (colConfig.type == "date") classes.push("text-center");
      else if (colConfig.type == "number") classes.push("text-right");
      else classes.push("text-left");
      let th = this.createElement("th", this.thead, "", ["headerPadding"]);
      let h5 = this.createElement("h5", th, colConfig.header + " ", classes);

      colConfig.header;
      if (colConfig.sortBy) {
        const icon = this.createElement("span", h5, "", [
          "icon",
          "icon-chevron-down",
        ]);
        const _t = this;
        th.addEventListener("click", function () {
          if (_t.sort[colConfig.sortBy] && _t.sort[colConfig.sortBy] > 0) {
            _t.sort = {
              [colConfig.sortBy]: -1,
            };
            icon.classList.remove("icon-chevron-up");
            icon.classList.add("icon-chevron-down");
          } else {
            _t.sort = {
              [colConfig.sortBy]: 1,
            };
            icon.classList.remove("icon-chevron-down");
            icon.classList.add("icon-chevron-up");
          }
          _t._fetchPageOfData();
        });
      }

      if (colConfig.width)
        th.style.width = colConfig.width;
    });
    if (
      this.config.options.showEditButton ||
      this.config.options.showDeleteButton
    )
      this.createElement("th", this.thead, "", ["editColumn"]);
  }

  renderBody() {
    this.tbody = this.createElement("tbody", this.table);
    let t = this;
    this.tbody.onscroll = (e) => {
      if (t.tbody.scrollTop / t.tbody.scrollHeight > 0.8) t._fetchNextPage();
    };
  }

  search(filter) {
    this.tbody.innerHTML = "";
    this.table.classList.add("hidden");
    this.headTable.classList.remove("hidden");
    this.loading.classList.remove("hidden");
    this.filter = filter;
    this._fetchPageOfData(this.filter, 0);
  }

  _fetchNextPage() {
    if (this.fetchingNextPage) return;
    this.fetchingNextPage = true;
    let t = this;
    this._fetchPageOfData(this.filter, this.pageIndex + 1, () => {
      t.fetchingNextPage = false;
    });
  }

  _fetchPageOfData(filter, pageIndex, callback) {
    if (pageIndex > 0 && this.endReached) return;
    let pageSize = 50;
    this.pageIndex = pageIndex;

    let searchFilter = {
      $and: [{
          "_buildfire.index.string1": ""
        },
        {
          "$json.userDetails.hasAllowChat": true,
        }
      ]
    }

    if (filter) {
      searchFilter = filter;
    }

    let options = {
      filter: searchFilter,
      page: pageIndex,
      pageSize: pageSize,
    };


    this.searchOptions = options;

    let t = this;
    window.buildfire.publicData.search(this.searchOptions, 'subscribedUsersData', function (err, data) {
      if (err) console.error(err);
      else if (data && data.length > 0) {
        t.productsLength = data.length;
        t.loading.classList.add("hidden");
        t.table.classList.remove("hidden");
        t.headTable.classList.remove("hidden");
        t.tbody.innerHTML = "";
        data.forEach((p) => t.renderRow(p));
        t.endReached = data.length < pageSize;
      } else {
        t.tbody.innerHTML = "";
        t.loading.classList.add("hidden");
        t.headTable.classList.add("hidden");
      }
    })
  }

  _onCommand(obj, tr, command) {
    if (this.commands[command]) {
      this.commands[command](obj, tr);
    } else {
      console.log(`Command ${command} does not have any handler`);
    }
  }

  createElement(elementType, appendTo, innerHTML, classNameArray) {
    let e = document.createElement(elementType);
    if (innerHTML) e.innerHTML = innerHTML;
    if (Array.isArray(classNameArray))
      classNameArray.forEach((c) => e.classList.add(c));
    if (appendTo) appendTo.appendChild(e);
    return e;
  }

  renderRow(obj, tr) {
    if (tr)
      //used to update a row
      tr.innerHTML = "";
    else tr = this.createElement("tr", this.tbody);
    tr.setAttribute("objId", obj.id);
    this.config.columns.forEach((colConfig) => {
      let classes = [];
      if (colConfig.type == "date") classes = ["text-center"];
      else if (colConfig.type == "number") classes = ["text-right"];
      else if (colConfig.type == "Image") {} else classes = ["text-left"];
      var td;
      if (colConfig.type == "command") {
        td = this.createElement(
          "td",
          tr,
          '<button class="btn btn-link">' + colConfig.text + "</button>",
          ["editColumn"]
        );
        td.onclick = (event) => {
          event.preventDefault();
          this._onCommand(obj, tr, colConfig.command);
        };
      } else if (colConfig.type == "Image") {
        try {
          classes.push("tdImageSize");
          td = this.createElement("td", tr, output, classes);
          var cellDiv = this.createElement("div", td, "", [
            "img-holder",
            "aspect-1-1",
          ]);
          var cellImg = this.createElement("img", cellDiv, "", ["imgStyle", "imgBorder"]);
          var data = obj.data;
          cellImg.src = eval("`" + colConfig.data + "`");
        } catch (error) {
          console.log(error);
        }
      } else {
        var output = "";
        try {
          ///needed for the eval statement next
          var data = obj.data;
          output = eval("`" + colConfig.data + "`");
        } catch (error) {
          console.log(error);
        }
        if (colConfig.header == "Title") {
          classes.push("pointer");
          classes.push("colBlack");
        } else {
          classes.push("colBlack");
        }
        td = this.createElement("td", tr, output, classes);
        if (colConfig.header == "Title") {
          td.onclick = () => {
            t.onEditRow(obj, tr);
          };
        }
      }

      if (colConfig.width)
        td.style.width = colConfig.width;
    });

    let t = this;

    if (
      this.config.options.showAnalyticsButton ||
      this.config.options.showEditButton ||
      this.config.options.showDeleteButton
    ) {
      let td = this.createElement("td", tr, "", ["editColumn"]);
      let div = this.createElement("div", td, "", ["pull-right"]);
      if (this.config.options.showAnalyticsButton) {
        let btn = this.createElement("button", div, "", ["btn", "bf-btn-icon", "custom-background"]);
        btn.onclick = () => {
          t.onAnalyticsClicked(obj, tr);
        };
        let span = this.createElement("span", btn, "", ["icon", "icon-chart-growth"]);
      }
      if (this.config.options.showEditButton) {
        let btn = this.createElement("button", div, "", ["btn", "bf-btn-icon", "custom-background"]);
        btn.onclick = () => {
          t.onEditRow(obj, tr);
        };
        let span = this.createElement("span", btn, "", ["icon", "icon-pencil"]);
      }
      if (this.config.options.showDeleteButton) {
        let btn = this.createElement("button", div, "", ["btn", "bf-btn-icon", "custom-background", "customWidth"]);
        let span = this.createElement("span", btn, "", ["icon", "icon-cross2", "biggerIcon"]);
        btn.onclick = () => {
          buildfire.dialog.confirm({
              title: "Remove User",
              message: "Are you sure you want to remove chat availability for " + (obj.data.userDetails.displayName ? obj.data.userDetails.displayName : (obj.data.userDetails.firstName + ' ' + obj.data.userDetails.lastName)) + " ?",
              confirmButton: {
                text: "Remove User",
                type: "warning",
              },
            },
            (err, isConfirmed) => {
              if (err) console.error(err);

              if (isConfirmed) {
                //Go back
                tr.classList.add("hidden");
                obj.data.userDetails.hasAllowChat = false;
                window.buildfire.publicData.update(obj.id, obj.data, 'subscribedUsersData', function (err, res2) {
                  if (err) tr.classList.remove("hidden");
                  else
                    t.onRowDeleted(obj, tr)
                });
              } else {
                //Prevent action
              }
            }
          );
        };
      }
    }
    this.onRowAdded(obj, tr);
  }

  onSearchSet(options) {
    return options;
  }

  onRowAdded(obj, tr) {}

  onEditRow(obj, tr) {}

  onAnalyticsClicked(obj, tr) {
    buildfire.navigation.navigateToTab({
        tabTitle: "Analytics"
      },
      (err) => {
        if (err) return console.error(err);

        buildfire.analytics.showReports({
          eventKey: obj.id
        }, (err, result) => {
          console.log(err)
          console.log(result)
        });
      }
    );
  }

  onRowDeleted(obj, tr) {
    this.productsLength -= 1;
    if (this.productsLength == 0) {
      this.table.classList.add("hidden");
      this.headTable.classList.add("hidden");
    }
  }
}