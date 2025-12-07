import { Router } from 'express';
import { consoleLogger } from '../../utils/console-logger.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

    const logs = consoleLogger.getLogs(limit, offset);

    res.json({
      success: true,
      data: logs,
      total: consoleLogger.getStats().totalLogs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch logs'
    });
  }
});

router.get('/recent', (req, res) => {
  try {
    const count = req.query.count ? parseInt(req.query.count as string) : 100;
    const logs = consoleLogger.getRecentLogs(count);

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent logs'
    });
  }
});

router.get('/stats', (req, res) => {
  try {
    const stats = consoleLogger.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats'
    });
  }
});

router.delete('/clear', (req, res) => {
  try {
    consoleLogger.clearLogs();

    res.json({
      success: true,
      message: 'Logs cleared successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to clear logs'
    });
  }
});

export default router;
