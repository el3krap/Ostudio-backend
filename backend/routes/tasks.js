const router = require('express').Router();
const Task = require('../models/Task');

// إنشاء مهمة
router.post('/create', async (req, res) => {
    try {
        const { title, description, assignedTo, deadline } = req.body;
        const newTask = new Task({ title, description, assignedTo, deadline });
        await newTask.save();
        res.status(201).json({ message: 'تم إسناد المهمة بنجاح!', task: newTask });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// جلب مهام مستخدم
router.get('/user/:userId', async (req, res) => {
    try {
        const tasks = await Task.find({ assignedTo: req.params.userId });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// تحديث المهمة
router.put('/update-status/:id', async (req, res) => {
    try {
        const { status, fileLink, notes } = req.body;
        const updateData = {};
        if (status) updateData.status = status;
        if (fileLink !== undefined) updateData.fileLink = fileLink;
        if (notes !== undefined) updateData.notes = notes;

        const updatedTask = await Task.findByIdAndUpdate(
            req.params.id, 
            updateData, 
            { new: true }
        );
        res.json({ message: 'تم تحديث المهمة بنجاح', task: updatedTask });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;