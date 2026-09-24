const CLOUD_NAME = "xc5fhsh3";
const UPLOAD_PRESET = "ostudio_preset";

export const uploadToCloudinary = async (file) => {
  if (!file) return null;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  // auto تتيح رفع الصور والفيديوهات والملفات (PDF وغيرها)
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "فشل رفع الملف إلى Cloudinary");
  }

  const data = await response.json();
  return {
    url: data.secure_url,
    originalName: file.name
  };
};