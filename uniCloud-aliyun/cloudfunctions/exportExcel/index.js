'use strict';
// 导入模块
console.log('开始导入node-xlsx模块...');
let BuildClass;

try {
  // 导入node-xlsx模块
  const xlsx = require('node-xlsx');
  console.log('node-xlsx模块导入成功，类型:', typeof xlsx);
  console.log('node-xlsx模块结构:', Object.keys(xlsx));
  
  // 获取正确的构造函数 - 文章中解释必须用new调用
  BuildClass = xlsx.build || (xlsx.default && xlsx.default.build) || xlsx;
  console.log('构造函数类型:', typeof BuildClass);
  
  // 必须使用new方式调用
  if (typeof BuildClass !== 'function') {
    console.error('无法找到可用的build构造函数');
    throw new Error('无法找到可用的build构造函数');
  } else {
    console.log('已找到构造函数，将使用new关键字调用');
  }
} catch (importError) {
  console.error('导入node-xlsx模块失败:', importError);
  throw new Error('无法导入node-xlsx模块: ' + importError.message);
}

exports.main = async (event, context) => {
  const { action, data } = event;
  
  // 根据操作类型执行不同的操作
  switch (action) {
    case 'exportATypeRatings':
      return await exportATypeRatings(data);
    default:
      return {
        code: -1,
        msg: '未知操作'
      };
  }
};

// 导出A类评分汇总表
async function exportATypeRatings(data) {
  const db = uniCloud.database();
  const ratingTableCollection = db.collection('rating_tables');
  const userCollection = db.collection('users');
  const subjectCollection = db.collection('subjects');
  const ratingCollection = db.collection('ratings');
  
  const { group_id, year } = data;
  
  try {
    console.log(`开始导出${year}年度A类评分汇总表`);
    
    // 参数校验
    if (!group_id || !year) {
      return {
        code: -1,
        msg: '缺少必要参数'
      };
    }
    
    // 获取A类班子评分表和驻村工作评分表
    // 添加详细日志
    console.log('开始查询A类评分表，参数:', { group_id, year });
    
    // 先查询所有类型为1的表格，不加其他条件
    const allTypeOneTablesResult = await ratingTableCollection.where({
      type: 1 // A类评分表
    }).get();
    
    console.log(`找到${allTypeOneTablesResult.data.length}个类型为1的表格`);
    if (allTypeOneTablesResult.data.length > 0) {
      console.log('表格示例:', JSON.stringify(allTypeOneTablesResult.data[0]));
    }
    
    // 查询指定group_id的表格
    const groupTablesResult = await ratingTableCollection.where({
      group_id
    }).get();
    
    console.log(`找到${groupTablesResult.data.length}个属于group_id ${group_id}的表格`);
    
        // 获取command对象
    const cmd = db.command;
    
    // 查询所有表格
    const allTablesResult = await ratingTableCollection.where({
      group_id
    }).get();
    
    console.log(`找到${allTablesResult.data.length}个属于group_id ${group_id}的表格`);
    
    // 如果没有找到表格，返回错误信息
    if (allTablesResult.data.length === 0) {
      console.log('未找到任何表格');
      return {
        code: -1,
        msg: `未找到任何评分表，请检查group_id ${group_id} 是否正确`
      };
    }
    
    // 查找班子评分表和驻村评分表
    let banziTable = null;
    let zhucunTable = null;
    
    // 遍历所有表格，查找班子和驻村评分表
    for (const table of allTablesResult.data) {
      // 检查是否为班子评分表
      if (!banziTable && ((table.category && table.category.includes('班子')) || 
          (table.name && table.name.toLowerCase().includes('班子')))) {
        banziTable = table;
        console.log('找到班子评分表:', table.name, '类型:', table.type);
      }
      
      // 检查是否为驻村评分表
      if (!zhucunTable && ((table.category && table.category.includes('驻村')) || 
          (table.name && table.name.toLowerCase().includes('驻村')))) {
        zhucunTable = table;
        console.log('找到驻村评分表:', table.name, '类型:', table.type);
      }
      
      // 如果都找到了，可以提前退出循环
      if (banziTable && zhucunTable) {
        break;
      }
    }
    
    // 检查是否找到了必要的表格
    if (!banziTable) {
      console.log('未找到班子评分表');
      return {
        code: -1,
        msg: '未找到班子评分表，请创建一个名称或类别包含"班子"的评分表'
      };
    }
    
    if (!zhucunTable) {
      console.log('未找到驻村评分表');
      return {
        code: -1,
        msg: '未找到驻村工作评分表，请创建一个名称或类别包含"驻村"的评分表'
      };
    }
    
    console.log('找到必要的评分表，继续导出操作');
    
    // 我们已经找到了班子和驻村评分表，直接使用
    console.log('使用班子评分表:', banziTable.name);
    console.log('使用驻村评分表:', zhucunTable.name);
    
    if (!banziTable) {
      return {
        code: -1,
        msg: '未找到班子评分表'
      };
    }
    
    // 获取所有考核对象（以班子评分表为准）
    const subjectsResult = await subjectCollection.where({
      table_id: db.command.all([banziTable._id])
    }).get();
    
    if (subjectsResult.data.length === 0) {
      return {
        code: -1,
        msg: '未找到考核对象'
      };
    }
    
    const subjects = subjectsResult.data;
    
    // 获取班子评分表的所有评分记录
    const banziRatingsResult = await ratingCollection.where({
      table_id: banziTable._id
    }).get();
    
    // 获取驻村工作评分表的所有评分记录（如果有）
    let zhucunRatingsResult = { data: [] };
    if (zhucunTable) {
      zhucunRatingsResult = await ratingCollection.where({
        table_id: zhucunTable._id
      }).get();
    }
    
    // 构建评分数据，按照考核对象进行整合
    const ratingData = {};
    const banziRaters = new Set(); // 收集所有班子评分人
    
    // 处理班子评分数据
    for (const rating of banziRatingsResult.data) {
      if (!ratingData[rating.subject]) {
        ratingData[rating.subject] = {
          banziRatings: {},
          zhucunRatings: {}
        };
      }
      ratingData[rating.subject].banziRatings[rating.rater] = rating.total_score;
      banziRaters.add(rating.rater);
    }
    
    // 处理驻村工作评分数据
    const zhucunScoresBySubject = {}; // 每个考核对象的驻村评分
    const zhucunRaters = new Set(); // 收集所有驻村工作评分人
    
    if (zhucunTable) {
      for (const rating of zhucunRatingsResult.data) {
        if (!ratingData[rating.subject]) {
          ratingData[rating.subject] = {
            banziRatings: {},
            zhucunRatings: {}
          };
        }
        ratingData[rating.subject].zhucunRatings[rating.rater] = rating.total_score;
        zhucunRaters.add(rating.rater);
        
        if (!zhucunScoresBySubject[rating.subject]) {
          zhucunScoresBySubject[rating.subject] = [];
        }
        zhucunScoresBySubject[rating.subject].push(rating.total_score);
      }
    }
    
    // 计算驻村工作评分的平均分
    let zhucunAverageScore = 0;
    let zhucunTotalScores = 0;
    let zhucunScoreCount = 0;
    
    // 计算所有驻村评分的平均分
    for (const subject in zhucunScoresBySubject) {
      const scores = zhucunScoresBySubject[subject];
      if (scores.length > 0) {
        const sum = scores.reduce((acc, score) => acc + score, 0);
        zhucunTotalScores += sum;
        zhucunScoreCount += scores.length;
      }
    }
    
    if (zhucunScoreCount > 0) {
      zhucunAverageScore = zhucunTotalScores / zhucunScoreCount;
    }
    
    // 转换评分人集合为数组
    const banziRaterArray = Array.from(banziRaters);
    const zhucunRaterArray = Array.from(zhucunRaters);
    
    // 创建Excel工作表数据
    const worksheetData = [];
    
    // 表头
    const title = `老关镇${year}年度绩效考核评分汇总表（A类）`;
    worksheetData.push([title]);
    
    // 表头第二行
    const header2 = ['序号', '姓名'];
    
    // 添加班子评分人
    header2.push('班子评分');
    for (let i = 0; i < banziRaterArray.length; i++) {
      header2.push('');
    }
    
    // 班子评分小计
    header2.push('班子评分平均分');
    
    // 添加驻村工作评分人
    header2.push('驻村工作评分');
    if (zhucunRaterArray.length > 0) {
      for (let i = 0; i < zhucunRaterArray.length; i++) {
        header2.push('');
      }
      // 驻村工作评分小计
      header2.push('驻村工作评分平均分');
    } else {
      header2.push(''); // 只占一列
    }
    
    // 总分列
    header2.push('总分（按班子：驻村=7：3换算）');
    
    // 备注列
    header2.push('备注');
    
    worksheetData.push(header2);
    
    // 表头第三行（具体评分人）
    const header3 = ['', ''];
    
    // 添加班子评分人姓名
    for (let i = 0; i < banziRaterArray.length; i++) {
      const rater = banziRaterArray[i];
      const userInfo = await userCollection.where({ username: rater }).get();
      const raterName = userInfo.data.length > 0 ? userInfo.data[0].name : rater;
      header3.push(raterName);
    }
    
    // 班子评分平均分列
    header3.push('');
    
    // 添加驻村工作评分人姓名
    if (zhucunRaterArray.length > 0) {
      for (let i = 0; i < zhucunRaterArray.length; i++) {
        const rater = zhucunRaterArray[i];
        const userInfo = await userCollection.where({ username: rater }).get();
        const raterName = userInfo.data.length > 0 ? userInfo.data[0].name : rater;
        header3.push(raterName);
      }
    } else {
      header3.push(''); // 只占一列
    }
    
    // 驻村工作评分平均分列
    if (zhucunRaterArray.length > 0) {
      header3.push('');
    }
    
    // 总分和备注列
    header3.push('');
    header3.push('');
    
    worksheetData.push(header3);
    
    // 添加考核对象的评分数据
    for (let i = 0; i < subjects.length; i++) {
      const subject = subjects[i];
      const subjectName = subject.name;
      const subjectRatingData = ratingData[subjectName] || { banziRatings: {}, zhucunRatings: {} };
      
      const row = [];
      row.push(i + 1); // 序号
      row.push(subjectName); // 姓名
      
      // 添加班子评分
      let banziTotalScore = 0;
      let banziScoreCount = 0;
      
      for (const rater of banziRaterArray) {
        const score = subjectRatingData.banziRatings[rater] || '';
        row.push(score);
        if (score) {
          banziTotalScore += score;
          banziScoreCount++;
        }
      }
      
      // 班子评分平均分
      const banziAvgScore = banziScoreCount > 0 ? (banziTotalScore / banziScoreCount).toFixed(2) : '';
      row.push(banziAvgScore);
      
      // 添加驻村工作评分
      let zhucunTotalScore = 0;
      let zhucunScoreCount = 0;
      
      if (zhucunRaterArray.length > 0) {
        for (const rater of zhucunRaterArray) {
          const score = subjectRatingData.zhucunRatings[rater] || '';
          row.push(score);
          if (score) {
            zhucunTotalScore += score;
            zhucunScoreCount++;
          }
        }
        
        // 如果没有驻村评分，使用所有人的平均分
        let zhucunAvgScore = '';
        if (zhucunScoreCount > 0) {
          zhucunAvgScore = (zhucunTotalScore / zhucunScoreCount).toFixed(2);
        } else if (banziScoreCount > 0 && zhucunAverageScore > 0) {
          // 如果此人没有驻村评分但有班子评分，使用全局驻村平均分
          zhucunAvgScore = zhucunAverageScore.toFixed(2);
        }
        
        row.push(zhucunAvgScore);
      } else {
        row.push(''); // 只占一列
      }
      
      // 计算总分（班子70%+驻村30%）
      let totalScore = '';
      if (banziAvgScore) {
        let calculatedZhucunScore = '';
        
        // 驻村评分处理
        if (zhucunRaterArray.length > 0 && zhucunScoreCount > 0) {
          calculatedZhucunScore = (zhucunTotalScore / zhucunScoreCount).toFixed(2);
        } else if (zhucunAverageScore > 0) {
          calculatedZhucunScore = zhucunAverageScore.toFixed(2);
        }
        
        if (calculatedZhucunScore) {
          totalScore = (parseFloat(banziAvgScore) * 0.7 + parseFloat(calculatedZhucunScore) * 0.3).toFixed(2);
        } else {
          totalScore = banziAvgScore; // 如果没有驻村评分，直接使用班子评分
        }
      }
      
      row.push(totalScore);
      
      // 备注列
      row.push('');
      
      worksheetData.push(row);
    }
    
    // 生成Excel文件
    const options = {
      '!cols': [
        { wch: 5 }, // 序号
        { wch: 15 }, // 姓名
      ]
    };
    
    // 添加班子评分人列宽
    for (let i = 0; i < banziRaterArray.length; i++) {
      options['!cols'].push({ wch: 10 });
    }
    options['!cols'].push({ wch: 15 }); // 班子评分平均分
    
    // 添加驻村工作评分人列宽
    if (zhucunRaterArray.length > 0) {
      for (let i = 0; i < zhucunRaterArray.length; i++) {
        options['!cols'].push({ wch: 10 });
      }
      options['!cols'].push({ wch: 15 }); // 驻村工作评分平均分
    } else {
      options['!cols'].push({ wch: 15 }); // 只占一列
    }
    
    options['!cols'].push({ wch: 30 }); // 总分
    options['!cols'].push({ wch: 15 }); // 备注
    
    // 调试日志
    console.log('准备构建Excel文件...');
    console.log('BuildClass类型:', typeof BuildClass);
    console.log('options:', JSON.stringify(options));
    
    // 使用new关键字调用构造函数
    let buffer;
    let csvMode = false; // 标记是否使用CSV模式
    try {
      console.log('使用new关键字调用构造函数...');
      // 使用new关键字调用构造函数
      buffer = new BuildClass([{
        name: `A类评分汇总表-${year}年`,
        data: worksheetData
      }], options);
      console.log('Excel构建成功，buffer类型:', typeof buffer);
    } catch (buildError) {
      console.error('使用BuildClass构造函数失败:', buildError);
      
      // 尝试其他方式
      console.log('尝试使用其他方式创建Excel...');
      try {
        const xlsxModule = require('node-xlsx');
        console.log('重新导入的xlsxModule类型:', typeof xlsxModule);
        console.log('xlsxModule结构:', Object.keys(xlsxModule));
        
        let success = false;
        
        // 方法1：尝试使用build作为构造函数（使用new关键字）
        if (!success && typeof xlsxModule.build === 'function') {
          try {
            console.log('方法1: 使用new xlsxModule.build方式');
            const BuildXlsx = xlsxModule.build;
            buffer = new BuildXlsx([{
              name: `A类评分汇总表-${year}年`,
              data: worksheetData
            }], options);
            console.log('方法1成功');
            success = true;
          } catch (err1) {
            console.log('方法1失败:', err1.message);
          }
        }
        
        // 方法2：使用默认导出的build方法作为构造函数
        if (!success && xlsxModule.default && typeof xlsxModule.default.build === 'function') {
          try {
            console.log('方法2: 使用new xlsxModule.default.build方式');
            const BuildXlsx = xlsxModule.default.build;
            buffer = new BuildXlsx([{
              name: `A类评分汇总表-${year}年`,
              data: worksheetData
            }], options);
            console.log('方法2成功');
            success = true;
          } catch (err2) {
            console.log('方法2失败:', err2.message);
          }
        }
        
        // 方法3：尝试使用xlsxModule本身作为构造函数
        if (!success && typeof xlsxModule === 'function') {
          try {
            console.log('方法3: 尝试使用new xlsxModule()方式');
            buffer = new xlsxModule([{
              name: `A类评分汇总表-${year}年`,
              data: worksheetData
            }], options);
            console.log('方法3成功');
            success = true;
          } catch (err3) {
            console.log('方法3失败:', err3.message);
          }
        }
        
        // 方法4：尝试使用xlsxModule.default作为构造函数
        if (!success && xlsxModule.default && typeof xlsxModule.default === 'function') {
          try {
            console.log('方法4: 尝试使用new xlsxModule.default()方式');
            buffer = new xlsxModule.default([{
              name: `A类评分汇总表-${year}年`,
              data: worksheetData
            }], options);
            console.log('方法4成功');
            success = true;
          } catch (err4) {
            console.log('方法4失败:', err4.message);
          }
        }
        
        // 方法5：使用node-xlsx的原始API
        if (!success) {
          try {
            console.log('方法5: 尝试使用node-xlsx原始API');
            const nodeXlsx = require('node-xlsx');
            const worksheets = [{
              name: `A类评分汇总表-${year}年`,
              data: worksheetData,
              options: options
            }];
            
            if (typeof nodeXlsx.parse === 'function') {
              console.log('尝试使用parseFile和build组合方式');
              // 尝试临时创建文件并解析
              buffer = require('node-xlsx').build(worksheets);
              console.log('方法5成功');
              success = true;
            }
          } catch (err5) {
            console.log('方法5失败:', err5.message);
          }
        }
        
        // 方法6：最后的尝试 - 创建兼容的简易版Excel（CSV格式）
        if (!success) {
          try {
            console.log('方法6: 创建简易CSV格式作为备选');
            // 生成CSV格式（可以被Excel打开）
            let csvContent = '';
            
            // 添加数据
            for (const row of worksheetData) {
              csvContent += row.map(cell => {
                // 处理单元格内容，添加引号，处理逗号和引号
                if (cell === null || cell === undefined) return '""';
                return `"${String(cell).replace(/"/g, '""')}"`;
              }).join(',') + '\n';
            }
            
            // 转为Buffer
            buffer = Buffer.from(csvContent);
            console.log('方法6成功 (使用CSV格式)');
            success = true;
            csvMode = true; // 标记使用了CSV模式
          } catch (err6) {
            console.log('方法6失败:', err6.message);
            throw new Error('所有尝试方法都失败，无法生成Excel或CSV格式');
          }
        }
      } catch (thirdError) {
        console.error('所有尝试都失败:', thirdError);
        throw new Error('无法构建Excel文件: ' + thirdError.message);
      }
    }
    
    // 将Excel文件上传到云存储
    // 根据生成方法确定文件后缀
    const fileExtension = csvMode ? '.csv' : '.xlsx';
    const uploadResult = await uniCloud.uploadFile({
      cloudPath: `exports/A类评分汇总表-${year}年-${Date.now()}${fileExtension}`,
      fileContent: buffer
    });
    
    // 生成临时下载链接
    const fileUrl = await uniCloud.getTempFileURL({
      fileList: [uploadResult.fileID]
    });
    
    return {
      code: 0,
      msg: '导出成功',
      data: {
        fileUrl: fileUrl.fileList[0].tempFileURL
      }
    };
    
  } catch (e) {
    console.error('导出A类评分汇总表失败:', e);
    return {
      code: -1,
      msg: '导出A类评分汇总表失败: ' + e.message,
      error: e.message
    };
  }
} 