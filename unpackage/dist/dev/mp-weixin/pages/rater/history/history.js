"use strict";
const common_vendor = require("../../../common/vendor.js");
const common_assets = require("../../../common/assets.js");
const _sfc_main = common_vendor.defineComponent({
  data() {
    return {
      currentTableIndex: 0,
      tables: [new UTSJSONObject({ _id: "", name: "全部评分表" })],
      historyList: [],
      page: 1,
      pageSize: 10,
      total: 0,
      hasMoreData: false,
      isLoading: false,
      currentDetail: null,
      deleteItem: null
    };
  },
  onLoad() {
    this.loadTables();
    this.loadHistory();
  },
  onPullDownRefresh() {
    this.reloadData(() => {
      common_vendor.index.stopPullDownRefresh();
    });
  },
  methods: {
    // 重新加载数据
    reloadData(callback = null) {
      this.page = 1;
      this.loadHistory(() => {
        if (typeof callback === "function") {
          callback();
        }
      });
    },
    // 加载评分表列表
    loadTables() {
      common_vendor.tr.callFunction({
        name: "ratingTable",
        data: new UTSJSONObject({
          action: "getTables",
          data: new UTSJSONObject({
            pageSize: 100
            // 获取所有评分表
          })
        })
      }).then((res) => {
        if (res.result.code === 0) {
          const data = res.result.data;
          this.tables = [new UTSJSONObject({ _id: "", name: "全部评分表" })].concat(data.list);
        }
      });
    },
    // 加载评分历史
    loadHistory(callback = null) {
      this.isLoading = true;
      const tableId = this.tables[this.currentTableIndex]._id;
      common_vendor.index.showLoading({
        title: "加载中..."
      });
      common_vendor.tr.callFunction({
        name: "rating",
        data: new UTSJSONObject({
          action: "getRatingHistory",
          data: new UTSJSONObject({
            table_id: tableId,
            page: this.page,
            pageSize: this.pageSize
          })
        })
      }).then((res) => {
        common_vendor.index.hideLoading();
        this.isLoading = false;
        if (res.result.code === 0) {
          const data = res.result.data;
          if (this.page === 1) {
            this.historyList = data.list;
          } else {
            this.historyList = this.historyList.concat(data.list);
          }
          this.total = data.total;
          this.hasMoreData = this.historyList.length < this.total;
        } else {
          common_vendor.index.showToast({
            title: res.result.msg || "加载失败",
            icon: "none"
          });
        }
        if (typeof callback === "function") {
          callback();
        }
      }).catch((err = null) => {
        common_vendor.index.hideLoading();
        this.isLoading = false;
        common_vendor.index.__f__("error", "at pages/rater/history/history.vue:265", err);
        common_vendor.index.showToast({
          title: "加载失败，请检查网络",
          icon: "none"
        });
        if (typeof callback === "function") {
          callback();
        }
      });
    },
    // 处理评分表筛选变化
    handleTableChange(e = null) {
      this.currentTableIndex = e.detail.value;
      this.reloadData();
    },
    // 获取评分表类型名称
    getTableTypeName(type = null) {
      const typeMap = new UTSJSONObject({
        1: "(办公室)一般干部评分",
        2: "(驻村)干部评分",
        3: "班子评分"
      });
      return typeMap[type] || "未知类型";
    },
    // 格式化日期时间
    formatDateTime(timestamp = null) {
      if (!timestamp)
        return "";
      const date = new Date(timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    },
    // 查看详情
    viewDetail(item = null) {
      this.currentDetail = item;
      this.$refs.detailPopup.open();
    },
    // 关闭详情弹窗
    closeDetail() {
      this.$refs.detailPopup.close();
    },
    // 编辑评分
    editRating(item = null) {
      if (this.$refs.detailPopup.isOpen) {
        this.$refs.detailPopup.close();
      }
      if (!item || !item._id || !item.table || !item.table._id) {
        common_vendor.index.showToast({
          title: "评分记录数据不完整，无法编辑",
          icon: "none"
        });
        return null;
      }
      common_vendor.index.navigateTo({
        url: `/pages/rater/rating/rating?table_id=${item.table._id}&subject_id=${item.subject._id}&rating_id=${item._id}`
      });
    },
    // 确认删除
    confirmDelete(item = null) {
      this.deleteItem = item;
      this.$refs.deletePopup.open();
    },
    // 关闭删除确认弹窗
    closeDeletePopup() {
      this.$refs.deletePopup.close();
    },
    // 删除评分记录
    deleteRating() {
      if (!this.deleteItem || !this.deleteItem._id) {
        common_vendor.index.showToast({
          title: "评分记录数据不完整，无法删除",
          icon: "none"
        });
        return null;
      }
      common_vendor.index.showLoading({
        title: "删除中..."
      });
      common_vendor.tr.callFunction({
        name: "rating",
        data: new UTSJSONObject({
          action: "deleteRating",
          data: new UTSJSONObject({
            rating_id: this.deleteItem._id
          })
        })
      }).then((res) => {
        common_vendor.index.hideLoading();
        if (res.result.code === 0) {
          common_vendor.index.showToast({
            title: "删除成功",
            icon: "success"
          });
          const index = this.historyList.findIndex((item) => {
            return item._id === this.deleteItem._id;
          });
          if (index !== -1) {
            this.historyList.splice(index, 1);
          }
        } else {
          common_vendor.index.showToast({
            title: res.result.msg || "删除失败",
            icon: "none"
          });
        }
      }).catch((err = null) => {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/rater/history/history.vue:392", err);
        common_vendor.index.showToast({
          title: "删除失败，请检查网络",
          icon: "none"
        });
      });
    },
    // 加载更多
    loadMore() {
      if (this.isLoading || !this.hasMoreData)
        return null;
      this.page++;
      this.loadHistory();
    }
  }
});
if (!Array) {
  const _component_uni_popup = common_vendor.resolveComponent("uni-popup");
  const _component_uni_popup_dialog = common_vendor.resolveComponent("uni-popup-dialog");
  (_component_uni_popup + _component_uni_popup_dialog)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($data.tables[$data.currentTableIndex].name),
    b: common_vendor.o((...args) => $options.handleTableChange && $options.handleTableChange(...args)),
    c: $data.currentTableIndex,
    d: $data.tables,
    e: $data.historyList.length === 0
  }, $data.historyList.length === 0 ? {
    f: common_assets._imports_0$2
  } : {}, {
    g: common_vendor.f($data.historyList, (item, index, i0) => {
      return common_vendor.e({
        a: common_vendor.t(item.subject && item.subject.name || "未知考核对象"),
        b: item.subject
      }, item.subject ? common_vendor.e({
        c: item.subject.department
      }, item.subject.department ? {
        d: common_vendor.t(item.subject.department)
      } : {}, {
        e: item.subject.position
      }, item.subject.position ? {
        f: common_vendor.t(item.subject.position)
      } : {}) : {}, {
        g: common_vendor.t(item.totalScore || 0),
        h: common_vendor.t(item.maxScore || 0),
        i: common_vendor.t(item.table && item.table.name || "未知评分表"),
        j: common_vendor.t($options.formatDateTime(item.createTime)),
        k: item.scores && item.scores.length > 0
      }, item.scores && item.scores.length > 0 ? common_vendor.e({
        l: _ctx.sIndex < 3
      }, _ctx.sIndex < 3 ? {
        m: common_vendor.f(item.scores, (score, sIndex, i1) => {
          return {
            a: common_vendor.t(score.name),
            b: common_vendor.t(score.score || 0),
            c: common_vendor.t(score.maxScore || 0),
            d: sIndex
          };
        })
      } : {}, {
        n: item.scores.length > 3
      }, item.scores.length > 3 ? {
        o: common_vendor.t(item.scores.length)
      } : {}) : {}, {
        p: item.comment
      }, item.comment ? {
        q: common_vendor.t(item.comment)
      } : {}, {
        r: common_vendor.o(($event) => $options.editRating(item), index),
        s: common_vendor.o(($event) => $options.confirmDelete(item), index),
        t: index,
        v: common_vendor.o(($event) => $options.viewDetail(item), index)
      });
    }),
    h: $data.historyList.length > 0 && $data.hasMoreData
  }, $data.historyList.length > 0 && $data.hasMoreData ? {
    i: common_vendor.o((...args) => $options.loadMore && $options.loadMore(...args)),
    j: $data.isLoading
  } : {}, {
    k: common_vendor.o((...args) => $options.closeDetail && $options.closeDetail(...args)),
    l: $data.currentDetail
  }, $data.currentDetail ? common_vendor.e({
    m: common_vendor.t($data.currentDetail.subject && $data.currentDetail.subject.name || "未知考核对象"),
    n: $data.currentDetail.subject
  }, $data.currentDetail.subject ? common_vendor.e({
    o: $data.currentDetail.subject.department
  }, $data.currentDetail.subject.department ? {
    p: common_vendor.t($data.currentDetail.subject.department)
  } : {}, {
    q: $data.currentDetail.subject.position
  }, $data.currentDetail.subject.position ? {
    r: common_vendor.t($data.currentDetail.subject.position)
  } : {}) : {}, {
    s: common_vendor.t($data.currentDetail.totalScore || 0),
    t: common_vendor.t($data.currentDetail.maxScore || 0),
    v: common_vendor.t($data.currentDetail.table && $data.currentDetail.table.name || "未知评分表"),
    w: common_vendor.t($options.getTableTypeName($data.currentDetail.table && $data.currentDetail.table.type)),
    x: $data.currentDetail.table && $data.currentDetail.table.category
  }, $data.currentDetail.table && $data.currentDetail.table.category ? {
    y: common_vendor.t($data.currentDetail.table.category)
  } : {}, {
    z: common_vendor.f($data.currentDetail.scores, (score, index, i0) => {
      return common_vendor.e({
        a: common_vendor.t(score.name),
        b: common_vendor.t(score.score || 0),
        c: common_vendor.t(score.maxScore || 0),
        d: score.description
      }, score.description ? {
        e: common_vendor.t(score.description)
      } : {}, {
        f: index
      });
    }),
    A: $data.currentDetail.comment
  }, $data.currentDetail.comment ? {
    B: common_vendor.t($data.currentDetail.comment)
  } : {}, {
    C: common_vendor.t($options.formatDateTime($data.currentDetail.createTime))
  }) : {}, {
    D: common_vendor.o((...args) => $options.closeDetail && $options.closeDetail(...args)),
    E: common_vendor.o(($event) => $options.editRating($data.currentDetail)),
    F: common_vendor.sr("detailPopup", "0548c2c5-0"),
    G: common_vendor.p({
      type: "center"
    }),
    H: common_vendor.o($options.deleteRating),
    I: common_vendor.o($options.closeDeletePopup),
    J: common_vendor.p({
      type: "warn",
      title: "确认删除",
      content: "确定要删除这条评分记录吗？删除后不可恢复！",
      ["before-close"]: true
    }),
    K: common_vendor.sr("deletePopup", "0548c2c5-1"),
    L: common_vendor.p({
      type: "dialog"
    }),
    M: common_vendor.sei(common_vendor.gei(_ctx, ""), "view")
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../../.sourcemap/mp-weixin/pages/rater/history/history.js.map
