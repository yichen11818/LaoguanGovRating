'use strict';

// 云函数入口
exports.main = async (event, context) => {
  // 获取云数据库引用
  const db = uniCloud.database();
  const usersCollection = db.collection('users');
  
  // 需要保留的用户手机号
  const preservedPhone = '15579961188';
  
  try {
    // 查询要删除的用户数量
    const countResult = await usersCollection.where({
      phone: { $ne: preservedPhone }
    }).count();
    
    const totalToDelete = countResult.total;
    
    // 删除除了指定手机号以外的所有用户
    const deleteResult = await usersCollection.where({
      phone: { $ne: preservedPhone }
    }).remove();
    
    // 检查是否保留了指定用户
    const preservedUser = await usersCollection.where({
      phone: preservedPhone
    }).get();
    
    return {
      code: 0,
      msg: '删除成功',
      data: {
        deleted: deleteResult.deleted || 0,
        totalDeleted: totalToDelete,
        preserved: preservedUser.data.length > 0 ? preservedUser.data[0] : null
      }
    };
  } catch (error) {
    console.error('删除用户时出错:', error);
    return {
      code: -1,
      msg: '删除失败: ' + error.message,
      error: error
    };
  }
}; 