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
			<view class="selector-header">
				<text class="section-title">考核对象</text>
				<text class="progress-text">当前进度: {{currentSubjectIndex + 1}}/{{subjects.length}}</text>
			</view>
			
			<scroll-view scroll-x="true" class="subject-tabs">
				<view 
					v-for="(subject, index) in subjects" 
					:key="index"
					class="subject-tab" 
					:class="{'active': currentSubjectIndex === index}"
					@click="switchToSubject(index)">
					<text class="subject-name">{{subject.name}}</text>
					<text class="subject-status" v-if="subjectRatingStatus[index]">已评</text>
				</view>
			</scroll-view>
			
			<picker @change="handleSubjectChange" :value="currentSubjectIndex" :range="subjectOptions" range-key="name">
				<view class="picker-content">
					<text class="picker-text">{{ currentSubject.name || '请选择考核对象' }}</text>
					<text class="picker-arrow">▼</text>
				</view>
			</picker>
		</view>
		
		<view class="rating-form" v-if="currentSubject._id">
			<text class="section-title">评分项目</text>
			
			<!-- 添加评分说明，仅班子评分-中层干部考核评分表（分别评分)时显示 -->
			<view class="rating-instructions" v-if="table.type === 3">
				<text class="instructions-title">评分说明：</text>
				<view class="instructions-content">
					<text>1. 请直接给出考核对象重点工作完成情况和办公室管理情况得分之和。</text>
					<text>2. 评分时，91-100分的占30%(3人)，81-90分的占60%（6人），80分以下的占10%（1人），请不要出现同分的情况。</text>
				</view>
			</view>
			
			<!-- 添加办公室一般干部评分的评分说明 -->
			<view class="rating-instructions" v-if="table.type === 1">
				<text class="instructions-title">评分说明：</text>
				<view class="instructions-content">
					<text>1. 请直接填写考核对象工作完成质量、工作完成效率、工作态度的得分之和。</text>
					<text>2. 评分时，91-100分的占30%(2人)，81-90分以下的占60%（5人），80分以下的占10%（1人），请不要出现同分的情况。</text>
				</view>
			</view>
			
			<!-- 添加驻村干部评分的评分说明 -->
			<view class="rating-instructions" v-if="table.type === 2">
				<text class="instructions-title">评分说明：</text>
				<view class="instructions-content">
					<text>1. 请直接填写考核对象工作完成质量、工作完成效率、工作态度的得分之和。</text>
					<text>2. 评分时，91-100分的占30%(2人)，81-90分的占60%（4人），80分以下的占10%（1人），请不要出现同分的情况。</text>
				</view>
			</view>
			
			<!-- 添加班子评分-驻村干部考核的评分说明 -->
			<view class="rating-instructions" v-if="table.type === 4">
				<text class="instructions-title">评分说明：</text>
				<view class="instructions-content">
					<text>1. 请直接填写考核对象工作完成质量、工作完成效率、工作态度的得分之和。</text>
					<text>2. 评分时，91-100分的占30%(2人)，90分-81分以下的占60%（5人），80分以下的占10%（1人），请不要出现同分的情况。</text>
				</view>
			</view>
			
			<!-- 添加班子评分-分管线上一般干部考核的评分说明 -->
			<view class="rating-instructions" v-if="table.type === 5">
				<text class="instructions-title">评分说明：</text>
				<view class="instructions-content">
					<text>1. 请直接填写考核对象工作完成质量、工作完成效率、工作态度的得分之和。</text>
					<text>2. 评分时，91-100分的占30%(4人)，90分-81分以下的占60%（8人），80分以下的占10%（1人），请不要出现同分的情况。</text>
				</view>
			</view>
			
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
			
			<view class="total-score">
				<text class="total-label">总分：</text>
				<text class="total-value">{{calculateTotalScore()}} / {{calculateMaxScore()}}</text>
			</view>
			
			<view class="btn-group">
				<view class="btn prev-btn" :class="{'disabled': currentSubjectIndex === 0}" @click="prevSubject">上一个</view>
				<view class="btn save-btn" @click="handleSubmit">提交评分</view>
				<view class="btn next-btn" :class="{'disabled': currentSubjectIndex === subjects.length - 1}" @click="nextSubject">下一个</view>
			</view>
			
			<view class="btn submit-all-btn" @click="submitAllRatings" v-if="hasUnsubmittedRatings">提交所有评分</view>
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
				existingRating: null,
				allScores: {},
				subjectRatingStatus: [],
				pendingSubmissions: []
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
			},
			hasUnsubmittedRatings() {
				return this.pendingSubmissions.length > 0;
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
					3: '班子评分-中层干部考核评分表（分别评分)',
					4: '班子评分-驻村干部考核',
					5: '班子评分-分管线上一般干部考核'
				};
				return typeMap[type] || '未知类型';
			},
			
			// 加载评分表详情
			loadTableDetail() {
				console.log('开始加载评分表详情, tableId:', this.tableId);
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
					console.log('评分表详情加载结果:', res.result);
					
					if (res.result.code === 0) {
						this.table = res.result.data.table || {};
						this.subjects = res.result.data.subjects || [];
						console.log('评分表信息:', this.table);
						console.log('考核对象数量:', this.subjects.length);
						
						// 初始化评分项
						this.initScores();
						
						// 初始化评分状态数组
						this.subjectRatingStatus = new Array(this.subjects.length).fill(false);
						
						// 如果有考核对象，默认选择第一个
						if (this.subjects.length > 0) {
							this.currentSubject = this.subjects[0];
							console.log('默认选择第一个考核对象:', this.currentSubject.name);
							// 加载所有考核对象的评分状态
							this.loadAllRatingStatus();
						}
					} else {
						uni.showToast({
							title: res.result.msg || '加载失败',
							icon: 'none'
						});
					}
				}).catch(err => {
					uni.hideLoading();
					console.error('加载评分表详情出错:', err);
					uni.showToast({
						title: '加载失败，请检查网络',
						icon: 'none'
					});
				});
			},
			
			// 初始化评分项
			initScores() {
				console.log('初始化评分项');
				if (this.table.items && this.table.items.length > 0) {
					this.scores = this.table.items.map(item => {
						return {
							item_id: item._id || '',
							name: item.name,
							score: 0,
							maxScore: item.maxScore
						};
					});
					console.log('初始化后的评分项:', this.scores);
				}
			},
			
			// 处理考核对象选择变化
			handleSubjectChange(e) {
				const index = e.detail.value;
				console.log('选择考核对象变更, 从', this.currentSubjectIndex, '到', index);
				this.currentSubjectIndex = index;
				this.currentSubject = this.subjects[index];
				
				// 重置评分
				this.initScores();
				
				// 加载已有评分记录
				this.loadExistingRating();
			},
			
			// 加载已有评分记录
			loadExistingRating() {
				console.log('开始加载当前考核对象评分记录:', this.currentSubject.name);
				const userInfo = uni.getStorageSync('userInfo') || {};
				console.log('当前用户信息:', userInfo);
				
				uniCloud.callFunction({
					name: 'rating',
					data: {
						action: 'getRatingBySubject',
						data: {
							tableId: this.tableId,
							subject: this.currentSubject.name,
							rater: userInfo.username
						}
					}
				}).then(res => {
					console.log('获取评分记录结果:', res.result);
					if (res.result.code === 0 && res.result.data) {
						this.existingRating = res.result.data.rating;
						console.log('已有评分记录:', this.existingRating);
						
						// 填充已有评分
						if (this.existingRating) {
							// 更新评分项分数
							if (this.existingRating.scores && this.existingRating.scores.length > 0) {
								this.existingRating.scores.forEach((score, index) => {
									if (index < this.scores.length) {
										this.scores[index].score = score.score;
									}
								});
							}
							
							// 更新评分状态
							this.$set(this.subjectRatingStatus, this.currentSubjectIndex, true);
							console.log('更新评分状态, 索引:', this.currentSubjectIndex, '状态:', this.subjectRatingStatus);
							
							// 存储到allScores中，避免切换后丢失
							this.allScores[this.currentSubject._id] = [...this.scores];
							console.log('保存评分到allScores:', this.currentSubject._id, this.allScores[this.currentSubject._id]);
						} else {
							console.log('没有找到当前考核对象的评分记录');
						}
					} else {
						console.log('获取评分记录失败或无数据');
					}
				}).catch(err => {
					console.error('加载评分记录失败:', err);
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
							table_id: this.tableId,
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
						
						// 更新状态
						this.$set(this.subjectRatingStatus, this.currentSubjectIndex, true);
						
						// 从待提交列表中移除
						const index = this.pendingSubmissions.indexOf(this.currentSubject._id);
						if (index > -1) {
							this.pendingSubmissions.splice(index, 1);
						}
						
						// 自动进入下一个未评分的对象
						this.goToNextUnrated();
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
			},
			switchToSubject(index) {
				console.log('切换到考核对象, 索引:', index);
				this.saveCurrentRating();
				
				this.currentSubjectIndex = index;
				this.currentSubject = this.subjects[index];
				
				this.loadSubjectRating();
			},
			saveCurrentRating() {
				if (!this.currentSubject._id) return;
				console.log('保存当前评分:', this.currentSubject.name);
				
				this.allScores[this.currentSubject._id] = [...this.scores];
				console.log('保存的分数:', this.allScores[this.currentSubject._id]);
				
				if (!this.pendingSubmissions.includes(this.currentSubject._id)) {
					this.pendingSubmissions.push(this.currentSubject._id);
					console.log('添加到待提交列表:', this.pendingSubmissions);
				}
			},
			loadSubjectRating() {
				console.log('加载考核对象评分:', this.currentSubject.name);
				if (this.allScores[this.currentSubject._id]) {
					console.log('从缓存加载评分:', this.allScores[this.currentSubject._id]);
					this.scores = [...this.allScores[this.currentSubject._id]];
					return;
				}
				
				console.log('没有缓存评分，初始化并加载服务器评分');
				this.initScores();
				
				this.loadExistingRating();
			},
			prevSubject() {
				if (this.currentSubjectIndex > 0) {
					this.switchToSubject(this.currentSubjectIndex - 1);
				}
			},
			nextSubject() {
				if (this.currentSubjectIndex < this.subjects.length - 1) {
					this.switchToSubject(this.currentSubjectIndex + 1);
				}
			},
			goToNextUnrated() {
				for (let i = 0; i < this.subjects.length; i++) {
					if (!this.subjectRatingStatus[i]) {
						this.switchToSubject(i);
						return;
					}
				}
				uni.showToast({
					title: '所有考核对象已评分完成',
					icon: 'success'
				});
			},
			submitAllRatings() {
				uni.showLoading({
					title: '批量提交中...'
				});
				
				const promises = this.pendingSubmissions.map(subjectId => {
					const subject = this.subjects.find(s => s._id === subjectId);
					const scores = this.allScores[subjectId];
					
					return uniCloud.callFunction({
						name: 'rating',
						data: {
							action: 'submitRating',
							data: {
								table_id: this.tableId,
								rater: uni.getStorageSync('userInfo').username,
								subject: subject.name,
								scores: scores
							}
						}
					});
				});
				
				Promise.all(promises).then(results => {
					uni.hideLoading();
					
					const successCount = results.filter(res => res.result.code === 0).length;
					
					this.pendingSubmissions = [];
					this.subjectRatingStatus = this.subjects.map(() => true);
					
					uni.showToast({
						title: `成功提交${successCount}条评分`,
						icon: 'success'
					});
				}).catch(err => {
					uni.hideLoading();
					uni.showToast({
						title: '批量提交失败',
						icon: 'none'
					});
					console.error(err);
				});
			},
			// 加载所有考核对象的评分状态
			loadAllRatingStatus() {
				console.log('开始加载所有考核对象评分状态');
				// 显示加载指示器
				uni.showLoading({
					title: '加载评分数据...'
				});
				
				const userInfo = uni.getStorageSync('userInfo') || {};
				console.log('当前用户信息:', userInfo);
				
				// 调用云函数获取评分表所有评分记录
				uniCloud.callFunction({
					name: 'rating',
					data: {
						action: 'getRatingsByTable',
						data: {
							tableId: this.tableId,
							rater: userInfo.username
						}
					}
				}).then(res => {
					uni.hideLoading();
					console.log('获取评分表所有评分记录结果:', res.result);
					
					if (res.result.code === 0 && res.result.data && res.result.data.ratings) {
						const ratings = res.result.data.ratings;
						console.log('评分记录数量:', ratings.length);
						
						// 处理每个评分记录
						ratings.forEach(rating => {
							console.log('处理评分记录:', rating.subject);
							// 找到对应的考核对象索引
							const subjectIndex = this.subjects.findIndex(s => s.name === rating.subject);
							console.log('考核对象索引:', subjectIndex);
							if (subjectIndex !== -1) {
								// 更新评分状态
								this.$set(this.subjectRatingStatus, subjectIndex, true);
								console.log('更新评分状态, 索引:', subjectIndex, '状态:', this.subjectRatingStatus);
								
								// 存储评分数据
								if (rating.scores && rating.scores.length > 0) {
									// 确保allScores中有该考核对象的记录
									if (!this.allScores[this.subjects[subjectIndex]._id]) {
										this.allScores[this.subjects[subjectIndex]._id] = this.table.items.map(item => {
											return {
												item_id: item._id || '',
												name: item.name,
												score: 0,
												maxScore: item.maxScore
											};
										});
									}
									
									// 更新分数
									rating.scores.forEach((score, idx) => {
										if (idx < this.allScores[this.subjects[subjectIndex]._id].length) {
											this.allScores[this.subjects[subjectIndex]._id][idx].score = score.score;
										}
									});
									console.log('更新分数:', this.subjects[subjectIndex]._id, this.allScores[this.subjects[subjectIndex]._id]);
								}
							}
						});
						
						// 加载当前选中考核对象的评分
						console.log('加载当前选中考核对象的评分');
						this.loadSubjectRating();
					} else {
						console.log('没有找到评分记录，加载当前考核对象');
						// 如果没有评分记录，也要加载当前考核对象
						this.loadExistingRating();
					}
				}).catch(err => {
					uni.hideLoading();
					console.error('加载评分状态失败:', err);
					// 出错时也要加载当前考核对象
					this.loadExistingRating();
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
	
	.selector-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 10px;
	}
	
	.progress-text {
		font-size: 14px;
		color: #666;
	}
	
	.subject-tabs {
		white-space: nowrap;
		margin-bottom: 15px;
	}
	
	.subject-tab {
		display: inline-block;
		padding: 8px 15px;
		margin-right: 10px;
		background-color: #f2f2f2;
		border-radius: 20px;
		position: relative;
	}
	
	.subject-tab.active {
		background-color: #07c160;
		color: white;
	}
	
	.subject-name {
		font-size: 14px;
	}
	
	.subject-status {
		position: absolute;
		right: -5px;
		top: -5px;
		background-color: #ff7043;
		color: white;
		font-size: 10px;
		padding: 2px 5px;
		border-radius: 10px;
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
	
	.rating-instructions {
		background-color: #f5f5f5;
		border-radius: 16rpx;
		padding: 20rpx;
		margin-bottom: 20rpx;
		border-left: 4px solid #07c160;
	}
	
	.instructions-title {
		font-size: 32rpx;
		font-weight: bold;
		margin-bottom: 10rpx;
		color: #333;
	}
	
	.instructions-content {
		font-size: 28rpx;
		color: #666;
		display: flex;
		flex-direction: column;
	}
	
	.instructions-content text {
		line-height: 1.6;
		margin-bottom: 10rpx;
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
		display: flex !important;
		flex-direction: row !important;
		justify-content: space-between !important;
		align-items: center !important;
		margin-top: 30rpx !important;
		width: 100% !important;
		position: relative !important;
	}
	
	.btn {
		flex: none !important;
		position: relative !important;
		display: inline-block !important;
		cursor: pointer;
	}
	
	.btn:active {
		opacity: 0.8;
	}
	
	.prev-btn, .next-btn {
		width: 28% !important;
		font-size: 28rpx !important;
		background-color: #f5f5f5 !important;
		color: #666 !important;
		border-radius: 40rpx !important;
		height: 80rpx !important;
		line-height: 80rpx !important;
		border: 1px solid #eee !important;
		padding: 0 !important;
		margin: 0 !important;
		flex-shrink: 0 !important;
		text-align: center !important;
	}
	
	.prev-btn.disabled, .next-btn.disabled {
		background-color: #f8f8f8 !important;
		color: #ccc !important;
		border-color: #f0f0f0 !important;
		cursor: not-allowed;
	}
	
	.prev-btn.disabled:active, .next-btn.disabled:active {
		opacity: 1; /* 禁用状态下点击不改变透明度 */
	}
	
	.save-btn {
		width: 38% !important;
		background: linear-gradient(to right, #07c160, #10ad7a) !important;
		color: white !important;
		border-radius: 40rpx !important;
		font-weight: bold !important;
		font-size: 30rpx !important;
		height: 80rpx !important;
		line-height: 80rpx !important;
		box-shadow: 0 4rpx 12rpx rgba(7, 193, 96, 0.2) !important;
		padding: 0 !important;
		margin: 0 !important;
		flex-shrink: 0 !important;
		text-align: center !important;
	}
	
	.save-btn:active {
		transform: scale(0.98);
	}
	
	.submit-all-btn {
		margin-top: 15px;
		background-color: #1976d2;
		color: white;
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