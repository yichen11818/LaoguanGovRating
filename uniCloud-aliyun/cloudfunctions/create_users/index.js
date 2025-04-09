'use strict';

const crypto = require('crypto');

// 用于加密密码的函数 - 使用SHA256加密与原项目一致
function encryptPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// 云函数入口
exports.main = async (event, context) => {
  // 获取云数据库引用
  const db = uniCloud.database();
  const usersCollection = db.collection('users');
  
  // 原始用户数据
  const rawData = `科级领导干部    刘斌    13707992710    
科级领导干部    李鹏    13607998208    
科级领导干部    周敬荷    13879985573    
科级领导干部    赖江波    13979983238    
科级领导干部    何娅    13879997680    
科级领导干部    谢娄萍    13979998218    
科级领导干部    谭钧    13307993279    
科级领导干部    向玲    13979989092    
科级领导干部    江美玲    18797995996    
科级领导干部    温凤娇    15279962671    
科级领导干部    彭建荣    15807998980    
科级领导干部    汪欢    15107099411    
科级领导干部    廖颖钊    15879082800    
科级领导干部    吴亦    13517996305    
科级领导干部    席玲玲    13006292328    
科级领导干部    兰勋    13879999190    
办主任    肖敏华    18079937770    
办主任    唐江明    15079936720    
办主任    刘龙杰    18879982664    
办主任    余海龙    13979999313    
办主任    李梁    15079916161    
办主任    江维    13879969007    
办主任    文虎    13635951011    
办主任    文金    15907993778    
办主任    黎婷    13879925554    
办主任    文勇岗    15807090396    
村书记    周敬文    15279919588    前进村
村书记    肖之萍    15979483117    仁村村
村书记    张显珍    15079927252    红星村
村书记    朱树生    13879902619    檀梓村
村书记    肖清波    15979442266    油塘村
村书记    王宝昌    13979916545    渡口村
村书记    张雪萍    13879963105    二鲤村
村书记    张水明    13979904314    登官村
村书记    何海军    13974147872    三角池村
村书记    曾全    13755528168    关里村
村书记    颜汝文    13607997905    老关村`;
  
  // 分行处理数据
  const lines = rawData.split('\n').filter(line => line.trim() !== '');
  
  // 用于存储处理后的用户数据
  const users = [];
  // 用于存储用户账号密码信息
  const userCredentials = [];
  
  // 处理每行数据
  lines.forEach(line => {
    // 使用正则表达式匹配数据格式
    const match = line.match(/^(\S+)\s+([\u4e00-\u9fa5\s]+?)\s+(\d{11})\s*(.*?)$/);
    
    if (match) {
      const position = match[1]; // 职位
      const name = match[2].replace(/\s+/g, ''); // 去除姓名中所有空格
      const phone = match[3]; // 手机号
      const village = match[4].trim(); // 村庄信息(如果有)
      
      // 生成用户名和默认密码
      const username = phone; // 使用手机号作为用户名
      const defaultPassword = phone.slice(-6); // 使用手机号后6位作为默认密码
      const encryptedPassword = encryptPassword(defaultPassword);
      
      // 创建用户对象 - 所有用户都设置为评分用户(rater)
      const user = {
        username,
        password: encryptedPassword,
        name,
        phone,
        role: 'rater', // 统一设置为评分员角色
        position,
        village,
        status: 'active', // 使用与原项目一致的状态值
        create_date: new Date()
      };
      
      // 添加用户凭据信息
      userCredentials.push({
        name,
        position,
        username,
        plainPassword: defaultPassword, // 明文密码
        village: village || '-',
        encryptedPassword: encryptedPassword // 添加加密后的密码，用于调试
      });
      
      users.push(user);
    } else {
      console.warn('无法解析的行:', line);
    }
  });
  
  let successCount = 0;
  let errorCount = 0;
  
  try {
    // 清空现有用户（可选）
    if (event.clearExisting) {
      await usersCollection.remove({});
      console.log('已清空现有用户数据');
    }
    
    // 批量添加用户到数据库
    const result = await usersCollection.add(users);
    successCount = result.inserted || users.length;
    
    // 生成账号密码Excel文件的数据结构
    const usersAccountInfo = userCredentials.map((user, index) => {
      return {
        序号: (index + 1),
        姓名: user.name,
        职位: user.position,
        所属村: user.village,
        账号: user.username,
        密码: user.plainPassword
      };
    });
    
    // 添加一条测试账号记录，用于验证
    const testPhone = '15579961188';
    const testPwd = testPhone.slice(-6);
    const testEncryptedPwd = encryptPassword(testPwd);
    
    usersAccountInfo.push({
      序号: users.length + 1,
      姓名: '测试账号',
      职位: '管理员',
      所属村: '-',
      账号: testPhone,
      密码: testPwd
    });
    
    return {
      code: 0,
      msg: '导入成功',
      data: {
        totalUsers: users.length,
        successCount,
        errorCount: users.length - successCount,
        // 账号密码信息表
        userCredentials: usersAccountInfo,
        // 登录提示
        loginInfo: `请使用手机号作为账号，手机号后6位作为密码登录。\n示例：账号${users[0].phone}，密码${userCredentials[0].plainPassword}`
      }
    };
  } catch (error) {
    console.error('导入用户数据时出错:', error);
    return {
      code: -1,
      msg: '导入失败: ' + error.message,
      data: {
        totalUsers: users.length,
        successCount,
        errorCount: users.length - successCount
      }
    };
  }
}; 