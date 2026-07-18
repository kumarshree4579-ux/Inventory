import { useState, useEffect } from 'react';
import { Box, TextField, Chip, Typography } from '@mui/material';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import { auditAPI } from '../../api/services';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const ACTION_COLOR = { create: 'success', update: 'info', delete: 'error', login: 'primary', logout: 'default', approve: 'warning' };

const columns = [
  { field: 'createdAt', headerName: 'Time', flex: 1, renderCell: ({ value }) => dayjs(value).format('DD MMM HH:mm:ss') },
  { field: 'user', headerName: 'User', flex: 1, renderCell: ({ value }) => value?.name || '—' },
  { field: 'action', headerName: 'Action', flex: 0.8, renderCell: ({ value }) => (
    <Chip label={value} size="small" color={ACTION_COLOR[value] || 'default'} />
  )},
  { field: 'module', headerName: 'Module', flex: 0.8 },
  { field: 'description', headerName: 'Description', flex: 2 },
  { field: 'ip', headerName: 'IP Address', flex: 0.9 },
  { field: 'device', headerName: 'Device', flex: 1, renderCell: ({ value }) => (
    <Typography variant="caption" noWrap title={value}>{value || '—'}</Typography>
  )},
];

const AuditLogs = () => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await auditAPI.getAll({ page, limit: pageSize, ...(search && { search }) });
      setRows(data.data);
      setTotal(data.total);
    } catch { toast.error('Failed to load audit logs'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [page, pageSize, search]);

  return (
    <Box>
      <PageHeader title="Audit Logs" subtitle="Track all system actions and changes" />
      <Box sx={{ mb: 2 }}>
        <TextField
          placeholder="Search by user, action, module..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          sx={{ width: 320 }}
        />
      </Box>
      <DataTable
        rows={rows} columns={columns} loading={loading} total={total}
        page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize}
      />
    </Box>
  );
};

export default AuditLogs;
