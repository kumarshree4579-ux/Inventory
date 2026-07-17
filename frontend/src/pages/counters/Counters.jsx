import { useState, useEffect } from 'react';
import {
  Chip, Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Grid, MenuItem, Select, FormControl, InputLabel,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import ListPage from '../../components/common/ListPage';
import { countersAPI, branchesAPI, usersAPI } from '../../api/services';
import toast from 'react-hot-toast';

const columns = [
  { field: 'number', headerName: '#', width: 60 },
  { field: 'name', headerName: 'Counter Name', flex: 1.2 },
  { field: 'branch', headerName: 'Branch', flex: 1, renderCell: ({ value }) => value?.name || '—' },
  { field: 'cashier', headerName: 'Cashier', flex: 1, renderCell: ({ value }) => value?.name || '—' },
  { field: 'openingCash', headerName: 'Opening Cash', flex: 0.9, renderCell: ({ value }) => `₹${(value || 0).toLocaleString()}` },
  { field: 'currentCash', headerName: 'Current Cash', flex: 0.9, renderCell: ({ value }) => `₹${(value || 0).toLocaleString()}` },
  { field: 'status', headerName: 'Status', flex: 0.8, renderCell: ({ value }) => (
    <Chip label={value} size="small" color={value === 'open' ? 'success' : value === 'closed' ? 'default' : 'warning'} />
  )},
];

const CounterForm = ({ open, onClose, onSaved, editing }) => {
  const { register, handleSubmit, reset, control, formState: { isSubmitting } } = useForm();
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!open) return;
    branchesAPI.getAll({ limit: 100, status: 'active' }).then(r => setBranches(r.data.data || [])).catch(() => {});
    usersAPI.getAll({ limit: 100, status: 'active' }).then(r => setUsers(r.data.data || [])).catch(() => {});
    reset(editing
      ? { ...editing, branch: editing.branch?._id || editing.branch || '', cashier: editing.cashier?._id || editing.cashier || '' }
      : {}
    );
  }, [open, editing]);

  const onSubmit = async (data) => {
    try {
      const payload = { ...data, number: +data.number };
      if (!payload.cashier) delete payload.cashier;
      if (editing) await countersAPI.update(editing._id, payload);
      else await countersAPI.create(payload);
      toast.success(editing ? 'Counter updated' : 'Counter created');
      onClose(); onSaved();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>{editing ? 'Edit Counter' : 'Add Counter'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid size={4}><TextField fullWidth label="Number" type="number" {...register('number', { required: true })} /></Grid>
            <Grid size={8}><TextField fullWidth label="Counter Name" {...register('name', { required: true })} /></Grid>
            <Grid size={12}>
              <FormControl fullWidth size="small" required>
                <InputLabel>Branch</InputLabel>
                <Controller name="branch" control={control} defaultValue="" rules={{ required: true }} render={({ field }) => (
                  <Select {...field} label="Branch">
                    {branches.map(b => <MenuItem key={b._id} value={b._id}>{b.name}</MenuItem>)}
                  </Select>
                )} />
              </FormControl>
            </Grid>
            <Grid size={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Cashier</InputLabel>
                <Controller name="cashier" control={control} defaultValue="" render={({ field }) => (
                  <Select {...field} label="Cashier">
                    <MenuItem value=""><em>None</em></MenuItem>
                    {users.map(u => <MenuItem key={u._id} value={u._id}>{u.name}</MenuItem>)}
                  </Select>
                )} />
              </FormControl>
            </Grid>
            <Grid size={12}><TextField fullWidth label="Opening Cash" type="number" {...register('openingCash')} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} variant="outlined">Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>{editing ? 'Update' : 'Create'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

const Counters = () => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [refresh, setRefresh] = useState(0);

  const handleClose = () => { setOpen(false); setEditing(null); };

  return (
    <>
      <ListPage key={refresh} title="Counters" subtitle="Manage billing counters"
        columns={columns} api={countersAPI} addLabel="Add Counter"
        onAdd={() => { setEditing(null); setOpen(true); }}
        onEdit={(row) => { setEditing(row); setOpen(true); }}
      />
      <CounterForm open={open} onClose={handleClose} onSaved={() => setRefresh(r => r + 1)} editing={editing} />
    </>
  );
};

export default Counters;
