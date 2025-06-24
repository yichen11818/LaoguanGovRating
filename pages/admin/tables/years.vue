<template>
	<view class="container">
		<view class="header">
			<text class="header-title">评分表年份分类</text>
			<button class="add-btn" @click="navigateToTables">
				<text>查看全部表格</text>
			</button>
		</view>
		
		<view class="year-list" v-if="years.length > 0">
			<view class="year-item" v-for="(year, index) in years" :key="index" @click="navigateToTablesWithYear(year)">
				<view class="year-card">
					<text class="year-text">{{year}}年</text>
					<text class="table-count">{{getTableCountByYear(year)}}张表格</text>
				</view>
			</view>
		</view>
		
		<view class="no-data" v-else>
			<text class="no-data-text">暂无评分表数据</text>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				years: [],
				tablesByYear: {},
				isLoading: false
			}
		},
		onShow() {
			this.loadData();
		},
		methods: {
			// 加载评分表数据并按年份分组
			async loadData() {
				this.isLoading = true;
				
				try {
					const result = await uniCloud.callFunction({
						name: 'ratingTable',
						data: {
							action: 'getTables',
							data: {
								page: 1,
								pageSize: 1000,
								type: 'all'
							}
						}
					});
					
					if (result.result.code === 0) {
						const tables = result.result.data;
						
						// 按年份分组表格
						this.tablesByYear = {};
						const yearSet = new Set();
						
						tables.forEach(table => {
							// 从创建时间或表名中提取年份
							let year;
							
							// 尝试从表名中获取年份（如"2023年第一季度评分表"）
							const yearRegex = /(20\d{2})/;
							const nameMatches = table.name.match(yearRegex);
							
							if (nameMatches && nameMatches[1]) {
								year = nameMatches[1];
							} else if (table.create_time) {
								// 从创建时间中获取年份
								const createDate = new Date(table.create_time);
								year = createDate.getFullYear().toString();
							} else {
								// 如果无法确定年份，则归类到"其他"
								year = "其他";
							}
							
							// 添加到对应年份的数组中
							if (!this.tablesByYear[year]) {
								this.tablesByYear[year] = [];
							}
							this.tablesByYear[year].push(table);
							yearSet.add(year);
						});
						
						// 将年份转为数组并降序排序
						this.years = Array.from(yearSet).sort((a, b) => {
							if (a === "其他") return 1;
							if (b === "其他") return -1;
							return b - a;  // 降序排序，最近的年份在前
						});
					} else {
						uni.showToast({
							title: '获取数据失败',
							icon: 'none'
						});
					}
				} catch (e) {
					console.error('加载评分表数据失败:', e);
					uni.showToast({
						title: '加载数据失败',
						icon: 'none'
					});
				} finally {
					this.isLoading = false;
				}
			},
			
			// 获取指定年份的表格数量
			getTableCountByYear(year) {
				return this.tablesByYear[year] ? this.tablesByYear[year].length : 0;
			},
			
			// 跳转到指定年份的表格列表
			navigateToTablesWithYear(year) {
				uni.navigateTo({
					url: `/pages/admin/tables/tables?year=${year}`
				});
			},
			
			// 跳转到全部表格页面
			navigateToTables() {
				uni.navigateTo({
					url: '/pages/admin/tables/tables'
				});
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
	
	.add-btn {
		background-color: #007AFF;
		color: #FFFFFF;
		font-size: 28rpx;
		padding: 10rpx 30rpx;
		border-radius: 30rpx;
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
</style> 