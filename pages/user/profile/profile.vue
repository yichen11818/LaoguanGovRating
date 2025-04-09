<template>
	<view class="profile-container">
		<view class="profile-header">
			<view class="avatar-box">
				<image class="avatar" :src="userInfo.avatar || '../../../static/images/default-avatar.png'" mode="aspectFill"></image>
			</view>
			<view class="user-info">
				<text class="user-name">{{userInfo.name || '游客'}}</text>
				<view class="user-role" :class="'role-' + userInfo.role">
					<text>{{getRoleName(userInfo.role)}}</text>
				</view>
			</view>
		</view>
		
		<!-- 未登录状态显示登录提示 -->
		<view class="login-prompt" v-if="!isLoggedIn">
			<view class="profile-card">
				<view class="guest-message">
					<image class="guest-icon" src="../../../static/images/user.png" mode="aspectFit"></image>
					<text class="guest-text">您当前为游客模式，请登录以使用更多功能</text>
					<button class="profile-login-btn" @click="goToLogin">去登录</button>
				</view>
			</view>
		</view>
		
		<!-- 登录状态显示用户信息和操作 -->
		<block v-if="isLoggedIn">
			<view class="profile-card">
				<view class="section-title">基本信息</view>
				
				<view class="form-group">
					<view class="form-item">
						<view class="item-row">
							<text class="item-label">账号</text>
							<text class="item-value">{{userInfo.username || ''}}</text>
						</view>
					</view>
					<view class="form-item">
						<view class="item-row">
							<text class="item-label">姓名</text>
							<view class="item-input">
								<input type="text" v-model="userInfo.name" placeholder="请输入姓名" />
							</view>
						</view>
					</view>
					<view class="form-item">
						<view class="item-row">
							<text class="item-label">角色</text>
							<text class="item-value">{{getRoleName(userInfo.role)}}</text>
						</view>
					</view>
					<view class="form-item">
						<view class="item-row">
							<text class="item-label">工作单位</text>
							<view class="item-input">
								<input type="text" v-model="userInfo.workUnit" placeholder="请输入工作单位" />
							</view>
						</view>
					</view>
				</view>
				
				<button class="profile-save-btn" @click="saveUserInfo">保存信息</button>
			</view>
			
			<view class="profile-card">
				<view class="section-title">修改密码</view>
				
				<view class="form-group">
					<view class="form-item">
						<view class="item-row">
							<text class="item-label">原密码</text>
							<view class="item-input">
								<input type="password" v-model="passwordForm.oldPassword" placeholder="请输入原密码" />
							</view>
						</view>
					</view>
					<view class="form-item">
						<view class="item-row">
							<text class="item-label">新密码</text>
							<view class="item-input">
								<input type="password" v-model="passwordForm.newPassword" placeholder="请输入新密码" />
							</view>
						</view>
					</view>
					<view class="form-item">
						<view class="item-row">
							<text class="item-label">确认密码</text>
							<view class="item-input">
								<input type="password" v-model="passwordForm.confirmPassword" placeholder="请再次输入新密码" />
							</view>
						</view>
					</view>
				</view>
				
				<button class="profile-save-btn pwd-btn" @click="changePassword">修改密码</button>
			</view>
			
			<view class="profile-card">
				<view class="section-title">操作</view>
				
				<view class="action-list">
					<view class="action-item" @click="clearCache">
						<text class="action-icon">🧹</text>
						<text class="action-text">清除缓存</text>
						<text class="action-arrow">❯</text>
					</view>
					<view class="action-item logout" @click="confirmLogout">
						<text class="action-icon">🚪</text>
						<text class="action-text">退出登录</text>
						<text class="action-arrow">❯</text>
					</view>
				</view>
			</view>
		</block>
		
		<!-- 版本信息 -->
		<view class="version-info">
			<text>v1.0.0</text>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				isLoggedIn: false,
				userInfo: {
					_id: '',
					username: '',
					name: '游客',
					role: 1,
					avatar: ''
				},
				passwordForm: {
					oldPassword: '',
					newPassword: '',
					confirmPassword: ''
				},
				isInitialPassword: false // 标记是否是初始密码
			}
		},
		onLoad(options) {
			console.log('个人资料页面加载参数:', options);
			// 从本地存储获取初始密码标记
			const needInitPassword = uni.getStorageSync('needInitPassword');
			if (needInitPassword === 'true') {
				this.isInitialPassword = true;
				// 读取后立即清除标记
				uni.removeStorageSync('needInitPassword');
			}
		},
		onShow() {
			console.log('=== 页面显示 - 开始检查登录状态 ===');
			this.checkLoginStatus();
			
			// 处理初始密码的情况
			if (this.isInitialPassword) {
				// 弹窗提示修改密码
				uni.showToast({
					title: '请修改初始密码',
					icon: 'none',
					duration: 2000
				});
				
				// 检查是否存在手机号，并自动填充初始密码
				if (this.userInfo && this.userInfo.phone) {
					const defaultPassword = this.userInfo.phone.slice(-6);
					this.passwordForm.oldPassword = defaultPassword;
					console.log('自动填充初始密码:', defaultPassword);
				}
			}
		},
		methods: {
			// 检查登录状态
			checkLoginStatus() {
				const token = uni.getStorageSync('token');
				const userInfoStr = uni.getStorageSync('userInfo');
				
				console.log('检查登录状态: token存在?', !!token);
				console.log('检查登录状态: userInfo存在?', !!userInfoStr);
				
				if (token && userInfoStr) {
					this.isLoggedIn = true;
					this.userInfo = JSON.parse(userInfoStr);
					console.log('用户已登录，从本地存储获取的用户信息:', this.userInfo);
					console.log('用户角色:', this.userInfo.role, '(' + this.getRoleName(this.userInfo.role) + ')');
					this.loadUserInfo();
					
					// 检查是否使用初始密码登录，如果是则自动填充密码字段
					const isUsingDefaultPassword = uni.getStorageSync('isUsingDefaultPassword');
					if (isUsingDefaultPassword && this.userInfo.phone) {
						const defaultPassword = this.userInfo.phone.slice(-6);
						this.passwordForm.oldPassword = defaultPassword;
						console.log('检测到使用初始密码，自动填充原密码:', defaultPassword);
					}
				} else {
					this.isLoggedIn = false;
					this.userInfo = {
						name: '游客',
						role: 1
					};
					console.log('用户未登录，设置为游客模式');
				}
			},
			
			// 前往登录页
			goToLogin() {
				console.log('跳转到登录页面');
				uni.navigateTo({
					url: '/pages/login/login'
				});
			},
			
			// 加载用户信息
			loadUserInfo() {
				// 从本地存储获取用户信息
				const userInfoStr = uni.getStorageSync('userInfo');
				if (userInfoStr) {
					this.userInfo = JSON.parse(userInfoStr);
					console.log('从本地存储加载用户信息:', this.userInfo);
				}
				
				console.log('开始从服务器获取最新用户信息');
				// 从服务器获取最新的用户信息，需要传递用户名
				uniCloud.callFunction({
					name: 'user',
					data: {
						action: 'getUserInfo',
						data: {
							username: this.userInfo.username // 传递用户名给云函数
						}
					}
				}).then(res => {
					console.log('服务器返回用户信息:', res.result);
					if (res.result.code === 0) {
						this.userInfo = res.result.data;
						console.log('更新后的用户信息:', this.userInfo);
						console.log('用户角色:', this.userInfo.role, '(' + this.getRoleName(this.userInfo.role) + ')');
						// 更新本地存储
						uni.setStorageSync('userInfo', JSON.stringify(this.userInfo));
					} else {
						console.error('获取用户信息失败:', res.result.msg);
					}
				}).catch(err => {
					console.error('调用云函数失败:', err);
				});
			},
			
			// 获取角色名称
			getRoleName(role) {
				// 数字角色映射
				const numericRoleMap = {
					1: '普通用户',
					2: '评分员',
					3: '管理员'
				};
				
				// 字符串角色映射
				const stringRoleMap = {
					'user': '普通用户',
					'rater': '评分员',
					'admin': '管理员'
				};
				
				// 先检查是否是数字角色
				if (numericRoleMap[role]) {
					return numericRoleMap[role];
				}
				
				// 再检查是否是字符串角色
				if (stringRoleMap[role]) {
					return stringRoleMap[role];
				}
				
				// 如果都不是，返回游客
				return '游客';
			},
			
			// 保存用户信息
			saveUserInfo() {
				if (!this.userInfo.name) {
					uni.showToast({
						title: '姓名不能为空',
						icon: 'none'
					});
					return;
				}
				
				uni.showLoading({
					title: '保存中...'
				});
				
				console.log('准备保存用户信息:', {
					name: this.userInfo.name,
					workUnit: this.userInfo.workUnit,
					username: this.userInfo.username
				});
				
				uniCloud.callFunction({
					name: 'user',
					data: {
						action: 'updateUserInfo',
						data: {
							name: this.userInfo.name,
							workUnit: this.userInfo.workUnit,
							username: this.userInfo.username // 传递用户名
						}
					}
				}).then(res => {
					uni.hideLoading();
					console.log('保存用户信息结果:', res.result);
					
					if (res.result.code === 0) {
						uni.showToast({
							title: '保存成功',
							icon: 'success'
						});
						
						// 更新本地存储
						uni.setStorageSync('userInfo', JSON.stringify(this.userInfo));
					} else {
						uni.showToast({
							title: res.result.msg || '保存失败',
							icon: 'none'
						});
					}
				}).catch(err => {
					uni.hideLoading();
					console.error('保存用户信息出错:', err);
					uni.showToast({
						title: '保存失败，请检查网络',
						icon: 'none'
					});
				});
			},
			
			// 修改密码
			changePassword() {
				// 表单验证
				if (!this.passwordForm.oldPassword) {
					uni.showToast({
						title: '请输入原密码',
						icon: 'none'
					});
					return;
				}
				
				if (!this.passwordForm.newPassword) {
					uni.showToast({
						title: '请输入新密码',
						icon: 'none'
					});
					return;
				}
				
				if (this.passwordForm.newPassword.length < 6) {
					uni.showToast({
						title: '新密码长度不能少于6位',
						icon: 'none'
					});
					return;
				}
				
				if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
					uni.showToast({
						title: '两次输入的新密码不一致',
						icon: 'none'
					});
					return;
				}
				
				// 检查新密码是否与初始密码相同
				if (this.userInfo.phone) {
					const defaultPassword = this.userInfo.phone.slice(-6);
					if (this.passwordForm.newPassword === defaultPassword) {
						uni.showToast({
							title: '新密码不能与初始密码相同',
							icon: 'none'
						});
						return;
					}
				}
				
				uni.showLoading({
					title: '修改中...'
				});
				
				// 调用云函数修改密码
				uniCloud.callFunction({
					name: 'user',
					data: {
						action: 'changePassword',
						data: {
							username: this.userInfo.username,
							oldPassword: this.passwordForm.oldPassword,
							newPassword: this.passwordForm.newPassword
						}
					}
				}).then(res => {
					uni.hideLoading();
					console.log('修改密码返回:', res.result);
					
					if (res.result.code === 0) {
						// 修改成功
						uni.showToast({
							title: '密码修改成功',
							icon: 'success'
						});
						
						// 记录用户已重置密码
						uni.setStorageSync('hasResetPassword', 'true');
						// 清除初始密码状态
						uni.removeStorageSync('isUsingDefaultPassword');
						
						// 清空表单
						this.passwordForm = {
							oldPassword: '',
							newPassword: '',
							confirmPassword: ''
						};
						
						// 如果是从初始密码提醒页面进入的，修改成功后返回首页
						if (this.isInitialPassword) {
							setTimeout(() => {
								uni.switchTab({
									url: '/pages/index/index'
								});
							}, 1500);
						}
					} else {
						// 修改失败
						uni.showToast({
							title: res.result.msg || '密码修改失败',
							icon: 'none'
						});
					}
				}).catch(err => {
					uni.hideLoading();
					console.error('修改密码请求错误:', err);
					uni.showToast({
						title: '网络异常，请重试',
						icon: 'none'
					});
				});
			},
			
			// 清除缓存
			clearCache() {
				uni.showLoading({
					title: '清除中...'
				});
				
				// 清除除了登录信息和用户信息之外的缓存
				try {
					const token = uni.getStorageSync('token');
					const userInfo = uni.getStorageSync('userInfo');
					
					uni.clearStorageSync();
					
					// 重新存储登录信息
					if (token) {
						uni.setStorageSync('token', token);
					}
					
					if (userInfo) {
						uni.setStorageSync('userInfo', userInfo);
					}
					
					uni.hideLoading();
					uni.showToast({
						title: '缓存清除成功',
						icon: 'success'
					});
				} catch (e) {
					uni.hideLoading();
					console.error(e);
					uni.showToast({
						title: '缓存清除失败',
						icon: 'none'
					});
				}
			},
			
			// 确认退出登录
			confirmLogout() {
				uni.showModal({
					title: '确认退出',
					content: '确定要退出登录吗？',
					success: (res) => {
						if (res.confirm) {
							this.logout();
						}
					}
				});
			},
			
			// 退出登录
			logout() {
				console.log('执行退出登录操作');
				// 清除登录信息
				uni.removeStorageSync('token');
				uni.removeStorageSync('userInfo');
				
				// 更新状态
				this.isLoggedIn = false;
				this.userInfo = {
					name: '游客',
					role: 1
				};
				console.log('退出登录完成，用户状态已重置为游客');
				
				uni.showToast({
					title: '已退出登录',
					icon: 'success'
				});
			}
		}
	}
</script>

<style scoped>
	.profile-container {
		padding: 30rpx;
		background-color: #f8f8f8;
		min-height: 100vh;
		box-sizing: border-box;
		width: 100%;
	}
	
	/* 头像和用户信息 */
	.profile-header {
		display: flex;
		align-items: center;
		margin-bottom: 40rpx;
		width: 100%;
	}
	
	.avatar-box {
		width: 150rpx;
		height: 150rpx;
		border-radius: 50%;
		overflow: hidden;
		background-color: #f5f5f5;
		margin-right: 30rpx;
		box-shadow: 0 4rpx 8rpx rgba(0, 0, 0, 0.1);
		flex-shrink: 0;
	}
	
	.avatar {
		width: 100%;
		height: 100%;
	}
	
	.user-info {
		flex: 1;
	}
	
	.user-name {
		font-size: 36rpx;
		font-weight: bold;
		display: block;
		margin-bottom: 16rpx;
		text-align: left;
	}
	
	.user-role {
		display: inline-block;
		font-size: 24rpx;
		padding: 4rpx 16rpx;
		border-radius: 20rpx;
		text-align: left;
	}
	
	/* 角色样式 */
	.role-user, .role-1 {
		background-color: #f5f5f5;
		color: #666;
	}
	
	.role-rater, .role-2 {
		background-color: #e6f3fc;
		color: #1989fa;
	}
	
	.role-admin, .role-3 {
		background-color: #e6f7ed;
		color: #07c160;
	}
	
	/* 未登录提示 */
	.login-prompt {
		margin-bottom: 30rpx;
		width: 100%;
	}
	
	.guest-message {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 30rpx;
	}
	
	.guest-icon {
		width: 100rpx;
		height: 100rpx;
		margin-bottom: 20rpx;
	}
	
	.guest-text {
		font-size: 30rpx;
		color: #666;
		text-align: center;
		margin-bottom: 30rpx;
	}
	
	.profile-login-btn {
		background-color: #07c160;
		color: #fff;
		font-size: 30rpx;
		width: 60%;
		border-radius: 40rpx;
	}
	
	/* 信息卡片 */
	.profile-card {
		background-color: #fff;
		border-radius: 16rpx;
		padding: 30rpx;
		margin-bottom: 30rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
		width: 100%;
		box-sizing: border-box;
	}
	
	.section-title {
		font-size: 34rpx;
		font-weight: bold;
		margin-bottom: 30rpx;
		position: relative;
		padding-left: 20rpx;
		text-align: left;
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
	
	/* 表单样式 */
	.form-group {
		margin-bottom: 30rpx;
		width: 100%;
	}
	
	.form-item {
		position: relative;
		padding: 20rpx 0;
		border-bottom: 1rpx solid #f5f5f5;
		width: 100%;
		box-sizing: border-box;
		display: block;
		clear: both;
		overflow: hidden;
	}
	
	.item-row {
		display: flex;
		align-items: flex-start;
		width: 100%;
		justify-content: flex-start;
		position: relative;
	}
	
	.item-label {
		width: 140rpx;
		font-size: 28rpx;
		color: #666;
		text-align: left !important;
		flex-shrink: 0;
	}
	
	.item-value {
		flex: 1;
		font-size: 28rpx;
		color: #333;
		text-align: left !important;
		padding-left: 0;
	}
	
	.item-input {
		flex: 1;
		text-align: left !important;
	}
	
	.item-input input {
		height: 60rpx;
		font-size: 28rpx;
		width: 100%;
		text-align: left !important;
		padding-left: 0;
	}
	
	/* 强制文本左对齐 */
	.form-item text,
	.form-item input,
	.form-item view {
		text-align: left !important;
	}
	
	.profile-save-btn {
		background-color: #07c160;
		color: #fff;
		font-size: 30rpx;
		border-radius: 8rpx;
		margin-top: 20rpx;
		width: 100%;
	}
	
	.pwd-btn {
		background-color: #1989fa;
	}
	
	/* 操作列表 */
	.action-list {
		margin-bottom: 20rpx;
		width: 100%;
	}
	
	.action-item {
		display: flex;
		align-items: center;
		padding: 30rpx 0;
		border-bottom: 1rpx solid #f5f5f5;
		width: 100%;
		box-sizing: border-box;
	}
	
	.action-item:last-child {
		border-bottom: none;
	}
	
	.action-icon {
		font-size: 40rpx;
		margin-right: 20rpx;
	}
	
	.action-text {
		flex: 1;
		font-size: 30rpx;
		color: #333;
		text-align: left;
	}
	
	.action-arrow {
		font-size: 24rpx;
		color: #ccc;
	}
	
	.logout .action-text {
		color: #fa5151;
	}
	
	/* 版本信息居中 */
	.version-info {
		text-align: center;
		padding: 30rpx 0;
		color: #999;
		font-size: 24rpx;
		width: 100%;
	}
	
	.version-info text {
		text-align: center;
	}
	
	/* 响应式布局 */
	@media screen and (max-width: 375px) {
		.avatar-box {
			width: 120rpx;
			height: 120rpx;
		}
		
		.user-name {
			font-size: 32rpx;
		}
		
		.profile-card {
			padding: 20rpx;
		}
		
		.form-item {
			padding: 15rpx 0;
		}
	}
	
	/* 其他文本元素左对齐 */
	.profile-container text,
	.profile-container input,
	.profile-container view {
		text-align: left;
	}
</style> 