import { useState, useEffect, useCallback } from 'react';
import {
  Box, TextField, Chip, Typography, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, MenuItem, Select, FormControl,
  InputLabel, Grid, Tabs, Tab, Alert,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import ProductAutocompleteField from '../../components/common/ProductAutocompleteField';
import { stockAPI, branchesAPI } from '../../api/services';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const Stock = () => {
  const { user } = useAuthStore();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(user?.branch?._id || user?.branch || '');
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [tab, setTab] = useState(0); // 0=all, 1=low, 2=out

  const { register, handleSubmit, reset, control, setValue } = useForm();
  const { register: regT, handleSubmit: handleT, reset: resetT, control: ctrlT, setValue: setValT } = useForm();

  useEffect(() => {
    branchesAPI.getAll({ limit: 100, status: 'active' })
      .then(({ data }) => {
        setBranches(data.data || []);
        if (!selectedBranch && data.data?.length) setSelectedBranch(data.data[0]._id);
      }).catch(() => {});
  }, []);

  const fetchStock = useCallback(async () => {
    if (!selectedBranch) return;
    setLoading(true);
    try {
      const params = { page, limit: pageSize, branch: selectedBranch };
      if (search) params.search = search;
      if (tab === 1) params.lowStock = 'true';
      if (tab === 2) params.outOfStock = 'true';
      const { data } = await stockAPI.getAll(params);
      setRows(data.data || []);
      setTotal(data.total || 0);
    } catch { toast.error('Failed to load stock'); }
    finally { setLoading(false); }
  }, [page, pageSize, search, selectedBranch, tab]);

  useEffect(() => { fetchStock(); }, [fetchStock]);

  const onAdjust = async (values) => {
    try {
      await stockAPI.adjust({ ...values, branch: selectedBranch });
      toast.success('Stock adjusted successfully');
      setAdjustOpen(false);
      reset();
      fetchStock();
    } catch (err) { toast.error(err.response?.data?.message || 'Adjustment failed'); }
  };

  const onTransfer = async (values) => {
    try {
      await stockAPI.transfer({ ...values, branch: selectedBranch });
      toast.success('Stock transferred successfully');
      setTransferOpen(false);
      resetT();
      fetchStock();
    } catch (err) { toast.error(err.response?.data?.message || 'Transfer failed'); }
  };

  const columns = [
    { field: 'product', headerName: 'Product', flex: 1.5, minWidth: 160, renderCell: ({ value }) => value?.name || '-' },
    { field: 'sku', headerName: 'SKU', flex: 0.9, minWidth: 100, renderCell: ({ row }) => row.product?.sku || '-' },
    {
      field: 'available', headerName: 'Available', flex: 0.8, minWidth: 100,
      renderCell: ({ value, row }) => {
        const min = row.product?.minStock || 0;
        const color = value === 0 ? 'error' : value <= min ? 'warning' : 'success';
        return <Chip label={value} size="small" color={color} />;
      },
    },
    { field: 'reserved', headerName: 'Reserved', flex: 0.7, minWidth: 80 },
    { field: 'damaged', headerName: 'Damaged', flex: 0.7, minWidth: 80 },
    { field: 'expired', headerName: 'Expired', flex: 0.7, minWidth: 80 },
    { field: 'minStock', headerName: 'Min', flex: 0.5, minWidth: 60, renderCell: ({ row }) => row.product?.minStock || 0 },
  ];

  return (
    <Box>
      <PageHeader title="Stock Management" />
      <Box display="flex" gap={2} mb={2} flexWrap="wrap" alignItems="center">
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Branch</InputLabel>
          <Select value={selectedBranch} onChange={e => { setSelectedBranch(e.target.value); setPage(1); }} label="Branch">
            {branches.map(b => <MenuItem key={b._id} value={b._id}>{b.name}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField size="small" placeholder="Search products..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }} sx={{ width: 260 }} />
        <Box flex={1} />
        <Button variant="outlined" onClick={() => setAdjustOpen(true)}>Adjust Stock</Button>
        <Button variant="outlined" onClick={() => setTransferOpen(true)}>Transfer Stock</Button>
      </Box>

      <Tabs value={tab} onChange={(_, v) => { setTab(v); setPage(1); }} sx={{ mb: 2 }}>
        <Tab label="All Stock" />
        <Tab label="Low Stock" />
        <Tab label="Out of Stock" />
      </Tabs>

      <DataTable rows={rows} columns={columns} loading={loading} total={total}
        page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />

      {/* Adjust Stock Dialog */}
      <Dialog open={adjustOpen} onClose={() => setAdjustOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleSubmit(onAdjust)}>
          <DialogTitle>Adjust Stock</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <ProductAutocompleteField
              fullWidth size="small" label="Product" field="name"
              value={''} onChange={() => {}}
              onSelect={(p) => setValue('product', p._id)}
            />
            <TextField label="Product ID (auto-filled)" size="small" {...register('product', { required: true })} />
            <TextField label="Quantity" type="number" size="small" {...register('quantity', { required: true, min: 1 })} inputProps={{ min: 1 }} />
            <FormControl size="small" fullWidth>
              <InputLabel>Type</InputLabel>
              <Controller name="type" control={control} defaultValue="inward" render={({ field }) => (
                <Select {...field} label="Type">
                  <MenuItem value="inward">Inward (+)</MenuItem>
                  <MenuItem value="outward">Outward (-)</MenuItem>
                </Select>
              )} />
            </FormControl>
            <TextField label="Note" size="small" {...register('note')} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAdjustOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Submit</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Transfer Stock Dialog */}
      <Dialog open={transferOpen} onClose={() => setTransferOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleT(onTransfer)}>
          <DialogTitle>Transfer Stock</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <Alert severity="info" sx={{ py: 0.5 }}>From: {branches.find(b => b._id === selectedBranch)?.name || 'Selected branch'}</Alert>
            <ProductAutocompleteField
              fullWidth size="small" label="Product" field="name"
              value={''} onChange={() => {}}
              onSelect={(p) => setValT('product', p._id)}
            />
            <TextField label="Product ID (auto-filled)" size="small" {...regT('product', { required: true })} />
            <TextField label="Quantity" type="number" size="small" {...regT('quantity', { required: true, min: 1 })} inputProps={{ min: 1 }} />
            <FormControl size="small" fullWidth>
              <InputLabel>To Branch</InputLabel>
              <Controller name="toBranch" control={ctrlT} defaultValue="" render={({ field }) => (
                <Select {...field} label="To Branch">
                  {branches.filter(b => b._id !== selectedBranch).map(b => (
                    <MenuItem key={b._id} value={b._id}>{b.name}</MenuItem>
                  ))}
                </Select>
              )} />
            </FormControl>
            <TextField label="Note" size="small" {...regT('note')} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTransferOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Transfer</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Stock;
