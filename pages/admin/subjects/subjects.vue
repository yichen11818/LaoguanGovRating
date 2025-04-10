<template>
	<view class="container">
		<view class="filter-bar">
			<view class="filter-item">
				<picker @change="handleTableChange" :value="currentTableIndex" :range="tables" range-key="name">
					<view class="picker-box">
						<text class="picker-text">{{tables[currentTableIndex].name}}</text>
						<text class="picker-arrow">▼</text>
					</view>
				</picker>
			</view>
			
			<view class="action-btns">
				<button class="add-btn" size="mini" @click="showAddSubjectModal">新增考核对象</button>
			</view>
		</view>
		
		<view class="subject-list">
			<view class="no-data" v-if="subjects.length === 0">
				<image class="no-data-icon" src="/static/images/no-data.png" mode="aspectFit"></image>
				<text class="no-data-text">暂无考核对象</text>
			</view>
			
			<view class="subject-item" v-for="(subject, index) in subjects" :key="index">
				<view class="subject-info">
					<view class="info-row">
						<text class="subject-name">{{subject.name}}</text>
						<text class="subject-department" v-if="subject.department">{{subject.department}}</text>
					</view>
					<view class="info-row" v-if="subject.position">
						<text class="subject-position">职位：{{subject.position}}</text>
					</view>
					<view class="info-row">
						<text class="subject-table">所属评分表：{{getTableNames(subject.table_id)}}</text>
					</view>
				</view>
				<view class="subject-actions">
					<view class="action-btn" @click="editSubject(index)">
						<text class="action-text">编辑</text>
					</view>
					<view class="action-btn delete" @click="confirmDelete(subject._id)">
						<text class="action-text">删除</text>
					</view>
				</view>
			</view>
		</view>
		
		<!-- 加载更多 -->
		<view class="load-more" v-if="subjects.length > 0 && hasMoreData">
			<button class="load-btn" size="mini" @click="loadMore" :loading="isLoading">加载更多</button>
		</view>
		
		<!-- 新增考核对象弹窗 -->
		<view class="popup-overlay" v-if="popupVisible.addSubject" @click="hideAddSubjectPopup"></view>
		<view class="popup-content" v-if="popupVisible.addSubject">
			<view class="popup-title">新增考核对象</view>
			<view class="form-item">
				<text class="form-label">姓名</text>
				<input v-model="formData.name" class="form-input" placeholder="请输入考核对象姓名" />
			</view>
			<view class="form-item">
				<text class="form-label">部门</text>
				<input v-model="formData.department" class="form-input" placeholder="请输入部门" />
			</view>
			<view class="form-item">
				<text class="form-label">职位</text>
				<input v-model="formData.position" class="form-input" placeholder="请输入职位" />
			</view>
			<view class="form-item">
				<text class="form-label">所属评分表</text>
				<view class="table-selector">
					<view class="selected-tables">
						<view class="selected-table" v-for="(table, index) in formData.selectedTables" :key="index">
							<text>{{table.name}}</text>
							<text class="remove-table" @click="removeSelectedTable(index)">×</text>
						</view>
					</view>
					<picker @change="handleFormTableChange" :value="formData.tableIndex" :range="tables" range-key="name">
						<view class="form-picker">
							<text>选择评分表</text>
							<text class="picker-arrow">▼</text>
						</view>
					</picker>
				</view>
			</view>
			<view class="popup-btns">
				<button class="cancel-btn" size="mini" @click="hideAddSubjectPopup">取消</button>
				<button class="confirm-btn" size="mini" @click="submitAddSubject">确定</button>
			</view>
		</view>
		
		<!-- 编辑考核对象弹窗 -->
		<view class="popup-overlay" v-if="popupVisible.editSubject" @click="hideEditSubjectPopup"></view>
		<view class="popup-content" v-if="popupVisible.editSubject">
			<view class="popup-title">编辑考核对象</view>
			<view class="form-item">
				<text class="form-label">姓名</text>
				<input v-model="editData.name" class="form-input" placeholder="请输入考核对象姓名" />
			</view>
			<view class="form-item">
				<text class="form-label">部门</text>
				<input v-model="editData.department" class="form-input" placeholder="请输入部门" />
			</view>
			<view class="form-item">
				<text class="form-label">职位</text>
				<input v-model="editData.position" class="form-input" placeholder="请输入职位" />
			</view>
			<view class="form-item">
				<text class="form-label">所属评分表</text>
				<view class="table-selector">
					<view class="selected-tables">
						<view class="selected-table" v-for="(table, index) in editData.selectedTables" :key="index">
							<text>{{table.name}}</text>
							<text class="remove-table" @click="removeEditTable(index)">×</text>
						</view>
					</view>
					<picker @change="handleEditTableChange" :value="editData.tableIndex" :range="tables" range-key="name">
						<view class="form-picker">
							<text>选择评分表</text>
							<text class="picker-arrow">▼</text>
						</view>
					</picker>
				</view>
			</view>
			<view class="popup-btns">
				<button class="cancel-btn" size="mini" @click="hideEditSubjectPopup">取消</button>
				<button class="confirm-btn" size="mini" @click="submitEditSubject">确定</button>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				currentTableIndex: 0,
				tables: [{ _id: '', name: '全部评分表' }],
				subjects: [],
				page: 1,
				pageSize: 10,
				total: 0,
				hasMoreData: false,
				isLoading: false,
				
				// 表单数据
				formData: {
					name: '',
					department: '',
					position: '',
					tableIndex: 0,
					selectedTables: []
				},
				
				// 编辑表单数据
				editData: {
					id: '',
					name: '',
					department: '',
					position: '',
					tableIndex: 0,
					selectedTables: []
				},
				
				// 弹窗显示状态
				popupVisible: {
					addSubject: false,
					editSubject: false
				}
			}
		},
		onLoad() {
			this.loadTables();
		},
		methods: {
			// 加载评分表列表
			loadTables() {
				uni.showLoading({
					title: '加载中...'
				});
				
				uniCloud.callFunction({
					name: 'ratingTable',
					data: {
						action: 'getTables',
						data: {
							pageSize: 100 // 获取所有评分表
						}
					}
				}).then(res => {
					uni.hideLoading();
					
					if (res.result.code === 0) {
						const data = res.result.data;
						this.tables = [{ _id: '', name: '全部评分表' }].concat(data.list);
						
						// 加载考核对象
						this.loadSubjects();
					} else {
						uni.showToast({
							title: res.result.msg || '加载失败',
							icon: 'none'
						});
					}
				}).catch(err => {
					uni.hideLoading();
					console.error(err);
					uni.showToast({
						title: '加载失败，请检查网络',
						icon: 'none'
					});
				});
			},
			
			// 处理评分表筛选变化
			handleTableChange(e) {
				this.currentTableIndex = e.detail.value;
				this.page = 1;
				this.subjects = [];
				this.loadSubjects();
			},
			
			// 加载考核对象
			loadSubjects() {
				this.isLoading = true;
				
				const tableId = this.tables[this.currentTableIndex]._id;
				
				uniCloud.callFunction({
					name: 'subject',
					data: {
						action: 'getSubjects',
						data: {
							table_id: tableId || undefined, // 如果是全部评分表，则不传tableId
							page: this.page,
							pageSize: this.pageSize
						}
					}
				}).then(res => {
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
						uni.showToast({
							title: res.result.msg || '加载失败',
							icon: 'none'
						});
					}
				}).catch(err => {
					this.isLoading = false;
					console.error(err);
					uni.showToast({
						title: '加载失败，请检查网络',
						icon: 'none'
					});
				});
			},
			
			// 加载更多
			loadMore() {
				if (this.isLoading || !this.hasMoreData) return;
				
				this.page++;
				this.loadSubjects();
			},
			
			// 获取评分表名称列表
			getTableNames(tableIds) {
				// 确保tableIds是数组类型
				if (!tableIds) return '未分配';
				const ids = Array.isArray(tableIds) ? tableIds : [tableIds];
				if (ids.length === 0) return '未分配';
				
				const names = ids.map(id => {
					const table = this.tables.find(item => item._id === id);
					return table ? table.name : '未知评分表';
				});
				
				return names.join('、');
			},
			
			// 显示新增考核对象弹窗
			showAddSubjectModal() {
				// 重置表单
				this.formData = {
					name: '',
					department: '',
					position: '',
					tableIndex: 0,
					selectedTables: []
				};
				
				this.popupVisible.addSubject = true;
			},
			
			// 隐藏新增考核对象弹窗
			hideAddSubjectPopup() {
				this.popupVisible.addSubject = false;
			},
			
			// 处理表单评分表变化
			handleFormTableChange(e) {
				const index = e.detail.value;
				const table = this.tables[index];
				
				// 检查是否已经选择过该评分表
				if (!this.formData.selectedTables.some(item => item._id === table._id)) {
					this.formData.selectedTables.push(table);
				}
			},
			
			// 移除已选择的评分表
			removeSelectedTable(index) {
				this.formData.selectedTables.splice(index, 1);
			},
			
			// 提交新增考核对象
			submitAddSubject() {
				if (!this.formData.name) {
					uni.showToast({
						title: '请输入考核对象姓名',
						icon: 'none'
					});
					return;
				}
				
				uni.showLoading({
					title: '提交中...'
				});
				
				const tableIds = this.formData.selectedTables.map(table => table._id);
				
				uniCloud.callFunction({
					name: 'subject',
					data: {
						action: 'createSubject',
						data: {
							name: this.formData.name,
							table_id: tableIds,
							department: this.formData.department,
							position: this.formData.position
						}
					}
				}).then(res => {
					uni.hideLoading();
					
					if (res.result.code === 0) {
						uni.showToast({
							title: '创建成功',
							icon: 'success'
						});
						
						this.hideAddSubjectPopup();
						this.page = 1;
						this.loadSubjects();
					} else {
						uni.showToast({
							title: res.result.msg || '创建失败',
							icon: 'none'
						});
					}
				}).catch(err => {
					uni.hideLoading();
					console.error(err);
					uni.showToast({
						title: '创建失败，请检查网络',
						icon: 'none'
					});
				});
			},
			
			// 编辑考核对象
			editSubject(index) {
				const subject = this.subjects[index];
				
				// 确保table_id是数组类型
				const tableIds = Array.isArray(subject.table_id) ? subject.table_id : [subject.table_id];
				
				// 获取已选择的评分表
				const selectedTables = tableIds.map(tableId => {
					return this.tables.find(table => table._id === tableId);
				}).filter(Boolean);
				
				this.editData = {
					id: subject._id,
					name: subject.name,
					department: subject.department || '',
					position: subject.position || '',
					tableIndex: 0,
					selectedTables: selectedTables
				};
				
				this.popupVisible.editSubject = true;
			},
			
			// 隐藏编辑考核对象弹窗
			hideEditSubjectPopup() {
				this.popupVisible.editSubject = false;
			},
			
			// 处理编辑评分表变化
			handleEditTableChange(e) {
				const index = e.detail.value;
				const table = this.tables[index];
				
				// 检查是否已经选择过该评分表
				if (!this.editData.selectedTables.some(item => item._id === table._id)) {
					this.editData.selectedTables.push(table);
				}
			},
			
			// 移除已选择的评分表
			removeEditTable(index) {
				this.editData.selectedTables.splice(index, 1);
			},
			
			// 提交编辑考核对象
			submitEditSubject() {
				if (!this.editData.name) {
					uni.showToast({
						title: '请输入考核对象姓名',
						icon: 'none'
					});
					return;
				}
				
				uni.showLoading({
					title: '提交中...'
				});
				
				const tableIds = this.editData.selectedTables.map(table => table._id);
				
				uniCloud.callFunction({
					name: 'subject',
					data: {
						action: 'updateSubject',
						data: {
							subjectId: this.editData.id,
							updateData: {
								name: this.editData.name,
								table_id: tableIds,
								department: this.editData.department,
								position: this.editData.position
							}
						}
					}
				}).then(res => {
					uni.hideLoading();
					
					if (res.result.code === 0) {
						uni.showToast({
							title: '更新成功',
							icon: 'success'
						});
						
						this.hideEditSubjectPopup();
						this.loadSubjects();
					} else {
						uni.showToast({
							title: res.result.msg || '更新失败',
							icon: 'none'
						});
					}
				}).catch(err => {
					uni.hideLoading();
					console.error(err);
					uni.showToast({
						title: '更新失败，请检查网络',
						icon: 'none'
					});
				});
			},
			
			// 确认删除
			confirmDelete(subjectId) {
				uni.showModal({
					title: '确认删除',
					content: '删除后将无法恢复，是否继续？',
					success: res => {
						if (res.confirm) {
							this.deleteSubject(subjectId);
						}
					}
				});
			},
			
			// 删除考核对象
			deleteSubject(subjectId) {
				uni.showLoading({
					title: '删除中...'
				});
				
				uniCloud.callFunction({
					name: 'subject',
					data: {
						action: 'deleteSubject',
						data: {
							subjectId: subjectId
						}
					}
				}).then(res => {
					uni.hideLoading();
					
					if (res.result.code === 0) {
						uni.showToast({
							title: '删除成功',
							icon: 'success'
						});
						
						// 更新列表
						this.subjects = this.subjects.filter(item => item._id !== subjectId);
						if (this.subjects.length === 0 && this.page > 1) {
							this.page--;
							this.loadSubjects();
						}
					} else {
						uni.showToast({
							title: res.result.msg || '删除失败',
							icon: 'none'
						});
					}
				}).catch(err => {
					uni.hideLoading();
					console.error(err);
					uni.showToast({
						title: '删除失败，请检查网络',
						icon: 'none'
					});
				});
			}
		}
	}
</script>

<style>
	.container {
		padding: 20rpx;
	}
	
	.filter-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20rpx;
	}
	
	.filter-item {
		flex: 1;
		margin-right: 20rpx;
	}
	
	.picker-box {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10rpx 20rpx;
		background-color: #f5f5f5;
		border-radius: 8rpx;
	}
	
	.picker-text {
		font-size: 28rpx;
		color: #333;
	}
	
	.picker-arrow {
		font-size: 24rpx;
		color: #999;
	}
	
	.action-btns {
		display: flex;
	}
	
	.add-btn {
		background-color: #007AFF;
		color: #fff;
	}
	
	.subject-list {
		margin-top: 20rpx;
	}
	
	.no-data {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 100rpx 0;
	}
	
	.no-data-icon {
		width: 200rpx;
		height: 200rpx;
		margin-bottom: 20rpx;
	}
	
	.no-data-text {
		font-size: 28rpx;
		color: #999;
	}
	
	.subject-item {
		background-color: #fff;
		border-radius: 8rpx;
		padding: 20rpx;
		margin-bottom: 20rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
	}
	
	.subject-info {
		margin-bottom: 20rpx;
	}
	
	.info-row {
		display: flex;
		align-items: center;
		margin-bottom: 10rpx;
	}
	
	.subject-name {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		margin-right: 20rpx;
	}
	
	.subject-department {
		font-size: 28rpx;
		color: #666;
	}
	
	.subject-position {
		font-size: 28rpx;
		color: #666;
	}
	
	.subject-table {
		font-size: 28rpx;
		color: #666;
	}
	
	.subject-actions {
		display: flex;
		justify-content: flex-end;
	}
	
	.action-btn {
		padding: 10rpx 20rpx;
		margin-left: 20rpx;
		border-radius: 6rpx;
		font-size: 28rpx;
	}
	
	.action-btn:not(.delete) {
		background-color: #f5f5f5;
		color: #333;
	}
	
	.action-btn.delete {
		background-color: #ff4d4f;
		color: #fff;
	}
	
	.popup-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		z-index: 999;
	}
	
	.popup-content {
		position: fixed;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		width: 80%;
		background-color: #fff;
		border-radius: 12rpx;
		padding: 30rpx;
		z-index: 1000;
	}
	
	.popup-title {
		font-size: 32rpx;
		font-weight: bold;
		text-align: center;
		margin-bottom: 30rpx;
	}
	
	.form-item {
		margin-bottom: 20rpx;
	}
	
	.form-label {
		display: block;
		font-size: 28rpx;
		color: #333;
		margin-bottom: 10rpx;
	}
	
	.form-input {
		width: 100%;
		height: 80rpx;
		background-color: #f5f5f5;
		border-radius: 8rpx;
		padding: 0 20rpx;
		font-size: 28rpx;
	}
	
	.table-selector {
		background-color: #f5f5f5;
		border-radius: 8rpx;
		padding: 20rpx;
	}
	
	.selected-tables {
		margin-bottom: 20rpx;
	}
	
	.selected-table {
		display: inline-flex;
		align-items: center;
		background-color: #fff;
		border-radius: 6rpx;
		padding: 10rpx 20rpx;
		margin-right: 10rpx;
		margin-bottom: 10rpx;
	}
	
	.remove-table {
		margin-left: 10rpx;
		color: #ff4d4f;
		font-size: 32rpx;
	}
	
	.form-picker {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10rpx 20rpx;
		background-color: #fff;
		border-radius: 8rpx;
	}
	
	.popup-btns {
		display: flex;
		justify-content: flex-end;
		margin-top: 30rpx;
	}
	
	.cancel-btn {
		margin-right: 20rpx;
		background-color: #f5f5f5;
		color: #333;
	}
	
	.confirm-btn {
		background-color: #007AFF;
		color: #fff;
	}
	
	.load-more {
		text-align: center;
		margin-top: 20rpx;
	}
	
	.load-btn {
		background-color: #f5f5f5;
		color: #333;
	}
</style> 