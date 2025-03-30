'use strict';
const db = uniCloud.database();
const userCollection = db.collection('users');
const crypto = require('crypto');

// 密码加密函数
function encryptPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

exports.main = async (event, context) => {
  const { action, data } = event;
  
  // 根据操作类型执行不同的操作
  switch (action) {
    case 'login':
      return await login(data);
    case 'register':
      return await register(data);
    case 'getUserInfo':
      return await getUserInfo(data);
    case 'updateUser':
      return await updateUser(data);
    case 'deleteUser':
      return await deleteUser(data);
    case 'getUsers':
      return await getUsers(data);
    case 'assignTables':
      return await assignTables(data);
    default:
      return {
        code: -1,
        msg: '未知操作'
      };
  }
};

// 用户登录
async function login(data) {
  const { username, password } = data;
  
  // 参数校验
  if (!username || !password) {
    return {
      code: -1,
      msg: '用户名和密码不能为空'
    };
  }
  
  try {
    // 使用用户名查询用户
    const userInfo = await userCollection.where({
      username: username
    }).get();
    
    // 用户不存在
    if (userInfo.data.length === 0) {
      return {
        code: -1,
        msg: '用户不存在'
      };
    }
    
    const user = userInfo.data[0];
    // 验证密码
    if (user.password !== encryptPassword(password)) {
      return {
        code: -1,
        msg: '密码错误'
      };
    }
    
    // 生成 token（在实际应用中，应使用 uni-id 等更安全的方式）
    const token = crypto.randomBytes(16).toString('hex');
    
    // 返回用户信息（不包含密码）
    delete user.password;
    
    return {
      code: 0,
      msg: '登录成功',
      data: {
        token,
        user
      }
    };
  } catch (e) {
    return {
      code: -1,
      msg: '登录失败',
      error: e.message
    };
  }
}

// 用户注册
async function register(data) {
  const { username, password, name, role } = data;
  
  // 参数校验
  if (!username || !password || !name || !role) {
    return {
      code: -1,
      msg: '缺少必要参数'
    };
  }
  
  try {
    // 检查用户名是否存在
    const existUser = await userCollection.where({
      username: username
    }).get();
    
    if (existUser.data.length > 0) {
      return {
        code: -1,
        msg: '用户名已存在'
      };
    }
    
    // 创建新用户
    const result = await userCollection.add({
      username,
      password: encryptPassword(password),
      name,
      role,
      assignedTables: []
    });
    
    return {
      code: 0,
      msg: '注册成功',
      data: {
        id: result.id
      }
    };
  } catch (e) {
    return {
      code: -1,
      msg: '注册失败',
      error: e.message
    };
  }
}

// 获取用户信息
async function getUserInfo(data) {
  const { userId } = data;
  
  try {
    const userInfo = await userCollection.doc(userId).get();
    
    if (userInfo.data.length === 0) {
      return {
        code: -1,
        msg: '用户不存在'
      };
    }
    
    const user = userInfo.data[0];
    // 不返回密码
    delete user.password;
    
    return {
      code: 0,
      msg: '获取用户信息成功',
      data: user
    };
  } catch (e) {
    return {
      code: -1,
      msg: '获取用户信息失败',
      error: e.message
    };
  }
}

// 更新用户信息
async function updateUser(data) {
  const { userId, updateData } = data;
  
  // 如果包含密码，需加密
  if (updateData.password) {
    updateData.password = encryptPassword(updateData.password);
  }
  
  try {
    await userCollection.doc(userId).update(updateData);
    
    return {
      code: 0,
      msg: '更新用户信息成功'
    };
  } catch (e) {
    return {
      code: -1,
      msg: '更新用户信息失败',
      error: e.message
    };
  }
}

// 删除用户
async function deleteUser(data) {
  const { userId } = data;
  
  try {
    await userCollection.doc(userId).remove();
    
    return {
      code: 0,
      msg: '删除用户成功'
    };
  } catch (e) {
    return {
      code: -1,
      msg: '删除用户失败',
      error: e.message
    };
  }
}

// 获取用户列表
async function getUsers(data) {
  const { role, page = 1, pageSize = 10 } = data;
  
  try {
    let query = userCollection;
    
    // 如果指定了角色，则按角色筛选
    if (role) {
      query = query.where({ role });
    }
    
    // 分页查询
    const userList = await query.skip((page - 1) * pageSize).limit(pageSize).get();
    
    // 获取总数
    const countResult = await query.count();
    
    // 处理用户列表，移除密码
    const users = userList.data.map(user => {
      const userObj = { ...user };
      delete userObj.password;
      return userObj;
    });
    
    return {
      code: 0,
      msg: '获取用户列表成功',
      data: {
        list: users,
        total: countResult.total,
        page,
        pageSize
      }
    };
  } catch (e) {
    return {
      code: -1,
      msg: '获取用户列表失败',
      error: e.message
    };
  }
}

// 分配评分表给用户
async function assignTables(data) {
  const { userId, tableIds } = data;
  
  try {
    await userCollection.doc(userId).update({
      assignedTables: tableIds
    });
    
    return {
      code: 0,
      msg: '分配评分表成功'
    };
  } catch (e) {
    return {
      code: -1,
      msg: '分配评分表失败',
      error: e.message
    };
  }
} 