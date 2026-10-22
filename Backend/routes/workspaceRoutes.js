import express from 'express';
import Workspace from '../models/Workspace.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, async (req, res, next) => {
  try {
    let workspaces = await Workspace.find()
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar title');

    if (workspaces.length === 0) {
      // Create a default enterprise workspace
      const defaultWorkspace = await Workspace.create({
        name: 'Core Engineering & Product Workspace',
        description: 'Cross-functional engineering and design sprint collaboration room',
        owner: req.user._id,
        members: [
          { user: req.user._id, role: 'owner' }
        ]
      });
      workspaces = [defaultWorkspace];
    }

    res.json({
      success: true,
      data: workspaces
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', protect, async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const workspace = await Workspace.create({
      name,
      description,
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'owner' }]
    });

    res.status(201).json({
      success: true,
      data: workspace
    });
  } catch (error) {
    next(error);
  }
});

export default router;
