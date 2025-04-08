"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = common_vendor.defineComponent(new UTSJSONObject({
  data() {
    return {
      isLoginMode: true,
      isForgetMode: false,
      formData: new UTSJSONObject({
        username: "",
        password: "",
        confirmPassword: "",
        name: "",
        workUnit: ""
      })
    };
  },
  methods: new UTSJSONObject({
    // 切换到登录模式
    switchToLogin() {
      this.isLoginMode = true;
      this.isForgetMode = false;
      this.resetForm();
    },
    // 切换到注册模式
    switchToRegister() {
      this.isLoginMode = false;
      this.isForgetMode = false;
      this.resetForm();
    },
    // 切换到忘记密码模式
    switchToForget() {
      this.isLoginMode = false;
      this.isForgetMode = true;
      this.resetForm();
    },
    // 重置表单
    resetForm() {
      this.formData = {
        username: "",
        password: "",
        confirmPassword: "",
        name: "",
        workUnit: ""
      };
    },
    // 表单提交处理
    handleSubmit() {
      if (this.isLoginMode) {
        this.handleLogin();
      } else if (this.isForgetMode) {
        this.handleResetPasswordRequest();
      } else {
        this.handleRegister();
      }
    },
    // 登录处理
    handleLogin() {
      if (!this.formData.username || !this.formData.password) {
        common_vendor.index.showToast({
          title: "请输入账号和密码",
          icon: "none"
        });
        return null;
      }
      console.log("开始登录流程:", new UTSJSONObject({ username: this.formData.username }));
      common_vendor.index.showLoading({
        title: "登录中..."
      });
      common_vendor.tr.callFunction({
        name: "user",
        data: new UTSJSONObject({
          action: "login",
          data: new UTSJSONObject({
            username: this.formData.username,
            password: this.formData.password
          })
        })
      }).then((res) => {
        common_vendor.index.hideLoading();
        console.log("登录请求返回数据:", res.result);
        const _a = res.result, code = _a.code, msg = _a.msg, data = _a.data;
        if (code === 0) {
          console.log("登录成功，获取到的用户信息:", data.user);
          console.log("用户角色:", data.user.role);
          common_vendor.index.setStorageSync("token", data.token);
          common_vendor.index.setStorageSync("userInfo", UTS.JSON.stringify(data.user));
          console.log("用户信息和token已保存到本地存储");
          common_vendor.index.showToast({
            title: "登录成功",
            icon: "success"
          });
          setTimeout(() => {
            console.log("即将跳转到首页");
            common_vendor.index.switchTab({
              url: "/pages/index/index"
            });
          }, 1500);
        } else {
          console.error("登录失败:", msg);
          common_vendor.index.showToast({
            title: msg || "登录失败",
            icon: "none"
          });
        }
      }).catch((err = null) => {
        common_vendor.index.hideLoading();
        console.error("登录请求异常:", err);
        common_vendor.index.showToast({
          title: "登录失败，请检查网络",
          icon: "none"
        });
      });
    },
    // 注册处理
    handleRegister() {
      if (!this.formData.username) {
        common_vendor.index.showToast({
          title: "请输入账号",
          icon: "none"
        });
        return null;
      }
      if (!this.formData.password) {
        common_vendor.index.showToast({
          title: "请输入密码",
          icon: "none"
        });
        return null;
      }
      if (this.formData.password.length < 6) {
        common_vendor.index.showToast({
          title: "密码长度不能少于6位",
          icon: "none"
        });
        return null;
      }
      if (this.formData.password !== this.formData.confirmPassword) {
        common_vendor.index.showToast({
          title: "两次输入的密码不一致",
          icon: "none"
        });
        return null;
      }
      if (!this.formData.name) {
        common_vendor.index.showToast({
          title: "请输入真实姓名",
          icon: "none"
        });
        return null;
      }
      if (!this.formData.workUnit) {
        common_vendor.index.showToast({
          title: "请输入工作单位",
          icon: "none"
        });
        return null;
      }
      common_vendor.index.showLoading({
        title: "注册中..."
      });
      common_vendor.tr.callFunction({
        name: "user",
        data: new UTSJSONObject({
          action: "register",
          data: new UTSJSONObject({
            username: this.formData.username,
            password: this.formData.password,
            name: this.formData.name,
            workUnit: this.formData.workUnit
          })
        })
      }).then((res) => {
        common_vendor.index.hideLoading();
        const _a = res.result, code = _a.code, msg = _a.msg;
        if (code === 0) {
          common_vendor.index.showToast({
            title: "注册成功，请登录",
            icon: "success"
          });
          setTimeout(() => {
            this.isLoginMode = true;
            this.isForgetMode = false;
            const username = this.formData.username;
            this.formData = {
              username,
              password: "",
              confirmPassword: "",
              name: "",
              workUnit: ""
            };
          }, 1500);
        } else {
          common_vendor.index.showToast({
            title: msg || "注册失败",
            icon: "none"
          });
        }
      }).catch((err = null) => {
        common_vendor.index.hideLoading();
        console.error(err);
        common_vendor.index.showToast({
          title: "注册失败，请检查网络",
          icon: "none"
        });
      });
    },
    // 申请重置密码
    handleResetPasswordRequest() {
      if (!this.formData.username) {
        common_vendor.index.showToast({
          title: "请输入账号",
          icon: "none"
        });
        return null;
      }
      common_vendor.index.showLoading({
        title: "提交申请中..."
      });
      common_vendor.tr.callFunction({
        name: "user",
        data: new UTSJSONObject({
          action: "resetPasswordRequest",
          data: new UTSJSONObject({
            username: this.formData.username
          })
        })
      }).then((res) => {
        common_vendor.index.hideLoading();
        const _a = res.result, code = _a.code, msg = _a.msg;
        if (code === 0) {
          common_vendor.index.showModal(new UTSJSONObject({
            title: "申请已提交",
            content: "密码重置申请已提交，请等待管理员审核。审核通过后，管理员将通过其他渠道通知您新密码。",
            showCancel: false,
            success: () => {
              this.isLoginMode = true;
              this.isForgetMode = false;
              this.formData.username = "";
            }
          }));
        } else {
          common_vendor.index.showToast({
            title: msg || "申请失败",
            icon: "none"
          });
        }
      }).catch((err = null) => {
        common_vendor.index.hideLoading();
        console.error(err);
        common_vendor.index.showToast({
          title: "申请失败，请检查网络",
          icon: "none"
        });
      });
    }
  })
}));
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($data.isLoginMode ? "账号登录" : $data.isForgetMode ? "申请密码重置" : "用户注册"),
    b: $data.formData.username,
    c: common_vendor.o(($event) => $data.formData.username = $event.detail.value),
    d: !$data.isForgetMode
  }, !$data.isForgetMode ? {
    e: $data.formData.password,
    f: common_vendor.o(($event) => $data.formData.password = $event.detail.value)
  } : {}, {
    g: !$data.isLoginMode && !$data.isForgetMode
  }, !$data.isLoginMode && !$data.isForgetMode ? {
    h: $data.formData.confirmPassword,
    i: common_vendor.o(($event) => $data.formData.confirmPassword = $event.detail.value),
    j: $data.formData.name,
    k: common_vendor.o(($event) => $data.formData.name = $event.detail.value),
    l: $data.formData.workUnit,
    m: common_vendor.o(($event) => $data.formData.workUnit = $event.detail.value)
  } : {}, {
    n: $data.isForgetMode
  }, $data.isForgetMode ? {} : {}, {
    o: common_vendor.t($data.isLoginMode ? "登录" : $data.isForgetMode ? "提交重置申请" : "注册"),
    p: common_vendor.o((...args) => $options.handleSubmit && $options.handleSubmit(...args)),
    q: !$data.isLoginMode
  }, !$data.isLoginMode ? {
    r: common_vendor.o((...args) => $options.switchToLogin && $options.switchToLogin(...args))
  } : {}, {
    s: $data.isLoginMode || $data.isForgetMode
  }, $data.isLoginMode || $data.isForgetMode ? {
    t: common_vendor.o((...args) => $options.switchToRegister && $options.switchToRegister(...args))
  } : {}, {
    v: $data.isLoginMode
  }, $data.isLoginMode ? {
    w: common_vendor.o((...args) => $options.switchToForget && $options.switchToForget(...args))
  } : {}, {
    x: common_vendor.sei(common_vendor.gei(_ctx, ""), "view")
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
