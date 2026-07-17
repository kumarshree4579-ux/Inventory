import { useEffect, useState } from 'react';
import { Grid, Card, CardContent, Typography, Box, Chip, Skeleton, Divider } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PeopleIcon from '@mui/icons-material/People';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import StatCard from '../../components/common/StatCard';
import { dashboardAPI } from '../../api/services';
import { useSocket } from '../../hooks/useSocket';
import toast from 'react-hot-toast';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5, boxShadow: 2 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={600} color="primary.main">₹{payload[0].value?.toLocaleString()}</Typography>
    </Box>
  );
};

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const { data: d } = await dashboardAPI.get();
      setData(d);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useSocket({ new_sale: fetchData });
  useEffect(() => { fetchData(); }, []);

  if (loading) return (
    <Box>
      <Skeleton variant="text" width={160} height={36} sx={{ mb: 3 }} />
      <Grid container spacing={2.5}>
        {[1, 2, 3, 4].map(i => <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}><Skeleton variant="rounded" height={110} /></Grid>)}
        <Grid size={{ xs: 12, md: 8 }}><Skeleton variant="rounded" height={300} /></Grid>
        <Grid size={{ xs: 12, md: 4 }}><Skeleton variant="rounded" height={300} /></Grid>
      </Grid>
    </Box>
  );

  if (!data) return null;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5">Dashboard</Typography>
        <Typography variant="body2" color="text.secondary">Welcome back, {data.storeName || 'Admin'}</Typography>
      </Box>

      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Today's Sales" value={`₹${(data.todaySale || 0).toLocaleString()}`} icon={<AttachMoneyIcon />} color="#4f46e5" subtitle={`${data.todayBills || 0} bills`} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Today's Purchase" value={`₹${(data.todayPurchase || 0).toLocaleString()}`} icon={<ShoppingCartIcon />} color="#f59e0b" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Today's Customers" value={data.todayCustomers || 0} icon={<PeopleIcon />} color="#10b981" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Low Stock Items" value={data.lowStock || 0} icon={<WarningAmberIcon />} color="#ef4444" subtitle={`${data.outOfStock || 0} out of stock`} />
        </Grid>
      </Grid>

      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ mb: 0.5 }}>Monthly Sales</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Revenue trend this month</Typography>
              {data.monthlySales?.length ? (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data.monthlySales} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="_id" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#4f46e5' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
                  <Typography color="text.secondary" variant="body2">No sales data this month</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ mb: 0.5 }}>Top Products</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Best sellers today</Typography>
              {data.topProducts?.length ? data.topProducts.map((p, i) => (
                <Box key={p._id}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.25 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ width: 26, height: 26, borderRadius: 1.5, bgcolor: i === 0 ? '#4f46e5' : i === 1 ? '#0ea5e9' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: i < 2 ? '#fff' : '#64748b' }}>{i + 1}</Typography>
                      </Box>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 140 }}>{p.product?.name}</Typography>
                    </Box>
                    <Chip label={`${p.totalQty} sold`} size="small" color="primary" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                  </Box>
                  {i < data.topProducts.length - 1 && <Divider />}
                </Box>
              )) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                  <Typography color="text.secondary" variant="body2">No sales today</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {data.counters?.length > 0 && (
        <Card>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Counter Status</Typography>
            <Grid container spacing={2}>
              {data.counters.map(c => (
                <Grid key={c._id} size={{ xs: 12, sm: 6, md: 3 }}>
                  <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.default' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                      <Typography variant="body2" fontWeight={600}>Counter {c.number}</Typography>
                      <Chip label={c.status} size="small" color={c.status === 'open' ? 'success' : 'default'} />
                    </Box>
                    <Typography variant="caption" color="text.secondary">{c.cashier?.name || 'No cashier'}</Typography>
                    <Typography variant="h6" sx={{ mt: 0.5 }} color="primary.main">₹{(c.currentCash || 0).toLocaleString()}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default Dashboard;
