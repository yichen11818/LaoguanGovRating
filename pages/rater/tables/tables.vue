<template>
	<view class="container">
		<view class="filter-bar">
			<view class="filter-item">
				<picker @change="handleTypeChange" :value="currentTypeIndex || 0" :range="typeOptions || []" range-key="name">
					<view class="picker-box">
						<text class="picker-text">{{(typeOptions && typeOptions[currentTypeIndex]) ? typeOptions[currentTypeIndex].name : '全部类型'}}</text>
						<text class="picker-arrow">▼</text>
					</view>
				</picker>
			</view>
		</view>
		
		<!-- 状态卡片 -->
		<view class="status-card">
			<view class="status-item">
				<text class="status-number">{{stats && stats.total ? stats.total : 0}}</text>
				<text class="status-label">总评分表</text>
			</view>
			<view class="status-divider"></view>
			<view class="status-item">
				<text class="status-number">{{stats && stats.completed ? stats.completed : 0}}</text>
				<text class="status-label">已完成</text>
			</view>
			<view class="status-divider"></view>
			<view class="status-item">
				<text class="status-number">{{stats && stats.pending ? stats.pending : 0}}</text>
				<text class="status-label">待评分</text>
			</view>
		</view>
		
		<!-- 评分表列表 -->
		<view class="table-list">
			<view class="section-title">我的评分表</view>
			
			<view class="no-data" v-if="!tables || tables.length === 0">
				<image class="no-data-icon" src="/static/images/no-data.png" mode="aspectFit"></image>
				<text class="no-data-text">暂无评分表</text>
			</view>
			
			<view class="table-card" v-for="(table, index) in tables || []" :key="index" @click="goToRating(table._id)">
				<view class="table-header">
					<text class="table-name">{{table && table.name ? table.name : '未命名评分表'}}</text>
					<view class="table-status" :class="{
						'status-completed': table && table.completionRate === 100, 
						'status-progress': table && table.completionRate > 0 && table.completionRate < 100, 
						'status-pending': !table || !table.completionRate || table.completionRate === 0
					}">
						<text>{{getStatusText(table && table.completionRate ? table.completionRate : 0)}}</text>
					</view>
				</view>
				<view class="table-info">
					<text class="table-type">{{table && table.type ? getTableTypeName(table.type) : '未知类型'}}</text>
					<text class="table-category" v-if="table && table.category">{{table.category}}</text>
				</view>
				<view class="table-progress">
					<view class="progress-label">
						<text>评分进度</text>
						<text>{{table && table.completionRate ? table.completionRate : 0}}%</text>
					</view>
					<progress :percent="table && table.completionRate ? table.completionRate : 0" stroke-width="4" activeColor="#07c160" backgroundColor="#e6e6e6" />
				</view>
				<view class="table-subjects">
					<view class="subjects-header">
						<text class="subjects-title">考核对象</text>
						<text class="subjects-count">{{table && table.subjectCount ? table.subjectCount : 0}}个</text>
					</view>
					<view class="subjects-info">
						<view class="subject-item" v-for="(subject, sIndex) in table && table.subjects ? table.subjects : []" :key="sIndex" v-if="sIndex < 3">
							<text class="subject-name">{{subject && subject.name ? subject.name : '未命名对象'}}</text>
							<view class="subject-status" v-if="subject && subject.rated">
								<text class="subject-score">{{subject.totalScore !== undefined ? subject.totalScore : 0}}分</text>
								<text class="status-rated">已评分</text>
							</view>
							<view class="subject-status" v-else>
								<text class="status-pending">待评分</text>
							</view>
						</view>
						<view class="more-subjects" v-if="table && table.subjects && table.subjects.length > 3">
							<text>查看更多</text>
						</view>
					</view>
				</view>
				<view class="table-footer">
					<view class="footer-info">
						<text class="update-time">最近更新: {{formatDate(table && table.updateTime ? table.updateTime : null)}}</text>
					</view>
					<button class="action-btn" @click.stop="goToRating(table._id)">去评分</button>
				</view>
			</view>
		</view>
		
		<!-- 加载更多 -->
		<view class="load-more" v-if="tables && tables.length > 0 && hasMoreData">
			<button class="load-btn" size="mini" @click="loadMore" :loading="isLoading">加载更多</button>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				currentTypeIndex: 0,
				typeOptions: [
					{ type: '', name: '所有类型' },
					{ type: 1, name: '(办公室)一般干部评分' },
					{ type: 2, name: '(驻村)干部评分' },
					{ type: 3, name: '班子评分' }
				],
				stats: {
					total: 0,
					completed: 0,
					pending: 0
				},
				tables: [],
				page: 1,
				pageSize: 10,
				total: 0,
				hasMoreData: false,
				isLoading: false,
				username: ''
			}
		},
		onShow() {
			// 每次页面显示时重新加载数据
			this.reloadData();
		},
		onLoad() {
			// 检查并确保有用户名
			this.username = this.ensureUsername();
			console.log('当前用户名:', this.username);
			
			// 初始化默认数据，防止空值引用
			this.initDefaultData();
			
			// 初始加载
			this.reloadData();
		},
		onPullDownRefresh() {
			// 下拉刷新
			this.reloadData(() => {
				uni.stopPullDownRefresh();
			});
		},
		methods: {
			// 初始化默认数据
			initDefaultData() {
				// 确保typeOptions有默认值
				if (!this.typeOptions || !this.typeOptions.length) {
					this.typeOptions = [{ type: '', name: '全部类型' }];
				}
				
				// 确保stats有默认值
				if (!this.stats) {
					this.stats = { total: 0, completed: 0, pending: 0 };
				}
				
				// 确保tables数组已初始化
				if (!this.tables) {
					this.tables = [];
				}
			},
			
			// 确保有用户名
			ensureUsername() {
				let username = uni.getStorageSync('username');
				if (!username) {
					// 尝试从用户信息中获取
					const userInfoStr = uni.getStorageSync('userInfo');
					if (userInfoStr) {
						try {
							const userInfo = JSON.parse(userInfoStr);
							if (userInfo && userInfo.username) {
								username = userInfo.username;
								uni.setStorageSync('username', username);
								console.log('从userInfo中获取并保存用户名:', username);
							}
						} catch (e) {
							console.error('解析userInfo失败:', e);
						}
					}
				}
				
				// 如果仍然无法获取用户名，可以考虑跳转到登录页面
				if (!username) {
					console.warn('无法获取用户名，可能需要重新登录');
					// 跳转到登录页或其他处理...
				}
				
				return username || '';
			},
			
			// 重新加载数据
			reloadData(callback) {
				this.page = 1;
				this.loadStats();
				this.loadTables(() => {
					if (typeof callback === 'function') {
						callback();
					}
				});
			},
			
			// 加载评分统计数据
			loadStats() {
				// 确保有用户名
				this.username = this.ensureUsername();
				
				// 如果没有获取到用户名，可以直接返回
				if (!this.username) {
					console.warn('无法获取用户名，跳过加载评分统计');
					return;
				}
				
				uniCloud.callFunction({
					name: 'rating',
					data: {
						action: 'getRaterStats',
						data: {
							rater: this.username || ''
						}
					}
				}).then(res => {
					if (res.result.code === 0) {
						this.stats = res.result.data || { total: 0, completed: 0, pending: 0 };
					} else {
						console.error('获取评分统计失败:', res.result.msg);
						// 确保stats有默认值
						this.stats = { total: 0, completed: 0, pending: 0 };
					}
				}).catch(err => {
					console.error('调用getRaterStats失败:', err);
					// 确保stats有默认值
					this.stats = { total: 0, completed: 0, pending: 0 };
				});
			},
			
			// 加载评分表列表
			loadTables(callback) {
				this.isLoading = true;
				
				const type = this.typeOptions[this.currentTypeIndex].type;
				// 确保有用户名
				this.username = this.ensureUsername();
				
				// 如果没有获取到用户名，可以直接返回
				if (!this.username) {
					this.isLoading = false;
					console.warn('无法获取用户名，跳过加载评分表');
					if (typeof callback === 'function') {
						callback();
					}
					return;
				}
				
				uni.showLoading({
					title: '加载中...'
				});
				
				uniCloud.callFunction({
					name: 'ratingTable',
					data: {
						action: 'getRaterTables',
						data: {
							type: type,
							page: this.page,
							pageSize: this.pageSize,
							rater: this.username || ''
						}
					}
				}).then(res => {
					uni.hideLoading();
					this.isLoading = false;
					
					if (res.result.code === 0) {
						const data = res.result.data || { list: [], total: 0 };
						
						if (this.page === 1) {
							this.tables = data.list || [];
						} else {
							this.tables = (this.tables || []).concat(data.list || []);
						}
						
						this.total = data.total || 0;
						this.hasMoreData = (this.tables && this.tables.length) < this.total;
					} else {
						console.error('获取评分表列表失败:', res.result.msg);
						uni.showToast({
							title: res.result.msg || '加载失败',
							icon: 'none'
						});
					}
					
					if (typeof callback === 'function') {
						callback();
					}
				}).catch(err => {
					uni.hideLoading();
					this.isLoading = false;
					console.error('调用getRaterTables失败:', err);
					uni.showToast({
						title: '加载失败，请检查网络',
						icon: 'none'
					});
					
					if (typeof callback === 'function') {
						callback();
					}
				});
			},
			
			// 处理类型筛选变化
			handleTypeChange(e) {
				this.currentTypeIndex = e.detail.value;
				this.reloadData();
			},
			
			// 获取评分表类型名称
			getTableTypeName(type) {
				const typeMap = {
					1: '(办公室)一般干部评分',
					2: '(驻村)干部评分',
					3: '班子评分'
				};
				return typeMap[type] || '未知类型';
			},
			
			// 获取状态文本
			getStatusText(completionRate) {
				if (completionRate === 100) {
					return '已完成';
				} else if (completionRate > 0) {
					return '进行中';
				} else {
					return '待评分';
				}
			},
			
			// 格式化日期
			formatDate(timestamp) {
				if (!timestamp) return '暂无更新';
				
				try {
					const date = new Date(timestamp);
					if (isNaN(date.getTime())) return '暂无更新';
					
					const year = date.getFullYear();
					const month = String(date.getMonth() + 1).padStart(2, '0');
					const day = String(date.getDate()).padStart(2, '0');
					
					return `${year}-${month}-${day}`;
				} catch (e) {
					console.error('日期格式化错误:', e);
					return '暂无更新';
				}
			},
			
			// 跳转到评分页面
			goToRating(tableId) {
				if (!tableId) {
					uni.showToast({
						title: '评分表ID不存在',
						icon: 'none'
					});
					return;
				}
				
				uni.navigateTo({
					url: `/pages/rater/rating/rating?table_id=${tableId}`
				});
			},
			
			// 加载更多
			loadMore() {
				if (this.isLoading || !this.hasMoreData) return;
				
				this.page++;
				this.loadTables();
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
	
	/* 状态卡片样式 */
	.status-card {
		display: flex;
		justify-content: space-between;
		background-color: #fff;
		border-radius: 16rpx;
		padding: 30rpx;
		margin-bottom: 30rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
	}
	
	.status-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
	
	.status-number {
		font-size: 40rpx;
		font-weight: bold;
		color: #07c160;
		margin-bottom: 10rpx;
	}
	
	.status-label {
		font-size: 24rpx;
		color: #666;
	}
	
	.status-divider {
		width: 2rpx;
		background-color: #eee;
		margin: 0 10rpx;
	}
	
	.section-title {
		font-size: 34rpx;
		font-weight: bold;
		margin: 40rpx 0 20rpx;
		position: relative;
		padding-left: 20rpx;
	}
	
	.section-title::before {
		content: '';
		position: absolute;
		left: 0;
		top: 6rpx;
		width: 8rpx;
		height: 30rpx;
		background-color: #07c160;
		border-radius: 4rpx;
	}
	
	/* 评分表卡片样式 */
	.table-card {
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
		font-size: 32rpx;
		font-weight: bold;
		max-width: 70%;
	}
	
	.table-status {
		font-size: 24rpx;
		padding: 4rpx 16rpx;
		border-radius: 20rpx;
	}
	
	.status-completed {
		background-color: #e6f7ed;
		color: #07c160;
	}
	
	.status-progress {
		background-color: #e6f3fc;
		color: #1989fa;
	}
	
	.status-pending {
		background-color: #f5f5f5;
		color: #999;
	}
	
	.table-info {
		display: flex;
		margin-bottom: 20rpx;
	}
	
	.table-type {
		font-size: 24rpx;
		color: #666;
		background-color: #f5f5f5;
		padding: 4rpx 16rpx;
		border-radius: 6rpx;
		margin-right: 16rpx;
	}
	
	.table-category {
		font-size: 24rpx;
		color: #666;
	}
	
	.table-progress {
		margin-bottom: 20rpx;
	}
	
	.progress-label {
		display: flex;
		justify-content: space-between;
		margin-bottom: 10rpx;
		font-size: 26rpx;
		color: #666;
	}
	
	.table-subjects {
		padding: 20rpx;
		background-color: #f8f8f8;
		border-radius: 8rpx;
		margin-bottom: 20rpx;
	}
	
	.subjects-header {
		display: flex;
		justify-content: space-between;
		margin-bottom: 16rpx;
	}
	
	.subjects-title {
		font-size: 28rpx;
		font-weight: bold;
		color: #333;
	}
	
	.subjects-count {
		font-size: 24rpx;
		color: #666;
	}
	
	.subject-item {
		display: flex;
		justify-content: space-between;
		padding: 12rpx 0;
		border-bottom: 1rpx solid #eee;
	}
	
	.subject-item:last-child {
		border-bottom: none;
	}
	
	.subject-name {
		font-size: 26rpx;
		color: #333;
		max-width: 70%;
	}
	
	.subject-status {
		display: flex;
		align-items: center;
	}
	
	.subject-score {
		font-size: 26rpx;
		color: #07c160;
		margin-right: 10rpx;
	}
	
	.status-rated {
		font-size: 22rpx;
		color: #07c160;
		background-color: #e6f7ed;
		padding: 2rpx 10rpx;
		border-radius: 4rpx;
	}
	
	.status-pending {
		font-size: 22rpx;
		color: #ff9900;
		background-color: #fff9eb;
		padding: 2rpx 10rpx;
		border-radius: 4rpx;
	}
	
	.more-subjects {
		text-align: center;
		padding: 12rpx 0;
		font-size: 24rpx;
		color: #1989fa;
	}
	
	.table-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 20rpx;
		padding-top: 20rpx;
		border-top: 1rpx solid #f5f5f5;
	}
	
	.footer-info {
		flex: 1;
	}
	
	.update-time {
		font-size: 24rpx;
		color: #999;
	}
	
	.action-btn {
		font-size: 24rpx;
		padding: 4rpx 20rpx;
		background-color: #07c160;
		color: #fff;
		border-radius: 30rpx;
		margin-left: 20rpx;
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
	
	.load-more {
		text-align: center;
		margin: 30rpx 0;
	}
	
	.load-btn {
		font-size: 28rpx;
		color: #666;
		background-color: #f8f8f8;
	}
</style> 