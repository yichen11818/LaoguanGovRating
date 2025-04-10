'use strict';
const db = uniCloud.database();
const subjectCollection = db.collection('subjects');

exports.main = async (event, context) => {
  // 直接硬编码名单在函数内部
  const nameList = [
    "赖増辉", "温宣谌", "朱麒麟", "彭猛", "荣媛", 
    "刘艺之", "邬琴", "何树萍", "张奥成", "姚意如", 
    "张世萍", "缪思博", "易云萃", "陈群", "梁益杭", 
    "邬远静", "张超群", "彭杰", "雍永祥", "吴啸天", 
    "兰思萍", "柳春光", "王佩斯", "孙紫陵", "刘婷", 
    "王开林", "李娟", "文林", "康莞婷", "彭鑫", 
    "肖伊扬", "文雅欣", "钟燕", "肖敏华", "唐江明", 
    "余海龙", "江维", "文虎", "文金", "李梁", 
    "黎婷", "文勇岗", "刘龙杰"
  ];
  
  // 可以从参数中获取部门、职位和评分表ID，如果没有则使用空值
  const { department = '', position = '', table_id = [] } = event;
  
  // 确保table_id为数组类型
  const tableIds = Array.isArray(table_id) ? table_id : [];
  
  try {
    const results = [];
    const errors = [];
    
    // 对每个名字创建一个考核对象
    for (const name of nameList) {
      if (!name.trim()) continue; // 跳过空名字
      
      try {
        // 创建考核对象
        const result = await subjectCollection.add({
          name: name.trim(),
          table_id: tableIds,
          position: position || '',
          department: department || ''
        });
        
        results.push({
          name: name,
          id: result.id,
          success: true
        });
      } catch (err) {
        console.error('添加考核对象失败:', name, err);
        errors.push({
          name: name,
          error: err.message,
          success: false
        });
      }
    }
    
    return {
      code: 0,
      msg: `批量添加完成，成功: ${results.length}, 失败: ${errors.length}`,
      data: {
        results,
        errors
      }
    };
  } catch (e) {
    return {
      code: -1,
      msg: '批量添加考核对象失败',
      error: e.message
    };
  }
}; 