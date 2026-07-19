import { useState, useEffect, useCallback } from 'react';
import {
  Box, TextField, Chip, Typography, Card, Grid, MenuItem, Select,
  FormControl, InputLabel, IconButton, Tooltip, Table,
  TableHead, TableRow, TableCell, TableBody, Button, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PrintIcon from '@mui/icons-material/Print';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import { salesAPI, branchesAPI } from '../../api/services';
import useAuthStore from '../../store/authStore';
import { printReceipt } from '../../utils/print';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

const STATUS_COLOR = { completed: 'success', held: 'warning', cancelled: 'error', returned: 'default' };

// ── Expandable row detail ─────────────────────────────────────────────────────
const SaleDetail = ({ sale }) => (
  <Box sx={{ px: 3, py: 1.5, bgcolor: 'action.hover' }}>
    <Grid container spacing={2}>
      <Grid item xs={12} md={8}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>Qty</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Rate</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>GST%</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sale.items.map((it, i) => (
              <TableRow key={i}>
                <TableCell>{it.product?.name || '—'}</TableCell>
                <TableCell align="center">{it.quantity}</TableCell>
                <TableCell align="right">₹{(+it.price).toFixed(2)}</TableCell>
                <TableCell align="right">{it.gst || 0}%</TableCell>
                <TableCell align="right">₹{(+it.total).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Grid>
      <Grid item xs={12} md={4}>
        <Box display="flex" flexDirection="column" gap={0.5}>
          {[
            ['Subtotal', `₹${(+sale.subtotal).toFixed(2)}`],
            ['Tax', `₹${(+sale.taxAmount).toFixed(2)}`],
            ['Discount', `-₹${(+sale.discountAmount || 0).toFixed(2)}`],
          ].map(([k, v]) => (
            <Box key={k} display="flex" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">{k}</Typography>
              <Typography variant="body2">{v}</Typography>
            </Box>
          ))}
          <Divider />
          <Box display="flex" justifyContent="space-between">
            <Typography fontWeight={700}>Total</Typography>
            <Typography fontWeight={700} color="primary.main">₹{(+sale.total).toFixed(2)}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">Payment</Typography>
            <Chip label={sale.paymentMethod} size="small" color="primary" variant="outlined" />
          </Box>
          {sale.cashier && (
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">Cashier</Typography>
              <Typography variant="body2">{sale.cashier.name}</Typography>
            </Box>
          )}
        </Box>
      </Grid>
    </Grid>
  </Box>
);

// ── Sales Page ────────────────────────────────────────────────────────────────
const Sales = () => {
  const { user } = useAuthStore();
  const isAdmin = !user?.branch; // admin has no branch assigned
  const userBranchId = user?.branch?._id || user?.branch || null;

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  // Admin defaults to '' (All Branches); branch users are locked to their branch
  const [selectedBranch, setSelectedBranch] = useState(isAdmin ? '' : userBranchId);
  const [from, setFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [status, setStatus] = useState('');
  const [detailSale, setDetailSale] = useState(null);

  // Only fetch branch list for admin (branch users don't need it)
  useEffect(() => {
    if (!isAdmin) return;
    branchesAPI.getAll({ limit: 100, status: 'active' })
      .then(({ data }) => setBranches(data.data || []))
      .catch(() => {});
  }, [isAdmin]);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: pageSize };
      // Admin: send selected branch (empty = all branches)
      // Branch user: backend branchGuard enforces their branch, no need to send
      if (isAdmin && selectedBranch) params.branch = selectedBranch;
      if (from) params.from = from;
      if (to) params.to = to + 'T23:59:59';
      if (status) params.status = status;
      const { data } = await salesAPI.getAll(params);
      setRows(data.data || []);
      setTotal(data.total || 0);
    } catch { toast.error('Failed to load sales'); }
    finally { setLoading(false); }
  }, [page, pageSize, selectedBranch, from, to, status, isAdmin]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const pageTotal = rows.reduce((s, r) => s + (+r.total || 0), 0);

  const columns = [
    {
      field: 'expand', headerName: '', width: 40, sortable: false,
      renderCell: ({ row }) => (
        <IconButton size="small" onClick={() => setDetailSale(row)}>
          <VisibilityIcon fontSize="small" />
        </IconButton>
      ),
    },
    { field: 'billNumber', headerName: 'Bill #', flex: 1, minWidth: 130 },
    {
      field: 'createdAt', headerName: 'Date & Time', flex: 1.2, minWidth: 150,
      renderCell: ({ value }) => (
        <Box>
          <Typography variant="body2">{dayjs(value).format('DD MMM YYYY')}</Typography>
          <Typography variant="caption" color="text.secondary">{dayjs(value).format('hh:mm A')}</Typography>
        </Box>
      ),
    },
    // Show branch column only for admin viewing all/multiple branches
    ...(isAdmin ? [{
      field: 'branch', headerName: 'Branch', flex: 0.9, minWidth: 110,
      renderCell: ({ value }) => value?.name || '—',
    }] : []),
    {
      field: 'customer', headerName: 'Customer', flex: 1, minWidth: 120,
      renderCell: ({ value }) => value?.name || <Typography variant="caption" color="text.disabled">Walk-in</Typography>,
    },
    {
      field: 'items', headerName: 'Items', flex: 0.5, minWidth: 60,
      renderCell: ({ value }) => value?.reduce((s, i) => s + i.quantity, 0) || 0,
    },
    {
      field: 'total', headerName: 'Total', flex: 0.8, minWidth: 100,
      renderCell: ({ value }) => <Typography fontWeight={700} color="primary.main">₹{(+value).toFixed(2)}</Typography>,
    },
    {
      field: 'paymentMethod', headerName: 'Payment', flex: 0.8, minWidth: 90,
      renderCell: ({ value }) => <Chip label={value} size="small" variant="outlined" />,
    },
    {
      field: 'cashier', headerName: 'Cashier', flex: 0.9, minWidth: 100,
      renderCell: ({ value }) => value?.name || '—',
    },
    {
      field: 'status', headerName: 'Status', flex: 0.7, minWidth: 90,
      renderCell: ({ value }) => <Chip label={value} size="small" color={STATUS_COLOR[value] || 'default'} />,
    },
    {
      field: 'actions', headerName: '', width: 60, sortable: false,
      renderCell: ({ row }) => (
        <Tooltip title="Reprint Receipt">
          <IconButton size="small" onClick={() => printReceipt(row)}>
            <PrintIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader title="Sales History" />

      {/* Filters */}
      <Card sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={1.5} alignItems="center">
          {/* Branch filter — admin only */}
          {isAdmin && (
            <Grid item xs={12} sm={6} md={3}>
              <FormControl size="small" fullWidth>
                <InputLabel>Branch</InputLabel>
                <Select
                  value={selectedBranch}
                  onChange={e => { setSelectedBranch(e.target.value); setPage(1); }}
                  label="Branch"
                >
                  <MenuItem value="">All Branches</MenuItem>
                  {branches.map(b => <MenuItem key={b._id} value={b._id}>{b.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          )}
          <Grid item xs={6} sm={3} md={2}>
            <TextField size="small" fullWidth label="From" type="date"
              value={from} onChange={e => { setFrom(e.target.value); setPage(1); }}
              InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <TextField size="small" fullWidth label="To" type="date"
              value={to} onChange={e => { setTo(e.target.value); setPage(1); }}
              InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} label="Status">
                <MenuItem value="">All</MenuItem>
                {['completed', 'held', 'cancelled', 'returned'].map(s => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={3} md={isAdmin ? 3 : 6}>
            <Box display="flex" gap={1} alignItems="center">
              <Button size="small" variant="outlined" onClick={() => { setPage(1); fetchSales(); }}>Apply</Button>
              <Typography variant="body2" color="text.secondary" noWrap>
                Page total: <b>₹{pageTotal.toFixed(2)}</b>
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Card>

      <Card>
        <DataTable
          rows={rows} columns={columns} loading={loading} total={total}
          page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize}
        />
      </Card>

      {/* Sale detail modal */}
      <Dialog open={!!detailSale} onClose={() => setDetailSale(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            Bill# <b>{detailSale?.billNumber}</b>
            <Typography variant="caption" color="text.secondary" display="block">
              {detailSale && new Date(detailSale.createdAt).toLocaleString('en-IN')}
            </Typography>
          </Box>
          <Tooltip title="Reprint">
            <IconButton onClick={() => printReceipt(detailSale)}><PrintIcon /></IconButton>
          </Tooltip>
        </DialogTitle>
        <DialogContent dividers>
          {detailSale && <SaleDetail sale={detailSale} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailSale(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Sales;
