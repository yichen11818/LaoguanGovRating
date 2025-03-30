<template>
	<view class="container">
		<view class="profile-header">
			<view class="avatar-box">
				<image class="avatar" :src="userInfo.avatar || '/static/images/default-avatar.png'" mode="aspectFill"></image>
			</view>
			<view class="user-info">
				<text class="user-name">{{userInfo.name || '未设置姓名'}}</text>
				<view class="user-role" :class="'role-' + userInfo.role">
					<text>{{getRoleName(userInfo.role)}}</text>
				</view>
			</view>
		</view>
		
		<view class="profile-card">
			<view class="section-title">基本信息</view>
			
			<view class="form-group">
				<view class="form-item">
					<text class="item-label">用户名</text>
					<text class="item-value">{{userInfo.username || ''}}</text>
				</view>
				<view class="form-item">
					<text class="item-label">姓名</text>
					<view class="item-input">
						<input type="text" v-model="userInfo.name" placeholder="请输入姓名" />
					</view>
				</view>
				<view class="form-item">
					<text class="item-label">角色</text>
					<text class="item-value">{{getRoleName(userInfo.role)}}</text>
				</view>
			</view>
			
			<button class="save-btn" @click="saveUserInfo">保存信息</button>
		</view>
		
		<view class="profile-card">
			<view class="section-title">修改密码</view>
			
			<view class="form-group">
				<view class="form-item">
					<text class="item-label">原密码</text>
					<view class="item-input">
						<input type="password" v-model="passwordForm.oldPassword" placeholder="请输入原密码" />
					</view>
				</view>
				<view class="form-item">
					<text class="item-label">新密码</text>
					<view class="item-input">
						<input type="password" v-model="passwordForm.newPassword" placeholder="请输入新密码" />
					</view>
				</view>
				<view class="form-item">
					<text class="item-label">确认密码</text>
					<view class="item-input">
						<input type="password" v-model="passwordForm.confirmPassword" placeholder="请再次输入新密码" />
					</view>
				</view>
			</view>
			
			<button class="save-btn pwd-btn" @click="changePassword">修改密码</button>
		</view>
		
		<view class="profile-card">
			<view class="section-title">操作</view>
			
			<view class="action-list">
				<view class="action-item" @click="clearCache">
					<text class="action-icon">🧹</text>
					<text class="action-text">清除缓存</text>
					<text class="action-arrow">❯</text>
				</view>
				<view class="action-item" @click="aboutUs">
					<text class="action-icon">ℹ️</text>
					<text class="action-text">关于我们</text>
					<text class="action-arrow">❯</text>
				</view>
				<view class="action-item logout" @click="confirmLogout">
					<text class="action-icon">🚪</text>
					<text class="action-text">退出登录</text>
					<text class="action-arrow">❯</text>
				</view>
			</view>
		</view>
		
		<!-- 版本信息 -->
		<view class="version-info">
			<text>v1.0.0</text>
		</view>
		
		<!-- 退出登录确认弹窗 -->
		<uni-popup ref="logoutPopup" type="dialog">
			<uni-popup-dialog type="warn" title="确认退出" content="确定要退出登录吗？" :before-close="true" @confirm="logout" @close="closeLogoutPopup"></uni-popup-dialog>
		</uni-popup>
		
		<!-- 关于我们弹窗 -->
		<uni-popup ref="aboutPopup" type="center">
			<view class="about-popup">
				<view class="about-header">
					<text class="about-title">关于我们</text>
					<view class="popup-close" @click="closeAboutPopup">✕</view>
				</view>
				<view class="about-content">
					<image class="about-logo" src="/static/images/logo.png" mode="aspectFit"></image>
					<text class="about-name">干部考核评分系统</text>
					<text class="about-version">v1.0.0</text>
					<text class="about-desc">本系统用于干部考核评分，提供评分表管理、考核对象管理和评分记录管理等功能。</text>
					<text class="about-copyright">Copyright © 2023 All Rights Reserved</text>
				</view>
			</view>
		</uni-popup>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				userInfo: {
					_id: '',
					username: '',
					name: '',
					role: 1,
					avatar: ''
				},
				passwordForm: {
					oldPassword: '',
					newPassword: '',
					confirmPassword: ''
				}
			}
		},
		onLoad() {
			this.loadUserInfo();
		},
		methods: {
			// 加载用户信息
			loadUserInfo() {
				// 从本地存储获取用户信息
				const userInfoStr = uni.getStorageSync('userInfo');
				if (userInfoStr) {
					this.userInfo = JSON.parse(userInfoStr);
				}
				
				// 从服务器获取最新的用户信息
				uniCloud.callFunction({
					name: 'user',
					data: {
						action: 'getUserInfo',
						data: {}
					}
				}).then(res => {
					if (res.result.code === 0) {
						this.userInfo = res.result.data;
						// 更新本地存储
						uni.setStorageSync('userInfo', JSON.stringify(this.userInfo));
					}
				});
			},
			
			// 获取角色名称
			getRoleName(role) {
				const roleMap = {
					1: '普通用户',
					2: '评分员',
					3: '管理员'
				};
				return roleMap[role] || '未知角色';
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
				
				uniCloud.callFunction({
					name: 'user',
					data: {
						action: 'updateUserInfo',
						data: {
							name: this.userInfo.name
						}
					}
				}).then(res => {
					uni.hideLoading();
					
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
					console.error(err);
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
						title: '两次输入的密码不一致',
						icon: 'none'
					});
					return;
				}
				
				uni.showLoading({
					title: '修改中...'
				});
				
				uniCloud.callFunction({
					name: 'user',
					data: {
						action: 'changePassword',
						data: {
							oldPassword: this.passwordForm.oldPassword,
							newPassword: this.passwordForm.newPassword
						}
					}
				}).then(res => {
					uni.hideLoading();
					
					if (res.result.code === 0) {
						uni.showToast({
							title: '密码修改成功',
							icon: 'success'
						});
						
						// 重置表单
						this.passwordForm = {
							oldPassword: '',
							newPassword: '',
							confirmPassword: ''
						};
					} else {
						uni.showToast({
							title: res.result.msg || '密码修改失败',
							icon: 'none'
						});
					}
				}).catch(err => {
					uni.hideLoading();
					console.error(err);
					uni.showToast({
						title: '密码修改失败，请检查网络',
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
			
			// 关于我们
			aboutUs() {
				this.$refs.aboutPopup.open();
			},
			
			// 关闭关于我们弹窗
			closeAboutPopup() {
				this.$refs.aboutPopup.close();
			},
			
			// 确认退出登录
			confirmLogout() {
				this.$refs.logoutPopup.open();
			},
			
			// 关闭退出登录确认弹窗
			closeLogoutPopup() {
				this.$refs.logoutPopup.close();
			},
			
			// 退出登录
			logout() {
				// 清除登录信息
				uni.removeStorageSync('token');
				uni.removeStorageSync('userInfo');
				
				// 跳转到登录页
				uni.reLaunch({
					url: '/pages/login/login'
				});
			}
		}
	}
</script>

<style>
	.container {
		padding: 30rpx;
	}
	
	/* 头像和用户信息 */
	.profile-header {
		display: flex;
		align-items: center;
		margin-bottom: 40rpx;
	}
	
	.avatar-box {
		width: 150rpx;
		height: 150rpx;
		border-radius: 50%;
		overflow: hidden;
		background-color: #f5f5f5;
		margin-right: 30rpx;
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
	}
	
	.user-role {
		display: inline-block;
		font-size: 24rpx;
		padding: 4rpx 16rpx;
		border-radius: 20rpx;
	}
	
	.role-1 {
		background-color: #f5f5f5;
		color: #666;
	}
	
	.role-2 {
		background-color: #e6f3fc;
		color: #1989fa;
	}
	
	.role-3 {
		background-color: #e6f7ed;
		color: #07c160;
	}
	
	/* 信息卡片 */
	.profile-card {
		background-color: #fff;
		border-radius: 16rpx;
		padding: 30rpx;
		margin-bottom: 30rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
	}
	
	.section-title {
		font-size: 34rpx;
		font-weight: bold;
		margin-bottom: 30rpx;
		position: relative;
		padding-left: 20rpx;
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
	}
	
	.form-item {
		display: flex;
		align-items: center;
		padding: 20rpx 0;
		border-bottom: 1rpx solid #f5f5f5;
	}
	
	.form-item:last-child {
		border-bottom: none;
	}
	
	.item-label {
		width: 140rpx;
		font-size: 28rpx;
		color: #666;
	}
	
	.item-value {
		flex: 1;
		font-size: 28rpx;
		color: #333;
	}
	
	.item-input {
		flex: 1;
	}
	
	.item-input input {
		height: 60rpx;
		font-size: 28rpx;
	}
	
	.save-btn {
		background-color: #07c160;
		color: #fff;
		font-size: 30rpx;
		border-radius: 8rpx;
		margin-top: 20rpx;
	}
	
	.pwd-btn {
		background-color: #1989fa;
	}
	
	/* 操作列表 */
	.action-list {
		margin-bottom: 20rpx;
	}
	
	.action-item {
		display: flex;
		align-items: center;
		padding: 30rpx 0;
		border-bottom: 1rpx solid #f5f5f5;
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
	}
	
	.action-arrow {
		font-size: 24rpx;
		color: #ccc;
	}
	
	.logout .action-text {
		color: #fa5151;
	}
	
	/* 版本信息 */
	.version-info {
		text-align: center;
		padding: 30rpx 0;
		color: #999;
		font-size: 24rpx;
	}
	
	/* 关于我们弹窗 */
	.about-popup {
		background-color: #fff;
		border-radius: 16rpx;
		width: 600rpx;
		overflow: hidden;
	}
	
	.about-header {
		padding: 30rpx;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1rpx solid #f5f5f5;
	}
	
	.about-title {
		font-size: 32rpx;
		font-weight: bold;
	}
	
	.popup-close {
		font-size: 24rpx;
		color: #999;
		width: 40rpx;
		height: 40rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background-color: #f5f5f5;
	}
	
	.about-content {
		padding: 40rpx 30rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	
	.about-logo {
		width: 150rpx;
		height: 150rpx;
		margin-bottom: 30rpx;
	}
	
	.about-name {
		font-size: 34rpx;
		font-weight: bold;
		margin-bottom: 10rpx;
	}
	
	.about-version {
		font-size: 24rpx;
		color: #999;
		margin-bottom: 30rpx;
	}
	
	.about-desc {
		font-size: 28rpx;
		color: #666;
		text-align: center;
		line-height: 1.5;
		margin-bottom: 40rpx;
	}
	
	.about-copyright {
		font-size: 24rpx;
		color: #999;
	}
</style> 