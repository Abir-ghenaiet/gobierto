import Vue from "vue";
Vue.config.productionTip = false;
import TurbolinksAdapter from "vue-turbolinks";
Vue.use(TurbolinksAdapter);

window.GobiertoPlans.PlanTypesController = (function() {
  function PlanTypesController() {}

  PlanTypesController.prototype.show = function() {
    if (
      $("body")
        .attr("class")
        .indexOf("gobierto_plans_plan_types_show") !== -1
    ) {
      $(".planification-header").hide();
      $(".planification-content").hide();
      _loadPlan();
      $(".planification-header").show();
      $(".planification-content").show();

      //$('#gobierto-planification').show();
    }
  };

  function _loadPlan() {
    // TODO: sacar de aquí y usar los compartidos (lib/shared)
    // filters
    Vue.filter("translate", function(key) {
      if (!key) return;
      return key[I18n.locale] || key["es"] || key["en"] || Object.values(key)[0]; // fallback translations
    });

    Vue.filter("percent", function(value) {
      if (!value) return;
      return (value / 100).toLocaleString(I18n.locale, { style: "percent", maximumFractionDigits: 1 });
    });

    Vue.filter("date", function(date) {
      if (!date) return;
      return new Date(date).toLocaleString(I18n.locale, { year: "numeric", month: "short", day: "numeric" });
    });

    // define the node root component
    Vue.component("node-root", {
      props: ["model"],
      data: function() {
        return {};
      },
      computed: {
        progressWidth: function() {
          return `${this.model.attributes.progress}%`;
        }
      },
      methods: {
        open: function() {
          // Trigger event
          this.$emit("selection", { ...this.model });
          this.$emit("open-menu-mobile");
        }
      },
      template: "#node-root-template"
    });

    // define the node list component
    Vue.component("node-list", {
      props: ["model", "level"],
      data: function() {
        return {
          isOpen: false
        };
      },
      methods: {
        setActive: function() {
          if (this.model.type === "category" && !this.model.max_level) {
            var model = { ...this.model };

            this.$emit("selection", model);
          }

          if (this.model.type === "category" && this.model.max_level) {
            let query_params = window.location.search.substring(0);
            if ((this.model.children || []).length == 0 && this.model.attributes.children_count > 0) {
              fetch(`${this.model.attributes.nodes_list_path}${query_params}`).then(response =>
                response.json().then(json => {
                  Vue.set(this.model, "children", json);
                  this.$emit("toggle");
                  this.isOpen = !this.isOpen;
                })
              );
            } else {
              this.$emit("toggle");
              this.isOpen = !this.isOpen;
            }
          }
        },
        getLabel: function(level, number_of_elements) {
          var key = this.level["level" + (level + 1)];
          return number_of_elements == 1 ? key["one"] : key["other"];
        }
      },
      template: "#node-list-template"
    });

    // define the table view component
    Vue.component("table-view", {
      props: ["model", "header", "open"],
      data: function() {
        return {};
      },
      methods: {
        getProject: function(row) {
          if (this.open) {
            // var project = { ...this.model };
            var project = { ...row };

            this.$emit("selection", project);

            // Preprocess custom fields
            var custom_field_records = project.attributes.custom_field_records;
            if (custom_field_records.length > 0) {
              this.$emit("custom-fields", custom_field_records);
            }

            // Activate plugins
            const { plugins_data = {} } = project.attributes;
            if (Object.keys(plugins_data).length) {
              this.$emit("activate", plugins_data);
            }
          }
        }
      },
      template: "#table-view-template"
    });

    // main object
    new Vue({
      el: "#gobierto-planification",
      name: "GobiertoPlanification",
      data: {
        json: {},
        levelKeys: {},
        optionKeys: [],
        activeNode: {},
        showTable: {},
        showTableHeader: true,
        openNode: false,
        globalProgress: 0,
        rootid: 0,
        readMoreButton: true,
        customFields: {},
        openMenu: true,
        baseUrl: ''
      },
      computed: {
        computedProgress() {
          if (!this.activeNode) return 0;

          return Math.round(this.activeNode.attributes.progress) || 0;
        },
        availableOpts: function() {
          // Filter options object only to those values present in the configuration (optionKeys)
          return _.pick(
            this.activeNode.attributes.options,
            _.filter(
              _.keys(this.activeNode.attributes.options),
              function(o) {
                return _.includes(_.keys(this.optionKeys), o.toString().toLowerCase());
              }.bind(this)
            )
          );
        }
      },
      watch: {
        activeNode: {
          handler: function(node) {
            // update hash when a new node is active
            this.setPermalink();

            this.isOpen(node.level);
          },
          deep: true
        }
      },
      created: function() {
        this.getJson();

        let vm = this;
        function locationHashChanged() {
          vm.getPermalink(window.location.hash.substring(1));
        }

        window.onhashchange = locationHashChanged;
      },
      mounted: function() {
        this.baseUrl = this.$el.dataset.baseurl
      },
      methods: {
        getJson: function() {
          $.getJSON(
            window.location.href,
            { format: "json" },
            function(json) {
              // Tree with categories and the leaves (nodes)
              var data = json["plan_tree"];
              // Nodes can have variable attributes and these are their keys
              var optionKeys = json["option_keys"];
              // Keys for different levels
              var levelKeys = json["level_keys"];
              // If you can see the table header
              var showTableHeader = json["show_table_header"];
              // If you can open a node (project)
              var openNode = json["open_node"];
              // Global progress, provided by json
              var globalProgress = json["global_progress"];

              // Hide spinner
              $(".js-toggle-overlay").removeClass("is-active");

              this.json = data;
              this.levelKeys = levelKeys;
              this.showTableHeader = showTableHeader;
              this.openNode = openNode;
              this.globalProgress = globalProgress;
              this.optionKeys = Object.keys(optionKeys).reduce(function(c, k) {
                return (c[k.toLowerCase()] = optionKeys[k]), c;
              }, {});

              // Parse permalink
              if (window.location.hash) {
                this.getPermalink(window.location.hash.substring(1));
              }
            }.bind(this)
          );
        },
        color: function() {
          return (this.rootid % this.json.length) + 1;
        },
        setRootColor: function(index) {
          return (index % this.json.length) + 1;
        },
        setSelection: function(model) {
          this.activeNode = model;

          // To know the root node
          this.rootid = this.activeNode.uid.toString().charAt(0);
        },
        isOpen: function(level) {
          if (this.activeNode.level === undefined) return false;

          let isOpen = false;
          if (this.activeNode.level === 0) {
            // activeNode = 0, it means is a "line"
            // then, it shows level_0 and level_1
            isOpen = level < 2;
          } else {
            // activeNode = X
            if (this.activeNode.type === "node") {
              // type = node, it means there's no further levels, then it shows as previous one
              isOpen = level === 0 || level === this.activeNode.level;
            } else {
              // then, it shows level_0 and level_(X+1), but not those between
              isOpen = level === 0 || level === this.activeNode.level + 1;
            }
          }

          return isOpen;
        },
        typeOf: function(val) {
          if (_.isString(val)) {
            return "string";
          } else if (_.isArray(val)) {
            return "array";
          }
          return "object";
        },
        toggle: function(node_i, i) {
          Vue.set(this.showTable, `${node_i}-${i}`, !this.showTable[`${node_i}-${i}`]);
        },
        getLabel: function(level, number_of_elements) {
          var l = _.keys(this.levelKeys).length === level + 1 ? level : level + 1;
          var key = this.levelKeys["level" + l];
          return number_of_elements == 1 ? key["one"] : key["other"];
        },
        getParent: function() {
          // Initialize args
          var breakpoint = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : undefined;

          // From uid, turno into array all parents, and drop last item (myself)
          var ancestors = _.dropRight(this.activeNode.uid.split(".")).map(Number);

          var current = this.json; // First item. ROOT item
          for (var i = 0; i < ancestors.length; i++) {
            if (i === breakpoint) {
              // If there is breakpoint, I get the corresponding ancestor set by breakpoint
              break;
            }

            if (!_.isArray(current)) {
              current = current.children;
            }
            current = current[ancestors[i]];
          }

          return current || {};
        },
        setParent: function() {
          // Initialize args
          var breakpoint = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : undefined;
          //hack 3rd level (3rd level has no SECTION)
          if (breakpoint === 3) breakpoint = breakpoint - 1;

          this.activeNode = this.getParent(breakpoint);
        },
        resetParent() {
          this.activeNode = {}
        },
        setPermalink: function() {
          window.location.hash = this.activeNode.uid ? this.activeNode.uid : '';
        },
        getPermalink: function(hash, forcedNode = null) {
          let found = this.searchByUid(hash, this.json);

          if (found) {
            this.openMenu = false;

            this.setSelection(found);

            if (forcedNode !== null) {
              let query_params = window.location.search.substring(0);
              if ((found.children || []).length == 0 && found.attributes.children_count > 0) {
                fetch(`${found.attributes.nodes_list_path}${query_params}`).then(response =>
                  response.json().then(json => {
                    Vue.set(found, "children", json);

                    const parsedNode = found.children[forcedNode];

                    if (parsedNode.attributes.hasOwnProperty("custom_field_records")) {
                      this.parseCustomFields(parsedNode.attributes.custom_field_records);
                    }

                    if (parsedNode.attributes.hasOwnProperty("plugins_data")) {
                      const pd = parsedNode.attributes.plugins_data;

                      if (Object.keys(pd).length) {
                        this.activatePlugins(pd);
                      }
                    }

                    this.activeNode = parsedNode;
                  })
                );
              }
            }
          } else if (this.openNode) {
            const newHash = hash.substring(0, hash.lastIndexOf("."));
            const lastHash = hash.substring(hash.lastIndexOf(".") + 1);

            this.getPermalink(newHash, lastHash);
          }
        },
        searchByUid: function(id, data) {
          let result = false;

          if (_.isArray(data)) {
            _.each(data, d => {
              result = findNodeByProp(id, d, "uid");

              // Return false to break loop
              if (result !== false) {
                return false;
              }
            });
          } else {
            result = findNodeByProp(id, data, "uid");
          }

          return result;
        },
        activatePlugins: function(plugins) {
          this.$nextTick(() => _loadPlugins(plugins));
        },
        hideText: function(event) {
          const toggleClass = "is-hidden";
          const hiddenElementClasses = event.currentTarget.previousElementSibling.classList;

          hiddenElementClasses.contains(toggleClass) ? hiddenElementClasses.remove(toggleClass) : hiddenElementClasses.add(toggleClass);

          this.readMoreButton = hiddenElementClasses.contains(toggleClass);
        },
        parseCustomFields: function(fields) {
          const paragraphs = [];
          const rest = [];

          fields.forEach(f => {
            const { custom_field_field_type: type } = f;
            if (type === "paragraph" || type === "localized_paragraph" || type === "string" || type === "localized_string") {
              paragraphs.push(f);
            } else {
              const { custom_field_id: id } = f;

              if (id === 'sdgs') {
                f.external_id = (f.external_id || '').split(',').map(v => v.padStart(2, 0))
                f.locale = I18n.locale
              }

              rest.push(f);
            }
          });

          this.customFields = {
            paragraphs,
            rest
          };
        }
      }
    });

    function findNodeByProp(id, currentNode, prop = "id") {
      var i, currentChild, result;

      if (id == currentNode[prop]) {
        return currentNode;
      } else {
        // Use a for loop instead of forEach to avoid nested functions
        // Otherwise "return" will not work properly
        for (i = 0; i < currentNode.children.length; i += 1) {
          currentChild = currentNode.children[i];

          // Search in the current child
          result = findNodeByProp(id, currentChild, prop);

          // Return the result if the node has been found
          if (result !== false) {
            return result;
          }
        }

        // The node has not been found and we have no more options
        return false;
      }
    }
  }

  function _loadPlugins(plugins = {}) {
    document.querySelectorAll("[data-plugin]").forEach(node => {
      const { plugin: pluginName } = node.dataset;

      const Component = require(`../plugins/${pluginName}.vue`).default;
      const Plugin = Vue.extend(Component);

      const instance = new Plugin({
        propsData: { config: plugins[pluginName] || {} }
      });

      instance.$mount(node);
    });
  }

  return PlanTypesController;
})();

window.GobiertoPlans.plan_types_controller = new GobiertoPlans.PlanTypesController();
