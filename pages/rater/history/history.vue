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
		
		<!-- 评分历史列表 -->
		<view class="history-list">
			<view class="section-title">评分历史</view>
			
			<view class="no-data" v-if="historyList.length === 0">
				<image class="no-data-icon" src="/static/images/no-data.png" mode="aspectFit"></image>
				<text class="no-data-text">暂无评分历史记录</text>
			</view>
			
			<view class="history-card" v-for="(item, index) in historyList" :key="index" @click="viewDetail(item)">
				<view class="card-header">
					<view class="subject-info">
						<text class="subject-name">{{item.subject && item.subject.name || '未知考核对象'}}</text>
						<view class="subject-tags" v-if="item.subject">
							<text class="subject-department" v-if="item.subject.department">{{item.subject.department}}</text>
							<text class="subject-position" v-if="item.subject.position">{{item.subject.position}}</text>
						</view>
					</view>
					<view class="rating-score">
						<text class="score-text">{{item.totalScore || 0}}</text>
						<text class="score-total">/{{item.maxScore || 0}}</text>
					</view>
				</view>
				
				<view class="card-info">
					<view class="table-info">
						<text class="info-label">评分表：</text>
						<text class="info-value">{{item.table && item.table.name || '未知评分表'}}</text>
					</view>
					<view class="time-info">
						<text class="info-label">评分时间：</text>
						<text class="info-value">{{formatDateTime(item.createTime)}}</text>
					</view>
				</view>
				
				<view class="card-summary" v-if="item.scores && item.scores.length > 0">
					<view class="summary-title">评分项概览</view>
					<view class="score-summary">
						<view class="summary-item" v-for="(score, sIndex) in item.scores" :key="sIndex" v-if="sIndex < 3">
							<text class="item-name">{{score.name}}</text>
							<text class="item-score">{{score.score || 0}} / {{score.maxScore || 0}}</text>
						</view>
						<view class="more-items" v-if="item.scores.length > 3">
							<text>查看全部 {{item.scores.length}} 项</text>
						</view>
					</view>
				</view>
				
				<view class="card-comment" v-if="item.comment">
					<view class="comment-title">评价</view>
					<text class="comment-content">{{item.comment}}</text>
				</view>
				
				<view class="card-footer">
					<view class="btn-group">
						<button class="footer-btn edit-btn" @click.stop="editRating(item)">修改评分</button>
						<button class="footer-btn delete-btn" @click.stop="confirmDelete(item)">删除</button>
					</view>
				</view>
			</view>
		</view>
		
		<!-- 加载更多 -->
		<view class="load-more" v-if="historyList.length > 0 && hasMoreData">
			<button class="load-btn" size="mini" @click="loadMore" :loading="isLoading">加载更多</button>
		</view>
		
		<!-- 详情弹窗 -->
		<uni-popup ref="detailPopup" type="center">
			<view class="popup-content">
				<view class="popup-header">
					<text class="popup-title">评分详情</text>
					<view class="popup-close" @click="closeDetail">✕</view>
				</view>
				
				<scroll-view scroll-y="true" class="popup-body">
					<view class="detail-card" v-if="currentDetail">
						<view class="detail-header">
							<view class="detail-subject">
								<text class="detail-name">{{currentDetail.subject && currentDetail.subject.name || '未知考核对象'}}</text>
								<view class="detail-tags" v-if="currentDetail.subject">
									<text class="detail-tag" v-if="currentDetail.subject.department">{{currentDetail.subject.department}}</text>
									<text class="detail-tag" v-if="currentDetail.subject.position">{{currentDetail.subject.position}}</text>
								</view>
							</view>
							<view class="detail-score">
								<text class="detail-score-text">{{currentDetail.totalScore || 0}}</text>
								<text class="detail-score-total">/{{currentDetail.maxScore || 0}}</text>
							</view>
						</view>
						
						<view class="detail-section">
							<view class="section-header">评分表信息</view>
							<view class="detail-row">
								<text class="row-label">评分表名称：</text>
								<text class="row-value">{{currentDetail.table && currentDetail.table.name || '未知评分表'}}</text>
							</view>
							<view class="detail-row">
								<text class="row-label">评分表类型：</text>
								<text class="row-value">{{getTableTypeName(currentDetail.table && currentDetail.table.type)}}</text>
							</view>
							<view class="detail-row" v-if="currentDetail.table && currentDetail.table.category">
								<text class="row-label">类别：</text>
								<text class="row-value">{{currentDetail.table.category}}</text>
							</view>
						</view>
						
						<view class="detail-section">
							<view class="section-header">评分项详情</view>
							<view class="score-list">
								<view class="score-item" v-for="(score, index) in currentDetail.scores" :key="index">
									<view class="score-header">
										<text class="score-name">{{score.name}}</text>
										<text class="score-value">{{score.score || 0}} / {{score.maxScore || 0}}</text>
									</view>
									<view class="score-description" v-if="score.description">
										<text>{{score.description}}</text>
									</view>
								</view>
							</view>
						</view>
						
						<view class="detail-section" v-if="currentDetail.comment">
							<view class="section-header">评价</view>
							<view class="detail-comment">
								<text>{{currentDetail.comment}}</text>
							</view>
						</view>
						
						<view class="detail-footer">
							<text class="detail-time">评分时间：{{formatDateTime(currentDetail.createTime)}}</text>
						</view>
					</view>
				</scroll-view>
				
				<view class="popup-footer">
					<button class="popup-btn cancel-btn" @click="closeDetail">关闭</button>
					<button class="popup-btn confirm-btn" @click="editRating(currentDetail)">修改评分</button>
				</view>
			</view>
		</uni-popup>
		
		<!-- 删除确认弹窗 -->
		<uni-popup ref="deletePopup" type="dialog">
			<uni-popup-dialog type="warn" title="确认删除" content="确定要删除这条评分记录吗？删除后不可恢复！" :before-close="true" @confirm="deleteRating" @close="closeDeletePopup"></uni-popup-dialog>
		</uni-popup>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				currentTableIndex: 0,
				tables: [{ _id: '', name: '全部评分表' }],
				historyList: [],
				page: 1,
				pageSize: 10,
				total: 0,
				hasMoreData: false,
				isLoading: false,
				currentDetail: null,
				deleteItem: null
			}
		},
		onLoad() {
			this.loadTables();
			this.loadHistory();
		},
		onPullDownRefresh() {
			this.reloadData(() => {
				uni.stopPullDownRefresh();
			});
		},
		methods: {
			// 重新加载数据
			reloadData(callback) {
				this.page = 1;
				this.loadHistory(() => {
					if (typeof callback === 'function') {
						callback();
					}
				});
			},
			
			// 加载评分表列表
			loadTables() {
				uniCloud.callFunction({
					name: 'ratingTable',
					data: {
						action: 'getTables',
						data: {
							pageSize: 100 // 获取所有评分表
						}
					}
				}).then(res => {
					if (res.result.code === 0) {
						const data = res.result.data;
						this.tables = [{ _id: '', name: '全部评分表' }].concat(data.list);
					}
				});
			},
			
			// 加载评分历史
			loadHistory(callback) {
				this.isLoading = true;
				
				const tableId = this.tables[this.currentTableIndex]._id;
				
				uni.showLoading({
					title: '加载中...'
				});
				
				uniCloud.callFunction({
					name: 'rating',
					data: {
						action: 'getRatingHistory',
						data: {
							table_id: tableId,
							page: this.page,
							pageSize: this.pageSize
						}
					}
				}).then(res => {
					uni.hideLoading();
					this.isLoading = false;
					
					if (res.result.code === 0) {
						const data = res.result.data;
						
						if (this.page === 1) {
							this.historyList = data.list;
						} else {
							this.historyList = this.historyList.concat(data.list);
						}
						
						this.total = data.total;
						this.hasMoreData = this.historyList.length < this.total;
					} else {
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
					console.error(err);
					uni.showToast({
						title: '加载失败，请检查网络',
						icon: 'none'
					});
					
					if (typeof callback === 'function') {
						callback();
					}
				});
			},
			
			// 处理评分表筛选变化
			handleTableChange(e) {
				this.currentTableIndex = e.detail.value;
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
			
			// 格式化日期时间
			formatDateTime(timestamp) {
				if (!timestamp) return '';
				
				const date = new Date(timestamp);
				const year = date.getFullYear();
				const month = String(date.getMonth() + 1).padStart(2, '0');
				const day = String(date.getDate()).padStart(2, '0');
				const hours = String(date.getHours()).padStart(2, '0');
				const minutes = String(date.getMinutes()).padStart(2, '0');
				
				return `${year}-${month}-${day} ${hours}:${minutes}`;
			},
			
			// 查看详情
			viewDetail(item) {
				this.currentDetail = item;
				this.$refs.detailPopup.open();
			},
			
			// 关闭详情弹窗
			closeDetail() {
				this.$refs.detailPopup.close();
			},
			
			// 编辑评分
			editRating(item) {
				if (this.$refs.detailPopup.isOpen) {
					this.$refs.detailPopup.close();
				}
				
				if (!item || !item._id || !item.table || !item.table._id) {
					uni.showToast({
						title: '评分记录数据不完整，无法编辑',
						icon: 'none'
					});
					return;
				}
				
				uni.navigateTo({
					url: `/pages/rater/rating/rating?table_id=${item.table._id}&subject_id=${item.subject._id}&rating_id=${item._id}`
				});
			},
			
			// 确认删除
			confirmDelete(item) {
				this.deleteItem = item;
				this.$refs.deletePopup.open();
			},
			
			// 关闭删除确认弹窗
			closeDeletePopup() {
				this.$refs.deletePopup.close();
			},
			
			// 删除评分记录
			deleteRating() {
				if (!this.deleteItem || !this.deleteItem._id) {
					uni.showToast({
						title: '评分记录数据不完整，无法删除',
						icon: 'none'
					});
					return;
				}
				
				uni.showLoading({
					title: '删除中...'
				});
				
				uniCloud.callFunction({
					name: 'rating',
					data: {
						action: 'deleteRating',
						data: {
							rating_id: this.deleteItem._id
						}
					}
				}).then(res => {
					uni.hideLoading();
					
					if (res.result.code === 0) {
						uni.showToast({
							title: '删除成功',
							icon: 'success'
						});
						
						// 从列表中移除已删除的项
						const index = this.historyList.findIndex(item => item._id === this.deleteItem._id);
						if (index !== -1) {
							this.historyList.splice(index, 1);
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
			},
			
			// 加载更多
			loadMore() {
				if (this.isLoading || !this.hasMoreData) return;
				
				this.page++;
				this.loadHistory();
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
	
	/* 历史记录卡片样式 */
	.history-card {
		background-color: #fff;
		border-radius: 16rpx;
		padding: 30rpx;
		margin-bottom: 30rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
	}
	
	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 20rpx;
	}
	
	.subject-info {
		flex: 1;
	}
	
	.subject-name {
		font-size: 32rpx;
		font-weight: bold;
		display: block;
		margin-bottom: 10rpx;
	}
	
	.subject-tags {
		display: flex;
		flex-wrap: wrap;
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
	
	.rating-score {
		display: flex;
		align-items: baseline;
	}
	
	.score-text {
		font-size: 40rpx;
		font-weight: bold;
		color: #07c160;
	}
	
	.score-total {
		font-size: 26rpx;
		color: #999;
		margin-left: 4rpx;
	}
	
	.card-info {
		border-bottom: 1rpx solid #f5f5f5;
		padding-bottom: 20rpx;
		margin-bottom: 20rpx;
	}
	
	.table-info, .time-info {
		display: flex;
		margin-bottom: 10rpx;
	}
	
	.info-label {
		font-size: 26rpx;
		color: #666;
		width: 120rpx;
	}
	
	.info-value {
		font-size: 26rpx;
		color: #333;
		flex: 1;
	}
	
	.card-summary {
		margin-bottom: 20rpx;
	}
	
	.summary-title {
		font-size: 28rpx;
		font-weight: bold;
		margin-bottom: 16rpx;
	}
	
	.score-summary {
		background-color: #f8f8f8;
		border-radius: 8rpx;
		padding: 16rpx;
	}
	
	.summary-item {
		display: flex;
		justify-content: space-between;
		margin-bottom: 10rpx;
	}
	
	.item-name {
		font-size: 26rpx;
		color: #333;
	}
	
	.item-score {
		font-size: 26rpx;
		color: #07c160;
	}
	
	.more-items {
		text-align: center;
		font-size: 26rpx;
		color: #1989fa;
		padding: 10rpx 0;
	}
	
	.card-comment {
		margin-bottom: 20rpx;
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
	
	.card-footer {
		margin-top: 20rpx;
		padding-top: 20rpx;
		border-top: 1rpx solid #f5f5f5;
	}
	
	.btn-group {
		display: flex;
		justify-content: flex-end;
	}
	
	.footer-btn {
		font-size: 24rpx;
		padding: 6rpx 20rpx;
		border-radius: 30rpx;
		margin-left: 20rpx;
	}
	
	.edit-btn {
		background-color: #f5f5f5;
		color: #666;
	}
	
	.delete-btn {
		background-color: #fff2f0;
		color: #fa5151;
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
	
	/* 弹窗样式 */
	.popup-content {
		background-color: #fff;
		border-radius: 16rpx;
		width: 650rpx;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	
	.popup-header {
		padding: 30rpx;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1rpx solid #f5f5f5;
	}
	
	.popup-title {
		font-size: 32rpx;
		font-weight: bold;
	}
	
	.popup-close {
		font-size: 24rpx;
		color: #999;
		width: 40rpx;
		height: 40rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background-color: #f5f5f5;
	}
	
	.popup-body {
		padding: 0 30rpx;
		max-height: 60vh;
	}
	
	.popup-footer {
		padding: 20rpx 30rpx;
		display: flex;
		justify-content: flex-end;
		border-top: 1rpx solid #f5f5f5;
	}
	
	.popup-btn {
		font-size: 28rpx;
		padding: 8rpx 30rpx;
		border-radius: 30rpx;
		margin-left: 20rpx;
	}
	
	.cancel-btn {
		background-color: #f5f5f5;
		color: #666;
	}
	
	.confirm-btn {
		background-color: #07c160;
		color: #fff;
	}
	
	/* 详情样式 */
	.detail-card {
		padding: 20rpx 0;
	}
	
	.detail-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 30rpx;
	}
	
	.detail-subject {
		flex: 1;
	}
	
	.detail-name {
		font-size: 34rpx;
		font-weight: bold;
		display: block;
		margin-bottom: 10rpx;
	}
	
	.detail-tags {
		display: flex;
		flex-wrap: wrap;
	}
	
	.detail-tag {
		font-size: 24rpx;
		color: #666;
		background-color: #f5f5f5;
		padding: 4rpx 16rpx;
		border-radius: 6rpx;
		margin-right: 16rpx;
		margin-bottom: 10rpx;
	}
	
	.detail-score {
		display: flex;
		align-items: baseline;
	}
	
	.detail-score-text {
		font-size: 44rpx;
		font-weight: bold;
		color: #07c160;
	}
	
	.detail-score-total {
		font-size: 28rpx;
		color: #999;
		margin-left: 4rpx;
	}
	
	.detail-section {
		margin-bottom: 30rpx;
	}
	
	.section-header {
		font-size: 30rpx;
		font-weight: bold;
		margin-bottom: 20rpx;
		padding-left: 16rpx;
		border-left: 6rpx solid #07c160;
	}
	
	.detail-row {
		display: flex;
		margin-bottom: 16rpx;
	}
	
	.row-label {
		font-size: 28rpx;
		color: #666;
		width: 160rpx;
	}
	
	.row-value {
		font-size: 28rpx;
		color: #333;
		flex: 1;
	}
	
	.score-list {
		background-color: #f8f8f8;
		border-radius: 8rpx;
		padding: 16rpx;
	}
	
	.score-item {
		margin-bottom: 20rpx;
		padding-bottom: 20rpx;
		border-bottom: 1rpx dashed #ddd;
	}
	
	.score-item:last-child {
		margin-bottom: 0;
		padding-bottom: 0;
		border-bottom: none;
	}
	
	.score-header {
		display: flex;
		justify-content: space-between;
		margin-bottom: 10rpx;
	}
	
	.score-name {
		font-size: 28rpx;
		font-weight: bold;
		color: #333;
	}
	
	.score-value {
		font-size: 28rpx;
		color: #07c160;
		font-weight: bold;
	}
	
	.score-description {
		font-size: 26rpx;
		color: #666;
		line-height: 1.5;
	}
	
	.detail-comment {
		background-color: #f8f8f8;
		border-radius: 8rpx;
		padding: 20rpx;
		font-size: 28rpx;
		color: #666;
		line-height: 1.5;
	}
	
	.detail-footer {
		text-align: right;
		margin-top: 20rpx;
	}
	
	.detail-time {
		font-size: 24rpx;
		color: #999;
	}
</style> 