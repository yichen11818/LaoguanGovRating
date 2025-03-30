"use strict";
const common_vendor = require("../../../common/vendor.js");
const common_assets = require("../../../common/assets.js");
const _sfc_main = common_vendor.defineComponent({
  data() {
    return {
      currentTableIndex: 0,
      tables: [new UTSJSONObject({ _id: "", name: "全部评分表" })],
      currentTable: new UTSJSONObject({}),
      overview: new UTSJSONObject({
        tableCount: 0,
        subjectCount: 0,
        ratingCount: 0,
        completionRate: "0%"
      }),
      subjects: [],
      page: 1,
      pageSize: 10,
      total: 0,
      hasMoreData: false,
      isLoading: false
    };
  },
  onLoad() {
    this.loadTables();
    this.loadOverview();
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
    // 加载评分表列表
    loadTables() {
      common_vendor.index.showLoading({
        title: "加载中..."
      });
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
        common_vendor.index.hideLoading();
        if (res.result.code === 0) {
          const data = res.result.data;
          this.tables = [new UTSJSONObject({ _id: "", name: "全部评分表" })].concat(data.list);
        } else {
          common_vendor.index.showToast({
            title: res.result.msg || "加载失败",
            icon: "none"
          });
        }
      }).catch((err = null) => {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/admin/stats/stats.vue:175", err);
        common_vendor.index.showToast({
          title: "加载失败，请检查网络",
          icon: "none"
        });
      });
    },
    // 加载概览数据
    loadOverview() {
      common_vendor.tr.callFunction({
        name: "rating",
        data: new UTSJSONObject({
          action: "getRatingStats",
          data: new UTSJSONObject({})
        })
      }).then((res) => {
        if (res.result.code === 0) {
          this.overview = res.result.data || this.overview;
        }
      });
    },
    // 处理评分表筛选变化
    handleTableChange(e = null) {
      this.currentTableIndex = e.detail.value;
      this.page = 1;
      this.subjects = [];
      if (this.currentTableIndex > 0) {
        this.loadTableStats();
        this.loadSubjectStats();
      }
    },
    // 加载当前评分表统计
    loadTableStats() {
      const tableId = this.tables[this.currentTableIndex]._id;
      common_vendor.tr.callFunction({
        name: "rating",
        data: new UTSJSONObject({
          action: "getTableStats",
          data: new UTSJSONObject({
            table_id: tableId
          })
        })
      }).then((res) => {
        if (res.result.code === 0) {
          this.currentTable = res.result.data || new UTSJSONObject({});
        }
      });
    },
    // 加载考核对象得分统计
    loadSubjectStats() {
      this.isLoading = true;
      const tableId = this.tables[this.currentTableIndex]._id;
      common_vendor.tr.callFunction({
        name: "rating",
        data: new UTSJSONObject({
          action: "getSubjectStats",
          data: new UTSJSONObject({
            table_id: tableId,
            page: this.page,
            pageSize: this.pageSize
          })
        })
      }).then((res) => {
        this.isLoading = false;
        if (res.result.code === 0) {
          const data = res.result.data;
          if (this.page === 1) {
            this.subjects = data.list;
          } else {
            this.subjects = this.subjects.concat(data.list);
          }
          this.total = data.total;
          this.hasMoreData = this.subjects.length < this.total;
        } else {
          common_vendor.index.showToast({
            title: res.result.msg || "加载失败",
            icon: "none"
          });
        }
      }).catch((err = null) => {
        this.isLoading = false;
        common_vendor.index.__f__("error", "at pages/admin/stats/stats.vue:267", err);
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
      this.loadSubjectStats();
    }
  }
});
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($data.tables[$data.currentTableIndex].name),
    b: common_vendor.o((...args) => $options.handleTableChange && $options.handleTableChange(...args)),
    c: $data.currentTableIndex,
    d: $data.tables,
    e: common_vendor.t($data.overview.tableCount || 0),
    f: common_vendor.t($data.overview.subjectCount || 0),
    g: common_vendor.t($data.overview.ratingCount || 0),
    h: common_vendor.t($data.overview.completionRate || "0%"),
    i: $data.currentTableIndex > 0
  }, $data.currentTableIndex > 0 ? common_vendor.e({
    j: common_vendor.t($data.tables[$data.currentTableIndex].name || ""),
    k: $data.currentTable.type
  }, $data.currentTable.type ? {
    l: common_vendor.t($options.getTableTypeName($data.currentTable.type))
  } : {}, {
    m: common_vendor.t($data.currentTable.subjectCount || 0),
    n: common_vendor.t($data.currentTable.ratingCount || 0),
    o: common_vendor.t($data.currentTable.rater || "未分配"),
    p: $data.currentTable.completionRate || 0,
    q: common_vendor.t($data.currentTable.completionRate || 0)
  }) : {}, {
    r: $data.currentTableIndex > 0
  }, $data.currentTableIndex > 0 ? common_vendor.e({
    s: $data.subjects.length === 0
  }, $data.subjects.length === 0 ? {
    t: common_assets._imports_0$2
  } : {}, {
    v: common_vendor.f($data.subjects, (subject, index, i0) => {
      return common_vendor.e({
        a: common_vendor.t(subject.name),
        b: common_vendor.t(subject.totalScore || 0),
        c: common_vendor.t(subject.maxScore || 0),
        d: subject.department || subject.position
      }, subject.department || subject.position ? common_vendor.e({
        e: subject.department
      }, subject.department ? {
        f: common_vendor.t(subject.department)
      } : {}, {
        g: subject.position
      }, subject.position ? {
        h: common_vendor.t(subject.position)
      } : {}) : {}, {
        i: common_vendor.f(subject.scores, (item, itemIndex, i1) => {
          return {
            a: common_vendor.t(item.name),
            b: common_vendor.t(item.score || 0),
            c: common_vendor.t(item.maxScore || 0),
            d: itemIndex
          };
        }),
        j: subject.comment
      }, subject.comment ? {
        k: common_vendor.t(subject.comment)
      } : {}, {
        l: index
      });
    })
  }) : {}, {
    w: $data.subjects.length > 0 && $data.hasMoreData
  }, $data.subjects.length > 0 && $data.hasMoreData ? {
    x: common_vendor.o((...args) => $options.loadMore && $options.loadMore(...args)),
    y: $data.isLoading
  } : {}, {
    z: common_vendor.sei(common_vendor.gei(_ctx, ""), "view")
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../../.sourcemap/mp-weixin/pages/admin/stats/stats.js.map
