"use strict";
const common_vendor = require("../../../common/vendor.js");
const common_assets = require("../../../common/assets.js");
const _sfc_main = common_vendor.defineComponent({
  data() {
    return {
      currentTypeIndex: 0,
      typeOptions: [
        new UTSJSONObject({ type: "", name: "所有类型" }),
        new UTSJSONObject({ type: 1, name: "(办公室)一般干部评分" }),
        new UTSJSONObject({ type: 2, name: "(驻村)干部评分" }),
        new UTSJSONObject({ type: 3, name: "班子评分" })
      ],
      stats: new UTSJSONObject({
        total: 0,
        completed: 0,
        pending: 0
      }),
      tables: [],
      page: 1,
      pageSize: 10,
      total: 0,
      hasMoreData: false,
      isLoading: false
    };
  },
  onShow() {
    this.reloadData();
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
      this.loadStats();
      this.loadTables(() => {
        if (typeof callback === "function") {
          callback();
        }
      });
    },
    // 加载评分统计数据
    loadStats() {
      common_vendor.tr.callFunction({
        name: "rating",
        data: new UTSJSONObject({
          action: "getRaterStats",
          data: new UTSJSONObject({})
        })
      }).then((res) => {
        if (res.result.code === 0) {
          this.stats = res.result.data || this.stats;
        }
      });
    },
    // 加载评分表列表
    loadTables(callback = null) {
      this.isLoading = true;
      const type = this.typeOptions[this.currentTypeIndex].type;
      common_vendor.index.showLoading({
        title: "加载中..."
      });
      common_vendor.tr.callFunction({
        name: "ratingTable",
        data: new UTSJSONObject({
          action: "getRaterTables",
          data: new UTSJSONObject({
            type,
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
        if (typeof callback === "function") {
          callback();
        }
      }).catch((err = null) => {
        common_vendor.index.hideLoading();
        this.isLoading = false;
        common_vendor.index.__f__("error", "at pages/rater/tables/tables.vue:205", err);
        common_vendor.index.showToast({
          title: "加载失败，请检查网络",
          icon: "none"
        });
        if (typeof callback === "function") {
          callback();
        }
      });
    },
    // 处理类型筛选变化
    handleTypeChange(e = null) {
      this.currentTypeIndex = e.detail.value;
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
    // 获取状态文本
    getStatusText(completionRate = null) {
      if (completionRate === 100) {
        return "已完成";
      } else if (completionRate > 0) {
        return "进行中";
      } else {
        return "待评分";
      }
    },
    // 格式化日期
    formatDate(timestamp = null) {
      if (!timestamp)
        return "";
      const date = new Date(timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    },
    // 跳转到评分页面
    goToRating(tableId = null) {
      common_vendor.index.navigateTo({
        url: `/pages/rater/rating/rating?table_id=${tableId}`
      });
    },
    // 加载更多
    loadMore() {
      if (this.isLoading || !this.hasMoreData)
        return null;
      this.page++;
      this.loadTables();
    }
  }
});
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($data.typeOptions[$data.currentTypeIndex].name),
    b: common_vendor.o((...args) => $options.handleTypeChange && $options.handleTypeChange(...args)),
    c: $data.currentTypeIndex,
    d: $data.typeOptions,
    e: common_vendor.t($data.stats.total || 0),
    f: common_vendor.t($data.stats.completed || 0),
    g: common_vendor.t($data.stats.pending || 0),
    h: $data.tables.length === 0
  }, $data.tables.length === 0 ? {
    i: common_assets._imports_0$2
  } : {}, {
    j: common_vendor.f($data.tables, (table, index, i0) => {
      return common_vendor.e({
        a: common_vendor.t(table.name),
        b: common_vendor.t($options.getStatusText(table.completionRate)),
        c: table.completionRate === 100 ? 1 : "",
        d: table.completionRate > 0 && table.completionRate < 100 ? 1 : "",
        e: table.completionRate === 0 ? 1 : "",
        f: common_vendor.t($options.getTableTypeName(table.type)),
        g: table.category
      }, table.category ? {
        h: common_vendor.t(table.category)
      } : {}, {
        i: common_vendor.t(table.completionRate || 0),
        j: table.completionRate || 0,
        k: common_vendor.t(table.subjectCount || 0)
      }, _ctx.sIndex < 3 ? {
        l: common_vendor.f(table.subjects || [], (subject, sIndex, i1) => {
          return common_vendor.e({
            a: common_vendor.t(subject.name),
            b: subject.rated
          }, subject.rated ? {
            c: common_vendor.t(subject.totalScore || 0)
          } : {}, {
            d: sIndex
          });
        })
      } : {}, {
        m: (table.subjects || []).length > 3
      }, (table.subjects || []).length > 3 ? {} : {}, {
        n: common_vendor.t($options.formatDate(table.updateTime)),
        o: common_vendor.o(($event) => $options.goToRating(table._id), index),
        p: index,
        q: common_vendor.o(($event) => $options.goToRating(table._id), index)
      });
    }),
    k: _ctx.sIndex < 3,
    l: $data.tables.length > 0 && $data.hasMoreData
  }, $data.tables.length > 0 && $data.hasMoreData ? {
    m: common_vendor.o((...args) => $options.loadMore && $options.loadMore(...args)),
    n: $data.isLoading
  } : {}, {
    o: common_vendor.sei(common_vendor.gei(_ctx, ""), "view")
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../../.sourcemap/mp-weixin/pages/rater/tables/tables.js.map
