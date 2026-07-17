import { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Box, TextField, Chip, IconButton, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, Grid, MenuItem, Select,
  FormControl, InputLabel, Switch, FormControlLabel, Typography,
  InputAdornment, Table, TableHead, TableRow, TableCell, TableBody,
  CircularProgress, Alert, Divider, LinearProgress,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import { useForm, Controller, useWatch } from 'react-hook-form';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import ProductAutocompleteField from '../../components/common/ProductAutocompleteField';
import CreatableSelect from '../../components/common/CreatableSelect';
import { productsAPI, categoriesAPI, brandsAPI, branchesAPI } from '../../api/services';
import api from '../../api/client';
import toast from 'react-hot-toast';

// ── GST helper ────────────────────────────────────────────────────────────────
const calcGst = (price, gst, includesGst) => {
  const p = +price || 0, g = +gst || 0;
  if (!g) return { inc: p, exc: p };
  return includesGst
    ? { inc: p, exc: +(p / (1 + g / 100)).toFixed(2) }
    : { inc: +(p * (1 + g / 100)).toFixed(2), exc: p };
};

const GST_OPTIONS = [0, 3, 5, 12, 18, 28];
const UNIT_OPTIONS = ['pcs', 'kg', 'g', 'l', 'ml', 'box', 'pack', 'dozen', 'pair'];

// ── Opening stock per branch table ────────────────────────────────────────────
const OpeningStockTable = ({ branches, value = [], onChange }) => {
  const update = (branchId, qty) => {
    const next = value.filter(r => r.branch !== branchId);
    if (+qty > 0) next.push({ branch: branchId, qty: +qty });
    onChange(next);
  };
  const getQty = (id) => value.find(r => r.branch === id)?.qty || '';
  if (!branches.length) return (
    <Alert severity="warning" sx={{ mt: 1 }}>No branches found. Add branches first from Settings → Branches.</Alert>
  );
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

// ── Product Form (single flat form, no tabs) ──────────────────────────────────
const ProductForm = ({ open, onClose, onSaved, initial }) => {
  const { register, handleSubmit, reset, control, formState: { isSubmitting, errors } } = useForm({
    defaultValues: { priceIncludesGst: false, unit: 'pcs', gst: 0, status: 'active', minStock: 0, discount: 0 },
  });

  const [branches, setBranches] = useState([]);
  const [openingStocks, setOpeningStocks] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [brandId, setBrandId] = useState('');
  const [brandName, setBrandName] = useState('');
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
      reset({ priceIncludesGst: false, unit: 'pcs', gst: 0, status: 'active', minStock: 0, discount: 0 });
      setNameVal(''); setSkuVal(''); setBarcodeVal(''); setHsnVal('');
      setCategoryId(''); setCategoryName('');
      setBrandId(''); setBrandName('');
      setOpeningStocks([]);
    }
  }, [open]);

  const handleAutofill = useCallback((product) => {
    reset({
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice,
      mrp: product.mrp || '',
      gst: product.gst || 0,
      unit: product.unit || 'pcs',
      priceIncludesGst: product.priceIncludesGst || false,
      minStock: product.minStock || 0,
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

  const fetchCategories = async (q) => {
    const { data } = await categoriesAPI.getAll({ search: q, limit: 30, status: 'active' });
    return data.data || [];
  };
  const fetchBrands = async (q) => {
    const { data } = await brandsAPI.getAll({ search: q, limit: 30, status: 'active' });
    return data.data || [];
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

  const totalOpeningQty = openingStocks.reduce((s, r) => s + r.qty, 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { maxHeight: '94vh' } }}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle sx={{ pb: 1 }}>
          {initial ? 'Edit Product' : 'Add Product'}
          <Typography variant="caption" color="text.secondary" display="block">
            {!initial && 'Type in Name / SKU / Barcode to search & autofill from existing products'}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          <Grid container spacing={2}>

            {/* ── Identity ── */}
            <Grid item xs={12} sm={8}>
              <ProductAutocompleteField fullWidth size="small" label="Product Name *"
                field="name" value={nameVal} onChange={setNameVal} onSelect={handleAutofill} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <ProductAutocompleteField fullWidth size="small" label="SKU *"
                field="sku" value={skuVal}
                onChange={v => setSkuVal(v.toUpperCase())} onSelect={handleAutofill} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <ProductAutocompleteField fullWidth size="small" label="Barcode"
                field="barcode" value={barcodeVal} onChange={setBarcodeVal} onSelect={handleAutofill} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <ProductAutocompleteField fullWidth size="small" label="HSN Code"
                field="hsn" value={hsnVal} onChange={setHsnVal} onSelect={handleAutofill} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Unit</InputLabel>
                <Controller name="unit" control={control} render={({ field }) => (
                  <Select {...field} label="Unit">
                    {UNIT_OPTIONS.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                  </Select>
                )} />
              </FormControl>
            </Grid>

            {/* ── Category & Brand ── */}
            <Grid item xs={12} sm={6}>
              <CreatableSelect label="Category" value={categoryId} displayValue={categoryName}
                onChange={id => setCategoryId(id || '')}
                fetchOptions={fetchCategories}
                onCreate={async (name) => {
                  const { data } = await categoriesAPI.create({ name, status: 'active' });
                  toast.success(`Category "${name}" created`);
                  setCategoryName(data.name);
                  return data;
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <CreatableSelect label="Brand" value={brandId} displayValue={brandName}
                onChange={id => setBrandId(id || '')}
                fetchOptions={fetchBrands}
                onCreate={async (name) => {
                  const { data } = await brandsAPI.create({ name, status: 'active' });
                  toast.success(`Brand "${name}" created`);
                  setBrandName(data.name);
                  return data;
                }}
              />
            </Grid>

            {/* ── Pricing ── */}
            <Grid item xs={12}>
              <Divider><Typography variant="caption" color="text.secondary">Pricing & GST</Typography></Divider>
            </Grid>
            <Grid item xs={12}>
              <Box display="flex" alignItems="center" px={1.5} py={1} bgcolor="action.hover" borderRadius={1}>
                <Controller name="priceIncludesGst" control={control} render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={!!field.value} onChange={e => field.onChange(e.target.checked)} size="small" />}
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
                    {GST_OPTIONS.map(g => <MenuItem key={g} value={g}>{g}%</MenuItem>)}
                  </Select>
                )} />
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth size="small" label="Purchase Price *" type="number"
                {...register('purchasePrice', { required: true })}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                error={!!errors.purchasePrice} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth size="small"
                label={`Selling Price * (${priceIncludesGst ? 'Inc.GST' : 'Exc.GST'})`}
                type="number"
                {...register('sellingPrice', { required: true })}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                helperText={gst > 0 ? (priceIncludesGst ? `Exc: ₹${excGst}` : `Inc: ₹${incGst}`) : ''}
                error={!!errors.sellingPrice} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth size="small" label="MRP" type="number"
                {...register('mrp')}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} />
            </Grid>
            {gst > 0 && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ py: 0.5 }}>
                  ₹{sellingPrice || 0} → Exc.GST: ₹{excGst} | Inc.GST: ₹{incGst} | Tax: ₹{(incGst - excGst).toFixed(2)}
                </Alert>
              </Grid>
            )}

            {/* ── Other fields ── */}
            <Grid item xs={12}>
              <Divider><Typography variant="caption" color="text.secondary">Other Details</Typography></Divider>
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth size="small" label="Min Stock" type="number"
                {...register('minStock')} inputProps={{ min: 0 }} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth size="small" label="Discount %" type="number"
                {...register('discount')} inputProps={{ min: 0, max: 100 }} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth size="small" label="Batch No." {...register('batchNumber')} />
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
            <Grid item xs={6} sm={4}>
              <TextField fullWidth size="small" label="Mfg. Date" type="date"
                {...register('manufacturingDate')} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField fullWidth size="small" label="Expiry Date" type="date"
                {...register('expiryDate')} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="Description" {...register('description')} />
            </Grid>

            {/* ── Opening Stock (add mode only) ── */}
            {!initial && (
              <>
                <Grid item xs={12}>
                  <Divider>
                    <Typography variant="caption" color="text.secondary">
                      Opening Stock per Branch
                      {totalOpeningQty > 0 && ` — ${totalOpeningQty} units across ${openingStocks.length} branch(es)`}
                    </Typography>
                  </Divider>
                </Grid>
                <Grid item xs={12}>
                  <OpeningStockTable branches={branches} value={openingStocks} onChange={setOpeningStocks} />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} variant="outlined">Cancel</Button>
          <Button type="submit" variant="contained" color="success" disabled={isSubmitting} sx={{ minWidth: 140 }}>
            {isSubmitting ? <CircularProgress size={20} /> : (initial ? 'Update Product' : 'Create Product')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

// ── Excel Import Dialog ───────────────────────────────────────────────────────
const TEMPLATE_COLS = [
  'Name', 'SKU', 'Barcode', 'HSN', 'Category', 'Brand',
  'Purchase Price', 'Selling Price', 'MRP', 'GST%', 'Unit',
  'Min Stock', 'Opening Stock', 'Discount%', 'Price Includes GST',
  'Batch Number', 'Description', 'Branch',
];

const downloadTemplate = () => {
  const ws = XLSX.utils.aoa_to_sheet([
    TEMPLATE_COLS,
    ['Sample Product', 'SKU001', '8901234567890', '1234', 'Electronics', 'Samsung',
      500, 799, 999, 18, 'pcs', 5, 10, 0, 'No', '', 'Sample description', 'Main Branch'],
  ]);
  ws['!cols'] = TEMPLATE_COLS.map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Products');
  XLSX.writeFile(wb, 'product_import_template.xlsx');
};

const ImportDialog = ({ open, onClose, onDone }) => {
  const fileRef = useRef(null);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [preview, setPreview] = useState([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open) return;
    setPreview([]); setFileName(''); setResult(null); setSelectedBranch('');
    branchesAPI.getAll({ limit: 100, status: 'active' })
      .then(({ data }) => {
        const list = data.data || [];
        setBranches(list);
        if (list.length) setSelectedBranch(list[0]._id);
      }).catch(() => {});
  }, [open]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      setPreview(rows.slice(0, 5)); // show first 5 rows as preview
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    const file = fileRef.current?.files[0];
    if (!file) return toast.error('Please select a file');
    if (!selectedBranch) return toast.error('Please select a branch');
    setImporting(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('branch', selectedBranch);
      const { data } = await api.post('/products/import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
      toast.success(data.message);
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Import Products from Excel
        <Typography variant="caption" color="text.secondary" display="block">
          Upload .xlsx file. Category & Brand auto-created if not found.
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>

        {/* Branch selector */}
        <FormControl size="small" fullWidth>
          <InputLabel>Default Branch (used if Branch column is empty)</InputLabel>
          <Select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}
            label="Default Branch (used if Branch column is empty)">
            {branches.map(b => <MenuItem key={b._id} value={b._id}>{b.name} ({b.code})</MenuItem>)}
          </Select>
        </FormControl>

        {/* File picker */}
        <Box>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
            id="import-file-input" onChange={handleFile} />
          <Box display="flex" gap={1} alignItems="center">
            <label htmlFor="import-file-input">
              <Button variant="outlined" component="span" startIcon={<UploadFileIcon />} size="small">
                Choose File
              </Button>
            </label>
            <Button size="small" startIcon={<DownloadIcon />} onClick={downloadTemplate}>
              Download Template
            </Button>
            {fileName && (
              <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1 }}>{fileName}</Typography>
            )}
          </Box>
        </Box>

        {/* Preview */}
        {preview.length > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
              Preview (first {preview.length} rows):
            </Typography>
            <Box sx={{ overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {Object.keys(preview[0]).slice(0, 7).map(k => (
                      <TableCell key={k} sx={{ fontWeight: 600, whiteSpace: 'nowrap', fontSize: 11 }}>{k}</TableCell>
                    ))}
                    {Object.keys(preview[0]).length > 7 && <TableCell sx={{ fontSize: 11 }}>...</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.map((row, i) => (
                    <TableRow key={i}>
                      {Object.values(row).slice(0, 7).map((v, j) => (
                        <TableCell key={j} sx={{ fontSize: 11, whiteSpace: 'nowrap' }}>{String(v)}</TableCell>
                      ))}
                      {Object.values(row).length > 7 && <TableCell sx={{ fontSize: 11 }}>...</TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Box>
        )}

        {importing && <LinearProgress />}

        {/* Result */}
        {result && (
          <Box display="flex" flexDirection="column" gap={1}>
            <Alert severity={result.skipped > 0 ? 'warning' : 'success'}>
              {result.message}
            </Alert>
            {result.errors?.length > 0 && (
              <Box sx={{ maxHeight: 140, overflowY: 'auto', border: '1px solid', borderColor: 'warning.light', borderRadius: 1, p: 1 }}>
                {result.errors.map((e, i) => (
                  <Typography key={i} variant="caption" color="error" display="block">
                    Row {e.row}{e.sku ? ` (${e.sku})` : ''}: {e.error}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} variant="outlined">Close</Button>
        <Button variant="contained" onClick={handleImport} disabled={importing || !preview.length}
          startIcon={importing ? <CircularProgress size={16} /> : <UploadFileIcon />}>
          {importing ? 'Importing...' : 'Import'}
        </Button>
      </DialogActions>
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
  const [importOpen, setImportOpen] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await productsAPI.getAll({ page, limit: pageSize, search });
      setRows(data.data || []);
      setTotal(data.total || 0);
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
    { field: 'category', headerName: 'Category', flex: 0.9, minWidth: 100, renderCell: ({ value }) => value?.name || '—' },
    { field: 'brand', headerName: 'Brand', flex: 0.8, minWidth: 90, renderCell: ({ value }) => value?.name || '—' },
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

      <Box display="flex" gap={1.5} mb={2} alignItems="center" flexWrap="wrap">
        <TextField size="small" placeholder="Search by name, SKU, barcode..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} sx={{ width: 300 }} />
        <Box flex={1} />
        <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => setImportOpen(true)}>
          Import Excel
        </Button>
      </Box>

      <DataTable rows={rows} columns={columns} loading={loading} total={total}
        page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />

      <ProductForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSaved={fetchProducts}
        initial={editing}
      />

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onDone={() => { setImportOpen(false); fetchProducts(); }}
      />

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
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
