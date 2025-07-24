<template>
	<view class="container">
		<view class="header">
			<text class="header-title">评分表分组</text>
			<button class="add-btn" @click="showAddGroupModal">
				<text class="btn-icon">+</text>
				<text>新建表格组</text>
			</button>
		</view>
		
		<!-- 操作按钮区域 -->
		<view class="action-section">
			<!-- 导出A类评分功能 -->
			<button class="export-btn" @click="exportATypeRatings">导出A类评分汇总表</button>
			
			<!-- 导出B类评分功能 -->
			<button class="export-btn b-type" @click="exportBTypeRatings">导出B类评分汇总表</button>
			
		</view>
		
		<view class="year-list" v-if="years.length > 0">
			<view class="year-item" v-for="(year, index) in years" :key="index" @click="navigateToTablesWithYear(year)">
				<view class="year-card">
					<text class="year-text">{{year.year}}年</text>
					<text class="table-count">{{year.tableCount}}张表格</text>
					<text class="group-desc" v-if="year.description">{{year.description}}</text>
					
					<view class="year-actions">
						<button class="action-btn delete-group" @click.stop="confirmDeleteGroup(year)">
							<text>删除</text>
						</button>
						<button class="action-btn add-table" @click.stop="createTableInGroup(year)">
							<text>新增表格</text>
						</button>
					</view>
				</view>
			</view>
		</view>
		
		<view class="no-data" v-else>
			<text class="no-data-text">暂无表格组，请创建</text>
		</view>
		
		<!-- 新建表格组弹窗 -->
		<uni-popup ref="addGroupPopup" type="center">
			<view class="popup-content">
				<view class="popup-title">新建表格组</view>
				<view class="form-item">
					<text class="form-label">年份</text>
					<input v-model="formData.year" class="form-input" placeholder="请输入年份，如：2023" type="number" />
				</view>
				<view class="form-item">
					<text class="form-label">备注说明</text>
					<input v-model="formData.description" class="form-input" placeholder="请输入识别标识（如：第一季度/上半年）" />
				</view>
				<view class="popup-btns">
					<button class="cancel-btn" size="mini" @click="hideAddGroupPopup">取消</button>
					<button class="confirm-btn" size="mini" @click="submitAddGroup">确定</button>
				</view>
			</view>
		</uni-popup>
		
		<!-- 删除确认弹窗 -->
		<uni-popup ref="deleteConfirmPopup" type="center">
			<view class="popup-content">
				<view class="popup-title">确认删除</view>
				<view class="popup-message">
					<text>确定要删除"{{deleteGroupData.year}}年{{deleteGroupData.description ? ' (' + deleteGroupData.description + ')' : ''}}"表格组吗？</text>
					<text class="warning-text">删除后将无法恢复，该组下的所有表格也将被删除！</text>
				</view>
				<view class="popup-btns">
					<button class="cancel-btn" size="mini" @click="hideDeleteConfirmPopup">取消</button>
					<button class="confirm-btn delete-btn" size="mini" @click="submitDeleteGroup">确定删除</button>
				</view>
			</view>
		</uni-popup>
		
		<!-- 导出A类评分弹窗 -->
		<uni-popup ref="exportPopup" type="center">
			<view class="popup-content">
				<view class="popup-title">{{exportData.exportType === 'B' ? '导出B类评分汇总表' : '导出A类评分汇总表'}}</view>
				
				<!-- 导出表单 - 未开始导出时显示 -->
				<view v-if="!exportTask.inProgress">
					<view class="form-item">
						<text class="form-label">选择年度</text>
						<picker @change="handleYearChange" :value="exportData.yearIndex" :range="years" range-key="year">
							<view class="picker-box">
								<text class="picker-text">{{years[exportData.yearIndex]?.year || '请选择年度'}}{{years[exportData.yearIndex]?.description ? ' (' + years[exportData.yearIndex].description + ')' : ''}}</text>
							</view>
						</picker>
					</view>
					<view class="popup-btns">
						<button class="preview-btn" size="mini" @click="previewExport">预览</button>
						<button class="cancel-btn" size="mini" @click="hideExportPopup">取消</button>
						<button class="confirm-btn" size="mini" @click="confirmExport">确定</button>
					</view>
				</view>
				
				<!-- 导出进度 - 导出进行中显示 -->
				<view v-else class="export-progress-container">
					<view class="progress-title">{{exportTask.message || '正在处理...'}}</view>
					
					<view class="progress-bar-container">
						<view class="progress-bar" :style="{width: exportTask.progress + '%'}"></view>
					</view>
					<view class="progress-text">{{exportTask.progress}}%</view>
					
					<view class="popup-btns" v-if="exportTask.status === 'failed'">
						<button class="confirm-btn" size="mini" @click="hideExportPopup">关闭</button>
					</view>
				</view>
			</view>
		</uni-popup>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				years: [],
				isLoading: false,
				formData: {
					year: new Date().getFullYear().toString(), // 默认当前年份
					description: ''
				},
				exportData: {
					yearIndex: 0,
					year: null,
					group_id: null,
					description: null,
					exportType: 'A' // A或B类导出
				},
				// 导出任务状态
				exportTask: {
					taskId: '',
					polling: false,
					inProgress: false,
					progress: 0,
					message: '',
					status: '',
					result: null
				},
				// 删除表格组数据
				deleteGroupData: {
					_id: '',
					year: '',
					description: '',
					tableCount: 0
				}
			}
		},
		onShow() {
			this.loadData();
		},
		methods: {
			// 加载表格组数据
			async loadData() {
				this.isLoading = true;
				
				try {
					const result = await uniCloud.callFunction({
						name: 'ratingTable',
						data: {
							action: 'getGroups',
							data: {}
						}
					});
					
					if (result.result.code === 0) {
						this.years = result.result.data;
						// 默认选择第一个年度
						if (this.years.length > 0) {
							this.exportData.yearIndex = 0;
							this.exportData.year = this.years[0].year;
							this.exportData.group_id = this.years[0]._id;
							this.exportData.description = this.years[0].description || '';
						}
					} else {
						uni.showToast({
							title: '获取数据失败',
							icon: 'none'
						});
					}
				} catch (e) {
					console.error('加载表格组数据失败:', e);
					uni.showToast({
						title: '加载数据失败',
						icon: 'none'
					});
				} finally {
					this.isLoading = false;
				}
			},
			
			// 跳转到指定年份的表格列表
			navigateToTablesWithYear(year) {
				uni.navigateTo({
					url: `/pages/admin/tables/tables?year=${year.year}&group_id=${year._id}`
				});
			},
			
			// 在特定年份组中创建新表格
			createTableInGroup(year) {
				uni.navigateTo({
					url: `/pages/admin/tables/tables?year=${year.year}&group_id=${year._id}&createNew=true`
				});
			},
			
			// 显示新建表格组弹窗
			showAddGroupModal() {
				this.$refs.addGroupPopup.open();
			},
			
			// 隐藏新建表格组弹窗
			hideAddGroupPopup() {
				this.$refs.addGroupPopup.close();
			},
			
			// 提交新建表格组
			async submitAddGroup() {
				const year = this.formData.year.trim();
				if (!year) {
					uni.showToast({
						title: '请输入年份',
						icon: 'none'
					});
					return;
				}
				
				// 检查是否为有效的年份格式
				if (!/^20\d{2}$/.test(year)) {
					uni.showToast({
						title: '请输入有效的年份',
						icon: 'none'
					});
					return;
				}
				
				try {
					const result = await uniCloud.callFunction({
						name: 'ratingTable',
						data: {
							action: 'createGroup',
							data: {
								year: this.formData.year,
								description: this.formData.description
							}
						}
					});
					
					if (result.result.code === 0) {
						uni.showToast({
							title: '创建成功',
							icon: 'success'
						});
						
						this.hideAddGroupPopup();
						
						// 重新加载数据
						await this.loadData();
						
						// 创建成功后跳转到创建表格页面
						const newGroup = this.years.find(group => group.year === this.formData.year);
						if (newGroup) {
							this.createTableInGroup(newGroup);
						}
					} else {
						uni.showToast({
							title: result.result.msg || '创建失败',
							icon: 'none'
						});
					}
				} catch (e) {
					console.error('创建表格组失败:', e);
					uni.showToast({
						title: '创建失败',
						icon: 'none'
					});
				}
			},
			
			// 导出A类评分表
			exportATypeRatings() {
				this.exportData.exportType = 'A';
				this.$refs.exportPopup.open();
			},
			
			// 导出B类评分表
			exportBTypeRatings() {
				this.exportData.exportType = 'B';
				this.$refs.exportPopup.open();
			},
			
			// 隐藏导出A类评分弹窗
			hideExportPopup() {
				this.$refs.exportPopup.close();
				
				// 如果有正在进行的导出任务，取消轮询
				if (this.exportTask.polling) {
					this.exportTask.polling = false;
				}
				
				// 重置导出任务状态
				setTimeout(() => {
					this.exportTask = {
						taskId: '',
						polling: false,
						inProgress: false,
						progress: 0,
						message: '',
						status: '',
						result: null
					};
				}, 300);
			},
			
			// 选择年度变化
			handleYearChange(e) {
				const index = e.detail.value;
				this.exportData.yearIndex = index;
				this.exportData.year = this.years[index].year;
				this.exportData.group_id = this.years[index]._id;
				this.exportData.description = this.years[index].description || '';
			},
			
			// 检查是否有A类评分表（通过云函数检查，避免权限问题）
			async checkATypeRatings() {
				try {
					// 使用云函数检查是否有A类评分表
					const result = await uniCloud.callFunction({
						name: 'ratingTable',
						data: {
							action: 'checkATypeRatings',
							data: {
								group_id: this.exportData.group_id,
								year: this.exportData.year
							}
						}
					});
					
					console.log('检查A类评分表结果:', result.result);
					
					if (result.result.code === 0) {
						return {
							success: true,
							count: result.result.count || 0,
							hasATypeRatings: result.result.hasATypeRatings || false,
							hasBanziTable: result.result.hasBanziTable || false,
							hasZhucunTable: result.result.hasZhucunTable || false
						};
					} else {
						return {
							success: false,
							error: result.result.msg || '检查失败'
						};
					}
				} catch (e) {
					console.error('检查A类评分表失败:', e);
					return {
						success: false,
						error: e.message
					};
				}
			},
			
			// 确认导出
			async confirmExport() {
				if (!this.exportData.year) {
					uni.showToast({
						title: '请选择年度',
						icon: 'none'
					});
					return;
				}
				
				console.log(`开始${this.exportData.exportType}类导出操作，参数：`, JSON.stringify(this.exportData));
				
				// 如果是A类导出，先检查是否有A类评分表
				if (this.exportData.exportType === 'A') {
					const checkResult = await this.checkATypeRatings();
					console.log('检查A类评分表结果:', JSON.stringify(checkResult));
					
					if (checkResult.success) {
						if (!checkResult.hasATypeRatings) {
							uni.hideLoading();
							
							let message = `未找到${this.exportData.year}年度的A类评分表，`;
							if (!checkResult.hasBanziTable && !checkResult.hasZhucunTable) {
								message += '请先创建班子评分表和驻村工作评分表';
							} else if (!checkResult.hasBanziTable) {
								message += '请先创建班子评分表';
							} else if (!checkResult.hasZhucunTable) {
								message += '请先创建驻村工作评分表';
							}
							
							uni.showModal({
								title: '提示',
								content: message,
								showCancel: false
							});
							return;
						}
					} else {
						// 检查失败
						uni.showModal({
							title: '导出失败',
							content: checkResult.error || '检查评分表失败',
							showCancel: false
						});
						return;
					}
				}
				
				// 重置导出任务状态
				this.exportTask = {
					taskId: '',
					polling: false,
					inProgress: true,
					progress: 0,
					message: '正在创建导出任务...',
					status: 'pending',
					result: null
				};
				
				try {
					console.log(`开始增量导出${this.exportData.exportType}类评分汇总表，参数:`, JSON.stringify({
						group_id: this.exportData.group_id,
						year: this.exportData.year,
						description: this.exportData.description || ''
					}));
					
					// 调用云函数创建导出任务
					const result = await uniCloud.callFunction({
						name: 'ratingTable',
						data: {
							action: this.exportData.exportType === 'A' ? 'startExportATypeRatings' : 'startExportBTypeRatings',
							data: {
								group_id: this.exportData.group_id,
								year: this.exportData.year,
								description: this.exportData.description || ''
							}
						}
					});
					
					console.log('创建导出任务返回结果:', JSON.stringify(result.result));
					
					if (result.result.code === 0) {
						// 获取任务ID，开始轮询任务状态
						this.exportTask.taskId = result.result.data.task_id;
						this.exportTask.message = '导出任务已创建，正在处理...';
						this.exportTask.polling = true;
						
						// 开始轮询任务状态
						this.startPollingTaskStatus();
					} else {
						// 显示更详细的错误信息
						console.error('创建导出任务失败:', JSON.stringify(result.result));
						this.exportTask.inProgress = false;
						this.exportTask.message = result.result.msg || '创建导出任务失败';
						this.exportTask.status = 'failed';
						
						uni.showModal({
							title: '导出失败',
							content: result.result.msg || '创建导出任务失败',
							showCancel: false
						});
					}
				} catch (e) {
					console.error('创建导出任务失败:', JSON.stringify(e));
					this.exportTask.inProgress = false;
					this.exportTask.message = '创建导出任务失败: ' + e.message;
					this.exportTask.status = 'failed';
					
					uni.showToast({
						title: '导出失败',
						icon: 'none'
					});
				}
			},
			
			// 开始轮询任务状态
			startPollingTaskStatus() {
				if (!this.exportTask.taskId || !this.exportTask.polling) {
					return;
				}
				
				// 定义轮询间隔（1秒）
				const pollingInterval = 1000;
				
				// 创建轮询函数
				const pollStatus = async () => {
					if (!this.exportTask.polling) {
						return;
					}
					
					try {
						const result = await uniCloud.callFunction({
							name: 'ratingTable',
							data: {
								action: 'getExportTaskStatus',
								data: {
									task_id: this.exportTask.taskId
								}
							}
						});
						
						if (result.result.code === 0) {
							const taskData = result.result.data;
							this.exportTask.progress = taskData.progress;
							this.exportTask.message = taskData.message;
							this.exportTask.status = taskData.status;
							
							if (taskData.status === 'completed') {
								// 任务完成，停止轮询
								this.exportTask.polling = false;
								this.exportTask.inProgress = false;
								this.exportTask.result = taskData.result;
								
								// 显示成功消息
								uni.showToast({
									title: '导出成功',
									icon: 'success'
								});
								
								// 下载文件
								this.downloadExportedFile(taskData.result.fileUrl);
							} else if (taskData.status === 'failed') {
								// 任务失败，停止轮询
								this.exportTask.polling = false;
								this.exportTask.inProgress = false;
								
								uni.showModal({
									title: '导出失败',
									content: taskData.message || '导出任务执行失败',
									showCancel: false
								});
							} else {
								// 任务仍在进行中，继续轮询
								setTimeout(pollStatus, pollingInterval);
							}
						} else {
							// API返回错误，停止轮询
							this.exportTask.polling = false;
							this.exportTask.inProgress = false;
							this.exportTask.status = 'failed';
							this.exportTask.message = result.result.msg || '获取任务状态失败';
							
							uni.showModal({
								title: '导出失败',
								content: result.result.msg || '获取任务状态失败',
								showCancel: false
							});
						}
					} catch (error) {
						console.error('获取任务状态失败:', error);
						
						// 发生错误，但不立即停止轮询，再尝试几次
						setTimeout(pollStatus, pollingInterval * 2); // 出错后加倍轮询间隔
					}
				};
				
				// 开始第一次轮询
				setTimeout(pollStatus, pollingInterval);
			},
			
			// 下载导出的文件
			downloadExportedFile(fileUrl) {
				console.log('获取到文件URL:', fileUrl);
				
				// 在浏览器环境下提示下载链接
				// #ifdef H5
				console.log('H5环境，打开新窗口下载');
				window.open(fileUrl, '_blank');
				// #endif
				
				// 在APP环境下下载文件
				// #ifdef APP-PLUS
				console.log('APP环境，开始下载文件');
				uni.showLoading({
					title: '正在下载文件...'
				});
				
				// 下载文件到手机
				const downloadTask = uni.downloadFile({
					url: fileUrl,
					success: (res) => {
						console.log('下载成功:', JSON.stringify(res));
						uni.hideLoading();
						
						if (res.statusCode === 200) {
							uni.showLoading({
								title: '准备打开文件...'
							});
							
							uni.saveFile({
								tempFilePath: res.tempFilePath,
								success: (saveRes) => {
									console.log('保存成功:', JSON.stringify(saveRes));
									uni.hideLoading();
									
									// 尝试打开文档
									uni.openDocument({
										filePath: saveRes.savedFilePath,
										showMenu: true,
										success: () => {
											console.log('打开文档成功');
										},
										fail: (err) => {
											console.error('打开文档失败:', JSON.stringify(err));
											uni.showModal({
												title: '无法打开文件',
												content: '文件已下载成功，但无法自动打开。请检查是否安装了相应的应用程序打开此类文件。',
												confirmText: '我知道了',
												showCancel: false
											});
										},
										complete: () => {
											uni.hideLoading();
										}
									});
								},
								fail: (err) => {
									console.error('保存文件失败:', JSON.stringify(err));
									uni.hideLoading();
									uni.showModal({
										title: '保存失败',
										content: '文件下载成功，但保存到本地时出错: ' + (err.errMsg || JSON.stringify(err)),
										showCancel: false
									});
								}
							});
						} else {
							uni.showToast({
								title: '下载失败: ' + res.statusCode,
								icon: 'none',
								duration: 2000
							});
						}
					},
					fail: (err) => {
						console.error('下载文件失败:', JSON.stringify(err));
						uni.hideLoading();
						uni.showModal({
							title: '下载失败',
							content: '无法下载文件: ' + (err.errMsg || JSON.stringify(err)),
							showCancel: false
						});
					}
				});
				
				// 监听下载进度
				downloadTask.onProgressUpdate((res) => {
					console.log('下载进度:', res.progress);
					if (res.progress > 0) {
						uni.showLoading({
							title: '下载中: ' + res.progress + '%'
						});
					}
				});
				// #endif
				
				// #ifdef MP-WEIXIN
				console.log('微信小程序环境，开始下载文件');
				uni.showLoading({
					title: '正在下载文件...'
				});
				
				uni.downloadFile({
					url: fileUrl,
					success: (res) => {
						uni.hideLoading();
						console.log('下载成功:', JSON.stringify(res));
						if (res.statusCode === 200) {
							uni.showLoading({
								title: '准备打开文件...'
							});
							
							wx.openDocument({
								filePath: res.tempFilePath,
								showMenu: true,
								success: function () {
									console.log('打开文档成功');
								},
								fail: function(err) {
									console.error('打开文件失败:', JSON.stringify(err));
									uni.showModal({
										title: '无法打开文件',
										content: '文件已下载成功，但无法打开，请确认是否安装了相应的应用程序',
										showCancel: false
									});
								},
								complete: function() {
									uni.hideLoading();
								}
							})
						}
					},
					fail: (err) => {
						uni.hideLoading();
						console.error('下载文件失败:', JSON.stringify(err));
						uni.showModal({
							title: '下载失败',
							content: '无法下载文件: ' + (err.errMsg || JSON.stringify(err)),
							showCancel: false
						});
					}
				});
				// #endif
				
				this.hideExportPopup();
			},
			
			// 查看评分详情表
			viewRatingsDetail() {
				uni.navigateTo({
					url: '/pages/admin/ratings/ratings-detail'
				});
			},
			
			// 预览导出评分表
			async previewExport() {
				if (!this.exportData.year) {
					uni.showToast({
						title: '请选择年度',
						icon: 'none'
					});
					return;
				}
				
				// 如果是A类导出，先检查是否有A类评分表
				if (this.exportData.exportType === 'A') {
					const checkResult = await this.checkATypeRatings();
					
					if (checkResult.success) {
						if (!checkResult.hasATypeRatings) {
							let message = `未找到${this.exportData.year}年度的A类评分表，`;
							if (!checkResult.hasBanziTable && !checkResult.hasZhucunTable) {
								message += '请先创建班子评分表和驻村工作评分表';
							} else if (!checkResult.hasBanziTable) {
								message += '请先创建班子评分表';
							} else if (!checkResult.hasZhucunTable) {
								message += '请先创建驻村工作评分表';
							}
							
							uni.showModal({
								title: '提示',
								content: message,
								showCancel: false
							});
							return;
						}
						
						// 隐藏导出弹窗
						this.hideExportPopup();
						
						// 跳转到预览页面
						uni.navigateTo({
							url: `/pages/admin/ratings/ratings-preview?group_id=${this.exportData.group_id}&year=${this.exportData.year}&description=${this.exportData.description || ''}`
						});
					} else {
						// 检查失败
						uni.showModal({
							title: '预览失败',
							content: checkResult.error || '检查评分表失败',
							showCancel: false
						});
					}
				} else {
					// B类评分预览 - 目前没有实现B类预览
					uni.showToast({
						title: 'B类评分预览功能暂未实现',
						icon: 'none'
					});
				}
			},
			
			// 显示删除表格组确认弹窗
			confirmDeleteGroup(group) {
				this.deleteGroupData = {
					_id: group._id,
					year: group.year,
					description: group.description || '',
					tableCount: group.tableCount || 0
				};
				this.$refs.deleteConfirmPopup.open();
			},
			
			// 隐藏删除表格组确认弹窗
			hideDeleteConfirmPopup() {
				this.$refs.deleteConfirmPopup.close();
			},
			
			// 提交删除表格组
			async submitDeleteGroup() {
				if (!this.deleteGroupData._id) {
					uni.showToast({
						title: '删除失败，无效的表格组ID',
						icon: 'none'
					});
					return;
				}
				
				try {
					uni.showLoading({
						title: '正在删除...',
						mask: true
					});
					
					const result = await uniCloud.callFunction({
						name: 'ratingTable',
						data: {
							action: 'deleteGroup',
							data: {
								id: this.deleteGroupData._id
							}
						}
					});
					
					uni.hideLoading();
					
					if (result.result.code === 0) {
						uni.showToast({
							title: '删除成功',
							icon: 'success'
						});
						
						this.hideDeleteConfirmPopup();
						
						// 重新加载数据
						await this.loadData();
					} else {
						uni.showModal({
							title: '删除失败',
							content: result.result.msg || '删除表格组失败',
							showCancel: false
						});
					}
				} catch (e) {
					uni.hideLoading();
					console.error('删除表格组失败:', e);
					uni.showModal({
						title: '删除失败',
						content: '系统错误，请稍后再试',
						showCancel: false
					});
				}
			}
		}
	}
</script>

<style>
	.container {
		padding: 20rpx;
	}
	
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 30rpx;
	}
	
	.header-title {
		font-size: 36rpx;
		font-weight: bold;
	}
	
	.add-btn, .export-btn, .view-ratings-btn {
		background-color: #007AFF;
		color: #FFFFFF;
		font-size: 28rpx;
		padding: 10rpx 30rpx;
		border-radius: 30rpx;
		display: flex;
		align-items: center;
		margin-bottom: 10rpx;
	}
	
	.export-btn {
		background-color: #0A8D2E;
	}
	
	.preview-btn {
		background-color: #5856D6;
		color: #FFFFFF;
		margin-right: 10rpx;
	}
	
	.export-btn.b-type {
		background-color: #FF9500;
		margin-left: 10rpx;
	}
	
	.action-section {
		display: flex;
		flex-wrap: wrap;
		gap: 15rpx;
		margin-bottom: 20rpx;
	}
	
	.btn-icon {
		font-size: 32rpx;
		margin-right: 5rpx;
	}
	
	.year-list {
		display: flex;
		flex-direction: column;
		gap: 20rpx;
		margin-top: 20rpx;
	}
	
	.year-item {
		border-radius: 10rpx;
		overflow: hidden;
	}
	
	.year-card {
		background-image: linear-gradient(45deg, #3B7EF7, #6BA6FF);
		padding: 40rpx;
		display: flex;
		flex-direction: column;
		gap: 10rpx;
		border-radius: 10rpx;
		box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.1);
		position: relative;
	}
	
	.year-text {
		font-size: 48rpx;
		font-weight: bold;
		color: #FFFFFF;
	}
	
	.table-count {
		font-size: 28rpx;
		color: rgba(255, 255, 255, 0.9);
	}

	.group-desc {
		font-size: 26rpx;
		color: rgba(255, 255, 255, 0.9);
		margin-top: 10rpx;
		font-weight: bold;
		background-color: rgba(255, 255, 255, 0.15);
		padding: 8rpx 15rpx;
		border-radius: 6rpx;
		display: inline-block;
	}
	
	.year-actions {
		position: absolute;
		right: 20rpx;
		bottom: 20rpx;
	}
	
	.action-btn {
		background-color: rgba(255, 255, 255, 0.2);
		color: #FFFFFF;
		font-size: 24rpx;
		padding: 8rpx 20rpx;
		border-radius: 30rpx;
		border: 1px solid #FFFFFF;
		margin-left: 10rpx;
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
		margin-top: 20rpx;
	}
	
	.popup-content {
		background-color: #FFFFFF;
		border-radius: 10rpx;
		padding: 30rpx;
		width: 600rpx;
	}
	
	.popup-title {
		font-size: 32rpx;
		font-weight: bold;
		margin-bottom: 30rpx;
		text-align: center;
	}
	
	.form-item {
		margin-bottom: 20rpx;
	}
	
	.form-label {
		display: block;
		font-size: 28rpx;
		margin-bottom: 10rpx;
	}
	
	.form-input, .picker-box {
		width: 100%;
		height: 80rpx;
		border: 1px solid #DDDDDD;
		border-radius: 8rpx;
		padding: 0 20rpx;
		font-size: 28rpx;
		display: flex;
		align-items: center;
	}
	
	.popup-btns {
		display: flex;
		justify-content: space-between;
		margin-top: 30rpx;
		width: 100%;
		color: #FFFFFF;
		margin-left: 10rpx;
	}
	
	.cancel-btn, .confirm-btn, .preview-btn {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 70rpx;
		border-radius: 8rpx;
		font-size: 28rpx;
	}
	
	.popup-btns {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
	}
	
	.cancel-btn {
		width: 45%;
		background-color: #F2F2F2;
		color: #333333;
	}
	
	.confirm-btn {
		width: 45%;
		background-color: #007AFF;
		color: #FFFFFF;
	}

	.export-progress-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding-top: 20rpx;
	}

	.progress-title {
		font-size: 28rpx;
		color: #333333;
		margin-bottom: 20rpx;
	}

	.progress-bar-container {
		width: 100%;
		height: 10rpx;
		background-color: #E0E0E0;
		border-radius: 5rpx;
		margin-bottom: 10rpx;
		overflow: hidden;
	}

	.progress-bar {
		height: 100%;
		background: linear-gradient(to right, #007AFF, #6BA6FF);
		border-radius: 5rpx;
		transition: width 0.3s ease-in-out;
	}

	.progress-text {
		font-size: 24rpx;
		color: #666666;
	}

	.action-btn.delete-group {
		background-color: rgba(255, 63, 63, 0.2);
		border-color: #FF3F3F;
		margin-right: 10rpx;
	}
	
	.popup-message {
		text-align: center;
		margin-bottom: 20rpx;
		font-size: 28rpx;
		line-height: 1.5;
		display: flex;
		flex-direction: column;
	}
	
	.warning-text {
		color: #FF3B30;
		font-size: 24rpx;
		margin-top: 10rpx;
	}

	.confirm-btn.delete-btn {
		background-color: #FF3B30;
	}

</style> 