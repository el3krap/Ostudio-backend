
import { auth } from './firebase';

/* =========================================================
   API Configuration
========================================================= */

const API_BASE_URL = (
    import.meta.env.VITE_API_URL ||
    'http://localhost:8080/api'
).replace(/\/+$/, '');

/* =========================================================
   Authentication
========================================================= */

async function getAuthToken() {
    // Wait until Firebase restores the authentication session.
    await auth.authStateReady();

    const currentUser = auth.currentUser;

    if (!currentUser) {
        throw new Error('المستخدم غير مسجل الدخول.');
    }

    return await currentUser.getIdToken();
}

/* =========================================================
   Upload Project Brief
========================================================= */

export async function uploadProjectBrief(file) {
    // Validate selected file
    if (
        !file ||
        typeof file !== 'object' ||
        typeof file.name !== 'string'
    ) {
        throw new Error('اختار ملف Brief صالحًا قبل الرفع.');
    }

    // Get Firebase ID Token
    const token = await getAuthToken();

    // Prepare multipart form data
    const formData = new FormData();
    formData.append('file', file);

    // Send file to Backend
    const response = await fetch(
        `${API_BASE_URL}/manager/projects/upload-brief`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        }
    );

    // Parse response
    let data = null;

    try {
        data = await response.json();
    } catch {
        data = null;
    }

    // Handle errors
    if (!response.ok) {
        const error = new Error(
            data?.message ||
            data?.error ||
            `فشل رفع الملف (HTTP ${response.status}).`
        );

        error.status = response.status;
        error.data = data;

        throw error;
    }

    // Validate returned file URL
    if (!data?.url) {
        throw new Error(
            'تم استلام رد من السيرفر، لكن رابط الملف غير موجود.'
        );
    }

    // Return normalized file information
    return {
        url: data.url,
        fileName: data.fileName || file.name,
        mimeType: data.mimeType || file.type || '',
        size: data.size ?? file.size,
    };
}

/* =========================================================
   Default Export
========================================================= */

const uploadService = {
    uploadProjectBrief,
};

export default uploadService;
