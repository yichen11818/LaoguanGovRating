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
			
			<view class="action-btns">
				<button class="add-btn" size="mini" @click="showAddTableModal">新增评分表</button>
			</view>
		</view>
		
		<view class="table-list">
			<view class="no-data" v-if="tables.length === 0">
				<image class="no-data-icon" src="/static/images/no-data.png" mode="aspectFit"></image>
				<text class="no-data-text">暂无评分表</text>
			</view>
			
			<view class="table-item" v-for="(table, index) in tables" :key="index" @click="navigateToDetail(table._id)">
				<view class="table-header">
					<text class="table-name">{{table.name}}</text>
					<text class="table-type">{{getTableTypeName(table.type)}}</text>
				</view>
				<view class="table-info">
					<view class="info-item">
						<text class="info-label">分类：</text>
						<text class="info-value">{{table.category || '无'}}</text>
					</view>
					<view class="info-item">
						<text class="info-label">评分人：</text>
						<text class="info-value">{{table.rater}}</text>
					</view>
					<view class="info-item">
						<text class="info-label">项目数：</text>
						<text class="info-value">{{table.items ? table.items.length : 0}}</text>
					</view>
				</view>
				<view class="table-actions">
					<view class="action-btn" @click.stop="editTable(table)">
						<text class="action-text">编辑</text>
					</view>
					<view class="action-btn" @click.stop="showChangeRaterModal(table)">
						<text class="action-text">更换评分人</text>
					</view>
					<view class="action-btn delete" @click.stop="confirmDelete(table._id)">
						<text class="action-text">删除</text>
					</view>
				</view>
			</view>
		</view>
		
		<!-- 加载更多 -->
		<view class="load-more" v-if="tables.length > 0 && hasMoreData">
			<button class="load-btn" size="mini" @click="loadMore" :loading="isLoading">加载更多</button>
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
	.container {
		padding: 30rpx;
	}
	
	.filter-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 30rpx;
	}
	
	.filter-item {
		flex: 1;
	}
	
	.picker-box {
		background-color: #f8f8f8;
		height: 70rpx;
		border-radius: 8rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 20rpx;
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
		margin-left: 20rpx;
	}
	
	.add-btn {
		background-color: #07c160;
		color: #fff;
	}
	
	.table-list {
		margin-top: 20rpx;
	}
	
	.no-data {
		padding: 60rpx 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
	
	.no-data-icon {
		width: 200rpx;
		height: 200rpx;
		margin-bottom: 30rpx;
	}
	
	.no-data-text {
		font-size: 28rpx;
		color: #999;
	}
	
	.table-item {
		background-color: #fff;
		border-radius: 16rpx;
		padding: 30rpx;
		margin-bottom: 30rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
	}
	
	.table-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20rpx;
		padding-bottom: 20rpx;
		border-bottom: 1rpx solid #f5f5f5;
	}
	
	.table-name {
		font-size: 32rpx;
		font-weight: bold;
	}
	
	.table-type {
		font-size: 24rpx;
		color: #666;
		background-color: #f5f5f5;
		padding: 6rpx 16rpx;
		border-radius: 6rpx;
	}
	
	.table-info {
		margin-bottom: 20rpx;
	}
	
	.info-item {
		display: flex;
		margin-bottom: 10rpx;
	}
	
	.info-label {
		width: 120rpx;
		font-size: 28rpx;
		color: #666;
	}
	
	.info-value {
		flex: 1;
		font-size: 28rpx;
		color: #333;
	}
	
	.table-actions {
		display: flex;
		justify-content: flex-end;
		padding-top: 20rpx;
		border-top: 1rpx solid #f5f5f5;
	}
	
	.action-btn {
		margin-left: 30rpx;
		padding: 6rpx 20rpx;
		border-radius: 6rpx;
		background-color: #f8f8f8;
	}
	
	.action-btn.delete {
		background-color: #f8d0d0;
	}
	
	.action-text {
		font-size: 24rpx;
		color: #333;
	}
	
	.action-btn.delete .action-text {
		color: #e64340;
	}
	
	.load-more {
		text-align: center;
		margin: 30rpx 0;
	}
	
	.load-btn {
		font-size: 28rpx;
		color: #666;
		background-color: #f8f8f8;
	}
	
	/* 弹窗样式 */
	.popup-content {
		background-color: #fff;
		border-radius: 16rpx;
		width: 600rpx;
		padding: 30rpx;
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
		font-size: 28rpx;
		color: #333;
		margin-bottom: 10rpx;
		display: block;
	}
	
	.form-input {
		height: 80rpx;
		border: 1rpx solid #eee;
		border-radius: 8rpx;
		padding: 0 20rpx;
		font-size: 28rpx;
	}
	
	.form-picker {
		height: 80rpx;
		border: 1rpx solid #eee;
		border-radius: 8rpx;
		padding: 0 20rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 28rpx;
	}
	
	.current-rater {
		height: 80rpx;
		line-height: 80rpx;
		border: 1rpx solid #eee;
		border-radius: 8rpx;
		padding: 0 20rpx;
		font-size: 28rpx;
		background-color: #f8f8f8;
		display: block;
	}
	
	.popup-btns {
		display: flex;
		justify-content: space-between;
		margin-top: 40rpx;
	}
	
	.cancel-btn, .confirm-btn {
		width: 45%;
	}
	
	.cancel-btn {
		background-color: #f5f5f5;
		color: #666;
	}
	
	.confirm-btn {
		background-color: #07c160;
		color: #fff;
	}
</style> 