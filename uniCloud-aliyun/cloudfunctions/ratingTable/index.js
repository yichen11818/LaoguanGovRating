'use strict';
const db = uniCloud.database();
const ratingTableCollection = db.collection('rating_tables');
const userCollection = db.collection('users');
const subjectCollection = db.collection('subjects');
const groupCollection = db.collection('rating_groups');
const ratingCollection = db.collection('ratings');
const exportTasksCollection = db.collection('export_tasks'); // 添加导出任务集合

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
    case 'createGroup':
      return await createGroup(data);
    case 'updateGroup':
      return await updateGroup(data);
    case 'deleteGroup':
      return await deleteGroup(data);
    case 'copyGroup':
      return await copyGroup(data);
    case 'getGroups':
      return await getGroups(data);
    case 'checkATypeRatings':
      return await checkATypeRatings(data);
    case 'exportATypeRatings':
      return await callExportExcel(data);
    case 'startExportATypeRatings':
      return await startExportATypeRatings(data);
    case 'startExportBTypeRatings':
      return await startExportBTypeRatings(data);
    case 'getExportTaskStatus':
      return await getExportTaskStatus(data);
    case 'updateExportTaskStatus':
      return await updateTaskProgress(data.task_id, data.progress, data.message);
    case 'getRatingsDetail':
      return await getRatingsDetail(data);
    case 'getTableSubjectAndScore':
      return await getTableSubjectAndScore(data);
    default:
      return {
        code: -1,
        msg: '未知操作1'
      };
  }
};

// 创建评分表
async function createTable(data) {
  const { name, type, category, rater, group_id, items = [], selectedSubjects = [] } = data;
  
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
    
    // 如果提供了表格组ID，验证表格组是否存在
    if (group_id) {
      const groupInfo = await groupCollection.doc(group_id).get();
      if (groupInfo.data.length === 0) {
        return {
          code: -1,
          msg: '表格组不存在'
        };
      }
    }
    
    // 创建评分表
    const defaultItems = [];
    if (items.length === 0) {
      // 默认评分项
      if (type === 1 && category && category.includes('中层干部考核评分表')) {
        // 班子评分表默认项
        defaultItems.push({
          name: '重点工作完成情况+办公室管理情况',
          maxScore: 100
        });
      } 
      else {
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
      group_id: group_id || '',
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
    
    // 如果更新了表格组ID，验证表格组是否存在
    if (tableUpdateData.group_id) {
      const groupInfo = await groupCollection.doc(tableUpdateData.group_id).get();
      if (groupInfo.data.length === 0) {
        return {
          code: -1,
          msg: '表格组不存在'
        };
      }
    }
    
    // 检查是否更新了评分人，如果是，需要更新新旧评分人的表格分配
    if (tableUpdateData.rater) {
      console.log(`检测到评分人变更，新评分人: ${tableUpdateData.rater}`);
      
      // 首先获取当前表格信息
      const tableInfo = await ratingTableCollection.doc(tableId).get();
      if (tableInfo.data.length === 0) {
        return {
          code: -1,
          msg: '评分表不存在'
        };
      }
      
      const oldRater = tableInfo.data[0].rater;
      const newRater = tableUpdateData.rater;
      
      // 如果新旧评分人不同，才需要更新
      if (oldRater !== newRater) {
        console.log(`评分人从 ${oldRater} 变更为 ${newRater}`);
        
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
            console.log(`已从旧评分人 ${oldRater} 的分配表中移除表格 ${tableId}`);
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
          console.log(`已将表格 ${tableId} 添加到新评分人 ${newRater} 的分配表中`);
        }
      }
    }
    
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
  const { type, rater, page = 1, pageSize = 10, year, group_id } = data;
  
  try {
    let query = ratingTableCollection;
    
    // 筛选条件
    const whereConditions = {};
    if (type && type !== 'all') {
      whereConditions.type = type;
    }
    if (rater) {
      whereConditions.rater = rater;
    }
    if (group_id) {
      whereConditions.group_id = group_id;
    }
    
    // 年份筛选逻辑
    if (year) {
      console.log('按年份筛选评分表:', year);
      // 注意：这里不在数据库层面过滤，而是在后面获取数据后过滤
      // 因为年份可能来自表名或创建时间，需要在应用层处理
    }
    
    if (Object.keys(whereConditions).length > 0) {
      query = query.where(whereConditions);
    }
    
    // 分页查询
    let tableList = await query.orderBy('create_time', 'desc').get();
    let allData = tableList.data;
    
    // 如果指定了年份，在应用层过滤数据
    if (year) {
      allData = allData.filter(table => {
        // 从表名中提取年份
        const yearRegex = new RegExp(year);
        const nameMatch = table.name.match(yearRegex);
        
        // 从创建时间中提取年份
        let createTimeMatch = false;
        if (table.create_time) {
          const createYear = new Date(table.create_time).getFullYear().toString();
          createTimeMatch = createYear === year;
        }
        
        return nameMatch || createTimeMatch;
      });
    }
    
    // 手动分页
    const total = allData.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, total);
    const pageData = allData.slice(startIndex, endIndex);
    
    return {
      code: 0,
      msg: '获取评分表列表成功',
      data: {
        list: pageData,
        total: total,
        page,
        pageSize
      }
    };
  } catch (e) {
    console.error('获取评分表列表失败:', e);
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
    console.log('=== 开始获取评分员表 ===');
    console.log('请求参数:', JSON.stringify(data));
    console.log('上下文信息:', JSON.stringify(context));
    
    let username = null;
    
    // 方法1: 直接从data中获取用户名
    if (data.username) {
      username = data.username;
      console.log('从请求参数中获取到用户名:', username);
    }
    
    // 方法2: 从token中获取用户信息(如果有)
    if (!username) {
      try {
        const clientInfo = context.CLIENTINFO || "{}";
        console.log('客户端信息:', clientInfo);
        const parsedClientInfo = JSON.parse(clientInfo);
        const uniIdToken = parsedClientInfo.uniIdToken;
        
        if (uniIdToken) {
          console.log('从上下文中获取到token');
          const payload = uniCloud.parseToken(uniIdToken);
          username = payload.uid;
          console.log('从上下文token解析出用户名:', username);
        } else {
          console.log('上下文中未找到token');
        }
      } catch (e) {
        console.error('解析上下文token失败', e);
      }
    }
    
    // 如果没有获取到用户名，尝试从环境获取当前用户
    if (!username && data.uniIdToken) {
      try {
        console.log('尝试从请求参数的token中获取用户名');
        const payload = uniCloud.parseToken(data.uniIdToken);
        username = payload.uid;
        console.log('从请求参数token解析出用户名:', username);
      } catch (e) {
        console.error('解析前端传递的token失败', e);
      }
    }
    
    // 如果仍然没有获取到用户名，检查是否在本地调试模式下，使用请求中的rater参数
    if (!username && data.rater) {
      username = data.rater;
      console.log('使用rater参数作为用户名:', username);
    }
    
    // 如果仍然没有获取到用户名，返回错误
    if (!username) {
      console.error('未获取到用户名，无法继续查询');
      return {
        code: -1,
        msg: '用户未登录或登录已过期，请重新登录 - 请在data中传入username或rater参数'
      };
    }
    
    console.log('最终使用的用户名:', username);
    
    // 查询用户信息
    console.log('开始查询用户信息:', username);
    const userInfo = await userCollection.where({
      username: username
    }).get();
    
    console.log('查询到用户信息结果:', JSON.stringify(userInfo.data));
    
    if (userInfo.data.length === 0) {
      console.error(`用户 ${username} 不存在于数据库中`);
      return {
        code: -1,
        msg: `用户 ${username} 不存在`
      };
    }
    
    const user = userInfo.data[0];
    const rater = user.username;
    const assignedTables = user.assignedTables || [];
    
    console.log('用户ID:', user._id);
    console.log('评分员用户名:', rater);
    console.log('分配的评分表数量:', assignedTables.length);
    console.log('评分表IDs:', JSON.stringify(assignedTables));
    
    let query;
    let tableIds = [];
    let fromDirectQuery = false;
    
    // 如果assignedTables为空或不存在，直接从rating_tables表中查询
    if (assignedTables.length === 0) {
      console.log('用户assignedTables为空，尝试从rating_tables表直接查询该用户负责的表格');
      fromDirectQuery = true;
      
      // 直接查找以该用户为评分人的表格
      query = ratingTableCollection.where({
        rater: username
      });
      
      // 添加类型筛选
      if (type) {
        query = query.where({
          type
        });
      }
      
      // 先获取所有匹配表格的ID，用于后续更新用户的assignedTables字段
      const allTables = await query.field('_id').get();
      if (allTables.data.length > 0) {
        tableIds = allTables.data.map(table => table._id);
        console.log(`直接从rating_tables查询到${tableIds.length}个表格:`, JSON.stringify(tableIds));
        
        // 更新用户的assignedTables字段
        if (tableIds.length > 0) {
          console.log(`尝试更新用户${username}的assignedTables字段`);
          try {
            await userCollection.doc(user._id).update({
              assignedTables: tableIds
            });
            console.log('更新用户assignedTables成功');
          } catch (updateErr) {
            console.error('更新用户assignedTables失败:', updateErr);
          }
        }
      } else {
        console.log('直接查询未找到任何表格');
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
    } else {
      console.log('使用用户assignedTables中的表格ID查询');
      // 使用assignedTables中的ID查询
      query = ratingTableCollection.where({
        _id: db.command.in(assignedTables)
      });
      
      // 筛选条件
      if (type) {
        query = query.where({
          type
        });
        console.log('添加类型筛选:', type);
      }
    }
    
    // 执行查询前，记录查询条件
    console.log('分页参数: page=' + page + ', pageSize=' + pageSize);
    console.log('查询起始索引:', (page - 1) * pageSize);
    
    // 分页查询
    const tableList = await query.skip((page - 1) * pageSize).limit(pageSize).get();
    
    console.log('查询到的评分表数量:', tableList.data.length);
    if (tableList.data.length === 0) {
      console.log('未查询到评分表，可能原因:');
      
      if (fromDirectQuery) {
        console.log('直接查询未找到表格，用户可能确实没有分配表格');
      } else {
        console.log('1. 分配的评分表ID已经不存在');
        console.log('2. 类型筛选条件不匹配');
        console.log('3. 分页参数超出实际范围');
        
        // 不使用筛选条件再查询一次，确认表是否真的存在
        const checkTables = await ratingTableCollection.where({
          _id: db.command.in(assignedTables)
        }).get();
        
        console.log('不使用筛选条件查询结果:', checkTables.data.length);
        if (checkTables.data.length > 0) {
          console.log('存在评分表，但可能类型不匹配。存在的表类型:');
          checkTables.data.forEach(t => {
            console.log(`表ID: ${t._id}, 表名: ${t.name}, 类型: ${t.type}`);
          });
        } else {
          console.log('评分表ID不存在于数据库中，需要检查user表中的assignedTables是否过期');
          
          // 如果通过assignedTables没找到表，尝试直接根据rater字段查询
          console.log('尝试直接查询该用户为rater的表格');
          const directQuery = ratingTableCollection.where({
            rater: username
          });
          
          if (type) {
            directQuery.where({ type });
          }
          
          const directResult = await directQuery.get();
          
          if (directResult.data.length > 0) {
            console.log(`通过rater字段找到${directResult.data.length}个表格，尝试修复用户的assignedTables`);
            
            // 获取表格ID
            const directTableIds = directResult.data.map(t => t._id);
            
            // 更新用户的assignedTables字段
            try {
              await userCollection.doc(user._id).update({
                assignedTables: directTableIds
              });
              console.log('修复用户assignedTables成功');
              
              // 使用找到的表重新构建结果
              if ((page - 1) * pageSize < directResult.data.length) {
                // 取出当前页的数据
                const startIdx = (page - 1) * pageSize;
                const endIdx = Math.min(startIdx + pageSize, directResult.data.length);
                const pageData = directResult.data.slice(startIdx, endIdx);
                
                // 将找到的表格赋值给tableList进行后续处理
                tableList.data = pageData;
                console.log(`返回第${page}页数据，共${pageData.length}条`);
              }
            } catch (updateErr) {
              console.error('修复用户assignedTables失败:', updateErr);
            }
          } else {
            console.log('通过rater字段也未找到表格，确认用户没有被分配表格');
          }
        }
      }
      
      if (tableList.data.length === 0) {
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
    }
    
    // 获取总数
    const countResult = await query.count();
    console.log('符合条件的总评分表数量:', countResult.total);
    
    // 丰富表格数据，添加考核对象和完成情况
    console.log('开始丰富评分表数据');
    const enrichedList = await Promise.all(tableList.data.map(async (table) => {
      console.log(`处理表: ${table._id}, ${table.name}`);
      
      // 获取该表的考核对象
      const subjects = await subjectCollection.where({
        table_id: db.command.in([table._id])
      }).get();
      
      console.log(`表${table._id}的考核对象数量:`, subjects.data.length);
      
      // 获取该表的评分记录
      const ratings = await ratingCollection.where({
        table_id: table._id,
        rater
      }).get();
      
      console.log(`表${table._id}的评分记录数量:`, ratings.data.length);
      
      // 计算完成率
      const subjectCount = subjects.data.length;
      const ratedCount = ratings.data.length;
      const completionRate = subjectCount > 0 ? Math.floor((ratedCount / subjectCount) * 100) : 0;
      
      console.log(`表${table._id}的完成率: ${completionRate}%`);
      
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
    
    console.log('数据处理完成，返回结果');
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
    console.error('获取评分表列表失败，错误详情:', e);
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

// 创建表格组
async function createGroup(data) {
  const { year, description = '' } = data;
  
  // 参数校验
  if (!year) {
    return {
      code: -1,
      msg: '年份不能为空'
    };
  }
  
  try {
    // 创建新表格组
    const result = await groupCollection.add({
      year,
      description,
      create_time: new Date()
    });
    
    return {
      code: 0,
      msg: '创建表格组成功',
      data: {
        id: result.id,
        year: year
      }
    };
  } catch (e) {
    console.error('创建表格组出错:', e);
    return {
      code: -1,
      msg: '创建表格组失败',
      error: e.message
    };
  }
}

// 更新表格组
async function updateGroup(data) {
  const { id, year, description } = data;
  
  // 参数校验
  if (!id) {
    return {
      code: -1,
      msg: '表格组ID不能为空'
    };
  }
  
  try {
    const updateData = {};
    if (year) updateData.year = year;
    if (description !== undefined) updateData.description = description;
    
    await groupCollection.doc(id).update(updateData);
    
    return {
      code: 0,
      msg: '更新表格组成功'
    };
  } catch (e) {
    console.error('更新表格组出错:', e);
    return {
      code: -1,
      msg: '更新表格组失败',
      error: e.message
    };
  }
}

// 删除表格组
async function deleteGroup(data) {
  const { id, group_id } = data;
  
  // 使用id或group_id，优先使用group_id
  const targetId = group_id || id;
  
  // 参数校验
  if (!targetId) {
    return {
      code: -1,
      msg: '表格组ID不能为空'
    };
  }
  
  try {
    // 检查该组是否有关联的评分表
    const tables = await ratingTableCollection.where({
      group_id: targetId
    }).get();
    
    // 如果有关联表格，先删除这些表格
    if (tables.data.length > 0) {
      console.log(`表格组(${targetId})下有${tables.data.length}个评分表，开始删除...`);
      
      // 分批处理，每批处理10个表格
      const batchSize = 10;
      const totalTables = tables.data.length;
      let processedCount = 0;
      
      for (let i = 0; i < totalTables; i += batchSize) {
        // 获取当前批次的表格
        const batch = tables.data.slice(i, Math.min(i + batchSize, totalTables));
        
        // 并行处理当前批次的表格删除
        const deletePromises = batch.map(table => {
          console.log(`正在删除表格: ${table._id} - ${table.name}`);
          return deleteTable({ tableId: table._id });
        });
        
        // 等待当前批次完成
        await Promise.all(deletePromises);
        
        processedCount += batch.length;
        console.log(`已完成 ${processedCount}/${totalTables} 个表格的删除`);
      }
      
      console.log(`成功删除表格组(${targetId})下的所有表格`);
    }
    
    // 删除表格组
    await groupCollection.doc(targetId).remove();
    
    return {
      code: 0,
      msg: '删除表格组成功'
    };
  } catch (e) {
    console.error('删除表格组出错:', e);
    return {
      code: -1,
      msg: '删除表格组失败',
      error: e.message
    };
  }
}

// 获取表格组列表
async function getGroups(data) {
  try {
    const groups = await groupCollection.orderBy('year', 'desc').get();
    
    // 获取每个组中的评分表数量
    const result = await Promise.all(groups.data.map(async (group) => {
      const tables = await ratingTableCollection.where({
        group_id: group._id
      }).count();
      
      return {
        ...group,
        tableCount: tables.total
      };
    }));
    
    return {
      code: 0,
      msg: '获取表格组列表成功',
      data: result
    };
  } catch (e) {
    console.error('获取表格组列表失败:', e);
    return {
      code: -1,
      msg: '获取表格组列表失败',
      error: e.message
    };
  }
}

// 检查是否有A类评分表
async function checkATypeRatings(data) {
  const { group_id, year } = data;
  
  try {
    console.log('检查A类评分表，参数:', { group_id, year });
    
    // 查询班子评分表(type=1)
    const banziTablesResult = await ratingTableCollection.where({
      type: 1, // A类班子评分
      group_id
    }).get();
    
    // 查询驻村工作评分表(type=2)
    const zhucunTablesResult = await ratingTableCollection.where({
      type: 2, // A类驻村工作评分
      group_id
    }).get();
    
    const hasBanziTable = banziTablesResult.data.length > 0;
    const hasZhucunTable = zhucunTablesResult.data.length > 0;
    
    console.log('检查结果:', { 
      hasBanziTable, 
      hasZhucunTable,
      banziCount: banziTablesResult.data.length,
      zhucunCount: zhucunTablesResult.data.length 
    });
    
    return {
      code: 0,
      hasBanziTable,
      hasZhucunTable,
      hasATypeRatings: hasBanziTable && hasZhucunTable
    };
  } catch (e) {
    console.error('检查A类评分表失败:', e);
    return {
      code: -1,
      msg: '检查A类评分表失败: ' + e.message
    };
  }
}

// 调用导出Excel云函数
async function callExportExcel(data) {
  try {
    console.log('调用exportExcel云函数执行导出操作');
    
    // 先检查是否有A类评分表
    const checkResult = await checkATypeRatings(data);
    
    if (!checkResult.hasBanziTable) {
      return {
        code: -1,
        msg: '未找到班子评分表，请检查是否有type=1的评分表'
      };
    }
    
    if (!checkResult.hasZhucunTable) {
      return {
        code: -1,
        msg: '未找到驻村工作评分表，请检查是否有type=2的评分表'
      };
    }
    
    // 将检查结果传递给exportExcel函数，以便它知道使用哪些表格
    const result = await uniCloud.callFunction({
      name: 'exportExcel',
      data: {
        action: 'exportATypeRatings',
        data: {
          ...data,
          foundBanziTable: checkResult.hasBanziTable,
          foundZhucunTable: checkResult.hasZhucunTable
        }
      }
    });
    
    return result.result;
  } catch (e) {
    console.error('调用exportExcel云函数失败:', e);
    return {
      code: -1,
      msg: '导出A类评分汇总表失败: ' + e.message,
      error: e.message
    };
  }
}

// 开始导出A类评分任务（增量式处理）
async function startExportATypeRatings(data) {
  try {
    console.log('开始创建增量式导出任务，参数:', JSON.stringify(data));
    
    // 1. 先检查是否有A类评分表
    const checkResult = await checkATypeRatings(data);
    
    if (!checkResult.hasBanziTable) {
      return {
        code: -1,
        msg: '未找到班子评分表，请检查是否有type=1的评分表'
      };
    }
    
    if (!checkResult.hasZhucunTable) {
      return {
        code: -1,
        msg: '未找到驻村工作评分表，请检查是否有type=2的评分表'
      };
    }
    
    // 2. 创建导出任务记录
    const taskId = 'export_' + Date.now();
    await exportTasksCollection.add({
      task_id: taskId,
      status: 'pending',
      progress: 0,
      message: '正在初始化导出任务...',
      create_time: new Date(),
      update_time: new Date(),
      params: data
    });
    
    console.log('成功创建导出任务，task_id:', taskId);
    
    // 3. 启动异步处理（不阻塞当前请求）
    setTimeout(async () => {
      try {
        await processExportTask(taskId, data);
      } catch (error) {
        console.error('处理导出任务出错:', error);
        await updateTaskProgress(taskId, 0, '导出失败: ' + error.message, 'failed');
      }
    }, 0);
    
    // 4. 立即返回任务ID给前端
    return {
      code: 0,
      msg: '导出任务已创建，正在处理中',
      data: {
        task_id: taskId
      }
    };
  } catch (e) {
    console.error('创建导出任务失败:', e);
    return {
      code: -1,
      msg: '创建导出任务失败: ' + e.message,
      error: e.message
    };
  }
}

// 处理导出任务的步骤
async function processExportTask(taskId, data) {
  try {
    // 步骤1: 更新状态为"处理中"
    await updateTaskProgress(taskId, 10, '正在准备导出...');
    
    // 步骤2: 调用导出函数，传递任务ID以便更新进度
    const result = await uniCloud.callFunction({
      name: 'exportExcel',
      data: {
        action: 'exportATypeRatings',
        data: {
          ...data,
          task_id: taskId,
          incremental: true  // 标记为增量处理
        }
      }
    });
    
    if (result.result.code === 0) {
      // 导出成功
      await updateTaskProgress(
        taskId, 
        100, 
        '导出完成', 
        'completed', 
        { fileUrl: result.result.data.fileUrl }
      );
    } else {
      // 导出失败
      await updateTaskProgress(
        taskId, 
        0, 
        '导出失败: ' + (result.result.msg || '未知错误'), 
        'failed'
      );
    }
  } catch (error) {
    console.error('处理导出任务出错:', error);
    await updateTaskProgress(taskId, 0, '导出失败: ' + error.message, 'failed');
  }
}

// 更新任务进度
async function updateTaskProgress(taskId, progress, message, status = 'processing', result = null) {
  try {
    const updateData = {
      progress: progress,
      message: message,
      update_time: new Date()
    };
    
    if (status) {
      updateData.status = status;
    }
    
    if (status === 'completed' && result) {
      updateData.result = result;
      updateData.complete_time = new Date();
    } else if (status === 'failed') {
      updateData.complete_time = new Date();
    }
    
    await exportTasksCollection.where({ task_id: taskId }).update(updateData);
    
    console.log(`已更新任务${taskId}进度: ${progress}%, 消息: ${message}, 状态: ${status || 'processing'}`);
  } catch (error) {
    console.error('更新任务进度失败:', error);
  }
}

// 获取导出任务状态
async function getExportTaskStatus(data) {
  const { task_id } = data;
  
  if (!task_id) {
    return {
      code: -1,
      msg: '缺少任务ID参数'
    };
  }
  
  try {
    const result = await exportTasksCollection.where({ task_id }).get();
    
    if (result.data.length === 0) {
      return {
        code: -1,
        msg: '任务不存在'
      };
    }
    
    const task = result.data[0];
    
    return {
      code: 0,
      msg: '获取任务状态成功',
      data: task
    };
  } catch (e) {
    console.error('获取任务状态失败:', e);
    return {
      code: -1,
      msg: '获取任务状态失败: ' + e.message,
      error: e.message
    };
  }
} 

// 获取评分详情数据（用于评分详情表页面）
async function getRatingsDetail(data) {
  const { group_id, table_type } = data;
  
  try {
    // 参数校验
    if (!group_id) {
      return {
        code: -1,
        msg: '缺少必要参数：group_id'
      };
    }
    
    console.log('开始获取评分详情数据，参数:', { group_id, table_type });
    
    // 1. 获取指定组内的所有评分表
    const tablesQuery = ratingTableCollection.where({ group_id });
    
    // 如果指定了表格类型，添加类型筛选
    if (table_type) {
      tablesQuery.where({ type: table_type });
    }
    
    const tablesResult = await tablesQuery.get();
    const tables = tablesResult.data;
    
    if (tables.length === 0) {
      return {
        code: 0,
        msg: '未找到评分表数据',
        data: {
          raters: [],
          subjects: [],
          ratings: []
        }
      };
    }
    
    console.log(`找到${tables.length}个评分表`);
    
    // 获取所有评分表ID
    const tableIds = tables.map(table => table._id);
    
    // 2. 获取相关联的所有考核对象
    const subjectsResult = await subjectCollection.where({
      table_id: db.command.in(tableIds)
    }).get();
    
    const subjects = subjectsResult.data;
    console.log(`找到${subjects.length}个考核对象`);
    
    // 获取所有考核对象ID
    const subjectIds = subjects.map(subject => subject._id);
    
    // 3. 获取相关的所有评分记录
    const ratingsResult = await ratingCollection.where({
      table_id: db.command.in(tableIds),
      subject: db.command.in(subjectIds)
    }).get();
    
    const ratings = ratingsResult.data;
    console.log(`找到${ratings.length}条评分记录`);
    
    // 4. 获取所有评分员信息
    // 先从评分表中获取所有评分员用户名
    const raterUsernames = [...new Set(tables.map(table => table.rater))];
    
    const ratersResult = await userCollection.where({
      username: db.command.in(raterUsernames)
    }).field({
      _id: true,
      username: true,
      name: true,
      role: true
    }).get();
    
    const raters = ratersResult.data.map(rater => ({
      id: rater._id,
      username: rater.username,
      name: rater.name || rater.username,
      role: rater.role
    }));
    
    console.log(`找到${raters.length}个评分员`);
    
    // 5. 处理评分数据，适配前端表格显示
    const processedRatings = ratings.map(rating => {
      return {
        id: rating._id,
        table_id: rating.table_id,
        rater_id: rating.rater_id,
        subject_id: rating.subject,
        total_score: rating.total_score,
        items: rating.items || [],
        comment: rating.comment || '',
        rating_date: rating.rating_date
      };
    });
    
    return {
      code: 0,
      msg: '获取评分详情数据成功',
      data: {
        raters,
        subjects,
        ratings: processedRatings
      }
    };
  } catch (e) {
    console.error('获取评分详情数据失败:', e);
    return {
      code: -1,
      msg: '获取评分详情数据失败',
      error: e.message
    };
  }
}

// 新增函数：获取评分表、考核对象和分数
async function getTableSubjectAndScore(data) {
  const { type, page = 1, pageSize = 10, keyword = '', year = '', group_id = '' } = data;
  
  try {
    // 记录搜索参数
    console.log('====== 搜索参数 ======');
    console.log('搜索关键词:', keyword);
    console.log('类型:', type);
    console.log('年份:', year);
    console.log('表格组ID:', group_id);
    console.log('页码:', page, '每页:', pageSize);
    console.log('=====================');
    
    // 1. 获取评分表列表
    let baseQuery = ratingTableCollection;
    let query = baseQuery;
    
    // 处理类型筛选
    if (type) {
      query = query.where({
        type
      });
    }
    
    // 创建基本条件，用于年份和表格组限制
    const baseConditions = {};
    if (year && group_id) {
      baseConditions.group_id = group_id;
    } else if (year) {
      baseConditions.name = new RegExp(year, 'i');
    } else if (group_id) {
      baseConditions.group_id = group_id;
    }
    
    // 搜索条件集合
    const searchConditions = [];
    
    // 处理关键词搜索 - 增强搜索功能，匹配评分表名称
    if (keyword) {
      console.log('开始处理关键词搜索:', keyword);
      
      // 添加评分表名称搜索条件 - 结合基本条件
      const nameCondition = {
        ...baseConditions,
        name: new RegExp(keyword, 'i')
      };
      searchConditions.push(nameCondition);
      console.log('添加评分表名称搜索条件', JSON.stringify(nameCondition).replace(/"\{\}"/g, '"/'+keyword+'/i"'));
      
      // 先直接检查是否存在李鹏用户 - 调试用
      if (keyword === '李鹏' || keyword === '李鹏') {
        // 直接搜索完全匹配的用户
        const directUserQuery = await userCollection.where({
          name: keyword
        }).get();
        
        console.log(`直接查询用户(name="${keyword}")结果数量:`, directUserQuery.data.length);
        if (directUserQuery.data.length > 0) {
          console.log('直接查询到的用户:', directUserQuery.data);
        }
      }
      
      // 匹配评分人用户名或姓名 - 不受年份和表格组限制
      console.log('开始搜索评分人...');
      try {
        // 尝试查询所有用户，看是否能找到李鹏
        const allUsersQuery = await userCollection.limit(10).get();
        console.log('系统中前10个用户:', allUsersQuery.data.map(u => ({
          username: u.username,
          name: u.name,
          role: u.role
        })));
        
        // 使用更简单的方式搜索用户
        const userResults = await userCollection.where({
          name: new RegExp(keyword, 'i')
        }).limit(20).get();
        
        console.log('评分人搜索结果数量(按名称):', userResults.data.length);
        
        // 如果通过名称找不到，尝试通过用户名搜索
        if (userResults.data.length === 0) {
          const usernameResults = await userCollection.where({
            username: new RegExp(keyword, 'i')
          }).limit(20).get();
          
          console.log('评分人搜索结果数量(按用户名):', usernameResults.data.length);
          if (usernameResults.data.length > 0) {
            userResults.data = usernameResults.data;
          }
        }
      
        // 输出找到的评分人
        if (userResults.data.length > 0) {
          console.log('找到匹配的评分人:');
          userResults.data.forEach((user, index) => {
            console.log(`[${index+1}] 用户名:${user.username}, 姓名:${user.name || '未设置'}`);
            if (user.assignedTables && user.assignedTables.length > 0) {
              console.log(`  分配的评分表: ${user.assignedTables.length}个`);
            }
          });
          
          // 如果找到用户，将其用户名添加到搜索条件，并结合基本条件
          const usernames = userResults.data.map(user => user.username);
          
          // 创建包含基本条件的评分人条件
          const raterCondition = {
            ...baseConditions,
            rater: db.command.in(usernames)
          };
          searchConditions.push(raterCondition);
          console.log('添加评分人搜索条件，用户名列表:', usernames);
          console.log('完整评分人搜索条件:', JSON.stringify(raterCondition));
          
          // 新增：收集评分人被分配的评分表ID
          const assignedTableIds = [];
          userResults.data.forEach(user => {
            if (user.assignedTables && Array.isArray(user.assignedTables) && user.assignedTables.length > 0) {
              assignedTableIds.push(...user.assignedTables);
            }
          });
          
          // 如果有分配的评分表，添加到搜索条件
          if (assignedTableIds.length > 0) {
            console.log('总共找到分配的评分表IDs数量:', assignedTableIds.length);
            console.log('分配的评分表IDs:', assignedTableIds);
            
            // 创建包含基本条件的表ID条件
            const assignedTableCondition = {
              ...baseConditions,
              _id: db.command.in(assignedTableIds)
            };
            searchConditions.push(assignedTableCondition);
            console.log('添加评分人分配表ID搜索条件', JSON.stringify(assignedTableCondition));
            
            // 尝试直接查询这些表格
            const directTableQuery = await ratingTableCollection.where({
              _id: db.command.in(assignedTableIds)
            }).get();
            
            console.log(`直接查询分配的评分表结果数量:`, directTableQuery.data.length);
            if (directTableQuery.data.length > 0) {
              console.log('直接查询到的表格:', directTableQuery.data.map(t => ({
                _id: t._id, 
                name: t.name,
                rater: t.rater
              })));
            }
          } else {
            console.log('未找到评分人分配的表格ID');
          }
        } else {
          console.log('未找到匹配的评分人');
        }
      } catch (userSearchError) {
        console.error('搜索评分人时出错:', userSearchError);
      }
      
      // 搜索考核对象 - 不受年份和表格组限制
      console.log('开始搜索考核对象...');
      const subjectResults = await subjectCollection.where({
        name: new RegExp(keyword, 'i')
      }).field({ table_id: 1, name: 1 }).get();
      
      console.log('考核对象搜索结果数量:', subjectResults.data.length);
      // 输出找到的考核对象
      if (subjectResults.data.length > 0) {
        console.log('找到匹配的考核对象:');
        subjectResults.data.forEach((subject, index) => {
          console.log(`[${index+1}] ID:${subject._id}, 名称:${subject.name}, 关联表数量:${Array.isArray(subject.table_id) ? subject.table_id.length : (subject.table_id ? 1 : 0)}`);
        });
        
        // 收集考核对象关联的所有评分表ID
        const tableIds = [];
        subjectResults.data.forEach(subject => {
          if (subject.table_id) {
            // 确保table_id是数组
            const ids = Array.isArray(subject.table_id) ? subject.table_id : [subject.table_id];
            tableIds.push(...ids);
            console.log(`考核对象[${subject.name}]关联的表IDs:`, ids);
          }
        });
        
        // 添加评分表ID搜索条件，并结合基本条件
        if (tableIds.length > 0) {
          console.log('总共找到关联的表格IDs数量:', tableIds.length);
          
          // 创建包含基本条件的表ID条件
          const tableIdCondition = {
            ...baseConditions,
            _id: db.command.in(tableIds)
          };
          searchConditions.push(tableIdCondition);
          console.log('添加考核对象关联表ID搜索条件', JSON.stringify(tableIdCondition));
        } else {
          console.log('未找到考核对象关联的表格ID');
        }
      } else {
        console.log('未找到匹配的考核对象');
      }
      
      // 如果有搜索条件，使用$or组合它们
      if (searchConditions.length > 0) {
        console.log('最终搜索条件数量:', searchConditions.length);
        
        // 打印搜索条件时不用JSON.stringify，避免正则表达式序列化问题
        console.log('最终搜索条件类型:', searchConditions.map(c => {
          const keys = Object.keys(c);
          return `条件包含字段: ${keys.join(', ')}`;
        }));
        
        query = baseQuery.where({
          $or: searchConditions
        });
        console.log('搜索条件组合完成');
      } else {
        console.log('没有任何匹配的搜索条件');
        // 如果没有搜索条件但有基本条件，应用基本条件
        if (Object.keys(baseConditions).length > 0) {
          query = baseQuery.where(baseConditions);
        }
      }
    } else {
      // 不使用关键词搜索时，直接应用基本条件
      if (Object.keys(baseConditions).length > 0) {
        query = baseQuery.where(baseConditions);
      }
    }
    
    // 获取总数
    console.log('开始查询表格数量...');
    const countResult = await query.count();
    console.log('查询到符合条件的表格总数:', countResult.total);
    
    // 特殊处理 - 如果搜索关键词是李鹏，但没有找到结果，尝试直接通过ID查询
    if (keyword === '李鹏' && countResult.total === 0) {
      console.log('特殊处理：直接搜索李鹏相关的表格...');
      
      // 尝试使用直接查询，获取李鹏的assignedTables
      const lpUser = await userCollection.where({
        name: '李鹏'
      }).get();
      
      if (lpUser.data.length > 0) {
        console.log('找到李鹏用户:', lpUser.data[0].username);
        
        const tableIds = lpUser.data[0].assignedTables || [];
        if (tableIds.length > 0) {
          console.log('李鹏被分配的表格IDs:', tableIds);
          
          // 尝试直接查询这些表格，不加任何年份或表格组限制
          query = baseQuery.where({
            _id: db.command.in(tableIds)
          });
          
          // 重新计算总数
          const directCountResult = await query.count();
          console.log('直接查询李鹏表格结果总数:', directCountResult.total);
          
          if (directCountResult.total > 0) {
            console.log('成功找到李鹏相关的表格!');
          }
        }
      }
    }
    
    // 分页查询
    console.log('开始分页查询表格...');
    const result = await query.skip((page - 1) * pageSize).limit(pageSize).get();
    const tables = result.data;
    console.log(`获取到${tables.length}个评分表`);
    
    if (tables.length > 0) {
      console.log('表格示例 - 第一条:');
      console.log('ID:', tables[0]._id);
      console.log('名称:', tables[0].name);
      console.log('评分人:', tables[0].rater);
    }
    
    // 2. 获取考核对象数据
    let subjectsData = {};
    let ratingsData = {};
    
    if (tables.length > 0) {
      const tableIds = tables.map(table => table._id);
      
      // 获取这些表格关联的考核对象
      const subjectsResult = await subjectCollection.where({
        table_id: db.command.in(tableIds)
      }).get();
      
      const subjects = subjectsResult.data;
      console.log(`获取到${subjects.length}个考核对象`);
      
      // 按表格ID组织考核对象
      subjects.forEach(subject => {
        if (subject.table_id) {
          // 确保table_id是数组
          const tableIds = Array.isArray(subject.table_id) ? subject.table_id : [subject.table_id];
          
          tableIds.forEach(tableId => {
            if (!subjectsData[tableId]) {
              subjectsData[tableId] = [];
            }
            // 防止重复添加
            if (!subjectsData[tableId].some(s => s._id === subject._id)) {
              subjectsData[tableId].push({
                _id: subject._id,
                name: subject.name,
                department: subject.department || '',
                position: subject.position || ''
              });
            }
          });
        }
      });
      
      // 3. 获取评分数据
      // 收集所有考核对象ID
      const subjectIds = subjects.map(subject => subject._id);
      // 同时收集所有考核对象名称
      const subjectNames = subjects.map(subject => subject.name);
      
      console.log(`收集到${subjectIds.length}个考核对象ID和${subjectNames.length}个考核对象名称`);
      
      // 获取评分数据
      if (subjectIds.length > 0) {
        // 使用 $or 条件同时匹配ID和名称
        const ratingsResult = await ratingCollection.where({
          table_id: db.command.in(tableIds),
          $or: [
            { subject: db.command.in(subjectIds) },  // 匹配ID
            { subject: db.command.in(subjectNames) } // 匹配名称
          ]
        }).get();
        
        const ratings = ratingsResult.data;
        console.log(`查询评分数据的条件: table_ids=${tableIds.length}个, subject_ids=${subjectIds.length}个`);
        console.log(`获取到${ratings.length}条评分数据`);
        
        // 输出前5条评分数据作为样本
        if (ratings.length > 0) {
          console.log('评分数据样本:', ratings.slice(0, 5).map(r => ({
            table_id: r.table_id,
            subject: r.subject,
            total_score: r.total_score
          })));
        }
        
        // 按表格ID组织评分数据
        ratings.forEach(rating => {
          if (!ratingsData[rating.table_id]) {
            ratingsData[rating.table_id] = [];
          }
          ratingsData[rating.table_id].push({
            _id: rating._id,
            subject: rating.subject,
            total_score: rating.total_score || 0,
            scores: rating.scores || []
          });
        });
        
        // 检查处理后的评分数据
        const tableWithRatings = Object.keys(ratingsData);
        console.log(`共有${tableWithRatings.length}个表格有评分数据`);
        if (tableWithRatings.length > 0) {
          const sampleTableId = tableWithRatings[0];
          console.log(`表格${sampleTableId}的评分数据:`, 
            ratingsData[sampleTableId].map(r => ({
              subject: r.subject,
              total_score: r.total_score
            }))
          );
        }
      }
    }
    
    return {
      code: 0,
      msg: '获取评分表、考核对象和分数成功',
      data: {
        list: tables,
        total: countResult.total,
        subjects: subjectsData,
        ratings: ratingsData
      }
    };
  } catch (e) {
    console.error('获取评分表、考核对象和分数失败:', e);
    return {
      code: -1,
      msg: '获取评分表、考核对象和分数失败',
      error: e.message
    };
  }
} 

// 开始导出B类评分任务（增量式处理）
async function startExportBTypeRatings(data) {
  try {
    console.log('开始创建B类评分导出任务，参数:', JSON.stringify(data));
    
    // 创建导出任务记录
    const taskId = 'export_B_' + Date.now();
    await exportTasksCollection.add({
      task_id: taskId,
      status: 'pending',
      progress: 0,
      message: '正在初始化B类评分导出任务...',
      create_time: new Date(),
      update_time: new Date(),
      params: data,
      export_type: 'B'
    });
    
    console.log('成功创建B类评分导出任务，task_id:', taskId);
    
    // 启动异步处理（不阻塞当前请求）
    setTimeout(async () => {
      try {
        await processExportBTypeTask(taskId, data);
      } catch (error) {
        console.error('处理B类评分导出任务出错:', error);
        await updateTaskProgress(taskId, 0, '导出失败: ' + error.message, 'failed');
      }
    }, 0);
    
    // 立即返回任务ID给前端
    return {
      code: 0,
      msg: 'B类评分导出任务已创建，正在处理中',
      data: {
        task_id: taskId
      }
    };
  } catch (e) {
    console.error('创建B类评分导出任务失败:', e);
    return {
      code: -1,
      msg: '创建B类评分导出任务失败: ' + e.message,
      error: e.message
    };
  }
}

// 处理B类评分导出任务的步骤
async function processExportBTypeTask(taskId, data) {
  try {
    // 步骤1: 更新状态为"处理中"
    await updateTaskProgress(taskId, 10, '正在准备B类评分导出...');
    
    // 步骤2: 调用导出函数，传递任务ID以便更新进度
    const result = await uniCloud.callFunction({
      name: 'exportExcel',
      data: {
        action: 'exportBTypeRatings',
        data: {
          ...data,
          task_id: taskId,
          incremental: true  // 标记为增量处理
        }
      }
    });
    
    if (result.result.code === 0) {
      // 导出成功
      await updateTaskProgress(
        taskId, 
        100, 
        'B类评分导出完成', 
        'completed', 
        { fileUrl: result.result.data.fileUrl }
      );
    } else {
      // 导出失败
      await updateTaskProgress(
        taskId, 
        0, 
        'B类评分导出失败: ' + (result.result.msg || '未知错误'), 
        'failed'
      );
    }
  } catch (error) {
    console.error('处理B类评分导出任务出错:', error);
    await updateTaskProgress(taskId, 0, 'B类评分导出失败: ' + error.message, 'failed');
  }
} 

// 复制表格组
async function copyGroup(data) {
  const { source_id, year, description } = data;
  
  // 参数校验
  if (!source_id) {
    return {
      code: -1,
      msg: '源表格组ID不能为空'
    };
  }
  
  if (!year) {
    return {
      code: -1,
      msg: '新表格组年份不能为空'
    };
  }
  
  try {
    // 1. 获取源表格组信息
    const sourceGroupInfo = await groupCollection.doc(source_id).get();
    
    if (sourceGroupInfo.data.length === 0) {
      return {
        code: -1,
        msg: '源表格组不存在'
      };
    }
    
    const sourceGroup = sourceGroupInfo.data[0];
    
    // 2. 创建新的表格组
    const newGroupResult = await groupCollection.add({
      year,
      description: description || '',
      create_time: new Date()
    });
    
    const newGroupId = newGroupResult.id;
    console.log(`已创建新表格组(${newGroupId})，源表格组ID: ${source_id}`);
    
    // 3. 获取源表格组下的所有表格
    const tables = await ratingTableCollection.where({
      group_id: source_id
    }).get();
    
    // 4. 分批复制表格到新表格组
    if (tables.data.length > 0) {
      console.log(`源表格组下有${tables.data.length}个表格，开始分批复制...`);
      
      // 分批处理，每批处理10个表格
      const batchSize = 10;
      const totalTables = tables.data.length;
      let processedCount = 0;
      
      for (let i = 0; i < totalTables; i += batchSize) {
        // 获取当前批次的表格
        const batch = tables.data.slice(i, Math.min(i + batchSize, totalTables));
        
        // 处理当前批次的表格复制
        const copyPromises = batch.map(async (table) => {
          // 创建新表格的基本信息
          const newTableData = {
            name: table.name.replace(sourceGroup.year, year), // 替换表格名称中的年份
            type: table.type,
            category: table.category || '',
            rater: table.rater,
            group_id: newGroupId,
            items: table.items || []
          };
          
          // 创建新表格
          const newTableResult = await ratingTableCollection.add(newTableData);
          const newTableId = newTableResult.id;
          
          console.log(`复制表格: ${table._id} -> ${newTableId}`);
          
          // 更新评分人的表格分配
          if (table.rater) {
            const userInfo = await userCollection.where({
              username: table.rater
            }).get();
            
            if (userInfo.data.length > 0) {
              const user = userInfo.data[0];
              const assignedTables = user.assignedTables || [];
              
              if (!assignedTables.includes(newTableId)) {
                assignedTables.push(newTableId);
                await userCollection.doc(user._id).update({
                  assignedTables
                });
                console.log(`已将表格 ${newTableId} 添加到评分人 ${table.rater} 的分配表中`);
              }
            }
          }
          
          // 获取并复制考核对象关联
          const subjects = await subjectCollection.where({
            table_id: db.command.in([table._id])
          }).get();
          
          if (subjects.data.length > 0) {
            console.log(`表格${table._id}有${subjects.data.length}个关联考核对象，开始复制关联...`);
            
            // 为每个考核对象添加与新表格的关联
            for (const subject of subjects.data) {
              // 检查考核对象是否已存在
              const existingSubject = await subjectCollection.where({
                name: subject.name,
                department: subject.department || ''
              }).get();
              
              if (existingSubject.data.length > 0) {
                // 考核对象已存在，更新其表格关联
                const existingSubjectData = existingSubject.data[0];
                const tableIds = Array.isArray(existingSubjectData.table_id) ? 
                  existingSubjectData.table_id : 
                  (existingSubjectData.table_id ? [existingSubjectData.table_id] : []);
                
                if (!tableIds.includes(newTableId)) {
                  tableIds.push(newTableId);
                  await subjectCollection.doc(existingSubjectData._id).update({
                    table_id: tableIds
                  });
                  console.log(`更新考核对象 ${subject.name} 关联到新表格 ${newTableId}`);
                }
              } else {
                // 考核对象不存在，创建新的考核对象
                await subjectCollection.add({
                  name: subject.name,
                  department: subject.department || '',
                  position: subject.position || '',
                  table_id: [newTableId]
                });
                console.log(`创建考核对象 ${subject.name} 并关联到新表格 ${newTableId}`);
              }
            }
          }
          
          return {
            oldTableId: table._id,
            newTableId,
            name: newTableData.name
          };
        });
        
        // 等待当前批次完成
        await Promise.all(copyPromises);
        
        processedCount += batch.length;
        console.log(`已完成 ${processedCount}/${totalTables} 个表格的复制`);
      }
      
      console.log(`所有表格复制完成，共复制了${tables.data.length}个表格`);
    } else {
      console.log(`源表格组下没有表格，无需复制`);
    }
    
    return {
      code: 0,
      msg: '复制表格组成功',
      data: {
        group_id: newGroupId,
        year,
        description: description || ''
      }
    };
  } catch (e) {
    console.error('复制表格组出错:', e);
    return {
      code: -1,
      msg: '复制表格组失败',
      error: e.message
    };
  }
} 