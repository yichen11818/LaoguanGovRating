<template>
	<view class="login-container">
		<view class="header">
			<text class="title">干部评分系统</text>
			<text class="sub-title">{{
				isLoginMode ? '账号登录' : 
				isForgetMode ? '申请密码重置' : '用户注册'
			}}</text>
		</view>
		
		<view class="form-box">
			<!-- 登录/注册/找回密码共用 -->
			<view class="input-item">
				<text class="label">账号</text>
				<input v-model="formData.username" class="input" placeholder="请输入账号" />
			</view>
			
			<!-- 登录和注册模式显示密码 -->
			<view class="input-item" v-if="!isForgetMode">
				<text class="label">密码</text>
				<input v-model="formData.password" type="password" class="input" placeholder="请输入密码" />
			</view>
			
			<!-- 注册模式下显示额外字段 -->
			<block v-if="!isLoginMode && !isForgetMode">
				<view class="input-item">
					<text class="label">确认密码</text>
					<input v-model="formData.confirmPassword" type="password" class="input" placeholder="请再次输入密码" />
				</view>
				
				<view class="input-item">
					<text class="label">姓名</text>
					<input v-model="formData.name" class="input" placeholder="请输入真实姓名" />
				</view>
				
				<view class="input-item">
					<text class="label">工作单位</text>
					<input v-model="formData.workUnit" class="input" placeholder="请输入工作单位" />
				</view>
			</block>
			
			<!-- 找回密码模式下显示描述信息 -->
			<block v-if="isForgetMode">
				<view class="password-reset-info">
					<text class="info-text">请输入您的账号，系统将向管理员提交密码重置申请。管理员审核后，将会重置您的密码并联系您。</text>
				</view>
			</block>
			
			<button class="submit-btn" @click="handleSubmit">{{
				isLoginMode ? '登录' : 
				isForgetMode ? '提交重置申请' : '注册'
			}}</button>
			
			<view class="action-links">
				<text class="link-text" @click="switchToLogin" v-if="!isLoginMode">已有账号？点击登录</text>
				<text class="link-text" @click="switchToRegister" v-if="isLoginMode || isForgetMode">没有账号？点击注册</text>
				<text class="link-text" @click="switchToForget" v-if="isLoginMode">忘记密码？</text>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				isLoginMode: true,
				isForgetMode: false,
				formData: {
					username: '',
					password: '',
					confirmPassword: '',
					name: '',
					workUnit: ''
				}
			}
		},
		methods: {
			// 切换到登录模式
			switchToLogin() {
				this.isLoginMode = true;
				this.isForgetMode = false;
				this.resetForm();
			},
			
			// 切换到注册模式
			switchToRegister() {
				this.isLoginMode = false;
				this.isForgetMode = false;
				this.resetForm();
			},
			
			// 切换到忘记密码模式
			switchToForget() {
				this.isLoginMode = false;
				this.isForgetMode = true;
				this.resetForm();
			},
			
			// 重置表单
			resetForm() {
				this.formData = {
					username: '',
					password: '',
					confirmPassword: '',
					name: '',
					workUnit: ''
				};
			},
			
			// 表单提交处理
			handleSubmit() {
				if (this.isLoginMode) {
					this.handleLogin();
				} else if (this.isForgetMode) {
					this.handleResetPasswordRequest();
				} else {
					this.handleRegister();
				}
			},
			
			// 登录处理
			handleLogin() {
				if (!this.formData.username || !this.formData.password) {
					uni.showToast({
						title: '请输入账号和密码',
						icon: 'none'
					});
					return;
				}
				
				console.log('开始登录流程:', {username: this.formData.username});
				
				uni.showLoading({
					title: '登录中...'
				});
				
				// 调用登录云函数
				uniCloud.callFunction({
					name: 'user',
					data: {
						action: 'login',
						data: {
							username: this.formData.username,
							password: this.formData.password
						}
					}
				}).then(res => {
					uni.hideLoading();
					console.log('登录请求返回数据:', res.result);
					const { code, msg, data } = res.result;
					
					if (code === 0) {
						// 登录成功
						console.log('登录成功，获取到的用户信息:', data.user);
						console.log('用户角色:', data.user.role);
						// 保存用户信息和token
						uni.setStorageSync('token', data.token);
						uni.setStorageSync('userInfo', JSON.stringify(data.user));
						console.log('用户信息和token已保存到本地存储');
						
						uni.showToast({
							title: '登录成功',
							icon: 'success'
						});
						
						// 跳转到首页
						setTimeout(() => {
							console.log('即将跳转到首页');
							uni.switchTab({
								url: '/pages/index/index'
							});
						}, 1500);
					} else {
						// 登录失败
						console.error('登录失败:', msg);
						uni.showToast({
							title: msg || '登录失败',
							icon: 'none'
						});
					}
				}).catch(err => {
					uni.hideLoading();
					console.error('登录请求异常:', err);
					uni.showToast({
						title: '登录失败，请检查网络',
						icon: 'none'
					});
				});
			},
			
			// 注册处理
			handleRegister() {
				// 表单验证
				if (!this.formData.username) {
					uni.showToast({
						title: '请输入账号',
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
				
				if (this.formData.password.length < 6) {
					uni.showToast({
						title: '密码长度不能少于6位',
						icon: 'none'
					});
					return;
				}
				
				if (this.formData.password !== this.formData.confirmPassword) {
					uni.showToast({
						title: '两次输入的密码不一致',
						icon: 'none'
					});
					return;
				}
				
				if (!this.formData.name) {
					uni.showToast({
						title: '请输入真实姓名',
						icon: 'none'
					});
					return;
				}
				
				if (!this.formData.workUnit) {
					uni.showToast({
						title: '请输入工作单位',
						icon: 'none'
					});
					return;
				}
				
				uni.showLoading({
					title: '注册中...'
				});
				
				// 调用注册云函数
				uniCloud.callFunction({
					name: 'user',
					data: {
						action: 'register',
						data: {
							username: this.formData.username,
							password: this.formData.password,
							name: this.formData.name,
							workUnit: this.formData.workUnit
						}
					}
				}).then(res => {
					uni.hideLoading();
					const { code, msg } = res.result;
					
					if (code === 0) {
						// 注册成功
						uni.showToast({
							title: '注册成功，请登录',
							icon: 'success'
						});
						
						// 切换到登录模式
						setTimeout(() => {
							this.isLoginMode = true;
							this.isForgetMode = false;
							// 保留用户名，清空其他字段
							const username = this.formData.username;
							this.formData = {
								username: username,
								password: '',
								confirmPassword: '',
								name: '',
								workUnit: ''
							};
						}, 1500);
					} else {
						// 注册失败
						uni.showToast({
							title: msg || '注册失败',
							icon: 'none'
						});
					}
				}).catch(err => {
					uni.hideLoading();
					console.error(err);
					uni.showToast({
						title: '注册失败，请检查网络',
						icon: 'none'
					});
				});
			},
			
			// 申请重置密码
			handleResetPasswordRequest() {
				// 表单验证
				if (!this.formData.username) {
					uni.showToast({
						title: '请输入账号',
						icon: 'none'
					});
					return;
				}
				
				uni.showLoading({
					title: '提交申请中...'
				});
				
				// 调用申请重置密码云函数
				uniCloud.callFunction({
					name: 'user',
					data: {
						action: 'resetPasswordRequest',
						data: {
							username: this.formData.username
						}
					}
				}).then(res => {
					uni.hideLoading();
					const { code, msg } = res.result;
					
					if (code === 0) {
						// 申请成功
						uni.showModal({
							title: '申请已提交',
							content: '密码重置申请已提交，请等待管理员审核。审核通过后，管理员将通过其他渠道通知您新密码。',
							showCancel: false,
							success: () => {
								// 切换到登录模式
								this.isLoginMode = true;
								this.isForgetMode = false;
								this.formData.username = '';
							}
						});
					} else {
						// 申请失败
						uni.showToast({
							title: msg || '申请失败',
							icon: 'none'
						});
					}
				}).catch(err => {
					uni.hideLoading();
					console.error(err);
					uni.showToast({
						title: '申请失败，请检查网络',
						icon: 'none'
					});
				});
			}
		}
	}
</script>

<style>
	.login-container {
		padding: 60rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
	}
	
	.header {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 80rpx;
	}
	
	.title {
		font-size: 44rpx;
		font-weight: bold;
		margin-bottom: 20rpx;
		color: #333;
	}
	
	.sub-title {
		font-size: 32rpx;
		color: #666;
	}
	
	.form-box {
		width: 100%;
	}
	
	.input-item {
		margin-bottom: 30rpx;
	}
	
	.label {
		font-size: 28rpx;
		color: #333;
		margin-bottom: 10rpx;
		display: block;
	}
	
	.input {
		border: 1rpx solid #ddd;
		height: 80rpx;
		border-radius: 8rpx;
		padding: 0 20rpx;
		background-color: #f8f8f8;
	}
	
	.password-reset-info {
		background-color: #f6f6f6;
		padding: 30rpx;
		border-radius: 8rpx;
		margin-bottom: 30rpx;
	}
	
	.info-text {
		font-size: 28rpx;
		color: #666;
		line-height: 1.5;
	}
	
	.submit-btn {
		margin-top: 50rpx;
		height: 90rpx;
		line-height: 90rpx;
		background-color: #07c160;
		color: #fff;
		border-radius: 8rpx;
		font-size: 32rpx;
	}
	
	.action-links {
		margin-top: 40rpx;
		display: flex;
		justify-content: space-around;
		flex-wrap: wrap;
	}
	
	.link-text {
		color: #07c160;
		font-size: 28rpx;
		padding: 10rpx;
	}
</style> 