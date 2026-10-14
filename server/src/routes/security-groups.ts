// routes/security-groups.ts
// Security Group firewall management, rule mutation, and packet testing simulation

import { Router, Request, Response } from 'express';
import {
  getAllSecurityGroups,
  getSecurityGroupById,
  createSecurityGroup,
  updateSecurityGroup,
  deleteSecurityGroup,
  addSecurityGroupRule,
  removeSecurityGroupRule,
} from '../db';
import { generateSgId, generateRuleId } from '../services/id-generator';
import { evaluatePacket } from '../services/firewall';
import type {
  SecurityGroup,
  SecurityGroupRule,
  CreateSecurityGroupRequest,
  FirewallTestRequest,
} from '@shared/types';

export const securityGroupsRouter = Router();

// GET /api/security-groups – list all
securityGroupsRouter.get('/', (_req: Request, res: Response) => {
  try {
    const groups = getAllSecurityGroups();
    res.json({ success: true, data: groups });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/security-groups/:id – get single group with rules
securityGroupsRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const sg = getSecurityGroupById((req.params.id as string));
    if (!sg) return res.status(404).json({ success: false, error: 'Security group not found' });
    res.json({ success: true, data: sg });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/security-groups – create new security group
securityGroupsRouter.post('/', (req: Request, res: Response) => {
  try {
    const body: CreateSecurityGroupRequest = req.body;
    if (!body.name || !body.name.trim()) {
      return res.status(400).json({ success: false, error: 'Security group name is required' });
    }

    const sgId = generateSgId();
    const nowIso = new Date().toISOString();

    createSecurityGroup({
      id: sgId,
      name: body.name.trim(),
      description: body.description || '',
      vpcId: 'vpc-0a1b2c3d4e5f6789',
      createdAt: nowIso,
    });

    // Default outbound rule: allow all
    const outRule: SecurityGroupRule = {
      id: generateRuleId(),
      direction: 'outbound',
      protocol: 'all',
      portRange: 'All',
      cidr: '0.0.0.0/0',
      action: 'ALLOW',
      description: 'Allow all outbound traffic',
      ruleType: 'All Traffic',
    };
    addSecurityGroupRule(sgId, outRule);

    const created = getSecurityGroupById(sgId);
    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/security-groups/:id – update name or description
securityGroupsRouter.put('/:id', (req: Request, res: Response) => {
  try {
    const sg = getSecurityGroupById((req.params.id as string));
    if (!sg) return res.status(404).json({ success: false, error: 'Security group not found' });

    updateSecurityGroup(sg.id, {
      name: req.body.name,
      description: req.body.description,
    });

    const updated = getSecurityGroupById(sg.id);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/security-groups/:id – delete security group
securityGroupsRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    if ((req.params.id as string) === 'sg-default') {
      return res.status(400).json({ success: false, error: 'Cannot delete the default security group' });
    }

    const sg = getSecurityGroupById((req.params.id as string));
    if (!sg) return res.status(404).json({ success: false, error: 'Security group not found' });

    deleteSecurityGroup(sg.id);
    res.json({ success: true, data: { message: `Security group ${sg.name} deleted` } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/security-groups/:id/rules – add rule
securityGroupsRouter.post('/:id/rules', (req: Request, res: Response) => {
  try {
    const sg = getSecurityGroupById((req.params.id as string));
    if (!sg) return res.status(404).json({ success: false, error: 'Security group not found' });

    const ruleData = req.body;
    const rule: SecurityGroupRule = {
      id: generateRuleId(),
      direction: ruleData.direction === 'outbound' ? 'outbound' : 'inbound',
      protocol: ruleData.protocol || 'tcp',
      portRange: ruleData.portRange || '22',
      cidr: ruleData.cidr || '0.0.0.0/0',
      action: ruleData.action === 'DROP' ? 'DROP' : 'ALLOW',
      description: ruleData.description || '',
      ruleType: ruleData.ruleType || 'Custom',
    };

    addSecurityGroupRule(sg.id, rule);
    res.status(201).json({ success: true, data: rule });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/security-groups/:id/rules/:ruleId – remove rule
securityGroupsRouter.delete('/:id/rules/:ruleId', (req: Request, res: Response) => {
  try {
    const sg = getSecurityGroupById((req.params.id as string));
    if (!sg) return res.status(404).json({ success: false, error: 'Security group not found' });

    removeSecurityGroupRule((req.params.ruleId as string));
    res.json({ success: true, data: { message: 'Rule removed' } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/security-groups/test-firewall and test-packet – test firewall rules
const handleFirewallTest = (req: Request, res: Response) => {
  try {
    const body: FirewallTestRequest = req.body;
    if (!body.securityGroupId) {
      return res.status(400).json({ success: false, error: 'securityGroupId is required' });
    }

    const sg = getSecurityGroupById(body.securityGroupId);
    if (!sg) return res.status(404).json({ success: false, error: 'Security group not found' });

    const allRules = [...sg.inboundRules, ...sg.outboundRules];
    const result = evaluatePacket(allRules, body);

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

securityGroupsRouter.post('/test-firewall', handleFirewallTest);
securityGroupsRouter.post('/test-packet', handleFirewallTest);
