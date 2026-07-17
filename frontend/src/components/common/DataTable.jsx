import { DataGrid } from '@mui/x-data-grid';
import { Box } from '@mui/material';

const DataTable = ({ rows, columns, loading, total, page, pageSize, onPageChange, onPageSizeChange, ...props }) => (
  <Box sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
    <DataGrid
      rows={rows}
      columns={columns}
      loading={loading}
      rowCount={total}
      paginationMode="server"
      paginationModel={{ page: page - 1, pageSize }}
      onPaginationModelChange={({ page: p, pageSize: ps }) => {
        if (p + 1 !== page) onPageChange(p + 1);
        if (ps !== pageSize) onPageSizeChange(ps);
      }}
      pageSizeOptions={[10, 20, 50]}
      disableRowSelectionOnClick
      autoHeight
      getRowId={(row) => row._id}
      sx={{
        border: 'none',
        '& .MuiDataGrid-columnHeaders': { backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
        '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' },
        '& .MuiDataGrid-row:hover': { bgcolor: '#f8fafc' },
        '& .MuiDataGrid-row:nth-of-type(even)': { bgcolor: '#fafafa' },
        '& .MuiDataGrid-cell': { borderColor: '#f1f5f9', fontSize: '0.875rem' },
        '& .MuiDataGrid-footerContainer': { borderTop: '1px solid #e2e8f0', bgcolor: '#f8fafc' },
      }}
      {...props}
    />
  </Box>
);

export default DataTable;
