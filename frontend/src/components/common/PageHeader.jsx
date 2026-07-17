import { Box, Typography, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

const PageHeader = ({ title, subtitle, action, onAction, actionIcon }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
    <Box>
      <Typography variant="h5" fontWeight={700} color="text.primary">{title}</Typography>
      {subtitle && <Typography variant="body2" color="text.secondary" mt={0.25}>{subtitle}</Typography>}
    </Box>
    {action && (
      <Button variant="contained" startIcon={actionIcon || <AddIcon />} onClick={onAction} size="medium">
        {action}
      </Button>
    )}
  </Box>
);

export default PageHeader;
