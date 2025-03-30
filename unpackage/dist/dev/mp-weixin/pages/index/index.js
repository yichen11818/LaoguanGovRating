"use strict";
const common_vendor = require("../../common/vendor.js");
const common_assets = require("../../common/assets.js");
const _sfc_main = common_vendor.defineComponent({
  data() {
    return {
      userInfo: new UTSJSONObject({}),
      stats: new UTSJSONObject({
        tableCount: 0,
        subjectCount: 0,
        raterCount: 0,
        ratingCompletionRate: "0%"
      }),
      raterStats: new UTSJSONObject({
        tableCount: 0,
        ratedCount: 0,
        pendingCount: 0
      }),
      tables: []
    };
  },
  computed: {
    roleText() {
      const roleMap = new UTSJSONObject({
        "admin": "管理员",
        "rater": "评分员",
        "user": "普通用户"
      });
      return roleMap[this.userInfo.role] || "未知角色";
    }
  },
  onShow() {
    const token = common_vendor.index.getStorageSync("token");
    if (!token) {
      common_vendor.index.redirectTo({
        url: "/pages/login/login"
      });
      return null;
    }
    this.userInfo = common_vendor.index.getStorageSync("userInfo") || new UTSJSONObject({});
    if (this.userInfo.role === "admin") {
      this.loadAdminStats();
    } else if (this.userInfo.role === "rater") {
      this.loadRaterData();
    }
  },
  methods: {
    navigateTo(url = null) {
      common_vendor.index.navigateTo({ url });
    },
    goToRating(tableId = null) {
      common_vendor.index.navigateTo({
        url: `/pages/rater/rating/rating?tableId=${tableId}`
      });
    },
    getTableTypeName(type = null) {
      const typeMap = new UTSJSONObject({
        1: "(办公室)一般干部评分",
        2: "(驻村)干部评分",
        3: "班子评分"
      });
      return typeMap[type] || "未知类型";
    },
    // 加载管理员统计数据
    loadAdminStats() {
      common_vendor.tr.callFunction({
        name: "ratingTable",
        data: new UTSJSONObject({
          action: "getTables",
          data: new UTSJSONObject({})
        })
      }).then((res) => {
        if (res.result.code === 0) {
          this.stats.tableCount = res.result.data.total || 0;
        }
      });
      common_vendor.tr.callFunction({
        name: "subject",
        data: new UTSJSONObject({
          action: "getSubjects",
          data: new UTSJSONObject({})
        })
      }).then((res) => {
        if (res.result.code === 0) {
          this.stats.subjectCount = res.result.data.total || 0;
        }
      });
      common_vendor.tr.callFunction({
        name: "user",
        data: new UTSJSONObject({
          action: "getUsers",
          data: new UTSJSONObject({
            role: "rater"
          })
        })
      }).then((res) => {
        if (res.result.code === 0) {
          this.stats.raterCount = res.result.data.total || 0;
        }
      });
      common_vendor.tr.callFunction({
        name: "rating",
        data: new UTSJSONObject({
          action: "getRatingStats",
          data: new UTSJSONObject({})
        })
      }).then((res) => {
        if (res.result.code === 0 && res.result.data.length > 0) {
          let totalSubjects = 0;
          let totalRated = 0;
          res.result.data.forEach((item = null) => {
            totalSubjects += item.totalSubjects;
            totalRated += item.ratedCount;
          });
          const rate = totalSubjects > 0 ? Math.round(totalRated / totalSubjects * 100) : 0;
          this.stats.ratingCompletionRate = `${rate}%`;
        }
      });
    },
    // 加载评分员数据
    loadRaterData() {
      common_vendor.tr.callFunction({
        name: "ratingTable",
        data: new UTSJSONObject({
          action: "getTables",
          data: new UTSJSONObject({
            rater: this.userInfo.username
          })
        })
      }).then((res) => {
        if (res.result.code === 0) {
          const tables = res.result.data.list || [];
          this.raterStats.tableCount = tables.length;
          this.tables = tables.slice(0, 5);
          this.tables.forEach((table, index) => {
            common_vendor.tr.callFunction({
              name: "subject",
              data: new UTSJSONObject({
                action: "getSubjects",
                data: new UTSJSONObject({
                  table_id: table._id
                })
              })
            }).then((subjectRes) => {
              const subjects = subjectRes.result.data.list || [];
              const totalSubjects = subjects.length;
              common_vendor.tr.callFunction({
                name: "rating",
                data: new UTSJSONObject({
                  action: "getRatings",
                  data: new UTSJSONObject({
                    table_id: table._id,
                    rater: this.userInfo.username
                  })
                })
              }).then((ratingRes) => {
                const ratings = ratingRes.result.data.list || [];
                const ratedCount = ratings.length;
                const completion = totalSubjects > 0 ? Math.round(ratedCount / totalSubjects * 100) : 0;
                this.$set(this.tables[index], "completion", completion);
                this.raterStats.ratedCount += ratedCount;
                this.raterStats.pendingCount += totalSubjects - ratedCount;
              });
            });
          });
        }
      });
    }
  }
});
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($data.userInfo.name || "用户"),
    b: common_vendor.t($options.roleText),
    c: common_vendor.n("role-" + $data.userInfo.role),
    d: $data.userInfo.role === "admin"
  }, $data.userInfo.role === "admin" ? {
    e: common_vendor.t($data.stats.tableCount || 0),
    f: common_vendor.o(($event) => $options.navigateTo("/pages/admin/tables/tables")),
    g: common_vendor.t($data.stats.subjectCount || 0),
    h: common_vendor.o(($event) => $options.navigateTo("/pages/admin/subjects/subjects")),
    i: common_vendor.t($data.stats.raterCount || 0),
    j: common_vendor.o(($event) => $options.navigateTo("/pages/admin/users/users")),
    k: common_vendor.t($data.stats.ratingCompletionRate || "0%"),
    l: common_vendor.o(($event) => $options.navigateTo("/pages/admin/stats/stats")),
    m: common_assets._imports_0,
    n: common_vendor.o(($event) => $options.navigateTo("/pages/admin/tables/tables")),
    o: common_assets._imports_1,
    p: common_vendor.o(($event) => $options.navigateTo("/pages/admin/subjects/subjects")),
    q: common_assets._imports_2,
    r: common_vendor.o(($event) => $options.navigateTo("/pages/admin/users/users")),
    s: common_assets._imports_3,
    t: common_vendor.o(($event) => $options.navigateTo("/pages/admin/stats/stats"))
  } : {}, {
    v: $data.userInfo.role === "rater"
  }, $data.userInfo.role === "rater" ? common_vendor.e({
    w: common_vendor.t($data.raterStats.tableCount || 0),
    x: common_vendor.o(($event) => $options.navigateTo("/pages/rater/tables/tables")),
    y: common_vendor.t($data.raterStats.ratedCount || 0),
    z: common_vendor.o(($event) => $options.navigateTo("/pages/rater/history/history")),
    A: common_vendor.t($data.raterStats.pendingCount || 0),
    B: common_vendor.o(($event) => $options.navigateTo("/pages/rater/tables/tables")),
    C: $data.tables.length === 0
  }, $data.tables.length === 0 ? {} : {}, {
    D: common_vendor.f($data.tables, (table, index, i0) => {
      return {
        a: common_vendor.t(table.name),
        b: common_vendor.t($options.getTableTypeName(table.type)),
        c: common_vendor.t(table.category || ""),
        d: table.completion || 0,
        e: common_vendor.t(table.completion || 0),
        f: index,
        g: common_vendor.o(($event) => $options.goToRating(table._id), index)
      };
    })
  }) : {}, {
    E: $data.userInfo.role === "user"
  }, $data.userInfo.role === "user" ? {
    F: common_vendor.t($data.userInfo.username || ""),
    G: common_vendor.t($data.userInfo.name || ""),
    H: common_vendor.t($options.roleText)
  } : {}, {
    I: common_vendor.sei(common_vendor.gei(_ctx, ""), "view")
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/index/index.js.map
