import { useState, useEffect } from 'react';
import {
  Box, Chip, IconButton, Tooltip, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, Grid, MenuItem, Select, FormControl, InputLabel,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import LockResetIcon from '@mui/icons-material/LockReset';
import BlockIcon from '@mui/icons-material/Block';
import { useForm, Controller } from 'react-hook-form';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import { usersAPI, rolesAPI, branchesAPI } from '../../api/services';
import toast from 'react-hot-toast';

const UserForm = ({ open, onClose, onSaved, initial }) => {
  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm();
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    if (!open) return;
    rolesAPI.getAll({ limit: 50 }).then(r => setRoles(r.data.data || [])).catch(() => {});
    branchesAPI.getAll({ limit: 50 }).then(r => setBranches(r.data.data || [])).catch(() => {});
    reset(initial
      ? { ...initial, role: initial.role?._id || '', branch: initial.branch?._id || '' }
      : { status: 'active' }
    );
  }, [open]);

  const onSubmit = async (data) => {
    try {
      if (initial?._id) await usersAPI.update(initial._id, data);
      else await usersAPI.create(data);
      toast.success(initial ? 'User updated' : 'User created');
      onClose(); onSaved();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>{initial ? 'Edit User' : 'Add User'}</DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          <Grid container spacing={2}>
            <Grid size={6}>
              <TextField fullWidth size="small" label="Full Name *" {...register('name', { required: 'Name is required' })}
                error={!!errors.name} helperText={errors.name?.message} />
            </Grid>
            <Grid size={6}>
              <TextField fullWidth size="small" label="Username *" {...register('username', { required: 'Username is required' })}
                error={!!errors.username} helperText={errors.username?.message} />
            </Grid>
            <Grid size={6}>
              <TextField fullWidth size="small" label="Email *" type="email" {...register('email', { required: 'Email is required' })}
                error={!!errors.email} helperText={errors.email?.message} />
            </Grid>
            <Grid size={6}>
              <TextField fullWidth size="small" label="Mobile *" {...register('mobile', { required: 'Mobile is required' })}
                error={!!errors.mobile} helperText={errors.mobile?.message} />
            </Grid>
            {!initial && (
              <Grid size={12}>
                <TextField fullWidth size="small" label="Password *" type="password"
                  {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Minimum 6 characters' } })}
                  error={!!errors.password} helperText={errors.password?.message} />
              </Grid>
            )}
            <Grid size={6}>
              <FormControl fullWidth size="small" error={!!errors.role}>
                <InputLabel>Role *</InputLabel>
                <Controller name="role" control={control} defaultValue=""
                  rules={{ required: 'Role is required' }}
                  render={({ field }) => (
                    <Select {...field} label="Role *">
                      {roles.map(r => <MenuItem key={r._id} value={r._id}>{r.name}</MenuItem>)}
                    </Select>
                  )} />
                {errors.role && <Box component="span" sx={{ fontSize: 11, color: 'error.main', mt: 0.5, ml: 1.5 }}>{errors.role.message}</Box>}
              </FormControl>
            </Grid>
            <Grid size={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Branch</InputLabel>
                <Controller name="branch" control={control} defaultValue="" render={({ field }) => (
                  <Select {...field} label="Branch">
                    <MenuItem value=""><em>None (Admin)</em></MenuItem>
                    {branches.map(b => <MenuItem key={b._id} value={b._id}>{b.name}</MenuItem>)}
                  </Select>
                )} />
              </FormControl>
            </Grid>
            {initial && (
              <Grid size={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Controller name="status" control={control} defaultValue="active" render={({ field }) => (
                    <Select {...field} label="Status">
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                    </Select>
                  )} />
                </FormControl>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} variant="outlined">Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>{initial ? 'Update' : 'Create'} User</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

const Users = () => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [resetId, setResetId] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await usersAPI.getAll({ page, limit: pageSize, search });
      setRows(data.data);
      setTotal(data.total);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [page, pageSize, search]);

  const handleResetPassword = async () => {
    if (!newPassword.trim()) return toast.error('Enter a new password');
    try {
      await usersAPI.resetPassword(resetId, { password: newPassword });
      toast.success('Password reset successfully');
      setResetId(null); setNewPassword('');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleToggle = async (id) => {
    try {
      await usersAPI.toggleStatus(id);
      toast.success('Status updated');
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const columns = [
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'username', headerName: 'Username', flex: 1 },
    { field: 'email', headerName: 'Email', flex: 1.5 },
    { field: 'mobile', headerName: 'Mobile', flex: 1 },
    { field: 'role', headerName: 'Role', flex: 1, renderCell: ({ value }) => value?.name || '-' },
    { field: 'branch', headerName: 'Branch', flex: 1, renderCell: ({ value }) => value?.name || '-' },
    { field: 'status', headerName: 'Status', flex: 0.7, renderCell: ({ value }) => <Chip label={value} size="small" color={value === 'active' ? 'success' : 'default'} /> },
    {
      field: 'actions', headerName: '', flex: 0.8, sortable: false,
      renderCell: ({ row }) => (
        <>
          <Tooltip title="Edit"><IconButton size="small" onClick={() => { setEditing(row); setFormOpen(true); }}><EditIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Reset Password"><IconButton size="small" onClick={() => { setResetId(row._id); setNewPassword(''); }}><LockResetIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Toggle Status"><IconButton size="small" color="warning" onClick={() => handleToggle(row._id)}><BlockIcon fontSize="small" /></IconButton></Tooltip>
        </>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader title="Users" action="Add User" onAction={() => { setEditing(null); setFormOpen(true); }} />
      <Box sx={{ mb: 2 }}>
        <TextField size="small" placeholder="Search users..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} sx={{ width: 300 }} />
      </Box>
      <DataTable rows={rows} columns={columns} loading={loading} total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      <UserForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={fetchUsers} initial={editing} />

      <Dialog open={!!resetId} onClose={() => setResetId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField fullWidth label="New Password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setResetId(null)} variant="outlined">Cancel</Button>
          <Button variant="contained" onClick={handleResetPassword}>Reset</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Users;
