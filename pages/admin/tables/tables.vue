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
						<text class="info-value">{{getRaterName(table.rater)}}</text>
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
					<view class="picker-box" @click="showRaterSelector">
						<text class="picker-text">{{formData.rater ? (raters.find(r => r.username === formData.rater)?.name || formData.rater) : '请选择评分人'}}</text>
						<text class="picker-arrow">▼</text>
					</view>
				</view>
				
				<!-- 新增考核对象选择部分 -->
				<view class="form-item">
					<text class="form-label">考核对象</text>
					<view class="subjects-selector">
						<view class="selected-subjects">
							<view v-if="formData.selectedSubjects && formData.selectedSubjects.length > 0">
								<view class="selected-subject" v-for="(subject, index) in formData.selectedSubjects" :key="subject._id || index">
									<text>{{subject.name}}</text>
									<text class="remove-subject" @click="removeSelectedSubject(index)">×</text>
								</view>
							</view>
							<view v-else class="no-subjects-tip">未选择考核对象</view>
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
				
				<!-- 更新评分人选择部分 -->
				<view class="form-item">
					<text class="form-label">评分人</text>
					<view class="picker-box" @click="showEditRaterSelector">
						<text class="picker-text">{{editData.rater ? (raters.find(r => r.username === editData.rater)?.name || editData.rater) : '请选择评分人'}}</text>
						<text class="picker-arrow">▼</text>
					</view>
				</view>
				
				<!-- 新增考核对象选择部分 -->
				<view class="form-item">
					<text class="form-label">考核对象</text>
					<view class="subjects-selector">
						<view class="selected-subjects">
							<view v-if="editData.selectedSubjects && editData.selectedSubjects.length > 0">
								<view class="selected-subject" v-for="(subject, index) in editData.selectedSubjects" :key="subject._id || index">
									<text>{{subject.name}}</text>
									<text class="remove-subject" @click="removeEditSubject(index)">×</text>
								</view>
							</view>
							<view v-else class="no-subjects-tip">未选择考核对象</view>
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
					<view class="picker-box" @click="showChangeRaterSelector">
						<text class="picker-text">{{changeRaterData.newRater ? (raters.find(r => r.username === changeRaterData.newRater)?.name || changeRaterData.newRater) : '请选择新评分人'}}</text>
						<text class="picker-arrow">▼</text>
					</view>
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
				
				<!-- 添加选项卡 -->
				<view class="tabs-container">
					<view 
						v-for="(tab, index) in ['全部']" 
						:key="index"
						class="tab-item" 
						:class="{'active': currentSubjectTab === index}"
						@click="switchSubjectTab(index)">
						<text>{{tab}}</text>
					</view>
				</view>
				
				<!-- 搜索框 -->
				<view class="search-box">
					<input 
						:value="subjectSearchKey" 
						class="search-input" 
						placeholder="搜索考核对象" 
						confirm-type="search" 
						@input="handleSearchInput" 
						@confirm="filterSubjects" 
						focus 
					/>
					<view class="search-btn" @click="filterSubjects">
						<text class="search-icon">搜索</text>
					</view>
				</view>
				
				<!-- 批量选择操作 -->
				<view class="batch-actions">
					<text class="batch-action-hint">点击选择/取消</text>
					<view>
						<text class="batch-action-btn" @click="selectAllSubjects">全选</text>
						<text class="batch-action-btn" @click="clearSelectedSubjects">清除</text>
					</view>
				</view>
				
				<view class="subject-list-container">
					<view class="subject-item" v-for="(subject, index) in filteredSubjects" 
						  :key="index" 
						  @click="toggleSubjectSelection(subject)"
						  :class="{'subject-item-selected': isSubjectSelected(subject)}">
						<view class="subject-info">
							<text class="subject-name">{{subject.name}}</text>
							<text class="subject-department" v-if="subject.department">{{subject.department}}</text>
							<text class="subject-position" v-if="subject.position">{{subject.position}}</text>
							<text class="selected-tag" v-if="isSubjectSelected(subject)">已选</text>
						</view>
					</view>
					
					<view class="no-data" v-if="filteredSubjects.length === 0">
						<text class="no-data-text">未找到匹配的考核对象</text>
					</view>
					
					<!-- 添加考核对象加载更多按钮 -->
					<view class="load-more-subjects" v-if="hasMoreSubjects">
						<button class="load-more-btn" size="mini" @click="loadMoreSubjects" :loading="isLoadingSubjects">
							<text v-if="!isLoadingSubjects">加载更多</text>
							<text v-else>加载中...</text>
						</button>
					</view>
				</view>
				
				<view class="popup-btns fixed-bottom">
					<view class="selected-summary" v-if="selectedSubjectIds.length > 0">
						<view class="selected-count">已选择 {{selectedSubjectIds.length}} 项</view>
						<view class="selected-preview" v-if="selectedSubjectIds.length <= 3">
							<text v-for="(id, index) in selectedSubjectIds" :key="id" class="preview-item">
								{{getSubjectNameById(id)}}{{index < selectedSubjectIds.length - 1 ? '，' : ''}}
							</text>
						</view>
					</view>
					<button class="cancel-btn" size="mini" @click="hideSubjectSelector">取消</button>
					<button class="confirm-btn" size="mini" @click="confirmSubjectSelection">确定</button>
				</view>
			</view>
		</uni-popup>
		
		<!-- 评分人选择弹窗 -->
		<uni-popup ref="raterSelectorPopup" type="center" :mask-click="false">
			<view class="popup-content subject-selector-popup">
				<view class="popup-title">
					<text>选择评分人</text>
					<text class="close-btn" @click="hideRaterSelector">×</text>
				</view>
				
				<view class="search-box">
					<input 
						v-model="raterSearchKey" 
						class="search-input" 
						placeholder="搜索评分人" 
						confirm-type="search" 
						@input="filterRaters" 
						@confirm="filterRaters" 
						focus 
					/>
					<view class="search-btn" @click="filterRaters">
						<text class="search-icon">搜索</text>
					</view>
				</view>
				
				<view class="subject-list-container">
					<view class="subject-item" v-for="(rater, index) in filteredRaters" :key="index" @click="selectRater(rater)">
						<view class="subject-info">
							<text class="subject-name">{{rater.name}}</text>
							<text class="subject-department" v-if="rater.username">账号: {{rater.username}}</text>
						</view>
					</view>
					
					<view class="no-data" v-if="filteredRaters.length === 0">
						<text class="no-data-text">未找到匹配的评分人</text>
					</view>
				</view>
				
				<view class="popup-btns fixed-bottom">
					<button class="cancel-btn" size="mini" @click="hideRaterSelector">取消</button>
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
				raterSearchKey: '', // 评分人搜索关键词
				
				// 编辑表单数据
				editData: {
					id: '',
					name: '',
					typeIndex: 1,
					category: '',
					selectedSubjects: [],
					rater: ''
				},
				
				// 更换评分人数据
				changeRaterData: {
					tableId: '',
					currentRater: '',
					newRaterIndex: 0,
					newRater: ''
				},
				
				// 新增数据
				allSubjects: [], // 所有考核对象
				// 考核对象分页数据
				subjectPage: 1,
				subjectPageSize: 20,
				subjectTotal: 0,
				hasMoreSubjects: false,
				isLoadingSubjects: false,
				selectedSubjectIds: [], // 临时存储选中的考核对象ID
				subjectSearchKey: '', // 考核对象搜索关键词
				subjectSearching: false, // 是否在搜索中
				editingTableId: '', // 正在编辑的表ID
				selectingMode: '', // 评分人选择器的模式: 'add'新增表单, 'edit'编辑表单
				currentSubjectTab: 0 // 当前选中的选项卡索引
			}
		},
		computed: {
			// 过滤后的考核对象列表
			filteredSubjects() {
				// 直接返回通过云函数筛选后的考核对象列表
				// 不再在前端进行过滤，而是依赖云函数的搜索功能
				return this.allSubjects;
			},
			
			// 过滤后的评分人列表
			filteredRaters() {
				if (!this.raterSearchKey) {
					// 跳过第一个"请选择评分人"的选项
					return this.raters.slice(1);
				}
				
				const key = this.raterSearchKey.toLowerCase();
				return this.raters.filter(rater => {
					// 排除第一个空选项，并进行关键词过滤
					return rater.username && (
						rater.name.toLowerCase().includes(key) || 
						rater.username.toLowerCase().includes(key)
					);
				});
			}
		},
		onLoad() {
			// 先加载评分人列表，然后再加载表格数据
			this.loadRaters().then(() => {
				this.loadTables();
			}).catch(err => {
				console.error('加载评分人列表失败:', err);
				this.loadTables(); // 即使加载评分人失败，也加载表格
			});
			
			this.loadAllSubjects(); // 加载所有考核对象
			
			// 确保搜索关键词是字符串
			if (typeof this.subjectSearchKey !== 'string') {
				console.log('重置非字符串搜索关键词:', this.subjectSearchKey);
				this.subjectSearchKey = '';
			}
			
			// 调试方法检查
			this.debugMethods();
		},
		onReachBottom() {
			if (this.hasMoreData && !this.isLoading) {
				this.loadMore();
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
				console.log('开始加载评分表，当前评分人列表数量:', this.raters.length);
				
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
						
						// 打印第一个表格的评分人信息
						if (this.tables.length > 0) {
							const firstTable = this.tables[0];
							console.log('第一个表格评分人:', {
								rater: firstTable.rater,
								displayName: this.getRaterName(firstTable.rater)
							});
						}
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
				console.log('开始加载评分人列表');
				return new Promise((resolve, reject) => {
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
							console.log('评分人列表加载成功，数量:', this.raters.length - 1);
							resolve();
						} else {
							console.error('评分人列表加载失败:', res.result.msg);
							reject(new Error(res.result.msg || '加载评分人列表失败'));
						}
					}).catch(err => {
						console.error('评分人列表加载失败:', err);
						reject(err);
					});
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
				
				// 记录提交时的考核对象
				console.log('提交表单时的考核对象数量:', this.formData.selectedSubjects.length);
				console.log('提交的考核对象列表:', JSON.stringify(this.formData.selectedSubjects));
				
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
					selectedSubjects: [],
					rater: table.rater
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
				
				// 检查评分人是否已选择
				if (!this.editData.rater) {
					uni.showToast({
						title: '请选择评分人',
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
								selectedSubjects: this.editData.selectedSubjects,
								rater: this.editData.rater
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
				if (!this.changeRaterData.newRater) {
					uni.showToast({
						title: '请选择新评分人',
						icon: 'none'
					});
					return;
				}
				
				const newRater = this.changeRaterData.newRater;
				
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
					this.hideChangeRaterPopup();
					this.loadTables();
					uni.hideLoading();
					uni.showToast({
						title: '评分人更换成功'
					});
				}).catch(err => {
					uni.hideLoading();
					uni.showToast({
						title: '操作失败: ' + err.message,
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
			loadAllSubjects(isRefresh = false) {
				if (isRefresh) {
					this.subjectPage = 1;
					this.allSubjects = [];
				}
				
				if (this.isLoadingSubjects) return;
				
				this.isLoadingSubjects = true;
				
				if (this.subjectPage === 1) {
					uni.showLoading({
						title: '加载考核对象...'
					});
				}
				
				// 使用关键词搜索
				const searchParams = {
					page: this.subjectPage,
					pageSize: this.subjectPageSize
				};
				
				// 如果有搜索关键词，则加入关键词参数
				if (this.subjectSearchKey && this.subjectSearchKey.trim().length > 0) {
					searchParams.keyword = this.subjectSearchKey.trim();
					console.log('搜索关键词:', searchParams.keyword);
				}
				
				console.log('搜索参数:', JSON.stringify(searchParams));
				
				uniCloud.callFunction({
					name: 'subject',
					data: {
						action: 'getSubjects',
						data: searchParams
					}
				}).then(res => {
					this.isLoadingSubjects = false;
					
					if (this.subjectPage === 1) {
						uni.hideLoading();
					}
					
					if (res.result.code === 0) {
						const data = res.result.data;
						console.log(`获取考核对象成功: 共${data.total}条, 当前第${data.page}页, 每页${data.pageSize}条`);
						
						if (data.keyword) {
							console.log(`搜索关键词: "${data.keyword}", 结果数量: ${data.list.length}`);
						}
						
						if (this.subjectPage === 1) {
							this.allSubjects = data.list;
						} else {
							this.allSubjects = this.allSubjects.concat(data.list);
						}
						
						console.log('加载后的allSubjects数量:', this.allSubjects.length);
						console.log('选中的selectedSubjectIds:', this.selectedSubjectIds);
						
						// 检查选中的ID是否在加载的数据中存在
						const foundIds = this.selectedSubjectIds.filter(id => 
							this.allSubjects.some(subject => subject._id === id)
						);
						console.log('在当前加载数据中找到的已选ID数量:', foundIds.length);
						
						this.subjectTotal = data.total;
						this.hasMoreSubjects = this.allSubjects.length < this.subjectTotal;
						
						// 搜索结果为空时的提示
						if (this.subjectSearchKey && data.list.length === 0 && this.subjectPage === 1) {
							uni.showToast({
								title: '未找到匹配的考核对象',
								icon: 'none'
							});
						}
					} else {
						console.error('获取考核对象失败:', res.result.msg);
						uni.showToast({
							title: res.result.msg || '加载考核对象失败',
							icon: 'none'
						});
					}
				}).catch(err => {
					this.isLoadingSubjects = false;
					
					if (this.subjectPage === 1) {
						uni.hideLoading();
					}
					
					console.error('加载考核对象失败:', err);
					uni.showToast({
						title: '加载考核对象失败，请检查网络',
						icon: 'none'
					});
				});
			},
			
			// 加载更多考核对象
			loadMoreSubjects() {
				if (this.isLoadingSubjects || !this.hasMoreSubjects) return;
				
				this.subjectPage++;
				this.loadAllSubjects(false);
			},
			
			// 添加处理输入事件的方法
			handleSearchInput(event) {
				try {
					console.log('搜索框输入事件:', event);
					const value = event.target ? event.target.value : event.detail.value;
					console.log('输入值类型:', typeof value, '值:', value);
					
					// 确保值是字符串
					if (typeof value === 'string') {
						this.subjectSearchKey = value;
					} else if (value && value.toString) {
						// 尝试转换为字符串
						this.subjectSearchKey = value.toString();
						console.log('搜索值转换为字符串:', this.subjectSearchKey);
					} else {
						// 重置为空字符串
						this.subjectSearchKey = '';
						console.error('输入值无法转换为字符串');
					}
				} catch (err) {
					console.error('处理搜索输入错误:', err);
					this.subjectSearchKey = '';
				}
			},
			
			// 添加处理考核对象搜索的函数
			filterSubjects(e) {
				try {
					console.log('执行搜索, 事件对象类型:', typeof e, '搜索关键词:', this.subjectSearchKey);
					
					// 防止搜索框中显示错误对象
					if (typeof this.subjectSearchKey === 'object') {
						console.error('搜索关键词是对象而非字符串:', this.subjectSearchKey);
						this.subjectSearchKey = '';
					}
					
					// 重置页码，进行新搜索
					this.subjectPage = 1;
					this.loadAllSubjects(true);
				} catch (err) {
					console.error('搜索出错:', err);
					uni.showToast({
						title: '搜索功能出错，请联系管理员',
						icon: 'none'
					});
				}
			},
			
			// 显示考核对象选择器
			showSubjectSelector() {
				// 确保selectedSubjectIds包含当前已选的考核对象
				this.selectedSubjectIds = this.formData.selectedSubjects.map(s => s._id);
				console.log('打开选择器 - 当前已选对象IDs:', this.selectedSubjectIds);
				console.log('打开选择器 - 当前formData中的选中对象:', JSON.stringify(this.formData.selectedSubjects));
				
				this.subjectSearchKey = ''; // 清空搜索关键词
				// 重置考核对象分页数据
				this.subjectPage = 1;
				this.loadAllSubjects(true); // 重新加载考核对象
				
				this.$refs.subjectSelectorPopup.open();
				
				// 使用setTimeout确保弹窗显示后再处理
				setTimeout(() => {
					// 高亮显示已选项
					this.scrollToSelected();
					// 调整弹窗高度和布局
					this.adjustSubjectPopup();
				}, 300);
			},
			
			// 显示编辑时的考核对象选择器
			showEditSubjectSelector() {
				// 确保selectedSubjectIds包含当前已选的考核对象
				this.selectedSubjectIds = this.editData.selectedSubjects.map(s => s._id);
				console.log('打开编辑选择器 - 当前已选对象IDs:', this.selectedSubjectIds);
				console.log('打开编辑选择器 - 当前editData中的选中对象:', JSON.stringify(this.editData.selectedSubjects));
				
				this.subjectSearchKey = ''; // 清空搜索关键词
				// 重置考核对象分页数据
				this.subjectPage = 1;
				this.loadAllSubjects(true); // 重新加载考核对象
				
				this.$refs.subjectSelectorPopup.open();
				
				setTimeout(() => {
					// 高亮显示已选项
					this.scrollToSelected();
					// 调整弹窗高度和布局
					this.adjustSubjectPopup();
				}, 300);
			},
			
			// 添加新方法：滚动到第一个选中的考核对象
			scrollToSelected() {
				// 这里可以添加滚动到已选项的逻辑
				// 由于uni-app限制，可能需要使用DOM操作或特定API
				// 此处仅为占位，实际实现可能需要根据平台调整
			},
			
			// 添加新方法：调整考核对象弹窗高度和位置
			adjustSubjectPopup() {
				// 使用uni-app的方式获取和设置元素样式
				// 延迟执行以确保DOM已经渲染
				setTimeout(() => {
					// 使用uni选择器获取元素
					const query = uni.createSelectorQuery();
					
					// 查询弹窗和内容容器
					query.select('.subject-selector-popup').boundingClientRect();
					query.select('.subject-list-container').boundingClientRect();
					
					query.exec(res => {
						if (res && res.length >= 2) {
							const popupRect = res[0];
							const listRect = res[1];
							
							console.log('弹窗高度:', popupRect.height);
							console.log('列表容器高度:', listRect.height);
							
							// 如果列表容器高度不足，调整内边距和滚动区域
							if (listRect.height < 300) {
								console.log('列表容器高度不足，进行调整');
								
								// 使用动态样式类而不是直接操作DOM
								// 这个类已经在CSS中添加，我们只需要添加到现有组件上
								uni.createSelectorQuery()
									.select('.subject-list-container')
									.boundingClientRect(data => {
										if (data) {
											// 确保底部内容不被遮挡
											// 使用uni.getSystemInfoSync获取设备信息
											const systemInfo = uni.getSystemInfoSync();
											console.log('设备信息:', systemInfo);
											
											// 使用uni原生组件动态更新样式
											// 这里手动调整关键样式属性
											uni.createSelectorQuery()
												.selectAll('.subject-list-container, .subject-item, .popup-btns.fixed-bottom')
												.fields({
													node: true,
													size: true
												}, res => {
													if (res && res.length > 0) {
														// 由于小程序限制，不能直接操作DOM
														// 记录弹窗调整完成
														console.log('弹窗调整完成');
													}
												})
												.exec();
										}
									})
									.exec();
							}
						}
					});
				}, 500);
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
					console.log('取消选择考核对象:', subject.name, '，ID:', subject._id);
				} else {
					this.selectedSubjectIds.push(subject._id);
					console.log('选择考核对象:', subject.name, '，ID:', subject._id);
				}
				console.log('当前选中的考核对象IDs:', this.selectedSubjectIds);
				
				// 不自动关闭弹窗，保留多选功能
				// 保留选择状态显示，通过added CSS selected-tag来显示
			},
			
			// 确认考核对象选择
			confirmSubjectSelection() {
				console.log('确认选择前 - 选中的考核对象IDs:', this.selectedSubjectIds);
				console.log('确认选择前 - 当前加载的全部考核对象数量:', this.allSubjects.length);
				
				// 根据选中的ID获取完整的考核对象信息
				const selectedSubjects = this.allSubjects.filter(subject => 
					this.selectedSubjectIds.includes(subject._id)
				);
				
				console.log('根据ID筛选后得到的考核对象数量:', selectedSubjects.length);
				console.log('筛选后的考核对象列表:', JSON.stringify(selectedSubjects));
				
				// 检查是否有ID在allSubjects中找不到
				const missingIds = this.selectedSubjectIds.filter(id => 
					!this.allSubjects.some(subject => subject._id === id)
				);
				if (missingIds.length > 0) {
					console.error('警告：有些选中的ID在allSubjects中找不到:', missingIds);
				}
				
				// 判断是在新增还是编辑模式
				if (this.editingTableId) {
					console.log('编辑模式 - 更新前editData中的考核对象:', JSON.stringify(this.editData.selectedSubjects));
					this.editData.selectedSubjects = selectedSubjects;
					console.log('编辑模式 - 更新后editData中的考核对象:', JSON.stringify(this.editData.selectedSubjects));
				} else {
					console.log('新增模式 - 更新前formData中的考核对象:', JSON.stringify(this.formData.selectedSubjects));
					this.formData.selectedSubjects = selectedSubjects;
					console.log('新增模式 - 更新后formData中的考核对象:', JSON.stringify(this.formData.selectedSubjects));
				}
				
				this.hideSubjectSelector();
				
				// 在下一个事件循环检查渲染情况
				setTimeout(() => {
					this.checkSubjectsRendering();
				}, 300);
			},
			
			// 新增：检查考核对象渲染情况
			checkSubjectsRendering() {
				const subjects = this.editingTableId ? this.editData.selectedSubjects : this.formData.selectedSubjects;
				console.log('检查渲染 - 考核对象数量:', subjects.length);
				
				// 使用uni选择器获取已渲染的考核对象元素
				uni.createSelectorQuery()
					.selectAll('.selected-subject')
					.boundingClientRect(data => {
						if (data) {
							console.log('已渲染的考核对象元素数量:', data.length);
							
							if (data.length < subjects.length) {
								console.error('警告：渲染的元素数量少于数据中的考核对象数量');
								console.log('DOM元素:', data);
								
								// 强制更新视图
								this.$forceUpdate();
								
								// 记录每个考核对象的信息
								subjects.forEach((subject, index) => {
									console.log(`考核对象${index+1}:`, subject.name, 'ID:', subject._id);
								});
							}
						}
					})
					.exec();
			},
			
			// 移除已选考核对象（新增表单）
			removeSelectedSubject(index) {
				console.log('移除已选考核对象（新增）前, 总数:', this.formData.selectedSubjects.length);
				console.log('移除索引:', index, '，对象:', JSON.stringify(this.formData.selectedSubjects[index]));
				this.formData.selectedSubjects.splice(index, 1);
				console.log('移除后, 剩余对象数量:', this.formData.selectedSubjects.length);
			},
			
			// 移除已选考核对象（编辑表单）
			removeEditSubject(index) {
				console.log('移除已选考核对象（编辑）前, 总数:', this.editData.selectedSubjects.length);
				console.log('移除索引:', index, '，对象:', JSON.stringify(this.editData.selectedSubjects[index]));
				this.editData.selectedSubjects.splice(index, 1);
				console.log('移除后, 剩余对象数量:', this.editData.selectedSubjects.length);
			},
			
			// 显示评分人选择器弹窗
			showRaterSelector() {
				this.selectingMode = 'add'; // 设置为新增模式
				this.raterSearchKey = ''; // 清空搜索关键词
				this.$refs.raterSelectorPopup.open();
				
				setTimeout(() => {
					// 确保搜索框获得焦点
				}, 300);
			},
			
			// 显示编辑时的评分人选择器
			showEditRaterSelector() {
				this.selectingMode = 'edit'; // 设置为编辑模式
				this.raterSearchKey = ''; // 清空搜索关键词
				this.$refs.raterSelectorPopup.open();
				
				setTimeout(() => {
					// 确保搜索框获得焦点
				}, 300);
			},
			
			// 隐藏评分人选择器
			hideRaterSelector() {
				this.$refs.raterSelectorPopup.close();
				this.raterSearchKey = '';
			},
			
			// 选择评分人
			selectRater(rater) {
				if (this.selectingMode === 'edit') {
					// 编辑表格时选择评分人
					this.editData.rater = rater.username;
					this.editData.raterName = rater.name;
				} else if (this.selectingMode === 'add') {
					// 新增表格时选择评分人
					this.formData.rater = rater.username;
					this.formData.raterName = rater.name;
				} else if (this.selectingMode === 'change') {
					// 更换评分人时选择
					this.changeRaterData.newRater = rater.username;
					this.changeRaterData.newRaterName = rater.name;
				}
				
				// 关闭选择器弹窗
				this.$refs.raterSelectorPopup.close();
			},
			
			// 过滤评分人
			filterRaters() {
				// 输入时实时过滤评分人
				console.log('过滤评分人关键词:', this.raterSearchKey);
				// 计算属性filteredRaters会自动根据raterSearchKey更新
			},
			
			// 显示更换评分人时的评分人选择器
			showChangeRaterSelector() {
				this.selectingMode = 'change'; // 设置为更换评分人模式
				this.raterSearchKey = ''; // 清空搜索关键词
				this.$refs.raterSelectorPopup.open();
				
				setTimeout(() => {
					// 确保搜索框获得焦点
					const inputElement = document.querySelector('.rater-search-input');
					if (inputElement) {
						inputElement.focus();
					}
				}, 300);
			},
			
			// 全选当前过滤后的考核对象
			selectAllSubjects() {
				// 将当前过滤结果中的所有考核对象ID添加到选中列表
				this.filteredSubjects.forEach(subject => {
					if (!this.selectedSubjectIds.includes(subject._id)) {
						this.selectedSubjectIds.push(subject._id);
					}
				});
				
				uni.showToast({
					title: '已全选当前列表中的考核对象',
					icon: 'none'
				});
			},
			
			// 清除所有已选考核对象
			clearSelectedSubjects() {
				this.selectedSubjectIds = [];
				
				uni.showToast({
					title: '已清除所有选择',
					icon: 'none'
				});
			},
			
			// 根据ID获取考核对象名称
			getSubjectNameById(id) {
				const subject = this.allSubjects.find(s => s._id === id);
				return subject ? subject.name : '';
			},
			
			// 切换选项卡
			switchSubjectTab(index) {
				this.currentSubjectTab = index;
			},
			
			// 添加调试方法，检查所有方法是否正确注册
			debugMethods() {
				console.log('====== 方法调试 ======');
				const methodsToCheck = [
					'isSubjectSelected',
					'toggleSubjectSelection',
					'confirmSubjectSelection',
					'selectAllSubjects',
					'clearSelectedSubjects',
					'getSubjectNameById'
				];
				
				methodsToCheck.forEach(methodName => {
					const exists = typeof this[methodName] === 'function';
					console.log(`方法 ${methodName} ${exists ? '存在' : '不存在'}`);
					if (!exists) {
						console.error(`警告: ${methodName} 方法缺失，需要修复`);
					}
				});
				
				console.log('====================');
			},
			
			// 获取评分人真实姓名
			getRaterName(username) {
				if (!username) return '未指定';
				const rater = this.raters.find(r => r.username === username);
				return rater ? rater.name || username : username;
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
	margin: 30rpx 0 80rpx 0; /* 增加底部边距 */
	padding-bottom: 30rpx; /* 增加内边距确保可见性 */
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
	max-height: 85vh; /* 最大高度为视口高度的85% */
	overflow-y: auto; /* 内容过多时可滚动 */
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
	min-height: 80rpx;
	height: auto;
	border: 1rpx solid var(--border-color);
	border-radius: 8rpx;
	padding: 12rpx 24rpx;
	font-size: 28rpx;
	width: 100%;
	box-sizing: border-box;
	background-color: #FAFAFA;
	transition: all var(--transition-time);
	line-height: 1.5;
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
	margin: 0;
	padding: 0 40rpx;
	height: 80rpx;
	line-height: 80rpx;
	border-radius: 40rpx;
}

.confirm-btn {
	background: linear-gradient(to right, #07c160, #10ad7a);
	color: #fff;
	border: none;
	box-shadow: 0 6rpx 12rpx rgba(7, 193, 96, 0.2);
}

.cancel-btn {
	background-color: #f5f5f5;
	color: var(--text-regular);
	border: 1rpx solid #ebebeb;
}

/* 专门针对弹窗底部按钮的样式 */
.popup-btns.fixed-bottom {
	display: flex;
	justify-content: flex-end;
	margin-top: 0;
	padding: 20rpx 30rpx;
	border-top: 1px solid #eee;
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	background-color: #fff;
}

.popup-btns.fixed-bottom .cancel-btn, 
.popup-btns.fixed-bottom .confirm-btn {
	width: auto;
	min-width: 180rpx;
	margin: 0 0 0 20rpx;
}

.popup-btns.fixed-bottom .cancel-btn {
	flex: none;
}

.popup-btns.fixed-bottom .confirm-btn {
	flex: none;
}

/* 修改搜索框样式确保文字可见 */
.search-box {
	position: sticky;
	top: 0;
	z-index: 10;
	background-color: #fff;
	padding: 20rpx;
	border-bottom: 1px solid var(--border-light);
	display: flex;
	align-items: center;
}

.search-input {
	height: 80rpx;
	padding: 0 20rpx;
	background-color: #f5f7fa;
	border-radius: 8rpx;
	font-size: 28rpx;
	flex: 1;
	box-sizing: border-box;
	border: 1px solid var(--border-color);
}

.search-btn {
	width: 80rpx;
	height: 80rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: var(--primary-color);
	color: white;
	border-radius: 8rpx;
	margin-left: 10rpx;
}

.search-icon {
	font-size: 30rpx;
}

/* 新增考核对象选择部分 */
.subjects-selector {
	border: 1px solid var(--border-color);
	border-radius: 8rpx;
	background-color: #FAFAFA;
	min-height: 120rpx; /* 最小高度 */
	max-height: 400rpx; /* 增加最大高度，确保可以显示更多对象 */
	padding: 20rpx;
	overflow-y: auto; /* 内容过多时可滚动 */
}

.selected-subjects {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
	margin-bottom: 16rpx;
	width: 100%; /* 确保容器占满宽度 */
}

.selected-subjects > view {
	width: 100%;
	display: flex;
	flex-wrap: wrap;
	gap: 10rpx;
}

.no-subjects-tip {
	color: var(--text-secondary);
	font-size: 26rpx;
	padding: 10rpx 0;
}

.selected-subject {
	display: flex;
	align-items: center;
	background-color: var(--primary-light);
	color: var(--primary-color);
	padding: 10rpx 20rpx;
	border-radius: 30rpx;
	font-size: 26rpx;
	margin-bottom: 10rpx;
	max-width: 45%; /* 限制最大宽度，让每行可以显示更多标签 */
	box-sizing: border-box;
	flex-shrink: 0; /* 防止被压缩 */
}

.selected-subject text {
	max-width: calc(100% - 40rpx);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.remove-subject {
	margin-left: 10rpx;
	font-size: 28rpx;
	font-weight: bold;
	flex-shrink: 0;
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
	width: 650rpx;
	max-height: 85vh; /* 略微增加高度 */
	display: flex;
	flex-direction: column;
	position: relative;
	padding-bottom: 120rpx; /* 为底部按钮预留空间 */
}

.popup-title {
	display: flex;
	justify-content: space-between;
	align-items: center;
	position: relative;
}

.close-btn {
	position: absolute;
	right: 20rpx;
	top: 20rpx;
	font-size: 36rpx;
	color: var(--text-secondary);
}

.subject-list-container {
	flex: 1;
	overflow-y: auto;
	max-height: 45vh; /* 减小最大高度，确保不超出屏幕 */
	min-height: 250rpx; /* 设置最小高度 */
	padding: 0 20rpx;
	padding-bottom: 120rpx; /* 增加底部内边距，确保内容不被按钮遮挡 */
	margin-bottom: 20rpx; /* 增加底部外边距 */
	-webkit-overflow-scrolling: touch; /* 增强iOS滚动体验 */
}

.subject-item {
	padding: 24rpx 20rpx; /* 增加内边距，使触摸区域更大 */
	margin-bottom: 8rpx; /* 增加项目间距 */
	background-color: #ffffff; /* 确保背景色 */
	border-radius: 8rpx; /* 添加圆角 */
	border-bottom: 1px solid var(--border-light);
	transition: all 0.2s;
}

.subject-item:active {
	background-color: var(--primary-light);
}

.subject-item-selected {
	background-color: var(--primary-light);
}

.subject-info {
	position: relative;
	padding-right: 80rpx; /* 增加右侧内边距，确保"已选"标签有足够空间 */
}

.subject-name {
	font-size: 30rpx; /* 增大字体 */
	color: var(--text-main);
	font-weight: 500;
	margin-bottom: 4rpx;
	line-height: 1.4;
}

.subject-department, .subject-position {
	font-size: 24rpx;
	color: var(--text-secondary);
	margin-top: 4rpx;
	line-height: 1.4;
}

.selected-tag {
	position: absolute;
	right: 10rpx;
	top: 50%;
	transform: translateY(-50%);
	font-size: 24rpx;
	color: var(--primary-color);
	background-color: var(--primary-light);
	padding: 4rpx 12rpx;
	border-radius: 20rpx;
}

.fixed-bottom {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	background-color: rgba(255, 255, 255, 0.98); /* 半透明背景 */
	padding: 20rpx 30rpx;
	border-top: 1px solid #eee;
	display: flex;
	justify-content: flex-end;
	align-items: center;
	box-shadow: 0 -4rpx 12rpx rgba(0, 0, 0, 0.08); /* 增加阴影 */
}

.popup-btns.fixed-bottom .cancel-btn,
.popup-btns.fixed-bottom .confirm-btn {
	width: auto;
	min-width: 180rpx;
	margin: 0 0 0 20rpx;
}

.popup-btns.fixed-bottom .cancel-btn {
	flex: none;
}

.popup-btns.fixed-bottom .confirm-btn {
	flex: none;
}

/* 添加选项卡样式 */
.tabs-container {
	display: flex;
	border-bottom: 1px solid #f0f0f0;
	background-color: #fff;
	padding: 0 20rpx;
}

.tab-item {
	padding: 20rpx 30rpx;
	font-size: 28rpx;
	color: var(--text-regular);
	position: relative;
	text-align: center;
}

.tab-item.active {
	color: var(--primary-color);
	font-weight: bold;
}

.tab-item.active::after {
	content: '';
	position: absolute;
	bottom: 0;
	left: 50%;
	transform: translateX(-50%);
	width: 40rpx;
	height: 4rpx;
	background-color: var(--primary-color);
	border-radius: 2rpx;
}

/* 添加提示和样式 */
.batch-action-hint {
	font-size: 24rpx;
	color: var(--text-secondary);
}

/* 输入框增强样式 */
.form-input {
	min-height: 80rpx; /* 设置最小高度 */
	height: auto; /* 高度自适应 */
	padding: 12rpx 24rpx; /* 增加内边距 */
	line-height: 1.5; /* 增加行高 */
}

/* 确保文本可见 */
.info-value, .selected-subject text, .subject-name {
	word-break: break-all; /* 允许在任意字符间断行 */
	white-space: normal; /* 允许文本换行 */
}

/* 考核对象加载更多样式 */
.load-more-subjects {
	text-align: center;
	margin: 20rpx 0;
	padding-bottom: 20rpx;
}

.load-more-btn {
	font-size: 24rpx;
	color: var(--text-secondary);
	background-color: var(--bg-light);
	border: 1rpx solid var(--border-color);
	border-radius: var(--btn-radius);
	padding: 6rpx 30rpx;
	box-shadow: var(--shadow-sm);
	display: inline-block;
}

.load-more-btn:active {
	opacity: 0.8;
	transform: translateY(2rpx);
}

/* 新增考核对象选择部分相关样式 */
.subjects-selector {
	border: 1px solid var(--border-color);
	border-radius: 8rpx;
	background-color: #FAFAFA;
	min-height: 120rpx; /* 最小高度 */
	max-height: 400rpx; /* 增加最大高度，确保可以显示更多对象 */
	padding: 20rpx;
	overflow-y: auto; /* 内容过多时可滚动 */
}

.selected-subjects {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
	margin-bottom: 16rpx;
	width: 100%; /* 确保容器占满宽度 */
}

.selected-subjects > view {
	width: 100%;
	display: flex;
	flex-wrap: wrap;
	gap: 10rpx;
}

.no-subjects-tip {
	color: var(--text-secondary);
	font-size: 26rpx;
	padding: 10rpx 0;
}

.selected-subject {
	display: flex;
	align-items: center;
	background-color: var(--primary-light);
	color: var(--primary-color);
	padding: 10rpx 20rpx;
	border-radius: 30rpx;
	font-size: 26rpx;
	margin-bottom: 10rpx;
	max-width: 45%; /* 限制最大宽度，让每行可以显示更多标签 */
	box-sizing: border-box;
	flex-shrink: 0; /* 防止被压缩 */
}

.selected-subject text {
	max-width: calc(100% - 40rpx);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.remove-subject {
	margin-left: 10rpx;
	font-size: 28rpx;
	font-weight: bold;
	flex-shrink: 0;
}

/* 额外CSS用于清除浮动，确保所有内容可见 */
.clearfix:after {
	content: "";
	display: table;
	clear: both;
}
</style> 