const router = require('express').Router();
const mongoose = require('mongoose');

// تصميم هيكل المستخدم (User Schema) مضافاً إليه مصفوفة الإشعارات
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'designer' },
    status: { type: String, default: 'pending' },
    notifications: [
        {
            message: String,
            date: { type: Date, default: Date.now }
        }
    ]
});

const User = mongoose.model('User', userSchema);

// طلب إنشاء حساب جديد
router.post('/signup-request', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'البريد الإلكتروني مسجل مسبقاً!' });
        }

        const newUser = new User({
            name,
            email,
            password,
            role,
            status: 'pending'
        });

        await newUser.save();
        res.status(201).json({ message: 'تم إرسال طلب إنشاء الحساب للأدمن بنجاح وسيتم مراجعته قريباً.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// تسجيل الدخول
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'المستخدم غير موجود!' });
        }

        if (user.status !== 'active' && user.status !== 'approved') {
            return res.status(403).json({ message: 'حسابك معلق ولم يتم اعتماده من الأدمن بعد.' });
        }

        if (user.password !== password) {
            return res.status(400).json({ message: 'كلمة المرور غير صحيحة!' });
        }

        res.json({ message: 'تم تسجيل الدخول بنجاح', user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// جلب جميع المستخدمين (لإظهار قائمة المصممين للمنسق)
router.get('/users', async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 1. جلب كافة المستخدمين في النظام (مخصص للوحة تحكم الأدمن لإدارة الحسابات)
router.get('/all-users', async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// جلب الطلبات المعلقة
router.get('/pending-requests', async (req, res) => {
    try {
        const pendingUsers = await User.find({ status: 'pending' });
        res.json(pendingUsers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// تفعيل الحساب بواسطة الأدمن
router.put('/approve-user/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id, 
            { status: 'active' }, 
            { new: true }
        );
        if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });
        res.json({ message: 'تم تفعيل الحساب بنجاح!', user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. تعديل بيانات المستخدم (الاسم، الايميل، الدور، الباسورد) بواسطة الأدمن
router.put('/update-user/:id', async (req, res) => {
    try {
        const { name, email, role, password } = req.body;
        const updateData = { name, email, role };
        if (password && password.trim() !== '') {
            updateData.password = password; // تحديث كلمة المرور فقط إذا تم إدخالها
        }
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true }
        );
        if (!updatedUser) return res.status(404).json({ message: 'المستخدم غير موجود' });
        res.json({ message: 'تم تحديث بيانات المستخدم بنجاح', user: updatedUser });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. حذف حساب مستخدم نهائياً
router.delete('/delete-user/:id', async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        if (!deletedUser) return res.status(404).json({ message: 'المستخدم غير موجود' });
        res.json({ message: 'تم حذف الحساب بنجاح' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. رفض أو حذف طلب معلق
router.delete('/reject-user/:id', async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        if (!deletedUser) return res.status(404).json({ message: 'الطلب غير موجود' });
        res.json({ message: 'تم رفض وحذف الطلب بنجاح' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//  إرسال إشعار للمصمم عند إسناد المشروع إليه
router.post('/notify', async (req, res) => {
    try {
        const { designerId, message } = req.body;
        let designer = await User.findById(designerId).catch(() => null);
        if (!designer) {
            designer = await User.findOne({ name: designerId });
        }

        if (!designer) {
            return res.status(404).json({ message: 'المصمم غير موجود' });
        }

        designer.notifications.push({ message });
        await designer.save();

        res.status(200).json({ message: 'تم إرسال الإشعار وحفظه بنجاح' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//  جلب إشعارات المصمم الخاصة به
router.get('/notifications/:id', async (req, res) => {
    try {
        const designerId = req.params.id;
        let designer = await User.findById(designerId).catch(() => null);
        if (!designer) {
            designer = await User.findOne({ name: designerId });
        }

        if (!designer) {
            return res.status(404).json({ message: 'المستخدم غير موجود' });
        }

        res.status(200).json(designer.notifications || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;