"use strict";
const common_vendor = require("../../../common/vendor.js");
const common_assets = require("../../../common/assets.js");
const _sfc_main = common_vendor.defineComponent(new UTSJSONObject({
  data() {
    return {
      currentTableIndex: 0,
      tables: [new UTSJSONObject({ _id: "", name: "全部评分表" })],
      subjects: [],
      page: 1,
      pageSize: 10,
      total: 0,
      hasMoreData: false,
      isLoading: false,
      // 表单数据
      formData: new UTSJSONObject({
        name: "",
        department: "",
        position: "",
        tableIndex: 0
      }),
      // 编辑表单数据
      editData: new UTSJSONObject({
        id: "",
        name: "",
        department: "",
        position: "",
        tableIndex: 0
      })
    };
  },
  onLoad() {
    this.loadTables();
  },
  methods: new UTSJSONObject({
    // 加载评分表列表
    loadTables() {
      common_vendor.index.showLoading({
        title: "加载中..."
      });
      common_vendor.tr.callFunction({
        name: "ratingTable",
        data: new UTSJSONObject({
          action: "getTables",
          data: new UTSJSONObject({
            pageSize: 100
            // 获取所有评分表
          })
        })
      }).then((res) => {
        common_vendor.index.hideLoading();
        if (res.result.code === 0) {
          const data = res.result.data;
          this.tables = [new UTSJSONObject({ _id: "", name: "全部评分表" })].concat(data.list);
          this.loadSubjects();
        } else {
          common_vendor.index.showToast({
            title: res.result.msg || "加载失败",
            icon: "none"
          });
        }
      }).catch((err = null) => {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/admin/subjects/subjects.vue:185", err);
        common_vendor.index.showToast({
          title: "加载失败，请检查网络",
          icon: "none"
        });
      });
    },
    // 处理评分表筛选变化
    handleTableChange(e = null) {
      this.currentTableIndex = e.detail.value;
      this.page = 1;
      this.subjects = [];
      this.loadSubjects();
    },
    // 加载考核对象
    loadSubjects() {
      this.isLoading = true;
      const tableId = this.tables[this.currentTableIndex]._id;
      common_vendor.tr.callFunction({
        name: "subject",
        data: new UTSJSONObject({
          action: "getSubjects",
          data: new UTSJSONObject({
            table_id: tableId || void 0,
            page: this.page,
            pageSize: this.pageSize
          })
        })
      }).then((res) => {
        this.isLoading = false;
        if (res.result.code === 0) {
          const data = res.result.data;
          if (this.page === 1) {
            this.subjects = data.list;
          } else {
            this.subjects = this.subjects.concat(data.list);
          }
          this.total = data.total;
          this.hasMoreData = this.subjects.length < this.total;
        } else {
          common_vendor.index.showToast({
            title: res.result.msg || "加载失败",
            icon: "none"
          });
        }
      }).catch((err = null) => {
        this.isLoading = false;
        common_vendor.index.__f__("error", "at pages/admin/subjects/subjects.vue:239", err);
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
      this.loadSubjects();
    },
    // 获取评分表名称
    getTableName(tableId = null) {
      if (!tableId)
        return "未分配";
      const table = UTS.arrayFind(this.tables, (item) => {
        return item._id === tableId;
      });
      return table ? table.name : "未知评分表";
    },
    // 显示新增考核对象弹窗
    showAddSubjectModal() {
      this.formData = {
        name: "",
        department: "",
        position: "",
        tableIndex: 0
      };
      this.$refs.addSubjectPopup.open();
    },
    // 隐藏新增考核对象弹窗
    hideAddSubjectPopup() {
      this.$refs.addSubjectPopup.close();
    },
    // 处理表单评分表变化
    handleFormTableChange(e = null) {
      this.formData.tableIndex = e.detail.value;
    },
    // 提交新增考核对象
    submitAddSubject() {
      if (!this.formData.name) {
        common_vendor.index.showToast({
          title: "请输入考核对象姓名",
          icon: "none"
        });
        return null;
      }
      if (this.formData.tableIndex === 0) {
        common_vendor.index.showToast({
          title: "请选择所属评分表",
          icon: "none"
        });
        return null;
      }
      common_vendor.index.showLoading({
        title: "提交中..."
      });
      const tableId = this.tables[this.formData.tableIndex]._id;
      common_vendor.tr.callFunction({
        name: "subject",
        data: new UTSJSONObject({
          action: "createSubject",
          data: new UTSJSONObject({
            name: this.formData.name,
            department: this.formData.department,
            position: this.formData.position,
            table_id: tableId
          })
        })
      }).then((res) => {
        common_vendor.index.hideLoading();
        if (res.result.code === 0) {
          common_vendor.index.showToast({
            title: "创建成功",
            icon: "success"
          });
          this.hideAddSubjectPopup();
          this.page = 1;
          this.loadSubjects();
        } else {
          common_vendor.index.showToast({
            title: res.result.msg || "创建失败",
            icon: "none"
          });
        }
      }).catch((err = null) => {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/admin/subjects/subjects.vue:341", err);
        common_vendor.index.showToast({
          title: "创建失败，请检查网络",
          icon: "none"
        });
      });
    },
    // 编辑考核对象
    editSubject(index = null) {
      const subject = this.subjects[index];
      let tableIndex = 0;
      for (let i = 0; i < this.tables.length; i++) {
        if (this.tables[i]._id === subject.table_id) {
          tableIndex = i;
          break;
        }
      }
      this.editData = {
        id: subject._id,
        name: subject.name,
        department: subject.department || "",
        position: subject.position || "",
        tableIndex
      };
      this.$refs.editSubjectPopup.open();
    },
    // 隐藏编辑考核对象弹窗
    hideEditSubjectPopup() {
      this.$refs.editSubjectPopup.close();
    },
    // 处理编辑评分表变化
    handleEditTableChange(e = null) {
      this.editData.tableIndex = e.detail.value;
    },
    // 提交编辑考核对象
    submitEditSubject() {
      if (!this.editData.name) {
        common_vendor.index.showToast({
          title: "请输入考核对象姓名",
          icon: "none"
        });
        return null;
      }
      if (this.editData.tableIndex === 0) {
        common_vendor.index.showToast({
          title: "请选择所属评分表",
          icon: "none"
        });
        return null;
      }
      common_vendor.index.showLoading({
        title: "提交中..."
      });
      const tableId = this.tables[this.editData.tableIndex]._id;
      common_vendor.tr.callFunction({
        name: "subject",
        data: new UTSJSONObject({
          action: "updateSubject",
          data: new UTSJSONObject({
            subjectId: this.editData.id,
            updateData: new UTSJSONObject({
              name: this.editData.name,
              department: this.editData.department,
              position: this.editData.position,
              table_id: tableId
            })
          })
        })
      }).then((res) => {
        common_vendor.index.hideLoading();
        if (res.result.code === 0) {
          common_vendor.index.showToast({
            title: "更新成功",
            icon: "success"
          });
          this.hideEditSubjectPopup();
          this.loadSubjects();
        } else {
          common_vendor.index.showToast({
            title: res.result.msg || "更新失败",
            icon: "none"
          });
        }
      }).catch((err = null) => {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/admin/subjects/subjects.vue:440", err);
        common_vendor.index.showToast({
          title: "更新失败，请检查网络",
          icon: "none"
        });
      });
    },
    // 确认删除
    confirmDelete(subjectId = null) {
      common_vendor.index.showModal(new UTSJSONObject({
        title: "确认删除",
        content: "删除后将无法恢复，是否继续？",
        success: (res) => {
          if (res.confirm) {
            this.deleteSubject(subjectId);
          }
        }
      }));
    },
    // 删除考核对象
    deleteSubject(subjectId = null) {
      common_vendor.index.showLoading({
        title: "删除中..."
      });
      common_vendor.tr.callFunction({
        name: "subject",
        data: new UTSJSONObject({
          action: "deleteSubject",
          data: new UTSJSONObject({
            subjectId
          })
        })
      }).then((res) => {
        common_vendor.index.hideLoading();
        if (res.result.code === 0) {
          common_vendor.index.showToast({
            title: "删除成功",
            icon: "success"
          });
          this.subjects = this.subjects.filter((item) => {
            return item._id !== subjectId;
          });
          if (this.subjects.length === 0 && this.page > 1) {
            this.page--;
            this.loadSubjects();
          }
        } else {
          common_vendor.index.showToast({
            title: res.result.msg || "删除失败",
            icon: "none"
          });
        }
      }).catch((err = null) => {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/admin/subjects/subjects.vue:498", err);
        common_vendor.index.showToast({
          title: "删除失败，请检查网络",
          icon: "none"
        });
      });
    }
  })
}));
if (!Array) {
  const _component_uni_popup = common_vendor.resolveComponent("uni-popup");
  _component_uni_popup();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($data.tables[$data.currentTableIndex].name),
    b: common_vendor.o((...args) => $options.handleTableChange && $options.handleTableChange(...args)),
    c: $data.currentTableIndex,
    d: $data.tables,
    e: common_vendor.o((...args) => $options.showAddSubjectModal && $options.showAddSubjectModal(...args)),
    f: $data.subjects.length === 0
  }, $data.subjects.length === 0 ? {
    g: common_assets._imports_0$2
  } : {}, {
    h: common_vendor.f($data.subjects, (subject, index, i0) => {
      return common_vendor.e({
        a: common_vendor.t(subject.name),
        b: subject.department
      }, subject.department ? {
        c: common_vendor.t(subject.department)
      } : {}, {
        d: subject.position
      }, subject.position ? {
        e: common_vendor.t(subject.position)
      } : {}, {
        f: common_vendor.t($options.getTableName(subject.table_id)),
        g: common_vendor.o(($event) => $options.editSubject(index), index),
        h: common_vendor.o(($event) => $options.confirmDelete(subject._id), index),
        i: index
      });
    }),
    i: $data.subjects.length > 0 && $data.hasMoreData
  }, $data.subjects.length > 0 && $data.hasMoreData ? {
    j: common_vendor.o((...args) => $options.loadMore && $options.loadMore(...args)),
    k: $data.isLoading
  } : {}, {
    l: $data.formData.name,
    m: common_vendor.o(($event) => $data.formData.name = $event.detail.value),
    n: $data.formData.department,
    o: common_vendor.o(($event) => $data.formData.department = $event.detail.value),
    p: $data.formData.position,
    q: common_vendor.o(($event) => $data.formData.position = $event.detail.value),
    r: common_vendor.t($data.tables[$data.formData.tableIndex].name),
    s: common_vendor.o((...args) => $options.handleFormTableChange && $options.handleFormTableChange(...args)),
    t: $data.formData.tableIndex,
    v: $data.tables,
    w: common_vendor.o((...args) => $options.hideAddSubjectPopup && $options.hideAddSubjectPopup(...args)),
    x: common_vendor.o((...args) => $options.submitAddSubject && $options.submitAddSubject(...args)),
    y: common_vendor.sr("addSubjectPopup", "14cfb9b8-0"),
    z: common_vendor.p({
      type: "center"
    }),
    A: $data.editData.name,
    B: common_vendor.o(($event) => $data.editData.name = $event.detail.value),
    C: $data.editData.department,
    D: common_vendor.o(($event) => $data.editData.department = $event.detail.value),
    E: $data.editData.position,
    F: common_vendor.o(($event) => $data.editData.position = $event.detail.value),
    G: common_vendor.t($data.tables[$data.editData.tableIndex].name),
    H: common_vendor.o((...args) => $options.handleEditTableChange && $options.handleEditTableChange(...args)),
    I: $data.editData.tableIndex,
    J: $data.tables,
    K: common_vendor.o((...args) => $options.hideEditSubjectPopup && $options.hideEditSubjectPopup(...args)),
    L: common_vendor.o((...args) => $options.submitEditSubject && $options.submitEditSubject(...args)),
    M: common_vendor.sr("editSubjectPopup", "14cfb9b8-1"),
    N: common_vendor.p({
      type: "center"
    }),
    O: common_vendor.sei(common_vendor.gei(_ctx, ""), "view")
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../../.sourcemap/mp-weixin/pages/admin/subjects/subjects.js.map
