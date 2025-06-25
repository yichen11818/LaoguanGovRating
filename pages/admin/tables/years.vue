<template>
	<view class="container">
		<view class="header">
			<text class="header-title">评分表分组</text>
			<button class="add-btn" @click="showAddGroupModal">
				<text class="btn-icon">+</text>
				<text>新建表格组</text>
			</button>
		</view>
		
		<!-- 导出A类评分功能 -->
		<view class="export-section">
			<button class="export-btn" @click="exportATypeRatings">导出A类评分汇总表</button>
		</view>
		
		<view class="year-list" v-if="years.length > 0">
			<view class="year-item" v-for="(year, index) in years" :key="index" @click="navigateToTablesWithYear(year)">
				<view class="year-card">
					<text class="year-text">{{year.year}}年</text>
					<text class="table-count">{{year.tableCount}}张表格</text>
					<text class="group-desc" v-if="year.description">{{year.description}}</text>
					
					<view class="year-actions">
						<button class="action-btn add-table" @click.stop="createTableInGroup(year)">
							<text>新增表格</text>
						</button>
					</view>
				</view>
			</view>
		</view>
		
		<view class="no-data" v-else>
			<text class="no-data-text">暂无表格组，请创建</text>
		</view>
		
		<!-- 新建表格组弹窗 -->
		<uni-popup ref="addGroupPopup" type="center">
			<view class="popup-content">
				<view class="popup-title">新建表格组</view>
				<view class="form-item">
					<text class="form-label">年份</text>
					<input v-model="formData.year" class="form-input" placeholder="请输入年份，如：2023" type="number" />
				</view>
				<view class="form-item">
					<text class="form-label">备注说明</text>
					<input v-model="formData.description" class="form-input" placeholder="可选：分组说明" />
				</view>
				<view class="popup-btns">
					<button class="cancel-btn" size="mini" @click="hideAddGroupPopup">取消</button>
					<button class="confirm-btn" size="mini" @click="submitAddGroup">确定</button>
				</view>
			</view>
		</uni-popup>
		
		<!-- 导出A类评分弹窗 -->
		<uni-popup ref="exportPopup" type="center">
			<view class="popup-content">
				<view class="popup-title">导出A类评分汇总表</view>
				<view class="form-item">
					<text class="form-label">选择年度</text>
					<picker @change="handleYearChange" :value="exportData.yearIndex" :range="years" range-key="year">
						<view class="picker-box">
							<text class="picker-text">{{years[exportData.yearIndex]?.year || '请选择年度'}}</text>
						</view>
					</picker>
				</view>
				<view class="popup-btns">
					<button class="cancel-btn" size="mini" @click="hideExportPopup">取消</button>
					<button class="confirm-btn" size="mini" @click="confirmExport">确定</button>
				</view>
			</view>
		</uni-popup>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				years: [],
				isLoading: false,
				formData: {
					year: new Date().getFullYear().toString(), // 默认当前年份
					description: ''
				},
				exportData: {
					yearIndex: 0,
					year: null,
					group_id: null
				}
			}
		},
		onShow() {
			this.loadData();
		},
		methods: {
			// 加载表格组数据
			async loadData() {
				this.isLoading = true;
				
				try {
					const result = await uniCloud.callFunction({
						name: 'ratingTable',
						data: {
							action: 'getGroups',
							data: {}
						}
					});
					
					if (result.result.code === 0) {
						this.years = result.result.data;
						// 默认选择第一个年度
						if (this.years.length > 0) {
							this.exportData.yearIndex = 0;
							this.exportData.year = this.years[0].year;
							this.exportData.group_id = this.years[0]._id;
						}
					} else {
						uni.showToast({
							title: '获取数据失败',
							icon: 'none'
						});
					}
				} catch (e) {
					console.error('加载表格组数据失败:', e);
					uni.showToast({
						title: '加载数据失败',
						icon: 'none'
					});
				} finally {
					this.isLoading = false;
				}
			},
			
			// 跳转到指定年份的表格列表
			navigateToTablesWithYear(year) {
				uni.navigateTo({
					url: `/pages/admin/tables/tables?year=${year.year}&group_id=${year._id}`
				});
			},
			
			// 在特定年份组中创建新表格
			createTableInGroup(year) {
				uni.navigateTo({
					url: `/pages/admin/tables/tables?year=${year.year}&group_id=${year._id}&createNew=true`
				});
			},
			
			// 显示新建表格组弹窗
			showAddGroupModal() {
				this.$refs.addGroupPopup.open();
			},
			
			// 隐藏新建表格组弹窗
			hideAddGroupPopup() {
				this.$refs.addGroupPopup.close();
			},
			
			// 提交新建表格组
			async submitAddGroup() {
				const year = this.formData.year.trim();
				if (!year) {
					uni.showToast({
						title: '请输入年份',
						icon: 'none'
					});
					return;
				}
				
				// 检查是否为有效的年份格式
				if (!/^20\d{2}$/.test(year)) {
					uni.showToast({
						title: '请输入有效的年份',
						icon: 'none'
					});
					return;
				}
				
				try {
					const result = await uniCloud.callFunction({
						name: 'ratingTable',
						data: {
							action: 'createGroup',
							data: {
								year: this.formData.year,
								description: this.formData.description
							}
						}
					});
					
					if (result.result.code === 0) {
						uni.showToast({
							title: '创建成功',
							icon: 'success'
						});
						
						this.hideAddGroupPopup();
						
						// 重新加载数据
						await this.loadData();
						
						// 创建成功后跳转到创建表格页面
						const newGroup = this.years.find(group => group.year === this.formData.year);
						if (newGroup) {
							this.createTableInGroup(newGroup);
						}
					} else {
						uni.showToast({
							title: result.result.msg || '创建失败',
							icon: 'none'
						});
					}
				} catch (e) {
					console.error('创建表格组失败:', e);
					uni.showToast({
						title: '创建失败',
						icon: 'none'
					});
				}
			},
			
			// 导出A类评分表相关方法
			exportATypeRatings() {
				this.$refs.exportPopup.open();
			},
			
			// 隐藏导出弹窗
			hideExportPopup() {
				this.$refs.exportPopup.close();
			},
			
			// 选择年度变化
			handleYearChange(e) {
				const index = e.detail.value;
				this.exportData.yearIndex = index;
				this.exportData.year = this.years[index].year;
				this.exportData.group_id = this.years[index]._id;
			},
			
			// 确认导出
			async confirmExport() {
				if (!this.exportData.year) {
					uni.showToast({
						title: '请选择年度',
						icon: 'none'
					});
					return;
				}
				
				uni.showLoading({
					title: '正在导出...'
				});
				
				try {
					// 调用云函数导出A类评分汇总
					const result = await uniCloud.callFunction({
						name: 'ratingTable',
						data: {
							action: 'exportATypeRatings',
							data: {
								group_id: this.exportData.group_id,
								year: this.exportData.year
							}
						}
					});
					
					if (result.result.code === 0) {
						// 下载导出的文件
						const fileUrl = result.result.data.fileUrl;
						
						// 在浏览器环境下提示下载链接
						// #ifdef H5
						window.open(fileUrl, '_blank');
						// #endif
						
						// 在APP环境下下载文件
						// #ifdef APP-PLUS
						uni.showToast({
							title: '导出成功，正在下载...',
							icon: 'none',
							duration: 2000
						});
						
						// 下载文件到手机
						const downloadTask = uni.downloadFile({
							url: fileUrl,
							success: (res) => {
								if (res.statusCode === 200) {
									uni.saveFile({
										tempFilePath: res.tempFilePath,
										success: (saveRes) => {
											uni.openDocument({
												filePath: saveRes.savedFilePath,
												success: () => {
													console.log('打开文档成功');
												}
											});
										},
										fail: (err) => {
											console.error('保存文件失败:', err);
										}
									});
								}
							},
							fail: (err) => {
								console.error('下载文件失败:', err);
							}
						});
						// #endif
						
						this.hideExportPopup();
					} else {
						uni.showToast({
							title: result.result.msg || '导出失败',
							icon: 'none'
						});
					}
				} catch (e) {
					console.error('导出A类评分汇总表失败:', e);
					uni.showToast({
						title: '导出失败',
						icon: 'none'
					});
				} finally {
					uni.hideLoading();
				}
			}
		}
	}
</script>

<style>
	.container {
		padding: 20rpx;
	}
	
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 30rpx;
	}
	
	.header-title {
		font-size: 36rpx;
		font-weight: bold;
	}
	
	.add-btn, .export-btn {
		background-color: #007AFF;
		color: #FFFFFF;
		font-size: 28rpx;
		padding: 10rpx 30rpx;
		border-radius: 30rpx;
		display: flex;
		align-items: center;
	}
	
	.export-btn {
		background-color: #0A8D2E;
		margin-bottom: 20rpx;
	}
	
	.export-section {
		display: flex;
		justify-content: flex-start;
		margin-bottom: 20rpx;
	}
	
	.btn-icon {
		font-size: 32rpx;
		margin-right: 5rpx;
	}
	
	.year-list {
		display: flex;
		flex-direction: column;
		gap: 20rpx;
		margin-top: 20rpx;
	}
	
	.year-item {
		border-radius: 10rpx;
		overflow: hidden;
	}
	
	.year-card {
		background-image: linear-gradient(45deg, #3B7EF7, #6BA6FF);
		padding: 40rpx;
		display: flex;
		flex-direction: column;
		gap: 10rpx;
		border-radius: 10rpx;
		box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.1);
		position: relative;
	}
	
	.year-text {
		font-size: 48rpx;
		font-weight: bold;
		color: #FFFFFF;
	}
	
	.table-count {
		font-size: 28rpx;
		color: rgba(255, 255, 255, 0.9);
	}

	.group-desc {
		font-size: 24rpx;
		color: rgba(255, 255, 255, 0.8);
		margin-top: 5rpx;
	}
	
	.year-actions {
		position: absolute;
		right: 20rpx;
		bottom: 20rpx;
	}
	
	.action-btn {
		background-color: rgba(255, 255, 255, 0.2);
		color: #FFFFFF;
		font-size: 24rpx;
		padding: 8rpx 20rpx;
		border-radius: 30rpx;
		border: 1px solid #FFFFFF;
		margin-left: 10rpx;
	}
	
	.no-data {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 100rpx 0;
	}
	
	.no-data-text {
		font-size: 30rpx;
		color: #999999;
		margin-top: 20rpx;
	}
	
	.popup-content {
		background-color: #FFFFFF;
		border-radius: 10rpx;
		padding: 30rpx;
		width: 600rpx;
	}
	
	.popup-title {
		font-size: 32rpx;
		font-weight: bold;
		margin-bottom: 30rpx;
		text-align: center;
	}
	
	.form-item {
		margin-bottom: 20rpx;
	}
	
	.form-label {
		display: block;
		font-size: 28rpx;
		margin-bottom: 10rpx;
	}
	
	.form-input, .picker-box {
		width: 100%;
		height: 80rpx;
		border: 1px solid #DDDDDD;
		border-radius: 8rpx;
		padding: 0 20rpx;
		font-size: 28rpx;
		display: flex;
		align-items: center;
	}
	
	.popup-btns {
		display: flex;
		justify-content: space-between;
		margin-top: 30rpx;
	}
	
	.cancel-btn {
		width: 45%;
		background-color: #F2F2F2;
		color: #333333;
	}
	
	.confirm-btn {
		width: 45%;
		background-color: #007AFF;
		color: #FFFFFF;
	}
</style> 