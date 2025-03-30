<template>
	<view class="login-container">
		<view class="logo-box">
			<image class="logo" src="/static/images/logo.png" mode="aspectFit"></image>
			<text class="title">干部评分系统</text>
		</view>
		
		<view class="form-box">
			<view class="input-item">
				<text class="label">用户名</text>
				<input v-model="username" class="input" placeholder="请输入用户名" />
			</view>
			
			<view class="input-item">
				<text class="label">密码</text>
				<input v-model="password" type="password" class="input" placeholder="请输入密码" />
			</view>
			
			<button class="login-btn" @click="handleLogin">登录</button>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				username: '',
				password: ''
			}
		},
		methods: {
			handleLogin() {
				if (!this.username || !this.password) {
					uni.showToast({
						title: '请输入用户名和密码',
						icon: 'none'
					});
					return;
				}
				
				// 调用登录云函数
				uniCloud.callFunction({
					name: 'user',
					data: {
						action: 'login',
						data: {
							username: this.username,
							password: this.password
						}
					}
				}).then(res => {
					const { code, msg, data } = res.result;
					
					if (code === 0) {
						// 登录成功
						// 保存用户信息和token
						uni.setStorageSync('token', data.token);
						uni.setStorageSync('userInfo', data.user);
						
						// 根据角色跳转到不同页面
						if (data.user.role === 'admin') {
							// 管理员跳转到首页
							uni.switchTab({
								url: '/pages/index/index'
							});
						} else if (data.user.role === 'rater') {
							// 打分成员跳转到首页
							uni.switchTab({
								url: '/pages/index/index'
							});
						} else {
							// 普通用户跳转到首页
							uni.switchTab({
								url: '/pages/index/index'
							});
						}
					} else {
						// 登录失败
						uni.showToast({
							title: msg || '登录失败',
							icon: 'none'
						});
					}
				}).catch(err => {
					console.error(err);
					uni.showToast({
						title: '登录失败，请检查网络',
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
	
	.logo-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 80rpx;
	}
	
	.logo {
		width: 200rpx;
		height: 200rpx;
	}
	
	.title {
		font-size: 40rpx;
		font-weight: bold;
		margin-top: 20rpx;
	}
	
	.form-box {
		width: 100%;
	}
	
	.input-item {
		margin-bottom: 40rpx;
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
	
	.login-btn {
		margin-top: 60rpx;
		height: 90rpx;
		line-height: 90rpx;
		background-color: #07c160;
		color: #fff;
	}
</style> 