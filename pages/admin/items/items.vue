<template>
	<view class="container">
		<view class="table-info">
			<view class="table-header">
				<text class="table-name">{{table.name || ''}}</text>
				<text class="table-type" v-if="table.type">{{getTableTypeName(table.type)}}</text>
			</view>
			<text class="table-category" v-if="table.category">分类：{{table.category}}</text>
			<text class="table-rater" copyable>评分人：{{table.rater || '未分配'}}</text>
		</view>
		
		<view class="item-action">
			<button class="add-btn" type="primary" size="mini" @click="showAddItemModal">添加评分项</button>
		</view>
		
		<view class="item-list">
			<view class="no-data" v-if="table.items && table.items.length === 0">
				<image class="no-data-icon" src="/static/images/no-data.png" mode="aspectFit"></image>
				<text class="no-data-text">暂无评分项，请添加</text>
			</view>
			
			<view class="item-card" v-for="(item, index) in table.items" :key="index">
				<view class="item-header">
					<text class="item-name">{{item.name}}</text>
					<text class="item-score">满分：{{item.maxScore}}分</text>
				</view>
				<view class="item-desc" v-if="item.description">
					<text>{{item.description}}</text>
				</view>
				<view class="item-actions">
					<view class="action-btn" @click="editItem(index)">
						<text class="action-text">编辑</text>
					</view>
					<view class="action-btn delete" @click="deleteItem(index)">
						<text class="action-text">删除</text>
					</view>
				</view>
			</view>
		</view>
		
		<!-- 添加评分项弹窗 -->
		<uni-popup ref="addItemPopup" type="center">
			<view class="popup-content">
				<view class="popup-title">添加评分项</view>
				<view class="form-item">
					<text class="form-label">名称</text>
					<input v-model="formData.name" class="form-input" placeholder="请输入评分项名称" />
				</view>
				<view class="form-item">
					<text class="form-label">满分值</text>
					<input v-model="formData.maxScore" class="form-input" type="number" placeholder="请输入满分值" />
				</view>
				<view class="form-item">
					<text class="form-label">描述</text>
					<textarea v-model="formData.description" class="form-textarea" placeholder="请输入评分项描述（选填）" />
				</view>
				<view class="popup-btns">
					<button class="cancel-btn" size="mini" @click="hideAddItemPopup">取消</button>
					<button class="confirm-btn" size="mini" @click="submitAddItem">确定</button>
				</view>
			</view>
		</uni-popup>
		
		<!-- 编辑评分项弹窗 -->
		<uni-popup ref="editItemPopup" type="center">
			<view class="popup-content">
				<view class="popup-title">编辑评分项</view>
				<view class="form-item">
					<text class="form-label">名称</text>
					<input v-model="editData.name" class="form-input" placeholder="请输入评分项名称" />
				</view>
				<view class="form-item">
					<text class="form-label">满分值</text>
					<input v-model="editData.maxScore" class="form-input" type="number" placeholder="请输入满分值" />
				</view>
				<view class="form-item">
					<text class="form-label">描述</text>
					<textarea v-model="editData.description" class="form-textarea" placeholder="请输入评分项描述（选填）" />
				</view>
				<view class="popup-btns">
					<button class="cancel-btn" size="mini" @click="hideEditItemPopup">取消</button>
					<button class="confirm-btn" size="mini" @click="submitEditItem">确定</button>
				</view>
			</view>
		</uni-popup>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				tableId: '',
				table: {
					_id: '',
					name: '',
					type: 1,
					category: '',
					rater: '',
					items: []
				},
				formData: {
					name: '',
					maxScore: 10,
					description: ''
				},
				editData: {
					index: -1,
					name: '',
					maxScore: 10,
					description: ''
				}
			}
		},
		onLoad(options) {
			if (options.tableId) {
				this.tableId = options.tableId;
				this.loadTableDetail();
			} else {
				uni.showToast({
					title: '参数错误',
					icon: 'none'
				});
				setTimeout(() => {
					uni.navigateBack();
				}, 1500);
			}
		},
		methods: {
			// 获取评分表类型名称
			getTableTypeName(type) {
				const typeMap = {
					1: 'A类班子评分',
					2: 'A类驻村工作评分',
					3: 'B类分管班子评分',
					4: 'B类驻村工作评分',
					5: 'B类办主任评分'
				};
				return typeMap[type] || '未知类型';
			},
			
			// 加载评分表详情
			loadTableDetail() {
				uni.showLoading({
					title: '加载中...'
				});
				
				uniCloud.callFunction({
					name: 'ratingTable',
					data: {
						action: 'getTableDetail',
						data: {
							tableId: this.tableId
						}
					}
				}).then(res => {
					uni.hideLoading();
					
					if (res.result.code === 0) {
						this.table = res.result.data.table || {};
						if (!this.table.items) {
							this.table.items = [];
						}
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
			
			// 显示添加评分项弹窗
			showAddItemModal() {
				// 重置表单
				this.formData = {
					name: '',
					maxScore: 10,
					description: ''
				};
				
				this.$refs.addItemPopup.open();
			},
			
			// 隐藏添加评分项弹窗
			hideAddItemPopup() {
				this.$refs.addItemPopup.close();
			},
			
			// 提交添加评分项
			submitAddItem() {
				if (!this.formData.name) {
					uni.showToast({
						title: '请输入评分项名称',
						icon: 'none'
					});
					return;
				}
				
				if (!this.formData.maxScore || this.formData.maxScore <= 0) {
					uni.showToast({
						title: '请输入有效的满分值',
						icon: 'none'
					});
					return;
				}
				
				uni.showLoading({
					title: '提交中...'
				});
				
				const newItem = {
					name: this.formData.name,
					maxScore: parseInt(this.formData.maxScore),
					description: this.formData.description
				};
				
				uniCloud.callFunction({
					name: 'ratingTable',
					data: {
						action: 'addItem',
						data: {
							tableId: this.tableId,
							item: newItem
						}
					}
				}).then(res => {
					uni.hideLoading();
					
					if (res.result.code === 0) {
						uni.showToast({
							title: '添加成功',
							icon: 'success'
						});
						
						this.hideAddItemPopup();
						// 更新本地数据
						if (!this.table.items) {
							this.table.items = [];
						}
						newItem._id = res.result.data.itemId; // 后端返回的新项目ID
						this.table.items.push(newItem);
					} else {
						uni.showToast({
							title: res.result.msg || '添加失败',
							icon: 'none'
						});
					}
				}).catch(err => {
					uni.hideLoading();
					console.error(err);
					uni.showToast({
						title: '添加失败，请检查网络',
						icon: 'none'
					});
				});
			},
			
			// 编辑评分项
			editItem(index) {
				const item = this.table.items[index];
				this.editData = {
					index: index,
					name: item.name,
					maxScore: item.maxScore,
					description: item.description || ''
				};
				
				this.$refs.editItemPopup.open();
			},
			
			// 隐藏编辑评分项弹窗
			hideEditItemPopup() {
				this.$refs.editItemPopup.close();
			},
			
			// 提交编辑评分项
			submitEditItem() {
				if (!this.editData.name) {
					uni.showToast({
						title: '请输入评分项名称',
						icon: 'none'
					});
					return;
				}
				
				if (!this.editData.maxScore || this.editData.maxScore <= 0) {
					uni.showToast({
						title: '请输入有效的满分值',
						icon: 'none'
					});
					return;
				}
				
				uni.showLoading({
					title: '提交中...'
				});
				
				const updatedItem = {
					name: this.editData.name,
					maxScore: parseInt(this.editData.maxScore),
					description: this.editData.description
				};
				
				// 获取要更新的项目ID
				const itemId = this.table.items[this.editData.index]._id;
				
				uniCloud.callFunction({
					name: 'ratingTable',
					data: {
						action: 'updateItem',
						data: {
							tableId: this.tableId,
							itemId: itemId,
							item: updatedItem
						}
					}
				}).then(res => {
					uni.hideLoading();
					
					if (res.result.code === 0) {
						uni.showToast({
							title: '更新成功',
							icon: 'success'
						});
						
						this.hideEditItemPopup();
						// 更新本地数据
						this.table.items[this.editData.index] = {
							...this.table.items[this.editData.index],
							...updatedItem
						};
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
			
			// 删除评分项
			deleteItem(index) {
				uni.showModal({
					title: '确认删除',
					content: '删除后将无法恢复，是否继续？',
					success: res => {
						if (res.confirm) {
							this.confirmDeleteItem(index);
						}
					}
				});
			},
			
			// 确认删除评分项
			confirmDeleteItem(index) {
				const itemId = this.table.items[index]._id;
				
				uni.showLoading({
					title: '删除中...'
				});
				
				uniCloud.callFunction({
					name: 'ratingTable',
					data: {
						action: 'deleteItem',
						data: {
							tableId: this.tableId,
							itemId: itemId
						}
					}
				}).then(res => {
					uni.hideLoading();
					
					if (res.result.code === 0) {
						uni.showToast({
							title: '删除成功',
							icon: 'success'
						});
						
						// 更新本地数据
						this.table.items.splice(index, 1);
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
	
	.table-info {
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
		margin-bottom: 16rpx;
	}
	
	.table-name {
		font-size: 34rpx;
		font-weight: bold;
	}
	
	.table-type {
		font-size: 24rpx;
		color: #666;
		background-color: #f5f5f5;
		padding: 6rpx 16rpx;
		border-radius: 6rpx;
	}
	
	.table-category, .table-rater {
		font-size: 28rpx;
		color: #666;
		margin-top: 10rpx;
		display: block;
	}
	
	.item-action {
		display: flex;
		justify-content: flex-end;
		margin-bottom: 30rpx;
	}
	
	.add-btn {
		background-color: #07c160;
		color: #fff;
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
	
	.item-card {
		background-color: #fff;
		border-radius: 16rpx;
		padding: 30rpx;
		margin-bottom: 30rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
	}
	
	.item-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20rpx;
	}
	
	.item-name {
		font-size: 32rpx;
		font-weight: bold;
	}
	
	.item-score {
		font-size: 28rpx;
		color: #07c160;
		font-weight: bold;
	}
	
	.item-desc {
		font-size: 28rpx;
		color: #666;
		margin-bottom: 20rpx;
		padding-bottom: 20rpx;
		border-bottom: 1rpx solid #f5f5f5;
	}
	
	.item-actions {
		display: flex;
		justify-content: flex-end;
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
	
	.form-textarea {
		height: 200rpx;
		border: 1rpx solid #eee;
		border-radius: 8rpx;
		padding: 20rpx;
		font-size: 28rpx;
		width: 100%;
		box-sizing: border-box;
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