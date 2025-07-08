'use strict';
// 导入模块
console.log('开始导入node-xlsx模块...');
const xlsx = require('node-xlsx');
console.log('node-xlsx模块导入成功，类型:', typeof xlsx);

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
  
  const { group_id, year, description } = data;
  
  try {
    console.log(`开始导出${year}年度${description ? '(' + description + ')' : ''}A类评分汇总表`);
    console.log('导出参数:', JSON.stringify(data));
    
    // 参数校验
    if (!group_id || !year) {
      return {
        code: -1,
        msg: '缺少必要参数'
      };
    }
    
    // 获取A类班子评分表和驻村工作评分表
    console.log('开始查询A类评分表，参数:', { group_id, year });
    
    // 查询指定group_id的表格
    console.log('开始查询所有表格，group_id:', group_id);
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
    console.log('开始查找班子评分表(type=1)和驻村评分表(type=2)');
    for (const table of allTablesResult.data) {
      // 检查是否为班子评分表
      if (!banziTable && table.type === 1) {
        banziTable = table;
        console.log('找到班子评分表:', table.name, '类型:', table.type);
      }
      
      // 检查是否为驻村评分表
      if (!zhucunTable && table.type === 2) {
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
        msg: '未找到班子评分表，请检查是否有type=1的评分表'
      };
    }
    
    if (!zhucunTable) {
      console.log('未找到驻村评分表');
      return {
        code: -1,
        msg: '未找到驻村工作评分表，请检查是否有type=2的评分表'
      };
    }
    
    console.log('找到必要的评分表，继续导出操作');
    console.log('班子评分表:', JSON.stringify(banziTable));
    console.log('驻村评分表:', JSON.stringify(zhucunTable));
    
    // 获取所有考核对象（以班子评分表为准）
    console.log('开始获取考核对象, 班子评分表ID:', banziTable._id);
    const subjectsResult = await subjectCollection.where({
      table_id: db.command.all([banziTable._id])
    }).get();
    
    if (subjectsResult.data.length === 0) {
      console.log('未找到考核对象');
      return {
        code: -1,
        msg: '未找到考核对象'
      };
    }
    
    console.log(`找到${subjectsResult.data.length}个考核对象`);
    const subjects = subjectsResult.data;
    
    // 获取班子评分表的所有评分记录
    console.log('获取班子评分记录, 班子评分表ID:', banziTable._id);
    const banziRatingsResult = await ratingCollection.where({
      table_id: banziTable._id
    }).get();
    console.log(`找到${banziRatingsResult.data.length}条班子评分记录`);
    
    // 获取驻村工作评分表的所有评分记录（如果有）
    let zhucunRatingsResult = { data: [] };
    if (zhucunTable) {
      console.log('获取驻村评分记录, 驻村评分表ID:', zhucunTable._id);
      zhucunRatingsResult = await ratingCollection.where({
        table_id: zhucunTable._id
      }).get();
      console.log(`找到${zhucunRatingsResult.data.length}条驻村评分记录`);
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
    const title = `老关镇${year}年度${description ? '(' + description + ')' : ''}绩效考核评分汇总表（A类）`;
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
    
    // 设置列宽
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
    
    // 使用node-xlsx构建Excel文件
    console.log('准备构建Excel文件...');
    try {
      const buffer = xlsx.build([{
        name: `A类评分汇总表-${year}年${description ? '(' + description + ')' : ''}`,
        data: worksheetData
      }], options);
      console.log('Excel文件构建成功，准备上传');
      
      // 将Excel文件上传到云存储
      const fileExtension = '.xlsx';
      console.log('开始上传文件到云存储');
      const uploadResult = await uniCloud.uploadFile({
        cloudPath: `A类评分汇总表-${year}年${description ? '(' + description + ')' : ''}-${Date.now()}${fileExtension}`,
        fileContent: buffer
      });
      
      console.log('文件上传成功，fileID:', uploadResult.fileID);
      
      // 生成临时下载链接
      console.log('开始获取临时下载链接');
      const fileUrl = await uniCloud.getTempFileURL({
        fileList: [uploadResult.fileID]
      });
      
      console.log('获取临时下载链接成功:', fileUrl.fileList[0].tempFileURL);
      
      return {
        code: 0,
        msg: '导出成功',
        data: {
          fileUrl: fileUrl.fileList[0].tempFileURL
        }
      };
    } catch (excelError) {
      console.error('构建或上传Excel文件失败:', excelError);
      return {
        code: -1,
        msg: '构建Excel文件失败: ' + excelError.message,
        error: excelError.message
      };
    }
    
  } catch (e) {
    console.error('导出A类评分汇总表失败:', e);
    return {
      code: -1,
      msg: '导出A类评分汇总表失败: ' + e.message,
      error: e.message
    };
  }
}