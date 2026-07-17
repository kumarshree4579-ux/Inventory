import { useState, useEffect } from 'react';
import { Chip, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Grid } from '@mui/material';
import { useForm } from 'react-hook-form';
import ListPage from '../../components/common/ListPage';
import { suppliersAPI } from '../../api/services';
import toast from 'react-hot-toast';

const columns = [
  { field: 'name', headerName: 'Supplier', flex: 1.5 },
  { field: 'phone', headerName: 'Phone', flex: 1 },
  { field: 'email', headerName: 'Email', flex: 1.2 },
  { field: 'gstNumber', headerName: 'GST No.', flex: 1 },
  { field: 'outstandingBalance', headerName: 'Outstanding', flex: 1, renderCell: ({ value }) => <Typography color={value > 0 ? 'error' : 'inherit'}>₹{(value || 0).toLocaleString()}</Typography> },
  { field: 'status', headerName: 'Status', flex: 0.8, renderCell: ({ value }) => <Chip label={value} size="small" color={value === 'active' ? 'success' : 'default'} /> },
];

const SupplierForm = ({ open, onClose, onSaved, editing }) => {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  useEffect(() => {
    if (open) reset(editing || {});
  }, [open, editing]);

  const onSubmit = async (data) => {
    try {
      if (editing) await suppliersAPI.update(editing._id, data);
      else await suppliersAPI.create(data);
      toast.success(editing ? 'Supplier updated' : 'Supplier created');
      onClose(); onSaved();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>{editing ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid size={12}><TextField fullWidth label="Supplier Name" {...register('name', { required: true })} /></Grid>
            <Grid size={6}><TextField fullWidth label="Phone" {...register('phone')} /></Grid>
            <Grid size={6}><TextField fullWidth label="Email" type="email" {...register('email')} /></Grid>
            <Grid size={6}><TextField fullWidth label="GST Number" {...register('gstNumber')} /></Grid>
            <Grid size={6}><TextField fullWidth label="PAN Number" {...register('panNumber')} /></Grid>
            <Grid size={12}><TextField fullWidth label="Address" multiline rows={2} {...register('address')} /></Grid>
            <Grid size={6}><TextField fullWidth label="City" {...register('city')} /></Grid>
            <Grid size={6}><TextField fullWidth label="State" {...register('state')} /></Grid>
            <Grid size={6}><TextField fullWidth label="Opening Balance" type="number" {...register('openingBalance')} /></Grid>
            <Grid size={6}><TextField fullWidth label="Credit Limit" type="number" {...register('creditLimit')} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} variant="outlined">Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>{editing ? 'Update' : 'Create'} Supplier</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

const Suppliers = () => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [refresh, setRefresh] = useState(0);

  const handleClose = () => { setOpen(false); setEditing(null); };

  return (
    <>
      <ListPage key={refresh} title="Suppliers" columns={columns} api={suppliersAPI}
        onAdd={() => { setEditing(null); setOpen(true); }}
        onEdit={(row) => { setEditing(row); setOpen(true); }}
      />
      <SupplierForm open={open} onClose={handleClose} onSaved={() => setRefresh(r => r + 1)} editing={editing} />
    </>
  );
};

export default Suppliers;
