import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Grid, Divider, CircularProgress,
  Table, TableBody, TableCell, TableHead, TableRow, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, TextField, FormGroup, FormControlLabel, Checkbox,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import PageHeader from '../../components/common/PageHeader';
import { rolesAPI } from '../../api/services';
import toast from 'react-hot-toast';

const ROLE_DESCRIPTIONS = {
  Owner: 'Full system access — all modules and actions',
  Admin: 'Full access except user deletion and backup',
  Manager: 'Branch operations, approvals, and reports',
  'Stock Manager': 'Inventory management and stock adjustments',
  'Purchase Manager': 'Purchase orders, supplier management',
  Cashier: 'POS billing and basic inventory view',
  Accountant: 'Reports, financial data, read-only access',
  'Warehouse Staff': 'Stock inward/outward operations',
  'Delivery Boy': 'View-only access to orders and inventory',
  Auditor: 'Read and export access across all modules',
};

const ROLE_COLORS = {
  Owner: '#4f46e5', Admin: '#0ea5e9', Manager: '#10b981',
  'Stock Manager': '#f59e0b', 'Purchase Manager': '#8b5cf6',
  Cashier: '#06b6d4', Accountant: '#84cc16',
  'Warehouse Staff': '#f97316', 'Delivery Boy': '#6b7280', Auditor: '#ec4899',
};

const MODULES = ['inventory', 'purchase', 'pos', 'reports', 'users', 'settings'];
const ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'export', 'print'];

const RoleForm = ({ open, onClose, onSaved, allPermissions }) => {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setName(''); setSelected([]); } }, [open]);

  const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleModule = (mod) => {
    const modPerms = allPermissions.filter(p => p.module === mod).map(p => p._id);
    const allSelected = modPerms.every(id => selected.includes(id));
    setSelected(prev => allSelected ? prev.filter(id => !modPerms.includes(id)) : [...new Set([...prev, ...modPerms])]);
  };

  const onSubmit = async () => {
    if (!name.trim()) return toast.error('Role name required');
    setSaving(true);
    try {
      await rolesAPI.create({ name, permissions: selected });
      toast.success('Role created');
      onClose(); onSaved();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Add Role</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <TextField fullWidth label="Role Name" value={name} onChange={e => setName(e.target.value)} sx={{ mb: 3 }} />
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Permissions</Typography>
        {MODULES.map(mod => {
          const modPerms = allPermissions.filter(p => p.module === mod);
          const selectedCount = modPerms.filter(p => selected.includes(p._id)).length;
          return (
            <Box key={mod} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Checkbox size="small" checked={selectedCount === modPerms.length && modPerms.length > 0}
                  indeterminate={selectedCount > 0 && selectedCount < modPerms.length}
                  onChange={() => toggleModule(mod)} />
                <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'capitalize' }}>{mod}</Typography>
                <Chip label={`${selectedCount}/${modPerms.length}`} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
              </Box>
              <FormGroup row sx={{ pl: 4 }}>
                {modPerms.map(p => (
                  <FormControlLabel key={p._id} control={
                    <Checkbox size="small" checked={selected.includes(p._id)} onChange={() => toggle(p._id)} />
                  } label={<Typography variant="caption" sx={{ textTransform: 'capitalize' }}>{p.action}</Typography>} />
                ))}
              </FormGroup>
              <Divider />
            </Box>
          );
        })}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} variant="outlined">Cancel</Button>
        <Button variant="contained" onClick={onSubmit} disabled={saving}>Create Role</Button>
      </DialogActions>
    </Dialog>
  );
};

const Roles = () => {
  const [roles, setRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('cards');
  const [formOpen, setFormOpen] = useState(false);

  const fetchRoles = () => rolesAPI.getAll()
    .then(({ data }) => setRoles(data.data || []))
    .catch(() => toast.error('Failed to load roles'));

  useEffect(() => {
    Promise.all([fetchRoles(), rolesAPI.getPermissions().then(({ data }) => setAllPermissions(data || []))])
      .finally(() => setLoading(false));
  }, []);

  const hasPerm = (role, module, action) =>
    role.permissions?.some(p => p.module === module && p.action === action);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      <PageHeader title="Roles & Permissions" subtitle={`${roles.length} roles defined`} action="Add Role" onAction={() => setFormOpen(true)} />

      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        {['cards', 'matrix'].map(v => (
          <Chip key={v} label={v === 'cards' ? 'Card View' : 'Permission Matrix'}
            onClick={() => setView(v)} color={view === v ? 'primary' : 'default'}
            variant={view === v ? 'filled' : 'outlined'} sx={{ cursor: 'pointer' }} />
        ))}
      </Box>

      {view === 'cards' && (
        <Grid container spacing={2.5}>
          {roles.map(role => (
            <Grid key={role._id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card sx={{ height: '100%', borderTop: `3px solid ${ROLE_COLORS[role.name] || '#4f46e5'}` }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                    <Typography variant="h6" fontWeight={700}>{role.name}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {role.isSystem && <Chip label="System" size="small" color="primary" />}
                      <Chip label={role.status} size="small" color={role.status === 'active' ? 'success' : 'default'} />
                    </Box>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                    {ROLE_DESCRIPTIONS[role.name] || `${role.permissions?.length || 0} permissions`}
                  </Typography>
                  <Divider sx={{ mb: 1.5 }} />
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 1 }}>MODULES ACCESS</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {MODULES.map(mod => {
                      const count = role.permissions?.filter(p => p.module === mod).length || 0;
                      if (!count) return null;
                      return <Chip key={mod} label={`${mod} (${count})`} size="small" variant="outlined" sx={{ textTransform: 'capitalize', fontSize: '0.7rem' }} />;
                    })}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {view === 'matrix' && (
        <Card>
          <CardContent sx={{ p: 0, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, minWidth: 140, bgcolor: '#f8fafc' }}>Role / Permission</TableCell>
                  {MODULES.flatMap(mod => ACTIONS.map(action => (
                    <TableCell key={`${mod}:${action}`} align="center"
                      sx={{ fontSize: '0.65rem', fontWeight: 600, bgcolor: '#f8fafc', minWidth: 52, px: 0.5 }}>
                      <Box sx={{ textTransform: 'capitalize', color: 'text.secondary' }}>{mod}</Box>
                      <Box sx={{ color: 'text.primary' }}>{action}</Box>
                    </TableCell>
                  )))}
                </TableRow>
              </TableHead>
              <TableBody>
                {roles.map((role, i) => (
                  <TableRow key={role._id} sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: ROLE_COLORS[role.name] || '#4f46e5', flexShrink: 0 }} />
                        <Typography variant="body2" fontWeight={600}>{role.name}</Typography>
                      </Box>
                    </TableCell>
                    {MODULES.flatMap(mod => ACTIONS.map(action => (
                      <TableCell key={`${mod}:${action}`} align="center" sx={{ px: 0.5 }}>
                        {hasPerm(role, mod, action) ? <CheckIcon sx={{ fontSize: 14, color: '#10b981' }} /> : <CloseIcon sx={{ fontSize: 12, color: '#e2e8f0' }} />}
                      </TableCell>
                    )))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <RoleForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={fetchRoles} allPermissions={allPermissions} />
    </Box>
  );
};

export default Roles;
