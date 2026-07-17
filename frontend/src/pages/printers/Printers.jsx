import { useState, useEffect } from 'react';
import {
  Chip, Box, Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Grid, MenuItem, Select, FormControl, InputLabel, Switch, FormControlLabel,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import ListPage from '../../components/common/ListPage';
import { printersAPI } from '../../api/services';
import toast from 'react-hot-toast';

const TYPE_COLOR = { thermal: 'primary', a4: 'info', label: 'warning', barcode: 'success' };

const columns = [
  { field: 'name', headerName: 'Printer Name', flex: 1.2 },
  { field: 'type', headerName: 'Type', flex: 0.8, renderCell: ({ value }) => <Chip label={value} size="small" color={TYPE_COLOR[value] || 'default'} /> },
  { field: 'paperSize', headerName: 'Paper Size', flex: 0.8 },
  { field: 'connection', headerName: 'Connection', flex: 0.8, renderCell: ({ value }) => <Chip label={value} size="small" variant="outlined" /> },
  { field: 'ipAddress', headerName: 'IP Address', flex: 1, renderCell: ({ value }) => value || '—' },
  { field: 'status', headerName: 'Status', flex: 0.7, renderCell: ({ value }) => <Chip label={value} size="small" color={value === 'active' ? 'success' : 'default'} /> },
];

const DEFAULTS = { type: 'thermal', paperSize: '80mm', connection: 'usb', autoPrint: false, showQR: true, cutPaper: true, copies: 1 };

const PrinterForm = ({ open, onClose, onSaved, editing }) => {
  const { register, handleSubmit, reset, control, watch, formState: { isSubmitting } } = useForm({ defaultValues: DEFAULTS });
  const connection = watch('connection');

  useEffect(() => {
    if (open) reset(editing ? { ...DEFAULTS, ...editing, ...editing.settings } : DEFAULTS);
  }, [open, editing]);

  const onSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        settings: { autoPrint: data.autoPrint, showQR: data.showQR, cutPaper: data.cutPaper, copies: +data.copies, header: data.header, footer: data.footer },
      };
      if (editing) await printersAPI.update(editing._id, payload);
      else await printersAPI.create(payload);
      toast.success(editing ? 'Printer updated' : 'Printer added');
      onClose(); onSaved();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>{editing ? 'Edit Printer' : 'Add Printer'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid size={12}><TextField fullWidth label="Printer Name" {...register('name', { required: true })} /></Grid>
            <Grid size={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Controller name="type" control={control} render={({ field }) => (
                  <Select {...field} label="Type">
                    {['thermal', 'a4', 'label', 'barcode'].map(t => <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t}</MenuItem>)}
                  </Select>
                )} />
              </FormControl>
            </Grid>
            <Grid size={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Paper Size</InputLabel>
                <Controller name="paperSize" control={control} render={({ field }) => (
                  <Select {...field} label="Paper Size">
                    {['58mm', '80mm', 'a4'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                )} />
              </FormControl>
            </Grid>
            <Grid size={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Connection</InputLabel>
                <Controller name="connection" control={control} render={({ field }) => (
                  <Select {...field} label="Connection">
                    {['usb', 'network', 'bluetooth'].map(c => <MenuItem key={c} value={c} sx={{ textTransform: 'capitalize' }}>{c}</MenuItem>)}
                  </Select>
                )} />
              </FormControl>
            </Grid>
            {connection === 'network' && (
              <>
                <Grid size={8}><TextField fullWidth label="IP Address" {...register('ipAddress')} /></Grid>
                <Grid size={4}><TextField fullWidth label="Port" type="number" {...register('port')} /></Grid>
              </>
            )}
            <Grid size={12}><TextField fullWidth label="Header Text" {...register('header')} /></Grid>
            <Grid size={12}><TextField fullWidth label="Footer Text" {...register('footer')} /></Grid>
            <Grid size={4}><TextField fullWidth label="Copies" type="number" {...register('copies')} /></Grid>
            <Grid size={8}>
              <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                <Controller name="autoPrint" control={control} render={({ field }) => <FormControlLabel control={<Switch {...field} checked={field.value} size="small" />} label="Auto Print" />} />
                <Controller name="showQR" control={control} render={({ field }) => <FormControlLabel control={<Switch {...field} checked={field.value} size="small" />} label="QR Code" />} />
                <Controller name="cutPaper" control={control} render={({ field }) => <FormControlLabel control={<Switch {...field} checked={field.value} size="small" />} label="Cut Paper" />} />
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} variant="outlined">Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>{editing ? 'Update' : 'Add'} Printer</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

const Printers = () => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [refresh, setRefresh] = useState(0);

  const handleClose = () => { setOpen(false); setEditing(null); };

  return (
    <>
      <ListPage key={refresh} title="Printer Configuration" subtitle="Manage thermal, label & barcode printers"
        columns={columns} api={printersAPI} addLabel="Add Printer" searchable={false}
        onAdd={() => { setEditing(null); setOpen(true); }}
        onEdit={(row) => { setEditing(row); setOpen(true); }}
      />
      <PrinterForm open={open} onClose={handleClose} onSaved={() => setRefresh(r => r + 1)} editing={editing} />
    </>
  );
};

export default Printers;
