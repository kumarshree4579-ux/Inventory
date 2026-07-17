import { useState, useEffect } from 'react';
import {
  Box, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, MenuItem, Select, FormControl, InputLabel, Typography,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import CreatableSelect from '../../components/common/CreatableSelect';
import { categoriesAPI } from '../../api/services';
import toast from 'react-hot-toast';

const CategoryForm = ({ open, onClose, onSaved, editing }) => {
  const { register, handleSubmit, reset, control, formState: { isSubmitting } } = useForm();
  const [parentId, setParentId] = useState('');
  const [parentName, setParentName] = useState('');

  useEffect(() => {
    if (!open) return;
    reset({ name: editing?.name || '', status: editing?.status || 'active' });
    setParentId(editing?.parent?._id || editing?.parent || '');
    setParentName(editing?.parent?.name || '');
  }, [open, editing]);

  const fetchParents = async (q) => {
    const { data } = await categoriesAPI.getAll({ search: q, limit: 30, status: 'active' });
    // Only root categories as parents (no parent themselves)
    return (data.data || []).filter(c => !c.parent && c._id !== editing?._id);
  };

  const createParent = async (name) => {
    const { data } = await categoriesAPI.create({ name, status: 'active' });
    toast.success(`Category "${name}" created`);
    return data;
  };

  const onSubmit = async (data) => {
    try {
      const payload = { ...data, parent: parentId || null };
      if (editing) await categoriesAPI.update(editing._id, payload);
      else await categoriesAPI.create(payload);
      toast.success(editing ? 'Category updated' : 'Category created');
      onClose();
      onSaved();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>{editing ? 'Edit Category' : 'Add Category'}</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth size="small" label="Category Name *"
            {...register('name', { required: true })}
            autoFocus
          />
          <CreatableSelect
            label="Parent Category (optional)"
            value={parentId}
            displayValue={parentName}
            onChange={(id) => setParentId(id || '')}
            fetchOptions={fetchParents}
            onCreate={async (name) => {
              const created = await createParent(name);
              setParentName(created.name);
              return created;
            }}
            placeholder="Type to search or leave blank for root"
          />
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Controller name="status" control={control} defaultValue="active" render={({ field }) => (
              <Select {...field} label="Status">
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            )} />
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} variant="outlined">Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {editing ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

const Categories = () => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await categoriesAPI.getAll({ page, limit: pageSize, search });
      setRows(data.data || []);
      setTotal(data.total || 0);
    } catch { toast.error('Failed to load categories'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [page, pageSize, search]);

  const handleDelete = async () => {
    try {
      await categoriesAPI.remove(deleteId);
      toast.success('Deleted');
      setDeleteId(null);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
  };

  const columns = [
    { field: 'name', headerName: 'Category Name', flex: 1.5 },
    {
      field: 'parent', headerName: 'Parent', flex: 1,
      renderCell: ({ value }) => value?.name
        ? <Chip label={value.name} size="small" variant="outlined" />
        : <Typography variant="caption" color="text.secondary">Root</Typography>,
    },
    {
      field: 'status', headerName: 'Status', flex: 0.8,
      renderCell: ({ value }) => <Chip label={value} size="small" color={value === 'active' ? 'success' : 'default'} />,
    },
    {
      field: 'actions', headerName: '', width: 100, sortable: false,
      renderCell: ({ row }) => (
        <>
          <Button size="small" onClick={() => { setEditing(row); setOpen(true); }}>Edit</Button>
          <Button size="small" color="error" onClick={() => setDeleteId(row._id)}>Del</Button>
        </>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader title="Categories" action="Add Category" onAction={() => { setEditing(null); setOpen(true); }} />
      <Box mb={2}>
        <TextField size="small" placeholder="Search categories..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }} sx={{ width: 280 }} />
      </Box>
      <DataTable rows={rows} columns={columns} loading={loading} total={total}
        page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />

      <CategoryForm open={open} onClose={() => { setOpen(false); setEditing(null); }} onSaved={fetchData} editing={editing} />

      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete Category?</DialogTitle>
        <DialogContent><Typography>Products using this category will lose their category.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Categories;
