"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = common_vendor.defineComponent({
  data() {
    return {
      userInfo: new UTSJSONObject({}),
      isLoggedIn: false,
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
        "user": "普通用户",
        3: "管理员",
        2: "评分员",
        1: "普通用户"
      });
      return roleMap[this.userInfo.role] || "未知角色";
    }
  },
  onShow() {
    console.log("===== 首页显示 - 开始检查用户身份 =====");
    const token = common_vendor.index.getStorageSync("token");
    const userInfoStr = common_vendor.index.getStorageSync("userInfo");
    console.log("检查登录: token存在?", !!token);
    console.log("检查登录: userInfo存在?", !!userInfoStr);
    if (token && userInfoStr) {
      try {
        const userInfo = UTS.JSON.parse(userInfoStr);
        this.isLoggedIn = true;
        this.userInfo = userInfo;
        console.log("用户已登录，身份信息:", userInfo);
        console.log("用户角色:", userInfo.role, "类型:", typeof userInfo.role);
        this.checkRoleAndLogin();
        this.loadData();
      } catch (e) {
        console.error("解析用户信息出错:", e);
        this.resetUserState();
      }
    } else {
      console.log("用户未登录或登录信息不完整，进入游客模式");
      this.resetUserState();
    }
  },
  methods: {
    checkRoleAndLogin() {
      console.log("检查用户角色:", this.userInfo.role, typeof this.userInfo.role);
      const isAdmin = this.userInfo.role === "admin" || this.userInfo.role === 3;
      const isRater = this.userInfo.role === "rater" || this.userInfo.role === 2;
      this.userInfo.role === "user" || this.userInfo.role === 1;
      if (isAdmin) {
        console.log("当前用户是管理员");
        this.isAdmin = true;
        this.isRater = false;
      } else if (isRater) {
        console.log("当前用户是评分员");
        this.isAdmin = false;
        this.isRater = true;
      } else {
        console.log("当前用户是普通用户");
        this.isAdmin = false;
        this.isRater = false;
      }
    },
    navigateTo(url = null) {
      if (!this.isLoggedIn) {
        common_vendor.index.navigateTo({
          url: "/pages/login/login"
        });
        return false;
      }
      common_vendor.index.navigateTo({ url });
    },
    goToRating(tableId = null) {
      if (!this.isLoggedIn) {
        common_vendor.index.navigateTo({
          url: "/pages/login/login"
        });
        return false;
      }
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
    },
    resetUserState() {
      this.isLoggedIn = false;
      this.userInfo = new UTSJSONObject({
        name: "游客",
        role: "user"
      });
    },
    loadData() {
      if (this.isAdmin) {
        this.loadAdminStats();
      } else if (this.isRater) {
        this.loadRaterData();
      }
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
    m: common_vendor.o(($event) => $options.navigateTo("/pages/admin/tables/tables")),
    n: common_vendor.o(($event) => $options.navigateTo("/pages/admin/subjects/subjects")),
    o: common_vendor.o(($event) => $options.navigateTo("/pages/admin/users/users")),
    p: common_vendor.o(($event) => $options.navigateTo("/pages/admin/stats/stats"))
  } : {}, {
    q: $data.userInfo.role === "rater"
  }, $data.userInfo.role === "rater" ? common_vendor.e({
    r: common_vendor.t($data.raterStats.tableCount || 0),
    s: common_vendor.o(($event) => $options.navigateTo("/pages/rater/tables/tables")),
    t: common_vendor.t($data.raterStats.ratedCount || 0),
    v: common_vendor.o(($event) => $options.navigateTo("/pages/rater/history/history")),
    w: common_vendor.t($data.raterStats.pendingCount || 0),
    x: common_vendor.o(($event) => $options.navigateTo("/pages/rater/tables/tables")),
    y: $data.tables.length === 0
  }, $data.tables.length === 0 ? {} : {}, {
    z: common_vendor.f($data.tables, (table, index, i0) => {
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
    A: $data.userInfo.role === "user"
  }, $data.userInfo.role === "user" ? {
    B: common_vendor.t($data.userInfo.username || ""),
    C: common_vendor.t($data.userInfo.name || ""),
    D: common_vendor.t($options.roleText)
  } : {}, {
    E: common_vendor.sei(common_vendor.gei(_ctx, ""), "view")
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
