"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const common_vendor = require("./common/vendor.js");
if (!Math) {
  "./pages/index/index.js";
  "./pages/login/login.js";
  "./pages/user/profile/profile.js";
  "./pages/admin/tables/tables.js";
  "./pages/admin/items/items.js";
  "./pages/admin/subjects/subjects.js";
  "./pages/admin/users/users.js";
  "./pages/admin/stats/stats.js";
  "./pages/admin/password-reset/password-reset.js";
  "./pages/rater/tables/tables.js";
  "./pages/rater/rating/rating.js";
  "./pages/rater/history/history.js";
}
const _sfc_main = common_vendor.defineComponent(new UTSJSONObject({
  onLaunch: function() {
    console.log("App Launch");
  },
  onShow: function() {
    console.log("App Show");
  },
  onHide: function() {
    console.log("App Hide");
  },
  onExit: function() {
    console.log("App Exit");
  }
}));
function createApp() {
  const app = common_vendor.createSSRApp(_sfc_main);
  return {
    app
  };
}
createApp().app.mount("#app");
exports.createApp = createApp;
