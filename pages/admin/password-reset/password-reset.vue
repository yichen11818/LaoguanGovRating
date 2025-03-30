<template>
	<view class="container">
		<view class="header">
			<text class="page-title">密码重置管理</text>
		</view>
		
		<view class="filter-bar">
			<view class="filter-item">
				<picker @change="handleStatusChange" :value="statusIndex" :range="statusOptions">
					<view class="picker-box">
						<text class="picker-text">{{statusOptions[statusIndex]}}</text>
						<text class="picker-arrow">▼</text>
					</view>
				</picker>
			</view>
			
			<view class="refresh-btn" @click="loadResetRequests">
				<text class="refresh-icon">⟳</text>
			</view>
		</view>
		
		<view class="no-data" v-if="requestList.length === 0">
			<text class="no-data-text">{{statusIndex === 0 ? '暂无密码重置申请' : statusIndex === 1 ? '暂无待处理申请' : statusIndex === 2 ? '暂无已批准申请' : '暂无已拒绝申请'}}</text>
		</view>
		
		<scroll-view scroll-y="true" class="request-list">
			<view class="request-item" v-for="(item, index) in requestList" :key="index">
				<view class="request-header">
					<view class="user-info">
						<text class="username">账号: {{item.username}}</text>
						<text class="name">姓名: {{item.name}}</text>
					</view>
					<view class="status-tag" :class="'status-' + item.status">
						{{item.status === 'pending' ? '待处理' : item.status === 'approved' ? '已批准' : '已拒绝'}}
					</view>
				</view>
				
				<view class="request-time">
					<text>申请时间: {{formatTime(item.createTime)}}</text>
				</view>
				
				<view class="handle-info" v-if="item.status !== 'pending'">
					<text>处理时间: {{formatTime(item.handleTime)}}</text>
					<text>处理人: {{item.handleAdmin}}</text>
					<text v-if="item.remark">备注: {{item.remark}}</text>
				</view>
				
				<view class="action-buttons" v-if="item.status === 'pending'">
					<button class="action-btn approve-btn" @click="approveRequest(item)">批准</button>
					<button class="action-btn reject-btn" @click="showRejectDialog(item)">拒绝</button>
				</view>
			</view>
		</scroll-view>
		
		<!-- 加载更多 -->
		<view class="load-more" v-if="hasMore && requestList.length > 0" @click="loadMore">
			<text class="load-more-text">{{isLoading ? '加载中...' : '加载更多'}}</text>
		</view>
		
		<!-- 批准确认弹窗 -->
		<uni-popup ref="approvePopup" type="dialog">
			<uni-popup-dialog type="info" title="确认批准" content="批准后，系统将重置该用户密码并生成新密码。您需要将新密码告知用户。" :before-close="true" @confirm="confirmApprove" @close="closeApprovePopup"></uni-popup-dialog>
		</uni-popup>
		
		<!-- 拒绝操作弹窗 -->
		<uni-popup ref="rejectPopup" type="dialog">
			<view class="reject-popup">
				<view class="reject-header">
					<text class="reject-title">拒绝申请</text>
				</view>
				<view class="reject-content">
					<text class="reject-label">拒绝原因：</text>
					<textarea class="reject-reason" v-model="rejectReason" placeholder="请输入拒绝原因（可选）"></textarea>
				</view>
				<view class="reject-buttons">
					<button class="reject-btn cancel-btn" @click="closeRejectPopup">取消</button>
					<button class="reject-btn confirm-btn" @click="confirmReject">确认</button>
				</view>
			</view>
		</uni-popup>
		
		<!-- 重置成功弹窗 -->
		<uni-popup ref="successPopup" type="dialog">
			<view class="success-popup">
				<view class="success-header">
					<text class="success-title">密码重置成功</text>
				</view>
				<view class="success-content">
					<text class="success-text">用户 {{currentRequest.username}} ({{currentRequest.name}}) 的密码已重置。</text>
					<view class="new-password">
						<text class="password-label">新密码：</text>
						<text class="password-value">{{newPassword}}</text>
					</view>
					<text class="success-tip">请妥善保管密码，并及时通知用户。</text>
				</view>
				<view class="success-buttons">
					<button class="success-btn copy-btn" @click="copyPassword">复制密码</button>
					<button class="success-btn confirm-btn" @click="closeSuccessPopup">确认</button>
				</view>
			</view>
		</uni-popup>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				statusOptions: ['全部', '待处理', '已批准', '已拒绝'],
				statusIndex: 1, // 默认显示待处理
				requestList: [],
				page: 1,
				pageSize: 10,
				hasMore: true,
				isLoading: false,
				
				// 当前操作的申请
				currentRequest: {},
				rejectReason: '',
				newPassword: ''
			}
		},
		onLoad() {
			this.loadResetRequests();
		},
		methods: {
			// 加载密码重置申请
			loadResetRequests(refresh = true) {
				if (refresh) {
					this.page = 1;
					this.hasMore = true;
					this.requestList = [];
				}
				
				this.isLoading = true;
				
				// 根据状态过滤
				let status = '';
				if (this.statusIndex === 1) {
					status = 'pending';
				} else if (this.statusIndex === 2) {
					status = 'approved';
				} else if (this.statusIndex === 3) {
					status = 'rejected';
				}
				
				// 调用云函数获取申请列表
				uniCloud.callFunction({
					name: 'user',
					data: {
						action: 'getResetRequests',
						data: {
							status: status,
							page: this.page,
							pageSize: this.pageSize
						}
					}
				}).then(res => {
					this.isLoading = false;
					
					if (res.result.code === 0) {
						const data = res.result.data;
						
						if (refresh) {
							this.requestList = data.list;
						} else {
							this.requestList = [...this.requestList, ...data.list];
						}
						
						// 判断是否还有更多数据
						this.hasMore = this.requestList.length < data.total;
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
				if (this.isLoading || !this.hasMore) return;
				
				this.page++;
				this.loadResetRequests(false);
			},
			
			// 状态筛选变化
			handleStatusChange(e) {
				this.statusIndex = e.detail.value;
				this.loadResetRequests();
			},
			
			// 批准申请
			approveRequest(item) {
				this.currentRequest = item;
				this.$refs.approvePopup.open();
			},
			
			// 关闭批准确认弹窗
			closeApprovePopup() {
				this.$refs.approvePopup.close();
			},
			
			// 确认批准
			confirmApprove() {
				const adminInfo = uni.getStorageSync('userInfo');
				const adminUsername = adminInfo ? JSON.parse(adminInfo).username : '管理员';
				
				uni.showLoading({
					title: '处理中...'
				});
				
				// 调用云函数批准申请
				uniCloud.callFunction({
					name: 'user',
					data: {
						action: 'approveResetRequest',
						data: {
							requestId: this.currentRequest._id,
							adminUsername: adminUsername
						}
					}
				}).then(res => {
					uni.hideLoading();
					
					if (res.result.code === 0) {
						// 保存新密码
						this.newPassword = res.result.data.newPassword;
						
						// 关闭批准弹窗
						this.$refs.approvePopup.close();
						
						// 显示成功弹窗
						setTimeout(() => {
							this.$refs.successPopup.open();
						}, 300);
						
						// 刷新列表
						this.loadResetRequests();
					} else {
						uni.showToast({
							title: res.result.msg || '处理失败',
							icon: 'none'
						});
					}
				}).catch(err => {
					uni.hideLoading();
					console.error(err);
					uni.showToast({
						title: '处理失败，请检查网络',
						icon: 'none'
					});
				});
			},
			
			// 显示拒绝弹窗
			showRejectDialog(item) {
				this.currentRequest = item;
				this.rejectReason = '';
				this.$refs.rejectPopup.open();
			},
			
			// 关闭拒绝弹窗
			closeRejectPopup() {
				this.$refs.rejectPopup.close();
			},
			
			// 确认拒绝
			confirmReject() {
				const adminInfo = uni.getStorageSync('userInfo');
				const adminUsername = adminInfo ? JSON.parse(adminInfo).username : '管理员';
				
				uni.showLoading({
					title: '处理中...'
				});
				
				// 调用云函数拒绝申请
				uniCloud.callFunction({
					name: 'user',
					data: {
						action: 'rejectResetRequest',
						data: {
							requestId: this.currentRequest._id,
							adminUsername: adminUsername,
							remark: this.rejectReason
						}
					}
				}).then(res => {
					uni.hideLoading();
					
					if (res.result.code === 0) {
						uni.showToast({
							title: '已拒绝申请',
							icon: 'success'
						});
						
						// 关闭拒绝弹窗
						this.$refs.rejectPopup.close();
						
						// 刷新列表
						this.loadResetRequests();
					} else {
						uni.showToast({
							title: res.result.msg || '处理失败',
							icon: 'none'
						});
					}
				}).catch(err => {
					uni.hideLoading();
					console.error(err);
					uni.showToast({
						title: '处理失败，请检查网络',
						icon: 'none'
					});
				});
			},
			
			// 关闭成功弹窗
			closeSuccessPopup() {
				this.$refs.successPopup.close();
			},
			
			// 复制密码
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
			
			// 格式化时间
			formatTime(timestamp) {
				if (!timestamp) return '暂无';
				
				const date = new Date(timestamp);
				const year = date.getFullYear();
				const month = (date.getMonth() + 1).toString().padStart(2, '0');
				const day = date.getDate().toString().padStart(2, '0');
				const hour = date.getHours().toString().padStart(2, '0');
				const minute = date.getMinutes().toString().padStart(2, '0');
				
				return `${year}-${month}-${day} ${hour}:${minute}`;
			}
		}
	}
</script>

<style>
	.container {
		padding: 30rpx;
	}
	
	.header {
		margin-bottom: 30rpx;
	}
	
	.page-title {
		font-size: 36rpx;
		font-weight: bold;
		position: relative;
		padding-left: 20rpx;
	}
	
	.page-title::before {
		content: '';
		position: absolute;
		left: 0;
		top: 10rpx;
		width: 8rpx;
		height: 36rpx;
		background-color: #07c160;
		border-radius: 4rpx;
	}
	
	.filter-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 30rpx;
	}
	
	.filter-item {
		min-width: 200rpx;
	}
	
	.picker-box {
		display: flex;
		align-items: center;
		background-color: #f5f5f5;
		padding: 16rpx 20rpx;
		border-radius: 8rpx;
	}
	
	.picker-text {
		flex: 1;
		font-size: 28rpx;
	}
	
	.picker-arrow {
		font-size: 24rpx;
		color: #999;
		margin-left: 10rpx;
	}
	
	.refresh-btn {
		width: 80rpx;
		height: 80rpx;
		border-radius: 50%;
		background-color: #f5f5f5;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.refresh-icon {
		font-size: 40rpx;
		color: #333;
	}
	
	.request-list {
		height: calc(100vh - 250rpx);
	}
	
	.request-item {
		background-color: #fff;
		border-radius: 12rpx;
		padding: 30rpx;
		margin-bottom: 30rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
	}
	
	.request-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 20rpx;
	}
	
	.user-info {
		display: flex;
		flex-direction: column;
	}
	
	.username, .name {
		font-size: 28rpx;
		margin-bottom: 10rpx;
	}
	
	.status-tag {
		font-size: 24rpx;
		padding: 6rpx 16rpx;
		border-radius: 30rpx;
	}
	
	.status-pending {
		background-color: #e6f7ff;
		color: #1890ff;
	}
	
	.status-approved {
		background-color: #e6f7ed;
		color: #07c160;
	}
	
	.status-rejected {
		background-color: #fff1f0;
		color: #f5222d;
	}
	
	.request-time {
		font-size: 26rpx;
		color: #999;
		margin-bottom: 20rpx;
	}
	
	.handle-info {
		display: flex;
		flex-direction: column;
		font-size: 26rpx;
		color: #666;
		background-color: #f9f9f9;
		padding: 20rpx;
		border-radius: 8rpx;
		margin-bottom: 20rpx;
	}
	
	.action-buttons {
		display: flex;
		justify-content: flex-end;
	}
	
	.action-btn {
		font-size: 28rpx;
		padding: 10rpx 40rpx;
		margin-left: 20rpx;
		border-radius: 8rpx;
	}
	
	.approve-btn {
		background-color: #07c160;
		color: #fff;
	}
	
	.reject-btn {
		background-color: #f5222d;
		color: #fff;
	}
	
	.no-data {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 300rpx;
	}
	
	.no-data-text {
		font-size: 28rpx;
		color: #999;
	}
	
	.load-more {
		text-align: center;
		padding: 30rpx 0;
	}
	
	.load-more-text {
		font-size: 28rpx;
		color: #666;
	}
	
	/* 拒绝弹窗样式 */
	.reject-popup {
		background-color: #fff;
		border-radius: 16rpx;
		width: 600rpx;
		overflow: hidden;
	}
	
	.reject-header {
		padding: 30rpx;
		border-bottom: 1rpx solid #eee;
	}
	
	.reject-title {
		font-size: 32rpx;
		font-weight: bold;
		text-align: center;
	}
	
	.reject-content {
		padding: 30rpx;
	}
	
	.reject-label {
		font-size: 28rpx;
		color: #333;
		margin-bottom: 20rpx;
		display: block;
	}
	
	.reject-reason {
		width: 100%;
		height: 200rpx;
		background-color: #f5f5f5;
		border-radius: 8rpx;
		padding: 20rpx;
		font-size: 28rpx;
	}
	
	.reject-buttons {
		display: flex;
		border-top: 1rpx solid #eee;
	}
	
	.reject-btn {
		flex: 1;
		height: 100rpx;
		line-height: 100rpx;
		text-align: center;
		font-size: 32rpx;
	}
	
	.cancel-btn {
		background-color: #f5f5f5;
		color: #333;
	}
	
	.confirm-btn {
		background-color: #07c160;
		color: #fff;
	}
	
	/* 成功弹窗样式 */
	.success-popup {
		background-color: #fff;
		border-radius: 16rpx;
		width: 600rpx;
		overflow: hidden;
	}
	
	.success-header {
		padding: 30rpx;
		border-bottom: 1rpx solid #eee;
	}
	
	.success-title {
		font-size: 32rpx;
		font-weight: bold;
		text-align: center;
		color: #07c160;
	}
	
	.success-content {
		padding: 30rpx;
	}
	
	.success-text {
		font-size: 28rpx;
		color: #333;
		margin-bottom: 30rpx;
		display: block;
	}
	
	.new-password {
		background-color: #f6f6f6;
		padding: 20rpx;
		border-radius: 8rpx;
		margin-bottom: 20rpx;
		display: flex;
		align-items: center;
	}
	
	.password-label {
		font-size: 28rpx;
		color: #666;
		margin-right: 10rpx;
	}
	
	.password-value {
		font-size: 32rpx;
		color: #f5222d;
		font-family: monospace;
		font-weight: bold;
	}
	
	.success-tip {
		font-size: 26rpx;
		color: #999;
	}
	
	.success-buttons {
		display: flex;
		border-top: 1rpx solid #eee;
	}
	
	.success-btn {
		flex: 1;
		height: 100rpx;
		line-height: 100rpx;
		text-align: center;
		font-size: 32rpx;
	}
	
	.copy-btn {
		background-color: #f5f5f5;
		color: #333;
	}
</style> 