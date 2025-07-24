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
		</view>
		
		<!-- 统计概览 -->
		<view class="overview-card">
			<view class="overview-title">评分概况</view>
			<view class="overview-content">
				<view class="overview-item">
					<text class="overview-label">总评分表数量：</text>
					<text class="overview-value">{{overview.tableCount || 0}}</text>
				</view>
				<view class="overview-item">
					<text class="overview-label">总考核对象数量：</text>
					<text class="overview-value">{{overview.subjectCount || 0}}</text>
				</view>
				<view class="overview-item">
					<text class="overview-label">总评分记录数量：</text>
					<text class="overview-value">{{overview.ratingCount || 0}}</text>
				</view>
				<view class="overview-item">
					<text class="overview-label">评分完成率：</text>
					<text class="overview-value">{{overview.completionRate || '0%'}}</text>
				</view>
			</view>
		</view>
		
		<!-- 当前评分表统计 -->
		<view class="table-stats" v-if="currentTableIndex > 0">
			<view class="section-title">当前评分表统计</view>
			
			<view class="stats-card">
				<view class="stats-header">
					<text class="stats-name">{{tables[currentTableIndex].name || ''}}</text>
					<text class="stats-type" v-if="currentTable.type">{{getTableTypeName(currentTable.type)}}</text>
				</view>
				<view class="stats-info">
					<view class="info-item">
						<text class="info-label">考核对象数量：</text>
						<text class="info-value">{{currentTable.subjectCount || 0}}</text>
					</view>
					<view class="info-item">
						<text class="info-label">评分记录数量：</text>
						<text class="info-value">{{currentTable.ratingCount || 0}}</text>
					</view>
					<view class="info-item">
						<text class="info-label">评分员：</text>
						<text class="info-value">{{currentTable.rater || '未分配'}}</text>
					</view>
					<view class="info-item">
						<text class="info-label">评分进度：</text>
						<view class="progress-bar">
							<progress :percent="currentTable.completionRate || 0" stroke-width="4" />
							<text class="progress-text">{{currentTable.completionRate || 0}}%</text>
						</view>
					</view>
				</view>
			</view>
		</view>
		
		<!-- 考核对象得分统计 -->
		<view class="subject-stats" v-if="currentTableIndex > 0">
			<view class="section-title">考核对象得分统计</view>
			
			<view class="no-data" v-if="subjects.length === 0">
				<image class="no-data-icon"   mode="aspectFit"></image>
				<text class="no-data-text">暂无考核对象得分数据</text>
			</view>
			
			<view class="subject-card" v-for="(subject, index) in subjects" :key="index">
				<view class="subject-header">
					<text class="subject-name">{{subject.name}}</text>
					<text class="subject-score">总分：{{subject.totalScore || 0}} / {{subject.maxScore || 0}}</text>
				</view>
				<view class="subject-info" v-if="subject.department || subject.position">
					<text class="subject-department" v-if="subject.department">{{subject.department}}</text>
					<text class="subject-position" v-if="subject.position">{{subject.position}}</text>
				</view>
				<view class="score-detail">
					<view class="score-title">评分项得分明细</view>
					<view class="score-list">
						<view class="score-item" v-for="(item, itemIndex) in subject.scores" :key="itemIndex">
							<text class="item-name">{{item.name}}：</text>
							<text class="item-score">{{item.score || 0}} / {{item.maxScore || 0}}</text>
						</view>
					</view>
				</view>
				<view class="comment-box" v-if="subject.comment">
					<view class="comment-title">评语</view>
					<text class="comment-content">{{subject.comment}}</text>
				</view>
			</view>
		</view>
		
		<!-- 加载更多 -->
		<view class="load-more" v-if="subjects.length > 0 && hasMoreData">
			<button class="load-btn" size="mini" @click="loadMore" :loading="isLoading">加载更多</button>
		</view>
		
		<!-- 未完成评分人员统计 -->
		<view class="incomplete-stats">
			<view class="section-title">未完成评分人员</view>
			
			<view class="filter-bar" v-if="currentTableIndex === 0">
				<button class="refresh-btn" size="mini" @click="loadIncompleteRaters" :loading="loadingIncomplete">
					<text class="refresh-icon">⟳</text> 刷新
				</button>
			</view>
			
			<view class="no-data" v-if="incompleteRaters.length === 0 && !loadingIncomplete">
				<text class="no-data-text">暂无未完成评分的人员数据</text>
			</view>
			
			<view class="rater-list" v-else>
				<view class="rater-card" v-for="(rater, index) in incompleteRaters" :key="index">
					<view class="rater-header">
						<text class="rater-name">{{rater.name || rater.username}}</text>
						<text class="rater-status">未完成: {{rater.pending || 0}}/{{rater.total || 0}}</text>
					</view>
					<view class="progress-bar">
						<progress :percent="rater.completionRate || 0" stroke-width="4" />
						<text class="progress-text">{{rater.completionRate || 0}}%</text>
					</view>
					<view class="rater-tables" v-if="rater.tables && rater.tables.length > 0">
						<view class="table-tag" v-for="(table, tIndex) in rater.tables" :key="tIndex">
							{{table.name}}
						</view>
					</view>
				</view>
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
				currentTable: {},
				overview: {
					tableCount: 0,
					subjectCount: 0,
					ratingCount: 0,
					completionRate: '0%'
				},
				subjects: [],
				page: 1,
				pageSize: 10,
				total: 0,
				hasMoreData: false,
				isLoading: false,
				incompleteRaters: [],
				loadingIncomplete: false
			}
		},
		onLoad() {
			this.loadTables();
			this.loadOverview();
			this.loadIncompleteRaters();
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
			
			// 加载概览数据
			loadOverview() {
				uniCloud.callFunction({
					name: 'rating',
					data: {
						action: 'getRatingStats',
						data: {}
					}
				}).then(res => {
					if (res.result.code === 0) {
						this.overview = res.result.data || this.overview;
					}
				});
			},
			
			// 处理评分表筛选变化
			handleTableChange(e) {
				this.currentTableIndex = e.detail.value;
				this.page = 1;
				this.subjects = [];
				
				if (this.currentTableIndex > 0) {
					this.loadTableStats();
					this.loadSubjectStats();
					this.loadIncompleteRaters(this.tables[this.currentTableIndex]._id);
				} else {
					this.loadIncompleteRaters();
				}
			},
			
			// 加载当前评分表统计
			loadTableStats() {
				const tableId = this.tables[this.currentTableIndex]._id;
				
				uniCloud.callFunction({
					name: 'rating',
					data: {
						action: 'getTableStats',
						data: {
							table_id: tableId
						}
					}
				}).then(res => {
					if (res.result.code === 0) {
						this.currentTable = res.result.data || {};
					}
				});
			},
			
			// 加载考核对象得分统计
			loadSubjectStats() {
				this.isLoading = true;
				
				const tableId = this.tables[this.currentTableIndex]._id;
				
				uniCloud.callFunction({
					name: 'rating',
					data: {
						action: 'getSubjectStats',
						data: {
							table_id: tableId,
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
				this.loadSubjectStats();
			},
			
			// 加载未完成评分的评分员列表
			loadIncompleteRaters(tableId = null) {
				this.loadingIncomplete = true;
				this.incompleteRaters = [];
				
				uniCloud.callFunction({
					name: 'rating',
					data: {
						action: 'getIncompleteRaters',
						data: {
							table_id: tableId
						}
					}
				}).then(res => {
					this.loadingIncomplete = false;
					
					if (res.result.code === 0) {
						this.incompleteRaters = res.result.data || [];
					} else {
						uni.showToast({
							title: res.result.msg || '加载未完成评分人员数据失败',
							icon: 'none'
						});
					}
				}).catch(err => {
					this.loadingIncomplete = false;
					console.error(err);
					uni.showToast({
						title: '加载未完成评分人员数据失败，请检查网络',
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
	
	/* 概览卡片样式 */
	.overview-card {
		background-color: #fff;
		border-radius: 16rpx;
		padding: 30rpx;
		margin-bottom: 30rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
	}
	
	.overview-title {
		font-size: 32rpx;
		font-weight: bold;
		margin-bottom: 20rpx;
		text-align: center;
	}
	
	.overview-content {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
	}
	
	.overview-item {
		width: 48%;
		padding: 20rpx;
		margin-bottom: 20rpx;
		background-color: #f8f8f8;
		border-radius: 8rpx;
	}
	
	.overview-label {
		font-size: 28rpx;
		color: #666;
		display: block;
		margin-bottom: 10rpx;
	}
	
	.overview-value {
		font-size: 36rpx;
		font-weight: bold;
		color: #07c160;
	}
	
	/* 评分表统计样式 */
	.stats-card {
		background-color: #fff;
		border-radius: 16rpx;
		padding: 30rpx;
		margin-bottom: 30rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
	}
	
	.stats-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20rpx;
		padding-bottom: 20rpx;
		border-bottom: 1rpx solid #f5f5f5;
	}
	
	.stats-name {
		font-size: 32rpx;
		font-weight: bold;
	}
	
	.stats-type {
		font-size: 24rpx;
		color: #666;
		background-color: #f5f5f5;
		padding: 6rpx 16rpx;
		border-radius: 6rpx;
	}
	
	.stats-info {
		margin-bottom: 20rpx;
	}
	
	.info-item {
		display: flex;
		align-items: center;
		margin-bottom: 16rpx;
	}
	
	.info-label {
		width: 180rpx;
		font-size: 28rpx;
		color: #666;
	}
	
	.info-value {
		flex: 1;
		font-size: 28rpx;
		color: #333;
	}
	
	.progress-bar {
		flex: 1;
		padding-right: 120rpx;
		position: relative;
	}
	
	.progress-text {
		position: absolute;
		right: 0;
		top: 0;
		font-size: 28rpx;
		color: #07c160;
	}
	
	/* 考核对象统计样式 */
	.subject-card {
		background-color: #fff;
		border-radius: 16rpx;
		padding: 30rpx;
		margin-bottom: 30rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
	}
	
	.subject-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16rpx;
	}
	
	.subject-name {
		font-size: 32rpx;
		font-weight: bold;
	}
	
	.subject-score {
		font-size: 28rpx;
		color: #07c160;
		font-weight: bold;
	}
	
	.subject-info {
		display: flex;
		margin-bottom: 16rpx;
	}
	
	.subject-department {
		font-size: 24rpx;
		color: #666;
		background-color: #f5f5f5;
		padding: 4rpx 16rpx;
		border-radius: 6rpx;
		margin-right: 16rpx;
	}
	
	.subject-position {
		font-size: 24rpx;
		color: #666;
	}
	
	.score-detail {
		margin-top: 20rpx;
		padding-top: 20rpx;
		border-top: 1rpx solid #f5f5f5;
	}
	
	.score-title {
		font-size: 28rpx;
		font-weight: bold;
		margin-bottom: 16rpx;
	}
	
	.score-list {
		display: flex;
		flex-wrap: wrap;
	}
	
	.score-item {
		width: 50%;
		display: flex;
		margin-bottom: 10rpx;
	}
	
	.item-name {
		font-size: 26rpx;
		color: #666;
	}
	
	.item-score {
		font-size: 26rpx;
		color: #333;
	}
	
	.comment-box {
		margin-top: 20rpx;
		padding-top: 20rpx;
		border-top: 1rpx dashed #f5f5f5;
	}
	
	.comment-title {
		font-size: 28rpx;
		font-weight: bold;
		margin-bottom: 16rpx;
	}
	
	.comment-content {
		font-size: 26rpx;
		color: #666;
		line-height: 1.5;
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
	
	/* 未完成评分人员样式 */
	.incomplete-stats {
		margin-top: 40rpx;
	}
	
	.refresh-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 26rpx;
		color: #666;
		background-color: #f8f8f8;
		padding: 0 20rpx;
	}
	
	.refresh-icon {
		margin-right: 8rpx;
		font-size: 24rpx;
	}
	
	.rater-list {
		margin-top: 20rpx;
	}
	
	.rater-card {
		background-color: #fff;
		border-radius: 16rpx;
		padding: 30rpx;
		margin-bottom: 20rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
	}
	
	.rater-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16rpx;
	}
	
	.rater-name {
		font-size: 30rpx;
		font-weight: bold;
	}
	
	.rater-status {
		font-size: 28rpx;
		color: #ff6666;
		font-weight: bold;
	}
	
	.rater-tables {
		display: flex;
		flex-wrap: wrap;
		margin-top: 16rpx;
	}
	
	.table-tag {
		font-size: 24rpx;
		color: #666;
		background-color: #f5f5f5;
		padding: 6rpx 16rpx;
		border-radius: 6rpx;
		margin-right: 10rpx;
		margin-bottom: 10rpx;
	}
</style> 