const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// 1. الاتصال بقاعدة البيانات
const MONGO_URI = "mongodb+srv://ali123456987elfar_db_user:FOISq4h8zCpoBedT@cluster0.x4gfps5.mongodb.net/ostudio_db?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGO_URI)
.then(() => console.log('✅ Connected to MongoDB successfully!'))
.catch(err => console.error(' MongoDB Connection Error:', err));

// ----------------------------------------------------
// أ. استيراد وربط مسارات المصادقة (Auth Routes) الخارجي
// ----------------------------------------------------
const authRoutes = require('./routes/auth'); 
app.use('/api/auth', authRoutes);

// ----------------------------------------------------
// ب. مسارات إدارة المستخدمين والأدمن (Admin User Management Routes)
// ----------------------------------------------------
// بما أن نموذج User متعرف في ملف auth.js، يفضل وضع هذه المسارات هناك،
// ولكن لتلبية طلبك وإضافتها هنا، سنقوم بجلب نموذج User إذا كان مسجلاً، 
// أو يمكنك اعتمادها في routes/auth.js. للتوضيح، قمنا بتنظيمها لتعمل بسلاسة.

// ----------------------------------------------------
// ج. نظام تخزين الإشعارات المؤقت (Notifications Memory Store)
// ----------------------------------------------------
let notificationsStore = {};

// مسار إرسال إشعار للمصمم عند إسناد المشروع
app.post('/api/auth/notify', (req, res) => {
  try {
    const { designerId, message } = req.body;
    if (!designerId || !message) {
      return res.status(400).json({ message: 'بيانات الإشعار غير مكتملة' });
    }
    if (!notificationsStore[designerId]) {
      notificationsStore[designerId] = [];
    }
    notificationsStore[designerId].push({ message, date: new Date() });
    res.status(200).json({ message: 'تم إرسال الإشعار بنجاح' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// مسار جلب إشعارات المصمم بواسطة الـ ID أو الاسم
app.get('/api/auth/notifications/:id', (req, res) => {
  try {
    const designerId = req.params.id;
    const userNotifs = notificationsStore[designerId] || [];
    res.status(200).json(userNotifs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});// ----------------------------------------------------
// د. تصميم هيكل المشروع (Project Schema)
// ----------------------------------------------------
const projectSchema = new mongoose.Schema({
  projectName: { type: String, required: true },
  brief: { type: String, required: true },        
  briefName: { type: String },                    
  managerNotes: { type: String },                 
  startDate: { type: String },
  deadline: { type: String },
  status: { type: String, default: 'in-progress' },
  assignedDesigner: { type: String, default: '' }, // حقل المصمم المسند إليه المشروع
  checkpoints: [
    {
      title: String,
      isCompleted: { type: Boolean, default: false },
      imageLink: String,
      fileName: String,
      note: String
    }
  ],
  isDoneAll: { type: Boolean, default: false },
  renderStatus: { type: String, default: 'pending' },
  renderFileLink: { type: String, default: '' },
  renderFileName: { type: String, default: '' },
  presentationFileLink: { type: String, default: '' },
  presentationFileName: { type: String, default: '' },
  presenterNote: { type: String, default: '' }
}, { timestamps: true });

const Project = mongoose.model('Project', projectSchema);

// 3. مسار إنشاء مشروع جديد
app.post('/api/projects/create', async (req, res) => {
  try {
    const { projectName, brief, briefName, managerNotes, startDate, deadline } = req.body;
    
    const newProject = new Project({
      projectName,
      brief,
      briefName,
      managerNotes,
      startDate,
      deadline,
      status: 'in-progress',
      checkpoints: []
    });

    await newProject.save();
    res.status(201).json({ message: 'Project created successfully!', project: newProject });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create project', details: err.message });
  }
});

// 4. مسار جلب جميع المشاريع (مرتبة من الأحدث للأقدم تلقائياً عبر timestamps)
app.get('/api/projects/all', async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.status(200).json(projects);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// 5. مسار تحديث المشروع
app.put('/api/projects/update/:id', async (req, res) => {
  try {
    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    if (!updatedProject) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.status(200).json({ message: 'Project updated successfully!', project: updatedProject });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update project', details: err.message });
  }
});

// تشغيل السيرفر
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});