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
    console.log("=== 页面显示 - 开始检查登录状态 ===");
    this.checkLoginStatus();
  },
  methods: {
    // 检查登录状态
    checkLoginStatus() {
      const token = common_vendor.index.getStorageSync("token");
      const userInfoStr = common_vendor.index.getStorageSync("userInfo");
      console.log("检查登录状态: token存在?", !!token);
      console.log("检查登录状态: userInfo存在?", !!userInfoStr);
      if (token && userInfoStr) {
        this.isLoggedIn = true;
        this.userInfo = UTS.JSON.parse(userInfoStr);
        console.log("用户已登录，从本地存储获取的用户信息:", this.userInfo);
        console.log("用户角色:", this.userInfo.role, "(" + this.getRoleName(this.userInfo.role) + ")");
        this.loadUserInfo();
      } else {
        this.isLoggedIn = false;
        this.userInfo = {
          name: "游客",
          role: 1
        };
        console.log("用户未登录，设置为游客模式");
      }
    },
    // 前往登录页
    goToLogin() {
      console.log("跳转到登录页面");
      common_vendor.index.navigateTo({
        url: "/pages/login/login"
      });
    },
    // 加载用户信息
    loadUserInfo() {
      const userInfoStr = common_vendor.index.getStorageSync("userInfo");
      if (userInfoStr) {
        this.userInfo = UTS.JSON.parse(userInfoStr);
        console.log("从本地存储加载用户信息:", this.userInfo);
      }
      console.log("开始从服务器获取最新用户信息");
      common_vendor.tr.callFunction({
        name: "user",
        data: new UTSJSONObject({
          action: "getUserInfo",
          data: new UTSJSONObject({
            username: this.userInfo.username
            // 传递用户名给云函数
          })
        })
      }).then((res) => {
        console.log("服务器返回用户信息:", res.result);
        if (res.result.code === 0) {
          this.userInfo = res.result.data;
          console.log("更新后的用户信息:", this.userInfo);
          console.log("用户角色:", this.userInfo.role, "(" + this.getRoleName(this.userInfo.role) + ")");
          common_vendor.index.setStorageSync("userInfo", UTS.JSON.stringify(this.userInfo));
        } else {
          console.error("获取用户信息失败:", res.result.msg);
        }
      }).catch((err = null) => {
        console.error("调用云函数失败:", err);
      });
    },
    // 获取角色名称
    getRoleName(role = null) {
      const numericRoleMap = new UTSJSONObject({
        1: "普通用户",
        2: "评分员",
        3: "管理员"
      });
      const stringRoleMap = new UTSJSONObject({
        "user": "普通用户",
        "rater": "评分员",
        "admin": "管理员"
      });
      if (numericRoleMap[role]) {
        return numericRoleMap[role];
      }
      if (stringRoleMap[role]) {
        return stringRoleMap[role];
      }
      return "游客";
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
      console.log("准备保存用户信息:", new UTSJSONObject({
        name: this.userInfo.name,
        workUnit: this.userInfo.workUnit,
        username: this.userInfo.username
      }));
      common_vendor.tr.callFunction({
        name: "user",
        data: new UTSJSONObject({
          action: "updateUserInfo",
          data: new UTSJSONObject({
            name: this.userInfo.name,
            workUnit: this.userInfo.workUnit,
            username: this.userInfo.username
            // 传递用户名
          })
        })
      }).then((res) => {
        common_vendor.index.hideLoading();
        console.log("保存用户信息结果:", res.result);
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
        console.error("保存用户信息出错:", err);
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
      console.log("准备修改密码:", new UTSJSONObject({
        oldPassword: this.passwordForm.oldPassword,
        newPassword: this.passwordForm.newPassword,
        username: this.userInfo.username
      }));
      common_vendor.tr.callFunction({
        name: "user",
        data: new UTSJSONObject({
          action: "changePassword",
          data: new UTSJSONObject({
            oldPassword: this.passwordForm.oldPassword,
            newPassword: this.passwordForm.newPassword,
            username: this.userInfo.username
            // 传递用户名
          })
        })
      }).then((res) => {
        common_vendor.index.hideLoading();
        console.log("修改密码结果:", res.result);
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
        console.error("修改密码出错:", err);
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
        console.error(e);
        common_vendor.index.showToast({
          title: "缓存清除失败",
          icon: "none"
        });
      }
    },
    // 确认退出登录
    confirmLogout() {
      common_vendor.index.showModal(new UTSJSONObject({
        title: "确认退出",
        content: "确定要退出登录吗？",
        success: (res) => {
          if (res.confirm) {
            this.logout();
          }
        }
      }));
    },
    // 退出登录
    logout() {
      console.log("执行退出登录操作");
      common_vendor.index.removeStorageSync("token");
      common_vendor.index.removeStorageSync("userInfo");
      this.isLoggedIn = false;
      this.userInfo = {
        name: "游客",
        role: 1
      };
      console.log("退出登录完成，用户状态已重置为游客");
      common_vendor.index.showToast({
        title: "已退出登录",
        icon: "success"
      });
    }
  }
});
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.userInfo.avatar || "../../../static/images/default-avatar.png",
    b: common_vendor.t($data.userInfo.name || "游客"),
    c: common_vendor.t($options.getRoleName($data.userInfo.role)),
    d: common_vendor.n("role-" + $data.userInfo.role),
    e: !$data.isLoggedIn
  }, !$data.isLoggedIn ? {
    f: common_assets._imports_0,
    g: common_vendor.o((...args) => $options.goToLogin && $options.goToLogin(...args))
  } : {}, {
    h: $data.isLoggedIn
  }, $data.isLoggedIn ? {
    i: common_vendor.t($data.userInfo.username || ""),
    j: $data.userInfo.name,
    k: common_vendor.o(($event) => $data.userInfo.name = $event.detail.value),
    l: common_vendor.t($options.getRoleName($data.userInfo.role)),
    m: $data.userInfo.workUnit,
    n: common_vendor.o(($event) => $data.userInfo.workUnit = $event.detail.value),
    o: common_vendor.o((...args) => $options.saveUserInfo && $options.saveUserInfo(...args)),
    p: $data.passwordForm.oldPassword,
    q: common_vendor.o(($event) => $data.passwordForm.oldPassword = $event.detail.value),
    r: $data.passwordForm.newPassword,
    s: common_vendor.o(($event) => $data.passwordForm.newPassword = $event.detail.value),
    t: $data.passwordForm.confirmPassword,
    v: common_vendor.o(($event) => $data.passwordForm.confirmPassword = $event.detail.value),
    w: common_vendor.o((...args) => $options.changePassword && $options.changePassword(...args)),
    x: common_vendor.o((...args) => $options.clearCache && $options.clearCache(...args)),
    y: common_vendor.o((...args) => $options.confirmLogout && $options.confirmLogout(...args))
  } : {}, {
    z: common_vendor.sei(common_vendor.gei(_ctx, ""), "view")
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-952fae71"]]);
wx.createPage(MiniProgramPage);
