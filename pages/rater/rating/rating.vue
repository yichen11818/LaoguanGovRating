<template>
	<view class="container">
		<view class="table-info">
			<view class="table-header">
				<text class="table-name">{{table.name || ''}}</text>
				<text class="table-type" v-if="table.type">{{getTableTypeName(table.type)}}</text>
			</view>
			<text class="table-category" v-if="table.category">{{table.category}}</text>
		</view>
		
		<view class="subject-selector">
			<text class="section-title">选择考核对象</text>
			<picker @change="handleSubjectChange" :value="currentSubjectIndex" :range="subjectOptions" range-key="name">
				<view class="picker-content">
					<text class="picker-text">{{ currentSubject.name || '请选择考核对象' }}</text>
					<text class="picker-arrow">▼</text>
				</view>
			</picker>
		</view>
		
		<view class="rating-form" v-if="currentSubject._id">
			<text class="section-title">评分项目</text>
			
			<view class="form-item" v-for="(item, index) in table.items" :key="index">
				<view class="item-header">
					<text class="item-name">{{item.name}}</text>
					<text class="item-max">满分：{{item.maxScore}}分</text>
				</view>
				<view class="score-input">
					<slider :min="0" :max="item.maxScore" :value="scores[index]?.score || 0" :step="1" show-value
						@change="(e) => handleScoreChange(e, index)" block-color="#07c160" />
				</view>
			</view>
			
			<view class="comment-area">
				<text class="section-title">评语</text>
				<textarea v-model="comment" placeholder="请输入评语（选填）" class="comment-input" />
			</view>
			
			<view class="total-score">
				<text class="total-label">总分：</text>
				<text class="total-value">{{calculateTotalScore()}} / {{calculateMaxScore()}}</text>
			</view>
			
			<view class="btn-group">
				<button class="save-btn" @click="handleSubmit">提交评分</button>
			</view>
		</view>
		
		<view class="no-subject" v-if="subjects.length === 0">
			<image class="no-data-icon" src="/static/images/no-data.png" mode="aspectFit"></image>
			<text class="no-data-text">暂无考核对象，请联系管理员添加</text>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				tableId: '',
				table: {},
				subjects: [],
				currentSubjectIndex: 0,
				currentSubject: {},
				scores: [],
				comment: '',
				existingRating: null
			}
		},
		computed: {
			subjectOptions() {
				return this.subjects.map(item => {
					return {
						_id: item._id,
						name: item.name,
						position: item.position,
						department: item.department
					}
				});
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
					1: '(办公室)一般干部评分',
					2: '(驻村)干部评分',
					3: '班子评分'
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
						this.subjects = res.result.data.subjects || [];
						
						// 初始化评分项
						this.initScores();
						
						// 如果有考核对象，默认选择第一个
						if (this.subjects.length > 0) {
							this.currentSubject = this.subjects[0];
							this.loadExistingRating();
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
			
			// 初始化评分项
			initScores() {
				if (this.table.items && this.table.items.length > 0) {
					this.scores = this.table.items.map(item => {
						return {
							item_id: item._id || '',
							name: item.name,
							score: 0,
							maxScore: item.maxScore
						};
					});
				}
			},
			
			// 处理考核对象选择变化
			handleSubjectChange(e) {
				const index = e.detail.value;
				this.currentSubjectIndex = index;
				this.currentSubject = this.subjects[index];
				
				// 重置评分
				this.initScores();
				this.comment = '';
				
				// 加载已有评分记录
				this.loadExistingRating();
			},
			
			// 加载已有评分记录
			loadExistingRating() {
				const userInfo = uni.getStorageSync('userInfo') || {};
				
				uniCloud.callFunction({
					name: 'rating',
					data: {
						action: 'getRatingBySubject',
						data: {
							tableId: this.tableId,
							subject: this.currentSubject.name
						}
					}
				}).then(res => {
					if (res.result.code === 0 && res.result.data) {
						this.existingRating = res.result.data.rating;
						
						// 填充已有评分
						if (this.existingRating) {
							this.comment = this.existingRating.comment || '';
							
							// 更新评分项分数
							if (this.existingRating.scores && this.existingRating.scores.length > 0) {
								this.existingRating.scores.forEach((score, index) => {
									if (index < this.scores.length) {
										this.scores[index].score = score.score;
									}
								});
							}
						}
					}
				});
			},
			
			// 处理评分变化
			handleScoreChange(e, index) {
				const score = e.detail.value;
				if (index < this.scores.length) {
					this.scores[index].score = score;
				}
			},
			
			// 计算总分
			calculateTotalScore() {
				let total = 0;
				this.scores.forEach(item => {
					total += parseInt(item.score || 0);
				});
				return total;
			},
			
			// 计算最高分
			calculateMaxScore() {
				let max = 0;
				this.scores.forEach(item => {
					max += parseInt(item.maxScore || 0);
				});
				return max;
			},
			
			// 提交评分
			handleSubmit() {
				if (!this.currentSubject._id) {
					uni.showToast({
						title: '请选择考核对象',
						icon: 'none'
					});
					return;
				}
				
				// 验证分数
				let valid = true;
				this.scores.forEach(item => {
					if (item.score < 0 || item.score > item.maxScore) {
						valid = false;
					}
				});
				
				if (!valid) {
					uni.showToast({
						title: '评分不能超出范围',
						icon: 'none'
					});
					return;
				}
				
				uni.showLoading({
					title: '提交中...'
				});
				
				const userInfo = uni.getStorageSync('userInfo') || {};
				
				uniCloud.callFunction({
					name: 'rating',
					data: {
						action: 'submitRating',
						data: {
							tableId: this.tableId,
							rater: userInfo.username,
							subject: this.currentSubject.name,
							scores: this.scores,
							comment: this.comment
						}
					}
				}).then(res => {
					uni.hideLoading();
					
					if (res.result.code === 0) {
						uni.showToast({
							title: '评分提交成功',
							icon: 'success'
						});
						
						// 更新评分记录
						this.existingRating = {
							_id: res.result.data.id,
							tableId: this.tableId,
							rater: userInfo.username,
							subject: this.currentSubject.name,
							scores: this.scores,
							comment: this.comment,
							total_score: this.calculateTotalScore()
						};
					} else {
						uni.showToast({
							title: res.result.msg || '提交失败',
							icon: 'none'
						});
					}
				}).catch(err => {
					uni.hideLoading();
					console.error(err);
					uni.showToast({
						title: '提交失败，请检查网络',
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
	
	.table-category {
		font-size: 28rpx;
		color: #999;
	}
	
	.section-title {
		font-size: 32rpx;
		font-weight: bold;
		margin-bottom: 20rpx;
		display: block;
	}
	
	.subject-selector {
		background-color: #fff;
		border-radius: 16rpx;
		padding: 30rpx;
		margin-bottom: 30rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
	}
	
	.picker-content {
		height: 80rpx;
		border: 1rpx solid #eee;
		border-radius: 8rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 20rpx;
	}
	
	.picker-text {
		font-size: 30rpx;
		color: #333;
	}
	
	.picker-arrow {
		font-size: 24rpx;
		color: #999;
	}
	
	.rating-form {
		background-color: #fff;
		border-radius: 16rpx;
		padding: 30rpx;
		margin-bottom: 30rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
	}
	
	.form-item {
		margin-bottom: 40rpx;
	}
	
	.item-header {
		display: flex;
		justify-content: space-between;
		margin-bottom: 16rpx;
	}
	
	.item-name {
		font-size: 30rpx;
		color: #333;
		font-weight: bold;
	}
	
	.item-max {
		font-size: 26rpx;
		color: #999;
	}
	
	.score-input {
		padding: 0 10rpx;
	}
	
	.comment-area {
		margin-top: 40rpx;
		padding-top: 30rpx;
		border-top: 1rpx solid #f5f5f5;
	}
	
	.comment-input {
		width: 100%;
		height: 200rpx;
		border: 1rpx solid #eee;
		border-radius: 8rpx;
		padding: 20rpx;
		font-size: 28rpx;
		box-sizing: border-box;
	}
	
	.total-score {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		margin: 40rpx 0;
	}
	
	.total-label {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
	}
	
	.total-value {
		font-size: 36rpx;
		font-weight: bold;
		color: #07c160;
	}
	
	.btn-group {
		margin-top: 40rpx;
	}
	
	.save-btn {
		background-color: #07c160;
		color: #fff;
		height: 90rpx;
		line-height: 90rpx;
	}
	
	.no-subject {
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
</style> 