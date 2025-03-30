"use strict";
const common_vendor = require("../../../common/vendor.js");
const _sfc_main = common_vendor.defineComponent(new UTSJSONObject({
  data() {
    return {
      statusOptions: ["全部", "待处理", "已批准", "已拒绝"],
      statusIndex: 1,
      requestList: [],
      page: 1,
      pageSize: 10,
      hasMore: true,
      isLoading: false,
      // 当前操作的申请
      currentRequest: new UTSJSONObject({}),
      rejectReason: "",
      newPassword: ""
    };
  },
  onLoad() {
    this.loadResetRequests();
  },
  methods: new UTSJSONObject({
    // 加载密码重置申请
    loadResetRequests(refresh = true) {
      if (refresh) {
        this.page = 1;
        this.hasMore = true;
        this.requestList = [];
      }
      this.isLoading = true;
      let status = "";
      if (this.statusIndex === 1) {
        status = "pending";
      } else if (this.statusIndex === 2) {
        status = "approved";
      } else if (this.statusIndex === 3) {
        status = "rejected";
      }
      common_vendor.tr.callFunction({
        name: "user",
        data: new UTSJSONObject({
          action: "getResetRequests",
          data: new UTSJSONObject({
            status,
            page: this.page,
            pageSize: this.pageSize
          })
        })
      }).then((res) => {
        this.isLoading = false;
        if (res.result.code === 0) {
          const data = res.result.data;
          if (refresh) {
            this.requestList = data.list;
          } else {
            this.requestList = [...this.requestList, ...data.list];
          }
          this.hasMore = this.requestList.length < data.total;
        } else {
          common_vendor.index.showToast({
            title: res.result.msg || "加载失败",
            icon: "none"
          });
        }
      }).catch((err = null) => {
        this.isLoading = false;
        common_vendor.index.__f__("error", "at pages/admin/password-reset/password-reset.vue:180", err);
        common_vendor.index.showToast({
          title: "加载失败，请检查网络",
          icon: "none"
        });
      });
    },
    // 加载更多
    loadMore() {
      if (this.isLoading || !this.hasMore)
        return null;
      this.page++;
      this.loadResetRequests(false);
    },
    // 状态筛选变化
    handleStatusChange(e = null) {
      this.statusIndex = e.detail.value;
      this.loadResetRequests();
    },
    // 批准申请
    approveRequest(item = null) {
      this.currentRequest = item;
      this.$refs.approvePopup.open();
    },
    // 关闭批准确认弹窗
    closeApprovePopup() {
      this.$refs.approvePopup.close();
    },
    // 确认批准
    confirmApprove() {
      const adminInfo = common_vendor.index.getStorageSync("userInfo");
      const adminUsername = adminInfo ? UTS.JSON.parse(adminInfo).username : "管理员";
      common_vendor.index.showLoading({
        title: "处理中..."
      });
      common_vendor.tr.callFunction({
        name: "user",
        data: new UTSJSONObject({
          action: "approveResetRequest",
          data: new UTSJSONObject({
            requestId: this.currentRequest._id,
            adminUsername
          })
        })
      }).then((res) => {
        common_vendor.index.hideLoading();
        if (res.result.code === 0) {
          this.newPassword = res.result.data.newPassword;
          this.$refs.approvePopup.close();
          setTimeout(() => {
            this.$refs.successPopup.open();
          }, 300);
          this.loadResetRequests();
        } else {
          common_vendor.index.showToast({
            title: res.result.msg || "处理失败",
            icon: "none"
          });
        }
      }).catch((err = null) => {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/admin/password-reset/password-reset.vue:257", err);
        common_vendor.index.showToast({
          title: "处理失败，请检查网络",
          icon: "none"
        });
      });
    },
    // 显示拒绝弹窗
    showRejectDialog(item = null) {
      this.currentRequest = item;
      this.rejectReason = "";
      this.$refs.rejectPopup.open();
    },
    // 关闭拒绝弹窗
    closeRejectPopup() {
      this.$refs.rejectPopup.close();
    },
    // 确认拒绝
    confirmReject() {
      const adminInfo = common_vendor.index.getStorageSync("userInfo");
      const adminUsername = adminInfo ? UTS.JSON.parse(adminInfo).username : "管理员";
      common_vendor.index.showLoading({
        title: "处理中..."
      });
      common_vendor.tr.callFunction({
        name: "user",
        data: new UTSJSONObject({
          action: "rejectResetRequest",
          data: new UTSJSONObject({
            requestId: this.currentRequest._id,
            adminUsername,
            remark: this.rejectReason
          })
        })
      }).then((res) => {
        common_vendor.index.hideLoading();
        if (res.result.code === 0) {
          common_vendor.index.showToast({
            title: "已拒绝申请",
            icon: "success"
          });
          this.$refs.rejectPopup.close();
          this.loadResetRequests();
        } else {
          common_vendor.index.showToast({
            title: res.result.msg || "处理失败",
            icon: "none"
          });
        }
      }).catch((err = null) => {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/admin/password-reset/password-reset.vue:319", err);
        common_vendor.index.showToast({
          title: "处理失败，请检查网络",
          icon: "none"
        });
      });
    },
    // 关闭成功弹窗
    closeSuccessPopup() {
      this.$refs.successPopup.close();
    },
    // 复制密码
    copyPassword() {
      common_vendor.index.setClipboardData({
        data: this.newPassword,
        success: () => {
          common_vendor.index.showToast({
            title: "密码已复制",
            icon: "success"
          });
        }
      });
    },
    // 格式化时间
    formatTime(timestamp = null) {
      if (!timestamp)
        return "暂无";
      const date = new Date(timestamp);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      const hour = date.getHours().toString().padStart(2, "0");
      const minute = date.getMinutes().toString().padStart(2, "0");
      return `${year}-${month}-${day} ${hour}:${minute}`;
    }
  })
}));
if (!Array) {
  const _component_uni_popup_dialog = common_vendor.resolveComponent("uni-popup-dialog");
  const _component_uni_popup = common_vendor.resolveComponent("uni-popup");
  (_component_uni_popup_dialog + _component_uni_popup)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($data.statusOptions[$data.statusIndex]),
    b: common_vendor.o((...args) => $options.handleStatusChange && $options.handleStatusChange(...args)),
    c: $data.statusIndex,
    d: $data.statusOptions,
    e: common_vendor.o((...args) => $options.loadResetRequests && $options.loadResetRequests(...args)),
    f: $data.requestList.length === 0
  }, $data.requestList.length === 0 ? {
    g: common_vendor.t($data.statusIndex === 0 ? "暂无密码重置申请" : $data.statusIndex === 1 ? "暂无待处理申请" : $data.statusIndex === 2 ? "暂无已批准申请" : "暂无已拒绝申请")
  } : {}, {
    h: common_vendor.f($data.requestList, (item, index, i0) => {
      return common_vendor.e({
        a: common_vendor.t(item.username),
        b: common_vendor.t(item.name),
        c: common_vendor.t(item.status === "pending" ? "待处理" : item.status === "approved" ? "已批准" : "已拒绝"),
        d: common_vendor.n("status-" + item.status),
        e: common_vendor.t($options.formatTime(item.createTime)),
        f: item.status !== "pending"
      }, item.status !== "pending" ? common_vendor.e({
        g: common_vendor.t($options.formatTime(item.handleTime)),
        h: common_vendor.t(item.handleAdmin),
        i: item.remark
      }, item.remark ? {
        j: common_vendor.t(item.remark)
      } : {}) : {}, {
        k: item.status === "pending"
      }, item.status === "pending" ? {
        l: common_vendor.o(($event) => $options.approveRequest(item), index),
        m: common_vendor.o(($event) => $options.showRejectDialog(item), index)
      } : {}, {
        n: index
      });
    }),
    i: $data.hasMore && $data.requestList.length > 0
  }, $data.hasMore && $data.requestList.length > 0 ? {
    j: common_vendor.t($data.isLoading ? "加载中..." : "加载更多"),
    k: common_vendor.o((...args) => $options.loadMore && $options.loadMore(...args))
  } : {}, {
    l: common_vendor.o($options.confirmApprove),
    m: common_vendor.o($options.closeApprovePopup),
    n: common_vendor.p({
      type: "info",
      title: "确认批准",
      content: "批准后，系统将重置该用户密码并生成新密码。您需要将新密码告知用户。",
      ["before-close"]: true
    }),
    o: common_vendor.sr("approvePopup", "4d082b78-0"),
    p: common_vendor.p({
      type: "dialog"
    }),
    q: $data.rejectReason,
    r: common_vendor.o(($event) => $data.rejectReason = $event.detail.value),
    s: common_vendor.o((...args) => $options.closeRejectPopup && $options.closeRejectPopup(...args)),
    t: common_vendor.o((...args) => $options.confirmReject && $options.confirmReject(...args)),
    v: common_vendor.sr("rejectPopup", "4d082b78-2"),
    w: common_vendor.p({
      type: "dialog"
    }),
    x: common_vendor.t($data.currentRequest.username),
    y: common_vendor.t($data.currentRequest.name),
    z: common_vendor.t($data.newPassword),
    A: common_vendor.o((...args) => $options.copyPassword && $options.copyPassword(...args)),
    B: common_vendor.o((...args) => $options.closeSuccessPopup && $options.closeSuccessPopup(...args)),
    C: common_vendor.sr("successPopup", "4d082b78-3"),
    D: common_vendor.p({
      type: "dialog"
    }),
    E: common_vendor.sei(common_vendor.gei(_ctx, ""), "view")
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../../.sourcemap/mp-weixin/pages/admin/password-reset/password-reset.js.map
