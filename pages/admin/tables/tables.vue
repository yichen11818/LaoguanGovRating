<template>
	<view class="container">
		<view class="filter-bar">
			<view class="filter-item">
				<picker @change="handleTypeChange" :value="currentTypeIndex" :range="typeOptions" range-key="name">
					<view class="picker-box">
						<text class="picker-text">{{typeOptions[currentTypeIndex].name}}</text>
					</view>
				</picker>
			</view>
			
			<button class="add-btn" @click="showAddTableModal">
				<text class="btn-icon">+</text>
				<text>新增评分表</text>
			</button>
		</view>
		
		<view class="table-list">
			<view class="no-data" v-if="tables.length === 0">
				<image class="no-data-icon" src="/static/images/no-data.png" mode="aspectFit"></image>
				<text class="no-data-text">暂无评分表</text>
			</view>
			
			<view class="table-item" v-for="(table, index) in tables" :key="index" @click="navigateToDetail(table._id)">
				<view class="table-header">
					<view class="title-wrapper">
						<text class="table-name">{{table.name}}</text>
						<text class="table-type">{{getTableTypeName(table.type)}}</text>
					</view>
					
					<view class="table-actions">
						<view class="action-btn edit" @click.stop="editTable(table)">
							<text class="action-icon">✏️</text>
						</view>
					</view>
				</view>
				
				<view class="table-info">
					<view class="info-item">
						<text class="info-label">分类:</text>
						<text class="info-value">{{table.category || '无'}}</text>
					</view>
					<view class="info-item">
						<text class="info-label">评分人:</text>
						<text class="info-value">{{table.rater}}</text>
					</view>
					<view class="info-item">
						<text class="info-label">项目数:</text>
						<text class="info-value">{{table.items ? table.items.length : 0}}</text>
					</view>
				</view>
			</view>
		</view>
		
		<!-- 加载更多 -->
		<view class="load-more" v-if="tables.length > 0 && hasMoreData">
			<button class="load-btn" size="mini" @click="loadMore" :loading="isLoading">
				<text v-if="!isLoading">加载更多</text>
				<text v-else>加载中...</text>
			</button>
		</view>
		
		<!-- 新增评分表弹窗 -->
		<uni-popup ref="addTablePopup" type="center">
			<view class="popup-content">
				<view class="popup-title">新增评分表</view>
				<view class="form-item">
					<text class="form-label">表名称</text>
					<input v-model="formData.name" class="form-input" placeholder="请输入评分表名称" />
				</view>
				<view class="form-item">
					<text class="form-label">表类型</text>
					<picker @change="handleFormTypeChange" :value="formData.typeIndex" :range="typeOptions" range-key="name">
						<view class="form-picker">
							<text>{{typeOptions[formData.typeIndex].name}}</text>
							<text class="picker-arrow">▼</text>
						</view>
					</picker>
				</view>
				<view class="form-item">
					<text class="form-label">分类</text>
					<input v-model="formData.category" class="form-input" placeholder="请输入分类，如便民服务、党建办等" />
				</view>
				<view class="form-item">
					<text class="form-label">评分人</text>
					<picker @change="handleRaterChange" :value="currentRaterIndex" :range="raters" range-key="name">
						<view class="form-picker">
							<text>{{raters[currentRaterIndex].name || '请选择评分人'}}</text>
							<text class="picker-arrow">▼</text>
						</view>
					</picker>
				</view>
				
				<!-- 新增考核对象选择部分 -->
				<view class="form-item">
					<text class="form-label">考核对象</text>
					<view class="subjects-selector">
						<view class="selected-subjects">
							<view class="selected-subject" v-for="(subject, index) in formData.selectedSubjects" :key="index">
								<text>{{subject.name}}</text>
								<text class="remove-subject" @click="removeSelectedSubject(index)">×</text>
							</view>
						</view>
						<view class="add-subject-btn" @click="showSubjectSelector">
							<text class="add-icon">+</text>
							<text>添加考核对象</text>
						</view>
					</view>
				</view>
				
				<view class="popup-btns">
					<button class="cancel-btn" size="mini" @click="hideAddTablePopup">取消</button>
					<button class="confirm-btn" size="mini" @click="submitAddTable">确定</button>
				</view>
			</view>
		</uni-popup>
		
		<!-- 编辑评分表弹窗 -->
		<uni-popup ref="editTablePopup" type="center">
			<view class="popup-content">
				<view class="popup-title">编辑评分表</view>
				<view class="form-item">
					<text class="form-label">表名称</text>
					<input v-model="editData.name" class="form-input" placeholder="请输入评分表名称" />
				</view>
				<view class="form-item">
					<text class="form-label">表类型</text>
					<picker @change="handleEditTypeChange" :value="editData.typeIndex" :range="typeOptions" range-key="name">
						<view class="form-picker">
							<text>{{typeOptions[editData.typeIndex].name}}</text>
							<text class="picker-arrow">▼</text>
						</view>
					</picker>
				</view>
				<view class="form-item">
					<text class="form-label">分类</text>
					<input v-model="editData.category" class="form-input" placeholder="请输入分类，如便民服务、党建办等" />
				</view>
				
				<!-- 新增考核对象选择部分 -->
				<view class="form-item">
					<text class="form-label">考核对象</text>
					<view class="subjects-selector">
						<view class="selected-subjects">
							<view class="selected-subject" v-for="(subject, index) in editData.selectedSubjects" :key="index">
								<text>{{subject.name}}</text>
								<text class="remove-subject" @click="removeEditSubject(index)">×</text>
							</view>
						</view>
						<view class="add-subject-btn" @click="showEditSubjectSelector">
							<text class="add-icon">+</text>
							<text>添加考核对象</text>
						</view>
					</view>
				</view>
				
				<view class="popup-btns">
					<button class="cancel-btn" size="mini" @click="hideEditTablePopup">取消</button>
					<button class="confirm-btn" size="mini" @click="submitEditTable">确定</button>
				</view>
			</view>
		</uni-popup>
		
		<!-- 更换评分人弹窗 -->
		<uni-popup ref="changeRaterPopup" type="center">
			<view class="popup-content">
				<view class="popup-title">更换评分人</view>
				<view class="form-item">
					<text class="form-label">当前评分人</text>
					<text class="current-rater">{{changeRaterData.currentRater}}</text>
				</view>
				<view class="form-item">
					<text class="form-label">新评分人</text>
					<picker @change="handleNewRaterChange" :value="changeRaterData.newRaterIndex" :range="raters" range-key="name">
						<view class="form-picker">
							<text>{{raters[changeRaterData.newRaterIndex].name || '请选择新评分人'}}</text>
							<text class="picker-arrow">▼</text>
						</view>
					</picker>
				</view>
				<view class="popup-btns">
					<button class="cancel-btn" size="mini" @click="hideChangeRaterPopup">取消</button>
					<button class="confirm-btn" size="mini" @click="submitChangeRater">确定</button>
				</view>
			</view>
		</uni-popup>
		
		<!-- 考核对象选择弹窗 -->
		<uni-popup ref="subjectSelectorPopup" type="center" :mask-click="false">
			<view class="popup-content subject-selector-popup">
				<view class="popup-title">
					<text>选择考核对象</text>
					<text class="close-btn" @click="hideSubjectSelector">×</text>
				</view>
				
				<view class="search-box">
					<input v-model="subjectSearchKey" class="search-input" placeholder="搜索考核对象" confirm-type="search" @confirm="filterSubjects" focus />
				</view>
				
				<view class="subject-list-container">
					<view class="subject-item" v-for="(subject, index) in filteredSubjects" :key="index">
						<view class="subject-checkbox">
							<checkbox :checked="isSubjectSelected(subject)" @click="toggleSubjectSelection(subject)" />
						</view>
						<view class="subject-info" @click="toggleSubjectSelection(subject)">
							<text class="subject-name">{{subject.name}}</text>
							<text class="subject-department" v-if="subject.department">{{subject.department}}</text>
						</view>
					</view>
					
					<view class="no-data" v-if="filteredSubjects.length === 0">
						<text class="no-data-text">未找到匹配的考核对象</text>
					</view>
				</view>
				
				<view class="popup-btns fixed-bottom">
					<button class="cancel-btn" size="mini" @click="hideSubjectSelector">取消</button>
					<button class="confirm-btn" size="mini" @click="confirmSubjectSelection">确定 (已选 {{selectedSubjectIds.length}} 项)</button>
				</view>
			</view>
		</uni-popup>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				currentTypeIndex: 0,
				typeOptions: [
					{ id: 0, name: '全部类型' },
					{ id: 1, name: '(办公室)一般干部评分' },
					{ id: 2, name: '(驻村)干部评分' },
					{ id: 3, name: '班子评分-中层干部考核评分表（分别评分)' },
					{ id: 4, name: '班子评分-驻村干部考核' },
					{ id: 5, name: '班子评分-分管线上一般干部考核' }
				],
				tables: [],
				page: 1,
				pageSize: 10,
				total: 0,
				hasMoreData: false,
				isLoading: false,
				
				// 表单数据
				formData: {
					name: '',
					typeIndex: 1,
					category: '',
					rater: '',
					selectedSubjects: []
				},
				
				// 评分人列表
				raters: [{ username: '', name: '请选择评分人' }],
				currentRaterIndex: 0,
				
				// 编辑表单数据
				editData: {
					id: '',
					name: '',
					typeIndex: 1,
					category: '',
					selectedSubjects: []
				},
				
				// 更换评分人数据
				changeRaterData: {
					tableId: '',
					currentRater: '',
					newRaterIndex: 0
				},
				
				// 新增数据
				allSubjects: [], // 所有考核对象
				selectedSubjectIds: [], // 临时存储选中的考核对象ID
				subjectSearchKey: '', // 考核对象搜索关键词
				editingTableId: '' // 正在编辑的表ID
			}
		},
		computed: {
			// 过滤后的考核对象列表
			filteredSubjects() {
				if (!this.subjectSearchKey) {
					return this.allSubjects;
				}
				
				const key = this.subjectSearchKey.toLowerCase();
				return this.allSubjects.filter(subject => {
					return subject.name.toLowerCase().includes(key) || 
						   (subject.department && subject.department.toLowerCase().includes(key)) ||
						   (subject.position && subject.position.toLowerCase().includes(key));
				});
			}
		},
		onLoad() {
			this.loadTables();
			this.loadRaters();
			this.loadAllSubjects(); // 加载所有考核对象
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
			
			// 处理类型筛选变化
			handleTypeChange(e) {
				this.currentTypeIndex = e.detail.value;
				this.page = 1;
				this.tables = [];
				this.loadTables();
			},
			
			// 加载评分表
			loadTables() {
				this.isLoading = true;
				
				const type = this.typeOptions[this.currentTypeIndex].id;
				
				uniCloud.callFunction({
					name: 'ratingTable',
					data: {
						action: 'getTables',
						data: {
							type: type > 0 ? type : undefined,
							page: this.page,
							pageSize: this.pageSize
						}
					}
				}).then(res => {
					this.isLoading = false;
					
					if (res.result.code === 0) {
						const data = res.result.data;
						
						if (this.page === 1) {
							this.tables = data.list;
						} else {
							this.tables = this.tables.concat(data.list);
						}
						
						this.total = data.total;
						this.hasMoreData = this.tables.length < this.total;
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
				this.loadTables();
			},
			
			// 加载评分人列表
			loadRaters() {
				uniCloud.callFunction({
					name: 'user',
					data: {
						action: 'getUsers',
						data: {
							role: 'rater',
							pageSize: 100
						}
					}
				}).then(res => {
					if (res.result.code === 0) {
						const data = res.result.data;
						this.raters = [{ username: '', name: '请选择评分人' }].concat(data.list.map(item => {
							return {
								username: item.username,
								name: item.name || item.username
							};
						}));
					}
				});
			},
			
			// 导航到详情页
			navigateToDetail(tableId) {
				uni.navigateTo({
					url: `/pages/admin/items/items?tableId=${tableId}`
				});
			},
			
			// 显示新增评分表弹窗
			showAddTableModal() {
				// 重置表单
				this.formData = {
					name: '',
					typeIndex: 1,
					category: '',
					rater: '',
					selectedSubjects: []
				};
				this.currentRaterIndex = 0;
				
				this.$refs.addTablePopup.open();
			},
			
			// 隐藏新增评分表弹窗
			hideAddTablePopup() {
				this.$refs.addTablePopup.close();
			},
			
			// 处理表单类型变化
			handleFormTypeChange(e) {
				this.formData.typeIndex = e.detail.value;
			},
			
			// 处理评分人选择变化
			handleRaterChange(e) {
				this.currentRaterIndex = e.detail.value;
				if (this.currentRaterIndex > 0) {
					this.formData.rater = this.raters[this.currentRaterIndex].username;
				} else {
					this.formData.rater = '';
				}
			},
			
			// 提交新增评分表
			submitAddTable() {
				if (!this.formData.name) {
					uni.showToast({
						title: '请输入评分表名称',
						icon: 'none'
					});
					return;
				}
				
				if (!this.formData.rater) {
					uni.showToast({
						title: '请选择评分人',
						icon: 'none'
					});
					return;
				}
				
				uni.showLoading({
					title: '提交中...'
				});
				
				const type = this.typeOptions[this.formData.typeIndex].id;
				
				uniCloud.callFunction({
					name: 'ratingTable',
					data: {
						action: 'createTable',
						data: {
							name: this.formData.name,
							type: type,
							category: this.formData.category,
							rater: this.formData.rater,
							selectedSubjects: this.formData.selectedSubjects
						}
					}
				}).then(res => {
					uni.hideLoading();
					
					if (res.result.code === 0) {
						uni.showToast({
							title: '创建成功',
							icon: 'success'
						});
						
						this.hideAddTablePopup();
						this.page = 1;
						this.loadTables();
					} else {
						uni.showToast({
							title: res.result.msg || '创建失败',
							icon: 'none'
						});
					}
				}).catch(err => {
					uni.hideLoading();
					console.error(err);
					uni.showToast({
						title: '创建失败，请检查网络',
						icon: 'none'
					});
				});
			},
			
			// 编辑评分表
			editTable(table) {
				this.editingTableId = table._id;
				this.editData = {
					id: table._id,
					name: table.name,
					typeIndex: table.type,
					category: table.category || '',
					selectedSubjects: []
				};
				
				// 加载此表关联的考核对象
				uni.showLoading({
					title: '加载考核对象...'
				});
				
				uniCloud.callFunction({
					name: 'subject',
					data: {
						action: 'getSubjects',
						data: {
							table_id: table._id,
							pageSize: 1000
						}
					}
				}).then(res => {
					uni.hideLoading();
					
					if (res.result.code === 0) {
						this.editData.selectedSubjects = res.result.data.list || [];
					}
					
					this.$refs.editTablePopup.open();
				}).catch(err => {
					uni.hideLoading();
					console.error('加载考核对象失败:', err);
					this.$refs.editTablePopup.open(); // 即使失败也打开弹窗
				});
			},
			
			// 隐藏编辑评分表弹窗
			hideEditTablePopup() {
				this.$refs.editTablePopup.close();
			},
			
			// 处理编辑类型变化
			handleEditTypeChange(e) {
				this.editData.typeIndex = e.detail.value;
			},
			
			// 提交编辑评分表
			submitEditTable() {
				if (!this.editData.name) {
					uni.showToast({
						title: '请输入评分表名称',
						icon: 'none'
					});
					return;
				}
				
				uni.showLoading({
					title: '提交中...'
				});
				
				const type = this.typeOptions[this.editData.typeIndex].id;
				
				uniCloud.callFunction({
					name: 'ratingTable',
					data: {
						action: 'updateTable',
						data: {
							tableId: this.editData.id,
							updateData: {
								name: this.editData.name,
								type: type,
								category: this.editData.category,
								selectedSubjects: this.editData.selectedSubjects
							}
						}
					}
				}).then(res => {
					uni.hideLoading();
					
					if (res.result.code === 0) {
						uni.showToast({
							title: '更新成功',
							icon: 'success'
						});
						
						this.hideEditTablePopup();
						this.loadTables();
					} else {
						uni.showToast({
							title: res.result.msg || '更新失败',
							icon: 'none'
						});
					}
				}).catch(err => {
					uni.hideLoading();
					console.error(err);
					uni.showToast({
						title: '更新失败，请检查网络',
						icon: 'none'
					});
				});
			},
			
			// 显示更换评分人弹窗
			showChangeRaterModal(table) {
				this.changeRaterData = {
					tableId: table._id,
					currentRater: table.rater,
					newRaterIndex: 0
				};
				
				this.$refs.changeRaterPopup.open();
			},
			
			// 隐藏更换评分人弹窗
			hideChangeRaterPopup() {
				this.$refs.changeRaterPopup.close();
			},
			
			// 处理新评分人选择变化
			handleNewRaterChange(e) {
				this.changeRaterData.newRaterIndex = e.detail.value;
			},
			
			// 提交更换评分人
			submitChangeRater() {
				if (this.changeRaterData.newRaterIndex === 0) {
					uni.showToast({
						title: '请选择新评分人',
						icon: 'none'
					});
					return;
				}
				
				const newRater = this.raters[this.changeRaterData.newRaterIndex].username;
				
				if (newRater === this.changeRaterData.currentRater) {
					uni.showToast({
						title: '新旧评分人不能相同',
						icon: 'none'
					});
					return;
				}
				
				uni.showLoading({
					title: '提交中...'
				});
				
				uniCloud.callFunction({
					name: 'ratingTable',
					data: {
						action: 'changeRater',
						data: {
							tableId: this.changeRaterData.tableId,
							newRater: newRater
						}
					}
				}).then(res => {
					uni.hideLoading();
					
					if (res.result.code === 0) {
						uni.showToast({
							title: '更换成功',
							icon: 'success'
						});
						
						this.hideChangeRaterPopup();
						this.loadTables();
					} else {
						uni.showToast({
							title: res.result.msg || '更换失败',
							icon: 'none'
						});
					}
				}).catch(err => {
					uni.hideLoading();
					console.error(err);
					uni.showToast({
						title: '更换失败，请检查网络',
						icon: 'none'
					});
				});
			},
			
			// 确认删除
			confirmDelete(tableId) {
				uni.showModal({
					title: '确认删除',
					content: '删除后将无法恢复，是否继续？',
					success: res => {
						if (res.confirm) {
							this.deleteTable(tableId);
						}
					}
				});
			},
			
			// 删除评分表
			deleteTable(tableId) {
				uni.showLoading({
					title: '删除中...'
				});
				
				uniCloud.callFunction({
					name: 'ratingTable',
					data: {
						action: 'deleteTable',
						data: {
							tableId: tableId
						}
					}
				}).then(res => {
					uni.hideLoading();
					
					if (res.result.code === 0) {
						uni.showToast({
							title: '删除成功',
							icon: 'success'
						});
						
						// 更新列表
						this.tables = this.tables.filter(item => item._id !== tableId);
						if (this.tables.length === 0 && this.page > 1) {
							this.page--;
							this.loadTables();
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
			
			// 加载所有考核对象
			loadAllSubjects() {
				uni.showLoading({
					title: '加载考核对象...'
				});
				
				uniCloud.callFunction({
					name: 'subject',
					data: {
						action: 'getSubjects',
						data: {
							pageSize: 1000 // 尝试获取所有考核对象
						}
					}
				}).then(res => {
					uni.hideLoading();
					
					if (res.result.code === 0) {
						this.allSubjects = res.result.data.list || [];
					}
				}).catch(err => {
					uni.hideLoading();
					console.error('加载考核对象失败:', err);
				});
			},
			
			// 显示考核对象选择器
			showSubjectSelector() {
				this.selectedSubjectIds = this.formData.selectedSubjects.map(s => s._id);
				this.subjectSearchKey = ''; // 清空搜索关键词
				this.$refs.subjectSelectorPopup.open();
				
				// 使用setTimeout确保弹窗显示后再处理
				setTimeout(() => {
					// 这里可以添加额外的UI调整逻辑
					// 适应不同设备的屏幕大小等
				}, 300);
			},
			
			// 显示编辑时的考核对象选择器
			showEditSubjectSelector() {
				this.selectedSubjectIds = this.editData.selectedSubjects.map(s => s._id);
				this.subjectSearchKey = ''; // 清空搜索关键词
				this.$refs.subjectSelectorPopup.open();
				
				setTimeout(() => {
					// 同上
				}, 300);
			},
			
			// 隐藏考核对象选择器
			hideSubjectSelector() {
				this.$refs.subjectSelectorPopup.close();
				this.subjectSearchKey = '';
			},
			
			// 判断考核对象是否已选中
			isSubjectSelected(subject) {
				return this.selectedSubjectIds.includes(subject._id);
			},
			
			// 切换考核对象选中状态
			toggleSubjectSelection(subject) {
				const index = this.selectedSubjectIds.indexOf(subject._id);
				if (index > -1) {
					this.selectedSubjectIds.splice(index, 1);
				} else {
					this.selectedSubjectIds.push(subject._id);
				}
			},
			
			// 确认考核对象选择
			confirmSubjectSelection() {
				// 根据选中的ID获取完整的考核对象信息
				const selectedSubjects = this.allSubjects.filter(subject => 
					this.selectedSubjectIds.includes(subject._id)
				);
				
				// 判断是在新增还是编辑模式
				if (this.editingTableId) {
					this.editData.selectedSubjects = selectedSubjects;
				} else {
					this.formData.selectedSubjects = selectedSubjects;
				}
				
				this.hideSubjectSelector();
			},
			
			// 移除已选考核对象（新增表单）
			removeSelectedSubject(index) {
				this.formData.selectedSubjects.splice(index, 1);
			},
			
			// 移除已选考核对象（编辑表单）
			removeEditSubject(index) {
				this.editData.selectedSubjects.splice(index, 1);
			},
			
			// 添加一个新的过滤方法
			filterSubjects() {
				// 这里可以添加额外的过滤逻辑，比如延迟处理等
				// 现在只是为了适配UI
				console.log('搜索关键词:', this.subjectSearchKey);
			}
		}
	}
</script>

<style>
/* 全局变量和主题设置 */
page {
	--primary-color: #4080FF;
	--primary-light: #EBF2FF;
	--primary-gradient: linear-gradient(135deg, #4080FF, #5E96FF);
	--success-color: #07c160;
	--warning-color: #ff9900;
	--danger-color: #ff4d4f;
	--text-main: #333333;
	--text-regular: #666666; 
	--text-secondary: #999999;
	--text-light: #c0c4cc;
	--border-color: #EBEEF5;
	--border-light: #F2F6FC;
	--bg-color: #F8F8F8;
	--bg-light: #FFFFFF;
	--card-radius: 12rpx;
	--btn-radius: 40rpx;
	--shadow-sm: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
	--shadow-md: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
	--shadow-lg: 0 8rpx 24rpx rgba(0, 0, 0, 0.12);
	--transition-time: 0.3s;
}

/* 容器基础样式 */
.container {
	padding: 0 0 40rpx 0;
	background-color: var(--bg-color);
	min-height: 100vh;
	box-sizing: border-box;
}

/* 过滤栏样式 */
.filter-bar {
	position: sticky;
	top: 0;
	z-index: 100;
	background-color: var(--bg-light);
	padding: 24rpx 30rpx;
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	box-shadow: var(--shadow-sm);
	margin-bottom: 30rpx;
	border-bottom: 1rpx solid var(--border-color);
}

.filter-item {
	flex: 1;
	margin-bottom: 0;
	text-align: left;
}

.picker-box {
	display: inline-flex;
	align-items: center;
	font-size: 28rpx;
	color: var(--text-main);
	position: relative;
	padding: 12rpx 20rpx;
	background-color: var(--primary-light);
	border-radius: var(--btn-radius);
	transition: all var(--transition-time);
}

.picker-box::after {
	content: '';
	position: absolute;
	bottom: 0;
	left: 50%;
	transform: translateX(-50%);
	width: 20rpx;
	height: 4rpx;
	background-color: var(--primary-color);
	border-radius: 2rpx;
}

.picker-text {
	font-size: 28rpx;
	color: var(--primary-color);
	font-weight: 500;
}

.picker-arrow {
	font-size: 20rpx;
	color: var(--primary-color);
	margin-left: 8rpx;
}

.add-btn {
	background: var(--primary-gradient);
	color: #FFFFFF;
	border-radius: var(--btn-radius);
	font-size: 28rpx;
	font-weight: 500;
	padding: 0 40rpx;
	height: 70rpx;
	line-height: 70rpx;
	border: none;
	box-shadow: 0 6rpx 16rpx rgba(64, 128, 255, 0.3);
	display: flex;
	align-items: center;
	margin-top: 0;
	transition: all 0.2s ease;
}

.btn-icon {
	font-size: 32rpx;
	margin-right: 8rpx;
	font-weight: bold;
}

.add-btn:active {
	opacity: 0.9;
	transform: translateY(2rpx);
	box-shadow: 0 2rpx 8rpx rgba(64, 128, 255, 0.2);
}

/* 表格列表容器 */
.table-list {
	padding: 0 20rpx;
}

/* 表格项卡片样式 */
.table-item {
	position: relative;
	background-color: var(--bg-light);
	border-radius: var(--card-radius);
	margin-bottom: 24rpx;
	padding: 24rpx;
	border: 1rpx solid var(--border-light);
	box-shadow: var(--shadow-sm);
	transition: all var(--transition-time);
}

.table-item:active {
	transform: translateY(2rpx);
	box-shadow: var(--shadow-lg);
	border-color: var(--primary-light);
}

/* 表头样式 */
.table-header {
	position: relative;
	padding-bottom: 16rpx;
	border-bottom: 1rpx dashed var(--border-color);
	margin-bottom: 16rpx;
}

.title-wrapper {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	padding-right: 80rpx;
}

.table-name {
	font-size: 34rpx;
	font-weight: bold;
	color: var(--text-main);
	margin-bottom: 8rpx;
	line-height: 1.4;
}

.table-type {
	font-size: 22rpx;
	color: var(--primary-color);
	background-color: var(--primary-light);
	padding: 4rpx 16rpx;
	border-radius: 20rpx;
	line-height: 1.2;
}

/* 表格内容 */
.table-info {
	display: flex;
	flex-direction: column;
	padding: 10rpx 0;
	background: linear-gradient(to bottom, var(--bg-light), #FDFDFD);
	border-radius: 0 0 var(--card-radius) var(--card-radius);
}

.info-item {
	display: flex;
	align-items: center;
	margin-top: 12rpx;
	width: 100%;
}

.info-label {
	font-size: 26rpx;
	color: var(--text-secondary);
	width: auto;
	margin-right: 12rpx;
	font-weight: 500;
}

.info-value {
	font-size: 26rpx;
	color: var(--text-regular);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	flex: 1;
}

/* 操作按钮组 */
.table-actions {
	position: absolute;
	right: 0;
	top: 0;
	display: flex;
	z-index: 2;
}

.action-btn {
	width: 60rpx;
	height: 60rpx;
	background-color: var(--bg-light);
	margin-left: 16rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	box-shadow: var(--shadow-sm);
	border: 1rpx solid var(--border-light);
	transition: all 0.2s;
}

.action-btn.edit {
	color: var(--primary-color);
}

.action-btn:active {
	transform: scale(0.9);
	box-shadow: none;
}

.action-icon {
	font-size: 32rpx;
}

/* 无数据状态 */
.no-data {
	margin: 80rpx 20rpx;
	padding: 60rpx 40rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	background-color: var(--bg-light);
	border-radius: var(--card-radius);
	box-shadow: var(--shadow-sm);
	border: 1rpx solid var(--border-light);
}

.no-data-icon {
	width: 180rpx;
	height: 180rpx;
	margin-bottom: 30rpx;
	opacity: 0.8;
}

.no-data-text {
	font-size: 28rpx;
	color: var(--text-secondary);
	text-align: center;
}

/* 加载更多 */
.load-more {
	text-align: center;
	margin: 30rpx 0;
}

.load-btn {
	font-size: 26rpx;
	color: var(--text-secondary);
	background-color: var(--bg-light);
	border: 1rpx solid var(--border-color);
	border-radius: var(--btn-radius);
	padding: 10rpx 40rpx;
	box-shadow: var(--shadow-sm);
	display: inline-block;
}

.load-btn:active {
	opacity: 0.8;
	transform: translateY(2rpx);
}

/* 弹窗样式 */
.popup-content {
	background-color: var(--bg-light);
	border-radius: 16rpx;
	padding: 40rpx 30rpx;
	width: 600rpx;
	max-width: 90%;
	box-sizing: border-box;
	box-shadow: var(--shadow-lg);
}

.popup-title {
	text-align: center;
	font-size: 32rpx;
	font-weight: bold;
	color: var(--text-main);
	margin-bottom: 40rpx;
	position: relative;
}

.popup-title::after {
	content: '';
	position: absolute;
	bottom: -15rpx;
	left: 50%;
	transform: translateX(-50%);
	width: 60rpx;
	height: 4rpx;
	background-color: var(--primary-color);
	border-radius: 2rpx;
}

/* 表单样式 */
.form-item {
	margin-bottom: 28rpx;
}

.form-label {
	font-size: 26rpx;
	color: var(--text-regular);
	margin-bottom: 12rpx;
	display: block;
	font-weight: 500;
}

.form-input,
.form-picker,
.current-rater {
	height: 80rpx;
	border: 1rpx solid var(--border-color);
	border-radius: 8rpx;
	padding: 0 24rpx;
	font-size: 28rpx;
	width: 100%;
	box-sizing: border-box;
	background-color: #FAFAFA;
	transition: all var(--transition-time);
}

.form-input:focus,
.form-picker:active {
	border-color: var(--primary-color);
	background-color: #FFFFFF;
	box-shadow: 0 0 0 2rpx rgba(64, 128, 255, 0.1);
}

.form-picker {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.current-rater {
	line-height: 80rpx;
	background-color: #F5F7FA;
	color: var(--text-regular);
	display: block;
}

/* 弹窗按钮 */
.popup-btns {
	display: flex;
	justify-content: space-between;
	margin-top: 50rpx;
}

.cancel-btn,
.confirm-btn {
	width: 45%;
	border-radius: var(--btn-radius);
	font-size: 28rpx;
	padding: 16rpx 0;
	transition: all 0.2s;
}

.cancel-btn {
	background-color: #f5f5f5;
	color: var(--text-regular);
	border: 1rpx solid #ebebeb;
}

.cancel-btn:active {
	background-color: #ebebeb;
}

.confirm-btn {
	background: linear-gradient(to right, #07c160, #10ad7a);
	color: #fff;
	border: none;
	box-shadow: 0 6rpx 12rpx rgba(7, 193, 96, 0.2);
}

.confirm-btn:active {
	opacity: 0.9;
	transform: translateY(2rpx);
	box-shadow: 0 2rpx 6rpx rgba(7, 193, 96, 0.1);
}

/* 新增考核对象选择部分 */
.subjects-selector {
	margin-top: 10rpx;
}

.selected-subjects {
	display: flex;
	flex-wrap: wrap;
	margin-bottom: 20rpx;
}

.selected-subject {
	background-color: #f2f2f2;
	border-radius: 30rpx;
	padding: 10rpx 20rpx;
	margin-right: 16rpx;
	margin-bottom: 16rpx;
	display: flex;
	align-items: center;
}

.remove-subject {
	margin-left: 10rpx;
	color: #999;
	font-size: 24rpx;
}

.add-subject-btn {
	display: flex;
	align-items: center;
	background-color: #f5f5f5;
	padding: 16rpx 24rpx;
	border-radius: 8rpx;
	margin-top: 10rpx;
}

.add-icon {
	font-size: 28rpx;
	margin-right: 10rpx;
}

.subject-selector-popup {
	min-height: 750rpx;
	max-height: 90vh !important; /* 最大高度为视口高度的90% */
	width: 650rpx;
	position: relative;
	display: flex;
	flex-direction: column;
	padding-bottom: 120rpx; /* 为底部按钮留出空间 */
}

.popup-title {
	display: flex;
	justify-content: space-between;
	align-items: center;
	position: relative;
}

.close-btn {
	font-size: 40rpx;
	color: #999;
	position: absolute;
	right: 0;
	top: 50%;
	transform: translateY(-50%);
	width: 60rpx;
	height: 60rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.search-box {
	position: sticky;
	top: 0;
	z-index: 10;
	background-color: #fff;
	padding: 20rpx 0;
}

.search-input {
	background-color: #f5f5f5;
	padding: 16rpx 30rpx;
	border-radius: 40rpx;
	font-size: 28rpx;
}

.subject-list-container {
	flex: 1;
	overflow-y: auto;
	-webkit-overflow-scrolling: touch; /* 增强iOS滚动体验 */
	margin: 20rpx 0;
	padding-bottom: 20rpx;
	max-height: 60vh; /* 最大高度为视口高度的60% */
}

.subject-item {
	display: flex;
	padding: 24rpx 0;
	border-bottom: 1px solid #f5f5f5;
	align-items: center;
}

.subject-checkbox {
	margin-right: 20rpx;
}

.subject-info {
	flex: 1;
	padding: 10rpx 0;
}

.subject-name {
	font-size: 30rpx;
	font-weight: bold;
	margin-bottom: 6rpx;
}

.subject-department {
	font-size: 26rpx;
	color: #999;
}

.fixed-bottom {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	background-color: #fff;
	padding: 20rpx 30rpx;
	border-top: 1px solid #eee;
	display: flex;
	justify-content: space-between;
}

.popup-btns {
	padding-top: 20rpx;
}

.cancel-btn, 
.confirm-btn {
	margin: 0;
	padding: 0 40rpx;
	height: 80rpx;
	line-height: 80rpx;
	border-radius: 40rpx;
}

.confirm-btn {
	background: linear-gradient(to right, #07c160, #10ad7a);
	color: #fff;
	flex: 2;
	margin-left: 20rpx;
}

.cancel-btn {
	flex: 1;
	background-color: #f5f5f5;
}
</style> 