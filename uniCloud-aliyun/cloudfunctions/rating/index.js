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
  
  // 参数校验
  if (!table_id || !rater || !subject || !scores || !Array.isArray(scores)) {
    return {
      code: -1,
      msg: '缺少必要参数'
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
    return {
      code: -1,
      msg: '提交评分失败',
      error: e.message
    };
  }
}

// 更新评分
async function updateRating(data) {
  const { ratingId, scores, comment } = data;
  
  // 参数校验
  if (!ratingId || !scores || !Array.isArray(scores)) {
    return {
      code: -1,
      msg: '缺少必要参数'
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
    return {
      code: -1,
      msg: '更新评分失败',
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
  const { table_id, subject } = data;
  
  // 参数校验
  if (!table_id || !subject) {
    return {
      code: -1,
      msg: '缺少必要参数'
    };
  }
  
  try {
    // 获取评分记录
    const ratingInfo = await ratingCollection.where({
      table_id,
      subject
    }).get();
    
    if (ratingInfo.data.length === 0) {
      return {
        code: 0,
        msg: '评分记录不存在',
        data: null
      };
    }
    
    // 获取关联的评分表信息
    const rating = ratingInfo.data[0];
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
    return {
      code: -1,
      msg: '获取评分失败',
      error: e.message
    };
  }
}

// 获取评分统计
async function getRatingStats(data) {
  const { type } = data;
  
  try {
    let query = ratingTableCollection;
    
    if (type) {
      query = query.where({ type });
    }
    
    // 获取所有评分表
    const tables = await query.get();
    
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
        totalScore += rating.total_score;
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
      data: statsResult
    };
  } catch (e) {
    return {
      code: -1,
      msg: '获取评分统计失败',
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
      
      // 获取该表的评分记录
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