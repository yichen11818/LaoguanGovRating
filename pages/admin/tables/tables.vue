<template>
	<view class="container">
		<view class="filter-bar">
			<view class="filter-item">
				<picker @change="handleTypeChange" :value="currentTypeIndex" :range="typeOptions" range-key="name">
					<view class="picker-box">
						<text class="picker-text">{{typeOptions[currentTypeIndex].name}}</text>
						<text class="picker-arrow">▼</text>
					</view>
				</picker>
			</view>
			
			<button class="add-btn" size="mini" @click="showAddTableModal">
				<text class="btn-icon">+</text>
				<text>新增评分表</text>
			</button>
		</view>
		
		<view class="table-list">
			<view class="no-data" v-if="tables.length === 0">
				<image class="no-data-icon" src="/static/images/no-data.png" mode="aspectFit"></image>
				<text class="no-data-text">暂无评分表</text>
			</view>
			
			<view class="table-item" v-for="(table, index) in tables" :key="index" @click="navigateToDetail(table._id)">
				<view class="table-header">
					<view class="title-wrapper">
						<text class="table-name">{{table.name}}</text>
						<text class="table-type">{{getTableTypeName(table.type)}}</text>
					</view>
					
					<view class="table-actions">
						<view class="action-btn edit" @click.stop="editTable(table)">
							<text class="action-icon">✎</text>
						</view>
						<view class="action-btn change" @click.stop="showChangeRaterModal(table)">
							<text class="action-icon">↻</text>
						</view>
						<view class="action-btn delete" @click.stop="confirmDelete(table._id)">
							<text class="action-icon">✕</text>
						</view>
					</view>
				</view>
				
				<view class="table-info">
					<view class="info-item">
						<text class="info-label">分类:</text>
						<text class="info-value">{{table.category || '无'}}</text>
					</view>
					<view class="info-item">
						<text class="info-label">评分人:</text>
						<text class="info-value">{{table.rater}}</text>
					</view>
					<view class="info-item">
						<text class="info-label">项目数:</text>
						<text class="info-value">{{table.items ? table.items.length : 0}}</text>
					</view>
				</view>
			</view>
		</view>
		
		<!-- 加载更多 -->
		<view class="load-more" v-if="tables.length > 0 && hasMoreData">
			<button class="load-btn" size="mini" @click="loadMore" :loading="isLoading">
				<text v-if="!isLoading">加载更多</text>
				<text v-else>加载中...</text>
			</button>
		</view>
		
		<!-- 新增评分表弹窗 -->
		<uni-popup ref="addTablePopup" type="center">
			<view class="popup-content">
				<view class="popup-title">新增评分表</view>
				<view class="form-item">
					<text class="form-label">表名称</text>
					<input v-model="formData.name" class="form-input" placeholder="请输入评分表名称" />
				</view>
				<view class="form-item">
					<text class="form-label">表类型</text>
					<picker @change="handleFormTypeChange" :value="formData.typeIndex" :range="typeOptions" range-key="name">
						<view class="form-picker">
							<text>{{typeOptions[formData.typeIndex].name}}</text>
							<text class="picker-arrow">▼</text>
						</view>
					</picker>
				</view>
				<view class="form-item">
					<text class="form-label">分类</text>
					<input v-model="formData.category" class="form-input" placeholder="请输入分类，如便民服务、党建办等" />
				</view>
				<view class="form-item">
					<text class="form-label">评分人</text>
					<picker @change="handleRaterChange" :value="currentRaterIndex" :range="raters" range-key="name">
						<view class="form-picker">
							<text>{{raters[currentRaterIndex].name || '请选择评分人'}}</text>
							<text class="picker-arrow">▼</text>
						</view>
					</picker>
				</view>
				<view class="popup-btns">
					<button class="cancel-btn" size="mini" @click="hideAddTablePopup">取消</button>
					<button class="confirm-btn" size="mini" @click="submitAddTable">确定</button>
				</view>
			</view>
		</uni-popup>
		
		<!-- 编辑评分表弹窗 -->
		<uni-popup ref="editTablePopup" type="center">
			<view class="popup-content">
				<view class="popup-title">编辑评分表</view>
				<view class="form-item">
					<text class="form-label">表名称</text>
					<input v-model="editData.name" class="form-input" placeholder="请输入评分表名称" />
				</view>
				<view class="form-item">
					<text class="form-label">表类型</text>
					<picker @change="handleEditTypeChange" :value="editData.typeIndex" :range="typeOptions" range-key="name">
						<view class="form-picker">
							<text>{{typeOptions[editData.typeIndex].name}}</text>
							<text class="picker-arrow">▼</text>
						</view>
					</picker>
				</view>
				<view class="form-item">
					<text class="form-label">分类</text>
					<input v-model="editData.category" class="form-input" placeholder="请输入分类，如便民服务、党建办等" />
				</view>
				<view class="popup-btns">
					<button class="cancel-btn" size="mini" @click="hideEditTablePopup">取消</button>
					<button class="confirm-btn" size="mini" @click="submitEditTable">确定</button>
				</view>
			</view>
		</uni-popup>
		
		<!-- 更换评分人弹窗 -->
		<uni-popup ref="changeRaterPopup" type="center">
			<view class="popup-content">
				<view class="popup-title">更换评分人</view>
				<view class="form-item">
					<text class="form-label">当前评分人</text>
					<text class="current-rater">{{changeRaterData.currentRater}}</text>
				</view>
				<view class="form-item">
					<text class="form-label">新评分人</text>
					<picker @change="handleNewRaterChange" :value="changeRaterData.newRaterIndex" :range="raters" range-key="name">
						<view class="form-picker">
							<text>{{raters[changeRaterData.newRaterIndex].name || '请选择新评分人'}}</text>
							<text class="picker-arrow">▼</text>
						</view>
					</picker>
				</view>
				<view class="popup-btns">
					<button class="cancel-btn" size="mini" @click="hideChangeRaterPopup">取消</button>
					<button class="confirm-btn" size="mini" @click="submitChangeRater">确定</button>
				</view>
			</view>
		</uni-popup>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				currentTypeIndex: 0,
				typeOptions: [
					{ id: 0, name: '全部类型' },
					{ id: 1, name: '(办公室)一般干部评分' },
					{ id: 2, name: '(驻村)干部评分' },
					{ id: 3, name: '班子评分' }
				],
				tables: [],
				page: 1,
				pageSize: 10,
				total: 0,
				hasMoreData: false,
				isLoading: false,
				
				// 表单数据
				formData: {
					name: '',
					typeIndex: 1,
					category: '',
					rater: ''
				},
				
				// 评分人列表
				raters: [{ username: '', name: '请选择评分人' }],
				currentRaterIndex: 0,
				
				// 编辑表单数据
				editData: {
					id: '',
					name: '',
					typeIndex: 1,
					category: ''
				},
				
				// 更换评分人数据
				changeRaterData: {
					tableId: '',
					currentRater: '',
					newRaterIndex: 0
				}
			}
		},
		onLoad() {
			this.loadTables();
			this.loadRaters();
		},
		methods: {
			// 获取评分表类型名称
			getTableTypeName(type) {
				const typeMap = {
					1: '(办公室)一般干部评分',
					2: '(驻村)干部评分',
					3: '班子评分'
				};
				return typeMap[type] || '未知类型';
			},
			
			// 处理类型筛选变化
			handleTypeChange(e) {
				this.currentTypeIndex = e.detail.value;
				this.page = 1;
				this.tables = [];
				this.loadTables();
			},
			
			// 加载评分表
			loadTables() {
				this.isLoading = true;
				
				const type = this.typeOptions[this.currentTypeIndex].id;
				
				uniCloud.callFunction({
					name: 'ratingTable',
					data: {
						action: 'getTables',
						data: {
							type: type > 0 ? type : undefined,
							page: this.page,
							pageSize: this.pageSize
						}
					}
				}).then(res => {
					this.isLoading = false;
					
					if (res.result.code === 0) {
						const data = res.result.data;
						
						if (this.page === 1) {
							this.tables = data.list;
						} else {
							this.tables = this.tables.concat(data.list);
						}
						
						this.total = data.total;
						this.hasMoreData = this.tables.length < this.total;
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
				this.loadTables();
			},
			
			// 加载评分人列表
			loadRaters() {
				uniCloud.callFunction({
					name: 'user',
					data: {
						action: 'getUsers',
						data: {
							role: 'rater',
							pageSize: 100
						}
					}
				}).then(res => {
					if (res.result.code === 0) {
						const data = res.result.data;
						this.raters = [{ username: '', name: '请选择评分人' }].concat(data.list.map(item => {
							return {
								username: item.username,
								name: item.name || item.username
							};
						}));
					}
				});
			},
			
			// 导航到详情页
			navigateToDetail(tableId) {
				uni.navigateTo({
					url: `/pages/admin/items/items?tableId=${tableId}`
				});
			},
			
			// 显示新增评分表弹窗
			showAddTableModal() {
				// 重置表单
				this.formData = {
					name: '',
					typeIndex: 1,
					category: '',
					rater: ''
				};
				this.currentRaterIndex = 0;
				
				this.$refs.addTablePopup.open();
			},
			
			// 隐藏新增评分表弹窗
			hideAddTablePopup() {
				this.$refs.addTablePopup.close();
			},
			
			// 处理表单类型变化
			handleFormTypeChange(e) {
				this.formData.typeIndex = e.detail.value;
			},
			
			// 处理评分人选择变化
			handleRaterChange(e) {
				this.currentRaterIndex = e.detail.value;
				if (this.currentRaterIndex > 0) {
					this.formData.rater = this.raters[this.currentRaterIndex].username;
				} else {
					this.formData.rater = '';
				}
			},
			
			// 提交新增评分表
			submitAddTable() {
				if (!this.formData.name) {
					uni.showToast({
						title: '请输入评分表名称',
						icon: 'none'
					});
					return;
				}
				
				if (!this.formData.rater) {
					uni.showToast({
						title: '请选择评分人',
						icon: 'none'
					});
					return;
				}
				
				uni.showLoading({
					title: '提交中...'
				});
				
				const type = this.typeOptions[this.formData.typeIndex].id;
				
				uniCloud.callFunction({
					name: 'ratingTable',
					data: {
						action: 'createTable',
						data: {
							name: this.formData.name,
							type: type,
							category: this.formData.category,
							rater: this.formData.rater
						}
					}
				}).then(res => {
					uni.hideLoading();
					
					if (res.result.code === 0) {
						uni.showToast({
							title: '创建成功',
							icon: 'success'
						});
						
						this.hideAddTablePopup();
						this.page = 1;
						this.loadTables();
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
			
			// 编辑评分表
			editTable(table) {
				// 设置编辑数据
				this.editData = {
					id: table._id,
					name: table.name,
					typeIndex: table.type,
					category: table.category || ''
				};
				
				this.$refs.editTablePopup.open();
			},
			
			// 隐藏编辑评分表弹窗
			hideEditTablePopup() {
				this.$refs.editTablePopup.close();
			},
			
			// 处理编辑类型变化
			handleEditTypeChange(e) {
				this.editData.typeIndex = e.detail.value;
			},
			
			// 提交编辑评分表
			submitEditTable() {
				if (!this.editData.name) {
					uni.showToast({
						title: '请输入评分表名称',
						icon: 'none'
					});
					return;
				}
				
				uni.showLoading({
					title: '提交中...'
				});
				
				const type = this.typeOptions[this.editData.typeIndex].id;
				
				uniCloud.callFunction({
					name: 'ratingTable',
					data: {
						action: 'updateTable',
						data: {
							tableId: this.editData.id,
							updateData: {
								name: this.editData.name,
								type: type,
								category: this.editData.category
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
						
						this.hideEditTablePopup();
						this.loadTables();
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
			
			// 显示更换评分人弹窗
			showChangeRaterModal(table) {
				this.changeRaterData = {
					tableId: table._id,
					currentRater: table.rater,
					newRaterIndex: 0
				};
				
				this.$refs.changeRaterPopup.open();
			},
			
			// 隐藏更换评分人弹窗
			hideChangeRaterPopup() {
				this.$refs.changeRaterPopup.close();
			},
			
			// 处理新评分人选择变化
			handleNewRaterChange(e) {
				this.changeRaterData.newRaterIndex = e.detail.value;
			},
			
			// 提交更换评分人
			submitChangeRater() {
				if (this.changeRaterData.newRaterIndex === 0) {
					uni.showToast({
						title: '请选择新评分人',
						icon: 'none'
					});
					return;
				}
				
				const newRater = this.raters[this.changeRaterData.newRaterIndex].username;
				
				if (newRater === this.changeRaterData.currentRater) {
					uni.showToast({
						title: '新旧评分人不能相同',
						icon: 'none'
					});
					return;
				}
				
				uni.showLoading({
					title: '提交中...'
				});
				
				uniCloud.callFunction({
					name: 'ratingTable',
					data: {
						action: 'changeRater',
						data: {
							tableId: this.changeRaterData.tableId,
							newRater: newRater
						}
					}
				}).then(res => {
					uni.hideLoading();
					
					if (res.result.code === 0) {
						uni.showToast({
							title: '更换成功',
							icon: 'success'
						});
						
						this.hideChangeRaterPopup();
						this.loadTables();
					} else {
						uni.showToast({
							title: res.result.msg || '更换失败',
							icon: 'none'
						});
					}
				}).catch(err => {
					uni.hideLoading();
					console.error(err);
					uni.showToast({
						title: '更换失败，请检查网络',
						icon: 'none'
					});
				});
			},
			
			// 确认删除
			confirmDelete(tableId) {
				uni.showModal({
					title: '确认删除',
					content: '删除后将无法恢复，是否继续？',
					success: res => {
						if (res.confirm) {
							this.deleteTable(tableId);
						}
					}
				});
			},
			
			// 删除评分表
			deleteTable(tableId) {
				uni.showLoading({
					title: '删除中...'
				});
				
				uniCloud.callFunction({
					name: 'ratingTable',
					data: {
						action: 'deleteTable',
						data: {
							tableId: tableId
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
						this.tables = this.tables.filter(item => item._id !== tableId);
						if (this.tables.length === 0 && this.page > 1) {
							this.page--;
							this.loadTables();
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
/* 基础变量 */
page {
	--primary-color: #3B7FF2;
	--primary-gradient: linear-gradient(135deg, #3B7FF2, #2D6CDB);
	--danger-color: #F56C6C;
	--danger-light: #FEF0F0;
	--text-main: #303133;
	--text-regular: #606266;
	--text-secondary: #909399;
	--border-color: #EBEEF5;
	--bg-color: #F5F7FA;
	--card-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
	--card-radius: 12rpx;
	--transition-time: 0.3s;
}

/* 基础样式 */
.container {
	padding: 12rpx;
	padding-bottom: 30rpx;
	background-color: var(--bg-color);
	min-height: 100vh;
	box-sizing: border-box;
}

/* 头部 */
.filter-bar {
	position: sticky;
	top: 0;
	z-index: 10;
	margin: 0 -12rpx;
	background-color: var(--bg-color);
	padding: 16rpx 24rpx;
	display: flex;
	justify-content: space-between;
	align-items: center;
	box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.03);
	margin-bottom: 20rpx;
}

.filter-item {
	flex: 1;
	margin-right: 20rpx;
}

.picker-box {
	background-color: #FFFFFF;
	height: 64rpx;
	border-radius: 32rpx;
	display: flex;
	align-items: center;
	padding: 0 24rpx;
	box-shadow: var(--card-shadow);
	transition: all var(--transition-time);
}

.picker-box:active {
	opacity: 0.9;
	transform: scale(0.98);
}

.picker-text {
	flex: 1;
	font-size: 26rpx;
	color: var(--text-regular);
	font-weight: 500;
}

.picker-arrow {
	font-size: 18rpx;
	color: var(--text-secondary);
	margin-left: 8rpx;
}

.add-btn {
	background: var(--primary-gradient);
	color: #FFFFFF;
	border-radius: 32rpx;
	font-size: 26rpx;
	font-weight: 500;
	padding: 0 24rpx;
	height: 64rpx;
	line-height: 64rpx;
	border: none;
	box-shadow: 0 4rpx 12rpx rgba(59, 127, 242, 0.2);
	transition: all var(--transition-time);
	display: flex;
	align-items: center;
}

.btn-icon {
	font-size: 28rpx;
	margin-right: 6rpx;
	font-weight: bold;
}

.add-btn:active {
	opacity: 0.9;
	transform: scale(0.98);
}

/* 内容区域 */
.table-list {
	padding: 0 4rpx;
}

/* 无数据状态 */
.no-data {
	margin: 60rpx 20rpx;
	padding: 40rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	background-color: #FFFFFF;
	border-radius: var(--card-radius);
	box-shadow: var(--card-shadow);
}

.no-data-icon {
	width: 140rpx;
	height: 140rpx;
	margin-bottom: 20rpx;
	opacity: 0.7;
}

.no-data-text {
	font-size: 26rpx;
	color: var(--text-secondary);
}

/* 表格项卡片 */
.table-item {
	position: relative;
	background-color: #FFFFFF;
	border-radius: var(--card-radius);
	margin-bottom: 16rpx;
	padding: 0;
	box-shadow: var(--card-shadow);
	overflow: hidden;
	transition: all var(--transition-time);
}

.table-item:active {
	transform: translateY(2rpx);
	box-shadow: 0 1rpx 6rpx rgba(0, 0, 0, 0.02);
}

/* 表头 */
.table-header {
	padding: 18rpx 20rpx;
	position: relative;
}

.title-wrapper {
	display: flex;
	align-items: center;
	padding-right: 170rpx;
}

.table-name {
	font-size: 28rpx;
	font-weight: bold;
	color: var(--text-main);
	margin-right: 12rpx;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 70%;
}

.table-type {
	font-size: 20rpx;
	color: var(--primary-color);
	background-color: rgba(59, 127, 242, 0.1);
	padding: 2rpx 12rpx;
	border-radius: 12rpx;
	white-space: nowrap;
}

/* 表格内容 */
.table-info {
	display: flex;
	flex-wrap: wrap;
	padding: 0 20rpx 16rpx;
	background-color: #FAFBFC;
	border-top: 1rpx solid var(--border-color);
}

.info-item {
	display: flex;
	align-items: center;
	margin-top: 12rpx;
	width: 50%;
}

.info-label {
	font-size: 22rpx;
	color: var(--text-secondary);
	width: auto;
	margin-right: 8rpx;
}

.info-value {
	font-size: 22rpx;
	color: var(--text-regular);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	flex: 1;
}

/* 浮动按钮组 */
.table-actions {
	position: absolute;
	right: 12rpx;
	top: 12rpx;
	display: flex;
	z-index: 2;
}

.action-btn {
	width: 50rpx;
	height: 50rpx;
	border-radius: 25rpx;
	background-color: #FFFFFF;
	margin-left: 10rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
	border: 1rpx solid var(--border-color);
	transition: all var(--transition-time);
}

.action-btn:active {
	transform: scale(0.9);
}

.action-btn.edit {
	color: var(--primary-color);
}

.action-btn.change {
	color: #E6A23C;
}

.action-btn.delete {
	color: var(--danger-color);
}

.action-icon {
	font-size: 28rpx;
}

/* 加载更多 */
.load-more {
	text-align: center;
	margin: 30rpx 0;
}

.load-btn {
	background-color: #FFFFFF;
	color: var(--text-secondary);
	border-radius: 30rpx;
	font-size: 24rpx;
	padding: 8rpx 40rpx;
	border: 1rpx solid var(--border-color);
	box-shadow: var(--card-shadow);
	transition: all var(--transition-time);
}

.load-btn:active {
	opacity: 0.9;
	transform: scale(0.98);
}

/* 弹窗样式 */
.popup-content {
	background-color: #FFFFFF;
	border-radius: 16rpx;
	width: 650rpx;
	padding: 30rpx;
	box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.1);
}

.popup-title {
	font-size: 32rpx;
	font-weight: bold;
	text-align: center;
	margin-bottom: 30rpx;
	color: var(--text-main);
	position: relative;
}

.popup-title::after {
	content: '';
	position: absolute;
	bottom: -12rpx;
	left: 50%;
	transform: translateX(-50%);
	width: 60rpx;
	height: 4rpx;
	background-color: var(--primary-color);
	border-radius: 2rpx;
}

/* 表单样式 */
.form-item {
	margin-bottom: 24rpx;
}

.form-label {
	font-size: 26rpx;
	color: var(--text-regular);
	margin-bottom: 10rpx;
	display: block;
}

.form-input,
.form-picker,
.current-rater {
	height: 76rpx;
	border: 1rpx solid var(--border-color);
	border-radius: 8rpx;
	padding: 0 20rpx;
	font-size: 26rpx;
	width: 100%;
	box-sizing: border-box;
	background-color: #FAFAFA;
	transition: all var(--transition-time);
}

.form-input:focus,
.form-picker:active {
	border-color: var(--primary-color);
	background-color: #FFFFFF;
}

.form-picker {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.current-rater {
	line-height: 76rpx;
	background-color: #F5F7FA;
	color: var(--text-regular);
	display: block;
}

/* 弹窗按钮 */
.popup-btns {
	display: flex;
	justify-content: space-between;
	margin-top: 40rpx;
}

.cancel-btn,
.confirm-btn {
	width: 45%;
	border-radius: 40rpx;
	font-size: 28rpx;
	padding: 16rpx 0;
}

.cancel-btn {
	background-color: #f5f5f5;
	color: #666;
	border: 1rpx solid #ebebeb;
}

.confirm-btn {
	background: linear-gradient(to right, #07c160, #10ad7a);
	color: #fff;
	border: none;
	box-shadow: 0 4rpx 12rpx rgba(7, 193, 96, 0.3);
}
</style> 