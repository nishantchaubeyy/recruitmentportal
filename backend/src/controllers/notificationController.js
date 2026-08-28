const prisma = require('../services/prisma');

/**
 * Get notifications for the current authenticated user.
 */
async function getNotifications(req, res) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(notifications);
  } catch (error) {
    console.error('Fetch notifications error:', error);
    return res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
}

/**
 * Mark a specific notification as read.
 */
async function markAsRead(req, res) {
  const { id } = req.params;

  try {
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    if (notification.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });

    return res.json({ message: 'Notification marked as read.', notification: updated });
  } catch (error) {
    console.error('Update notification error:', error);
    return res.status(500).json({ error: 'Failed to update notification.' });
  }
}

module.exports = {
  getNotifications,
  markAsRead
};
