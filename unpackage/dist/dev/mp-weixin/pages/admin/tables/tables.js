"use strict";
const common_vendor = require("../../../common/vendor.js");
const common_assets = require("../../../common/assets.js");
const _sfc_main = common_vendor.defineComponent({
  data() {
    return {
      currentTypeIndex: 0,
      typeOptions: [
        new UTSJSONObject({ id: 0, name: "全部类型" }),
        new UTSJSONObject({ id: 1, name: "(办公室)一般干部评分" }),
        new UTSJSONObject({ id: 2, name: "(驻村)干部评分" }),
        new UTSJSONObject({ id: 3, name: "班子评分" })
      ],
      tables: [],
      page: 1,
      pageSize: 10,
      total: 0,
      hasMoreData: false,
      isLoading: false,
      // 表单数据
      formData: new UTSJSONObject({
        name: "",
        typeIndex: 1,
        category: "",
        rater: ""
      }),
      // 评分人列表
      raters: [new UTSJSONObject({ username: "", name: "请选择评分人" })],
      currentRaterIndex: 0,
      // 编辑表单数据
      editData: new UTSJSONObject({
        id: "",
        name: "",
        typeIndex: 1,
        category: ""
      }),
      // 更换评分人数据
      changeRaterData: new UTSJSONObject({
        tableId: "",
        currentRater: "",
        newRaterIndex: 0
      })
    };
  },
  onLoad() {
    this.loadTables();
    this.loadRaters();
  },
  methods: {
    // 获取评分表类型名称
    getTableTypeName(type = null) {
      const typeMap = new UTSJSONObject({
        1: "(办公室)一般干部评分",
        2: "(驻村)干部评分",
        3: "班子评分"
      });
      return typeMap[type] || "未知类型";
    },
    // 处理类型筛选变化
    handleTypeChange(e = null) {
      this.currentTypeIndex = e.detail.value;
      this.page = 1;
      this.tables = [];
      this.loadTables();
    },
    // 加载评分表
    loadTables() {
      this.isLoading = true;
      const type = this.typeOptions[this.currentTypeIndex].id;
      common_vendor.tr.callFunction({
        name: "ratingTable",
        data: new UTSJSONObject({
          action: "getTables",
          data: new UTSJSONObject({
            type: type > 0 ? type : void 0,
            page: this.page,
            pageSize: this.pageSize
          })
        })
      }).then((res) => {
        this.isLoading = false;
        if (res.result.code === 0) {
          const data = res.result.data;
          if (this.page === 1) {
            this.tables = data.list;
          } else {
            this.tables = this.tables.concat(data.list);
          }
          this.total = data.total;
          this.hasMoreData = this.tables.length < this.total;
        } else {
          common_vendor.index.showToast({
            title: res.result.msg || "加载失败",
            icon: "none"
          });
        }
      }).catch((err = null) => {
        this.isLoading = false;
        console.error(err);
        common_vendor.index.showToast({
          title: "加载失败，请检查网络",
          icon: "none"
        });
      });
    },
    // 加载更多
    loadMore() {
      if (this.isLoading || !this.hasMoreData)
        return null;
      this.page++;
      this.loadTables();
    },
    // 加载评分人列表
    loadRaters() {
      common_vendor.tr.callFunction({
        name: "user",
        data: new UTSJSONObject({
          action: "getUsers",
          data: new UTSJSONObject({
            role: "rater",
            pageSize: 100
          })
        })
      }).then((res) => {
        if (res.result.code === 0) {
          const data = res.result.data;
          this.raters = [new UTSJSONObject({ username: "", name: "请选择评分人" })].concat(data.list.map((item = null) => {
            return new UTSJSONObject({
              username: item.username,
              name: item.name || item.username
            });
          }));
        }
      });
    },
    // 导航到详情页
    navigateToDetail(tableId = null) {
      common_vendor.index.navigateTo({
        url: `/pages/admin/items/items?tableId=${tableId}`
      });
    },
    // 显示新增评分表弹窗
    showAddTableModal() {
      this.formData = {
        name: "",
        typeIndex: 1,
        category: "",
        rater: ""
      };
      this.currentRaterIndex = 0;
      this.$refs.addTablePopup.open();
    },
    // 隐藏新增评分表弹窗
    hideAddTablePopup() {
      this.$refs.addTablePopup.close();
    },
    // 处理表单类型变化
    handleFormTypeChange(e = null) {
      this.formData.typeIndex = e.detail.value;
    },
    // 处理评分人选择变化
    handleRaterChange(e = null) {
      this.currentRaterIndex = e.detail.value;
      if (this.currentRaterIndex > 0) {
        this.formData.rater = this.raters[this.currentRaterIndex].username;
      } else {
        this.formData.rater = "";
      }
    },
    // 提交新增评分表
    submitAddTable() {
      if (!this.formData.name) {
        common_vendor.index.showToast({
          title: "请输入评分表名称",
          icon: "none"
        });
        return null;
      }
      if (!this.formData.rater) {
        common_vendor.index.showToast({
          title: "请选择评分人",
          icon: "none"
        });
        return null;
      }
      common_vendor.index.showLoading({
        title: "提交中..."
      });
      const type = this.typeOptions[this.formData.typeIndex].id;
      common_vendor.tr.callFunction({
        name: "ratingTable",
        data: new UTSJSONObject({
          action: "createTable",
          data: new UTSJSONObject({
            name: this.formData.name,
            type,
            category: this.formData.category,
            rater: this.formData.rater
          })
        })
      }).then((res) => {
        common_vendor.index.hideLoading();
        if (res.result.code === 0) {
          common_vendor.index.showToast({
            title: "创建成功",
            icon: "success"
          });
          this.hideAddTablePopup();
          this.page = 1;
          this.loadTables();
        } else {
          common_vendor.index.showToast({
            title: res.result.msg || "创建失败",
            icon: "none"
          });
        }
      }).catch((err = null) => {
        common_vendor.index.hideLoading();
        console.error(err);
        common_vendor.index.showToast({
          title: "创建失败，请检查网络",
          icon: "none"
        });
      });
    },
    // 编辑评分表
    editTable(table = null) {
      this.editData = {
        id: table._id,
        name: table.name,
        typeIndex: table.type,
        category: table.category || ""
      };
      this.$refs.editTablePopup.open();
    },
    // 隐藏编辑评分表弹窗
    hideEditTablePopup() {
      this.$refs.editTablePopup.close();
    },
    // 处理编辑类型变化
    handleEditTypeChange(e = null) {
      this.editData.typeIndex = e.detail.value;
    },
    // 提交编辑评分表
    submitEditTable() {
      if (!this.editData.name) {
        common_vendor.index.showToast({
          title: "请输入评分表名称",
          icon: "none"
        });
        return null;
      }
      common_vendor.index.showLoading({
        title: "提交中..."
      });
      const type = this.typeOptions[this.editData.typeIndex].id;
      common_vendor.tr.callFunction({
        name: "ratingTable",
        data: new UTSJSONObject({
          action: "updateTable",
          data: new UTSJSONObject({
            tableId: this.editData.id,
            updateData: new UTSJSONObject({
              name: this.editData.name,
              type,
              category: this.editData.category
            })
          })
        })
      }).then((res) => {
        common_vendor.index.hideLoading();
        if (res.result.code === 0) {
          common_vendor.index.showToast({
            title: "更新成功",
            icon: "success"
          });
          this.hideEditTablePopup();
          this.loadTables();
        } else {
          common_vendor.index.showToast({
            title: res.result.msg || "更新失败",
            icon: "none"
          });
        }
      }).catch((err = null) => {
        common_vendor.index.hideLoading();
        console.error(err);
        common_vendor.index.showToast({
          title: "更新失败，请检查网络",
          icon: "none"
        });
      });
    },
    // 显示更换评分人弹窗
    showChangeRaterModal(table = null) {
      this.changeRaterData = {
        tableId: table._id,
        currentRater: table.rater,
        newRaterIndex: 0
      };
      this.$refs.changeRaterPopup.open();
    },
    // 隐藏更换评分人弹窗
    hideChangeRaterPopup() {
      this.$refs.changeRaterPopup.close();
    },
    // 处理新评分人选择变化
    handleNewRaterChange(e = null) {
      this.changeRaterData.newRaterIndex = e.detail.value;
    },
    // 提交更换评分人
    submitChangeRater() {
      if (this.changeRaterData.newRaterIndex === 0) {
        common_vendor.index.showToast({
          title: "请选择新评分人",
          icon: "none"
        });
        return null;
      }
      const newRater = this.raters[this.changeRaterData.newRaterIndex].username;
      if (newRater === this.changeRaterData.currentRater) {
        common_vendor.index.showToast({
          title: "新旧评分人不能相同",
          icon: "none"
        });
        return null;
      }
      common_vendor.index.showLoading({
        title: "提交中..."
      });
      common_vendor.tr.callFunction({
        name: "ratingTable",
        data: new UTSJSONObject({
          action: "changeRater",
          data: new UTSJSONObject({
            tableId: this.changeRaterData.tableId,
            newRater
          })
        })
      }).then((res) => {
        common_vendor.index.hideLoading();
        if (res.result.code === 0) {
          common_vendor.index.showToast({
            title: "更换成功",
            icon: "success"
          });
          this.hideChangeRaterPopup();
          this.loadTables();
        } else {
          common_vendor.index.showToast({
            title: res.result.msg || "更换失败",
            icon: "none"
          });
        }
      }).catch((err = null) => {
        common_vendor.index.hideLoading();
        console.error(err);
        common_vendor.index.showToast({
          title: "更换失败，请检查网络",
          icon: "none"
        });
      });
    },
    // 确认删除
    confirmDelete(tableId = null) {
      common_vendor.index.showModal(new UTSJSONObject({
        title: "确认删除",
        content: "删除后将无法恢复，是否继续？",
        success: (res) => {
          if (res.confirm) {
            this.deleteTable(tableId);
          }
        }
      }));
    },
    // 删除评分表
    deleteTable(tableId = null) {
      common_vendor.index.showLoading({
        title: "删除中..."
      });
      common_vendor.tr.callFunction({
        name: "ratingTable",
        data: new UTSJSONObject({
          action: "deleteTable",
          data: new UTSJSONObject({
            tableId
          })
        })
      }).then((res) => {
        common_vendor.index.hideLoading();
        if (res.result.code === 0) {
          common_vendor.index.showToast({
            title: "删除成功",
            icon: "success"
          });
          this.tables = this.tables.filter((item) => {
            return item._id !== tableId;
          });
          if (this.tables.length === 0 && this.page > 1) {
            this.page--;
            this.loadTables();
          }
        } else {
          common_vendor.index.showToast({
            title: res.result.msg || "删除失败",
            icon: "none"
          });
        }
      }).catch((err = null) => {
        common_vendor.index.hideLoading();
        console.error(err);
        common_vendor.index.showToast({
          title: "删除失败，请检查网络",
          icon: "none"
        });
      });
    }
  }
});
if (!Array) {
  const _easycom_uni_popup2 = common_vendor.resolveComponent("uni-popup");
  _easycom_uni_popup2();
}
const _easycom_uni_popup = () => "../../../uni_modules/uni-popup/components/uni-popup/uni-popup.js";
if (!Math) {
  _easycom_uni_popup();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($data.typeOptions[$data.currentTypeIndex].name),
    b: common_vendor.o((...args) => $options.handleTypeChange && $options.handleTypeChange(...args)),
    c: $data.currentTypeIndex,
    d: $data.typeOptions,
    e: common_vendor.o((...args) => $options.showAddTableModal && $options.showAddTableModal(...args)),
    f: $data.tables.length === 0
  }, $data.tables.length === 0 ? {
    g: common_assets._imports_0$1
  } : {}, {
    h: common_vendor.f($data.tables, (table, index, i0) => {
      return {
        a: common_vendor.t(table.name),
        b: common_vendor.t($options.getTableTypeName(table.type)),
        c: common_vendor.o(($event) => $options.editTable(table), index),
        d: common_vendor.o(($event) => $options.showChangeRaterModal(table), index),
        e: common_vendor.o(($event) => $options.confirmDelete(table._id), index),
        f: common_vendor.t(table.category || "无"),
        g: common_vendor.t(table.rater),
        h: common_vendor.t(table.items ? table.items.length : 0),
        i: index,
        j: common_vendor.o(($event) => $options.navigateToDetail(table._id), index)
      };
    }),
    i: $data.tables.length > 0 && $data.hasMoreData
  }, $data.tables.length > 0 && $data.hasMoreData ? common_vendor.e({
    j: !$data.isLoading
  }, !$data.isLoading ? {} : {}, {
    k: common_vendor.o((...args) => $options.loadMore && $options.loadMore(...args)),
    l: $data.isLoading
  }) : {}, {
    m: $data.formData.name,
    n: common_vendor.o(($event) => $data.formData.name = $event.detail.value),
    o: common_vendor.t($data.typeOptions[$data.formData.typeIndex].name),
    p: common_vendor.o((...args) => $options.handleFormTypeChange && $options.handleFormTypeChange(...args)),
    q: $data.formData.typeIndex,
    r: $data.typeOptions,
    s: $data.formData.category,
    t: common_vendor.o(($event) => $data.formData.category = $event.detail.value),
    v: common_vendor.t($data.raters[$data.currentRaterIndex].name || "请选择评分人"),
    w: common_vendor.o((...args) => $options.handleRaterChange && $options.handleRaterChange(...args)),
    x: $data.currentRaterIndex,
    y: $data.raters,
    z: common_vendor.o((...args) => $options.hideAddTablePopup && $options.hideAddTablePopup(...args)),
    A: common_vendor.o((...args) => $options.submitAddTable && $options.submitAddTable(...args)),
    B: common_vendor.sr("addTablePopup", "332f8e78-0"),
    C: common_vendor.p({
      type: "center"
    }),
    D: $data.editData.name,
    E: common_vendor.o(($event) => $data.editData.name = $event.detail.value),
    F: common_vendor.t($data.typeOptions[$data.editData.typeIndex].name),
    G: common_vendor.o((...args) => $options.handleEditTypeChange && $options.handleEditTypeChange(...args)),
    H: $data.editData.typeIndex,
    I: $data.typeOptions,
    J: $data.editData.category,
    K: common_vendor.o(($event) => $data.editData.category = $event.detail.value),
    L: common_vendor.o((...args) => $options.hideEditTablePopup && $options.hideEditTablePopup(...args)),
    M: common_vendor.o((...args) => $options.submitEditTable && $options.submitEditTable(...args)),
    N: common_vendor.sr("editTablePopup", "332f8e78-1"),
    O: common_vendor.p({
      type: "center"
    }),
    P: common_vendor.t($data.changeRaterData.currentRater),
    Q: common_vendor.t($data.raters[$data.changeRaterData.newRaterIndex].name || "请选择新评分人"),
    R: common_vendor.o((...args) => $options.handleNewRaterChange && $options.handleNewRaterChange(...args)),
    S: $data.changeRaterData.newRaterIndex,
    T: $data.raters,
    U: common_vendor.o((...args) => $options.hideChangeRaterPopup && $options.hideChangeRaterPopup(...args)),
    V: common_vendor.o((...args) => $options.submitChangeRater && $options.submitChangeRater(...args)),
    W: common_vendor.sr("changeRaterPopup", "332f8e78-2"),
    X: common_vendor.p({
      type: "center"
    }),
    Y: common_vendor.sei(common_vendor.gei(_ctx, ""), "view")
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
