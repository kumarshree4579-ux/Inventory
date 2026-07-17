import { useState, useEffect } from 'react';
import { Box, TextField, IconButton, Tooltip, Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography, InputAdornment } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import PageHeader from './PageHeader';
import DataTable from './DataTable';
import toast from 'react-hot-toast';

const ListPage = ({ title, subtitle, columns: extraColumns, api, searchable = true, addLabel, onAdd, onEdit }) => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await api.getAll({ page, limit: pageSize, ...(search && { search }) });
      setRows(data.data);
      setTotal(data.total);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page, pageSize, search]);

  const handleDelete = async () => {
    try {
      await api.remove(deleteId);
      toast.success('Deleted successfully');
      setDeleteId(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const actionColumn = {
    field: 'actions', headerName: '', width: 90, sortable: false,
    renderCell: ({ row }) => (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Tooltip title="Edit"><IconButton size="small" onClick={() => onEdit?.(row)}><EditIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
        {api.remove && (
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => setDeleteId(row._id)}>
              <DeleteIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    ),
  };

  return (
    <Box>
      <PageHeader title={title} subtitle={subtitle} action={addLabel || `Add ${title}`} onAction={onAdd} />

      {searchable && (
        <Box sx={{ mb: 2 }}>
          <TextField
            placeholder={`Search ${title.toLowerCase()}...`}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            sx={{ width: 300 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment> }}
          />
        </Box>
      )}

      <DataTable
        rows={rows} columns={[...extraColumns, actionColumn]}
        loading={loading} total={total} page={page} pageSize={pageSize}
        onPageChange={setPage} onPageSizeChange={setPageSize}
      />

      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Confirmation</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">Are you sure you want to delete this record? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteId(null)} variant="outlined">Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ListPage;
