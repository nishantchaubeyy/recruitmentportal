const prisma = require('../services/prisma');
const { logAuditAction } = require('../services/auditService');

/**
 * GET /api/admin/panels
 * List all interview panels with member counts and panel members
 */
async function getAllPanels(req, res) {
  try {
    const panels = await prisma.interviewPanel.findMany({
      include: {
        members: {
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: {
            members: true,
            interviews: true
          }
        }
      },
      orderBy: { code: 'asc' }
    });

    const formatted = panels.map(p => ({
      ...p,
      membersCount: p._count.members,
      activeMembersCount: p.members.filter(m => m.isActive).length,
      interviewsCount: p._count.interviews
    }));

    return res.json(formatted);
  } catch (error) {
    console.error('Fetch panels error:', error);
    return res.status(500).json({ error: 'Failed to retrieve interview panels.' });
  }
}

/**
 * GET /api/admin/panels/:id
 */
async function getPanelById(req, res) {
  const { id } = req.params;
  try {
    const panel = await prisma.interviewPanel.findUnique({
      where: { id },
      include: {
        members: {
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: {
            members: true,
            interviews: true
          }
        }
      }
    });

    if (!panel) {
      return res.status(404).json({ error: 'Interview panel not found.' });
    }

    return res.json({
      ...panel,
      membersCount: panel._count.members,
      activeMembersCount: panel.members.filter(m => m.isActive).length
    });
  } catch (error) {
    console.error('Fetch panel error:', error);
    return res.status(500).json({ error: 'Failed to retrieve panel.' });
  }
}

/**
 * POST /api/admin/panels
 * Create a new interview panel
 */
async function createPanel(req, res) {
  const { name, code, description } = req.body;

  if (!name || !code) {
    return res.status(400).json({ error: 'Panel name and unique code are required.' });
  }

  try {
    const existing = await prisma.interviewPanel.findUnique({
      where: { code: code.trim().toUpperCase() }
    });

    if (existing) {
      return res.status(400).json({ error: `Panel with code "${code}" already exists.` });
    }

    const panel = await prisma.interviewPanel.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description?.trim() || null
      },
      include: { members: true }
    });

    if (req.user) {
      logAuditAction(req.user.id, 'CREATE_PANEL', 'InterviewPanel', panel.id, null, JSON.stringify(panel), req.ip);
    }

    return res.status(201).json(panel);
  } catch (error) {
    console.error('Create panel error:', error);
    return res.status(500).json({ error: 'Failed to create panel.' });
  }
}

/**
 * PUT /api/admin/panels/:id
 * Update panel metadata
 */
async function updatePanel(req, res) {
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    const panel = await prisma.interviewPanel.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        description: description !== undefined ? description?.trim() : undefined
      },
      include: { members: true }
    });

    return res.json(panel);
  } catch (error) {
    console.error('Update panel error:', error);
    return res.status(500).json({ error: 'Failed to update panel.' });
  }
}

/**
 * POST /api/admin/panels/:id/members
 * Add a panelist to a panel
 */
async function addPanelMember(req, res) {
  const { id: panelId } = req.params;
  const { name, email, phone, designation } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Panelist name and email are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const panel = await prisma.interviewPanel.findUnique({ where: { id: panelId } });
    if (!panel) {
      return res.status(404).json({ error: 'Panel not found.' });
    }

    const existingMember = await prisma.panelMember.findUnique({
      where: {
        panelId_email: {
          panelId,
          email: cleanEmail
        }
      }
    });

    if (existingMember) {
      return res.status(400).json({ error: `A panelist with email ${cleanEmail} already exists in ${panel.name}.` });
    }

    const member = await prisma.panelMember.create({
      data: {
        panelId,
        name: name.trim(),
        email: cleanEmail,
        phone: phone?.trim() || null,
        designation: designation?.trim() || null,
        isActive: true
      }
    });

    return res.status(201).json(member);
  } catch (error) {
    console.error('Add panel member error:', error);
    return res.status(500).json({ error: 'Failed to add panelist.' });
  }
}

/**
 * PUT /api/admin/panels/members/:memberId
 * Update panelist details
 */
async function updatePanelMember(req, res) {
  const { memberId } = req.params;
  const { name, email, phone, designation, isActive } = req.body;

  try {
    const data = {};
    if (name) data.name = name.trim();
    if (email) data.email = email.trim().toLowerCase();
    if (phone !== undefined) data.phone = phone ? phone.trim() : null;
    if (designation !== undefined) data.designation = designation ? designation.trim() : null;
    if (typeof isActive === 'boolean') data.isActive = isActive;

    const member = await prisma.panelMember.update({
      where: { id: memberId },
      data
    });

    return res.json(member);
  } catch (error) {
    console.error('Update panel member error:', error);
    return res.status(500).json({ error: 'Failed to update panelist.' });
  }
}

/**
 * PATCH /api/admin/panels/members/:memberId/toggle-status
 * Toggle panelist active / deactivated status
 */
async function togglePanelMemberStatus(req, res) {
  const { memberId } = req.params;

  try {
    const current = await prisma.panelMember.findUnique({ where: { id: memberId } });
    if (!current) {
      return res.status(404).json({ error: 'Panel member not found.' });
    }

    const updated = await prisma.panelMember.update({
      where: { id: memberId },
      data: { isActive: !current.isActive }
    });

    return res.json(updated);
  } catch (error) {
    console.error('Toggle panel member status error:', error);
    return res.status(500).json({ error: 'Failed to toggle status.' });
  }
}

/**
 * DELETE /api/admin/panels/members/:memberId
 * Delete panelist
 */
async function deletePanelMember(req, res) {
  const { memberId } = req.params;

  try {
    await prisma.panelMember.delete({ where: { id: memberId } });
    return res.json({ message: 'Panel member removed successfully.' });
  } catch (error) {
    console.error('Delete panel member error:', error);
    return res.status(500).json({ error: 'Failed to remove panel member.' });
  }
}

module.exports = {
  getAllPanels,
  getPanelById,
  createPanel,
  updatePanel,
  addPanelMember,
  updatePanelMember,
  togglePanelMemberStatus,
  deletePanelMember
};
