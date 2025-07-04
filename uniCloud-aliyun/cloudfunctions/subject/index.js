'use strict';
const db = uniCloud.database();
const subjectCollection = db.collection('subjects');
const ratingTableCollection = db.collection('rating_tables');

exports.main = async (event, context) => {
  const { action, data } = event;
  
  // 根据操作类型执行不同的操作
  switch (action) {
    case 'createSubject':
      return await createSubject(data);
    case 'updateSubject':
      return await updateSubject(data);
    case 'deleteSubject':
      return await deleteSubject(data);
    case 'getSubjects':
      return await getSubjects(data);
    case 'getSubjectDetail':
      return await getSubjectDetail(data);
    case 'getSubjectsByIds':
      return await getSubjectsByIds(data);
    default:
      return {
        code: -1,
        msg: '未知操作'
      };
  }
};

// 创建考核对象
async function createSubject(data) {
  const { name, table_id, position, department } = data;
  
  // 参数校验，修改这里，只验证必填的name字段，允许table_id为空数组
  if (!name) {
    return {
      code: -1,
      msg: '考核对象姓名不能为空'
    };
  }
  
  // 确保table_id为数组类型
  const tableIds = Array.isArray(table_id) ? table_id : [];
  
  try {
    // 如果有传评分表ID，则检查评分表是否存在
    if (tableIds.length > 0) {
      for (const tableId of tableIds) {
        const tableInfo = await ratingTableCollection.doc(tableId).get();
        if (tableInfo.data.length === 0) {
          return {
            code: -1,
            msg: `评分表 ${tableId} 不存在`
          };
        }
      }
    }
    
    // 创建考核对象
    const result = await subjectCollection.add({
      name,
      table_id: tableIds, // 使用处理后的tableIds
      position: position || '',
      department: department || ''
    });
    
    return {
      code: 0,
      msg: '创建考核对象成功',
      data: {
        id: result.id
      }
    };
  } catch (e) {
    return {
      code: -1,
      msg: '创建考核对象失败',
      error: e.message
    };
  }
}

// 更新考核对象
async function updateSubject(data) {
  const { subjectId, updateData } = data;
  
  try {
    // 如果更新了评分表，需要验证评分表是否存在
    if (updateData.table_id) {
      // 确保table_id是数组类型
      updateData.table_id = Array.isArray(updateData.table_id) ? updateData.table_id : [];
      
      // 如果有评分表ID，则检查它们是否存在
      if (updateData.table_id.length > 0) {
        for (const tableId of updateData.table_id) {
          const tableInfo = await ratingTableCollection.doc(tableId).get();
          if (tableInfo.data.length === 0) {
            return {
              code: -1,
              msg: `评分表 ${tableId} 不存在`
            };
          }
        }
      }
    }
    
    await subjectCollection.doc(subjectId).update(updateData);
    
    return {
      code: 0,
      msg: '更新考核对象成功'
    };
  } catch (e) {
    return {
      code: -1,
      msg: '更新考核对象失败',
      error: e.message
    };
  }
}

// 删除考核对象
async function deleteSubject(data) {
  const { subjectId } = data;
  
  try {
    await subjectCollection.doc(subjectId).remove();
    
    return {
      code: 0,
      msg: '删除考核对象成功'
    };
  } catch (e) {
    return {
      code: -1,
      msg: '删除考核对象失败',
      error: e.message
    };
  }
}

// 获取考核对象列表
async function getSubjects(data) {
  const { table_id, page = 1, pageSize = 10, keyword = '' } = data;
  
  console.log('搜索参数:', JSON.stringify(data));
  
  try {
    // 构建查询条件
    let whereObj = {};
    
    // 按评分表筛选
    if (table_id) {
      whereObj.table_id = db.command.in([table_id]);
    }
    
    // 关键词搜索 - 最基本的方式
    if (keyword && keyword.trim().length > 0) {
      const trimmedKeyword = keyword.trim();
      console.log('执行关键词搜索:', trimmedKeyword);
      
      // 名称字段直接包含关键词（不区分大小写）
      const orConditions = [
        { name: { $regex: trimmedKeyword, $options: 'i' } },
        { department: { $regex: trimmedKeyword, $options: 'i' } },
        { position: { $regex: trimmedKeyword, $options: 'i' } }
      ];
      
      // 如果已有筛选条件，使用$and组合
      if (Object.keys(whereObj).length > 0) {
        whereObj = {
          $and: [
            whereObj,
            { $or: orConditions }
          ]
        };
      } else {
        whereObj = { $or: orConditions };
      }
      
      console.log('搜索条件:', JSON.stringify(whereObj));
    }
    
    // 执行查询
    const query = subjectCollection.where(whereObj);
    
    // 分页查询
    const subjectList = await query.skip((page - 1) * pageSize).limit(pageSize).get();
    
    // 获取总数
    const countResult = await query.count();
    
    console.log(`搜索结果: 找到 ${countResult.total} 条记录`);
    
    return {
      code: 0,
      msg: '获取考核对象列表成功',
      data: {
        list: subjectList.data,
        total: countResult.total,
        page,
        pageSize,
        keyword // 返回关键词用于调试
      }
    };
  } catch (e) {
    console.error('搜索失败:', e);
    return {
      code: -1,
      msg: '获取考核对象列表失败: ' + e.message,
      error: e.message
    };
  }
}

// 获取考核对象详情
async function getSubjectDetail(data) {
  const { subjectId } = data;
  
  try {
    const subjectInfo = await subjectCollection.doc(subjectId).get();
    
    if (subjectInfo.data.length === 0) {
      return {
        code: -1,
        msg: '考核对象不存在'
      };
    }
    
    // 获取关联的评分表信息
    const subject = subjectInfo.data[0];
    const tableIds = subject.table_id || [];
    const tableInfo = await ratingTableCollection.where({
      _id: db.command.in(tableIds)
    }).get();
    
    return {
      code: 0,
      msg: '获取考核对象详情成功',
      data: {
        subject: subject,
        tables: tableInfo.data
      }
    };
  } catch (e) {
    return {
      code: -1,
      msg: '获取考核对象详情失败',
      error: e.message
    };
  }
}

// 通过ID列表批量获取考核对象
async function getSubjectsByIds(data) {
  const { ids } = data;
  
  // 参数校验
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return {
      code: -1,
      msg: '未提供有效的ID列表'
    };
  }

  try {
    // 批量查询指定ID的考核对象
    const subjectList = await subjectCollection.where({
      _id: db.command.in(ids)
    }).get();
    
    console.log(`根据ID查询结果: 找到 ${subjectList.data.length}/${ids.length} 条记录`);
    
    return {
      code: 0,
      msg: '批量获取考核对象成功',
      data: subjectList.data
    };
  } catch (e) {
    console.error('批量获取考核对象失败:', e);
    return {
      code: -1,
      msg: '批量获取考核对象失败: ' + e.message,
      error: e.message
    };
  }
} 