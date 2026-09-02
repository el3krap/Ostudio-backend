const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// 1. الاتصال بقاعدة البيانات (إذا كنت تستخدم MongoDB Atlas السحابية، ضع الرابط هنا أو عبر Environment Variables)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ostudio_db';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ Connected to MongoDB successfully!'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// 2. تصميم هيكل المشروع (Project Schema) لضمان تخزين كافة البيانات الدائمة
const projectSchema = new mongoose.Schema({
  projectName: { type: String, required: true },
  brief: { type: String, required: true },        // رابط أو مسار ملف الـ Brief
  briefName: { type: String },                    // اسم الملف الحقيقي للـ Brief
  managerNotes: { type: String },                 // ملاحظات المدير للمصمم
  startDate: { type: String },
  deadline: { type: String },
  status: { type: String, default: 'in-progress' },
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
  presentationFileLink: { type: String, default: '' },
  presenterNote: { type: String, default: '' }
});

const Project = mongoose.model('Project', projectSchema);

// 3. مسار إنشاء مشروع جديد (يحفظ البيانات بشكل دائم)
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
      checkpoints: [
        { title: 'التصميم الأولي', isCompleted: false },
        { title: 'التعديلات', isCompleted: false }
      ]
    });

    await newProject.save();
    res.status(201).json({ message: 'Project created successfully!', project: newProject });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create project', details: err.message });
  }
});

// 4. مسار جلب جميع المشاريع
app.get('/api/projects/all', async (req, res) => {
  try {
    const projects = await Project.find();
    res.status(200).json(projects);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// 5. مسار تحديث المشروع (يحفظ الصور، الـ Render، البرزنتيشن، والحالات بشكل دائم)
app.put('/api/projects/update/:id', async (req, res) => {
  try {
    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true } // يرجع النسخة المحدثة الجديدة
    );

    if (!updatedProject) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.status(200).json({ message: 'Project updated successfully!', project: updatedProject });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update project', details: err.message });
  }
});

// تشغيل السيرفر على البورت الذي يحدده Google Cloud Run أو 8080 محلياً
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});