import { useState, useEffect, useCallback } from 'react';
import {
  Box, TextField, Chip, IconButton, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, Grid, MenuItem, Select,
  FormControl, InputLabel, Switch, FormControlLabel, Typography,
  InputAdornment, Tabs, Tab, Table, TableHead, TableRow,
  TableCell, TableBody, CircularProgress, Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useForm, Controller, useWatch } from 'react-hook-form';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import ProductAutocompleteField from '../../components/common/ProductAutocompleteField';
import CreatableSelect from '../../components/common/CreatableSelect';
import { productsAPI, categoriesAPI, brandsAPI, branchesAPI } from '../../api/services';
import toast from 'react-hot-toast';

// ── GST helper ────────────────────────────────────────────────────────────────
const calcGst = (price, gst, includesGst) => {
  const p = +price || 0, g = +gst || 0;
  if (!g) return { inc: p, exc: p };
  return includesGst
    ? { inc: p, exc: +(p / (1 + g / 100)).toFixed(2) }
    : { inc: +(p * (1 + g / 100)).toFixed(2), exc: p };
};

// ── Opening stock per branch ──────────────────────────────────────────────────
const OpeningStockTable = ({ branches, value = [], onChange }) => {
  const update = (branchId, qty) => {
    const next = value.filter(r => r.branch !== branchId);
    if (+qty > 0) next.push({ branch: branchId, qty: +qty });
    onChange(next);
  };
  const getQty = (id) => value.find(r => r.branch === id)?.qty || '';
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Branch</TableCell>
          <TableCell width={140}>Opening Qty</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {branches.map(b => (
          <TableRow key={b._id}>
            <TableCell>
              {b.name}
              <Typography component="span" variant="caption" color="text.secondary"> ({b.code})</Typography>
            </TableCell>
            <TableCell>
              <TextField size="small" type="number" value={getQty(b._id)}
                onChange={e => update(b._id, e.target.value)}
                inputProps={{ min: 0 }} sx={{ width: 110 }} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

// ── Product Form ──────────────────────────────────────────────────────────────
const ProductForm = ({ open, onClose, onSaved, initial }) => {
  const { register, handleSubmit, reset, control, formState: { isSubmitting, errors } } = useForm({
    defaultValues: { priceIncludesGst: false, unit: 'pcs', gst: 0, status: 'active' },
  });

  const [branches, setBranches] = useState([]);
  const [openingStocks, setOpeningStocks] = useState([]);
  const [tab, setTab] = useState(0);

  // Category & Brand — controlled outside RHF so CreatableSelect can manage display name
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [brandId, setBrandId] = useState('');
  const [brandName, setBrandName] = useState('');

  // Autocomplete field states
  const [nameVal, setNameVal] = useState('');
  const [skuVal, setSkuVal] = useState('');
  const [barcodeVal, setBarcodeVal] = useState('');
  const [hsnVal, setHsnVal] = useState('');

  const priceIncludesGst = useWatch({ control, name: 'priceIncludesGst' });
  const gst = useWatch({ control, name: 'gst' });
  const sellingPrice = useWatch({ control, name: 'sellingPrice' });
  const { inc: incGst, exc: excGst } = calcGst(sellingPrice, gst, priceIncludesGst);

  useEffect(() => {
    if (!open) return;
    setTab(0);
    branchesAPI.getAll({ limit: 100, status: 'active' })
      .then(({ data }) => setBranches(data.data || []))
      .catch(() => {});

    if (initial) {
      reset({
        ...initial,
        category: initial.category?._id || initial.category || '',
        brand: initial.brand?._id || initial.brand || '',
      });
      setNameVal(initial.name || '');
      setSkuVal(initial.sku || '');
      setBarcodeVal(initial.barcode || '');
      setHsnVal(initial.hsn || '');
      setCategoryId(initial.category?._id || initial.category || '');
      setCategoryName(initial.category?.name || '');
      setBrandId(initial.brand?._id || initial.brand || '');
      setBrandName(initial.brand?.name || '');
      setOpeningStocks([]);
    } else {
      reset({ priceIncludesGst: false, unit: 'pcs', gst: 0, status: 'active' });
      setNameVal(''); setSkuVal(''); setBarcodeVal(''); setHsnVal('');
      setCategoryId(''); setCategoryName('');
      setBrandId(''); setBrandName('');
      setOpeningStocks([]);
    }
  }, [open]);

  // Autofill from product search suggestion
  const handleAutofill = useCallback((product) => {
    reset({
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice,
      mrp: product.mrp || '',
      gst: product.gst || 0,
      unit: product.unit || 'pcs',
      priceIncludesGst: product.priceIncludesGst || false,
      minStock: product.minStock || 0,
      openingStock: product.openingStock || 0,
      discount: product.discount || 0,
      status: 'active',
    });
    setNameVal(product.name || '');
    setSkuVal(product.sku || '');
    setBarcodeVal(product.barcode || '');
    setHsnVal(product.hsn || '');
    setCategoryId(product.category?._id || product.category || '');
    setCategoryName(product.category?.name || '');
    setBrandId(product.brand?._id || product.brand || '');
    setBrandName(product.brand?.name || '');
  }, [reset]);

  // CreatableSelect fetch functions
  const fetchCategories = async (q) => {
    const { data } = await categoriesAPI.getAll({ search: q, limit: 30, status: 'active' });
    return data.data || [];
  };
  const createCategory = async (name) => {
    const { data } = await categoriesAPI.create({ name, status: 'active' });
    toast.success(`Category "${name}" created`);
    return data;
  };
  const fetchBrands = async (q) => {
    const { data } = await brandsAPI.getAll({ search: q, limit: 30, status: 'active' });
    return data.data || [];
  };
  const createBrand = async (name) => {
    const { data } = await brandsAPI.create({ name, status: 'active' });
    toast.success(`Brand "${name}" created`);
    return data;
  };

  const onSubmit = async (data) => {
    try {
      data.name = nameVal.trim();
      data.sku = skuVal.trim();
      data.barcode = barcodeVal.trim() || undefined;
      data.hsn = hsnVal.trim() || undefined;
      data.category = categoryId || undefined;
      data.brand = brandId || undefined;

      if (!data.name) return toast.error('Product name is required');
      if (!data.sku) return toast.error('SKU is required');

      if (!initial) data.openingStockBranches = JSON.stringify(openingStocks);

      if (initial?._id) {
        await productsAPI.update(initial._id, data);
        toast.success('Product updated');
      } else {
        await productsAPI.create(data);
        toast.success('Product created');
      }
      onClose();
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    }
  };

  const gstOptions = [0, 3, 5, 12, 18, 28];
  const unitOptions = ['pcs', 'kg', 'g', 'l', 'ml', 'box', 'pack', 'dozen', 'pair'];
  const maxTabs = initial ? 2 : 3;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { maxHeight: '92vh' } }}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle sx={{ pb: 0 }}>
          {initial ? 'Edit Product' : 'Add Product'}
          <Typography variant="caption" color="text.secondary" display="block">
            {initial ? 'Update product details' : 'Type in any field below to search & autofill from existing products'}
          </Typography>
        </DialogTitle>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Basic Info" />
          <Tab label="Pricing & GST" />
          {!initial && <Tab label={`Opening Stock${openingStocks.length ? ` (${openingStocks.length})` : ''}`} />}
        </Tabs>

        <DialogContent sx={{ pt: 2, pb: 1 }}>

          {/* ── Tab 0: Basic Info ── */}
          {tab === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}>
                <ProductAutocompleteField
                  fullWidth size="small" label="Product Name *"
                  field="name" value={nameVal}
                  onChange={setNameVal}
                  onSelect={handleAutofill}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <ProductAutocompleteField
                  fullWidth size="small" label="SKU *"
                  field="sku" value={skuVal}
                  onChange={v => setSkuVal(v.toUpperCase())}
                  onSelect={handleAutofill}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <ProductAutocompleteField
                  fullWidth size="small" label="Barcode"
                  field="barcode" value={barcodeVal}
                  onChange={setBarcodeVal}
                  onSelect={handleAutofill}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <ProductAutocompleteField
                  fullWidth size="small" label="HSN Code"
                  field="hsn" value={hsnVal}
                  onChange={setHsnVal}
                  onSelect={handleAutofill}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Unit</InputLabel>
                  <Controller name="unit" control={control} render={({ field }) => (
                    <Select {...field} label="Unit">
                      {unitOptions.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                    </Select>
                  )} />
                </FormControl>
              </Grid>

              {/* Category — type to search, create inline */}
              <Grid item xs={12} sm={6}>
                <CreatableSelect
                  label="Category"
                  value={categoryId}
                  displayValue={categoryName}
                  onChange={(id) => setCategoryId(id || '')}
                  fetchOptions={fetchCategories}
                  onCreate={async (name) => {
                    const created = await createCategory(name);
                    setCategoryName(created.name);
                    return created;
                  }}
                />
              </Grid>

              {/* Brand — type to search, create inline */}
              <Grid item xs={12} sm={6}>
                <CreatableSelect
                  label="Brand"
                  value={brandId}
                  displayValue={brandName}
                  onChange={(id) => setBrandId(id || '')}
                  fetchOptions={fetchBrands}
                  onCreate={async (name) => {
                    const created = await createBrand(name);
                    setBrandName(created.name);
                    return created;
                  }}
                />
              </Grid>

              <Grid item xs={6} sm={3}>
                <TextField fullWidth size="small" label="Min Stock" type="number"
                  {...register('minStock')} inputProps={{ min: 0 }} />
              </Grid>
              {initial && (
                <Grid item xs={6} sm={3}>
                  <TextField fullWidth size="small" label="Opening Stock" type="number"
                    {...register('openingStock')} inputProps={{ min: 0 }} />
                </Grid>
              )}
              <Grid item xs={6} sm={3}>
                <TextField fullWidth size="small" label="Discount %" type="number"
                  {...register('discount')} inputProps={{ min: 0, max: 100 }} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Controller name="status" control={control} render={({ field }) => (
                    <Select {...field} label="Status">
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                    </Select>
                  )} />
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth size="small" label="Description" multiline rows={2}
                  {...register('description')} />
              </Grid>
            </Grid>
          )}

          {/* ── Tab 1: Pricing & GST ── */}
          {tab === 1 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box display="flex" alignItems="center" p={1.5} bgcolor="action.hover" borderRadius={1}>
                  <Controller name="priceIncludesGst" control={control} render={({ field }) => (
                    <FormControlLabel
                      control={<Switch checked={!!field.value} onChange={e => field.onChange(e.target.checked)} />}
                      label={
                        <Typography variant="body2">
                          Selling price is <strong>{field.value ? 'inclusive' : 'exclusive'}</strong> of GST
                        </Typography>
                      }
                    />
                  )} />
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>GST %</InputLabel>
                  <Controller name="gst" control={control} render={({ field }) => (
                    <Select {...field} label="GST %">
                      {gstOptions.map(g => <MenuItem key={g} value={g}>{g}%</MenuItem>)}
                    </Select>
                  )} />
                </FormControl>
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField fullWidth size="small" label="Purchase Price *" type="number"
                  {...register('purchasePrice', { required: true })}
                  InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                  error={!!errors.purchasePrice}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField fullWidth size="small"
                  label={`Selling Price * (${priceIncludesGst ? 'Inc. GST' : 'Exc. GST'})`}
                  type="number"
                  {...register('sellingPrice', { required: true })}
                  InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                  helperText={gst > 0 ? (priceIncludesGst ? `Exc. GST: ₹${excGst}` : `Inc. GST: ₹${incGst}`) : ''}
                  error={!!errors.sellingPrice}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField fullWidth size="small" label="MRP" type="number"
                  {...register('mrp')}
                  InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                />
              </Grid>
              {gst > 0 && (
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ py: 0.5 }}>
                    ₹{sellingPrice || 0} → Exc. GST: ₹{excGst} | Inc. GST: ₹{incGst} | Tax amount: ₹{(incGst - excGst).toFixed(2)}
                  </Alert>
                </Grid>
              )}
              <Grid item xs={6} sm={4}>
                <TextField fullWidth size="small" label="Batch Number" {...register('batchNumber')} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <TextField fullWidth size="small" label="Mfg. Date" type="date"
                  {...register('manufacturingDate')} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <TextField fullWidth size="small" label="Expiry Date" type="date"
                  {...register('expiryDate')} InputLabelProps={{ shrink: true }} />
              </Grid>
            </Grid>
          )}

          {/* ── Tab 2: Opening Stock ── */}
          {tab === 2 && !initial && (
            <Box>
              {branches.length === 0 ? (
                <Alert severity="warning">No branches found. Add branches first from Settings.</Alert>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    Set opening stock for each branch. Leave blank or 0 to skip.
                  </Typography>
                  <OpeningStockTable branches={branches} value={openingStocks} onChange={setOpeningStocks} />
                  {openingStocks.length > 0 && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      Total: {openingStocks.reduce((s, r) => s + r.qty, 0)} units across {openingStocks.length} branch(es)
                    </Alert>
                  )}
                </>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={onClose} variant="outlined">Cancel</Button>
          {tab > 0 && <Button onClick={() => setTab(t => t - 1)}>Back</Button>}
          {tab < maxTabs - 1 && (
            <Button variant="contained" onClick={() => setTab(t => t + 1)}>Next</Button>
          )}
          {tab === maxTabs - 1 && (
            <Button type="submit" variant="contained" color="success" disabled={isSubmitting}>
              {isSubmitting ? <CircularProgress size={20} /> : (initial ? 'Update Product' : 'Create Product')}
            </Button>
          )}
        </DialogActions>
      </form>
    </Dialog>
  );
};

// ── Products List ─────────────────────────────────────────────────────────────
const Products = () => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await productsAPI.getAll({ page, limit: pageSize, search });
      setRows(data.data);
      setTotal(data.total);
    } catch { toast.error('Failed to load products'); }
    finally { setLoading(false); }
  }, [page, pageSize, search]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleDelete = async () => {
    try {
      await productsAPI.remove(deleteId);
      toast.success('Product deleted');
      setDeleteId(null);
      fetchProducts();
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
  };

  const columns = [
    { field: 'name', headerName: 'Product', flex: 1.5, minWidth: 160 },
    { field: 'sku', headerName: 'SKU', flex: 0.9, minWidth: 100 },
    { field: 'barcode', headerName: 'Barcode', flex: 0.9, minWidth: 110 },
    {
      field: 'sellingPrice', headerName: 'Price', flex: 0.9, minWidth: 100,
      renderCell: ({ row }) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>₹{row.sellingPrice}</Typography>
          <Typography variant="caption" color="text.secondary">{row.priceIncludesGst ? 'Inc.GST' : 'Exc.GST'}</Typography>
        </Box>
      ),
    },
    { field: 'purchasePrice', headerName: 'Cost', flex: 0.7, minWidth: 80, renderCell: ({ value }) => `₹${value}` },
    { field: 'gst', headerName: 'GST%', flex: 0.5, minWidth: 60 },
    { field: 'category', headerName: 'Category', flex: 0.9, minWidth: 100, renderCell: ({ value }) => value?.name || '-' },
    { field: 'brand', headerName: 'Brand', flex: 0.8, minWidth: 90, renderCell: ({ value }) => value?.name || '-' },
    {
      field: 'status', headerName: 'Status', flex: 0.6, minWidth: 80,
      renderCell: ({ value }) => <Chip label={value} size="small" color={value === 'active' ? 'success' : 'default'} />,
    },
    {
      field: 'actions', headerName: '', width: 90, sortable: false,
      renderCell: ({ row }) => (
        <>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => { setEditing(row); setFormOpen(true); }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => setDeleteId(row._id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader title="Products" action="Add Product" onAction={() => { setEditing(null); setFormOpen(true); }} />
      <Box mb={2}>
        <TextField size="small" placeholder="Search by name, SKU, barcode..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }} sx={{ width: 320 }} />
      </Box>
      <DataTable rows={rows} columns={columns} loading={loading} total={total}
        page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />

      <ProductForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSaved={fetchProducts}
        initial={editing}
      />

      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete Product?</DialogTitle>
        <DialogContent>
          <Typography>This will permanently delete the product. Stock records will remain.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Products;
