import { useEffect } from 'react';
import { Box, Card, CardContent, Typography, TextField, Button, Grid, CircularProgress } from '@mui/material';
import { useForm } from 'react-hook-form';
import StoreIcon from '@mui/icons-material/Store';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { settingsAPI } from '../../api/services';
import toast from 'react-hot-toast';

const SectionHeader = ({ icon, title, subtitle }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
    <Box sx={{ p: 1, borderRadius: 2, bgcolor: '#4f46e518', color: 'primary.main', display: 'flex' }}>{icon}</Box>
    <Box>
      <Typography variant="h6">{title}</Typography>
      {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
    </Box>
  </Box>
);

const Settings = () => {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  useEffect(() => {
    settingsAPI.get().then(({ data }) => reset(data)).catch(() => {});
  }, []);

  const onSubmit = async (values) => {
    try {
      await settingsAPI.update(values);
      toast.success('Settings saved');
    } catch { toast.error('Failed to save settings'); }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5">System Settings</Typography>
        <Typography variant="body2" color="text.secondary">Configure your store preferences</Typography>
      </Box>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <SectionHeader icon={<StoreIcon fontSize="small" />} title="Store Information" subtitle="Basic store details" />
                <Grid container spacing={2}>
                  <Grid item xs={12}><TextField fullWidth label="Store Name" {...register('storeName')} /></Grid>
                  <Grid item xs={12}><TextField fullWidth label="Address" multiline rows={2} {...register('storeAddress')} /></Grid>
                  <Grid item xs={6}><TextField fullWidth label="Phone" {...register('storePhone')} /></Grid>
                  <Grid item xs={6}><TextField fullWidth label="Email" {...register('storeEmail')} /></Grid>
                  <Grid item xs={12}><TextField fullWidth label="GST Number" {...register('gstNumber')} /></Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <SectionHeader icon={<ReceiptIcon fontSize="small" />} title="Invoice & Currency" subtitle="Billing configuration" />
                <Grid container spacing={2}>
                  <Grid item xs={6}><TextField fullWidth label="Currency" {...register('currency')} /></Grid>
                  <Grid item xs={6}><TextField fullWidth label="Currency Symbol" {...register('currencySymbol')} /></Grid>
                  <Grid item xs={6}><TextField fullWidth label="Invoice Prefix" {...register('invoicePrefix')} /></Grid>
                  <Grid item xs={6}><TextField fullWidth label="Timezone" {...register('timezone')} /></Grid>
                  <Grid item xs={6}><TextField fullWidth label="Low Stock Threshold" type="number" {...register('lowStockThreshold')} /></Grid>
                  <Grid item xs={6}><TextField fullWidth label="Session Timeout (min)" type="number" {...register('sessionTimeout')} /></Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="submit" variant="contained" size="large" disabled={isSubmitting} sx={{ minWidth: 160 }}>
            {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Save Settings'}
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default Settings;
