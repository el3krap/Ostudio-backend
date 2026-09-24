import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

// 1. دالة إنشاء حساب جديد (Signup Request)
export const registerUser = async (param1, param2, param3, param4) => {
  try {
    // التمييز الذكي لترتيب المدخلات (سواء تم تمرير البريد أولاً أو الاسم أولاً)
    let name, email, password, role;
    if (typeof param1 === 'string' && param1.includes('@')) {
      email = param1;
      password = param2;
      name = param3;
      role = param4;
    } else {
      name = param1;
      email = param2;
      password = param3;
      role = param4;
    }

    // تنظيف المدخلات وضبط الدور (الافتراضي مدير مشاريع manager)
    const cleanEmail = email ? email.trim().toLowerCase() : "";
    const cleanName = name ? name.trim() : "";
    const cleanRole = role ? role.trim().toLowerCase() : "manager";

    const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    const user = userCredential.user;

    const userData = {
      uid: user.uid,
      id: user.uid,
      _id: user.uid,
      name: cleanName,
      email: cleanEmail,
      role: cleanRole, // manager | coordinator | designer | admin
      status: "pending",
      createdAt: serverTimestamp()
    };

    // حفظ المستند داخل Firestore في مجموعة users
    await setDoc(doc(db, "users", user.uid), userData);

    return { 
      success: true, 
      message: "تم إرسال طلب إنشاء الحساب بنجاح! في انتظار موافقة الأدمن." 
    };
  } catch (error) {
    let friendlyMessage = error.message;
    if (error.code === "auth/email-already-in-use") {
      friendlyMessage = "هذا البريد الإلكتروني مسجل بالفعل.";
    } else if (error.code === "auth/weak-password") {
      friendlyMessage = "كلمة المرور ضعيفة (يجب ألا تقل عن 6 أحرف).";
    } else if (error.code === "auth/invalid-email") {
      friendlyMessage = "صيغة البريد الإلكتروني غير صحيحة.";
    }
    return { success: false, error: friendlyMessage };
  }
};

// 2. دالة تسجيل الدخول والتحقق من الصلاحية والتفعيل (Login)
export const loginUser = async (email, password) => {
  try {
    const cleanEmail = email ? email.trim().toLowerCase() : "";
    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    const user = userCredential.user;

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      await signOut(auth);
      return { success: false, error: "بيانات المستخدم غير موجودة في النظام!" };
    }

    const userData = userDoc.data();

    // التحقق من تفعيل الحساب بواسطة الأدمن
    if (userData.status !== "active" && userData.status !== "approved") {
      await signOut(auth);
      return { success: false, error: "حسابك ما زال معلقاً في انتظار موافقة الأدمن." };
    }

    return { success: true, user: userData };
  } catch (error) {
    let friendlyMessage = "بيانات الدخول غير صحيحة أو حدث خطأ.";
    if (
      error.code === "auth/user-not-found" || 
      error.code === "auth/wrong-password" || 
      error.code === "auth/invalid-credential"
    ) {
      friendlyMessage = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
    }
    return { success: false, error: friendlyMessage };
  }
};

// 3. دالة تسجيل الخروج (Logout)
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};