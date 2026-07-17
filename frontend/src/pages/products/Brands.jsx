import { useState, useEffect, useRef } from 'react';
import {
  Box, Chip, Avatar, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, MenuItem, Select, FormControl, InputLabel,
  Typography, IconButton,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import { brandsAPI } from '../../api/services';
import toast from 'react-hot-toast';

const BrandForm = ({ open, onClose, onSaved, editing }) => {
  const { register, handleSubmit, reset, control, formState: { isSubmitting } } = useForm();
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const inputRef = useRef();

  useEffect(() => {
    if (!open) return;
    reset({ name: editing?.name || '', status: editing?.status || 'active' });
    setPreview(editing?.logo || null);
    setFile(null);
  }, [open, editing]);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const onSubmit = async (data) => {
    try {
      const payload = { ...data, ...(file && { logo: file }) };
      if (editing) await brandsAPI.update(editing._id, payload);
      else await brandsAPI.create(payload);
      toast.success(editing ? 'Brand updated' : 'Brand created');
      onClose();
      onSaved();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>{editing ? 'Edit Brand' : 'Add Brand'}</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField fullWidth size="small" label="Brand Name *"
            {...register('name', { required: true })} autoFocus />

          <Box display="flex" alignItems="center" gap={2}>
            <Avatar src={preview} sx={{ width: 56, height: 56, border: '1px dashed', borderColor: 'divider' }} />
            <Box>
              <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFile} />
              <Button variant="outlined" size="small" onClick={() => inputRef.current.click()}>
                {preview ? 'Change Logo' : 'Upload Logo'}
              </Button>
              {preview && (
                <IconButton size="small" sx={{ ml: 1 }}
                  onClick={() => { setPreview(null); setFile(null); if (inputRef.current) inputRef.current.value = ''; }}>
                  ✕
                </IconButton>
              )}
              <Typography variant="caption" display="block" color="text.secondary" mt={0.5}>
                JPG, PNG or WebP
              </Typography>
            </Box>
          </Box>

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

const Brands = () => {
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
      const { data } = await brandsAPI.getAll({ page, limit: pageSize, search });
      setRows(data.data || []);
      setTotal(data.total || 0);
    } catch { toast.error('Failed to load brands'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [page, pageSize, search]);

  const handleDelete = async () => {
    try {
      await brandsAPI.remove(deleteId);
      toast.success('Brand deleted');
      setDeleteId(null);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
  };

  const columns = [
    {
      field: 'logo', headerName: '', width: 56,
      renderCell: ({ value, row }) => (
        <Avatar src={value} sx={{ width: 32, height: 32, bgcolor: 'primary.light', fontSize: 13 }}>
          {!value && row.name?.[0]?.toUpperCase()}
        </Avatar>
      ),
    },
    { field: 'name', headerName: 'Brand Name', flex: 1.5 },
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
      <PageHeader title="Brands" action="Add Brand" onAction={() => { setEditing(null); setOpen(true); }} />
      <Box mb={2}>
        <TextField size="small" placeholder="Search brands..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }} sx={{ width: 280 }} />
      </Box>
      <DataTable rows={rows} columns={columns} loading={loading} total={total}
        page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />

      <BrandForm open={open} onClose={() => { setOpen(false); setEditing(null); }} onSaved={fetchData} editing={editing} />

      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete Brand?</DialogTitle>
        <DialogContent><Typography>Products using this brand will lose their brand.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Brands;
