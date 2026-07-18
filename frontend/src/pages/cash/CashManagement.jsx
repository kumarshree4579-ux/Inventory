import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Divider, Alert, CircularProgress,
  FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockIcon from '@mui/icons-material/Lock';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { useForm, Controller } from 'react-hook-form';
import PageHeader from '../../components/common/PageHeader';
import { cashDrawerAPI, branchesAPI, countersAPI } from '../../api/services';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const SummaryCard = ({ label, value, color }) => (
  <Card>
    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h6" fontWeight={700} sx={{ color }}>
        ₹{(value || 0).toLocaleString()}
      </Typography>
    </CardContent>
  </Card>
);

const CashManagement = () => {
  const { user } = useAuthStore();
  const isAdmin = !user?.branch;
  const [drawer, setDrawer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const [branches, setBranches] = useState([]);
  const [counters, setCounters] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(user?.branch?._id || user?.branch || '');
  const [selectedCounter, setSelectedCounter] = useState('');
  const openForm = useForm();
  const closeForm = useForm();

  useEffect(() => {
    if (!isAdmin) return;
    branchesAPI.getAll({ limit: 100, status: 'active' }).then(({ data }) => {
      const list = data.data || [];
      setBranches(list);
      if (list.length && !selectedBranch) setSelectedBranch(list[0]._id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedBranch) return;
    countersAPI.getAll({ branch: selectedBranch, limit: 20 }).then(({ data }) => {
      setCounters(data.data || []);
    }).catch(() => {});
  }, [selectedBranch]);

  const fetchDrawer = async () => {
    try {
      const { data } = await cashDrawerAPI.get();
      setDrawer(data);
    } catch {
      setDrawer(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDrawer(); }, []);

  const handleOpen = async (data) => {
    try {
      await cashDrawerAPI.open({
        openingCash: +data.openingCash,
        notes: data.notes,
        branch: selectedBranch || undefined,
        counter: selectedCounter || undefined,
      });
      toast.success('Cash drawer opened');
      openForm.reset(); setOpenDialog(false); fetchDrawer();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to open drawer');
    }
  };

  const handleClose = async (data) => {
    try {
      const closingCash = +data.closingCash;
      const expectedCash = (drawer?.openingCash || 0) + (drawer?.cashIn || 0) - (drawer?.cashOut || 0) - (drawer?.expenses || 0);
      await cashDrawerAPI.close(drawer._id, { closingCash, expectedCash, difference: closingCash - expectedCash, notes: data.notes });
      toast.success('Cash drawer closed');
      closeForm.reset(); setCloseDialog(false); fetchDrawer();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to close drawer');
    }
  };

  const isOpen = drawer?.status === 'open';
  const expectedCash = drawer
    ? (drawer.openingCash || 0) + (drawer.cashIn || 0) - (drawer.cashOut || 0) - (drawer.expenses || 0)
    : 0;

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      <PageHeader
        title="Cash Management"
        subtitle="Manage daily cash drawer operations"
        action={isOpen ? 'Close Drawer' : 'Open Drawer'}
        actionIcon={isOpen ? <LockIcon /> : <LockOpenIcon />}
        onAction={() => isOpen ? setCloseDialog(true) : setOpenDialog(true)}
      />

      {!drawer && (
        <Alert severity="info" sx={{ mb: 3 }}>No active cash drawer. Open a drawer to start billing.</Alert>
      )}

      {drawer && (
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}><SummaryCard label="Opening Cash" value={drawer.openingCash} color="#4f46e5" /></Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}><SummaryCard label="Cash In" value={drawer.cashIn} color="#10b981" /></Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}><SummaryCard label="Cash Out" value={drawer.cashOut} color="#ef4444" /></Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}><SummaryCard label="Expenses" value={drawer.expenses} color="#f59e0b" /></Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}><SummaryCard label="Expected Cash" value={expectedCash} color="#0ea5e9" /></Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}><SummaryCard label="Current Cash" value={drawer.currentCash} color="#4f46e5" /></Grid>

          <Grid size={12}>
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <AccountBalanceWalletIcon color="primary" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Opened By</Typography>
                      <Typography variant="body1" fontWeight={600}>{drawer.openedBy?.name || '—'}</Typography>
                    </Box>
                    {drawer.counter && (
                      <>
                        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary">Counter</Typography>
                          <Typography variant="body1" fontWeight={600}>#{drawer.counter?.number || '—'}</Typography>
                        </Box>
                      </>
                    )}
                    {drawer.difference !== 0 && drawer.status === 'closed' && (
                      <>
                        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary">Difference</Typography>
                          <Typography variant="body1" fontWeight={600} color={drawer.difference >= 0 ? 'success.main' : 'error.main'}>
                            {drawer.difference >= 0 ? '+' : ''}₹{drawer.difference?.toLocaleString()}
                          </Typography>
                        </Box>
                      </>
                    )}
                  </Box>
                  <Chip label={drawer.status?.toUpperCase()} color={isOpen ? 'success' : 'default'} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="xs" fullWidth>
        <form onSubmit={openForm.handleSubmit(handleOpen)}>
          <DialogTitle>Open Cash Drawer</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            {isAdmin && (
              <FormControl size="small" fullWidth>
                <InputLabel>Branch</InputLabel>
                <Select value={selectedBranch} onChange={e => { setSelectedBranch(e.target.value); setSelectedCounter(''); }} label="Branch">
                  {branches.map(b => <MenuItem key={b._id} value={b._id}>{b.name}</MenuItem>)}
                </Select>
              </FormControl>
            )}
            <FormControl size="small" fullWidth>
              <InputLabel>Counter (optional)</InputLabel>
              <Select value={selectedCounter} onChange={e => setSelectedCounter(e.target.value)} label="Counter (optional)">
                <MenuItem value=""><em>No counter</em></MenuItem>
                {counters.map(c => <MenuItem key={c._id} value={c._id}>{c.name || `Counter ${c.number}`}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField fullWidth label="Opening Cash (₹)" type="number" {...openForm.register('openingCash', { required: true, min: 0 })} />
            <TextField fullWidth label="Notes" multiline rows={2} {...openForm.register('notes')} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setOpenDialog(false)} variant="outlined">Cancel</Button>
            <Button type="submit" variant="contained" disabled={openForm.formState.isSubmitting} startIcon={<LockOpenIcon />}>Open Drawer</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={closeDialog} onClose={() => setCloseDialog(false)} maxWidth="xs" fullWidth>
        <form onSubmit={closeForm.handleSubmit(handleClose)}>
          <DialogTitle>Close Cash Drawer</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Expected Cash</Typography>
                <Typography variant="body2" fontWeight={600}>₹{expectedCash.toLocaleString()}</Typography>
              </Box>
            </Box>
            <TextField fullWidth label="Actual Closing Cash (₹)" type="number" {...closeForm.register('closingCash', { required: true })} />
            <TextField fullWidth label="Notes" multiline rows={2} {...closeForm.register('notes')} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setCloseDialog(false)} variant="outlined">Cancel</Button>
            <Button type="submit" variant="contained" color="error" disabled={closeForm.formState.isSubmitting} startIcon={<LockIcon />}>Close Drawer</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default CashManagement;
