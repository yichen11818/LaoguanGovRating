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
				<image class="no-data-icon" src="@/static/images/no-data.png" mode="aspectFit"></image>
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
						<view class="subject-item" v-for="(subject, subjectIndex) in table && table.subjects ? table.subjects : []" :key="subjectIndex" v-if="subjectIndex < 3">
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
				username: '',
				hasTriggeredLogin: false
			}
		},
		onShow() {
			console.log('======== 页面显示(onShow)事件触发 ========');
			// 检查token和用户名状态
			const token = uni.getStorageSync('uni_id_token');
			const username = uni.getStorageSync('username');
			console.log('页面显示时 token状态:', token ? '存在' : '不存在', '用户名状态:', username ? `存在(${username})` : '不存在');
			
			// 设置一个标志，防止onLoad中的登录检查和onShow中的产生冲突
			this.hasTriggeredLogin = this.hasTriggeredLogin || false;
			
			// 如果已经触发了登录跳转，则不执行后续代码
			if (this.hasTriggeredLogin) {
				console.log('已触发登录跳转，跳过onShow中的数据加载');
				return;
			}
			
			// 每次页面显示时重新加载数据
			console.log('开始重新加载数据...');
			this.reloadData();
			console.log('======== 页面显示处理完成 ========');
		},
		onLoad() {
			console.log('======== 页面加载开始 ========');
			// 检查用户登录状态
			const token = uni.getStorageSync('uni_id_token');
			console.log('当前token状态:', token ? '已获取token' : '没有token', '长度:', token ? token.length : 0);
			
			// 获取用户名，不立即判断跳转
			this.username = this.ensureUsername();
			console.log('获取用户名结果:', this.username ? `成功(${this.username})` : '失败');
			
			// 允许用户名存在但没有token的情况
			// 如果用户名和token都不存在，才跳转到登录页
			if (!token && !this.username) {
				console.warn('【跳转原因】用户未登录，无token且无用户名，准备跳转到登录页面');
				this.hasTriggeredLogin = true; // 设置标志
				uni.showToast({
					title: '请先登录',
					icon: 'none',
					duration: 2000
				});
				
				// 延迟跳转，让用户看到提示
				setTimeout(() => {
					console.log('执行跳转到登录页...');
					uni.navigateTo({
						url: '/pages/login/login',
						success: () => {
							console.log('跳转到登录页成功');
						},
						fail: (err) => {
							console.error('跳转到登录页失败:', err);
						}
					});
				}, 1500);
				return;
			}
			
			// 初始化默认数据，防止空值引用
			this.initDefaultData();
			console.log('初始化默认数据完成');
			
			// 初始加载
			console.log('开始加载数据...');
			this.reloadData();
			console.log('======== 页面加载完成 ========');
		},
		onPullDownRefresh() {
			console.log('======== 下拉刷新(onPullDownRefresh)事件触发 ========');
			// 下拉刷新
			this.reloadData(() => {
				console.log('下拉刷新数据加载完成，停止下拉刷新动画');
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
				console.log('==== ensureUsername开始执行 ====');
				// 首先从本地存储中获取用户名
				let username = uni.getStorageSync('username');
				console.log('从本地存储获取用户名:', username ? `成功(${username})` : '失败');
				
				// 如果没有用户名，尝试从用户信息中获取
				if (!username) {
					console.log('本地存储中没有用户名，尝试从userInfo获取');
					const userInfoStr = uni.getStorageSync('userInfo');
					console.log('userInfo存储状态:', userInfoStr ? '存在' : '不存在', '内容:', userInfoStr);
					
					if (userInfoStr) {
						try {
							const userInfo = JSON.parse(userInfoStr);
							console.log('解析userInfo结果:', userInfo ? '成功' : '失败', '内容:', JSON.stringify(userInfo));
							
							if (userInfo && userInfo.username) {
								username = userInfo.username;
								// 保存用户名到本地存储
								uni.setStorageSync('username', username);
								console.log('从userInfo中获取并保存用户名:', username);
							} else {
								console.warn('userInfo中没有username字段');
							}
						} catch (e) {
							console.error('解析userInfo失败:', e);
						}
					} else {
						console.warn('没有找到userInfo');
					}
				}
				
				// 如果仍然没有用户名，尝试从token中获取
				if (!username) {
					console.log('尝试从token中获取用户信息');
					const token = uni.getStorageSync('uni_id_token');
					console.log('token状态:', token ? '存在' : '不存在', '长度:', token ? token.length : 0);
					
					if (token) {
						try {
							// 在实际应用中，这里可能需要调用一个云函数来解析token
							// 这里简化处理，只检查token是否存在
							console.log('发现token，将尝试在云函数中解析');
							
							// 调用云函数获取当前用户信息
							try {
								console.log('尝试通过云函数获取用户信息');
								// 注意：这是同步调用，实际上应该是异步调用并等待结果
								// 为了调试，我们这里只记录日志而不实际调用
							} catch (e) {
								console.error('调用云函数获取用户信息失败:', e);
							}
						} catch (e) {
							console.error('解析token失败:', e);
						}
					} else {
						console.warn('没有找到token');
					}
				}
				
				// 记录获取到的用户名
				if (username) {
					console.log('成功获取用户名:', username);
				} else {
					console.warn('无法获取用户名，可能需要重新登录');
				}
				
				console.log('==== ensureUsername执行完成 ====');
				return username || '';
			},
			
			// 重新加载数据
			reloadData(callback) {
				console.log('==== reloadData开始执行 ====');
				this.page = 1;
				console.log('开始加载评分统计...');
				this.loadStats();
				console.log('开始加载评分表列表...');
				this.loadTables(() => {
					console.log('loadTables回调执行');
					if (typeof callback === 'function') {
						callback();
					}
				});
				console.log('==== reloadData执行完成 ====');
			},
			
			// 加载评分统计数据
			loadStats() {
				console.log('==== loadStats开始执行 ====');
				// 确保有用户名
				const prevUsername = this.username;
				this.username = this.ensureUsername();
				
				if (prevUsername !== this.username) {
					console.log('用户名已更新:', prevUsername, '->', this.username);
				}
				
				// 如果没有获取到用户名，可以直接返回
				if (!this.username) {
					console.warn('无法获取用户名，跳过加载评分统计');
					return;
				}
				
				uni.showLoading({
					title: '加载中...'
				});
				
				// 获取当前登录用户的token
				const token = uni.getStorageSync('uni_id_token') || '';
				console.log('准备调用getRaterStats，token长度:', token.length);
				
				console.log('调用云函数rating.getRaterStats，参数:', {
					username: this.username,
					rater: this.username,
					uniIdToken: token.substr(0, 10) + '...'
				});
				
				uniCloud.callFunction({
					name: 'rating',
					data: {
						action: 'getRaterStats',
						data: {
							username: this.username,
							rater: this.username,
							uniIdToken: token
						}
					}
				}).then(res => {
					uni.hideLoading();
					console.log('getRaterStats响应:', JSON.stringify(res));
					
					if (res.result && res.result.code === 0) {
						this.stats = res.result.data || { total: 0, completed: 0, pending: 0 };
						console.log('获取评分统计成功:', JSON.stringify(this.stats));
					} else {
						console.error('获取评分统计失败:', res.result ? res.result.msg : '未知错误');
						// 确保stats有默认值
						this.stats = { total: 0, completed: 0, pending: 0 };
						
						// 检查是否是因为登录问题
						if (res.result && res.result.msg && res.result.msg.includes('登录')) {
							console.warn('检测到登录相关错误，但不立即跳转');
							// 在这里不跳转，让onLoad或onShow中的逻辑处理
						} else {
							uni.showToast({
								title: res.result && res.result.msg ? res.result.msg : '获取评分统计失败',
								icon: 'none'
							});
						}
					}
				}).catch(err => {
					uni.hideLoading();
					console.error('调用getRaterStats失败:', err);
					// 确保stats有默认值
					this.stats = { total: 0, completed: 0, pending: 0 };
					uni.showToast({
						title: '获取评分统计失败，请检查网络',
						icon: 'none'
					});
				}).finally(() => {
					console.log('==== loadStats执行完成 ====');
				});
			},
			
			// 加载评分表列表
			loadTables(callback) {
				console.log('==== loadTables开始执行 ====');
				this.isLoading = true;
				
				const type = this.typeOptions[this.currentTypeIndex].type;
				console.log('当前选择的类型索引:', this.currentTypeIndex, '类型值:', type);
				
				// 确保有用户名
				const prevUsername = this.username;
				this.username = this.ensureUsername();
				
				if (prevUsername !== this.username) {
					console.log('用户名已更新:', prevUsername, '->', this.username);
				}
				
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
				
				// 获取当前登录用户的token
				const token = uni.getStorageSync('uni_id_token') || '';
				console.log('准备调用getRaterTables，token长度:', token.length);
				
				// 记录请求参数
				console.log('调用云函数ratingTable.getRaterTables，参数:', {
					type,
					page: this.page,
					pageSize: this.pageSize,
					username: this.username,
					rater: this.username,
					uniIdToken: token.substr(0, 10) + '...'
				});
				
				uniCloud.callFunction({
					name: 'ratingTable',
					data: {
						action: 'getRaterTables',
						data: {
							type: type,
							page: this.page,
							pageSize: this.pageSize,
							username: this.username,
							rater: this.username,
							uniIdToken: token
						}
					}
				}).then(res => {
					uni.hideLoading();
					this.isLoading = false;
					console.log('getRaterTables响应:', JSON.stringify(res));
					
					if (res.result && res.result.code === 0) {
						const data = res.result.data || { list: [], total: 0 };
						console.log('获取评分表列表成功, 总数:', data.total, '当前页数据量:', data.list ? data.list.length : 0);
						
						if (this.page === 1) {
							this.tables = data.list || [];
						} else {
							this.tables = (this.tables || []).concat(data.list || []);
						}
						
						this.total = data.total || 0;
						this.hasMoreData = (this.tables && this.tables.length) < this.total;
						console.log('当前表格数据总量:', this.tables.length, '是否有更多数据:', this.hasMoreData);
					} else {
						console.error('获取评分表列表失败:', res.result ? res.result.msg : '未知错误', '详细信息:', JSON.stringify(res));
						
						// 检查是否是因为登录问题
						if (res.result && res.result.msg && res.result.msg.includes('登录')) {
							console.warn('检测到登录相关错误，但不立即跳转');
							// 不立即跳转，由onLoad或onShow统一处理
						} else {
							uni.showToast({
								title: res.result && res.result.msg ? res.result.msg : '加载失败',
								icon: 'none'
							});
						}
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
				}).finally(() => {
					console.log('==== loadTables执行完成 ====');
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
				console.log('==== loadMore开始执行 ====');
				if (this.isLoading || !this.hasMoreData) {
					console.log('跳过加载更多:', this.isLoading ? '正在加载中' : '没有更多数据');
					return;
				}
				
				this.page++;
				console.log('加载更多数据，当前页码:', this.page);
				this.loadTables();
				console.log('==== loadMore执行完成 ====');
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