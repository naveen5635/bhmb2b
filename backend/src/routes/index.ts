import { Router } from 'express';
import authRoutes from './auth.routes';
import customerRoutes from './customer.routes';
import articleRoutes from './article.routes';
import orderRoutes from './order.routes';
import labelRoutes from './label.routes';
import dashboardRoutes from './dashboard.routes';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Public routes (auth handles its own protection internally)
router.use('/auth', authRoutes);

// Protected resource routes (authMiddleware applied again in each sub-router,
// but also set here as a belt-and-suspenders approach for the index level)
router.use('/customers', authMiddleware, customerRoutes);
router.use('/articles', authMiddleware, articleRoutes);
router.use('/orders', authMiddleware, orderRoutes);
router.use('/labels', authMiddleware, labelRoutes);
router.use('/dashboard', authMiddleware, dashboardRoutes);

export default router;
