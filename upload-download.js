const { S3Storage } = require("coze-coding-dev-sdk");
const fs = require("fs");

const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: "",
  secretKey: "",
  bucketName: process.env.COZE_BUCKET_NAME,
  region: "cn-beijing",
});

async function uploadAndGetDownloadUrl() {
  // 读取打包文件
  const filePath = "/workspace/projects/cancellation-train.zip";
  const fileContent = fs.readFileSync(filePath);
  
  // 上传文件
  const key = await storage.uploadFile({
    fileContent: fileContent,
    fileName: "cancellation-train.zip",
    contentType: "application/zip",
  });
  
  console.log("上传成功，Key:", key);
  
  // 生成下载链接（7天有效期）
  const downloadUrl = await storage.generatePresignedUrl({
    key: key,
    expireTime: 604800, // 7天
  });
  
  console.log("\n下载链接:");
  console.log(downloadUrl);
}

uploadAndGetDownloadUrl().catch(console.error);
