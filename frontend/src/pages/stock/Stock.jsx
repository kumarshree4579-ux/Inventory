import { useState, useEffect, useCallback } from 'react';
import {
  Box, TextField, Chip, Typography, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, MenuItem, Select, FormControl,
  InputLabel, Tabs, Tab, Alert, Paper, Divider, InputAdornment,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import SearchIcon from '@mui/icons-material/Search';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import TuneIcon from '@mui/icons-material/Tune';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import ProductAutocompleteField from '../../components/common/ProductAutocompleteField';
import { stockAPI, branchesAPI } from '../../api/services';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const Stock = () => {
  const { user } = useAuthStore();
  const isAdmin = !user?.branch;
  const userBranchId = user?.branch?._id || user?.branch || '';

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(''); // '' = All Branches for admin
  const [tab, setTab] = useState(0);

  // Adjust dialog
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [adjustInput, setAdjustInput] = useState('');
  const [adjustBranch, setAdjustBranch] = useState('');
  const [currentStock, setCurrentStock] = useState(null);
  const { register, handleSubmit, reset, control, watch } = useForm({ defaultValues: { type: 'inward', quantity: '' } });
  const adjustType = watch('type');

  // Transfer dialog
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferProduct, setTransferProduct] = useState(null);
  const [transferInput, setTransferInput] = useState('');
  const [transferFromBranch, setTransferFromBranch] = useState('');
  const { register: regT, handleSubmit: handleT, reset: resetT, control: ctrlT } = useForm();

  useEffect(() => {
    if (!isAdmin) return;
    branchesAPI.getAll({ limit: 100, status: 'active' })
      .then(({ data }) => setBranches(data.data || []))
      .catch(() => {});
  }, [isAdmin]);

  const fetchStock = useCallback(async () => {
    if (!isAdmin && !userBranchId) return;
    setLoading(true);
    try {
      const params = { page, limit: pageSize };
      const branch = isAdmin ? selectedBranch : userBranchId;
      if (branch) params.branch = branch;
      if (search) params.search = search;
      if (tab === 1) params.lowStock = 'true';
      if (tab === 2) params.outOfStock = 'true';
      const { data } = await stockAPI.getAll(params);
      setRows(data.data || []);
      setTotal(data.total || 0);
    } catch { toast.error('Failed to load stock'); }
    finally { setLoading(false); }
  }, [page, pageSize, search, selectedBranch, tab, isAdmin, userBranchId]);

  useEffect(() => { fetchStock(); }, [fetchStock]);

  useEffect(() => {
    if (!adjustProduct || !adjustBranch) { setCurrentStock(null); return; }
    stockAPI.getProductStock(adjustProduct._id, adjustBranch)
      .then(({ data }) => setCurrentStock(data.available ?? 0))
      .catch(() => setCurrentStock(null));
  }, [adjustProduct, adjustBranch]);

  const openAdjustDialog = () => {
    reset({ type: 'inward', quantity: '' });
    setAdjustProduct(null);
    setAdjustInput('');
    setAdjustBranch(isAdmin ? selectedBranch : userBranchId);
    setCurrentStock(null);
    setAdjustOpen(true);
  };

  const openTransferDialog = () => {
    resetT();
    setTransferProduct(null);
    setTransferInput('');
    setTransferFromBranch(selectedBranch);
    setTransferOpen(true);
  };

  const onAdjust = async (values) => {
    if (!adjustProduct) return toast.error('Please select a product');
    if (!adjustBranch) return toast.error('Please select a branch');
    try {
      await stockAPI.adjust({ product: adjustProduct._id, quantity: +values.quantity, type: values.type, note: values.note, branch: adjustBranch });
      toast.success('Stock adjusted successfully');
      setAdjustOpen(false);
      fetchStock();
    } catch (err) { toast.error(err.response?.data?.message || 'Adjustment failed'); }
  };

  const onTransfer = async (values) => {
    if (!transferProduct) return toast.error('Please select a product');
    if (!transferFromBranch) return toast.error('Please select a from branch');
    try {
      await stockAPI.transfer({ product: transferProduct._id, quantity: +values.quantity, toBranch: values.toBranch, note: values.note, branch: transferFromBranch });
      toast.success('Stock transferred successfully');
      setTransferOpen(false);
      fetchStock();
    } catch (err) { toast.error(err.response?.data?.message || 'Transfer failed'); }
  };

  const columns = [
    {
      field: 'product', headerName: 'Product', flex: 1.5, minWidth: 180,
      renderCell: ({ value }) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>{value?.name || '—'}</Typography>
          <Typography variant="caption" color="text.secondary">{value?.sku || ''}</Typography>
        </Box>
      ),
    },
    ...(isAdmin ? [{ field: 'branch', headerName: 'Branch', flex: 0.9, minWidth: 120, renderCell: ({ value }) => value?.name || '—' }] : []),
    { field: 'barcode', headerName: 'Barcode', flex: 0.9, minWidth: 110, renderCell: ({ row }) => row.product?.barcode || '—' },
    {
      field: 'available', headerName: 'Available', flex: 0.8, minWidth: 100,
      renderCell: ({ value, row }) => {
        const min = row.product?.minStock || 0;
        const color = value === 0 ? 'error' : value <= min ? 'warning' : 'success';
        return <Chip label={value ?? 0} size="small" color={color} variant="filled" />;
      },
    },
    { field: 'minStock', headerName: 'Min Stock', flex: 0.6, minWidth: 80, renderCell: ({ row }) => row.product?.minStock ?? 0 },
    { field: 'unit', headerName: 'Unit', flex: 0.5, minWidth: 60, renderCell: ({ row }) => row.product?.unit || '—' },
    { field: 'sellingPrice', headerName: 'Sell Price', flex: 0.8, minWidth: 90, renderCell: ({ row }) => row.product?.sellingPrice ? `₹${row.product.sellingPrice}` : '—' },
    { field: 'purchasePrice', headerName: 'Buy Price', flex: 0.8, minWidth: 90, renderCell: ({ row }) => row.product?.purchasePrice ? `₹${row.product.purchasePrice}` : '—' },
  ];

  const toBranchOptions = branches.filter(b => b._id !== transferFromBranch);

  return (
    <Box>
      <PageHeader title="Stock Management" />

      <Box display="flex" gap={1.5} mb={2} flexWrap="wrap" alignItems="center">
        {isAdmin && (
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel shrink>Branch</InputLabel>
            <Select
              value={selectedBranch}
              onChange={e => { setSelectedBranch(e.target.value); setPage(1); }}
              label="Branch"
              displayEmpty
              notched
            >
              <MenuItem value="">All Branches</MenuItem>
              {branches.map(b => <MenuItem key={b._id} value={b._id}>{b.name}</MenuItem>)}
            </Select>
          </FormControl>
        )}
        {!isAdmin && (
          <Chip
            label={`Branch: ${user?.branch?.name || 'Your Branch'}`}
            color="primary" variant="outlined"
            sx={{ height: 36, fontSize: '0.875rem', px: 1 }}
          />
        )}
        <TextField
          size="small" placeholder="Search products..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          sx={{ width: 260 }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment> } }}
        />
        <Box flex={1} />
        <Button variant="outlined" startIcon={<TuneIcon />} onClick={openAdjustDialog}>
          Adjust Stock
        </Button>
        {(isAdmin ? branches.length > 1 : false) && (
          <Button variant="outlined" startIcon={<SwapHorizIcon />} onClick={openTransferDialog}>
            Transfer Stock
          </Button>
        )}
      </Box>

      <Tabs value={tab} onChange={(_, v) => { setTab(v); setPage(1); }} sx={{ mb: 2 }}>
        <Tab label="All Stock" />
        <Tab label="Low Stock" />
        <Tab label="Out of Stock" />
      </Tabs>

      <DataTable rows={rows} columns={columns} loading={loading} total={total}
        page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />

      {/* ── Adjust Stock Dialog ── */}
      <Dialog open={adjustOpen} onClose={() => setAdjustOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onAdjust)} noValidate>
          <DialogTitle>Adjust Stock</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>

            {/* Branch picker — admin only, when All Branches selected */}
            {isAdmin && (
              <FormControl size="small" fullWidth required>
                <InputLabel shrink>Branch *</InputLabel>
                <Select value={adjustBranch} onChange={e => setAdjustBranch(e.target.value)} label="Branch *" displayEmpty notched>
                  <MenuItem value=""><em>Select branch...</em></MenuItem>
                  {branches.map(b => <MenuItem key={b._id} value={b._id}>{b.name}</MenuItem>)}
                </Select>
              </FormControl>
            )}

            <ProductAutocompleteField
              label="Search Product *"
              field="name"
              value={adjustInput}
              onChange={setAdjustInput}
              onSelect={(p) => { setAdjustProduct(p); if (p) setAdjustInput(p.name); }}
              fullWidth size="small"
            />

            {adjustProduct && (
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'action.hover' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" fontWeight={700}>{adjustProduct.name}</Typography>
                    <Typography variant="caption" color="text.secondary">SKU: {adjustProduct.sku}</Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="caption" color="text.secondary">Current Stock</Typography>
                    <Typography variant="h6" fontWeight={700} color={
                      currentStock === null ? 'text.secondary' :
                      currentStock === 0 ? 'error.main' :
                      currentStock <= (adjustProduct.minStock || 0) ? 'warning.main' : 'success.main'
                    }>
                      {currentStock === null ? (adjustBranch ? '...' : '—') : currentStock}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            )}

            <Divider />

            <FormControl size="small" fullWidth>
              <InputLabel>Adjustment Type</InputLabel>
              <Controller name="type" control={control} defaultValue="inward" render={({ field }) => (
                <Select {...field} label="Adjustment Type">
                  <MenuItem value="inward">
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip label="+" size="small" color="success" sx={{ width: 28, height: 20, fontSize: 12 }} />
                      Inward — Add Stock
                    </Box>
                  </MenuItem>
                  <MenuItem value="outward">
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip label="−" size="small" color="error" sx={{ width: 28, height: 20, fontSize: 12 }} />
                      Outward — Remove Stock
                    </Box>
                  </MenuItem>
                </Select>
              )} />
            </FormControl>

            <TextField
              label="Quantity *" type="number" size="small" fullWidth
              {...register('quantity', { required: true, min: 1 })}
              slotProps={{ htmlInput: { min: 1 } }}
              helperText={
                adjustProduct && currentStock !== null && watch('quantity')
                  ? adjustType === 'inward'
                    ? `After adjustment: ${currentStock + (+watch('quantity') || 0)}`
                    : `After adjustment: ${Math.max(0, currentStock - (+watch('quantity') || 0))}`
                  : ''
              }
            />

            <TextField label="Note / Reason" size="small" fullWidth {...register('note')} />

            {adjustType === 'outward' && currentStock !== null && +watch('quantity') > currentStock && (
              <Alert severity="error" sx={{ py: 0.5 }}>
                Quantity exceeds available stock ({currentStock})
              </Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
            <Button onClick={() => setAdjustOpen(false)} variant="outlined">Cancel</Button>
            <Button
              type="submit" variant="contained"
              color={adjustType === 'outward' ? 'error' : 'primary'}
              disabled={
                !adjustProduct || !adjustBranch ||
                (adjustType === 'outward' && currentStock !== null && +watch('quantity') > currentStock)
              }
            >
              {adjustType === 'inward' ? 'Add Stock' : 'Remove Stock'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ── Transfer Stock Dialog ── */}
      <Dialog open={transferOpen} onClose={() => setTransferOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleT(onTransfer)} noValidate>
          <DialogTitle>Transfer Stock</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>

            {/* From Branch picker — always shown for admin */}
            <FormControl size="small" fullWidth required>
              <InputLabel shrink>From Branch *</InputLabel>
              <Select value={transferFromBranch} onChange={e => setTransferFromBranch(e.target.value)} label="From Branch *" displayEmpty notched>
                <MenuItem value=""><em>Select branch...</em></MenuItem>
                {branches.map(b => <MenuItem key={b._id} value={b._id}>{b.name}</MenuItem>)}
              </Select>
            </FormControl>

            <ProductAutocompleteField
              label="Search Product *"
              field="name"
              value={transferInput}
              onChange={setTransferInput}
              onSelect={(p) => { setTransferProduct(p); if (p) setTransferInput(p.name); }}
              fullWidth size="small"
            />

            {transferProduct && (
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'action.hover' }}>
                <Typography variant="body2" fontWeight={700}>{transferProduct.name}</Typography>
                <Typography variant="caption" color="text.secondary">SKU: {transferProduct.sku}</Typography>
              </Paper>
            )}

            <Divider />

            <FormControl size="small" fullWidth required>
              <InputLabel>To Branch *</InputLabel>
              <Controller name="toBranch" control={ctrlT} defaultValue="" rules={{ required: true }} render={({ field }) => (
                <Select {...field} label="To Branch *">
                  {toBranchOptions.map(b => (
                    <MenuItem key={b._id} value={b._id}>{b.name}</MenuItem>
                  ))}
                </Select>
              )} />
            </FormControl>

            <TextField
              label="Quantity *" type="number" size="small" fullWidth
              {...regT('quantity', { required: true, min: 1 })}
              slotProps={{ htmlInput: { min: 1 } }}
            />
            <TextField label="Note / Reason" size="small" fullWidth {...regT('note')} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
            <Button onClick={() => setTransferOpen(false)} variant="outlined">Cancel</Button>
            <Button type="submit" variant="contained" disabled={!transferProduct || !transferFromBranch}>Transfer</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Stock;
