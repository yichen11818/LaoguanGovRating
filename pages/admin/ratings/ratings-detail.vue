<template>
	<view class="container">
		<view class="page-header">
			<text class="page-title">评分详情表</text>
			<view class="filter-section">
				<view class="filter-item">
					<text class="filter-label">年份组：</text>
					<picker @change="onGroupChange" :value="filterIndex.groupIndex" :range="groups" range-key="year">
						<view class="picker-box">
							<text class="picker-text">{{selectedGroup ? `${selectedGroup.year}年${selectedGroup.description ? ' ('+selectedGroup.description+')' : ''}` : '请选择年份组'}}</text>
						</view>
					</picker>
				</view>
				
				<view class="action-buttons">
					<button type="primary" size="mini" @click="goToPreviewPage">查看导出预览</button>
				</view>
			</view>
		</view>
		
		<!-- 数据加载中显示 -->
		<view class="loading-container" v-if="loading">
			<uni-icons type="spinner-cycle" size="30" color="#007AFF"></uni-icons>
			<text class="loading-text">数据加载中...</text>
		</view>
		
		<!-- 无数据提示 -->
		<view class="no-data" v-else-if="!loading && (!subjectScores || subjectScores.length === 0)">
			<text class="no-data-text">暂无评分数据，请先选择年份组</text>
		</view>
		
		<!-- 数据表格 -->
		<view class="table-container" v-else>
			<view class="table-scroll-wrapper">
				<uni-table stripe emptyText="暂无数据" border>
					<!-- 表头 -->
					<uni-tr>
						<uni-th align="center" width="200">考核对象</uni-th>
						<uni-th align="center" width="100" v-for="(rater, index) in raters" :key="'rater-'+index">
							{{rater.name}}
						</uni-th>
						<uni-th align="center" width="100">平均分</uni-th>
					</uni-tr>
					
					<!-- 表格内容 -->
					<uni-tr v-for="(subject, sIndex) in subjectScores" :key="'subject-'+sIndex">
						<uni-td align="left">{{subject.name}}</uni-td>
						<uni-td align="center" v-for="(rater, rIndex) in raters" :key="'score-'+sIndex+'-'+rIndex">
							<text :class="{'highlight-score': isHighOrLowScore(subject.scores[rater.id])}" @click="showScoreDetail(subject, rater)">
								{{formatScore(subject.scores[rater.id])}}
							</text>
						</uni-td>
						<uni-td align="center">
							<text class="average-score">{{formatScore(subject.averageScore)}}</text>
						</uni-td>
					</uni-tr>
				</uni-table>
			</view>
		</view>
		
		<!-- 评分详情弹窗 -->
		<uni-popup ref="scoreDetailPopup" type="center">
			<view class="popup-content">
				<view class="popup-title">评分详情</view>
				<view v-if="currentScoreDetail">
					<view class="detail-header">
						<text class="detail-subject">考核对象：{{currentScoreDetail.subject.name}}</text>
						<text class="detail-rater">评分员：{{currentScoreDetail.rater.name}}</text>
					</view>
					
					<view class="score-items">
						<view class="score-item" v-for="(item, index) in currentScoreDetail.items" :key="index">
							<text class="item-name">{{item.name}}:</text>
							<text class="item-score">{{item.score || '未评分'}}分 / {{item.maxScore}}分</text>
						</view>
						
						<view class="score-total">
							<text class="total-label">总分：</text>
							<text class="total-score">{{formatScore(currentScoreDetail.totalScore)}}分</text>
						</view>
						
						<view class="score-comment" v-if="currentScoreDetail.comment">
							<text class="comment-label">评语：</text>
							<text class="comment-content">{{currentScoreDetail.comment}}</text>
						</view>
					</view>
				</view>
				
				<view class="popup-btns">
					<button class="confirm-btn" @click="closeScoreDetail">确定</button>
				</view>
			</view>
		</uni-popup>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				loading: false,
				groups: [], // 年份组列表
				selectedGroup: null, // 选中的年份组
				filterIndex: {
					groupIndex: 0
				},
				raters: [], // 评分员列表
				subjects: [], // 考核对象列表
				ratings: [], // 评分数据
				subjectScores: [], // 整理后的评分数据
				currentScoreDetail: null, // 当前查看的评分详情
			}
		},
		onLoad() {
			// 加载年份组数据
			this.loadGroups();
		},
		methods: {
			// 加载年份组数据
			async loadGroups() {
				this.loading = true;
				
				try {
					const result = await uniCloud.callFunction({
						name: 'ratingTable',
						data: {
							action: 'getGroups',
							data: {}
						}
					});
					
					if (result.result.code === 0) {
						this.groups = result.result.data;
						
						// 默认选择第一个年份组
						if (this.groups.length > 0) {
							this.selectedGroup = this.groups[0];
							this.loadRatingsData();
						}
					} else {
						uni.showToast({
							title: '获取年份组失败',
							icon: 'none'
						});
					}
				} catch (e) {
					console.error('加载年份组失败:', e);
					uni.showToast({
						title: '加载数据失败',
						icon: 'none'
					});
				} finally {
					this.loading = false;
				}
			},
			
			// 年份组选择变化
			onGroupChange(e) {
				const index = e.detail.value;
				this.filterIndex.groupIndex = index;
				this.selectedGroup = this.groups[index];
				this.loadRatingsData();
			},
			
			// 加载评分数据
			async loadRatingsData() {
				if (!this.selectedGroup) return;
				
				this.loading = true;
				this.subjectScores = [];
				
				try {
					// 调用云函数获取评分详情
					const result = await uniCloud.callFunction({
						name: 'ratingTable',
						data: {
							action: 'getRatingsDetail',
							data: {
								group_id: this.selectedGroup._id
							}
						}
					});
					
					if (result.result.code === 0) {
						// 处理数据
						this.raters = result.result.data.raters;
						this.subjects = result.result.data.subjects;
						this.ratings = result.result.data.ratings;
						
						// 整理数据为表格格式
						this.processRatingsData();
					} else {
						uni.showToast({
							title: result.result.msg || '获取评分数据失败',
							icon: 'none'
						});
					}
				} catch (e) {
					console.error('加载评分数据失败:', e);
					uni.showToast({
						title: '加载评分数据失败',
						icon: 'none'
					});
				} finally {
					this.loading = false;
				}
			},
			
			// 处理评分数据为表格格式
			processRatingsData() {
				if (!this.subjects || !this.ratings || !this.raters) return;
				
				// 为每个考核对象创建一个对象，包含其所有评分员的评分
				const subjectScores = this.subjects.map(subject => {
					const scores = {};
					let totalScore = 0;
					let raterCount = 0;
					
					// 初始化所有评分员的分数为null
					this.raters.forEach(rater => {
						scores[rater.id] = null;
					});
					
					// 填充实际评分数据
					this.ratings.forEach(rating => {
						if (rating.subject_id === subject._id) {
							scores[rating.rater_id] = rating.total_score;
							totalScore += parseFloat(rating.total_score);
							raterCount++;
						}
					});
					
					// 计算平均分
					const averageScore = raterCount > 0 ? (totalScore / raterCount).toFixed(2) : null;
					
					return {
						id: subject._id,
						name: subject.name,
						department: subject.department || '',
						position: subject.position || '',
						scores: scores,
						averageScore: averageScore
					};
				});
				
				this.subjectScores = subjectScores;
			},
			
			// 格式化分数显示
			formatScore(score) {
				if (score === null || score === undefined) {
					return '未评';
				}
				return parseFloat(score).toFixed(1);
			},
			
			// 判断是否为高分或低分（用于高亮显示）
			isHighOrLowScore(score) {
				if (score === null || score === undefined) {
					return false;
				}
				
				// 假设90分以上为高分，60分以下为低分
				const scoreValue = parseFloat(score);
				return scoreValue >= 90 || scoreValue < 60;
			},
			
			// 显示评分详情
			async showScoreDetail(subject, rater) {
				// 查找该评分员对该考核对象的详细评分
				const rating = this.ratings.find(r => 
					r.subject_id === subject.id && r.rater_id === rater.id
				);
				
				if (!rating) {
					uni.showToast({
						title: '未找到评分详情',
						icon: 'none'
					});
					return;
				}
				
				// 设置当前评分详情
				this.currentScoreDetail = {
					subject: subject,
					rater: rater,
					items: rating.items || [],
					totalScore: rating.total_score,
					comment: rating.comment || ''
				};
				
				// 打开详情弹窗
				this.$refs.scoreDetailPopup.open();
			},
			
			// 关闭评分详情弹窗
			closeScoreDetail() {
				this.$refs.scoreDetailPopup.close();
			},
			
			// 跳转到评分表预览页面
			goToPreviewPage() {
				if (!this.selectedGroup) {
					uni.showToast({
						title: '请先选择年份组',
						icon: 'none'
					});
					return;
				}
				
				// 跳转到预览页面，并传递选中的年份组信息
				uni.navigateTo({
					url: `/pages/admin/ratings/ratings-preview?group_id=${this.selectedGroup._id}&year=${this.selectedGroup.year}&description=${this.selectedGroup.description || ''}`
				});
			}
		}
	}
</script>

<style>
	.container {
		padding: 20rpx;
	}
	
	.page-header {
		padding: 10rpx 0 30rpx;
	}
	
	.page-title {
		font-size: 36rpx;
		font-weight: bold;
		margin-bottom: 20rpx;
		display: block;
	}
	
	.filter-section {
		display: flex;
		flex-wrap: wrap;
		gap: 20rpx;
		margin-bottom: 20rpx;
		justify-content: space-between;
	}
	
	.filter-item {
		display: flex;
		align-items: center;
	}
	
	.action-buttons {
		display: flex;
		align-items: center;
	}
	
	.filter-label {
		font-size: 28rpx;
		margin-right: 10rpx;
	}
	
	.picker-box {
		border: 1px solid #DDDDDD;
		border-radius: 8rpx;
		padding: 10rpx 20rpx;
		min-width: 300rpx;
	}
	
	.picker-text {
		font-size: 28rpx;
	}
	
	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 100rpx 0;
	}
	
	.loading-text {
		font-size: 28rpx;
		color: #666;
		margin-top: 20rpx;
	}
	
	.table-container {
		margin-top: 20rpx;
	}
	
	.table-scroll-wrapper {
		width: 100%;
		overflow-x: auto;
	}
	
	.highlight-score {
		color: #ff4d4f;
		font-weight: bold;
	}
	
	.average-score {
		font-weight: bold;
		color: #1890ff;
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
	}
	
	.popup-content {
		background-color: #FFFFFF;
		border-radius: 10rpx;
		padding: 30rpx;
		width: 600rpx;
		max-height: 70vh;
		overflow-y: auto;
	}
	
	.popup-title {
		font-size: 32rpx;
		font-weight: bold;
		margin-bottom: 30rpx;
		text-align: center;
	}
	
	.detail-header {
		margin-bottom: 20rpx;
		border-bottom: 1px solid #EEEEEE;
		padding-bottom: 20rpx;
	}
	
	.detail-subject, .detail-rater {
		display: block;
		font-size: 28rpx;
		line-height: 1.6;
	}
	
	.score-items {
		margin-top: 20rpx;
	}
	
	.score-item {
		display: flex;
		justify-content: space-between;
		margin-bottom: 15rpx;
		font-size: 28rpx;
	}
	
	.score-total {
		display: flex;
		justify-content: space-between;
		margin-top: 20rpx;
		padding-top: 20rpx;
		border-top: 1px solid #EEEEEE;
		font-weight: bold;
		font-size: 28rpx;
	}
	
	.score-comment {
		margin-top: 20rpx;
		padding-top: 20rpx;
		border-top: 1px solid #EEEEEE;
		font-size: 28rpx;
	}
	
	.comment-label {
		font-weight: bold;
		display: block;
		margin-bottom: 10rpx;
	}
	
	.popup-btns {
		display: flex;
		justify-content: center;
		margin-top: 30rpx;
	}
	
	.confirm-btn {
		width: 200rpx;
		background-color: #007AFF;
		color: #FFFFFF;
	}
</style> 