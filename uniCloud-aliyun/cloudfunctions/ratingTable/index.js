'use strict';
const db = uniCloud.database();
const ratingTableCollection = db.collection('rating_tables');
const userCollection = db.collection('users');
const subjectCollection = db.collection('subjects');

exports.main = async (event, context) => {
  const { action, data } = event;
  
  // 根据操作类型执行不同的操作
  switch (action) {
    case 'createTable':
      return await createTable(data);
    case 'updateTable':
      return await updateTable(data);
    case 'deleteTable':
      return await deleteTable(data);
    case 'getTables':
      return await getTables(data);
    case 'getTableDetail':
      return await getTableDetail(data);
    case 'addTableItem':
      return await addTableItem(data);
    case 'updateTableItem':
      return await updateTableItem(data);
    case 'deleteTableItem':
      return await deleteTableItem(data);
    case 'changeRater':
      return await changeRater(data);
    default:
      return {
        code: -1,
        msg: '未知操作'
      };
  }
};

// 创建评分表
async function createTable(data) {
  const { name, type, category, rater, items = [] } = data;
  
  // 参数校验
  if (!name || !type || !rater) {
    return {
      code: -1,
      msg: '缺少必要参数'
    };
  }
  
  try {
    // 检查评分人是否存在
    const userInfo = await userCollection.where({
      username: rater
    }).get();
    
    if (userInfo.data.length === 0) {
      return {
        code: -1,
        msg: '评分人不存在'
      };
    }
    
    // 创建评分表
    const defaultItems = [];
    if (items.length === 0) {
      // 默认评分项
      if (type === 3 && category && category.includes('中层干部考核评分表')) {
        // 班子评分表默认项
        defaultItems.push({
          name: '重点工作完成情况+办公室管理情况',
          maxScore: 100
        });
      } else {
        // 其他评分表默认项
        defaultItems.push({
          name: '工作完成质量',
          maxScore: 60
        });
        defaultItems.push({
          name: '工作完成效率',
          maxScore: 20
        });
        defaultItems.push({
          name: '工作完成态度',
          maxScore: 20
        });
      }
    }
    
    const result = await ratingTableCollection.add({
      name,
      type,
      category: category || '',
      rater,
      items: items.length > 0 ? items : defaultItems
    });
    
    // 更新评分人的表格分配
    const user = userInfo.data[0];
    const assignedTables = user.assignedTables || [];
    assignedTables.push(result.id);
    
    await userCollection.doc(user._id).update({
      assignedTables
    });
    
    return {
      code: 0,
      msg: '创建评分表成功',
      data: {
        id: result.id
      }
    };
  } catch (e) {
    return {
      code: -1,
      msg: '创建评分表失败',
      error: e.message
    };
  }
}

// 更新评分表
async function updateTable(data) {
  const { tableId, updateData } = data;
  
  try {
    await ratingTableCollection.doc(tableId).update(updateData);
    
    return {
      code: 0,
      msg: '更新评分表成功'
    };
  } catch (e) {
    return {
      code: -1,
      msg: '更新评分表失败',
      error: e.message
    };
  }
}

// 删除评分表
async function deleteTable(data) {
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
    
    const table = tableInfo.data[0];
    
    // 更新评分人的表格分配，移除该表
    const userInfo = await userCollection.where({
      username: table.rater
    }).get();
    
    if (userInfo.data.length > 0) {
      const user = userInfo.data[0];
      const assignedTables = user.assignedTables || [];
      const updatedTables = assignedTables.filter(id => id !== tableId);
      
      await userCollection.doc(user._id).update({
        assignedTables: updatedTables
      });
    }
    
    // 删除评分表
    await ratingTableCollection.doc(tableId).remove();
    
    // 删除关联的考核对象
    await subjectCollection.where({
      table_id: tableId
    }).remove();
    
    return {
      code: 0,
      msg: '删除评分表成功'
    };
  } catch (e) {
    return {
      code: -1,
      msg: '删除评分表失败',
      error: e.message
    };
  }
}

// 获取评分表列表
async function getTables(data) {
  const { type, rater, page = 1, pageSize = 10 } = data;
  
  try {
    let query = ratingTableCollection;
    
    // 筛选条件
    const whereConditions = {};
    if (type) {
      whereConditions.type = type;
    }
    if (rater) {
      whereConditions.rater = rater;
    }
    
    if (Object.keys(whereConditions).length > 0) {
      query = query.where(whereConditions);
    }
    
    // 分页查询
    const tableList = await query.skip((page - 1) * pageSize).limit(pageSize).get();
    
    // 获取总数
    const countResult = await query.count();
    
    return {
      code: 0,
      msg: '获取评分表列表成功',
      data: {
        list: tableList.data,
        total: countResult.total,
        page,
        pageSize
      }
    };
  } catch (e) {
    return {
      code: -1,
      msg: '获取评分表列表失败',
      error: e.message
    };
  }
}

// 获取评分表详情
async function getTableDetail(data) {
  const { tableId } = data;
  
  try {
    const tableInfo = await ratingTableCollection.doc(tableId).get();
    
    if (tableInfo.data.length === 0) {
      return {
        code: -1,
        msg: '评分表不存在'
      };
    }
    
    // 获取该表的考核对象
    const subjects = await subjectCollection.where({
      table_id: tableId
    }).get();
    
    return {
      code: 0,
      msg: '获取评分表详情成功',
      data: {
        table: tableInfo.data[0],
        subjects: subjects.data
      }
    };
  } catch (e) {
    return {
      code: -1,
      msg: '获取评分表详情失败',
      error: e.message
    };
  }
}

// 添加评分项目
async function addTableItem(data) {
  const { tableId, item } = data;
  
  try {
    const tableInfo = await ratingTableCollection.doc(tableId).get();
    
    if (tableInfo.data.length === 0) {
      return {
        code: -1,
        msg: '评分表不存在'
      };
    }
    
    const table = tableInfo.data[0];
    const items = table.items || [];
    
    items.push(item);
    
    await ratingTableCollection.doc(tableId).update({
      items
    });
    
    return {
      code: 0,
      msg: '添加评分项目成功'
    };
  } catch (e) {
    return {
      code: -1,
      msg: '添加评分项目失败',
      error: e.message
    };
  }
}

// 更新评分项目
async function updateTableItem(data) {
  const { tableId, itemIndex, item } = data;
  
  try {
    const tableInfo = await ratingTableCollection.doc(tableId).get();
    
    if (tableInfo.data.length === 0) {
      return {
        code: -1,
        msg: '评分表不存在'
      };
    }
    
    const table = tableInfo.data[0];
    const items = table.items || [];
    
    if (itemIndex < 0 || itemIndex >= items.length) {
      return {
        code: -1,
        msg: '评分项目索引无效'
      };
    }
    
    items[itemIndex] = item;
    
    await ratingTableCollection.doc(tableId).update({
      items
    });
    
    return {
      code: 0,
      msg: '更新评分项目成功'
    };
  } catch (e) {
    return {
      code: -1,
      msg: '更新评分项目失败',
      error: e.message
    };
  }
}

// 删除评分项目
async function deleteTableItem(data) {
  const { tableId, itemIndex } = data;
  
  try {
    const tableInfo = await ratingTableCollection.doc(tableId).get();
    
    if (tableInfo.data.length === 0) {
      return {
        code: -1,
        msg: '评分表不存在'
      };
    }
    
    const table = tableInfo.data[0];
    const items = table.items || [];
    
    if (itemIndex < 0 || itemIndex >= items.length) {
      return {
        code: -1,
        msg: '评分项目索引无效'
      };
    }
    
    items.splice(itemIndex, 1);
    
    await ratingTableCollection.doc(tableId).update({
      items
    });
    
    return {
      code: 0,
      msg: '删除评分项目成功'
    };
  } catch (e) {
    return {
      code: -1,
      msg: '删除评分项目失败',
      error: e.message
    };
  }
}

// 更改评分人
async function changeRater(data) {
  const { tableId, newRater } = data;
  
  try {
    // 检查评分表
    const tableInfo = await ratingTableCollection.doc(tableId).get();
    
    if (tableInfo.data.length === 0) {
      return {
        code: -1,
        msg: '评分表不存在'
      };
    }
    
    const table = tableInfo.data[0];
    const oldRater = table.rater;
    
    // 检查新评分人是否存在
    const newUserInfo = await userCollection.where({
      username: newRater
    }).get();
    
    if (newUserInfo.data.length === 0) {
      return {
        code: -1,
        msg: '新评分人不存在'
      };
    }
    
    // 更新评分表的评分人
    await ratingTableCollection.doc(tableId).update({
      rater: newRater
    });
    
    // 更新旧评分人的表格分配，移除该表
    if (oldRater) {
      const oldUserInfo = await userCollection.where({
        username: oldRater
      }).get();
      
      if (oldUserInfo.data.length > 0) {
        const oldUser = oldUserInfo.data[0];
        const oldAssignedTables = oldUser.assignedTables || [];
        const updatedOldTables = oldAssignedTables.filter(id => id !== tableId);
        
        await userCollection.doc(oldUser._id).update({
          assignedTables: updatedOldTables
        });
      }
    }
    
    // 更新新评分人的表格分配，添加该表
    const newUser = newUserInfo.data[0];
    const newAssignedTables = newUser.assignedTables || [];
    if (!newAssignedTables.includes(tableId)) {
      newAssignedTables.push(tableId);
      
      await userCollection.doc(newUser._id).update({
        assignedTables: newAssignedTables
      });
    }
    
    return {
      code: 0,
      msg: '更改评分人成功'
    };
  } catch (e) {
    return {
      code: -1,
      msg: '更改评分人失败',
      error: e.message
    };
  }
} 