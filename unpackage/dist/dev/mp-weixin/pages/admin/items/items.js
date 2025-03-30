"use strict";
const common_vendor = require("../../../common/vendor.js");
const common_assets = require("../../../common/assets.js");
const _sfc_main = common_vendor.defineComponent({
  data() {
    return {
      tableId: "",
      table: new UTSJSONObject({
        _id: "",
        name: "",
        type: 1,
        category: "",
        rater: "",
        items: []
      }),
      formData: new UTSJSONObject({
        name: "",
        maxScore: 10,
        description: ""
      }),
      editData: new UTSJSONObject({
        index: -1,
        name: "",
        maxScore: 10,
        description: ""
      })
    };
  },
  onLoad(options) {
    if (options.tableId) {
      this.tableId = options.tableId;
      this.loadTableDetail();
    } else {
      common_vendor.index.showToast({
        title: "参数错误",
        icon: "none"
      });
      setTimeout(() => {
        common_vendor.index.navigateBack();
      }, 1500);
    }
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
    // 加载评分表详情
    loadTableDetail() {
      common_vendor.index.showLoading({
        title: "加载中..."
      });
      common_vendor.tr.callFunction({
        name: "ratingTable",
        data: new UTSJSONObject({
          action: "getTableDetail",
          data: new UTSJSONObject({
            tableId: this.tableId
          })
        })
      }).then((res) => {
        common_vendor.index.hideLoading();
        if (res.result.code === 0) {
          this.table = res.result.data.table || {};
          if (!this.table.items) {
            this.table.items = [];
          }
        } else {
          common_vendor.index.showToast({
            title: res.result.msg || "加载失败",
            icon: "none"
          });
        }
      }).catch((err = null) => {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/admin/items/items.vue:170", err);
        common_vendor.index.showToast({
          title: "加载失败，请检查网络",
          icon: "none"
        });
      });
    },
    // 显示添加评分项弹窗
    showAddItemModal() {
      this.formData = {
        name: "",
        maxScore: 10,
        description: ""
      };
      this.$refs.addItemPopup.open();
    },
    // 隐藏添加评分项弹窗
    hideAddItemPopup() {
      this.$refs.addItemPopup.close();
    },
    // 提交添加评分项
    submitAddItem() {
      if (!this.formData.name) {
        common_vendor.index.showToast({
          title: "请输入评分项名称",
          icon: "none"
        });
        return null;
      }
      if (!this.formData.maxScore || this.formData.maxScore <= 0) {
        common_vendor.index.showToast({
          title: "请输入有效的满分值",
          icon: "none"
        });
        return null;
      }
      common_vendor.index.showLoading({
        title: "提交中..."
      });
      const newItem = new UTSJSONObject({
        name: this.formData.name,
        maxScore: parseInt(this.formData.maxScore),
        description: this.formData.description
      });
      common_vendor.tr.callFunction({
        name: "ratingTable",
        data: new UTSJSONObject({
          action: "addItem",
          data: new UTSJSONObject({
            tableId: this.tableId,
            item: newItem
          })
        })
      }).then((res) => {
        common_vendor.index.hideLoading();
        if (res.result.code === 0) {
          common_vendor.index.showToast({
            title: "添加成功",
            icon: "success"
          });
          this.hideAddItemPopup();
          if (!this.table.items) {
            this.table.items = [];
          }
          newItem._id = res.result.data.itemId;
          this.table.items.push(newItem);
        } else {
          common_vendor.index.showToast({
            title: res.result.msg || "添加失败",
            icon: "none"
          });
        }
      }).catch((err = null) => {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/admin/items/items.vue:256", err);
        common_vendor.index.showToast({
          title: "添加失败，请检查网络",
          icon: "none"
        });
      });
    },
    // 编辑评分项
    editItem(index = null) {
      const item = this.table.items[index];
      this.editData = {
        index,
        name: item.name,
        maxScore: item.maxScore,
        description: item.description || ""
      };
      this.$refs.editItemPopup.open();
    },
    // 隐藏编辑评分项弹窗
    hideEditItemPopup() {
      this.$refs.editItemPopup.close();
    },
    // 提交编辑评分项
    submitEditItem() {
      if (!this.editData.name) {
        common_vendor.index.showToast({
          title: "请输入评分项名称",
          icon: "none"
        });
        return null;
      }
      if (!this.editData.maxScore || this.editData.maxScore <= 0) {
        common_vendor.index.showToast({
          title: "请输入有效的满分值",
          icon: "none"
        });
        return null;
      }
      common_vendor.index.showLoading({
        title: "提交中..."
      });
      const updatedItem = new UTSJSONObject({
        name: this.editData.name,
        maxScore: parseInt(this.editData.maxScore),
        description: this.editData.description
      });
      const itemId = this.table.items[this.editData.index]._id;
      common_vendor.tr.callFunction({
        name: "ratingTable",
        data: new UTSJSONObject({
          action: "updateItem",
          data: new UTSJSONObject({
            tableId: this.tableId,
            itemId,
            item: updatedItem
          })
        })
      }).then((res) => {
        common_vendor.index.hideLoading();
        if (res.result.code === 0) {
          common_vendor.index.showToast({
            title: "更新成功",
            icon: "success"
          });
          this.hideEditItemPopup();
          this.table.items[this.editData.index] = Object.assign(Object.assign({}, this.table.items[this.editData.index]), updatedItem);
        } else {
          common_vendor.index.showToast({
            title: res.result.msg || "更新失败",
            icon: "none"
          });
        }
      }).catch((err = null) => {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/admin/items/items.vue:346", err);
        common_vendor.index.showToast({
          title: "更新失败，请检查网络",
          icon: "none"
        });
      });
    },
    // 删除评分项
    deleteItem(index = null) {
      common_vendor.index.showModal(new UTSJSONObject({
        title: "确认删除",
        content: "删除后将无法恢复，是否继续？",
        success: (res) => {
          if (res.confirm) {
            this.confirmDeleteItem(index);
          }
        }
      }));
    },
    // 确认删除评分项
    confirmDeleteItem(index = null) {
      const itemId = this.table.items[index]._id;
      common_vendor.index.showLoading({
        title: "删除中..."
      });
      common_vendor.tr.callFunction({
        name: "ratingTable",
        data: new UTSJSONObject({
          action: "deleteItem",
          data: new UTSJSONObject({
            tableId: this.tableId,
            itemId
          })
        })
      }).then((res) => {
        common_vendor.index.hideLoading();
        if (res.result.code === 0) {
          common_vendor.index.showToast({
            title: "删除成功",
            icon: "success"
          });
          this.table.items.splice(index, 1);
        } else {
          common_vendor.index.showToast({
            title: res.result.msg || "删除失败",
            icon: "none"
          });
        }
      }).catch((err = null) => {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/admin/items/items.vue:403", err);
        common_vendor.index.showToast({
          title: "删除失败，请检查网络",
          icon: "none"
        });
      });
    }
  }
});
if (!Array) {
  const _component_uni_popup = common_vendor.resolveComponent("uni-popup");
  _component_uni_popup();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($data.table.name || ""),
    b: $data.table.type
  }, $data.table.type ? {
    c: common_vendor.t($options.getTableTypeName($data.table.type))
  } : {}, {
    d: $data.table.category
  }, $data.table.category ? {
    e: common_vendor.t($data.table.category)
  } : {}, {
    f: common_vendor.t($data.table.rater || "未分配"),
    g: common_vendor.o((...args) => $options.showAddItemModal && $options.showAddItemModal(...args)),
    h: $data.table.items && $data.table.items.length === 0
  }, $data.table.items && $data.table.items.length === 0 ? {
    i: common_assets._imports_0$2
  } : {}, {
    j: common_vendor.f($data.table.items, (item, index, i0) => {
      return common_vendor.e({
        a: common_vendor.t(item.name),
        b: common_vendor.t(item.maxScore),
        c: item.description
      }, item.description ? {
        d: common_vendor.t(item.description)
      } : {}, {
        e: common_vendor.o(($event) => $options.editItem(index), index),
        f: common_vendor.o(($event) => $options.deleteItem(index), index),
        g: index
      });
    }),
    k: $data.formData.name,
    l: common_vendor.o(($event) => $data.formData.name = $event.detail.value),
    m: $data.formData.maxScore,
    n: common_vendor.o(($event) => $data.formData.maxScore = $event.detail.value),
    o: $data.formData.description,
    p: common_vendor.o(($event) => $data.formData.description = $event.detail.value),
    q: common_vendor.o((...args) => $options.hideAddItemPopup && $options.hideAddItemPopup(...args)),
    r: common_vendor.o((...args) => $options.submitAddItem && $options.submitAddItem(...args)),
    s: common_vendor.sr("addItemPopup", "ea6b65cc-0"),
    t: common_vendor.p({
      type: "center"
    }),
    v: $data.editData.name,
    w: common_vendor.o(($event) => $data.editData.name = $event.detail.value),
    x: $data.editData.maxScore,
    y: common_vendor.o(($event) => $data.editData.maxScore = $event.detail.value),
    z: $data.editData.description,
    A: common_vendor.o(($event) => $data.editData.description = $event.detail.value),
    B: common_vendor.o((...args) => $options.hideEditItemPopup && $options.hideEditItemPopup(...args)),
    C: common_vendor.o((...args) => $options.submitEditItem && $options.submitEditItem(...args)),
    D: common_vendor.sr("editItemPopup", "ea6b65cc-1"),
    E: common_vendor.p({
      type: "center"
    }),
    F: common_vendor.sei(common_vendor.gei(_ctx, ""), "view")
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../../.sourcemap/mp-weixin/pages/admin/items/items.js.map
