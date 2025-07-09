'use strict';
// 导入模块
console.log('开始导入node-xlsx模块...');
const xlsx = require('node-xlsx');
console.log('node-xlsx模块导入成功，类型:', typeof xlsx);

exports.main = async (event, context) => {
  const { action, data } = event;
  
  // 根据操作类型执行不同的操作
  switch (action) {
    case 'exportATypeRatings':
      return await exportATypeRatings(data);
    case 'exportBTypeRatings':
      return await exportBTypeRatings(data);
    default:
      return {
        code: -1,
        msg: '未知操作'
      };
  }
};

// 导出A类评分汇总表
async function exportATypeRatings(data) {
  const db = uniCloud.database();
  const ratingTableCollection = db.collection('rating_tables');
  const userCollection = db.collection('users');
  const subjectCollection = db.collection('subjects');
  const ratingCollection = db.collection('ratings');
  
  const { group_id, year, description, task_id, incremental } = data;
  
  // 更新任务进度的函数
  const updateProgress = async (progress, message) => {
    if (incremental && task_id) {
      try {
        console.log(`更新任务进度: ${progress}%, 消息: ${message}`);
        await uniCloud.callFunction({
          name: 'ratingTable',
          data: {
            action: 'updateExportTaskStatus',
            data: {
              task_id,
              progress,
              message
            }
          }
        });
      } catch (error) {
        console.error('更新进度失败:', error);
      }
    }
  };
  
  try {
    console.log(`开始导出${year}年度${description ? '(' + description + ')' : ''}A类评分汇总表`);
    console.log('导出参数:', JSON.stringify(data));
    
    if (incremental) {
      console.log('使用增量模式导出，任务ID:', task_id);
    }
    
    // 参数校验
    if (!group_id || !year) {
      return {
        code: -1,
        msg: '缺少必要参数'
      };
    }
    
    // 更新进度 - 10%：开始查询表格
    if (incremental) await updateProgress(10, '正在查询评分表...');
    
    // 获取A类班子评分表和驻村工作评分表
    console.log('开始查询A类评分表，参数:', { group_id, year });
    
    // 查询指定group_id的表格
    console.log('开始查询所有表格，group_id:', group_id);
    const allTablesResult = await ratingTableCollection.where({
      group_id
    }).get();
    
    console.log(`找到${allTablesResult.data.length}个属于group_id ${group_id}的表格`);
    console.log('表格详情:', JSON.stringify(allTablesResult.data.map(t => ({
      _id: t._id, 
      name: t.name, 
      type: t.type,
      status: t.status
    }))));
    
    // 如果没有找到表格，返回错误信息
    if (allTablesResult.data.length === 0) {
      console.log('未找到任何表格');
      return {
        code: -1,
        msg: `未找到任何评分表，请检查group_id ${group_id} 是否正确`
      };
    }
    
    // 收集所有班子评分表和驻村评分表的ID
    const banziTableIds = [];
    const zhucunTableIds = [];
    const bZhucunTableIds = []; // 新增: B类驻村表IDs
    
    // 遍历所有表格，收集班子和驻村评分表ID
    console.log('开始收集所有班子评分表(type=1)、驻村评分表(type=2)和B类驻村表(type=4)');
    for (const table of allTablesResult.data) {
      // 收集班子评分表
      if (table.type === 1) {
        banziTableIds.push(table._id);
      }
      
      // 收集驻村评分表
      if (table.type === 2) {
        zhucunTableIds.push(table._id);
      }
      
      // 新增: 收集B类驻村表
      if (table.type === 4) {
        bZhucunTableIds.push(table._id);
      }
    }
    
    console.log(`收集到 ${banziTableIds.length} 个班子评分表、${zhucunTableIds.length} 个驻村评分表和 ${bZhucunTableIds.length} 个B类驻村表`);
    console.log('班子评分表IDs:', JSON.stringify(banziTableIds));
    console.log('驻村评分表IDs:', JSON.stringify(zhucunTableIds));
    console.log('B类驻村表IDs:', JSON.stringify(bZhucunTableIds));
    
    // 检查是否找到了必要的表格
    if (banziTableIds.length === 0) {
      console.log('未找到班子评分表');
      return {
        code: -1,
        msg: '未找到班子评分表，请检查是否有type=1的评分表'
      };
    }
    
    if (zhucunTableIds.length === 0) {
      console.log('未找到驻村评分表');
      return {
        code: -1,
        msg: '未找到驻村工作评分表，请检查是否有type=2的评分表'
      };
    }
    
    console.log('找到必要的评分表，继续导出操作');
    
    // 更新进度 - 20%：获取考核对象
    if (incremental) await updateProgress(20, '正在获取考核对象...');
    
    // 获取所有考核对象（基于所有班子评分表）- 不筛选
    console.log('开始获取所有考核对象，班子评分表不过滤B类考核对象');
    const allSubjectsResult = await subjectCollection.where({
      table_id: db.command.in(banziTableIds)
    }).get();
    
    if (allSubjectsResult.data.length === 0) {
      console.log('未找到任何考核对象');
      return {
        code: -1,
        msg: '未找到考核对象'
      };
    }
    
    console.log(`找到${allSubjectsResult.data.length}个考核对象`);
    
    // 记录考核对象的position分布情况
    const positionDistribution = {};
    allSubjectsResult.data.forEach(subject => {
      const position = subject.position || 'undefined';
      positionDistribution[position] = (positionDistribution[position] || 0) + 1;
    });
    console.log('考核对象position分布:', JSON.stringify(positionDistribution));
    
    // 不过滤班子评分表的考核对象，直接使用全部
    const subjects = allSubjectsResult.data;
    
    console.log(`保留了${subjects.length}个考核对象（包括所有A类和B类）`);
    console.log('考核对象详情:', JSON.stringify(subjects.map(subject => ({
      _id: subject._id,
      name: subject.name,
      position: subject.position,
      organization: subject.department || subject.organization
    }))));
    
    // 更新进度 - 30%：获取评分记录
    if (incremental) await updateProgress(30, '正在获取评分数据...');
    
    // ====== 评分数据收集与筛选 ======
    // A类导出规则：
    // 1. type=1（班子评分表）：包含所有评分数据，不筛选考核对象
    // 2. type=2（A类驻村评分表）：只包含对A类考核对象的评分数据
    // 3. type=4（B类驻村表）：只包含对A类考核对象的评分数据
    
    // 获取所有考核对象ID与position的映射，用于筛选
    const subjectPositionMap = {};
    const subjectIdToNameMap = {};
    const subjectNameToIdMap = {};
    for (const subject of subjects) {
      subjectPositionMap[subject._id] = subject.position || '';
      subjectPositionMap[subject.name] = subject.position || '';
      subjectIdToNameMap[subject._id] = subject.name;
      subjectNameToIdMap[subject.name] = subject._id;
    }
    console.log('创建考核对象position映射表，用于筛选和ID-名称转换');
    
    // 辅助函数：检查考核对象是否为A类
    const isATypeSubject = (subjectId) => {
      // 检查考核对象的position是否不为"B类"
      return subjectPositionMap[subjectId] !== 'B类';
    };
    
    // 获取所有班子评分表的评分记录 - 使用分页查询获取全部数据
    console.log('获取班子评分记录, 所有班子评分表IDs:', JSON.stringify(banziTableIds));
    
    // 分页获取所有班子评分记录
    let banziRatingsResult = { data: [] };
    const pageSize = 500; // 每页获取500条记录
    let hasMore = true;
    let skipCount = 0;
    
    while (hasMore) {
      console.log(`获取班子评分记录 - 第${Math.floor(skipCount/pageSize) + 1}页, skip=${skipCount}, limit=${pageSize}`);
      const tempResult = await ratingCollection.where({
        table_id: db.command.in(banziTableIds)
      }).skip(skipCount).limit(pageSize).get();
      
      banziRatingsResult.data = banziRatingsResult.data.concat(tempResult.data);
      
      if (tempResult.data.length < pageSize) {
        hasMore = false;
      } else {
        skipCount += pageSize;
      }
    }
    
    console.log(`共找到${banziRatingsResult.data.length}条班子评分记录，不做position筛选`);
    
    // 特别检查李鹏的评分记录
    const lpRatingRecords = banziRatingsResult.data.filter(r => r.rater === "13607998208");
    console.log(`李鹏的评分记录总数: ${lpRatingRecords.length}`);
    console.log('李鹏评分的考核对象:', JSON.stringify(lpRatingRecords.map(r => r.subject)));
    
    // 获取所有A类驻村评分表的评分记录，并筛选出A类考核对象
    let zhucunRatingsResult = { data: [] };
    if (zhucunTableIds.length > 0) {
      console.log('获取A类驻村评分记录, 所有A类驻村评分表IDs:', JSON.stringify(zhucunTableIds));
      
      // 分页获取所有A类驻村评分记录
      let hasMore = true;
      let skipCount = 0;
      
      while (hasMore) {
        console.log(`获取A类驻村评分记录 - 第${Math.floor(skipCount/pageSize) + 1}页, skip=${skipCount}, limit=${pageSize}`);
        const tempResult = await ratingCollection.where({
          table_id: db.command.in(zhucunTableIds)
        }).skip(skipCount).limit(pageSize).get();
        
        // 筛选只包含A类考核对象的评分记录
        const filteredZhucunRatings = [];
        for (const rating of tempResult.data) {
          if (isATypeSubject(rating.subject)) {
            filteredZhucunRatings.push(rating);
          } else {
            console.log(`排除A类驻村表中对B类考核对象的评分: ${rating.subject}(${subjectIdToNameMap[rating.subject] || rating.subject})`);
          }
        }
        
        zhucunRatingsResult.data = zhucunRatingsResult.data.concat(filteredZhucunRatings);
        
        if (tempResult.data.length < pageSize) {
          hasMore = false;
        } else {
          skipCount += pageSize;
        }
      }
      
      console.log(`从A类驻村表中筛选出${zhucunRatingsResult.data.length}条对A类考核对象的评分记录`);
    }
    
    // 获取B类驻村表中对A类考核对象的评分记录
    let bZhucunRatingsResult = { data: [] };
    if (bZhucunTableIds.length > 0) {
      console.log('获取B类驻村表中对A类考核对象的评分记录, B类驻村表IDs:', JSON.stringify(bZhucunTableIds));
      
      // 分页获取所有B类驻村评分记录
      let hasMore = true;
      let skipCount = 0;
      
      while (hasMore) {
        console.log(`获取B类驻村评分记录 - 第${Math.floor(skipCount/pageSize) + 1}页, skip=${skipCount}, limit=${pageSize}`);
        const tempResult = await ratingCollection.where({
          table_id: db.command.in(bZhucunTableIds)
        }).skip(skipCount).limit(pageSize).get();
        
        // 筛选只包含A类考核对象的评分记录
        const filteredBZhucunRatings = [];
        for (const rating of tempResult.data) {
          if (isATypeSubject(rating.subject)) {
            filteredBZhucunRatings.push(rating);
          } else {
            console.log(`排除B类驻村表中对B类考核对象的评分: ${rating.subject}(${subjectIdToNameMap[rating.subject] || rating.subject})`);
          }
        }
        
        bZhucunRatingsResult.data = bZhucunRatingsResult.data.concat(filteredBZhucunRatings);
        
        if (tempResult.data.length < pageSize) {
          hasMore = false;
        } else {
          skipCount += pageSize;
        }
      }
      
      console.log(`从B类驻村表中筛选出${bZhucunRatingsResult.data.length}条对A类考核对象的评分记录`);
    }
    
    // 详细分析评分数据分布
    const banziRatingsDistribution = new Map();
    for (const rating of banziRatingsResult.data) {
      if (!banziRatingsDistribution.has(rating.rater)) {
        banziRatingsDistribution.set(rating.rater, new Set());
      }
      banziRatingsDistribution.get(rating.rater).add(rating.subject);
    }
    
    const zhucunRatingsDistribution = new Map();
    for (const rating of zhucunRatingsResult.data) {
      if (!zhucunRatingsDistribution.has(rating.rater)) {
        zhucunRatingsDistribution.set(rating.rater, new Set());
      }
      zhucunRatingsDistribution.get(rating.rater).add(rating.subject);
    }
    
    console.log('班子评分数据分布:');
    for (const [rater, subjects] of banziRatingsDistribution.entries()) {
      console.log(`评分人 ${rater} 评价了 ${subjects.size} 个考核对象`);
    }
    
    console.log('驻村评分数据分布:');
    for (const [rater, subjects] of zhucunRatingsDistribution.entries()) {
      console.log(`评分人 ${rater} 评价了 ${subjects.size} 个考核对象`);
    }
    
    // 更新进度 - 40%：处理评分数据
    if (incremental) await updateProgress(40, '正在处理评分数据...');
    
    // 构建评分数据，按照考核对象进行整合
    console.log('班子评分记录数量:', banziRatingsResult.data.length);
    console.log('班子评分详情样本(前3条):', JSON.stringify(banziRatingsResult.data.slice(0, 3)));
    
    console.log('驻村评分记录数量:', zhucunRatingsResult.data.length);
    console.log('驻村评分详情样本(前3条):', JSON.stringify(zhucunRatingsResult.data.slice(0, 3)));
    
    const ratingData = {};
    const banziRaters = new Set(); // 收集所有班子评分人
    
    // 建立考核对象ID和名称的键值对集合，用于评分数据匹配
    const subjectKeys = {};
    for (const subject of subjects) {
      // 为每个考核对象创建一个唯一的键
      const key = subject.name; // 使用名称作为主键
      if (!subjectKeys[subject._id]) {
        subjectKeys[subject._id] = key; // ID -> 名称映射
      }
      subjectKeys[subject.name] = key; // 名称 -> 名称映射（自身）
    }
    console.log('创建考核对象键值对集合，用于评分数据匹配');
    
    // 处理班子评分数据
    for (const rating of banziRatingsResult.data) {
      // 获取考核对象的标准键（优先使用名称）
      const subjectKey = subjectKeys[rating.subject] || rating.subject;
      const subjectName = subjectIdToNameMap[rating.subject] || rating.subject;
      
      // 如果通过ID找不到，可能是直接用了名称，尝试用名称查找
      let foundKey = subjectKey;
      if (!foundKey && subjectNameToIdMap[rating.subject]) {
        // 如果rating.subject是名称，则使用该名称作为键
        foundKey = rating.subject;
      }
      
      // 特殊监控李鹏的评分情况
      if (rating.rater === "13607998208") {
        console.log(`李鹏评分记录详情: subject=${rating.subject}, 映射键=${foundKey}, 评分对象ID=${subjectNameToIdMap[rating.subject]}, 分数=${rating.total_score}`);
      }
      
      console.log(`处理班子评分: 原始subject=${rating.subject}, 映射键=${foundKey}, 对应名称=${subjectName}`);
      
      if (!foundKey) {
        console.log(`警告: 无法找到班子评分考核对象的映射键: ${rating.subject}`);
        // 尝试直接使用subject作为名称
        if (subjects.some(s => s.name === rating.subject)) {
          console.log(`找到直接匹配: ${rating.subject} 是有效的考核对象名称，将直接使用`);
          foundKey = rating.subject;
        } else {
          console.log(`无法匹配考核对象: ${rating.subject}`);
          continue;
        }
      }
      
      if (!ratingData[foundKey]) {
        ratingData[foundKey] = {
          banziRatings: {},
          zhucunRatings: {},
          subjectId: subjectNameToIdMap[foundKey] || rating.subject // 记录考核对象ID，方便后续查询
        };
      }
      
      ratingData[foundKey].banziRatings[rating.rater] = rating.total_score;
      banziRaters.add(rating.rater);
    }
    
    // 处理驻村工作评分数据
    const zhucunScoresBySubject = {}; // 每个考核对象的驻村评分
    const zhucunRaters = new Set(); // 收集所有驻村工作评分人
    
    // 处理所有驻村评分表的数据
    const processZhucunRatings = (ratings) => {
      for (const rating of ratings) {
        // 获取考核对象的标准键（优先使用名称）
        const subjectKey = subjectKeys[rating.subject] || rating.subject;
        const subjectName = subjectIdToNameMap[rating.subject] || rating.subject;
        
        // 如果通过ID找不到，可能是直接用了名称，尝试用名称查找
        let foundKey = subjectKey;
        if (!foundKey && subjectNameToIdMap[rating.subject]) {
          // 如果rating.subject是名称，则使用该名称作为键
          foundKey = rating.subject;
        }
        
        console.log(`处理驻村评分: 原始subject=${rating.subject}, 映射键=${foundKey}, 对应名称=${subjectName}`);
        
        if (!foundKey) {
          console.log(`警告: 无法找到驻村评分考核对象的映射键: ${rating.subject}`);
          continue;
        }
        
        if (!ratingData[foundKey]) {
          ratingData[foundKey] = {
            banziRatings: {},
            zhucunRatings: {},
            subjectId: subjectNameToIdMap[foundKey] || rating.subject // 记录考核对象ID，方便后续查询
          };
        }
        
        ratingData[foundKey].zhucunRatings[rating.rater] = rating.total_score;
        zhucunRaters.add(rating.rater);
        
        // 使用相同的键记录驻村评分
        if (!zhucunScoresBySubject[foundKey]) {
          zhucunScoresBySubject[foundKey] = [];
        }
        zhucunScoresBySubject[foundKey].push(rating.total_score);
      }
    };
    
    // 处理A类驻村表评分数据
    processZhucunRatings(zhucunRatingsResult.data);
    
    // 新增: 处理B类驻村表中对A类考核对象的评分数据
    processZhucunRatings(bZhucunRatingsResult.data);
    
    console.log('收集到的班子评分人:', JSON.stringify(Array.from(banziRaters)));
    console.log('收集到的驻村评分人:', JSON.stringify(Array.from(zhucunRaters)));
    console.log('汇总后的评分数据结构示例:', JSON.stringify(Object.entries(ratingData).slice(0, 2)));
    
    // 特别验证李鹏的评分数据是否正确处理
    const lpRatings = banziRatingsResult.data.filter(r => r.rater === "13607998208");
    console.log(`李鹏评分记录总数: ${lpRatings.length}`);
    
    // 检查每条记录是否都被正确处理
    let lpProcessedCount = 0;
    for (const rating of lpRatings) {
      const subjectName = rating.subject;
      // 检查是否有该考核对象的数据
      let found = false;
      
      // 方法1：直接通过考核对象名称查找
      if (ratingData[subjectName] && ratingData[subjectName].banziRatings["13607998208"]) {
        found = true;
        lpProcessedCount++;
        continue;
      }
      
      // 方法2：遍历所有评分数据查找李鹏的评分
      for (const [key, data] of Object.entries(ratingData)) {
        if (data.banziRatings["13607998208"]) {
          console.log(`李鹏评分记录 (${subjectName}) 匹配到键 ${key}`);
          lpProcessedCount++;
          found = true;
          break;
        }
      }
      
      if (!found) {
        console.log(`警告: 李鹏对 ${subjectName} 的评分 (${rating.total_score}) 未被处理`);
      }
    }
    
    console.log(`李鹏评分处理情况: ${lpProcessedCount}/${lpRatings.length}`);
    
    // 检查评分数据是否与过滤后的考核对象匹配
    console.log('验证评分数据与筛选后的考核对象匹配情况');
    
    // 收集所有过滤后的考核对象ID和名称，用于快速查找
    const subjectIdMap = new Map();
    const subjectNameMap = new Map();
    subjects.forEach(subject => {
      subjectIdMap.set(subject._id, subject);
      subjectNameMap.set(subject.name, subject);
    });
    
    // 检查评分数据中是否包含不在过滤列表中的考核对象
    let unmatchedRatingsCount = 0;
    for (const subjectId in ratingData) {
      if (!subjectIdMap.has(subjectId) && !subjectNameMap.has(subjectId)) {
        console.log(`警告: 发现评分数据中包含未过滤考核对象: ${subjectId}`);
        unmatchedRatingsCount++;
      }
    }
    
    if (unmatchedRatingsCount > 0) {
      console.log(`警告: 共发现 ${unmatchedRatingsCount} 条不匹配的评分数据，这些数据将不会包含在导出结果中`);
    } else {
      console.log('验证通过: 所有评分数据都与过滤后的考核对象匹配');
    }
    
    // 计算驻村工作评分的平均分
    let zhucunAverageScore = 0;
    let zhucunTotalScores = 0;
    let zhucunScoreCount = 0;
    
    // 计算所有驻村评分的平均分
    for (const subject in zhucunScoresBySubject) {
      const scores = zhucunScoresBySubject[subject];
      if (scores.length > 0) {
        const sum = scores.reduce((acc, score) => acc + score, 0);
        zhucunTotalScores += sum;
        zhucunScoreCount += scores.length;
      }
    }
    
    if (zhucunScoreCount > 0) {
      zhucunAverageScore = zhucunTotalScores / zhucunScoreCount;
    }
    
    // 验证评分数据完整性
    console.log('验证评分数据与考核对象匹配情况：');
    console.log(`总考核对象数量: ${subjects.length}`);
    console.log(`收集到评分数据的考核对象数量: ${Object.keys(ratingData).length}`);
    
    // 检查每个考核对象是否都有评分数据
    let missingBanziRatingsCount = 0;
    let missingZhucunRatingsCount = 0;
    
    for (const subject of subjects) {
      const subjectName = subject.name;
      const subjectId = subject._id;
      
      // 尝试两种方式查找评分数据
      const ratingDataByName = ratingData[subjectName];
      const ratingDataById = ratingData[subjectId];
      const subjectRatingData = ratingDataByName || ratingDataById;
      
      if (!subjectRatingData) {
        console.log(`警告: 考核对象 ${subjectName}(${subjectId}) 没有任何评分数据`);
        continue;
      }
      
      const hasBanziRating = Object.keys(subjectRatingData.banziRatings).length > 0;
      const hasZhucunRating = Object.keys(subjectRatingData.zhucunRatings).length > 0;
      
      if (!hasBanziRating) {
        console.log(`警告: 考核对象 ${subjectName}(${subjectId}) 缺少班子评分`);
        missingBanziRatingsCount++;
      }
      
      if (!hasZhucunRating) {
        console.log(`警告: 考核对象 ${subjectName}(${subjectId}) 缺少驻村评分`);
        missingZhucunRatingsCount++;
      }
    }
    
    console.log(`缺少班子评分的考核对象数量: ${missingBanziRatingsCount}`);
    console.log(`缺少驻村评分的考核对象数量: ${missingZhucunRatingsCount}`);
    
    // 转换评分人集合为数组
    const banziRaterArray = Array.from(banziRaters);
    const zhucunRaterArray = Array.from(zhucunRaters);
    
    // 更新进度 - 50%：创建Excel数据
    if (incremental) await updateProgress(50, '正在创建Excel数据...');
    
    // 创建Excel工作表数据
    const worksheetData = [];
    
    // 表头
    const title = `老关镇${year}年度${description ? '(' + description + ')' : ''}绩效考核评分汇总表（A类）`;
    worksheetData.push([title]);
    
    // 更新进度 - 60%：获取评分人信息
    if (incremental) await updateProgress(60, '正在获取评分人信息...');
    
    // 获取评分人姓名
    console.log('班子评分人账号列表:', JSON.stringify(banziRaterArray));
    const banziRaterNames = [];
    for (let i = 0; i < banziRaterArray.length; i++) {
      const rater = banziRaterArray[i];
      const userInfo = await userCollection.where({ username: rater }).get();
      const raterName = userInfo.data.length > 0 ? userInfo.data[0].name : rater;
      banziRaterNames.push({ username: rater, name: raterName });
    }
    console.log('班子评分人详情:', JSON.stringify(banziRaterNames));
    
    console.log('驻村评分人账号列表:', JSON.stringify(zhucunRaterArray));
    const zhucunRaterNames = [];
    for (let i = 0; i < zhucunRaterArray.length; i++) {
      const rater = zhucunRaterArray[i];
      const userInfo = await userCollection.where({ username: rater }).get();
      const raterName = userInfo.data.length > 0 ? userInfo.data[0].name : rater;
      zhucunRaterNames.push({ username: rater, name: raterName });
    }
    console.log('驻村评分人详情:', JSON.stringify(zhucunRaterNames));
    
    // 表头第二行 - 基本信息
    const header1 = ['序号', '姓名'];
    
    // 添加班子评分人
    for (const rater of banziRaterNames) {
      header1.push(`${rater.name}（班子评分）`);
    }
    
    // 添加驻村评分人
    for (const rater of zhucunRaterNames) {
      header1.push(`${rater.name}（驻村评分）`);
    }
    
    // 添加计算列
    header1.push('班子评分平均分');
    header1.push('驻村评分平均分');
    header1.push('总分（按班子：驻村=7：3换算）');
    header1.push('备注');
    
    worksheetData.push(header1);
    
    // 更新进度 - 70%：添加评分数据
    if (incremental) await updateProgress(70, '正在处理考核对象评分数据...');
    
    // 添加考核对象的评分数据
    for (let i = 0; i < subjects.length; i++) {
      // 每处理10个考核对象，更新一次进度（如果总数大于20）
      if (incremental && subjects.length > 20 && i % 10 === 0) {
        const progress = 70 + Math.floor((i / subjects.length) * 10);
        await updateProgress(progress, `正在处理考核对象评分数据(${i}/${subjects.length})...`);
      }
      
      const subject = subjects[i];
      const subjectName = subject.name;
      const subjectId = subject._id;
      
      // 先尝试使用名称查找评分数据
      let subjectRatingData = ratingData[subjectName];
      
      // 如果找不到，再尝试使用ID查找
      if (!subjectRatingData && ratingData[subjectId]) {
        subjectRatingData = ratingData[subjectId];
      }
      
      // 特别检查李鹏的评分数据 - 检查是否有该考核对象的评分
      const lp_ratings = banziRatingsResult.data.filter(r => r.rater === "13607998208" && r.subject === subjectName);
      if (lp_ratings.length > 0) {
        console.log(`发现李鹏对 ${subjectName} 的评分记录 ${lp_ratings.length} 条，评分: ${lp_ratings[0].total_score}`);
        
        // 如果还没有评分数据对象，创建一个
        if (!subjectRatingData) {
          subjectRatingData = { banziRatings: {}, zhucunRatings: {} };
        }
        
        // 确保李鹏的评分被正确添加
        if (!subjectRatingData.banziRatings["13607998208"] && lp_ratings[0].total_score) {
          console.log(`添加李鹏对 ${subjectName} 的评分数据: ${lp_ratings[0].total_score}`);
          subjectRatingData.banziRatings["13607998208"] = lp_ratings[0].total_score;
        }
      }
      
      // 如果还是找不到，创建空对象
      if (!subjectRatingData) {
        console.log(`警告: 考核对象 ${subjectName}(${subjectId}) 未找到评分数据`);
        subjectRatingData = { banziRatings: {}, zhucunRatings: {} };
      } else {
        console.log(`成功找到考核对象 ${subjectName}(${subjectId}) 的评分数据`);
      }
      
      // 最后检查李鹏的评分是否正确添加
      if (!subjectRatingData.banziRatings["13607998208"]) {
        const lp_rating = banziRatingsResult.data.find(r => r.rater === "13607998208" && r.subject === subjectName);
        if (lp_rating) {
          console.log(`修复: 添加李鹏对 ${subjectName} 的评分: ${lp_rating.total_score}`);
          subjectRatingData.banziRatings["13607998208"] = lp_rating.total_score;
        }
      }
      
      const row = [];
      row.push(i + 1); // 序号
      row.push(subjectName); // 姓名
      
      // 添加班子评分
      let banziTotalScore = 0;
      let banziScoreCount = 0;
      
      for (const rater of banziRaterNames) {
        const score = subjectRatingData.banziRatings[rater.username] || '';
        row.push(score);
        if (score) {
          banziTotalScore += score;
          banziScoreCount++;
        }
      }
      
      // 添加驻村工作评分
      let zhucunTotalScore = 0;
      let zhucunScoreCount = 0;
      
      for (const rater of zhucunRaterNames) {
        const score = subjectRatingData.zhucunRatings[rater.username] || '';
        row.push(score);
        if (score) {
          zhucunTotalScore += score;
          zhucunScoreCount++;
        }
      }
      
      // 班子评分平均分
      const banziAvgScore = banziScoreCount > 0 ? (banziTotalScore / banziScoreCount).toFixed(2) : '';
      row.push(banziAvgScore);
      
      // 驻村评分平均分
      let zhucunAvgScore = '';
      if (zhucunScoreCount > 0) {
        zhucunAvgScore = (zhucunTotalScore / zhucunScoreCount).toFixed(2);
      } else if (banziScoreCount > 0 && zhucunAverageScore > 0) {
        // 如果此人没有驻村评分但有班子评分，使用全局驻村平均分
        zhucunAvgScore = zhucunAverageScore.toFixed(2);
      }
      row.push(zhucunAvgScore);
      
      // 计算总分（班子70%+驻村30%）
      let totalScore = '';
      if (banziAvgScore) {
        let calculatedZhucunScore = '';
        
        // 驻村评分处理
        if (zhucunScoreCount > 0) {
          calculatedZhucunScore = (zhucunTotalScore / zhucunScoreCount).toFixed(2);
        } else if (zhucunAverageScore > 0) {
          calculatedZhucunScore = zhucunAverageScore.toFixed(2);
        }
        
        if (calculatedZhucunScore) {
          totalScore = (parseFloat(banziAvgScore) * 0.7 + parseFloat(calculatedZhucunScore) * 0.3).toFixed(2);
        } else {
          totalScore = banziAvgScore; // 如果没有驻村评分，直接使用班子评分
        }
      }
      
      row.push(totalScore);
      
      // 备注列
      row.push('');
      
      worksheetData.push(row);
    }
    
    // 更新进度 - 80%：设置Excel格式
    if (incremental) await updateProgress(80, '正在设置Excel格式...');
    
    // 设置列宽
    const options = {
      '!cols': [
        { wch: 5 },  // 序号
        { wch: 15 }, // 姓名
      ]
    };
    
    // 添加班子评分人列宽
    for (let i = 0; i < banziRaterNames.length; i++) {
      options['!cols'].push({ wch: 12 });
    }
    
    // 班子平均分列宽
    options['!cols'].push({ wch: 15 });
    
    // 添加驻村工作评分人列宽
    for (let i = 0; i < zhucunRaterNames.length; i++) {
      options['!cols'].push({ wch: 12 });
    }
    
    // 驻村平均分列宽
    options['!cols'].push({ wch: 15 });
    
    // 添加办主任评分人列宽
    for (let i = 0; i < officeDirectorRaterNames.length; i++) {
      options['!cols'].push({ wch: 12 });
    }
    
    // 办主任平均分列宽
    options['!cols'].push({ wch: 15 });
    
    // 添加计算列宽
    options['!cols'].push({ wch: 25 }); // 总分
    options['!cols'].push({ wch: 15 }); // 备注
    
    // 使用node-xlsx构建Excel文件
    console.log('准备构建Excel文件...');
    
    // 更新进度 - 85%：生成Excel文件
    if (incremental) await updateProgress(85, '正在生成Excel文件...');
    
    try {
      const buffer = xlsx.build([{
        name: `A类评分汇总表-${year}年${description ? '(' + description + ')' : ''}`,
        data: worksheetData
      }], options);
      console.log('Excel文件构建成功，准备上传');
      
      // 更新进度 - 90%：上传文件
      if (incremental) await updateProgress(90, '正在上传文件...');
      
      // 将Excel文件上传到云存储
      const fileExtension = '.xlsx';
      console.log('开始上传文件到云存储');
      const uploadResult = await uniCloud.uploadFile({
        cloudPath: `exports/A类评分汇总表-${year}年${description ? '(' + description + ')' : ''}-${Date.now()}${fileExtension}`,
        fileContent: buffer
      });
      
      console.log('文件上传成功，fileID:', uploadResult.fileID);
      
      // 更新进度 - 95%：获取下载链接
      if (incremental) await updateProgress(95, '正在生成下载链接...');
      
      // 生成临时下载链接
      console.log('开始获取临时下载链接');
      const fileUrl = await uniCloud.getTempFileURL({
        fileList: [uploadResult.fileID]
      });
      
      console.log('获取临时下载链接成功:', fileUrl.fileList[0].tempFileURL);
      
      // 更新进度 - 95%：生成导出汇总报告
      if (incremental) await updateProgress(95, '正在生成导出汇总报告...');
      
      // 输出评分统计汇总信息
      console.log('===================== A类评分导出汇总报告 =====================');
      console.log(`总考核对象数量: ${subjects.length}`);
      console.log(`班子评分表数量: ${banziTableIds.length}`);
      console.log(`驻村评分表数量: ${zhucunTableIds.length}`);
      console.log(`B类驻村表数量: ${bZhucunTableIds.length}`);
      console.log(`班子评分人数量: ${banziRaterArray.length}`);
      console.log(`驻村评分人数量: ${zhucunRaterArray.length}`);
      console.log(`班子评分记录数量: ${banziRatingsResult.data.length}`);
      console.log(`驻村评分记录数量: ${zhucunRatingsResult.data.length}`);
      console.log(`B类驻村表评分记录数量: ${bZhucunRatingsResult.data.length}`);
      console.log('===================== 导出完成 =====================');
      
      // 更新进度 - 100%：导出完成
      if (incremental) await updateProgress(100, '导出完成！');
      
      return {
        code: 0,
        msg: '导出成功',
        data: {
          fileUrl: fileUrl.fileList[0].tempFileURL
        }
      };
    } catch (excelError) {
      console.error('构建或上传Excel文件失败:', excelError);
      return {
        code: -1,
        msg: '构建Excel文件失败: ' + excelError.message,
        error: excelError.message
      };
    }
    
  } catch (e) {
    console.error('导出A类评分汇总表失败:', e);
    return {
      code: -1,
      msg: '导出A类评分汇总表失败: ' + e.message,
      error: e.message
    };
  }
}

// 导出B类评分汇总表
async function exportBTypeRatings(data) {
  const db = uniCloud.database();
  const ratingTableCollection = db.collection('rating_tables');
  const userCollection = db.collection('users');
  const subjectCollection = db.collection('subjects');
  const ratingCollection = db.collection('ratings');
  
  const { group_id, year, description, task_id, incremental } = data;
  
  // 更新任务进度的函数
  const updateProgress = async (progress, message) => {
    if (incremental && task_id) {
      try {
        console.log(`更新任务进度: ${progress}%, 消息: ${message}`);
        await uniCloud.callFunction({
          name: 'ratingTable',
          data: {
            action: 'updateExportTaskStatus',
            data: {
              task_id,
              progress,
              message
            }
          }
        });
      } catch (error) {
        console.error('更新进度失败:', error);
      }
    }
  };
  
  try {
    console.log(`开始导出${year}年度${description ? '(' + description + ')' : ''}B类评分汇总表`);
    console.log('导出参数:', JSON.stringify(data));
    
    if (incremental) {
      console.log('使用增量模式导出，任务ID:', task_id);
    }
    
    // 参数校验
    if (!group_id || !year) {
      return {
        code: -1,
        msg: '缺少必要参数'
      };
    }
    
    // 更新进度 - 10%：开始查询表格
    if (incremental) await updateProgress(10, '正在查询评分表...');
    
    // 获取B类评分相关表格
    console.log('开始查询B类评分相关表格，参数:', { group_id, year });
    
    // 查询指定group_id的表格
    console.log('开始查询所有表格，group_id:', group_id);
    const allTablesResult = await ratingTableCollection.where({
      group_id
    }).get();
    
    console.log(`找到${allTablesResult.data.length}个属于group_id ${group_id}的表格`);
    console.log('表格详情:', JSON.stringify(allTablesResult.data.map(t => ({
      _id: t._id, 
      name: t.name, 
      type: t.type,
      status: t.status
    }))));
    
    // 如果没有找到表格，返回错误信息
    if (allTablesResult.data.length === 0) {
      console.log('未找到任何表格');
      return {
        code: -1,
        msg: `未找到任何评分表，请检查group_id ${group_id} 是否正确`
      };
    }
    
    // 收集所有相关表格的ID
    const banziTableIds = []; // B类班子表 type=3
    const aZhucunTableIds = []; // A类驻村表 type=2
    const bZhucunTableIds = []; // B类驻村表 type=4
    const officeDirectorTableIds = []; // 办主任评分表 type=5
    
    // 遍历所有表格，收集各类型的评分表ID
    console.log('开始收集B类班子表(type=3)、A类驻村表(type=2)、B类驻村表(type=4)和办主任表(type=5)');
    for (const table of allTablesResult.data) {
      // B类班子表
      if (table.type === 3) {
        banziTableIds.push(table._id);
      }
      
      // A类驻村表
      if (table.type === 2) {
        aZhucunTableIds.push(table._id);
      }
      
      // B类驻村表
      if (table.type === 4) {
        bZhucunTableIds.push(table._id);
      }
      
      // 办主任评分表
      if (table.type === 5) {
        officeDirectorTableIds.push(table._id);
      }
    }
    
    console.log(`收集到 ${banziTableIds.length} 个B类班子表、${aZhucunTableIds.length} 个A类驻村表、${bZhucunTableIds.length} 个B类驻村表和 ${officeDirectorTableIds.length} 个办主任表`);
    console.log('B类班子表IDs:', JSON.stringify(banziTableIds));
    console.log('A类驻村表IDs:', JSON.stringify(aZhucunTableIds));
    console.log('B类驻村表IDs:', JSON.stringify(bZhucunTableIds));
    console.log('办主任表IDs:', JSON.stringify(officeDirectorTableIds));
    
    // 检查是否找到了必要的表格
    if (banziTableIds.length === 0) {
      console.log('未找到B类班子评分表');
      return {
        code: -1,
        msg: '未找到B类班子评分表，请检查是否有type=3的评分表'
      };
    }
    
    // 更新进度 - 20%：获取考核对象
    if (incremental) await updateProgress(20, '正在获取考核对象...');
    
    // 获取B类班子表和办主任表的所有考核对象（不筛选position）
    console.log('开始获取B类班子表和办主任表的考核对象（不筛选position）');
    const banziSubjectsResult = await subjectCollection.where({
      table_id: db.command.in([...banziTableIds, ...officeDirectorTableIds])
    }).get();
    
    // 获取驻村表中的B类考核对象（筛选position="B类"）
    console.log('开始获取驻村表中的B类考核对象（筛选position="B类"）');
    const zhucunSubjectsResult = await subjectCollection.where({
      table_id: db.command.in([...aZhucunTableIds, ...bZhucunTableIds]),
      position: 'B类'
    }).get();
    
    console.log(`找到${banziSubjectsResult.data.length}个班子表和办主任表考核对象`);
    console.log(`找到${zhucunSubjectsResult.data.length}个驻村表中的B类考核对象`);
    
    // 合并考核对象，确保不重复
    const subjectMap = new Map();
    
    // 添加班子和办主任表考核对象
    for (const subject of banziSubjectsResult.data) {
      subjectMap.set(subject._id, subject);
    }
    
    // 添加驻村表B类考核对象
    for (const subject of zhucunSubjectsResult.data) {
      subjectMap.set(subject._id, subject);
    }
    
    const subjects = Array.from(subjectMap.values());
    
    if (subjects.length === 0) {
      console.log('未找到任何考核对象');
      return {
        code: -1,
        msg: '未找到考核对象'
      };
    }
    
    console.log(`总共找到${subjects.length}个考核对象`);
    console.log('考核对象详情:', JSON.stringify(subjects.map(subject => ({
      _id: subject._id,
      name: subject.name,
      position: subject.position,
      organization: subject.department || subject.organization
    }))));
    
    // 更新进度 - 30%：获取评分记录
    if (incremental) await updateProgress(30, '正在获取评分数据...');

    // 获取考核对象的ID列表和名称列表
    const subjectIds = subjects.map(subject => subject._id);
    const subjectNames = subjects.map(subject => subject.name);
    
    // 获取所有考核对象ID与名称的映射
    const subjectIdToNameMap = {};
    const subjectPositionMap = {};
    for (const subject of subjects) {
      subjectIdToNameMap[subject._id] = subject.name;
      subjectPositionMap[subject._id] = subject.position || '';
      subjectPositionMap[subject.name] = subject.position || '';
    }
    
    // 定义分页查询函数
    const pageSize = 500; // 每页获取500条记录
    async function getPagedRatings(tableIds, subjectFilter) {
      let result = { data: [] };
      let hasMore = true;
      let skipCount = 0;
      
      while (hasMore) {
        console.log(`获取评分记录 - 第${Math.floor(skipCount/pageSize) + 1}页, skip=${skipCount}, limit=${pageSize}`);
        const query = {
          table_id: db.command.in(tableIds)
        };
        
        // 如果有subject筛选条件，添加到查询中
        if (subjectFilter) {
          query.subject = subjectFilter;
        }
        
        const tempResult = await ratingCollection.where(query)
          .skip(skipCount).limit(pageSize).get();
        
        result.data = result.data.concat(tempResult.data);
        
        if (tempResult.data.length < pageSize) {
          hasMore = false;
        } else {
          skipCount += pageSize;
        }
      }
      
      return result;
    }
    
    // 获取B类班子评分记录（不筛选position）
    console.log('获取B类班子评分记录');
    // 移除subject筛选条件，获取所有评分记录
    const banziRatingsResult = await getPagedRatings(banziTableIds, null);
    console.log(`找到${banziRatingsResult.data.length}条B类班子评分记录`);
    
    // 获取A类驻村表中对B类考核对象的评分记录
    console.log('获取A类驻村表中对B类考核对象的评分记录');
    // 创建一个B类考核对象ID的集合，用于筛选
    const bTypeSubjectIds = subjects
      .filter(subject => subject.position === 'B类' || !subject.position)
      .map(subject => subject._id);
    
    const bTypeSubjectNames = subjects
      .filter(subject => subject.position === 'B类' || !subject.position)
      .map(subject => subject.name);
      
    console.log(`找到${bTypeSubjectIds.length}个B类考核对象ID和${bTypeSubjectNames.length}个名称`);
    
    // 只获取B类考核对象的驻村评分记录
    const aZhucunRatingsResult = await getPagedRatings(aZhucunTableIds, 
      db.command.in([...bTypeSubjectIds, ...bTypeSubjectNames]));
    console.log(`找到${aZhucunRatingsResult.data.length}条A类驻村表中对B类考核对象的评分记录`);
    
    // 获取B类驻村表中对B类考核对象的评分记录
    console.log('获取B类驻村表中对B类考核对象的评分记录');
    const bZhucunRatingsResult = await getPagedRatings(bZhucunTableIds, 
      db.command.in([...bTypeSubjectIds, ...bTypeSubjectNames]));
    console.log(`找到${bZhucunRatingsResult.data.length}条B类驻村表中对B类考核对象的评分记录`);
    
    // 获取办主任评分记录
    console.log('获取办主任评分记录');
    const officeDirectorRatingsResult = await getPagedRatings(officeDirectorTableIds, null);
    console.log(`找到${officeDirectorRatingsResult.data.length}条办主任评分记录`);
    
    // 更新进度 - 40%：处理评分数据
    if (incremental) await updateProgress(40, '正在处理评分数据...');
    
    // 构建评分数据，按照考核对象进行整合
    const ratingData = {};
    
    // 收集所有评分人
    const banziRaters = new Set(); // 收集所有班子评分人
    const zhucunRaters = new Set(); // 收集所有驻村评分人
    const officeDirectorRaters = new Set(); // 收集所有办主任评分人
    
    // 收集所有被评分的考核对象，用于后续处理
    const allRatedSubjects = new Set();
    
    // 首先收集所有被评分的考核对象
    console.log('收集所有被评分的考核对象...');
    [...banziRatingsResult.data, ...aZhucunRatingsResult.data, ...bZhucunRatingsResult.data, ...officeDirectorRatingsResult.data].forEach(rating => {
      allRatedSubjects.add(rating.subject);
    });
    console.log(`共找到${allRatedSubjects.size}个不同的被评分考核对象`);
    
    // 补充获取评分记录中的考核对象信息
    console.log('获取评分记录中的考核对象信息...');
    const additionalSubjectIds = [...allRatedSubjects].filter(sid => !subjectIdToNameMap[sid] && !subjects.some(s => s.name === sid));
    
    if (additionalSubjectIds.length > 0) {
      console.log(`发现${additionalSubjectIds.length}个额外的考核对象需要查询信息`);
      
      // 查询这些额外考核对象的信息
      const additionalSubjectsResult = await subjectCollection.where({
        _id: db.command.in(additionalSubjectIds.filter(id => id.length > 10)) // 只查询看起来是ID的值
      }).get();
      
      if (additionalSubjectsResult.data.length > 0) {
        console.log(`查询到${additionalSubjectsResult.data.length}个额外考核对象的信息`);
        
        // 添加到考核对象映射中
        for (const subject of additionalSubjectsResult.data) {
          subjectIdToNameMap[subject._id] = subject.name;
          subjectPositionMap[subject._id] = subject.position || '';
          subjectPositionMap[subject.name] = subject.position || '';
          
          // 也添加到subjects数组中
          if (!subjects.some(s => s._id === subject._id)) {
            subjects.push(subject);
          }
        }
      }
    }
    
    // 检查某个考核对象是否为B类考核对象（只用于筛选驻村评分）
    const isBTypeSubject = (subjectId) => {
      // 检查position是否为"B类"，或者是否在subjects数组中
      return subjectPositionMap[subjectId] === 'B类' || 
             subjects.some(s => (s._id === subjectId || s.name === subjectId) && 
                               (!s.position || s.position === 'B类'));
    };
    
    // 处理班子评分数据 - 不筛选考核对象类型
    console.log('处理B类班子评分数据...');
    for (const rating of banziRatingsResult.data) {
      const subjectId = rating.subject;
      // 移除对考核对象类型的筛选，包含所有考核对象
      const subjectName = subjectIdToNameMap[subjectId] || subjectId;
      
      if (!ratingData[subjectName]) {
        ratingData[subjectName] = {
          banziRatings: {},
          zhucunRatings: {},
          officeDirectorRatings: {}
        };
      }
      ratingData[subjectName].banziRatings[rating.rater] = rating.total_score;
      banziRaters.add(rating.rater);
      
      // 特别记录李鹏的评分情况
      if (rating.rater === "13607998208") {
        console.log(`收集到李鹏对考核对象 ${subjectName}(${subjectId}) 的评分: ${rating.total_score}`);
      }
    }
    
    // 处理驻村评分数据 (合并A类和B类驻村表)
    const processZhucunRatings = (ratings, source) => {
      console.log(`处理${source}驻村评分数据...`);
      for (const rating of ratings) {
        const subjectId = rating.subject;
        // 跳过非B类考核对象
        if (!isBTypeSubject(subjectId)) {
          continue;
        }
        
        const subjectName = subjectIdToNameMap[subjectId] || subjectId;
        
        if (!ratingData[subjectName]) {
          ratingData[subjectName] = {
            banziRatings: {},
            zhucunRatings: {},
            officeDirectorRatings: {}
          };
        }
        ratingData[subjectName].zhucunRatings[rating.rater] = rating.total_score;
        zhucunRaters.add(rating.rater);
      }
    };
    
    // 处理A类驻村表中B类考核对象评分
    processZhucunRatings(aZhucunRatingsResult.data, "A类");
    
    // 处理B类驻村表中B类考核对象评分
    processZhucunRatings(bZhucunRatingsResult.data, "B类");
    
    // 处理办主任评分数据 - 不筛选考核对象类型
    console.log('处理办主任评分数据...');
    for (const rating of officeDirectorRatingsResult.data) {
      const subjectId = rating.subject;
      // 移除对考核对象类型的筛选，包含所有考核对象
      const subjectName = subjectIdToNameMap[subjectId] || subjectId;
      
      if (!ratingData[subjectName]) {
        ratingData[subjectName] = {
          banziRatings: {},
          zhucunRatings: {},
          officeDirectorRatings: {}
        };
      }
      // 将每个办主任的评分都保存到相应考核对象的officeDirectorRatings中
      ratingData[subjectName].officeDirectorRatings[rating.rater] = rating.total_score;
      officeDirectorRaters.add(rating.rater);
      
      // 添加日志，特别关注 13979999313 (余海龙) 的评分
      if (rating.rater === "13979999313") {
        console.log(`收集到余海龙对考核对象 ${subjectName}(${subjectId}) 的评分: ${rating.total_score}`);
      }
    }
    
    // 收集李鹏评分的所有考核对象，用于检验
    const lpRatedSubjects = banziRatingsResult.data
      .filter(r => r.rater === "13607998208")
      .map(r => {
        const subjectName = subjectIdToNameMap[r.subject] || r.subject;
        return { id: r.subject, name: subjectName, score: r.total_score };
      });
    console.log(`李鹏评分的考核对象共${lpRatedSubjects.length}个:`, JSON.stringify(lpRatedSubjects));
    
    console.log('收集到的班子评分人:', JSON.stringify(Array.from(banziRaters)));
    console.log('收集到的驻村评分人:', JSON.stringify(Array.from(zhucunRaters)));
    console.log('收集到的办主任评分人:', JSON.stringify(Array.from(officeDirectorRaters)));
    
    // 转换评分人集合为数组
    const banziRaterArray = Array.from(banziRaters);
    const zhucunRaterArray = Array.from(zhucunRaters);
    const officeDirectorRaterArray = Array.from(officeDirectorRaters);
    
    // 更新进度 - 50%：创建Excel数据
    if (incremental) await updateProgress(50, '正在创建Excel数据...');
    
    // 创建Excel工作表数据
    const worksheetData = [];
    
    // 表头
    const title = `老关镇${year}年度${description ? '(' + description + ')' : ''}绩效考核评分汇总表（B类）`;
    worksheetData.push([title]);
    
    // 更新进度 - 60%：获取评分人信息
    if (incremental) await updateProgress(60, '正在获取评分人信息...');
    
    // 获取评分人姓名
    console.log('班子评分人账号列表:', JSON.stringify(banziRaterArray));
    const banziRaterNames = [];
    for (let i = 0; i < banziRaterArray.length; i++) {
      const rater = banziRaterArray[i];
      const userInfo = await userCollection.where({ username: rater }).get();
      const raterName = userInfo.data.length > 0 ? userInfo.data[0].name : rater;
      banziRaterNames.push({ username: rater, name: raterName });
    }
    console.log('班子评分人详情:', JSON.stringify(banziRaterNames));
    
    console.log('驻村评分人账号列表:', JSON.stringify(zhucunRaterArray));
    const zhucunRaterNames = [];
    for (let i = 0; i < zhucunRaterArray.length; i++) {
      const rater = zhucunRaterArray[i];
      const userInfo = await userCollection.where({ username: rater }).get();
      const raterName = userInfo.data.length > 0 ? userInfo.data[0].name : rater;
      zhucunRaterNames.push({ username: rater, name: raterName });
    }
    console.log('驻村评分人详情:', JSON.stringify(zhucunRaterNames));
    
    console.log('办主任评分人账号列表:', JSON.stringify(officeDirectorRaterArray));
    const officeDirectorRaterNames = [];
    for (let i = 0; i < officeDirectorRaterArray.length; i++) {
      const rater = officeDirectorRaterArray[i];
      const userInfo = await userCollection.where({ username: rater }).get();
      const raterName = userInfo.data.length > 0 ? userInfo.data[0].name : rater;
      officeDirectorRaterNames.push({ username: rater, name: raterName });
    }
    console.log('办主任评分人详情:', JSON.stringify(officeDirectorRaterNames));
    
    // 添加子表头行
    worksheetData.push(['']);
    
    // 表头第二行 - 分管班子评分列
    let headerRow1 = ['姓名', ''];
    headerRow1.push('分管班子评分');
    // 合并班子评分单元格，占据所有班子评分人的列数
    for (let i = 0; i < banziRaterNames.length; i++) {
      headerRow1.push('');
    }
    
    // 驻村工作评分列
    headerRow1.push('驻村工作评分');
    // 合并驻村评分单元格，占据所有驻村评分人的列数
    for (let i = 0; i < zhucunRaterNames.length; i++) {
      headerRow1.push('');
    }
    
    // 办主任评分列
    headerRow1.push('办主任评分');
    // 合并办主任评分单元格，占据所有办主任评分人的列数
    for (let i = 0; i < officeDirectorRaterNames.length; i++) {
      headerRow1.push('');
    }
    
    // 计算列
    headerRow1.push('');
    headerRow1.push('');
    headerRow1.push('');
    headerRow1.push('');
    
    worksheetData.push(headerRow1);
    
    // 表头第三行 - 具体评分人和计算列
    let headerRow2 = ['序号', '姓名'];
    
    // 添加班子评分人
    for (const rater of banziRaterNames) {
      headerRow2.push(`${rater.name}（班子）`);
    }
    // 添加班子评分平均分列
    headerRow2.push('班子评分平均分');
    
    // 添加驻村评分人
    for (const rater of zhucunRaterNames) {
      headerRow2.push(`${rater.name}（驻村）`);
    }
    // 添加驻村评分平均分列
    headerRow2.push('驻村工作平均分');
    
    // 添加所有办主任评分人
    for (const rater of officeDirectorRaterNames) {
      headerRow2.push(`${rater.name}（办主任）`);
    }
    // 添加办主任评分平均分列
    headerRow2.push('办主任评分平均分');
    
    // 添加计算列
    headerRow2.push('总分（按班子：驻村：办主任=5：3：2换算）');
    headerRow2.push('备注');
    
    worksheetData.push(headerRow2);
    
    // 更新进度 - 70%：添加评分数据
    if (incremental) await updateProgress(70, '正在处理考核对象评分数据...');
    
    // 添加考核对象的评分数据
    let rowIndex = 1;
    for (const subject of subjects) {
      const subjectName = subject.name;
      const subjectRatingData = ratingData[subjectName] || { banziRatings: {}, zhucunRatings: {}, officeDirectorRatings: {} };
      
      // 每处理10个考核对象，更新一次进度（如果总数大于20）
      if (incremental && subjects.length > 20 && rowIndex % 10 === 1) {
        const progress = 70 + Math.floor((rowIndex / subjects.length) * 10);
        await updateProgress(progress, `正在处理考核对象评分数据(${rowIndex}/${subjects.length})...`);
      }
      
      const row = [];
      row.push(rowIndex); // 序号
      row.push(subjectName); // 姓名
      
      // 添加班子评分
      let banziTotalScore = 0;
      let banziScoreCount = 0;
      
      for (const rater of banziRaterNames) {
        const score = subjectRatingData.banziRatings[rater.username] || '';
        row.push(score);
        if (score) {
          banziTotalScore += score;
          banziScoreCount++;
        }
      }
      
      // 班子评分平均分
      const banziAvgScore = banziScoreCount > 0 ? (banziTotalScore / banziScoreCount).toFixed(2) : '';
      row.push(banziAvgScore);
      
      // 添加驻村工作评分
      let zhucunTotalScore = 0;
      let zhucunScoreCount = 0;
      
      for (const rater of zhucunRaterNames) {
        const score = subjectRatingData.zhucunRatings[rater.username] || '';
        row.push(score);
        if (score) {
          zhucunTotalScore += score;
          zhucunScoreCount++;
        }
      }
      
      // 驻村评分平均分
      const zhucunAvgScore = zhucunScoreCount > 0 ? (zhucunTotalScore / zhucunScoreCount).toFixed(2) : '';
      row.push(zhucunAvgScore);
      
      // 添加所有办主任评分
      let officeDirectorTotalScore = 0;
      let officeDirectorScoreCount = 0;
      
      for (const rater of officeDirectorRaterNames) {
        const score = subjectRatingData.officeDirectorRatings[rater.username] || '';
        row.push(score);
        if (score) {
          officeDirectorTotalScore += score;
          officeDirectorScoreCount++;
        }
      }
      
      // 计算办主任评分平均分
      const officeDirectorAvgScore = officeDirectorScoreCount > 0 ? 
        (officeDirectorTotalScore / officeDirectorScoreCount).toFixed(2) : '';
      row.push(officeDirectorAvgScore);
      
      // 计算总分（班子50%+驻村30%+办主任20%）
      let totalScore = '';
      if (banziAvgScore || zhucunAvgScore || officeDirectorAvgScore) {
        let calculatedTotal = 0;
        let weightSum = 0;
        
        if (banziAvgScore) {
          calculatedTotal += parseFloat(banziAvgScore) * 0.5;
          weightSum += 0.5;
        }
        
        if (zhucunAvgScore) {
          calculatedTotal += parseFloat(zhucunAvgScore) * 0.3;
          weightSum += 0.3;
        }
        
        if (officeDirectorAvgScore) {
          calculatedTotal += parseFloat(officeDirectorAvgScore) * 0.2;
          weightSum += 0.2;
        }
        
        if (weightSum > 0) {
          // 根据实际权重重新计算总分
          totalScore = (calculatedTotal / weightSum * 1).toFixed(2);
        }
      }
      
      row.push(totalScore);
      
      // 备注列
      row.push('');
      
      worksheetData.push(row);
      rowIndex++;
    }
    
    // 更新进度 - 80%：设置Excel格式
    if (incremental) await updateProgress(80, '正在设置Excel格式...');
    
    // 设置列宽
    const options = {
      '!cols': [
        { wch: 5 },  // 序号
        { wch: 15 }, // 姓名
      ]
    };
    
    // 添加班子评分人列宽
    for (let i = 0; i < banziRaterNames.length; i++) {
      options['!cols'].push({ wch: 12 });
    }
    
    // 班子平均分列宽
    options['!cols'].push({ wch: 15 });
    
    // 添加驻村工作评分人列宽
    for (let i = 0; i < zhucunRaterNames.length; i++) {
      options['!cols'].push({ wch: 12 });
    }
    
    // 驻村平均分列宽
    options['!cols'].push({ wch: 15 });
    
    // 添加办主任评分人列宽
    for (let i = 0; i < officeDirectorRaterNames.length; i++) {
      options['!cols'].push({ wch: 12 });
    }
    
    // 办主任平均分列宽
    options['!cols'].push({ wch: 15 });
    
    // 添加计算列宽
    options['!cols'].push({ wch: 25 }); // 总分
    options['!cols'].push({ wch: 15 }); // 备注
    
    // 使用node-xlsx构建Excel文件
    console.log('准备构建Excel文件...');
    
    // 更新进度 - 85%：生成Excel文件
    if (incremental) await updateProgress(85, '正在生成Excel文件...');
    
    try {
      const buffer = xlsx.build([{
        name: `B类评分汇总表-${year}年${description ? '(' + description + ')' : ''}`,
        data: worksheetData
      }], options);
      console.log('Excel文件构建成功，准备上传');
      
      // 更新进度 - 90%：上传文件
      if (incremental) await updateProgress(90, '正在上传文件...');
      
      // 将Excel文件上传到云存储
      const fileExtension = '.xlsx';
      console.log('开始上传文件到云存储');
      const uploadResult = await uniCloud.uploadFile({
        cloudPath: `exports/B类评分汇总表-${year}年${description ? '(' + description + ')' : ''}-${Date.now()}${fileExtension}`,
        fileContent: buffer
      });
      
      console.log('文件上传成功，fileID:', uploadResult.fileID);
      
      // 更新进度 - 95%：获取下载链接
      if (incremental) await updateProgress(95, '正在生成下载链接...');
      
      // 生成临时下载链接
      console.log('开始获取临时下载链接');
      const fileUrl = await uniCloud.getTempFileURL({
        fileList: [uploadResult.fileID]
      });
      
      console.log('获取临时下载链接成功:', fileUrl.fileList[0].tempFileURL);
      
      // 更新进度 - 100%：导出完成
      if (incremental) await updateProgress(100, '导出完成！');
      
      return {
        code: 0,
        msg: '导出成功',
        data: {
          fileUrl: fileUrl.fileList[0].tempFileURL
        }
      };
    } catch (excelError) {
      console.error('构建或上传Excel文件失败:', excelError);
      return {
        code: -1,
        msg: '构建Excel文件失败: ' + excelError.message,
        error: excelError.message
      };
    }
    
  } catch (e) {
    console.error('导出B类评分汇总表失败:', e);
    return {
      code: -1,
      msg: '导出B类评分汇总表失败: ' + e.message,
      error: e.message
    };
  }
}