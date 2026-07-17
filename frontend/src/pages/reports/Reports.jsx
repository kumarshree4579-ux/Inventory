import { useState, useEffect } from 'react';
import { Box, Grid, Card, CardContent, Typography, TextField, Button, Tabs, Tab, Divider } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { reportsAPI } from '../../api/services';
import dayjs from 'dayjs';

const COLORS = ['#4f46e5', '#ef4444', '#f59e0b', '#10b981', '#0ea5e9'];

const Reports = () => {
  const [tab, setTab] = useState(0);
  const [from, setFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [data, setData] = useState(null);

  const fetchReport = async () => {
    const apis = [reportsAPI.sales, reportsAPI.purchase, reportsAPI.profit, reportsAPI.gst, reportsAPI.inventory];
    try {
      const { data: d } = await apis[tab]({ from, to });
      setData(d);
    } catch { setData(null); }
  };

  useEffect(() => { fetchReport(); }, [tab, from, to]);

  const profitItems = data && tab === 2 ? [
    { label: 'Revenue', value: data.revenue, color: '#10b981' },
    { label: 'Cost of Goods', value: data.cost, color: '#f59e0b' },
    { label: 'Expenses', value: data.expenses, color: '#ef4444' },
    { label: 'Gross Profit', value: data.grossProfit, color: '#4f46e5' },
    { label: 'Net Profit', value: data.netProfit, color: data.netProfit >= 0 ? '#10b981' : '#ef4444' },
  ] : [];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5">Reports</Typography>
        <Typography variant="body2" color="text.secondary">Analyze your business performance</Typography>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField type="date" label="From" value={from} onChange={e => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField type="date" label="To" value={to} onChange={e => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
            <Button variant="contained" onClick={fetchReport}>Apply Filter</Button>
          </Box>
        </CardContent>
      </Card>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, '& .MuiTabs-indicator': { height: 3, borderRadius: 2 }, borderBottom: '1px solid', borderColor: 'divider' }}>
        {['Sales', 'Purchase', 'Profit & Loss', 'GST', 'Inventory'].map((t, i) => <Tab key={i} label={t} />)}
      </Tabs>

      {(tab === 0 || tab === 1) && data && (
        <Card>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>{tab === 0 ? 'Sales' : 'Purchase'} Report</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="_id" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [`₹${v.toLocaleString()}`, tab === 0 ? 'Sales' : 'Purchase']} />
                <Bar dataKey="total" fill={COLORS[tab]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {tab === 2 && data && (
        <Grid container spacing={2.5}>
          {profitItems.map(item => (
            <Grid key={item.label} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{item.label}</Typography>
                  <Typography variant="h5" fontWeight={700} sx={{ color: item.color }}>₹{(item.value || 0).toLocaleString()}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {tab === 3 && data && (
        <Card>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>GST Summary</Typography>
            {data.map((row, i) => (
              <Box key={row._id}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="body2" fontWeight={600}>GST {row._id}%</Typography>
                  <Box sx={{ display: 'flex', gap: 3 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Taxable Amount</Typography>
                      <Typography variant="body2" fontWeight={600}>₹{row.taxableAmount?.toFixed(2)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Tax Collected</Typography>
                      <Typography variant="body2" fontWeight={600} color="primary.main">₹{row.taxAmount?.toFixed(2)}</Typography>
                    </Box>
                  </Box>
                </Box>
                {i < data.length - 1 && <Divider />}
              </Box>
            ))}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default Reports;
