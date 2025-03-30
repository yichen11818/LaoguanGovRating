"use strict";
const common_vendor = require("../../common/vendor.js");
const common_assets = require("../../common/assets.js");
const _sfc_main = common_vendor.defineComponent(new UTSJSONObject({
  data() {
    return {
      username: "",
      password: ""
    };
  },
  methods: new UTSJSONObject({
    handleLogin() {
      if (!this.username || !this.password) {
        common_vendor.index.showToast({
          title: "请输入用户名和密码",
          icon: "none"
        });
        return null;
      }
      common_vendor.tr.callFunction({
        name: "user",
        data: new UTSJSONObject({
          action: "login",
          data: new UTSJSONObject({
            username: this.username,
            password: this.password
          })
        })
      }).then((res) => {
        const _a = res.result, code = _a.code, msg = _a.msg, data = _a.data;
        if (code === 0) {
          common_vendor.index.setStorageSync("token", data.token);
          common_vendor.index.setStorageSync("userInfo", data.user);
          if (data.user.role === "admin") {
            common_vendor.index.switchTab({
              url: "/pages/index/index"
            });
          } else if (data.user.role === "rater") {
            common_vendor.index.switchTab({
              url: "/pages/index/index"
            });
          } else {
            common_vendor.index.switchTab({
              url: "/pages/index/index"
            });
          }
        } else {
          common_vendor.index.showToast({
            title: msg || "登录失败",
            icon: "none"
          });
        }
      }).catch((err = null) => {
        common_vendor.index.__f__("error", "at pages/login/login.vue:86", err);
        common_vendor.index.showToast({
          title: "登录失败，请检查网络",
          icon: "none"
        });
      });
    }
  })
}));
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_assets._imports_0$1,
    b: $data.username,
    c: common_vendor.o(($event) => $data.username = $event.detail.value),
    d: $data.password,
    e: common_vendor.o(($event) => $data.password = $event.detail.value),
    f: common_vendor.o((...args) => $options.handleLogin && $options.handleLogin(...args)),
    g: common_vendor.sei(common_vendor.gei(_ctx, ""), "view")
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/login/login.js.map
