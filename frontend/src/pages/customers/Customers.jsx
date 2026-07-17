import { useState, useEffect } from 'react';
import { Chip, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Grid, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import ListPage from '../../components/common/ListPage';
import { customersAPI } from '../../api/services';
import toast from 'react-hot-toast';

const columns = [
  { field: 'name', headerName: 'Customer', flex: 1.2 },
  { field: 'phone', headerName: 'Phone', flex: 1 },
  { field: 'email', headerName: 'Email', flex: 1.2 },
  { field: 'membership', headerName: 'Membership', flex: 0.9, renderCell: ({ value }) => <Chip label={value} size="small" color={value !== 'none' ? 'warning' : 'default'} /> },
  { field: 'rewardPoints', headerName: 'Points', flex: 0.7 },
  { field: 'outstanding', headerName: 'Outstanding', flex: 0.9, renderCell: ({ value }) => <Typography color={value > 0 ? 'error' : 'inherit'}>₹{(value || 0).toLocaleString()}</Typography> },
  { field: 'status', headerName: 'Status', flex: 0.7, renderCell: ({ value }) => <Chip label={value} size="small" color={value === 'active' ? 'success' : 'default'} /> },
];

const CustomerForm = ({ open, onClose, onSaved, editing }) => {
  const { register, handleSubmit, reset, control, formState: { isSubmitting } } = useForm();

  useEffect(() => {
    if (open) reset(editing ? { ...editing, dob: editing.dob?.slice(0, 10) } : { membership: 'none' });
  }, [open, editing]);

  const onSubmit = async (data) => {
    try {
      if (editing) await customersAPI.update(editing._id, data);
      else await customersAPI.create(data);
      toast.success(editing ? 'Customer updated' : 'Customer created');
      onClose(); onSaved();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>{editing ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid size={12}><TextField fullWidth label="Customer Name" {...register('name', { required: true })} /></Grid>
            <Grid size={6}><TextField fullWidth label="Phone" {...register('phone')} /></Grid>
            <Grid size={6}><TextField fullWidth label="Email" type="email" {...register('email')} /></Grid>
            <Grid size={6}><TextField fullWidth label="Date of Birth" type="date" slotProps={{ inputLabel: { shrink: true } }} {...register('dob')} /></Grid>
            <Grid size={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Membership</InputLabel>
                <Controller name="membership" control={control} defaultValue="none" render={({ field }) => (
                  <Select {...field} label="Membership">
                    {['none', 'silver', 'gold', 'platinum'].map(m => <MenuItem key={m} value={m} sx={{ textTransform: 'capitalize' }}>{m}</MenuItem>)}
                  </Select>
                )} />
              </FormControl>
            </Grid>
            <Grid size={12}><TextField fullWidth label="Address" multiline rows={2} {...register('address')} /></Grid>
            <Grid size={6}><TextField fullWidth label="City" {...register('city')} /></Grid>
            <Grid size={6}><TextField fullWidth label="GST Number" {...register('gstNumber')} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} variant="outlined">Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>{editing ? 'Update' : 'Create'} Customer</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

const Customers = () => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [refresh, setRefresh] = useState(0);

  const handleClose = () => { setOpen(false); setEditing(null); };

  return (
    <>
      <ListPage key={refresh} title="Customers" columns={columns} api={{ ...customersAPI, remove: null }}
        onAdd={() => { setEditing(null); setOpen(true); }}
        onEdit={(row) => { setEditing(row); setOpen(true); }}
      />
      <CustomerForm open={open} onClose={handleClose} onSaved={() => setRefresh(r => r + 1)} editing={editing} />
    </>
  );
};

export default Customers;
