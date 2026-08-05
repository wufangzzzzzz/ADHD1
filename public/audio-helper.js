/**
 * 听知觉训练 - 统一音频播放模块
 * 支持：预生成音频文件 → 智能分词 → SpeechSynthesis
 * 用法：window.playAudio(text, callback, rate)
 *       window.playAudioSequence(texts, index, callback, rate, pauseMs)
 *       window.onAudioReady(callback)
 */
(function() {
  var AUDIO_DIR = 'public/audio/';
  var selectedVoice = null;
  var _stopFlag = false;
  var _currentAudio = null;
  var _audioGen = 0;

  // ===== 音频映射表（内嵌，无需 XHR 加载）=====
  var AUDIO_MAP = {
    "一": "a001.mp3",
    "七": "a007.mp3",
    "三": "a003.mp3",
    "三轮车": "a080.mp3",
    "上": "a438.mp3",
    "上午": "a311.mp3",
    "上学": "a167.mp3",
    "下": "a439.mp3",
    "下一题": "a209.mp3",
    "下午": "a312.mp3",
    "下雨": "a155.mp3",
    "不得了": "a342.mp3",
    "不慌不忙": "a349.mp3",
    "丝瓜": "a303.mp3",
    "个数字": "a242.mp3",
    "个词": "a241.mp3",
    "中": "a440.mp3",
    "中午": "a153.mp3",
    "中等": "a148.mp3",
    "中级": "a145.mp3",
    "九": "a009.mp3",
    "书": "a378.mp3",
    "书包": "a064.mp3",
    "书架": "a104.mp3",
    "二": "a002.mp3",
    "云": "a367.mp3",
    "五": "a005.mp3",
    "交通工具": "a013.mp3",
    "今": "a431.mp3",
    "仔细听": "a233.mp3",
    "仔细听，答案都在故事里哦": "a250.mp3",
    "仔细记住": "a219.mp3",
    "仙人掌": "a111.mp3",
    "作业本": "a255.mp3",
    "保安": "a300.mp3",
    "修正带": "a266.mp3",
    "做得不错": "a182.mp3",
    "停顿一下": "a186.mp3",
    "傍晚": "a310.mp3",
    "兔": "a399.mp3",
    "兔子": "a456.mp3",
    "全部输入完毕": "a237.mp3",
    "八": "a008.mp3",
    "公交车": "a075.mp3",
    "六": "a006.mp3",
    "兰花": "a110.mp3",
    "再仔细想想": "a185.mp3",
    "再听一遍": "a193.mp3",
    "再听一遍...": "a235.mp3",
    "再想想": "a179.mp3",
    "再来一局": "a200.mp3",
    "再检查一下": "a188.mp3",
    "冬": "a426.mp3",
    "冬天": "a319.mp3",
    "冰块": "a139.mp3",
    "冰棍": "a141.mp3",
    "冰淇淋": "a142.mp3",
    "冰箱": "a086.mp3",
    "冷饮": "a143.mp3",
    "准备就绪": "a216.mp3",
    "出租车": "a079.mp3",
    "初中": "a160.mp3",
    "初级": "a144.mp3",
    "刷牙": "a165.mp3",
    "刺猬": "a267.mp3",
    "剁馅": "a173.mp3",
    "前": "a434.mp3",
    "动物": "a011.mp3",
    "包子": "a118.mp3",
    "包饺子": "a172.mp3",
    "医生": "a121.mp3",
    "午": "a428.mp3",
    "单车": "a083.mp3",
    "卡车": "a275.mp3",
    "卵": "a324.mp3",
    "卷笔刀": "a304.mp3",
    "厨师": "a125.mp3",
    "发": "a419.mp3",
    "发芽": "a163.mp3",
    "口": "a413.mp3",
    "右": "a437.mp3",
    "叶": "a374.mp3",
    "司机": "a127.mp3",
    "叽叽叽": "a352.mp3",
    "吃": "a170.mp3",
    "吃早饭": "a168.mp3",
    "吃饭": "a332.mp3",
    "吃饺子": "a333.mp3",
    "后": "a435.mp3",
    "向日葵": "a112.mp3",
    "听到": "a221.mp3",
    "听提示": "a207.mp3",
    "吸尘器": "a091.mp3",
    "呷呷呷": "a353.mp3",
    "和面": "a169.mp3",
    "咩咩咩": "a356.mp3",
    "咪": "a445.mp3",
    "哪个类别": "a244.mp3",
    "喵喵喵": "a355.mp3",
    "四": "a004.mp3",
    "回答正确": "a189.mp3",
    "回答错误": "a190.mp3",
    "困难": "a149.mp3",
    "圆珠笔": "a269.mp3",
    "地铁": "a077.mp3",
    "夏": "a424.mp3",
    "夏天": "a320.mp3",
    "夜": "a430.mp3",
    "大": "a362.mp3",
    "大吃一惊": "a341.mp3",
    "大学": "a157.mp3",
    "大树": "a314.mp3",
    "大象": "a046.mp3",
    "天": "a364.mp3",
    "太棒了": "a177.mp3",
    "头": "a409.mp3",
    "奶茶": "a262.mp3",
    "好听极了": "a350.mp3",
    "完全正确": "a176.mp3",
    "完整数字串": "a218.mp3",
    "完整数字串，请仔细记住": "a247.mp3",
    "家具": "a016.mp3",
    "家用电器": "a014.mp3",
    "小": "a363.mp3",
    "小公鸡": "a337.mp3",
    "小公鸡清早起来": "a346.mp3",
    "小学": "a158.mp3",
    "小熊": "a457.mp3",
    "小狗": "a453.mp3",
    "小猫": "a043.mp3",
    "小白兔": "a347.mp3",
    "小羊": "a358.mp3",
    "小苗": "a313.mp3",
    "小鱼": "a455.mp3",
    "小鸟": "a454.mp3",
    "小鸡": "a357.mp3",
    "小鸭": "a338.mp3",
    "尺子": "a063.mp3",
    "山": "a365.mp3",
    "山楂": "a042.mp3",
    "山竹": "a260.mp3",
    "工程师": "a292.mp3",
    "左": "a436.mp3",
    "差一点点": "a180.mp3",
    "差一点点，继续加油": "a249.mp3",
    "帆船": "a301.mp3",
    "带鱼": "a136.mp3",
    "幼儿园": "a159.mp3",
    "床": "a383.mp3",
    "开始": "a210.mp3",
    "开始挑战": "a198.mp3",
    "开花": "a161.mp3",
    "弄皱了": "a344.mp3",
    "形状": "a024.mp3",
    "彩笔": "a069.mp3",
    "律师": "a261.mp3",
    "微波炉": "a089.mp3",
    "心": "a416.mp3",
    "想一想": "a345.mp3",
    "慢慢吞吞": "a351.mp3",
    "手": "a407.mp3",
    "打伞": "a154.mp3",
    "找对了": "a184.mp3",
    "护士": "a126.mp3",
    "指": "a420.mp3",
    "按": "a222.mp3",
    "提交": "a194.mp3",
    "提交答案": "a195.mp3",
    "摩托车": "a078.mp3",
    "播种": "a328.mp3",
    "收获": "a329.mp3",
    "收音机": "a294.mp3",
    "文件夹": "a253.mp3",
    "文具": "a012.mp3",
    "文具盒": "a068.mp3",
    "施肥": "a327.mp3",
    "日": "a369.mp3",
    "早": "a427.mp3",
    "早上": "a152.mp3",
    "时间到": "a181.mp3",
    "明": "a432.mp3",
    "星": "a371.mp3",
    "映射规则": "a220.mp3",
    "春": "a423.mp3",
    "春天": "a321.mp3",
    "昨": "a433.mp3",
    "晚": "a429.mp3",
    "晚上": "a151.mp3",
    "月": "a370.mp3",
    "有进步": "a183.mp3",
    "本子": "a065.mp3",
    "来回答问题吧": "a215.mp3",
    "杨梅": "a037.mp3",
    "杯": "a384.mp3",
    "松土": "a330.mp3",
    "枇杷": "a039.mp3",
    "柚子": "a305.mp3",
    "柜子": "a102.mp3",
    "柠檬": "a035.mp3",
    "栀子花": "a278.mp3",
    "标准": "a150.mp3",
    "树": "a372.mp3",
    "桂花": "a130.mp3",
    "桃子": "a030.mp3",
    "桌": "a381.mp3",
    "桌子": "a100.mp3",
    "桔子": "a027.mp3",
    "梅花": "a132.mp3",
    "梅花鹿": "a309.mp3",
    "梳妆台": "a252.mp3",
    "椅": "a382.mp3",
    "椅子": "a101.mp3",
    "植物": "a017.mp3",
    "榴莲": "a251.mp3",
    "樱桃": "a034.mp3",
    "樱花": "a133.mp3",
    "橄榄": "a040.mp3",
    "橘子": "a027.mp3",
    "橡皮": "a062.mp3",
    "正在朗读中": "a213.mp3",
    "正确": "a174.mp3",
    "毛毛虫": "a326.mp3",
    "毛笔": "a070.mp3",
    "水": "a361.mp3",
    "水果": "a010.mp3",
    "池塘": "a340.mp3",
    "池塘边": "a343.mp3",
    "汤圆": "a283.mp3",
    "汪汪汪": "a354.mp3",
    "汽车": "a071.mp3",
    "沙发": "a103.mp3",
    "河马": "a051.mp3",
    "油条": "a270.mp3",
    "洋葱": "a295.mp3",
    "洗米": "a317.mp3",
    "洗衣机": "a087.mp3",
    "浇水": "a331.mp3",
    "海豹": "a056.mp3",
    "消防员": "a124.mp3",
    "清洁工": "a302.mp3",
    "渔民": "a285.mp3",
    "湿了": "a156.mp3",
    "漏掉了哪个数字": "a204.mp3",
    "火车": "a072.mp3",
    "火龙果": "a280.mp3",
    "灯": "a377.mp3",
    "炸鸡": "a268.mp3",
    "点击开始": "a206.mp3",
    "点击提交": "a238.mp3",
    "烤鸭": "a277.mp3",
    "热水器": "a306.mp3",
    "然": "a447.mp3",
    "然后": "a459.mp3",
    "煮": "a171.mp3",
    "煮熟": "a334.mp3",
    "煮饭": "a316.mp3",
    "熊": "a400.mp3",
    "牙": "a414.mp3",
    "牛": "a395.mp3",
    "牛奶": "a119.mp3",
    "牡丹": "a128.mp3",
    "牵牛花": "a307.mp3",
    "狗": "a392.mp3",
    "狮": "a228.mp3",
    "狮子": "a048.mp3",
    "猫": "a391.mp3",
    "猫咪": "a452.mp3",
    "猴子": "a049.mp3",
    "三轮": "a460.mp3",
    "公交": "a461.mp3",
    "出租": "a462.mp3",
    "摩托": "a463.mp3",
    "猴": "a464.mp3",
    "玫瑰": "a107.mp3",
    "理发师": "a293.mp3",
    "生菜": "a099.mp3",
    "电烤箱": "a279.mp3",
    "电磁炉": "a264.mp3",
    "电视": "a085.mp3",
    "电车": "a084.mp3",
    "电风扇": "a286.mp3",
    "电饭煲": "a090.mp3",
    "白菜": "a093.mp3",
    "百合": "a109.mp3",
    "盛饭": "a318.mp3",
    "直尺": "a282.mp3",
    "眼": "a410.mp3",
    "石榴": "a263.mp3",
    "确定": "a197.mp3",
    "确定答案": "a196.mp3",
    "碗": "a385.mp3",
    "秋": "a425.mp3",
    "秋天": "a322.mp3",
    "种子": "a315.mp3",
    "空调": "a088.mp3",
    "窗": "a376.mp3",
    "章鱼": "a291.mp3",
    "笔": "a379.mp3",
    "第": "a240.mp3",
    "第一遍": "a202.mp3",
    "第二遍": "a203.mp3",
    "等待开始": "a205.mp3",
    "简单": "a147.mp3",
    "米": "a386.mp3",
    "米饭": "a113.mp3",
    "粽子": "a271.mp3",
    "系统即将朗读词语": "a239.mp3",
    "红": "a360.mp3",
    "红枣": "a041.mp3",
    "红色": "a448.mp3",
    "纸": "a380.mp3",
    "结果": "a162.mp3",
    "结蛹": "a336.mp3",
    "继续加油": "a178.mp3",
    "继续挑战": "a199.mp3",
    "绿": "a443.mp3",
    "绿色": "a450.mp3",
    "羊": "a396.mp3",
    "羚羊": "a053.mp3",
    "老师": "a122.mp3",
    "老虎": "a047.mp3",
    "考拉": "a055.mp3",
    "耳": "a411.mp3",
    "职业": "a019.mp3",
    "肉": "a389.mp3",
    "脚": "a408.mp3",
    "脸": "a418.mp3",
    "腿": "a422.mp3",
    "臂": "a421.mp3",
    "自行车": "a076.mp3",
    "舌": "a415.mp3",
    "色": "a441.mp3",
    "芒果": "a031.mp3",
    "花": "a359.mp3",
    "花卉": "a020.mp3",
    "花菜": "a259.mp3",
    "芹菜": "a092.mp3",
    "苹果": "a025.mp3",
    "茄子": "a095.mp3",
    "茉莉": "a129.mp3",
    "茶几": "a105.mp3",
    "草": "a373.mp3",
    "草莓": "a033.mp3",
    "草鱼": "a296.mp3",
    "荔枝": "a036.mp3",
    "荷花": "a131.mp3",
    "菊花": "a108.mp3",
    "菜": "a388.mp3",
    "菠菜": "a097.mp3",
    "菠萝": "a032.mp3",
    "萝卜": "a098.mp3",
    "落叶": "a164.mp3",
    "葡萄": "a029.mp3",
    "蓝": "a442.mp3",
    "蓝色": "a449.mp3",
    "蔬菜": "a015.mp3",
    "薯片": "a257.mp3",
    "蘑菇": "a256.mp3",
    "虎": "a401.mp3",
    "虫": "a404.mp3",
    "虫卵": "a335.mp3",
    "蛇": "a403.mp3",
    "蛋糕": "a116.mp3",
    "蛙": "a405.mp3",
    "蛹": "a325.mp3",
    "蜡笔": "a067.mp3",
    "蜻蜓": "a308.mp3",
    "蝴蝶": "a323.mp3",
    "蝶": "a406.mp3",
    "螃蟹": "a298.mp3",
    "袋鼠": "a057.mp3",
    "西瓜": "a028.mp3",
    "西红柿": "a287.mp3",
    "解码正确": "a187.mp3",
    "警察": "a123.mp3",
    "记住映射规则": "a212.mp3",
    "评判员": "a348.mp3",
    "请": "a458.mp3",
    "请仔细听": "a191.mp3",
    "请听": "a211.mp3",
    "请听一段声音，数一数猫出现了几次": "a230.mp3",
    "请听一段混合的声音，把不属于动物的词找出来": "a231.mp3",
    "请认真听故事": "a214.mp3",
    "豆浆": "a258.mp3",
    "豆角": "a096.mp3",
    "象": "a402.mp3",
    "起床": "a166.mp3",
    "身": "a417.mp3",
    "车": "a223.mp3",
    "轮到你了": "a232.mp3",
    "轮船": "a074.mp3",
    "轻轨": "a082.mp3",
    "输入解码结果": "a236.mp3",
    "这次少了一个数字": "a245.mp3",
    "这次少了一个数字，仔细听": "a248.mp3",
    "选出它所属的类别": "a243.mp3",
    "选择分类": "a192.mp3",
    "选择答案": "a234.mp3",
    "选择难度开始训练": "a217.mp3",
    "重排": "a208.mp3",
    "重新开始": "a201.mp3",
    "野猪": "a054.mp3",
    "金枪鱼": "a299.mp3",
    "金鱼": "a134.mp3",
    "钢笔": "a066.mp3",
    "铅笔": "a061.mp3",
    "错误": "a175.mp3",
    "长颈鹿": "a050.mp3",
    "门": "a375.mp3",
    "雨": "a368.mp3",
    "雪糕": "a140.mp3",
    "零": "a000.mp3",
    "青椒": "a265.mp3",
    "面包": "a115.mp3",
    "面条": "a114.mp3",
    "鞋柜": "a273.mp3",
    "韭菜": "a288.mp3",
    "颜色": "a023.mp3",
    "风": "a366.mp3",
    "飞机": "a073.mp3",
    "食物": "a018.mp3",
    "餐桌": "a274.mp3",
    "饭": "a387.mp3",
    "饺子": "a117.mp3",
    "饼干": "a281.mp3",
    "馄饨": "a290.mp3",
    "香菜": "a094.mp3",
    "香蕉": "a026.mp3",
    "马": "a394.mp3",
    "高级": "a146.mp3",
    "高铁": "a081.mp3",
    "鱼": "a390.mp3",
    "鱼类": "a021.mp3",
    "鲈鱼": "a137.mp3",
    "鲤鱼": "a135.mp3",
    "鲨鱼": "a272.mp3",
    "鲫鱼": "a138.mp3",
    "鳄鱼": "a052.mp3",
    "鳕鱼": "a297.mp3",
    "鸟": "a393.mp3",
    "鸡": "a397.mp3",
    "鸡蛋": "a120.mp3",
    "鸭": "a398.mp3",
    "鹦鹉": "a254.mp3",
    "鹿": "a229.mp3",
    "黄": "a444.mp3",
    "黄瓜": "a276.mp3",
    "黄色": "a451.mp3",
    "黄鱼": "a284.mp3",
    "黑鱼": "a289.mp3",
    "鼻": "a412.mp3",
    "龙眼": "a038.mp3",
    "龟": "a060.mp3"
  };

  // ===== 音频预加载缓存（部署后网络延迟优化）=====
  var _audioPreloadCache = {};
  window.preloadAudio = function(word) {
    if (!AUDIO_MAP[word]) return Promise.resolve();
    var url = AUDIO_DIR + AUDIO_MAP[word];
    if (_audioPreloadCache[url]) return Promise.resolve(_audioPreloadCache[url]);
    // 用 <audio> 媒体元素预加载：兼容 file:// 双击与 http 部署，无 CORS 限制，且预载真正生效
    return new Promise(function(resolve) {
      var audio = new Audio();
      audio.preload = 'auto';
      audio.src = url;
      var settled = false;
      function done(ok) {
        if (settled) return;
        settled = true;
        if (ok) _audioPreloadCache[url] = url; // 缓存相对路径，playAudioFile 复用，播放零延迟
        resolve(url);
      }
      audio.addEventListener('canplaythrough', function() { done(true); });
      audio.addEventListener('loadeddata', function() { done(true); });
      audio.addEventListener('error', function() { done(false); }); // 即使失败也放行，playAudioFile 会回退重试
      try { audio.load(); } catch (e) { done(false); }
    });
  };
  window.preloadAudioList = function(words) {
    return Promise.all((words || []).map(window.preloadAudio));
  };

  // ===== SpeechSynthesis 语音选择 =====
  function selectBestVoice() {
    if (selectedVoice || !window.speechSynthesis) return;
    var voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return;
    var zhVoices = voices.filter(function(v) { return v.lang && v.lang.startsWith('zh'); });
    if (zhVoices.length === 0) return;
    var best = zhVoices.find(function(v) { return v.localService && /female|nv|女/i.test(v.name); })
      || zhVoices.find(function(v) { return v.localService; })
      || zhVoices.find(function(v) { return /female|nv|女/i.test(v.name); })
      || zhVoices[0];
    if (best) selectedVoice = best;
  }

  // 监听语音变更
  if (window.speechSynthesis && speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = selectBestVoice;
  }

  // ===== 内部停止函数 =====
  // 规则25：_stopAudio 是唯一停止+递增 _audioGen 的入口。
  // 所有 playAudioFile / _playAudioSequence 必须在 _stopAudio() 之后
  // 从 _audioGen 重新捕获 gen，禁止使用外部传入的旧 gen 值。
  function _stopAudio() {
    _stopFlag = true;
    _ttsStopKeepAlive();
    if (_currentAudio) { _currentAudio.pause(); _currentAudio = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    _audioGen++;
    _stopFlag = false;
  }

  // ===== 播放单个音频文件 =====
  function playAudioFile(filename, text, callback, rate, gen) {
    _stopAudio();
    var effectiveGen = _audioGen;  // _stopAudio() 之后捕获，确保与 onended 检查一致
    var audio = new Audio();
    // 优先使用预加载缓存（blob URL 无网络延迟）
    var cacheUrl = AUDIO_DIR + filename;
    if (_audioPreloadCache[cacheUrl]) {
      audio.src = _audioPreloadCache[cacheUrl];
    } else {
      audio.src = cacheUrl;
    }
    audio.volume = 1.0;
    if (rate && rate !== 1.0) audio.playbackRate = rate;
    _currentAudio = audio;

    audio.onended = function() { if (callback && !_stopFlag && effectiveGen === _audioGen) setTimeout(callback, 50); };
    audio.onerror = function() { if (effectiveGen !== _audioGen) return; speakFallback(text, callback, rate, _audioGen); };

    var p = audio.play();
    if (p && p.catch) p.catch(function() {
      // 重试播放（解决网络延迟 / 浏览器 autoplay 拒绝）
      setTimeout(function() {
        var p2 = audio.play();
        if (p2 && p2.catch) p2.catch(function() {
          setTimeout(function() {
            var p3 = audio.play();
            if (p3 && p3.catch) p3.catch(function() {
              setTimeout(function() {
                var p4 = audio.play();
                if (p4 && p4.catch) p4.catch(function() {
                  // 4次重试都失败，才降级到 TTS
                  if (effectiveGen !== _audioGen) return;
                  speakFallback(text, callback, rate, _audioGen);
                });
              }, 300);
            });
          }, 200);
        });
      }, 200);
    });
  }

  // ===== SpeechSynthesis 降级 =====
  var _ttsResumeTimer = null;
  function _ttsKeepAlive() {
    // Chrome bug: speechSynthesis 超时自动停止。用定时器周期性 resume 保活。
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.resume();
    }
  }
  function _ttsStartKeepAlive() {
    _ttsStopKeepAlive();
    _ttsResumeTimer = setInterval(_ttsKeepAlive, 3000);
  }
  function _ttsStopKeepAlive() {
    if (_ttsResumeTimer) { clearInterval(_ttsResumeTimer); _ttsResumeTimer = null; }
  }

  function speakFallback(text, callback, rate, gen) {
    if (_stopFlag) { if (callback) setTimeout(callback, 50); return; }
    if (!window.speechSynthesis) { if (callback) setTimeout(callback, 50); return; }

    // Chrome bug: 必须 resume + 延迟 cancel，否则连续发音会卡死
    window.speechSynthesis.resume();
    setTimeout(function() {
      window.speechSynthesis.cancel();
    }, 10);

    if (!selectedVoice) {
      selectBestVoice();
      if (!selectedVoice && window.speechSynthesis.getVoices) {
        var voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          var zhVoices = voices.filter(function(v) { return v.lang && v.lang.startsWith('zh'); });
          if (zhVoices.length > 0) {
            var best = zhVoices.find(function(v) { return v.localService && /female|nv|女/i.test(v.name); })
              || zhVoices.find(function(v) { return v.localService; })
              || zhVoices.find(function(v) { return /female|nv|女/i.test(v.name); })
              || zhVoices[0];
            selectedVoice = best;
          }
        }
      }
    }

    // Chrome bug 兜底：onend 有时不触发，加超时检测
    var calledBack = false;
    var timeoutId = null;
    function doCallback() {
      if (calledBack) return;
      calledBack = true;
      _ttsStopKeepAlive();
      if (timeoutId) clearTimeout(timeoutId);
      if (callback && gen === _audioGen) setTimeout(callback, 50);
    }

    var utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = rate || 0.95;
    utterance.volume = 1.0;
    if (selectedVoice) utterance.voice = selectedVoice;

    utterance.onend = function() { doCallback(); };
    utterance.onerror = function(e) {
      // Chrome 在某些情况下报 "interrupted" 错误（属于正常流程），不阻塞
      if (e.error === 'interrupted' || e.error === 'canceled') {
        doCallback();
      } else {
        doCallback();
      }
    };

    // 超时兜底：文本长度 × 300ms/字 + 5 秒缓冲
    var maxMs = Math.max(5000, text.length * 300 + 5000);
    timeoutId = setTimeout(doCallback, maxMs);

    _ttsStartKeepAlive();
    window.speechSynthesis.speak(utterance);
  }

  // ===== 播放逻辑 =====
  function _playAudio(text, callback, rate, gen) {
    if (typeof text === 'number') text = String(text);
    if (text.length === 1 && DIGIT_MAP[text]) {
      text = DIGIT_MAP[text];
    }
    if (AUDIO_MAP[text]) {
      playAudioFile(AUDIO_MAP[text], text, callback, rate);
      return;
    }
    var tokens = _tokenize(text);
    if (tokens.length > 0 && !(tokens.length === 1 && tokens[0] === text)) {
      _playAudioSequence(tokens, 0, callback, rate, 30);
    } else {
      speakFallback(text, callback, rate, _audioGen);
    }
  }

  function _playAudioSequence(texts, index, callback, rate, pauseMs) {
    var seqGen = _audioGen;
    if (_stopFlag || seqGen !== _audioGen) { if (callback) setTimeout(callback, 50); return; }
    var pause = (pauseMs !== undefined) ? pauseMs : 30;
    if (index >= texts.length) { if (callback) setTimeout(callback, 50); return; }

    var text = texts[index];
    if (text.length === 1 && DIGIT_MAP[text]) {
      text = DIGIT_MAP[text];
    }
    if (AUDIO_MAP[text]) {
      playAudioFile(AUDIO_MAP[text], text, function() {
        setTimeout(function() {
          _playAudioSequence(texts, index + 1, callback, rate, pauseMs);
        }, pause);
      }, rate);
      return;
    }
    speakFallback(text, function() {
      setTimeout(function() {
        _playAudioSequence(texts, index + 1, callback, rate, pauseMs);
      }, pause);
    }, rate, _audioGen);
  }

  // ===== 智能分词 =====
  var DIGIT_MAP = {
    '0':'零','1':'一','2':'二','3':'三','4':'四',
    '5':'五','6':'六','7':'七','8':'八','9':'九'
  };

  function _tokenize(text) {
    if (!text || text.length === 0) return [];
    var segments = [];
    var i = 0;
    var ttsBuffer = '';

    function flushTTS() {
      if (ttsBuffer.length > 0) {
        segments.push(ttsBuffer);
        ttsBuffer = '';
      }
    }

    while (i < text.length) {
      var matched = false;
      for (var len = Math.min(10, text.length - i); len >= 1; len--) {
        var sub = text.substr(i, len);
        if (AUDIO_MAP[sub]) {
          flushTTS();
          segments.push(sub);
          i += len;
          matched = true;
          break;
        }
      }
      if (matched) continue;
      var ch = text.charAt(i);
      if (DIGIT_MAP[ch]) {
        flushTTS();
        segments.push(DIGIT_MAP[ch]);
        i++;
        continue;
      }
      ttsBuffer += ch;
      i++;
    }
    flushTTS();
    return segments;
  }

  // ===== 停止播放 =====
  window.stopAllAudio = function() {
    _stopFlag = true;
    _audioGen++;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (_currentAudio) {
      try { _currentAudio.pause(); _currentAudio.currentTime = 0; } catch(e) {}
      _currentAudio = null;
    }
  };

  // ===== 公开API =====
  window.playAudio = function(text, callback, rate) {
    _stopFlag = false;
    var gen = _audioGen;
    _playAudio(text, callback, rate, gen);
  };

  window.playAudioSequence = function(texts, index, callback, rate, pauseMs) {
    _stopFlag = false;
    var gen = _audioGen;
    _playAudioSequence(texts, index, callback, rate, pauseMs, gen);
  };

  window.onAudioReady = function(cb) {
    cb();
  };

  // ===== 初始化 =====
  setTimeout(selectBestVoice, 500);
  if (window.speechSynthesis && speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = selectBestVoice;
  }
})();
