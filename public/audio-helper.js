/**
 * 听知觉训练 - 统一音频播放模块
 * 支持：预生成音频文件 → 智能分词 → SpeechSynthesis
 * 用法：window.playAudio(text, callback, rate)
 *       window.playAudioSequence(texts, index, callback, rate, pauseMs)
 *       window.onAudioReady(callback)
 */
(function() {
  var AUDIO_DIR = '/public/audio/';
  var AUDIO_MAP = {};
  var AUDIO_MAP_LOADED = false;
  var readyCallbacks = [];
  var pendingCalls = [];
  var selectedVoice = null;
  var _stopFlag = false;
  var _currentAudio = null;
  var _audioGen = 0;

  // ===== 映射表加载 =====
  function loadAudioMap() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', AUDIO_DIR + 'audio_map.json?v=' + Date.now(), true);
    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          AUDIO_MAP = JSON.parse(xhr.responseText);
          AUDIO_MAP_LOADED = true;
          // 处理就绪回调
          for (var i = 0; i < readyCallbacks.length; i++) readyCallbacks[i]();
          readyCallbacks = [];
          // 处理积压调用
          for (var j = 0; j < pendingCalls.length; j++) {
            if (pendingCalls[j].type === 'audio') {
              _playAudio(pendingCalls[j].args[0], pendingCalls[j].args[1], pendingCalls[j].args[2], _audioGen);
            } else {
              _playAudioSequence(pendingCalls[j].args[0], pendingCalls[j].args[1], pendingCalls[j].args[2], pendingCalls[j].args[3], pendingCalls[j].args[4], _audioGen);
            }
          }
          pendingCalls = [];
        } catch(e) {
          console.log('Audio map parse error:', e);
          AUDIO_MAP_LOADED = true; // allow fallback to SpeechSynthesis
        }
      }
    };
    xhr.onerror = function() {
      AUDIO_MAP_LOADED = true; // allow fallback
    };
    xhr.send();
  }

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

  // ===== 播放单个音频文件 =====
  function playAudioFile(filename, text, callback, rate, gen) {
    if (_stopFlag) { if (callback) setTimeout(callback, 50); return; }
    var audio = new Audio();
    audio.src = AUDIO_DIR + filename;
    audio.volume = 1.0;
    if (rate && rate !== 1.0) audio.playbackRate = rate;
    _currentAudio = audio;

    audio.onended = function() { if (callback && !_stopFlag && gen === _audioGen) setTimeout(callback, 50); };
    audio.onerror = function() { if (gen !== _audioGen) return; speakFallback(text, callback, rate); };

    var p = audio.play();
    if (p && p.catch) p.catch(function() { speakFallback(text, callback, rate); });
  }

  // ===== SpeechSynthesis 降级 =====
  function speakFallback(text, callback, rate, gen) {
    if (_stopFlag) { if (callback) setTimeout(callback, 50); return; }
    if (!window.speechSynthesis) { if (callback) setTimeout(callback, 50); return; }
    window.speechSynthesis.cancel();

    // 如果没有选中语音，尝试重新获取
    if (!selectedVoice) {
      selectBestVoice();
      // 某些浏览器需要重新获取
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

    var utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = rate || 0.85;
    utterance.volume = 1.0;
    if (selectedVoice) utterance.voice = selectedVoice;

    utterance.onend = function() { if (callback && gen === _audioGen) setTimeout(callback, 50); };
    utterance.onerror = function() { if (callback && gen === _audioGen) setTimeout(callback, 50); };
    window.speechSynthesis.speak(utterance);
  }

  // ===== 播放逻辑 =====
  function _playAudio(text, callback, rate, gen) {
    // number → string（如 1 → '1'），确保后续 DIGIT_MAP 转换生效
    if (typeof text === 'number') text = String(text);
    // 阿拉伯数字 → 中文数字（如 '1'→'一'），确保匹配预录音频
    if (text.length === 1 && DIGIT_MAP[text]) {
      text = DIGIT_MAP[text];
    }
    // 直接匹配完整词 → 播预录音频（音质最好）
    if (AUDIO_MAP[text]) {
      playAudioFile(AUDIO_MAP[text], text, callback, rate, gen);
      return;
    }
    // 分词（音频片段 + TTS 文本段混合，由 _tokenize 保证不丢字）
    var tokens = _tokenize(text);
    if (tokens.length > 0 && !(tokens.length === 1 && tokens[0] === text)) {
      _playAudioSequence(tokens, 0, callback, rate, 30, gen);
    } else {
      speakFallback(text, callback, rate, gen);
    }
  }

  function _playAudioSequence(texts, index, callback, rate, pauseMs, gen) {
    if (_stopFlag || gen !== _audioGen) { if (callback) setTimeout(callback, 50); return; }
    var pause = (pauseMs !== undefined) ? pauseMs : 30;
    if (index >= texts.length) { if (callback) setTimeout(callback, 50); return; }

    var text = texts[index];
    // 阿拉伯数字 → 中文数字映射（如 '2'→'二'），确保匹配预录音频
    if (text.length === 1 && DIGIT_MAP[text]) {
      text = DIGIT_MAP[text];
    }
    // 有预录音频 → 播放音频文件
    if (AUDIO_MAP[text]) {
      playAudioFile(AUDIO_MAP[text], text, function() {
        setTimeout(function() {
          _playAudioSequence(texts, index + 1, callback, rate, pauseMs, gen);
        }, pause);
      }, rate, gen);
      return;
    }
    // 无预录音频 → SpeechSynthesis 朗读（不再分词，由 _tokenize 保证连续文本段）
    speakFallback(text, function() {
      setTimeout(function() {
        _playAudioSequence(texts, index + 1, callback, rate, pauseMs, gen);
      }, pause);
    }, rate, gen);
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
      // 最长匹配（10字符以内）
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
      // 数字映射
      var ch = text.charAt(i);
      if (DIGIT_MAP[ch]) {
        flushTTS();
        segments.push(DIGIT_MAP[ch]);
        i++;
        continue;
      }
      // 未匹配 → 积累到 TTS 缓冲区（不再静默丢弃）
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
    if (!AUDIO_MAP_LOADED) {
      pendingCalls.push({type:'audio', args:[text, callback, rate]});
      return;
    }
    _playAudio(text, callback, rate, gen);
  };

  window.playAudioSequence = function(texts, index, callback, rate, pauseMs) {
    _stopFlag = false;
    var gen = _audioGen;
    if (!AUDIO_MAP_LOADED) {
      pendingCalls.push({type:'sequence', args:[texts, index, callback, rate, pauseMs]});
      return;
    }
    _playAudioSequence(texts, index, callback, rate, pauseMs, gen);
  };

  window.onAudioReady = function(cb) {
    if (AUDIO_MAP_LOADED) { cb(); }
    else { readyCallbacks.push(cb); }
  };

  // ===== 初始化 =====
  loadAudioMap();
  setTimeout(selectBestVoice, 500);
  if (window.speechSynthesis && speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = selectBestVoice;
  }
})();