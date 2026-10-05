import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  COORDINATOR: "coordinator",
  DESIGNER: "designer",
  PRESENTER: "presenter",
};

export const SELF_SIGNUP_ROLES = [
  ROLES.MANAGER,
  ROLES.COORDINATOR,
  ROLES.DESIGNER,
  ROLES.PRESENTER,
];

const cleanEmail = (value) => (value || "").trim().toLowerCase();
const cleanName = (value) => (value || "").trim();

export const registerUser = async (param1, param2, param3, param4) => {
  // Backward-compatible with the two calling styles used by the old UI:
  // registerUser(name, email, password, role)
  // registerUser(email, password, name, role)
  let name;
  let email;
  let password;
  let role;

  if (typeof param1 === "string" && param1.includes("@")) {
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

  const cleanNameValue = cleanName(name);
  const cleanEmailValue = cleanEmail(email);
  const cleanRole = (role || "").trim().toLowerCase();

  if (!cleanNameValue) {
    return { success: false, error: "الاسم مطلوب." };
  }

  if (!SELF_SIGNUP_ROLES.includes(cleanRole)) {
    return { success: false, error: "الدور المختار غير مسموح بالتسجيل الذاتي." };
  }

  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      cleanEmailValue,
      password
    );

    const firebaseUser = credential.user;

    await setDoc(doc(db, "users", firebaseUser.uid), {
      uid: firebaseUser.uid,
      name: cleanNameValue,
      email: cleanEmailValue,
      role: cleanRole,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // الحساب أنشئ في Firebase Auth لكنه لا يملك صلاحية دخول للنظام
    // حتى يوافق الـ Admin.
    await signOut(auth);

    return {
      success: true,
      message: "تم إرسال طلب إنشاء الحساب بنجاح! في انتظار موافقة الأدمن.",
    };
  } catch (error) {
    let friendlyMessage = "حدث خطأ أثناء إنشاء الحساب.";

    if (error.code === "auth/email-already-in-use") {
      friendlyMessage = "هذا البريد الإلكتروني مسجل بالفعل.";
    } else if (error.code === "auth/weak-password") {
      friendlyMessage = "كلمة المرور ضعيفة (6 أحرف على الأقل).";
    } else if (error.code === "auth/invalid-email") {
      friendlyMessage = "صيغة البريد الإلكتروني غير صحيحة.";
    }

    return { success: false, error: friendlyMessage };
  }
};

export const loginUser = async (email, password) => {
  const cleanEmailValue = cleanEmail(email);

  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      cleanEmailValue,
      password
    );

    const firebaseUser = credential.user;
    const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

    if (!userDoc.exists()) {
      await signOut(auth);
      return {
        success: false,
        error: "بيانات المستخدم غير موجودة في النظام.",
      };
    }

    const userData = userDoc.data();

    if (userData.status !== "active") {
      await signOut(auth);
      return {
        success: false,
        error: "حسابك ما زال معلقاً في انتظار موافقة الأدمن.",
      };
    }

    const sessionUser = {
      ...userData,
      uid: firebaseUser.uid,
      id: firebaseUser.uid,
    };

    return { success: true, user: sessionUser };
  } catch (error) {
    if (
      error.code === "auth/user-not-found" ||
      error.code === "auth/wrong-password" ||
      error.code === "auth/invalid-credential"
    ) {
      return {
        success: false,
        error: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
      };
    }

    return {
      success: false,
      error: "بيانات الدخول غير صحيحة أو حدث خطأ.",
    };
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    localStorage.removeItem("ostudio_user");
    localStorage.removeItem("ostudio_active_project");
    localStorage.removeItem("ostudio_coord_active_proj");
    localStorage.removeItem("ostudio_designer_active_proj");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
