"use strict";
const common_vendor = require("../../../common/vendor.js");
const common_assets = require("../../../common/assets.js");
const _sfc_main = common_vendor.defineComponent({
  data() {
    return {
      currentRoleIndex: 0,
      roleOptions: [
        new UTSJSONObject({ id: "", name: "全部角色" }),
        new UTSJSONObject({ id: "admin", name: "管理员" }),
        new UTSJSONObject({ id: "rater", name: "评分员" }),
        new UTSJSONObject({ id: "user", name: "普通用户" })
      ],
      users: [],
      page: 1,
      pageSize: 10,
      total: 0,
      hasMoreData: false,
      isLoading: false,
      adminUsername: "",
      // 表单数据
      formData: new UTSJSONObject({
        username: "",
        password: "",
        name: "",
        roleIndex: 2
        // 默认为评分员
      }),
      // 编辑表单数据
      editData: new UTSJSONObject({
        id: "",
        username: "",
        password: "",
        name: ""
      }),
      // 更改角色数据
      changeRoleData: new UTSJSONObject({
        id: "",
        username: "",
        currentRole: "",
        newRoleIndex: 0
      })
    };
  },
  onLoad() {
    const userInfo = common_vendor.index.getStorageSync("userInfo");
    if (userInfo) {
      this.adminUsername = userInfo.username;
    }
    this.loadUsers();
  },
  methods: {
    // 获取角色名称
    getRoleName(role = null) {
      const roleMap = new UTSJSONObject({
        "admin": "管理员",
        "rater": "评分员",
        "user": "普通用户"
      });
      return roleMap[role] || "未知角色";
    },
    // 处理角色筛选变化
    handleRoleChange(e = null) {
      this.currentRoleIndex = e.detail.value;
      this.page = 1;
      this.users = [];
      this.loadUsers();
    },
    // 加载用户列表
    loadUsers() {
      this.isLoading = true;
      const role = this.roleOptions[this.currentRoleIndex].id;
      common_vendor.tr.callFunction({
        name: "user",
        data: new UTSJSONObject({
          action: "getUsers",
          data: new UTSJSONObject({
            role: role || void 0,
            page: this.page,
            pageSize: this.pageSize
          })
        })
      }).then((res) => {
        this.isLoading = false;
        if (res.result.code === 0) {
          const data = res.result.data;
          if (this.page === 1) {
            this.users = data.list;
          } else {
            this.users = this.users.concat(data.list);
          }
          this.total = data.total;
          this.hasMoreData = this.users.length < this.total;
        } else {
          common_vendor.index.showToast({
            title: res.result.msg || "加载失败",
            icon: "none"
          });
        }
      }).catch((err = null) => {
        this.isLoading = false;
        common_vendor.index.__f__("error", "at pages/admin/users/users.vue:248", err);
        common_vendor.index.showToast({
          title: "加载失败，请检查网络",
          icon: "none"
        });
      });
    },
    // 加载更多
    loadMore() {
      if (this.isLoading || !this.hasMoreData)
        return null;
      this.page++;
      this.loadUsers();
    },
    // 显示新增用户弹窗
    showAddUserModal() {
      this.formData = {
        username: "",
        password: "",
        name: "",
        roleIndex: 2
        // 默认为评分员
      };
      this.$refs.addUserPopup.open();
    },
    // 隐藏新增用户弹窗
    hideAddUserPopup() {
      this.$refs.addUserPopup.close();
    },
    // 处理表单角色变化
    handleFormRoleChange(e = null) {
      this.formData.roleIndex = e.detail.value;
    },
    // 提交新增用户
    submitAddUser() {
      if (!this.formData.username) {
        common_vendor.index.showToast({
          title: "请输入用户名",
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
      common_vendor.index.showLoading({
        title: "提交中..."
      });
      const role = this.roleOptions[this.formData.roleIndex].id;
      common_vendor.tr.callFunction({
        name: "user",
        data: new UTSJSONObject({
          action: "register",
          data: new UTSJSONObject({
            username: this.formData.username,
            password: this.formData.password,
            name: this.formData.name,
            role
          })
        })
      }).then((res) => {
        common_vendor.index.hideLoading();
        if (res.result.code === 0) {
          common_vendor.index.showToast({
            title: "创建成功",
            icon: "success"
          });
          this.hideAddUserPopup();
          this.page = 1;
          this.loadUsers();
        } else {
          common_vendor.index.showToast({
            title: res.result.msg || "创建失败",
            icon: "none"
          });
        }
      }).catch((err = null) => {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/admin/users/users.vue:342", err);
        common_vendor.index.showToast({
          title: "创建失败，请检查网络",
          icon: "none"
        });
      });
    },
    // 编辑用户
    editUser(index = null) {
      const user = this.users[index];
      this.editData = {
        id: user._id,
        username: user.username,
        password: "",
        name: user.name || ""
      };
      this.$refs.editUserPopup.open();
    },
    // 隐藏编辑用户弹窗
    hideEditUserPopup() {
      this.$refs.editUserPopup.close();
    },
    // 提交编辑用户
    submitEditUser() {
      common_vendor.index.showLoading({
        title: "提交中..."
      });
      const updateData = new UTSJSONObject({
        name: this.editData.name
      });
      if (this.editData.password) {
        updateData.password = this.editData.password;
      }
      common_vendor.tr.callFunction({
        name: "user",
        data: new UTSJSONObject({
          action: "updateUser",
          data: new UTSJSONObject({
            userId: this.editData.id,
            updateData
          })
        })
      }).then((res) => {
        common_vendor.index.hideLoading();
        if (res.result.code === 0) {
          common_vendor.index.showToast({
            title: "更新成功",
            icon: "success"
          });
          this.hideEditUserPopup();
          this.loadUsers();
        } else {
          common_vendor.index.showToast({
            title: res.result.msg || "更新失败",
            icon: "none"
          });
        }
      }).catch((err = null) => {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/admin/users/users.vue:412", err);
        common_vendor.index.showToast({
          title: "更新失败，请检查网络",
          icon: "none"
        });
      });
    },
    // 更改角色
    changeRole(index = null) {
      const user = this.users[index];
      if (user.username === this.adminUsername) {
        common_vendor.index.showToast({
          title: "不能更改自己的角色",
          icon: "none"
        });
        return null;
      }
      let roleIndex = 0;
      for (let i = 1; i < this.roleOptions.length; i++) {
        if (this.roleOptions[i].id === user.role) {
          roleIndex = i - 1;
          break;
        }
      }
      this.changeRoleData = {
        id: user._id,
        username: user.name || user.username,
        currentRole: user.role,
        newRoleIndex: roleIndex
      };
      this.$refs.changeRolePopup.open();
    },
    // 隐藏更改角色弹窗
    hideChangeRolePopup() {
      this.$refs.changeRolePopup.close();
    },
    // 处理新角色变化
    handleNewRoleChange(e = null) {
      this.changeRoleData.newRoleIndex = e.detail.value;
    },
    // 提交更改角色
    submitChangeRole() {
      const newRole = this.roleOptions[this.changeRoleData.newRoleIndex + 1].id;
      if (newRole === this.changeRoleData.currentRole) {
        common_vendor.index.showToast({
          title: "新角色与当前角色相同",
          icon: "none"
        });
        return null;
      }
      common_vendor.index.showLoading({
        title: "提交中..."
      });
      common_vendor.tr.callFunction({
        name: "user",
        data: new UTSJSONObject({
          action: "updateUser",
          data: new UTSJSONObject({
            userId: this.changeRoleData.id,
            updateData: new UTSJSONObject({
              role: newRole
            })
          })
        })
      }).then((res) => {
        common_vendor.index.hideLoading();
        if (res.result.code === 0) {
          common_vendor.index.showToast({
            title: "角色更改成功",
            icon: "success"
          });
          this.hideChangeRolePopup();
          this.loadUsers();
        } else {
          common_vendor.index.showToast({
            title: res.result.msg || "更改失败",
            icon: "none"
          });
        }
      }).catch((err = null) => {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/admin/users/users.vue:509", err);
        common_vendor.index.showToast({
          title: "更改失败，请检查网络",
          icon: "none"
        });
      });
    },
    // 确认删除
    confirmDelete(userId = null) {
      common_vendor.index.showModal(new UTSJSONObject({
        title: "确认删除",
        content: "删除后将无法恢复，是否继续？",
        success: (res) => {
          if (res.confirm) {
            this.deleteUser(userId);
          }
        }
      }));
    },
    // 删除用户
    deleteUser(userId = null) {
      common_vendor.index.showLoading({
        title: "删除中..."
      });
      common_vendor.tr.callFunction({
        name: "user",
        data: new UTSJSONObject({
          action: "deleteUser",
          data: new UTSJSONObject({
            userId
          })
        })
      }).then((res) => {
        common_vendor.index.hideLoading();
        if (res.result.code === 0) {
          common_vendor.index.showToast({
            title: "删除成功",
            icon: "success"
          });
          this.users = this.users.filter((item) => {
            return item._id !== userId;
          });
          if (this.users.length === 0 && this.page > 1) {
            this.page--;
            this.loadUsers();
          }
        } else {
          common_vendor.index.showToast({
            title: res.result.msg || "删除失败",
            icon: "none"
          });
        }
      }).catch((err = null) => {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/admin/users/users.vue:567", err);
        common_vendor.index.showToast({
          title: "删除失败，请检查网络",
          icon: "none"
        });
      });
    }
  }
});
if (!Array) {
  const _component_uni_popup = common_vendor.resolveComponent("uni-popup");
  _component_uni_popup();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($data.roleOptions[$data.currentRoleIndex].name),
    b: common_vendor.o((...args) => $options.handleRoleChange && $options.handleRoleChange(...args)),
    c: $data.currentRoleIndex,
    d: $data.roleOptions,
    e: common_vendor.o((...args) => $options.showAddUserModal && $options.showAddUserModal(...args)),
    f: $data.users.length === 0
  }, $data.users.length === 0 ? {
    g: common_assets._imports_0$2
  } : {}, {
    h: common_vendor.f($data.users, (user, index, i0) => {
      return common_vendor.e({
        a: common_vendor.t(user.name || user.username),
        b: common_vendor.t($options.getRoleName(user.role)),
        c: common_vendor.n("role-" + user.role),
        d: common_vendor.t(user.username),
        e: common_vendor.o(($event) => $options.editUser(index), index),
        f: common_vendor.o(($event) => $options.changeRole(index), index),
        g: user.username !== $data.adminUsername
      }, user.username !== $data.adminUsername ? {
        h: common_vendor.o(($event) => $options.confirmDelete(user._id), index)
      } : {}, {
        i: index
      });
    }),
    i: $data.users.length > 0 && $data.hasMoreData
  }, $data.users.length > 0 && $data.hasMoreData ? {
    j: common_vendor.o((...args) => $options.loadMore && $options.loadMore(...args)),
    k: $data.isLoading
  } : {}, {
    l: $data.formData.username,
    m: common_vendor.o(($event) => $data.formData.username = $event.detail.value),
    n: $data.formData.password,
    o: common_vendor.o(($event) => $data.formData.password = $event.detail.value),
    p: $data.formData.name,
    q: common_vendor.o(($event) => $data.formData.name = $event.detail.value),
    r: common_vendor.t($data.roleOptions[$data.formData.roleIndex].name),
    s: common_vendor.o((...args) => $options.handleFormRoleChange && $options.handleFormRoleChange(...args)),
    t: $data.formData.roleIndex,
    v: $data.roleOptions,
    w: common_vendor.o((...args) => $options.hideAddUserPopup && $options.hideAddUserPopup(...args)),
    x: common_vendor.o((...args) => $options.submitAddUser && $options.submitAddUser(...args)),
    y: common_vendor.sr("addUserPopup", "ccec08ac-0"),
    z: common_vendor.p({
      type: "center"
    }),
    A: $data.editData.username,
    B: common_vendor.o(($event) => $data.editData.username = $event.detail.value),
    C: $data.editData.name,
    D: common_vendor.o(($event) => $data.editData.name = $event.detail.value),
    E: $data.editData.password,
    F: common_vendor.o(($event) => $data.editData.password = $event.detail.value),
    G: common_vendor.o((...args) => $options.hideEditUserPopup && $options.hideEditUserPopup(...args)),
    H: common_vendor.o((...args) => $options.submitEditUser && $options.submitEditUser(...args)),
    I: common_vendor.sr("editUserPopup", "ccec08ac-1"),
    J: common_vendor.p({
      type: "center"
    }),
    K: common_vendor.t($data.changeRoleData.username),
    L: common_vendor.t($options.getRoleName($data.changeRoleData.currentRole)),
    M: common_vendor.n("role-text-" + $data.changeRoleData.currentRole),
    N: common_vendor.t($data.roleOptions[$data.changeRoleData.newRoleIndex + 1].name),
    O: common_vendor.o((...args) => $options.handleNewRoleChange && $options.handleNewRoleChange(...args)),
    P: $data.changeRoleData.newRoleIndex,
    Q: $data.roleOptions.slice(1),
    R: common_vendor.o((...args) => $options.hideChangeRolePopup && $options.hideChangeRolePopup(...args)),
    S: common_vendor.o((...args) => $options.submitChangeRole && $options.submitChangeRole(...args)),
    T: common_vendor.sr("changeRolePopup", "ccec08ac-2"),
    U: common_vendor.p({
      type: "center"
    }),
    V: common_vendor.sei(common_vendor.gei(_ctx, ""), "view")
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../../.sourcemap/mp-weixin/pages/admin/users/users.js.map
