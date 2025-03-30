"use strict";
const common_vendor = require("../../../common/vendor.js");
const common_assets = require("../../../common/assets.js");
const _sfc_main = common_vendor.defineComponent({
  data() {
    return {
      userInfo: new UTSJSONObject({
        _id: "",
        username: "",
        name: "",
        role: 1,
        avatar: ""
      }),
      passwordForm: new UTSJSONObject({
        oldPassword: "",
        newPassword: "",
        confirmPassword: ""
      })
    };
  },
  onLoad() {
    this.loadUserInfo();
  },
  methods: {
    // 加载用户信息
    loadUserInfo() {
      const userInfoStr = common_vendor.index.getStorageSync("userInfo");
      if (userInfoStr) {
        this.userInfo = UTS.JSON.parse(userInfoStr);
      }
      common_vendor.tr.callFunction({
        name: "user",
        data: new UTSJSONObject({
          action: "getUserInfo",
          data: new UTSJSONObject({})
        })
      }).then((res) => {
        if (res.result.code === 0) {
          this.userInfo = res.result.data;
          common_vendor.index.setStorageSync("userInfo", UTS.JSON.stringify(this.userInfo));
        }
      });
    },
    // 获取角色名称
    getRoleName(role = null) {
      const roleMap = new UTSJSONObject({
        1: "普通用户",
        2: "评分员",
        3: "管理员"
      });
      return roleMap[role] || "未知角色";
    },
    // 保存用户信息
    saveUserInfo() {
      if (!this.userInfo.name) {
        common_vendor.index.showToast({
          title: "姓名不能为空",
          icon: "none"
        });
        return null;
      }
      common_vendor.index.showLoading({
        title: "保存中..."
      });
      common_vendor.tr.callFunction({
        name: "user",
        data: new UTSJSONObject({
          action: "updateUserInfo",
          data: new UTSJSONObject({
            name: this.userInfo.name
          })
        })
      }).then((res) => {
        common_vendor.index.hideLoading();
        if (res.result.code === 0) {
          common_vendor.index.showToast({
            title: "保存成功",
            icon: "success"
          });
          common_vendor.index.setStorageSync("userInfo", UTS.JSON.stringify(this.userInfo));
        } else {
          common_vendor.index.showToast({
            title: res.result.msg || "保存失败",
            icon: "none"
          });
        }
      }).catch((err = null) => {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/user/profile/profile.vue:213", err);
        common_vendor.index.showToast({
          title: "保存失败，请检查网络",
          icon: "none"
        });
      });
    },
    // 修改密码
    changePassword() {
      if (!this.passwordForm.oldPassword) {
        common_vendor.index.showToast({
          title: "请输入原密码",
          icon: "none"
        });
        return null;
      }
      if (!this.passwordForm.newPassword) {
        common_vendor.index.showToast({
          title: "请输入新密码",
          icon: "none"
        });
        return null;
      }
      if (this.passwordForm.newPassword.length < 6) {
        common_vendor.index.showToast({
          title: "新密码长度不能少于6位",
          icon: "none"
        });
        return null;
      }
      if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
        common_vendor.index.showToast({
          title: "两次输入的密码不一致",
          icon: "none"
        });
        return null;
      }
      common_vendor.index.showLoading({
        title: "修改中..."
      });
      common_vendor.tr.callFunction({
        name: "user",
        data: new UTSJSONObject({
          action: "changePassword",
          data: new UTSJSONObject({
            oldPassword: this.passwordForm.oldPassword,
            newPassword: this.passwordForm.newPassword
          })
        })
      }).then((res) => {
        common_vendor.index.hideLoading();
        if (res.result.code === 0) {
          common_vendor.index.showToast({
            title: "密码修改成功",
            icon: "success"
          });
          this.passwordForm = {
            oldPassword: "",
            newPassword: "",
            confirmPassword: ""
          };
        } else {
          common_vendor.index.showToast({
            title: res.result.msg || "密码修改失败",
            icon: "none"
          });
        }
      }).catch((err = null) => {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/user/profile/profile.vue:292", err);
        common_vendor.index.showToast({
          title: "密码修改失败，请检查网络",
          icon: "none"
        });
      });
    },
    // 清除缓存
    clearCache() {
      common_vendor.index.showLoading({
        title: "清除中..."
      });
      try {
        const token = common_vendor.index.getStorageSync("token");
        const userInfo = common_vendor.index.getStorageSync("userInfo");
        common_vendor.index.clearStorageSync();
        if (token) {
          common_vendor.index.setStorageSync("token", token);
        }
        if (userInfo) {
          common_vendor.index.setStorageSync("userInfo", userInfo);
        }
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({
          title: "缓存清除成功",
          icon: "success"
        });
      } catch (e) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/user/profile/profile.vue:329", e);
        common_vendor.index.showToast({
          title: "缓存清除失败",
          icon: "none"
        });
      }
    },
    // 关于我们
    aboutUs() {
      this.$refs.aboutPopup.open();
    },
    // 关闭关于我们弹窗
    closeAboutPopup() {
      this.$refs.aboutPopup.close();
    },
    // 确认退出登录
    confirmLogout() {
      this.$refs.logoutPopup.open();
    },
    // 关闭退出登录确认弹窗
    closeLogoutPopup() {
      this.$refs.logoutPopup.close();
    },
    // 退出登录
    logout() {
      common_vendor.index.removeStorageSync("token");
      common_vendor.index.removeStorageSync("userInfo");
      common_vendor.index.reLaunch({
        url: "/pages/login/login"
      });
    }
  }
});
if (!Array) {
  const _component_uni_popup_dialog = common_vendor.resolveComponent("uni-popup-dialog");
  const _component_uni_popup = common_vendor.resolveComponent("uni-popup");
  (_component_uni_popup_dialog + _component_uni_popup)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: $data.userInfo.avatar || "/static/images/default-avatar.png",
    b: common_vendor.t($data.userInfo.name || "未设置姓名"),
    c: common_vendor.t($options.getRoleName($data.userInfo.role)),
    d: common_vendor.n("role-" + $data.userInfo.role),
    e: common_vendor.t($data.userInfo.username || ""),
    f: $data.userInfo.name,
    g: common_vendor.o(($event) => $data.userInfo.name = $event.detail.value),
    h: common_vendor.t($options.getRoleName($data.userInfo.role)),
    i: common_vendor.o((...args) => $options.saveUserInfo && $options.saveUserInfo(...args)),
    j: $data.passwordForm.oldPassword,
    k: common_vendor.o(($event) => $data.passwordForm.oldPassword = $event.detail.value),
    l: $data.passwordForm.newPassword,
    m: common_vendor.o(($event) => $data.passwordForm.newPassword = $event.detail.value),
    n: $data.passwordForm.confirmPassword,
    o: common_vendor.o(($event) => $data.passwordForm.confirmPassword = $event.detail.value),
    p: common_vendor.o((...args) => $options.changePassword && $options.changePassword(...args)),
    q: common_vendor.o((...args) => $options.clearCache && $options.clearCache(...args)),
    r: common_vendor.o((...args) => $options.aboutUs && $options.aboutUs(...args)),
    s: common_vendor.o((...args) => $options.confirmLogout && $options.confirmLogout(...args)),
    t: common_vendor.o($options.logout),
    v: common_vendor.o($options.closeLogoutPopup),
    w: common_vendor.p({
      type: "warn",
      title: "确认退出",
      content: "确定要退出登录吗？",
      ["before-close"]: true
    }),
    x: common_vendor.sr("logoutPopup", "198aad34-0"),
    y: common_vendor.p({
      type: "dialog"
    }),
    z: common_vendor.o((...args) => $options.closeAboutPopup && $options.closeAboutPopup(...args)),
    A: common_assets._imports_0$1,
    B: common_vendor.sr("aboutPopup", "198aad34-2"),
    C: common_vendor.p({
      type: "center"
    }),
    D: common_vendor.sei(common_vendor.gei(_ctx, ""), "view")
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../../.sourcemap/mp-weixin/pages/user/profile/profile.js.map
