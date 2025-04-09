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
				<view class="action-grid">
					<view class="action-item" @click="navigateTo('/pages/admin/tables/tables')">
						<view class="action-icon-box icon-table"></view>
						<text class="action-text">评分表管理</text>
					</view>
					<view class="action-item" @click="navigateTo('/pages/admin/subjects/subjects')">
						<view class="action-icon-box icon-subject"></view>
						<text class="action-text">考核对象管理</text>
					</view>
					<view class="action-item" @click="navigateTo('/pages/admin/users/users')">
						<view class="action-icon-box icon-user"></view>
						<text class="action-text">用户管理</text>
					</view>
					<view class="action-item" @click="navigateTo('/pages/admin/stats/stats')">
						<view class="action-icon-box icon-stats"></view>
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
				isLoggedIn: false,
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
					'user': '普通用户',
					3: '管理员',
					2: '评分员',
					1: '普通用户'
				};
				return roleMap[this.userInfo.role] || '未知角色';
			}
		},
		onShow() {
			console.log('===== 首页显示 - 开始检查用户身份 =====');
			const token = uni.getStorageSync('token');
			const userInfoStr = uni.getStorageSync('userInfo');
			
			console.log('检查登录: token存在?', !!token);
			console.log('检查登录: userInfo存在?', !!userInfoStr);
			
			if (token && userInfoStr) {
				try {
					const userInfo = JSON.parse(userInfoStr);
					this.isLoggedIn = true;
					this.userInfo = userInfo;
					console.log('用户已登录，身份信息:', userInfo);
					console.log('用户角色:', userInfo.role, '类型:', typeof userInfo.role);
					
					this.checkRoleAndLogin();
					this.loadData();
					
					// 如果是评分员角色，添加欢迎日志
					if (userInfo.role === 'rater' || userInfo.role === 2) {
						console.log(`欢迎您，${userInfo.name || userInfo.username} 评分员`);
					}
				} catch (e) {
					console.error('解析用户信息出错:', e);
					this.resetUserState();
				}
			} else {
				console.log('用户未登录或登录信息不完整，进入游客模式');
				this.resetUserState();
			}
		},
		methods: {
			checkRoleAndLogin() {
				console.log('检查用户角色:', this.userInfo.role, typeof this.userInfo.role);
				
				const isAdmin = this.userInfo.role === 'admin' || this.userInfo.role === 3;
				const isRater = this.userInfo.role === 'rater' || this.userInfo.role === 2;
				const isUser = this.userInfo.role === 'user' || this.userInfo.role === 1;
				
				if (isAdmin) {
					console.log('当前用户是管理员');
					this.isAdmin = true;
					this.isRater = false;
				} else if (isRater) {
					console.log('当前用户是评分员');
					this.isAdmin = false;
					this.isRater = true;
				} else {
					console.log('当前用户是普通用户');
					this.isAdmin = false;
					this.isRater = false;
				}
			},
			
			navigateTo(url) {
				if (!this.isLoggedIn) {
					uni.navigateTo({
						url: '/pages/login/login'
					});
					return false;
				}
				uni.navigateTo({ url });
			},
			
			goToRating(tableId) {
				if (!this.isLoggedIn) {
					uni.navigateTo({
						url: '/pages/login/login'
					});
					return false;
				}
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
			loadAdminStats() {
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
			loadRaterData() {
				// 先重置统计数据，防止数据重复累加
				this.raterStats = {
					tableCount: 0,
					ratedCount: 0,
					pendingCount: 0
				};
				
				// 使用云函数获取评分员的评分表数量
				uniCloud.callFunction({
					name: 'ratingTable',
					data: {
						action: 'getRaterTables',
						data: {
							rater: this.userInfo.username
						}
					}
				}).then(res => {
					if (res.result.code === 0) {
						const tables = res.result.data.list || [];
						this.raterStats.tableCount = tables.length;
						
						// 只取前5个评分表显示在首页
						this.tables = tables.slice(0, 5);
						
						// 处理每个表格的评分进度
						this.tables.forEach((table, index) => {
							// 设置默认进度
							this.$set(this.tables[index], 'completion', table.completionRate || 0);
						});
						
						// 使用专门的云函数获取评分统计数据
						uniCloud.callFunction({
							name: 'rating',
							data: {
								action: 'getRaterStats',
								data: {
									rater: this.userInfo.username
								}
							}
						}).then(statsRes => {
							console.log('获取评分员统计数据:', statsRes);
							if (statsRes.result.code === 0) {
								const statsData = statsRes.result.data;
								this.raterStats.ratedCount = statsData.completed || 0;
								this.raterStats.pendingCount = statsData.pending || 0;
								
								// 添加欢迎信息和任务统计日志
								console.log(`欢迎您，${this.userInfo.name || this.userInfo.username} ${this.roleText}| 我的评分任务 ${this.raterStats.tableCount} 评分表数量 ${this.raterStats.ratedCount} 已评分数量 ${this.raterStats.pendingCount} 待评分数量`);
							}
						}).catch(err => {
							console.error('获取评分统计数据失败:', err);
						});
					}
				}).catch(err => {
					console.error('获取评分表数据失败:', err);
				});
			},
			resetUserState() {
				this.isLoggedIn = false;
				this.userInfo = {
					name: '游客',
					role: 'user'
				};
			},
			loadData() {
				if (this.isAdmin) {
					this.loadAdminStats();
				} else if (this.isRater) {
					this.loadRaterData();
				}
			}
		}
	}
</script>

<style>
	/* 基础变量定义 */
	page {
		--primary-color: #07c160;
		--secondary-color: #1989fa;
		--danger-color: #e64340;
		--warning-color: #ff9900;
		--info-color: #909399;
		--text-dark: #333;
		--text-normal: #666;
		--text-light: #999;
		--bg-light: #f8f8f8;
		--bg-white: #fff;
		--border-color: #eee;
		--border-light: #f5f5f5;
		--shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
		--radius: 16rpx;
		--padding-lg: 30rpx;
		--padding-md: 20rpx;
		--padding-sm: 10rpx;
		--margin-lg: 40rpx;
		--margin-md: 20rpx;
		--margin-sm: 10rpx;
		--font-lg: 36rpx;
		--font-md: 30rpx;
		--font-sm: 26rpx;
		--font-xs: 24rpx;
	}
	
	.container {
		padding: var(--padding-lg);
		background-color: var(--bg-light);
		min-height: 100vh;
		box-sizing: border-box;
		width: 100%;
	}
	
	/* 头部区域 */
	.header {
		margin-bottom: var(--margin-lg);
		width: 100%;
	}
	
	.welcome {
		display: flex;
		align-items: center;
	}
	
	.welcome-text {
		font-size: var(--font-lg);
		font-weight: bold;
		margin-right: var(--margin-md);
	}
	
	.role-tag {
		font-size: var(--font-xs);
		padding: 4rpx 16rpx;
		border-radius: 20rpx;
		color: var(--bg-white);
	}
	
	.role-admin { background-color: var(--danger-color); }
	.role-rater { background-color: var(--primary-color); }
	.role-user { background-color: var(--secondary-color); }
	
	/* 面板通用样式 */
	.admin-panel, .rater-panel, .user-panel {
		width: 100%;
	}
	
	.panel-header {
		margin-bottom: var(--margin-md);
		width: 100%;
	}
	
	.panel-title {
		font-size: var(--font-md);
		font-weight: bold;
		position: relative;
		padding-left: var(--padding-md);
	}
	
	.panel-title::before {
		content: '';
		position: absolute;
		left: 0;
		top: 6rpx;
		width: 8rpx;
		height: 32rpx;
		background-color: var(--primary-color);
		border-radius: 4rpx;
	}
	
	/* 卡片基础样式 */
	.card-base {
		background-color: var(--bg-white);
		border-radius: var(--radius);
		padding: var(--padding-lg);
		box-shadow: var(--shadow);
		margin-bottom: var(--margin-md);
		width: 100%;
		box-sizing: border-box;
	}
	
	/* 统计卡片样式 */
	.stat-cards {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		margin-bottom: var(--margin-lg);
		width: 100%;
	}
	
	.stat-card {
		width: 48%;
		background-color: var(--bg-white);
		border-radius: var(--radius);
		padding: var(--padding-lg);
		box-sizing: border-box;
		margin-bottom: var(--margin-md);
		box-shadow: var(--shadow);
		transition: transform 0.3s ease;
	}
	
	.stat-card:active {
		transform: scale(0.98);
	}
	
	.stat-num {
		font-size: 42rpx;
		font-weight: bold;
		color: var(--text-dark);
		display: block;
		margin-bottom: var(--margin-sm);
	}
	
	.stat-label {
		font-size: var(--font-sm);
		color: var(--text-light);
	}
	
	/* 快捷操作样式 */
	.quick-actions {
		margin-top: var(--margin-lg);
		width: 100%;
		background-color: var(--bg-white);
		border-radius: var(--radius);
		padding: var(--padding-lg);
		box-shadow: var(--shadow);
		box-sizing: border-box;
	}
	
	.action-title {
		font-size: var(--font-md);
		font-weight: bold;
		margin-bottom: var(--margin-lg);
		padding-bottom: var(--padding-md);
		border-bottom: 1rpx solid var(--border-light);
	}
	
	.action-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--margin-md);
		width: 100%;
	}
	
	.action-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		transition: transform 0.3s ease;
		box-sizing: border-box;
		padding: 10rpx;
		text-align: center;
	}
	
	@media screen and (max-width: 500px) {
		.stat-card {
			width: 100%;
		}
		
		.action-grid {
			grid-template-columns: repeat(2, 1fr);
		}
		
		.action-item {
			padding: 0 var(--padding-md);
			margin-bottom: var(--margin-lg);
		}
	}
	
	.action-item:active {
		transform: scale(0.95);
	}
	
	.action-icon-box {
		width: 100rpx;
		height: 100rpx;
		margin-bottom: var(--margin-md);
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		color: var(--bg-white);
		font-size: 46rpx;
		position: relative;
		box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
	}
	
	/* 使用伪元素为图标盒子创建内容 */
	.action-icon-box::before {
		font-weight: bold;
		position: relative;
		z-index: 2;
	}
	
	.action-icon-box::after {
		content: '';
		position: absolute;
		width: 85%;
		height: 85%;
		border-radius: 50%;
		background-color: rgba(255, 255, 255, 0.2);
		z-index: 1;
	}
	
	.icon-table {
		background-color: var(--primary-color);
	}
	
	.icon-table::before {
		content: "表";
	}
	
	.icon-subject {
		background-color: var(--secondary-color);
	}
	
	.icon-subject::before {
		content: "人";
	}
	
	.icon-user {
		background-color: var(--warning-color);
	}
	
	.icon-user::before {
		content: "员";
	}
	
	.icon-stats {
		background-color: var(--info-color);
	}
	
	.icon-stats::before {
		content: "统";
	}
	
	.action-text {
		font-size: var(--font-sm);
		color: var(--text-dark);
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		width: 100%;
	}
	
	/* 评分员界面样式 */
	.rater-stats {
		display: flex;
		justify-content: space-between;
		margin-bottom: var(--margin-lg);
		width: 100%;
	}
	
	.rater-stats .stat-card {
		width: 32%;
	}
	
	@media screen and (max-width: 500px) {
		.rater-stats .stat-card {
			width: 100%;
		}
	}
	
	.table-list {
		background-color: var(--bg-white);
		border-radius: var(--radius);
		padding: var(--padding-lg);
		box-shadow: var(--shadow);
		width: 100%;
		box-sizing: border-box;
	}
	
	.list-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--margin-md);
		padding-bottom: var(--padding-md);
		border-bottom: 1rpx solid var(--border-color);
		width: 100%;
	}
	
	.list-title {
		font-size: var(--font-md);
		font-weight: bold;
	}
	
	.more-link {
		font-size: var(--font-xs);
		color: var(--primary-color);
	}
	
	.no-data {
		padding: 60rpx 0;
		text-align: center;
		width: 100%;
	}
	
	.no-data-text {
		font-size: var(--font-sm);
		color: var(--text-light);
	}
	
	.table-item {
		padding: var(--padding-md) 0;
		border-bottom: 1rpx solid var(--border-light);
		transition: background-color 0.3s ease;
		width: 100%;
	}
	
	.table-item:active {
		background-color: var(--bg-light);
	}
	
	.table-item:last-child {
		border-bottom: none;
	}
	
	.table-info {
		display: flex;
		justify-content: space-between;
		margin-bottom: var(--margin-sm);
		width: 100%;
	}
	
	.table-name {
		font-size: var(--font-md);
		font-weight: bold;
	}
	
	.table-type {
		font-size: var(--font-xs);
		color: var(--text-normal);
		background-color: var(--bg-light);
		padding: 2rpx 12rpx;
		border-radius: 6rpx;
	}
	
	.table-category {
		font-size: var(--font-xs);
		color: var(--text-light);
		margin-bottom: 16rpx;
		display: block;
	}
	
	.table-progress {
		margin-top: var(--margin-md);
		width: 100%;
	}
	
	.progress-text {
		font-size: var(--font-xs);
		color: var(--text-normal);
		margin-top: 6rpx;
		display: block;
	}
	
	/* 普通用户界面样式 */
	.user-info {
		background-color: var(--bg-white);
		border-radius: var(--radius);
		padding: var(--padding-lg);
		margin-bottom: var(--margin-lg);
		box-shadow: var(--shadow);
		width: 100%;
		box-sizing: border-box;
	}
	
	.info-item {
		display: flex;
		margin-bottom: var(--margin-md);
		padding-bottom: var(--padding-md);
		border-bottom: 1rpx solid var(--border-light);
		width: 100%;
	}
	
	.info-item:last-child {
		margin-bottom: 0;
		padding-bottom: 0;
		border-bottom: none;
	}
	
	.info-label {
		width: 160rpx;
		font-size: var(--font-sm);
		color: var(--text-normal);
	}
	
	.info-value {
		flex: 1;
		font-size: var(--font-sm);
		color: var(--text-dark);
	}
	
	.notice-box {
		background-color: var(--bg-white);
		border-radius: var(--radius);
		overflow: hidden;
		box-shadow: var(--shadow);
		width: 100%;
		box-sizing: border-box;
	}
	
	.notice-title {
		background-color: var(--bg-light);
		padding: var(--padding-md) var(--padding-lg);
		font-size: var(--font-md);
		font-weight: bold;
	}
	
	.notice-content {
		padding: var(--padding-lg);
	}
	
	.notice-text {
		font-size: var(--font-sm);
		color: var(--text-normal);
		line-height: 1.6;
	}
</style> 