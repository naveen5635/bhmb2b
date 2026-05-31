import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';

const dashboardService = new DashboardService();

export class DashboardController {
  async getStats(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const stats = await dashboardService.getStats();
      res.json(stats);
    } catch (err) {
      next(err);
    }
  }

  async getCharts(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { startDate, endDate } = req.query as {
        startDate?: string;
        endDate?: string;
      };
      const charts = await dashboardService.getCharts({ startDate, endDate });
      res.json(charts);
    } catch (err) {
      next(err);
    }
  }
}
