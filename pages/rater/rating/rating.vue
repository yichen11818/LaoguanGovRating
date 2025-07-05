<template>
	<view class="container">
		<!-- 表格信息 -->
		<view class="table-info" v-if="table">
			<view class="table-header">
				<text class="table-name">{{table.name}}</text>
				<text class="table-type">{{tableTypes && tableTypes[table.type] || '未知类型'}}</text>
			</view>
			<text class="table-category">{{table.category}}</text>
		</view>
		
		<!-- 考核对象选择器 -->
		<view class="subject-selector" v-if="subjects && subjects.length > 0">
			<view class="selector-header">
				<text class="section-title">考核对象</text>
				<text class="progress-text">已评分: {{subjectRatingStatus ? subjectRatingStatus.filter(Boolean).length : 0}}/{{subjects.length}}</text>
			</view>
			<scroll-view class="subject-tabs" scroll-x="true">
				<view v-for="(subject, index) in subjects" :key="index" 
					:class="['subject-tab', currentSubjectIndex === index ? 'active' : '']"
					@click="switchToSubject(index)">
					<view v-if="subjectRatingStatus && subjectRatingStatus[index]" class="subject-status">已评</view>
					<view class="subject-info">
					<text class="subject-name">{{subject && subject.name || ''}}</text>
						<text class="subject-score-value" v-if="subject && subject._id && getSubjectTotalScore(subject._id) !== null">
							{{getSubjectTotalScore(subject._id)}}分
						</text>
					</view>
				</view>
			</scroll-view>
			<view class="subject-nav">
				<button size="mini" @click="prevSubject" :disabled="currentSubjectIndex === 0">上一个</button>
				<button size="mini" @click="nextSubject" :disabled="currentSubjectIndex === subjects.length - 1">下一个</button>
				</view>
		</view>
		
		<!-- 评分内容区 -->
		<view class="rating-content" v-if="currentSubject && currentSubject._id">
			<!-- 栏目分值参考展示 -->
			<view class="reference-container">
				<view class="reference-header">
					<text class="reference-title">评分标准参考</text>
					<text class="reference-subtitle">（请根据以下标准确定总分）</text>
				</view>
				<view class="reference-items">
					<view class="reference-item" v-for="(item, index) in (table && table.items ? table.items : [])" :key="index">
						<view class="reference-item-header">
							<text class="reference-item-name">{{item.name}}</text>
							<text class="reference-item-score">满分 {{item.maxScore}} 分</text>
			</view>
						<text class="reference-item-desc" v-if="item.description">{{item.description}}</text>
				</view>
				</view>
			</view>
			
			<!-- 评分比例规则提示 -->
			<view class="rating-rules-container">
				<view class="rating-rules-title">评分比例要求（总人数：{{subjects.length}}人）</view>
				<view class="rating-rules-content">
					<text class="rating-rules-text">评分时，91-100分的占30%（{{calculateDistribution().high}}人），81-90分的占60%（{{calculateDistribution().middle}}人），80分以下的占10%（{{calculateDistribution().low}}人），请不要出现同分的情况。</text>
				</view>
			</view>
			
			<!-- 总分输入组件 -->
			<view class="total-input-container">
				<view class="total-input-header">
					<text class="total-input-title">总分评定</text>
					<text class="total-input-max">满分：100分</text>
				</view>
				<view class="total-input-hint emphasis">
					<text>请根据以上评分标准，直接输入总分</text>
				</view>
				<view class="total-input">
					<slider :min="0" :max="100" :value="getTotalScoreValue()" :step="1" :show-value="false"
						@change="handleTotalScoreChange" block-color="#07c160" activeColor="#07c160" block-size="40" style="width: 85%;" />
					<view class="score-input-box" @click="showScoreInput">
						<text class="score-value">{{calculateTotalScore()}}</text>
					</view>
				</view>
				<view class="total-input-hint">
					<text class="total-display">当前总分：<text class="total-current">{{calculateTotalScore()}}</text>分</text>
					<text class="score-input-tip">(点击数字可直接输入)</text>
				</view>
			</view>
			
			<!-- 提交按钮 -->
			<view class="submit-container">
				<button type="primary" @click="handleSubmit">提交评分</button>
			</view>
			</view>
			
		<!-- 无考核对象提示 -->
		<view class="no-subjects" v-if="!subjects || subjects.length === 0">
			<text>暂无考核对象</text>
		</view>
		
		<!-- 分数输入弹窗 -->
		<uni-popup ref="popup" type="center" :mask-click="false">
			<view class="score-popup-container">
				<view class="score-popup-header">
					<text class="score-popup-title">输入分数</text>
				</view>
				<view class="score-popup-content">
					<input type="number" v-model="inputScore" class="score-popup-input" placeholder="请输入分数(0-100)" />
				</view>
				<view class="score-popup-buttons">
					<button class="score-popup-button cancel" @click="cancelInput">取消</button>
					<button class="score-popup-button confirm" @click="confirmInput">确定</button>
				</view>
			</view>
		</uni-popup>
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
				existingRating: null,
				allScores: {},
				subjectRatingStatus: [],
				pendingSubmissions: [],
				inputScore: '',
				tableTypes: {
					1: 'A类班子评分',
					2: 'A类驻村工作评分',
					3: 'B类分管班子评分',
					4: 'B类驻村工作评分',
					5: 'B类办主任评分'
				}
			}
		},
		computed: {
			subjectOptions() {
				if (!this.subjects) return [];
				
				return this.subjects.map(item => {
					if (!item) return {};
					
					const score = this.getSubjectTotalScore(item._id);
					return {
						_id: item._id || '',
						name: score ? `${item.name || ''} (${score}分)` : (item.name || ''),
						position: item.position || '',
						department: item.department || ''
					}
				});
			},
			hasUnsubmittedRatings() {
				return this.pendingSubmissions && this.pendingSubmissions.length > 0;
			}
		},
		onLoad(options) {
			if (options && options.tableId) {
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
		onReady() {
			// 不需要手动设置popup属性
		},
		methods: {
			// 获取本地存储的用户信息
			getUserInfo() {
				let userInfo = uni.getStorageSync('userInfo');
				console.log('获取本地用户信息(原始):', userInfo);
				
				if (typeof userInfo === 'string') {
					try {
						userInfo = JSON.parse(userInfo);
						console.log('解析后的用户信息:', userInfo);
					} catch (e) {
						console.error('解析用户信息失败:', e);
						userInfo = {};
					}
				} else if (!userInfo) {
					userInfo = {};
				}
				
				return userInfo;
			},
			
			// 检查用户信息
			checkUserInfo() {
				let userInfo = this.getUserInfo();
				console.log('当前用户信息检查:', userInfo);
				
				if (!userInfo || Object.keys(userInfo).length === 0) {
					console.error('用户信息完全不存在!');
					uni.showToast({
						title: '用户信息不存在，请重新登录',
						icon: 'none',
						duration: 2000
					});
					// 延迟跳转到登录页
					setTimeout(() => {
						uni.navigateTo({
							url: '/pages/login/login'
						});
					}, 2000);
					return false;
				}
				
				if (!userInfo.username) {
					console.error('用户名不存在! userInfo类型:', typeof userInfo, 'userInfo:', JSON.stringify(userInfo));
					uni.showToast({
						title: '用户登录状态已失效，请重新登录',
						icon: 'none',
						duration: 2000
					});
					// 延迟跳转到登录页
					setTimeout(() => {
						uni.navigateTo({
							url: '/pages/login/login'
						});
					}, 2000);
					return false;
				}
				
				console.log('用户信息验证通过:', userInfo.username);
				return userInfo;
			},
			
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
			
			// 加载评分表详情
			loadTableDetail() {
				console.log('开始加载评分表详情, tableId:', this.tableId);
				
				// 检查用户信息
				if (!this.checkUserInfo()) {
					return;
				}
				
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
					
					if (res.result && res.result.code === 0) {
						this.table = res.result.data.table || {};
						this.subjects = res.result.data.subjects || [];
						console.log('评分表信息:', this.table);
						console.log('考核对象数量:', this.subjects.length);
						
						// 初始化评分项
						this.initScores();
						
						// 初始化评分状态数组
						if (this.subjects && this.subjects.length > 0) {
							this.subjectRatingStatus = new Array(this.subjects.length).fill(false);
						} else {
							this.subjectRatingStatus = [];
						}
						
						// 如果有考核对象，默认选择第一个
						if (this.subjects && this.subjects.length > 0) {
							this.currentSubject = this.subjects[0] || {};
							console.log('默认选择第一个考核对象:', this.currentSubject.name || '未命名');
							// 加载所有考核对象的评分状态
							this.loadAllRatingStatus();
						}
					} else {
						uni.showToast({
							title: res.result && res.result.msg || '加载失败',
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
				console.log('初始化评分项 - 考核对象:', this.currentSubject ? this.currentSubject.name : '未选择');
				
				if (!this.table || !this.table.items || !this.table.items.length) {
					this.scores = [];
					return;
				}
				
				this.scores = this.table.items.map(item => {
					if (!item) return { item_id: '', name: '', score: 0, maxScore: 0 };
					
					return {
						item_id: item._id || '',
						name: item.name || '',
						score: 0,
						maxScore: item.maxScore || 0
					};
				});
				console.log('初始化后的评分项(已重置为0分):', this.scores);
			},
			
			// 处理考核对象选择变化
			handleSubjectChange(e) {
				if (!e || !e.detail) return;
				
				const index = e.detail.value;
				if (index === undefined || index === null) return;
				
				console.log('选择考核对象变更, 从', this.currentSubjectIndex, '到', index);
				this.currentSubjectIndex = index;
				
				if (this.subjects && index >= 0 && index < this.subjects.length) {
					this.currentSubject = this.subjects[index] || {};
					
					// 重置评分
					this.initScores();
					
					// 加载已有评分记录
					this.loadExistingRating();
				}
			},
			
			// 加载已有评分记录
			loadExistingRating() {
				console.log('开始加载当前考核对象评分记录:', this.currentSubject ? this.currentSubject.name : '未选择');
				
				// 获取并检查用户信息
				const userInfo = this.getUserInfo();
				if (!userInfo || !userInfo.username) {
					console.error('加载评分记录时用户未登录!');
					return;
				}
				
				console.log('当前用户信息:', userInfo);
				
				// 确保当前考核对象存在
				if (!this.currentSubject || !this.currentSubject.name) {
					console.error('当前考核对象无效，无法加载评分');
					return;
				}
				
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
					if (res.result && res.result.code === 0 && res.result.data) {
						const rating = res.result.data.rating;
						
						// 严格验证返回的评分数据是否匹配当前考核对象
						if (rating && rating.subject && this.currentSubject && rating.subject === this.currentSubject.name) {
							this.existingRating = rating;
							console.log('已有评分记录:', this.existingRating);
						
							// 填充已有评分
							if (this.existingRating && this.existingRating.scores && this.existingRating.scores.length > 0) {
								// 更新评分项分数
								if (this.scores && this.scores.length > 0) {
									this.existingRating.scores.forEach((score, index) => {
										if (index < this.scores.length && score) {
											this.scores[index].score = score.score || 0;
										}
									});
								}
								
								// 更新评分状态
								if (this.subjectRatingStatus && this.currentSubjectIndex >= 0 && 
									this.currentSubjectIndex < this.subjectRatingStatus.length) {
									this.$set(this.subjectRatingStatus, this.currentSubjectIndex, true);
									console.log('更新评分状态, 索引:', this.currentSubjectIndex, '状态:', this.subjectRatingStatus);
								}
								
								// 存储到allScores中，避免切换后丢失
								if (this.currentSubject._id && this.scores) {
									this.allScores[this.currentSubject._id] = JSON.parse(JSON.stringify(this.scores));
									console.log('保存评分到allScores:', this.currentSubject._id, this.allScores[this.currentSubject._id]);
								}
							}
						} else {
							console.error('服务器返回了错误的评分对象数据:', 
										 rating ? `返回对象: ${rating.subject}, 当前对象: ${this.currentSubject.name}` : '无数据');
							// 清空评分，因为没有找到对应的评分记录
							this.existingRating = null;
							this.initScores(); // 重新初始化评分
							console.log('为当前考核对象创建新评分');
						}
					} else {
						console.log('获取评分记录失败或无数据');
						// 确保当前评分已重置
						this.existingRating = null;
					}
				}).catch(err => {
					console.error('加载评分记录失败:', err);
					this.existingRating = null;
				});
			},
			
			// 处理评分变化
			handleScoreChange(e, index) {
				if (!e || !e.detail || index === undefined || index === null) return;
				
				const score = e.detail.value;
				if (this.scores && index >= 0 && index < this.scores.length) {
					this.scores[index].score = score;
				}
			},
			
			// 计算总分
			calculateTotalScore() {
				let total = 0;
				if (this.scores) {
					this.scores.forEach(item => {
						if (item) {
							total += parseInt(item.score || 0);
						}
					});
				}
				return total;
			},
			
			// 计算最高分
			calculateMaxScore() {
				let max = 0;
				if (this.scores) {
					this.scores.forEach(item => {
						if (item) {
							max += parseInt(item.maxScore || 0);
						}
					});
				}
				return max;
			},
			
			// 提交评分
			handleSubmit() {
				if (!this.currentSubject || !this.currentSubject._id) {
					uni.showToast({
						title: '请选择考核对象',
						icon: 'none'
					});
					return;
				}
				
				// 验证分数
				let valid = true;
				if (this.scores) {
					this.scores.forEach(item => {
						if (item && (item.score < 0 || item.score > item.maxScore)) {
							valid = false;
						}
					});
				}
				
				if (!valid) {
					uni.showToast({
						title: '评分不能超出范围',
						icon: 'none'
					});
					return;
				}
				
				// 获取并检查用户信息
				const userInfo = this.getUserInfo();
				console.log('提交评分前的用户信息:', userInfo);
				
				// 检查用户信息是否存在
				if (!userInfo || !userInfo.username) {
					console.error('提交评分时用户未登录或登录状态已失效!');
					uni.showToast({
						title: '用户信息不存在或已过期，请重新登录',
						icon: 'none',
						duration: 2000
					});
					// 延迟跳转到登录页
					setTimeout(() => {
						uni.navigateTo({
							url: '/pages/login/login'
						});
					}, 2000);
					return;
				}
				
				uni.showLoading({
					title: '提交中...'
				});
				
				uniCloud.callFunction({
					name: 'rating',
					data: {
						action: 'submitRating',
						data: {
							table_id: this.tableId,
							rater: userInfo.username,
							subject: this.currentSubject.name,
							scores: this.scores
						}
					}
				}).then(res => {
					uni.hideLoading();
					
					if (res.result && res.result.code === 0) {
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
							total_score: this.calculateTotalScore()
						};
						
						// 更新状态
						if (this.subjectRatingStatus && 
							this.currentSubjectIndex >= 0 && 
							this.currentSubjectIndex < this.subjectRatingStatus.length) {
							this.$set(this.subjectRatingStatus, this.currentSubjectIndex, true);
						}
						
						// 从待提交列表中移除
						if (this.pendingSubmissions && this.currentSubject._id) {
							const index = this.pendingSubmissions.indexOf(this.currentSubject._id);
							if (index > -1) {
								this.pendingSubmissions.splice(index, 1);
							}
						}
						
						// 自动进入下一个未评分的对象
						this.goToNextUnrated();
					} else {
						uni.showToast({
							title: res.result && res.result.msg || '提交失败',
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
				
				// 验证索引
				if (index === undefined || index === null || 
				    !this.subjects || index < 0 || index >= this.subjects.length) {
					console.error('无效的考核对象索引:', index);
					return;
				}
				
				// 保存当前评分
				if (this.currentSubject && this.currentSubject._id) {
					this.saveCurrentRating();
				}
				
				this.currentSubjectIndex = index;
				this.currentSubject = this.subjects[index] || {};
				
				// 确保当前对象有效
				if (this.currentSubject && this.currentSubject._id) {
					this.loadSubjectRating();
				} else {
					console.error('当前考核对象无效:', this.currentSubject);
				}
			},
			saveCurrentRating() {
				if (!this.currentSubject || !this.currentSubject._id) return;
				
				console.log('保存当前评分:', this.currentSubject.name || '未命名');
				
				if (this.scores) {
					this.allScores[this.currentSubject._id] = JSON.parse(JSON.stringify(this.scores));
					console.log('保存的分数:', this.allScores[this.currentSubject._id]);
				}
				
				if (this.pendingSubmissions && 
				    this.currentSubject._id && 
				    !this.pendingSubmissions.includes(this.currentSubject._id)) {
					this.pendingSubmissions.push(this.currentSubject._id);
					console.log('添加到待提交列表:', this.pendingSubmissions);
				}
			},
			loadSubjectRating() {
				console.log('=== 加载考核对象评分 ===');
				
				if (!this.currentSubject) {
					console.error('当前考核对象为空');
					return;
				}
				
				console.log('考核对象名称:', this.currentSubject.name || '未命名');
				console.log('考核对象ID:', this.currentSubject._id || '无ID');
				
				if (this.allScores && this.currentSubject._id && this.allScores[this.currentSubject._id]) {
					console.log('从缓存加载评分:', this.allScores[this.currentSubject._id]);
					// 创建深拷贝，避免引用问题
					this.scores = JSON.parse(JSON.stringify(this.allScores[this.currentSubject._id]));
					console.log('已加载缓存评分，当前分数:', this.calculateTotalScore());
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
				if (this.subjects && this.currentSubjectIndex < this.subjects.length - 1) {
					this.switchToSubject(this.currentSubjectIndex + 1);
				}
			},
			goToNextUnrated() {
				if (!this.subjects || !this.subjectRatingStatus) return;
				
				for (let i = 0; i < this.subjects.length; i++) {
					if (i < this.subjectRatingStatus.length && !this.subjectRatingStatus[i]) {
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
				if (!this.pendingSubmissions || this.pendingSubmissions.length === 0) {
					uni.showToast({
						title: '没有待提交的评分',
						icon: 'none'
					});
					return;
				}
				
				uni.showLoading({
					title: '批量提交中...'
				});
				
				// 获取并检查用户信息
				const userInfo = this.getUserInfo();
				console.log('批量提交评分前的用户信息:', userInfo);
				
				// 检查用户信息是否存在
				if (!userInfo || !userInfo.username) {
					console.error('批量提交评分时用户未登录或登录状态已失效!');
					uni.hideLoading();
					uni.showToast({
						title: '用户信息不存在或已过期，请重新登录',
						icon: 'none',
						duration: 2000
					});
					// 延迟跳转到登录页
					setTimeout(() => {
						uni.navigateTo({
							url: '/pages/login/login'
						});
					}, 2000);
					return;
				}
				
				const promises = this.pendingSubmissions.map(subjectId => {
					const subject = this.subjects ? this.subjects.find(s => s && s._id === subjectId) : null;
					const scores = this.allScores && subjectId ? this.allScores[subjectId] : null;
					
					if (!subject || !scores) return Promise.resolve({ result: { code: -1 } });
					
					return uniCloud.callFunction({
						name: 'rating',
						data: {
							action: 'submitRating',
							data: {
								table_id: this.tableId,
								rater: userInfo.username,
								subject: subject.name,
								scores: scores
							}
						}
					});
				});
				
				Promise.all(promises).then(results => {
					uni.hideLoading();
					
					const successCount = results.filter(res => res.result && res.result.code === 0).length;
					
					this.pendingSubmissions = [];
					
					if (this.subjects && this.subjects.length > 0) {
						this.subjectRatingStatus = this.subjects.map(() => true);
					}
					
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
				
				// 获取并检查用户信息
				const userInfo = this.getUserInfo();
				console.log('加载评分状态的用户信息:', userInfo);
				
				if (!userInfo || !userInfo.username) {
					console.error('加载评分状态时用户未登录!');
					return;
				}
				
				// 显示加载指示器
				uni.showLoading({
					title: '加载评分数据...'
				});
				
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
					
					if (res.result && res.result.code === 0 && res.result.data && res.result.data.ratings) {
						const ratings = res.result.data.ratings || [];
						console.log('评分记录数量:', ratings.length);
						
						// 重置评分状态，确保没有历史状态干扰
						if (this.subjects && this.subjects.length > 0) {
							this.subjectRatingStatus = new Array(this.subjects.length).fill(false);
						} else {
							this.subjectRatingStatus = [];
							return;
						}
						
						// 处理每个评分记录
						ratings.forEach(rating => {
							if (!rating || !rating.subject) return;
							
							console.log('处理评分记录:', rating.subject);
							// 找到对应的考核对象索引
							const subjectIndex = this.subjects.findIndex(s => s && s.name === rating.subject);
							console.log('考核对象索引:', subjectIndex, '匹配考核对象:', (this.subjects[subjectIndex] && this.subjects[subjectIndex].name) || '未找到');
							
							if (subjectIndex !== -1 && this.subjects[subjectIndex]) {
								const subject = this.subjects[subjectIndex];
								
								// 确保评分记录与考核对象名称严格匹配
								if (rating.subject === subject.name) {
									// 更新评分状态
									if (this.subjectRatingStatus && subjectIndex >= 0 && subjectIndex < this.subjectRatingStatus.length) {
										this.$set(this.subjectRatingStatus, subjectIndex, true);
										console.log('更新评分状态, 索引:', subjectIndex, '状态:', this.subjectRatingStatus);
									}
									
									// 存储评分数据
									if (rating.scores && rating.scores.length > 0 && subject._id) {
										// 确保allScores中有该考核对象的记录
										if (!this.allScores[subject._id]) {
											if (this.table && this.table.items && this.table.items.length > 0) {
												this.allScores[subject._id] = this.table.items.map(item => {
													if (!item) return { item_id: '', name: '', score: 0, maxScore: 0 };
													
													return {
														item_id: item._id || '',
														name: item.name || '',
														score: 0,
														maxScore: item.maxScore || 0
													};
												});
											} else {
												this.allScores[subject._id] = [];
											}
										}
										
										// 更新分数
										rating.scores.forEach((score, idx) => {
											if (this.allScores[subject._id] && idx < this.allScores[subject._id].length) {
												this.allScores[subject._id][idx].score = score.score || 0;
											}
										});
										console.log('更新分数:', subject._id, this.allScores[subject._id]);
									}
								} else {
									console.error('考核对象名称不匹配:', '评分记录中的名称:', rating.subject, '考核对象名称:', subject.name);
								}
							} else {
								console.warn('未找到评分记录对应的考核对象:', rating.subject);
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
			},
			// 获取考核对象的总分
			getSubjectTotalScore(subjectId) {
				if (!subjectId) return null;
				
				// 如果已有缓存的评分数据
				if (this.allScores && this.allScores[subjectId]) {
					// 从缓存中获取总分
					const scores = this.allScores[subjectId];
					if (scores && scores.length > 0) {
						const totalScore = scores.reduce((total, item) => {
							return total + parseInt(item && item.score || 0);
						}, 0);
						return totalScore || null;
					}
				}
				
				// 如果没有缓存数据，返回null
				return null;
			},
			getTotalScoreValue() {
				return this.calculateTotalScore();
			},
			// 处理总分变化
			handleTotalScoreChange(e) {
				if (!e || !e.detail) return;
				
				const totalScore = e.detail.value;
				if (totalScore === undefined || totalScore === null) return;
				
				if (totalScore >= 0 && totalScore <= 100) {
					// 计算各项分数比例
					const totalMaxScore = this.calculateMaxScore();
					if (totalMaxScore <= 0 || !this.table || !this.table.items) return;
					
					// 根据总分自动分配到各评分项
					this.scores = this.table.items.map(item => {
						if (!item) return { item_id: '', name: '', score: 0, maxScore: 0 };
						
						// 按权重分配总分
						const proportion = (item.maxScore || 0) / totalMaxScore;
						const itemScore = Math.round(totalScore * proportion);
						
						return {
							item_id: item._id || '',
							name: item.name || '',
							score: itemScore,
							maxScore: item.maxScore || 0
						};
					});
					
					// 处理舍入误差，确保总分准确
					const calculatedTotal = this.calculateTotalScore();
					if (calculatedTotal !== totalScore && this.scores && this.scores.length > 0) {
						// 调整最后一项分数以确保总分正确
						const diff = totalScore - calculatedTotal;
						const lastIndex = this.scores.length - 1;
						if (this.scores[lastIndex]) {
							this.scores[lastIndex].score = (this.scores[lastIndex].score || 0) + diff;
						}
					}
					
					console.log('根据总分自动分配后的评分:', this.scores, '总分:', this.calculateTotalScore());
				}
			},
			// 显示分数输入弹窗
			showScoreInput() {
				this.inputScore = this.calculateTotalScore().toString();
				if (this.$refs.popup) {
					this.$refs.popup.open();
				}
			},
			
			// 取消输入
			cancelInput() {
				if (this.$refs.popup) {
					this.$refs.popup.close();
				}
			},
			
			// 确认输入
			confirmInput() {
				console.log('确认分数输入:', this.inputScore);
				// 使用输入的值更新分数
				if (this.inputScore && !isNaN(this.inputScore) && parseInt(this.inputScore) >= 0 && parseInt(this.inputScore) <= 100) {
					// 使用handleTotalScoreChange来处理总分修改
					this.handleTotalScoreChange({
						detail: { value: parseInt(this.inputScore) }
					});
				}
				if (this.$refs.popup) {
					this.$refs.popup.close();
				}
			},
			// 计算评分分布人数
			calculateDistribution() {
				if (!this.subjects || !this.subjects.length) {
					return { high: 0, middle: 0, low: 0 };
				}
				
				const total = this.subjects.length;
				// 计算各分数段人数
				let high = Math.round(total * 0.3); // 91-100分占30%
				let middle = Math.round(total * 0.6); // 81-90分占60%
				let low = total - high - middle; // 80分以下占10%
				
				// 确保low至少为1人(如果总人数够的话)
				if (low < 1 && total > 2) {
					// 优先从middle减
					if (middle > 1) {
						middle -= 1;
						low = 1;
					} else if (high > 1) {
						high -= 1;
						low = 1;
					}
				}
				
				// 确保总和正确
				const sum = high + middle + low;
				if (sum !== total) {
					// 如果总和不等于总人数，调整middle
					middle += (total - sum);
				}
				
				return { high, middle, low };
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
		padding: 10px 15px;
		margin-right: 12px;
		background-color: #f2f2f2;
		border-radius: 20px;
		position: relative;
		min-width: 100rpx;
	}
	
	.subject-tab.active {
		background-color: #07c160;
		color: white;
	}
	
	.subject-tab.active .subject-score-value {
		color: #ffffff;
	}
	
	.subject-info {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	
	.subject-name {
		font-size: 28rpx;
		margin-bottom: 4rpx;
	}
	
	.subject-score-value {
		font-size: 24rpx;
		color: #2196f3;
		font-weight: bold;
	}
	
	.subject-status {
		position: absolute;
		right: -6px;
		top: -6px;
		background-color: #ff7043;
		color: white;
		font-size: 20rpx;
		padding: 3px 8px;
		border-radius: 16rpx;
		z-index: 2;
	}
	
	.subject-nav {
		display: flex;
		justify-content: space-between;
		margin-top: 10rpx;
	}
	
	/* 评分内容区 */
	.rating-content {
		background-color: #fff;
		border-radius: 16rpx;
		padding: 30rpx;
		margin-bottom: 30rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
	}
	
	/* 参考标准样式 */
	.reference-container {
		margin-bottom: 20rpx;
		background-color: #f8f8f8;
		border-radius: 16rpx;
		padding: 20rpx;
		border: 1rpx solid #eeeeee;
	}
	
	.reference-header {
		display: flex;
		align-items: center;
		margin-bottom: 20rpx;
		padding-bottom: 15rpx;
		border-bottom: 1rpx solid #eeeeee;
	}
	
	.reference-title {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
	}
	
	.reference-subtitle {
		font-size: 24rpx;
		color: #666;
		margin-left: 10rpx;
	}
	
	.reference-items {
		display: flex;
		flex-direction: column;
	}
	
	.reference-item {
		margin-bottom: 20rpx;
		padding-bottom: 20rpx;
		border-bottom: 1rpx dashed #eeeeee;
	}
	
	.reference-item:last-child {
		margin-bottom: 0;
		border-bottom: none;
	}
	
	.reference-item-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 10rpx;
	}
	
	.reference-item-name {
		font-size: 30rpx;
		font-weight: bold;
		color: #333;
	}
	
	.reference-item-score {
		font-size: 28rpx;
		color: #07c160;
		font-weight: bold;
	}
	
	.reference-item-desc {
		font-size: 26rpx;
		color: #666;
		line-height: 1.5;
	}
	
	/* 评分比例规则提示 */
	.rating-rules-container {
		margin-bottom: 20rpx;
		background-color: #fff8e6;
		border-radius: 16rpx;
		padding: 20rpx;
		border: 2rpx solid #ffebba;
		box-shadow: 0 2rpx 10rpx rgba(255, 193, 7, 0.1);
	}
	
	.rating-rules-title {
		font-size: 32rpx;
		font-weight: bold;
		color: #ff9800;
		margin-bottom: 10rpx;
	}
	
	.rating-rules-content {
		font-size: 28rpx;
		color: #333;
		line-height: 1.6;
	}
	
	.rating-rules-text {
		font-weight: 500;
	}
	
	/* 总分输入组件样式 */
	.total-input-container {
		margin-bottom: 20rpx;
		background-color: #f0f9f4;
		border-radius: 16rpx;
		padding: 25rpx;
		border: 2rpx solid #e0f2e9;
		box-shadow: 0 4rpx 12rpx rgba(7, 193, 96, 0.15);
	}
	
	.total-input-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 15px;
	}
	
	.total-input-title {
		font-size: 36rpx;
		font-weight: bold;
		color: #07c160;
	}
	
	.total-input-max {
		font-size: 28rpx;
		color: #666;
		background-color: rgba(7, 193, 96, 0.1);
		padding: 4rpx 16rpx;
		border-radius: 20rpx;
	}
	
	.total-input {
		height: 140rpx;
		border: 1rpx solid #e0f2e9;
		border-radius: 12rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 20rpx;
		background-color: #ffffff;
		box-shadow: 0 2rpx 8rpx rgba(7, 193, 96, 0.1);
		margin: 15rpx 0;
	}
	
	.total-input slider {
		margin: 0 auto;
	}
	
	/* 修改滑块样式，增强触摸区域 */
	.total-input /deep/ .uni-slider-handle {
		width: 50rpx !important;
		height: 50rpx !important;
		border-radius: 50% !important;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.2) !important;
	}
	
	/* 调整滑块轨道的高度 */
	.total-input /deep/ .uni-slider-track {
		height: 12rpx !important;
		border-radius: 6rpx !important;
	}
	
	.score-input-box {
		min-width: 80rpx;
		height: 80rpx;
		background-color: #07c160;
		border-radius: 40rpx;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 0 20rpx;
		box-shadow: 0 2rpx 8rpx rgba(7, 193, 96, 0.2);
		margin-left: 10rpx;
	}
	
	.score-value {
		font-size: 32rpx;
		color: #ffffff;
		font-weight: bold;
		text-align: center;
	}
	
	.score-input-tip {
		font-size: 24rpx;
		color: #999;
		margin-left: 10rpx;
	}
	
	.score-popup-container {
		width: 80%;
		background-color: #fff;
		border-radius: 16rpx;
		overflow: hidden;
		box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.15);
	}
	
	.score-popup-header {
		padding: 24rpx;
		text-align: center;
		border-bottom: 1rpx solid #f2f2f2;
	}
	
	.score-popup-title {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
	}
	
	.score-popup-content {
		padding: 30rpx 24rpx;
	}
	
	.score-popup-input {
		width: 100%;
		height: 80rpx;
		border: 1rpx solid #e0e0e0;
		border-radius: 8rpx;
		padding: 0 20rpx;
		font-size: 32rpx;
		text-align: center;
		box-sizing: border-box;
	}
	
	.score-popup-buttons {
		display: flex;
		border-top: 1rpx solid #f2f2f2;
	}
	
	.score-popup-button {
		flex: 1;
		height: 90rpx;
		line-height: 90rpx;
		text-align: center;
		font-size: 30rpx;
		margin: 0;
		border-radius: 0;
		border: none;
		background-color: #fff;
		padding: 0;
	}
	
	.score-popup-button.cancel {
		color: #666;
		border-right: 1rpx solid #f2f2f2;
	}
	
	.score-popup-button.confirm {
		color: #07c160;
		font-weight: bold;
	}
	
	/* 调整滑块与输入框的布局 */
	.total-input-hint {
		font-size: 26rpx;
		color: #666;
		margin: 12rpx 0;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	
	.total-input-hint.emphasis {
		font-weight: bold;
		color: #07c160;
		text-align: center;
		justify-content: center;
		margin-bottom: 0;
	}
	
	.total-display {
		font-size: 28rpx;
		color: #666;
	}
	
	.total-current {
		font-size: 32rpx;
		font-weight: bold;
		color: #07c160;
	}
	
	/* 提交按钮样式 */
	.submit-container {
		margin-top: 30rpx;
	}
	
	.no-subjects {
		text-align: center;
		padding: 50rpx;
		color: #999;
	}
</style> 