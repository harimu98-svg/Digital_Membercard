import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Konfigurasi client S3 untuk R2 (R2 kompatibel dengan S3 API)[citation:8]
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { contentType, extension } = JSON.parse(event.body);
    
    // Buat nama file unik
    const key = `uploads/${Date.now()}-${crypto.randomUUID()}.${extension || 'jpg'}`;

    // Buat perintah PutObject dengan tipe konten yang diizinkan
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      ContentType: contentType || "image/jpeg",
    });

    // Buat presigned URL yang berlaku selama 5 menit (300 detik)
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        uploadUrl: signedUrl, 
        publicUrl: `https://${process.env.R2_PUBLIC_URL}/${key}` 
      }),
    };
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
