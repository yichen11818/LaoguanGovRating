<template>
	<view class="container">
		<view class="filter-bar">
			<view class="filter-top">
				<view class="search-box">
					<text class="search-icon">🔍</text>
					<input 
						type="text" 
						v-model="searchKeyword" 
						placeholder="搜索用户名或姓名" 
						confirm-type="search" 
						@confirm="handleSearch"
						class="search-input"
						@input="handleKeywordInput"
					/>
					<text v-if="searchKeyword" class="clear-icon" @click="clearSearch">×</text>
				</view>
				
				<button class="add-btn" size="mini" @click="showAddUserModal">新增用户</button>
			</view>
			
			<view class="filter-bottom">
				<view class="filter-item">
					<picker @change="handleRoleChange" :value="currentRoleIndex" :range="roleOptions" range-key="name">
						<view class="picker-box">
							<text class="picker-text">{{roleOptions[currentRoleIndex].name}}</text>
							<text class="picker-arrow">▼</text>
						</view>
					</picker>
				</view>
			</view>
		</view>
		
		<view class="user-list">
			<view class="search-hint" v-if="searchKeyword && users.length > 0">
				<text class="hint-text">搜索"{{searchKeyword}}"，找到 {{total}} 个结果</text>
			</view>
			
			<view class="loading-box" v-if="isLoading && page === 1">
				<view class="loader"></view>
				<text class="loading-text">加载中...</text>
			</view>
			
			<view class="no-data" v-else-if="users.length === 0">
				<image class="no-data-icon" src="/static/images/no-data.png" mode="aspectFit"></image>
				<text class="no-data-text">{{ searchKeyword ? '未找到匹配的用户，请尝试其他关键词' : '暂无用户' }}</text>
				<view class="no-data-actions" v-if="searchKeyword">
					<button class="clear-search-btn" @click="clearSearch">清空搜索</button>
				</view>
			</view>
			
			<view class="user-item" v-for="(user, index) in users" :key="index">
				<view class="user-info">
					<view class="info-row">
						<text class="user-name">{{user.name || user.username}}</text>
						<text :class="['user-role', 'role-'+user.role]">{{getRoleName(user.role)}}</text>
					</view>
					<view class="info-row">
						<text class="user-username">账号：{{user.username}}</text>
					</view>
				</view>
				<view class="user-actions">
					<view class="action-btn" @click="editUser(index)">
						<text class="action-text">编辑</text>
					</view>
					<view class="action-btn" @click="changeRole(index)">
						<text class="action-text">更改角色</text>
					</view>
					<view class="action-btn delete" @click="confirmDelete(user._id)" v-if="user.username !== adminUsername">
						<text class="action-text">删除</text>
					</view>
					<view class="action-btn reset-btn" @click="resetPassword(user)">重置密码</view>
				</view>
			</view>
		</view>
		
		<!-- 加载更多 -->
		<view class="load-more" v-if="users.length > 0 && hasMoreData">
			<button class="load-btn" size="mini" @click="loadMore" :loading="isLoading">加载更多</button>
		</view>
		
		<!-- 新增用户弹窗 -->
		<view class="popup-overlay" v-if="popupVisible.addUser" @click="hideAddUserPopup"></view>
		<view class="popup-content" v-if="popupVisible.addUser">
			<view class="popup-title">新增用户</view>
			<view class="form-item">
				<text class="form-label">用户名</text>
				<input v-model="formData.username" class="form-input" placeholder="请输入用户名" />
			</view>
			<view class="form-item">
				<text class="form-label">密码</text>
				<input v-model="formData.password" type="password" class="form-input" placeholder="请输入密码" />
			</view>
			<view class="form-item">
				<text class="form-label">姓名</text>
				<input v-model="formData.name" class="form-input" placeholder="请输入姓名" />
			</view>
			<view class="form-item">
				<text class="form-label">角色</text>
				<picker @change="handleFormRoleChange" :value="formData.roleIndex" :range="roleOptions" range-key="name">
					<view class="form-picker">
						<text>{{roleOptions[formData.roleIndex].name}}</text>
						<text class="picker-arrow">▼</text>
					</view>
				</picker>
			</view>
			<view class="popup-btns">
				<button class="cancel-btn" size="mini" @click="hideAddUserPopup">取消</button>
				<button class="confirm-btn" size="mini" @click="submitAddUser">确定</button>
			</view>
		</view>
		
		<!-- 编辑用户弹窗 -->
		<view class="popup-overlay" v-if="popupVisible.editUser" @click="hideEditUserPopup"></view>
		<view class="popup-content" v-if="popupVisible.editUser">
			<view class="popup-title">编辑用户</view>
			<view class="form-item">
				<text class="form-label">用户名</text>
				<input v-model="editData.username" class="form-input" placeholder="请输入用户名" disabled />
			</view>
			<view class="form-item">
				<text class="form-label">姓名</text>
				<input v-model="editData.name" class="form-input" placeholder="请输入姓名" />
			</view>
			<view class="form-item">
				<text class="form-label">重置密码</text>
				<input v-model="editData.password" type="password" class="form-input" placeholder="留空表示不修改密码" />
			</view>
			<view class="popup-btns">
				<button class="cancel-btn" size="mini" @click="hideEditUserPopup">取消</button>
				<button class="confirm-btn" size="mini" @click="submitEditUser">确定</button>
			</view>
		</view>
		
		<!-- 更改角色弹窗 -->
		<view class="popup-overlay" v-if="popupVisible.changeRole" @click="hideChangeRolePopup"></view>
		<view class="popup-content" v-if="popupVisible.changeRole">
			<view class="popup-title">更改角色</view>
			<view class="form-item">
				<text class="form-label">当前用户</text>
				<text class="current-user">{{changeRoleData.username}}</text>
			</view>
			<view class="form-item">
				<text class="form-label">当前角色</text>
				<text class="current-role" :class="'role-text-'+changeRoleData.currentRole">{{getRoleName(changeRoleData.currentRole)}}</text>
			</view>
			<view class="form-item">
				<text class="form-label">新角色</text>
				<picker @change="handleNewRoleChange" :value="changeRoleData.newRoleIndex" :range="roleOptions.slice(1)" range-key="name">
					<view class="form-picker">
						<text>{{(changeRoleData.newRoleIndex >= 0 && changeRoleData.newRoleIndex < roleOptions.length - 1) ? roleOptions[changeRoleData.newRoleIndex+1].name : '请选择角色'}}</text>
						<text class="picker-arrow">▼</text>
					</view>
				</picker>
			</view>
			<view class="popup-btns">
				<button class="cancel-btn" size="mini" @click="hideChangeRolePopup">取消</button>
				<button class="confirm-btn" size="mini" @click="submitChangeRole">确定</button>
			</view>
		</view>
		
		<!-- 密码重置成功弹窗 -->
		<view class="popup-overlay" v-if="popupVisible.resetPassword" @click="closeResetPopup"></view>
		<view class="popup-content" v-if="popupVisible.resetPassword">
			<view class="popup-title">密码重置成功</view>
			<view class="reset-content">
				<text>用户 {{currentUser && currentUser.username}} ({{currentUser && currentUser.name}}) 的密码已重置。</text>
				<view class="new-password">
					<text class="password-label">新密码：</text>
					<text class="password-value">{{newPassword}}</text>
				</view>
			</view>
			<view class="popup-btns">
				<button class="cancel-btn" size="mini" @click="copyPassword">复制密码</button>
				<button class="confirm-btn" size="mini" @click="closeResetPopup">确认</button>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				currentRoleIndex: 0,
				roleOptions: [
					{ id: '', name: '全部角色' },
					{ id: 'admin', name: '管理员' },
					{ id: 'rater', name: '评分员' },
					{ id: 'user', name: '普通用户' }
				],
				users: [],
				page: 1,
				pageSize: 10,
				total: 0,
				hasMoreData: false,
				isLoading: false,
				adminUsername: '', // 当前管理员用户名，不允许删除自己
				
				// 表单数据
				formData: {
					username: '',
					password: '',
					name: '',
					roleIndex: 2 // 默认为评分员
				},
				
				// 编辑表单数据
				editData: {
					id: '',
					username: '',
					password: '',
					name: ''
				},
				
				// 更改角色数据
				changeRoleData: {
					id: '',
					username: '',
					currentRole: '',
					newRoleIndex: 0
				},
				
				// 密码重置数据
				currentUser: {},  // 改为空对象而非null
				newPassword: '',
				
				// 搜索相关
				searchKeyword: '',
				searchTimer: null, // 用于防抖
				
				// 弹窗显示状态
				popupVisible: {
					addUser: false,
					editUser: false,
					changeRole: false,
					resetPassword: false
				}
			}
		},
		onLoad() {
			// 获取当前管理员用户名
			const userInfo = uni.getStorageSync('userInfo');
			if (userInfo) {
				this.adminUsername = userInfo.username;
			}
			
			this.loadUsers();
		},
		methods: {
			// 获取角色名称
			getRoleName(role) {
				const roleMap = {
					'admin': '管理员',
					'rater': '评分员',
					'user': '普通用户'
				};
				return roleMap[role] || '未知角色';
			},
			
			// 处理角色筛选变化
			handleRoleChange(e) {
				this.currentRoleIndex = e.detail.value;
				this.page = 1;
				this.users = [];
				this.loadUsers();
			},
			
			// 处理搜索关键词输入
			handleKeywordInput(e) {
				this.searchKeyword = e.detail.value;
				// 添加防抖，避免频繁搜索
				clearTimeout(this.searchTimer);
				this.searchTimer = setTimeout(() => {
					this.page = 1;
					this.loadUsers();
				}, 500); // 500ms延迟，用户输入停止后再搜索
			},

			// 处理搜索
			handleSearch() {
				clearTimeout(this.searchTimer);
				this.page = 1;
				this.loadUsers();
			},
			
			// 清除搜索
			clearSearch() {
				this.searchKeyword = '';
				this.page = 1;
				this.loadUsers();
			},
			
			// 加载用户列表
			loadUsers() {
				this.isLoading = true;
				
				const role = this.roleOptions[this.currentRoleIndex].id;
				const keyword = this.searchKeyword;
				
				uniCloud.callFunction({
					name: 'user',
					data: {
						action: 'getUsers',
						data: {
							role: role || undefined, // 如果是全部角色，则不传role
							keyword: keyword,
							page: this.page,
							pageSize: this.pageSize
						}
					}
				}).then(res => {
					this.isLoading = false;
					
					if (res.result.code === 0) {
						const data = res.result.data;
						
						if (this.page === 1) {
							this.users = data.list;
						} else {
							this.users = this.users.concat(data.list);
						}
						
						this.total = data.total;
						this.hasMoreData = this.users.length < this.total;
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
				this.loadUsers();
			},
			
			// 显示新增用户弹窗
			showAddUserModal() {
				// 重置表单
				this.formData = {
					username: '',
					password: '',
					name: '',
					roleIndex: 2 // 默认为评分员
				};
				
				this.popupVisible.addUser = true;
			},
			
			// 隐藏新增用户弹窗
			hideAddUserPopup() {
				this.popupVisible.addUser = false;
			},
			
			// 处理表单角色变化
			handleFormRoleChange(e) {
				this.formData.roleIndex = e.detail.value;
			},
			
			// 提交新增用户
			submitAddUser() {
				if (!this.formData.username) {
					uni.showToast({
						title: '请输入用户名',
						icon: 'none'
					});
					return;
				}
				
				if (!this.formData.password) {
					uni.showToast({
						title: '请输入密码',
						icon: 'none'
					});
					return;
				}
				
				uni.showLoading({
					title: '提交中...'
				});
				
				const role = this.roleOptions[this.formData.roleIndex].id;
				
				uniCloud.callFunction({
					name: 'user',
					data: {
						action: 'register',
						data: {
							username: this.formData.username,
							password: this.formData.password,
							name: this.formData.name,
							role: role
						}
					}
				}).then(res => {
					uni.hideLoading();
					
					if (res.result.code === 0) {
						uni.showToast({
							title: '创建成功',
							icon: 'success'
						});
						
						this.hideAddUserPopup();
						this.page = 1;
						this.loadUsers();
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
			
			// 编辑用户
			editUser(index) {
				const user = this.users[index];
				
				this.editData = {
					id: user._id,
					username: user.username,
					password: '',
					name: user.name || ''
				};
				
				this.popupVisible.editUser = true;
			},
			
			// 隐藏编辑用户弹窗
			hideEditUserPopup() {
				this.popupVisible.editUser = false;
			},
			
			// 提交编辑用户
			submitEditUser() {
				uni.showLoading({
					title: '提交中...'
				});
				
				const updateData = {
					name: this.editData.name
				};
				
				// 如果输入了密码，则更新密码
				if (this.editData.password) {
					updateData.password = this.editData.password;
				}
				
				uniCloud.callFunction({
					name: 'user',
					data: {
						action: 'updateUser',
						data: {
							userId: this.editData.id,
							updateData: updateData
						}
					}
				}).then(res => {
					uni.hideLoading();
					
					if (res.result.code === 0) {
						uni.showToast({
							title: '更新成功',
							icon: 'success'
						});
						
						this.hideEditUserPopup();
						this.loadUsers();
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
			
			// 更改角色
			changeRole(index) {
				const user = this.users[index];
				
				// 防止更改自己的角色
				if (user.username === this.adminUsername) {
					uni.showToast({
						title: '不能更改自己的角色',
						icon: 'none'
					});
					return;
				}
				
				// 找到角色的索引
				let roleIndex = 0;
				for (let i = 1; i < this.roleOptions.length; i++) {
					if (this.roleOptions[i].id === user.role) {
						roleIndex = i - 1; // 减1是因为更改角色下拉框不包含"全部角色"选项
						break;
					}
				}
				
				// 确保roleIndex在有效范围内
				if (roleIndex < 0 || roleIndex >= this.roleOptions.length - 1) {
					roleIndex = 0; // 默认选择第一个角色
				}
				
				this.changeRoleData = {
					id: user._id,
					username: user.name || user.username,
					currentRole: user.role,
					newRoleIndex: roleIndex
				};
				
				this.popupVisible.changeRole = true;
			},
			
			// 隐藏更改角色弹窗
			hideChangeRolePopup() {
				this.popupVisible.changeRole = false;
			},
			
			// 处理新角色变化
			handleNewRoleChange(e) {
				this.changeRoleData.newRoleIndex = parseInt(e.detail.value);
			},
			
			// 提交更改角色
			submitChangeRole() {
				// 确保索引在有效范围内
				if (this.changeRoleData.newRoleIndex < 0 || this.changeRoleData.newRoleIndex >= this.roleOptions.length - 1) {
					uni.showToast({
						title: '无效的角色选择',
						icon: 'none'
					});
					return;
				}
				
				// 获取新角色ID（+1是因为roleOptions的第一项是"全部角色"）
				const newRoleIndex = this.changeRoleData.newRoleIndex + 1;
				const newRoleOption = this.roleOptions[newRoleIndex];
				
				if (!newRoleOption || !newRoleOption.id) {
					uni.showToast({
						title: '角色数据错误',
						icon: 'none'
					});
					return;
				}
				
				const newRole = newRoleOption.id;
				
				if (newRole === this.changeRoleData.currentRole) {
					uni.showToast({
						title: '新角色与当前角色相同',
						icon: 'none'
					});
					return;
				}
				
				uni.showLoading({
					title: '提交中...'
				});
				
				uniCloud.callFunction({
					name: 'user',
					data: {
						action: 'updateUser',
						data: {
							userId: this.changeRoleData.id,
							updateData: {
								role: newRole
							}
						}
					}
				}).then(res => {
					uni.hideLoading();
					
					if (res.result.code === 0) {
						uni.showToast({
							title: '角色更改成功',
							icon: 'success'
						});
						
						this.hideChangeRolePopup();
						this.loadUsers();
					} else {
						uni.showToast({
							title: res.result.msg || '更改失败',
							icon: 'none'
						});
					}
				}).catch(err => {
					uni.hideLoading();
					console.error(err);
					uni.showToast({
						title: '更改失败，请检查网络',
						icon: 'none'
					});
				});
			},
			
			// 确认删除
			confirmDelete(userId) {
				uni.showModal({
					title: '确认删除',
					content: '删除后将无法恢复，是否继续？',
					success: res => {
						if (res.confirm) {
							this.deleteUser(userId);
						}
					}
				});
			},
			
			// 删除用户
			deleteUser(userId) {
				uni.showLoading({
					title: '删除中...'
				});
				
				uniCloud.callFunction({
					name: 'user',
					data: {
						action: 'deleteUser',
						data: {
							userId: userId
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
						this.users = this.users.filter(item => item._id !== userId);
						if (this.users.length === 0 && this.page > 1) {
							this.page--;
							this.loadUsers();
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
			
			// 重置密码
			resetPassword(user) {
				this.currentUser = user || {};  // 确保即使没有传入user也不会是null
				
				uni.showModal({
					title: '确认重置密码',
					content: `确定要重置用户"${user.name}"的密码吗？`,
					success: (res) => {
						if (res.confirm) {
							this.doResetPassword();
						}
					}
				});
			},
			
			doResetPassword() {
				const adminInfo = uni.getStorageSync('userInfo');
				const adminUsername = adminInfo ? JSON.parse(adminInfo).username : '管理员';
				
				uni.showLoading({ title: '处理中...' });
				
				uniCloud.callFunction({
					name: 'user',
					data: {
						action: 'resetUserPassword',
						data: {
							userId: this.currentUser._id,
							adminUsername: adminUsername
						}
					}
				}).then(res => {
					uni.hideLoading();
					
					if (res.result.code === 0) {
						this.newPassword = res.result.data.newPassword;
						this.popupVisible.resetPassword = true;
					} else {
						uni.showToast({
							title: res.result.msg || '重置失败',
							icon: 'none'
						});
					}
				}).catch(err => {
					uni.hideLoading();
					uni.showToast({
						title: '操作失败，请检查网络',
						icon: 'none'
					});
				});
			},
			
			copyPassword() {
				uni.setClipboardData({
					data: this.newPassword,
					success: () => {
						uni.showToast({
							title: '密码已复制',
							icon: 'success'
						});
					}
				});
			},
			
			closeResetPopup() {
				this.popupVisible.resetPassword = false;
			}
		}
	}
</script>

<style>
	.container {
		padding: 30rpx;
		background-color: #f9fafc;
		min-height: 100vh;
	}
	
	.filter-bar {
		display: flex;
		flex-direction: column;
		margin-bottom: 30rpx;
		background-color: #ffffff;
		padding: 20rpx;
		border-radius: 16rpx;
		box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
	}
	
	.filter-top {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		margin-bottom: 20rpx;
	}
	
	.filter-bottom {
		display: flex;
		flex-direction: row;
		justify-content: flex-start;
		width: 100%;
	}
	
	.filter-item {
		flex: 0 0 auto;
		min-width: 200rpx;
	}
	
	.search-box {
		display: flex;
		flex: 1;
		align-items: center;
		background-color: #f2f5fc;
		border-radius: 40rpx;
		padding: 0 30rpx;
		height: 70rpx;
		margin-right: 20rpx;
		border: 2rpx solid transparent;
	}
	
	.search-box:focus-within {
		background-color: #fff;
		border-color: #42b983;
		box-shadow: 0 0 0 2rpx rgba(66, 185, 131, 0.1);
	}
	
	.search-icon {
		font-size: 32rpx;
		color: #6c7a98;
		margin-right: 10rpx;
	}
	
	.search-input {
		flex: 1;
		font-size: 28rpx;
		color: #333;
		height: 70rpx;
		line-height: 70rpx;
	}
	
	.clear-icon {
		font-size: 36rpx;
		color: #94a3b8;
		width: 60rpx;
		height: 60rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 30rpx;
		transition: all 0.3s ease;
	}
	
	.clear-icon:active {
		background-color: rgba(148, 163, 184, 0.1);
	}
	
	.add-btn {
		background: linear-gradient(135deg, #42b983, #2cb673);
		color: #fff;
		border-radius: 40rpx;
		padding: 0 30rpx;
		font-weight: 500;
		border: none;
		height: 70rpx;
		line-height: 70rpx;
		font-size: 28rpx;
		box-shadow: 0 4rpx 10rpx rgba(7, 193, 96, 0.3);
		transition: all 0.3s ease;
		white-space: nowrap;
	}
	
	.add-btn:active {
		transform: translateY(2rpx);
		box-shadow: 0 2rpx 6rpx rgba(7, 193, 96, 0.3);
	}
	
	.picker-box {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		height: 70rpx;
		padding: 0 30rpx;
		background-color: #f2f5fc;
		border-radius: 40rpx;
		transition: all 0.3s ease;
		white-space: nowrap;
	}
	
	.picker-box:active {
		background-color: #e6ebf8;
	}
	
	.picker-text {
		font-size: 28rpx;
		font-weight: 500;
		color: #333;
		margin-right: 10rpx;
	}
	
	.picker-arrow {
		font-size: 24rpx;
		color: #6c7a98;
	}
	
	.action-btns {
		display: flex;
		flex-direction: row;
		flex-wrap: nowrap;
		margin-left: auto;
		flex: 0 0 auto;
		margin-bottom: 10rpx;
	}
	
	.search-hint {
		margin-bottom: 20rpx;
		padding: 10rpx 20rpx;
		background-color: #f8fafc;
		border-radius: 12rpx;
		border-left: 4rpx solid #42b983;
	}
	
	.hint-text {
		font-size: 26rpx;
		color: #64748b;
		font-weight: 500;
	}
	
	.user-list {
		margin-top: 20rpx;
	}
	
	.loading-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 60rpx 0;
	}
	
	.loader {
		width: 60rpx;
		height: 60rpx;
		border: 8rpx solid #f3f3f3;
		border-top: 8rpx solid #42b983;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 20rpx;
	}
	
	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
	
	.loading-text {
		font-size: 28rpx;
		color: #64748b;
		font-weight: 500;
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
		opacity: 0.7;
	}
	
	.no-data-text {
		font-size: 30rpx;
		color: #94a3b8;
		font-weight: 500;
	}
	
	.no-data-actions {
		margin-top: 20rpx;
	}
	
	.clear-search-btn {
		background-color: #f1f5f9;
		color: #64748b;
		border-radius: 40rpx;
		padding: 12rpx 30rpx;
		font-size: 28rpx;
		font-weight: 500;
		transition: all 0.3s ease;
	}
	
	.clear-search-btn:active {
		transform: scale(0.98);
	}
	
	.user-item {
		background-color: #fff;
		border-radius: 16rpx;
		padding: 20rpx;
		margin-bottom: 20rpx;
		box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
		transition: transform 0.3s ease, box-shadow 0.3s ease;
		border-left: 8rpx solid transparent;
	}
	
	.user-item:active {
		transform: translateY(2rpx);
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.04);
	}
	
	.user-item:nth-child(3n+1) {
		border-left-color: #e64340;
	}
	
	.user-item:nth-child(3n+2) {
		border-left-color: #07c160;
	}
	
	.user-item:nth-child(3n+3) {
		border-left-color: #1989fa;
	}
	
	.user-info {
		margin-bottom: 16rpx;
	}
	
	.info-row {
		display: flex;
		align-items: center;
		margin-bottom: 12rpx;
	}
	
	.user-name {
		font-size: 32rpx;
		font-weight: bold;
		margin-right: 20rpx;
		color: #334155;
	}
	
	.user-role {
		font-size: 22rpx;
		color: #fff;
		padding: 4rpx 16rpx;
		border-radius: 30rpx;
		font-weight: 500;
	}
	
	.role-admin {
		background: linear-gradient(135deg, #ff4d4f, #e64340);
	}
	
	.role-rater {
		background: linear-gradient(135deg, #10b981, #07c160);
	}
	
	.role-user {
		background: linear-gradient(135deg, #3b82f6, #1989fa);
	}
	
	.user-username {
		font-size: 26rpx;
		color: #64748b;
	}
	
	.user-actions {
		display: flex;
		justify-content: flex-end;
		flex-wrap: wrap;
		padding-top: 16rpx;
		border-top: 1rpx solid #f0f2f5;
	}
	
	.action-btn {
		margin-left: 12rpx;
		margin-bottom: 10rpx;
		padding: 8rpx 20rpx;
		border-radius: 30rpx;
		background-color: #f8fafc;
		transition: all 0.3s ease;
		box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.03);
	}
	
	.action-btn:active {
		transform: scale(0.98);
	}
	
	.action-btn.delete {
		background-color: #fff1f1;
	}
	
	.action-text {
		font-size: 24rpx;
		color: #475569;
		font-weight: 500;
	}
	
	.action-btn.delete .action-text {
		color: #e64340;
	}
	
	.load-more {
		text-align: center;
		margin: 40rpx 0;
	}
	
	.load-btn {
		font-size: 28rpx;
		color: #475569;
		background-color: #fff;
		border-radius: 40rpx;
		padding: 12rpx 60rpx;
		box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.06);
		transition: all 0.3s ease;
	}
	
	.load-btn:active {
		transform: translateY(2rpx);
		box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.04);
	}
	
	/* 弹窗样式 */
	.popup-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(15, 23, 42, 0.6);
		z-index: 9998;
		backdrop-filter: blur(4rpx);
		transition: opacity 0.3s ease;
	}
	
	.popup-content {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background-color: #fff;
		border-radius: 20rpx;
		width: 650rpx;
		padding: 40rpx;
		z-index: 9999;
		box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.15);
		transition: transform 0.3s ease, opacity 0.3s ease;
	}
	
	.popup-title {
		font-size: 36rpx;
		font-weight: bold;
		text-align: center;
		margin-bottom: 40rpx;
		color: #334155;
		position: relative;
	}
	
	.popup-title::after {
		content: '';
		position: absolute;
		bottom: -16rpx;
		left: 50%;
		transform: translateX(-50%);
		width: 60rpx;
		height: 6rpx;
		background: linear-gradient(90deg, #42b983, #2cb673);
		border-radius: 3rpx;
	}
	
	.form-item {
		margin-bottom: 30rpx;
	}
	
	.form-label {
		font-size: 28rpx;
		color: #475569;
		margin-bottom: 12rpx;
		display: block;
		font-weight: 500;
	}
	
	.form-input {
		height: 90rpx;
		border: 2rpx solid #e2e8f0;
		border-radius: 12rpx;
		padding: 0 24rpx;
		font-size: 28rpx;
		background-color: #f8fafc;
		transition: all 0.3s ease;
	}
	
	.form-input:focus {
		border-color: #42b983;
		background-color: #fff;
		box-shadow: 0 0 0 2rpx rgba(66, 185, 131, 0.1);
	}
	
	.form-picker {
		height: 90rpx;
		border: 2rpx solid #e2e8f0;
		border-radius: 12rpx;
		padding: 0 24rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 28rpx;
		background-color: #f8fafc;
	}
	
	.current-user, .current-role {
		height: 90rpx;
		line-height: 90rpx;
		border: 2rpx solid #e2e8f0;
		border-radius: 12rpx;
		padding: 0 24rpx;
		font-size: 28rpx;
		background-color: #f8fafc;
		display: block;
	}
	
	.role-text-admin {
		color: #e64340;
		font-weight: 500;
	}
	
	.role-text-rater {
		color: #07c160;
		font-weight: 500;
	}
	
	.role-text-user {
		color: #1989fa;
		font-weight: 500;
	}
	
	.popup-btns {
		display: flex;
		justify-content: space-between;
		margin-top: 40rpx;
	}
	
	.cancel-btn, .confirm-btn {
		width: 45%;
		height: 90rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 45rpx;
		font-size: 28rpx;
		font-weight: 500;
		transition: all 0.3s ease;
	}
	
	.cancel-btn {
		background-color: #f1f5f9;
		color: #64748b;
	}
	
	.confirm-btn {
		background: linear-gradient(135deg, #42b983, #2cb673);
		color: #fff;
		box-shadow: 0 4rpx 12rpx rgba(7, 193, 96, 0.3);
	}
	
	.cancel-btn:active, .confirm-btn:active {
		transform: scale(0.98);
	}
	
	/* 密码重置弹窗样式 */
	.reset-content {
		margin: 30rpx 0;
		padding: 24rpx;
		background-color: #f8fafc;
		border-radius: 12rpx;
		line-height: 1.6;
		font-size: 28rpx;
		color: #475569;
	}
	
	.new-password {
		margin-top: 24rpx;
		background-color: #fff;
		padding: 16rpx 24rpx;
		border-radius: 8rpx;
		border-left: 4rpx solid #42b983;
	}
	
	.password-label {
		font-size: 28rpx;
		color: #334155;
		margin-right: 10rpx;
		font-weight: 500;
	}
	
	.password-value {
		font-size: 30rpx;
		color: #3b82f6;
		font-weight: bold;
		letter-spacing: 2rpx;
	}
	
	.action-btn.reset-btn {
		background-color: #ebf5ff;
	}
	
	.action-btn.reset-btn .action-text {
		color: #0076ff;
	}
</style> 