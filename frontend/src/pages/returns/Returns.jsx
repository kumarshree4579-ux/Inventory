import { useState, useEffect } from 'react';
import {
  Box, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, FormControl, InputLabel, Grid, IconButton, Tooltip, Typography,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import { returnsAPI } from '../../api/services';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const STATUS_COLOR = { pending: 'warning', approved: 'success', rejected: 'error' };

const ReturnForm = ({ open, onClose, onSaved }) => {
  const { register, handleSubmit, reset, control, formState: { isSubmitting } } = useForm({ defaultValues: { type: 'sale', refundMethod: 'cash' } });
  const onSubmit = async (data) => {
    try {
      await returnsAPI.create({
        type: data.type,
        reference: data.reference,
        referenceModel: data.type === 'sale' ? 'Sale' : 'PurchaseOrder',
        refundMethod: data.refundMethod,
        total: +data.total,
        items: [{ product: data.productId, quantity: +data.quantity, price: +data.price, reason: data.reason }],
      });
      toast.success('Return created');
      reset(); onClose(); onSaved();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>New Return</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid size={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Return Type</InputLabel>
                <Controller name="type" control={control} render={({ field }) => (
                  <Select {...field} label="Return Type">
                    <MenuItem value="sale">Sales Return</MenuItem>
                    <MenuItem value="purchase">Purchase Return</MenuItem>
                  </Select>
                )} />
              </FormControl>
            </Grid>
            <Grid size={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Refund Method</InputLabel>
                <Controller name="refundMethod" control={control} render={({ field }) => (
                  <Select {...field} label="Refund Method">
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="credit">Credit</MenuItem>
                    <MenuItem value="exchange">Exchange</MenuItem>
                  </Select>
                )} />
              </FormControl>
            </Grid>
            <Grid size={12}><TextField fullWidth label="Reference ID (Sale/PO)" {...register('reference', { required: true })} /></Grid>
            <Grid size={12}><TextField fullWidth label="Product ID" {...register('productId', { required: true })} /></Grid>
            <Grid size={4}><TextField fullWidth label="Quantity" type="number" {...register('quantity', { required: true })} /></Grid>
            <Grid size={4}><TextField fullWidth label="Price" type="number" {...register('price', { required: true })} /></Grid>
            <Grid size={4}><TextField fullWidth label="Total" type="number" {...register('total', { required: true })} /></Grid>
            <Grid size={12}><TextField fullWidth label="Reason" multiline rows={2} {...register('reason')} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} variant="outlined">Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>Submit Return</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

const Returns = () => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await returnsAPI.getAll({ page, limit: pageSize });
      setRows(data.data);
      setTotal(data.total);
    } catch { toast.error('Failed to load returns'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [page, pageSize]);

  const handleApprove = async (id) => {
    try {
      await returnsAPI.approve(id);
      toast.success('Return approved');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const columns = [
    { field: 'type', headerName: 'Type', flex: 0.8, renderCell: ({ value }) => <Chip label={value === 'sale' ? 'Sales Return' : 'Purchase Return'} size="small" color={value === 'sale' ? 'primary' : 'warning'} /> },
    { field: 'total', headerName: 'Total', flex: 0.8, renderCell: ({ value }) => `₹${(value || 0).toLocaleString()}` },
    { field: 'refundMethod', headerName: 'Refund', flex: 0.8, renderCell: ({ value }) => <Chip label={value} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} /> },
    { field: 'processedBy', headerName: 'Processed By', flex: 1, renderCell: ({ value }) => value?.name || '—' },
    { field: 'status', headerName: 'Status', flex: 0.8, renderCell: ({ value }) => <Chip label={value} size="small" color={STATUS_COLOR[value] || 'default'} /> },
    { field: 'createdAt', headerName: 'Date', flex: 1, renderCell: ({ value }) => dayjs(value).format('DD MMM YYYY') },
    {
      field: 'actions', headerName: '', width: 80, sortable: false,
      renderCell: ({ row }) => row.status === 'pending' ? (
        <Tooltip title="Approve">
          <IconButton size="small" color="success" onClick={() => handleApprove(row._id)}>
            <CheckCircleIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : null,
    },
  ];

  return (
    <Box>
      <PageHeader title="Returns" subtitle="Manage sales & purchase returns" action="New Return" onAction={() => setOpen(true)} />
      <DataTable rows={rows} columns={columns} loading={loading} total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      <ReturnForm open={open} onClose={() => setOpen(false)} onSaved={fetchData} />
    </Box>
  );
};

export default Returns;
