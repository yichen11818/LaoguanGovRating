'use strict';
const db = uniCloud.database();
const ratingCollection = db.collection('ratings');
const ratingTableCollection = db.collection('rating_tables');
const subjectCollection = db.collection('subjects');
const userCollection = db.collection('users');

exports.main = async (event, context) => {
  const { action, data } = event;
  
  // 根据操作类型执行不同的操作
  switch (action) {
    case 'submitRating':
      return await submitRating(data);
    case 'updateRating':
      return await updateRating(data);
    case 'deleteRating':
      return await deleteRating(data);
    case 'getRatings':
      return await getRatings(data);
    case 'getRatingDetail':
      return await getRatingDetail(data);
    case 'getRatingBySubject':
      return await getRatingBySubject(data);
    case 'getRatingStats':
      return await getRatingStats(data);
    case 'getRaterStats':
      return await getRaterStats(data, context);
    case 'getTableRatings':
      return await getTableRatings(data);
    case 'getRatingsByTable':
      return await getRatingsByTable(data);
    case 'getTableStats':
      return await getTableStats(data);
    case 'getSubjectStats':
      return await getSubjectStats(data);
    case 'getIncompleteRaters':
      return await getIncompleteRaters(data);
    case 'getRatedSubjectsByRater':
      return await getRatedSubjectsByRater(data);
    default:
      return {
        code: -1,
        msg: '未知操作'
      };
  }
};

// 提交评分
async function submitRating(data) {
  const { table_id, rater, subject, scores, comment = '' } = data;
  
  // 增强的参数校验
  const missingParams = [];
  if (!table_id) missingParams.push('table_id');
  if (!rater) missingParams.push('rater');
  if (!subject) missingParams.push('subject');
  if (!scores) missingParams.push('scores');
  else if (!Array.isArray(scores)) missingParams.push('scores (非数组格式)');
  
  if (missingParams.length > 0) {
    console.error('提交评分缺少必要参数:', missingParams, '原始数据:', data);
    return {
      code: -1,
      msg: `缺少必要参数: ${missingParams.join(', ')}`,
      missing: missingParams
    };
  }
  
  try {
    // 检查评分表是否存在
    const tableInfo = await ratingTableCollection.doc(table_id).get();
    
    if (tableInfo.data.length === 0) {
      return {
        code: -1,
        msg: '评分表不存在'
      };
    }
    
    const table = tableInfo.data[0];
    
    // 检查评分人是否有权限
    if (table.rater !== rater) {
      return {
        code: -1,
        msg: '无权提交评分'
      };
    }
    
    // 计算总分
    let total_score = 0;
    for (const score of scores) {
      total_score += parseFloat(score.score || 0);
    }
    
    // 检查是否已存在评分记录
    const existRating = await ratingCollection.where({
      table_id,
      rater,
      subject
    }).get();
    
    if (existRating.data.length > 0) {
      // 已存在评分记录，更新
      const ratingId = existRating.data[0]._id;
      
      await ratingCollection.doc(ratingId).update({
        scores,
        total_score,
        comment,
        update_date: new Date()
      });
      
      return {
        code: 0,
        msg: '更新评分成功',
        data: {
          id: ratingId
        }
      };
    } else {
      // 创建新评分记录
      const result = await ratingCollection.add({
        table_id,
        rater,
        subject,
        scores,
        total_score,
        comment,
        rating_date: new Date()
      });
      
      return {
        code: 0,
        msg: '提交评分成功',
        data: {
          id: result.id
        }
      };
    }
  } catch (e) {
    console.error('提交评分失败:', e);
    return {
      code: -1,
      msg: `提交评分失败: ${e.message}`,
      error: e.message
    };
  }
}

// 更新评分
async function updateRating(data) {
  const { ratingId, scores, comment } = data;
  
  // 增强的参数校验
  const missingParams = [];
  if (!ratingId) missingParams.push('ratingId');
  if (!scores) missingParams.push('scores');
  else if (!Array.isArray(scores)) missingParams.push('scores (非数组格式)');
  
  if (missingParams.length > 0) {
    console.error('更新评分缺少必要参数:', missingParams, '原始数据:', data);
    return {
      code: -1,
      msg: `缺少必要参数: ${missingParams.join(', ')}`,
      missing: missingParams
    };
  }
  
  try {
    // 计算总分
    let total_score = 0;
    for (const score of scores) {
      total_score += parseFloat(score.score || 0);
    }
    
    // 更新评分
    await ratingCollection.doc(ratingId).update({
      scores,
      total_score,
      comment: comment || '',
      update_date: new Date()
    });
    
    return {
      code: 0,
      msg: '更新评分成功'
    };
  } catch (e) {
    console.error('更新评分失败:', e, '原始数据:', data);
    return {
      code: -1,
      msg: `更新评分失败: ${e.message}`,
      error: e.message
    };
  }
}

// 删除评分
async function deleteRating(data) {
  const { ratingId } = data;
  
  try {
    await ratingCollection.doc(ratingId).remove();
    
    return {
      code: 0,
      msg: '删除评分成功'
    };
  } catch (e) {
    return {
      code: -1,
      msg: '删除评分失败',
      error: e.message
    };
  }
}

// 获取评分列表
async function getRatings(data) {
  const { table_id, rater, subject, page = 1, pageSize = 10 } = data;
  
  try {
    let query = ratingCollection;
    
    // 筛选条件
    const whereConditions = {};
    if (table_id) {
      whereConditions.table_id = table_id;
    }
    if (rater) {
      whereConditions.rater = rater;
    }
    if (subject) {
      whereConditions.subject = subject;
    }
    
    if (Object.keys(whereConditions).length > 0) {
      query = query.where(whereConditions);
    }
    
    // 分页查询
    const ratingList = await query.skip((page - 1) * pageSize).limit(pageSize).get();
    
    // 获取总数
    const countResult = await query.count();
    
    return {
      code: 0,
      msg: '获取评分列表成功',
      data: {
        list: ratingList.data,
        total: countResult.total,
        page,
        pageSize
      }
    };
  } catch (e) {
    return {
      code: -1,
      msg: '获取评分列表失败',
      error: e.message
    };
  }
}

// 获取评分详情
async function getRatingDetail(data) {
  const { ratingId } = data;
  
  try {
    const ratingInfo = await ratingCollection.doc(ratingId).get();
    
    if (ratingInfo.data.length === 0) {
      return {
        code: -1,
        msg: '评分记录不存在'
      };
    }
    
    // 获取关联的评分表信息
    const rating = ratingInfo.data[0];
    const tableInfo = await ratingTableCollection.doc(rating.table_id).get();
    
    // 获取评分人信息
    const userInfo = await userCollection.where({
      username: rating.rater
    }).get();
    
    return {
      code: 0,
      msg: '获取评分详情成功',
      data: {
        rating: rating,
        table: tableInfo.data.length > 0 ? tableInfo.data[0] : null,
        rater: userInfo.data.length > 0 ? userInfo.data[0] : null
      }
    };
  } catch (e) {
    return {
      code: -1,
      msg: '获取评分详情失败',
      error: e.message
    };
  }
}

// 根据考核对象获取评分
async function getRatingBySubject(data) {
  const { tableId, subject, rater } = data;
  
  // 增强的参数校验
  const missingParams = [];
  if (!tableId) missingParams.push('tableId');
  if (!subject) missingParams.push('subject');
  
  if (missingParams.length > 0) {
    console.error('获取评分记录缺少必要参数:', missingParams, '原始数据:', data);
    return {
      code: -1,
      msg: `缺少必要参数: ${missingParams.join(', ')}`,
      missing: missingParams
    };
  }
  
  try {
    console.log(`开始查询评分记录: 表ID=${tableId}, 考核对象=${subject}, 评分人=${rater || '未指定'}`);
    
    // 构建查询条件，确保严格匹配表ID
    const whereCondition = {
      table_id: tableId,  // 严格匹配表ID
      subject: subject
    };
    
    // 如果提供了rater参数，则添加评分人筛选条件
    if (rater) {
      whereCondition.rater = rater;
    }
    
    console.log('查询条件:', JSON.stringify(whereCondition));
    
    // 获取评分记录
    const ratingInfo = await ratingCollection.where(whereCondition).get();
    
    console.log(`找到${ratingInfo.data.length}条评分记录`);
    
    if (ratingInfo.data.length === 0) {
      return {
        code: 0,
        msg: '评分记录不存在',
        data: null
      };
    }
    
    // 获取关联的评分表信息
    const rating = ratingInfo.data[0];
    
    // 再次验证表ID匹配
    if (rating.table_id !== tableId) {
      console.error('表ID不匹配: 期望的表ID =', tableId, '实际表ID =', rating.table_id);
      return {
        code: 0,
        msg: '评分记录不匹配当前评分表',
        data: null
      };
    }
    
    const tableInfo = await ratingTableCollection.doc(rating.table_id).get();
    
    return {
      code: 0,
      msg: '获取评分成功',
      data: {
        rating: rating,
        table: tableInfo.data.length > 0 ? tableInfo.data[0] : null
      }
    };
  } catch (e) {
    console.error('获取评分失败:', e);
    return {
      code: -1,
      msg: `获取评分失败: ${e.message}`,
      error: e.message
    };
  }
}

// 获取评分统计
async function getRatingStats(data) {
  const { type } = data;
  
  try {
    // 获取所有评分表
    let query = ratingTableCollection;
    if (type) {
      query = query.where({ type });
    }
    const tables = await query.get();
    
    // 获取所有有效的评分表ID列表
    const validTableIds = tables.data.map(table => table._id);
    
    // 如果没有评分表，直接返回空统计
    if (validTableIds.length === 0) {
      return {
        code: 0,
        msg: '获取评分统计成功',
        data: {
          tableCount: 0,
          subjectCount: 0,
          ratingCount: 0,
          completionRate: '0%'
        }
      };
    }
    
    // 获取所有评分表数量
    const tableCount = tables.data.length;
    
    // 获取所有有效评分表的考核对象数量
    const subjectResult = await subjectCollection.where({
      table_id: db.command.in(validTableIds)
    }).count();
    const subjectCount = subjectResult.total || 0;
    
    // 获取所有有效评分表的评分记录数量
    const ratingResult = await ratingCollection.where({
      table_id: db.command.in(validTableIds)
    }).count();
    const ratingCount = ratingResult.total || 0;
    
    // 计算每个表的考核对象数量和评分记录数量（优化为批量查询）
    let totalSubjectCount = 0;
    let completedRatingCount = 0;
    
    // 使用Promise.all同时查询所有表的数据，减少等待时间
    const statsPromises = tables.data.map(async table => {
      // 获取该表的考核对象数量
      const tableSubjectsResult = await subjectCollection.where({
        table_id: table._id
      }).count();
      
      // 获取该表的评分记录数量
      const tableRatingsResult = await ratingCollection.where({
        table_id: table._id
      }).count();
      
      return {
        subjectCount: tableSubjectsResult.total || 0,
        ratingCount: tableRatingsResult.total || 0
      };
    });
    
    // 等待所有查询完成
    const tableStats = await Promise.all(statsPromises);
    
    // 统计总数
    tableStats.forEach(stat => {
      totalSubjectCount += stat.subjectCount;
      completedRatingCount += stat.ratingCount;
    });
    
    // 计算完成率：已完成的评分记录数量 / 总评分任务数量
    const completionRate = totalSubjectCount > 0 ? Math.min(100, Math.round((completedRatingCount / totalSubjectCount) * 100)) : 0;
    
    // 构建总概览数据
    const overview = {
      tableCount: tableCount,
      subjectCount: subjectCount,
      ratingCount: ratingCount,
      completionRate: completionRate + '%'
    };
    
    // 统计结果
    const statsResult = [];
    
    // 对每个评分表进行统计
    for (const table of tables.data) {
      // 获取该表的所有评分记录
      const ratings = await ratingCollection.where({
        table_id: table._id
      }).get();
      
      // 获取该表的所有考核对象
      const subjects = await subjectCollection.where({
        table_id: table._id
      }).get();
      
      // 计算平均分
      let totalScore = 0;
      let ratedCount = 0;
      
      for (const rating of ratings.data) {
        totalScore += rating.total_score || 0;
        ratedCount++;
      }
      
      const avgScore = ratedCount > 0 ? (totalScore / ratedCount).toFixed(2) : 0;
      
      statsResult.push({
        table: table,
        totalSubjects: subjects.data.length,
        ratedCount: ratedCount,
        avgScore: avgScore
      });
    }
    
    return {
      code: 0,
      msg: '获取评分统计成功',
      data: overview
    };
  } catch (e) {
    console.error('获取评分统计失败:', e);
    return {
      code: -1,
      msg: '获取评分统计失败: ' + e.message,
      error: e.message
    };
  }
}

// 获取评委个人的评分统计
async function getRaterStats(data, context) {
  try {
    let username = null;
    
    // 方法1: 直接从data中获取用户名
    if (data.username) {
      username = data.username;
    }
    
    // 方法2: 从token中获取用户信息(如果有)
    if (!username) {
      try {
        const clientInfo = context.CLIENTINFO || "{}";
        const parsedClientInfo = JSON.parse(clientInfo);
        const uniIdToken = parsedClientInfo.uniIdToken;
        
        if (uniIdToken) {
          const payload = uniCloud.parseToken(uniIdToken);
          username = payload.uid;
        }
      } catch (e) {
        console.error('解析token失败', e);
      }
    }
    
    // 如果没有获取到用户名，尝试从环境获取当前用户
    if (!username && data.uniIdToken) {
      try {
        const payload = uniCloud.parseToken(data.uniIdToken);
        username = payload.uid;
      } catch (e) {
        console.error('解析前端传递的token失败', e);
      }
    }
    
    // 如果仍然没有获取到用户名，检查是否在本地调试模式下，使用请求中的rater参数
    if (!username && data.rater) {
      username = data.rater;
    }
    
    // 如果仍然没有获取到用户名，返回错误
    if (!username) {
      return {
        code: -1,
        msg: '用户未登录或登录已过期，请重新登录 - 请在data中传入username或rater参数'
      };
    }
    
    // 查询用户信息
    const userInfo = await userCollection.where({
      username: username
    }).get();
    
    if (userInfo.data.length === 0) {
      return {
        code: -1,
        msg: `用户 ${username} 不存在`
      };
    }
    
    const user = userInfo.data[0];
    const rater = user.username;
    const assignedTables = user.assignedTables || [];
    
    // 如果没有分配的评分表
    if (assignedTables.length === 0) {
      return {
        code: 0,
        msg: '获取评分统计成功',
        data: {
          total: 0,
          completed: 0,
          pending: 0
        }
      };
    }
    
    // 获取所有分配的评分表
    const tables = await ratingTableCollection.where({
      _id: db.command.in(assignedTables)
    }).get();
    
    let totalSubjects = 0;
    let completed = 0;
    
    // 遍历每个评分表，计算完成情况
    for (const table of tables.data) {
      // 获取该表的考核对象
      const subjects = await subjectCollection.where({
        table_id: db.command.in([table._id])
      }).get();
      
      // 获取该表该评分员已完成的评分记录
      const ratings = await ratingCollection.where({
        table_id: table._id,
        rater
      }).get();
      
      // 统计数量
      totalSubjects += subjects.data.length;
      completed += ratings.data.length;
    }
    
    // 计算待评分数量
    const pending = totalSubjects - completed;
    
    return {
      code: 0,
      msg: '获取评分统计成功',
      data: {
        total: totalSubjects,
        completed,
        pending
      }
    };
  } catch (e) {
    return {
      code: -1,
      msg: '获取评分统计失败',
      error: e.message
    };
  }
}

// 获取评分表的所有评分结果（按考核对象分组）
async function getTableRatings(data) {
  const { tableId } = data;
  
  try {
    // 获取评分表信息
    const tableInfo = await ratingTableCollection.doc(tableId).get();
    if (tableInfo.data.length === 0) {
      return {
        code: -1,
        msg: '评分表不存在'
      };
    }
    
    // 获取所有相关考核对象
    const subjects = await subjectCollection.where({
      table_id: db.command.in([tableId])
    }).get();
    
    // 获取所有评分记录
    const ratings = await ratingCollection.where({
      table_id: tableId
    }).get();
    
    // 按考核对象分组
    const subjectMap = {};
    subjects.data.forEach(subject => {
      subjectMap[subject.name] = {
        subject: subject,
        ratings: []
      };
    });
    
    // 填充评分数据
    ratings.data.forEach(rating => {
      if (subjectMap[rating.subject]) {
        subjectMap[rating.subject].ratings.push(rating);
      }
    });
    
    return {
      code: 0,
      msg: '获取评分数据成功',
      data: {
        table: tableInfo.data[0],
        subjects: subjectMap
      }
    };
  } catch (e) {
    return {
      code: -1,
      msg: '获取评分数据失败',
      error: e.message
    };
  }
}

// 获取评分表的所有评分记录（按评分人筛选）
async function getRatingsByTable(data) {
  const { tableId, rater } = data;
  
  console.log('获取评分表的所有评分记录，参数:', data);
  
  try {
    if (!tableId) {
      console.error('获取评分表记录缺少tableId参数:', data);
      return {
        code: -1,
        msg: '缺少必要参数: tableId',
        missing: ['tableId']
      };
    }
    
    // 构建查询条件
    const queryCondition = {
      table_id: tableId
    };
    
    // 如果提供了评分人，则添加评分人筛选条件
    if (rater) {
      queryCondition.rater = rater;
    }
    
    console.log('最终查询条件:', JSON.stringify(queryCondition));
    
    // 使用合并后的条件进行一次查询
    const ratingsResult = await ratingCollection.where(queryCondition).get();
    
    console.log(`找到${ratingsResult.data.length}条评分记录`);
    
    return {
      code: 0,
      msg: '获取评分记录成功',
      data: {
        ratings: ratingsResult.data
      }
    };
  } catch (e) {
    console.error('获取评分记录失败:', e, '原始参数:', data);
    return {
      code: -1,
      msg: `获取评分记录失败: ${e.message}`,
      error: e.message
    };
  }
}

// 获取评分表统计数据
async function getTableStats(data) {
  const { table_id } = data;
  
  try {
    // 验证参数
    if (!table_id) {
      return {
        code: -1,
        msg: '缺少必要参数: table_id'
      };
    }
    
    // 获取评分表信息
    const tableInfo = await ratingTableCollection.doc(table_id).get();
    
    if (tableInfo.data.length === 0) {
      return {
        code: -1,
        msg: '评分表不存在'
      };
    }
    
    const table = tableInfo.data[0];
    
    // 获取考核对象数量
    const subjectResult = await subjectCollection.where({
      table_id: table_id
    }).count();
    
    const subjectCount = subjectResult.total || 0;
    
    // 获取评分记录数量
    const ratingResult = await ratingCollection.where({
      table_id: table_id
    }).count();
    
    const ratingCount = ratingResult.total || 0;
    
    // 计算评分完成率
    const completionRate = subjectCount > 0 ? Math.round((ratingCount / subjectCount) * 100) : 0;
    
    return {
      code: 0,
      msg: '获取评分表统计成功',
      data: {
        _id: table._id,
        name: table.name,
        type: table.type,
        category: table.category,
        rater: table.rater,
        subjectCount: subjectCount,
        ratingCount: ratingCount,
        completionRate: completionRate
      }
    };
    
  } catch (e) {
    console.error('获取评分表统计失败:', e);
    return {
      code: -1,
      msg: '获取评分表统计失败: ' + e.message,
      error: e.message
    };
  }
}

// 获取考核对象统计数据
async function getSubjectStats(data) {
  const { table_id, page = 1, pageSize = 10 } = data;
  
  try {
    // 验证参数
    if (!table_id) {
      return {
        code: -1,
        msg: '缺少必要参数: table_id'
      };
    }
    
    // 获取评分表信息
    const tableInfo = await ratingTableCollection.doc(table_id).get();
    
    if (tableInfo.data.length === 0) {
      return {
        code: -1,
        msg: '评分表不存在'
      };
    }
    
    const table = tableInfo.data[0];
    
    // 获取所有考核对象
    const subjectResult = await subjectCollection.where({
      table_id: table_id
    }).skip((page - 1) * pageSize).limit(pageSize).get();
    
    // 获取考核对象总数
    const countResult = await subjectCollection.where({
      table_id: table_id
    }).count();
    
    const subjects = subjectResult.data || [];
    const total = countResult.total || 0;
    
    // 获取所有评分记录
    const ratingResult = await ratingCollection.where({
      table_id: table_id
    }).get();
    
    const ratings = ratingResult.data || [];
    
    // 构建考核对象评分统计
    const subjectStats = [];
    
    for (const subject of subjects) {
      // 查找该考核对象的评分记录
      const subjectRatings = ratings.filter(r => r.subject === subject.name);
      
      // 计算平均分
      let totalScore = 0;
      let maxScore = 100; // 默认满分为100
      
      if (subjectRatings.length > 0) {
        subjectRatings.forEach(rating => {
          totalScore += rating.total_score || 0;
        });
        
        // 取第一条评分记录的评分项作为满分参考
        if (subjectRatings[0].scores && subjectRatings[0].scores.length > 0) {
          maxScore = subjectRatings[0].scores.reduce((total, score) => total + (score.maxScore || 0), 0);
        }
      }
      
      const avgScore = subjectRatings.length > 0 ? Math.round(totalScore / subjectRatings.length) : 0;
      
      // 构建评分项得分明细
      let scores = [];
      if (subjectRatings.length > 0 && subjectRatings[0].scores) {
        scores = subjectRatings[0].scores.map(score => {
          return {
            name: score.name,
            score: score.score,
            maxScore: score.maxScore
          };
        });
      }
      
      subjectStats.push({
        _id: subject._id,
        name: subject.name,
        department: subject.department,
        position: subject.position,
        totalScore: avgScore,
        maxScore: maxScore,
        ratingCount: subjectRatings.length,
        scores: scores,
        comment: subjectRatings.length > 0 ? subjectRatings[0].comment : ''
      });
    }
    
    return {
      code: 0,
      msg: '获取考核对象统计成功',
      data: {
        list: subjectStats,
        total: total,
        page: page,
        pageSize: pageSize
      }
    };
    
  } catch (e) {
    console.error('获取考核对象统计失败:', e);
    return {
      code: -1,
      msg: '获取考核对象统计失败: ' + e.message,
      error: e.message
    };
  }
}

// 获取未完成评分的人员列表
async function getIncompleteRaters(data) {
  const { table_id } = data;
  
  try {
    // 获取所有评分员用户
    const raters = await userCollection.where({
      role: 'rater'
    }).get();
    
    if (raters.data.length === 0) {
      return {
        code: 0,
        msg: '没有找到评分员',
        data: []
      };
    }
    
    // 获取评分表信息
    let tables;
    if (table_id && typeof table_id === 'string' && table_id.trim() !== '') {
      // 使用where查询指定的表
      tables = await ratingTableCollection.where({
        _id: table_id
      }).get();
      
      // 如果指定了表ID但没找到表
      if (tables.data.length === 0) {
        return {
          code: -1,
          msg: '评分表不存在'
        };
      }
    } else {
      // 获取所有评分表（当table_id为空、null、undefined或空字符串时）
      tables = await ratingTableCollection.get();
    }
    
    // 处理每个评分员的完成情况
    const incompleteRaters = [];
    
    for (const rater of raters.data) {
      // 如果没有分配评分表，跳过
      if (!rater.assignedTables || rater.assignedTables.length === 0) {
        continue;
      }
      
      // 根据参数确定要检查的评分表
      let tableIds = rater.assignedTables;
      if (table_id && typeof table_id === 'string' && table_id.trim() !== '') {
        // 如果指定了表ID且该评分员没有分配该表，跳过
        if (!tableIds.includes(table_id)) {
          continue;
        }
        tableIds = [table_id];
      }
      
      // 获取这些评分表信息
      const assignedTables = await ratingTableCollection.where({
        _id: db.command.in(tableIds)
      }).get();
      
      let totalSubjects = 0;
      let completedCount = 0;
      const incompleteTables = [];
      
      // 检查每个表的完成情况
      for (const table of assignedTables.data) {
        // 如果该表不是分配给这个评分员的，跳过
        if (table.rater !== rater.username) {
          continue;
        }
        
        // 获取该表的考核对象数量
        const subjects = await subjectCollection.where({
          table_id: table._id
        }).get();
        
        // 获取该表该评分员已完成的评分记录
        const ratings = await ratingCollection.where({
          table_id: table._id,
          rater: rater.username
        }).get();
        
        const subjectCount = subjects.data.length;
        const ratingCount = ratings.data.length;
        
        totalSubjects += subjectCount;
        completedCount += ratingCount;
        
        // 如果有未完成的评分，记录这个表
        if (ratingCount < subjectCount) {
          incompleteTables.push({
            _id: table._id,
            name: table.name,
            total: subjectCount,
            completed: ratingCount,
            pending: subjectCount - ratingCount
          });
        }
      }
      
      // 如果有未完成的评分，添加到未完成评分员列表
      if (completedCount < totalSubjects) {
        const completionRate = totalSubjects > 0 ? Math.round((completedCount / totalSubjects) * 100) : 0;
        
        incompleteRaters.push({
          username: rater.username,
          name: rater.name || rater.username,
          total: totalSubjects,
          completed: completedCount,
          pending: totalSubjects - completedCount,
          completionRate: completionRate,
          tables: incompleteTables
        });
      }
    }
    
    // 按照未完成数量降序排列
    incompleteRaters.sort((a, b) => b.pending - a.pending);
    
    return {
      code: 0,
      msg: '获取未完成评分人员成功',
      data: incompleteRaters
    };
  } catch (e) {
    console.error('获取未完成评分人员失败:', e);
    return {
      code: -1,
      msg: '获取未完成评分人员失败: ' + e.message,
      error: e.message
    };
  }
} 

// 获取评分员已评分的考核对象列表及分数
async function getRatedSubjectsByRater(data) {
  const { tableId, rater } = data;
  
  console.log('获取评分员已评分的考核对象，参数:', data);
  
  try {
    // 参数校验
    if (!tableId) {
      console.error('获取已评分考核对象缺少tableId参数');
      return {
        code: -1,
        msg: '缺少必要参数: tableId',
        missing: ['tableId']
      };
    }
    
    if (!rater) {
      console.error('获取已评分考核对象缺少rater参数');
      return {
        code: -1,
        msg: '缺少必要参数: rater',
        missing: ['rater']
      };
    }
    
    // 构建查询条件
    const queryCondition = {
      table_id: tableId,
      rater: rater
    };
    
    console.log('查询条件:', JSON.stringify(queryCondition));
    
    // 获取该评分员在该表的所有评分记录
    const ratings = await ratingCollection.where(queryCondition).get();
    
    console.log(`找到${ratings.data.length}条评分记录`);
    
    // 格式化结果
    const ratedSubjects = ratings.data.map(rating => {
      return {
        id: rating._id,
        name: rating.subject,
        score: rating.total_score || 0,
        rating_date: rating.rating_date || rating.update_date || new Date()
      };
    });
    
    // 按评分分数从高到低排序
    ratedSubjects.sort((a, b) => b.score - a.score);
    
    return {
      code: 0,
      msg: '获取已评分考核对象成功',
      data: {
        ratedSubjects: ratedSubjects
      }
    };
  } catch (e) {
    console.error('获取已评分考核对象失败:', e);
    return {
      code: -1,
      msg: `获取已评分考核对象失败: ${e.message}`,
      error: e.message
    };
  }
} 