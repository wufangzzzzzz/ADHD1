const express = require('express');
const path = require('path');
const { TTSClient, Config, HeaderUtils } = require('coze-coding-dev-sdk');

const app = express();
app.use(express.json());

// 静态文件服务
app.use(express.static(path.join(__dirname)));

// TTS 端点
app.post('/api/tts', async (req, res) => {
  try {
    const { text, speaker } = req.body;
    if (!text || !speaker) {
      return res.status(400).json({ error: 'Missing text or speaker' });
    }

    const config = new Config();
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers);
    const client = new TTSClient(config, customHeaders);

    const response = await client.synthesize({
      uid: 'b2-simon-says',
      text,
      speaker,
      audioFormat: 'mp3',
      sampleRate: 24000,
    });

    res.json({ audioUri: response.audioUri });
  } catch (error) {
    console.error('TTS error:', error.message);
    res.status(500).json({ error: 'TTS synthesis failed' });
  }
});

const port = parseInt(process.env.DEPLOY_RUN_PORT || '5000', 10);
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
