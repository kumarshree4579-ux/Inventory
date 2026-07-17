import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Select, FormControl, InputLabel,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import { expensesAPI } from '../../api/services';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const CATEGORIES = ['electricity', 'rent', 'salary', 'office', 'travel', 'miscellaneous'];
const CAT_COLORS = { electricity: 'warning', rent: 'error', salary: 'primary', office: 'info', travel: 'secondary', miscellaneous: 'default' };

const columns = [
  { field: 'category', headerName: 'Category', flex: 1, renderCell: ({ value }) => (
    <Chip label={value} size="small" color={CAT_COLORS[value] || 'default'} sx={{ textTransform: 'capitalize' }} />
  )},
  { field: 'description', headerName: 'Description', flex: 2 },
  { field: 'amount', headerName: 'Amount', flex: 0.9, renderCell: ({ value }) => `₹${(value || 0).toLocaleString()}` },
  { field: 'paidBy', headerName: 'Paid By', flex: 1, renderCell: ({ value }) => value?.name || '—' },
  { field: 'date', headerName: 'Date', flex: 1, renderCell: ({ value }) => dayjs(value).format('DD MMM YYYY') },
];

const ExpenseForm = ({ open, onClose, onSaved }) => {
  const { register, handleSubmit, reset, control, formState: { isSubmitting } } = useForm({ defaultValues: { category: 'miscellaneous' } });
  const onSubmit = async (data) => {
    try {
      await expensesAPI.create(data);
      toast.success('Expense added');
      reset(); onClose(); onSaved();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Add Expense</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Category</InputLabel>
            <Controller name="category" control={control} render={({ field }) => (
              <Select {...field} label="Category">
                {CATEGORIES.map(c => <MenuItem key={c} value={c} sx={{ textTransform: 'capitalize' }}>{c}</MenuItem>)}
              </Select>
            )} />
          </FormControl>
          <TextField fullWidth label="Amount" type="number" {...register('amount', { required: true, min: 1 })} />
          <TextField fullWidth label="Description" multiline rows={2} {...register('description')} />
          <TextField fullWidth label="Date" type="date" InputLabelProps={{ shrink: true }} {...register('date')} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} variant="outlined">Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>Add Expense</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

const Expenses = () => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await expensesAPI.getAll({ page, limit: pageSize });
      setRows(data.data);
      setTotal(data.total);
    } catch { toast.error('Failed to load expenses'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [page, pageSize]);

  return (
    <Box>
      <PageHeader title="Expenses" subtitle="Track business expenses" action="Add Expense" onAction={() => setOpen(true)} />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {CATEGORIES.map(cat => {
          const catTotal = rows.filter(r => r.category === cat).reduce((s, r) => s + r.amount, 0);
          return catTotal > 0 ? (
            <Grid key={cat}>
              <Card sx={{ minWidth: 140 }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{cat}</Typography>
                  <Typography variant="h6" fontWeight={700}>₹{catTotal.toLocaleString()}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ) : null;
        })}
      </Grid>

      <DataTable
        rows={rows} columns={columns} loading={loading} total={total}
        page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize}
      />
      <ExpenseForm open={open} onClose={() => setOpen(false)} onSaved={fetchData} />
    </Box>
  );
};

export default Expenses;
