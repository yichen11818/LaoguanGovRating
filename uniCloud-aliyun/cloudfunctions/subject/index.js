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
  
  // 参数校验
  if (!name || !table_id || !Array.isArray(table_id) || table_id.length === 0) {
    return {
      code: -1,
      msg: '缺少必要参数'
    };
  }
  
  try {
    // 检查评分表是否存在
    for (const tableId of table_id) {
      const tableInfo = await ratingTableCollection.doc(tableId).get();
      if (tableInfo.data.length === 0) {
        return {
          code: -1,
          msg: `评分表 ${tableId} 不存在`
        };
      }
    }
    
    // 创建考核对象
    const result = await subjectCollection.add({
      name,
      table_id,
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
      if (!Array.isArray(updateData.table_id) || updateData.table_id.length === 0) {
        return {
          code: -1,
          msg: '评分表ID不能为空'
        };
      }
      
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
  const { table_id, page = 1, pageSize = 10 } = data;
  
  try {
    let query = subjectCollection;
    
    // 筛选条件
    if (table_id) {
      query = query.where({
        table_id: db.command.in([table_id])
      });
    }
    
    // 分页查询
    const subjectList = await query.skip((page - 1) * pageSize).limit(pageSize).get();
    
    // 获取总数
    const countResult = await query.count();
    
    return {
      code: 0,
      msg: '获取考核对象列表成功',
      data: {
        list: subjectList.data,
        total: countResult.total,
        page,
        pageSize
      }
    };
  } catch (e) {
    return {
      code: -1,
      msg: '获取考核对象列表失败',
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