<template>
  <view class="container">
    <view class="header">
      <text class="title">{{ title }}</text>
    </view>
    
    <!-- 仅当没有group_id参数时显示筛选区域 -->
    <view class="filter-section" v-if="!hasUrlGroupId">
      <uni-forms>
        <uni-forms-item label="年份">
          <uni-easyinput v-model="year" placeholder="请输入年份" />
        </uni-forms-item>
        <uni-forms-item label="表格组">
          <uni-data-select v-model="group_id" :localdata="groupList" @change="handleGroupChange" />
        </uni-forms-item>
      </uni-forms>
      
      <button type="primary" @click="getPreviewData">预览</button>
      <button type="default" @click="exportData" style="margin-left: 10px;">导出Excel</button>
    </view>
    
    <!-- 当有group_id参数时显示导出按钮 -->
    <view class="export-section" v-else>
      <button type="default" @click="exportData">导出Excel</button>
    </view>
    
    <view v-if="loading" class="loading">
      <uni-load-more status="loading" :content-text="{ contentdown: '加载中...' }" />
    </view>
    
    <view v-else-if="previewData.length > 0" class="table-container">
      <!-- 使用scrollview包裹表格，实现横向滚动 -->
      <scroll-view scroll-x="true" class="table-scroll">
        <view class="table-header">
          <view class="th th-fixed">序号</view>
          <view class="th th-fixed">姓名</view>
          
          <!-- 班子评分人 -->
          <view class="th" v-for="(rater, index) in banziRaterNames" :key="'banzi-' + index">
            {{ rater.name }}（班子评分）
          </view>
          
          <!-- 驻村评分人 -->
          <view class="th" v-for="(rater, index) in zhucunRaterNames" :key="'zhucun-' + index">
            {{ rater.name }}（驻村评分）
          </view>
          
          <!-- 计算列 -->
          <view class="th">班子评分平均分</view>
          <view class="th">驻村评分平均分</view>
          <view class="th">总分(班子：驻村=7：3)</view>
          <view class="th">备注</view>
        </view>
        
        <view class="table-body">
          <view class="table-row" v-for="(row, rowIndex) in previewData" :key="rowIndex">
            <view class="td td-fixed">{{ rowIndex + 1 }}</view>
            <view class="td td-fixed">{{ row.name }}</view>
            
            <!-- 班子评分 -->
            <view class="td" v-for="(rater, raterIndex) in banziRaterNames" :key="'banzi-score-' + raterIndex">
              {{ row.banziRatings[rater.username] || '' }}
            </view>
            
            <!-- 驻村评分 -->
            <view class="td" v-for="(rater, raterIndex) in zhucunRaterNames" :key="'zhucun-score-' + raterIndex">
              {{ row.zhucunRatings[rater.username] || '' }}
            </view>
            
            <!-- 计算列 -->
            <view class="td">{{ row.banziAvgScore || '' }}</view>
            <view class="td">{{ row.zhucunAvgScore || '' }}</view>
            <view class="td">{{ row.totalScore || '' }}</view>
            <view class="td">{{ row.remark || '' }}</view>
          </view>
        </view>
      </scroll-view>
    </view>
    
    <view v-else-if="error" class="error">
      <text>{{ error }}</text>
    </view>
    
    <view v-else class="empty-data">
      <text>暂无数据，请选择表格组并点击预览</text>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      title: '评分表预览(A类)',
      year: new Date().getFullYear().toString(),
      group_id: '',
      groupList: [],
      loading: false,
      error: '',
      hasUrlGroupId: false, // 新增标记，表示是否从URL参数获取了group_id
      
      // 评分数据
      subjects: [],
      banziRaterNames: [],
      zhucunRaterNames: [],
      previewData: [],
      
      // 原始数据
      banziTableIds: [],
      zhucunTableIds: [],
      bZhucunTableIds: [],
      banziRatingsResult: { data: [] },
      zhucunRatingsResult: { data: [] },
      bZhucunRatingsResult: { data: [] },
      
      // 导出状态
      exporting: false,
      exportTaskId: ''
    };
  },
  
  onLoad(options) {
    // 检查是否有URL参数
    if (options && options.group_id) {
      this.hasUrlGroupId = true; // 设置标记
      this.group_id = options.group_id;
      this.year = options.year || '';
      const description = options.description || '';
      
      // 更新标题
      this.title = `老关镇${this.year}年度${description ? '(' + description + ')' : ''}评分汇总表预览(A类)`;
      
      // 自动加载预览数据
      this.getPreviewData();
    } else {
      // 如果没有参数，加载组列表
      this.getGroups();
    }
  },
  
  methods: {
    // 获取表格组列表
    async getGroups() {
      try {
        this.loading = true;
        const { data: res } = await uniCloud.callFunction({
          name: 'ratingTable',
          data: {
            action: 'getGroups',
            data: {}
          }
        });
        
        if (res.code === 0) {
          this.groupList = res.data.map(group => ({
            value: group._id,
            text: `${group.year}年${group.description ? ' - ' + group.description : ''}`
          }));
          
          if (this.groupList.length > 0) {
            this.group_id = this.groupList[0].value;
            this.year = this.groupList[0].text.split('年')[0];
          }
        } else {
          this.error = res.msg || '获取表格组失败';
        }
      } catch (e) {
        this.error = e.message || '获取表格组失败';
      } finally {
        this.loading = false;
      }
    },
    
    // 表格组选择变化
    handleGroupChange(e) {
      const selectedGroup = this.groupList.find(group => group.value === this.group_id);
      if (selectedGroup) {
        this.year = selectedGroup.text.split('年')[0];
      }
    },
    
    // 获取预览数据
    async getPreviewData() {
      if (!this.group_id) {
        this.error = '请选择表格组';
        return;
      }
      
      try {
        this.loading = true;
        this.error = '';
        this.previewData = [];
        
        // 1. 检查是否有A类评分表
        const checkResult = await this.checkATypeRatings();
        if (!checkResult) return;
        
        // 2. 获取考核对象
        await this.getSubjects();
        
        // 3. 获取评分数据
        await this.getRatingsData();
        
        // 4. 处理评分数据
        await this.processRatingsData();
        
        // 5. 生成预览数据
        this.generatePreviewData();
        
        this.loading = false;
      } catch (e) {
        console.error('获取预览数据失败:', e);
        this.error = e.message || '获取预览数据失败';
        this.loading = false;
      }
    },
    
    // 检查是否有A类评分表
    async checkATypeRatings() {
      try {
        // 调用云函数，不使用解构赋值，防止返回结构异常导致错误
        const result = await uniCloud.callFunction({
          name: 'ratingTable',
          data: {
            action: 'checkATypeRatings',
            data: {
              group_id: this.group_id,
              year: this.year
            }
          }
        });
        
        // 检查result是否有效
        if (!result) {
          console.error('云函数调用失败，返回结果为null或undefined');
          this.error = '检查A类评分表失败: 云函数调用失败';
          this.loading = false;
          return false;
        }
        
        // 检查result.result是否有效
        if (!result.result) {
          console.error('云函数返回结果无效:', result);
          this.error = '检查A类评分表失败: 返回结果无效';
          this.loading = false;
          return false;
        }
        
        const res = result.result;
        
        // 检查res.code是否存在
        if (res.code === undefined || res.code === null) {
          console.error('云函数返回结果缺少code字段:', res);
          this.error = '检查A类评分表失败: 返回结果格式错误';
          this.loading = false;
          return false;
        }
        
        if (res.code !== 0) {
          this.error = res.msg || '检查A类评分表失败';
          this.loading = false;
          return false;
        }
        
        if (!res.hasBanziTable) {
          this.error = '未找到班子评分表，请检查是否有type=1的评分表';
          this.loading = false;
          return false;
        }
        
        if (!res.hasZhucunTable) {
          this.error = '未找到驻村工作评分表，请检查是否有type=2的评分表';
          this.loading = false;
          return false;
        }
        
        return true;
      } catch (error) {
        console.error('检查A类评分表出错:', error);
        this.error = '检查A类评分表失败: ' + (error.message || '未知错误');
        this.loading = false;
        return false;
      }
    },
    
    // 获取所有表格
    async getTables() {
      try {
        // 获取所有表格
        const result = await uniCloud.callFunction({
          name: 'ratingTable',
          data: {
            action: 'getTables',
            data: {
              group_id: this.group_id,
              pageSize: 1000
            }
          }
        });
        
        // 检查result是否有效
        if (!result) {
          throw new Error('获取表格数据失败: 云函数调用失败');
        }
        
        // 检查result.result是否有效
        if (!result.result) {
          throw new Error('获取表格数据失败: 返回结果无效');
        }
        
        const res = result.result;
        
        // 检查res.code是否存在
        if (res.code === undefined || res.code === null) {
          throw new Error('获取表格数据失败: 返回结果格式错误');
        }
        
        if (res.code !== 0) {
          throw new Error(res.msg || '获取表格失败');
        }
        
        // 收集所有班子评分表和驻村评分表的ID
        this.banziTableIds = [];
        this.zhucunTableIds = [];
        this.bZhucunTableIds = [];
        
        for (const table of res.data.list) {
          // 收集班子评分表
          if (table.type === 1) {
            this.banziTableIds.push(table._id);
          }
          
          // 收集驻村评分表
          if (table.type === 2) {
            this.zhucunTableIds.push(table._id);
          }
          
          // 收集B类驻村表
          if (table.type === 4) {
            this.bZhucunTableIds.push(table._id);
          }
        }
        
        if (this.banziTableIds.length === 0) {
          throw new Error('未找到班子评分表，请检查是否有type=1的评分表');
        }
        
        if (this.zhucunTableIds.length === 0) {
          throw new Error('未找到驻村工作评分表，请检查是否有type=2的评分表');
        }
      } catch (error) {
        console.error('获取表格失败:', error);
        throw error; // 重新抛出错误，让调用者处理
      }
    },
    
    // 获取考核对象
    async getSubjects() {
      try {
        // 先获取所有表格
        await this.getTables();
        
        // 获取所有考核对象（基于所有班子评分表）- 不筛选
        const result = await uniCloud.callFunction({
          name: 'ratingTable',
          data: {
            action: 'getRatingsDetail',
            data: {
              group_id: this.group_id,
              table_type: 1  // 班子评分表
            }
          }
        });
        
        // 检查result是否有效
        if (!result) {
          throw new Error('获取考核对象失败: 云函数调用失败');
        }
        
        // 检查result.result是否有效
        if (!result.result) {
          throw new Error('获取考核对象失败: 返回结果无效');
        }
        
        const res = result.result;
        
        // 检查res.code是否存在
        if (res.code === undefined || res.code === null) {
          throw new Error('获取考核对象失败: 返回结果格式错误');
        }
        
        if (res.code !== 0) {
          throw new Error(res.msg || '获取考核对象失败');
        }
        
        // 不过滤班子评分表的考核对象，直接使用全部
        this.subjects = res.data.subjects || [];
        
        if (this.subjects.length === 0) {
          throw new Error('未找到考核对象');
        }
        
        // 获取考核对象ID与position的映射，用于筛选
        this.subjectPositionMap = {};
        this.subjectIdToNameMap = {};
        for (const subject of this.subjects) {
          this.subjectPositionMap[subject._id] = subject.position || '';
          this.subjectPositionMap[subject.name] = subject.position || '';
          this.subjectIdToNameMap[subject._id] = subject.name;
        }
      } catch (error) {
        console.error('获取考核对象失败:', error);
        throw error; // 重新抛出错误，让调用者处理
      }
    },
    
    // 获取评分数据
    async getRatingsData() {
      // 辅助函数：检查考核对象是否为A类
      const isATypeSubject = (subjectId) => {
        // 检查考核对象的position是否不为"B类"
        return this.subjectPositionMap[subjectId] !== 'B类';
      };
      
      try {
        // 获取班子评分数据 - 不筛选
        const banziRes = await uniCloud.callFunction({
          name: 'ratingTable',
          data: {
            action: 'getRatingsDetail',
            data: {
              group_id: this.group_id,
              table_type: 1  // 班子评分表
            }
          }
        });
        
        // 检查返回结果是否有效
        if (!banziRes || !banziRes.result) {
          throw new Error('获取班子评分数据失败: 返回结果无效');
        }
        
        if (banziRes.result.code !== 0) {
          throw new Error(banziRes.result.msg || '获取班子评分数据失败');
        }
        
        this.banziRatingsResult = { 
          data: banziRes.result.data.ratings || [] 
        };
        this.banziRaters = banziRes.result.data.raters || [];
        
        // 获取A类驻村评分数据
        const zhucunRes = await uniCloud.callFunction({
          name: 'ratingTable',
          data: {
            action: 'getRatingsDetail',
            data: {
              group_id: this.group_id,
              table_type: 2  // A类驻村表
            }
          }
        });
        
        // 检查返回结果是否有效
        if (!zhucunRes || !zhucunRes.result) {
          throw new Error('获取A类驻村评分数据失败: 返回结果无效');
        }
        
        if (zhucunRes.result.code !== 0) {
          throw new Error(zhucunRes.result.msg || '获取A类驻村评分数据失败');
        }
        
        // 筛选只包含A类考核对象的评分记录
        const zhucunRatings = zhucunRes.result.data.ratings || [];
        const filteredZhucunRatings = zhucunRatings.filter(rating => {
          return isATypeSubject(rating.subject_id);
        });
        
        this.zhucunRatingsResult = { data: filteredZhucunRatings };
        this.zhucunRaters = zhucunRes.result.data.raters || [];
        
        // 获取B类驻村表中对A类考核对象的评分数据
        const bZhucunRes = await uniCloud.callFunction({
          name: 'ratingTable',
          data: {
            action: 'getRatingsDetail',
            data: {
              group_id: this.group_id,
              table_type: 4  // B类驻村表
            }
          }
        });
        
        // 检查B类驻村表返回结果
        if (bZhucunRes && bZhucunRes.result && bZhucunRes.result.code === 0) {
          // 筛选只包含A类考核对象的评分记录
          const bZhucunRatings = bZhucunRes.result.data.ratings || [];
          const filteredBZhucunRatings = bZhucunRatings.filter(rating => {
            return isATypeSubject(rating.subject_id);
          });
          
          this.bZhucunRatingsResult = { data: filteredBZhucunRatings };
          
          // 合并驻村评分人（确保不重复）
          const zhucunRaterIds = new Set(this.zhucunRaters.map(r => r.id));
          bZhucunRes.result.data.raters.forEach(rater => {
            if (!zhucunRaterIds.has(rater.id)) {
              this.zhucunRaters.push(rater);
            }
          });
        } else {
          console.log('未找到B类驻村表或获取失败:', bZhucunRes);
          this.bZhucunRatingsResult = { data: [] };
        }
        
        // 转换评分人数组为便于显示的格式
        this.banziRaterNames = this.banziRaters.map(rater => ({
          name: rater.name || rater.username,
          username: rater.username
        }));
        
        this.zhucunRaterNames = this.zhucunRaters.map(rater => ({
          name: rater.name || rater.username,
          username: rater.username
        }));
      } catch (error) {
        console.error('获取评分数据失败:', error);
        throw error; // 重新抛出错误，让调用者处理
      }
    },
    
    // 处理评分数据
    processRatingsData() {
      // 构建评分数据，按照考核对象进行整合
      this.ratingData = {};
      
      // 处理班子评分数据
      for (const rating of this.banziRatingsResult.data) {
        const subject_id = rating.subject_id;
        const subjectName = this.subjectIdToNameMap[subject_id] || subject_id;
        
        if (!this.ratingData[subjectName]) {
          this.ratingData[subjectName] = {
            banziRatings: {},
            zhucunRatings: {}
          };
        }
        this.ratingData[subjectName].banziRatings[rating.rater_id] = rating.total_score;
      }
      
      // 处理驻村工作评分数据
      this.zhucunScoresBySubject = {};
      
      // 处理所有驻村评分表的数据
      const processZhucunRatings = (ratings) => {
        for (const rating of ratings) {
          const subject_id = rating.subject_id;
          const subjectName = this.subjectIdToNameMap[subject_id] || subject_id;
          
          if (!this.ratingData[subjectName]) {
            this.ratingData[subjectName] = {
              banziRatings: {},
              zhucunRatings: {}
            };
          }
          this.ratingData[subjectName].zhucunRatings[rating.rater_id] = rating.total_score;
          
          if (!this.zhucunScoresBySubject[subjectName]) {
            this.zhucunScoresBySubject[subjectName] = [];
          }
          this.zhucunScoresBySubject[subjectName].push(rating.total_score);
        }
      };
      
      // 处理A类驻村表评分数据
      processZhucunRatings(this.zhucunRatingsResult.data);
      
      // 处理B类驻村表中对A类考核对象的评分数据
      processZhucunRatings(this.bZhucunRatingsResult.data);
      
      // 计算驻村工作评分的平均分
      let zhucunAverageScore = 0;
      let zhucunTotalScores = 0;
      let zhucunScoreCount = 0;
      
      // 计算所有驻村评分的平均分
      for (const subject in this.zhucunScoresBySubject) {
        const scores = this.zhucunScoresBySubject[subject];
        if (scores.length > 0) {
          const sum = scores.reduce((acc, score) => acc + score, 0);
          zhucunTotalScores += sum;
          zhucunScoreCount += scores.length;
        }
      }
      
      if (zhucunScoreCount > 0) {
        this.zhucunAverageScore = zhucunTotalScores / zhucunScoreCount;
      } else {
        this.zhucunAverageScore = 0;
      }

      // 添加数据汇总日志
      console.log('========== 评分数据汇总 ==========');
      
      // 打印班子评分人的评分情况
      console.log('========== 班子评分详情 ==========');
      this.banziRaterNames.forEach(rater => {
        let logMessage = `评分人 ${rater.name}（班子评分）: `;
        let subjectScores = [];
        
        // 遍历所有考核对象
        for (const subjectName in this.ratingData) {
          const score = this.ratingData[subjectName].banziRatings[rater.username];
          if (score !== undefined) {
            subjectScores.push(`${subjectName} A类 ${score}分`);
          }
        }
        
        logMessage += subjectScores.join('，');
        console.log(logMessage);
      });
      
      // 打印驻村评分人的评分情况
      console.log('========== 驻村评分详情 ==========');
      this.zhucunRaterNames.forEach(rater => {
        let logMessage = `评分人 ${rater.name}（驻村评分）: `;
        let subjectScores = [];
        
        // 遍历所有考核对象
        for (const subjectName in this.ratingData) {
          const score = this.ratingData[subjectName].zhucunRatings[rater.username];
          if (score !== undefined) {
            subjectScores.push(`${subjectName} A类 ${score}分`);
          }
        }
        
        logMessage += subjectScores.join('，');
        console.log(logMessage);
      });
      
      // 打印汇总后的评分平均分
      console.log('========== 评分平均分 ==========');
      for (const subjectName in this.ratingData) {
        // 计算班子评分平均分
        let banziTotalScore = 0;
        let banziScoreCount = 0;
        for (const rater of this.banziRaterNames) {
          const score = this.ratingData[subjectName].banziRatings[rater.username];
          if (score) {
            banziTotalScore += score;
            banziScoreCount++;
          }
        }
        const banziAvgScore = banziScoreCount > 0 ? (banziTotalScore / banziScoreCount).toFixed(2) : '无';
        
        // 计算驻村评分平均分
        let zhucunTotalScore = 0;
        let zhucunScoreCount = 0;
        for (const rater of this.zhucunRaterNames) {
          const score = this.ratingData[subjectName].zhucunRatings[rater.username];
          if (score) {
            zhucunTotalScore += score;
            zhucunScoreCount++;
          }
        }
        let zhucunAvgScore = '无';
        if (zhucunScoreCount > 0) {
          zhucunAvgScore = (zhucunTotalScore / zhucunScoreCount).toFixed(2);
        } else if (banziScoreCount > 0 && this.zhucunAverageScore > 0) {
          zhucunAvgScore = this.zhucunAverageScore.toFixed(2) + '(全局平均)';
        }
        
        // 计算总分
        let totalScore = '无';
        if (banziScoreCount > 0) {
          if (zhucunScoreCount > 0 || this.zhucunAverageScore > 0) {
            const usedZhucunScore = zhucunScoreCount > 0 ? 
              parseFloat((zhucunTotalScore / zhucunScoreCount).toFixed(2)) : 
              this.zhucunAverageScore;
            totalScore = (parseFloat(banziAvgScore) * 0.7 + usedZhucunScore * 0.3).toFixed(2);
          } else {
            totalScore = banziAvgScore;
          }
        }
        
        console.log(`考核对象 ${subjectName}: 班子平均分=${banziAvgScore}, 驻村平均分=${zhucunAvgScore}, 总分=${totalScore}`);
      }
      
      console.log('全局驻村评分平均分:', this.zhucunAverageScore.toFixed(2));
      console.log('========== 评分数据汇总结束 ==========');
    },
    
    // 生成预览数据
    generatePreviewData() {
      this.previewData = [];
      
      // 为每个考核对象生成一行数据
      for (let i = 0; i < this.subjects.length; i++) {
        const subject = this.subjects[i];
        const subjectName = subject.name;
        const subjectRatingData = this.ratingData[subjectName] || { banziRatings: {}, zhucunRatings: {} };
        
        // 计算班子评分平均分
        let banziTotalScore = 0;
        let banziScoreCount = 0;
        
        for (const rater of this.banziRaters) {
          const score = subjectRatingData.banziRatings[rater.id] || '';
          if (score) {
            banziTotalScore += score;
            banziScoreCount++;
          }
        }
        
        // 班子评分平均分
        const banziAvgScore = banziScoreCount > 0 ? (banziTotalScore / banziScoreCount).toFixed(2) : '';
        
        // 计算驻村评分平均分
        let zhucunTotalScore = 0;
        let zhucunScoreCount = 0;
        
        for (const rater of this.zhucunRaters) {
          const score = subjectRatingData.zhucunRatings[rater.id] || '';
          if (score) {
            zhucunTotalScore += score;
            zhucunScoreCount++;
          }
        }
        
        // 驻村评分平均分
        let zhucunAvgScore = '';
        if (zhucunScoreCount > 0) {
          zhucunAvgScore = (zhucunTotalScore / zhucunScoreCount).toFixed(2);
        } else if (banziScoreCount > 0 && this.zhucunAverageScore > 0) {
          // 如果此人没有驻村评分但有班子评分，使用全局驻村平均分
          zhucunAvgScore = this.zhucunAverageScore.toFixed(2);
        }
        
        // 计算总分（班子70%+驻村30%）
        let totalScore = '';
        if (banziAvgScore) {
          let calculatedZhucunScore = '';
          
          // 驻村评分处理
          if (zhucunScoreCount > 0) {
            calculatedZhucunScore = (zhucunTotalScore / zhucunScoreCount).toFixed(2);
          } else if (this.zhucunAverageScore > 0) {
            calculatedZhucunScore = this.zhucunAverageScore.toFixed(2);
          }
          
          if (calculatedZhucunScore) {
            totalScore = (parseFloat(banziAvgScore) * 0.7 + parseFloat(calculatedZhucunScore) * 0.3).toFixed(2);
          } else {
            totalScore = banziAvgScore; // 如果没有驻村评分，直接使用班子评分
          }
        }
        
        // 添加一行数据
        this.previewData.push({
          name: subjectName,
          banziRatings: subjectRatingData.banziRatings,
          zhucunRatings: subjectRatingData.zhucunRatings,
          banziAvgScore,
          zhucunAvgScore,
          totalScore,
          remark: ''
        });
      }
    },
    
    // 导出Excel
    async exportData() {
      if (!this.group_id) {
        this.error = '请选择表格组';
        return;
      }
      
      try {
        this.exporting = true;
        
        // 调用导出接口
        const { data: res } = await uniCloud.callFunction({
          name: 'ratingTable',
          data: {
            action: 'startExportATypeRatings',
            data: {
              group_id: this.group_id,
              year: this.year
            }
          }
        });
        
        if (res.code === 0 && res.data && res.data.task_id) {
          this.exportTaskId = res.data.task_id;
          
          // 轮询任务状态
          this.pollExportTaskStatus();
        } else {
          uni.showToast({
            title: res.msg || '创建导出任务失败',
            icon: 'none'
          });
          this.exporting = false;
        }
      } catch (e) {
        console.error('导出失败:', e);
        uni.showToast({
          title: e.message || '导出失败',
          icon: 'none'
        });
        this.exporting = false;
      }
    },
    
    // 轮询导出任务状态
    async pollExportTaskStatus() {
      if (!this.exportTaskId) return;
      
      try {
        const { data: res } = await uniCloud.callFunction({
          name: 'ratingTable',
          data: {
            action: 'getExportTaskStatus',
            data: {
              task_id: this.exportTaskId
            }
          }
        });
        
        if (res.code === 0) {
          const task = res.data;
          
          if (task.status === 'completed') {
            // 导出完成
            this.exporting = false;
            
            if (task.result && task.result.fileUrl) {
              uni.showModal({
                title: '导出成功',
                content: '是否立即下载导出的Excel文件？',
                success: (res) => {
                  if (res.confirm) {
                    // 打开文件链接
                    plus.runtime.openURL(task.result.fileUrl);
                  }
                }
              });
            } else {
              uni.showToast({
                title: '导出完成，但未获取到文件链接',
                icon: 'none'
              });
            }
          } else if (task.status === 'failed') {
            // 导出失败
            this.exporting = false;
            uni.showToast({
              title: task.message || '导出任务失败',
              icon: 'none'
            });
          } else {
            // 任务进行中，显示进度
            uni.showLoading({
              title: `${task.message || '导出中'}(${task.progress}%)`
            });
            
            // 继续轮询
            setTimeout(() => {
              this.pollExportTaskStatus();
            }, 1000);
          }
        } else {
          uni.showToast({
            title: res.msg || '获取任务状态失败',
            icon: 'none'
          });
          this.exporting = false;
        }
      } catch (e) {
        console.error('获取导出任务状态失败:', e);
        uni.showToast({
          title: e.message || '获取任务状态失败',
          icon: 'none'
        });
        this.exporting = false;
      }
    }
  }
};
</script>

<style>
.container {
  padding: 15px;
}

.header {
  text-align: center;
  margin-bottom: 20px;
}

.title {
  font-size: 18px;
  font-weight: bold;
}

.filter-section {
  margin-bottom: 20px;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
}

.export-section {
  margin-bottom: 20px;
  display: flex;
  justify-content: flex-end;
}

.loading, .error, .empty-data {
  padding: 30px 0;
  text-align: center;
}

.table-container {
  margin-top: 20px;
}

.table-scroll {
  width: 100%;
  overflow-x: auto;
  white-space: nowrap;
}

.table-header {
  display: flex;
  background-color: #f2f2f2;
  font-weight: bold;
  position: sticky;
  top: 0;
  z-index: 10;
}

.table-row {
  display: flex;
  border-bottom: 1px solid #eee;
}

.table-row:nth-child(even) {
  background-color: #f9f9f9;
}

.th, .td {
  padding: 10px;
  min-width: 100px;
  text-align: center;
  border-right: 1px solid #eee;
  flex-shrink: 0;
}

.th-fixed, .td-fixed {
  position: sticky;
  left: 0;
  background-color: inherit;
  z-index: 1;
}

.td-fixed:nth-child(2) {
  left: 50px;
}

.th-fixed:nth-child(2) {
  left: 50px;
}
</style> 