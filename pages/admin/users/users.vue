<template>
	<view class="container">
		<view class="filter-bar">
			<view class="filter-item">
				<picker @change="handleRoleChange" :value="currentRoleIndex" :range="roleOptions" range-key="name">
					<view class="picker-box">
						<text class="picker-text">{{roleOptions[currentRoleIndex].name}}</text>
						<text class="picker-arrow">▼</text>
					</view>
				</picker>
			</view>
			
			<view class="action-btns">
				<button class="add-btn" size="mini" @click="showAddUserModal">新增用户</button>
			</view>
		</view>
		
		<view class="user-list">
			<view class="no-data" v-if="users.length === 0">
				<image class="no-data-icon" src="/static/images/no-data.png" mode="aspectFit"></image>
				<text class="no-data-text">暂无用户</text>
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
				</view>
			</view>
		</view>
		
		<!-- 加载更多 -->
		<view class="load-more" v-if="users.length > 0 && hasMoreData">
			<button class="load-btn" size="mini" @click="loadMore" :loading="isLoading">加载更多</button>
		</view>
		
		<!-- 新增用户弹窗 -->
		<uni-popup ref="addUserPopup" type="center">
			<view class="popup-content">
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
		</uni-popup>
		
		<!-- 编辑用户弹窗 -->
		<uni-popup ref="editUserPopup" type="center">
			<view class="popup-content">
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
		</uni-popup>
		
		<!-- 更改角色弹窗 -->
		<uni-popup ref="changeRolePopup" type="center">
			<view class="popup-content">
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
							<text>{{roleOptions[changeRoleData.newRoleIndex+1].name}}</text>
							<text class="picker-arrow">▼</text>
						</view>
					</picker>
				</view>
				<view class="popup-btns">
					<button class="cancel-btn" size="mini" @click="hideChangeRolePopup">取消</button>
					<button class="confirm-btn" size="mini" @click="submitChangeRole">确定</button>
				</view>
			</view>
		</uni-popup>
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
			
			// 加载用户列表
			loadUsers() {
				this.isLoading = true;
				
				const role = this.roleOptions[this.currentRoleIndex].id;
				
				uniCloud.callFunction({
					name: 'user',
					data: {
						action: 'getUsers',
						data: {
							role: role || undefined, // 如果是全部角色，则不传role
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
				
				this.$refs.addUserPopup.open();
			},
			
			// 隐藏新增用户弹窗
			hideAddUserPopup() {
				this.$refs.addUserPopup.close();
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
				
				this.$refs.editUserPopup.open();
			},
			
			// 隐藏编辑用户弹窗
			hideEditUserPopup() {
				this.$refs.editUserPopup.close();
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
				
				this.changeRoleData = {
					id: user._id,
					username: user.name || user.username,
					currentRole: user.role,
					newRoleIndex: roleIndex
				};
				
				this.$refs.changeRolePopup.open();
			},
			
			// 隐藏更改角色弹窗
			hideChangeRolePopup() {
				this.$refs.changeRolePopup.close();
			},
			
			// 处理新角色变化
			handleNewRoleChange(e) {
				this.changeRoleData.newRoleIndex = e.detail.value;
			},
			
			// 提交更改角色
			submitChangeRole() {
				// 获取新角色ID（+1是因为roleOptions的第一项是"全部角色"）
				const newRole = this.roleOptions[this.changeRoleData.newRoleIndex + 1].id;
				
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
		justify-content: space-between;
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
	
	.action-btns {
		margin-left: 20rpx;
	}
	
	.add-btn {
		background-color: #07c160;
		color: #fff;
	}
	
	.user-list {
		margin-top: 20rpx;
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
	
	.user-item {
		background-color: #fff;
		border-radius: 16rpx;
		padding: 30rpx;
		margin-bottom: 30rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
	}
	
	.user-info {
		margin-bottom: 20rpx;
	}
	
	.info-row {
		display: flex;
		align-items: center;
		margin-bottom: 10rpx;
	}
	
	.user-name {
		font-size: 32rpx;
		font-weight: bold;
		margin-right: 20rpx;
	}
	
	.user-role {
		font-size: 24rpx;
		color: #fff;
		padding: 4rpx 16rpx;
		border-radius: 10rpx;
	}
	
	.role-admin {
		background-color: #e64340;
	}
	
	.role-rater {
		background-color: #07c160;
	}
	
	.role-user {
		background-color: #1989fa;
	}
	
	.user-username {
		font-size: 28rpx;
		color: #666;
	}
	
	.user-actions {
		display: flex;
		justify-content: flex-end;
		padding-top: 20rpx;
		border-top: 1rpx solid #f5f5f5;
	}
	
	.action-btn {
		margin-left: 30rpx;
		padding: 6rpx 20rpx;
		border-radius: 6rpx;
		background-color: #f8f8f8;
	}
	
	.action-btn.delete {
		background-color: #f8d0d0;
	}
	
	.action-text {
		font-size: 24rpx;
		color: #333;
	}
	
	.action-btn.delete .action-text {
		color: #e64340;
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
		width: 600rpx;
		padding: 30rpx;
	}
	
	.popup-title {
		font-size: 32rpx;
		font-weight: bold;
		text-align: center;
		margin-bottom: 30rpx;
	}
	
	.form-item {
		margin-bottom: 20rpx;
	}
	
	.form-label {
		font-size: 28rpx;
		color: #333;
		margin-bottom: 10rpx;
		display: block;
	}
	
	.form-input {
		height: 80rpx;
		border: 1rpx solid #eee;
		border-radius: 8rpx;
		padding: 0 20rpx;
		font-size: 28rpx;
	}
	
	.form-picker {
		height: 80rpx;
		border: 1rpx solid #eee;
		border-radius: 8rpx;
		padding: 0 20rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 28rpx;
	}
	
	.current-user, .current-role {
		height: 80rpx;
		line-height: 80rpx;
		border: 1rpx solid #eee;
		border-radius: 8rpx;
		padding: 0 20rpx;
		font-size: 28rpx;
		background-color: #f8f8f8;
		display: block;
	}
	
	.role-text-admin {
		color: #e64340;
	}
	
	.role-text-rater {
		color: #07c160;
	}
	
	.role-text-user {
		color: #1989fa;
	}
	
	.popup-btns {
		display: flex;
		justify-content: space-between;
		margin-top: 40rpx;
	}
	
	.cancel-btn, .confirm-btn {
		width: 45%;
	}
	
	.cancel-btn {
		background-color: #f5f5f5;
		color: #666;
	}
	
	.confirm-btn {
		background-color: #07c160;
		color: #fff;
	}
</style> 