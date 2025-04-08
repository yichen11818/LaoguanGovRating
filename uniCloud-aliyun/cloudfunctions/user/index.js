'use strict';
const db = uniCloud.database();
const userCollection = db.collection('users');
const passwordResetCollection = db.collection('password_reset_requests');
const crypto = require('crypto');

// 密码加密函数
function encryptPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// 生成随机密码
function generateSecurePassword(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
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
    case 'updateUserInfo':
      return await updateUserInfo(data);
    case 'changePassword':
      return await changePassword(data);
    case 'updateUser':
      return await updateUser(data);
    case 'deleteUser':
      return await deleteUser(data);
    case 'getUsers':
      return await getUsers(data);
    case 'assignTables':
      return await assignTables(data);
    case 'resetPasswordRequest':
      return await resetPasswordRequest(data);
    case 'getResetRequests':
      return await getResetRequests(data);
    case 'approveResetRequest':
      return await approveResetRequest(data);
    case 'rejectResetRequest':
      return await rejectResetRequest(data);
    case 'resetUserPassword':
      return await resetUserPassword(data);
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
      msg: '账号和密码不能为空'
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
        msg: '账号不存在'
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
  const { username, password, name, workUnit } = data;
  
  // 参数校验
  if (!username || !password || !name) {
    return {
      code: -1,
      msg: '账号、密码和姓名不能为空'
    };
  }
  
  if (password.length < 6) {
    return {
      code: -1,
      msg: '密码长度不能少于6位'
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
        msg: '账号已存在'
      };
    }
    
    // 创建新用户，默认为普通用户角色
    const result = await userCollection.add({
      username,
      password: encryptPassword(password),
      name,
      workUnit: workUnit || '',
      role: 'user', // 默认为普通用户
      assignedTables: [],
      status: 'active',
      create_date: new Date()
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

// 获取当前登录用户的信息
async function getUserInfo(data) {
  // 获取当前登录的用户名，直接从客户端获取
  // 注意：实际项目中应该使用更安全的方式，如uni-id token验证
  try {
    // 从客户端保存的用户信息中获取用户名
    const { username } = data;
    console.log('getUserInfo 被调用，参数:', data);
    
    // 如果没有传入用户名，尝试从上下文获取
    if (!username) {
      console.log('未传入username，从JWT或authState获取');
      // 可以从JWT或其他认证信息中获取
      if (!context || !context.CLIENTIP) {
        return {
          code: -1,
          msg: '获取用户信息失败，未提供用户标识'
        };
      }
    }
    
    // 查询用户
    const userQuery = username ? { username } : { username: context.CLIENTIP };
    console.log('查询条件:', userQuery);
    
    const userInfo = await userCollection.where(userQuery).get();
    
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
    console.error('getUserInfo错误:', e);
    return {
      code: -1,
      msg: '获取用户信息失败',
      error: e.message
    };
  }
}

// 更新用户基本信息
async function updateUserInfo(data) {
  const { name, workUnit, username } = data;
  console.log('updateUserInfo被调用，参数:', data);
  
  if (!username) {
    return {
      code: -1,
      msg: '未提供用户标识'
    };
  }
  
  try {
    // 只允许修改自己的信息
    const updateData = {};
    
    if (name !== undefined) {
      updateData.name = name;
    }
    
    if (workUnit !== undefined) {
      updateData.workUnit = workUnit;
    }
    
    await userCollection.where({
      username: username
    }).update(updateData);
    
    return {
      code: 0,
      msg: '更新个人信息成功'
    };
  } catch (e) {
    console.error('updateUserInfo错误:', e);
    return {
      code: -1,
      msg: '更新个人信息失败',
      error: e.message
    };
  }
}

// 用户修改自己的密码
async function changePassword(data) {
  const { oldPassword, newPassword, username } = data;
  console.log('changePassword被调用，参数:', data);
  
  if (!username) {
    return {
      code: -1,
      msg: '未提供用户标识'
    };
  }
  
  if (!oldPassword || !newPassword) {
    return {
      code: -1,
      msg: '原密码和新密码不能为空'
    };
  }
  
  if (newPassword.length < 6) {
    return {
      code: -1,
      msg: '新密码长度不能少于6位'
    };
  }
  
  try {
    // 验证原密码
    const userInfo = await userCollection.where({
      username: username
    }).get();
    
    if (userInfo.data.length === 0) {
      return {
        code: -1,
        msg: '用户不存在'
      };
    }
    
    const user = userInfo.data[0];
    if (user.password !== encryptPassword(oldPassword)) {
      return {
        code: -1,
        msg: '原密码错误'
      };
    }
    
    // 更新密码
    await userCollection.doc(user._id).update({
      password: encryptPassword(newPassword)
    });
    
    return {
      code: 0,
      msg: '密码修改成功'
    };
  } catch (e) {
    console.error('changePassword错误:', e);
    return {
      code: -1,
      msg: '密码修改失败',
      error: e.message
    };
  }
}

// 管理员更新用户信息
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

// 管理员删除用户
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

// 为评分员分配评分表
async function assignTables(data) {
  const { userId, tableIds } = data;
  
  if (!userId || !tableIds || !Array.isArray(tableIds)) {
    return {
      code: -1,
      msg: '参数错误'
    };
  }
  
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

// 用户申请重置密码
async function resetPasswordRequest(data) {
  const { username } = data;
  
  if (!username) {
    return {
      code: -1,
      msg: '账号不能为空'
    };
  }
  
  try {
    // 检查用户是否存在
    const userInfo = await userCollection.where({
      username: username
    }).get();
    
    if (userInfo.data.length === 0) {
      return {
        code: -1,
        msg: '账号不存在'
      };
    }
    
    const user = userInfo.data[0];
    
    // 检查是否已有未处理的申请
    const existRequest = await passwordResetCollection.where({
      username: username,
      status: 'pending'
    }).get();
    
    if (existRequest.data.length > 0) {
      return {
        code: -1,
        msg: '您已提交过密码重置申请，请等待管理员处理'
      };
    }
    
    // 创建密码重置申请
    await passwordResetCollection.add({
      username: username,
      name: user.name,
      userId: user._id,
      status: 'pending', // pending, approved, rejected
      createTime: new Date(),
      handleTime: null,
      handleAdmin: null,
      remark: ''
    });
    
    return {
      code: 0,
      msg: '密码重置申请已提交，请联系管理员处理'
    };
  } catch (e) {
    return {
      code: -1,
      msg: '申请密码重置失败',
      error: e.message
    };
  }
}

// 管理员获取密码重置申请列表
async function getResetRequests(data) {
  const { status, page = 1, pageSize = 10 } = data;
  
  try {
    let query = passwordResetCollection.orderBy('createTime', 'desc');
    
    // 如果指定了状态，则按状态筛选
    if (status) {
      query = query.where({ status });
    }
    
    // 分页查询
    const requestList = await query.skip((page - 1) * pageSize).limit(pageSize).get();
    
    // 获取总数
    const countResult = await query.count();
    
    return {
      code: 0,
      msg: '获取密码重置申请列表成功',
      data: {
        list: requestList.data,
        total: countResult.total,
        page,
        pageSize
      }
    };
  } catch (e) {
    return {
      code: -1,
      msg: '获取密码重置申请列表失败',
      error: e.message
    };
  }
}

// 管理员批准密码重置申请
async function approveResetRequest(data) {
  const { requestId, adminUsername } = data;
  
  if (!requestId || !adminUsername) {
    return {
      code: -1,
      msg: '参数错误'
    };
  }
  
  try {
    // 获取申请信息
    const requestInfo = await passwordResetCollection.doc(requestId).get();
    
    if (requestInfo.data.length === 0) {
      return {
        code: -1,
        msg: '申请不存在'
      };
    }
    
    const request = requestInfo.data[0];
    
    if (request.status !== 'pending') {
      return {
        code: -1,
        msg: '该申请已被处理'
      };
    }
    
    // 生成随机密码
    const newPassword = generateSecurePassword(8);
    
    // 重置用户密码
    await userCollection.doc(request.userId).update({
      password: encryptPassword(newPassword)
    });
    
    // 更新申请状态
    await passwordResetCollection.doc(requestId).update({
      status: 'approved',
      handleTime: new Date(),
      handleAdmin: adminUsername
    });
    
    return {
      code: 0,
      msg: '密码重置成功',
      data: {
        username: request.username,
        name: request.name,
        newPassword: newPassword
      }
    };
  } catch (e) {
    return {
      code: -1,
      msg: '处理密码重置申请失败',
      error: e.message
    };
  }
}

// 管理员拒绝密码重置申请
async function rejectResetRequest(data) {
  const { requestId, adminUsername, remark } = data;
  
  if (!requestId || !adminUsername) {
    return {
      code: -1,
      msg: '参数错误'
    };
  }
  
  try {
    // 获取申请信息
    const requestInfo = await passwordResetCollection.doc(requestId).get();
    
    if (requestInfo.data.length === 0) {
      return {
        code: -1,
        msg: '申请不存在'
      };
    }
    
    const request = requestInfo.data[0];
    
    if (request.status !== 'pending') {
      return {
        code: -1,
        msg: '该申请已被处理'
      };
    }
    
    // 更新申请状态
    await passwordResetCollection.doc(requestId).update({
      status: 'rejected',
      handleTime: new Date(),
      handleAdmin: adminUsername,
      remark: remark || '申请被拒绝'
    });
    
    return {
      code: 0,
      msg: '已拒绝密码重置申请'
    };
  } catch (e) {
    return {
      code: -1,
      msg: '处理密码重置申请失败',
      error: e.message
    };
  }
}

// 管理员直接重置用户密码
async function resetUserPassword(data) {
  const { userId, adminUsername } = data;
  
  if (!userId || !adminUsername) {
    return {
      code: -1,
      msg: '参数错误'
    };
  }
  
  try {
    // 检查用户是否存在
    const userInfo = await userCollection.doc(userId).get();
    
    if (userInfo.data.length === 0) {
      return {
        code: -1,
        msg: '用户不存在'
      };
    }
    
    // 生成随机密码
    const newPassword = generateSecurePassword(8);
    
    // 重置用户密码
    await userCollection.doc(userId).update({
      password: encryptPassword(newPassword)
    });
    
    // 记录此操作（可选，用于审计）
    await db.collection('admin_logs').add({
      type: 'reset_password',
      userId: userId,
      adminUsername: adminUsername,
      time: new Date(),
      details: '管理员直接重置密码'
    }).catch(err => {
      // 记录日志失败不影响主流程
      console.error('记录日志失败:', err);
    });
    
    return {
      code: 0,
      msg: '密码重置成功',
      data: {
        newPassword: newPassword
      }
    };
  } catch (e) {
    return {
      code: -1,
      msg: '密码重置失败',
      error: e.message
    };
  }
} 