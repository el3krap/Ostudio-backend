const router = require('express').Router();
const Project = require('../models/Project');

// 1. إنشاء مشروع جديد (خاص بالمدير - New Project)
router.post('/create', async (req, res) => {
    try {
        const { projectName, brief, managerNotes } = req.body;
        const newProject = new Project({
            projectName,
            brief,
            managerNotes,
            checkpoints: [
                { title: 'التصميم الأولي' },
                { title: 'التعديلات' },
                { title: 'التصميم النهائي' }
            ]
        });
        await newProject.save();
        res.status(201).json({ message: 'تم إنشاء المشروع بنجاح!', project: newProject });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. جلب جميع المشاريع (لأحدث مشروع يظهر للمدير والمنسق)
router.get('/all', async (req, res) => {
    try {
        const projects = await Project.find().sort({ createdAt: -1 }).populate('assignedPresenter');
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. تحديث تفاصيل المشروع (بواسطة الـ Coordinator)
router.put('/update/:id', async (req, res) => {
    try {
        const updated = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ message: 'تم تحديث تفاصيل المشروع بنجاح', project: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;