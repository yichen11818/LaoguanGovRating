"use strict";
const common_vendor = require("../../../common/vendor.js");
const common_assets = require("../../../common/assets.js");
const _sfc_main = common_vendor.defineComponent({
  data() {
    return {
      isLoggedIn: false,
      userInfo: new UTSJSONObject({
        _id: "",
        username: "",
        name: "游客",
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
  onShow() {
    this.checkLoginStatus();
  },
  methods: {
    // 检查登录状态
    checkLoginStatus() {
      const token = common_vendor.index.getStorageSync("token");
      const userInfoStr = common_vendor.index.getStorageSync("userInfo");
      if (token && userInfoStr) {
        this.isLoggedIn = true;
        this.userInfo = UTS.JSON.parse(userInfoStr);
        this.loadUserInfo();
      } else {
        this.isLoggedIn = false;
        this.userInfo = {
          name: "游客",
          role: 1
        };
      }
    },
    // 前往登录页
    goToLogin() {
      common_vendor.index.navigateTo({
        url: "/pages/login/login"
      });
    },
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
      return roleMap[role] || "游客";
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
        common_vendor.index.__f__("error", "at pages/user/profile/profile.vue:253", err);
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
        common_vendor.index.__f__("error", "at pages/user/profile/profile.vue:332", err);
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
        common_vendor.index.__f__("error", "at pages/user/profile/profile.vue:369", e);
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
      this.isLoggedIn = false;
      this.userInfo = {
        name: "游客",
        role: 1
      };
      common_vendor.index.showToast({
        title: "已退出登录",
        icon: "success"
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
  return common_vendor.e({
    a: $data.userInfo.avatar || "/static/images/default-avatar.png",
    b: common_vendor.t($data.userInfo.name || "游客"),
    c: common_vendor.t($options.getRoleName($data.userInfo.role)),
    d: common_vendor.n("role-" + $data.userInfo.role),
    e: !$data.isLoggedIn
  }, !$data.isLoggedIn ? {
    f: common_assets._imports_0$1,
    g: common_vendor.o((...args) => $options.goToLogin && $options.goToLogin(...args))
  } : {}, {
    h: $data.isLoggedIn
  }, $data.isLoggedIn ? {
    i: common_vendor.t($data.userInfo.username || ""),
    j: $data.userInfo.name,
    k: common_vendor.o(($event) => $data.userInfo.name = $event.detail.value),
    l: common_vendor.t($options.getRoleName($data.userInfo.role)),
    m: common_vendor.o((...args) => $options.saveUserInfo && $options.saveUserInfo(...args)),
    n: $data.passwordForm.oldPassword,
    o: common_vendor.o(($event) => $data.passwordForm.oldPassword = $event.detail.value),
    p: $data.passwordForm.newPassword,
    q: common_vendor.o(($event) => $data.passwordForm.newPassword = $event.detail.value),
    r: $data.passwordForm.confirmPassword,
    s: common_vendor.o(($event) => $data.passwordForm.confirmPassword = $event.detail.value),
    t: common_vendor.o((...args) => $options.changePassword && $options.changePassword(...args)),
    v: common_vendor.o((...args) => $options.clearCache && $options.clearCache(...args)),
    w: common_vendor.o((...args) => $options.aboutUs && $options.aboutUs(...args)),
    x: common_vendor.o((...args) => $options.confirmLogout && $options.confirmLogout(...args))
  } : {}, {
    y: common_vendor.o($options.logout),
    z: common_vendor.o($options.closeLogoutPopup),
    A: common_vendor.p({
      type: "warn",
      title: "确认退出",
      content: "确定要退出登录吗？",
      ["before-close"]: true
    }),
    B: common_vendor.sr("logoutPopup", "198aad34-0"),
    C: common_vendor.p({
      type: "dialog"
    }),
    D: common_vendor.o((...args) => $options.closeAboutPopup && $options.closeAboutPopup(...args)),
    E: common_assets._imports_1$1,
    F: common_vendor.sr("aboutPopup", "198aad34-2"),
    G: common_vendor.p({
      type: "center"
    }),
    H: common_vendor.sei(common_vendor.gei(_ctx, ""), "view")
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../../.sourcemap/mp-weixin/pages/user/profile/profile.js.map
