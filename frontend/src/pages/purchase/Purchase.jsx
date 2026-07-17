import { useState, useEffect } from 'react';
import {
  Box, Chip, IconButton, Tooltip, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, Grid, MenuItem, Select, FormControl, InputLabel, Typography, Divider,} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import { purchaseAPI, suppliersAPI } from '../../api/services';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const statusColor = { draft: 'default', pending: 'warning', approved: 'info', received: 'success', partial: 'secondary', cancelled: 'error' };

const POForm = ({ open, onClose, onSaved }) => {
  const { register, handleSubmit, reset, control, watch, formState: { isSubmitting } } = useForm({
    defaultValues: { items: [{ productId: '', productName: '', quantity: 1, unitPrice: 0 }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    if (!open) return;
    suppliersAPI.getAll({ limit: 100 }).then(r => setSuppliers(r.data.data || [])).catch(() => {});
    reset({ items: [{ productId: '', productName: '', quantity: 1, unitPrice: 0 }] });
  }, [open]);

  const items = watch('items') || [];
  const total = items.reduce((s, i) => s + ((+i.quantity || 0) * (+i.unitPrice || 0)), 0);

  const onSubmit = async (data) => {
    try {
      await purchaseAPI.create({
        supplier: data.supplier,
        expectedDate: data.expectedDate,
        notes: data.notes,
        items: data.items.map(i => ({ product: i.productId, productName: i.productName, quantity: +i.quantity, unitPrice: +i.unitPrice, total: +i.quantity * +i.unitPrice })),
        total,
      });
      toast.success('Purchase order created');
      onClose(); onSaved();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>New Purchase Order</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Supplier</InputLabel>
                <Controller name="supplier" control={control} defaultValue="" render={({ field }) => (
                  <Select {...field} label="Supplier">
                    {suppliers.map(s => <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>)}
                  </Select>
                )} />
              </FormControl>
            </Grid>
            <Grid size={6}><TextField fullWidth label="Expected Date" type="date" InputLabelProps={{ shrink: true }} {...register('expectedDate')} /></Grid>
            <Grid size={12}><TextField fullWidth label="Notes" multiline rows={2} {...register('notes')} /></Grid>
          </Grid>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Items</Typography>
          {fields.map((field, i) => (
            <Grid container spacing={1.5} key={field.id} sx={{ mb: 1 }} alignItems="center">
              <Grid size={4}><TextField fullWidth size="small" label="Product Name" {...register(`items.${i}.productName`, { required: true })} /></Grid>
              <Grid size={3}><TextField fullWidth size="small" label="Product ID" {...register(`items.${i}.productId`)} /></Grid>
              <Grid size={2}><TextField fullWidth size="small" label="Qty" type="number" {...register(`items.${i}.quantity`, { min: 1 })} /></Grid>
              <Grid size={2}><TextField fullWidth size="small" label="Unit Price" type="number" {...register(`items.${i}.unitPrice`)} /></Grid>
              <Grid size={1}><IconButton size="small" color="error" onClick={() => remove(i)} disabled={fields.length === 1}><DeleteIcon fontSize="small" /></IconButton></Grid>
            </Grid>
          ))}
          <Button size="small" startIcon={<AddIcon />} onClick={() => append({ productId: '', productName: '', quantity: 1, unitPrice: 0 })}>Add Item</Button>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Typography variant="h6">Total: ₹{total.toLocaleString()}</Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} variant="outlined">Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>Create PO</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

const Purchase = () => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [viewPO, setViewPO] = useState(null);

  const fetchPOs = async () => {
    setLoading(true);
    try {
      const { data } = await purchaseAPI.getAll({ page, limit: pageSize });
      setRows(data.data);
      setTotal(data.total);
    } catch { toast.error('Failed to load purchase orders'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPOs(); }, [page, pageSize]);

  const handleApprove = async (id) => {
    try {
      await purchaseAPI.approve(id);
      toast.success('PO approved');
      fetchPOs();
    } catch (err) { toast.error(err.response?.data?.message || 'Approval failed'); }
  };

  const columns = [
    { field: 'poNumber', headerName: 'PO Number', flex: 1.2 },
    { field: 'supplier', headerName: 'Supplier', flex: 1.2, renderCell: ({ value }) => value?.name || '-' },
    { field: 'total', headerName: 'Total', flex: 0.9, renderCell: ({ value }) => `₹${(value || 0).toLocaleString()}` },
    { field: 'status', headerName: 'Status', flex: 0.9, renderCell: ({ value }) => <Chip label={value} size="small" color={statusColor[value] || 'default'} /> },
    { field: 'paymentStatus', headerName: 'Payment', flex: 0.9, renderCell: ({ value }) => <Chip label={value} size="small" variant="outlined" /> },
    { field: 'createdAt', headerName: 'Date', flex: 1, renderCell: ({ value }) => dayjs(value).format('DD MMM YYYY') },
    {
      field: 'actions', headerName: '', width: 100, sortable: false,
      renderCell: ({ row }) => (
        <>
          <Tooltip title="View"><IconButton size="small" onClick={() => setViewPO(row)}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
          {row.status === 'pending' && (
            <Tooltip title="Approve">
              <IconButton size="small" color="success" onClick={() => handleApprove(row._id)}>
                <CheckCircleIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader title="Purchase Orders" action="New Purchase Order" onAction={() => setFormOpen(true)} />
      <DataTable rows={rows} columns={columns} loading={loading} total={total}
        page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      <POForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={fetchPOs} />

      <Dialog open={!!viewPO} onClose={() => setViewPO(null)} maxWidth="sm" fullWidth>
        <DialogTitle>PO — {viewPO?.poNumber}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            <Grid size={6}><Typography variant="caption" color="text.secondary">Supplier</Typography><Typography variant="body2" fontWeight={600}>{viewPO?.supplier?.name || '—'}</Typography></Grid>
            <Grid size={6}><Typography variant="caption" color="text.secondary">Status</Typography><Box sx={{ mt: 0.25 }}><Chip label={viewPO?.status} size="small" color={statusColor[viewPO?.status] || 'default'} /></Box></Grid>
            <Grid size={6}><Typography variant="caption" color="text.secondary">Total</Typography><Typography variant="body2" fontWeight={600}>₹{(viewPO?.total || 0).toLocaleString()}</Typography></Grid>
            <Grid size={6}><Typography variant="caption" color="text.secondary">Date</Typography><Typography variant="body2">{viewPO?.createdAt ? dayjs(viewPO.createdAt).format('DD MMM YYYY') : '—'}</Typography></Grid>
            {viewPO?.notes && <Grid size={12}><Typography variant="caption" color="text.secondary">Notes</Typography><Typography variant="body2">{viewPO.notes}</Typography></Grid>}
          </Grid>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Items</Typography>
          {(viewPO?.items || []).map((item, i) => (
            <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2">{item.productName || item.product?.name || '—'}</Typography>
              <Typography variant="body2" color="text.secondary">{item.quantity} × ₹{item.unitPrice} = <strong>₹{item.total}</strong></Typography>
            </Box>
          ))}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setViewPO(null)} variant="outlined">Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Purchase;
