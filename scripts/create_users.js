/**
 * 用户数据转换脚本
 * 
 * 此脚本用于将原始用户数据转换为系统可用的格式
 * 从temp/user_data.txt读取用户数据，处理后输出为JSON格式
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 用于加密密码的函数
function encryptPassword(password) {
  return crypto.createHash('md5').update(password).digest('hex');
}

// 主函数
function main() {
  try {
    // 读取原始用户数据
    const filePath = path.join(__dirname, '../temp/user_data.txt');
    const data = fs.readFileSync(filePath, 'utf8');
    
    // 分行处理数据
    const lines = data.split('\n').filter(line => line.trim() !== '');
    
    // 用于存储处理后的用户数据
    const users = [];
    
    // 处理每行数据
    lines.forEach(line => {
      // 使用空格分割数据，但需要处理多个空格的情况
      const parts = line.trim().split(/\s+/);
      
      if (parts.length >= 3) {
        const position = parts[0];
        const name = parts[1].replace(/\s+/g, ''); // 去除姓名中的空格
        const phone = parts[2];
        const village = parts.length > 3 ? parts[3] : ''; // 村庄信息，可能不存在
        
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
          status: 1, // 默认启用状态
          create_date: new Date().toISOString()
        };
        
        users.push(user);
      }
    });
    
    // 输出处理后的用户数据
    const outputPath = path.join(__dirname, '../temp/processed_users.json');
    fs.writeFileSync(outputPath, JSON.stringify(users, null, 2), 'utf8');
    
    console.log(`成功处理 ${users.length} 个用户数据`);
    console.log(`用户名: 手机号`);
    console.log(`默认密码: 手机号后6位`);
    console.log(`数据已保存至: ${outputPath}`);
    console.log(`所有用户均设置为评分员(rater)角色`);
    
  } catch (error) {
    console.error('处理用户数据时出错:', error);
  }
}

// 执行主函数
main(); 