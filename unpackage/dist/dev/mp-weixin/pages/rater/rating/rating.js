"use strict";
const common_vendor = require("../../../common/vendor.js");
const common_assets = require("../../../common/assets.js");
const _sfc_main = common_vendor.defineComponent({
  data() {
    return {
      tableId: "",
      table: new UTSJSONObject({}),
      subjects: [],
      currentSubjectIndex: 0,
      currentSubject: new UTSJSONObject({}),
      scores: [],
      comment: "",
      existingRating: null
    };
  },
  computed: new UTSJSONObject({
    subjectOptions() {
      return this.subjects.map((item) => {
        return new UTSJSONObject({
          _id: item._id,
          name: item.name,
          position: item.position,
          department: item.department
        });
      });
    }
  }),
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
          this.table = res.result.data.table || new UTSJSONObject({});
          this.subjects = res.result.data.subjects || [];
          this.initScores();
          if (this.subjects.length > 0) {
            this.currentSubject = this.subjects[0];
            this.loadExistingRating();
          }
        } else {
          common_vendor.index.showToast({
            title: res.result.msg || "加载失败",
            icon: "none"
          });
        }
      }).catch((err = null) => {
        common_vendor.index.hideLoading();
        console.error(err);
        common_vendor.index.showToast({
          title: "加载失败，请检查网络",
          icon: "none"
        });
      });
    },
    // 初始化评分项
    initScores() {
      if (this.table.items && this.table.items.length > 0) {
        this.scores = this.table.items.map((item = null) => {
          return new UTSJSONObject({
            item_id: item._id || "",
            name: item.name,
            score: 0,
            maxScore: item.maxScore
          });
        });
      }
    },
    // 处理考核对象选择变化
    handleSubjectChange(e = null) {
      const index = e.detail.value;
      this.currentSubjectIndex = index;
      this.currentSubject = this.subjects[index];
      this.initScores();
      this.comment = "";
      this.loadExistingRating();
    },
    // 加载已有评分记录
    loadExistingRating() {
      common_vendor.index.getStorageSync("userInfo") || new UTSJSONObject({});
      common_vendor.tr.callFunction({
        name: "rating",
        data: new UTSJSONObject({
          action: "getRatingBySubject",
          data: new UTSJSONObject({
            table_id: this.tableId,
            subject: this.currentSubject.name
          })
        })
      }).then((res) => {
        if (res.result.code === 0 && res.result.data) {
          this.existingRating = res.result.data.rating;
          if (this.existingRating) {
            this.comment = this.existingRating.comment || "";
            if (this.existingRating.scores && this.existingRating.scores.length > 0) {
              this.existingRating.scores.forEach((score = null, index = null) => {
                if (index < this.scores.length) {
                  this.scores[index].score = score.score;
                }
              });
            }
          }
        }
      });
    },
    // 处理评分变化
    handleScoreChange(e = null, index = null) {
      const score = e.detail.value;
      if (index < this.scores.length) {
        this.scores[index].score = score;
      }
    },
    // 计算总分
    calculateTotalScore() {
      let total = 0;
      this.scores.forEach((item) => {
        total += parseInt(item.score || 0);
      });
      return total;
    },
    // 计算最高分
    calculateMaxScore() {
      let max = 0;
      this.scores.forEach((item) => {
        max += parseInt(item.maxScore || 0);
      });
      return max;
    },
    // 提交评分
    handleSubmit() {
      if (!this.currentSubject._id) {
        common_vendor.index.showToast({
          title: "请选择考核对象",
          icon: "none"
        });
        return null;
      }
      let valid = true;
      this.scores.forEach((item) => {
        if (item.score < 0 || item.score > item.maxScore) {
          valid = false;
        }
      });
      if (!valid) {
        common_vendor.index.showToast({
          title: "评分不能超出范围",
          icon: "none"
        });
        return null;
      }
      common_vendor.index.showLoading({
        title: "提交中..."
      });
      const userInfo = common_vendor.index.getStorageSync("userInfo") || new UTSJSONObject({});
      common_vendor.tr.callFunction({
        name: "rating",
        data: new UTSJSONObject({
          action: "submitRating",
          data: new UTSJSONObject({
            table_id: this.tableId,
            rater: userInfo.username,
            subject: this.currentSubject.name,
            scores: this.scores,
            comment: this.comment
          })
        })
      }).then((res) => {
        common_vendor.index.hideLoading();
        if (res.result.code === 0) {
          common_vendor.index.showToast({
            title: "评分提交成功",
            icon: "success"
          });
          this.existingRating = {
            _id: res.result.data.id,
            table_id: this.tableId,
            rater: userInfo.username,
            subject: this.currentSubject.name,
            scores: this.scores,
            comment: this.comment,
            total_score: this.calculateTotalScore()
          };
        } else {
          common_vendor.index.showToast({
            title: res.result.msg || "提交失败",
            icon: "none"
          });
        }
      }).catch((err = null) => {
        common_vendor.index.hideLoading();
        console.error(err);
        common_vendor.index.showToast({
          title: "提交失败，请检查网络",
          icon: "none"
        });
      });
    }
  }
});
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
    f: common_vendor.t($data.currentSubject.name || "请选择考核对象"),
    g: common_vendor.o((...args) => $options.handleSubjectChange && $options.handleSubjectChange(...args)),
    h: $data.currentSubjectIndex,
    i: $options.subjectOptions,
    j: $data.currentSubject._id
  }, $data.currentSubject._id ? {
    k: common_vendor.f($data.table.items, (item, index, i0) => {
      var _a;
      return {
        a: common_vendor.t(item.name),
        b: common_vendor.t(item.maxScore),
        c: item.maxScore,
        d: ((_a = $data.scores[index]) == null ? void 0 : _a.score) || 0,
        e: common_vendor.o((e) => $options.handleScoreChange(e, index), index),
        f: index
      };
    }),
    l: $data.comment,
    m: common_vendor.o(($event) => $data.comment = $event.detail.value),
    n: common_vendor.t($options.calculateTotalScore()),
    o: common_vendor.t($options.calculateMaxScore()),
    p: common_vendor.o((...args) => $options.handleSubmit && $options.handleSubmit(...args))
  } : {}, {
    q: $data.subjects.length === 0
  }, $data.subjects.length === 0 ? {
    r: common_assets._imports_0$1
  } : {}, {
    s: common_vendor.sei(common_vendor.gei(_ctx, ""), "view")
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
