const router = require('express').Router();
const User = require('../models/User');

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

// تسجيل الدخول
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'المستخدم غير موجود!' });
        }

        if (user.status !== 'active') {
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

// جلب جميع المستخدمين
router.all('/all-users', async (req, res) => {
    try {
        const users = await User.find({}, '-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;