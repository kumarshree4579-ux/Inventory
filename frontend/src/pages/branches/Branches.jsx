import { useState, useEffect } from 'react';
import {
  Chip, Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Grid, MenuItem, Select, FormControl, InputLabel,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import ListPage from '../../components/common/ListPage';
import { branchesAPI, usersAPI } from '../../api/services';
import toast from 'react-hot-toast';

const columns = [
  { field: 'name', headerName: 'Branch Name', flex: 1.2 },
  { field: 'code', headerName: 'Code', flex: 0.7 },
  { field: 'city', headerName: 'City', flex: 1 },
  { field: 'phone', headerName: 'Phone', flex: 1 },
  { field: 'manager', headerName: 'Manager', flex: 1, renderCell: ({ value }) => value?.name || '—' },
  { field: 'status', headerName: 'Status', flex: 0.7, renderCell: ({ value }) => <Chip label={value} size="small" color={value === 'active' ? 'success' : 'default'} /> },
];

const BranchForm = ({ open, onClose, onSaved, editing }) => {
  const { register, handleSubmit, reset, control, formState: { isSubmitting } } = useForm();
  const [managers, setManagers] = useState([]);

  useEffect(() => {
    if (!open) return;
    usersAPI.getAll({ limit: 100, status: 'active' })
      .then(r => setManagers(r.data.data || []))
      .catch(() => {});
    reset(editing
      ? { ...editing, manager: editing.manager?._id || editing.manager || '' }
      : { status: 'active' }
    );
  }, [open, editing]);

  const onSubmit = async (data) => {
    try {
      // remove empty manager so it doesn't overwrite with empty string
      if (!data.manager) delete data.manager;
      if (editing) await branchesAPI.update(editing._id, data);
      else await branchesAPI.create(data);
      toast.success(editing ? 'Branch updated' : 'Branch created');
      onClose(); onSaved();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>{editing ? 'Edit Branch' : 'Add Branch'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={8}><TextField fullWidth label="Branch Name" {...register('name', { required: true })} /></Grid>
            <Grid item xs={4}><TextField fullWidth label="Code" {...register('code', { required: true })} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Address" {...register('address')} /></Grid>
            <Grid item xs={4}><TextField fullWidth label="City" {...register('city')} /></Grid>
            <Grid item xs={4}><TextField fullWidth label="State" {...register('state')} /></Grid>
            <Grid item xs={4}><TextField fullWidth label="Pincode" {...register('pincode')} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Phone" {...register('phone')} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Email" {...register('email')} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="GST Number" {...register('gstNumber')} /></Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Manager</InputLabel>
                <Controller name="manager" control={control} defaultValue="" render={({ field }) => (
                  <Select {...field} label="Manager">
                    <MenuItem value=""><em>None</em></MenuItem>
                    {managers.map(u => <MenuItem key={u._id} value={u._id}>{u.name}</MenuItem>)}
                  </Select>
                )} />
              </FormControl>
            </Grid>
            {editing && (
              <Grid item xs={6}>
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
          <Button type="submit" variant="contained" disabled={isSubmitting}>{editing ? 'Update' : 'Create'} Branch</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

const Branches = () => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [refresh, setRefresh] = useState(0);

  const handleClose = () => { setOpen(false); setEditing(null); };

  return (
    <>
      <ListPage key={refresh} title="Branches" subtitle="Manage store branches"
        columns={columns} api={branchesAPI} addLabel="Add Branch"
        onAdd={() => { setEditing(null); setOpen(true); }}
        onEdit={(row) => { setEditing(row); setOpen(true); }}
      />
      <BranchForm open={open} onClose={handleClose} onSaved={() => setRefresh(r => r + 1)} editing={editing} />
    </>
  );
};

export default Branches;
