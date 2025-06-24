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
    case 'getRaterTables':
      return await getRaterTables(data, context);
    default:
      return {
        code: -1,
        msg: '未知操作'
      };
  }
};

// 创建评分表
async function createTable(data) {
  const { name, type, category, rater, items = [], selectedSubjects = [] } = data;
  
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
    
    // 处理考核对象关联
    if (selectedSubjects && selectedSubjects.length > 0) {
      console.log(`关联${selectedSubjects.length}个考核对象到评分表${result.id}`);
      
      // 遍历处理每个考核对象
      for (const subject of selectedSubjects) {
        if (!subject._id) {
          // 如果没有ID，这是一个新考核对象，需要创建
          await subjectCollection.add({
            name: subject.name,
            department: subject.department || '',
            position: subject.position || '',
            table_id: [result.id]
          });
          console.log(`创建了新考核对象: ${subject.name}`);
        } else {
          // 有ID，这是一个现有考核对象，更新其关联
          // 首先获取当前关联
          const existingSubject = await subjectCollection.doc(subject._id).get();
          
          if (existingSubject.data.length > 0) {
            // 确保table_id是数组
            let tableIds = existingSubject.data[0].table_id || [];
            if (!Array.isArray(tableIds)) {
              tableIds = [tableIds];
            }
            
            // 如果不包含当前表ID，则添加
            if (!tableIds.includes(result.id)) {
              tableIds.push(result.id);
            }
            
            // 更新考核对象
            await subjectCollection.doc(subject._id).update({
              table_id: tableIds
            });
            
            console.log(`已更新考核对象 ${subject.name}(${subject._id}) 的评分表关联`);
          } else {
            console.log(`警告: 未找到ID为 ${subject._id} 的考核对象`);
          }
        }
      }
    }
    
    return {
      code: 0,
      msg: '创建评分表成功',
      data: {
        id: result.id
      }
    };
  } catch (e) {
    console.error('创建评分表出错:', e);
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
    // 从updateData中提取selectedSubjects，避免将其直接保存到评分表中
    const { selectedSubjects, ...tableUpdateData } = updateData;
    
    // 更新评分表基本信息
    await ratingTableCollection.doc(tableId).update(tableUpdateData);
    
    // 处理考核对象关联
    if (selectedSubjects && Array.isArray(selectedSubjects)) {
      console.log(`处理评分表${tableId}的考核对象关联，共${selectedSubjects.length}个对象`);
      
      // 先移除该评分表的所有考核对象关联
      // 注意：不是删除考核对象，而是解除它们与当前评分表的关联
      const currentSubjects = await subjectCollection.where({
        table_id: db.command.all([tableId])
      }).get();
      
      console.log('当前关联到此评分表的考核对象数量:', currentSubjects.data.length);
      
      // 对于每个当前关联的考核对象，移除表ID关联
      for (const subject of currentSubjects.data) {
        // 确保table_id是数组
        const tableIds = Array.isArray(subject.table_id) ? subject.table_id : [subject.table_id];
        
        // 从表ID数组中移除当前表ID
        const updatedTableIds = tableIds.filter(id => id !== tableId);
        
        // 更新考核对象
        await subjectCollection.doc(subject._id).update({
          table_id: updatedTableIds
        });
        
        console.log(`已从考核对象 ${subject.name}(${subject._id}) 中移除评分表关联`);
      }
      
      // 然后添加新关联
      for (const subject of selectedSubjects) {
        if (!subject._id) {
          // 如果没有ID，这是一个新考核对象，需要创建
          await subjectCollection.add({
            name: subject.name,
            department: subject.department || '',
            position: subject.position || '',
            table_id: [tableId]
          });
          console.log(`创建了新考核对象: ${subject.name}`);
        } else {
          // 有ID，这是一个现有考核对象，更新其关联
          // 首先获取当前关联
          const existingSubject = await subjectCollection.doc(subject._id).get();
          
          if (existingSubject.data.length > 0) {
            // 确保table_id是数组
            let tableIds = existingSubject.data[0].table_id || [];
            if (!Array.isArray(tableIds)) {
              tableIds = [tableIds];
            }
            
            // 如果不包含当前表ID，则添加
            if (!tableIds.includes(tableId)) {
              tableIds.push(tableId);
            }
            
            // 更新考核对象
            await subjectCollection.doc(subject._id).update({
              table_id: tableIds
            });
            
            console.log(`已更新考核对象 ${subject.name}(${subject._id}) 的评分表关联`);
          } else {
            console.log(`警告: 未找到ID为 ${subject._id} 的考核对象`);
          }
        }
      }
    }
    
    return {
      code: 0,
      msg: '更新评分表成功'
    };
  } catch (e) {
    console.error('更新评分表出错:', e);
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
    
    // 处理关联的考核对象，不是直接删除，而是解除关联
    const subjects = await subjectCollection.where({
      table_id: db.command.all([tableId])
    }).get();
    
    console.log(`找到${subjects.data.length}个与评分表${tableId}关联的考核对象`);
    
    for (const subject of subjects.data) {
      // 确保table_id是数组
      const tableIds = Array.isArray(subject.table_id) ? subject.table_id : [subject.table_id];
      
      // 从表ID数组中移除当前表ID
      const updatedTableIds = tableIds.filter(id => id !== tableId);
      
      if (updatedTableIds.length === 0) {
        // 如果没有其他关联的评分表，则删除该考核对象
        await subjectCollection.doc(subject._id).remove();
        console.log(`已删除考核对象: ${subject.name}(${subject._id})`);
      } else {
        // 否则只是解除与当前评分表的关联
        await subjectCollection.doc(subject._id).update({
          table_id: updatedTableIds
        });
        console.log(`已从考核对象 ${subject.name}(${subject._id}) 中移除评分表关联`);
      }
    }
    
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

// 获取评委的评分表列表
async function getRaterTables(data, context) {
  const { type, page = 1, pageSize = 10 } = data;
  
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
        msg: '获取评分表列表成功',
        data: {
          list: [],
          total: 0,
          page,
          pageSize
        }
      };
    }
    
    // 查询评委的评分表
    let query = ratingTableCollection.where({
      _id: db.command.in(assignedTables)
    });
    
    // 筛选条件
    if (type) {
      query = query.where({
        type
      });
    }
    
    // 分页查询
    const tableList = await query.skip((page - 1) * pageSize).limit(pageSize).get();
    
    // 获取总数
    const countResult = await query.count();
    
    // 丰富表格数据，添加考核对象和完成情况
    const enrichedList = await Promise.all(tableList.data.map(async (table) => {
      // 获取该表的考核对象
      const subjects = await subjectCollection.where({
        table_id: db.command.in([table._id])
      }).get();
      
      // 获取该表的评分记录
      const ratings = await db.collection('ratings').where({
        table_id: table._id,
        rater
      }).get();
      
      // 计算完成率
      const subjectCount = subjects.data.length;
      const ratedCount = ratings.data.length;
      const completionRate = subjectCount > 0 ? Math.floor((ratedCount / subjectCount) * 100) : 0;
      
      // 添加评分状态到考核对象
      const subjectsWithStatus = subjects.data.map(subject => {
        const rating = ratings.data.find(r => r.subject === subject._id);
        return {
          ...subject,
          rated: !!rating,
          totalScore: rating ? rating.total_score : 0
        };
      });
      
      return {
        ...table,
        subjectCount,
        completionRate,
        subjects: subjectsWithStatus,
        updateTime: ratings.data.length > 0 ? Math.max(...ratings.data.map(r => r.rating_date ? new Date(r.rating_date).getTime() : 0)) : null
      };
    }));
    
    return {
      code: 0,
      msg: '获取评分表列表成功',
      data: {
        list: enrichedList,
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

// 从token获取用户信息的辅助函数
async function getUserByToken(token) {
  if (!token) {
    return null;
  }
  
  try {
    // 解析token获取用户ID
    const payload = uniCloud.parseToken(token);
    const userId = payload.uid;
    
    // 查询用户信息
    const userInfo = await userCollection.where({
      username: userId
    }).get();
    
    if (userInfo.data.length === 0) {
      return null;
    }
    
    return userInfo.data[0];
  } catch (e) {
    console.error('获取用户信息失败', e);
    return null;
  }
}

// 此函数已不再使用
function getUniIdToken() {
  // 在云函数中无法使用此方法，需要通过context获取
  return null;
} 