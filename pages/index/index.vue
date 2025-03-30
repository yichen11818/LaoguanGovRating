<template>
	<view class="container">
		<!-- 头部区域 -->
		<view class="header">
			<view class="welcome">
				<text class="welcome-text">欢迎您，{{userInfo.name || '用户'}}</text>
				<text class="role-tag" :class="'role-'+userInfo.role">{{roleText}}</text>
			</view>
		</view>
		
		<!-- 管理员界面 -->
		<view class="admin-panel" v-if="userInfo.role === 'admin'">
			<view class="panel-header">
				<text class="panel-title">系统概览</text>
			</view>
			
			<view class="stat-cards">
				<view class="stat-card" @click="navigateTo('/pages/admin/tables/tables')">
					<text class="stat-num">{{stats.tableCount || 0}}</text>
					<text class="stat-label">评分表数量</text>
				</view>
				
				<view class="stat-card" @click="navigateTo('/pages/admin/subjects/subjects')">
					<text class="stat-num">{{stats.subjectCount || 0}}</text>
					<text class="stat-label">考核对象数量</text>
				</view>
				
				<view class="stat-card" @click="navigateTo('/pages/admin/users/users')">
					<text class="stat-num">{{stats.raterCount || 0}}</text>
					<text class="stat-label">评分员数量</text>
				</view>
				
				<view class="stat-card" @click="navigateTo('/pages/admin/stats/stats')">
					<text class="stat-num">{{stats.ratingCompletionRate || '0%'}}</text>
					<text class="stat-label">评分完成率</text>
				</view>
			</view>
			
			<view class="quick-actions">
				<view class="action-title">快捷操作</view>
				<view class="action-list">
					<view class="action-item" @click="navigateTo('/pages/admin/tables/tables')">
						<image class="action-icon" src="/static/images/table.png"></image>
						<text class="action-text">评分表管理</text>
					</view>
					<view class="action-item" @click="navigateTo('/pages/admin/subjects/subjects')">
						<image class="action-icon" src="/static/images/subject.png"></image>
						<text class="action-text">考核对象管理</text>
					</view>
					<view class="action-item" @click="navigateTo('/pages/admin/users/users')">
						<image class="action-icon" src="/static/images/user_manage.png"></image>
						<text class="action-text">用户管理</text>
					</view>
					<view class="action-item" @click="navigateTo('/pages/admin/stats/stats')">
						<image class="action-icon" src="/static/images/stats.png"></image>
						<text class="action-text">统计分析</text>
					</view>
				</view>
			</view>
		</view>
		
		<!-- 评分员界面 -->
		<view class="rater-panel" v-if="userInfo.role === 'rater'">
			<view class="panel-header">
				<text class="panel-title">我的评分任务</text>
			</view>
			
			<view class="rater-stats">
				<view class="stat-card" @click="navigateTo('/pages/rater/tables/tables')">
					<text class="stat-num">{{raterStats.tableCount || 0}}</text>
					<text class="stat-label">评分表数量</text>
				</view>
				
				<view class="stat-card" @click="navigateTo('/pages/rater/history/history')">
					<text class="stat-num">{{raterStats.ratedCount || 0}}</text>
					<text class="stat-label">已评分数量</text>
				</view>
				
				<view class="stat-card">
					<text class="stat-num">{{raterStats.pendingCount || 0}}</text>
					<text class="stat-label">待评分数量</text>
				</view>
			</view>
			
			<view class="table-list">
				<view class="list-header">
					<text class="list-title">我的评分表</text>
					<text class="more-link" @click="navigateTo('/pages/rater/tables/tables')">查看全部</text>
				</view>
				
				<view class="no-data" v-if="tables.length === 0">
					<text class="no-data-text">暂无分配的评分表</text>
				</view>
				
				<view class="table-item" v-for="(table, index) in tables" :key="index" @click="goToRating(table._id)">
					<view class="table-info">
						<text class="table-name">{{table.name}}</text>
						<text class="table-type">{{getTableTypeName(table.type)}}</text>
					</view>
					<text class="table-category">{{table.category || ''}}</text>
					<view class="table-progress">
						<progress :percent="table.completion || 0" stroke-width="3" />
						<text class="progress-text">评分进度: {{table.completion || 0}}%</text>
					</view>
				</view>
			</view>
		</view>
		
		<!-- 普通用户界面 -->
		<view class="user-panel" v-if="userInfo.role === 'user'">
			<view class="panel-header">
				<text class="panel-title">用户信息</text>
			</view>
			
			<view class="user-info">
				<view class="info-item">
					<text class="info-label">用户名</text>
					<text class="info-value">{{userInfo.username || ''}}</text>
				</view>
				<view class="info-item">
					<text class="info-label">姓名</text>
					<text class="info-value">{{userInfo.name || ''}}</text>
				</view>
				<view class="info-item">
					<text class="info-label">角色</text>
					<text class="info-value">{{roleText}}</text>
				</view>
			</view>
			
			<view class="notice-box">
				<view class="notice-title">
					<text>系统公告</text>
				</view>
				<view class="notice-content">
					<text class="notice-text">欢迎使用干部评分系统，您当前为普通用户，暂无评分权限。如需获取评分权限，请联系管理员。</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				userInfo: {},
				stats: {
					tableCount: 0,
					subjectCount: 0,
					raterCount: 0,
					ratingCompletionRate: '0%'
				},
				raterStats: {
					tableCount: 0,
					ratedCount: 0,
					pendingCount: 0
				},
				tables: []
			}
		},
		computed: {
			roleText() {
				const roleMap = {
					'admin': '管理员',
					'rater': '评分员',
					'user': '普通用户'
				};
				return roleMap[this.userInfo.role] || '未知角色';
			}
		},
		onShow() {
			// 检查登录状态
			const token = uni.getStorageSync('token');
			if (!token) {
				uni.redirectTo({
					url: '/pages/login/login'
				});
				return;
			}
			
			// 获取用户信息
			this.userInfo = uni.getStorageSync('userInfo') || {};
			
			// 根据角色加载不同数据
			if (this.userInfo.role === 'admin') {
				this.loadAdminStats();
			} else if (this.userInfo.role === 'rater') {
				this.loadRaterData();
			}
		},
		methods: {
			navigateTo(url) {
				uni.navigateTo({ url });
			},
			goToRating(tableId) {
				uni.navigateTo({
					url: `/pages/rater/rating/rating?tableId=${tableId}`
				});
			},
			getTableTypeName(type) {
				const typeMap = {
					1: '(办公室)一般干部评分',
					2: '(驻村)干部评分',
					3: '班子评分'
				};
				return typeMap[type] || '未知类型';
			},
			// 加载管理员统计数据
			loadAdminStats() {
				// 调用云函数获取统计数据
				uniCloud.callFunction({
					name: 'ratingTable',
					data: {
						action: 'getTables',
						data: {}
					}
				}).then(res => {
					if (res.result.code === 0) {
						this.stats.tableCount = res.result.data.total || 0;
					}
				});
				
				uniCloud.callFunction({
					name: 'subject',
					data: {
						action: 'getSubjects',
						data: {}
					}
				}).then(res => {
					if (res.result.code === 0) {
						this.stats.subjectCount = res.result.data.total || 0;
					}
				});
				
				uniCloud.callFunction({
					name: 'user',
					data: {
						action: 'getUsers',
						data: {
							role: 'rater'
						}
					}
				}).then(res => {
					if (res.result.code === 0) {
						this.stats.raterCount = res.result.data.total || 0;
					}
				});
				
				// 获取评分完成率
				uniCloud.callFunction({
					name: 'rating',
					data: {
						action: 'getRatingStats',
						data: {}
					}
				}).then(res => {
					if (res.result.code === 0 && res.result.data.length > 0) {
						let totalSubjects = 0;
						let totalRated = 0;
						
						res.result.data.forEach(item => {
							totalSubjects += item.totalSubjects;
							totalRated += item.ratedCount;
						});
						
						const rate = totalSubjects > 0 ? Math.round((totalRated / totalSubjects) * 100) : 0;
						this.stats.ratingCompletionRate = `${rate}%`;
					}
				});
			},
			// 加载评分员数据
			loadRaterData() {
				// 获取分配给当前用户的评分表
				uniCloud.callFunction({
					name: 'ratingTable',
					data: {
						action: 'getTables',
						data: {
							rater: this.userInfo.username
						}
					}
				}).then(res => {
					if (res.result.code === 0) {
						const tables = res.result.data.list || [];
						this.raterStats.tableCount = tables.length;
						
						// 只显示前5个
						this.tables = tables.slice(0, 5);
						
						// 获取每个表的评分完成情况
						this.tables.forEach((table, index) => {
							// 获取该表的考核对象
							uniCloud.callFunction({
								name: 'subject',
								data: {
									action: 'getSubjects',
									data: {
										table_id: table._id
									}
								}
							}).then(subjectRes => {
								const subjects = subjectRes.result.data.list || [];
								const totalSubjects = subjects.length;
								
								// 获取该表的评分记录
								uniCloud.callFunction({
									name: 'rating',
									data: {
										action: 'getRatings',
										data: {
											table_id: table._id,
											rater: this.userInfo.username
										}
									}
								}).then(ratingRes => {
									const ratings = ratingRes.result.data.list || [];
									const ratedCount = ratings.length;
									
									// 计算完成率
									const completion = totalSubjects > 0 ? Math.round((ratedCount / totalSubjects) * 100) : 0;
									this.$set(this.tables[index], 'completion', completion);
									
									// 统计已评分和待评分数量
									this.raterStats.ratedCount += ratedCount;
									this.raterStats.pendingCount += (totalSubjects - ratedCount);
								});
							});
						});
					}
				});
			}
		}
	}
</script>

<style>
	.container {
		padding: 30rpx;
	}
	
	.header {
		margin-bottom: 30rpx;
	}
	
	.welcome {
		display: flex;
		align-items: center;
	}
	
	.welcome-text {
		font-size: 36rpx;
		font-weight: bold;
		margin-right: 20rpx;
	}
	
	.role-tag {
		font-size: 24rpx;
		padding: 4rpx 16rpx;
		border-radius: 20rpx;
		color: #fff;
	}
	
	.role-admin {
		background-color: #e64340;
	}
	
	.role-rater {
		background-color: #07c160;
	}
	
	.role-user {
		background-color: #1989fa;
	}
	
	.panel-header {
		margin-bottom: 30rpx;
	}
	
	.panel-title {
		font-size: 32rpx;
		font-weight: bold;
		position: relative;
		padding-left: 20rpx;
	}
	
	.panel-title::before {
		content: '';
		position: absolute;
		left: 0;
		top: 6rpx;
		width: 8rpx;
		height: 32rpx;
		background-color: #07c160;
		border-radius: 4rpx;
	}
	
	/* 统计卡片样式 */
	.stat-cards {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		margin-bottom: 40rpx;
	}
	
	.stat-card {
		width: 48%;
		background-color: #f8f8f8;
		border-radius: 16rpx;
		padding: 30rpx;
		box-sizing: border-box;
		margin-bottom: 20rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
	}
	
	.stat-num {
		font-size: 42rpx;
		font-weight: bold;
		color: #333;
		display: block;
		margin-bottom: 10rpx;
	}
	
	.stat-label {
		font-size: 26rpx;
		color: #999;
	}
	
	/* 快捷操作样式 */
	.quick-actions {
		margin-top: 40rpx;
	}
	
	.action-title {
		font-size: 30rpx;
		font-weight: bold;
		margin-bottom: 20rpx;
	}
	
	.action-list {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
	}
	
	.action-item {
		width: 23%;
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 30rpx;
	}
	
	.action-icon {
		width: 80rpx;
		height: 80rpx;
		margin-bottom: 10rpx;
	}
	
	.action-text {
		font-size: 26rpx;
		color: #333;
		text-align: center;
	}
	
	/* 评分员界面样式 */
	.rater-stats {
		display: flex;
		justify-content: space-between;
		margin-bottom: 40rpx;
	}
	
	.rater-stats .stat-card {
		width: 32%;
	}
	
	.table-list {
		background-color: #fff;
		border-radius: 16rpx;
		padding: 30rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
	}
	
	.list-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20rpx;
		padding-bottom: 20rpx;
		border-bottom: 1rpx solid #eee;
	}
	
	.list-title {
		font-size: 30rpx;
		font-weight: bold;
	}
	
	.more-link {
		font-size: 26rpx;
		color: #07c160;
	}
	
	.no-data {
		padding: 60rpx 0;
		text-align: center;
	}
	
	.no-data-text {
		font-size: 28rpx;
		color: #999;
	}
	
	.table-item {
		padding: 20rpx 0;
		border-bottom: 1rpx solid #f5f5f5;
	}
	
	.table-info {
		display: flex;
		justify-content: space-between;
		margin-bottom: 10rpx;
	}
	
	.table-name {
		font-size: 30rpx;
		font-weight: bold;
	}
	
	.table-type {
		font-size: 24rpx;
		color: #666;
		background-color: #f5f5f5;
		padding: 2rpx 12rpx;
		border-radius: 6rpx;
	}
	
	.table-category {
		font-size: 26rpx;
		color: #999;
		margin-bottom: 16rpx;
		display: block;
	}
	
	.table-progress {
		margin-top: 20rpx;
	}
	
	.progress-text {
		font-size: 24rpx;
		color: #666;
		margin-top: 6rpx;
		display: block;
	}
	
	/* 普通用户界面样式 */
	.user-info {
		background-color: #fff;
		border-radius: 16rpx;
		padding: 30rpx;
		margin-bottom: 40rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
	}
	
	.info-item {
		display: flex;
		margin-bottom: 20rpx;
		padding-bottom: 20rpx;
		border-bottom: 1rpx solid #f5f5f5;
	}
	
	.info-item:last-child {
		margin-bottom: 0;
		padding-bottom: 0;
		border-bottom: none;
	}
	
	.info-label {
		width: 160rpx;
		font-size: 28rpx;
		color: #666;
	}
	
	.info-value {
		flex: 1;
		font-size: 28rpx;
		color: #333;
	}
	
	.notice-box {
		background-color: #fff;
		border-radius: 16rpx;
		overflow: hidden;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
	}
	
	.notice-title {
		background-color: #f8f8f8;
		padding: 20rpx 30rpx;
		font-size: 30rpx;
		font-weight: bold;
	}
	
	.notice-content {
		padding: 30rpx;
	}
	
	.notice-text {
		font-size: 28rpx;
		color: #666;
		line-height: 1.6;
	}
</style> 